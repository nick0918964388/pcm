/**
 * 分塊上傳服務測試
 * Task 4.1: 建立分塊上傳核心架構
 *
 * 遵循 TDD 方法論
 * RED: 撰寫失敗的測試
 * GREEN: 實作最小程式碼讓測試通過
 * REFACTOR: 重構並改善程式碼品質
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChunkedUploadService } from '../chunked-upload-service';
import { getOracleConnection } from '../../database/oracle-connection';

// 模擬 Oracle 連線
vi.mock('../../database/oracle-connection');

// 模擬 Oracle 常數
const MOCK_BIND_OUT = 'BIND_OUT';
const MOCK_STRING = 'STRING';

describe('ChunkedUploadService', () => {
  let service: ChunkedUploadService;
  let mockOracleConnection: any;

  beforeEach(() => {
    // 設定模擬的 Oracle 連線
    mockOracleConnection = {
      execute: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      BIND_OUT: MOCK_BIND_OUT,
      STRING: MOCK_STRING,
      healthCheck: vi
        .fn()
        .mockResolvedValue({ success: true, data: { isHealthy: true } }),
    };

    vi.mocked(getOracleConnection).mockReturnValue(mockOracleConnection);
    service = new ChunkedUploadService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初始化上傳作業 (Initialize Upload)', () => {
    it('應該成功初始化分塊上傳作業', async () => {
      // Arrange
      const fileMetadata = {
        fileName: 'large-photo.jpg',
        fileSize: 5242880, // 5MB
        mimeType: 'image/jpeg',
        albumId: 'album001',
        uploadedBy: 'user123',
      };

      const mockUploadSession = {
        upload_id: 'upload_001',
        file_name: 'large-photo.jpg',
        file_size: 5242880,
        total_chunks: 5, // 5MB / 1MB = 5 chunks
        chunk_size: 1048576, // 1MB
        album_id: 'album001',
        uploaded_by: 'user123',
        status: 'initialized',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };

      // 模擬插入上傳會話
      mockOracleConnection.execute
        .mockResolvedValueOnce({
          rows: [],
          outBinds: { newUploadId: 'upload_001' },
        })
        // 模擬查詢上傳會話
        .mockResolvedValueOnce({
          rows: [mockUploadSession],
        });

      // Act
      const result = await service.initializeUpload(fileMetadata);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        uploadId: 'upload_001',
        fileName: 'large-photo.jpg',
        fileSize: 5242880,
        totalChunks: 5,
        chunkSize: 1048576,
        expiresAt: expect.any(Date),
      });

      // 驗證 SQL 插入
      expect(mockOracleConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO upload_sessions'),
        expect.objectContaining({
          file_name: 'large-photo.jpg',
          file_size: 5242880,
          total_chunks: 5,
          chunk_size: 1048576,
        }),
        {}
      );
    });

    it('應該正確計算分塊數量', async () => {
      // Arrange
      const testCases = [
        { fileSize: 1048576, expectedChunks: 1 }, // 1MB
        { fileSize: 1572864, expectedChunks: 2 }, // 1.5MB
        { fileSize: 5242880, expectedChunks: 5 }, // 5MB
        { fileSize: 10485760, expectedChunks: 10 }, // 10MB
      ];

      for (const testCase of testCases) {
        const fileMetadata = {
          fileName: 'test-file.jpg',
          fileSize: testCase.fileSize,
          mimeType: 'image/jpeg',
          albumId: 'album001',
          uploadedBy: 'user123',
        };

        // 模擬返回
        mockOracleConnection.execute
          .mockResolvedValueOnce({
            rows: [],
            outBinds: { newUploadId: 'upload_001' },
          })
          .mockResolvedValueOnce({
            rows: [
              {
                upload_id: 'upload_001',
                total_chunks: testCase.expectedChunks,
                chunk_size: 1048576,
              },
            ],
          });

        // Act
        const result = await service.initializeUpload(fileMetadata);

        // Assert
        expect(result.data?.totalChunks).toBe(testCase.expectedChunks);
      }
    });
  });

  describe('分塊上傳 (Upload Chunk)', () => {
    it('應該成功上傳單一分塊', async () => {
      // Arrange
      const uploadId = 'upload_001';
      const chunkNumber = 1;
      const chunkData = Buffer.from('fake chunk data');
      const expectedChecksum = 'sha256_checksum_value';

      const mockChunkResult = {
        chunk_number: 1,
        checksum: expectedChecksum,
        uploaded_at: new Date(),
        status: 'completed',
      };

      // 模擬檢查會話有效性
      mockOracleConnection.execute
        .mockResolvedValueOnce({
          rows: [
            {
              upload_id: uploadId,
              status: 'uploading',
              expires_at: new Date(Date.now() + 60000),
            },
          ],
        })
        // 模擬插入分塊記錄
        .mockResolvedValueOnce({ rows: [] })
        // 模擬查詢分塊結果
        .mockResolvedValueOnce({
          rows: [mockChunkResult],
        });

      // Act
      const result = await service.uploadChunk(
        uploadId,
        chunkNumber,
        chunkData
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        chunkNumber: 1,
        checksum: expectedChecksum,
        uploadedAt: expect.any(Date),
        isComplete: true,
      });

      // 驗證插入分塊記錄
      expect(mockOracleConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO upload_chunks'),
        expect.objectContaining({
          upload_id: uploadId,
          chunk_number: chunkNumber,
          checksum: expect.any(String),
        }),
        {}
      );
    });

    it('應該拒絕上傳到已過期的會話', async () => {
      // Arrange
      const uploadId = 'expired_upload';
      const chunkNumber = 1;
      const chunkData = Buffer.from('fake chunk data');

      // 模擬過期的會話
      mockOracleConnection.execute.mockResolvedValue({
        rows: [
          {
            upload_id: uploadId,
            status: 'expired',
            expires_at: new Date(Date.now() - 60000),
          },
        ],
      });

      // Act
      const result = await service.uploadChunk(
        uploadId,
        chunkNumber,
        chunkData
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('上傳會話已過期');
    });

    it('應該驗證分塊完整性', async () => {
      // Arrange
      const uploadId = 'upload_001';
      const chunkNumber = 1;
      const originalData = Buffer.from('test chunk data');

      // 模擬會話有效
      mockOracleConnection.execute.mockResolvedValueOnce({
        rows: [
          {
            upload_id: uploadId,
            status: 'uploading',
            expires_at: new Date(Date.now() + 60000),
          },
        ],
      });

      // Act
      const result = await service.uploadChunk(
        uploadId,
        chunkNumber,
        originalData
      );

      // Assert
      const insertCall = mockOracleConnection.execute.mock.calls.find(call =>
        call[0].includes('INSERT INTO upload_chunks')
      );
      expect(insertCall).toBeDefined();
      expect(insertCall[1]).toHaveProperty('checksum');
      expect(typeof insertCall[1].checksum).toBe('string');
      expect(insertCall[1].checksum.length).toBeGreaterThan(0);
    });
  });

  describe('完成上傳 (Finalize Upload)', () => {
    it('應該成功完成上傳並合併分塊', async () => {
      // Arrange
      const uploadId = 'upload_001';
      const mockUploadSession = {
        upload_id: uploadId,
        file_name: 'test-file.jpg',
        file_size: 2097152, // 2MB
        total_chunks: 2,
        album_id: 'album001',
        uploaded_by: 'user123',
      };

      const mockCompletedChunks = [
        { chunk_number: 1, checksum: 'chunk1_checksum' },
        { chunk_number: 2, checksum: 'chunk2_checksum' },
      ];

      const mockFinalFile = {
        id: 'photo_001',
        file_name: 'test-file.jpg',
        file_path: '/uploads/photos/proj001/album001/test-file.jpg',
        file_size: 2097152,
        uploaded_at: new Date(),
      };

      // 模擬查詢上傳會話
      mockOracleConnection.execute
        .mockResolvedValueOnce({ rows: [mockUploadSession] })
        // 模擬查詢已完成的分塊
        .mockResolvedValueOnce({ rows: mockCompletedChunks })
        // 模擬插入最終照片記錄
        .mockResolvedValueOnce({
          rows: [],
          outBinds: { newPhotoId: 'photo_001' },
        })
        // 模擬查詢最終照片
        .mockResolvedValueOnce({ rows: [mockFinalFile] })
        // 模擬清理上傳會話
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await service.finalizeUpload(uploadId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 'photo_001',
        fileName: 'test-file.jpg',
        filePath: '/uploads/photos/proj001/album001/test-file.jpg',
        fileSize: 2097152,
        uploadedAt: expect.any(Date),
      });

      // 驗證插入照片記錄
      expect(mockOracleConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO photos'),
        expect.objectContaining({
          album_id: 'album001',
          file_name: 'test-file.jpg',
          file_size: 2097152,
        }),
        {}
      );
    });

    it('應該檢查所有分塊是否完成', async () => {
      // Arrange
      const uploadId = 'upload_001';
      const mockUploadSession = {
        upload_id: uploadId,
        total_chunks: 3,
      };

      const mockIncompleteChunks = [
        { chunk_number: 1, checksum: 'chunk1_checksum' },
        { chunk_number: 2, checksum: 'chunk2_checksum' },
        // 缺少 chunk 3
      ];

      // 模擬查詢上傳會話
      mockOracleConnection.execute
        .mockResolvedValueOnce({ rows: [mockUploadSession] })
        // 模擬查詢不完整的分塊列表
        .mockResolvedValueOnce({ rows: mockIncompleteChunks });

      // Act
      const result = await service.finalizeUpload(uploadId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('分塊上傳未完成');
    });
  });

  describe('上傳狀態查詢 (Get Upload Status)', () => {
    it('應該返回上傳進度狀態', async () => {
      // Arrange
      const uploadId = 'upload_001';
      const mockUploadSession = {
        upload_id: uploadId,
        file_name: 'test-file.jpg',
        file_size: 3145728, // 3MB
        total_chunks: 3,
        status: 'uploading',
        created_at: new Date(),
      };

      const mockCompletedChunks = [
        { chunk_number: 1 },
        { chunk_number: 3 },
        // 缺少 chunk 2
      ];

      // 模擬查詢上傳會話
      mockOracleConnection.execute
        .mockResolvedValueOnce({ rows: [mockUploadSession] })
        // 模擬查詢已完成分塊
        .mockResolvedValueOnce({ rows: mockCompletedChunks });

      // Act
      const result = await service.getUploadStatus(uploadId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        uploadId: uploadId,
        completedChunks: [1, 3],
        totalChunks: 3,
        uploadedBytes: 2097152, // 2MB (2 chunks)
        totalBytes: 3145728, // 3MB
        status: 'uploading',
      });
    });

    it('應該處理不存在的上傳會話', async () => {
      // Arrange
      const uploadId = 'nonexistent_upload';

      // 模擬空結果
      mockOracleConnection.execute.mockResolvedValue({ rows: [] });

      // Act
      const result = await service.getUploadStatus(uploadId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('上傳會話不存在');
    });
  });

  describe('取消上傳 (Cancel Upload)', () => {
    it('應該成功取消上傳並清理資源', async () => {
      // Arrange
      const uploadId = 'upload_001';

      // 模擬更新上傳狀態為取消
      mockOracleConnection.execute
        .mockResolvedValueOnce({ rows: [{}] }) // 更新上傳會話狀態
        .mockResolvedValueOnce({ rows: [] }); // 刪除分塊記錄

      // Act
      const result = await service.cancelUpload(uploadId);

      // Assert
      expect(result.success).toBe(true);

      // 驗證執行了2次SQL：更新會話狀態和刪除分塊記錄
      expect(mockOracleConnection.execute).toHaveBeenCalledTimes(2);

      // 驗證第一次調用：更新會話狀態
      const firstCall = mockOracleConnection.execute.mock.calls[0];
      expect(firstCall[0]).toContain('UPDATE upload_sessions');
      expect(firstCall[1]).toEqual({
        status: 'cancelled',
        upload_id: uploadId,
      });

      // 驗證第二次調用：清理分塊記錄
      const secondCall = mockOracleConnection.execute.mock.calls[1];
      expect(secondCall[0]).toContain('DELETE FROM upload_chunks');
      expect(secondCall[1]).toEqual({ upload_id: uploadId });
    });
  });

  describe('分塊完整性驗證 (Chunk Integrity)', () => {
    it('應該生成正確的 SHA-256 checksum', () => {
      // Arrange
      const testData = Buffer.from('test chunk data');

      // Act
      const checksum = service.generateChecksum(testData);

      // Assert
      expect(checksum).toBe(
        '34fa0947d659ce6343cbfe6be3a1ca882f6b21b35232210f194791d545440c40'
      );
      expect(checksum.length).toBe(64); // SHA-256 應該是64個字符
    });

    it('應該驗證分塊數據完整性', async () => {
      // Arrange
      const originalData = Buffer.from('test chunk data');
      const validChecksum = service.generateChecksum(originalData);
      const invalidChecksum = 'invalid_checksum';

      // Act & Assert
      expect(service.verifyChunkIntegrity(originalData, validChecksum)).toBe(
        true
      );
      expect(service.verifyChunkIntegrity(originalData, invalidChecksum)).toBe(
        false
      );
    });
  });

  describe('上傳會話管理 (Session Management)', () => {
    it('應該清理過期的上傳會話', async () => {
      // Arrange
      const expiredSessions = [
        { upload_id: 'expired_1', expires_at: new Date(Date.now() - 60000) },
        { upload_id: 'expired_2', expires_at: new Date(Date.now() - 120000) },
      ];

      // 模擬查詢過期會話
      mockOracleConnection.execute
        .mockResolvedValueOnce({ rows: expiredSessions })
        // 模擬刪除分塊記錄
        .mockResolvedValueOnce({ rows: [] })
        // 模擬刪除會話記錄
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await service.cleanupExpiredSessions();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.cleanedSessions).toBe(2);

      // 驗證清理操作
      expect(mockOracleConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM upload_chunks'),
        expect.any(Object),
        {}
      );
      expect(mockOracleConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM upload_sessions'),
        expect.any(Object),
        {}
      );
    });
  });
});
