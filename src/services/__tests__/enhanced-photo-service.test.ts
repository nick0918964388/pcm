/**
 * Enhanced Photo Service Tests
 * 增強照片服務測試 - 實施任務 2.1、2.2 和 2.3 的測試
 */

import { EnhancedPhotoService } from '../enhanced-photo-service';
import { FileProcessingService } from '../file-processing-service';
import { EventBus } from '../event-bus';
import { IDatabaseAbstraction } from '@/lib/database/types';

// Mock dependencies
const mockDatabaseAbstraction = {
  createUnitOfWork: jest.fn(),
  getConnection: jest.fn(),
  releaseConnection: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  transaction: jest.fn(),
  healthCheck: jest.fn(),
} as jest.Mocked<IDatabaseAbstraction>;

const mockFileProcessingService = {
  processFileAsync: jest.fn(),
  generateThumbnails: jest.fn(),
  validateFile: jest.fn(),
  compressFile: jest.fn(),
  extractMetadata: jest.fn(),
} as jest.Mocked<FileProcessingService>;

const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  once: jest.fn(),
} as jest.Mocked<EventBus>;

describe('EnhancedPhotoService', () => {
  let photoService: EnhancedPhotoService;

  beforeEach(() => {
    photoService = new EnhancedPhotoService(
      mockDatabaseAbstraction,
      mockFileProcessingService,
      mockEventBus
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Photo Upload Business Logic (Task 2.1)', () => {
    it('should separate file processing and metadata management', async () => {
      // Requirement 2.1: 分離檔案處理、metadata 解析和儲存邏輯
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockMetadata = {
        width: 1920,
        height: 1080,
        capturedAt: new Date(),
      };

      mockFileProcessingService.validateFile.mockResolvedValue({
        isValid: true,
        errors: [],
      });
      mockFileProcessingService.extractMetadata.mockResolvedValue(mockMetadata);
      mockFileProcessingService.processFileAsync.mockResolvedValue({
        id: 'file-123',
        thumbnailPath: '/thumbnails/file-123.jpg',
        originalPath: '/originals/file-123.jpg',
      });

      const mockUnitOfWork = {
        begin: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        getRepository: jest.fn().mockReturnValue({
          create: jest.fn().mockResolvedValue({ id: 'photo-123' }),
        }),
      };
      mockDatabaseAbstraction.createUnitOfWork.mockReturnValue(
        mockUnitOfWork as any
      );

      const result = await photoService.uploadPhoto(
        mockFile,
        'project-1',
        'user-1',
        'album-1'
      );

      expect(mockFileProcessingService.validateFile).toHaveBeenCalledWith(
        mockFile
      );
      expect(mockFileProcessingService.extractMetadata).toHaveBeenCalledWith(
        mockFile
      );
      expect(mockFileProcessingService.processFileAsync).toHaveBeenCalledWith(
        mockFile,
        expect.any(Object)
      );
      expect(mockUnitOfWork.getRepository).toHaveBeenCalledWith('Photo');
      expect(result.success).toBe(true);
    });

    it('should implement circuit breaker on service errors', async () => {
      // Requirement 2.2: 實施熔斷機制防止級聯失敗
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      // Simulate multiple failures to trigger circuit breaker
      mockFileProcessingService.validateFile.mockRejectedValue(
        new Error('Service unavailable')
      );

      // First 5 failures should be attempted
      for (let i = 0; i < 5; i++) {
        await expect(
          photoService.uploadPhoto(mockFile, 'project-1', 'user-1')
        ).rejects.toThrow('Service unavailable');
      }

      // 6th attempt should be circuit broken
      await expect(
        photoService.uploadPhoto(mockFile, 'project-1', 'user-1')
      ).rejects.toThrow('Circuit breaker is open');

      expect(mockFileProcessingService.validateFile).toHaveBeenCalledTimes(5);
    });

    it('should support project permission control in query logic', async () => {
      // Requirement: 支援專案權限控制
      const mockPhotos = [
        { id: 'photo-1', projectId: 'project-1', fileName: 'test1.jpg' },
        { id: 'photo-2', projectId: 'project-1', fileName: 'test2.jpg' },
      ];

      const mockRepository = {
        findMany: jest.fn().mockResolvedValue({
          data: mockPhotos,
          total: 2,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      };

      const mockUnitOfWork = {
        begin: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        getRepository: jest.fn().mockReturnValue(mockRepository),
      };
      mockDatabaseAbstraction.createUnitOfWork.mockReturnValue(
        mockUnitOfWork as any
      );

      const result = await photoService.getPhotos('project-1', 'user-1', {
        page: 1,
        limit: 20,
      });

      expect(mockRepository.findMany).toHaveBeenCalledWith({
        filters: { projectId: 'project-1' },
        pagination: { page: 1, limit: 20 },
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPhotos);
    });

    it('should ensure data consistency through business rules', async () => {
      // Requirement: 確保資料一致性
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      mockFileProcessingService.validateFile.mockResolvedValue({
        isValid: true,
        errors: [],
      });
      mockFileProcessingService.extractMetadata.mockResolvedValue({
        width: 1920,
        height: 1080,
      });

      // Simulate database error during photo creation
      const mockRepository = {
        create: jest
          .fn()
          .mockRejectedValue(new Error('Database constraint violation')),
      };

      const mockUnitOfWork = {
        begin: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        getRepository: jest.fn().mockReturnValue(mockRepository),
      };
      mockDatabaseAbstraction.createUnitOfWork.mockReturnValue(
        mockUnitOfWork as any
      );

      const result = await photoService.uploadPhoto(
        mockFile,
        'project-1',
        'user-1'
      );

      expect(mockUnitOfWork.rollback).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Database constraint violation');
    });

    it('should implement business layer error handling and recovery', async () => {
      // Requirement: 實施業務層的錯誤處理和恢復策略
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      mockFileProcessingService.validateFile
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ isValid: true, errors: [] });

      mockFileProcessingService.extractMetadata.mockResolvedValue({
        width: 1920,
        height: 1080,
      });
      mockFileProcessingService.processFileAsync.mockResolvedValue({
        id: 'file-123',
        thumbnailPath: '/thumbnails/file-123.jpg',
        originalPath: '/originals/file-123.jpg',
      });

      const mockUnitOfWork = {
        begin: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        getRepository: jest.fn().mockReturnValue({
          create: jest.fn().mockResolvedValue({ id: 'photo-123' }),
        }),
      };
      mockDatabaseAbstraction.createUnitOfWork.mockReturnValue(
        mockUnitOfWork as any
      );

      const result = await photoService.uploadPhoto(
        mockFile,
        'project-1',
        'user-1'
      );

      // Should retry and succeed
      expect(mockFileProcessingService.validateFile).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });
  });

  describe('File Processing Service Layer (Task 2.2)', () => {
    it('should implement asynchronous file processing workflow', async () => {
      // Requirement 6.1: 在背景進行壓縮、格式轉換和縮圖生成
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      mockFileProcessingService.processFileAsync.mockImplementation(
        async (file, options) => {
          // Simulate async processing
          expect(options.async).toBe(true);
          expect(options.generateThumbnails).toBe(true);
          expect(options.compress).toBe(true);

          return {
            id: 'file-123',
            thumbnailPath: '/thumbnails/file-123.jpg',
            originalPath: '/originals/file-123.jpg',
            processingStatus: 'completed',
          };
        }
      );

      const result = await photoService.processFileInBackground(mockFile, {
        compress: true,
        generateThumbnails: true,
        async: true,
      });

      expect(mockFileProcessingService.processFileAsync).toHaveBeenCalledWith(
        mockFile,
        expect.objectContaining({
          async: true,
          generateThumbnails: true,
          compress: true,
        })
      );

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'file.processing.started',
        expect.any(Object)
      );
      expect(result.success).toBe(true);
    });

    it('should support multi-size image processing for different devices', async () => {
      // Requirement 6.4: 動態生成適應性圖片服務不同裝置需求
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      mockFileProcessingService.generateThumbnails.mockResolvedValue({
        thumbnail: '/thumbnails/file-123-150x150.jpg',
        medium: '/thumbnails/file-123-600x400.jpg',
        large: '/thumbnails/file-123-1200x800.jpg',
      });

      const result = await photoService.generateResponsiveImages(mockFile, {
        sizes: ['thumbnail', 'medium', 'large'],
        formats: ['webp', 'jpeg'],
      });

      expect(mockFileProcessingService.generateThumbnails).toHaveBeenCalledWith(
        mockFile,
        expect.objectContaining({
          sizes: ['thumbnail', 'medium', 'large'],
          formats: ['webp', 'jpeg'],
        })
      );

      expect(result.success).toBe(true);
      expect(result.thumbnails).toBeDefined();
    });

    it('should implement file integrity check and deduplication', async () => {
      // Requirement 6.3: 使用內容散列確保檔案完整性和去重
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      mockFileProcessingService.extractMetadata.mockResolvedValue({
        checksum: 'sha256:abc123def456',
        fileSize: 1024,
        mimeType: 'image/jpeg',
      });

      // Mock existing file with same checksum
      const mockRepository = {
        findByField: jest
          .fn()
          .mockResolvedValue([
            { id: 'existing-photo', checksum: 'sha256:abc123def456' },
          ]),
      };

      const mockUnitOfWork = {
        begin: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        getRepository: jest.fn().mockReturnValue(mockRepository),
      };
      mockDatabaseAbstraction.createUnitOfWork.mockReturnValue(
        mockUnitOfWork as any
      );

      const result = await photoService.uploadPhoto(
        mockFile,
        'project-1',
        'user-1'
      );

      expect(mockRepository.findByField).toHaveBeenCalledWith(
        'checksum',
        'sha256:abc123def456'
      );
      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(true);
      expect(result.existingPhotoId).toBe('existing-photo');
    });

    it('should implement queue mechanism and parallel processing', async () => {
      // Requirement 6.5: 使用佇列機制和並行處理提升吞吐量
      const mockFiles = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }),
        new File(['test3'], 'test3.jpg', { type: 'image/jpeg' }),
      ];

      mockFileProcessingService.processFileAsync.mockImplementation(
        async file => ({
          id: `processed-${file.name}`,
          thumbnailPath: `/thumbnails/${file.name}`,
          originalPath: `/originals/${file.name}`,
        })
      );

      const progressCallback = jest.fn();
      const result = await photoService.batchUploadPhotos(
        mockFiles,
        'project-1',
        'user-1',
        {
          concurrency: 3,
          onProgress: progressCallback,
        }
      );

      expect(mockFileProcessingService.processFileAsync).toHaveBeenCalledTimes(
        3
      );
      expect(progressCallback).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
    });

    it('should implement automatic cleanup and tiered storage', async () => {
      // Requirement 6.6: 自動清理策略和分層儲存機制
      const mockStorageInfo = {
        used: 90 * 1024 * 1024 * 1024, // 90GB
        total: 100 * 1024 * 1024 * 1024, // 100GB
        remaining: 10 * 1024 * 1024 * 1024, // 10GB
      };

      jest
        .spyOn(photoService as any, 'getStorageInfo')
        .mockResolvedValue(mockStorageInfo);
      jest
        .spyOn(photoService as any, 'cleanupOldFiles')
        .mockResolvedValue({ deletedCount: 5, freedSpace: 1024 * 1024 * 1024 });

      const result = await photoService.checkAndCleanupStorage();

      expect(result.cleanupRequired).toBe(true);
      expect(result.deletedCount).toBe(5);
      expect(result.freedSpace).toBeGreaterThan(0);
    });
  });

  describe('Event-Driven Architecture and Service Collaboration (Task 2.3)', () => {
    it('should establish lightweight event bus for service communication', async () => {
      // Requirement 2.3: 建立輕量級事件匯流排支援服務間通訊
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      mockFileProcessingService.validateFile.mockResolvedValue({
        isValid: true,
        errors: [],
      });
      mockFileProcessingService.processFileAsync.mockResolvedValue({
        id: 'file-123',
        thumbnailPath: '/thumbnails/file-123.jpg',
      });

      await photoService.uploadPhoto(mockFile, 'project-1', 'user-1');

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'photo.upload.started',
        expect.objectContaining({
          fileId: expect.any(String),
          projectId: 'project-1',
          userId: 'user-1',
        })
      );

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'photo.upload.completed',
        expect.objectContaining({
          photoId: expect.any(String),
          fileId: 'file-123',
        })
      );
    });

    it('should implement service circuit breaker and degradation strategy', async () => {
      // Requirement 2.2: 實施熔斷機制和降級策略
      // Circuit breaker should activate after multiple failures
      mockFileProcessingService.processFileAsync.mockRejectedValue(
        new Error('Service temporarily unavailable')
      );

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      // Test circuit breaker activation
      const isCircuitOpen =
        await photoService.isCircuitBreakerOpen('fileProcessing');
      expect(isCircuitOpen).toBe(false);

      // Trigger multiple failures
      for (let i = 0; i < 5; i++) {
        try {
          await photoService.processFileInBackground(mockFile, {});
        } catch (error) {
          // Expected failures
        }
      }

      const isCircuitOpenAfterFailures =
        await photoService.isCircuitBreakerOpen('fileProcessing');
      expect(isCircuitOpenAfterFailures).toBe(true);
    });

    it('should support idempotent event processing', async () => {
      // Requirement 2.3: 支援冪等處理
      const eventData = {
        photoId: 'photo-123',
        fileId: 'file-123',
        eventId: 'event-456',
      };

      // Process same event twice
      await photoService.handlePhotoUploadCompleted(eventData);
      await photoService.handlePhotoUploadCompleted(eventData);

      // Should only process once due to idempotency
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'photo.metadata.updated',
        expect.objectContaining({
          eventId: 'event-456',
        })
      );
      expect(mockEventBus.emit).toHaveBeenCalledTimes(1);
    });

    it('should implement service health check and dependency monitoring', async () => {
      // Requirement 2.4: 建立服務健康檢查和相依性監控
      const healthStatus = await photoService.getServiceHealth();

      expect(healthStatus).toMatchObject({
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        dependencies: {
          database: expect.objectContaining({
            status: expect.any(String),
            responseTime: expect.any(Number),
          }),
          fileProcessing: expect.objectContaining({
            status: expect.any(String),
            circuitBreakerOpen: expect.any(Boolean),
          }),
          eventBus: expect.objectContaining({
            status: expect.any(String),
          }),
        },
        timestamp: expect.any(Date),
      });
    });

    it('should implement service collaboration error handling and retry', async () => {
      // Requirement 2.5: 建立服務協作的錯誤處理和重試機制
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      // Mock file processing to fail first, then succeed
      mockFileProcessingService.processFileAsync
        .mockRejectedValueOnce(new Error('Temporary service error'))
        .mockResolvedValueOnce({
          id: 'file-123',
          thumbnailPath: '/thumbnails/file-123.jpg',
        });

      mockFileProcessingService.validateFile.mockResolvedValue({
        isValid: true,
        errors: [],
      });

      const result = await photoService.processFileInBackground(mockFile, {
        retryAttempts: 3,
        retryDelay: 100,
      });

      expect(mockFileProcessingService.processFileAsync).toHaveBeenCalledTimes(
        2
      );
      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(1);
    });
  });
});
