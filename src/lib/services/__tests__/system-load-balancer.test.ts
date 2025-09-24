import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SystemLoadBalancer } from '../system-load-balancer';
import { ResourceManager } from '../resource-manager';
import { QueueHealthMonitor } from '../queue-health-monitor';
import { BatchQueueService } from '../batch-queue-service';

// Mock dependencies
vi.mock('../resource-manager');
vi.mock('../queue-health-monitor');
vi.mock('../batch-queue-service');

describe('SystemLoadBalancer', () => {
  let systemLoadBalancer: SystemLoadBalancer;
  let mockResourceManager: vi.Mocked<ResourceManager>;
  let mockQueueHealthMonitor: vi.Mocked<QueueHealthMonitor>;
  let mockBatchQueueService: vi.Mocked<BatchQueueService>;

  beforeEach(() => {
    // Create mock instances
    mockResourceManager = {
      getCurrentMemoryUsage: vi.fn(),
      getCpuUsage: vi.fn(),
      adjustConcurrency: vi.fn(),
      getResourceStatus: vi.fn(),
      getCurrentConcurrency: vi.fn(),
      getMaxConcurrency: vi.fn(),
      setThresholds: vi.fn(),
      setCurrentConcurrency: vi.fn(),
      resetConcurrency: vi.fn(),
    } as any;

    mockQueueHealthMonitor = {
      checkQueueHealth: vi.fn(),
      calculateProcessingRate: vi.fn(),
      estimateWaitTime: vi.fn(),
      getHealthHistory: vi.fn(),
      startMonitoring: vi.fn(),
      stopMonitoring: vi.fn(),
      isMonitoring: vi.fn(),
    } as any;

    mockBatchQueueService = {
      getQueueHealth: vi.fn(),
      adjustConcurrency: vi.fn(),
      updateConfiguration: vi.fn(),
      getConfiguration: vi.fn().mockReturnValue({
        maxConcurrentWorkers: 4,
        retryAttempts: 3,
        retryDelay: 2000,
      }),
    } as any;

    systemLoadBalancer = new SystemLoadBalancer(
      mockResourceManager,
      mockQueueHealthMonitor,
      mockBatchQueueService
    );

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(systemLoadBalancer.getBalancingInterval()).toBe(15000); // 15 seconds default
      expect(systemLoadBalancer.isAutoBalancingEnabled()).toBe(true);
      expect(systemLoadBalancer.isEmergencyModeEnabled()).toBe(false);
    });

    it('should allow custom configuration', () => {
      const customBalancer = new SystemLoadBalancer(
        mockResourceManager,
        mockQueueHealthMonitor,
        mockBatchQueueService,
        {
          balancingInterval: 30000,
          enableAutoBalancing: false,
          emergencyThresholds: {
            memoryThreshold: 0.95,
            cpuThreshold: 0.98,
            queueSizeThreshold: 1000,
          },
        }
      );

      expect(customBalancer.getBalancingInterval()).toBe(30000);
      expect(customBalancer.isAutoBalancingEnabled()).toBe(false);
    });
  });

  describe('performLoadBalancing', () => {
    it('should adjust concurrency based on resource status', async () => {
      mockResourceManager.getResourceStatus.mockResolvedValue({
        memoryUsage: { heapUsedPercentage: 0.9 } as any,
        cpuUsage: 0.8,
        concurrency: { current: 4, maximum: 4 },
        thresholds: { memory: 0.85, cpu: 0.9 },
        isHealthy: false,
        recommendations: [
          'Consider reducing memory usage - above 85% threshold',
        ],
      });

      mockQueueHealthMonitor.checkQueueHealth.mockResolvedValue({
        isHealthy: true,
        queueMetrics: {
          waitingJobs: 10,
          activeJobs: 3,
          failedJobs: 2,
          isHealthy: true,
          connectionStatus: 'connected',
        },
        issues: [],
        timestamp: new Date(),
      });

      mockResourceManager.adjustConcurrency.mockResolvedValue(3); // Reduced concurrency

      const result = await systemLoadBalancer.performLoadBalancing();

      expect(result.success).toBe(true);
      expect(result.adjustments).toContain(
        'Reduced concurrency from 4 to 3 due to high memory usage'
      );
      expect(mockResourceManager.adjustConcurrency).toHaveBeenCalled();
    });

    it('should trigger emergency mode when thresholds exceeded', async () => {
      mockResourceManager.getResourceStatus.mockResolvedValue({
        memoryUsage: { heapUsedPercentage: 0.98 } as any, // Very high memory
        cpuUsage: 0.95, // Very high CPU
        concurrency: { current: 4, maximum: 4 },
        thresholds: { memory: 0.85, cpu: 0.9 },
        isHealthy: false,
        recommendations: ['System under severe stress'],
      });

      mockQueueHealthMonitor.checkQueueHealth.mockResolvedValue({
        isHealthy: false,
        queueMetrics: {
          waitingJobs: 500, // Large queue
          activeJobs: 4,
          failedJobs: 50,
          isHealthy: false,
          connectionStatus: 'connected',
        },
        issues: ['Too many waiting jobs'],
        timestamp: new Date(),
      });

      mockResourceManager.adjustConcurrency.mockResolvedValue(1); // Emergency reduction

      const result = await systemLoadBalancer.performLoadBalancing();

      expect(result.success).toBe(true);
      expect(result.emergencyMode).toBe(true);
      expect(result.adjustments).toContain(
        'EMERGENCY: System under severe stress - reduced to minimum concurrency'
      );
    });

    it('should handle resource manager errors gracefully', async () => {
      mockResourceManager.getResourceStatus.mockRejectedValue(
        new Error('Resource check failed')
      );

      const result = await systemLoadBalancer.performLoadBalancing();

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'Load balancing failed: Resource check failed'
      );
    });

    it('should skip adjustment when system is healthy', async () => {
      mockResourceManager.getResourceStatus.mockResolvedValue({
        memoryUsage: { heapUsedPercentage: 0.5 } as any,
        cpuUsage: 0.3,
        concurrency: { current: 4, maximum: 4 },
        thresholds: { memory: 0.85, cpu: 0.9 },
        isHealthy: true,
        recommendations: [],
      });

      mockQueueHealthMonitor.checkQueueHealth.mockResolvedValue({
        isHealthy: true,
        queueMetrics: {
          waitingJobs: 5,
          activeJobs: 2,
          failedJobs: 1,
          isHealthy: true,
          connectionStatus: 'connected',
        },
        issues: [],
        timestamp: new Date(),
      });

      const result = await systemLoadBalancer.performLoadBalancing();

      expect(result.success).toBe(true);
      expect(result.adjustments).toContain(
        'System is healthy - no adjustments needed'
      );
      expect(mockResourceManager.adjustConcurrency).not.toHaveBeenCalled();
    });
  });

  describe('getSystemHealth', () => {
    it('should return comprehensive system health status', async () => {
      const mockResourceStatus = {
        memoryUsage: { heapUsedPercentage: 0.7 } as any,
        cpuUsage: 0.6,
        concurrency: { current: 3, maximum: 4 },
        thresholds: { memory: 0.85, cpu: 0.9 },
        isHealthy: true,
        recommendations: [],
      };

      const mockQueueHealth = {
        isHealthy: true,
        queueMetrics: {
          waitingJobs: 8,
          activeJobs: 3,
          failedJobs: 2,
          isHealthy: true,
          connectionStatus: 'connected' as const,
        },
        issues: [],
        timestamp: new Date(),
      };

      mockResourceManager.getResourceStatus.mockResolvedValue(
        mockResourceStatus
      );
      mockQueueHealthMonitor.checkQueueHealth.mockResolvedValue(
        mockQueueHealth
      );

      const health = await systemLoadBalancer.getSystemHealth();

      expect(health.overall.isHealthy).toBe(true);
      expect(health.resources).toBe(mockResourceStatus);
      expect(health.queue).toBe(mockQueueHealth);
      expect(health.loadBalancing.isActive).toBe(true);
      expect(health.loadBalancing.emergencyMode).toBe(false);
    });

    it('should detect unhealthy overall status when components are unhealthy', async () => {
      mockResourceManager.getResourceStatus.mockResolvedValue({
        memoryUsage: { heapUsedPercentage: 0.9 } as any,
        cpuUsage: 0.95,
        concurrency: { current: 1, maximum: 4 },
        thresholds: { memory: 0.85, cpu: 0.9 },
        isHealthy: false,
        recommendations: ['High resource usage'],
      });

      mockQueueHealthMonitor.checkQueueHealth.mockResolvedValue({
        isHealthy: false,
        queueMetrics: {
          waitingJobs: 200,
          activeJobs: 1,
          failedJobs: 60,
          isHealthy: false,
          connectionStatus: 'connected',
        },
        issues: ['Too many failed jobs'],
        timestamp: new Date(),
      });

      const health = await systemLoadBalancer.getSystemHealth();

      expect(health.overall.isHealthy).toBe(false);
      expect(health.overall.issues).toContain('Resource system is unhealthy');
      expect(health.overall.issues).toContain('Queue system is unhealthy');
    });
  });

  describe('auto-balancing lifecycle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should start auto-balancing when enabled', async () => {
      mockResourceManager.getResourceStatus.mockResolvedValue({
        memoryUsage: { heapUsedPercentage: 0.5 } as any,
        cpuUsage: 0.3,
        concurrency: { current: 4, maximum: 4 },
        thresholds: { memory: 0.85, cpu: 0.9 },
        isHealthy: true,
        recommendations: [],
      });

      mockQueueHealthMonitor.checkQueueHealth.mockResolvedValue({
        isHealthy: true,
        queueMetrics: {
          waitingJobs: 5,
          activeJobs: 2,
          failedJobs: 1,
          isHealthy: true,
          connectionStatus: 'connected',
        },
        issues: [],
        timestamp: new Date(),
      });

      systemLoadBalancer.startAutoBalancing();

      // Advance timer by balancing interval
      vi.advanceTimersByTime(15000);
      await vi.runOnlyPendingTimersAsync();

      expect(mockResourceManager.getResourceStatus).toHaveBeenCalled();
      expect(mockQueueHealthMonitor.checkQueueHealth).toHaveBeenCalled();

      systemLoadBalancer.stopAutoBalancing();
    });

    it('should stop auto-balancing when disabled', async () => {
      systemLoadBalancer.startAutoBalancing();
      systemLoadBalancer.stopAutoBalancing();

      vi.advanceTimersByTime(15000);
      await vi.runOnlyPendingTimersAsync();

      expect(mockResourceManager.getResourceStatus).not.toHaveBeenCalled();
    });

    it('should not start if already running', () => {
      systemLoadBalancer.startAutoBalancing();
      const isActive1 = systemLoadBalancer.isAutoBalancingEnabled();

      systemLoadBalancer.startAutoBalancing(); // Try to start again
      const isActive2 = systemLoadBalancer.isAutoBalancingEnabled();

      expect(isActive1).toBe(true);
      expect(isActive2).toBe(true);

      systemLoadBalancer.stopAutoBalancing();
    });
  });

  describe('emergency mode management', () => {
    it('should activate emergency mode when severe conditions detected', async () => {
      await systemLoadBalancer.activateEmergencyMode(
        'Critical memory usage detected'
      );

      expect(systemLoadBalancer.isEmergencyModeEnabled()).toBe(true);
      expect(systemLoadBalancer.getEmergencyModeReason()).toBe(
        'Critical memory usage detected'
      );
    });

    it('should deactivate emergency mode and restore normal operation', async () => {
      await systemLoadBalancer.activateEmergencyMode('Test emergency');
      await systemLoadBalancer.deactivateEmergencyMode();

      expect(systemLoadBalancer.isEmergencyModeEnabled()).toBe(false);
      expect(systemLoadBalancer.getEmergencyModeReason()).toBeNull();
    });

    it('should automatically check for emergency recovery conditions', async () => {
      // Activate emergency mode
      await systemLoadBalancer.activateEmergencyMode('High resource usage');

      // Set up recovery conditions (low resource usage - must be below recovery thresholds)
      // Emergency threshold is 95% memory, recovery threshold is 95% * 0.8 = 76%
      // Emergency threshold is 500 waiting jobs, recovery threshold is 500 * 0.5 = 250
      mockResourceManager.getResourceStatus.mockResolvedValue({
        memoryUsage: { heapUsedPercentage: 0.75 } as any, // Below 76% recovery threshold
        cpuUsage: 0.75, // Below 78.4% recovery threshold (98% * 0.8)
        concurrency: { current: 1, maximum: 4 },
        thresholds: { memory: 0.85, cpu: 0.9 },
        isHealthy: true,
        recommendations: [],
      });

      mockQueueHealthMonitor.checkQueueHealth.mockResolvedValue({
        isHealthy: true,
        queueMetrics: {
          waitingJobs: 10, // Well below 250 recovery threshold
          activeJobs: 1,
          failedJobs: 2,
          isHealthy: true,
          connectionStatus: 'connected',
        },
        issues: [],
        timestamp: new Date(),
      });

      // Trigger auto-recovery check
      const result = await systemLoadBalancer.performLoadBalancing();

      expect(result.success).toBe(true);
      expect(systemLoadBalancer.isEmergencyModeEnabled()).toBe(false); // Should auto-recover
    });
  });

  describe('configuration management', () => {
    it('should update balancing configuration', () => {
      systemLoadBalancer.updateConfiguration({
        balancingInterval: 20000,
        enableAutoBalancing: false,
      });

      expect(systemLoadBalancer.getBalancingInterval()).toBe(20000);
      expect(systemLoadBalancer.isAutoBalancingEnabled()).toBe(false);
    });

    it('should validate configuration values', () => {
      expect(() => {
        systemLoadBalancer.updateConfiguration({
          balancingInterval: -5000,
        });
      }).toThrow('Balancing interval must be positive');

      expect(() => {
        systemLoadBalancer.updateConfiguration({
          emergencyThresholds: {
            memoryThreshold: 1.5,
            cpuThreshold: 0.9,
            queueSizeThreshold: 100,
          },
        });
      }).toThrow('Emergency memory threshold must be between 0 and 1');
    });

    it('should restart auto-balancing with new interval when configuration updated', () => {
      const spy = vi.spyOn(systemLoadBalancer, 'stopAutoBalancing');
      const spy2 = vi.spyOn(systemLoadBalancer, 'startAutoBalancing');

      systemLoadBalancer.startAutoBalancing();
      systemLoadBalancer.updateConfiguration({ balancingInterval: 25000 });

      expect(spy).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
      expect(systemLoadBalancer.getBalancingInterval()).toBe(25000);
    });
  });

  describe('getLoadBalancingHistory', () => {
    it('should maintain load balancing history', async () => {
      mockResourceManager.getResourceStatus.mockResolvedValue({
        memoryUsage: { heapUsedPercentage: 0.5 } as any,
        cpuUsage: 0.3,
        concurrency: { current: 4, maximum: 4 },
        thresholds: { memory: 0.85, cpu: 0.9 },
        isHealthy: true,
        recommendations: [],
      });

      mockQueueHealthMonitor.checkQueueHealth.mockResolvedValue({
        isHealthy: true,
        queueMetrics: {
          waitingJobs: 5,
          activeJobs: 2,
          failedJobs: 1,
          isHealthy: true,
          connectionStatus: 'connected',
        },
        issues: [],
        timestamp: new Date(),
      });

      // Perform multiple load balancing operations
      await systemLoadBalancer.performLoadBalancing();
      await systemLoadBalancer.performLoadBalancing();
      await systemLoadBalancer.performLoadBalancing();

      const history = systemLoadBalancer.getLoadBalancingHistory();

      expect(history).toHaveLength(3);
      expect(history[0]).toMatchObject({
        timestamp: expect.any(Date),
        success: true,
        adjustments: expect.any(Array),
      });
    });

    it('should limit history entries', async () => {
      mockResourceManager.getResourceStatus.mockResolvedValue({
        memoryUsage: { heapUsedPercentage: 0.5 } as any,
        cpuUsage: 0.3,
        concurrency: { current: 4, maximum: 4 },
        thresholds: { memory: 0.85, cpu: 0.9 },
        isHealthy: true,
        recommendations: [],
      });

      mockQueueHealthMonitor.checkQueueHealth.mockResolvedValue({
        isHealthy: true,
        queueMetrics: {
          waitingJobs: 5,
          activeJobs: 2,
          failedJobs: 1,
          isHealthy: true,
          connectionStatus: 'connected',
        },
        issues: [],
        timestamp: new Date(),
      });

      // Perform more operations than the limit (assuming limit is 50)
      for (let i = 0; i < 55; i++) {
        await systemLoadBalancer.performLoadBalancing();
      }

      const history = systemLoadBalancer.getLoadBalancingHistory();

      expect(history.length).toBeLessThanOrEqual(50); // Should be limited
    });
  });
});
