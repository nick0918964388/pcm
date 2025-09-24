/**
 * 照片監控服務
 * 任務 7.2: 整合現有 Oracle 監控和效能追蹤機制
 *
 * 整合現有的監控服務，為照片管理系統提供統一的監控介面：
 * - QueueHealthMonitor: 佇列健康監控
 * - UploadProgressTracker: 上傳進度追蹤
 * - Oracle 資料庫效能監控
 * - API 效能指標收集
 * - 系統健康狀態評估
 */

import { QueueHealthMonitor } from './queue-health-monitor';
import { UploadProgressTracker } from './upload-progress-tracker';
import { BatchQueueService } from './batch-queue-service';
import {
  getOracleConnection,
  type Result,
} from '../database/oracle-connection';

// 照片上傳指標介面
export interface PhotoUploadMetrics {
  uploadId: string;
  fileName: string;
  progressPercentage: number;
  currentSpeed: number; // bytes/second
  averageSpeed: number;
  throughput: number; // MB/s
  estimatedTimeRemaining: number; // milliseconds
  confidence: number; // 0-1
  status: string;
}

// 照片 API 指標介面
export interface PhotoAPIMetrics {
  timeRange: { start: Date; end: Date };
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number; // percentage
  averageResponseTime: number; // milliseconds
  p95ResponseTime: number;
  p99ResponseTime: number;
  endpointMetrics: Record<
    string,
    {
      requests: number;
      averageTime: number;
      successRate: number;
    }
  >;
  errorDistribution: Record<number, number>; // HTTP status code -> count
}

// 照片系統健康狀態介面
export interface PhotoSystemHealth {
  overallHealth: 'healthy' | 'degraded' | 'unhealthy';
  queueHealth: any; // From QueueHealthMonitor
  processingRate: any; // From QueueHealthMonitor
  waitTimeEstimate: any; // From QueueHealthMonitor
  systemStatus: {
    oracleConnection: 'connected' | 'disconnected' | 'slow';
    queueService: 'healthy' | 'degraded' | 'unhealthy';
    uploadService: 'healthy' | 'degraded' | 'unhealthy';
    storageService: 'healthy' | 'degraded' | 'unhealthy';
  };
  recommendations: string[];
}

// 照片效能摘要介面
export interface PhotoPerformanceSummary {
  userId: string;
  timeRange: { start: Date; end: Date };
  uploadHistory: any; // From UploadProgressTracker
  currentProgress: any; // From UploadProgressTracker
  performanceScore: number; // 0-100
  insights: string[];
  recommendations: string[];
}

// 監控配置介面
export interface PhotoMonitoringConfig {
  checkInterval?: number;
  enableQueueMonitoring?: boolean;
  enableUploadTracking?: boolean;
  enableAPIMetrics?: boolean;
  maxFailedJobs?: number;
  maxWaitingJobs?: number;
}

// 監控錯誤介面
export interface MonitoringError {
  code: string;
  message: string;
  details?: any;
}

export class PhotoMonitoringService {
  private queueHealthMonitor: QueueHealthMonitor;
  private uploadProgressTracker: UploadProgressTracker;
  private batchQueueService: BatchQueueService;
  private connection = getOracleConnection();
  private isMonitoringActive = false;
  private monitoringConfig: PhotoMonitoringConfig = {};

  constructor() {
    this.batchQueueService = new BatchQueueService();
    this.queueHealthMonitor = new QueueHealthMonitor(this.batchQueueService);
    this.uploadProgressTracker = new UploadProgressTracker();
  }

  /**
   * 取得照片上傳指標
   * 整合 UploadProgressTracker 的多個方法
   */
  async getPhotoUploadMetrics(
    uploadId: string
  ): Promise<Result<PhotoUploadMetrics, MonitoringError>> {
    try {
      console.log(`📊 取得照片上傳指標: ${uploadId}`);

      // 並行取得多個指標
      const [progressResult, speedResult, etaResult] = await Promise.all([
        this.uploadProgressTracker.calculateProgress(uploadId),
        this.uploadProgressTracker.calculateUploadSpeed(uploadId),
        this.uploadProgressTracker.estimateCompletionTime(uploadId),
      ]);

      // 檢查進度結果
      if (!progressResult.success) {
        return {
          success: false,
          error: {
            code: 'PROGRESS_UNAVAILABLE',
            message: progressResult.error?.message || '無法取得上傳進度',
          },
        };
      }

      const progress = progressResult.data;
      const speed = speedResult.success ? speedResult.data : null;
      const eta = etaResult.success ? etaResult.data : null;

      const metrics: PhotoUploadMetrics = {
        uploadId: progress.uploadId,
        fileName: progress.fileName,
        progressPercentage: progress.progressPercentage,
        currentSpeed: speed?.currentSpeed || 0,
        averageSpeed: speed?.averageSpeed || 0,
        throughput: speed?.throughput || 0,
        estimatedTimeRemaining: eta?.estimatedTimeRemaining || 0,
        confidence: eta?.confidence || 0,
        status: progress.status,
      };

      console.log(`✅ 成功取得上傳指標: ${uploadId}`);

      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      console.error(`❌ 取得上傳指標失敗 (${uploadId}):`, error);

      return {
        success: false,
        error: {
          code: 'METRICS_RETRIEVAL_FAILED',
          message: error instanceof Error ? error.message : '取得上傳指標失敗',
        },
      };
    }
  }

