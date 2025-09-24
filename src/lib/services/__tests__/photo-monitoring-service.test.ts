/**
 * Photo Monitoring Service Tests - 照片監控服務測試
 *
 * 任務 7.2: 整合現有 Oracle 監控和效能追蹤機制
 * - 整合 QueueHealthMonitor 和 UploadProgressTracker
 * - 提供照片上傳和處理的統一監控介面
 * - 支援效能指標收集和分析
 *
 * 使用 TDD 方法: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PhotoMonitoringService } from '../photo-monitoring-service';
import type {
  PhotoUploadMetrics,
  PhotoAPIMetrics,
  PhotoSystemHealth,
  PhotoPerformanceSummary,
} from '../photo-monitoring-service';

// Mock 依賴服務
const mockQueueHealthMonitor = {
  checkQueueHealth: vi.fn(),
  calculateProcessingRate: vi.fn(),
  estimateWaitTime: vi.fn(),
  startMonitoring: vi.fn(),
  stopMonitoring: vi.fn(),
  getHealthHistory: vi.fn(),
};

const mockUploadProgressTracker = {
  calculateProgress: vi.fn(),
  calculateUploadSpeed: vi.fn(),
  estimateCompletionTime: vi.fn(),
  getPerformanceMetrics: vi.fn(),
  analyzeUploadHistory: vi.fn(),
  generateProgressSummary: vi.fn(),
};

const mockBatchQueueService = {
  getQueueHealth: vi.fn(),
};

vi.mock('../queue-health-monitor', () => ({
  QueueHealthMonitor: vi.fn(() => mockQueueHealthMonitor),
}));

vi.mock('../upload-progress-tracker', () => ({
  UploadProgressTracker: vi.fn(() => mockUploadProgressTracker),
}));

vi.mock('../batch-queue-service', () => ({
  BatchQueueService: vi.fn(() => mockBatchQueueService),
}));

// Mock Oracle connection
const mockOracleConnection = {
  validateConnection: vi.fn().mockResolvedValue(true),
};

vi.mock('../../database/oracle-connection', () => ({
  getOracleConnection: vi.fn(() => mockOracleConnection),
}));

describe('照片監控服務測試 - TDD Implementation', () => {
  let photoMonitoringService: PhotoMonitoringService;

  beforeEach(() => {
    vi.clearAllMocks();
    photoMonitoringService = new PhotoMonitoringService();
  });

  describe('getPhotoUploadMetrics - 取得照片上傳指標', () => {
    it('RED: 應該成功取得照片上傳指標', async () => {
      // Arrange
      const uploadId = 'upload-123';

      const mockProgress = {
        success: true,
        data: {
          uploadId,
          fileName: 'test-photo.jpg',
          totalBytes: 2048000,
          uploadedBytes: 1024000,
          progressPercentage: 50,
          status: 'uploading',
        },
      };

      const mockSpeed = {
        success: true,
        data: {
          uploadId,
          currentSpeed: 1048576,
          averageSpeed: 524288,
          throughput: 0.5,
          speedTrend: 'stable',
        },
      };

      const mockETA = {
        success: true,
        data: {
          uploadId,
          estimatedTimeRemaining: 60000,
          confidence: 0.8,
          basedOnChunks: 5,
        },
      };

      mockUploadProgressTracker.calculateProgress.mockResolvedValue(
        mockProgress
      );
      mockUploadProgressTracker.calculateUploadSpeed.mockResolvedValue(
        mockSpeed
      );
      mockUploadProgressTracker.estimateCompletionTime.mockResolvedValue(
        mockETA
      );

      // Act
      const result =
        await photoMonitoringService.getPhotoUploadMetrics(uploadId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        uploadId,
        fileName: 'test-photo.jpg',
        progressPercentage: 50,
        currentSpeed: 1048576,
        averageSpeed: 524288,
        throughput: 0.5,
        estimatedTimeRemaining: 60000,
        confidence: 0.8,
        status: 'uploading',
      });
    });

    it('RED: 應該處理上傳不存在的情況', async () => {
      // Arrange
      const uploadId = 'nonexistent-upload';

      mockUploadProgressTracker.calculateProgress.mockResolvedValue({
        success: false,
        error: { code: 'UPLOAD_NOT_FOUND', message: '上傳會話不存在' },
      });

      // Act
      const result =
        await photoMonitoringService.getPhotoUploadMetrics(uploadId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('上傳會話不存在');
    });
  });

  describe('getPhotoAPIMetrics - 取得照片 API 指標', () => {
    it('RED: 應該成功取得照片 API 效能指標', async () => {
      // Arrange
      const timeRange = {
        start: new Date('2024-09-24T00:00:00Z'),
        end: new Date('2024-09-24T23:59:59Z'),
      };

      const expectedMetrics: PhotoAPIMetrics = {
        timeRange,
        totalRequests: 1500,
        successfulRequests: 1425,
        failedRequests: 75,
        successRate: 95.0,
        averageResponseTime: 250,
        p95ResponseTime: 500,
        p99ResponseTime: 1000,
        endpointMetrics: {
          'GET /api/photos': {
            requests: 600,
            averageTime: 150,
            successRate: 98.5,
          },
          'POST /api/photos': {
            requests: 300,
            averageTime: 800,
            successRate: 92.3,
          },
          'PUT /api/photos': {
            requests: 150,
            averageTime: 300,
            successRate: 94.7,
          },
          'DELETE /api/photos': {
            requests: 50,
            averageTime: 200,
            successRate: 96.0,
          },
          'GET /api/albums/photos': {
            requests: 400,
            averageTime: 180,
            successRate: 97.5,
          },
        },
        errorDistribution: {
          400: 25, // Bad Request
          404: 20, // Not Found
          500: 30, // Internal Server Error
        },
      };

      // Mock 內部實作（實際會查詢 Oracle 監控表）
      vi.spyOn(
        photoMonitoringService as any,
        'queryAPIMetrics'
      ).mockResolvedValue(expectedMetrics);

      // Act
      const result = await photoMonitoringService.getPhotoAPIMetrics(timeRange);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.totalRequests).toBe(1500);
      expect(result.data?.successRate).toBe(95.0);
      expect(result.data?.endpointMetrics['GET /api/photos'].requests).toBe(
        600
      );
      expect(result.data?.errorDistribution[500]).toBe(30);
    });

    it('RED: 應該處理時間範圍無效的情況', async () => {
      // Arrange
      const invalidTimeRange = {
        start: new Date('2024-09-25T00:00:00Z'),
        end: new Date('2024-09-24T23:59:59Z'), // 結束時間早於開始時間
      };

      // Act
      const result =
        await photoMonitoringService.getPhotoAPIMetrics(invalidTimeRange);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('時間範圍無效');
    });
  });

  describe('getPhotoSystemHealth - 取得照片系統健康狀態', () => {
    it('RED: 應該成功取得系統健康狀態', async () => {
      // Arrange
      const mockQueueHealth = {
        isHealthy: true,
        queueMetrics: {
          waitingJobs: 25,
          activeJobs: 5,
          failedJobs: 2,
          isHealthy: true,
          connectionStatus: 'connected',
        },
        issues: [],
        timestamp: new Date('2024-09-24T10:00:00Z'),
      };

      const mockProcessingRate = {
        jobsPerSecond: 2.5,
        estimatedTimeToEmpty: 10,
      };

      const mockWaitTime = {
        totalWaitTimeSeconds: 10,
        averageWaitTimePerJob: 0.4,
        confidence: 'high',
      };

      mockQueueHealthMonitor.checkQueueHealth.mockResolvedValue(
        mockQueueHealth
      );
      mockQueueHealthMonitor.calculateProcessingRate.mockResolvedValue(
        mockProcessingRate
      );
      mockQueueHealthMonitor.estimateWaitTime.mockResolvedValue(mockWaitTime);

      // Act
      const result = await photoMonitoringService.getPhotoSystemHealth();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        overallHealth: 'healthy',
        queueHealth: mockQueueHealth,
        processingRate: mockProcessingRate,
        waitTimeEstimate: mockWaitTime,
        systemStatus: {
          oracleConnection: 'connected',
          queueService: 'healthy',
          uploadService: 'healthy',
          storageService: 'healthy',
        },
        recommendations: [],
      });
    });

    it('RED: 應該識別不健康的系統狀態', async () => {
      // Arrange
      const unhealthyQueueHealth = {
        isHealthy: false,
        queueMetrics: {
          waitingJobs: 150,
          activeJobs: 10,
          failedJobs: 50,
          isHealthy: false,
          connectionStatus: 'disconnected',
        },
        issues: [
          'Too many failed jobs: 50 (limit: 20)',
          'Queue connection is disconnected',
        ],
        timestamp: new Date('2024-09-24T10:00:00Z'),
      };

      mockQueueHealthMonitor.checkQueueHealth.mockResolvedValue(
        unhealthyQueueHealth
      );

      // Act
      const result = await photoMonitoringService.getPhotoSystemHealth();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.overallHealth).toBe('unhealthy');
      expect(result.data?.systemStatus.queueService).toBe('unhealthy');
      expect(result.data?.recommendations).toContain('檢查佇列服務連線狀態');
    });
  });

  describe('getPhotoPerformanceSummary - 取得照片效能摘要', () => {
    it('RED: 應該成功取得效能摘要', async () => {
      // Arrange
      const userId = 'user-123';
      const timeRange = {
        start: new Date('2024-09-01T00:00:00Z'),
        end: new Date('2024-09-30T23:59:59Z'),
      };

      const mockUploadHistory = {
        success: true,
        data: {
          userId,
          periodDays: 30,
          totalUploads: 150,
          averageSpeed: 1048576,
          successRate: 0.95,
          peakPerformanceTime: '2024-09-15 (1024 KB/s)',
          trends: {
            uploadVolume: 'increasing',
            speedTrend: 'stable',
            reliabilityTrend: 'improving',
          },
          recommendations: ['上傳量持續增加，考慮升級帶寬'],
        },
      };

      const mockProgressSummary = {
        success: true,
        data: {
          userId,
          activeUploads: 3,
          completedUploads: 147,
          totalDataUploaded: 157286400,
          averageSpeed: 524288,
          estimatedTotalCompletion: new Date('2024-09-24T11:30:00Z'),
          uploads: [
            {
              uploadId: 'upload-1',
              fileName: 'photo1.jpg',
              progress: 75,
              speed: 1048576,
              eta: 30,
            },
            {
              uploadId: 'upload-2',
              fileName: 'photo2.png',
              progress: 50,
              speed: 524288,
              eta: 60,
            },
            {
              uploadId: 'upload-3',
              fileName: 'photo3.jpg',
              progress: 25,
              speed: 262144,
              eta: 120,
            },
          ],
        },
      };

      mockUploadProgressTracker.analyzeUploadHistory.mockResolvedValue(
        mockUploadHistory
      );
      mockUploadProgressTracker.generateProgressSummary.mockResolvedValue(
        mockProgressSummary
      );

      // Act
      const result = await photoMonitoringService.getPhotoPerformanceSummary(
        userId,
        timeRange
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        userId,
        timeRange,
        uploadHistory: mockUploadHistory.data,
        currentProgress: mockProgressSummary.data,
        performanceScore: expect.any(Number),
        insights: expect.any(Array),
        recommendations: expect.any(Array),
      });
      expect(result.data?.performanceScore).toBeGreaterThan(0);
      expect(result.data?.insights.length).toBeGreaterThan(0);
    });

    it('RED: 應該處理用戶無歷史資料的情況', async () => {
      // Arrange
      const userId = 'new-user';
      const timeRange = {
        start: new Date('2024-09-24T00:00:00Z'),
        end: new Date('2024-09-24T23:59:59Z'),
      };

      mockUploadProgressTracker.analyzeUploadHistory.mockResolvedValue({
        success: false,
        error: { code: 'NO_HISTORY_DATA', message: '沒有歷史資料' },
      });

      // Act
      const result = await photoMonitoringService.getPhotoPerformanceSummary(
        userId,
        timeRange
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('沒有歷史資料');
    });
  });

  describe('startPhotoMonitoring - 開始照片監控', () => {
    it('RED: 應該成功開始監控服務', async () => {
      // Arrange
      const config = {
        checkInterval: 30000,
        enableQueueMonitoring: true,
        enableUploadTracking: true,
        enableAPIMetrics: true,
      };

      // Act
      const result = await photoMonitoringService.startPhotoMonitoring(config);

      // Assert
      expect(result.success).toBe(true);
      expect(mockQueueHealthMonitor.startMonitoring).toHaveBeenCalled();
      expect(result.data?.message).toContain('照片監控服務已啟動');
    });

    it('RED: 應該處理監控已啟動的情況', async () => {
      // Arrange
      const config = { checkInterval: 30000 };

      // 第一次啟動
      await photoMonitoringService.startPhotoMonitoring(config);

      // Act - 第二次啟動
      const result = await photoMonitoringService.startPhotoMonitoring(config);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('監控服務已在運行中');
    });
  });

  describe('stopPhotoMonitoring - 停止照片監控', () => {
    it('RED: 應該成功停止監控服務', async () => {
      // Arrange
      // 先啟動監控
      await photoMonitoringService.startPhotoMonitoring({
        checkInterval: 30000,
      });

      // Act
      const result = await photoMonitoringService.stopPhotoMonitoring();

      // Assert
      expect(result.success).toBe(true);
      expect(mockQueueHealthMonitor.stopMonitoring).toHaveBeenCalled();
      expect(result.data?.message).toContain('照片監控服務已停止');
    });
  });

  describe('Error Handling', () => {
    it('RED: 應該處理監控服務錯誤', async () => {
      // Arrange
      const uploadId = 'upload-error';

      mockUploadProgressTracker.calculateProgress.mockRejectedValue(
        new Error('Oracle connection failed')
      );

      // Act
      const result =
        await photoMonitoringService.getPhotoUploadMetrics(uploadId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Oracle connection failed');
    });

    it('RED: 應該處理系統健康檢查錯誤', async () => {
      // Arrange
      mockQueueHealthMonitor.checkQueueHealth.mockRejectedValue(
        new Error('Health check failed')
      );

      // Act
      const result = await photoMonitoringService.getPhotoSystemHealth();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Health check failed');
    });
  });
});
