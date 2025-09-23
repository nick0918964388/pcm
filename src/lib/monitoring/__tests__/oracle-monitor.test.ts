/**
 * Task 5.2: Oracle監控和診斷測試
 *
 * TDD RED階段：建立Oracle特有監控功能的測試案例
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OracleMonitor, AWRReport, PerformanceMetrics } from '../oracle-monitor'

// Mock Oracle connection
const mockConnection = {
  execute: vi.fn(),
  healthCheck: vi.fn()
}

vi.mock('../../database/oracle-connection', () => ({
  getOracleConnection: () => mockConnection
}))

describe('Oracle監控和診斷測試', () => {
  let oracleMonitor: OracleMonitor

  beforeEach(() => {
    oracleMonitor = new OracleMonitor()
    vi.clearAllMocks()

    // Setup default mock responses
    mockConnection.execute.mockImplementation((query: string) => {
      if (query.includes('dba_hist_snapshot')) {
        return Promise.resolve({
          rows: [[1, 1, new Date(), new Date()]]
        })
      }
      if (query.includes('v$sysstat')) {
        return Promise.resolve({
          rows: [
            ['DB time', 1000],
            ['CPU used by this session', 800],
            ['session logical reads', 50000],
            ['physical reads', 10000],
            ['user commits', 100],
            ['user rollbacks', 5]
          ]
        })
      }
      if (query.includes('v$system_event')) {
        return Promise.resolve({
          rows: [
            ['log file sync', 100, 5, 0.1],
            ['db file sequential read', 200, 10, 0.05]
          ]
        })
      }
      if (query.includes('v$sql') && query.includes('sql_id')) {
        return Promise.resolve({
          rows: [
            ['abc123', 'SELECT * FROM users', 10, 100, 80, 1000, 50, 5],
            ['def456', 'SELECT * FROM projects', 5, 200, 150, 800, 30, 3]
          ]
        })
      }
      if (query.includes('v$sql') && query.includes('sum(executions)')) {
        return Promise.resolve({
          rows: [[15, 150, 230]]
        })
      }
      if (query.includes('v$session') && query.includes('count(*)')) {
        return Promise.resolve({
          rows: [[25, 10, 15]]
        })
      }
      if (query.includes('v$session') && query.includes('sid, serial#')) {
        return Promise.resolve({
          rows: [
            [123, 456, 'PCM', 'ACTIVE', new Date(), 0, 'sqlplus.exe', 'DEV-MACHINE', 'oracle']
          ]
        })
      }
      if (query.includes('v$sysmetric')) {
        return Promise.resolve({
          rows: [[75.5]]
        })
      }
      if (query.includes('v$pgastat')) {
        return Promise.resolve({
          rows: [
            ['total PGA allocated', 512],
            ['aggregate PGA target parameter', 1024],
            ['SGA Used', 2048],
            ['Buffer Cache Hit Ratio', 95.5]
          ]
        })
      }
      if (query.includes('v$sysmetric') && query.includes('Physical Reads')) {
        return Promise.resolve({
          rows: [
            ['Physical Reads Per Sec', 100],
            ['Physical Writes Per Sec', 50],
            ['Average Synchronous Single-Block Read Latency', 0.05],
            ['Redo Generated Per Sec', 200]
          ]
        })
      }
      if (query.includes('dba_data_files')) {
        return Promise.resolve({
          rows: [
            ['USERS', 1024, 800, 224, 78.13, 'ONLINE', 1, 2048]
          ]
        })
      }
      if (query.includes('v$instance')) {
        return Promise.resolve({
          rows: [['ACTIVE']]
        })
      }
      if (query.includes('v$lock') && !query.includes('w.sid')) {
        return Promise.resolve({
          rows: [
            [123, 'TM', '3', 'TEST_TABLE', 'TABLE', 0]
          ]
        })
      }
      if (query.includes('v$lock') && query.includes('w.sid')) {
        return Promise.resolve({
          rows: []
        })
      }
      if (query.includes('v$database')) {
        return Promise.resolve({
          rows: [['ARCHIVELOG']]
        })
      }
      if (query.includes('v$log')) {
        return Promise.resolve({
          rows: [[12345]]
        })
      }
      if (query.includes('v$archive_dest_status')) {
        return Promise.resolve({
          rows: [
            ['LOG_ARCHIVE_DEST_1', 'VALID', null, 5000]
          ]
        })
      }
      if (query.includes('nls_database_parameters')) {
        return Promise.resolve({
          rows: [
            ['NLS_CHARACTERSET', 'AL32UTF8'],
            ['NLS_NCHAR_CHARACTERSET', 'AL16UTF16'],
            ['NLS_LANGUAGE', 'AMERICAN'],
            ['NLS_TERRITORY', 'AMERICA'],
            ['NLS_DATE_FORMAT', 'DD-MON-RR'],
            ['NLS_CALENDAR', 'GREGORIAN'],
            ['NLS_NUMERIC_CHARACTERS', '.,']
          ]
        })
      }
      if (query.includes('dbtimezone')) {
        return Promise.resolve({
          rows: [['UTC']]
        })
      }

      // Default empty response
      return Promise.resolve({ rows: [] })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('RED: AWR統計收集', () => {
    it('應該收集Oracle AWR報表數據', async () => {
      // Act
      const awrReport = await oracleMonitor.generateAWRReport()

      // Assert
      expect(awrReport).toBeDefined()
      expect(awrReport.snapshotId).toBeGreaterThan(0)
      expect(awrReport.instanceId).toBeDefined()
      expect(awrReport.startTime).toBeInstanceOf(Date)
      expect(awrReport.endTime).toBeInstanceOf(Date)
      expect(awrReport.statistics).toBeDefined()
      expect(awrReport.statistics.dbTime).toBeGreaterThanOrEqual(0)
      expect(awrReport.statistics.cpuTime).toBeGreaterThanOrEqual(0)
      expect(awrReport.statistics.waitTime).toBeGreaterThanOrEqual(0)
    })

    it('應該收集SQL執行統計', async () => {
      // Act
      const sqlStats = await oracleMonitor.getSQLExecutionStats()

      // Assert
      expect(sqlStats).toBeDefined()
      expect(Array.isArray(sqlStats.topQueries)).toBe(true)
      expect(sqlStats.totalExecutions).toBeGreaterThanOrEqual(0)
      expect(sqlStats.averageExecutionTime).toBeGreaterThanOrEqual(0)

      if (sqlStats.topQueries.length > 0) {
        const firstQuery = sqlStats.topQueries[0]
        expect(firstQuery.sqlId).toBeDefined()
        expect(firstQuery.executionCount).toBeGreaterThan(0)
        expect(firstQuery.averageElapsedTime).toBeGreaterThanOrEqual(0)
        expect(firstQuery.bufferGets).toBeGreaterThanOrEqual(0)
      }
    })

    it('應該監控會話(Session)資訊', async () => {
      // Act
      const sessionInfo = await oracleMonitor.getSessionInfo()

      // Assert
      expect(sessionInfo).toBeDefined()
      expect(sessionInfo.totalSessions).toBeGreaterThan(0)
      expect(sessionInfo.activeSessions).toBeGreaterThanOrEqual(0)
      expect(sessionInfo.inactiveSessions).toBeGreaterThanOrEqual(0)
      expect(Array.isArray(sessionInfo.sessionDetails)).toBe(true)

      if (sessionInfo.sessionDetails.length > 0) {
        const session = sessionInfo.sessionDetails[0]
        expect(session.sid).toBeDefined()
        expect(session.username).toBeDefined()
        expect(session.status).toMatch(/^(ACTIVE|INACTIVE|KILLED)$/)
        expect(session.connectTime).toBeInstanceOf(Date)
      }
    })
  })

  describe('RED: 效能指標監控', () => {
    it('應該收集資料庫效能指標', async () => {
      // Act
      const metrics = await oracleMonitor.getPerformanceMetrics()

      // Assert
      expect(metrics).toBeDefined()
      expect(metrics.timestamp).toBeInstanceOf(Date)
      expect(metrics.cpu).toBeDefined()
      expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0)
      expect(metrics.cpu.usage).toBeLessThanOrEqual(100)

      expect(metrics.memory).toBeDefined()
      expect(metrics.memory.pgaUsed).toBeGreaterThan(0)
      expect(metrics.memory.sgaUsed).toBeGreaterThan(0)
      expect(metrics.memory.bufferCacheHitRatio).toBeGreaterThanOrEqual(0)
      expect(metrics.memory.bufferCacheHitRatio).toBeLessThanOrEqual(100)

      expect(metrics.io).toBeDefined()
      expect(metrics.io.readIOPS).toBeGreaterThanOrEqual(0)
      expect(metrics.io.writeIOPS).toBeGreaterThanOrEqual(0)
      expect(metrics.io.averageReadTime).toBeGreaterThanOrEqual(0)
      expect(metrics.io.averageWriteTime).toBeGreaterThanOrEqual(0)
    })

    it('應該監控表空間使用率', async () => {
      // Act
      const tablespaceUsage = await oracleMonitor.getTablespaceUsage()

      // Assert
      expect(tablespaceUsage).toBeDefined()
      expect(Array.isArray(tablespaceUsage)).toBe(true)

      if (tablespaceUsage.length > 0) {
        const tablespace = tablespaceUsage[0]
        expect(tablespace.tablespaceName).toBeDefined()
        expect(tablespace.totalSizeMB).toBeGreaterThan(0)
        expect(tablespace.usedSizeMB).toBeGreaterThanOrEqual(0)
        expect(tablespace.freeSizeMB).toBeGreaterThanOrEqual(0)
        expect(tablespace.usagePercentage).toBeGreaterThanOrEqual(0)
        expect(tablespace.usagePercentage).toBeLessThanOrEqual(100)
        expect(tablespace.status).toMatch(/^(ONLINE|OFFLINE|READ ONLY)$/)
      }
    })

    it('應該檢測長時間執行的查詢', async () => {
      // Act
      const longRunningQueries = await oracleMonitor.getLongRunningQueries(30)

      // Assert
      expect(longRunningQueries).toBeDefined()
      expect(Array.isArray(longRunningQueries)).toBe(true)

      longRunningQueries.forEach(query => {
        expect(query.sid).toBeDefined()
        expect(query.sqlId).toBeDefined()
        expect(query.elapsedSeconds).toBeGreaterThan(30)
        expect(query.sqlText).toBeDefined()
        expect(query.username).toBeDefined()
        expect(query.status).toBeDefined()
      })
    })
  })

  describe('RED: 系統健康檢查', () => {
    it('應該執行全面的健康檢查', async () => {
      // Act
      const healthCheck = await oracleMonitor.performHealthCheck()

      // Assert
      expect(healthCheck).toBeDefined()
      expect(healthCheck.timestamp).toBeInstanceOf(Date)
      expect(healthCheck.overallStatus).toMatch(/^(HEALTHY|WARNING|CRITICAL)$/)
      expect(Array.isArray(healthCheck.checks)).toBe(true)

      // 檢查必要的健康檢查項目
      const checkTypes = healthCheck.checks.map(check => check.category)
      expect(checkTypes).toContain('DATABASE_STATUS')
      expect(checkTypes).toContain('TABLESPACE_USAGE')
      expect(checkTypes).toContain('MEMORY_USAGE')
      expect(checkTypes).toContain('SESSION_COUNT')

      healthCheck.checks.forEach(check => {
        expect(check.name).toBeDefined()
        expect(check.category).toBeDefined()
        expect(check.status).toMatch(/^(PASS|WARNING|FAIL)$/)
        expect(check.message).toBeDefined()
        expect(typeof check.criticalLevel).toBe('number')
        expect(check.criticalLevel).toBeGreaterThanOrEqual(1)
        expect(check.criticalLevel).toBeLessThanOrEqual(10)
      })
    })

    it('應該監控鎖定(Lock)衝突', async () => {
      // Act
      const lockInfo = await oracleMonitor.getLockInformation()

      // Assert
      expect(lockInfo).toBeDefined()
      expect(Array.isArray(lockInfo.currentLocks)).toBe(true)
      expect(Array.isArray(lockInfo.blockingSessions)).toBe(true)
      expect(lockInfo.totalLockCount).toBeGreaterThanOrEqual(0)

      lockInfo.currentLocks.forEach(lock => {
        expect(lock.sid).toBeDefined()
        expect(lock.lockType).toBeDefined()
        expect(lock.lockMode).toBeDefined()
        expect(lock.objectName).toBeDefined()
        expect(typeof lock.blockingSession).toBe('number')
      })
    })

    it('應該檢查歸檔日誌狀態', async () => {
      // Act
      const archiveStatus = await oracleMonitor.getArchiveLogStatus()

      // Assert
      expect(archiveStatus).toBeDefined()
      expect(archiveStatus.archiveMode).toMatch(/^(ARCHIVELOG|NOARCHIVELOG)$/)
      expect(archiveStatus.currentLogSequence).toBeGreaterThan(0)
      expect(Array.isArray(archiveStatus.archiveDestinations)).toBe(true)

      if (archiveStatus.archiveDestinations.length > 0) {
        const destination = archiveStatus.archiveDestinations[0]
        expect(destination.destination).toBeDefined()
        expect(destination.status).toMatch(/^(VALID|INACTIVE|DEFERRED|ERROR)$/)
        expect(destination.freeSpaceMB).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('RED: NLS配置管理', () => {
    it('應該檢查NLS(國際化)設定', async () => {
      // Act
      const nlsSettings = await oracleMonitor.getNLSSettings()

      // Assert
      expect(nlsSettings).toBeDefined()
      expect(nlsSettings.characterSet).toBeDefined()
      expect(nlsSettings.nationalCharacterSet).toBeDefined()
      expect(nlsSettings.language).toBeDefined()
      expect(nlsSettings.territory).toBeDefined()
      expect(nlsSettings.dateFormat).toBeDefined()
      expect(nlsSettings.timeZone).toBeDefined()

      // 檢查中文環境支援
      expect(['AL32UTF8', 'UTF8', 'ZHS16GBK', 'ZHT32EUC']).toContain(nlsSettings.characterSet)
    })

    it('應該驗證字符集兼容性', async () => {
      // Arrange
      const expectedCharset = 'AL32UTF8'

      // Act
      const compatibility = await oracleMonitor.validateCharacterSetCompatibility(expectedCharset)

      // Assert
      expect(compatibility).toBeDefined()
      expect(compatibility.isCompatible).toBeDefined()
      expect(compatibility.currentCharset).toBeDefined()
      expect(compatibility.expectedCharset).toBe(expectedCharset)
      expect(Array.isArray(compatibility.issues)).toBe(true)
      expect(Array.isArray(compatibility.recommendations)).toBe(true)
    })
  })

  describe('RED: 監控配置和通知', () => {
    it('應該設定監控閾值', async () => {
      // Arrange
      const thresholds = {
        cpuUsage: 80,
        memoryUsage: 85,
        tablespaceUsage: 90,
        sessionCount: 100,
        longRunningQueryTime: 300,
        lockWaitTime: 60
      }

      // Act
      await oracleMonitor.setMonitoringThresholds(thresholds)
      const currentThresholds = oracleMonitor.getMonitoringThresholds()

      // Assert
      expect(currentThresholds).toEqual(thresholds)
    })

    it('應該檢測閾值超標情況', async () => {
      // Arrange
      const thresholds = {
        cpuUsage: 10, // 設定很低的閾值以便觸發警告
        memoryUsage: 10,
        tablespaceUsage: 10,
        sessionCount: 1
      }
      await oracleMonitor.setMonitoringThresholds(thresholds)

      // Act
      const alerts = await oracleMonitor.checkThresholdAlerts()

      // Assert
      expect(alerts).toBeDefined()
      expect(Array.isArray(alerts)).toBe(true)

      alerts.forEach(alert => {
        expect(alert.metric).toBeDefined()
        expect(alert.currentValue).toBeDefined()
        expect(alert.threshold).toBeDefined()
        expect(alert.severity).toMatch(/^(WARNING|CRITICAL)$/)
        expect(alert.timestamp).toBeInstanceOf(Date)
        expect(alert.message).toBeDefined()
      })
    })

    it('應該生成監控報告', async () => {
      // Act
      const report = await oracleMonitor.generateMonitoringReport()

      // Assert
      expect(report).toBeDefined()
      expect(report.generatedAt).toBeInstanceOf(Date)
      expect(report.summary).toBeDefined()
      expect(report.summary.overallHealth).toMatch(/^(HEALTHY|WARNING|CRITICAL)$/)
      expect(report.summary.totalIssues).toBeGreaterThanOrEqual(0)
      expect(report.summary.criticalIssues).toBeGreaterThanOrEqual(0)

      expect(report.sections).toBeDefined()
      expect(report.sections.performance).toBeDefined()
      expect(report.sections.health).toBeDefined()
      expect(report.sections.resources).toBeDefined()
      expect(report.sections.security).toBeDefined()

      expect(Array.isArray(report.recommendations)).toBe(true)
    })
  })
})