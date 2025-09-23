import oracledb from 'oracledb'

// Types for monitoring and diagnostics
interface DatabaseHealth {
  isHealthy: boolean
  status: string
  metrics?: PerformanceMetrics
  error?: string
  checkedAt: Date
}

interface PerformanceMetrics {
  cpuUsage: number
  memoryUsage: number
  sessionCount: number
  responseTime: number
  diskIOPS?: number
}

interface LogEntry {
  timestamp: Date
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
  message: string
  component?: string
}

interface SlowQuery {
  sqlText: string
  executionTime: number
  executionCount: number
  avgExecutionTime: number
  lastExecuted: Date
}

interface ExecutionPlan {
  sqlText: string
  executionPlan: string[]
  estimatedCost: number
  estimatedRows: number
  planHash: string
}

interface BlockingSession {
  blockingSessionId: number
  blockedSessionId: number
  lockType: string
  objectName: string
  lockId: string
  waitTime: number
}

interface PerformanceReport {
  generatedAt: Date
  timeRange: {
    start: Date
    end: Date
  }
  statistics: Array<{
    metric: string
    value: number
    unit?: string
  }>
  topWaitEvents: Array<{
    event: string
    totalWaitTime: number
    waitCount: number
    avgWaitTime: number
  }>
  topSQLStatements: Array<{
    sqlText: string
    executions: number
    totalTime: number
    avgTime: number
  }>
}

interface SessionInfo {
  sessionId: number
  username: string
  status: 'ACTIVE' | 'INACTIVE' | 'KILLED'
  currentOperation?: string
  currentObject?: string
  logonTime: Date
  lastActivity: Date
  cpuTime: number
}

interface TablespaceInfo {
  name: string
  totalSizeMB: number
  usedSizeMB: number
  freeSizeMB: number
  usagePercentage: number
  status: 'ONLINE' | 'OFFLINE' | 'READ ONLY'
}

interface LockWait {
  sessionId: number
  event: string
  waitTime: number
  objectName: string
  lockMode: string
}

interface Alert {
  id: string
  type: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  message: string
  timestamp: Date
  resolved: boolean
  resolvedAt?: Date
}

interface AlertResult {
  success: boolean
  notificationsSent: number
  error?: string
}

interface ResolveResult {
  success: boolean
  resolvedAt: Date
  error?: string
}

/**
 * Oracle資料庫健康監控器
 * 負責監控資料庫健康狀態和效能指標
 */
export class OracleHealthMonitor {
  private connectionConfig: any

  constructor() {
    this.connectionConfig = {
      user: process.env.ORACLE_USER || 'pcm_user',
      password: process.env.ORACLE_PASSWORD || 'pcm_pass123',
      connectString: process.env.ORACLE_CONNECT_STRING || 'localhost:1521/XE'
    }
  }

