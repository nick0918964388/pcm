import { ResourceManager, ResourceStatus } from './resource-manager';
import { QueueHealthMonitor, QueueHealthStatus } from './queue-health-monitor';
import { BatchQueueService } from './batch-queue-service';

export interface SystemLoadBalancerOptions {
  balancingInterval?: number; // milliseconds
  enableAutoBalancing?: boolean;
  emergencyThresholds?: EmergencyThresholds;
  historyLimit?: number;
}

export interface EmergencyThresholds {
  memoryThreshold: number; // 0-1
  cpuThreshold: number; // 0-1
  queueSizeThreshold: number; // number of jobs
}

export interface LoadBalancingResult {
  success: boolean;
  timestamp: Date;
  adjustments: string[];
  emergencyMode: boolean;
  error?: string;
  resourceStatus?: ResourceStatus;
  queueStatus?: QueueHealthStatus;
}

export interface SystemHealthStatus {
  overall: {
    isHealthy: boolean;
    issues: string[];
  };
  resources: ResourceStatus;
  queue: QueueHealthStatus;
  loadBalancing: {
    isActive: boolean;
    emergencyMode: boolean;
    lastBalancingTime?: Date;
  };
}

export interface LoadBalancerConfiguration {
  balancingInterval?: number;
  enableAutoBalancing?: boolean;
  emergencyThresholds?: EmergencyThresholds;
}

export class SystemLoadBalancer {
  private resourceManager: ResourceManager;
  private queueHealthMonitor: QueueHealthMonitor;
  private batchQueueService: BatchQueueService;
  private balancingInterval: number;
  private enableAutoBalancing: boolean;
  private emergencyThresholds: EmergencyThresholds;
  private historyLimit: number;
  private loadBalancingHistory: LoadBalancingResult[] = [];
  private autoBalancingTimer?: NodeJS.Timeout;
  private isAutoBalancingActive = false;
  private emergencyMode = false;
  private emergencyModeReason: string | null = null;

  constructor(
    resourceManager: ResourceManager,
    queueHealthMonitor: QueueHealthMonitor,
    batchQueueService: BatchQueueService,
    options: SystemLoadBalancerOptions = {}
  ) {
    this.resourceManager = resourceManager;
    this.queueHealthMonitor = queueHealthMonitor;
    this.batchQueueService = batchQueueService;
    this.balancingInterval = options.balancingInterval ?? 15000; // 15 seconds default
    this.enableAutoBalancing = options.enableAutoBalancing ?? true;
    this.emergencyThresholds = options.emergencyThresholds ?? {
      memoryThreshold: 0.95, // 95% memory
      cpuThreshold: 0.98, // 98% CPU
      queueSizeThreshold: 500, // 500 waiting jobs
    };
    this.historyLimit = options.historyLimit ?? 50;

    this.validateConfiguration();
  }

