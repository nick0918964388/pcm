/**
 * Oracle連線管理器的單元測試
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getOracleConnection } from '@/lib/database/oracle-connection'
import { getDefaultOracleConfig } from '@/lib/database/oracle-connection'

describe('Oracle Connection Manager', () => {
  const oracle = getOracleConnection()

  beforeAll(async () => {
    // 初始化Oracle連線
    const config = getDefaultOracleConfig()
    const result = await oracle.initialize(config)
    expect(result.success).toBe(true)
  })

  afterAll(async () => {
    // 清理連線
    await oracle.shutdown()
  })

  it('應該能夠執行基本查詢', async () => {
    const result = await oracle.executeOne('SELECT 1 as test_value FROM dual')

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data?.TEST_VALUE).toBe(1)
  })

  it('應該能夠執行健康檢查', async () => {
    const result = await oracle.healthCheck()

    expect(result.success).toBe(true)
    expect(result.data?.isHealthy).toBe(true)
  })

  it('應該能夠取得連線池狀態', () => {
    const poolStatus = oracle.getPoolStatus()

    expect(poolStatus).toBeDefined()
    expect(poolStatus.totalConnections).toBeGreaterThanOrEqual(0)
    expect(poolStatus.activeConnections).toBeGreaterThanOrEqual(0)
  })

  it('應該能夠處理JSON資料', async () => {
    const testData = { test: 'value', number: 123 }
    const jsonString = JSON.stringify(testData)

    const result = await oracle.executeOne(
      `SELECT :jsonData as json_test FROM dual`,
      { jsonData: jsonString }
    )

    expect(result.success).toBe(true)
    expect(result.data?.JSON_TEST).toBe(jsonString)

    // 驗證能夠解析回原始資料
    const parsedData = JSON.parse(result.data?.JSON_TEST)
    expect(parsedData).toEqual(testData)
  })
})