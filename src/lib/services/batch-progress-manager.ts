import { BatchQueueService } from './batch-queue-service';
import { randomUUID } from 'crypto';

export interface FileUploadInfo {
  name: string;
  size: number;
  type: string;
}

export interface BatchMetadata {
  userId: string;
  projectId?: string;
  albumId?: string;
  tags?: string[];
  [key: string]: any;
}

export interface FileStatus {
  fileId: string;
  name: string;
  size: number;
  type: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  uploadedBytes: number;
  error?: string;
  result?: any;
  startTime?: Date;
  endTime?: Date;
  retryCount?: number;
}

export interface BatchStatus {
  batchId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalFiles: number;
  processedFiles: number;
  successfulUploads: number;
  failedUploads: number;
  overallProgress: number;
  totalBytes: number;
  totalUploadedBytes: number;
  startTime: Date;
  endTime?: Date;
  files: FileStatus[];
  metadata: BatchMetadata;
  cancelReason?: string;
}

export interface BatchStats {
  uploadSpeedBytesPerSecond: number;
  estimatedTimeRemainingSeconds: number;
  averageFileSize: number;
}

export interface BatchErrorInfo {
  fileName: string;
  errorMessage: string;
  retryable: boolean;
}

export interface BatchSummary {
  batchId: string;
  totalFiles: number;
  successfulUploads: number;
  failedUploads: number;
  totalProcessingTime: number;
  averageFileSize: number;
  errors: BatchErrorInfo[];
}

export interface FileProgressUpdate {
  status: FileStatus['status'];
  progress: number;
  uploadedBytes: number;
  error?: string;
  result?: any;
}

export interface BatchProgressManagerOptions {
  maxBatchHistory?: number;
  cleanupInterval?: number;
  enableAutoCleanup?: boolean;
  maxBatchAge?: number;
}

export class BatchProgressManager {
  private batchStatuses = new Map<string, BatchStatus>();
  private batchHistory: BatchSummary[] = [];
  private batchQueueService: BatchQueueService;
  private maxBatchHistory: number;
  private cleanupInterval: number;
  private enableAutoCleanup: boolean;
  private maxBatchAge: number;
  private cleanupTimer?: NodeJS.Timeout;
  private batchStartTimes = new Map<string, number>();

  constructor(
    batchQueueService: BatchQueueService,
    options: BatchProgressManagerOptions = {}
  ) {
    this.batchQueueService = batchQueueService;
    this.maxBatchHistory = options.maxBatchHistory ?? 100;
    this.cleanupInterval = options.cleanupInterval ?? 300000; // 5 minutes
    this.enableAutoCleanup = options.enableAutoCleanup ?? true;
    this.maxBatchAge = options.maxBatchAge ?? 24 * 60 * 60 * 1000; // 24 hours default

    if (this.enableAutoCleanup) {
      this.startCleanupTimer();
    }
  }

  async createBatchStatus(
    batchId: string,
    files: FileUploadInfo[],
    metadata: BatchMetadata
  ): Promise<BatchStatus> {
    if (this.batchStatuses.has(batchId)) {
      throw new Error(`Batch ${batchId} already exists`);
    }

    const fileStatuses: FileStatus[] = files.map(file => ({
      fileId: randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'queued' as const,
      progress: 0,
      uploadedBytes: 0,
      retryCount: 0,
    }));

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

    const batchStatus: BatchStatus = {
      batchId,
      status: 'queued',
      totalFiles: files.length,
      processedFiles: 0,
      successfulUploads: 0,
      failedUploads: 0,
      overallProgress: 0,
      totalBytes,
      totalUploadedBytes: 0,
      startTime: new Date(),
      files: fileStatuses,
      metadata,
    };

    this.batchStatuses.set(batchId, batchStatus);
    this.batchStartTimes.set(batchId, Date.now());

    return batchStatus;
  }

