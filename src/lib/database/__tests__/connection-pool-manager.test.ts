/**
 * Connection Pool Manager Tests
 * 連接池管理器測試 - 實施任務 1.1 的測試
 */

import { ConnectionPoolManager } from '../connection-pool-manager'
import { DatabaseConnection, HealthStatus } from '../types'

// Mock Oracle and PostgreSQL drivers
const mockOracleConnection = {
  execute: jest.fn(),
  close: jest.fn(),
  isHealthy: jest.fn().mockReturnValue(true)
}

const mockPostgreSQLConnection = {
  query: jest.fn(),
  release: jest.fn(),
  isHealthy: jest.fn().mockReturnValue(true)
}

jest.mock('oracledb', () => ({
  getConnection: jest.fn().mockResolvedValue(mockOracleConnection),
  createPool: jest.fn().mockReturnValue({
    getConnection: jest.fn().mockResolvedValue(mockOracleConnection),
    close: jest.fn(),
    status: 1,
    connectionsInUse: 2,
    connectionsOpen: 5
  }),
  POOL_STATUS_OPEN: 1
}))

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(mockPostgreSQLConnection),
    end: jest.fn(),
    totalCount: 10,
    idleCount: 3,
    waitingCount: 0
  }))
}))

describe('ConnectionPoolManager', () => {
  let connectionPoolManager: ConnectionPoolManager

  beforeEach(() => {
    connectionPoolManager = new ConnectionPoolManager({
      oracle: {
        user: 'test_user',
        password: 'test_password',
        connectString: 'localhost:1521/xe',
        poolMax: 10,
        poolMin: 2
      },
      postgresql: {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password',
        max: 10,
        min: 2
      }
    })
  })

  afterEach(async () => {
    await connectionPoolManager.close()
    jest.clearAllMocks()
  })

  describe('Connection Pool Initialization', () => {
    it('should initialize Oracle and PostgreSQL connection pools', async () => {
      // Requirement 1.1: 建立穩定的資料庫連接池管理機制
      await connectionPoolManager.initialize()

      const poolStatus = connectionPoolManager.getPoolStatus()

      expect(poolStatus.oracle).toBeDefined()
      expect(poolStatus.postgresql).toBeDefined()
      expect(poolStatus.oracle.isInitialized).toBe(true)
      expect(poolStatus.postgresql.isInitialized).toBe(true)
    })

    it('should retry connection establishment on failure', async () => {
      // Requirement 1.2: 資料庫連接失敗時自動重試並記錄錯誤詳情
      const mockError = new Error('Connection failed')

      // Mock 前兩次連接失敗，第三次成功
      jest.spyOn(connectionPoolManager as any, 'createOraclePool')
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({})

      await connectionPoolManager.initialize()

      expect(connectionPoolManager.getPoolStatus().oracle.isInitialized).toBe(true)
    })

    it('should log detailed error information on connection failure', async () => {
      // Requirement 1.2: 記錄錯誤詳情到日誌系統
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const mockError = new Error('ORA-12154: TNS:could not resolve the connect identifier')

      jest.spyOn(connectionPoolManager as any, 'createOraclePool')
        .mockRejectedValue(mockError)

      try {
        await connectionPoolManager.initialize()
      } catch (error) {
        // Expected to fail after retries
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Database connection failed'),
        expect.objectContaining({
          error: mockError,
          attempt: expect.any(Number),
          timestamp: expect.any(String)
        })
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Connection Management', () => {
    beforeEach(async () => {
      await connectionPoolManager.initialize()
    })

    it('should provide connections within 500ms response time', async () => {
      // Requirement 1.3: API 請求存取照片資料時在 500ms 內回應查詢結果
      const startTime = Date.now()
      const connection = await connectionPoolManager.getConnection('oracle')
      const responseTime = Date.now() - startTime

      expect(responseTime).toBeLessThan(500)
      expect(connection).toBeDefined()
      expect(connection.type).toBe('oracle')
    })

    it('should support both Oracle and PostgreSQL connections', async () => {
      // Requirement 1.4: 提供統一的查詢介面抽象化資料庫差異
      const oracleConnection = await connectionPoolManager.getConnection('oracle')
      const postgresConnection = await connectionPoolManager.getConnection('postgresql')

      expect(oracleConnection.type).toBe('oracle')
      expect(postgresConnection.type).toBe('postgresql')

      // Both should implement the same interface
      expect(typeof oracleConnection.query).toBe('function')
      expect(typeof postgresConnection.query).toBe('function')
    })

    it('should manage connection lifecycle properly', async () => {
      // Requirement 1.5: 實施連接池的生命週期管理和資源釋放機制
      const connection = await connectionPoolManager.getConnection('oracle')
      const connectionId = connection.id

      // Connection should be marked as in use
      const statusBeforeRelease = connectionPoolManager.getPoolStatus()
      expect(statusBeforeRelease.oracle.connectionsInUse).toBeGreaterThan(0)

      await connectionPoolManager.releaseConnection(connection)

      // Connection should be released back to pool
      const statusAfterRelease = connectionPoolManager.getPoolStatus()
      expect(statusAfterRelease.oracle.connectionsInUse).toBeLessThan(statusBeforeRelease.oracle.connectionsInUse)
    })

    it('should handle connection release errors gracefully', async () => {
      // Requirement 1.6: 查詢失敗時返回結構化錯誤訊息
      const connection = await connectionPoolManager.getConnection('oracle')

      // Mock connection close to throw error
      connection.close = jest.fn().mockRejectedValue(new Error('Close failed'))

      await expect(connectionPoolManager.releaseConnection(connection))
        .resolves.not.toThrow()

      // Should log the error but not throw
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to release connection'),
        expect.any(Error)
      )
    })
  })

  describe('Health Check Functionality', () => {
    beforeEach(async () => {
      await connectionPoolManager.initialize()
    })

    it('should perform health check within timeout', async () => {
      // Requirement 1.3: 在 500ms 內回應查詢結果
      const startTime = Date.now()
      const healthStatus = await connectionPoolManager.healthCheck()
      const responseTime = Date.now() - startTime

      expect(responseTime).toBeLessThan(500)
      expect(healthStatus).toMatchObject({
        isHealthy: expect.any(Boolean),
        responseTime: expect.any(Number),
        oracle: expect.objectContaining({
          status: expect.any(String)
        }),
        postgresql: expect.objectContaining({
          status: expect.any(String)
        })
      })
    })

    it('should detect unhealthy connections', async () => {
      // Mock unhealthy connection
      mockOracleConnection.isHealthy.mockReturnValue(false)

      const healthStatus = await connectionPoolManager.healthCheck()

      expect(healthStatus.isHealthy).toBe(false)
      expect(healthStatus.oracle.status).toBe('unhealthy')
    })

    it('should provide detailed pool statistics', async () => {
      const poolStatus = connectionPoolManager.getPoolStatus()

      expect(poolStatus).toMatchObject({
        oracle: {
          isInitialized: true,
          connectionsOpen: expect.any(Number),
          connectionsInUse: expect.any(Number),
          status: expect.any(String)
        },
        postgresql: {
          isInitialized: true,
          totalCount: expect.any(Number),
          idleCount: expect.any(Number),
          waitingCount: expect.any(Number)
        }
      })
    })
  })

  describe('Error Handling and Resilience', () => {
    beforeEach(async () => {
      await connectionPoolManager.initialize()
    })

    it('should implement automatic retry mechanism', async () => {
      // Requirement 1.2: 自動重試機制
      const mockError = new Error('Connection timeout')

      jest.spyOn(connectionPoolManager as any, 'getOracleConnection')
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({ type: 'oracle', id: 'retry-success' })

      const connection = await connectionPoolManager.getConnection('oracle')

      expect(connection.id).toBe('retry-success')
    })

    it('should return structured error information', async () => {
      // Requirement 1.6: 返回結構化錯誤訊息包含錯誤代碼和可讀描述
      const mockError = new Error('ORA-00942: table or view does not exist')
      mockError.name = 'DatabaseError'

      jest.spyOn(connectionPoolManager as any, 'getOracleConnection')
        .mockRejectedValue(mockError)

      await expect(connectionPoolManager.getConnection('oracle'))
        .rejects.toMatchObject({
          code: 'CONNECTION_ERROR',
          message: expect.stringContaining('Failed to get database connection'),
          originalError: mockError,
          database: 'oracle'
        })
    })

    it('should handle pool exhaustion gracefully', async () => {
      // Mock pool exhaustion
      const poolExhaustedError = new Error('Pool exhausted')
      poolExhaustedError.name = 'PoolExhaustedError'

      jest.spyOn(connectionPoolManager as any, 'getOracleConnection')
        .mockRejectedValue(poolExhaustedError)

      await expect(connectionPoolManager.getConnection('oracle'))
        .rejects.toMatchObject({
          code: 'POOL_EXHAUSTED',
          message: expect.stringContaining('Connection pool exhausted'),
          retryAfter: expect.any(Number)
        })
    })
  })

  describe('Resource Cleanup', () => {
    it('should close all pools and connections properly', async () => {
      await connectionPoolManager.initialize()

      const oracleCloseSpy = jest.fn()
      const postgresCloseSpy = jest.fn()

      // Mock pool close methods
      ;(connectionPoolManager as any).oraclePool = { close: oracleCloseSpy }
      ;(connectionPoolManager as any).postgresPool = { end: postgresCloseSpy }

      await connectionPoolManager.close()

      expect(oracleCloseSpy).toHaveBeenCalled()
      expect(postgresCloseSpy).toHaveBeenCalled()
    })

    it('should handle close errors gracefully', async () => {
      await connectionPoolManager.initialize()

      const closeError = new Error('Failed to close pool')
      const oracleCloseSpy = jest.fn().mockRejectedValue(closeError)

      ;(connectionPoolManager as any).oraclePool = { close: oracleCloseSpy }

      await expect(connectionPoolManager.close()).resolves.not.toThrow()

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error closing Oracle pool'),
        closeError
      )
    })
  })
})