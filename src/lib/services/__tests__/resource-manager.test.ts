import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ResourceManager } from '../resource-manager';

// Mock process.memoryUsage and process.cpuUsage for testing
const mockMemoryUsage = vi.fn();
const mockCpuUsage = vi.fn();

Object.defineProperty(process, 'memoryUsage', {
  value: mockMemoryUsage,
  writable: true,
});

// Mock CPU usage - we'll simulate this since it's not directly available
vi.mock('os', () => ({
  cpus: vi.fn(() => [1, 2, 3, 4]), // Mock 4 CPU cores
  loadavg: vi.fn(() => [0.5, 0.6, 0.7]), // Mock load average
}));

describe('ResourceManager', () => {
  let resourceManager: ResourceManager;

  beforeEach(() => {
    resourceManager = new ResourceManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default thresholds', () => {
      expect(resourceManager.getMemoryThreshold()).toBe(0.85);
      expect(resourceManager.getCpuThreshold()).toBe(0.9);
      expect(resourceManager.getCurrentConcurrency()).toBe(4); // default max concurrency
    });

    it('should allow custom thresholds in constructor', () => {
      const customManager = new ResourceManager({
        memoryThreshold: 0.75,
        cpuThreshold: 0.8,
        maxConcurrency: 6,
      });

      expect(customManager.getMemoryThreshold()).toBe(0.75);
      expect(customManager.getCpuThreshold()).toBe(0.8);
      expect(customManager.getCurrentConcurrency()).toBe(6);
    });
  });

  describe('getCurrentMemoryUsage', () => {
    it('should return current memory usage percentage', async () => {
      mockMemoryUsage.mockReturnValue({
        heapUsed: 85 * 1024 * 1024, // 85MB
        heapTotal: 100 * 1024 * 1024, // 100MB
        external: 0,
        arrayBuffers: 0,
        rss: 120 * 1024 * 1024,
      });

      const usage = await resourceManager.getCurrentMemoryUsage();
      expect(usage.heapUsedPercentage).toBe(0.85);
      expect(usage.heapUsed).toBe(85 * 1024 * 1024);
      expect(usage.heapTotal).toBe(100 * 1024 * 1024);
    });

    it('should handle division by zero for heap total', async () => {
      mockMemoryUsage.mockReturnValue({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 0,
        external: 0,
        arrayBuffers: 0,
        rss: 60 * 1024 * 1024,
      });

      const usage = await resourceManager.getCurrentMemoryUsage();
      expect(usage.heapUsedPercentage).toBe(1); // Should default to 100% when total is 0
    });
  });

  describe('getCpuUsage', () => {
    it('should return CPU usage based on load average', async () => {
      // The mock for os.loadavg is set up in the vi.mock section
      const cpuUsage = await resourceManager.getCpuUsage();

      // Load average of 0.5 on 4 cores = 0.5/4 = 0.125 = 12.5%
      expect(cpuUsage).toBeCloseTo(0.125);
    });

    it('should cap CPU usage at 100%', async () => {
      const os = await import('os');
      vi.mocked(os.loadavg).mockReturnValue([8.0, 8.5, 9.0]); // Very high load

      const cpuUsage = await resourceManager.getCpuUsage();
      expect(cpuUsage).toBe(1.0); // Should be capped at 100%
    });
  });

  describe('adjustConcurrency', () => {
    it('should reduce concurrency when memory usage exceeds threshold', async () => {
      // Set high memory usage (90% > 85% threshold)
      mockMemoryUsage.mockReturnValue({
        heapUsed: 90 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
        rss: 110 * 1024 * 1024,
      });

      const newConcurrency = await resourceManager.adjustConcurrency();
      expect(newConcurrency).toBe(3); // Should reduce from 4 to 3
      expect(resourceManager.getCurrentConcurrency()).toBe(3);
    });

    it('should reduce concurrency when CPU usage exceeds threshold', async () => {
      // Set normal memory usage but high CPU usage
      mockMemoryUsage.mockReturnValue({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
        rss: 60 * 1024 * 1024,
      });

      const os = await import('os');
      vi.mocked(os.loadavg).mockReturnValue([4.0, 4.0, 4.0]); // 100% CPU usage on 4 cores

      const newConcurrency = await resourceManager.adjustConcurrency();
      expect(newConcurrency).toBe(3); // Should reduce from 4 to 3
    });

    it('should increase concurrency when resources are available', async () => {
      // Start with reduced concurrency
      resourceManager.setCurrentConcurrency(2);

      // Set low resource usage
      mockMemoryUsage.mockReturnValue({
        heapUsed: 40 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
        rss: 50 * 1024 * 1024,
      });

      const os = await import('os');
      vi.mocked(os.loadavg).mockReturnValue([1.0, 1.0, 1.0]); // 25% CPU usage on 4 cores

      const newConcurrency = await resourceManager.adjustConcurrency();
      expect(newConcurrency).toBe(3); // Should increase from 2 to 3
    });

    it('should not reduce concurrency below 1', async () => {
      resourceManager.setCurrentConcurrency(1);

      // Set very high resource usage
      mockMemoryUsage.mockReturnValue({
        heapUsed: 95 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
        rss: 110 * 1024 * 1024,
      });

      const newConcurrency = await resourceManager.adjustConcurrency();
      expect(newConcurrency).toBe(1); // Should stay at minimum of 1
    });

    it('should not exceed maximum concurrency', async () => {
      resourceManager.setCurrentConcurrency(4); // At max

      // Set very low resource usage
      mockMemoryUsage.mockReturnValue({
        heapUsed: 10 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
        rss: 20 * 1024 * 1024,
      });

      const os = await import('os');
      vi.mocked(os.loadavg).mockReturnValue([0.1, 0.1, 0.1]); // Very low CPU usage

      const newConcurrency = await resourceManager.adjustConcurrency();
      expect(newConcurrency).toBe(4); // Should stay at maximum
    });
  });

  describe('getResourceStatus', () => {
    it('should return comprehensive resource status', async () => {
      mockMemoryUsage.mockReturnValue({
        heapUsed: 60 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        arrayBuffers: 2 * 1024 * 1024,
        rss: 80 * 1024 * 1024,
      });

      const status = await resourceManager.getResourceStatus();

      expect(status).toMatchObject({
        memoryUsage: expect.objectContaining({
          heapUsedPercentage: 0.6,
          heapUsed: 60 * 1024 * 1024,
          heapTotal: 100 * 1024 * 1024,
        }),
        cpuUsage: expect.any(Number),
        concurrency: expect.objectContaining({
          current: expect.any(Number),
          maximum: expect.any(Number),
        }),
        thresholds: expect.objectContaining({
          memory: 0.85,
          cpu: 0.9,
        }),
        isHealthy: expect.any(Boolean),
        recommendations: expect.any(Array),
      });
    });

    it('should identify unhealthy state when thresholds exceeded', async () => {
      mockMemoryUsage.mockReturnValue({
        heapUsed: 90 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
        rss: 110 * 1024 * 1024,
      });

      const status = await resourceManager.getResourceStatus();
      expect(status.isHealthy).toBe(false);
      expect(status.recommendations).toContain(
        'Consider reducing memory usage - above 85% threshold'
      );
    });

    it('should provide recommendations for high resource usage', async () => {
      // High CPU usage scenario
      const os = await import('os');
      vi.mocked(os.loadavg).mockReturnValue([4.0, 4.0, 4.0]);

      mockMemoryUsage.mockReturnValue({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
        rss: 60 * 1024 * 1024,
      });

      const status = await resourceManager.getResourceStatus();
      expect(status.recommendations).toContain(
        'Consider reducing CPU intensive operations - above 90% threshold'
      );
    });
  });

  describe('setThresholds', () => {
    it('should update memory and CPU thresholds', () => {
      resourceManager.setThresholds({
        memoryThreshold: 0.7,
        cpuThreshold: 0.75,
      });

      expect(resourceManager.getMemoryThreshold()).toBe(0.7);
      expect(resourceManager.getCpuThreshold()).toBe(0.75);
    });

    it('should validate threshold values', () => {
      expect(() => {
        resourceManager.setThresholds({ memoryThreshold: 1.5 });
      }).toThrow('Memory threshold must be between 0 and 1');

      expect(() => {
        resourceManager.setThresholds({ cpuThreshold: -0.1 });
      }).toThrow('CPU threshold must be between 0 and 1');
    });
  });

  describe('resetConcurrency', () => {
    it('should reset concurrency to maximum value', () => {
      resourceManager.setCurrentConcurrency(2);
      resourceManager.resetConcurrency();

      expect(resourceManager.getCurrentConcurrency()).toBe(4); // Back to max
    });
  });
});
