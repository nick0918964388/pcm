import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BatchStatusTracker } from '../batch-status-tracker';
import { BatchProgressManager } from '../batch-progress-manager';

// Mock dependencies
vi.mock('../batch-progress-manager');

describe('BatchStatusTracker', () => {
  let batchStatusTracker: BatchStatusTracker;
  let mockBatchProgressManager: vi.Mocked<BatchProgressManager>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockBatchProgressManager = {
      getBatchStatus: vi.fn(),
      getBatchHistory: vi.fn(),
    } as any;

    batchStatusTracker = new BatchStatusTracker(mockBatchProgressManager);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(batchStatusTracker.getMaxHistoryEntries()).toBe(500);
      expect(batchStatusTracker.getRetentionPeriod()).toBe(604800000); // 7 days
    });

    it('should allow custom configuration', () => {
      const customTracker = new BatchStatusTracker(mockBatchProgressManager, {
        maxHistoryEntries: 1000,
        retentionPeriod: 1209600000, // 14 days
        enableCompression: false,
      });

      expect(customTracker.getMaxHistoryEntries()).toBe(1000);
      expect(customTracker.getRetentionPeriod()).toBe(1209600000);
    });
  });

  describe('trackStatusChange', () => {
    it('should record status changes with timestamp', async () => {
      const batchId = 'batch_123';
      const fromStatus = 'queued';
      const toStatus = 'processing';
      const metadata = { triggeredBy: 'system', reason: 'auto-start' };

      await batchStatusTracker.trackStatusChange(
        batchId,
        fromStatus,
        toStatus,
        metadata
      );

      const history = await batchStatusTracker.getStatusHistory(batchId);

      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        batchId,
        fromStatus,
        toStatus,
        timestamp: expect.any(Date),
        metadata,
      });
    });

    it('should track multiple status changes in sequence', async () => {
      const batchId = 'batch_123';

      await batchStatusTracker.trackStatusChange(
        batchId,
        'queued',
        'processing'
      );
      vi.advanceTimersByTime(1000); // Advance time to ensure different timestamps
      await batchStatusTracker.trackStatusChange(
        batchId,
        'processing',
        'completed'
      );

      const history = await batchStatusTracker.getStatusHistory(batchId);

      expect(history).toHaveLength(2);
      expect(history[0].toStatus).toBe('processing');
      expect(history[1].toStatus).toBe('completed');
      expect(history[1].timestamp.getTime()).toBeGreaterThan(
        history[0].timestamp.getTime()
      );
    });

    it('should capture file-level status changes', async () => {
      const batchId = 'batch_123';
      const fileId = 'file_456';

      await batchStatusTracker.trackFileStatusChange(
        batchId,
        fileId,
        'queued',
        'processing',
        { progress: 0.0, bytes: 0 }
      );

      await batchStatusTracker.trackFileStatusChange(
        batchId,
        fileId,
        'processing',
        'completed',
        { progress: 1.0, bytes: 1024 }
      );

      const fileHistory = await batchStatusTracker.getFileStatusHistory(
        batchId,
        fileId
      );

      expect(fileHistory).toHaveLength(2);
      expect(fileHistory[0]).toMatchObject({
        batchId,
        fileId,
        fromStatus: 'queued',
        toStatus: 'processing',
        metadata: { progress: 0.0, bytes: 0 },
      });
      expect(fileHistory[1]).toMatchObject({
        batchId,
        fileId,
        fromStatus: 'processing',
        toStatus: 'completed',
        metadata: { progress: 1.0, bytes: 1024 },
      });
    });
  });

  describe('getStatusHistory', () => {
    it('should return chronological status history for batch', async () => {
      const batchId = 'batch_123';

      await batchStatusTracker.trackStatusChange(
        batchId,
        'queued',
        'processing'
      );
      vi.advanceTimersByTime(1000);
      await batchStatusTracker.trackStatusChange(
        batchId,
        'processing',
        'failed'
      );
      vi.advanceTimersByTime(1000);
      await batchStatusTracker.trackStatusChange(
        batchId,
        'failed',
        'processing'
      ); // retry

      const history = await batchStatusTracker.getStatusHistory(batchId);

      expect(history).toHaveLength(3);
      expect(history.map(h => h.toStatus)).toEqual([
        'processing',
        'failed',
        'processing',
      ]);
    });

    it('should filter history by date range', async () => {
      const batchId = 'batch_123';
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-02T00:00:00Z');

      vi.setSystemTime(new Date('2023-12-31T23:59:59Z'));
      await batchStatusTracker.trackStatusChange(
        batchId,
        'queued',
        'processing'
      );

      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
      await batchStatusTracker.trackStatusChange(
        batchId,
        'processing',
        'completed'
      );

      vi.setSystemTime(new Date('2024-01-03T00:00:00Z'));
      await batchStatusTracker.trackStatusChange(
        batchId,
        'completed',
        'archived'
      );

      const history = await batchStatusTracker.getStatusHistory(batchId, {
        startDate: startTime,
        endDate: endTime,
      });

      expect(history).toHaveLength(1);
      expect(history[0].toStatus).toBe('completed');
    });

    it('should limit results when specified', async () => {
      const batchId = 'batch_123';

      // Create 5 status changes
      for (let i = 0; i < 5; i++) {
        await batchStatusTracker.trackStatusChange(
          batchId,
          i === 0 ? 'queued' : 'processing',
          'processing',
          { step: i }
        );
        vi.advanceTimersByTime(1000);
      }

      const limitedHistory = await batchStatusTracker.getStatusHistory(
        batchId,
        { limit: 3 }
      );
      const fullHistory = await batchStatusTracker.getStatusHistory(batchId);

      expect(limitedHistory).toHaveLength(3);
      expect(fullHistory).toHaveLength(5);
      // Should return the most recent 3
      expect(limitedHistory.map(h => h.metadata?.step)).toEqual([2, 3, 4]);
    });
  });

  describe('getStatusStatistics', () => {
    it('should calculate time spent in each status', async () => {
      const batchId = 'batch_123';

      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      await batchStatusTracker.trackStatusChange(batchId, null, 'queued');

      vi.setSystemTime(new Date('2024-01-01T00:05:00Z')); // 5 minutes later
      await batchStatusTracker.trackStatusChange(
        batchId,
        'queued',
        'processing'
      );

      vi.setSystemTime(new Date('2024-01-01T00:15:00Z')); // 10 minutes later
      await batchStatusTracker.trackStatusChange(
        batchId,
        'processing',
        'completed'
      );

      const stats = await batchStatusTracker.getStatusStatistics(batchId);

      expect(stats.totalDuration).toBe(15 * 60 * 1000); // 15 minutes in ms
      expect(stats.timeSpentInStatus).toMatchObject({
        queued: 5 * 60 * 1000, // 5 minutes
        processing: 10 * 60 * 1000, // 10 minutes
      });
      expect(stats.statusTransitions).toHaveLength(3); // null->queued, queued->processing, processing->completed
    });

    it('should identify bottlenecks and common failure patterns', async () => {
      const batchId1 = 'batch_1';
      const batchId2 = 'batch_2';

      // Batch 1: Stuck in processing for a long time
      await batchStatusTracker.trackStatusChange(
        batchId1,
        'queued',
        'processing'
      );
      vi.advanceTimersByTime(30 * 60 * 1000); // 30 minutes
      await batchStatusTracker.trackStatusChange(
        batchId1,
        'processing',
        'failed'
      );

      // Batch 2: Quick failure
      await batchStatusTracker.trackStatusChange(
        batchId2,
        'queued',
        'processing'
      );
      vi.advanceTimersByTime(1000); // 1 second
      await batchStatusTracker.trackStatusChange(
        batchId2,
        'processing',
        'failed'
      );

      const globalStats = await batchStatusTracker.getGlobalStatistics({
        startDate: new Date(Date.now() - 60 * 60 * 1000), // Last hour
      });

      expect(globalStats.averageTimeInStatus.processing).toBeGreaterThan(
        15 * 60 * 1000
      ); // > 15 min
      expect(globalStats.failureRate).toBe(1.0); // 100% failure rate
      expect(globalStats.commonFailureReasons).toContain('processing_timeout');
    });
  });

  describe('getFileStatusHistory', () => {
    it('should return file-specific status history', async () => {
      const batchId = 'batch_123';
      const fileId1 = 'file_1';
      const fileId2 = 'file_2';

      await batchStatusTracker.trackFileStatusChange(
        batchId,
        fileId1,
        'queued',
        'processing'
      );
      await batchStatusTracker.trackFileStatusChange(
        batchId,
        fileId2,
        'queued',
        'processing'
      );
      await batchStatusTracker.trackFileStatusChange(
        batchId,
        fileId1,
        'processing',
        'completed'
      );

      const file1History = await batchStatusTracker.getFileStatusHistory(
        batchId,
        fileId1
      );
      const file2History = await batchStatusTracker.getFileStatusHistory(
        batchId,
        fileId2
      );

      expect(file1History).toHaveLength(2); // queued->processing, processing->completed
      expect(file2History).toHaveLength(1); // queued->processing only
      expect(file1History[1].toStatus).toBe('completed');
    });
  });

  describe('exportHistory', () => {
    it('should export status history in JSON format', async () => {
      const batchId = 'batch_123';

      await batchStatusTracker.trackStatusChange(
        batchId,
        'queued',
        'processing'
      );
      await batchStatusTracker.trackStatusChange(
        batchId,
        'processing',
        'completed'
      );

      const exportData = await batchStatusTracker.exportHistory(
        batchId,
        'json'
      );

      expect(exportData).toHaveProperty('format', 'json');
      expect(exportData).toHaveProperty('batchId', batchId);
      expect(exportData).toHaveProperty('data');
      expect(exportData.data).toHaveLength(2);
    });

    it('should export status history in CSV format', async () => {
      const batchId = 'batch_123';

      await batchStatusTracker.trackStatusChange(
        batchId,
        'queued',
        'processing'
      );
      await batchStatusTracker.trackStatusChange(
        batchId,
        'processing',
        'completed'
      );

      const exportData = await batchStatusTracker.exportHistory(batchId, 'csv');

      expect(exportData).toHaveProperty('format', 'csv');
      expect(exportData).toHaveProperty('batchId', batchId);
      expect(typeof exportData.data).toBe('string');
      expect(exportData.data).toContain(
        'batchId,fromStatus,toStatus,timestamp'
      );
    });
  });

  describe('cleanup and compression', () => {
    it('should automatically cleanup old history entries', async () => {
      const customTracker = new BatchStatusTracker(mockBatchProgressManager, {
        retentionPeriod: 1000, // 1 second
        enableAutoCleanup: true,
        cleanupInterval: 500, // 0.5 second
      });

      const batchId = 'batch_old';

      await customTracker.trackStatusChange(batchId, 'queued', 'processing');

      // Wait for cleanup to trigger
      vi.advanceTimersByTime(1500); // 1.5 seconds

      const history = await customTracker.getStatusHistory(batchId);
      expect(history).toHaveLength(0); // Should be cleaned up
    });

    it('should compress old history when enabled', async () => {
      const compressedTracker = new BatchStatusTracker(
        mockBatchProgressManager,
        {
          enableCompression: true,
          compressionThreshold: 2, // Compress after 2 entries
        }
      );

      const batchId = 'batch_compress';

      await compressedTracker.trackStatusChange(
        batchId,
        'queued',
        'processing'
      );
      await compressedTracker.trackStatusChange(
        batchId,
        'processing',
        'completed'
      );
      await compressedTracker.trackStatusChange(
        batchId,
        'completed',
        'archived'
      );

      // Force compression
      await compressedTracker.performCompression(batchId);

      const compressedHistory =
        await compressedTracker.getStatusHistory(batchId);
      expect(compressedHistory).toHaveLength(2); // Start and end states
      expect(compressedHistory[0].fromStatus).toBe('queued');
      expect(compressedHistory[1].toStatus).toBe('archived');
    });
  });

  describe('error handling', () => {
    it('should handle invalid batch IDs gracefully', async () => {
      const history =
        await batchStatusTracker.getStatusHistory('non_existent_batch');
      expect(history).toHaveLength(0);
    });

    it('should validate status transitions', async () => {
      await expect(
        batchStatusTracker.trackStatusChange(
          'batch_123',
          'invalid_status',
          'processing'
        )
      ).rejects.toThrow('Invalid status transition');
    });

    it('should handle concurrent status updates', async () => {
      const batchId = 'batch_concurrent';

      // Simulate concurrent updates
      const promises = [
        batchStatusTracker.trackStatusChange(batchId, 'queued', 'processing'),
        batchStatusTracker.trackStatusChange(
          batchId,
          'processing',
          'completed'
        ),
        batchStatusTracker.trackStatusChange(batchId, 'completed', 'archived'),
      ];

      await Promise.all(promises);

      const history = await batchStatusTracker.getStatusHistory(batchId);
      expect(history).toHaveLength(3);
    });
  });
});
