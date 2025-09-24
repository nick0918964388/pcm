import { WebSocketService } from './websocket-service';
import { BatchProgressManager } from './batch-progress-manager';

export interface BatchProgressNotification {
  status?: string;
  overallProgress?: number;
  completedFiles?: number;
  totalFiles?: number;
  estimatedTimeRemaining?: number;
  [key: string]: any;
}

export interface BatchFileProgressNotification {
  fileName?: string;
  status?: string;
  progress?: number;
  uploadedBytes?: number;
  totalBytes?: number;
  [key: string]: any;
}

export interface BatchErrorNotification {
  error: string;
  retryable?: boolean;
  retryCount?: number;
  maxRetries?: number;
  [key: string]: any;
}

export interface SystemNotification {
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  [key: string]: any;
}

export interface SubscriptionResult {
  success: boolean;
  subscriberCount?: number;
  error?: string;
}

export interface SubscriptionStats {
  totalBatches: number;
  totalSubscribers: number;
  averageSubscribersPerBatch: number;
  batchSubscriptions: Array<{
    batchId: string;
    subscriberCount: number;
    lastActivity: Date;
  }>;
}

export interface QueuedNotification {
  type: string;
  room: string;
  event: string;
  data: any;
  timestamp: Date;
  retryCount: number;
}

export interface BatchNotificationServiceOptions {
  enabled?: boolean;
  maxSubscribers?: number;
  throttleInterval?: number;
  batchNotificationThreshold?: number;
  enableAutoCleanup?: boolean;
  cleanupInterval?: number;
  maxQueueSize?: number;
  retryAttempts?: number;
}

export class BatchNotificationService {
  private webSocketService: WebSocketService;
  private batchProgressManager: BatchProgressManager;
  private enabled: boolean;
  private maxSubscribers: number;
  private throttleInterval: number;
  private batchNotificationThreshold: number;
  private enableAutoCleanup: boolean;
  private cleanupInterval: number;
  private maxQueueSize: number;
  private retryAttempts: number;
  private progressThresholdBypassEnabled: boolean;

  private subscriptions = new Map<string, Set<string>>(); // batchId -> Set of userIds
  private lastNotifications = new Map<
    string,
    { progress: number; timestamp: Date }
  >(); // batchId -> last notification
  private throttleTimers = new Map<string, NodeJS.Timeout>(); // batchId -> timer
  private pendingNotifications = new Map<string, BatchProgressNotification>(); // batchId -> pending data
  private notificationQueue: QueuedNotification[] = [];
  private cleanupTimer?: NodeJS.Timeout;
  private batchedUpdatesEnabled = false;
  private pendingFileUpdates = new Map<
    string,
    Map<string, BatchFileProgressNotification>
  >(); // batchId -> fileId -> data
  private batchFileTimers = new Map<string, NodeJS.Timeout>(); // batchId -> timer

  constructor(
    webSocketService: WebSocketService,
    batchProgressManager: BatchProgressManager,
    options: BatchNotificationServiceOptions = {}
  ) {
    this.webSocketService = webSocketService;
    this.batchProgressManager = batchProgressManager;
    this.enabled = options.enabled ?? true;
    this.maxSubscribers = options.maxSubscribers ?? 1000;
    this.throttleInterval = options.throttleInterval ?? 1000; // 1 second
    this.batchNotificationThreshold =
      options.batchNotificationThreshold ?? 0.05; // 5%
    this.enableAutoCleanup = options.enableAutoCleanup ?? true;
    this.cleanupInterval = options.cleanupInterval ?? 10 * 60 * 1000; // 10 minutes
    this.maxQueueSize = options.maxQueueSize ?? 100;
    this.retryAttempts = options.retryAttempts ?? 3;

    // Enable progress threshold bypass only when explicitly configured
    this.progressThresholdBypassEnabled =
      options.batchNotificationThreshold !== undefined;

    if (this.enableAutoCleanup) {
      this.startCleanupTimer();
    }
  }