  async updateFileProgress(
    batchId: string,
    fileId: string,
    update: FileProgressUpdate
  ): Promise<BatchStatus> {
    const batchStatus = this.batchStatuses.get(batchId);
    if (!batchStatus) {
      throw new Error(`Batch ${batchId} not found`);
    }

    const fileStatus = batchStatus.files.find(f => f.fileId === fileId);
    if (!fileStatus) {
      throw new Error(`File ${fileId} not found in batch ${batchId}`);
    }

    const wasProcessed =
      fileStatus.status === 'completed' || fileStatus.status === 'failed';

    fileStatus.status = update.status;
    fileStatus.progress = update.progress;
    fileStatus.uploadedBytes = update.uploadedBytes;
    fileStatus.error = update.error;
    fileStatus.result = update.result;

    if (!fileStatus.startTime && update.status === 'processing') {
      fileStatus.startTime = new Date();
    }

    if (
      (update.status === 'completed' || update.status === 'failed') &&
      !fileStatus.endTime
    ) {
      fileStatus.endTime = new Date();
      if (!wasProcessed) {
        batchStatus.processedFiles++;
        if (update.status === 'completed') {
          batchStatus.successfulUploads++;
        } else {
          batchStatus.failedUploads++;
        }
      }
    }

    this.updateBatchProgress(batchStatus);
    return batchStatus;
  }

  async getBatchStatus(batchId: string): Promise<BatchStatus | undefined> {
    const batchStatus = this.batchStatuses.get(batchId);
    if (!batchStatus) {
      return undefined;
    }
    return batchStatus;
  }

  async calculateBatchStats(batchId: string): Promise<BatchStats> {
    const batchStatus = this.batchStatuses.get(batchId);
    if (!batchStatus) {
      throw new Error(`Batch ${batchId} not found`);
    }

    const averageFileSize = batchStatus.totalBytes / batchStatus.totalFiles;
    const startTime = this.batchStartTimes.get(batchId) || Date.now();
    const elapsedTimeSeconds = (Date.now() - startTime) / 1000;

    if (elapsedTimeSeconds === 0 || batchStatus.totalUploadedBytes === 0) {
      return {
        uploadSpeedBytesPerSecond: 0,
        estimatedTimeRemainingSeconds: Infinity,
        averageFileSize,
      };
    }

    const uploadSpeedBytesPerSecond =
      batchStatus.totalUploadedBytes / elapsedTimeSeconds;
    const remainingBytes =
      batchStatus.totalBytes - batchStatus.totalUploadedBytes;
    const estimatedTimeRemainingSeconds =
      remainingBytes / uploadSpeedBytesPerSecond;

    return {
      uploadSpeedBytesPerSecond,
      estimatedTimeRemainingSeconds,
      averageFileSize,
    };
  }

  async generateBatchSummary(batchId: string): Promise<BatchSummary> {
    const batchStatus = this.batchStatuses.get(batchId);
    if (!batchStatus) {
      throw new Error(`Batch ${batchId} not found`);
    }

    const startTime = this.batchStartTimes.get(batchId) || Date.now();
    const totalProcessingTime = Date.now() - startTime;
    const averageFileSize = batchStatus.totalBytes / batchStatus.totalFiles;

    const errors: BatchErrorInfo[] = batchStatus.files
      .filter(file => file.status === 'failed' && file.error)
      .map(file => ({
        fileName: file.name,
        errorMessage: file.error!,
        retryable: this.isErrorRetryable(file.error!),
      }));

    return {
      batchId,
      totalFiles: batchStatus.totalFiles,
      successfulUploads: batchStatus.successfulUploads,
      failedUploads: batchStatus.failedUploads,
      totalProcessingTime,
      averageFileSize,
      errors,
    };
  }

