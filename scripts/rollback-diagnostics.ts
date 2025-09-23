#!/usr/bin/env tsx

/**
 * PCM回滾和診斷工具
 * 提供快速回滾和問題診斷功能
 */

import { program } from 'commander'
import {
  RollbackManager,
  DiagnosticEngine,
  EmergencyRecovery,
  IssueTracker,
  AutoRecovery
} from '../src/lib/database/rollback-diagnostics'

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

function logCritical(message: string) {
  log(`🚨 ${message}`, 'magenta')
}

// 建立回滾快照命令
async function createSnapshot(tableName: string) {
  try {
    logStep(`建立回滾快照: ${tableName}`)

    const rollbackManager = new RollbackManager()

    logInfo('正在建立快照...')
    const result = await rollbackManager.createRollbackSnapshot(tableName)

    logSuccess('快照建立成功')
    log(`快照ID: ${result.snapshotId}`)
    log(`記錄數量: ${result.recordCount}`)
    log(`快照位置: ${result.snapshotLocation}`)
    log(`建立時間: ${result.createdAt.toLocaleString()}`)
    log(`檢查和: ${result.checksum}`)

  } catch (error) {
    logError(`建立快照失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 執行回滾命令
async function executeRollback(snapshotId: string, targetDatabase: string) {
  try {
    logStep(`執行回滾: ${snapshotId} -> ${targetDatabase}`)

    if (!['postgresql', 'oracle'].includes(targetDatabase)) {
      logError('無效的目標資料庫，請使用 postgresql 或 oracle')
      return
    }

    const rollbackManager = new RollbackManager()

    // 先驗證快照完整性
    logInfo('驗證快照完整性...')
    const validation = await rollbackManager.validateRollbackIntegrity(snapshotId)

    if (!validation.isValid) {
      logError('快照驗證失敗')
      if (validation.errors) {
        validation.errors.forEach(error => logError(`  ${error}`))
      }
      return
    }

    logSuccess('快照驗證通過')

    // 執行回滾
    logWarning('⚠️  警告：這將覆蓋目標資料庫的現有資料！')
    logInfo('5秒後開始回滾，按 Ctrl+C 取消...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    logInfo('開始執行回滾...')
    const result = await rollbackManager.executeRollback(snapshotId, targetDatabase as any)

    if (result.success) {
      logSuccess('回滾執行成功')
      log(`回滾表格: ${result.rolledBackTables.join(', ')}`)
      log(`執行時間: ${Math.round(result.duration / 1000)} 秒`)
      log(`完成時間: ${result.executedAt.toLocaleString()}`)
    } else {
      logError(`回滾執行失敗: ${result.error}`)
    }

  } catch (error) {
    logError(`回滾失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 驗證快照命令
async function validateSnapshot(snapshotId: string) {
  try {
    logStep(`驗證快照: ${snapshotId}`)

    const rollbackManager = new RollbackManager()

    logInfo('正在驗證...')
    const result = await rollbackManager.validateRollbackIntegrity(snapshotId)

    log('\n📊 驗證結果', 'bright')
    log('=' .repeat(60))

    if (result.isValid) {
      logSuccess('快照驗證通過')
    } else {
      logError('快照驗證失敗')
    }

    log(`快照ID: ${result.snapshotId}`)
    log(`檢查時間: ${result.checkedAt.toLocaleString()}`)

    if (result.validationResults.length > 0) {
      log('\n📋 詳細結果:', 'cyan')
      result.validationResults.forEach(check => {
        if (check.passed) {
          logSuccess(`${check.check}: ${check.message}`)
        } else {
          logError(`${check.check}: ${check.message}`)
        }
      })
    }

    if (result.errors && result.errors.length > 0) {
      log('\n❌ 錯誤詳情:', 'red')
      result.errors.forEach(error => {
        log(`  ${error}`, 'red')
      })
    }

  } catch (error) {
    logError(`驗證失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 估算回滾時間命令
async function estimateRollback(tables: string[]) {
  try {
    logStep(`估算回滾時間: ${tables.join(', ')}`)

    const rollbackManager = new RollbackManager()

    logInfo('分析表格大小...')
    const result = await rollbackManager.estimateRollbackTime(tables)

    log('\n⏱️  回滾時間估算', 'bright')
    log('=' .repeat(70))

    log(`總估算時間: ${result.estimatedMinutes} 分鐘`)
    log(`估算信心度: ${result.confidence}`)

    log('\n📊 詳細分析:', 'cyan')
    log(`${'表格'.padEnd(20)} ${'記錄數'.padEnd(10)} ${'估算時間'.padEnd(10)}`)
    log('-' .repeat(50))

    result.breakdown.forEach(item => {
      log(
        `${item.table.padEnd(20)} ` +
        `${item.recordCount.toString().padEnd(10)} ` +
        `${item.estimatedMinutes}分鐘`.padEnd(10)
      )
    })

  } catch (error) {
    logError(`估算失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 診斷系統問題命令
async function diagnoseIssues() {
  try {
    logStep('診斷系統問題')

    const diagnosticEngine = new DiagnosticEngine()

    logInfo('正在診斷...')
    const result = await diagnosticEngine.diagnoseMigrationIssues()

    log('\n🔍 診斷結果', 'bright')
    log('=' .repeat(80))

    const severityColors = {
      'low': 'blue',
      'medium': 'yellow',
      'high': 'red',
      'critical': 'magenta'
    } as const

    log(`整體嚴重性: ${result.severity}`, severityColors[result.severity])
    log(`診斷時間: ${result.diagnosedAt.toLocaleString()}`)

    if (result.issues.length === 0) {
      logSuccess('未發現問題')
    } else {
      log(`\n發現 ${result.issues.length} 個問題:`, 'yellow')

      result.issues.forEach((issue, index) => {
        log(`\n${index + 1}. ${issue.description}`, severityColors[issue.severity])
        log(`   類型: ${issue.type}`)
        log(`   嚴重性: ${issue.severity}`)
        if (issue.affectedComponents.length > 0) {
          log(`   影響組件: ${issue.affectedComponents.join(', ')}`)
        }
        if (issue.recommendations.length > 0) {
          log(`   建議:`, 'cyan')
          issue.recommendations.forEach(rec => log(`     - ${rec}`))
        }
      })
    }

    if (result.recommendations.length > 0) {
      log('\n💡 總體建議:', 'cyan')
      result.recommendations.forEach(rec => log(`  - ${rec}`))
    }

  } catch (error) {
    logError(`診斷失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 檢查連線命令
async function checkConnectivity() {
  try {
    logStep('檢查資料庫連線')

    const diagnosticEngine = new DiagnosticEngine()

    logInfo('測試連線...')
    const result = await diagnosticEngine.checkDatabaseConnectivity()

    log('\n🔗 連線狀態', 'bright')
    log('=' .repeat(60))

    // PostgreSQL 狀態
    log('\nPostgreSQL:', 'cyan')
    if (result.postgresql.connected) {
      logSuccess(`連線成功 (回應時間: ${result.postgresql.responseTime}ms)`)
      if (result.postgresql.version) {
        log(`版本: ${result.postgresql.version}`)
      }
    } else {
      logError(`連線失敗`)
      if (result.postgresql.error) {
        log(`錯誤: ${result.postgresql.error}`, 'red')
      }
    }

    // Oracle 狀態
    log('\nOracle:', 'cyan')
    if (result.oracle.connected) {
      logSuccess(`連線成功 (回應時間: ${result.oracle.responseTime}ms)`)
      if (result.oracle.version) {
        log(`版本: ${result.oracle.version}`)
      }
    } else {
      logError(`連線失敗`)
      if (result.oracle.error) {
        log(`錯誤: ${result.oracle.error}`, 'red')
      }
    }

    // 整體狀態
    log('\n整體狀態:', 'bright')
    if (result.overall) {
      logSuccess('所有資料庫連線正常')
    } else {
      logError('部分或全部資料庫連線失敗')
    }

  } catch (error) {
    logError(`連線檢查失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 生成診斷報告命令
async function generateReport() {
  try {
    logStep('生成診斷報告')

    const diagnosticEngine = new DiagnosticEngine()

    logInfo('收集診斷資訊...')
    const result = await diagnosticEngine.generateDiagnosticReport()

    log('\n📄 診斷報告', 'bright')
    log('=' .repeat(80))

    log(`報告ID: ${result.reportId}`)
    log(`生成時間: ${result.generatedAt.toLocaleString()}`)

    // 整體健康狀態
    const healthColors = {
      'healthy': 'green',
      'warning': 'yellow',
      'critical': 'red'
    } as const

    log(`\n整體健康狀態: ${result.summary.overallHealth}`, healthColors[result.summary.overallHealth])
    log(`關鍵問題數量: ${result.summary.criticalIssues}`)

    // 連線狀態
    log('\n🔗 連線狀態:', 'cyan')
    const conn = result.sections.connectivity
    log(`  PostgreSQL: ${conn.postgresql.connected ? '✅' : '❌'} (${conn.postgresql.responseTime}ms)`)
    log(`  Oracle: ${conn.oracle.connected ? '✅' : '❌'} (${conn.oracle.responseTime}ms)`)

    // 效能狀態
    log('\n⚡ 效能狀態:', 'cyan')
    const perf = result.sections.performance
    log(`  平均查詢時間: ${perf.metrics.avgQueryTime}ms`)
    log(`  連線池使用率: ${perf.metrics.connectionPoolUsage}%`)
    if (perf.bottlenecks.length > 0) {
      log(`  發現瓶頸: ${perf.bottlenecks.length} 個`)
    }

    // 資料完整性
    log('\n🔒 資料完整性:', 'cyan')
    const integrity = result.sections.integrity
    log(`  整體完整性: ${integrity.overallIntegrity ? '✅' : '❌'}`)
    const intactTables = integrity.tableResults.filter(t => t.isIntact).length
    log(`  完整表格: ${intactTables}/${integrity.tableResults.length}`)

    // 建議
    if (result.summary.recommendations.length > 0) {
      log('\n💡 建議:', 'yellow')
      result.summary.recommendations.forEach(rec => log(`  - ${rec}`))
    }

  } catch (error) {
    logError(`報告生成失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 緊急恢復命令
async function emergencyRecover() {
  try {
    logCritical('執行緊急恢復程序')
    logWarning('⚠️  這是緊急恢復程序，將會影響系統運作！')

    const emergencyRecovery = new EmergencyRecovery()

    logInfo('5秒後開始緊急恢復，按 Ctrl+C 取消...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    logInfo('開始緊急恢復...')
    const result = await emergencyRecovery.executeEmergencyRecovery()

    log('\n🚨 緊急恢復結果', 'bright')
    log('=' .repeat(60))

    if (result.success) {
      logSuccess('緊急恢復成功')
    } else {
      logError('緊急恢復失敗')
      if (result.error) {
        logError(`錯誤: ${result.error}`)
      }
    }

    log(`執行時間: ${Math.round(result.duration / 1000)} 秒`)
    log(`完成時間: ${result.executedAt.toLocaleString()}`)

    if (result.recoverySteps.length > 0) {
      log('\n📋 執行步驟:', 'cyan')
      result.recoverySteps.forEach((step, index) => {
        log(`  ${index + 1}. ${step}`)
      })
    }

  } catch (error) {
    logError(`緊急恢復失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 恢復最小功能命令
async function restoreMinimal() {
  try {
    logStep('恢復最小功能')

    const emergencyRecovery = new EmergencyRecovery()

    logInfo('分析可用功能...')
    const result = await emergencyRecovery.restoreMinimalFunctionality()

    log('\n🔧 最小功能恢復', 'bright')
    log('=' .repeat(60))

    if (result.success) {
      logSuccess('最小功能恢復成功')
    } else {
      logError('最小功能恢復失敗')
    }

    log(`系統容量: ${result.estimatedCapacity}%`)

    if (result.availableFunctions.length > 0) {
      log('\n✅ 可用功能:', 'green')
      result.availableFunctions.forEach(func => log(`  - ${func}`))
    }

    if (result.limitations.length > 0) {
      log('\n❌ 限制功能:', 'red')
      result.limitations.forEach(limit => log(`  - ${limit}`))
    }

  } catch (error) {
    logError(`最小功能恢復失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 自動恢復檢測命令
async function detectAutoRecovery() {
  try {
    logStep('檢測自動恢復機會')

    const autoRecovery = new AutoRecovery()

    logInfo('分析恢復機會...')
    const result = await autoRecovery.detectRecoveryOpportunities()

    log('\n🤖 自動恢復機會', 'bright')
    log('=' .repeat(70))

    log(`整體信心度: ${result.confidence}`)
    log(`預期成功率: ${Math.round(result.estimatedSuccess * 100)}%`)

    if (result.opportunities.length === 0) {
      logInfo('未發現自動恢復機會')
    } else {
      log(`\n發現 ${result.opportunities.length} 個恢復機會:`)

      result.opportunities.forEach((opportunity, index) => {
        log(`\n${index + 1}. ${opportunity.description}`, 'cyan')
        log(`   類型: ${opportunity.type}`)
        log(`   信心度: ${Math.round(opportunity.confidence * 100)}%`)
        log(`   成功率: ${Math.round(opportunity.estimatedSuccess * 100)}%`)

        if (opportunity.requiredActions.length > 0) {
          log(`   所需行動:`)
          opportunity.requiredActions.forEach(action => log(`     - ${action}`))
        }
      })
    }

  } catch (error) {
    logError(`自動恢復檢測失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 執行自動恢復命令
async function executeAutoRecovery(recoveryType: string) {
  try {
    logStep(`執行自動恢復: ${recoveryType}`)

    const validTypes = ['connection_retry', 'data_sync_retry', 'partial_rollback', 'emergency_isolation']
    if (!validTypes.includes(recoveryType)) {
      logError(`無效的恢復類型: ${recoveryType}`)
      logInfo(`有效類型: ${validTypes.join(', ')}`)
      return
    }

    const autoRecovery = new AutoRecovery()

    logInfo('開始自動恢復...')
    const result = await autoRecovery.executeAutoRecovery(recoveryType as any)

    log('\n🤖 自動恢復結果', 'bright')
    log('=' .repeat(60))

    if (result.success) {
      logSuccess('自動恢復成功')
    } else {
      logError('自動恢復失敗')
      if (result.error) {
        logError(`錯誤: ${result.error}`)
      }
    }

    log(`執行時間: ${Math.round(result.duration / 1000)} 秒`)
    log(`完成時間: ${result.executedAt.toLocaleString()}`)

    if (result.actionsPerformed.length > 0) {
      log('\n📋 執行動作:', 'cyan')
      result.actionsPerformed.forEach(action => log(`  - ${action}`))
    }

  } catch (error) {
    logError(`自動恢復失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// CLI程式設定
program
  .name('rollback-diagnostics')
  .description('PCM回滾和診斷工具')
  .version('1.0.0')

// 回滾命令群組
const rollbackCommand = program
  .command('rollback')
  .description('回滾管理命令')

rollbackCommand
  .command('snapshot <table-name>')
  .description('建立表格回滾快照')
  .action(createSnapshot)

rollbackCommand
  .command('execute <snapshot-id> <target-database>')
  .description('執行回滾 (目標: postgresql|oracle)')
  .action(executeRollback)

rollbackCommand
  .command('validate <snapshot-id>')
  .description('驗證快照完整性')
  .action(validateSnapshot)

rollbackCommand
  .command('estimate <tables...>')
  .description('估算回滾時間')
  .action(estimateRollback)

// 診斷命令群組
const diagnosticCommand = program
  .command('diagnostic')
  .description('系統診斷命令')

diagnosticCommand
  .command('issues')
  .description('診斷系統問題')
  .action(diagnoseIssues)

diagnosticCommand
  .command('connectivity')
  .description('檢查資料庫連線')
  .action(checkConnectivity)

diagnosticCommand
  .command('report')
  .description('生成完整診斷報告')
  .action(generateReport)

// 緊急恢復命令群組
const emergencyCommand = program
  .command('emergency')
  .description('緊急恢復命令')

emergencyCommand
  .command('recover')
  .description('執行緊急恢復程序')
  .action(emergencyRecover)

emergencyCommand
  .command('minimal')
  .description('恢復最小功能')
  .action(restoreMinimal)

// 自動恢復命令群組
const autoCommand = program
  .command('auto')
  .description('自動恢復命令')

autoCommand
  .command('detect')
  .description('檢測自動恢復機會')
  .action(detectAutoRecovery)

autoCommand
  .command('execute <recovery-type>')
  .description('執行自動恢復 (類型: connection_retry|data_sync_retry|partial_rollback|emergency_isolation)')
  .action(executeAutoRecovery)

// 主程式執行
if (require.main === module) {
  program.parse()
}

export {
  createSnapshot,
  executeRollback,
  validateSnapshot,
  estimateRollback,
  diagnoseIssues,
  checkConnectivity,
  generateReport,
  emergencyRecover,
  restoreMinimal,
  detectAutoRecovery,
  executeAutoRecovery
}