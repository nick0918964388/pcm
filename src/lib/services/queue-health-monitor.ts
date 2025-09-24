import { BatchQueueService, QueueHealthMetrics } from './batch-queue-service';

export interface QueueHealthMonitorOptions {
  checkInterval?: number; // milliseconds
  maxFailedJobs?: number;
  maxWaitingJobs?: number;
  historyLimit?: number;
}

export interface QueueHealthStatus {
  isHealthy: boolean;
  queueMetrics: QueueHealthMetrics;
  issues: string[];
  timestamp: Date;
}

export interface ProcessingRate {
  jobsPerSecond: number;
  estimatedTimeToEmpty: number; // seconds
}

export interface WaitTimeEstimate {
  totalWaitTimeSeconds: number;
  averageWaitTimePerJob: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface MonitoringConfiguration {
  checkInterval?: number;
  maxFailedJobs?: number;
  maxWaitingJobs?: number;
}

export class QueueHealthMonitor {
  private batchQueueService: BatchQueueService;
  private checkInterval: number;
  private maxFailedJobs: number;
  private maxWaitingJobs: number;
  private historyLimit: number;
  private healthHistory: QueueHealthStatus[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoringActive = false;

  constructor(
    batchQueueService: BatchQueueService,
    options: QueueHealthMonitorOptions = {}
  ) {
    this.batchQueueService = batchQueueService;
    this.checkInterval = options.checkInterval ?? 30000; // 30 seconds default
    this.maxFailedJobs = options.maxFailedJobs ?? 50;
    this.maxWaitingJobs = options.maxWaitingJobs ?? 100;
    this.historyLimit = options.historyLimit ?? 100;

    this.validateConfiguration();
  }

  /**
   * Check current queue health status
   */
  async checkQueueHealth(): Promise<QueueHealthStatus> {
    try {
      const queueMetrics = await this.batchQueueService.getQueueHealth();
      const issues: string[] = [];
      let isHealthy = true;

      // Check if queue is connected
      if (queueMetrics.connectionStatus === 'disconnected') {
        isHealthy = false;
        const errorMsg = queueMetrics.error ? `: ${queueMetrics.error}` : '';
        issues.push(`Queue connection is disconnected${errorMsg}`);
      }

      // Check failed jobs limit
      if (queueMetrics.failedJobs > this.maxFailedJobs) {
        isHealthy = false;
        issues.push(
          `Too many failed jobs: ${queueMetrics.failedJobs} (limit: ${this.maxFailedJobs})`
        );
      }

      // Check waiting jobs limit
      if (queueMetrics.waitingJobs > this.maxWaitingJobs) {
        isHealthy = false;
        issues.push(
          `Too many waiting jobs: ${queueMetrics.waitingJobs} (limit: ${this.maxWaitingJobs})`
        );
      }

      // Use queue's own health assessment as additional input
      if (!queueMetrics.isHealthy) {
        isHealthy = false;
        if (issues.length === 0) {
          issues.push('Queue reports unhealthy status');
        }
      }

      const healthStatus: QueueHealthStatus = {
        isHealthy,
        queueMetrics,
        issues,
        timestamp: new Date(),
      };

      // Add to history
      this.addToHistory(healthStatus);

      return healthStatus;
    } catch (error) {
      const healthStatus: QueueHealthStatus = {
        isHealthy: false,
        queueMetrics: {
          waitingJobs: 0,
          activeJobs: 0,
          failedJobs: 0,
          isHealthy: false,
          connectionStatus: 'disconnected',
        },
        issues: [
          `Queue health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        timestamp: new Date(),
      };

      this.addToHistory(healthStatus);
      return healthStatus;
    }
  }

  /**
   * Calculate processing rate based on historical data
   */
  async calculateProcessingRate(): Promise<ProcessingRate> {
    if (this.healthHistory.length < 2) {
      return {
        jobsPerSecond: 0,
        estimatedTimeToEmpty: Infinity,
      };
    }

    // Get the latest and previous health status
    const latest = this.healthHistory[this.healthHistory.length - 1];
    const previous = this.healthHistory[this.healthHistory.length - 2];

    const timeDifferenceMs =
      latest.timestamp.getTime() - previous.timestamp.getTime();
    const timeDifferenceSeconds = timeDifferenceMs / 1000;

    if (timeDifferenceSeconds <= 0) {
      return {
        jobsPerSecond: 0,
        estimatedTimeToEmpty: Infinity,
      };
    }

    // Calculate jobs processed (including failed jobs as they were processed)
    const previousTotal =
      previous.queueMetrics.waitingJobs + previous.queueMetrics.failedJobs;
    const latestTotal =
      latest.queueMetrics.waitingJobs + latest.queueMetrics.failedJobs;
    const jobsProcessed = Math.max(0, previousTotal - latestTotal);

    const jobsPerSecond = jobsProcessed / timeDifferenceSeconds;

    // Estimate time to empty current queue
    const currentWaitingJobs = latest.queueMetrics.waitingJobs;
    const estimatedTimeToEmpty =
      jobsPerSecond > 0 ? currentWaitingJobs / jobsPerSecond : Infinity;

    return {
      jobsPerSecond,
      estimatedTimeToEmpty,
    };
  }

  /**
   * Estimate wait time for jobs in queue
   */
  async estimateWaitTime(): Promise<WaitTimeEstimate> {
    const processingRate = await this.calculateProcessingRate();
    const currentHealth = await this.checkQueueHealth();

    if (processingRate.jobsPerSecond <= 0) {
      return {
        totalWaitTimeSeconds: Infinity,
        averageWaitTimePerJob: Infinity,
        confidence: 'low',
      };
    }

    const totalWaitTimeSeconds = processingRate.estimatedTimeToEmpty;
    const averageWaitTimePerJob =
      currentHealth.queueMetrics.waitingJobs > 0
        ? totalWaitTimeSeconds / currentHealth.queueMetrics.waitingJobs
        : 0;

    // Determine confidence based on history length
    let confidence: 'low' | 'medium' | 'high' = 'low';
    if (this.healthHistory.length >= 10) {
      confidence = 'high';
    } else if (this.healthHistory.length >= 5) {
      confidence = 'medium';
    }

    return {
      totalWaitTimeSeconds,
      averageWaitTimePerJob,
      confidence,
    };
  }

  /**
   * Start periodic health monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoringActive) {
      return; // Already monitoring
    }

    this.isMonitoringActive = true;
    this.monitoringInterval = setInterval(async () => {
      await this.checkQueueHealth();
    }, this.checkInterval);
  }

  /**
   * Stop periodic health monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoringActive = false;
  }

  /**
   * Check if monitoring is currently active
   */
  isMonitoring(): boolean {
    return this.isMonitoringActive;
  }

  /**
   * Get health check history
   */
  getHealthHistory(): QueueHealthStatus[] {
    return [...this.healthHistory];
  }

  /**
   * Update monitoring configuration
   */
  updateConfiguration(config: MonitoringConfiguration): void {
    if (config.checkInterval !== undefined) {
      if (config.checkInterval <= 0) {
        throw new Error('Check interval must be positive');
      }
      this.checkInterval = config.checkInterval;
    }

    if (config.maxFailedJobs !== undefined) {
      if (config.maxFailedJobs < 0) {
        throw new Error('Max failed jobs must be non-negative');
      }
      this.maxFailedJobs = config.maxFailedJobs;
    }

    if (config.maxWaitingJobs !== undefined) {
      if (config.maxWaitingJobs < 0) {
        throw new Error('Max waiting jobs must be non-negative');
      }
      this.maxWaitingJobs = config.maxWaitingJobs;
    }

    // Restart monitoring if it was active
    if (this.isMonitoringActive) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  /**
   * Get current check interval
   */
  getCheckInterval(): number {
    return this.checkInterval;
  }

  /**
   * Get maximum failed jobs threshold
   */
  getMaxFailedJobs(): number {
    return this.maxFailedJobs;
  }

  /**
   * Get maximum waiting jobs threshold
   */
  getMaxWaitingJobs(): number {
    return this.maxWaitingJobs;
  }

  /**
   * Clear health history
   */
  clearHistory(): void {
    this.healthHistory = [];
  }

  /**
   * Add health status to history with limit management
   */
  private addToHistory(healthStatus: QueueHealthStatus): void {
    this.healthHistory.push(healthStatus);

    // Limit history size
    if (this.healthHistory.length > this.historyLimit) {
      this.healthHistory = this.healthHistory.slice(-this.historyLimit);
    }
  }

  /**
   * Validate configuration values
   */
  private validateConfiguration(): void {
    if (this.checkInterval <= 0) {
      throw new Error('Check interval must be positive');
    }
    if (this.maxFailedJobs < 0) {
      throw new Error('Max failed jobs must be non-negative');
    }
    if (this.maxWaitingJobs < 0) {
      throw new Error('Max waiting jobs must be non-negative');
    }
    if (this.historyLimit <= 0) {
      throw new Error('History limit must be positive');
    }
  }
}
