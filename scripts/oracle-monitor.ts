#!/usr/bin/env tsx

/**
 * Oracle資料庫監控工具
 * 提供健康檢查、效能監控和診斷功能
 */

import { program } from 'commander';
import {
  OracleHealthMonitor,
  OracleLogManager,
  OracleDiagnosticTools,
  OracleRealtimeMonitor,
  OracleAlertSystem,
} from '../src/lib/database/oracle-monitoring';

// 色彩輸出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message: string, color?: keyof typeof colors) {
  const colorCode = color ? colors[color] : '';
  console.log(`${colorCode}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'blue');
}

// 健康檢查命令
async function healthCheck() {
  try {
    logInfo('執行資料庫健康檢查...');

    const healthMonitor = new OracleHealthMonitor();
    const health = await healthMonitor.checkDatabaseHealth();

    log('\n📊 資料庫健康狀態', 'bright');
    log('='.repeat(50));

    if (health.isHealthy) {
      logSuccess(`狀態: ${health.status}`);
    } else {
      logError(`狀態: ${health.status}`);
      if (health.error) {
        logError(`錯誤: ${health.error}`);
      }
    }

    log(`檢查時間: ${health.checkedAt.toLocaleString()}`);

    if (health.metrics) {
      log('\n📈 效能指標', 'cyan');
      log(`CPU使用率: ${health.metrics.cpuUsage}%`);
      log(`記憶體使用率: ${health.metrics.memoryUsage}%`);
      log(`活躍會話數: ${health.metrics.sessionCount}`);
      log(`回應時間: ${health.metrics.responseTime}ms`);
      if (health.metrics.diskIOPS) {
        log(`磁碟IOPS: ${health.metrics.diskIOPS}`);
      }

      // 檢查告警閾值
      const alertSystem = new OracleAlertSystem();
      const alerts = await alertSystem.checkMetricThresholds(health.metrics);

      if (alerts.length > 0) {
        log('\n🚨 告警', 'red');
        alerts.forEach(alert => {
          const severityColor =
            alert.severity === 'CRITICAL'
              ? 'red'
              : alert.severity === 'WARNING'
                ? 'yellow'
                : 'blue';
          log(`[${alert.severity}] ${alert.message}`, severityColor);
        });
      } else {
        logSuccess('\n✨ 所有指標正常');
      }
    }
  } catch (error) {
    logError(
      `健康檢查失敗: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

// 效能指標命令
async function performanceMetrics() {
  try {
    logInfo('獲取效能指標...');

    const healthMonitor = new OracleHealthMonitor();
    const metrics = await performanceMetrics();

    log('\n📊 當前效能指標', 'bright');
    log('='.repeat(40));
    log(`CPU使用率: ${metrics.cpuUsage}%`);
    log(`記憶體使用率: ${metrics.memoryUsage}%`);
    log(`活躍會話數: ${metrics.sessionCount}`);
    log(`回應時間: ${metrics.responseTime}ms`);
  } catch (error) {
    logError(
      `獲取效能指標失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 慢查詢報告命令
async function slowQueries(minTime?: string) {
  try {
    const minExecutionTime = minTime ? parseInt(minTime) * 1000 : 5000;
    logInfo(`獲取執行時間超過 ${minExecutionTime / 1000} 秒的慢查詢...`);

    const logManager = new OracleLogManager();
    const slowQueries = await logManager.getSlowQueries(minExecutionTime);

    if (slowQueries.length === 0) {
      logSuccess('沒有發現慢查詢');
      return;
    }

    log('\n🐌 慢查詢報告', 'bright');
    log('='.repeat(80));

    slowQueries.forEach((query, index) => {
      log(`\n${index + 1}. 執行時間: ${query.executionTime.toFixed(2)}秒`);
      log(`   執行次數: ${query.executionCount}`);
      log(`   平均時間: ${query.avgExecutionTime.toFixed(2)}秒`);
      log(`   最後執行: ${query.lastExecuted.toLocaleString()}`);
      log(`   SQL: ${query.sqlText.substring(0, 150)}...`, 'cyan');
    });
  } catch (error) {
    logError(
      `獲取慢查詢失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 會話監控命令
async function sessions() {
  try {
    logInfo('獲取當前會話資訊...');

    const realtimeMonitor = new OracleRealtimeMonitor();
    const sessions = await realtimeMonitor.getCurrentSessions();

    if (sessions.length === 0) {
      logWarning('沒有找到活躍會話');
      return;
    }

    log('\n👥 當前會話', 'bright');
    log('='.repeat(100));
    log(
      `${'會話ID'.padEnd(8)} ${'用戶'.padEnd(15)} ${'狀態'.padEnd(10)} ${'登入時間'.padEnd(20)} ${'最後活動'.padEnd(20)}`
    );
    log('-'.repeat(100));

    sessions.forEach(session => {
      const statusColor = session.status === 'ACTIVE' ? 'green' : 'yellow';
      log(
        `${session.sessionId.toString().padEnd(8)} ` +
          `${session.username.padEnd(15)} ` +
          `${session.status.padEnd(10)} ` +
          `${session.logonTime.toLocaleString().padEnd(20)} ` +
          `${session.lastActivity.toLocaleString().padEnd(20)}`,
        session.status === 'ACTIVE' ? undefined : 'yellow'
      );
    });

    log(`\n總計: ${sessions.length} 個會話`);
    const activeSessions = sessions.filter(s => s.status === 'ACTIVE').length;
    log(`活躍: ${activeSessions} 個會話`, 'green');
  } catch (error) {
    logError(
      `獲取會話資訊失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 表空間監控命令
async function tablespaces() {
  try {
    logInfo('獲取表空間使用率...');

    const realtimeMonitor = new OracleRealtimeMonitor();
    const tablespaces = await realtimeMonitor.getTablespaceUsage();

    if (tablespaces.length === 0) {
      logWarning('沒有找到表空間資訊');
      return;
    }

    log('\n💾 表空間使用率', 'bright');
    log('='.repeat(80));
    log(
      `${'名稱'.padEnd(20)} ${'總大小(MB)'.padEnd(12)} ${'已使用(MB)'.padEnd(12)} ${'使用率'.padEnd(8)} ${'狀態'.padEnd(10)}`
    );
    log('-'.repeat(80));

    tablespaces.forEach(ts => {
      const usageColor =
        ts.usagePercentage > 90
          ? 'red'
          : ts.usagePercentage > 80
            ? 'yellow'
            : 'green';

      log(
        `${ts.name.padEnd(20)} ` +
          `${ts.totalSizeMB.toFixed(1).padEnd(12)} ` +
          `${ts.usedSizeMB.toFixed(1).padEnd(12)} ` +
          `${ts.usagePercentage.toFixed(1)}%`.padEnd(8) +
          `${ts.status.padEnd(10)}`,
        usageColor
      );

      // 高使用率警告
      if (ts.usagePercentage > 90) {
        logError(`   ⚠️  ${ts.name} 表空間使用率過高！`);
      } else if (ts.usagePercentage > 80) {
        logWarning(`   ⚠️  ${ts.name} 表空間使用率偏高`);
      }
    });
  } catch (error) {
    logError(
      `獲取表空間資訊失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 鎖等待監控命令
async function locks() {
  try {
    logInfo('檢查鎖等待情況...');

    const realtimeMonitor = new OracleRealtimeMonitor();
    const lockWaits = await realtimeMonitor.getLockWaits();

    if (lockWaits.length === 0) {
      logSuccess('沒有發現鎖等待');
      return;
    }

    log('\n🔒 鎖等待情況', 'bright');
    log('='.repeat(80));
    log(
      `${'會話ID'.padEnd(8)} ${'等待事件'.padEnd(30)} ${'等待時間(s)'.padEnd(12)} ${'對象'.padEnd(15)} ${'鎖模式'.padEnd(10)}`
    );
    log('-'.repeat(80));

    lockWaits.forEach(lock => {
      log(
        `${lock.sessionId.toString().padEnd(8)} ` +
          `${lock.event.substring(0, 29).padEnd(30)} ` +
          `${lock.waitTime.toFixed(1).padEnd(12)} ` +
          `${lock.objectName.substring(0, 14).padEnd(15)} ` +
          `${lock.lockMode.padEnd(10)}`,
        'yellow'
      );
    });

    logWarning(`⚠️  發現 ${lockWaits.length} 個鎖等待`);
  } catch (error) {
    logError(
      `檢查鎖等待失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 阻塞會話命令
async function blocking() {
  try {
    logInfo('檢查阻塞會話...');

    const diagnosticTools = new OracleDiagnosticTools();
    const blockingSessions = await diagnosticTools.getBlockingSessions();

    if (blockingSessions.length === 0) {
      logSuccess('沒有發現阻塞會話');
      return;
    }

    log('\n🚫 阻塞會話', 'bright');
    log('='.repeat(80));
    log(
      `${'阻塞者'.padEnd(8)} ${'被阻塞'.padEnd(8)} ${'鎖類型'.padEnd(10)} ${'對象'.padEnd(20)} ${'等待時間(s)'.padEnd(12)}`
    );
    log('-'.repeat(80));

    blockingSessions.forEach(blocking => {
      log(
        `${blocking.blockingSessionId.toString().padEnd(8)} ` +
          `${blocking.blockedSessionId.toString().padEnd(8)} ` +
          `${blocking.lockType.padEnd(10)} ` +
          `${blocking.objectName.substring(0, 19).padEnd(20)} ` +
          `${blocking.waitTime.toString().padEnd(12)}`,
        'red'
      );
    });

    logError(`⚠️  發現 ${blockingSessions.length} 個阻塞情況`);
  } catch (error) {
    logError(
      `檢查阻塞會話失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 效能報告命令
async function performanceReport(hours?: string) {
  try {
    const reportHours = hours ? parseInt(hours) : 1;
    logInfo(`生成過去 ${reportHours} 小時的效能報告...`);

    const diagnosticTools = new OracleDiagnosticTools();
    const report = await diagnosticTools.generatePerformanceReport(reportHours);

    log('\n📋 效能報告', 'bright');
    log('='.repeat(60));
    log(`報告時間: ${report.generatedAt.toLocaleString()}`);
    log(
      `統計期間: ${report.timeRange.start.toLocaleString()} ~ ${report.timeRange.end.toLocaleString()}`
    );

    if (report.statistics.length > 0) {
      log('\n📊 系統統計', 'cyan');
      report.statistics.forEach(stat => {
        log(
          `  ${stat.metric}: ${stat.value.toLocaleString()} ${stat.unit || ''}`
        );
      });
    }

    if (report.topWaitEvents.length > 0) {
      log('\n⏱️  主要等待事件', 'cyan');
      report.topWaitEvents.slice(0, 5).forEach((event, index) => {
        log(`  ${index + 1}. ${event.event}`);
        log(`     總等待時間: ${event.totalWaitTime.toFixed(2)}ms`);
        log(`     等待次數: ${event.waitCount.toLocaleString()}`);
        log(`     平均等待: ${event.avgWaitTime.toFixed(2)}ms`);
      });
    }

    if (report.topSQLStatements.length > 0) {
      log('\n🔍 TOP SQL語句', 'cyan');
      report.topSQLStatements.slice(0, 5).forEach((sql, index) => {
        log(
          `  ${index + 1}. 執行次數: ${sql.executions}, 總時間: ${sql.totalTime.toFixed(2)}s`
        );
        log(`     SQL: ${sql.sqlText}`, 'magenta');
      });
    }
  } catch (error) {
    logError(
      `生成效能報告失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 解釋查詢計畫命令
async function explainPlan(sqlText: string) {
  try {
    logInfo('分析查詢執行計畫...');

    const diagnosticTools = new OracleDiagnosticTools();
    const plan = await diagnosticTools.explainQuery(sqlText);

    log('\n📋 執行計畫', 'bright');
    log('='.repeat(80));
    log(`SQL: ${plan.sqlText}`, 'cyan');
    log(`預估成本: ${plan.estimatedCost}`);
    log(`預估行數: ${plan.estimatedRows}`);
    log(`計畫雜湊: ${plan.planHash}`);

    log('\n執行計畫:', 'cyan');
    plan.executionPlan.forEach(line => {
      log(`  ${line}`);
    });
  } catch (error) {
    logError(
      `分析執行計畫失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// 監控命令 - 持續監控
async function monitor(interval?: string) {
  const intervalSeconds = interval ? parseInt(interval) : 30;
  logInfo(`開始持續監控 (每 ${intervalSeconds} 秒更新)`);
  log('按 Ctrl+C 停止監控\n');

  const runMonitoring = async () => {
    console.clear();
    log('🔄 Oracle 即時監控', 'bright');
    log(`更新時間: ${new Date().toLocaleString()}`);
    log('='.repeat(60));

    try {
      // 健康檢查
      const healthMonitor = new OracleHealthMonitor();
      const health = await healthMonitor.checkDatabaseHealth();

      if (health.isHealthy) {
        logSuccess(`資料庫狀態: ${health.status}`);
      } else {
        logError(`資料庫狀態: ${health.status}`);
      }

      if (health.metrics) {
        log('\n📊 效能指標:');
        log(`  CPU: ${health.metrics.cpuUsage}%`);
        log(`  記憶體: ${health.metrics.memoryUsage}%`);
        log(`  會話數: ${health.metrics.sessionCount}`);
        log(`  回應時間: ${health.metrics.responseTime}ms`);

        // 檢查告警
        const alertSystem = new OracleAlertSystem();
        const alerts = await alertSystem.checkMetricThresholds(health.metrics);

        if (alerts.length > 0) {
          log('\n🚨 告警:');
          alerts.forEach(alert => {
            const color = alert.severity === 'CRITICAL' ? 'red' : 'yellow';
            log(`  [${alert.severity}] ${alert.message}`, color);
          });
        }
      }

      // 表空間使用率
      const realtimeMonitor = new OracleRealtimeMonitor();
      const tablespaces = await realtimeMonitor.getTablespaceUsage();

      if (tablespaces.length > 0) {
        log('\n💾 表空間使用率:');
        tablespaces.slice(0, 3).forEach(ts => {
          const color = ts.usagePercentage > 80 ? 'yellow' : undefined;
          log(`  ${ts.name}: ${ts.usagePercentage.toFixed(1)}%`, color);
        });
      }
    } catch (error) {
      logError(
        `監控錯誤: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    log(`\n下次更新: ${intervalSeconds} 秒後`);
  };

  // 立即執行一次
  await runMonitoring();

  // 設定定時器
  const timer = setInterval(runMonitoring, intervalSeconds * 1000);

  // 處理 Ctrl+C
  process.on('SIGINT', () => {
    clearInterval(timer);
    log('\n\n👋 監控已停止');
    process.exit(0);
  });
}

// CLI程式設定
program
  .name('oracle-monitor')
  .description('PCM Oracle資料庫監控工具')
  .version('1.0.0');

// 基本監控命令
program.command('health').description('執行資料庫健康檢查').action(healthCheck);

program
  .command('metrics')
  .description('顯示效能指標')
  .action(performanceMetrics);

program.command('sessions').description('顯示當前會話').action(sessions);

program
  .command('tablespaces')
  .description('顯示表空間使用率')
  .action(tablespaces);

program.command('locks').description('檢查鎖等待').action(locks);

program.command('blocking').description('檢查阻塞會話').action(blocking);

// 進階診斷命令
program
  .command('slow-queries')
  .description('顯示慢查詢')
  .option('-t, --time <seconds>', '最小執行時間(秒)', '5')
  .action(options => slowQueries(options.time));

program
  .command('performance-report')
  .description('生成效能報告')
  .option('-h, --hours <hours>', '統計時間範圍(小時)', '1')
  .action(options => performanceReport(options.hours));

program
  .command('explain')
  .description('分析SQL執行計畫')
  .argument('<sql>', 'SQL語句')
  .action(explainPlan);

// 即時監控命令
program
  .command('monitor')
  .description('開始即時監控')
  .option('-i, --interval <seconds>', '更新間隔(秒)', '30')
  .action(options => monitor(options.interval));

// 主程式執行
if (require.main === module) {
  program.parse();
}

export {
  healthCheck,
  performanceMetrics,
  slowQueries,
  sessions,
  tablespaces,
  locks,
  blocking,
  performanceReport,
  explainPlan,
  monitor,
};
