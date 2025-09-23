import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock oracledb module
vi.mock('oracledb', () => ({
  default: {
    createPool: vi.fn(),
    getConnection: vi.fn(),
    BIND_INOUT: 'BIND_INOUT',
    BIND_IN: 'BIND_IN',
    BIND_OUT: 'BIND_OUT',
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    DATE: 'DATE',
    CURSOR: 'CURSOR',
    initOracleClient: vi.fn(),
    OUT_FORMAT_OBJECT: 4001,
    OUT_FORMAT_ARRAY: 4002,
    outFormat: 4001,
    autoCommit: false
  }
}))

import { OracleConnectionManager } from '../oracle-connection'
import type { OracleConfig, HealthStatus } from '../oracle-connection'

describe('OracleConnectionManager', () => {
  let connectionManager: OracleConnectionManager
  let mockConfig: OracleConfig

  beforeEach(() => {
    mockConfig = {
      connectString: 'localhost:1521/XEPDB1',
      user: 'pcm_user',
      password: 'pcm_pass123',
      poolMin: 5,
      poolMax: 20,
      poolIncrement: 2,
      poolTimeout: 60,
      enableStatistics: true
    }

    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(async () => {
    if (connectionManager) {
      await connectionManager.shutdown()
    }
  })

  describe('初始化Oracle連線管理器', () => {
    it('應該成功初始化連線池', async () => {
      // Given
      const mockPool = {
        getConnection: vi.fn(),
        close: vi.fn(),
        connectionsOpen: 5,
        connectionsInUse: 2
      }

      vi.mocked(await import('oracledb')).default.createPool.mockResolvedValue(mockPool)

      // When
      connectionManager = new OracleConnectionManager()
      const result = await connectionManager.initialize(mockConfig)

      // Then
      expect(result.success).toBe(true)
      expect(vi.mocked(await import('oracledb')).default.createPool).toHaveBeenCalledWith({
        connectString: mockConfig.connectString,
        user: mockConfig.user,
        password: mockConfig.password,
        poolMin: mockConfig.poolMin,
        poolMax: mockConfig.poolMax,
        poolIncrement: mockConfig.poolIncrement,
        poolTimeout: mockConfig.poolTimeout,
        enableStatistics: mockConfig.enableStatistics
      })
    })

    it('應該在連線失敗時返回錯誤', async () => {
      // Given
      const error = new Error('Oracle connection failed')
      vi.mocked(await import('oracledb')).default.createPool.mockRejectedValue(error)

      // When
      connectionManager = new OracleConnectionManager()
      const result = await connectionManager.initialize(mockConfig)

      // Then
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('Oracle connection failed')
    })
  })

  describe('執行查詢操作', () => {
    beforeEach(async () => {
      const mockPool = {
        getConnection: vi.fn(),
        close: vi.fn(),
        connectionsOpen: 5,
        connectionsInUse: 2
      }

      vi.mocked(await import('oracledb')).default.createPool.mockResolvedValue(mockPool)
      connectionManager = new OracleConnectionManager()
      await connectionManager.initialize(mockConfig)
    })

    it('應該成功執行查詢並返回結果', async () => {
      // Given
      const mockConnection = {
        execute: vi.fn().mockResolvedValue({
          rows: [{ id: 1, name: 'Test Project' }]
        }),
        close: vi.fn()
      }

      const mockPool = connectionManager['pool']
      mockPool.getConnection = vi.fn().mockResolvedValue(mockConnection)

      // When
      const result = await connectionManager.executeQuery<{id: number, name: string}>(
        'SELECT id, name FROM projects WHERE id = :id',
        { id: 1 }
      )

      // Then
      expect(result.success).toBe(true)
      expect(result.data).toEqual([{ id: 1, name: 'Test Project' }])
      expect(mockConnection.execute).toHaveBeenCalledWith(
        'SELECT id, name FROM projects WHERE id = :id',
        { id: 1 }
      )
      expect(mockConnection.close).toHaveBeenCalled()
    })

    it('應該在查詢失敗時返回錯誤', async () => {
      // Given
      const error = new Error('Query execution failed')
      const mockConnection = {
        execute: vi.fn().mockRejectedValue(error),
        close: vi.fn()
      }

      const mockPool = connectionManager['pool']
      mockPool.getConnection = vi.fn().mockResolvedValue(mockConnection)

      // When
      const result = await connectionManager.executeQuery(
        'INVALID SQL SYNTAX',
        {}
      )

      // Then
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('Query execution failed')
      expect(mockConnection.close).toHaveBeenCalled()
    })
  })

  describe('健康檢查功能', () => {
    beforeEach(async () => {
      const mockPool = {
        getConnection: vi.fn(),
        close: vi.fn(),
        connectionsOpen: 5,
        connectionsInUse: 2
      }

      vi.mocked(await import('oracledb')).default.createPool.mockResolvedValue(mockPool)
      connectionManager = new OracleConnectionManager()
      await connectionManager.initialize(mockConfig)
    })

    it('應該在資料庫可用時返回健康狀態', async () => {
      // Given
      const mockConnection = {
        execute: vi.fn().mockResolvedValue({
          rows: [{ result: 1 }]
        }),
        close: vi.fn()
      }

      const mockPool = connectionManager['pool']
      mockPool.getConnection = vi.fn().mockResolvedValue(mockConnection)

      // When
      const result = await connectionManager.healthCheck()

      // Then
      expect(result.success).toBe(true)
      expect(result.data?.isHealthy).toBe(true)
      expect(result.data?.databaseStatus).toBe('READY')
    })

    it('應該在資料庫不可用時返回錯誤狀態', async () => {
      // Given
      const error = new Error('Database connection failed')
      const mockPool = connectionManager['pool']
      mockPool.getConnection = vi.fn().mockRejectedValue(error)

      // When
      const result = await connectionManager.healthCheck()

      // Then
      expect(result.success).toBe(false)
      expect(result.data?.isHealthy).toBe(false)
      expect(result.data?.databaseStatus).toBe('ERROR')
      expect(result.data?.errorDetails).toContain('Database connection failed')
    })
  })

  describe('連線池管理', () => {
    beforeEach(async () => {
      const mockPool = {
        getConnection: vi.fn(),
        close: vi.fn(),
        connectionsOpen: 5,
        connectionsInUse: 2
      }

      vi.mocked(await import('oracledb')).default.createPool.mockResolvedValue(mockPool)
      connectionManager = new OracleConnectionManager()
      await connectionManager.initialize(mockConfig)
    })

    it('應該返回正確的連線池狀態', () => {
      // When
      const status = connectionManager.getPoolStatus()

      // Then
      expect(status.totalConnections).toBe(5)
      expect(status.activeConnections).toBe(2)
      expect(status.idleConnections).toBe(3)
    })

    it('應該成功關閉連線池', async () => {
      // Given
      const mockPool = connectionManager['pool']
      mockPool.close = vi.fn().mockResolvedValue(undefined)

      // When
      const result = await connectionManager.shutdown()

      // Then
      expect(result.success).toBe(true)
      expect(mockPool.close).toHaveBeenCalled()
    })
  })

  describe('交易管理', () => {
    beforeEach(async () => {
      const mockPool = {
        getConnection: vi.fn(),
        close: vi.fn(),
        connectionsOpen: 5,
        connectionsInUse: 2
      }

      vi.mocked(await import('oracledb')).default.createPool.mockResolvedValue(mockPool)
      connectionManager = new OracleConnectionManager()
      await connectionManager.initialize(mockConfig)
    })

    it('應該成功執行交易並提交', async () => {
      // Given
      const mockConnection = {
        execute: vi.fn()
          .mockResolvedValueOnce({ rowsAffected: 1 }) // BEGIN
          .mockResolvedValueOnce({ rowsAffected: 1 }) // INSERT
          .mockResolvedValueOnce({ rowsAffected: 1 }), // COMMIT
        close: vi.fn()
      }

      const mockPool = connectionManager['pool']
      mockPool.getConnection = vi.fn().mockResolvedValue(mockConnection)

      const transactionCallback = vi.fn().mockResolvedValue('success')

      // When
      const result = await connectionManager.executeTransaction(transactionCallback)

      // Then
      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(transactionCallback).toHaveBeenCalledWith(mockConnection)
    })

    it('應該在交易失敗時回滾', async () => {
      // Given
      const error = new Error('Transaction failed')
      const mockConnection = {
        execute: vi.fn()
          .mockResolvedValueOnce({ rowsAffected: 1 }) // BEGIN
          .mockResolvedValueOnce({ rowsAffected: 1 }), // ROLLBACK
        close: vi.fn()
      }

      const mockPool = connectionManager['pool']
      mockPool.getConnection = vi.fn().mockResolvedValue(mockConnection)

      const transactionCallback = vi.fn().mockRejectedValue(error)

      // When
      const result = await connectionManager.executeTransaction(transactionCallback)

      // Then
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('Transaction failed')
      expect(mockConnection.execute).toHaveBeenCalledWith('BEGIN')
      expect(mockConnection.execute).toHaveBeenCalledWith('ROLLBACK')
    })
  })
})