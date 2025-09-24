/**
 * 即時上傳進度追蹤服務
 * Task 4.3: 實作即時上傳進度追蹤
 *
 * 提供即時上傳進度追蹤功能，支援：
 * - 分塊上傳進度計算和回報
 * - 即時上傳速度監控和預估完成時間
 * - WebSocket 即時進度推送
 * - 批次上傳進度追蹤
 * - 上傳效能監控和分析
 */

import { getOracleConnection } from '../database/oracle-connection';
import type { Result } from '../utils/api-response';

export interface ProgressInfo {
  uploadId: string;
  fileName: string;
  totalBytes: number;
  uploadedBytes: number;
  totalChunks: number;
  completedChunks: number;
  progressPercentage: number;
  currentChunk: number | null;
  status: 'uploading' | 'completed' | 'failed' | 'paused';
}

export interface SpeedInfo {
  uploadId: string;
  currentSpeed: number; // bytes/second
  averageSpeed: number;
  speedTrend: 'increasing' | 'decreasing' | 'stable';
  lastChunkTime: Date;
  throughput: number; // MB/s
}

export interface CompletionEstimate {
  uploadId: string;
  estimatedTimeRemaining: number; // milliseconds
  estimatedCompletionAt: Date;
  confidence: number; // 0-1
  basedOnChunks: number;
}

export interface ProgressUpdate {
  uploadId: string;
  progressPercentage: number;
  uploadSpeed?: number;
  estimatedTimeRemaining?: number;
  status: string;
  currentChunk?: number;
  fileName?: string;
}

export interface BatchProgress {
  totalUploads: number;
  completedUploads: number;
  inProgressUploads: number;
  overallProgress: number;
  uploads: Array<{
    uploadId: string;
    progress: number;
    status: string;
  }>;
}

export interface ProgressSummary {
  userId: string;
  activeUploads: number;
  completedUploads: number;
  totalDataUploaded: number;
  averageSpeed: number;
  estimatedTotalCompletion: Date;
  uploads: Array<{
    uploadId: string;
    fileName: string;
    progress: number;
    speed: number;
    eta: number;
  }>;
}

export interface PerformanceMetrics {
  uploadId: string;
  averageChunkTime: number;
  minChunkTime: number;
  maxChunkTime: number;
  errorRate: number;
  retryRate: number;
  efficiency: number;
  networkStability: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
}

export interface UploadHistory {
  userId: string;
  periodDays: number;
  totalUploads: number;
  averageSpeed: number;
  successRate: number;
  peakPerformanceTime: string;
  trends: {
    uploadVolume: 'increasing' | 'decreasing' | 'stable';
    speedTrend: 'improving' | 'declining' | 'stable';
    reliabilityTrend: 'improving' | 'declining' | 'stable';
  };
  recommendations: string[];
}

export interface UploadError {
  code: string;
  message: string;
  details?: any;
}

export class UploadProgressTracker {
  private connection = getOracleConnection();
  private webSocketService: any;

  constructor(webSocketService?: any) {
    this.webSocketService = webSocketService;
  }

