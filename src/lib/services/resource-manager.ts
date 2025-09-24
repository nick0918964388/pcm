import * as os from 'os';

export interface ResourceManagerOptions {
  memoryThreshold?: number;
  cpuThreshold?: number;
  maxConcurrency?: number;
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  heapUsedPercentage: number;
  rss: number;
  external: number;
  arrayBuffers: number;
}

export interface ConcurrencyInfo {
  current: number;
  maximum: number;
}

export interface ResourceThresholds {
  memory: number;
  cpu: number;
}

export interface ResourceStatus {
  memoryUsage: MemoryUsage;
  cpuUsage: number;
  concurrency: ConcurrencyInfo;
  thresholds: ResourceThresholds;
  isHealthy: boolean;
  recommendations: string[];
}

export interface ThresholdUpdate {
  memoryThreshold?: number;
  cpuThreshold?: number;
}

export class ResourceManager {
  private memoryThreshold: number;
  private cpuThreshold: number;
  private maxConcurrency: number;
  private currentConcurrency: number;

  constructor(options: ResourceManagerOptions = {}) {
    this.memoryThreshold = options.memoryThreshold ?? 0.85; // 85% default
    this.cpuThreshold = options.cpuThreshold ?? 0.9; // 90% default
    this.maxConcurrency = options.maxConcurrency ?? 4; // 4 workers default
    this.currentConcurrency = this.maxConcurrency;

    this.validateThresholds();
  }

  /**
   * Get current memory usage information
   */
  async getCurrentMemoryUsage(): Promise<MemoryUsage> {
    const memUsage = process.memoryUsage();
    const heapUsedPercentage =
      memUsage.heapTotal > 0 ? memUsage.heapUsed / memUsage.heapTotal : 1; // Default to 100% if heap total is 0

    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      heapUsedPercentage,
      rss: memUsage.rss,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
    };
  }

  /**
   * Get current CPU usage based on load average
   */
  async getCpuUsage(): Promise<number> {
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;

    // Use 1-minute load average divided by CPU count
    const cpuUsage = loadAvg[0] / cpuCount;

    // Cap at 100%
    return Math.min(cpuUsage, 1.0);
  }

  /**
   * Dynamically adjust concurrency based on system load
   */
  async adjustConcurrency(): Promise<number> {
    const memoryUsage = await this.getCurrentMemoryUsage();
    const cpuUsage = await this.getCpuUsage();

    let newConcurrency = this.currentConcurrency;

    // Reduce concurrency if memory threshold exceeded
    if (memoryUsage.heapUsedPercentage > this.memoryThreshold) {
      newConcurrency = Math.max(1, this.currentConcurrency - 1);
    }
    // Reduce concurrency if CPU threshold exceeded
    else if (cpuUsage > this.cpuThreshold) {
      newConcurrency = Math.max(1, this.currentConcurrency - 1);
    }
    // Increase concurrency if resources are available and we're below max
    else if (
      memoryUsage.heapUsedPercentage < this.memoryThreshold * 0.8 && // 20% buffer below threshold
      cpuUsage < this.cpuThreshold * 0.8 &&
      this.currentConcurrency < this.maxConcurrency
    ) {
      newConcurrency = Math.min(
        this.maxConcurrency,
        this.currentConcurrency + 1
      );
    }

    this.currentConcurrency = newConcurrency;
    return newConcurrency;
  }

  /**
   * Get comprehensive resource status
   */
  async getResourceStatus(): Promise<ResourceStatus> {
    const memoryUsage = await this.getCurrentMemoryUsage();
    const cpuUsage = await this.getCpuUsage();

    const isMemoryHealthy =
      memoryUsage.heapUsedPercentage <= this.memoryThreshold;
    const isCpuHealthy = cpuUsage <= this.cpuThreshold;
    const isHealthy = isMemoryHealthy && isCpuHealthy;

    const recommendations: string[] = [];

    if (!isMemoryHealthy) {
      recommendations.push(
        `Consider reducing memory usage - above ${Math.round(this.memoryThreshold * 100)}% threshold`
      );
    }

    if (!isCpuHealthy) {
      recommendations.push(
        `Consider reducing CPU intensive operations - above ${Math.round(this.cpuThreshold * 100)}% threshold`
      );
    }

    if (isHealthy && this.currentConcurrency < this.maxConcurrency) {
      recommendations.push(
        'System resources available - can increase concurrency'
      );
    }

    return {
      memoryUsage,
      cpuUsage,
      concurrency: {
        current: this.currentConcurrency,
        maximum: this.maxConcurrency,
      },
      thresholds: {
        memory: this.memoryThreshold,
        cpu: this.cpuThreshold,
      },
      isHealthy,
      recommendations,
    };
  }

  /**
   * Update resource thresholds
   */
  setThresholds(thresholds: ThresholdUpdate): void {
    if (thresholds.memoryThreshold !== undefined) {
      if (thresholds.memoryThreshold < 0 || thresholds.memoryThreshold > 1) {
        throw new Error('Memory threshold must be between 0 and 1');
      }
      this.memoryThreshold = thresholds.memoryThreshold;
    }

    if (thresholds.cpuThreshold !== undefined) {
      if (thresholds.cpuThreshold < 0 || thresholds.cpuThreshold > 1) {
        throw new Error('CPU threshold must be between 0 and 1');
      }
      this.cpuThreshold = thresholds.cpuThreshold;
    }
  }

  /**
   * Reset concurrency to maximum value
   */
  resetConcurrency(): void {
    this.currentConcurrency = this.maxConcurrency;
  }

  /**
   * Set current concurrency level
   */
  setCurrentConcurrency(concurrency: number): void {
    if (concurrency < 1) {
      throw new Error('Concurrency must be at least 1');
    }
    if (concurrency > this.maxConcurrency) {
      throw new Error(
        `Concurrency cannot exceed maximum of ${this.maxConcurrency}`
      );
    }
    this.currentConcurrency = concurrency;
  }

  /**
   * Get current memory threshold
   */
  getMemoryThreshold(): number {
    return this.memoryThreshold;
  }

  /**
   * Get current CPU threshold
   */
  getCpuThreshold(): number {
    return this.cpuThreshold;
  }

  /**
   * Get current concurrency level
   */
  getCurrentConcurrency(): number {
    return this.currentConcurrency;
  }

  /**
   * Get maximum concurrency level
   */
  getMaxConcurrency(): number {
    return this.maxConcurrency;
  }

  /**
   * Validate threshold values
   */
  private validateThresholds(): void {
    if (this.memoryThreshold < 0 || this.memoryThreshold > 1) {
      throw new Error('Memory threshold must be between 0 and 1');
    }
    if (this.cpuThreshold < 0 || this.cpuThreshold > 1) {
      throw new Error('CPU threshold must be between 0 and 1');
    }
    if (this.maxConcurrency < 1) {
      throw new Error('Maximum concurrency must be at least 1');
    }
  }
}
