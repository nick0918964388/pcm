import { BatchProgressManager } from './batch-progress-manager';

export interface StatusChangeRecord {
  batchId: string;
  fromStatus: string | null;
  toStatus: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface FileStatusChangeRecord {
  batchId: string;
  fileId: string;
  fromStatus: string | null;
  toStatus: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface StatusHistoryFilter {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  statuses?: string[];
}

export interface StatusStatistics {
  totalDuration: number;
  timeSpentInStatus: Record<string, number>;
  statusTransitions: StatusChangeRecord[];
  averageTransitionTime: number;
}

export interface GlobalStatistics {
  averageTimeInStatus: Record<string, number>;
  failureRate: number;
  commonFailureReasons: string[];
  totalBatchesTracked: number;
  mostCommonTransitions: Array<{ from: string; to: string; count: number }>;
}

export interface ExportData {
  format: 'json' | 'csv';
  batchId: string;
  data: any;
  timestamp: Date;
}

export interface BatchStatusTrackerOptions {
  maxHistoryEntries?: number;
  retentionPeriod?: number;
  enableCompression?: boolean;
  compressionThreshold?: number;
  enableAutoCleanup?: boolean;
  cleanupInterval?: number;
}

export class BatchStatusTracker {
  private batchProgressManager: BatchProgressManager;
  private statusHistory = new Map<string, StatusChangeRecord[]>();
  private fileStatusHistory = new Map<
    string,
    Map<string, FileStatusChangeRecord[]>
  >();
  private maxHistoryEntries: number;
  private retentionPeriod: number;
  private enableCompression: boolean;
  private compressionThreshold: number;
  private enableAutoCleanup: boolean;
  private cleanupInterval: number;
  private cleanupTimer?: NodeJS.Timeout;

  private readonly validStatuses = [
    'queued',
    'processing',
    'completed',
    'failed',
    'cancelled',
    'archived',
  ];

  constructor(
    batchProgressManager: BatchProgressManager,
    options: BatchStatusTrackerOptions = {}
  ) {
    this.batchProgressManager = batchProgressManager;
    this.maxHistoryEntries = options.maxHistoryEntries ?? 500;
    this.retentionPeriod = options.retentionPeriod ?? 7 * 24 * 60 * 60 * 1000; // 7 days
    this.enableCompression = options.enableCompression ?? true;
    this.compressionThreshold = options.compressionThreshold ?? 10;
    this.enableAutoCleanup = options.enableAutoCleanup ?? true;
    this.cleanupInterval = options.cleanupInterval ?? 60 * 60 * 1000; // 1 hour

    if (this.enableAutoCleanup) {
      this.startCleanupTimer();
    }
  }

  async trackStatusChange(
    batchId: string,
    fromStatus: string | null,
    toStatus: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    this.validateStatus(fromStatus);
    this.validateStatus(toStatus);

    const record: StatusChangeRecord = {
      batchId,
      fromStatus,
      toStatus,
      timestamp: new Date(),
      metadata,
    };

    if (!this.statusHistory.has(batchId)) {
      this.statusHistory.set(batchId, []);
    }

    const history = this.statusHistory.get(batchId)!;
    history.push(record);

    // Enforce history limit
    if (history.length > this.maxHistoryEntries) {
      history.splice(0, history.length - this.maxHistoryEntries);
    }

    // Check if compression is needed
    if (this.enableCompression && history.length >= this.compressionThreshold) {
      await this.performCompression(batchId);
    }
  }

  async trackFileStatusChange(
    batchId: string,
    fileId: string,
    fromStatus: string | null,
    toStatus: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    this.validateStatus(fromStatus);
    this.validateStatus(toStatus);

    const record: FileStatusChangeRecord = {
      batchId,
      fileId,
      fromStatus,
      toStatus,
      timestamp: new Date(),
      metadata,
    };

    if (!this.fileStatusHistory.has(batchId)) {
      this.fileStatusHistory.set(batchId, new Map());
    }

    const batchFileHistory = this.fileStatusHistory.get(batchId)!;
    if (!batchFileHistory.has(fileId)) {
      batchFileHistory.set(fileId, []);
    }

    const fileHistory = batchFileHistory.get(fileId)!;
    fileHistory.push(record);

    // Enforce history limit per file
    if (fileHistory.length > this.maxHistoryEntries) {
      fileHistory.splice(0, fileHistory.length - this.maxHistoryEntries);
    }
  }

  async getStatusHistory(
    batchId: string,
    filter?: StatusHistoryFilter
  ): Promise<StatusChangeRecord[]> {
    const history = this.statusHistory.get(batchId) || [];
    let filteredHistory = [...history];

    if (filter) {
      if (filter.startDate || filter.endDate) {
        filteredHistory = filteredHistory.filter(record => {
          const timestamp = record.timestamp.getTime();
          if (filter.startDate && timestamp < filter.startDate.getTime()) {
            return false;
          }
          if (filter.endDate && timestamp > filter.endDate.getTime()) {
            return false;
          }
          return true;
        });
      }

      if (filter.statuses) {
        filteredHistory = filteredHistory.filter(record =>
          filter.statuses!.includes(record.toStatus)
        );
      }

      if (filter.limit) {
        filteredHistory = filteredHistory.slice(-filter.limit);
      }
    }

    return filteredHistory;
  }

  async getFileStatusHistory(
    batchId: string,
    fileId: string
  ): Promise<FileStatusChangeRecord[]> {
    const batchFileHistory = this.fileStatusHistory.get(batchId);
    if (!batchFileHistory) {
      return [];
    }

    return batchFileHistory.get(fileId) || [];
  }

  async getStatusStatistics(batchId: string): Promise<StatusStatistics> {
    const history = await this.getStatusHistory(batchId);

    if (history.length === 0) {
      return {
        totalDuration: 0,
        timeSpentInStatus: {},
        statusTransitions: [],
        averageTransitionTime: 0,
      };
    }

    const timeSpentInStatus: Record<string, number> = {};
    let totalDuration = 0;
    let totalTransitionTime = 0;

    for (let i = 0; i < history.length; i++) {
      const current = history[i];
      const next = history[i + 1];

      if (next) {
        const duration = next.timestamp.getTime() - current.timestamp.getTime();
        timeSpentInStatus[current.toStatus] =
          (timeSpentInStatus[current.toStatus] || 0) + duration;
        totalTransitionTime += duration;
      }
    }

    if (history.length > 0) {
      const startTime = history[0].timestamp.getTime();
      const endTime = history[history.length - 1].timestamp.getTime();
      totalDuration = endTime - startTime;
    }

    return {
      totalDuration,
      timeSpentInStatus,
      statusTransitions: history,
      averageTransitionTime:
        history.length > 1 ? totalTransitionTime / (history.length - 1) : 0,
    };
  }

  async getGlobalStatistics(
    filter?: StatusHistoryFilter
  ): Promise<GlobalStatistics> {
    const allBatches = Array.from(this.statusHistory.keys());
    const allHistories: StatusChangeRecord[] = [];

    for (const batchId of allBatches) {
      const history = await this.getStatusHistory(batchId, filter);
      allHistories.push(...history);
    }

    const statusDurations: Record<string, number[]> = {};
    const transitionCounts: Record<string, number> = {};
    let totalFailures = 0;
    let totalBatches = allBatches.length;

    for (let i = 0; i < allHistories.length; i++) {
      const current = allHistories[i];
      const next = allHistories.find(
        h =>
          h.batchId === current.batchId &&
          h.timestamp.getTime() > current.timestamp.getTime()
      );

      if (next) {
        const duration = next.timestamp.getTime() - current.timestamp.getTime();
        if (!statusDurations[current.toStatus]) {
          statusDurations[current.toStatus] = [];
        }
        statusDurations[current.toStatus].push(duration);

        const transitionKey = `${current.fromStatus || 'start'}->${current.toStatus}`;
        transitionCounts[transitionKey] =
          (transitionCounts[transitionKey] || 0) + 1;
      }

      if (current.toStatus === 'failed') {
        totalFailures++;
      }
    }

    const averageTimeInStatus: Record<string, number> = {};
    Object.entries(statusDurations).forEach(([status, durations]) => {
      averageTimeInStatus[status] =
        durations.reduce((sum, d) => sum + d, 0) / durations.length;
    });

    const mostCommonTransitions = Object.entries(transitionCounts)
      .map(([transition, count]) => {
        const [from, to] = transition.split('->');
        return { from, to, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const failureRate = totalBatches > 0 ? totalFailures / totalBatches : 0;
    const commonFailureReasons = this.identifyFailureReasons(allHistories);

    return {
      averageTimeInStatus,
      failureRate,
      commonFailureReasons,
      totalBatchesTracked: totalBatches,
      mostCommonTransitions,
    };
  }

  async exportHistory(
    batchId: string,
    format: 'json' | 'csv'
  ): Promise<ExportData> {
    const history = await this.getStatusHistory(batchId);

    if (format === 'json') {
      return {
        format: 'json',
        batchId,
        data: history,
        timestamp: new Date(),
      };
    } else {
      const csvHeader = 'batchId,fromStatus,toStatus,timestamp,metadata\n';
      const csvRows = history
        .map(record => {
          const metadata = record.metadata
            ? JSON.stringify(record.metadata)
            : '';
          return `${record.batchId},${record.fromStatus || ''},${record.toStatus},${record.timestamp.toISOString()},"${metadata}"`;
        })
        .join('\n');

      return {
        format: 'csv',
        batchId,
        data: csvHeader + csvRows,
        timestamp: new Date(),
      };
    }
  }

  async performCompression(batchId: string): Promise<void> {
    const history = this.statusHistory.get(batchId);
    if (!history || history.length < this.compressionThreshold) {
      return;
    }

    // Simple compression: keep start and end states, compress intermediate states
    const startState = history[0];
    const endState = history[history.length - 1];

    // If there are significant states in between, keep them
    const significantStates = history.filter(
      record =>
        record.toStatus === 'failed' ||
        record.toStatus === 'cancelled' ||
        (record.metadata && record.metadata.significant)
    );

    const compressedHistory = [startState];
    compressedHistory.push(...significantStates.slice(1, -1));
    if (endState !== startState) {
      compressedHistory.push(endState);
    }

    this.statusHistory.set(batchId, compressedHistory);
  }

  getMaxHistoryEntries(): number {
    return this.maxHistoryEntries;
  }

  getRetentionPeriod(): number {
    return this.retentionPeriod;
  }

  private validateStatus(status: string | null): void {
    if (status !== null && !this.validStatuses.includes(status)) {
      throw new Error(`Invalid status transition: ${status}`);
    }
  }

  private identifyFailureReasons(allHistories: StatusChangeRecord[]): string[] {
    const failureReasons: Record<string, number> = {};

    allHistories
      .filter(record => record.toStatus === 'failed')
      .forEach(record => {
        if (record.metadata?.reason) {
          failureReasons[record.metadata.reason] =
            (failureReasons[record.metadata.reason] || 0) + 1;
        }

        // Identify patterns based on previous status and timing
        const batchHistories = allHistories
          .filter(h => h.batchId === record.batchId)
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        // Find when processing started for this batch
        const processingStartRecord = batchHistories.find(
          h => h.toStatus === 'processing'
        );

        if (processingStartRecord) {
          const duration =
            record.timestamp.getTime() -
            processingStartRecord.timestamp.getTime();
          if (duration >= 30 * 60 * 1000) {
            // 30 minutes or more
            failureReasons['processing_timeout'] =
              (failureReasons['processing_timeout'] || 0) + 1;
          }
        }
      });

    return Object.entries(failureReasons)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason]) => reason);
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.cleanupInterval);
  }

  private performCleanup(): void {
    const cutoffTime = Date.now() - this.retentionPeriod;

    for (const [batchId, history] of this.statusHistory.entries()) {
      const filteredHistory = history.filter(
        record => record.timestamp.getTime() > cutoffTime
      );

      if (filteredHistory.length === 0) {
        this.statusHistory.delete(batchId);
      } else {
        this.statusHistory.set(batchId, filteredHistory);
      }
    }

    for (const [
      batchId,
      batchFileHistory,
    ] of this.fileStatusHistory.entries()) {
      for (const [fileId, fileHistory] of batchFileHistory.entries()) {
        const filteredHistory = fileHistory.filter(
          record => record.timestamp.getTime() > cutoffTime
        );

        if (filteredHistory.length === 0) {
          batchFileHistory.delete(fileId);
        } else {
          batchFileHistory.set(fileId, filteredHistory);
        }
      }

      if (batchFileHistory.size === 0) {
        this.fileStatusHistory.delete(batchId);
      }
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}
