import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock oracledb
const mockConnection = {
  execute: vi.fn(),
  close: vi.fn(),
  commit: vi.fn(),
};

vi.mock('oracledb', () => ({
  default: {
    getConnection: vi.fn(() => Promise.resolve(mockConnection)),
    createPool: vi.fn(),
    BIND_OUT: 'BIND_OUT',
    NUMBER: 'NUMBER',
    STRING: 'STRING',
  },
}));

describe('Oracle Monitoring and Diagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnection.execute.mockResolvedValue({ rows: [] });
  });

  describe('System Health Monitor', () => {
    it('should check Oracle database health status', async () => {
      // Given
      mockConnection.execute.mockResolvedValueOnce({
        rows: [['OPEN', 'READ WRITE', 100, 50]],
      });

      const { OracleHealthMonitor } = await import('../oracle-monitoring');
      const monitor = new OracleHealthMonitor();

      // When
      const health = await monitor.checkDatabaseHealth();

      // Then
      expect(health.isHealthy).toBe(true);
      expect(health.status).toBeDefined();
      expect(health.metrics).toBeDefined();
    });

    it('should detect unhealthy database status', async () => {
      // Given
      mockConnection.execute.mockRejectedValueOnce(
        new Error('ORA-03114: not connected to ORACLE')
      );

      const { OracleHealthMonitor } = await import('../oracle-monitoring');
      const monitor = new OracleHealthMonitor();

      // When
      const health = await monitor.checkDatabaseHealth();

      // Then
      expect(health.isHealthy).toBe(false);
      expect(health.error).toContain('not connected');
    });

    it('should collect performance metrics', async () => {
      // Given
      mockConnection.execute.mockResolvedValueOnce({
        rows: [[85.5, 120, 25, 90, 1500]],
      });

      const { OracleHealthMonitor } = await import('../oracle-monitoring');
      const monitor = new OracleHealthMonitor();

      // When
      const metrics = await monitor.getPerformanceMetrics();

      // Then
      expect(metrics.cpuUsage).toBeDefined();
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.sessionCount).toBeDefined();
      expect(metrics.responseTime).toBeDefined();
    });
  });

  describe('Log Management', () => {
    it('should collect Oracle alert log entries', async () => {
      // Given
      mockConnection.execute.mockResolvedValueOnce({
        rows: [
          ['2025-01-23 10:30:00', 'INFO', 'Database startup successful'],
          ['2025-01-23 10:35:00', 'WARN', 'Tablespace usage at 85%'],
        ],
      });

      const { OracleLogManager } = await import('../oracle-monitoring');
      const logManager = new OracleLogManager();

      // When
      const logs = await logManager.getRecentAlertLogs();

      // Then
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toHaveProperty('timestamp');
      expect(logs[0]).toHaveProperty('level');
      expect(logs[0]).toHaveProperty('message');
    });

    it('should filter logs by severity level', async () => {
      // Given
      mockConnection.execute.mockResolvedValueOnce({
        rows: [
          ['2025-01-23 10:35:00', 'ERROR', 'ORA-00600: internal error code'],
        ],
      });

      const { OracleLogManager } = await import('../oracle-monitoring');
      const logManager = new OracleLogManager();

      // When
      const errorLogs = await logManager.getLogsByLevel('ERROR');

      // Then
      expect(Array.isArray(errorLogs)).toBe(true);
      if (errorLogs.length > 0) {
        expect(errorLogs[0].level).toBe('ERROR');
      }
    });

    it('should get slow query reports', async () => {
      // Given
      mockConnection.execute.mockResolvedValueOnce({
        rows: [
          ['SELECT * FROM projects WHERE created_at > SYSDATE-1', 15000, 50],
          ['SELECT COUNT(*) FROM users', 8000, 25],
        ],
      });

      const { OracleLogManager } = await import('../oracle-monitoring');
      const logManager = new OracleLogManager();

      // When
      const slowQueries = await logManager.getSlowQueries();

      // Then
      expect(Array.isArray(slowQueries)).toBe(true);
      if (slowQueries.length > 0) {
        expect(slowQueries[0]).toHaveProperty('sqlText');
        expect(slowQueries[0]).toHaveProperty('executionTime');
        expect(slowQueries[0]).toHaveProperty('executionCount');
      }
    });
  });

  describe('Performance Diagnostics', () => {
    it('should analyze execution plans', async () => {
      // Given
      mockConnection.execute.mockResolvedValueOnce({
        rows: [
          ['| Id  | Operation         | Name      | Rows | Cost |'],
          ['|   0 | SELECT STATEMENT  |           |    1 |   10 |'],
          ['|   1 |  TABLE ACCESS FULL| PROJECTS  |  100 |   10 |'],
        ],
      });

      const { OracleDiagnosticTools } = await import('../oracle-monitoring');
      const tools = new OracleDiagnosticTools();

      // When
      const plan = await tools.explainQuery('SELECT * FROM projects');

      // Then
      expect(plan.sqlText).toBeDefined();
      expect(plan.executionPlan).toBeDefined();
      expect(plan.estimatedCost).toBeDefined();
    });

    it('should identify blocking sessions', async () => {
      // Given
      mockConnection.execute.mockResolvedValueOnce({
        rows: [[123, 456, 'UPDATE', 'projects', 'sys_c007123', 300]],
      });

      const { OracleDiagnosticTools } = await import('../oracle-monitoring');
      const tools = new OracleDiagnosticTools();

      // When
      const blockingSessions = await tools.getBlockingSessions();

      // Then
      expect(Array.isArray(blockingSessions)).toBe(true);
      if (blockingSessions.length > 0) {
        expect(blockingSessions[0]).toHaveProperty('blockingSessionId');
        expect(blockingSessions[0]).toHaveProperty('blockedSessionId');
        expect(blockingSessions[0]).toHaveProperty('waitTime');
      }
    });

    it('should generate AWR-like statistics report', async () => {
      // Given
      mockConnection.execute.mockResolvedValueOnce({
        rows: [
          ['Database CPU Time', 25.5],
          ['SQL execute elapsed time', 120.8],
          ['Physical reads', 1500000],
        ],
      });

      const { OracleDiagnosticTools } = await import('../oracle-monitoring');
      const tools = new OracleDiagnosticTools();

      // When
      const report = await tools.generatePerformanceReport();

      // Then
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.statistics).toBeDefined();
      expect(report.topWaitEvents).toBeDefined();
      expect(report.topSQLStatements).toBeDefined();
    });
  });

  describe('Real-time Monitoring', () => {
    it('should provide real-time session monitoring', async () => {
      // Given
      mockConnection.execute.mockResolvedValueOnce({
        rows: [
          [101, 'pcm_user', 'ACTIVE', 'UPDATE', 'projects', 150],
          [102, 'pcm_user', 'INACTIVE', null, null, 0],
        ],
      });

      const { OracleRealtimeMonitor } = await import('../oracle-monitoring');
      const monitor = new OracleRealtimeMonitor();

      // When
      const sessions = await monitor.getCurrentSessions();

      // Then
      expect(Array.isArray(sessions)).toBe(true);
      if (sessions.length > 0) {
        expect(sessions[0]).toHaveProperty('sessionId');
        expect(sessions[0]).toHaveProperty('username');
        expect(sessions[0]).toHaveProperty('status');
      }
    });

    it('should monitor tablespace usage', async () => {
      // Given
      mockConnection.execute.mockResolvedValueOnce({
        rows: [
          ['USERS', 1000, 850, 85.0, 'ONLINE'],
          ['TEMP', 500, 100, 20.0, 'ONLINE'],
        ],
      });

      const { OracleRealtimeMonitor } = await import('../oracle-monitoring');
      const monitor = new OracleRealtimeMonitor();

      // When
      const tablespaces = await monitor.getTablespaceUsage();

      // Then
      expect(Array.isArray(tablespaces)).toBe(true);
      if (tablespaces.length > 0) {
        expect(tablespaces[0]).toHaveProperty('name');
        expect(tablespaces[0]).toHaveProperty('totalSizeMB');
        expect(tablespaces[0]).toHaveProperty('usedSizeMB');
        expect(tablespaces[0]).toHaveProperty('usagePercentage');
      }
    });

    it('should track lock waits', async () => {
      // Given
      mockConnection.execute.mockResolvedValueOnce({
        rows: [[123, 'enq: TX - row lock contention', 45.5, 'projects']],
      });

      const { OracleRealtimeMonitor } = await import('../oracle-monitoring');
      const monitor = new OracleRealtimeMonitor();

      // When
      const locks = await monitor.getLockWaits();

      // Then
      expect(Array.isArray(locks)).toBe(true);
      if (locks.length > 0) {
        expect(locks[0]).toHaveProperty('sessionId');
        expect(locks[0]).toHaveProperty('event');
        expect(locks[0]).toHaveProperty('waitTime');
        expect(locks[0]).toHaveProperty('objectName');
      }
    });
  });

  describe('Alert System', () => {
    it('should create performance alerts', async () => {
      // Given
      const { OracleAlertSystem } = await import('../oracle-monitoring');
      const alertSystem = new OracleAlertSystem();

      const metrics = {
        cpuUsage: 95, // High CPU usage
        memoryUsage: 85,
        sessionCount: 150,
        responseTime: 8000, // Slow response
      };

      // When
      const alerts = await alertSystem.checkMetricThresholds(metrics);

      // Then
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBeGreaterThan(0);

      const cpuAlert = alerts.find(alert => alert.type === 'CPU_HIGH');
      expect(cpuAlert).toBeDefined();
      expect(cpuAlert?.severity).toBe('CRITICAL');
    });

    it('should send alert notifications', async () => {
      // Given
      const { OracleAlertSystem } = await import('../oracle-monitoring');
      const alertSystem = new OracleAlertSystem();

      const alert = {
        id: '1',
        type: 'TABLESPACE_FULL',
        severity: 'CRITICAL' as const,
        message: 'USERS tablespace is 95% full',
        timestamp: new Date(),
        resolved: false,
      };

      // When
      const result = await alertSystem.sendAlert(alert);

      // Then
      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBeGreaterThanOrEqual(0);
    });

    it('should resolve alerts', async () => {
      // Given
      const { OracleAlertSystem } = await import('../oracle-monitoring');
      const alertSystem = new OracleAlertSystem();

      // When
      const result = await alertSystem.resolveAlert('1');

      // Then
      expect(result.success).toBe(true);
      expect(result.resolvedAt).toBeInstanceOf(Date);
    });
  });
});