  /**
   * 檢查資料庫健康狀態
   */
  async checkDatabaseHealth(): Promise<DatabaseHealth> {
    let connection: oracledb.Connection | undefined

    try {
      connection = await oracledb.getConnection(this.connectionConfig)

      // 檢查基本資料庫狀態
      const statusResult = await connection.execute(`
        SELECT
          status,
          database_role,
          log_mode,
          open_mode
        FROM v$database
      `)

      if (!statusResult.rows || statusResult.rows.length === 0) {
        return {
          isHealthy: false,
          status: 'UNKNOWN',
          error: 'Unable to retrieve database status',
          checkedAt: new Date()
        }
      }

      const [status, role, logMode, openMode] = statusResult.rows[0] as any[]

      // 獲取效能指標
      const metrics = await this.getPerformanceMetrics()

      return {
        isHealthy: status === 'OPEN' && openMode === 'READ WRITE',
        status: `${status} (${openMode})`,
        metrics,
        checkedAt: new Date()
      }

    } catch (error) {
      return {
        isHealthy: false,
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error),
        checkedAt: new Date()
      }
    } finally {
      if (connection) {
        await connection.close()
      }
    }
  }

  /**
   * 獲取效能指標
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    let connection: oracledb.Connection | undefined

    try {
      connection = await oracledb.getConnection(this.connectionConfig)

      // 獲取各種效能指標
      const metricsResult = await connection.execute(`
        SELECT
          (SELECT value FROM v$sysstat WHERE name = 'CPU used by this session') as cpu_time,
          (SELECT count(*) FROM v$session WHERE status = 'ACTIVE') as active_sessions,
          (SELECT value FROM v$sysstat WHERE name = 'physical reads') as physical_reads,
          (SELECT value FROM v$sysstat WHERE name = 'db block gets') as block_gets,
          (SELECT value FROM v$sysstat WHERE name = 'consistent gets') as consistent_gets
        FROM dual
      `)

      if (!metricsResult.rows || metricsResult.rows.length === 0) {
        throw new Error('Unable to retrieve performance metrics')
      }

      const [cpuTime, activeSessions, physicalReads, blockGets, consistentGets] = metricsResult.rows[0] as any[]

      // 計算衍生指標
      const totalSessions = activeSessions || 0
      const cpuUsage = Math.min((cpuTime || 0) / 1000000, 100) // 轉換為百分比
      const hitRatio = blockGets + consistentGets > 0
        ? ((blockGets + consistentGets - physicalReads) / (blockGets + consistentGets)) * 100
        : 0

      return {
        cpuUsage: parseFloat(cpuUsage.toFixed(2)),
        memoryUsage: parseFloat(hitRatio.toFixed(2)), // 使用buffer hit ratio作為記憶體使用率的近似值
        sessionCount: totalSessions,
        responseTime: cpuTime || 0, // CPU時間作為回應時間的指標
        diskIOPS: physicalReads || 0
      }

    } catch (error) {
      console.error('Failed to get performance metrics:', error)
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        sessionCount: 0,
        responseTime: 0
      }
    } finally {
      if (connection) {
        await connection.close()
      }
    }
  }
}

/**
 * Oracle日誌管理器
 * 負責收集和分析Oracle日誌
 */
export class OracleLogManager {
  private connectionConfig: any

  constructor() {
    this.connectionConfig = {
      user: process.env.ORACLE_USER || 'pcm_user',
      password: process.env.ORACLE_PASSWORD || 'pcm_pass123',
      connectString: process.env.ORACLE_CONNECT_STRING || 'localhost:1521/XE'
    }
  }

  /**
   * 獲取最近的告警日誌
   */
  async getRecentAlertLogs(hours = 24): Promise<LogEntry[]> {
    let connection: oracledb.Connection | undefined

    try {
      connection = await oracledb.getConnection(this.connectionConfig)

      // 由於Oracle XE可能沒有直接存取alert log的權限，我們模擬從system logs獲取
      const logsResult = await connection.execute(`
        SELECT
          timestamp,
          'INFO' as level,
          message_text as message,
          'Oracle' as component
        FROM v$diag_info
        WHERE timestamp >= SYSDATE - :hours/24
        ORDER BY timestamp DESC
      `, { hours })

      const logs: LogEntry[] = []

      if (logsResult.rows) {
        for (const row of logsResult.rows) {
          const [timestamp, level, message, component] = row as any[]
          logs.push({
            timestamp: new Date(timestamp),
            level: level as LogEntry['level'],
            message: message || '',
            component: component || 'Oracle'
          })
        }
      }

      return logs

    } catch (error) {
      console.error('Failed to get alert logs:', error)
      return []
    } finally {
      if (connection) {
        await connection.close()
      }
    }
  }

  /**
   * 根據嚴重性級別過濾日誌
   */
  async getLogsByLevel(level: LogEntry['level'], hours = 24): Promise<LogEntry[]> {
    const allLogs = await this.getRecentAlertLogs(hours)
    return allLogs.filter(log => log.level === level)
  }

