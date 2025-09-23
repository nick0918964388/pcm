#!/usr/bin/env tsx

/**
 * Oracle遷移測試執行腳本
 * 執行Tasks 9.1, 9.2, 9.3的完整測試套件
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { program } from 'commander'

const execAsync = promisify(exec)

interface TestResult {
  task: string
  description: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  details?: string
}

interface TestSuite {
  name: string
  file: string
  timeout: number
  required: boolean
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'Task 9.1 - End-to-End Integration Tests',
    file: 'src/__tests__/e2e/oracle-migration-integration.e2e.test.ts',
    timeout: 300000, // 5分鐘
    required: true
  },
  {
    name: 'Task 9.2 - Performance and Load Tests',
    file: 'src/__tests__/performance/oracle-performance.test.ts',
    timeout: 600000, // 10分鐘
    required: true
  },
  {
    name: 'Task 9.2 - Performance Comparison Tests',
    file: 'src/__tests__/performance/oracle-postgresql-comparison.test.ts',
    timeout: 600000, // 10分鐘
    required: true
  },
  {
    name: 'Task 9.3 - Production Readiness Check',
    file: 'src/__tests__/production-readiness/oracle-production-readiness.test.ts',
    timeout: 300000, // 5分鐘
    required: true
  },
  {
    name: 'Oracle Connection Unit Tests',
    file: 'src/__tests__/oracle-connection.test.ts',
    timeout: 60000, // 1分鐘
    required: false
  }
]

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message: string, color?: keyof typeof colors) {
  const colorCode = color ? colors[color] : ''
  console.log(`${colorCode}${message}${colors.reset}`)
}

function logStep(step: string) {
  log(`\n📋 ${step}`, 'cyan')
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green')
}

function logError(message: string) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow')
}

async function checkPrerequisites(): Promise<boolean> {
  logStep('檢查前置條件')

  try {
    // 檢查Docker是否運行
    const { stdout: dockerStatus } = await execAsync('docker ps --filter "name=pcm-oracle-dev" --format "{{.Status}}"')
    if (!dockerStatus.includes('Up')) {
      logError('Oracle容器未運行，請先執行: npm run docker:oracle:start')
      return false
    }
    logSuccess('Oracle容器運行中')

    // 檢查環境變數
    const requiredEnvVars = ['ORACLE_PASSWORD', 'ORACLE_USER']
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        logError(`環境變數 ${envVar} 未設定`)
        return false
      }
    }
    logSuccess('環境變數配置正確')

    // 設定測試環境變數
    process.env.USE_ORACLE_DB = 'true'
    process.env.NODE_ENV = 'test'

    return true
  } catch (error) {
    logError(`前置條件檢查失敗: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

async function runTestSuite(suite: TestSuite): Promise<TestResult> {
  const startTime = Date.now()

  try {
    log(`\n🧪 執行: ${suite.name}`)
    log(`   檔案: ${suite.file}`)
    log(`   超時: ${suite.timeout / 1000}秒`)

    const command = `npx vitest run ${suite.file} --reporter=verbose`

    const { stdout, stderr } = await execAsync(command, {
      timeout: suite.timeout,
      env: {
        ...process.env,
        USE_ORACLE_DB: 'true',
        NODE_ENV: 'test'
      }
    })

    const duration = Date.now() - startTime

    // 檢查測試結果
    if (stdout.includes('PASSED') || stdout.includes('✓')) {
      logSuccess(`${suite.name} - 通過 (${duration}ms)`)
      return {
        task: suite.name,
        description: suite.file,
        status: 'passed',
        duration,
        details: stdout
      }
    } else {
      logError(`${suite.name} - 失敗`)
      return {
        task: suite.name,
        description: suite.file,
        status: 'failed',
        duration,
        details: `STDOUT: ${stdout}\nSTDERR: ${stderr}`
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (errorMessage.includes('timeout')) {
      logError(`${suite.name} - 超時`)
    } else {
      logError(`${suite.name} - 錯誤: ${errorMessage}`)
    }

    return {
      task: suite.name,
      description: suite.file,
      status: 'failed',
      duration,
      details: errorMessage
    }
  }
}

async function generateReport(results: TestResult[]): Promise<void> {
  logStep('生成測試報告')

  const totalTests = results.length
  const passedTests = results.filter(r => r.status === 'passed').length
  const failedTests = results.filter(r => r.status === 'failed').length
  const skippedTests = results.filter(r => r.status === 'skipped').length

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
  const successRate = (passedTests / totalTests) * 100

  log('\n' + '='.repeat(80), 'cyan')
  log('Oracle遷移測試結果報告', 'bright')
  log('='.repeat(80), 'cyan')

  log(`\n📊 測試統計:`)
  log(`   總計: ${totalTests}`)
  log(`   通過: ${passedTests}`, passedTests > 0 ? 'green' : undefined)
  log(`   失敗: ${failedTests}`, failedTests > 0 ? 'red' : undefined)
  log(`   跳過: ${skippedTests}`, skippedTests > 0 ? 'yellow' : undefined)
  log(`   成功率: ${successRate.toFixed(1)}%`, successRate >= 90 ? 'green' : 'red')
  log(`   總時間: ${(totalDuration / 1000).toFixed(2)}秒`)

  log(`\n📋 詳細結果:`)
  results.forEach((result, index) => {
    const status = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️'
    const duration = (result.duration / 1000).toFixed(2)
    log(`   ${index + 1}. ${status} ${result.task} (${duration}s)`)

    if (result.status === 'failed' && result.details) {
      log(`      錯誤詳情: ${result.details.slice(0, 200)}...`, 'red')
    }
  })

  // 任務完成狀態
  log(`\n📈 任務完成狀態:`)
  const task91 = results.find(r => r.task.includes('Task 9.1'))
  const task92 = results.filter(r => r.task.includes('Task 9.2'))
  const task93 = results.find(r => r.task.includes('Task 9.3'))

  log(`   Task 9.1 (端到端整合測試): ${task91?.status === 'passed' ? '✅ 完成' : '❌ 失敗'}`)
  log(`   Task 9.2 (效能負載測試): ${task92.every(t => t.status === 'passed') ? '✅ 完成' : '❌ 失敗'}`)
  log(`   Task 9.3 (生產就緒檢查): ${task93?.status === 'passed' ? '✅ 完成' : '❌ 失敗'}`)

  // 建議和後續步驟
  if (successRate >= 90) {
    log(`\n🎉 恭喜！Oracle遷移測試通過，系統已準備好部署。`, 'green')
    log(`\n📝 後續步驟:`)
    log(`   1. 檢查所有警告和建議`)
    log(`   2. 準備生產環境配置`)
    log(`   3. 執行最終的安全審計`)
    log(`   4. 規劃部署時程`)
  } else {
    log(`\n⚠️  測試失敗，需要修復以下問題才能部署:`, 'yellow')
    const failedRequired = results.filter(r => r.status === 'failed')
    failedRequired.forEach(result => {
      log(`   - ${result.task}`, 'red')
    })
  }

  log('\n' + '='.repeat(80), 'cyan')
}

async function runAllTests(options: { skipOptional?: boolean, parallel?: boolean }): Promise<void> {
  log('🚀 開始Oracle遷移測試套件', 'bright')

  // 檢查前置條件
  if (!(await checkPrerequisites())) {
    process.exit(1)
  }

  const suitesToRun = options.skipOptional
    ? TEST_SUITES.filter(suite => suite.required)
    : TEST_SUITES

  const results: TestResult[] = []

  if (options.parallel) {
    log('\n⚡ 並行執行測試...', 'yellow')
    const promises = suitesToRun.map(suite => runTestSuite(suite))
    const parallelResults = await Promise.all(promises)
    results.push(...parallelResults)
  } else {
    log('\n🔄 順序執行測試...', 'blue')
    for (const suite of suitesToRun) {
      const result = await runTestSuite(suite)
      results.push(result)

      // 如果是必需的測試失敗了，詢問是否繼續
      if (result.status === 'failed' && suite.required) {
        logWarning(`必需測試 "${suite.name}" 失敗`)
        // 在實際使用中可以加入互動提示
      }
    }
  }

  await generateReport(results)

  // 根據結果設定退出碼
  const hasFailedRequired = results.some(r => r.status === 'failed')
  process.exit(hasFailedRequired ? 1 : 0)
}

// CLI設定
program
  .name('run-oracle-migration-tests')
  .description('執行Oracle遷移的完整測試套件 (Tasks 9.1, 9.2, 9.3)')
  .version('1.0.0')

program
  .command('all')
  .description('執行所有測試')
  .option('--skip-optional', '跳過非必需的測試')
  .option('--parallel', '並行執行測試 (較快但資源消耗較高)')
  .action(async (options) => {
    await runAllTests(options)
  })

program
  .command('task')
  .description('執行特定任務的測試')
  .argument('<taskNumber>', '任務編號 (9.1, 9.2, 或 9.3)')
  .action(async (taskNumber) => {
    const taskMap: Record<string, TestSuite[]> = {
      '9.1': [TEST_SUITES[0]],
      '9.2': [TEST_SUITES[1], TEST_SUITES[2]],
      '9.3': [TEST_SUITES[3]]
    }

    const suites = taskMap[taskNumber]
    if (!suites) {
      logError(`無效的任務編號: ${taskNumber}`)
      logError('可用的任務: 9.1, 9.2, 9.3')
      process.exit(1)
    }

    if (!(await checkPrerequisites())) {
      process.exit(1)
    }

    const results: TestResult[] = []
    for (const suite of suites) {
      const result = await runTestSuite(suite)
      results.push(result)
    }

    await generateReport(results)
    process.exit(results.some(r => r.status === 'failed') ? 1 : 0)
  })

program
  .command('check')
  .description('檢查測試環境和前置條件')
  .action(async () => {
    const isReady = await checkPrerequisites()
    if (isReady) {
      logSuccess('測試環境已準備就緒')
      process.exit(0)
    } else {
      logError('測試環境未準備就緒')
      process.exit(1)
    }
  })

// 主程式執行
if (require.main === module) {
  program.parse()
}