  /**
   * 計算上傳進度
   */
  async calculateProgress(
    uploadId: string
  ): Promise<Result<ProgressInfo, UploadError>> {
    try {
      // 查詢上傳會話
      const sessionSql = `
        SELECT upload_id, file_name, file_size, total_chunks, chunk_size, status
        FROM upload_sessions
        WHERE upload_id = :upload_id
      `;

      const sessionResult = await this.connection.execute(
        sessionSql,
        { upload_id: uploadId },
        {}
      );
      const session = sessionResult.rows?.[0];

      if (!session) {
        return {
          success: false,
          error: {
            code: 'UPLOAD_NOT_FOUND',
            message: '上傳會話不存在',
          },
        };
      }

      // 查詢已完成分塊
      const chunksSql = `
        SELECT chunk_number, chunk_size, uploaded_at
        FROM upload_chunks
        WHERE upload_id = :upload_id AND status = 'completed'
        ORDER BY chunk_number
      `;

      const chunksResult = await this.connection.execute(
        chunksSql,
        { upload_id: uploadId },
        {}
      );
      const completedChunks = chunksResult.rows || [];

      const uploadedBytes = completedChunks.reduce(
        (total, chunk) => total + chunk.chunk_size,
        0
      );
      const progressPercentage = Math.round(
        (uploadedBytes / session.file_size) * 100
      );

      // 找到下一個要上傳的分塊
      const completedNumbers = completedChunks.map(chunk => chunk.chunk_number);
      let currentChunk: number | null = null;

      for (let i = 1; i <= session.total_chunks; i++) {
        if (!completedNumbers.includes(i)) {
          currentChunk = i;
          break;
        }
      }

      return {
        success: true,
        data: {
          uploadId: session.upload_id,
          fileName: session.file_name,
          totalBytes: session.file_size,
          uploadedBytes,
          totalChunks: session.total_chunks,
          completedChunks: completedChunks.length,
          progressPercentage,
          currentChunk,
          status: session.status || 'uploading',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PROGRESS_CALCULATION_FAILED',
          message: '進度計算失敗',
          details: error,
        },
      };
    }
  }

  /**
   * 計算上傳速度
   */
  async calculateUploadSpeed(
    uploadId: string
  ): Promise<Result<SpeedInfo, UploadError>> {
    try {
      // 查詢最近的分塊上傳記錄（用於計算速度）
      const speedSql = `
        SELECT chunk_number, chunk_size, uploaded_at
        FROM upload_chunks
        WHERE upload_id = :upload_id AND status = 'completed'
        ORDER BY uploaded_at DESC
        FETCH FIRST 10 ROWS ONLY
      `;

      const speedResult = await this.connection.execute(
        speedSql,
        { upload_id: uploadId },
        {}
      );
      const recentChunks = speedResult.rows || [];

      if (recentChunks.length < 2) {
        return {
          success: true,
          data: {
            uploadId,
            currentSpeed: 0,
            averageSpeed: 0,
            speedTrend: 'stable',
            lastChunkTime: recentChunks[0]?.uploaded_at || new Date(),
            throughput: 0,
          },
        };
      }

      // 計算平均速度
      const totalBytes = recentChunks.reduce(
        (sum, chunk) => sum + chunk.chunk_size,
        0
      );
      const timeSpan =
        new Date(recentChunks[0].uploaded_at).getTime() -
        new Date(recentChunks[recentChunks.length - 1].uploaded_at).getTime();

      const averageSpeed = timeSpan > 0 ? totalBytes / (timeSpan / 1000) : 0;

      // 計算當前速度（最近兩個分塊）
      let currentSpeed = 0;
      if (recentChunks.length >= 2) {
        const chunk1 = recentChunks[0];
        const chunk2 = recentChunks[1];
        const timeDiff =
          new Date(chunk1.uploaded_at).getTime() -
          new Date(chunk2.uploaded_at).getTime();
        currentSpeed = timeDiff > 0 ? chunk1.chunk_size / (timeDiff / 1000) : 0;
      }

      // 分析速度趨勢
      let speedTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (recentChunks.length >= 3) {
        const speeds = [];
        for (let i = 0; i < recentChunks.length - 1; i++) {
          const timeDiff =
            new Date(recentChunks[i].uploaded_at).getTime() -
            new Date(recentChunks[i + 1].uploaded_at).getTime();
          if (timeDiff > 0) {
            speeds.push(recentChunks[i].chunk_size / (timeDiff / 1000));
          }
        }

        if (speeds.length >= 2) {
          const recentAvg =
            speeds
              .slice(0, Math.ceil(speeds.length / 2))
              .reduce((a, b) => a + b) / Math.ceil(speeds.length / 2);
          const olderAvg =
            speeds.slice(Math.ceil(speeds.length / 2)).reduce((a, b) => a + b) /
            Math.floor(speeds.length / 2);

          if (recentAvg > olderAvg * 1.1) speedTrend = 'increasing';
          else if (recentAvg < olderAvg * 0.9) speedTrend = 'decreasing';
        }
      }

      const throughput = averageSpeed / (1024 * 1024); // Convert to MB/s

      return {
        success: true,
        data: {
          uploadId,
          currentSpeed,
          averageSpeed,
          speedTrend,
          lastChunkTime: recentChunks[0].uploaded_at,
          throughput,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SPEED_CALCULATION_FAILED',
          message: '速度計算失敗',
          details: error,
        },
      };
    }
  }

