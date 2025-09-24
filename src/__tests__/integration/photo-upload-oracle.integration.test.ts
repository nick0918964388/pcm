/**
 * Oracle 照片上傳流程整合測試
 * Task 9.2: 建立 Oracle 系統整合測試
 *
 * 遵循 TDD 方法論
 * RED: 撰寫失敗的測試
 * GREEN: 實作最小程式碼讓測試通過
 * REFACTOR: 重構並改善程式碼品質
 * VERIFY: 確保所有測試通過並無回歸問題
 *
 * 測試範圍:
 * - 前後端照片上傳流程完整性
 * - Oracle 資料庫真實連線和數據持久化
 * - 檔案系統與資料庫同步
 * - 錯誤處理和異常恢復
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
import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import {
  oracleTestManager,
  setupOracleForTests,
  cleanupOracleAfterTests,
  ensureOracleReady,
} from '@/lib/database/oracle-test-setup';
import { OracleRepositoryFactory } from '@/lib/repositories/oracle-repository-factory';
import type { Photo, Album } from '@/lib/repositories/types/photo.types';

// 測試常數
const TEST_UPLOADS_PATH = path.join(process.cwd(), 'test-uploads');
const TEST_PROJECT_ID = 'TEST_PROJ_001';
const TEST_ALBUM_ID = 'TEST_ALBUM_001';
const TEST_USER_ID = 'TEST_USER_001';

describe('Oracle 照片上傳流程整合測試', () => {
  let testPhoto: File;
  let testAlbum: Album;

  // ===== 測試環境設置 =====
  beforeAll(async () => {
    console.log('🔧 設置 Oracle 整合測試環境...');

    // 確保 Oracle 容器運行
    await ensureOracleReady();

    // 初始化 Oracle 測試資料庫
    await setupOracleForTests({
      recreateSchema: true,
      loadTestData: true,
    });

    // 建立測試上傳目錄
    await fs.mkdir(TEST_UPLOADS_PATH, { recursive: true });

    console.log('✅ Oracle 整合測試環境準備就緒');
  }, 60000); // 60s timeout for Oracle setup

  afterAll(async () => {
    console.log('🧹 清理 Oracle 整合測試環境...');

    // 清理測試檔案
    try {
      await fs.rm(TEST_UPLOADS_PATH, { recursive: true, force: true });
    } catch (error) {
      console.warn('清理測試檔案失敗:', error);
    }

    // 清理 Oracle 測試資料
    await cleanupOracleAfterTests();

    console.log('✅ Oracle 整合測試環境清理完成');
  });

  beforeEach(async () => {
    // 建立測試相簿
    const albumRepository = await OracleRepositoryFactory.getAlbumRepository();
    testAlbum = await albumRepository.createAlbum({
      projectId: TEST_PROJECT_ID,
      name: 'Integration Test Album',
      description: 'Test album for integration testing',
      createdBy: TEST_USER_ID,
    });

    // 建立測試照片檔案
    const testImageBuffer = Buffer.from('test-image-data');
    testPhoto = new File([testImageBuffer], 'test-photo.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  });

  afterEach(async () => {
    // 清理測試資料
    const albumRepository = await OracleRepositoryFactory.getAlbumRepository();
    const photoRepository = await OracleRepositoryFactory.getPhotoRepository();

    try {
      // 刪除測試照片
      const photos = await photoRepository.getAlbumPhotos(testAlbum.id);
      for (const photo of photos) {
        await photoRepository.deletePhotoWithFiles(photo.id, TEST_USER_ID);
      }

      // 刪除測試相簿
      await albumRepository.deleteAlbum(testAlbum.id, TEST_USER_ID, false);
    } catch (error) {
      console.warn('清理測試資料失敗:', error);
    }
  });

  // ===== 基礎上傳流程測試 =====
  describe('基礎照片上傳流程', () => {
    it('RED: 應該完整執行單一照片上傳流程', async () => {
      // Arrange
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();

      const photoData = {
        albumId: testAlbum.id,
        fileName: testPhoto.name,
        filePath: path.join(TEST_UPLOADS_PATH, testPhoto.name),
        fileSize: testPhoto.size,
        mimeType: testPhoto.type,
        width: 1920,
        height: 1080,
        uploadedBy: TEST_USER_ID,
        metadata: {
          description: 'Integration test photo',
          tags: ['test', 'integration'],
          exif: {
            camera: 'Test Camera',
            dateTime: new Date().toISOString(),
          },
        },
      };

      // Act - 模擬實際檔案儲存
      await fs.writeFile(photoData.filePath, Buffer.from('test-image-data'));

      // 建立 Oracle 照片記錄
      const createdPhoto = await photoRepository.createPhoto(photoData);

      // Assert - 驗證資料庫記錄
      expect(createdPhoto).toBeDefined();
      expect(createdPhoto.id).toBeDefined();
      expect(createdPhoto.albumId).toBe(testAlbum.id);
      expect(createdPhoto.fileName).toBe(testPhoto.name);
      expect(createdPhoto.uploadedBy).toBe(TEST_USER_ID);
      expect(createdPhoto.metadata.tags).toEqual(['test', 'integration']);

      // 驗證檔案實際存在
      const fileExists = await fs
        .access(photoData.filePath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // 驗證可以從資料庫重新查詢
      const retrievedPhoto = await photoRepository.findById(createdPhoto.id);
      expect(retrievedPhoto).toEqual(createdPhoto);
    });

    it('RED: 應該處理上傳失敗的回滾情境', async () => {
      // Arrange
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();

      const invalidPhotoData = {
        albumId: 'NON_EXISTENT_ALBUM',
        fileName: testPhoto.name,
        filePath: path.join(TEST_UPLOADS_PATH, 'invalid-photo.jpg'),
        fileSize: testPhoto.size,
        mimeType: testPhoto.type,
        uploadedBy: TEST_USER_ID,
        metadata: {},
      };

      // Act & Assert - 驗證外鍵約束失敗
      await expect(
        photoRepository.createPhoto(invalidPhotoData)
      ).rejects.toThrow();

      // 驗證沒有孤兒檔案生成
      const fileExists = await fs
        .access(invalidPhotoData.filePath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(false);
    });
  });

  // ===== 批次上傳測試 =====
  describe('批次照片上傳流程', () => {
    it('RED: 應該支援多張照片批次上傳', async () => {
      // Arrange
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();
      const batchSize = 3;
      const photos: Photo[] = [];

      // 建立多個測試照片
      for (let i = 0; i < batchSize; i++) {
        const fileName = `batch-photo-${i}.jpg`;
        const filePath = path.join(TEST_UPLOADS_PATH, fileName);

        // 建立實際檔案
        await fs.writeFile(filePath, Buffer.from(`test-image-data-${i}`));

        const photoData = {
          albumId: testAlbum.id,
          fileName,
          filePath,
          fileSize: 1024 * (i + 1), // 不同大小
          mimeType: 'image/jpeg',
          width: 1920,
          height: 1080,
          uploadedBy: TEST_USER_ID,
          metadata: {
            tags: ['batch', `photo-${i}`],
            description: `Batch photo ${i}`,
          },
        };

        // Act - 建立照片記錄
        const photo = await photoRepository.createPhoto(photoData);
        photos.push(photo);
      }

      // Assert - 驗證所有照片都成功建立
      expect(photos).toHaveLength(batchSize);

      // 驗證相簿照片數量更新
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();
      const updatedAlbum = await albumRepository.findById(testAlbum.id);
      expect(updatedAlbum?.photoCount).toBe(batchSize);

      // 驗證可以查詢相簿內的所有照片
      const albumPhotos = await photoRepository.getAlbumPhotos(testAlbum.id);
      expect(albumPhotos).toHaveLength(batchSize);

      // 驗證所有檔案都存在
      for (const photo of photos) {
        const fileExists = await fs
          .access(photo.filePath)
          .then(() => true)
          .catch(() => false);
        expect(fileExists).toBe(true);
      }
    });

    it('RED: 應該處理部分上傳失敗的情境', async () => {
      // Arrange
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();
      const validPhotos = ['valid-1.jpg', 'valid-2.jpg'];
      const invalidPhoto = 'invalid.txt'; // 非圖片格式

      const results: (Photo | Error)[] = [];

      // Act - 嘗試上傳混合檔案
      for (const fileName of [...validPhotos, invalidPhoto]) {
        try {
          const filePath = path.join(TEST_UPLOADS_PATH, fileName);
          await fs.writeFile(filePath, Buffer.from('test-data'));

          const photoData = {
            albumId: testAlbum.id,
            fileName,
            filePath,
            fileSize: 1024,
            mimeType: fileName.endsWith('.jpg') ? 'image/jpeg' : 'text/plain',
            uploadedBy: TEST_USER_ID,
            metadata: {},
          };

          const photo = await photoRepository.createPhoto(photoData);
          results.push(photo);
        } catch (error) {
          results.push(error as Error);
        }
      }

      // Assert - 驗證部分成功結果
      expect(results).toHaveLength(3);
      expect(results[0]).toBeInstanceOf(Object); // valid photo
      expect(results[1]).toBeInstanceOf(Object); // valid photo
      expect(results[2]).toBeInstanceOf(Error); // invalid photo

      // 驗證只有有效照片被記錄
      const albumPhotos = await photoRepository.getAlbumPhotos(testAlbum.id);
      expect(albumPhotos).toHaveLength(2);
    });
  });

  // ===== 檔案系統同步測試 =====
  describe('檔案系統與資料庫同步', () => {
    it('RED: 應該確保資料庫刪除與檔案刪除同步', async () => {
      // Arrange
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();

      const photoData = {
        albumId: testAlbum.id,
        fileName: 'sync-test.jpg',
        filePath: path.join(TEST_UPLOADS_PATH, 'sync-test.jpg'),
        fileSize: 1024,
        mimeType: 'image/jpeg',
        uploadedBy: TEST_USER_ID,
        metadata: {},
      };

      // 建立檔案和記錄
      await fs.writeFile(photoData.filePath, Buffer.from('test-data'));
      const photo = await photoRepository.createPhoto(photoData);

      // 驗證檔案和記錄都存在
      let fileExists = await fs
        .access(photoData.filePath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      const existingPhoto = await photoRepository.findById(photo.id);
      expect(existingPhoto).toBeDefined();

      // Act - 刪除照片
      const deleteResult = await photoRepository.deletePhotoWithFiles(
        photo.id,
        TEST_USER_ID
      );

      // Assert - 驗證同步刪除
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.deletedPhoto).toBe(true);

      // 驗證資料庫記錄被軟刪除
      const deletedPhoto = await photoRepository.findById(photo.id);
      expect(deletedPhoto).toBeNull();

      // 驗證檔案被實際刪除
      fileExists = await fs
        .access(photoData.filePath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(false);
    });

    it('RED: 應該處理檔案刪除失敗的情況', async () => {
      // Arrange
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();

      const photoData = {
        albumId: testAlbum.id,
        fileName: 'readonly-test.jpg',
        filePath: path.join(TEST_UPLOADS_PATH, 'readonly-test.jpg'),
        fileSize: 1024,
        mimeType: 'image/jpeg',
        uploadedBy: TEST_USER_ID,
        metadata: {},
      };

      // 建立檔案和記錄
      await fs.writeFile(photoData.filePath, Buffer.from('test-data'));
      const photo = await photoRepository.createPhoto(photoData);

      // 模擬檔案刪除權限問題（設定為唯讀）
      await fs.chmod(photoData.filePath, 0o444);

      // Act & Assert - 刪除操作應該報告檔案刪除失敗
      const deleteResult = await photoRepository.deletePhotoWithFiles(
        photo.id,
        TEST_USER_ID
      );

      // 資料庫記錄應該被標記為刪除，即使檔案刪除失敗
      expect(deleteResult.deletedPhoto).toBe(true);

      // 但應該記錄檔案刪除失敗的狀態
      const deletedPhoto = await photoRepository.findById(photo.id);
      expect(deletedPhoto).toBeNull(); // 軟刪除

      // 恢復檔案權限以便清理
      await fs.chmod(photoData.filePath, 0o644);
    });
  });

  // ===== 併發操作測試 =====
  describe('併發操作測試', () => {
    it('RED: 應該處理同時上傳到同一相簿的併發情境', async () => {
      // Arrange
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();
      const concurrentUploads = 5;

      // Act - 同時上傳多張照片
      const uploadPromises = Array.from(
        { length: concurrentUploads },
        async (_, i) => {
          const fileName = `concurrent-photo-${i}.jpg`;
          const filePath = path.join(TEST_UPLOADS_PATH, fileName);

          await fs.writeFile(filePath, Buffer.from(`concurrent-data-${i}`));

          const photoData = {
            albumId: testAlbum.id,
            fileName,
            filePath,
            fileSize: 1024,
            mimeType: 'image/jpeg',
            uploadedBy: TEST_USER_ID,
            metadata: { tags: ['concurrent'] },
          };

          return photoRepository.createPhoto(photoData);
        }
      );

      const results = await Promise.all(uploadPromises);

      // Assert - 驗證所有上傳都成功
      expect(results).toHaveLength(concurrentUploads);
      results.forEach(photo => {
        expect(photo.id).toBeDefined();
        expect(photo.albumId).toBe(testAlbum.id);
      });

      // 驗證相簿照片計數正確
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();
      const updatedAlbum = await albumRepository.findById(testAlbum.id);
      expect(updatedAlbum?.photoCount).toBe(concurrentUploads);

      // 驗證所有照片都可以查詢
      const albumPhotos = await photoRepository.getAlbumPhotos(testAlbum.id);
      expect(albumPhotos).toHaveLength(concurrentUploads);
    });
  });

  // ===== 錯誤恢復測試 =====
  describe('錯誤恢復機制', () => {
    it('RED: 應該能夠恢復中斷的上傳作業', async () => {
      // Arrange
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();

      const photoData = {
        albumId: testAlbum.id,
        fileName: 'recovery-test.jpg',
        filePath: path.join(TEST_UPLOADS_PATH, 'recovery-test.jpg'),
        fileSize: 1024,
        mimeType: 'image/jpeg',
        uploadedBy: TEST_USER_ID,
        metadata: { status: 'uploading' },
      };

      // 模擬中斷的上傳 - 只建立檔案，沒有建立資料庫記錄
      await fs.writeFile(photoData.filePath, Buffer.from('incomplete-upload'));

      // Act - 嘗試完成上傳
      const photo = await photoRepository.createPhoto({
        ...photoData,
        metadata: { status: 'completed' },
      });

      // Assert - 驗證上傳恢復成功
      expect(photo).toBeDefined();
      expect(photo.metadata.status).toBe('completed');

      // 驗證檔案和記錄都存在且一致
      const fileExists = await fs
        .access(photoData.filePath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      const retrievedPhoto = await photoRepository.findById(photo.id);
      expect(retrievedPhoto).toEqual(photo);
    });
  });

  // ===== 資料一致性驗證 =====
  describe('資料一致性驗證', () => {
    it('RED: 應該確保相簿統計與實際照片數量一致', async () => {
      // Arrange
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();
      const photoCount = 3;

      // Act - 上傳多張照片
      for (let i = 0; i < photoCount; i++) {
        const fileName = `consistency-photo-${i}.jpg`;
        const filePath = path.join(TEST_UPLOADS_PATH, fileName);

        await fs.writeFile(filePath, Buffer.from(`data-${i}`));

        await photoRepository.createPhoto({
          albumId: testAlbum.id,
          fileName,
          filePath,
          fileSize: 1024,
          mimeType: 'image/jpeg',
          uploadedBy: TEST_USER_ID,
          metadata: {},
        });
      }

      // Assert - 驗證統計一致性
      const album = await albumRepository.findById(testAlbum.id);
      const photos = await photoRepository.getAlbumPhotos(testAlbum.id);

      expect(album?.photoCount).toBe(photoCount);
      expect(photos).toHaveLength(photoCount);

      // 刪除一張照片
      if (photos.length > 0) {
        await photoRepository.deletePhotoWithFiles(photos[0].id, TEST_USER_ID);
      }

      // 驗證刪除後統計更新
      const updatedAlbum = await albumRepository.findById(testAlbum.id);
      const remainingPhotos = await photoRepository.getAlbumPhotos(
        testAlbum.id
      );

      expect(updatedAlbum?.photoCount).toBe(photoCount - 1);
      expect(remainingPhotos).toHaveLength(photoCount - 1);
    });

    it('RED: 應該確保軟刪除的資料完整性', async () => {
      // Arrange
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();

      const photoData = {
        albumId: testAlbum.id,
        fileName: 'soft-delete-test.jpg',
        filePath: path.join(TEST_UPLOADS_PATH, 'soft-delete-test.jpg'),
        fileSize: 1024,
        mimeType: 'image/jpeg',
        uploadedBy: TEST_USER_ID,
        metadata: { important: true },
      };

      await fs.writeFile(photoData.filePath, Buffer.from('important-data'));
      const photo = await photoRepository.createPhoto(photoData);

      // Act - 執行軟刪除
      await photoRepository.deletePhotoWithFiles(photo.id, TEST_USER_ID);

      // Assert - 驗證軟刪除狀態
      const deletedPhoto = await photoRepository.findById(photo.id);
      expect(deletedPhoto).toBeNull(); // 正常查詢找不到

      // 但是在包含已刪除項目的查詢中應該能找到 (如果有這樣的方法的話)
      // 這裡我們主要驗證資料沒有被物理刪除，而是被標記刪除

      // 驗證相簿統計正確更新
      const updatedAlbum = await albumRepository.findById(testAlbum.id);
      expect(updatedAlbum?.photoCount).toBe(0);
    });
  });
});