  /**
   * 獲取慢查詢報告
   */
  async getSlowQueries(minExecutionTime = 5000): Promise<SlowQuery[]> {
    let connection: oracledb.Connection | undefined

    try {
      connection = await oracledb.getConnection(this.connectionConfig)

      const slowQueriesResult = await connection.execute(`
        SELECT
          sql_text,
          elapsed_time / 1000000 as execution_time_seconds,
          executions,
          elapsed_time / executions / 1000000 as avg_execution_time,
          last_active_time
        FROM v$sql
        WHERE elapsed_time / 1000000 > :minTime
          AND executions > 0
        ORDER BY elapsed_time DESC
        FETCH FIRST 20 ROWS ONLY
      `, { minTime: minExecutionTime / 1000 })

      const slowQueries: SlowQuery[] = []

      if (slowQueriesResult.rows) {
        for (const row of slowQueriesResult.rows) {
          const [sqlText, executionTime, executions, avgExecutionTime, lastExecuted] = row as any[]
          slowQueries.push({
            sqlText: sqlText || '',
            executionTime: parseFloat(executionTime || 0),
            executionCount: executions || 0,
            avgExecutionTime: parseFloat(avgExecutionTime || 0),
            lastExecuted: new Date(lastExecuted)
          })
        }
      }

      return slowQueries

    } catch (error) {
      console.error('Failed to get slow queries:', error)
      return []
    } finally {
      if (connection) {
        await connection.close()
      }
    }
  }
}

/**
 * Oracle診斷工具
 * 負責進階診斷和效能分析
 */
export class OracleDiagnosticTools {
  private connectionConfig: any

  constructor() {
    this.connectionConfig = {
      user: process.env.ORACLE_USER || 'pcm_user',
      password: process.env.ORACLE_PASSWORD || 'pcm_pass123',
      connectString: process.env.ORACLE_CONNECT_STRING || 'localhost:1521/XE'
    }
  }

  /**
   * 分析查詢執行計畫
   */
  async explainQuery(sqlText: string): Promise<ExecutionPlan> {
    let connection: oracledb.Connection | undefined

    try {
      connection = await oracledb.getConnection(this.connectionConfig)

      // 清理執行計畫表
      try {
        await connection.execute(`DELETE FROM plan_table WHERE statement_id = 'EXPLAIN_PLAN_TEST'`)
      } catch {
        // 忽略錯誤，表可能不存在
      }

      // 執行EXPLAIN PLAN
      await connection.execute(`
        EXPLAIN PLAN
        SET STATEMENT_ID = 'EXPLAIN_PLAN_TEST'
        FOR ${sqlText}
      `)

      // 獲取執行計畫
      const planResult = await connection.execute(`
        SELECT
          LPAD(' ', 2 * level) || operation || ' ' || options || ' ' || object_name as plan_line,
          cost,
          cardinality,
          plan_hash_value
        FROM plan_table
        WHERE statement_id = 'EXPLAIN_PLAN_TEST'
        CONNECT BY PRIOR id = parent_id
        START WITH id = 0
        ORDER SIBLINGS BY position
      `)

      const planLines: string[] = []
      let totalCost = 0
      let estimatedRows = 0
      let planHash = ''

      if (planResult.rows) {
        for (const row of planResult.rows) {
          const [planLine, cost, cardinality, hashValue] = row as any[]
          planLines.push(planLine || '')
          totalCost = Math.max(totalCost, cost || 0)
          estimatedRows += cardinality || 0
          if (!planHash) planHash = hashValue || ''
        }
      }

      return {
        sqlText,
        executionPlan: planLines,
        estimatedCost: totalCost,
        estimatedRows,
        planHash
      }

    } catch (error) {
      console.error('Failed to explain query:', error)
      return {
        sqlText,
        executionPlan: [`Error: ${error instanceof Error ? error.message : String(error)}`],
        estimatedCost: 0,
        estimatedRows: 0,
        planHash: ''
      }
    } finally {
      if (connection) {
        await connection.close()
      }
    }
  }

