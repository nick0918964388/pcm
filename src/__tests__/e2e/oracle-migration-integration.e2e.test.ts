/**
 * Task 9.1: 端到端系統整合測試
 * 驗證Oracle遷移後的完整使用者工作流程和系統穩定性
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { exec } from 'child_process'
import { promisify } from 'util'
import fetch from 'node-fetch'
import { oracleTestManager, ensureOracleReady } from '@/lib/database/oracle-test-setup'

const execAsync = promisify(exec)

// 測試配置
const TEST_CONFIG = {
  API_BASE_URL: process.env.TEST_API_URL || 'http://localhost:3000',
  ORACLE_CONTAINER: 'pcm-oracle-dev',
  DATABASE_USER: 'system',
  DATABASE_PASSWORD: process.env.ORACLE_PASSWORD || 'Oracle123',
  TEST_TIMEOUT: 60000, // 60秒
  RETRY_ATTEMPTS: 3,
  WAIT_INTERVAL: 2000 // 2秒
}

// 輔助函數
async function waitForService(url: string, timeout = 30000): Promise<boolean> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      if (response.ok) return true
    } catch (error) {
      // 繼續等待
    }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  return false
}

async function executeOracleQuery(query: string): Promise<any> {
  const command = `docker exec ${TEST_CONFIG.ORACLE_CONTAINER} sqlplus -L -S ${TEST_CONFIG.DATABASE_USER}/${TEST_CONFIG.DATABASE_PASSWORD}@//localhost:1521/XE <<< "${query}; EXIT;"`

  try {
    const { stdout, stderr } = await execAsync(command)
    if (stderr && !stderr.includes('WARNING')) {
      throw new Error(`Oracle query failed: ${stderr}`)
    }
    return stdout
  } catch (error) {
    throw new Error(`Failed to execute Oracle query: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function makeApiRequest(endpoint: string, options: any = {}): Promise<any> {
  const url = `${TEST_CONFIG.API_BASE_URL}${endpoint}`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// 測試資料
const TEST_PROJECT = {
  id: 'TEST_PROJ_001',
  name: '測試專案E2E',
  description: '端到端測試專案',
  status: 'active',
  type: 'construction',
  priority: 5,
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  budget: 1000000,
  progress: 25.5,
  manager_id: 'TEST_USER_001'
}

const TEST_USER = {
  id: 'TEST_USER_001',
  username: 'test_user_e2e',
  email: 'test@pcm.test',
  role: 'manager'
}

const TEST_PHOTO_ALBUM = {
  project_id: 'TEST_PROJ_001',
  name: '測試相簿E2E',
  description: '端到端測試相簿'
}

describe('Task 9.1: Oracle Migration End-to-End Integration Tests', () => {
  beforeAll(async () => {
    console.log('🚀 Starting E2E integration tests for Oracle migration...')

    // 確保Oracle容器和資料庫準備就緒
    try {
      await ensureOracleReady()
      console.log('✅ Oracle container and database are ready')
    } catch (error) {
      throw new Error(`Oracle setup failed: ${error instanceof Error ? error.message : String(error)}`)
    }

    // 初始化測試資料庫
    try {
      await oracleTestManager.initialize({
        recreateSchema: true,
        loadTestData: true
      })
      console.log('✅ Oracle test database initialized')
    } catch (error) {
      throw new Error(`Oracle database setup failed: ${error instanceof Error ? error.message : String(error)}`)
    }

    // 等待API服務就緒
    const apiReady = await waitForService(`${TEST_CONFIG.API_BASE_URL}/api/health`)
    if (!apiReady) {
      throw new Error('API service is not ready within timeout')
    }
    console.log('✅ API service is ready')
  }, TEST_CONFIG.TEST_TIMEOUT)

  afterAll(async () => {
    console.log('🧹 Cleaning up test data...')
    try {
      await oracleTestManager.cleanup()
      console.log('✅ Oracle test cleanup completed')
    } catch (error) {
      console.warn('⚠️ Oracle cleanup failed:', error)
    }
  })

  beforeEach(async () => {
    // 每個測試前的準備工作
  })

  afterEach(async () => {
    // 每個測試後的清理工作
  })

  describe('1. 完整使用者工作流程測試', () => {
    it('應該能夠完成專案建立到照片管理的完整流程', async () => {
      // RED: 這個測試最初會失敗，因為我們還沒有實作Oracle相關的API

      // 步驟1: 建立測試專案
      const projectResponse = await makeApiRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify(TEST_PROJECT)
      })

      expect(projectResponse).toBeDefined()
      expect(projectResponse.success).toBe(true)
      expect(projectResponse.data.id).toBe(TEST_PROJECT.id)
      expect(projectResponse.data.name).toBe(TEST_PROJECT.name)

      // 步驟2: 驗證專案在Oracle中存在
      const dbResult = await executeOracleQuery(`SELECT name, status FROM projects WHERE id = '${TEST_PROJECT.id}'`)
      expect(dbResult).toContain(TEST_PROJECT.name)
      expect(dbResult).toContain(TEST_PROJECT.status)

      // 步驟3: 建立相簿
      const albumResponse = await makeApiRequest(`/api/projects/${TEST_PROJECT.id}/albums`, {
        method: 'POST',
        body: JSON.stringify(TEST_PHOTO_ALBUM)
      })

      expect(albumResponse).toBeDefined()
      expect(albumResponse.data.project_id).toBe(TEST_PROJECT.id)

      // 步驟4: 查詢專案列表
      const projectsResponse = await makeApiRequest('/api/projects')
      expect(projectsResponse.data).toBeInstanceOf(Array)
      expect(projectsResponse.data.some((p: any) => p.id === TEST_PROJECT.id)).toBe(true)

      // 步驟5: 更新專案進度
      const updatedProject = { ...TEST_PROJECT, progress: 50.0 }
      const updateResponse = await makeApiRequest(`/api/projects/${TEST_PROJECT.id}`, {
        method: 'PUT',
        body: JSON.stringify({ progress: 50.0 })
      })

      expect(updateResponse.data.progress).toBe(50.0)

      // 步驟6: 驗證更新在Oracle中生效
      const updatedDbResult = await executeOracleQuery(`SELECT progress FROM projects WHERE id = '${TEST_PROJECT.id}'`)
      expect(updatedDbResult).toContain('50')
    })

    it('應該能夠處理JSON metadata欄位', async () => {
      // RED: 測試Oracle JSON功能

      const projectWithMetadata = {
        ...TEST_PROJECT,
        id: 'TEST_PROJ_002',
        metadata: {
          location: '台北市',
          contractor: '測試營造公司',
          tags: ['重要', '緊急']
        }
      }

      const response = await makeApiRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify(projectWithMetadata)
      })

      expect(response.data.metadata).toEqual(projectWithMetadata.metadata)

      // 驗證Oracle JSON查詢功能
      const dbResult = await executeOracleQuery(`SELECT JSON_VALUE(metadata, '$.location') as location FROM projects WHERE id = '${projectWithMetadata.id}'`)
      expect(dbResult).toContain('台北市')
    })
  })

  describe('2. 錯誤處理和恢復機制測試', () => {
    it('應該正確處理Oracle特有的錯誤', async () => {
      // RED: 測試Oracle錯誤處理

      // 測試唯一約束違反 (ORA-00001)
      await makeApiRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify(TEST_PROJECT)
      })

      try {
        await makeApiRequest('/api/projects', {
          method: 'POST',
          body: JSON.stringify(TEST_PROJECT) // 重複的ID
        })
        expect.fail('Should have thrown duplicate error')
      } catch (error) {
        expect(error.message).toContain('409') // Conflict
      }

      // 測試無效資料類型
      try {
        await makeApiRequest('/api/projects', {
          method: 'POST',
          body: JSON.stringify({
            ...TEST_PROJECT,
            id: 'TEST_PROJ_003',
            progress: 'invalid_number' // 無效的數字
          })
        })
        expect.fail('Should have thrown validation error')
      } catch (error) {
        expect(error.message).toContain('400') // Bad Request
      }
    })

    it('應該能夠從連線失敗中恢復', async () => {
      // RED: 測試連線池恢復機制

      // 暫時停止Oracle容器來模擬連線失敗
      await execAsync(`docker pause ${TEST_CONFIG.ORACLE_CONTAINER}`)

      try {
        // 等待短暫時間確保連線失敗
        await new Promise(resolve => setTimeout(resolve, 2000))

        // 嘗試API請求，應該失敗
        try {
          await makeApiRequest('/api/projects')
          expect.fail('Should have failed due to database connection')
        } catch (error) {
          expect(error.message).toContain('503') // Service Unavailable
        }

        // 恢復Oracle容器
        await execAsync(`docker unpause ${TEST_CONFIG.ORACLE_CONTAINER}`)

        // 等待恢復
        await new Promise(resolve => setTimeout(resolve, 5000))

        // 驗證服務恢復
        const response = await makeApiRequest('/api/projects')
        expect(response).toBeDefined()

      } finally {
        // 確保容器恢復運行
        await execAsync(`docker unpause ${TEST_CONFIG.ORACLE_CONTAINER} 2>/dev/null || true`)
      }
    })
  })

  describe('3. 系統穩定性測試', () => {
    it('應該能夠處理多個並發請求', async () => {
      // RED: 測試並發處理能力

      const concurrentRequests = 10
      const requests = []

      for (let i = 0; i < concurrentRequests; i++) {
        const testProject = {
          ...TEST_PROJECT,
          id: `TEST_CONCURRENT_${i}`,
          name: `並發測試專案 ${i}`
        }

        requests.push(
          makeApiRequest('/api/projects', {
            method: 'POST',
            body: JSON.stringify(testProject)
          })
        )
      }

      const responses = await Promise.all(requests)

      expect(responses).toHaveLength(concurrentRequests)
      responses.forEach((response, index) => {
        expect(response.data.id).toBe(`TEST_CONCURRENT_${index}`)
      })

      // 驗證所有專案都在資料庫中
      const dbResult = await executeOracleQuery(`SELECT COUNT(*) as count FROM projects WHERE id LIKE 'TEST_CONCURRENT_%'`)
      expect(dbResult).toContain(concurrentRequests.toString())
    })

    it('應該維持長時間運行的穩定性', async () => {
      // RED: 測試長時間運行穩定性

      const operationCount = 50
      const operations = []

      for (let i = 0; i < operationCount; i++) {
        operations.push(async () => {
          const testProject = {
            ...TEST_PROJECT,
            id: `TEST_STABILITY_${i}`,
            name: `穩定性測試專案 ${i}`
          }

          // 建立
          await makeApiRequest('/api/projects', {
            method: 'POST',
            body: JSON.stringify(testProject)
          })

          // 查詢
          await makeApiRequest(`/api/projects/${testProject.id}`)

          // 更新
          await makeApiRequest(`/api/projects/${testProject.id}`, {
            method: 'PUT',
            body: JSON.stringify({ progress: Math.random() * 100 })
          })

          // 短暫延遲
          await new Promise(resolve => setTimeout(resolve, 100))
        })
      }

      // 循序執行所有操作
      for (const operation of operations) {
        await operation()
      }

      // 驗證資料完整性
      const dbResult = await executeOracleQuery(`SELECT COUNT(*) as count FROM projects WHERE id LIKE 'TEST_STABILITY_%'`)
      expect(dbResult).toContain(operationCount.toString())
    })
  })

  describe('4. API功能正確性驗證', () => {
    it('應該正確處理分頁查詢', async () => {
      // RED: 測試Oracle OFFSET FETCH分頁

      // 建立測試資料
      const testProjects = []
      for (let i = 0; i < 15; i++) {
        testProjects.push({
          ...TEST_PROJECT,
          id: `TEST_PAGE_${i.toString().padStart(3, '0')}`,
          name: `分頁測試專案 ${i}`
        })
      }

      for (const project of testProjects) {
        await makeApiRequest('/api/projects', {
          method: 'POST',
          body: JSON.stringify(project)
        })
      }

      // 測試第一頁
      const page1 = await makeApiRequest('/api/projects?page=1&limit=5')
      expect(page1.data).toHaveLength(5)
      expect(page1.meta.total).toBeGreaterThanOrEqual(15)
      expect(page1.meta.page).toBe(1)

      // 測試第二頁
      const page2 = await makeApiRequest('/api/projects?page=2&limit=5')
      expect(page2.data).toHaveLength(5)
      expect(page2.meta.page).toBe(2)

      // 驗證分頁資料不重複
      const page1Ids = page1.data.map((p: any) => p.id)
      const page2Ids = page2.data.map((p: any) => p.id)
      const intersection = page1Ids.filter((id: string) => page2Ids.includes(id))
      expect(intersection).toHaveLength(0)
    })

    it('應該正確處理日期時間查詢', async () => {
      // RED: 測試Oracle日期時間處理

      const projectWithDates = {
        ...TEST_PROJECT,
        id: 'TEST_DATETIME_001',
        start_date: '2024-01-15T09:00:00Z',
        end_date: '2024-12-31T18:00:00Z'
      }

      await makeApiRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify(projectWithDates)
      })

      // 查詢特定日期範圍的專案
      const response = await makeApiRequest('/api/projects?start_date_from=2024-01-01&start_date_to=2024-02-01')

      expect(response.data.some((p: any) => p.id === projectWithDates.id)).toBe(true)

      // 驗證Oracle日期格式
      const dbResult = await executeOracleQuery(`SELECT TO_CHAR(start_date, 'YYYY-MM-DD') as start_date FROM projects WHERE id = '${projectWithDates.id}'`)
      expect(dbResult).toContain('2024-01-15')
    })
  })

  // 輔助函數
  async function cleanupTestData() {
    try {
      // 清理測試專案
      await executeOracleQuery(`DELETE FROM photo_albums WHERE project_id LIKE 'TEST_%'`)
      await executeOracleQuery(`DELETE FROM projects WHERE id LIKE 'TEST_%'`)
      await executeOracleQuery(`COMMIT`)

      console.log('✅ Test data cleaned up')
    } catch (error) {
      console.warn('⚠️ Failed to cleanup test data:', error instanceof Error ? error.message : String(error))
    }
  }
})