  async subscribeToBatch(
    userId: string,
    batchId: string
  ): Promise<SubscriptionResult> {
    if (!this.enabled) {
      return { success: false, error: 'Notification service is disabled' };
    }

    if (!this.webSocketService.isConnected()) {
      return { success: false, error: 'WebSocket service not available' };
    }

    try {
      if (!this.subscriptions.has(batchId)) {
        this.subscriptions.set(batchId, new Set());
      }

      const subscribers = this.subscriptions.get(batchId)!;

      if (subscribers.size >= this.maxSubscribers && !subscribers.has(userId)) {
        return { success: false, error: 'Maximum subscribers limit reached' };
      }

      if (!subscribers.has(userId)) {
        await this.webSocketService.joinRoom(userId, `batch_${batchId}`);
        subscribers.add(userId);
      }

      return { success: true, subscriberCount: subscribers.size };
    } catch (error) {
      return {
        success: false,
        error: `Failed to subscribe: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async unsubscribeFromBatch(
    userId: string,
    batchId: string
  ): Promise<SubscriptionResult> {
    try {
      const subscribers = this.subscriptions.get(batchId);
      if (subscribers) {
        if (subscribers.has(userId)) {
          await this.webSocketService.leaveRoom(userId, `batch_${batchId}`);
          subscribers.delete(userId);
        }

        if (subscribers.size === 0) {
          this.subscriptions.delete(batchId);
          this.lastNotifications.delete(batchId);
          this.clearThrottleTimer(batchId);
        }

        return { success: true, subscriberCount: subscribers.size };
      }

      return { success: true, subscriberCount: 0 };
    } catch (error) {
      return {
        success: false,
        error: `Failed to unsubscribe: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async notifyBatchProgress(
    batchId: string,
    data: BatchProgressNotification
  ): Promise<void> {
    if (!this.enabled || !this.subscriptions.has(batchId)) {
      return;
    }

    const shouldSendImmediately = this.shouldSendNotification(batchId, data);

    if (shouldSendImmediately) {
      await this.sendNotification(`batch_${batchId}`, 'batch_progress_update', {
        batchId,
        ...data,
        timestamp: new Date(),
      });

      this.updateLastNotification(batchId, data);
    } else {
      // Store pending notification for throttled sending
      this.pendingNotifications.set(batchId, { ...data });
      this.scheduleThrottledNotification(batchId);
    }
  }

  async notifyBatchFileProgress(
    batchId: string,
    fileId: string,
    data: BatchFileProgressNotification
  ): Promise<void> {
    if (!this.enabled || !this.subscriptions.has(batchId)) {
      return;
    }

    if (this.batchedUpdatesEnabled) {
      if (!this.pendingFileUpdates.has(batchId)) {
        this.pendingFileUpdates.set(batchId, new Map());
      }
      this.pendingFileUpdates.get(batchId)!.set(fileId, data);
      this.scheduleBatchedFileUpdates(batchId);
    } else {
      await this.sendNotification(
        `batch_${batchId}`,
        'batch_file_progress_update',
        {
          batchId,
          fileId,
          ...data,
          timestamp: new Date(),
        }
      );
    }
  }

  async notifyBatchError(
    batchId: string,
    data: BatchErrorNotification
  ): Promise<void> {
    if (!this.enabled || !this.subscriptions.has(batchId)) {
      return;
    }

    await this.sendNotification(`batch_${batchId}`, 'batch_error', {
      batchId,
      ...data,
      timestamp: new Date(),
    });
  }

  async sendSystemNotification(
    notification: SystemNotification
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    await this.sendNotification('system_notifications', 'system_notification', {
      ...notification,
      timestamp: new Date(),
    });
  }

  async getSubscriptionStats(): Promise<SubscriptionStats> {
    const totalBatches = this.subscriptions.size;
    let totalSubscribers = 0;
    const batchSubscriptions: SubscriptionStats['batchSubscriptions'] = [];

    for (const [batchId, subscribers] of this.subscriptions.entries()) {
      totalSubscribers += subscribers.size;
      batchSubscriptions.push({
        batchId,
        subscriberCount: subscribers.size,
        lastActivity:
          this.lastNotifications.get(batchId)?.timestamp || new Date(),
      });
    }

    return {
      totalBatches,
      totalSubscribers,
      averageSubscribersPerBatch:
        totalBatches > 0 ? totalSubscribers / totalBatches : 0,
      batchSubscriptions,
    };
  }

  async cleanupInactiveSubscriptions(): Promise<void> {
    const cutoffTime = Date.now() - 60 * 60 * 1000; // 1 hour ago

    for (const [batchId, subscribers] of this.subscriptions.entries()) {
      try {
        const batchStatus =
          await this.batchProgressManager.getBatchStatus(batchId);

        if (
          batchStatus &&
          (batchStatus.status === 'completed' ||
            batchStatus.status === 'failed' ||
            batchStatus.status === 'cancelled') &&
          batchStatus.endTime &&
          batchStatus.endTime.getTime() < cutoffTime
        ) {
          // Unsubscribe all users from this completed batch
          for (const userId of subscribers) {
            await this.webSocketService.leaveRoom(userId, `batch_${batchId}`);
          }

          this.subscriptions.delete(batchId);
          this.lastNotifications.delete(batchId);
          this.clearThrottleTimer(batchId);
        }
      } catch (error) {
        console.warn(
          `Failed to check batch status for cleanup: ${batchId}`,
          error
        );
      }
    }
  }

  async processQueuedNotifications(): Promise<void> {
    const notifications = [...this.notificationQueue];
    this.notificationQueue = [];

    for (const notification of notifications) {
      try {
        await this.webSocketService.broadcastToRoom(
          notification.room,
          notification.event,
          notification.data
        );
      } catch (error) {
        // Re-queue if retries available
        if (notification.retryCount < this.retryAttempts) {
          notification.retryCount++;
          this.queueNotification(notification);
        }
      }
    }
  }

  async getQueuedNotificationCount(): Promise<number> {
    return this.notificationQueue.length;
  }

  enableBatchedUpdates(enabled: boolean): void {
    this.batchedUpdatesEnabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getMaxSubscribers(): number {
    return this.maxSubscribers;
  }

  getThrottleInterval(): number {
    return this.throttleInterval;
  }

  private shouldSendNotification(
    batchId: string,
    data: BatchProgressNotification
  ): boolean {
    // Always send completion, failure, or cancellation notifications
    if (
      data.status &&
      ['completed', 'failed', 'cancelled'].includes(data.status)
    ) {
      return true;
    }

    const lastNotification = this.lastNotifications.get(batchId);
    if (!lastNotification) {
      return true; // First notification
    }

    // Check if enough time has passed since last notification
    const timeSinceLastNotification =
      Date.now() - lastNotification.timestamp.getTime();
    const throttleIntervalPassed =
      timeSinceLastNotification >= this.throttleInterval;

    // If throttle interval hasn't passed, check if progress threshold bypass is enabled
    if (!throttleIntervalPassed) {
      if (
        this.progressThresholdBypassEnabled &&
        data.overallProgress !== undefined &&
        lastNotification.progress !== undefined
      ) {
        const progressDiff = Math.abs(
          data.overallProgress - lastNotification.progress
        );
        // Use safe floating point comparison with small epsilon
        return progressDiff >= this.batchNotificationThreshold - 1e-10;
      }
      return false; // Strict time-based throttling
    }

    // Throttle interval has passed, send the update
    return true;
  }

  private updateLastNotification(
    batchId: string,
    data: BatchProgressNotification
  ): void {
    this.lastNotifications.set(batchId, {
      progress: data.overallProgress ?? 0,
      timestamp: new Date(),
    });
  }

  private scheduleThrottledNotification(batchId: string): void {
    if (this.throttleTimers.has(batchId)) {
      return; // Already scheduled
    }

    const timer = setTimeout(async () => {
      const pendingData = this.pendingNotifications.get(batchId);
      if (pendingData) {
        await this.sendNotification(
          `batch_${batchId}`,
          'batch_progress_update',
          {
            batchId,
            ...pendingData,
            timestamp: new Date(),
          }
        );

        this.updateLastNotification(batchId, pendingData);
        this.pendingNotifications.delete(batchId);
      }

      this.throttleTimers.delete(batchId);
    }, this.throttleInterval);

    this.throttleTimers.set(batchId, timer);
  }

  private scheduleBatchedFileUpdates(batchId: string): void {
    // Don't create multiple timers for the same batch
    if (this.batchFileTimers.has(batchId)) {
      return;
    }

    const timer = setTimeout(async () => {
      const fileUpdates = this.pendingFileUpdates.get(batchId);
      if (fileUpdates && fileUpdates.size > 0) {
        const updates = Array.from(fileUpdates.entries()).map(
          ([fileId, data]) => ({
            fileId,
            ...data,
          })
        );

        await this.sendNotification(
          `batch_${batchId}`,
          'batch_file_progress_batch',
          {
            batchId,
            updates,
            timestamp: new Date(),
          }
        );

        this.pendingFileUpdates.delete(batchId);
      }
      this.batchFileTimers.delete(batchId);
    }, 100); // 100ms batching delay

    this.batchFileTimers.set(batchId, timer);
  }

  private clearThrottleTimer(batchId: string): void {
    const timer = this.throttleTimers.get(batchId);
    if (timer) {
      clearTimeout(timer);
      this.throttleTimers.delete(batchId);
    }
  }

  private async sendNotification(
    room: string,
    event: string,
    data: any
  ): Promise<void> {
    try {
      await this.webSocketService.broadcastToRoom(room, event, data);
    } catch (error) {
      // Queue notification for retry
      this.queueNotification({
        type: 'broadcast',
        room,
        event,
        data,
        timestamp: new Date(),
        retryCount: 0,
      });
    }
  }

  private queueNotification(notification: QueuedNotification): void {
    if (this.notificationQueue.length >= this.maxQueueSize) {
      // Remove oldest notification
      this.notificationQueue.shift();
    }

    this.notificationQueue.push(notification);
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      await this.cleanupInactiveSubscriptions();
    }, this.cleanupInterval);
  }

  destroy(): void {
    // Clear all timers
    for (const timer of this.throttleTimers.values()) {
      clearTimeout(timer);
    }
    this.throttleTimers.clear();

    for (const timer of this.batchFileTimers.values()) {
      clearTimeout(timer);
    }
    this.batchFileTimers.clear();

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // Clear all data
    this.subscriptions.clear();
    this.lastNotifications.clear();
    this.pendingNotifications.clear();
    this.notificationQueue = [];
    this.pendingFileUpdates.clear();
  }
}
