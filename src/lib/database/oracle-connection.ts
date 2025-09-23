import oracledb from 'oracledb'

// Oracle連線配置介面
export interface OracleConfig {
  connectString: string
  user: string
  password: string
  poolMin: number
  poolMax: number
  poolIncrement: number
  poolTimeout: number
  enableStatistics: boolean
}

// 健康檢查狀態介面
export interface HealthStatus {
  isHealthy: boolean
  listenPort: number
  databaseStatus: 'STARTING' | 'READY' | 'ERROR'
  lastCheckTime: Date
  errorDetails?: string
}

// 連線池狀態介面
export interface PoolMetrics {
  totalConnections: number
  activeConnections: number
  idleConnections: number
  waitingRequests: number
}

// 結果類型定義
export interface Result<T, E = Error> {
  success: boolean
  data?: T
  error?: E
}

// 連線錯誤類型
export class ConnectionError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message)
    this.name = 'ConnectionError'
  }
}

// 查詢錯誤類型
export class QueryError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message)
    this.name = 'QueryError'
  }
}

// 交易錯誤類型
export class TransactionError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message)
    this.name = 'TransactionError'
  }
}

// 綁定參數類型
export type BindParameters = Record<string, any>

// 交易回呼函數類型
export type TransactionCallback<T> = (connection: oracledb.Connection) => Promise<T>

// 詳細連線池統計
export interface DetailedPoolStatistics {
  basic: {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingRequests: number;
  };
  performance: {
    totalRequests: number;
    queuedRequests: number;
    timeoutRequests: number;
    failedRequests: number;
    averageWaitTime: number;
  };
  configuration: {
    minConnections: number;
    maxConnections: number;
    incrementSize: number;
    timeoutSeconds: number;
  };
}

// 查詢效能指標
export interface QueryPerformanceMetrics {
  totalQueries: number;
  averageExecutionTime: number;
  slowQueries: Array<{
    sql: string;
    executionTime: number;
    timestamp: Date;
  }>;
  errorRate: number;
}

// 連線使用模式
export interface ConnectionUsagePattern {
  peakConnections: number;
  averageConnections: number;
  connectionTurnover: number;
  usageHistory: Array<{
    timestamp: Date;
    activeConnections: number;
  }>;
}

// 即時監控數據
export interface RealtimeMonitoringData {
  timestamp: Date;
  poolStatus: {
    isHealthy: boolean;
    totalConnections: number;
    activeConnections: number;
  };
  performance: {
    queriesPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

// 效能警報
export interface PerformanceAlert {
  type: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
}

// 斷路器狀態
export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: Date | null;
  nextRetryTime: Date | null;
}

export class OracleConnectionManager {
  private pool: oracledb.Pool | null = null
  private config: OracleConfig | null = null
  private isInitialized = false
  private queryMetrics: QueryPerformanceMetrics = {
    totalQueries: 0,
    averageExecutionTime: 0,
    slowQueries: [],
    errorRate: 0
  }
  private usageHistory: Array<{timestamp: Date; activeConnections: number}> = []
  private performanceAlerts: PerformanceAlert[] = []
  private circuitBreaker: CircuitBreakerState = {
    isOpen: false,
    failureCount: 0,
    lastFailureTime: null,
    nextRetryTime: null
  }
  private queryStartTimes: Map<string, number> = new Map()
  private connectionRequests = 0
  private connectionFailures = 0

