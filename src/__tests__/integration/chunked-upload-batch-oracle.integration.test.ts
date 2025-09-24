/**
 * 分塊上傳和批次處理 Oracle 整合測試
 * Task 9.2: 建立 Oracle 系統整合測試
 *
 * 遵循 TDD 方法論
 * RED: 撰寫失敗的測試
 * GREEN: 實作最小程式碼讓測試通過
 * REFACTOR: 重構並改善程式碼品質
 * VERIFY: 確保所有測試通過並無回歸問題
 *
 * 測試範圍:
 * - 分塊上傳完整流程與 Oracle 狀態管理
 * - 批次處理佇列系統與 Oracle 追蹤
 * - 可恢復上傳機制
 * - 並行處理和資源管理
 * - 失敗處理和清理機制
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
import { ChunkedUploadService } from '@/lib/services/chunked-upload-service';
import { BatchQueueService } from '@/lib/services/batch-queue-service';
import { UploadProgressTracker } from '@/lib/services/upload-progress-tracker';
import { UploadRecoveryService } from '@/lib/services/upload-recovery-service';
import { getOracleConnection } from '@/lib/database/oracle-connection';
import type {
  Album,
  UploadSession,
  ChunkResult,
  BatchJobResult,
} from '@/lib/repositories/types/photo.types';

// 測試常數
const TEST_UPLOADS_PATH = path.join(
  process.cwd(),
  'test-uploads/chunked-batch'
);
const TEST_PROJECT_ID = 'TEST_PROJ_CHUNK';
const TEST_USER_ID = 'TEST_USER_CHUNK';
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks for testing

// 測試檔案生成工具
class TestFileGenerator {
  static generateRandomFile(sizeBytes: number): Buffer {
    return crypto.randomBytes(sizeBytes);
  }

  static calculateChecksum(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  static splitIntoChunks(data: Buffer, chunkSize: number): Buffer[] {
    const chunks: Buffer[] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.subarray(i, i + chunkSize));
    }
    return chunks;
  }
}

describe('分塊上傳和批次處理 Oracle 整合測試', () => {
  let testAlbum: Album;
  let chunkedUploadService: ChunkedUploadService;
  let batchQueueService: BatchQueueService;
  let progressTracker: UploadProgressTracker;
  let recoveryService: UploadRecoveryService;

  // ===== 測試環境設置 =====
  beforeAll(async () => {
    console.log('🔧 設置分塊上傳批次處理測試環境...');

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
        name: 'Chunked Upload Test Project',
        description: 'Test project for chunked upload and batch processing',
      }
    );

    // 建立測試使用者
    await oracle.executeQuery(
      `
      INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, created_at)
      VALUES (:id, :username, :email, 'test_hash', 'admin', 'Chunk', 'Tester', SYSTIMESTAMP)
    `,
      {
        id: TEST_USER_ID,
        username: 'chunk_test_user',
        email: 'chunk.test@pcm.test',
      }
    );

    // 初始化服務
    chunkedUploadService = new ChunkedUploadService();
    batchQueueService = new BatchQueueService();
    progressTracker = new UploadProgressTracker();
    recoveryService = new UploadRecoveryService();

    console.log('✅ 分塊上傳批次處理測試環境準備就緒');
  }, 60000); // 60s timeout

  afterAll(async () => {
    console.log('🧹 清理分塊上傳批次處理測試環境...');

    // 停止批次服務
    await batchQueueService.shutdown();

    // 清理測試檔案
    try {
      await fs.rm(TEST_UPLOADS_PATH, { recursive: true, force: true });
    } catch (error) {
      console.warn('清理測試檔案失敗:', error);
    }

    // 清理 Oracle 測試資料
    await cleanupOracleAfterTests();

    console.log('✅ 分塊上傳批次處理測試環境清理完成');
  });

  beforeEach(async () => {
    // 建立測試相簿
    const albumRepository = await OracleRepositoryFactory.getAlbumRepository();
    testAlbum = await albumRepository.createAlbum({
      projectId: TEST_PROJECT_ID,
      name: 'Chunked Test Album',
      description: 'Test album for chunked upload',
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
        // 清理上傳會話
        await chunkedUploadService.cleanupExpiredSessions();

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

  // ===== 分塊上傳基礎測試 =====
  describe('分塊上傳基礎功能', () => {
    it('RED: 應該成功初始化分塊上傳會話', async () => {
      // Arrange
      const fileMetadata = {
        fileName: 'chunked-test-1.jpg',
        fileSize: 5 * 1024 * 1024, // 5MB
        mimeType: 'image/jpeg',
        albumId: testAlbum.id,
        uploadedBy: TEST_USER_ID,
      };

      // Act
      const session = await chunkedUploadService.initializeUpload(fileMetadata);

      // Assert
      expect(session).toBeDefined();
      expect(session.uploadId).toBeDefined();
      expect(session.fileName).toBe(fileMetadata.fileName);
      expect(session.fileSize).toBe(fileMetadata.fileSize);
      expect(session.totalChunks).toBeGreaterThan(0);
      expect(session.chunkSize).toBe(CHUNK_SIZE);
      expect(session.expiresAt).toBeInstanceOf(Date);

      // 驗證 Oracle 中的會話記錄
      const oracle = getOracleConnection();
      const sessionQuery = await oracle.executeQuery(
        'SELECT * FROM upload_sessions WHERE upload_id = :uploadId',
        { uploadId: session.uploadId }
      );

      expect(sessionQuery.rows).toHaveLength(1);
      expect(sessionQuery.rows[0].file_name).toBe(fileMetadata.fileName);
    });

    it('RED: 應該成功上傳單個分塊', async () => {
      // Arrange
      const fileSize = 2 * 1024 * 1024; // 2MB
      const testData = TestFileGenerator.generateRandomFile(fileSize);
      const chunks = TestFileGenerator.splitIntoChunks(testData, CHUNK_SIZE);

      const fileMetadata = {
        fileName: 'chunked-test-2.jpg',
        fileSize: fileSize,
        mimeType: 'image/jpeg',
        albumId: testAlbum.id,
        uploadedBy: TEST_USER_ID,
      };

      const session = await chunkedUploadService.initializeUpload(fileMetadata);

      // Act
      const chunkResult = await chunkedUploadService.uploadChunk(
        session.uploadId,
        0,
        chunks[0]
      );

      // Assert
      expect(chunkResult).toBeDefined();
      expect(chunkResult.chunkNumber).toBe(0);
      expect(chunkResult.checksum).toBeDefined();
      expect(chunkResult.isComplete).toBe(false);
      expect(chunkResult.uploadedAt).toBeInstanceOf(Date);

      // 驗證 Oracle 中的分塊記錄
      const oracle = getOracleConnection();
      const chunkQuery = await oracle.executeQuery(
        'SELECT * FROM upload_chunks WHERE upload_id = :uploadId AND chunk_number = :chunkNumber',
        { uploadId: session.uploadId, chunkNumber: 0 }
      );

      expect(chunkQuery.rows).toHaveLength(1);
      expect(chunkQuery.rows[0].checksum).toBe(chunkResult.checksum);
    });

    it('RED: 應該成功完成多分塊上傳', async () => {
      // Arrange
      const fileSize = 3 * 1024 * 1024; // 3MB (需要3個分塊)
      const testData = TestFileGenerator.generateRandomFile(fileSize);
      const chunks = TestFileGenerator.splitIntoChunks(testData, CHUNK_SIZE);

      const fileMetadata = {
        fileName: 'chunked-test-3.jpg',
        fileSize: fileSize,
        mimeType: 'image/jpeg',
        albumId: testAlbum.id,
        uploadedBy: TEST_USER_ID,
      };

      const session = await chunkedUploadService.initializeUpload(fileMetadata);

      // Act - 上傳所有分塊
      const chunkResults: ChunkResult[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const result = await chunkedUploadService.uploadChunk(
          session.uploadId,
          i,
          chunks[i]
        );
        chunkResults.push(result);
      }

      // 完成上傳
      const finalResult = await chunkedUploadService.finalizeUpload(
        session.uploadId
      );

      // Assert
      expect(chunkResults).toHaveLength(chunks.length);
      expect(finalResult).toBeDefined();
      expect(finalResult.success).toBe(true);
      expect(finalResult.filePath).toBeDefined();

      // 驗證最終檔案
      const finalFilePath = path.join(
        TEST_UPLOADS_PATH,
        TEST_PROJECT_ID,
        testAlbum.name,
        fileMetadata.fileName
      );
      const fileExists = await fs
        .access(finalFilePath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      const reconstructedData = await fs.readFile(finalFilePath);
      expect(reconstructedData.equals(testData)).toBe(true);

      // 驗證照片記錄已建立
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();
      const albumPhotos = await photoRepository.getAlbumPhotos(testAlbum.id);
      expect(albumPhotos).toHaveLength(1);
      expect(albumPhotos[0].fileName).toBe(fileMetadata.fileName);
    });
  });

  // ===== 可恢復上傳測試 =====
  describe('可恢復上傳機制', () => {
    it('RED: 應該能查詢上傳狀態', async () => {
      // Arrange
      const fileMetadata = {
        fileName: 'resumable-test-1.jpg',
        fileSize: 4 * 1024 * 1024, // 4MB
        mimeType: 'image/jpeg',
        albumId: testAlbum.id,
        uploadedBy: TEST_USER_ID,
      };

      const session = await chunkedUploadService.initializeUpload(fileMetadata);

      // 上傳部分分塊
      const testData = TestFileGenerator.generateRandomFile(
        fileMetadata.fileSize
      );
      const chunks = TestFileGenerator.splitIntoChunks(testData, CHUNK_SIZE);

      await chunkedUploadService.uploadChunk(session.uploadId, 0, chunks[0]);
      await chunkedUploadService.uploadChunk(session.uploadId, 1, chunks[1]);

      // Act
      const status = await chunkedUploadService.getUploadStatus(
        session.uploadId
      );

      // Assert
      expect(status).toBeDefined();
      expect(status.uploadId).toBe(session.uploadId);
      expect(status.completedChunks).toEqual([0, 1]);
      expect(status.totalChunks).toBe(chunks.length);
      expect(status.uploadedBytes).toBe(chunks[0].length + chunks[1].length);
      expect(status.totalBytes).toBe(fileMetadata.fileSize);
      expect(status.status).toBe('uploading');
    });

    it('RED: 應該支援斷線重傳', async () => {
      // Arrange
      const fileSize = 3 * 1024 * 1024; // 3MB
      const testData = TestFileGenerator.generateRandomFile(fileSize);
      const chunks = TestFileGenerator.splitIntoChunks(testData, CHUNK_SIZE);

      const fileMetadata = {
        fileName: 'resume-test-1.jpg',
        fileSize: fileSize,
        mimeType: 'image/jpeg',
        albumId: testAlbum.id,
        uploadedBy: TEST_USER_ID,
      };

      const session = await chunkedUploadService.initializeUpload(fileMetadata);

      // 上傳前兩個分塊
      await chunkedUploadService.uploadChunk(session.uploadId, 0, chunks[0]);
      await chunkedUploadService.uploadChunk(session.uploadId, 1, chunks[1]);

      // 模擬中斷 - 重新獲取狀態
      const statusBeforeResume = await chunkedUploadService.getUploadStatus(
        session.uploadId
      );

      // Act - 恢復上傳剩餘分塊
      const remainingChunks = chunks.slice(
        statusBeforeResume.completedChunks.length
      );
      for (let i = 0; i < remainingChunks.length; i++) {
        const chunkIndex = statusBeforeResume.completedChunks.length + i;
        await chunkedUploadService.uploadChunk(
          session.uploadId,
          chunkIndex,
          remainingChunks[i]
        );
      }

      const finalResult = await chunkedUploadService.finalizeUpload(
        session.uploadId
      );

      // Assert
      expect(finalResult.success).toBe(true);

      // 驗證檔案完整性
      const finalFilePath = path.join(
        TEST_UPLOADS_PATH,
        TEST_PROJECT_ID,
        testAlbum.name,
        fileMetadata.fileName
      );
      const reconstructedData = await fs.readFile(finalFilePath);
      expect(reconstructedData.equals(testData)).toBe(true);
    });

    it('RED: 應該能恢復損壞的上傳', async () => {
      // Arrange
      const fileMetadata = {
        fileName: 'corrupted-recovery-test.jpg',
        fileSize: 2 * 1024 * 1024, // 2MB
        mimeType: 'image/jpeg',
        albumId: testAlbum.id,
        uploadedBy: TEST_USER_ID,
      };

      const session = await chunkedUploadService.initializeUpload(fileMetadata);
      const testData = TestFileGenerator.generateRandomFile(
        fileMetadata.fileSize
      );
      const chunks = TestFileGenerator.splitIntoChunks(testData, CHUNK_SIZE);

      // 上傳第一個分塊
      await chunkedUploadService.uploadChunk(session.uploadId, 0, chunks[0]);

      // 模擬損壞 - 直接在資料庫中破壞checksum
      const oracle = getOracleConnection();
      await oracle.executeQuery(
        'UPDATE upload_chunks SET checksum = :corruptedChecksum WHERE upload_id = :uploadId AND chunk_number = 0',
        { corruptedChecksum: 'corrupted', uploadId: session.uploadId }
      );

      // Act - 使用恢復服務檢查和修復
      const repairResult = await recoveryService.validateAndRepairUpload(
        session.uploadId
      );

      // Assert
      expect(repairResult.repairRequired).toBe(true);
      expect(repairResult.corruptedChunks).toContain(0);

      // 重新上傳損壞的分塊
      await chunkedUploadService.uploadChunk(session.uploadId, 0, chunks[0]);

      // 完成上傳
      const finalResult = await chunkedUploadService.finalizeUpload(
        session.uploadId
      );
      expect(finalResult.success).toBe(true);
    });
  });

  // ===== 批次處理測試 =====
  describe('批次處理系統', () => {
    it('RED: 應該成功處理批次上傳作業', async () => {
      // Arrange
      const batchFiles = [
        { name: 'batch-1.jpg', size: 1024 * 1024 },
        { name: 'batch-2.jpg', size: 1.5 * 1024 * 1024 },
        { name: 'batch-3.jpg', size: 2 * 1024 * 1024 },
      ];

      const testFiles = batchFiles.map(file => ({
        name: file.name,
        data: TestFileGenerator.generateRandomFile(file.size),
        size: file.size,
      }));

      // Act
      const batchJob = await batchQueueService.enqueueBatchUpload(
        testFiles,
        TEST_PROJECT_ID,
        testAlbum.id,
        TEST_USER_ID
      );

      // 等待批次處理完成
      let batchStatus = await batchQueueService.getBatchStatus(
        batchJob.batchId
      );
      const maxWaitTime = 30000; // 30秒
      const startTime = Date.now();

      while (
        batchStatus.status === 'processing' &&
        Date.now() - startTime < maxWaitTime
      ) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        batchStatus = await batchQueueService.getBatchStatus(batchJob.batchId);
      }

      // Assert
      expect(batchJob).toBeDefined();
      expect(batchJob.batchId).toBeDefined();
      expect(batchStatus.status).toBe('completed');
      expect(batchStatus.successfulUploads).toBe(testFiles.length);
      expect(batchStatus.failedUploads).toBe(0);

      // 驗證照片都已建立
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();
      const albumPhotos = await photoRepository.getAlbumPhotos(testAlbum.id);
      expect(albumPhotos).toHaveLength(testFiles.length);

      // 驗證檔案都已儲存
      for (const testFile of testFiles) {
        const filePath = path.join(
          TEST_UPLOADS_PATH,
          TEST_PROJECT_ID,
          testAlbum.name,
          testFile.name
        );
        const fileExists = await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false);
        expect(fileExists).toBe(true);
      }
    });

    it('RED: 應該處理批次作業中的部分失敗', async () => {
      // Arrange
      const batchFiles = [
        { name: 'valid-1.jpg', size: 1024 * 1024, valid: true },
        { name: 'invalid.txt', size: 1024, valid: false }, // 無效檔案類型
        { name: 'valid-2.jpg', size: 1024 * 1024, valid: true },
      ];

      const testFiles = batchFiles.map(file => ({
        name: file.name,
        data: TestFileGenerator.generateRandomFile(file.size),
        size: file.size,
        mimeType: file.valid ? 'image/jpeg' : 'text/plain',
      }));

      // Act
      const batchJob = await batchQueueService.enqueueBatchUpload(
        testFiles,
        TEST_PROJECT_ID,
        testAlbum.id,
        TEST_USER_ID
      );

      // 等待批次處理完成
      let batchStatus = await batchQueueService.getBatchStatus(
        batchJob.batchId
      );
      const maxWaitTime = 30000;
      const startTime = Date.now();

      while (
        batchStatus.status === 'processing' &&
        Date.now() - startTime < maxWaitTime
      ) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        batchStatus = await batchQueueService.getBatchStatus(batchJob.batchId);
      }

      // Assert
      expect(batchStatus.status).toBe('partial');
      expect(batchStatus.successfulUploads).toBe(2); // 只有有效的圖片檔案
      expect(batchStatus.failedUploads).toBe(1); // 無效檔案
      expect(batchStatus.errors).toHaveLength(1);

      // 驗證只有有效照片被建立
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();
      const albumPhotos = await photoRepository.getAlbumPhotos(testAlbum.id);
      expect(albumPhotos).toHaveLength(2);

      // 驗證照片名稱
      const photoNames = albumPhotos.map(photo => photo.fileName);
      expect(photoNames).toContain('valid-1.jpg');
      expect(photoNames).toContain('valid-2.jpg');
      expect(photoNames).not.toContain('invalid.txt');
    });
  });

  // ===== 進度追蹤測試 =====
  describe('進度追蹤系統', () => {
    it('RED: 應該能追蹤分塊上傳進度', async () => {
      // Arrange
      const fileSize = 4 * 1024 * 1024; // 4MB
      const testData = TestFileGenerator.generateRandomFile(fileSize);
      const chunks = TestFileGenerator.splitIntoChunks(testData, CHUNK_SIZE);

      const fileMetadata = {
        fileName: 'progress-test.jpg',
        fileSize: fileSize,
        mimeType: 'image/jpeg',
        albumId: testAlbum.id,
        uploadedBy: TEST_USER_ID,
      };

      const session = await chunkedUploadService.initializeUpload(fileMetadata);

      // Act - 逐塊上傳並追蹤進度
      const progressUpdates: any[] = [];

      for (let i = 0; i < chunks.length; i++) {
        await chunkedUploadService.uploadChunk(session.uploadId, i, chunks[i]);

        const progress = await progressTracker.getUploadProgress(
          session.uploadId
        );
        progressUpdates.push({
          chunkNumber: i,
          progress: progress,
        });
      }

      // Assert
      expect(progressUpdates).toHaveLength(chunks.length);

      // 驗證進度遞增
      for (let i = 0; i < progressUpdates.length; i++) {
        const update = progressUpdates[i];
        expect(update.progress.uploadedChunks).toBe(i + 1);
        expect(update.progress.totalChunks).toBe(chunks.length);
        expect(update.progress.percentComplete).toBe(
          Math.round(((i + 1) / chunks.length) * 100)
        );
      }

      // 最後一次更新應該是100%
      const finalUpdate = progressUpdates[progressUpdates.length - 1];
      expect(finalUpdate.progress.percentComplete).toBe(100);
    });

    it('RED: 應該能追蹤批次處理總體進度', async () => {
      // Arrange
      const batchFiles = Array.from({ length: 5 }, (_, i) => ({
        name: `batch-progress-${i}.jpg`,
        data: TestFileGenerator.generateRandomFile(1024 * 1024), // 1MB each
        size: 1024 * 1024,
      }));

      // Act
      const batchJob = await batchQueueService.enqueueBatchUpload(
        batchFiles,
        TEST_PROJECT_ID,
        testAlbum.id,
        TEST_USER_ID
      );

      // 監控批次進度
      const progressUpdates: any[] = [];
      const maxWaitTime = 30000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const batchProgress = await progressTracker.getBatchProgress(
          batchJob.batchId
        );
        progressUpdates.push(batchProgress);

        if (
          batchProgress.status === 'completed' ||
          batchProgress.status === 'failed'
        ) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Assert
      expect(progressUpdates.length).toBeGreaterThan(0);

      // 最終狀態應該是完成
      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress.status).toBe('completed');
      expect(finalProgress.processedFiles).toBe(batchFiles.length);
      expect(finalProgress.successfulUploads).toBe(batchFiles.length);
    });
  });

  // ===== 資源管理測試 =====
  describe('資源管理和清理', () => {
    it('RED: 應該清理過期的上傳會話', async () => {
      // Arrange - 建立會話並手動設置為過期
      const fileMetadata = {
        fileName: 'expired-session.jpg',
        fileSize: 1024 * 1024,
        mimeType: 'image/jpeg',
        albumId: testAlbum.id,
        uploadedBy: TEST_USER_ID,
      };

      const session = await chunkedUploadService.initializeUpload(fileMetadata);

      // 手動設置會話為過期
      const oracle = getOracleConnection();
      await oracle.executeQuery(
        "UPDATE upload_sessions SET expires_at = SYSTIMESTAMP - INTERVAL '1' HOUR WHERE upload_id = :uploadId",
        { uploadId: session.uploadId }
      );

      // Act
      const cleanupResult = await chunkedUploadService.cleanupExpiredSessions();

      // Assert
      expect(cleanupResult.cleanedSessions).toBeGreaterThanOrEqual(1);

      // 驗證過期會話已被清理
      const sessionCheck = await oracle.executeQuery(
        'SELECT * FROM upload_sessions WHERE upload_id = :uploadId',
        { uploadId: session.uploadId }
      );
      expect(sessionCheck.rows).toHaveLength(0);
    });

    it('RED: 應該管理並行上傳的資源使用', async () => {
      // Arrange - 準備多個同時上傳
      const concurrentUploads = 3;
      const fileSize = 2 * 1024 * 1024; // 2MB each

      const uploadPromises = Array.from(
        { length: concurrentUploads },
        async (_, i) => {
          const fileMetadata = {
            fileName: `concurrent-${i}.jpg`,
            fileSize: fileSize,
            mimeType: 'image/jpeg',
            albumId: testAlbum.id,
            uploadedBy: TEST_USER_ID,
          };

          const testData = TestFileGenerator.generateRandomFile(fileSize);
          const chunks = TestFileGenerator.splitIntoChunks(
            testData,
            CHUNK_SIZE
          );

          const session =
            await chunkedUploadService.initializeUpload(fileMetadata);

          // 上傳所有分塊
          for (let j = 0; j < chunks.length; j++) {
            await chunkedUploadService.uploadChunk(
              session.uploadId,
              j,
              chunks[j]
            );
          }

          return chunkedUploadService.finalizeUpload(session.uploadId);
        }
      );

      // Act - 同時執行所有上傳
      const results = await Promise.all(uploadPromises);

      // Assert
      expect(results).toHaveLength(concurrentUploads);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // 驗證所有檔案都已建立
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();
      const albumPhotos = await photoRepository.getAlbumPhotos(testAlbum.id);
      expect(albumPhotos).toHaveLength(concurrentUploads);
    });
  });

  // ===== 錯誤處理測試 =====
  describe('錯誤處理和恢復', () => {
    it('RED: 應該處理分塊上傳失敗', async () => {
      // Arrange
      const fileMetadata = {
        fileName: 'chunk-failure-test.jpg',
        fileSize: 3 * 1024 * 1024,
        mimeType: 'image/jpeg',
        albumId: testAlbum.id,
        uploadedBy: TEST_USER_ID,
      };

      const session = await chunkedUploadService.initializeUpload(fileMetadata);

      // Act & Assert - 嘗試上傳無效分塊
      await expect(
        chunkedUploadService.uploadChunk(session.uploadId, 0, Buffer.alloc(0))
      ).rejects.toThrow();

      // 驗證上傳狀態未被破壞
      const status = await chunkedUploadService.getUploadStatus(
        session.uploadId
      );
      expect(status.completedChunks).toHaveLength(0);
      expect(status.status).toBe('uploading');
    });

    it('RED: 應該處理批次作業取消', async () => {
      // Arrange
      const largeBatch = Array.from({ length: 10 }, (_, i) => ({
        name: `cancel-test-${i}.jpg`,
        data: TestFileGenerator.generateRandomFile(1024 * 1024),
        size: 1024 * 1024,
      }));

      // Act
      const batchJob = await batchQueueService.enqueueBatchUpload(
        largeBatch,
        TEST_PROJECT_ID,
        testAlbum.id,
        TEST_USER_ID
      );

      // 立即取消批次
      const cancelResult = await batchQueueService.cancelBatch(
        batchJob.batchId
      );

      // Assert
      expect(cancelResult.success).toBe(true);

      // 檢查最終狀態
      const finalStatus = await batchQueueService.getBatchStatus(
        batchJob.batchId
      );
      expect(finalStatus.status).toBe('cancelled');

      // 驗證部分或全部檔案未被處理
      const photoRepository =
        await OracleRepositoryFactory.getPhotoRepository();
      const albumPhotos = await photoRepository.getAlbumPhotos(testAlbum.id);
      expect(albumPhotos.length).toBeLessThan(largeBatch.length);
    });
  });

  // ===== Oracle 特定測試 =====
  describe('Oracle 資料庫特定功能', () => {
    it('RED: 應該利用 Oracle 觸發器自動更新統計', async () => {
      // Arrange
      const fileMetadata = {
        fileName: 'trigger-test.jpg',
        fileSize: 1024 * 1024,
        mimeType: 'image/jpeg',
        albumId: testAlbum.id,
        uploadedBy: TEST_USER_ID,
      };

      // 取得初始相簿統計
      const albumRepository =
        await OracleRepositoryFactory.getAlbumRepository();
      const initialAlbum = await albumRepository.findById(testAlbum.id);
      const initialCount = initialAlbum!.photoCount;

      // Act - 完成分塊上傳
      const testData = TestFileGenerator.generateRandomFile(
        fileMetadata.fileSize
      );
      const chunks = TestFileGenerator.splitIntoChunks(testData, CHUNK_SIZE);

      const session = await chunkedUploadService.initializeUpload(fileMetadata);

      for (let i = 0; i < chunks.length; i++) {
        await chunkedUploadService.uploadChunk(session.uploadId, i, chunks[i]);
      }

      await chunkedUploadService.finalizeUpload(session.uploadId);

      // Assert - 驗證 Oracle 觸發器自動更新了統計
      const updatedAlbum = await albumRepository.findById(testAlbum.id);
      expect(updatedAlbum!.photoCount).toBe(initialCount + 1);
    });

    it('RED: 應該使用 Oracle 事務確保資料一致性', async () => {
      // Arrange
      const fileMetadata = {
        fileName: 'transaction-test.jpg',
        fileSize: 2 * 1024 * 1024,
        mimeType: 'image/jpeg',
        albumId: testAlbum.id,
        uploadedBy: TEST_USER_ID,
      };

      const session = await chunkedUploadService.initializeUpload(fileMetadata);
      const testData = TestFileGenerator.generateRandomFile(
        fileMetadata.fileSize
      );
      const chunks = TestFileGenerator.splitIntoChunks(testData, CHUNK_SIZE);

      // Act - 在事務中上傳（模擬事務失敗）
      const oracle = getOracleConnection();

      try {
        await oracle.withTransaction(async () => {
          // 上傳所有分塊
          for (let i = 0; i < chunks.length; i++) {
            await chunkedUploadService.uploadChunk(
              session.uploadId,
              i,
              chunks[i]
            );
          }

          // 故意拋出錯誤以測試回滾
          throw new Error('Intentional transaction rollback');
        });
      } catch (error) {
        expect(error.message).toBe('Intentional transaction rollback');
      }

      // Assert - 驗證事務回滾後狀態
      const status = await chunkedUploadService.getUploadStatus(
        session.uploadId
      );

      // 在事務回滾後，分塊應該不存在或狀態應該是初始狀態
      if (status) {
        expect(status.completedChunks).toHaveLength(0);
      }
    });
  });
});