  /**
   * Perform load balancing based on current system status
   */
  async performLoadBalancing(): Promise<LoadBalancingResult> {
    try {
      const resourceStatus = await this.resourceManager.getResourceStatus();
      const queueStatus = await this.queueHealthMonitor.checkQueueHealth();
      const adjustments: string[] = [];
      let emergencyMode = false;

      // Check for emergency conditions
      const isEmergencyCondition = this.checkEmergencyConditions(
        resourceStatus,
        queueStatus
      );

      if (isEmergencyCondition && !this.emergencyMode) {
        await this.activateEmergencyMode(
          'System under severe stress - emergency mode activated'
        );
        emergencyMode = true;
        adjustments.push(
          'EMERGENCY: System under severe stress - reduced to minimum concurrency'
        );
      } else if (
        this.emergencyMode &&
        this.shouldRecoverFromEmergency(resourceStatus, queueStatus)
      ) {
        await this.deactivateEmergencyMode();
        adjustments.push(
          'RECOVERY: System stabilized - emergency mode deactivated'
        );
      }

      // Perform resource-based adjustments
      if (!resourceStatus.isHealthy || !queueStatus.isHealthy) {
        const previousConcurrency = resourceStatus.concurrency.current;
        const newConcurrency = await this.resourceManager.adjustConcurrency();

        if (newConcurrency !== previousConcurrency) {
          const reason = this.getAdjustmentReason(resourceStatus, queueStatus);
          adjustments.push(
            `Reduced concurrency from ${previousConcurrency} to ${newConcurrency} due to ${reason}`
          );
        }

        // Apply emergency adjustments if in emergency mode
        if (this.emergencyMode) {
          // Force minimum concurrency in emergency
          if (newConcurrency > 1) {
            this.resourceManager.setCurrentConcurrency(1);
            adjustments.push('EMERGENCY: Forced concurrency to minimum (1)');
          }
        }
      } else {
        adjustments.push('System is healthy - no adjustments needed');
      }

      // Update queue configuration if needed
      if (queueStatus.queueMetrics.failedJobs > 30) {
        adjustments.push(
          'High failed job count detected - consider queue configuration review'
        );
      }

      const result: LoadBalancingResult = {
        success: true,
        timestamp: new Date(),
        adjustments,
        emergencyMode: this.emergencyMode,
        resourceStatus,
        queueStatus,
      };

      this.addToHistory(result);
      return result;
    } catch (error) {
      const result: LoadBalancingResult = {
        success: false,
        timestamp: new Date(),
        adjustments: [],
        emergencyMode: this.emergencyMode,
        error: `Load balancing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };

      this.addToHistory(result);
      return result;
    }
  }

  /**
   * Get comprehensive system health status
   */
  async getSystemHealth(): Promise<SystemHealthStatus> {
    const resourceStatus = await this.resourceManager.getResourceStatus();
    const queueStatus = await this.queueHealthMonitor.checkQueueHealth();

    const overallIssues: string[] = [];
    if (!resourceStatus.isHealthy) {
      overallIssues.push('Resource system is unhealthy');
    }
    if (!queueStatus.isHealthy) {
      overallIssues.push('Queue system is unhealthy');
    }
    if (this.emergencyMode) {
      overallIssues.push(`Emergency mode active: ${this.emergencyModeReason}`);
    }

    const lastBalancing =
      this.loadBalancingHistory[this.loadBalancingHistory.length - 1];

    return {
      overall: {
        isHealthy:
          resourceStatus.isHealthy &&
          queueStatus.isHealthy &&
          !this.emergencyMode,
        issues: overallIssues,
      },
      resources: resourceStatus,
      queue: queueStatus,
      loadBalancing: {
        isActive: this.enableAutoBalancing,
        emergencyMode: this.emergencyMode,
        lastBalancingTime: lastBalancing?.timestamp,
      },
    };
  }

  /**
   * Start automatic load balancing
   */
  startAutoBalancing(): void {
    if (this.isAutoBalancingActive) {
      return; // Already running
    }

    this.isAutoBalancingActive = true;
    this.autoBalancingTimer = setInterval(async () => {
      await this.performLoadBalancing();
    }, this.balancingInterval);
  }

  /**
   * Stop automatic load balancing
   */
  stopAutoBalancing(): void {
    if (this.autoBalancingTimer) {
      clearInterval(this.autoBalancingTimer);
      this.autoBalancingTimer = undefined;
    }
    this.isAutoBalancingActive = false;
  }

  /**
   * Activate emergency mode
   */
  async activateEmergencyMode(reason: string): Promise<void> {
    this.emergencyMode = true;
    this.emergencyModeReason = reason;

    // Force minimum concurrency
    this.resourceManager.setCurrentConcurrency(1);

    // Update queue configuration for emergency mode
    this.batchQueueService.updateConfiguration({
      maxConcurrentWorkers: 1,
      retryAttempts: 1, // Reduce retries to prevent queue buildup
      retryDelay: 5000, // Increase retry delay
    });
  }

  /**
   * Deactivate emergency mode and restore normal operation
   */
  async deactivateEmergencyMode(): Promise<void> {
    this.emergencyMode = false;
    this.emergencyModeReason = null;

    // Reset concurrency to normal levels
    this.resourceManager.resetConcurrency();

    // Restore normal queue configuration
    const normalConfig = this.batchQueueService.getConfiguration();
    this.batchQueueService.updateConfiguration({
      maxConcurrentWorkers: normalConfig.maxConcurrentWorkers,
      retryAttempts: normalConfig.retryAttempts,
      retryDelay: normalConfig.retryDelay,
    });
  }

  /**
   * Update load balancer configuration
   */
  updateConfiguration(config: LoadBalancerConfiguration): void {
    if (config.balancingInterval !== undefined) {
      if (config.balancingInterval <= 0) {
        throw new Error('Balancing interval must be positive');
      }
      this.balancingInterval = config.balancingInterval;
    }

    if (config.enableAutoBalancing !== undefined) {
      this.enableAutoBalancing = config.enableAutoBalancing;
    }

    if (config.emergencyThresholds !== undefined) {
      this.validateEmergencyThresholds(config.emergencyThresholds);
      this.emergencyThresholds = {
        ...this.emergencyThresholds,
        ...config.emergencyThresholds,
      };
    }

    // Restart auto-balancing if it was active and interval changed
    if (this.isAutoBalancingActive && config.balancingInterval !== undefined) {
      this.stopAutoBalancing();
      this.startAutoBalancing();
    }
  }

  /**
   * Get load balancing history
   */
  getLoadBalancingHistory(): LoadBalancingResult[] {
    return [...this.loadBalancingHistory];
  }

  /**
   * Get current balancing interval
   */
  getBalancingInterval(): number {
    return this.balancingInterval;
  }

  /**
   * Check if auto-balancing is enabled
   */
  isAutoBalancingEnabled(): boolean {
    return this.enableAutoBalancing;
  }

  /**
   * Check if emergency mode is enabled
   */
  isEmergencyModeEnabled(): boolean {
    return this.emergencyMode;
  }

  /**
   * Get emergency mode reason
   */
  getEmergencyModeReason(): string | null {
    return this.emergencyModeReason;
  }

  /**
   * Clear load balancing history
   */
  clearHistory(): void {
    this.loadBalancingHistory = [];
  }

  /**
   * Check if emergency conditions are met
   */
  private checkEmergencyConditions(
    resourceStatus: ResourceStatus,
    queueStatus: QueueHealthStatus
  ): boolean {
    return (
      resourceStatus.memoryUsage.heapUsedPercentage >
        this.emergencyThresholds.memoryThreshold ||
      resourceStatus.cpuUsage > this.emergencyThresholds.cpuThreshold ||
      queueStatus.queueMetrics.waitingJobs >
        this.emergencyThresholds.queueSizeThreshold
    );
  }

  /**
   * Check if system should recover from emergency mode
   */
  private shouldRecoverFromEmergency(
    resourceStatus: ResourceStatus,
    queueStatus: QueueHealthStatus
  ): boolean {
    if (!this.emergencyMode) return false;

    // Require significantly better conditions for recovery (with buffer)
    const memoryRecoveryThreshold =
      this.emergencyThresholds.memoryThreshold * 0.8; // 20% buffer
    const cpuRecoveryThreshold = this.emergencyThresholds.cpuThreshold * 0.8;
    const queueRecoveryThreshold =
      this.emergencyThresholds.queueSizeThreshold * 0.5; // 50% reduction

    return (
      resourceStatus.memoryUsage.heapUsedPercentage < memoryRecoveryThreshold &&
      resourceStatus.cpuUsage < cpuRecoveryThreshold &&
      queueStatus.queueMetrics.waitingJobs < queueRecoveryThreshold
    );
  }

  /**
   * Get reason for adjustment based on status
   */
  private getAdjustmentReason(
    resourceStatus: ResourceStatus,
    queueStatus: QueueHealthStatus
  ): string {
    const reasons: string[] = [];

    if (
      resourceStatus.memoryUsage.heapUsedPercentage >
      resourceStatus.thresholds.memory
    ) {
      reasons.push('high memory usage');
    }
    if (resourceStatus.cpuUsage > resourceStatus.thresholds.cpu) {
      reasons.push('high CPU usage');
    }
    if (!queueStatus.isHealthy) {
      reasons.push('queue health issues');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'resource optimization';
  }

  /**
   * Add result to history with limit management
   */
  private addToHistory(result: LoadBalancingResult): void {
    this.loadBalancingHistory.push(result);

    if (this.loadBalancingHistory.length > this.historyLimit) {
      this.loadBalancingHistory = this.loadBalancingHistory.slice(
        -this.historyLimit
      );
    }
  }

  /**
   * Validate emergency thresholds
   */
  private validateEmergencyThresholds(thresholds: EmergencyThresholds): void {
    if (thresholds.memoryThreshold < 0 || thresholds.memoryThreshold > 1) {
      throw new Error('Emergency memory threshold must be between 0 and 1');
    }
    if (thresholds.cpuThreshold < 0 || thresholds.cpuThreshold > 1) {
      throw new Error('Emergency CPU threshold must be between 0 and 1');
    }
    if (thresholds.queueSizeThreshold < 0) {
      throw new Error('Emergency queue size threshold must be non-negative');
    }
  }

  /**
   * Validate configuration values
   */
  private validateConfiguration(): void {
    if (this.balancingInterval <= 0) {
      throw new Error('Balancing interval must be positive');
    }
    if (this.historyLimit <= 0) {
      throw new Error('History limit must be positive');
    }
    this.validateEmergencyThresholds(this.emergencyThresholds);
  }
}