  /**
   * 預估完成時間
   */
  async estimateCompletionTime(
    uploadId: string
  ): Promise<Result<CompletionEstimate, UploadError>> {
    try {
      // 查詢進度統計
      const statsSql = `
        SELECT
          s.total_chunks,
          COUNT(c.chunk_number) as completed_chunks,
          AVG(
            EXTRACT(EPOCH FROM (c.uploaded_at - LAG(c.uploaded_at) OVER (ORDER BY c.uploaded_at))) * 1000
          ) as avg_chunk_time,
          STDDEV(
            EXTRACT(EPOCH FROM (c.uploaded_at - LAG(c.uploaded_at) OVER (ORDER BY c.uploaded_at))) * 1000
          ) as time_variance
        FROM upload_sessions s
        LEFT JOIN upload_chunks c ON s.upload_id = c.upload_id AND c.status = 'completed'
        WHERE s.upload_id = :upload_id
        GROUP BY s.total_chunks
      `;

      const statsResult = await this.connection.execute(
        statsSql,
        { upload_id: uploadId },
        {}
      );
      const stats = statsResult.rows?.[0];

      if (!stats || stats.completed_chunks === 0) {
        return {
          success: false,
          error: {
            code: 'INSUFFICIENT_DATA',
            message: '沒有足夠的資料來預估完成時間',
          },
        };
      }

      const remainingChunks = stats.total_chunks - stats.completed_chunks;
      const avgChunkTime = stats.avg_chunk_time || 15000; // 預設 15 秒
      const estimatedTimeRemaining = remainingChunks * avgChunkTime;

      const estimatedCompletionAt = new Date(
        Date.now() + estimatedTimeRemaining
      );

      // 計算信心度（基於時間變異性和樣本數量）
      let confidence = 0.5;
      if (stats.completed_chunks >= 3) {
        const variance = stats.time_variance || avgChunkTime;
        const variabilityRatio = variance / avgChunkTime;
        confidence = Math.max(0.1, Math.min(0.9, 1 - variabilityRatio));

        // 樣本數量越多，信心度越高
        const sampleBonus = Math.min(0.2, stats.completed_chunks * 0.05);
        confidence = Math.min(0.95, confidence + sampleBonus);
      }

      return {
        success: true,
        data: {
          uploadId,
          estimatedTimeRemaining,
          estimatedCompletionAt,
          confidence,
          basedOnChunks: stats.completed_chunks,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ETA_CALCULATION_FAILED',
          message: '完成時間預估失敗',
          details: error,
        },
      };
    }
  }

