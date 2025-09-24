/**
 * Oracle Connection Manager Tests
 * Task 3.1: 實作Oracle專用的資料庫連線管理
 *
 * 測試目標:
 * - 整合node-oracledb驅動程式到專案
 * - 建立Oracle連線池配置和管理機制
 * - 實作Oracle特有連線參數處理
 * - 開發連線健康檢查和自動重連功能
 * - 建立連線效能監控和統計功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock oracledb module with additional features for Task 3.1
vi.mock('oracledb', () => ({
  default: {
    createPool: vi.fn(),
    getPool: vi.fn(),
    getConnection: vi.fn(),
    initOracleClient: vi.fn(),
    outFormat: 4001,
    autoCommit: false,
    OUT_FORMAT_OBJECT: 4001,
    OUT_FORMAT_ARRAY: 4002,
    THIN: 'THIN',
    THICK: 'THICK',
    POOL_STATUS_OPEN: 6002,
    POOL_STATUS_DRAINING: 6003,
    POOL_STATUS_CLOSED: 6004,
    BIND_IN: 3001,
    BIND_OUT: 3002,
    BIND_INOUT: 3003,
    NUMBER: 2001,
    STRING: 2002,
    DATE: 2003,
    CURSOR: 2004,
    CLOB: 2006,
    BLOB: 2007,
  },
}));

import { OracleConnectionManager } from '../oracle-connection';
import type {
  OracleConfig,
  HealthStatus,
  PoolMetrics,
} from '../oracle-connection';

describe('Oracle Connection Manager - Task 3.1', () => {
  let connectionManager: OracleConnectionManager;
  let mockConfig: OracleConfig;
  let mockOracleDb: any;

  beforeEach(async () => {
    mockOracleDb = await import('oracledb');
    vi.clearAllMocks();

    mockConfig = {
      connectString: 'localhost:1521/XEPDB1',
      user: 'pcm_user',
      password: 'pcm_pass123',
      poolMin: 5,
      poolMax: 20,
      poolIncrement: 2,
      poolTimeout: 60,
      enableStatistics: true,
    };

    connectionManager = new OracleConnectionManager();
  });

  afterEach(async () => {
    if (connectionManager) {
      await connectionManager.shutdown();
    }
  });

  describe('Node-oracledb驅動程式整合', () => {
    it('should properly initialize oracledb driver with Thin mode', async () => {
      // RED: 測試 Thin 模式的初始化
      const mockPool = {
        getConnection: vi.fn(),
        close: vi.fn(),
        connectionsOpen: 5,
        connectionsInUse: 2,
        status: mockOracleDb.default.POOL_STATUS_OPEN,
      };

      mockOracleDb.default.createPool.mockResolvedValue(mockPool);

      const result = await connectionManager.initialize(mockConfig);

      expect(result.success).toBe(true);
      expect(mockOracleDb.default.outFormat).toBe(
        mockOracleDb.default.OUT_FORMAT_OBJECT
      );
      expect(mockOracleDb.default.autoCommit).toBe(false);
      expect(mockOracleDb.default.createPool).toHaveBeenCalledWith(
        expect.objectContaining({
          connectString: mockConfig.connectString,
          user: mockConfig.user,
          password: mockConfig.password,
          poolMin: mockConfig.poolMin,
          poolMax: mockConfig.poolMax,
          poolIncrement: mockConfig.poolIncrement,
          poolTimeout: mockConfig.poolTimeout,
          enableStatistics: mockConfig.enableStatistics,
        })
      );
    });

    it('should handle Oracle-specific connection parameters', async () => {
      // RED: 測試Oracle特有的連線參數
      const extendedConfig = {
        ...mockConfig,
        connectString: 'localhost:1521/XEPDB1',
        serviceName: 'XEPDB1',
        sid: 'XE',
        charset: 'AL32UTF8',
        ncharset: 'AL16UTF16',
        connectionClass: 'PCM_APP',
        privilege: 'SYSDBA' as any,
      };

      const mockPool = {
        getConnection: vi.fn(),
        close: vi.fn(),
        connectionsOpen: 5,
        connectionsInUse: 2,
      };

      mockOracleDb.default.createPool.mockResolvedValue(mockPool);

      const result = await connectionManager.initialize(extendedConfig);

      expect(result.success).toBe(true);
      expect(mockOracleDb.default.createPool).toHaveBeenCalledWith(
        expect.objectContaining({
          connectString: extendedConfig.connectString,
          connectionClass: extendedConfig.connectionClass,
        })
      );
    });

    it('should handle Oracle client initialization errors', async () => {
      // RED: 測試Oracle客戶端初始化錯誤
      const initError = new Error('Oracle Instant Client not found');
      mockOracleDb.default.createPool.mockRejectedValue(initError);

      const result = await connectionManager.initialize(mockConfig);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain(
        'Oracle Instant Client not found'
      );
    });

    it('should support Oracle bind variables properly', async () => {
      // RED: 測試Oracle bind variables支援
      const mockPool = {
        getConnection: vi.fn(),
        close: vi.fn(),
      };

      const mockConnection = {
        execute: vi.fn().mockResolvedValue({
          rows: [{ id: 123, name: 'Test User' }],
          metaData: [
            { name: 'ID', fetchType: mockOracleDb.default.NUMBER },
            { name: 'NAME', fetchType: mockOracleDb.default.STRING },
          ],
        }),
        close: vi.fn(),
      };

      mockPool.getConnection.mockResolvedValue(mockConnection);
      mockOracleDb.default.createPool.mockResolvedValue(mockPool);

      await connectionManager.initialize(mockConfig);

      const result = await connectionManager.executeQuery(
        'SELECT id, name FROM users WHERE id = :userId AND status = :status',
        { userId: 123, status: 'active' }
      );

      expect(result.success).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        'SELECT id, name FROM users WHERE id = :userId AND status = :status',
        { userId: 123, status: 'active' }
      );
    });
  });

  describe('Oracle連線池配置和管理', () => {
    it('should create connection pool with advanced configuration', async () => {
      // RED: 測試進階連線池配置
      const advancedConfig = {
        ...mockConfig,
        poolPingInterval: 60,
        poolTimeout: 120,
        stmtCacheSize: 30,
        maxSessionsPerShard: 20,
        enableStatistics: true,
        queueTimeout: 60000,
        _enableStats: true,
      };

      const mockPool = {
        getConnection: vi.fn(),
        close: vi.fn(),
        connectionsOpen: 5,
        connectionsInUse: 2,
        poolPingInterval: 60,
        poolTimeout: 120,
        stmtCacheSize: 30,
        status: mockOracleDb.default.POOL_STATUS_OPEN,
      };

      mockOracleDb.default.createPool.mockResolvedValue(mockPool);

      const result = await connectionManager.initialize(advancedConfig);

      expect(result.success).toBe(true);
      expect(mockOracleDb.default.createPool).toHaveBeenCalledWith(
        expect.objectContaining({
          poolMin: advancedConfig.poolMin,
          poolMax: advancedConfig.poolMax,
          poolIncrement: advancedConfig.poolIncrement,
          poolTimeout: advancedConfig.poolTimeout,
          enableStatistics: advancedConfig.enableStatistics,
        })
      );
    });

    it('should handle connection pool sizing and scaling', async () => {
      // RED: 測試連線池大小調整和擴展
      const mockPool = {
        getConnection: vi.fn(),
        close: vi.fn(),
        connectionsOpen: 8,
        connectionsInUse: 7,
        poolMin: 5,
        poolMax: 20,
        poolIncrement: 2,
      };

      mockOracleDb.default.createPool.mockResolvedValue(mockPool);

      await connectionManager.initialize(mockConfig);

      const status = connectionManager.getPoolStatus();

      expect(status.totalConnections).toBe(8);
      expect(status.activeConnections).toBe(7);
      expect(status.idleConnections).toBe(1);
    });

    it('should handle connection pool exhaustion gracefully', async () => {
      // RED: 測試連線池耗盡的優雅處理
      const poolExhaustionError = new Error(
        'ORA-24418: Cannot open further sessions'
      );

      const mockPool = {
        getConnection: vi.fn().mockRejectedValue(poolExhaustionError),
        close: vi.fn(),
        connectionsOpen: 20, // Max reached
        connectionsInUse: 20,
      };

      mockOracleDb.default.createPool.mockResolvedValue(mockPool);

      await connectionManager.initialize(mockConfig);

      const result = await connectionManager.executeQuery('SELECT 1 FROM dual');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Cannot open further sessions');
    });

    it('should properly manage connection lifecycle', async () => {
      // RED: 測試連線生命週期管理
      const mockConnection = {
        execute: vi.fn().mockResolvedValue({ rows: [] }),
        close: vi.fn(),
        action: '',
        module: '',
        clientId: '',
      };

      const mockPool = {
        getConnection: vi.fn().mockResolvedValue(mockConnection),
        close: vi.fn(),
        connectionsOpen: 5,
        connectionsInUse: 1,
      };

      mockOracleDb.default.createPool.mockResolvedValue(mockPool);

      await connectionManager.initialize(mockConfig);

      await connectionManager.executeQuery('SELECT COUNT(*) FROM users');

      expect(mockPool.getConnection).toHaveBeenCalled();
      expect(mockConnection.execute).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });

  describe('連線健康檢查和自動重連', () => {
    it('should perform comprehensive health checks', async () => {
      // RED: 測試全面的健康檢查
      const mockConnection = {
        execute: vi
          .fn()
          .mockResolvedValueOnce({ rows: [{ result: 1 }] }) // SELECT 1 FROM dual
          .mockResolvedValueOnce({
            rows: [{ version: 'Oracle Database 21c Express Edition' }],
          }), // Version check
        close: vi.fn(),
        pingDatabase: vi.fn().mockResolvedValue(undefined),
      };

      const mockPool = {
        getConnection: vi.fn().mockResolvedValue(mockConnection),
        close: vi.fn(),
        status: mockOracleDb.default.POOL_STATUS_OPEN,
      };

      mockOracleDb.default.createPool.mockResolvedValue(mockPool);

      await connectionManager.initialize(mockConfig);

      const health = await connectionManager.healthCheck();

      expect(health.success).toBe(true);
      expect(health.data?.isHealthy).toBe(true);
      expect(health.data?.databaseStatus).toBe('READY');
      expect(mockConnection.execute).toHaveBeenCalledWith('SELECT 1 FROM dual');
    });

    it('should detect various Oracle error conditions', async () => {
      // RED: 測試各種Oracle錯誤條件檢測
      const oracleErrors = [
        'ORA-12541: TNS:no listener',
        'ORA-01017: invalid username/password; logon denied',
        'ORA-12514: TNS:listener does not currently know of service',
        'ORA-28001: the password has expired',
      ];

      for (const errorMsg of oracleErrors) {
        const mockPool = {
          getConnection: vi.fn().mockRejectedValue(new Error(errorMsg)),
          close: vi.fn(),
        };

        mockOracleDb.default.createPool.mockResolvedValue(mockPool);

        await connectionManager.initialize(mockConfig);

        const health = await connectionManager.healthCheck();

        expect(health.success).toBe(false);
        expect(health.data?.isHealthy).toBe(false);
        expect(health.data?.errorDetails).toContain(errorMsg.split(':')[0]);
      }
    });

    it('should implement automatic reconnection logic', async () => {
      // RED: 測試自動重連邏輯
      let connectionAttempts = 0;
      const mockPool = {
        getConnection: vi.fn().mockImplementation(() => {
          connectionAttempts++;
          if (connectionAttempts <= 2) {
            throw new Error('ORA-12541: TNS:no listener');
          }
          return Promise.resolve({
            execute: vi.fn().mockResolvedValue({ rows: [{ result: 1 }] }),
            close: vi.fn(),
          });
        }),
        close: vi.fn(),
      };

      mockOracleDb.default.createPool.mockResolvedValue(mockPool);

      await connectionManager.initialize(mockConfig);

      // 應該實作重試邏輯
      const result = await connectionManager.executeQuery('SELECT 1 FROM dual');

      expect(connectionAttempts).toBeGreaterThan(1);
      // 注意：實際的重連邏輯需要在實作中添加
    });

    it('should handle connection validation and recovery', async () => {
      // RED: 測試連線驗證和恢復
      const mockConnection = {
        execute: vi.fn(),
        close: vi.fn(),
        isHealthy: vi.fn().mockReturnValue(true),
        ping: vi.fn().mockResolvedValue(undefined),
      };

      const mockPool = {
        getConnection: vi.fn().mockResolvedValue(mockConnection),
        close: vi.fn(),
        reconfigure: vi.fn(),
        status: mockOracleDb.default.POOL_STATUS_OPEN,
      };

      mockOracleDb.default.createPool.mockResolvedValue(mockPool);

      await connectionManager.initialize(mockConfig);

      // 測試連線驗證
      const isValid = await connectionManager.validateConnection();
      expect(isValid).toBe(true);
    });
  });

  describe('連線效能監控和統計', () => {
    it('should collect detailed connection pool statistics', async () => {
      // RED: 測試詳細的連線池統計收集
      const mockPool = {
        getConnection: vi.fn(),
        close: vi.fn(),
        connectionsOpen: 8,
        connectionsInUse: 5,
        poolMin: 5,
        poolMax: 20,
        poolIncrement: 2,
        poolTimeout: 60,
        _enableStats: true,
        _logStats: true,
        queueLength: 2,
        totalConnectionRequests: 150,
        totalRequestsQueued: 12,
        totalRequestsDequeued: 10,
        totalFailedRequests: 1,
        totalRequestTimeouts: 0,
      };

      mockOracleDb.default.createPool.mockResolvedValue(mockPool);

      await connectionManager.initialize(mockConfig);

      const stats = connectionManager.getDetailedPoolStatistics();

      expect(stats).toMatchObject({
        basic: {
          totalConnections: 8,
          activeConnections: 5,
          idleConnections: 3,
          waitingRequests: 2,
        },
        performance: {
          totalRequests: 150,
          queuedRequests: 12,
          timeoutRequests: 0,
          failedRequests: 1,
          averageWaitTime: expect.any(Number),
        },
        configuration: {
          minConnections: 5,
          maxConnections: 20,
          incrementSize: 2,
          timeoutSeconds: 60,
        },
      });
    });

    it('should monitor query execution performance', async () => {
      // RED: 測試查詢執行效能監控
      const mockConnection = {
        execute: vi.fn().mockImplementation(async (sql: string) => {
          // 模擬不同查詢的執行時間
          const delay = sql.includes('complex') ? 1000 : 100;
          await new Promise(resolve => setTimeout(resolve, delay));
          return { rows: [{ id: 1 }] };
        }),
        close: vi.fn(),
      };

      const mockPool = {
        getConnection: vi.fn().mockResolvedValue(mockConnection),
        close: vi.fn(),
      };

      mockOracleDb.default.createPool.mockResolvedValue(mockPool);

      await connectionManager.initialize(mockConfig);

      const simpleQueryResult =
        await connectionManager.executeQuery('SELECT 1 FROM dual');
      const complexQueryResult = await connectionManager.executeQuery(
        'SELECT complex FROM table'
      );

      const performanceMetrics = connectionManager.getQueryPerformanceMetrics();

      expect(performanceMetrics.totalQueries).toBe(2);
      expect(performanceMetrics.averageExecutionTime).toBeGreaterThan(0);
      expect(performanceMetrics.slowQueries).toBeDefined();
    });

    it('should track connection usage patterns', async () => {
      // RED: 測試連線使用模式追蹤
      const mockPool = {
        getConnection: vi.fn(),
        close: vi.fn(),
        connectionsOpen: 10,
        connectionsInUse: 7,
      };

      mockOracleDb.default.createPool.mockResolvedValue(mockPool);

      await connectionManager.initialize(mockConfig);

      // 模擬多次查詢
      for (let i = 0; i < 5; i++) {
        await connectionManager.executeQuery(`SELECT ${i} FROM dual`);
      }

      const usagePattern = connectionManager.getConnectionUsagePattern();

      expect(usagePattern.peakConnections).toBeGreaterThan(0);
      expect(usagePattern.averageConnections).toBeGreaterThan(0);
      expect(usagePattern.connectionTurnover).toBeGreaterThan(0);
    });

    it('should provide real-time monitoring capabilities', async () => {
      // RED: 測試即時監控能力
      const mockPool = {
        getConnection: vi.fn(),
        close: vi.fn(),
        connectionsOpen: 5,
        connectionsInUse: 3,
      };

      mockOracleDb.default.createPool.mockResolvedValue(mockPool);

      await connectionManager.initialize(mockConfig);

      const monitoringData = connectionManager.getRealtimeMonitoringData();

      expect(monitoringData).toMatchObject({
        timestamp: expect.any(Date),
        poolStatus: {
          isHealthy: expect.any(Boolean),
          totalConnections: expect.any(Number),
          activeConnections: expect.any(Number),
        },
        performance: {
          queriesPerSecond: expect.any(Number),
          averageResponseTime: expect.any(Number),
          errorRate: expect.any(Number),
        },
      });
    });

    it('should generate performance alerts and warnings', async () => {
      // RED: 測試效能警報和警告生成
      const mockPool = {
        getConnection: vi.fn(),
        close: vi.fn(),
        connectionsOpen: 19, // Near max (20)
        connectionsInUse: 18, // High usage
      };

      mockOracleDb.default.createPool.mockResolvedValue(mockPool);

      await connectionManager.initialize(mockConfig);

      const alerts = connectionManager.getPerformanceAlerts();

      expect(alerts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'WARNING',
            message: expect.stringContaining('high connection usage'),
            threshold: expect.any(Number),
            currentValue: expect.any(Number),
          }),
        ])
      );
    });
  });

  describe('錯誤處理和恢復機制', () => {
    it('should handle Oracle-specific error codes appropriately', async () => {
      // RED: 測試Oracle特定錯誤碼的適當處理
      const oracleErrorCodes = [
        { code: 'ORA-00001', type: 'constraint_violation', retryable: false },
        { code: 'ORA-12541', type: 'connection_error', retryable: true },
        { code: 'ORA-01017', type: 'authentication_error', retryable: false },
        { code: 'ORA-28001', type: 'password_expired', retryable: false },
      ];

      for (const errorInfo of oracleErrorCodes) {
        const error = new Error(`${errorInfo.code}: Sample error message`);
        const handler = connectionManager.handleOracleError(error);

        expect(handler.errorCode).toBe(errorInfo.code);
        expect(handler.isRetryable).toBe(errorInfo.retryable);
        expect(handler.suggestedAction).toBeDefined();
      }
    });

    it('should implement circuit breaker pattern', async () => {
      // RED: 測試斷路器模式實作
      const failingPool = {
        getConnection: vi
          .fn()
          .mockRejectedValue(new Error('ORA-12541: TNS:no listener')),
        close: vi.fn(),
      };

      mockOracleDb.default.createPool.mockResolvedValue(failingPool);

      await connectionManager.initialize(mockConfig);

      // 多次失敗後應該觸發斷路器
      for (let i = 0; i < 5; i++) {
        await connectionManager.executeQuery('SELECT 1 FROM dual');
      }

      const circuitBreakerState = connectionManager.getCircuitBreakerState();

      expect(circuitBreakerState.isOpen).toBe(true);
      expect(circuitBreakerState.failureCount).toBeGreaterThan(0);
    });
  });
});