  /**
   * 獲取阻塞會話
   */
  async getBlockingSessions(): Promise<BlockingSession[]> {
    let connection: oracledb.Connection | undefined

    try {
      connection = await oracledb.getConnection(this.connectionConfig)

      const blockingResult = await connection.execute(`
        SELECT
          l1.sid as blocking_session,
          l2.sid as blocked_session,
          l1.type as lock_type,
          o.object_name,
          l1.id1,
          l2.ctime as wait_time
        FROM v$lock l1, v$lock l2, dba_objects o
        WHERE l1.block = 1
          AND l2.request > 0
          AND l1.id1 = l2.id1
          AND l1.id2 = l2.id2
          AND l1.object_id = o.object_id (+)
      `)

      const blockingSessions: BlockingSession[] = []

      if (blockingResult.rows) {
        for (const row of blockingResult.rows) {
          const [blockingSessionId, blockedSessionId, lockType, objectName, lockId, waitTime] = row as any[]
          blockingSessions.push({
            blockingSessionId: blockingSessionId || 0,
            blockedSessionId: blockedSessionId || 0,
            lockType: lockType || '',
            objectName: objectName || '',
            lockId: lockId || '',
            waitTime: waitTime || 0
          })
        }
      }

      return blockingSessions

    } catch (error) {
      console.error('Failed to get blocking sessions:', error)
      return []
    } finally {
      if (connection) {
        await connection.close()
      }
    }
  }

  /**
   * 生成效能報告
   */
  async generatePerformanceReport(hours = 1): Promise<PerformanceReport> {
    let connection: oracledb.Connection | undefined

    try {
      connection = await oracledb.getConnection(this.connectionConfig)

      const endTime = new Date()
      const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000)

      // 獲取統計資料
      const statsResult = await connection.execute(`
        SELECT
          name,
          value
        FROM v$sysstat
        WHERE name IN (
          'CPU used by this session',
          'physical reads',
          'db block gets',
          'consistent gets',
          'redo size',
          'user commits',
          'user rollbacks'
        )
      `)

      const statistics = []
      if (statsResult.rows) {
        for (const row of statsResult.rows) {
          const [name, value] = row as any[]
          statistics.push({
            metric: name || '',
            value: parseFloat(value || 0)
          })
        }
      }

      // 獲取等待事件
      const waitEventsResult = await connection.execute(`
        SELECT
          event,
          total_waits,
          total_timeouts,
          time_waited
        FROM v$system_event
        WHERE total_waits > 0
        ORDER BY time_waited DESC
        FETCH FIRST 10 ROWS ONLY
      `)

      const topWaitEvents = []
      if (waitEventsResult.rows) {
        for (const row of waitEventsResult.rows) {
          const [event, totalWaits, totalTimeouts, timeWaited] = row as any[]
          topWaitEvents.push({
            event: event || '',
            totalWaitTime: parseFloat(timeWaited || 0),
            waitCount: parseInt(totalWaits || 0),
            avgWaitTime: totalWaits > 0 ? parseFloat(timeWaited || 0) / parseInt(totalWaits || 1) : 0
          })
        }
      }

      // 獲取TOP SQL
      const topSQLResult = await connection.execute(`
        SELECT
          sql_text,
          executions,
          elapsed_time / 1000000 as total_time,
          elapsed_time / executions / 1000000 as avg_time
        FROM v$sql
        WHERE executions > 0
        ORDER BY elapsed_time DESC
        FETCH FIRST 10 ROWS ONLY
      `)

      const topSQLStatements = []
      if (topSQLResult.rows) {
        for (const row of topSQLResult.rows) {
          const [sqlText, executions, totalTime, avgTime] = row as any[]
          topSQLStatements.push({
            sqlText: (sqlText || '').substring(0, 100) + '...', // 截斷長SQL
            executions: parseInt(executions || 0),
            totalTime: parseFloat(totalTime || 0),
            avgTime: parseFloat(avgTime || 0)
          })
        }
      }

      return {
        generatedAt: new Date(),
        timeRange: { start: startTime, end: endTime },
        statistics,
        topWaitEvents,
        topSQLStatements
      }

    } catch (error) {
      console.error('Failed to generate performance report:', error)
      return {
        generatedAt: new Date(),
        timeRange: { start: new Date(), end: new Date() },
        statistics: [],
        topWaitEvents: [],
        topSQLStatements: []
      }
    } finally {
      if (connection) {
        await connection.close()
      }
    }
  }
}

/**
 * Oracle即時監控器
 * 負責即時監控和狀態追蹤
 */
export class OracleRealtimeMonitor {
  private connectionConfig: any

  constructor() {
    this.connectionConfig = {
      user: process.env.ORACLE_USER || 'pcm_user',
      password: process.env.ORACLE_PASSWORD || 'pcm_pass123',
      connectString: process.env.ORACLE_CONNECT_STRING || 'localhost:1521/XE'
    }
  }