  /**
   * 訂閱進度更新
   */
  async subscribeToProgress(
    userId: string,
    uploadId: string
  ): Promise<Result<void, UploadError>> {
    try {
      if (!this.webSocketService) {
        return {
          success: false,
          error: {
            code: 'WEBSOCKET_NOT_AVAILABLE',
            message: 'WebSocket 服務不可用',
          },
        };
      }

      await this.webSocketService.subscribe(
        userId,
        `upload_progress_${uploadId}`,
        (data: any) => {
          // 處理進度更新
          console.log(`Progress update for ${uploadId}:`, data);
        }
      );

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SUBSCRIPTION_FAILED',
          message: '訂閱進度更新失敗',
          details: error,
        },
      };
    }
  }

  /**
   * 推送進度更新
   */
  async emitProgress(
    userId: string,
    progressUpdate: ProgressUpdate
  ): Promise<Result<void, UploadError>> {
    try {
      if (!this.webSocketService) {
        return {
          success: false,
          error: {
            code: 'WEBSOCKET_NOT_AVAILABLE',
            message: 'WebSocket 服務不可用',
          },
        };
      }

      await this.webSocketService.emit(
        userId,
        'upload_progress_update',
        progressUpdate
      );

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PROGRESS_EMIT_FAILED',
          message: '進度推送失敗',
          details: error,
        },
      };
    }
  }

  /**
   * 廣播進度給多個用戶
   */
  async broadcastProgress(
    userIds: string[],
    progressUpdate: ProgressUpdate
  ): Promise<Result<void, UploadError>> {
    try {
      if (!this.webSocketService) {
        return {
          success: false,
          error: {
            code: 'WEBSOCKET_NOT_AVAILABLE',
            message: 'WebSocket 服務不可用',
          },
        };
      }

      for (const userId of userIds) {
        await this.webSocketService.emit(
          userId,
          'upload_progress_update',
          progressUpdate
        );
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'BROADCAST_FAILED',
          message: '批次進度廣播失敗',
          details: error,
        },
      };
    }
  }

  /**
   * 追蹤批次進度
   */
  async trackBatchProgress(
    uploadIds: string[]
  ): Promise<Result<BatchProgress, UploadError>> {
    try {
      const batchSql = `
        SELECT
          s.upload_id,
          ROUND((COUNT(c.chunk_number) * 100.0) / s.total_chunks, 2) as progress,
          s.status
        FROM upload_sessions s
        LEFT JOIN upload_chunks c ON s.upload_id = c.upload_id AND c.status = 'completed'
        WHERE s.upload_id IN (${uploadIds.map(() => '?').join(',')})
        GROUP BY s.upload_id, s.total_chunks, s.status
      `;

      const batchResult = await this.connection.execute(batchSql, {}, {});
      const uploads = batchResult.rows || [];

      const completedUploads = uploads.filter(
        upload => upload.status === 'completed'
      ).length;
      const inProgressUploads = uploads.filter(
        upload => upload.status === 'uploading'
      ).length;
      const overallProgress =
        uploads.length > 0
          ? Number(
              (
                uploads.reduce((sum, upload) => sum + upload.progress, 0) /
                uploads.length
              ).toFixed(2)
            )
          : 0;

      return {
        success: true,
        data: {
          totalUploads: uploadIds.length,
          completedUploads,
          inProgressUploads,
          overallProgress,
          uploads: uploads.map(upload => ({
            uploadId: upload.upload_id,
            progress: upload.progress,
            status: upload.status,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'BATCH_TRACKING_FAILED',
          message: '批次進度追蹤失敗',
          details: error,
        },
      };
    }
  }

  /**
   * 生成進度摘要
   */
  async generateProgressSummary(
    userId: string
  ): Promise<Result<ProgressSummary, UploadError>> {
    try {
      const summarySql = `
        SELECT
          s.upload_id,
          s.file_name,
          ROUND((COUNT(c.chunk_number) * 100.0) / s.total_chunks, 2) as progress,
          COALESCE(AVG(c.chunk_size / EXTRACT(EPOCH FROM (c.uploaded_at - LAG(c.uploaded_at) OVER (ORDER BY c.uploaded_at)))), 0) as speed,
          s.status
        FROM upload_sessions s
        LEFT JOIN upload_chunks c ON s.upload_id = c.upload_id AND c.status = 'completed'
        WHERE s.uploaded_by = :user_id AND s.created_at > SYSDATE - 1
        GROUP BY s.upload_id, s.file_name, s.total_chunks, s.status
      `;

      const summaryResult = await this.connection.execute(
        summarySql,
        { user_id: userId },
        {}
      );
      const uploads = summaryResult.rows || [];

      const activeUploads = uploads.filter(
        upload => upload.status === 'uploading'
      ).length;
      const completedUploads = uploads.filter(
        upload => upload.status === 'completed'
      ).length;
      const totalDataUploaded = uploads.reduce(
        (sum, upload) => sum + (upload.progress / 100) * 1048576,
        0
      ); // 假設每個檔案平均1MB
      const averageSpeed =
        uploads.length > 0
          ? uploads.reduce((sum, upload) => sum + (upload.speed || 0), 0) /
            uploads.length
          : 0;

      // 預估總完成時間（基於最慢的上傳）
      const slowestUpload = uploads
        .filter(u => u.status === 'uploading')
        .sort((a, b) => a.progress - b.progress)[0];

      let estimatedTotalCompletion = new Date();
      if (slowestUpload && slowestUpload.speed > 0) {
        const remainingBytes = ((100 - slowestUpload.progress) / 100) * 1048576;
        const remainingTime = (remainingBytes / slowestUpload.speed) * 1000;
        estimatedTotalCompletion = new Date(Date.now() + remainingTime);
      }

      return {
        success: true,
        data: {
          userId,
          activeUploads,
          completedUploads,
          totalDataUploaded,
          averageSpeed,
          estimatedTotalCompletion,
          uploads: uploads.map(upload => ({
            uploadId: upload.upload_id,
            fileName: upload.file_name,
            progress: upload.progress,
            speed: upload.speed || 0,
            eta: upload.speed > 0 ? (100 - upload.progress) / upload.speed : 0,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SUMMARY_GENERATION_FAILED',
          message: '進度摘要生成失敗',
          details: error,
        },
      };
    }
  }

  /**
   * 獲取效能指標
   */
  async getPerformanceMetrics(
    uploadId: string
  ): Promise<Result<PerformanceMetrics, UploadError>> {
    try {
      const metricsSql = `
        SELECT
          AVG(EXTRACT(EPOCH FROM (c.uploaded_at - LAG(c.uploaded_at) OVER (ORDER BY c.uploaded_at))) * 1000) as avg_chunk_time,
          MIN(EXTRACT(EPOCH FROM (c.uploaded_at - LAG(c.uploaded_at) OVER (ORDER BY c.uploaded_at))) * 1000) as min_chunk_time,
          MAX(EXTRACT(EPOCH FROM (c.uploaded_at - LAG(c.uploaded_at) OVER (ORDER BY c.uploaded_at))) * 1000) as max_chunk_time,
          (SELECT COUNT(*) FROM chunk_retry_log WHERE upload_id = :upload_id AND success = 0)::FLOAT /
          (SELECT COUNT(*) FROM upload_chunks WHERE upload_id = :upload_id) as error_rate,
          (SELECT COUNT(*) FROM chunk_retry_log WHERE upload_id = :upload_id)::FLOAT /
          (SELECT COUNT(*) FROM upload_chunks WHERE upload_id = :upload_id) as retry_rate,
          COUNT(*) as total_chunks,
          COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_chunks
        FROM upload_chunks c
        WHERE c.upload_id = :upload_id
      `;

      const metricsResult = await this.connection.execute(
        metricsSql,
        { upload_id: uploadId },
        {}
      );
      const metrics = metricsResult.rows?.[0];

      if (!metrics) {
        return {
          success: false,
          error: {
            code: 'NO_METRICS_DATA',
            message: '沒有效能指標資料',
          },
        };
      }

      const errorRate = (metrics.error_rate || 0) * 100;
      const retryRate = (metrics.retry_rate || 0) * 100;
      const efficiency =
        (metrics.completed_chunks / metrics.total_chunks) * 100;

      // 評估網路穩定性
      let networkStability: 'excellent' | 'good' | 'fair' | 'poor' =
        'excellent';
      if (errorRate > 20 || retryRate > 30) networkStability = 'poor';
      else if (errorRate > 10 || retryRate > 20) networkStability = 'fair';
      else if (errorRate > 5 || retryRate > 10) networkStability = 'good';

      // 生成建議
      const recommendations: string[] = [];
      if (errorRate > 15) {
        recommendations.push('考慮減少分塊大小以降低錯誤率');
      }
      if (retryRate > 25) {
        recommendations.push('網路狀況不穩定，建議稍後重試');
      }
      if (metrics.avg_chunk_time > 30000) {
        recommendations.push('上傳速度較慢，檢查網路連線');
      }
      if (recommendations.length === 0) {
        recommendations.push('上傳效能良好，維持當前設定');
      }

      return {
        success: true,
        data: {
          uploadId,
          averageChunkTime: metrics.avg_chunk_time || 0,
          minChunkTime: metrics.min_chunk_time || 0,
          maxChunkTime: metrics.max_chunk_time || 0,
          errorRate,
          retryRate,
          efficiency,
          networkStability,
          recommendations,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'METRICS_CALCULATION_FAILED',
          message: '效能指標計算失敗',
          details: error,
        },
      };
    }
  }

  /**
   * 分析上傳歷史
   */
  async analyzeUploadHistory(
    userId: string,
    periodDays: number = 30
  ): Promise<Result<UploadHistory, UploadError>> {
    try {
      const historySql = `
        SELECT
          DATE(s.created_at) as date,
          COUNT(*) as total_uploads,
          AVG(s.file_size / EXTRACT(EPOCH FROM (s.updated_at - s.created_at))) as avg_speed,
          AVG(CASE WHEN s.status = 'completed' THEN 1.0 ELSE 0.0 END) as success_rate
        FROM upload_sessions s
        WHERE s.uploaded_by = :user_id
          AND s.created_at > SYSDATE - :period_days
        GROUP BY DATE(s.created_at)
        ORDER BY DATE(s.created_at)
      `;

      const historyResult = await this.connection.execute(
        historySql,
        {
          user_id: userId,
          period_days: periodDays,
        },
        {}
      );

      const dailyStats = historyResult.rows || [];

      if (dailyStats.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_HISTORY_DATA',
            message: '沒有歷史資料',
          },
        };
      }

      const totalUploads = dailyStats.reduce(
        (sum, day) => sum + day.total_uploads,
        0
      );
      const averageSpeed =
        dailyStats.reduce((sum, day) => sum + day.avg_speed, 0) /
        dailyStats.length;
      const successRate =
        dailyStats.reduce((sum, day) => sum + day.success_rate, 0) /
        dailyStats.length;

      // 找到峰值效能時間
      const peakDay = dailyStats.reduce((best, current) =>
        current.avg_speed > best.avg_speed ? current : best
      );
      const peakPerformanceTime = `${peakDay.date} (${Math.round(peakDay.avg_speed / 1024)} KB/s)`;

      // 分析趨勢
      const firstHalf = dailyStats.slice(0, Math.ceil(dailyStats.length / 2));
      const secondHalf = dailyStats.slice(Math.ceil(dailyStats.length / 2));

      const firstHalfAvg =
        firstHalf.reduce((sum, day) => sum + day.total_uploads, 0) /
        firstHalf.length;
      const secondHalfAvg =
        secondHalf.reduce((sum, day) => sum + day.total_uploads, 0) /
        secondHalf.length;

      let uploadVolume: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (secondHalfAvg > firstHalfAvg * 1.1) uploadVolume = 'increasing';
      else if (secondHalfAvg < firstHalfAvg * 0.9) uploadVolume = 'decreasing';

      const recommendations: string[] = [];
      if (successRate < 0.8) {
        recommendations.push('成功率偏低，建議檢查網路環境');
      }
      if (averageSpeed < 100000) {
        // < 100KB/s
        recommendations.push('上傳速度較慢，考慮優化網路設定');
      }
      if (uploadVolume === 'increasing') {
        recommendations.push('上傳量持續增加，考慮升級帶寬');
      }

      return {
        success: true,
        data: {
          userId,
          periodDays,
          totalUploads,
          averageSpeed,
          successRate,
          peakPerformanceTime,
          trends: {
            uploadVolume,
            speedTrend: 'stable', // 簡化實作
            reliabilityTrend: 'stable',
          },
          recommendations,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HISTORY_ANALYSIS_FAILED',
          message: '歷史分析失敗',
          details: error,
        },
      };
    }
  }
}
