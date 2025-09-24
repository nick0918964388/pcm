import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { QueueHealthMonitor } from '../queue-health-monitor';
import { BatchQueueService } from '../batch-queue-service';

// Mock BatchQueueService
vi.mock('../batch-queue-service');

describe('QueueHealthMonitor', () => {
  let queueHealthMonitor: QueueHealthMonitor;
  let mockBatchQueueService: vi.Mocked<BatchQueueService>;

  beforeEach(() => {
    // Create mock instance
    mockBatchQueueService = {
      getQueueHealth: vi.fn(),
      adjustConcurrency: vi.fn(),
      getConfiguration: vi.fn(),
      updateConfiguration: vi.fn(),
      retryFailedJob: vi.fn(),
      cleanupOldJobs: vi.fn(),
    } as any;

    queueHealthMonitor = new QueueHealthMonitor(mockBatchQueueService);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(queueHealthMonitor.getCheckInterval()).toBe(30000); // 30 seconds default
      expect(queueHealthMonitor.getMaxFailedJobs()).toBe(50);
      expect(queueHealthMonitor.getMaxWaitingJobs()).toBe(100);
    });

    it('should allow custom configuration', () => {
      const customMonitor = new QueueHealthMonitor(mockBatchQueueService, {
        checkInterval: 60000,
        maxFailedJobs: 25,
        maxWaitingJobs: 200,
      });

      expect(customMonitor.getCheckInterval()).toBe(60000);
      expect(customMonitor.getMaxFailedJobs()).toBe(25);
      expect(customMonitor.getMaxWaitingJobs()).toBe(200);
    });
  });

  describe('checkQueueHealth', () => {
    it('should return healthy status when all metrics are within limits', async () => {
      mockBatchQueueService.getQueueHealth.mockResolvedValue({
        waitingJobs: 10,
        activeJobs: 5,
        failedJobs: 2,
        isHealthy: true,
        connectionStatus: 'connected',
      });

      const health = await queueHealthMonitor.checkQueueHealth();

      expect(health.isHealthy).toBe(true);
      expect(health.issues).toHaveLength(0);
      expect(health.queueMetrics).toMatchObject({
        waitingJobs: 10,
        activeJobs: 5,
        failedJobs: 2,
      });
    });

    it('should identify unhealthy state when failed jobs exceed limit', async () => {
      mockBatchQueueService.getQueueHealth.mockResolvedValue({
        waitingJobs: 10,
        activeJobs: 5,
        failedJobs: 60, // Exceeds default limit of 50
        isHealthy: false,
        connectionStatus: 'connected',
      });

      const health = await queueHealthMonitor.checkQueueHealth();

      expect(health.isHealthy).toBe(false);
      expect(health.issues).toContain('Too many failed jobs: 60 (limit: 50)');
    });

    it('should identify unhealthy state when waiting jobs exceed limit', async () => {
      mockBatchQueueService.getQueueHealth.mockResolvedValue({
        waitingJobs: 150, // Exceeds default limit of 100
        activeJobs: 5,
        failedJobs: 10,
        isHealthy: true,
        connectionStatus: 'connected',
      });

      const health = await queueHealthMonitor.checkQueueHealth();

      expect(health.isHealthy).toBe(false);
      expect(health.issues).toContain(
        'Too many waiting jobs: 150 (limit: 100)'
      );
    });

    it('should identify disconnected queue as unhealthy', async () => {
      mockBatchQueueService.getQueueHealth.mockResolvedValue({
        waitingJobs: 0,
        activeJobs: 0,
        failedJobs: 0,
        isHealthy: false,
        connectionStatus: 'disconnected',
        error: 'Redis connection failed',
      });

      const health = await queueHealthMonitor.checkQueueHealth();

      expect(health.isHealthy).toBe(false);
      expect(health.issues).toContain(
        'Queue connection is disconnected: Redis connection failed'
      );
    });

    it('should handle queue service errors gracefully', async () => {
      mockBatchQueueService.getQueueHealth.mockRejectedValue(
        new Error('Service unavailable')
      );

      const health = await queueHealthMonitor.checkQueueHealth();

      expect(health.isHealthy).toBe(false);
      expect(health.issues).toContain(
        'Queue health check failed: Service unavailable'
      );
    });
  });

  describe('calculateProcessingRate', () => {
    it('should calculate processing rate based on historical data', async () => {
      vi.useFakeTimers();

      try {
        // First check - establish baseline
        mockBatchQueueService.getQueueHealth.mockResolvedValueOnce({
          waitingJobs: 100,
          activeJobs: 5,
          failedJobs: 10,
          isHealthy: true,
          connectionStatus: 'connected',
        });

        await queueHealthMonitor.checkQueueHealth();

        // Advance time to simulate time passage
        vi.advanceTimersByTime(5000); // 5 seconds

        // Second check - simulate progress
        mockBatchQueueService.getQueueHealth.mockResolvedValueOnce({
          waitingJobs: 80, // 20 jobs processed
          activeJobs: 5,
          failedJobs: 12, // 2 more failed
          isHealthy: true,
          connectionStatus: 'connected',
        });

        await queueHealthMonitor.checkQueueHealth();

        const rate = await queueHealthMonitor.calculateProcessingRate();

        // Should have processed 18 jobs successfully (20 total - 2 failed)
        expect(rate.jobsPerSecond).toBeGreaterThan(0);
        expect(rate.estimatedTimeToEmpty).toBeGreaterThan(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it('should return zero rate when no historical data exists', async () => {
      const rate = await queueHealthMonitor.calculateProcessingRate();

      expect(rate.jobsPerSecond).toBe(0);
      expect(rate.estimatedTimeToEmpty).toBe(Infinity);
    });

    it('should handle cases where queue size increased', async () => {
      // First check
      mockBatchQueueService.getQueueHealth.mockResolvedValueOnce({
        waitingJobs: 50,
        activeJobs: 5,
        failedJobs: 10,
        isHealthy: true,
        connectionStatus: 'connected',
      });

      await queueHealthMonitor.checkQueueHealth();

      // Second check - more jobs added
      mockBatchQueueService.getQueueHealth.mockResolvedValueOnce({
        waitingJobs: 80, // Queue grew
        activeJobs: 5,
        failedJobs: 10,
        isHealthy: true,
        connectionStatus: 'connected',
      });

      const rate = await queueHealthMonitor.calculateProcessingRate();

      // When queue grows, processing rate should be 0 or negative
      expect(rate.jobsPerSecond).toBeLessThanOrEqual(0);
    });
  });

  describe('estimateWaitTime', () => {
    it('should estimate wait time based on current queue size and processing rate', async () => {
      vi.useFakeTimers();

      try {
        // Set up processing rate by doing two health checks
        mockBatchQueueService.getQueueHealth
          .mockResolvedValueOnce({
            waitingJobs: 100,
            activeJobs: 5,
            failedJobs: 10,
            isHealthy: true,
            connectionStatus: 'connected',
          })
          .mockResolvedValueOnce({
            waitingJobs: 80,
            activeJobs: 5,
            failedJobs: 10,
            isHealthy: true,
            connectionStatus: 'connected',
          })
          .mockResolvedValueOnce({
            waitingJobs: 80,
            activeJobs: 5,
            failedJobs: 10,
            isHealthy: true,
            connectionStatus: 'connected',
          });

        await queueHealthMonitor.checkQueueHealth();
        vi.advanceTimersByTime(10000); // 10 seconds
        await queueHealthMonitor.checkQueueHealth();

        const waitTime = await queueHealthMonitor.estimateWaitTime();

        expect(waitTime.totalWaitTimeSeconds).toBeGreaterThan(0);
        expect(waitTime.averageWaitTimePerJob).toBeGreaterThan(0);
        expect(waitTime.confidence).toBe('low'); // Should have low confidence with 2 data points
      } finally {
        vi.useRealTimers();
      }
    });

    it('should return infinite wait time when processing rate is zero', async () => {
      mockBatchQueueService.getQueueHealth.mockResolvedValue({
        waitingJobs: 50,
        activeJobs: 0,
        failedJobs: 0,
        isHealthy: true,
        connectionStatus: 'connected',
      });

      const waitTime = await queueHealthMonitor.estimateWaitTime();

      expect(waitTime.totalWaitTimeSeconds).toBe(Infinity);
      expect(waitTime.confidence).toBe('low');
    });
  });

  describe('getHealthHistory', () => {
    it('should maintain health check history', async () => {
      mockBatchQueueService.getQueueHealth.mockResolvedValue({
        waitingJobs: 10,
        activeJobs: 5,
        failedJobs: 2,
        isHealthy: true,
        connectionStatus: 'connected',
      });

      // Perform multiple health checks
      await queueHealthMonitor.checkQueueHealth();
      await queueHealthMonitor.checkQueueHealth();
      await queueHealthMonitor.checkQueueHealth();

      const history = queueHealthMonitor.getHealthHistory();

      expect(history).toHaveLength(3);
      expect(history[0]).toMatchObject({
        timestamp: expect.any(Date),
        isHealthy: true,
        queueMetrics: expect.objectContaining({
          waitingJobs: 10,
          activeJobs: 5,
          failedJobs: 2,
        }),
      });
    });

    it('should limit history to maximum entries', async () => {
      mockBatchQueueService.getQueueHealth.mockResolvedValue({
        waitingJobs: 10,
        activeJobs: 5,
        failedJobs: 2,
        isHealthy: true,
        connectionStatus: 'connected',
      });

      // Perform more checks than the limit (assuming limit is 100)
      for (let i = 0; i < 105; i++) {
        await queueHealthMonitor.checkQueueHealth();
      }

      const history = queueHealthMonitor.getHealthHistory();

      expect(history.length).toBeLessThanOrEqual(100); // Should be limited
    });
  });

  describe('startMonitoring and stopMonitoring', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should start periodic health monitoring', async () => {
      mockBatchQueueService.getQueueHealth.mockResolvedValue({
        waitingJobs: 10,
        activeJobs: 5,
        failedJobs: 2,
        isHealthy: true,
        connectionStatus: 'connected',
      });

      queueHealthMonitor.startMonitoring();

      // Should not call immediately
      expect(mockBatchQueueService.getQueueHealth).not.toHaveBeenCalled();

      // Advance timer by check interval
      vi.advanceTimersByTime(30000);
      await vi.runOnlyPendingTimersAsync();

      // Should have been called by the interval
      expect(mockBatchQueueService.getQueueHealth).toHaveBeenCalled();
      const firstCallCount =
        mockBatchQueueService.getQueueHealth.mock.calls.length;

      // Advance timer again
      vi.advanceTimersByTime(30000);
      await vi.runOnlyPendingTimersAsync();

      // Should have been called again
      expect(
        mockBatchQueueService.getQueueHealth.mock.calls.length
      ).toBeGreaterThan(firstCallCount);

      queueHealthMonitor.stopMonitoring();
    });

    it('should stop periodic monitoring', async () => {
      mockBatchQueueService.getQueueHealth.mockResolvedValue({
        waitingJobs: 10,
        activeJobs: 5,
        failedJobs: 2,
        isHealthy: true,
        connectionStatus: 'connected',
      });

      queueHealthMonitor.startMonitoring();
      queueHealthMonitor.stopMonitoring();

      // Advance timer
      vi.advanceTimersByTime(30000);
      await vi.runOnlyPendingTimersAsync();

      // Should not have been called after stopping
      expect(mockBatchQueueService.getQueueHealth).not.toHaveBeenCalled();
    });

    it('should not start monitoring if already running', () => {
      queueHealthMonitor.startMonitoring();
      const isRunning1 = queueHealthMonitor.isMonitoring();

      queueHealthMonitor.startMonitoring(); // Try to start again
      const isRunning2 = queueHealthMonitor.isMonitoring();

      expect(isRunning1).toBe(true);
      expect(isRunning2).toBe(true);

      queueHealthMonitor.stopMonitoring();
    });
  });

  describe('configuration methods', () => {
    it('should allow updating monitoring configuration', () => {
      queueHealthMonitor.updateConfiguration({
        maxFailedJobs: 75,
        maxWaitingJobs: 150,
      });

      expect(queueHealthMonitor.getMaxFailedJobs()).toBe(75);
      expect(queueHealthMonitor.getMaxWaitingJobs()).toBe(150);
    });

    it('should validate configuration values', () => {
      expect(() => {
        queueHealthMonitor.updateConfiguration({
          checkInterval: -1000,
        });
      }).toThrow('Check interval must be positive');

      expect(() => {
        queueHealthMonitor.updateConfiguration({
          maxFailedJobs: -5,
        });
      }).toThrow('Max failed jobs must be non-negative');
    });
  });
});
