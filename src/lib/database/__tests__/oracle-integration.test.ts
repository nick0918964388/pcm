import { describe, it, expect } from 'vitest'
import { getOracleConnection } from '../oracle-connection'

describe('Oracle Integration Tests', () => {
  it('應該能正確創建Oracle連線管理器實例', () => {
    // When
    const connection = getOracleConnection()

    // Then
    expect(connection).toBeDefined()
    expect(typeof connection.initialize).toBe('function')
    expect(typeof connection.executeQuery).toBe('function')
    expect(typeof connection.healthCheck).toBe('function')
    expect(typeof connection.shutdown).toBe('function')
  })

  it('應該能正確返回未初始化錯誤', async () => {
    // Given
    const connection = getOracleConnection()

    // When
    const result = await connection.executeQuery('SELECT 1 FROM dual')

    // Then
    expect(result.success).toBe(false)
    expect(result.error?.message).toContain('not initialized')
  })

  it('應該能正確返回空連線池狀態', () => {
    // Given
    const connection = getOracleConnection()

    // When
    const status = connection.getPoolStatus()

    // Then
    expect(status).toEqual({
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0
    })
  })

  it('應該能正確處理健康檢查', async () => {
    // Given
    const connection = getOracleConnection()

    // When
    const result = await connection.healthCheck()

    // Then
    expect(result.success).toBe(false)
    expect(result.data?.isHealthy).toBe(false)
    expect(result.data?.databaseStatus).toBe('ERROR')
    expect(result.data?.errorDetails).toContain('not initialized')
  })

  it('應該能正確關閉未初始化的連線', async () => {
    // Given
    const connection = getOracleConnection()

    // When
    const result = await connection.shutdown()

    // Then
    expect(result.success).toBe(true)
  })
})