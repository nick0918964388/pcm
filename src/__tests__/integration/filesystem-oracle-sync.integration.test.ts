/**
 * 檔案系統與 Oracle 資料庫同步一致性整合測試
 * Task 9.2: 建立 Oracle 系統整合測試
 *
 * 遵循 TDD 方法論
 * RED: 撰寫失敗的測試
 * GREEN: 實作最小程式碼讓測試通過
 * REFACTOR: 重構並改善程式碼品質
 * VERIFY: 確保所有測試通過並無回歸問題
 *
 * 測試範圍:
 * - 檔案系統與 Oracle 資料記錄的完全同步
 * - 孤兒檔案檢測與清理
 * - 孤兒記錄檢測與修復
 * - 系統一致性檢查
 * - 災難恢復情境測試
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import {
  oracleTestManager,
  setupOracleForTests,
  cleanupOracleAfterTests,
  ensureOracleReady,
} from '@/lib/database/oracle-test-setup';
import { OracleRepositoryFactory } from '@/lib/repositories/oracle-repository-factory';
import { LocalFileStorageService } from '@/lib/services/file-storage';
import { getOracleConnection } from '@/lib/database/oracle-connection';
import type { Photo, Album } from '@/lib/repositories/types/photo.types';

// 測試常數
const TEST_UPLOADS_PATH = path.join(
  process.cwd(),
  'test-uploads/filesystem-sync'
);
const TEST_PROJECT_ID = 'TEST_PROJ_SYNC';
const TEST_USER_ID = 'TEST_USER_SYNC';

// 一致性檢查服務接口
interface ConsistencyCheckResult {
  isConsistent: boolean;
  orphanFiles: string[];
  orphanRecords: Array<{ id: string; filePath: string }>;
  corruptedFiles: Array<{ id: string; filePath: string; issue: string }>;
  statistics: {
    totalFiles: number;
    totalRecords: number;
    matchedPairs: number;
    unmatchedFiles: number;
    unmatchedRecords: number;
  };
}

class FilesystemOracleConsistencyChecker {
  private fileStorage = new LocalFileStorageService();

  async performFullConsistencyCheck(
    projectId: string
  ): Promise<ConsistencyCheckResult> {
    const photoRepository = await OracleRepositoryFactory.getPhotoRepository();
    const albumRepository = await OracleRepositoryFactory.getAlbumRepository();

    // 取得所有專案相簿
    const albums = await albumRepository.getProjectAlbums(projectId);
    const allPhotos: Photo[] = [];

    for (const album of albums) {
      const photos = await photoRepository.getAlbumPhotos(album.id);
      allPhotos.push(...photos);
    }

    // 掃描檔案系統
    const fileSystemFiles = await this.scanFileSystem(projectId);

    // 分析一致性
    return this.analyzeConsistency(allPhotos, fileSystemFiles);
  }

  private async scanFileSystem(
    projectId: string
  ): Promise<Array<{ path: string; size: number; checksum: string }>> {
    const projectPath = path.join(TEST_UPLOADS_PATH, projectId);
    const files: Array<{ path: string; size: number; checksum: string }> = [];

    try {
      const entries = await fs.readdir(projectPath, {
        recursive: true,
        withFileTypes: true,
      });

      for (const entry of entries) {
        if (entry.isFile()) {
          const fullPath = path.join(entry.path || projectPath, entry.name);
          try {
            const stats = await fs.stat(fullPath);
            const content = await fs.readFile(fullPath);
            const checksum = crypto
              .createHash('sha256')
              .update(content)
              .digest('hex');

            files.push({
              path: fullPath,
              size: stats.size,
              checksum,
            });
          } catch (error) {
            console.warn(`無法讀取檔案 ${fullPath}:`, error);
          }
        }
      }
    } catch (error) {
      // 專案目錄不存在
      console.warn(`專案目錄不存在 ${projectPath}:`, error);
    }

    return files;
  }

  private analyzeConsistency(
    photos: Photo[],
    files: Array<{ path: string; size: number; checksum: string }>
  ): ConsistencyCheckResult {
    const orphanFiles: string[] = [];
    const orphanRecords: Array<{ id: string; filePath: string }> = [];
    const corruptedFiles: Array<{
      id: string;
      filePath: string;
      issue: string;
    }> = [];
    let matchedPairs = 0;

    // 建立檔案路徑映射
    const fileMap = new Map(files.map(f => [f.path, f]));
    const photoMap = new Map(photos.map(p => [p.filePath, p]));

    // 檢查資料庫記錄對應的檔案
    for (const photo of photos) {
      const file = fileMap.get(photo.filePath);

      if (!file) {
        orphanRecords.push({ id: photo.id, filePath: photo.filePath });
      } else {
        // 檢查檔案大小是否匹配
        if (file.size !== photo.fileSize) {
          corruptedFiles.push({
            id: photo.id,
            filePath: photo.filePath,
            issue: `檔案大小不符: DB=${photo.fileSize}, File=${file.size}`,
          });
        } else {
          matchedPairs++;
        }
      }
    }

    // 檢查檔案系統中的孤兒檔案
    for (const file of files) {
      if (!photoMap.has(file.path)) {
        orphanFiles.push(file.path);
      }
    }

    return {
      isConsistent:
        orphanFiles.length === 0 &&
        orphanRecords.length === 0 &&
        corruptedFiles.length === 0,
      orphanFiles,
      orphanRecords,
      corruptedFiles,
      statistics: {
        totalFiles: files.length,
        totalRecords: photos.length,
        matchedPairs,
        unmatchedFiles: orphanFiles.length,
        unmatchedRecords: orphanRecords.length,
      },
    };
  }

  async repairOrphanRecords(
    orphanRecords: Array<{ id: string; filePath: string }>
  ): Promise<number> {
    const photoRepository = await OracleRepositoryFactory.getPhotoRepository();
    let repairedCount = 0;

    for (const orphan of orphanRecords) {
      try {
        // 刪除孤兒記錄
        await photoRepository.deletePhotoWithFiles(orphan.id, 'SYSTEM_REPAIR');
        repairedCount++;
      } catch (error) {
        console.warn(`修復孤兒記錄失敗 ${orphan.id}:`, error);
      }
    }

    return repairedCount;
  }

  async repairOrphanFiles(orphanFiles: string[]): Promise<number> {
    let repairedCount = 0;

    for (const filePath of orphanFiles) {
      try {
        await fs.unlink(filePath);
        repairedCount++;
      } catch (error) {
        console.warn(`清理孤兒檔案失敗 ${filePath}:`, error);
      }
    }

    return repairedCount;
  }
}

describe('檔案系統與 Oracle 資料庫同步一致性整合測試', () => {
  let testAlbum: Album;
  let consistencyChecker: FilesystemOracleConsistencyChecker;

  // ===== 測試環境設置 =====
  beforeAll(async () => {
    console.log('🔧 設置檔案系統同步一致性測試環境...');

    // 確保 Oracle 容器運行
    await ensureOracleReady();

    // 初始化 Oracle 測試資料庫
    await setupOracleForTests({
      recreateSchema: true,
      loadTestData: true,
    });

    // 建立測試上傳目錄
    await fs.mkdir(TEST_UPLOADS_PATH, { recursive: true });

    // 設置測試專案和使用者
    const oracle = getOracleConnection();

    // 建立測試專案
    await oracle.executeQuery(
      `
      INSERT INTO projects (id, name, description, status, created_at)
      VALUES (:id, :name, :description, 'active', SYSTIMESTAMP)
    `,
      {
        id: TEST_PROJECT_ID,
        name: 'Filesystem Sync Test Project',
        description: 'Test project for filesystem synchronization',
      }
    );

    // 建立測試使用者
    await oracle.executeQuery(
      `
      INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, created_at)
      VALUES (:id, :username, :email, 'test_hash', 'admin', 'Sync', 'Tester', SYSTIMESTAMP)
    `,
      {
        id: TEST_USER_ID,
        username: 'sync_test_user',
        email: 'sync.test@pcm.test',
      }
    );

    consistencyChecker = new FilesystemOracleConsistencyChecker();

    console.log('✅ 檔案系統同步一致性測試環境準備就緒');
  }, 60000); // 60s timeout

  afterAll(async () => {
    console.log('🧹 清理檔案系統同步一致性測試環境...');

    // 清理測試檔案
    try {
      await fs.rm(TEST_UPLOADS_PATH, { recursive: true, force: true });
    } catch (error) {
      console.warn('清理測試檔案失敗:', error);
    }

    // 清理 Oracle 測試資料
    await cleanupOracleAfterTests();

    console.log('✅ 檔案系統同步一致性測試環境清理完成');
  });

  beforeEach(async () => {
    // 建立測試相簿
    const albumRepository = await OracleRepositoryFactory.getAlbumRepository();
    testAlbum = await albumRepository.createAlbum({
      projectId: TEST_PROJECT_ID,
      name: 'Sync Test Album',
      description: 'Test album for filesystem sync',
      createdBy: TEST_USER_ID,
    });
  });

  afterEach(async () => {
    // 清理測試資料
    if (testAlbum) {
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();

      try {
        // 刪除測試照片
        const photos = await photoRepository.getAlbumPhotos(testAlbum.id);
        for (const photo of photos) {
          await photoRepository.deletePhotoWithFiles(photo.id, TEST_USER_ID);
        }

        // 刪除測試相簿
        await albumRepository.deleteAlbum(testAlbum.id, TEST_USER_ID, true);
      } catch (error) {
        console.warn('清理測試資料失敗:', error);
      }
    }
  });

  // ===== 基礎同步一致性測試 =====
  describe('基礎同步一致性', () => {
    it('RED: 應該檢測完全同步的狀態', async () => {
      // Arrange
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();
      const testPhotos = 3;

      // 建立完全同步的照片
      for (let i = 0; i < testPhotos; i++) {
        const fileName = `sync-photo-${i}.jpg`;
        const filePath = path.join(
          TEST_UPLOADS_PATH,
          TEST_PROJECT_ID,
          testAlbum.name,
          fileName
        );

        // 確保目錄存在
        await fs.mkdir(path.dirname(filePath), { recursive: true });

        // 建立檔案
        const content = `test-image-data-${i}`;
        await fs.writeFile(filePath, content);

        // 建立資料庫記錄
        await photoRepository.createPhoto({
          albumId: testAlbum.id,
          fileName,
          filePath,
          fileSize: content.length,
          mimeType: 'image/jpeg',
          uploadedBy: TEST_USER_ID,
          metadata: {},
        });
      }

      // Act
      const result =
        await consistencyChecker.performFullConsistencyCheck(TEST_PROJECT_ID);

      // Assert
      expect(result.isConsistent).toBe(true);
      expect(result.orphanFiles).toHaveLength(0);
      expect(result.orphanRecords).toHaveLength(0);
      expect(result.corruptedFiles).toHaveLength(0);
      expect(result.statistics.totalFiles).toBe(testPhotos);
      expect(result.statistics.totalRecords).toBe(testPhotos);
      expect(result.statistics.matchedPairs).toBe(testPhotos);
    });

    it('RED: 應該檢測檔案大小不一致', async () => {
      // Arrange
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();
      const fileName = 'corrupted-size-photo.jpg';
      const filePath = path.join(
        TEST_UPLOADS_PATH,
        TEST_PROJECT_ID,
        testAlbum.name,
        fileName
      );

      // 確保目錄存在
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // 建立檔案
      const originalContent = 'original-content';
      await fs.writeFile(filePath, originalContent);

      // 建立資料庫記錄（正確大小）
      const photo = await photoRepository.createPhoto({
        albumId: testAlbum.id,
        fileName,
        filePath,
        fileSize: originalContent.length,
        mimeType: 'image/jpeg',
        uploadedBy: TEST_USER_ID,
        metadata: {},
      });

      // 修改檔案內容（破壞同步）
      const modifiedContent = 'modified-content-with-different-size';
      await fs.writeFile(filePath, modifiedContent);

      // Act
      const result =
        await consistencyChecker.performFullConsistencyCheck(TEST_PROJECT_ID);

      // Assert
      expect(result.isConsistent).toBe(false);
      expect(result.corruptedFiles).toHaveLength(1);
      expect(result.corruptedFiles[0].id).toBe(photo.id);
      expect(result.corruptedFiles[0].issue).toContain('檔案大小不符');
      expect(result.statistics.matchedPairs).toBe(0); // 因為大小不匹配
    });
  });

  // ===== 孤兒檔案檢測測試 =====
  describe('孤兒檔案檢測', () => {
    it('RED: 應該檢測檔案系統中的孤兒檔案', async () => {
      // Arrange
      const orphanFiles = ['orphan1.jpg', 'orphan2.png', 'orphan3.txt'];
      const orphanDir = path.join(
        TEST_UPLOADS_PATH,
        TEST_PROJECT_ID,
        testAlbum.name
      );

      await fs.mkdir(orphanDir, { recursive: true });

      // 建立孤兒檔案（只有檔案，沒有資料庫記錄）
      for (const fileName of orphanFiles) {
        const filePath = path.join(orphanDir, fileName);
        await fs.writeFile(filePath, `orphan-content-${fileName}`);
      }

      // Act
      const result =
        await consistencyChecker.performFullConsistencyCheck(TEST_PROJECT_ID);

      // Assert
      expect(result.isConsistent).toBe(false);
      expect(result.orphanFiles).toHaveLength(orphanFiles.length);
      expect(result.statistics.unmatchedFiles).toBe(orphanFiles.length);
      expect(result.statistics.totalFiles).toBe(orphanFiles.length);
      expect(result.statistics.totalRecords).toBe(0);

      // 驗證孤兒檔案路徑正確
      orphanFiles.forEach(fileName => {
        const expectedPath = path.join(orphanDir, fileName);
        expect(result.orphanFiles).toContain(expectedPath);
      });
    });

    it('RED: 應該能清理孤兒檔案', async () => {
      // Arrange
      const orphanDir = path.join(
        TEST_UPLOADS_PATH,
        TEST_PROJECT_ID,
        testAlbum.name
      );
      await fs.mkdir(orphanDir, { recursive: true });

      const orphanFile = path.join(orphanDir, 'cleanup-test.jpg');
      await fs.writeFile(orphanFile, 'orphan-content');

      // 確認孤兒檔案存在
      const initialCheck =
        await consistencyChecker.performFullConsistencyCheck(TEST_PROJECT_ID);
      expect(initialCheck.orphanFiles).toContain(orphanFile);

      // Act
      const repairedCount = await consistencyChecker.repairOrphanFiles(
        initialCheck.orphanFiles
      );

      // Assert
      expect(repairedCount).toBe(1);

      // 驗證檔案被刪除
      const fileExists = await fs
        .access(orphanFile)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(false);

      // 驗證一致性恢復
      const finalCheck =
        await consistencyChecker.performFullConsistencyCheck(TEST_PROJECT_ID);
      expect(finalCheck.isConsistent).toBe(true);
      expect(finalCheck.orphanFiles).toHaveLength(0);
    });
  });

  // ===== 孤兒記錄檢測測試 =====
  describe('孤兒記錄檢測', () => {
    it('RED: 應該檢測資料庫中的孤兒記錄', async () => {
      // Arrange
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();
      const fileName = 'orphan-record-photo.jpg';
      const filePath = path.join(
        TEST_UPLOADS_PATH,
        TEST_PROJECT_ID,
        testAlbum.name,
        fileName
      );

      // 確保目錄存在
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // 建立檔案和資料庫記錄
      await fs.writeFile(filePath, 'test-content');
      const photo = await photoRepository.createPhoto({
        albumId: testAlbum.id,
        fileName,
        filePath,
        fileSize: 12,
        mimeType: 'image/jpeg',
        uploadedBy: TEST_USER_ID,
        metadata: {},
      });

      // 刪除檔案但保留資料庫記錄（模擬孤兒記錄）
      await fs.unlink(filePath);

      // Act
      const result =
        await consistencyChecker.performFullConsistencyCheck(TEST_PROJECT_ID);

      // Assert
      expect(result.isConsistent).toBe(false);
      expect(result.orphanRecords).toHaveLength(1);
      expect(result.orphanRecords[0].id).toBe(photo.id);
      expect(result.orphanRecords[0].filePath).toBe(filePath);
      expect(result.statistics.unmatchedRecords).toBe(1);
      expect(result.statistics.totalRecords).toBe(1);
      expect(result.statistics.totalFiles).toBe(0);
    });

    it('RED: 應該能修復孤兒記錄', async () => {
      // Arrange
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();
      const fileName = 'repair-orphan-record.jpg';
      const filePath = path.join(
        TEST_UPLOADS_PATH,
        TEST_PROJECT_ID,
        testAlbum.name,
        fileName
      );

      // 確保目錄存在
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // 建立檔案和記錄
      await fs.writeFile(filePath, 'test-content');
      const photo = await photoRepository.createPhoto({
        albumId: testAlbum.id,
        fileName,
        filePath,
        fileSize: 12,
        mimeType: 'image/jpeg',
        uploadedBy: TEST_USER_ID,
        metadata: {},
      });

      // 刪除檔案創建孤兒記錄
      await fs.unlink(filePath);

      const initialCheck =
        await consistencyChecker.performFullConsistencyCheck(TEST_PROJECT_ID);
      expect(initialCheck.orphanRecords).toHaveLength(1);

      // Act
      const repairedCount = await consistencyChecker.repairOrphanRecords(
        initialCheck.orphanRecords
      );

      // Assert
      expect(repairedCount).toBe(1);

      // 驗證記錄被刪除
      const deletedPhoto = await photoRepository.findById(photo.id);
      expect(deletedPhoto).toBeNull();

      // 驗證一致性恢復
      const finalCheck =
        await consistencyChecker.performFullConsistencyCheck(TEST_PROJECT_ID);
      expect(finalCheck.isConsistent).toBe(true);
      expect(finalCheck.orphanRecords).toHaveLength(0);
    });
  });

  // ===== 複雜同步情境測試 =====
  describe('複雜同步情境', () => {
    it('RED: 應該處理混合的同步問題', async () => {
      // Arrange
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();
      const testDir = path.join(
        TEST_UPLOADS_PATH,
        TEST_PROJECT_ID,
        testAlbum.name
      );
      await fs.mkdir(testDir, { recursive: true });

      // 1. 正常同步的照片
      const normalFile = path.join(testDir, 'normal.jpg');
      await fs.writeFile(normalFile, 'normal-content');
      await photoRepository.createPhoto({
        albumId: testAlbum.id,
        fileName: 'normal.jpg',
        filePath: normalFile,
        fileSize: 14, // 'normal-content'.length
        mimeType: 'image/jpeg',
        uploadedBy: TEST_USER_ID,
        metadata: {},
      });

      // 2. 孤兒檔案
      const orphanFile = path.join(testDir, 'orphan.jpg');
      await fs.writeFile(orphanFile, 'orphan-content');

      // 3. 孤兒記錄
      const orphanRecordFile = path.join(testDir, 'orphan-record.jpg');
      const orphanPhoto = await photoRepository.createPhoto({
        albumId: testAlbum.id,
        fileName: 'orphan-record.jpg',
        filePath: orphanRecordFile,
        fileSize: 15,
        mimeType: 'image/jpeg',
        uploadedBy: TEST_USER_ID,
        metadata: {},
      });

      // 4. 檔案大小不一致
      const corruptedFile = path.join(testDir, 'corrupted.jpg');
      await fs.writeFile(corruptedFile, 'wrong-size-content');
      await photoRepository.createPhoto({
        albumId: testAlbum.id,
        fileName: 'corrupted.jpg',
        filePath: corruptedFile,
        fileSize: 10, // 錯誤的大小
        mimeType: 'image/jpeg',
        uploadedBy: TEST_USER_ID,
        metadata: {},
      });

      // Act
      const result =
        await consistencyChecker.performFullConsistencyCheck(TEST_PROJECT_ID);

      // Assert
      expect(result.isConsistent).toBe(false);
      expect(result.orphanFiles).toHaveLength(1);
      expect(result.orphanRecords).toHaveLength(1);
      expect(result.corruptedFiles).toHaveLength(1);
      expect(result.statistics.matchedPairs).toBe(1); // 只有 normal.jpg 完全匹配
      expect(result.statistics.totalFiles).toBe(3); // normal, orphan, corrupted
      expect(result.statistics.totalRecords).toBe(3); // normal, orphan-record, corrupted

      // 驗證問題分類正確
      expect(result.orphanFiles[0]).toBe(orphanFile);
      expect(result.orphanRecords[0].id).toBe(orphanPhoto.id);
      expect(result.corruptedFiles[0].filePath).toBe(corruptedFile);
    });

    it('RED: 應該能批次修復所有同步問題', async () => {
      // Arrange - 建立各種問題
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();
      const testDir = path.join(
        TEST_UPLOADS_PATH,
        TEST_PROJECT_ID,
        testAlbum.name
      );
      await fs.mkdir(testDir, { recursive: true });

      // 孤兒檔案
      const orphanFile = path.join(testDir, 'batch-orphan.jpg');
      await fs.writeFile(orphanFile, 'orphan-content');

      // 孤兒記錄
      const orphanPhoto = await photoRepository.createPhoto({
        albumId: testAlbum.id,
        fileName: 'batch-orphan-record.jpg',
        filePath: path.join(testDir, 'batch-orphan-record.jpg'),
        fileSize: 15,
        mimeType: 'image/jpeg',
        uploadedBy: TEST_USER_ID,
        metadata: {},
      });

      const initialCheck =
        await consistencyChecker.performFullConsistencyCheck(TEST_PROJECT_ID);
      expect(initialCheck.isConsistent).toBe(false);

      // Act - 批次修復
      const [fileRepairs, recordRepairs] = await Promise.all([
        consistencyChecker.repairOrphanFiles(initialCheck.orphanFiles),
        consistencyChecker.repairOrphanRecords(initialCheck.orphanRecords),
      ]);

      // Assert
      expect(fileRepairs).toBe(1);
      expect(recordRepairs).toBe(1);

      // 驗證一致性完全恢復
      const finalCheck =
        await consistencyChecker.performFullConsistencyCheck(TEST_PROJECT_ID);
      expect(finalCheck.isConsistent).toBe(true);
      expect(finalCheck.orphanFiles).toHaveLength(0);
      expect(finalCheck.orphanRecords).toHaveLength(0);
      expect(finalCheck.statistics.totalFiles).toBe(0);
      expect(finalCheck.statistics.totalRecords).toBe(0);
    });
  });

  // ===== 災難恢復情境測試 =====
  describe('災難恢復情境', () => {
    it('RED: 應該處理目錄結構損壞', async () => {
      // Arrange
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();
      const brokenDir = path.join(
        TEST_UPLOADS_PATH,
        TEST_PROJECT_ID,
        'broken-structure'
      );

      // 建立深層目錄結構
      await fs.mkdir(brokenDir, { recursive: true });
      const deepFile = path.join(brokenDir, 'deep', 'nested', 'photo.jpg');
      await fs.mkdir(path.dirname(deepFile), { recursive: true });
      await fs.writeFile(deepFile, 'deep-content');

      // 建立記錄
      await photoRepository.createPhoto({
        albumId: testAlbum.id,
        fileName: 'photo.jpg',
        filePath: deepFile,
        fileSize: 12,
        mimeType: 'image/jpeg',
        uploadedBy: TEST_USER_ID,
        metadata: {},
      });

      // 破壞目錄結構（刪除中間目錄）
      await fs.rm(path.join(brokenDir, 'deep'), {
        recursive: true,
        force: true,
      });

      // Act
      const result =
        await consistencyChecker.performFullConsistencyCheck(TEST_PROJECT_ID);

      // Assert
      expect(result.isConsistent).toBe(false);
      expect(result.orphanRecords).toHaveLength(1);
      expect(result.statistics.totalFiles).toBe(0); // 檔案無法存取
      expect(result.statistics.totalRecords).toBe(1);
    });

    it('RED: 應該處理權限問題導致的檔案無法存取', async () => {
      // Arrange
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();
      const restrictedDir = path.join(
        TEST_UPLOADS_PATH,
        TEST_PROJECT_ID,
        'restricted'
      );
      await fs.mkdir(restrictedDir, { recursive: true });

      const restrictedFile = path.join(restrictedDir, 'restricted.jpg');
      await fs.writeFile(restrictedFile, 'restricted-content');

      // 建立記錄
      const photo = await photoRepository.createPhoto({
        albumId: testAlbum.id,
        fileName: 'restricted.jpg',
        filePath: restrictedFile,
        fileSize: 18,
        mimeType: 'image/jpeg',
        uploadedBy: TEST_USER_ID,
        metadata: {},
      });

      // 移除讀取權限
      await fs.chmod(restrictedFile, 0o000);

      try {
        // Act
        const result =
          await consistencyChecker.performFullConsistencyCheck(TEST_PROJECT_ID);

        // Assert - 系統應該能優雅處理權限問題
        expect(result.statistics.totalRecords).toBe(1);
        // 檔案可能被視為無法存取，取決於實作處理方式
      } finally {
        // 恢復權限以便清理
        await fs.chmod(restrictedFile, 0o644);
      }
    });
  });

  // ===== 效能測試 =====
  describe('一致性檢查效能', () => {
    it('RED: 應該能在合理時間內檢查大量檔案', async () => {
      // Arrange
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();
      const testDir = path.join(
        TEST_UPLOADS_PATH,
        TEST_PROJECT_ID,
        testAlbum.name
      );
      await fs.mkdir(testDir, { recursive: true });

      const fileCount = 50; // 中等規模測試
      const photos: Photo[] = [];

      // 建立大量同步的檔案
      for (let i = 0; i < fileCount; i++) {
        const fileName = `perf-test-${i}.jpg`;
        const filePath = path.join(testDir, fileName);
        const content = `performance-test-content-${i}`;

        await fs.writeFile(filePath, content);

        const photo = await photoRepository.createPhoto({
          albumId: testAlbum.id,
          fileName,
          filePath,
          fileSize: content.length,
          mimeType: 'image/jpeg',
          uploadedBy: TEST_USER_ID,
          metadata: { testIndex: i },
        });

        photos.push(photo);
      }

      // Act - 測量檢查時間
      const startTime = process.hrtime.bigint();
      const result =
        await consistencyChecker.performFullConsistencyCheck(TEST_PROJECT_ID);
      const endTime = process.hrtime.bigint();

      const checkTimeMs = Number(endTime - startTime) / 1_000_000;

      // Assert
      expect(result.isConsistent).toBe(true);
      expect(result.statistics.totalFiles).toBe(fileCount);
      expect(result.statistics.totalRecords).toBe(fileCount);
      expect(result.statistics.matchedPairs).toBe(fileCount);
      expect(checkTimeMs).toBeLessThan(5000); // 應在 5 秒內完成

      console.log(
        `一致性檢查 ${fileCount} 個檔案耗時: ${checkTimeMs.toFixed(2)}ms`
      );
    });
  });
});
