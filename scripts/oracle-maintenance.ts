#!/usr/bin/env tsx

/**
 * Oracle資料庫維護工具
 * 提供遷移、測試資料管理和維護功能
 */

import { program } from 'commander'
import {
  OracleMigrationManager,
  OracleTestDataManager,
  OracleMaintenanceTools
} from '../src/lib/database/oracle-migration-manager'

// 色彩輸出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message: string, color?: keyof typeof colors) {
  const colorCode = color ? colors[color] : ''
  console.log(`${colorCode}${message}${colors.reset}`)
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green')
}

function logError(message: string) {
  log(`❌ ${message}`, 'red')
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'blue')
}

// 遷移命令
async function runMigrations() {
  try {
    logInfo('開始執行資料庫遷移...')

    const migrationManager = new OracleMigrationManager()
    const result = await migrationManager.executeMigrationScripts()

    if (result.success) {
      logSuccess(`遷移完成！執行了 ${result.scriptsExecuted} 個腳本`)
      if (result.details && result.details.length > 0) {
        log('\n執行的腳本：', 'cyan')
        result.details.forEach(script => log(`  - ${script}`))
      }
    } else {
      logError(`遷移失敗：${result.error}`)
      process.exit(1)
    }
  } catch (error) {
    logError(`遷移執行錯誤：${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

// 版本命令
async function showVersion() {
  try {
    const migrationManager = new OracleMigrationManager()
    const version = await migrationManager.getCurrentSchemaVersion()

    logInfo(`當前資料庫版本：${version}`)
  } catch (error) {
    logError(`無法獲取版本：${error instanceof Error ? error.message : String(error)}`)
  }
}

// 遷移歷史命令
async function showHistory() {
  try {
    logInfo('獲取遷移歷史...')

    const migrationManager = new OracleMigrationManager()
    const history = await migrationManager.getMigrationHistory()

    if (history.length === 0) {
      log('沒有遷移歷史記錄', 'yellow')
      return
    }

    log('\n遷移歷史：', 'cyan')
    history.forEach((record: any, index: number) => {
      const [scriptName, executedAt, success, errorMessage] = record
      const status = success ? '✅' : '❌'
      const time = new Date(executedAt).toLocaleString()

      log(`${index + 1}. ${status} ${scriptName} (${time})`)
      if (!success && errorMessage) {
        log(`   錯誤：${errorMessage}`, 'red')
      }
    })
  } catch (error) {
    logError(`無法獲取遷移歷史：${error instanceof Error ? error.message : String(error)}`)
  }
}

// 載入測試資料命令
async function loadTestData() {
  try {
    logInfo('載入測試資料...')

    const testDataManager = new OracleTestDataManager()
    const result = await testDataManager.loadTestData()

    if (result.success) {
      logSuccess(`測試資料載入完成！處理了 ${result.tablesPopulated} 個語句`)
    } else {
      logError(`測試資料載入失敗：${result.error}`)
      process.exit(1)
    }
  } catch (error) {
    logError(`測試資料載入錯誤：${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

// 清理測試資料命令
async function cleanTestData() {
  try {
    logInfo('清理測試資料...')

    // 確認操作
    log('⚠️  警告：這將清除所有表格的資料！', 'yellow')

    const testDataManager = new OracleTestDataManager()
    const result = await testDataManager.cleanTestData()

    if (result.success) {
      logSuccess(`測試資料清理完成！清理了 ${result.tablesCleaned} 個表格`)
    } else {
      logError(`測試資料清理失敗：${result.error}`)
      process.exit(1)
    }
  } catch (error) {
    logError(`測試資料清理錯誤：${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

// 驗證測試資料命令
async function validateTestData() {
  try {
    logInfo('驗證測試資料完整性...')

    const testDataManager = new OracleTestDataManager()
    const result = await testDataManager.validateTestData()

    if (result.isValid) {
      logSuccess('測試資料驗證通過')
    } else {
      logError('測試資料驗證失敗')
      result.validationErrors.forEach(error => {
        log(`  - ${error}`, 'red')
      })
      process.exit(1)
    }
  } catch (error) {
    logError(`測試資料驗證錯誤：${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

// 分析統計資訊命令
async function analyzeStats() {
  try {
    logInfo('分析資料庫統計資訊...')

    const maintenanceTools = new OracleMaintenanceTools()
    const stats = await maintenanceTools.analyzeTableStatistics()

    if (stats.length === 0) {
      log('沒有找到表格統計資訊', 'yellow')
      return
    }

    log('\n表格統計資訊：', 'cyan')
    log(`${'表格名稱'.padEnd(25)} ${'行數'.padEnd(10)} ${'大小(MB)'.padEnd(10)} 最後分析時間`)
    log('-'.repeat(70))

    stats.forEach(stat => {
      const lastAnalyzed = stat.lastAnalyzed ?
        stat.lastAnalyzed.toLocaleDateString() : '從未'

      log(
        `${stat.tableName.padEnd(25)} ` +
        `${stat.rowCount.toString().padEnd(10)} ` +
        `${stat.sizeInMB.toFixed(2).padEnd(10)} ` +
        lastAnalyzed
      )
    })
  } catch (error) {
    logError(`統計資訊分析錯誤：${error instanceof Error ? error.message : String(error)}`)
  }
}

// 更新統計資訊命令
async function updateStats() {
  try {
    logInfo('更新表格統計資訊...')

    const maintenanceTools = new OracleMaintenanceTools()
    const result = await maintenanceTools.updateTableStatistics()

    if (result.success) {
      logSuccess(`統計資訊更新完成！更新了 ${result.tablesUpdated} 個表格`)
    } else {
      logError(`統計資訊更新失敗：${result.error}`)
      process.exit(1)
    }
  } catch (error) {
    logError(`統計資訊更新錯誤：${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

// 重建索引命令
async function rebuildIndexes() {
  try {
    logInfo('重建損壞的索引...')

    const maintenanceTools = new OracleMaintenanceTools()
    const result = await maintenanceTools.rebuildIndexes()

    if (result.success) {
      if (result.indexesRebuilt === 0) {
        logSuccess('沒有需要重建的索引')
      } else {
        logSuccess(`索引重建完成！重建了 ${result.indexesRebuilt} 個索引`)
      }
    } else {
      logError(`索引重建失敗：${result.error}`)
      process.exit(1)
    }
  } catch (error) {
    logError(`索引重建錯誤：${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

// CLI程式設定
program
  .name('oracle-maintenance')
  .description('PCM Oracle資料庫維護工具')
  .version('1.0.0')

// 遷移相關命令
const migrationCmd = program.command('migration').description('資料庫遷移管理')

migrationCmd
  .command('run')
  .description('執行資料庫遷移')
  .action(runMigrations)

migrationCmd
  .command('version')
  .description('顯示當前資料庫版本')
  .action(showVersion)

migrationCmd
  .command('history')
  .description('顯示遷移歷史')
  .action(showHistory)

// 測試資料相關命令
const testDataCmd = program.command('test-data').description('測試資料管理')

testDataCmd
  .command('load')
  .description('載入測試資料')
  .action(loadTestData)

testDataCmd
  .command('clean')
  .description('清理測試資料')
  .action(cleanTestData)

testDataCmd
  .command('validate')
  .description('驗證測試資料完整性')
  .action(validateTestData)

// 維護相關命令
const maintenanceCmd = program.command('maintenance').description('資料庫維護')

maintenanceCmd
  .command('analyze')
  .description('分析表格統計資訊')
  .action(analyzeStats)

maintenanceCmd
  .command('update-stats')
  .description('更新表格統計資訊')
  .action(updateStats)

maintenanceCmd
  .command('rebuild-indexes')
  .description('重建損壞的索引')
  .action(rebuildIndexes)

// 主程式執行
if (require.main === module) {
  program.parse()
}

export {
  runMigrations,
  showVersion,
  showHistory,
  loadTestData,
  cleanTestData,
  validateTestData,
  analyzeStats,
  updateStats,
  rebuildIndexes
}