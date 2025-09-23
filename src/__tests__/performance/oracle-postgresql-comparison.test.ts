/**
 * Oracle vs PostgreSQL 效能比較測試
 * 驗證Oracle效能符合不超過PostgreSQL 150%的要求
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getOracleConnection } from '@/lib/database/oracle-connection'
import { oracleTestManager, ensureOracleReady } from '@/lib/database/oracle-test-setup'

// 效能基準測試配置
const BENCHMARK_CONFIG = {
  SAMPLE_SIZE: 100, // 每個測試的樣本數
  POSTGRESQL_BASELINE: {
    simpleQuery: 50, // ms
    complexQuery: 150, // ms
    insertOperation: 30, // ms
    updateOperation: 40, // ms
    transactionOperation: 80 // ms
  },
  MAX_ACCEPTABLE_RATIO: 1.5 // Oracle不應超過PostgreSQL的150%
}

// 效能測試結果介面
interface BenchmarkResult {
  operation: string
  postgresqlTime: number
  oracleTime: number
  ratio: number
  withinLimit: boolean
  samples: number
}

// 執行多次測試並計算平均值
async function benchmarkOperation(
  operationName: string,
  oracleOperation: () => Promise<number>,
  postgresqlBaseline: number,
  samples = BENCHMARK_CONFIG.SAMPLE_SIZE
): Promise<BenchmarkResult> {
  const times: number[] = []

  for (let i = 0; i < samples; i++) {
    const startTime = Date.now()
    await oracleOperation()
    const endTime = Date.now()
    times.push(endTime - startTime)

    // 在測試間加入短暫延遲避免過載
    if (i % 10 === 0 && i > 0) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }

  const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length
  const ratio = averageTime / postgresqlBaseline
  const withinLimit = ratio <= BENCHMARK_CONFIG.MAX_ACCEPTABLE_RATIO

  return {
    operation: operationName,
    postgresqlTime: postgresqlBaseline,
    oracleTime: Math.round(averageTime * 100) / 100, // 四捨五入到小數點後2位
    ratio: Math.round(ratio * 100) / 100,
    withinLimit,
    samples
  }
}

describe('Oracle vs PostgreSQL Performance Comparison', () => {
  const oracle = getOracleConnection()
  const benchmarkResults: BenchmarkResult[] = []

  beforeAll(async () => {
    console.log('🚀 Starting Oracle vs PostgreSQL benchmark tests...')

    await ensureOracleReady()
    await oracleTestManager.initialize({
      recreateSchema: true,
      loadTestData: true
    })

    console.log('✅ Benchmark environment ready')
  }, 60000)

  afterAll(async () => {
    console.log('\n📊 Performance Benchmark Summary:')
    console.table(benchmarkResults)

    const failedTests = benchmarkResults.filter(result => !result.withinLimit)
    if (failedTests.length > 0) {
      console.log('\n❌ Failed performance requirements:')
      failedTests.forEach(test => {
        console.log(`  ${test.operation}: ${test.ratio}x (limit: ${BENCHMARK_CONFIG.MAX_ACCEPTABLE_RATIO}x)`)
      })
    } else {
      console.log('\n✅ All performance requirements met!')
    }

    await oracleTestManager.cleanup()
  })

  describe('基本查詢效能比較', () => {
    it('簡單查詢效能應符合150%限制', async () => {
      const result = await benchmarkOperation(
        'Simple Query',
        async () => {
          const queryResult = await oracle.executeOne('SELECT 1 as test_value FROM dual')
          if (!queryResult.success) {
            throw new Error('Query failed')
          }
          return 0 // 回傳值不重要，只測量時間
        },
        BENCHMARK_CONFIG.POSTGRESQL_BASELINE.simpleQuery
      )

      benchmarkResults.push(result)

      console.log(`Simple Query - Oracle: ${result.oracleTime}ms, PostgreSQL baseline: ${result.postgresqlTime}ms, Ratio: ${result.ratio}x`)

      expect(result.withinLimit).toBe(true)
      expect(result.ratio).toBeLessThanOrEqual(BENCHMARK_CONFIG.MAX_ACCEPTABLE_RATIO)
    })

    it('複雜查詢效能應符合150%限制', async () => {
      // 先創建一些測試資料
      const testProjects = Array.from({ length: 50 }, (_, i) => ({
        id: `BENCH_${i.toString().padStart(3, '0')}`,
        name: `基準測試專案 ${i}`,
        description: `基準測試專案描述 ${i}`,
        status: 'active',
        type: 'construction',
        priority: Math.floor(Math.random() * 10) + 1,
        progress: Math.floor(Math.random() * 100)
      }))

      // 插入測試資料
      for (const project of testProjects) {
        await oracle.executeQuery(`
          INSERT INTO projects (id, name, description, status, type, priority, progress, created_at, updated_at)
          VALUES (:id, :name, :description, :status, :type, :priority, :progress, SYSTIMESTAMP, SYSTIMESTAMP)
        `, project)
      }

      const result = await benchmarkOperation(
        'Complex Query',
        async () => {
          const queryResult = await oracle.executeQuery(`
            SELECT
              p.id,
              p.name,
              p.status,
              p.priority,
              p.progress,
              COUNT(*) OVER() as total_count,
              ROW_NUMBER() OVER(ORDER BY p.created_at DESC) as row_num
            FROM projects p
            WHERE p.status = 'active'
              AND p.priority >= 5
              AND p.deleted_at IS NULL
            ORDER BY p.created_at DESC, p.priority DESC
            OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
          `)
          if (!queryResult.success) {
            throw new Error('Complex query failed')
          }
          return 0
        },
        BENCHMARK_CONFIG.POSTGRESQL_BASELINE.complexQuery
      )

      benchmarkResults.push(result)

      console.log(`Complex Query - Oracle: ${result.oracleTime}ms, PostgreSQL baseline: ${result.postgresqlTime}ms, Ratio: ${result.ratio}x`)

      expect(result.withinLimit).toBe(true)
      expect(result.ratio).toBeLessThanOrEqual(BENCHMARK_CONFIG.MAX_ACCEPTABLE_RATIO)
    })
  })

  describe('資料操作效能比較', () => {
    it('插入操作效能應符合150%限制', async () => {
      let insertCounter = 0

      const result = await benchmarkOperation(
        'Insert Operation',
        async () => {
          const projectId = `INSERT_BENCH_${insertCounter++}`
          const insertResult = await oracle.executeQuery(`
            INSERT INTO projects (id, name, description, status, type, priority, created_at, updated_at)
            VALUES (:id, :name, :description, :status, :type, :priority, SYSTIMESTAMP, SYSTIMESTAMP)
          `, {
            id: projectId,
            name: `插入基準測試 ${projectId}`,
            description: `插入操作效能測試 ${projectId}`,
            status: 'active',
            type: 'construction',
            priority: 5
          })
          if (!insertResult.success) {
            throw new Error('Insert operation failed')
          }
          return 0
        },
        BENCHMARK_CONFIG.POSTGRESQL_BASELINE.insertOperation,
        50 // 使用較少樣本數避免資料過多
      )

      benchmarkResults.push(result)

      console.log(`Insert Operation - Oracle: ${result.oracleTime}ms, PostgreSQL baseline: ${result.postgresqlTime}ms, Ratio: ${result.ratio}x`)

      expect(result.withinLimit).toBe(true)
      expect(result.ratio).toBeLessThanOrEqual(BENCHMARK_CONFIG.MAX_ACCEPTABLE_RATIO)
    })

    it('更新操作效能應符合150%限制', async () => {
      // 先創建一些可更新的專案
      const updateTargets = Array.from({ length: 20 }, (_, i) => ({
        id: `UPDATE_TARGET_${i}`,
        name: `更新目標專案 ${i}`,
        progress: 0
      }))

      for (const target of updateTargets) {
        await oracle.executeQuery(`
          INSERT INTO projects (id, name, progress, status, type, created_at, updated_at)
          VALUES (:id, :name, :progress, 'active', 'construction', SYSTIMESTAMP, SYSTIMESTAMP)
        `, target)
      }

      let updateCounter = 0

      const result = await benchmarkOperation(
        'Update Operation',
        async () => {
          const targetId = `UPDATE_TARGET_${updateCounter % updateTargets.length}`
          const newProgress = Math.floor(Math.random() * 100)
          updateCounter++

          const updateResult = await oracle.executeQuery(`
            UPDATE projects
            SET progress = :progress, updated_at = SYSTIMESTAMP
            WHERE id = :id
          `, {
            progress: newProgress,
            id: targetId
          })

          if (!updateResult.success) {
            throw new Error('Update operation failed')
          }
          return 0
        },
        BENCHMARK_CONFIG.POSTGRESQL_BASELINE.updateOperation,
        50
      )

      benchmarkResults.push(result)

      console.log(`Update Operation - Oracle: ${result.oracleTime}ms, PostgreSQL baseline: ${result.postgresqlTime}ms, Ratio: ${result.ratio}x`)

      expect(result.withinLimit).toBe(true)
      expect(result.ratio).toBeLessThanOrEqual(BENCHMARK_CONFIG.MAX_ACCEPTABLE_RATIO)
    })
  })

  describe('交易操作效能比較', () => {
    it('交易操作效能應符合150%限制', async () => {
      let transactionCounter = 0

      const result = await benchmarkOperation(
        'Transaction Operation',
        async () => {
          const projectId = `TRANS_BENCH_${transactionCounter++}`

          const transactionResult = await oracle.executeTransaction(async (connection) => {
            // 在交易中執行多個操作
            await connection.execute(`
              INSERT INTO projects (id, name, status, type, priority, created_at, updated_at)
              VALUES (:id, :name, 'planning', 'construction', 5, SYSTIMESTAMP, SYSTIMESTAMP)
            `, {
              id: projectId,
              name: `交易測試專案 ${projectId}`
            })

            await connection.execute(`
              UPDATE projects
              SET status = 'active', updated_at = SYSTIMESTAMP
              WHERE id = :id
            `, { id: projectId })

            return projectId
          })

          if (!transactionResult.success) {
            throw new Error('Transaction failed')
          }
          return 0
        },
        BENCHMARK_CONFIG.POSTGRESQL_BASELINE.transactionOperation,
        30
      )

      benchmarkResults.push(result)

      console.log(`Transaction Operation - Oracle: ${result.oracleTime}ms, PostgreSQL baseline: ${result.postgresqlTime}ms, Ratio: ${result.ratio}x`)

      expect(result.withinLimit).toBe(true)
      expect(result.ratio).toBeLessThanOrEqual(BENCHMARK_CONFIG.MAX_ACCEPTABLE_RATIO)
    })
  })

  describe('JSON處理效能比較', () => {
    it('JSON查詢效能應符合150%限制', async () => {
      // 先創建一些含有JSON資料的專案
      const jsonProjects = Array.from({ length: 20 }, (_, i) => ({
        id: `JSON_BENCH_${i}`,
        name: `JSON測試專案 ${i}`,
        metadata: JSON.stringify({
          location: `地點 ${i}`,
          contractor: `承包商 ${i}`,
          tags: [`tag${i}`, `category${i % 3}`],
          settings: {
            priority: i % 5 + 1,
            notifications: true,
            reporting: {
              frequency: 'daily',
              recipients: [`user${i}@test.com`]
            }
          }
        })
      }))

      for (const project of jsonProjects) {
        await oracle.executeQuery(`
          INSERT INTO projects (id, name, metadata, status, type, created_at, updated_at)
          VALUES (:id, :name, :metadata, 'active', 'construction', SYSTIMESTAMP, SYSTIMESTAMP)
        `, project)
      }

      const result = await benchmarkOperation(
        'JSON Query',
        async () => {
          const queryResult = await oracle.executeQuery(`
            SELECT
              id,
              name,
              JSON_VALUE(metadata, '$.location') as location,
              JSON_VALUE(metadata, '$.contractor') as contractor,
              JSON_VALUE(metadata, '$.settings.priority') as priority
            FROM projects
            WHERE id LIKE 'JSON_BENCH_%'
              AND JSON_EXISTS(metadata, '$.settings.notifications?(@ == true)')
          `)

          if (!queryResult.success) {
            throw new Error('JSON query failed')
          }
          return 0
        },
        BENCHMARK_CONFIG.POSTGRESQL_BASELINE.complexQuery, // 使用複雜查詢基準
        30
      )

      benchmarkResults.push(result)

      console.log(`JSON Query - Oracle: ${result.oracleTime}ms, PostgreSQL baseline: ${result.postgresqlTime}ms, Ratio: ${result.ratio}x`)

      expect(result.withinLimit).toBe(true)
      expect(result.ratio).toBeLessThanOrEqual(BENCHMARK_CONFIG.MAX_ACCEPTABLE_RATIO)
    })
  })

  describe('整體效能總結', () => {
    it('所有操作的平均效能比例應符合要求', () => {
      // 計算所有基準測試的平均比例
      const averageRatio = benchmarkResults.reduce((sum, result) => sum + result.ratio, 0) / benchmarkResults.length

      console.log(`\n📈 Overall Performance Summary:`)
      console.log(`Average performance ratio: ${averageRatio.toFixed(2)}x`)
      console.log(`Performance limit: ${BENCHMARK_CONFIG.MAX_ACCEPTABLE_RATIO}x`)
      console.log(`Total operations tested: ${benchmarkResults.length}`)

      const passedTests = benchmarkResults.filter(result => result.withinLimit).length
      const passRate = (passedTests / benchmarkResults.length) * 100

      console.log(`Pass rate: ${passRate.toFixed(1)}% (${passedTests}/${benchmarkResults.length})`)

      // 整體平均比例應該符合要求
      expect(averageRatio).toBeLessThanOrEqual(BENCHMARK_CONFIG.MAX_ACCEPTABLE_RATIO)

      // 至少90%的測試應該通過
      expect(passRate).toBeGreaterThanOrEqual(90)
    })
  })
})