import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BatchProgressManager } from '../batch-progress-manager';
import { BatchQueueService } from '../batch-queue-service';

// Mock dependencies
vi.mock('../batch-queue-service');

describe('BatchProgressManager', () => {
  let batchProgressManager: BatchProgressManager;
  let mockBatchQueueService: vi.Mocked<BatchQueueService>;

  beforeEach(() => {
    mockBatchQueueService = {
      getQueueHealth: vi.fn(),
      enqueueBatchUpload: vi.fn(),
      processBatch: vi.fn(),
      retryFailedJob: vi.fn(),
      cleanupOldJobs: vi.fn(),
    } as any;

    batchProgressManager = new BatchProgressManager(mockBatchQueueService);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(batchProgressManager.getMaxBatchHistory()).toBe(100);
      expect(batchProgressManager.getCleanupInterval()).toBe(300000); // 5 minutes
    });

    it('should allow custom configuration', () => {
      const customManager = new BatchProgressManager(mockBatchQueueService, {
        maxBatchHistory: 200,
        cleanupInterval: 600000,
        enableAutoCleanup: false,
      });

      expect(customManager.getMaxBatchHistory()).toBe(200);
      expect(customManager.getCleanupInterval()).toBe(600000);
    });
  });

  describe('createBatchStatus', () => {
    it('should create new batch status tracking', async () => {
      const batchId = 'batch_123';
      const files = [
        { name: 'file1.jpg', size: 1024, type: 'image/jpeg' },
        { name: 'file2.png', size: 2048, type: 'image/png' },
      ];

      const batchStatus = await batchProgressManager.createBatchStatus(
        batchId,
        files,
        {
          userId: 'user123',
          projectId: 'project456',
          albumId: 'album789',
        }
      );

      expect(batchStatus.batchId).toBe(batchId);
      expect(batchStatus.totalFiles).toBe(2);
      expect(batchStatus.status).toBe('queued');
      expect(batchStatus.processedFiles).toBe(0);
      expect(batchStatus.successfulUploads).toBe(0);
      expect(batchStatus.failedUploads).toBe(0);
      expect(batchStatus.files).toHaveLength(2);
    });

    it('should assign unique IDs to each file', async () => {
      const batchId = 'batch_456';
      const files = [
        { name: 'file1.jpg', size: 1024, type: 'image/jpeg' },
        { name: 'file2.jpg', size: 1024, type: 'image/jpeg' }, // Same name
      ];

      const batchStatus = await batchProgressManager.createBatchStatus(
        batchId,
        files,
        {
          userId: 'user123',
          projectId: 'project456',
          albumId: 'album789',
        }
      );

      expect(batchStatus.files[0].fileId).not.toBe(batchStatus.files[1].fileId);
      expect(batchStatus.files[0].fileId).toMatch(/^[a-f0-9-]+$/); // UUID format
      expect(batchStatus.files[1].fileId).toMatch(/^[a-f0-9-]+$/);
    });
  });

  describe('updateFileProgress', () => {
    it('should update individual file progress', async () => {
      const batchId = 'batch_123';
      const files = [{ name: 'file1.jpg', size: 1024, type: 'image/jpeg' }];

      const batchStatus = await batchProgressManager.createBatchStatus(
        batchId,
        files,
        {
          userId: 'user123',
          projectId: 'project456',
          albumId: 'album789',
        }
      );

      const fileId = batchStatus.files[0].fileId;

      const updatedStatus = await batchProgressManager.updateFileProgress(
        batchId,
        fileId,
        {
          status: 'processing',
          progress: 0.5,
          uploadedBytes: 512,
        }
      );

      expect(updatedStatus.files[0].status).toBe('processing');
      expect(updatedStatus.files[0].progress).toBe(0.5);
      expect(updatedStatus.files[0].uploadedBytes).toBe(512);
    });

    it('should calculate overall batch progress', async () => {
      const batchId = 'batch_123';
      const files = [
        { name: 'file1.jpg', size: 1000, type: 'image/jpeg' },
        { name: 'file2.jpg', size: 2000, type: 'image/jpeg' },
      ];

      const batchStatus = await batchProgressManager.createBatchStatus(
        batchId,
        files,
        {
          userId: 'user123',
          projectId: 'project456',
          albumId: 'album789',
        }
      );

      // File 1: 50% complete (500/1000 bytes)
      await batchProgressManager.updateFileProgress(
        batchId,
        batchStatus.files[0].fileId,
        {
          status: 'processing',
          progress: 0.5,
          uploadedBytes: 500,
        }
      );

      // File 2: 25% complete (500/2000 bytes)
      await batchProgressManager.updateFileProgress(
        batchId,
        batchStatus.files[1].fileId,
        {
          status: 'processing',
          progress: 0.25,
          uploadedBytes: 500,
        }
      );

      const updatedStatus = await batchProgressManager.getBatchStatus(batchId);

      // Total progress: (500 + 500) / (1000 + 2000) = 1000/3000 = 0.333...
      expect(updatedStatus.overallProgress).toBeCloseTo(0.333, 3);
      expect(updatedStatus.totalUploadedBytes).toBe(1000);
      expect(updatedStatus.totalBytes).toBe(3000);
    });

    it('should update batch status when files complete', async () => {
      const batchId = 'batch_123';
      const files = [{ name: 'file1.jpg', size: 1024, type: 'image/jpeg' }];

      const batchStatus = await batchProgressManager.createBatchStatus(
        batchId,
        files,
        {
          userId: 'user123',
          projectId: 'project456',
          albumId: 'album789',
        }
      );

      const fileId = batchStatus.files[0].fileId;

      // Complete the file successfully
      const updatedStatus = await batchProgressManager.updateFileProgress(
        batchId,
        fileId,
        {
          status: 'completed',
          progress: 1.0,
          uploadedBytes: 1024,
          result: { success: true, photoId: 'photo123' },
        }
      );

      expect(updatedStatus.processedFiles).toBe(1);
      expect(updatedStatus.successfulUploads).toBe(1);
      expect(updatedStatus.failedUploads).toBe(0);
      expect(updatedStatus.status).toBe('completed');
    });

    it('should handle file failures', async () => {
      const batchId = 'batch_123';
      const files = [{ name: 'file1.jpg', size: 1024, type: 'image/jpeg' }];

      const batchStatus = await batchProgressManager.createBatchStatus(
        batchId,
        files,
        {
          userId: 'user123',
          projectId: 'project456',
          albumId: 'album789',
        }
      );

      const fileId = batchStatus.files[0].fileId;

      // Fail the file
      const updatedStatus = await batchProgressManager.updateFileProgress(
        batchId,
        fileId,
        {
          status: 'failed',
          progress: 0.5,
          uploadedBytes: 512,
          error: 'Upload failed: Network error',
        }
      );

      expect(updatedStatus.processedFiles).toBe(1);
      expect(updatedStatus.successfulUploads).toBe(0);
      expect(updatedStatus.failedUploads).toBe(1);
      expect(updatedStatus.status).toBe('completed'); // Batch completes even with failures
      expect(updatedStatus.files[0].error).toBe('Upload failed: Network error');
    });
  });

  describe('calculateBatchStats', () => {
    it('should calculate upload speed and estimated time', async () => {
      const batchId = 'batch_123';
      const files = [{ name: 'file1.jpg', size: 2000, type: 'image/jpeg' }];

      const batchStatus = await batchProgressManager.createBatchStatus(
        batchId,
        files,
        {
          userId: 'user123',
          projectId: 'project456',
          albumId: 'album789',
        }
      );

      const fileId = batchStatus.files[0].fileId;

      // Simulate upload progress over time
      const startTime = Date.now();
      await batchProgressManager.updateFileProgress(batchId, fileId, {
        status: 'processing',
        progress: 0.5,
        uploadedBytes: 1000,
      });

      // Advance time by 2 seconds
      vi.setSystemTime(startTime + 2000);

      const stats = await batchProgressManager.calculateBatchStats(batchId);

      expect(stats.uploadSpeedBytesPerSecond).toBeGreaterThan(0);
      expect(stats.estimatedTimeRemainingSeconds).toBeGreaterThan(0);
      expect(stats.averageFileSize).toBe(2000);
    });

    it('should return zero stats for new batches', async () => {
      const batchId = 'batch_123';
      const files = [{ name: 'file1.jpg', size: 1024, type: 'image/jpeg' }];

      await batchProgressManager.createBatchStatus(batchId, files, {
        userId: 'user123',
        projectId: 'project456',
        albumId: 'album789',
      });

      const stats = await batchProgressManager.calculateBatchStats(batchId);

      expect(stats.uploadSpeedBytesPerSecond).toBe(0);
      expect(stats.estimatedTimeRemainingSeconds).toBe(Infinity);
      expect(stats.averageFileSize).toBe(1024);
    });
  });

  describe('generateBatchSummary', () => {
    it('should generate comprehensive batch summary', async () => {
      const batchId = 'batch_123';
      const files = [
        { name: 'file1.jpg', size: 1000, type: 'image/jpeg' },
        { name: 'file2.jpg', size: 2000, type: 'image/jpeg' },
      ];

      const batchStatus = await batchProgressManager.createBatchStatus(
        batchId,
        files,
        {
          userId: 'user123',
          projectId: 'project456',
          albumId: 'album789',
        }
      );

      // Complete first file successfully
      await batchProgressManager.updateFileProgress(
        batchId,
        batchStatus.files[0].fileId,
        {
          status: 'completed',
          progress: 1.0,
          uploadedBytes: 1000,
          result: { success: true, photoId: 'photo123' },
        }
      );

      // Fail second file
      await batchProgressManager.updateFileProgress(
        batchId,
        batchStatus.files[1].fileId,
        {
          status: 'failed',
          progress: 0.5,
          uploadedBytes: 1000,
          error: 'Network timeout',
        }
      );

      const summary = await batchProgressManager.generateBatchSummary(batchId);

      expect(summary.batchId).toBe(batchId);
      expect(summary.totalFiles).toBe(2);
      expect(summary.successfulUploads).toBe(1);
      expect(summary.failedUploads).toBe(1);
      expect(summary.totalProcessingTime).toBeGreaterThanOrEqual(0);
      expect(summary.averageFileSize).toBe(1500); // (1000 + 2000) / 2
      expect(summary.errors).toHaveLength(1);
      expect(summary.errors[0]).toMatchObject({
        fileName: 'file2.jpg',
        errorMessage: 'Network timeout',
        retryable: true,
      });
    });

    it('should identify retryable vs non-retryable errors', async () => {
      const batchId = 'batch_123';
      const files = [
        { name: 'file1.jpg', size: 1000, type: 'image/jpeg' },
        { name: 'invalid.txt', size: 500, type: 'text/plain' },
      ];

      const batchStatus = await batchProgressManager.createBatchStatus(
        batchId,
        files,
        {
          userId: 'user123',
          projectId: 'project456',
          albumId: 'album789',
        }
      );

      // Network error (retryable)
      await batchProgressManager.updateFileProgress(
        batchId,
        batchStatus.files[0].fileId,
        {
          status: 'failed',
          progress: 0.3,
          uploadedBytes: 300,
          error: 'Network timeout',
        }
      );

      // File type error (non-retryable)
      await batchProgressManager.updateFileProgress(
        batchId,
        batchStatus.files[1].fileId,
        {
          status: 'failed',
          progress: 0,
          uploadedBytes: 0,
          error: 'Unsupported file type: text/plain',
        }
      );

      const summary = await batchProgressManager.generateBatchSummary(batchId);

      expect(summary.errors).toHaveLength(2);
      expect(
        summary.errors.find(e => e.fileName === 'file1.jpg')?.retryable
      ).toBe(true);
      expect(
        summary.errors.find(e => e.fileName === 'invalid.txt')?.retryable
      ).toBe(false);
    });
  });

  describe('cancelBatch', () => {
    it('should cancel active batch and update status', async () => {
      const batchId = 'batch_123';
      const files = [{ name: 'file1.jpg', size: 1024, type: 'image/jpeg' }];

      const batchStatus = await batchProgressManager.createBatchStatus(
        batchId,
        files,
        {
          userId: 'user123',
          projectId: 'project456',
          albumId: 'album789',
        }
      );

      // Start processing
      await batchProgressManager.updateFileProgress(
        batchId,
        batchStatus.files[0].fileId,
        {
          status: 'processing',
          progress: 0.3,
          uploadedBytes: 300,
        }
      );

      const result = await batchProgressManager.cancelBatch(
        batchId,
        'User requested cancellation'
      );

      expect(result.success).toBe(true);

      const status = await batchProgressManager.getBatchStatus(batchId);
      expect(status.status).toBe('cancelled');
      expect(status.cancelReason).toBe('User requested cancellation');
    });

    it('should not cancel already completed batches', async () => {
      const batchId = 'batch_123';
      const files = [{ name: 'file1.jpg', size: 1024, type: 'image/jpeg' }];

      const batchStatus = await batchProgressManager.createBatchStatus(
        batchId,
        files,
        {
          userId: 'user123',
          projectId: 'project456',
          albumId: 'album789',
        }
      );

      // Complete the batch
      await batchProgressManager.updateFileProgress(
        batchId,
        batchStatus.files[0].fileId,
        {
          status: 'completed',
          progress: 1.0,
          uploadedBytes: 1024,
          result: { success: true, photoId: 'photo123' },
        }
      );

      const result = await batchProgressManager.cancelBatch(
        batchId,
        'User requested cancellation'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot cancel completed batch');
    });
  });

  describe('retryFailedFiles', () => {
    it('should identify and retry failed files with retryable errors', async () => {
      const batchId = 'batch_123';
      const files = [
        { name: 'file1.jpg', size: 1000, type: 'image/jpeg' },
        { name: 'file2.jpg', size: 2000, type: 'image/jpeg' },
      ];

      const batchStatus = await batchProgressManager.createBatchStatus(
        batchId,
        files,
        {
          userId: 'user123',
          projectId: 'project456',
          albumId: 'album789',
        }
      );

      // Fail both files with different error types
      await batchProgressManager.updateFileProgress(
        batchId,
        batchStatus.files[0].fileId,
        {
          status: 'failed',
          progress: 0.5,
          uploadedBytes: 500,
          error: 'Network timeout', // Retryable
        }
      );

      await batchProgressManager.updateFileProgress(
        batchId,
        batchStatus.files[1].fileId,
        {
          status: 'failed',
          progress: 0,
          uploadedBytes: 0,
          error: 'File size exceeds limit', // Non-retryable
        }
      );

      const retryResult = await batchProgressManager.retryFailedFiles(batchId);

      expect(retryResult.success).toBe(true);
      expect(retryResult.retriedFiles).toBe(1); // Only the retryable one
      expect(retryResult.skippedFiles).toBe(1); // The non-retryable one

      const updatedStatus = await batchProgressManager.getBatchStatus(batchId);
      expect(updatedStatus.files[0].status).toBe('queued'); // Reset to queued for retry
      expect(updatedStatus.files[1].status).toBe('failed'); // Remains failed
    });
  });

  describe('getBatchHistory', () => {
    it('should return batch history for a user', async () => {
      const userId = 'user123';

      // Create multiple batches
      await batchProgressManager.createBatchStatus(
        'batch_1',
        [{ name: 'file1.jpg', size: 1024, type: 'image/jpeg' }],
        {
          userId,
          projectId: 'project456',
          albumId: 'album789',
        }
      );

      await batchProgressManager.createBatchStatus(
        'batch_2',
        [{ name: 'file2.jpg', size: 2048, type: 'image/jpeg' }],
        {
          userId,
          projectId: 'project456',
          albumId: 'album789',
        }
      );

      const history = await batchProgressManager.getBatchHistory(userId);

      expect(history).toHaveLength(2);
      expect(history[0].userId).toBe(userId);
      expect(history[1].userId).toBe(userId);
    });

    it('should limit history entries according to configuration', async () => {
      const manager = new BatchProgressManager(mockBatchQueueService, {
        maxBatchHistory: 2,
      });
      const userId = 'user123';

      // Create 3 batches
      for (let i = 0; i < 3; i++) {
        await manager.createBatchStatus(
          `batch_${i}`,
          [{ name: `file${i}.jpg`, size: 1024, type: 'image/jpeg' }],
          {
            userId,
            projectId: 'project456',
            albumId: 'album789',
          }
        );
      }

      const history = await manager.getBatchHistory(userId);

      expect(history).toHaveLength(2); // Limited by maxBatchHistory
    });
  });

  describe('cleanup operations', () => {
    beforeEach(() => {
      vi.useRealTimers(); // Reset first
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should automatically cleanup old completed batches', async () => {
      const manager = new BatchProgressManager(mockBatchQueueService, {
        enableAutoCleanup: true,
        cleanupInterval: 5000, // 5 seconds
        maxBatchAge: 10000, // 10 seconds
      });

      const batchId = 'batch_old';
      const files = [{ name: 'file1.jpg', size: 1024, type: 'image/jpeg' }];

      const batchStatus = await manager.createBatchStatus(batchId, files, {
        userId: 'user123',
        projectId: 'project456',
        albumId: 'album789',
      });

      // Complete the batch
      await manager.updateFileProgress(batchId, batchStatus.files[0].fileId, {
        status: 'completed',
        progress: 1.0,
        uploadedBytes: 1024,
        result: { success: true, photoId: 'photo123' },
      });

      // Wait for batch to age
      vi.advanceTimersByTime(15000); // 15 seconds - older than maxBatchAge

      // Trigger cleanup
      vi.advanceTimersByTime(5000); // Cleanup interval

      // Batch should be cleaned up
      const result = await manager.getBatchStatus(batchId);
      expect(result).toBeUndefined();
    });
  });
});