  /**
   * 獲取當前會話資訊
   */
  async getCurrentSessions(): Promise<SessionInfo[]> {
    let connection: oracledb.Connection | undefined

    try {
      connection = await oracledb.getConnection(this.connectionConfig)

      const sessionsResult = await connection.execute(`
        SELECT
          s.sid,
          s.username,
          s.status,
          s.sql_id,
          s.logon_time,
          s.last_call_et,
          s.process
        FROM v$session s
        WHERE s.type = 'USER'
          AND s.username IS NOT NULL
        ORDER BY s.logon_time DESC
      `)

      const sessions: SessionInfo[] = []

      if (sessionsResult.rows) {
        for (const row of sessionsResult.rows) {
          const [sid, username, status, sqlId, logonTime, lastCallEt, process] = row as any[]
          sessions.push({
            sessionId: sid || 0,
            username: username || '',
            status: status as SessionInfo['status'],
            currentOperation: sqlId || undefined,
            logonTime: new Date(logonTime),
            lastActivity: new Date(Date.now() - (lastCallEt || 0) * 1000),
            cpuTime: 0 // 需要額外查詢獲取
          })
        }
      }

      return sessions

    } catch (error) {
      console.error('Failed to get current sessions:', error)
      return []
    } finally {
      if (connection) {
        await connection.close()
      }
    }
  }

  /**
   * 獲取表空間使用率
   */
  async getTablespaceUsage(): Promise<TablespaceInfo[]> {
    let connection: oracledb.Connection | undefined

    try {
      connection = await oracledb.getConnection(this.connectionConfig)

      const tablespaceResult = await connection.execute(`
        SELECT
          ts.tablespace_name,
          ts.status,
          NVL(df.total_size, 0) as total_size,
          NVL(df.total_size - fs.free_size, 0) as used_size,
          NVL(fs.free_size, 0) as free_size,
          CASE
            WHEN df.total_size > 0 THEN
              ROUND((df.total_size - NVL(fs.free_size, 0)) / df.total_size * 100, 2)
            ELSE 0
          END as usage_percentage
        FROM dba_tablespaces ts
        LEFT JOIN (
          SELECT
            tablespace_name,
            SUM(bytes) / 1024 / 1024 as total_size
          FROM dba_data_files
          GROUP BY tablespace_name
        ) df ON ts.tablespace_name = df.tablespace_name
        LEFT JOIN (
          SELECT
            tablespace_name,
            SUM(bytes) / 1024 / 1024 as free_size
          FROM dba_free_space
          GROUP BY tablespace_name
        ) fs ON ts.tablespace_name = fs.tablespace_name
        ORDER BY usage_percentage DESC
      `)

      const tablespaces: TablespaceInfo[] = []

      if (tablespaceResult.rows) {
        for (const row of tablespaceResult.rows) {
          const [name, status, totalSize, usedSize, freeSize, usagePercentage] = row as any[]
          tablespaces.push({
            name: name || '',
            totalSizeMB: parseFloat(totalSize || 0),
            usedSizeMB: parseFloat(usedSize || 0),
            freeSizeMB: parseFloat(freeSize || 0),
            usagePercentage: parseFloat(usagePercentage || 0),
            status: status as TablespaceInfo['status']
          })
        }
      }

      return tablespaces

    } catch (error) {
      console.error('Failed to get tablespace usage:', error)
      return []
    } finally {
      if (connection) {
        await connection.close()
      }
    }
  }

