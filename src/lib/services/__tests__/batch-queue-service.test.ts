import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { BatchQueueService } from '../batch-queue-service';

// Mock BullMQ
vi.mock('bullmq', () => ({
  Queue: vi.fn(),
  Worker: vi.fn(),
  Job: vi.fn(),
}));

// Mock Redis
vi.mock('ioredis', () => ({
  default: vi.fn(),
}));

describe('BatchQueueService', () => {
  let batchQueueService: BatchQueueService;
  let mockQueue: any;
  let mockWorker: any;
  let mockRedis: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock Redis instance
    mockRedis = {
      ping: vi.fn().mockResolvedValue('PONG'),
      disconnect: vi.fn(),
    };
    (Redis as any).mockImplementation(() => mockRedis);

    // Mock Queue instance
    mockQueue = {
      add: vi.fn(),
      getWaiting: vi.fn().mockResolvedValue([]),
      getActive: vi.fn().mockResolvedValue([]),
      getFailed: vi.fn().mockResolvedValue([]),
      close: vi.fn(),
    };
    (Queue as any).mockImplementation(() => mockQueue);

    // Mock Worker instance
    mockWorker = {
      close: vi.fn(),
    };
    (Worker as any).mockImplementation(() => mockWorker);

    batchQueueService = new BatchQueueService();
  });

  afterEach(async () => {
    await batchQueueService.shutdown();
  });

  describe('Queue Configuration', () => {
    it('should create queue with correct configuration', () => {
      expect(Queue).toHaveBeenCalledWith(
        'batch-upload',
        expect.objectContaining({
          connection: expect.any(Object),
          defaultJobOptions: expect.objectContaining({
            removeOnComplete: expect.any(Number),
            removeOnFail: expect.any(Number),
            attempts: expect.any(Number),
            backoff: {
              type: 'exponential',
              delay: expect.any(Number),
            },
          }),
        })
      );
    });

    it('should create Redis connection with correct configuration', () => {
      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: expect.any(String),
          port: expect.any(Number),
          maxRetriesPerRequest: expect.any(Number),
          retryDelayOnFailover: expect.any(Number),
        })
      );
    });

    it('should allow custom configuration', () => {
      const customConfig = {
        maxConcurrentWorkers: 6,
        batchSize: 12,
      };

      const customService = new BatchQueueService(customConfig);
      const config = customService.getConfiguration();

      expect(config.maxConcurrentWorkers).toBe(6);
      expect(config.batchSize).toBe(12);
    });

    it('should validate configuration and throw error for invalid config', () => {
      const invalidConfig = {
        maxConcurrentWorkers: 0, // Invalid: must be at least 1
      };

      expect(() => new BatchQueueService(invalidConfig)).toThrow(
        'Invalid batch queue configuration'
      );
    });
  });

  describe('enqueueBatchUpload', () => {
    it('should add batch upload job to queue with correct data', async () => {
      const mockFiles = [
        { name: 'file1.jpg', size: 1000, type: 'image/jpeg' },
        { name: 'file2.png', size: 2000, type: 'image/png' },
      ];
      const projectId = 'project-123';
      const albumId = 'album-456';
      const userId = 'user-789';

      mockQueue.add.mockResolvedValue({ id: 'job-123' });

      const result = await batchQueueService.enqueueBatchUpload(
        mockFiles,
        projectId,
        albumId,
        userId
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        'batch-upload',
        {
          files: mockFiles,
          projectId,
          albumId,
          userId,
          batchId: expect.any(String),
          createdAt: expect.any(Date),
        },
        expect.objectContaining({
          priority: 5, // normal priority
        })
      );

      expect(result).toEqual({
        success: true,
        jobId: 'job-123',
        batchId: expect.any(String),
      });
    });

    it('should support urgent priority for batch uploads', async () => {
      const mockFiles = [
        { name: 'urgent.jpg', size: 1000, type: 'image/jpeg' },
      ];
      const projectId = 'project-123';
      const albumId = 'album-456';
      const userId = 'user-789';

      mockQueue.add.mockResolvedValue({ id: 'job-urgent' });

      const result = await batchQueueService.enqueueBatchUpload(
        mockFiles,
        projectId,
        albumId,
        userId,
        { priority: 'urgent' }
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        'batch-upload',
        expect.any(Object),
        expect.objectContaining({
          priority: 10, // urgent priority
        })
      );

      expect(result.success).toBe(true);
    });

    it('should handle queue errors gracefully', async () => {
      const mockFiles = [{ name: 'file1.jpg', size: 1000, type: 'image/jpeg' }];
      mockQueue.add.mockRejectedValue(new Error('Queue connection failed'));

      const result = await batchQueueService.enqueueBatchUpload(
        mockFiles,
        'project-123',
        'album-456',
        'user-789'
      );

      expect(result).toEqual({
        success: false,
        error: 'Queue connection failed',
      });
    });
  });

  describe('Worker Configuration', () => {
    it('should create worker with correct concurrency configuration', () => {
      expect(Worker).toHaveBeenCalledWith(
        'batch-upload',
        expect.any(Function),
        expect.objectContaining({
          connection: expect.any(Object),
          concurrency: expect.any(Number),
          limiter: expect.objectContaining({
            max: expect.any(Number),
            duration: 1000,
          }),
        })
      );
    });

    it('should process batch upload jobs', async () => {
      // Get the processor function passed to Worker
      const processorFunction = (Worker as any).mock.calls[0][1];

      const mockJob = {
        id: 'job-123',
        data: {
          files: [{ name: 'test.jpg', size: 1000, type: 'image/jpeg' }],
          projectId: 'project-123',
          albumId: 'album-456',
          userId: 'user-789',
          batchId: 'batch-123',
        },
        updateProgress: vi.fn(),
        log: vi.fn(),
      };

      // Mock the batch processing
      const processBatchSpy = vi
        .spyOn(batchQueueService, 'processBatch')
        .mockResolvedValue({
          success: true,
          processedFiles: 1,
          failedFiles: 0,
          results: [{ fileName: 'test.jpg', success: true }],
        });

      const result = await processorFunction(mockJob);

      expect(processBatchSpy).toHaveBeenCalledWith('batch-123');
      expect(result).toEqual({
        success: true,
        processedFiles: 1,
        failedFiles: 0,
        results: [{ fileName: 'test.jpg', success: true }],
      });
    });
  });

  describe('Queue Health Monitoring', () => {
    it('should get queue health metrics', async () => {
      const mockWaitingJobs = [{ id: '1' }, { id: '2' }];
      const mockActiveJobs = [{ id: '3' }];
      const mockFailedJobs = [{ id: '4' }];

      mockQueue.getWaiting.mockResolvedValue(mockWaitingJobs);
      mockQueue.getActive.mockResolvedValue(mockActiveJobs);
      mockQueue.getFailed.mockResolvedValue(mockFailedJobs);

      const health = await batchQueueService.getQueueHealth();

      expect(health).toEqual({
        waitingJobs: 2,
        activeJobs: 1,
        failedJobs: 1,
        isHealthy: true,
        connectionStatus: 'connected',
      });
    });

    it('should detect unhealthy queue state', async () => {
      // Simulate many failed jobs
      const mockFailedJobs = new Array(100).fill({ id: 'failed' });
      mockQueue.getFailed.mockResolvedValue(mockFailedJobs);
      mockQueue.getWaiting.mockResolvedValue([]);
      mockQueue.getActive.mockResolvedValue([]);

      const health = await batchQueueService.getQueueHealth();

      expect(health.isHealthy).toBe(false);
      expect(health.failedJobs).toBe(100);
    });
  });

  describe('Resource Management', () => {
    it('should adjust concurrency based on system load', async () => {
      const adjustSpy = vi.spyOn(batchQueueService, 'adjustConcurrency');

      // Simulate high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        heapUsed: 900 * 1024 * 1024, // 900MB
        heapTotal: 1000 * 1024 * 1024, // 1000MB
        external: 0,
        arrayBuffers: 0,
        rss: 0,
      });

      await batchQueueService.adjustConcurrency();

      expect(adjustSpy).toHaveBeenCalled();

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('should handle Redis connection failures gracefully', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const health = await batchQueueService.getQueueHealth();

      expect(health).toEqual({
        waitingJobs: 0,
        activeJobs: 0,
        failedJobs: 0,
        isHealthy: false,
        connectionStatus: 'disconnected',
        error: 'Connection failed',
      });
    });
  });

  describe('Job Retry Mechanism', () => {
    it('should retry failed jobs with exponential backoff', async () => {
      const jobId = 'job-123';
      const mockJob = {
        id: jobId,
        retry: vi.fn().mockResolvedValue(true),
        data: { batchId: 'batch-123' },
      };

      const result = await batchQueueService.retryFailedJob(jobId);

      expect(result).toEqual({
        success: true,
        jobId,
        retryCount: expect.any(Number),
      });
    });

    it('should handle maximum retry attempts', async () => {
      const jobId = 'job-456';
      const mockJob = {
        id: jobId,
        attemptsMade: 3,
        opts: { attempts: 3 },
        data: { batchId: 'batch-456' },
      };

      const result = await batchQueueService.retryFailedJob(jobId);

      expect(result).toEqual({
        success: false,
        error: 'Maximum retry attempts exceeded',
        jobId,
      });
    });
  });

  describe('Configuration Management', () => {
    it('should get current configuration', () => {
      const config = batchQueueService.getConfiguration();

      expect(config).toHaveProperty('maxConcurrentWorkers');
      expect(config).toHaveProperty('batchSize');
      expect(config).toHaveProperty('retryAttempts');
      expect(config).toHaveProperty('priorityLevels');
      expect(config).toHaveProperty('redis');
    });

    it('should update configuration with valid values', () => {
      const updates = {
        maxConcurrentWorkers: 6,
        batchSize: 10,
      };

      batchQueueService.updateConfiguration(updates);
      const config = batchQueueService.getConfiguration();

      expect(config.maxConcurrentWorkers).toBe(6);
      expect(config.batchSize).toBe(10);
    });

    it('should throw error when updating with invalid configuration', () => {
      const invalidUpdates = {
        maxConcurrentWorkers: -1, // Invalid value
      };

      expect(() =>
        batchQueueService.updateConfiguration(invalidUpdates)
      ).toThrow('Invalid configuration update');
    });
  });

  describe('Cleanup and Shutdown', () => {
    it('should gracefully shutdown queue and worker', async () => {
      await batchQueueService.shutdown();

      expect(mockQueue.close).toHaveBeenCalled();
      expect(mockWorker.close).toHaveBeenCalled();
      expect(mockRedis.disconnect).toHaveBeenCalled();
    });

    it('should clean up completed jobs periodically', async () => {
      const cleanupSpy = vi.spyOn(batchQueueService, 'cleanupOldJobs');

      await batchQueueService.cleanupOldJobs();

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });
});