  async cancelBatch(
    batchId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const batchStatus = this.batchStatuses.get(batchId);
    if (!batchStatus) {
      return { success: false, error: `Batch ${batchId} not found` };
    }

    if (batchStatus.status === 'completed') {
      return { success: false, error: 'Cannot cancel completed batch' };
    }

    batchStatus.status = 'cancelled';
    batchStatus.endTime = new Date();
    batchStatus.cancelReason = reason;

    batchStatus.files.forEach(file => {
      if (file.status === 'queued' || file.status === 'processing') {
        file.status = 'cancelled';
        file.error = reason || 'Batch cancelled';
        file.endTime = new Date();
      }
    });

    return { success: true };
  }

  getMaxBatchHistory(): number {
    return this.maxBatchHistory;
  }

  getCleanupInterval(): number {
    return this.cleanupInterval;
  }

  async retryFailedFiles(batchId: string): Promise<{
    success: boolean;
    retriedFiles: number;
    skippedFiles: number;
  }> {
    const batchStatus = this.batchStatuses.get(batchId);
    if (!batchStatus) {
      return { success: false, retriedFiles: 0, skippedFiles: 0 };
    }

    let retriedFiles = 0;
    let skippedFiles = 0;

    batchStatus.files.forEach(file => {
      if (file.status === 'failed') {
        if (file.error && this.isErrorRetryable(file.error)) {
          file.status = 'queued';
          file.progress = 0;
          file.uploadedBytes = 0;
          file.error = undefined;
          file.result = undefined;
          file.retryCount = (file.retryCount || 0) + 1;
          file.startTime = undefined;
          file.endTime = undefined;
          retriedFiles++;
        } else {
          skippedFiles++;
        }
      }
    });

    if (retriedFiles > 0) {
      batchStatus.status = 'queued';
      batchStatus.endTime = undefined;
      this.updateBatchProgress(batchStatus);
    }

    return { success: true, retriedFiles, skippedFiles };
  }

  async getBatchHistory(
    userId: string
  ): Promise<(BatchStatus & { userId: string })[]> {
    const userBatches = Array.from(this.batchStatuses.values())
      .filter(batch => batch.metadata.userId === userId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, this.maxBatchHistory);

    return userBatches.map(batch => ({
      ...batch,
      userId: batch.metadata.userId,
    }));
  }

  private updateBatchProgress(batchStatus: BatchStatus): void {
    batchStatus.totalUploadedBytes = batchStatus.files.reduce(
      (sum, file) => sum + file.uploadedBytes,
      0
    );

    if (batchStatus.totalBytes > 0) {
      batchStatus.overallProgress =
        batchStatus.totalUploadedBytes / batchStatus.totalBytes;
    } else {
      batchStatus.overallProgress = 0;
    }

    const completedOrFailedFiles = batchStatus.files.filter(
      file => file.status === 'completed' || file.status === 'failed'
    ).length;

    if (completedOrFailedFiles === batchStatus.totalFiles) {
      batchStatus.status = 'completed';
      batchStatus.endTime = new Date();
    } else if (batchStatus.files.some(file => file.status === 'processing')) {
      batchStatus.status = 'processing';
    }
  }

  private isErrorRetryable(error: string): boolean {
    const nonRetryableErrors = [
      'Unsupported file type',
      'File size exceeds limit',
      'File too large',
      'Invalid file format',
      'Duplicate file',
    ];

    return !nonRetryableErrors.some(nonRetryable =>
      error.includes(nonRetryable)
    );
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.cleanupInterval);
  }

  private performCleanup(): void {
    const cutoffTime = Date.now() - this.maxBatchAge;

    for (const [batchId, batchStatus] of this.batchStatuses.entries()) {
      if (batchStatus.endTime && batchStatus.endTime.getTime() < cutoffTime) {
        this.batchStatuses.delete(batchId);
        this.batchStartTimes.delete(batchId);
      }
    }

    if (this.batchHistory.length > this.maxBatchHistory) {
      this.batchHistory = this.batchHistory.slice(-this.maxBatchHistory);
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}