  /**
   * 獲取鎖等待資訊
   */
  async getLockWaits(): Promise<LockWait[]> {
    let connection: oracledb.Connection | undefined

    try {
      connection = await oracledb.getConnection(this.connectionConfig)

      const lockWaitsResult = await connection.execute(`
        SELECT
          s.sid,
          w.event,
          w.wait_time,
          o.object_name,
          DECODE(l.lmode,
            0, 'None',
            1, 'Null',
            2, 'Row-S',
            3, 'Row-X',
            4, 'Share',
            5, 'S/Row-X',
            6, 'Exclusive',
            'Unknown') as lock_mode
        FROM v$session_wait w, v$session s, v$lock l, dba_objects o
        WHERE w.sid = s.sid
          AND s.sid = l.sid (+)
          AND l.id1 = o.object_id (+)
          AND w.wait_time = 0
          AND w.event LIKE '%lock%'
      `)

      const lockWaits: LockWait[] = []

      if (lockWaitsResult.rows) {
        for (const row of lockWaitsResult.rows) {
          const [sessionId, event, waitTime, objectName, lockMode] = row as any[]
          lockWaits.push({
            sessionId: sessionId || 0,
            event: event || '',
            waitTime: parseFloat(waitTime || 0),
            objectName: objectName || '',
            lockMode: lockMode || ''
          })
        }
      }

      return lockWaits

    } catch (error) {
      console.error('Failed to get lock waits:', error)
      return []
    } finally {
      if (connection) {
        await connection.close()
      }
    }
  }
}

/**
 * Oracle告警系統
 * 負責監控閾值和發送告警
 */
export class OracleAlertSystem {
  private alerts: Map<string, Alert> = new Map()

  /**
   * 檢查指標閾值並生成告警
   */
  async checkMetricThresholds(metrics: PerformanceMetrics): Promise<Alert[]> {
    const alerts: Alert[] = []
    const now = new Date()

    // CPU使用率告警
    if (metrics.cpuUsage > 90) {
      alerts.push({
        id: `cpu_high_${now.getTime()}`,
        type: 'CPU_HIGH',
        severity: 'CRITICAL',
        message: `CPU使用率過高: ${metrics.cpuUsage}%`,
        timestamp: now,
        resolved: false
      })
    } else if (metrics.cpuUsage > 80) {
      alerts.push({
        id: `cpu_warning_${now.getTime()}`,
        type: 'CPU_WARNING',
        severity: 'WARNING',
        message: `CPU使用率偏高: ${metrics.cpuUsage}%`,
        timestamp: now,
        resolved: false
      })
    }

    // 記憶體使用率告警
    if (metrics.memoryUsage > 90) {
      alerts.push({
        id: `memory_high_${now.getTime()}`,
        type: 'MEMORY_HIGH',
        severity: 'CRITICAL',
        message: `記憶體使用率過高: ${metrics.memoryUsage}%`,
        timestamp: now,
        resolved: false
      })
    }

    // 會話數告警
    if (metrics.sessionCount > 100) {
      alerts.push({
        id: `session_high_${now.getTime()}`,
        type: 'SESSION_HIGH',
        severity: 'WARNING',
        message: `活躍會話數過多: ${metrics.sessionCount}`,
        timestamp: now,
        resolved: false
      })
    }

    // 回應時間告警
    if (metrics.responseTime > 5000) {
      alerts.push({
        id: `response_slow_${now.getTime()}`,
        type: 'RESPONSE_SLOW',
        severity: 'WARNING',
        message: `系統回應時間過慢: ${metrics.responseTime}ms`,
        timestamp: now,
        resolved: false
      })
    }

    // 儲存告警
    alerts.forEach(alert => {
      this.alerts.set(alert.id, alert)
    })

    return alerts
  }

  /**
   * 發送告警通知
   */
  async sendAlert(alert: Alert): Promise<AlertResult> {
    try {
      // 這裡可以實作實際的通知邏輯，如郵件、Slack、Teams等
      console.log(`🚨 [${alert.severity}] ${alert.type}: ${alert.message}`)

      return {
        success: true,
        notificationsSent: 1 // 模擬發送一個通知
      }
    } catch (error) {
      return {
        success: false,
        notificationsSent: 0,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 解決告警
   */
  async resolveAlert(alertId: string): Promise<ResolveResult> {
    try {
      const alert = this.alerts.get(alertId)
      if (!alert) {
        throw new Error(`Alert ${alertId} not found`)
      }

      alert.resolved = true
      alert.resolvedAt = new Date()

      return {
        success: true,
        resolvedAt: alert.resolvedAt
      }
    } catch (error) {
      return {
        success: false,
        resolvedAt: new Date(),
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 獲取活躍告警
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved)
  }

  /**
   * 獲取所有告警
   */
  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values())
  }
}