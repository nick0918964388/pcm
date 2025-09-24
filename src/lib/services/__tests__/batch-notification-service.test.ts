import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BatchNotificationService } from '../batch-notification-service';
import { WebSocketService } from '../websocket-service';
import { BatchProgressManager } from '../batch-progress-manager';

// Mock dependencies
vi.mock('../websocket-service');
vi.mock('../batch-progress-manager');

describe('BatchNotificationService', () => {
  let batchNotificationService: BatchNotificationService;
  let mockWebSocketService: vi.Mocked<WebSocketService>;
  let mockBatchProgressManager: vi.Mocked<BatchProgressManager>;

  beforeEach(() => {
    mockWebSocketService = {
      broadcastToRoom: vi.fn(),
      broadcastToUser: vi.fn(),
      joinRoom: vi.fn(),
      leaveRoom: vi.fn(),
      isConnected: vi.fn().mockReturnValue(true),
    } as any;

    mockBatchProgressManager = {
      getBatchStatus: vi.fn(),
      getAllBatches: vi.fn(),
    } as any;

    batchNotificationService = new BatchNotificationService(
      mockWebSocketService,
      mockBatchProgressManager
    );

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(batchNotificationService.isEnabled()).toBe(true);
      expect(batchNotificationService.getMaxSubscribers()).toBe(1000);
      expect(batchNotificationService.getThrottleInterval()).toBe(1000);
    });

    it('should allow custom configuration', () => {
      const customService = new BatchNotificationService(
        mockWebSocketService,
        mockBatchProgressManager,
        {
          enabled: false,
          maxSubscribers: 500,
          throttleInterval: 2000,
          batchNotificationThreshold: 0.1, // Notify every 10%
        }
      );

      expect(customService.isEnabled()).toBe(false);
      expect(customService.getMaxSubscribers()).toBe(500);
      expect(customService.getThrottleInterval()).toBe(2000);
    });
  });

  describe('subscribeToBatch', () => {
    it('should allow users to subscribe to batch notifications', async () => {
      const userId = 'user123';
      const batchId = 'batch_456';

      const result = await batchNotificationService.subscribeToBatch(
        userId,
        batchId
      );

      expect(result.success).toBe(true);
      expect(result.subscriberCount).toBe(1);
      expect(mockWebSocketService.joinRoom).toHaveBeenCalledWith(
        userId,
        `batch_${batchId}`
      );
    });

    it('should track multiple subscribers for the same batch', async () => {
      const batchId = 'batch_456';

      await batchNotificationService.subscribeToBatch('user1', batchId);
      await batchNotificationService.subscribeToBatch('user2', batchId);
      const result = await batchNotificationService.subscribeToBatch(
        'user3',
        batchId
      );

      expect(result.subscriberCount).toBe(3);
      expect(mockWebSocketService.joinRoom).toHaveBeenCalledTimes(3);
    });

    it('should prevent duplicate subscriptions from the same user', async () => {
      const userId = 'user123';
      const batchId = 'batch_456';

      await batchNotificationService.subscribeToBatch(userId, batchId);
      const result = await batchNotificationService.subscribeToBatch(
        userId,
        batchId
      );

      expect(result.success).toBe(true);
      expect(result.subscriberCount).toBe(1); // Still 1, not 2
      expect(mockWebSocketService.joinRoom).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should enforce subscriber limits', async () => {
      const customService = new BatchNotificationService(
        mockWebSocketService,
        mockBatchProgressManager,
        { maxSubscribers: 2 }
      );

      const batchId = 'batch_456';

      await customService.subscribeToBatch('user1', batchId);
      await customService.subscribeToBatch('user2', batchId);
      const result = await customService.subscribeToBatch('user3', batchId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum subscribers limit reached');
    });

    it('should handle WebSocket service failures gracefully', async () => {
      mockWebSocketService.joinRoom.mockRejectedValueOnce(
        new Error('WebSocket error')
      );

      const result = await batchNotificationService.subscribeToBatch(
        'user123',
        'batch_456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to subscribe');
    });
  });

  describe('unsubscribeFromBatch', () => {
    it('should allow users to unsubscribe from batch notifications', async () => {
      const userId = 'user123';
      const batchId = 'batch_456';

      // First subscribe
      await batchNotificationService.subscribeToBatch(userId, batchId);

      // Then unsubscribe
      const result = await batchNotificationService.unsubscribeFromBatch(
        userId,
        batchId
      );

      expect(result.success).toBe(true);
      expect(result.subscriberCount).toBe(0);
      expect(mockWebSocketService.leaveRoom).toHaveBeenCalledWith(
        userId,
        `batch_${batchId}`
      );
    });

    it('should handle unsubscribing from non-existent subscriptions', async () => {
      const result = await batchNotificationService.unsubscribeFromBatch(
        'user123',
        'non_existent_batch'
      );

      expect(result.success).toBe(true);
      expect(result.subscriberCount).toBe(0);
    });
  });

  describe('notifyBatchProgress', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should send progress notifications to subscribers', async () => {
      const batchId = 'batch_456';
      const userId = 'user123';

      // Subscribe first
      await batchNotificationService.subscribeToBatch(userId, batchId);

      // Send notification
      await batchNotificationService.notifyBatchProgress(batchId, {
        status: 'processing',
        overallProgress: 0.5,
        completedFiles: 5,
        totalFiles: 10,
        estimatedTimeRemaining: 30000,
      });

      expect(mockWebSocketService.broadcastToRoom).toHaveBeenCalledWith(
        `batch_${batchId}`,
        'batch_progress_update',
        expect.objectContaining({
          batchId,
          status: 'processing',
          overallProgress: 0.5,
          completedFiles: 5,
          totalFiles: 10,
          estimatedTimeRemaining: 30000,
          timestamp: expect.any(Date),
        })
      );
    });

    it('should throttle rapid progress updates', async () => {
      const batchId = 'batch_456';
      await batchNotificationService.subscribeToBatch('user123', batchId);

      // Send multiple rapid updates
      await batchNotificationService.notifyBatchProgress(batchId, {
        status: 'processing',
        overallProgress: 0.1,
      });
      await batchNotificationService.notifyBatchProgress(batchId, {
        status: 'processing',
        overallProgress: 0.2,
      });
      await batchNotificationService.notifyBatchProgress(batchId, {
        status: 'processing',
        overallProgress: 0.3,
      });

      // Only the first one should be sent immediately
      expect(mockWebSocketService.broadcastToRoom).toHaveBeenCalledTimes(1);

      // Advance time past throttle interval
      vi.advanceTimersByTime(1500);

      // Last update should now be sent
      expect(mockWebSocketService.broadcastToRoom).toHaveBeenCalledTimes(2);
      expect(mockWebSocketService.broadcastToRoom).toHaveBeenLastCalledWith(
        `batch_${batchId}`,
        'batch_progress_update',
        expect.objectContaining({
          overallProgress: 0.3, // Should be the last update
        })
      );
    });

    it('should respect progress threshold configuration', async () => {
      const customService = new BatchNotificationService(
        mockWebSocketService,
        mockBatchProgressManager,
        { batchNotificationThreshold: 0.1 } // 10% threshold
      );

      const batchId = 'batch_456';
      await customService.subscribeToBatch('user123', batchId);

      // Small progress change (< 10%)
      await customService.notifyBatchProgress(batchId, {
        overallProgress: 0.05,
      });
      await customService.notifyBatchProgress(batchId, {
        overallProgress: 0.08,
      });

      expect(mockWebSocketService.broadcastToRoom).toHaveBeenCalledTimes(1); // Only initial

      // Large progress change (>= 10%)
      await customService.notifyBatchProgress(batchId, {
        overallProgress: 0.15,
      });

      expect(mockWebSocketService.broadcastToRoom).toHaveBeenCalledTimes(2); // Threshold exceeded
    });

    it('should always send completion and failure notifications', async () => {
      const batchId = 'batch_456';
      await batchNotificationService.subscribeToBatch('user123', batchId);

      await batchNotificationService.notifyBatchProgress(batchId, {
        status: 'completed',
        overallProgress: 1.0,
      });
      await batchNotificationService.notifyBatchProgress(batchId, {
        status: 'failed',
        overallProgress: 0.5,
      });

      expect(mockWebSocketService.broadcastToRoom).toHaveBeenCalledTimes(2);
      expect(mockWebSocketService.broadcastToRoom).toHaveBeenNthCalledWith(
        1,
        `batch_${batchId}`,
        'batch_progress_update',
        expect.objectContaining({ status: 'completed' })
      );
      expect(mockWebSocketService.broadcastToRoom).toHaveBeenNthCalledWith(
        2,
        `batch_${batchId}`,
        'batch_progress_update',
        expect.objectContaining({ status: 'failed' })
      );
    });
  });

  describe('notifyBatchFileProgress', () => {
    it('should send file-level progress notifications', async () => {
      const batchId = 'batch_456';
      const fileId = 'file_123';

      await batchNotificationService.subscribeToBatch('user123', batchId);

      await batchNotificationService.notifyBatchFileProgress(batchId, fileId, {
        fileName: 'photo.jpg',
        status: 'processing',
        progress: 0.75,
        uploadedBytes: 750,
        totalBytes: 1000,
      });

      expect(mockWebSocketService.broadcastToRoom).toHaveBeenCalledWith(
        `batch_${batchId}`,
        'batch_file_progress_update',
        expect.objectContaining({
          batchId,
          fileId,
          fileName: 'photo.jpg',
          status: 'processing',
          progress: 0.75,
          uploadedBytes: 750,
          totalBytes: 1000,
          timestamp: expect.any(Date),
        })
      );
    });
  });

  describe('notifyBatchError', () => {
    it('should send error notifications with retry information', async () => {
      const batchId = 'batch_456';
      await batchNotificationService.subscribeToBatch('user123', batchId);

      await batchNotificationService.notifyBatchError(batchId, {
        error: 'Network timeout',
        retryable: true,
        retryCount: 2,
        maxRetries: 3,
      });

      expect(mockWebSocketService.broadcastToRoom).toHaveBeenCalledWith(
        `batch_${batchId}`,
        'batch_error',
        expect.objectContaining({
          batchId,
          error: 'Network timeout',
          retryable: true,
          retryCount: 2,
          maxRetries: 3,
          timestamp: expect.any(Date),
        })
      );
    });
  });

  describe('sendSystemNotification', () => {
    it('should send system-wide notifications to all users', async () => {
      await batchNotificationService.sendSystemNotification({
        type: 'maintenance',
        title: 'Scheduled Maintenance',
        message: 'System will be down for maintenance in 10 minutes',
        severity: 'warning',
      });

      expect(mockWebSocketService.broadcastToRoom).toHaveBeenCalledWith(
        'system_notifications',
        'system_notification',
        expect.objectContaining({
          type: 'maintenance',
          title: 'Scheduled Maintenance',
          message: 'System will be down for maintenance in 10 minutes',
          severity: 'warning',
          timestamp: expect.any(Date),
        })
      );
    });
  });

  describe('getSubscriptionStats', () => {
    it('should return subscription statistics', async () => {
      await batchNotificationService.subscribeToBatch('user1', 'batch_1');
      await batchNotificationService.subscribeToBatch('user2', 'batch_1');
      await batchNotificationService.subscribeToBatch('user3', 'batch_2');

      const stats = await batchNotificationService.getSubscriptionStats();

      expect(stats.totalBatches).toBe(2);
      expect(stats.totalSubscribers).toBe(3);
      expect(stats.averageSubscribersPerBatch).toBe(1.5);
      expect(stats.batchSubscriptions).toHaveLength(2);
    });
  });

  describe('cleanupInactiveSubscriptions', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should remove subscriptions for completed batches', async () => {
      const batchId = 'batch_completed';
      await batchNotificationService.subscribeToBatch('user123', batchId);

      mockBatchProgressManager.getBatchStatus.mockResolvedValue({
        batchId,
        status: 'completed',
        endTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      } as any);

      await batchNotificationService.cleanupInactiveSubscriptions();

      const stats = await batchNotificationService.getSubscriptionStats();
      expect(stats.totalBatches).toBe(0);
      expect(mockWebSocketService.leaveRoom).toHaveBeenCalledWith(
        'user123',
        `batch_${batchId}`
      );
    });

    it('should respect cleanup configuration settings', async () => {
      const customService = new BatchNotificationService(
        mockWebSocketService,
        mockBatchProgressManager,
        {
          enableAutoCleanup: false,
          cleanupInterval: 30000, // 30 seconds
        }
      );

      // Should not auto-cleanup even with completed batches
      const batchId = 'batch_completed';
      await customService.subscribeToBatch('user123', batchId);

      mockBatchProgressManager.getBatchStatus.mockResolvedValue({
        status: 'completed',
        endTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      } as any);

      // Manual cleanup should still work
      await customService.cleanupInactiveSubscriptions();

      const stats = await customService.getSubscriptionStats();
      expect(stats.totalBatches).toBe(0);
    });
  });

  describe('error handling and resilience', () => {
    it('should handle WebSocket disconnections gracefully', async () => {
      mockWebSocketService.isConnected.mockReturnValue(false);

      const result = await batchNotificationService.subscribeToBatch(
        'user123',
        'batch_456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('WebSocket service not available');
    });

    it('should queue notifications when WebSocket is temporarily unavailable', async () => {
      const batchId = 'batch_456';
      await batchNotificationService.subscribeToBatch('user123', batchId);

      // Simulate temporary WebSocket failure
      mockWebSocketService.broadcastToRoom.mockRejectedValueOnce(
        new Error('Connection lost')
      );

      // This should not throw, but queue the notification
      await expect(
        batchNotificationService.notifyBatchProgress(batchId, {
          status: 'processing',
          overallProgress: 0.5,
        })
      ).resolves.not.toThrow();

      // When WebSocket is restored, queued notifications should be sent
      mockWebSocketService.isConnected.mockReturnValue(true);
      await batchNotificationService.processQueuedNotifications();

      expect(mockWebSocketService.broadcastToRoom).toHaveBeenCalledTimes(2); // Original failed + retry
    });

    it('should limit notification queue size', async () => {
      const customService = new BatchNotificationService(
        mockWebSocketService,
        mockBatchProgressManager,
        { maxQueueSize: 2 }
      );

      const batchId = 'batch_456';
      await customService.subscribeToBatch('user123', batchId);

      // Simulate WebSocket failures
      mockWebSocketService.broadcastToRoom.mockRejectedValue(
        new Error('Connection lost')
      );

      // Queue multiple notifications (more than limit)
      await customService.notifyBatchProgress(batchId, {
        overallProgress: 0.1,
      });
      await customService.notifyBatchProgress(batchId, {
        overallProgress: 0.2,
      });
      await customService.notifyBatchProgress(batchId, {
        overallProgress: 0.3,
      });

      const queueSize = await customService.getQueuedNotificationCount();
      expect(queueSize).toBe(1); // Only first notification queued due to throttling
    });
  });

  describe('performance optimization', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should batch multiple file progress updates', async () => {
      const batchId = 'batch_456';
      await batchNotificationService.subscribeToBatch('user123', batchId);

      // Enable batching mode
      batchNotificationService.enableBatchedUpdates(true);

      // Send multiple file updates
      await batchNotificationService.notifyBatchFileProgress(batchId, 'file1', {
        status: 'processing',
        progress: 0.5,
      });
      await batchNotificationService.notifyBatchFileProgress(batchId, 'file2', {
        status: 'processing',
        progress: 0.7,
      });
      await batchNotificationService.notifyBatchFileProgress(batchId, 'file3', {
        status: 'completed',
        progress: 1.0,
      });

      // Initially no calls (batching delay)
      expect(mockWebSocketService.broadcastToRoom).toHaveBeenCalledTimes(0);

      // Advance time past batching delay
      vi.advanceTimersByTime(150);

      // Should send a single batched update
      expect(mockWebSocketService.broadcastToRoom).toHaveBeenCalledTimes(1);
      expect(mockWebSocketService.broadcastToRoom).toHaveBeenCalledWith(
        `batch_${batchId}`,
        'batch_file_progress_batch',
        expect.objectContaining({
          batchId,
          updates: expect.arrayContaining([
            expect.objectContaining({ fileId: 'file1' }),
            expect.objectContaining({ fileId: 'file2' }),
            expect.objectContaining({ fileId: 'file3' }),
          ]),
        })
      );
    });
  });
});
