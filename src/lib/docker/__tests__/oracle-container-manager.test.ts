import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OracleContainerManager } from '../oracle-container-manager'
import type { ContainerStatus, DatabaseInitStatus, HealthStatus } from '../oracle-container-manager'

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
  spawn: vi.fn(),
  execSync: vi.fn()
}))

// Mock fs
vi.mock('fs/promises', () => ({
  access: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn()
}))

describe('OracleContainerManager', () => {
  let containerManager: OracleContainerManager

  beforeEach(() => {
    containerManager = new OracleContainerManager()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('容器狀態檢查', () => {
    it('應該正確檢查容器運行狀態', async () => {
      // Given
      const mockExecOutput = JSON.stringify([{
        Names: ['/pcm-oracle-dev'],
        State: 'running',
        Status: 'Up 5 minutes',
        Ports: [
          { PrivatePort: 1521, PublicPort: 1521, Type: 'tcp' },
          { PrivatePort: 5500, PublicPort: 5500, Type: 'tcp' }
        ]
      }])

      vi.mocked(require('child_process').exec).mockImplementation((cmd, callback) => {
        if (cmd.includes('docker ps')) {
          callback(null, { stdout: mockExecOutput, stderr: '' })
        }
      })

      // When
      const result = await containerManager.getContainerStatus()

      // Then
      expect(result.success).toBe(true)
      expect(result.data?.containerName).toBe('/pcm-oracle-dev')
      expect(result.data?.state).toBe('running')
      expect(result.data?.ports).toEqual([
        { privatePort: 1521, publicPort: 1521, type: 'tcp' },
        { privatePort: 5500, publicPort: 5500, type: 'tcp' }
      ])
    })

    it('應該在容器不存在時返回適當狀態', async () => {
      // Given
      vi.mocked(require('child_process').exec).mockImplementation((cmd, callback) => {
        if (cmd.includes('docker ps')) {
          callback(null, { stdout: '[]', stderr: '' })
        }
      })

      // When
      const result = await containerManager.getContainerStatus()

      // Then
      expect(result.success).toBe(true)
      expect(result.data?.state).toBe('not_found')
    })

    it('應該在Docker命令失敗時返回錯誤', async () => {
      // Given
      const error = new Error('Docker command failed')
      vi.mocked(require('child_process').exec).mockImplementation((cmd, callback) => {
        callback(error, null)
      })

      // When
      const result = await containerManager.getContainerStatus()

      // Then
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('Docker command failed')
    })
  })

  describe('容器健康檢查', () => {
    it('應該在Oracle資料庫就緒時返回健康狀態', async () => {
      // Given
      vi.mocked(require('child_process').exec).mockImplementation((cmd, callback) => {
        if (cmd.includes('docker exec')) {
          // Mock successful SQL*Plus connection
          callback(null, { stdout: 'Connected to Oracle Database 21c Express Edition', stderr: '' })
        }
      })

      // When
      const result = await containerManager.performHealthCheck()

      // Then
      expect(result.success).toBe(true)
      expect(result.data?.isHealthy).toBe(true)
      expect(result.data?.databaseStatus).toBe('READY')
      expect(result.data?.listenPort).toBe(1521)
    })

    it('應該在Oracle資料庫未就緒時返回錯誤狀態', async () => {
      // Given
      vi.mocked(require('child_process').exec).mockImplementation((cmd, callback) => {
        if (cmd.includes('docker exec')) {
          // Mock connection failure
          callback(new Error('ORA-12514: TNS:listener does not currently know of service requested in connect descriptor'), null)
        }
      })

      // When
      const result = await containerManager.performHealthCheck()

      // Then
      expect(result.success).toBe(false)
      expect(result.data?.isHealthy).toBe(false)
      expect(result.data?.databaseStatus).toBe('ERROR')
      expect(result.data?.errorDetails).toContain('ORA-12514')
    })

    it('應該正確解析Oracle啟動中狀態', async () => {
      // Given
      vi.mocked(require('child_process').exec).mockImplementation((cmd, callback) => {
        if (cmd.includes('docker exec')) {
          // Mock Oracle starting up
          callback(null, { stdout: 'Oracle instance is starting up', stderr: '' })
        }
      })

      // When
      const result = await containerManager.performHealthCheck()

      // Then
      expect(result.success).toBe(true)
      expect(result.data?.isHealthy).toBe(false)
      expect(result.data?.databaseStatus).toBe('STARTING')
    })
  })

  describe('初始化腳本執行', () => {
    it('應該成功執行所有初始化腳本', async () => {
      // Given
      const mockScripts = ['01-setup-user.sql', '02-create-schema.sql']

      vi.mocked(require('fs/promises').readdir).mockResolvedValue(mockScripts)
      vi.mocked(require('child_process').exec).mockImplementation((cmd, callback) => {
        if (cmd.includes('docker exec') && cmd.includes('sqlplus')) {
          callback(null, { stdout: 'Table created.', stderr: '' })
        }
      })

      // When
      const result = await containerManager.executeStartupScripts()

      // Then
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data![0].scriptName).toBe('01-setup-user.sql')
      expect(result.data![0].success).toBe(true)
      expect(result.data![1].scriptName).toBe('02-create-schema.sql')
      expect(result.data![1].success).toBe(true)
    })

    it('應該記錄腳本執行失敗', async () => {
      // Given
      const mockScripts = ['invalid-script.sql']

      vi.mocked(require('fs/promises').readdir).mockResolvedValue(mockScripts)
      vi.mocked(require('child_process').exec).mockImplementation((cmd, callback) => {
        if (cmd.includes('docker exec') && cmd.includes('sqlplus')) {
          callback(new Error('ORA-00942: table or view does not exist'), null)
        }
      })

      // When
      const result = await containerManager.executeStartupScripts()

      // Then
      expect(result.success).toBe(false)
      expect(result.data![0].scriptName).toBe('invalid-script.sql')
      expect(result.data![0].success).toBe(false)
      expect(result.data![0].error).toContain('ORA-00942')
    })

    it('應該按檔案名稱順序執行腳本', async () => {
      // Given
      const mockScripts = ['03-create-tables.sql', '01-setup-user.sql', '02-create-schema.sql']
      const executionOrder: string[] = []

      vi.mocked(require('fs/promises').readdir).mockResolvedValue(mockScripts)
      vi.mocked(require('child_process').exec).mockImplementation((cmd, callback) => {
        const scriptMatch = cmd.match(/(@[^@]+\.sql)/)
        if (scriptMatch) {
          executionOrder.push(scriptMatch[1])
        }
        callback(null, { stdout: 'Success', stderr: '' })
      })

      // When
      await containerManager.executeStartupScripts()

      // Then
      expect(executionOrder).toEqual([
        '@01-setup-user.sql',
        '@02-create-schema.sql',
        '@03-create-tables.sql'
      ])
    })
  })

  describe('容器日誌監控', () => {
    it('應該能夠取得容器日誌', async () => {
      // Given
      const mockLogs = `
2025-01-23 10:00:00 [INFO] Oracle Database 21c Express Edition starting...
2025-01-23 10:01:00 [INFO] Database mounted
2025-01-23 10:02:00 [INFO] Database opened
      `.trim()

      vi.mocked(require('child_process').exec).mockImplementation((cmd, callback) => {
        if (cmd.includes('docker logs')) {
          callback(null, { stdout: mockLogs, stderr: '' })
        }
      })

      // When
      const logStream = containerManager.monitorLogs()
      const logs: any[] = []

      for await (const logEntry of logStream) {
        logs.push(logEntry)
        if (logs.length >= 3) break // 取得前3條日誌
      }

      // Then
      expect(logs).toHaveLength(3)
      expect(logs[0].level).toBe('INFO')
      expect(logs[0].message).toContain('Oracle Database 21c Express Edition starting')
      expect(logs[1].message).toContain('Database mounted')
      expect(logs[2].message).toContain('Database opened')
    })

    it('應該能夠過濾特定日誌級別', async () => {
      // Given
      const mockLogs = `
2025-01-23 10:00:00 [INFO] Starting database
2025-01-23 10:00:01 [ERROR] Failed to connect
2025-01-23 10:00:02 [INFO] Retrying connection
      `.trim()

      vi.mocked(require('child_process').exec).mockImplementation((cmd, callback) => {
        callback(null, { stdout: mockLogs, stderr: '' })
      })

      // When
      const logStream = containerManager.monitorLogs('ERROR')
      const logs: any[] = []

      for await (const logEntry of logStream) {
        logs.push(logEntry)
        if (logs.length >= 1) break // 只應該有1條錯誤日誌
      }

      // Then
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('ERROR')
      expect(logs[0].message).toContain('Failed to connect')
    })
  })

  describe('容器資源監控', () => {
    it('應該返回正確的容器資源使用情況', async () => {
      // Given
      const mockStats = JSON.stringify({
        memory_stats: {
          usage: 1073741824, // 1GB
          limit: 2147483648  // 2GB
        },
        cpu_stats: {
          cpu_usage: {
            total_usage: 1000000000
          },
          system_cpu_usage: 4000000000
        },
        precpu_stats: {
          cpu_usage: {
            total_usage: 900000000
          },
          system_cpu_usage: 3600000000
        }
      })

      vi.mocked(require('child_process').exec).mockImplementation((cmd, callback) => {
        if (cmd.includes('docker stats')) {
          callback(null, { stdout: mockStats, stderr: '' })
        }
      })

      // When
      const result = await containerManager.getContainerMetrics()

      // Then
      expect(result.success).toBe(true)
      expect(result.data?.memoryUsage).toBe(1073741824)
      expect(result.data?.memoryLimit).toBe(2147483648)
      expect(result.data?.memoryPercent).toBeCloseTo(50.0, 1)
      expect(result.data?.cpuPercent).toBeGreaterThan(0)
    })
  })
})