  /**
   * 取得照片 API 指標
   * 查詢 Oracle 監控表取得 API 效能資料
   */
  async getPhotoAPIMetrics(timeRange: {
    start: Date;
    end: Date;
  }): Promise<Result<PhotoAPIMetrics, MonitoringError>> {
    try {
      console.log('📈 取得照片 API 指標');

      // 驗證時間範圍
      if (timeRange.start >= timeRange.end) {
        return {
          success: false,
          error: {
            code: 'INVALID_TIME_RANGE',
            message: '時間範圍無效：開始時間必須早於結束時間',
          },
        };
      }

      // 查詢 API 指標（模擬實作，實際會查詢 Oracle 監控表）
      const metrics = await this.queryAPIMetrics(timeRange);

      console.log('✅ 成功取得 API 指標');

      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      console.error('❌ 取得 API 指標失敗:', error);

      return {
        success: false,
        error: {
          code: 'API_METRICS_FAILED',
          message: error instanceof Error ? error.message : '取得 API 指標失敗',
        },
      };
    }
  }

  /**
   * 取得照片系統健康狀態
   * 整合多個監控源的健康檢查
   */
  async getPhotoSystemHealth(): Promise<
    Result<PhotoSystemHealth, MonitoringError>
  > {
    try {
      console.log('🔍 檢查照片系統健康狀態');

      // 並行檢查多個系統組件
      const [queueHealth, processingRate, waitTime] = await Promise.all([
        this.queueHealthMonitor.checkQueueHealth(),
        this.queueHealthMonitor.calculateProcessingRate(),
        this.queueHealthMonitor.estimateWaitTime(),
      ]);

      // 評估各系統組件狀態
      const systemStatus = {
        oracleConnection: await this.checkOracleConnection(),
        queueService: queueHealth.isHealthy
          ? ('healthy' as const)
          : ('unhealthy' as const),
        uploadService: 'healthy' as const, // 簡化實作
        storageService: 'healthy' as const, // 簡化實作
      };

      // 計算整體健康狀態
      let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (
        systemStatus.oracleConnection === 'disconnected' ||
        systemStatus.queueService === 'unhealthy'
      ) {
        overallHealth = 'unhealthy';
      } else if (
        systemStatus.oracleConnection === 'slow' ||
        systemStatus.queueService === 'degraded'
      ) {
        overallHealth = 'degraded';
      }

      // 生成建議
      const recommendations: string[] = [];
      if (!queueHealth.isHealthy) {
        recommendations.push('檢查佇列服務連線狀態');
      }
      if (queueHealth.queueMetrics.failedJobs > 20) {
        recommendations.push('過多失敗任務，建議檢查錯誤日志');
      }
      if (processingRate.jobsPerSecond < 1) {
        recommendations.push('處理速度較慢，考慮增加處理資源');
      }
      if (systemStatus.oracleConnection === 'slow') {
        recommendations.push('Oracle 資料庫回應較慢，檢查資料庫效能');
      }

      const healthStatus: PhotoSystemHealth = {
        overallHealth,
        queueHealth,
        processingRate,
        waitTimeEstimate: waitTime,
        systemStatus,
        recommendations,
      };

      console.log(`✅ 系統健康狀態: ${overallHealth}`);

      return {
        success: true,
        data: healthStatus,
      };
    } catch (error) {
      console.error('❌ 系統健康檢查失敗:', error);

      return {
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: error instanceof Error ? error.message : '系統健康檢查失敗',
        },
      };
    }
  }

  /**
   * 取得照片效能摘要
   * 整合歷史分析和當前進度
   */
  async getPhotoPerformanceSummary(
    userId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<Result<PhotoPerformanceSummary, MonitoringError>> {
    try {
      console.log(`📊 生成照片效能摘要: ${userId}`);

      const periodDays = Math.ceil(
        (timeRange.end.getTime() - timeRange.start.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // 並行取得歷史分析和當前進度
      const [historyResult, progressResult] = await Promise.all([
        this.uploadProgressTracker.analyzeUploadHistory(userId, periodDays),
        this.uploadProgressTracker.generateProgressSummary(userId),
      ]);

      // 檢查歷史資料
      if (!historyResult.success) {
        return {
          success: false,
          error: {
            code: 'NO_HISTORY_DATA',
            message: historyResult.error?.message || '沒有歷史資料',
          },
        };
      }

      const history = historyResult.data;
      const currentProgress = progressResult.success
        ? progressResult.data
        : null;

      // 計算效能分數 (0-100)
      let performanceScore = 50; // 基礎分數

      // 成功率影響 (40%)
      performanceScore += (history.successRate - 0.5) * 80;

      // 速度影響 (30%)
      const speedScore = Math.min(1, history.averageSpeed / (1024 * 1024)) * 30; // 以1MB/s為滿分
      performanceScore += speedScore;

      // 穩定性影響 (30%)
      if (history.trends.reliabilityTrend === 'improving')
        performanceScore += 15;
      else if (history.trends.reliabilityTrend === 'declining')
        performanceScore -= 15;

      performanceScore = Math.max(0, Math.min(100, performanceScore));

      // 生成洞察
      const insights: string[] = [];
      insights.push(
        `在 ${periodDays} 天內完成了 ${history.totalUploads} 次上傳`
      );
      insights.push(
        `平均上傳速度為 ${Math.round(history.averageSpeed / 1024)} KB/s`
      );
      insights.push(`成功率為 ${Math.round(history.successRate * 100)}%`);

      if (currentProgress) {
        insights.push(`目前有 ${currentProgress.activeUploads} 個活躍上傳`);
      }

      // 合併建議
      const recommendations = [...history.recommendations];
      if (performanceScore < 60) {
        recommendations.push('整體效能偏低，建議優化網路環境和上傳設定');
      }

      const summary: PhotoPerformanceSummary = {
        userId,
        timeRange,
        uploadHistory: history,
        currentProgress,
        performanceScore,
        insights,
        recommendations,
      };

      console.log(`✅ 效能摘要生成完成，分數: ${performanceScore}`);

      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      console.error(`❌ 生成效能摘要失敗 (${userId}):`, error);

      return {
        success: false,
        error: {
          code: 'SUMMARY_GENERATION_FAILED',
          message: error instanceof Error ? error.message : '生成效能摘要失敗',
        },
      };
    }
  }

  /**
   * 開始照片監控
   */
  async startPhotoMonitoring(
    config: PhotoMonitoringConfig
  ): Promise<Result<{ message: string }, MonitoringError>> {
    try {
      if (this.isMonitoringActive) {
        return {
          success: true,
          data: { message: '監控服務已在運行中' },
        };
      }

      console.log('🔄 啟動照片監控服務');

      this.monitoringConfig = { ...config };

      // 啟動佇列監控
      if (config.enableQueueMonitoring !== false) {
        this.queueHealthMonitor.startMonitoring();
      }

      this.isMonitoringActive = true;

      console.log('✅ 照片監控服務已啟動');

      return {
        success: true,
        data: { message: '照片監控服務已啟動' },
      };
    } catch (error) {
      console.error('❌ 啟動監控服務失敗:', error);

      return {
        success: false,
        error: {
          code: 'MONITORING_START_FAILED',
          message: error instanceof Error ? error.message : '啟動監控服務失敗',
        },
      };
    }
  }

  /**
   * 停止照片監控
   */
  async stopPhotoMonitoring(): Promise<
    Result<{ message: string }, MonitoringError>
  > {
    try {
      if (!this.isMonitoringActive) {
        return {
          success: true,
          data: { message: '監控服務未在運行' },
        };
      }

      console.log('⏹️ 停止照片監控服務');

      // 停止佇列監控
      this.queueHealthMonitor.stopMonitoring();

      this.isMonitoringActive = false;

      console.log('✅ 照片監控服務已停止');

      return {
        success: true,
        data: { message: '照片監控服務已停止' },
      };
    } catch (error) {
      console.error('❌ 停止監控服務失敗:', error);

      return {
        success: false,
        error: {
          code: 'MONITORING_STOP_FAILED',
          message: error instanceof Error ? error.message : '停止監控服務失敗',
        },
      };
    }
  }

  /**
   * 檢查監控服務是否在運行
   */
  isMonitoring(): boolean {
    return this.isMonitoringActive;
  }

  /**
   * 取得監控配置
   */
  getMonitoringConfig(): PhotoMonitoringConfig {
    return { ...this.monitoringConfig };
  }

  /**
   * 查詢 API 指標 (私有方法)
   * 實際實作中會查詢 Oracle 監控表
   */
  private async queryAPIMetrics(timeRange: {
    start: Date;
    end: Date;
  }): Promise<PhotoAPIMetrics> {
    // 模擬實作 - 實際會執行 Oracle 查詢
    return {
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
        400: 25,
        404: 20,
        500: 30,
      },
    };
  }

  /**
   * 檢查 Oracle 連線狀態 (私有方法)
   */
  private async checkOracleConnection(): Promise<
    'connected' | 'disconnected' | 'slow'
  > {
    try {
      // 檢查連線管理器是否已初始化
      if (!this.connection.validateConnection) {
        console.warn('Oracle 連線管理器未初始化');
        return 'disconnected';
      }

      const startTime = Date.now();
      const isValid = await this.connection.validateConnection();
      const responseTime = Date.now() - startTime;

      if (!isValid) {
        console.warn('Oracle 連線驗證失敗');
        return 'disconnected';
      }

      if (responseTime > 5000) return 'slow'; // 超過5秒為慢
      return 'connected';
    } catch (error) {
      console.warn('Oracle 連線檢查失敗:', error);
      return 'disconnected';
    }
  }
}