  /**
   * 初始化Oracle連線池
   */
  async initialize(config: OracleConfig): Promise<Result<void, ConnectionError>> {
    try {
      this.config = config

      // 設定Oracle客戶端
      oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT
      oracledb.autoCommit = false

      // 建立連線池
      this.pool = await oracledb.createPool({
        connectString: config.connectString,
        user: config.user,
        password: config.password,
        poolMin: config.poolMin,
        poolMax: config.poolMax,
        poolIncrement: config.poolIncrement,
        poolTimeout: config.poolTimeout,
        enableStatistics: config.enableStatistics
      })

      this.isInitialized = true

      return { success: true }
    } catch (error) {
      const connectionError = new ConnectionError(
        `Failed to initialize Oracle connection pool: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error))
      )
      return { success: false, error: connectionError }
    }
  }

  /**
   * 執行SQL查詢
   */
  async executeQuery<T>(sql: string, binds: BindParameters = {}): Promise<Result<T[], QueryError>> {
    if (!this.isInitialized || !this.pool) {
      return {
        success: false,
        error: new QueryError('Oracle connection manager not initialized')
      }
    }

    // 檢查斷路器狀態
    if (this.circuitBreaker.isOpen) {
      const now = new Date()
      if (this.circuitBreaker.nextRetryTime && now < this.circuitBreaker.nextRetryTime) {
        return {
          success: false,
          error: new QueryError('Circuit breaker is open - service temporarily unavailable')
        }
      } else {
        // 重置斷路器
        this.circuitBreaker.isOpen = false
        this.circuitBreaker.failureCount = 0
      }
    }

    let connection: oracledb.Connection | null = null
    const startTime = Date.now()
    let hasError = false

    try {
      this.connectionRequests++
      connection = await this.pool.getConnection()
      const result = await connection.execute(sql, binds)

      const executionTime = Date.now() - startTime
      this.updateQueryMetrics(executionTime, hasError)
      this.recordUsage()

      return {
        success: true,
        data: result.rows as T[]
      }
    } catch (error) {
      hasError = true
      const executionTime = Date.now() - startTime
      this.updateQueryMetrics(executionTime, hasError)

      const queryError = new QueryError(
        `Query execution failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error))
      )

      // 處理Oracle特定錯誤
      if (error instanceof Error) {
        this.handleOracleError(error)
      }

