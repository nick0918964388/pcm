#!/usr/bin/env tsx

/**
 * PCM資料同步工具
 * 提供PostgreSQL和Oracle之間的資料同步功能
 */

import { program } from 'commander'
import {
  DataSynchronizer,
  ConsistencyChecker,
  ConflictResolver,
  SyncScheduler,
  DataComparisonEngine
} from '../src/lib/database/data-synchronization'

// 色彩輸出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
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

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow')
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'blue')
}

function logStep(message: string) {
  log(`📋 ${message}`, 'cyan')
}

// 同步表格命令
async function syncTable(tableName: string, direction: string) {
  try {
    logStep(`同步表格: ${tableName} (方向: ${direction})`)

    const synchronizer = new DataSynchronizer()

    const validDirections = ['postgresql-to-oracle', 'oracle-to-postgresql', 'bidirectional']
    if (!validDirections.includes(direction)) {
      logError(`無效的同步方向: ${direction}`)
      logInfo(`有效方向: ${validDirections.join(', ')}`)
      return
    }

    logInfo('開始同步...')
    const startTime = Date.now()

    const result = await synchronizer.synchronizeTable(tableName, direction as any)

    const duration = Date.now() - startTime
    log(`\n執行時間: ${Math.round(duration / 1000)} 秒`)

    if (result.success) {
      logSuccess(`表格 ${tableName} 同步成功`)
      log(`同步記錄數: ${result.recordsSynchronized}`)

      if (result.conflicts.length > 0) {
        logWarning(`發現 ${result.conflicts.length} 個衝突`)
        log('\n🔥 衝突詳情:', 'yellow')
        result.conflicts.forEach((conflict, index) => {
          log(`  ${index + 1}. 記錄ID: ${conflict.recordId}`)
          log(`     衝突類型: ${conflict.conflictType}`)
          log(`     解決策略: ${conflict.resolution}`)
        })
      }

    } else {
      logError(`表格 ${tableName} 同步失敗`)
      if (result.error) {
        logError(`錯誤: ${result.error}`)
      }
    }

  } catch (error) {
    logError(`同步失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 檢查一致性命令
async function checkConsistency(tableName?: string) {
  try {
    logStep(tableName ? `檢查表格一致性: ${tableName}` : '檢查所有表格一致性')

    const checker = new ConsistencyChecker()

    if (tableName) {
      // 檢查單一表格
      logInfo('開始檢查...')
      const result = await checker.checkTableConsistency(tableName)

      log('\n📊 一致性檢查結果', 'bright')
      log('=' .repeat(60))

      if (result.isConsistent) {
        logSuccess(`表格 ${tableName} 資料一致`)
      } else {
        logError(`表格 ${tableName} 資料不一致`)
      }

      log(`PostgreSQL記錄數: ${result.postgresqlCount}`)
      log(`Oracle記錄數: ${result.oracleCount}`)
      log(`檢查時間: ${result.checkedAt.toLocaleString()}`)

      if (result.discrepancies.length > 0) {
        log('\n🔍 不一致詳情:', 'yellow')
        result.discrepancies.forEach((discrepancy, index) => {
          log(`  ${index + 1}. 類型: ${discrepancy.type}`)
          log(`     記錄ID: ${discrepancy.recordId}`)
        })
      }

    } else {
      // 檢查所有表格
      logInfo('開始全面檢查...')
      const report = await checker.validateAllTables()

      log('\n📊 全面一致性報告', 'bright')
      log('=' .repeat(80))

      if (report.overallConsistency) {
        logSuccess('所有表格資料一致')
      } else {
        logError('發現資料不一致問題')
      }

      log(`檢查時間: ${report.checkedAt.toLocaleString()}`)
      log(`總表格數: ${report.summary.totalTables}`)
      log(`一致表格: ${report.summary.consistentTables}`)
      log(`不一致表格: ${report.summary.inconsistentTables}`)
      log(`總不一致項: ${report.summary.totalDiscrepancies}`)

      if (report.recommendations.length > 0) {
        log('\n💡 建議:', 'cyan')
        report.recommendations.forEach((rec, index) => {
          log(`  ${index + 1}. ${rec}`)
        })
      }

      // 顯示詳細結果
      if (report.tableResults.length > 0) {
        log('\n📋 表格詳情:', 'blue')
        report.tableResults.forEach(table => {
          const status = table.isConsistent ? '✅' : '❌'
          log(`  ${status} ${table.tableName}: PG=${table.postgresqlCount}, Oracle=${table.oracleCount}`)
        })
      }
    }

  } catch (error) {
    logError(`一致性檢查失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 比較表格結構命令
async function compareSchemas(tableName: string) {
  try {
    logStep(`比較表格結構: ${tableName}`)

    const engine = new DataComparisonEngine()

    logInfo('開始比較...')
    const result = await engine.compareTableSchemas(tableName)

    log('\n🔍 結構比較結果', 'bright')
    log('=' .repeat(60))

    if (result.isCompatible) {
      logSuccess(`表格 ${tableName} 結構相容`)
    } else {
      logError(`表格 ${tableName} 結構不相容`)
    }

    if (result.differences.length > 0) {
      log('\n📊 結構差異:', 'yellow')
      log(`${'欄位'.padEnd(20)} ${'PostgreSQL'.padEnd(15)} ${'Oracle'.padEnd(15)} ${'相容性'.padEnd(8)}`)
      log('-' .repeat(70))

      result.differences.forEach(diff => {
        const compatibleText = diff.isCompatible ? '✅' : '❌'
        log(
          `${diff.column.padEnd(20)} ` +
          `${diff.postgresqlType.padEnd(15)} ` +
          `${diff.oracleType.padEnd(15)} ` +
          `${compatibleText.padEnd(8)}`
        )
      })
    }

  } catch (error) {
    logError(`結構比較失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 生成比較報告命令
async function generateReport(tables?: string[]) {
  try {
    const tableList = tables || ['projects', 'users', 'photo_albums', 'photos']
    logStep(`生成比較報告: ${tableList.join(', ')}`)

    const engine = new DataComparisonEngine()

    logInfo('開始生成報告...')
    const report = await engine.generateComparisonReport(tableList)

    log('\n📄 資料比較報告', 'bright')
    log('=' .repeat(80))

    log(`生成時間: ${report.generatedAt.toLocaleString()}`)
    log(`比較表格: ${report.tablesCompared.join(', ')}`)

    log('\n📊 摘要:', 'cyan')
    log(`  總表格數: ${report.summary.totalTables}`)
    log(`  相容表格: ${report.summary.compatibleTables}`)
    log(`  不相容表格: ${report.summary.incompatibleTables}`)
    log(`  總問題數: ${report.summary.totalIssues}`)

    if (report.recommendations.length > 0) {
      log('\n💡 建議:', 'yellow')
      report.recommendations.forEach((rec, index) => {
        log(`  ${index + 1}. ${rec}`)
      })
    }

    // 詳細表格報告
    log('\n📋 表格詳情:', 'blue')
    report.tableReports.forEach(table => {
      const schemaStatus = table.schemaCompatibility.isCompatible ? '✅' : '❌'
      const dataStatus = table.dataConsistency.isConsistent ? '✅' : '❌'

      log(`\n  ${table.tableName}:`)
      log(`    結構相容性: ${schemaStatus}`)
      log(`    資料一致性: ${dataStatus}`)
      log(`    PostgreSQL記錄: ${table.dataConsistency.postgresqlCount}`)
      log(`    Oracle記錄: ${table.dataConsistency.oracleCount}`)

      if (table.schemaCompatibility.differences.length > 0) {
        log(`    結構差異: ${table.schemaCompatibility.differences.length} 個`)
      }
      if (table.dataConsistency.discrepancies.length > 0) {
        log(`    資料差異: ${table.dataConsistency.discrepancies.length} 個`)
      }
    })

  } catch (error) {
    logError(`報告生成失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 排程同步命令
async function scheduleSync(tables: string[], interval: string, direction: string) {
  try {
    logStep(`設定同步排程: ${tables.join(', ')} (間隔: ${interval}, 方向: ${direction})`)

    const scheduler = new SyncScheduler()

    const validIntervals = ['manual', 'real-time', 'hourly', 'daily', 'weekly']
    if (!validIntervals.includes(interval)) {
      logError(`無效的同步間隔: ${interval}`)
      logInfo(`有效間隔: ${validIntervals.join(', ')}`)
      return
    }

    const validDirections = ['postgresql-to-oracle', 'oracle-to-postgresql', 'bidirectional']
    if (!validDirections.includes(direction)) {
      logError(`無效的同步方向: ${direction}`)
      logInfo(`有效方向: ${validDirections.join(', ')}`)
      return
    }

    logInfo('設定排程...')
    const result = await scheduler.scheduleSync({
      tables,
      interval: interval as any,
      direction: direction as any,
      conflictResolution: 'latest_wins',
      enabled: true
    })

    if (result.success) {
      logSuccess('排程設定成功')
      log(`排程ID: ${result.scheduleId}`)
      log(`下次執行時間: ${result.nextRunTime.toLocaleString()}`)
    } else {
      logError(`排程設定失敗: ${result.error}`)
    }

  } catch (error) {
    logError(`排程設定失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 執行排程同步命令
async function executeSchedule(scheduleId: string) {
  try {
    logStep(`執行排程同步: ${scheduleId}`)

    const scheduler = new SyncScheduler()

    logInfo('執行排程...')
    const result = await scheduler.executeScheduledSync(scheduleId)

    if (result.success) {
      logSuccess('排程執行成功')
      log(`執行時間: ${result.executedAt.toLocaleString()}`)

      if (result.syncResults.length > 0) {
        log('\n📊 同步結果:', 'cyan')
        result.syncResults.forEach((syncResult, index) => {
          if (syncResult.success) {
            log(`  ✅ 同步 ${index + 1}: ${syncResult.recordsSynchronized} 筆記錄`)
          } else {
            log(`  ❌ 同步 ${index + 1}: ${syncResult.error}`)
          }
        })
      }

    } else {
      logError(`排程執行失敗: ${result.error}`)
    }

  } catch (error) {
    logError(`排程執行失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 增量同步命令
async function incrementalSync(tableName: string, hours: number = 24) {
  try {
    logStep(`增量同步: ${tableName} (最近 ${hours} 小時)`)

    const synchronizer = new DataSynchronizer()
    const lastSyncTime = new Date(Date.now() - hours * 60 * 60 * 1000)

    logInfo(`同步自 ${lastSyncTime.toLocaleString()} 以來的變更...`)
    const result = await synchronizer.incrementalSync(tableName, lastSyncTime)

    if (result.success) {
      logSuccess(`增量同步成功`)
      log(`同步記錄數: ${result.recordsSynchronized}`)

      if (result.conflicts.length > 0) {
        logWarning(`發現 ${result.conflicts.length} 個衝突`)
      }

    } else {
      logError(`增量同步失敗: ${result.error}`)
    }

  } catch (error) {
    logError(`增量同步失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// CLI程式設定
program
  .name('data-synchronization')
  .description('PCM資料同步工具')
  .version('1.0.0')

// 同步命令
program
  .command('sync <table-name> <direction>')
  .description('同步表格資料 (方向: postgresql-to-oracle|oracle-to-postgresql|bidirectional)')
  .action(syncTable)

program
  .command('sync-incremental <table-name>')
  .description('增量同步表格資料')
  .option('-h, --hours <hours>', '同步最近幾小時的變更', '24')
  .action((tableName, options) => {
    incrementalSync(tableName, parseInt(options.hours))
  })

// 一致性檢查命令
program
  .command('check [table-name]')
  .description('檢查資料一致性')
  .action(checkConsistency)

// 結構比較命令
program
  .command('compare-schema <table-name>')
  .description('比較表格結構')
  .action(compareSchemas)

// 報告命令
program
  .command('report [tables...]')
  .description('生成資料比較報告')
  .action(generateReport)

// 排程命令
program
  .command('schedule <tables...> <interval> <direction>')
  .description('設定同步排程')
  .action((tables, interval, direction) => {
    scheduleSync(tables, interval, direction)
  })

program
  .command('execute-schedule <schedule-id>')
  .description('執行指定的同步排程')
  .action(executeSchedule)

// 主程式執行
if (require.main === module) {
  program.parse()
}

export {
  syncTable,
  checkConsistency,
  compareSchemas,
  generateReport,
  scheduleSync,
  executeSchedule,
  incrementalSync
}