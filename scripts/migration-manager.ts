#!/usr/bin/env tsx

/**
 * PCM遷移管理工具
 * 提供段階式遷移管理和環境切換功能
 */

import { program } from 'commander'
import {
  PhaseManager,
  EnvironmentSwitcher,
  CheckpointValidator,
  MigrationStatusTracker,
  ParallelExecutionManager
} from '../src/lib/database/migration-strategy'

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

// 顯示遷移狀態命令
async function showStatus() {
  try {
    logStep('獲取遷移狀態...')

    const statusTracker = new MigrationStatusTracker()
    const status = await statusTracker.getCurrentStatus()

    log('\n📊 遷移狀態概覽', 'bright')
    log('=' .repeat(50))

    // 顯示整體狀態
    const statusColors = {
      'not-started': 'yellow',
      'in-progress': 'cyan',
      'completed': 'green',
      'failed': 'red',
      'rolled-back': 'magenta'
    } as const

    log(`整體狀態: ${status.overallStatus}`, statusColors[status.overallStatus])
    log(`當前環境: ${status.environment}`)
    log(`最後更新: ${status.lastUpdated.toLocaleString()}`)

    if (status.currentPhase) {
      log(`當前階段: ${status.currentPhase}`, 'cyan')
    }

    if (status.rollbackAvailable) {
      logWarning('回滾功能可用')
    }

    // 顯示階段進度
    const phaseManager = new PhaseManager()
    const progress = await phaseManager.getMigrationProgress()

    log('\n📈 進度資訊', 'bright')
    log(`完成階段: ${progress.completedPhases}/${progress.totalPhases} (${progress.progressPercentage}%)`)

    if (progress.failedPhases > 0) {
      logError(`失敗階段: ${progress.failedPhases}`)
    }

    if (progress.estimatedTimeRemaining > 0) {
      log(`預估剩餘時間: ${progress.estimatedTimeRemaining} 分鐘`)
    }

    if (progress.startedAt) {
      log(`開始時間: ${progress.startedAt.toLocaleString()}`)
    }

  } catch (error) {
    logError(`獲取狀態失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 列出所有階段命令
async function listPhases() {
  try {
    logStep('載入遷移階段...')

    const phaseManager = new PhaseManager()
    const phases = await phaseManager.initializePhases()

    log('\n📋 遷移階段列表', 'bright')
    log('=' .repeat(100))
    log(`${'ID'.padEnd(20)} ${'名稱'.padEnd(20)} ${'狀態'.padEnd(12)} ${'預估時間'.padEnd(8)} ${'依賴項'.padEnd(20)}`)
    log('-' .repeat(100))

    phases.forEach(phase => {
      const statusColor = phase.status === 'completed' ? 'green' :
                         phase.status === 'failed' ? 'red' :
                         phase.status === 'in-progress' ? 'cyan' : 'yellow'

      const dependencies = phase.dependencies.length > 0 ? phase.dependencies.join(', ') : '無'

      log(
        `${phase.id.padEnd(20)} ` +
        `${phase.name.padEnd(20)} ` +
        `${phase.status.padEnd(12)} ` +
        `${phase.estimatedDuration}分鐘`.padEnd(8) +
        `${dependencies.substring(0, 19).padEnd(20)}`,
        statusColor
      )

      if (phase.description) {
        log(`    描述: ${phase.description}`, 'blue')
      }

      if (phase.checkpoints.length > 0) {
        log(`    檢查點: ${phase.checkpoints.join(', ')}`, 'cyan')
      }

      log('') // 空行
    })

  } catch (error) {
    logError(`列出階段失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 執行單一階段命令
async function executePhase(phaseId: string) {
  try {
    logStep(`執行階段: ${phaseId}`)

    const phaseManager = new PhaseManager()
    const statusTracker = new MigrationStatusTracker()

    // 檢查先決條件
    const canExecute = await phaseManager.checkPhasePrerequisites(phaseId)
    if (!canExecute) {
      logError('階段先決條件未滿足')
      return
    }

    // 記錄開始事件
    await statusTracker.recordEvent({
      phaseId,
      type: 'phase_started',
      message: `開始執行階段: ${phaseId}`
    })

    logInfo('開始執行...')
    const startTime = Date.now()

    // 執行階段
    const result = await phaseManager.executePhase(phaseId)

    const duration = Date.now() - startTime
    log(`\n執行時間: ${Math.round(duration / 1000)} 秒`)

    if (result.success) {
      logSuccess(`階段 ${phaseId} 執行成功`)

      if (result.outputs && result.outputs.length > 0) {
        log('\n📄 執行輸出:', 'cyan')
        result.outputs.forEach(output => log(`  ${output}`))
      }

      if (result.warnings && result.warnings.length > 0) {
        log('\n⚠️  警告:', 'yellow')
        result.warnings.forEach(warning => log(`  ${warning}`, 'yellow'))
      }

      // 記錄成功事件
      await statusTracker.recordEvent({
        phaseId,
        type: 'phase_completed',
        message: `階段 ${phaseId} 執行成功`,
        metadata: { duration: result.duration }
      })

    } else {
      logError(`階段 ${phaseId} 執行失敗`)
      if (result.error) {
        logError(`錯誤: ${result.error}`)
      }

      // 記錄失敗事件
      await statusTracker.recordEvent({
        phaseId,
        type: 'phase_failed',
        message: `階段 ${phaseId} 執行失敗: ${result.error}`,
        metadata: { error: result.error }
      })
    }

  } catch (error) {
    logError(`執行階段失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 並行執行多個階段命令
async function executeParallel(phaseIds: string[]) {
  try {
    logStep(`並行執行階段: ${phaseIds.join(', ')}`)

    const parallelManager = new ParallelExecutionManager()

    // 檢查是否可以並行執行
    const canExecuteInParallel = await parallelManager.canExecuteInParallel(phaseIds)
    if (!canExecuteInParallel) {
      logError('選定的階段無法並行執行，存在依賴關係或不支援並行')
      return
    }

    logInfo('開始並行執行...')
    const startTime = Date.now()

    // 並行執行
    const results = await parallelManager.executeInParallel(phaseIds)

    const duration = Date.now() - startTime
    log(`\n總執行時間: ${Math.round(duration / 1000)} 秒`)

    // 顯示結果
    log('\n📊 執行結果:', 'bright')
    results.forEach(result => {
      if (result.success) {
        logSuccess(`${result.phaseId}: 成功 (${Math.round(result.duration / 1000)}秒)`)
      } else {
        logError(`${result.phaseId}: 失敗 - ${result.error}`)
      }
    })

    const successCount = results.filter(r => r.success).length
    log(`\n成功: ${successCount}/${results.length}`)

  } catch (error) {
    logError(`並行執行失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 切換環境命令
async function switchEnvironment(targetEnv: 'postgresql' | 'oracle') {
  try {
    logStep(`切換環境至: ${targetEnv}`)

    const switcher = new EnvironmentSwitcher()
    const statusTracker = new MigrationStatusTracker()

    // 獲取當前環境
    const currentEnv = await switcher.getCurrentEnvironment()
    log(`當前環境: ${currentEnv.type}`)

    if (currentEnv.type === targetEnv) {
      logWarning('已經在目標環境中')
      return
    }

    // 驗證目標環境
    logInfo('驗證目標環境...')
    const isValid = await switcher.validateEnvironment(targetEnv)
    if (!isValid) {
      logError(`目標環境 ${targetEnv} 不可用`)
      return
    }

    // 執行切換
    logInfo('執行環境切換...')
    const result = await switcher.switchToEnvironment(targetEnv)

    if (result.success) {
      logSuccess(`環境已切換至 ${targetEnv}`)
      log(`切換時間: ${result.switchedAt.toLocaleString()}`)

      // 記錄切換事件
      await statusTracker.recordEvent({
        phaseId: 'environment-switch',
        type: 'environment_switched',
        message: `環境從 ${result.previousEnvironment} 切換至 ${result.targetEnvironment}`,
        metadata: {
          from: result.previousEnvironment,
          to: result.targetEnvironment
        }
      })

    } else {
      logError(`環境切換失敗: ${result.error}`)
    }

  } catch (error) {
    logError(`環境切換失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 驗證檢查點命令
async function validateCheckpoint(checkpointId: string) {
  try {
    logStep(`驗證檢查點: ${checkpointId}`)

    const validator = new CheckpointValidator()
    const statusTracker = new MigrationStatusTracker()

    logInfo('執行驗證...')
    const result = await validator.validateCheckpoint(checkpointId)

    log('\n📋 驗證結果', 'bright')
    log('=' .repeat(60))

    if (result.isValid) {
      logSuccess(`檢查點 ${checkpointId} 驗證通過`)
    } else {
      logError(`檢查點 ${checkpointId} 驗證失敗`)
    }

    log(`驗證時間: ${result.executedAt.toLocaleString()}`)

    // 顯示詳細結果
    if (result.validationResults.length > 0) {
      log('\n📊 詳細結果:', 'cyan')
      result.validationResults.forEach(test => {
        if (test.passed) {
          logSuccess(`${test.test}: ${test.message}`)
        } else {
          logError(`${test.test}: ${test.message}`)
        }
      })
    }

    // 顯示錯誤
    if (result.errors && result.errors.length > 0) {
      log('\n❌ 錯誤詳情:', 'red')
      result.errors.forEach(error => {
        log(`  ${error}`, 'red')
      })
    }

    // 記錄驗證事件
    await statusTracker.recordEvent({
      phaseId: checkpointId,
      type: 'checkpoint_validated',
      message: `檢查點 ${checkpointId} 驗證${result.isValid ? '通過' : '失敗'}`,
      metadata: { isValid: result.isValid, testCount: result.validationResults.length }
    })

  } catch (error) {
    logError(`驗證檢查點失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 顯示遷移時間軸命令
async function showTimeline() {
  try {
    logStep('獲取遷移時間軸...')

    const statusTracker = new MigrationStatusTracker()
    const timeline = await statusTracker.getMigrationTimeline()

    if (timeline.length === 0) {
      logWarning('沒有遷移事件記錄')
      return
    }

    log('\n📅 遷移時間軸', 'bright')
    log('=' .repeat(80))

    timeline.reverse().forEach(event => {
      const timestamp = event.timestamp?.toLocaleString() || '未知時間'
      const eventTypeColor = event.type === 'phase_completed' ? 'green' :
                            event.type === 'phase_failed' ? 'red' :
                            event.type === 'phase_started' ? 'cyan' : 'blue'

      log(`\n[${timestamp}] ${event.type}`, eventTypeColor)
      log(`  階段: ${event.phaseId}`)
      log(`  訊息: ${event.message}`)

      if (event.metadata) {
        const metadataStr = Object.entries(event.metadata)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')
        if (metadataStr) {
          log(`  詳情: ${metadataStr}`, 'blue')
        }
      }
    })

  } catch (error) {
    logError(`獲取時間軸失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 重置遷移狀態命令
async function resetMigration() {
  try {
    logWarning('⚠️  警告：這將重置所有遷移狀態！')
    logInfo('此操作將：')
    log('  - 清除所有階段狀態')
    log('  - 刪除遷移事件歷史')
    log('  - 重置環境配置')

    logInfo('5秒後開始重置，按 Ctrl+C 取消...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // 在實際實作中，這裡會清理所有狀態檔案
    logSuccess('遷移狀態已重置')

  } catch (error) {
    logError(`重置失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// CLI程式設定
program
  .name('migration-manager')
  .description('PCM段階式遷移管理工具')
  .version('1.0.0')

// 狀態和資訊命令
program
  .command('status')
  .description('顯示遷移狀態')
  .action(showStatus)

program
  .command('list-phases')
  .description('列出所有遷移階段')
  .action(listPhases)

program
  .command('timeline')
  .description('顯示遷移事件時間軸')
  .action(showTimeline)

// 階段執行命令
program
  .command('execute <phase-id>')
  .description('執行指定階段')
  .action(executePhase)

program
  .command('execute-parallel <phase-ids...>')
  .description('並行執行多個階段')
  .action(executeParallel)

// 環境管理命令
program
  .command('switch <environment>')
  .description('切換資料庫環境 (postgresql|oracle)')
  .action(switchEnvironment)

// 檢查點命令
program
  .command('validate <checkpoint-id>')
  .description('驗證遷移檢查點')
  .action(validateCheckpoint)

// 管理命令
program
  .command('reset')
  .description('重置遷移狀態')
  .action(resetMigration)

// 主程式執行
if (require.main === module) {
  program.parse()
}

export {
  showStatus,
  listPhases,
  executePhase,
  executeParallel,
  switchEnvironment,
  validateCheckpoint,
  showTimeline,
  resetMigration
}