      return { success: false, error: queryError }
    } finally {
      if (connection) {
        try {
          await connection.close()
        } catch (closeError) {
          console.error('Failed to close Oracle connection:', closeError)
        }
      }
    }
  }

  /**
   * 執行查詢並返回單一結果
   */
  async executeOne<T>(sql: string, binds: BindParameters = {}): Promise<Result<T | null, QueryError>> {
    const result = await this.executeQuery<T>(sql, binds)

    if (!result.success) {
      return result
    }

    const data = result.data && result.data.length > 0 ? result.data[0] : null
    return { success: true, data }
  }

  /**
   * 執行交易
   */
  async executeTransaction<T>(
    callback: TransactionCallback<T>
  ): Promise<Result<T, TransactionError>> {
    if (!this.isInitialized || !this.pool) {
      return {
        success: false,
        error: new TransactionError('Oracle connection manager not initialized')
      }
    }

    let connection: oracledb.Connection | null = null

    try {
      connection = await this.pool.getConnection()

      // 開始交易
      await connection.execute('BEGIN')

      // 執行交易邏輯
      const result = await callback(connection)

      // 提交交易
      await connection.execute('COMMIT')

      return { success: true, data: result }
    } catch (error) {
      // 回滾交易
      if (connection) {
        try {
          await connection.execute('ROLLBACK')
        } catch (rollbackError) {
          console.error('Failed to rollback transaction:', rollbackError)
        }
      }

      const transactionError = new TransactionError(
        `Transaction failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error))
      )
      return { success: false, error: transactionError }
    } finally {
      if (connection) {
        try {
          await connection.close()
        } catch (closeError) {
          console.error('Failed to close Oracle connection:', closeError)
        }
      }
    }
  }

  /**
   * 健康檢查
   */
  async healthCheck(): Promise<Result<HealthStatus, Error>> {
    const checkTime = new Date()

    if (!this.isInitialized || !this.pool) {
      return {
        success: false,
        data: {
          isHealthy: false,
          listenPort: 1521,
          databaseStatus: 'ERROR',
          lastCheckTime: checkTime,
          errorDetails: 'Oracle connection manager not initialized'
        }
      }
    }

    let connection: oracledb.Connection | null = null

    try {
      connection = await this.pool.getConnection()
      await connection.execute('SELECT 1 FROM dual')

      return {
        success: true,
        data: {
          isHealthy: true,
          listenPort: 1521,
          databaseStatus: 'READY',
          lastCheckTime: checkTime
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      return {
        success: false,
        data: {
          isHealthy: false,
          listenPort: 1521,
          databaseStatus: 'ERROR',
          lastCheckTime: checkTime,
          errorDetails: errorMessage
        }
      }
    } finally {
      if (connection) {
        try {
          await connection.close()
        } catch (closeError) {
          console.error('Failed to close Oracle connection:', closeError)
        }
      }
    }
  }

  /**
   * 取得連線池狀態
   */
  getPoolStatus(): PoolMetrics {
    if (!this.pool) {
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        waitingRequests: 0
      }
    }

    return {
      totalConnections: this.pool.connectionsOpen || 0,
      activeConnections: this.pool.connectionsInUse || 0,
      idleConnections: (this.pool.connectionsOpen || 0) - (this.pool.connectionsInUse || 0),
      waitingRequests: 0 // Oracle driver不直接提供此資訊
    }
  }

  /**
   * 關閉連線池
   */
  async shutdown(): Promise<Result<void, Error>> {
    if (!this.pool) {
      return { success: true }
    }

    try {
      await this.pool.close()
      this.pool = null
      this.isInitialized = false
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      }
    }
  }

  /**
   * 驗證連線
   */
  async validateConnection(): Promise<boolean> {
    if (!this.isInitialized || !this.pool) {
      return false
    }

    try {
      const connection = await this.pool.getConnection()
      await connection.execute('SELECT 1 FROM dual')
      await connection.close()
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * 獲取詳細連線池統計
   */
  getDetailedPoolStatistics(): DetailedPoolStatistics {
    if (!this.pool) {
      return {
        basic: { totalConnections: 0, activeConnections: 0, idleConnections: 0, waitingRequests: 0 },
        performance: { totalRequests: 0, queuedRequests: 0, timeoutRequests: 0, failedRequests: 0, averageWaitTime: 0 },
        configuration: { minConnections: 0, maxConnections: 0, incrementSize: 0, timeoutSeconds: 0 }
      }
    }

    const basic = this.getPoolStatus()

    return {
      basic,
      performance: {
        totalRequests: this.connectionRequests,
        queuedRequests: 0, // Oracle driver doesn't expose this directly
        timeoutRequests: 0,
        failedRequests: this.connectionFailures,
        averageWaitTime: this.calculateAverageWaitTime()
      },
      configuration: {
        minConnections: this.config?.poolMin || 0,
        maxConnections: this.config?.poolMax || 0,
        incrementSize: this.config?.poolIncrement || 0,
        timeoutSeconds: this.config?.poolTimeout || 0
      }
    }
  }

  /**
   * 獲取查詢效能指標
   */
  getQueryPerformanceMetrics(): QueryPerformanceMetrics {
    return { ...this.queryMetrics }
  }

  /**
   * 獲取連線使用模式
   */
  getConnectionUsagePattern(): ConnectionUsagePattern {
    const activeConnections = this.usageHistory.map(h => h.activeConnections)

    return {
      peakConnections: Math.max(...activeConnections, 0),
      averageConnections: activeConnections.length > 0
        ? activeConnections.reduce((sum, count) => sum + count, 0) / activeConnections.length
        : 0,
      connectionTurnover: this.calculateConnectionTurnover(),
      usageHistory: [...this.usageHistory]
    }
  }

  /**
   * 獲取即時監控數據
   */
  getRealtimeMonitoringData(): RealtimeMonitoringData {
    const poolStatus = this.getPoolStatus()

    return {
      timestamp: new Date(),
      poolStatus: {
        isHealthy: this.isInitialized && !this.circuitBreaker.isOpen,
        totalConnections: poolStatus.totalConnections,
        activeConnections: poolStatus.activeConnections
      },
      performance: {
        queriesPerSecond: this.calculateQueriesPerSecond(),
        averageResponseTime: this.queryMetrics.averageExecutionTime,
        errorRate: this.queryMetrics.errorRate
      }
    }
  }

  /**
   * 獲取效能警報
   */
  getPerformanceAlerts(): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = []
    const poolStatus = this.getPoolStatus()

    // 高連線使用率警報
    const usageRate = poolStatus.totalConnections > 0
      ? poolStatus.activeConnections / poolStatus.totalConnections
      : 0

    if (usageRate > 0.9) {
      alerts.push({
        type: 'WARNING',
        message: 'High connection usage detected',
        threshold: 0.9,
        currentValue: usageRate,
        timestamp: new Date()
      })
    }

    // 慢查詢警報
    if (this.queryMetrics.averageExecutionTime > 1000) {
      alerts.push({
        type: 'WARNING',
        message: 'High average query execution time',
        threshold: 1000,
        currentValue: this.queryMetrics.averageExecutionTime,
        timestamp: new Date()
      })
    }

    return alerts
  }

  /**
   * 獲取斷路器狀態
   */
  getCircuitBreakerState(): CircuitBreakerState {
    return { ...this.circuitBreaker }
  }

  /**
   * 處理Oracle錯誤
   */
  handleOracleError(error: Error): {
    errorCode: string;
    isRetryable: boolean;
    suggestedAction: string;
  } {
    const errorMessage = error.message
    let errorCode = 'UNKNOWN'

    // 提取Oracle錯誤碼
    const oracleErrorMatch = errorMessage.match(/ORA-(\d+)/)
    if (oracleErrorMatch) {
      errorCode = `ORA-${oracleErrorMatch[1]}`
    }

    // 判斷是否可重試
    const retryableErrors = ['ORA-12541', 'ORA-12545', 'ORA-03113', 'ORA-03114']
    const isRetryable = retryableErrors.includes(errorCode)

    // 提供建議操作
    const suggestions: Record<string, string> = {
      'ORA-00001': 'Check for duplicate values in unique constraints',
      'ORA-01017': 'Verify username and password',
      'ORA-12541': 'Check if Oracle listener is running',
      'ORA-12514': 'Verify service name in connection string',
      'ORA-28001': 'Password has expired, please reset'
    }

    const suggestedAction = suggestions[errorCode] || 'Check Oracle error documentation'

    // 更新斷路器狀態
    this.updateCircuitBreaker(isRetryable)

    return {
      errorCode,
      isRetryable,
      suggestedAction
    }
  }

  // 私有輔助方法

  private calculateAverageWaitTime(): number {
    // 簡化計算 - 實際實作需要更複雜的統計
    return this.connectionFailures > 0 ? 100 : 10
  }

  private calculateConnectionTurnover(): number {
    // 連線週轉率計算
    return this.connectionRequests > 0 ? this.connectionRequests / 60 : 0
  }

  private calculateQueriesPerSecond(): number {
    // 簡化的 QPS 計算
    return this.queryMetrics.totalQueries / 60
  }

  private updateCircuitBreaker(isRetryableError: boolean): void {
    if (isRetryableError) {
      this.circuitBreaker.failureCount++
      this.circuitBreaker.lastFailureTime = new Date()

      // 達到失敗閾值時打開斷路器
      if (this.circuitBreaker.failureCount >= 5) {
        this.circuitBreaker.isOpen = true
        this.circuitBreaker.nextRetryTime = new Date(Date.now() + 60000) // 1分鐘後重試
      }
    }
  }

  private recordUsage(): void {
    const poolStatus = this.getPoolStatus()
    this.usageHistory.push({
      timestamp: new Date(),
      activeConnections: poolStatus.activeConnections
    })

    // 保持最近1小時的記錄
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    this.usageHistory = this.usageHistory.filter(h => h.timestamp > oneHourAgo)
  }

  private updateQueryMetrics(executionTime: number, hasError: boolean): void {
    this.queryMetrics.totalQueries++

    // 更新平均執行時間
    const totalTime = this.queryMetrics.averageExecutionTime * (this.queryMetrics.totalQueries - 1) + executionTime
    this.queryMetrics.averageExecutionTime = totalTime / this.queryMetrics.totalQueries

    // 記錄慢查詢
    if (executionTime > 1000) {
      this.queryMetrics.slowQueries.push({
        sql: 'query', // 在實際實作中應該記錄真實SQL
        executionTime,
        timestamp: new Date()
      })

      // 只保留最近的10個慢查詢
      if (this.queryMetrics.slowQueries.length > 10) {
        this.queryMetrics.slowQueries.shift()
      }
    }

    // 更新錯誤率
    if (hasError) {
      this.connectionFailures++
    }
    this.queryMetrics.errorRate = this.connectionFailures / this.queryMetrics.totalQueries
  }
}

// 建立單例實例
let oracleConnectionInstance: OracleConnectionManager | null = null

export function getOracleConnection(): OracleConnectionManager {
  if (!oracleConnectionInstance) {
    oracleConnectionInstance = new OracleConnectionManager()
  }
  return oracleConnectionInstance
}