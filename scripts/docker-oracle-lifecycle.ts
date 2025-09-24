#!/usr/bin/env tsx

/**
 * Oracle容器生命週期管理腳本
 * 提供Oracle Docker環境的啟動、停止、重置和監控功能
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { program } from 'commander';
import path from 'path';

const execAsync = promisify(exec);

// 配置
const CONTAINER_NAME = 'pcm-oracle-dev';
const COMPOSE_FILE = path.join(process.cwd(), 'docker-compose.yml');
const ENV_FILE = path.join(process.cwd(), '.env.local');

// 色彩輸出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color?: keyof typeof colors) {
  const colorCode = color ? colors[color] : '';
  console.log(`${colorCode}${message}${colors.reset}`);
}

function logStep(step: string) {
  log(`\n📋 ${step}`, 'cyan');
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

async function runCommand(command: string, description: string) {
  try {
    log(`   執行: ${command}`, 'blue');
    const { stdout, stderr } = await execAsync(command);
    if (stderr && !stderr.includes('WARNING')) {
      logWarning(`stderr: ${stderr}`);
    }
    return { success: true, stdout, stderr };
  } catch (error) {
    logError(
      `${description}失敗: ${error instanceof Error ? error.message : String(error)}`
    );
    return { success: false, error };
  }
}

async function checkDockerInstalled(): Promise<boolean> {
  try {
    await execAsync('docker --version');
    await execAsync('docker-compose --version');
    return true;
  } catch {
    logError('Docker或Docker Compose未安裝或未運行');
    logError('請安裝Docker Desktop並確保服務正在運行');
    return false;
  }
}

async function getContainerStatus() {
  try {
    const { stdout } = await execAsync(
      `docker ps -a --format "{{json .}}" --filter "name=${CONTAINER_NAME}"`
    );
    if (!stdout.trim()) {
      return { exists: false, state: 'not_found' };
    }

    const containerInfo = JSON.parse(stdout.trim());
    return {
      exists: true,
      state: containerInfo.State.toLowerCase(),
      status: containerInfo.Status,
      ports: containerInfo.Ports,
    };
  } catch (error) {
    logError(
      `檢查容器狀態失敗: ${error instanceof Error ? error.message : String(error)}`
    );
    return { exists: false, state: 'error' };
  }
}

async function waitForOracleReady(timeoutMinutes = 5): Promise<boolean> {
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const startTime = Date.now();
  const pollInterval = 10000; // 10秒檢查一次

  log(`等待Oracle資料庫啟動完成 (最多${timeoutMinutes}分鐘)...`, 'yellow');

  while (Date.now() - startTime < timeoutMs) {
    try {
      // 檢查容器健康狀態
      const { stdout } = await execAsync(
        `docker inspect ${CONTAINER_NAME} --format='{{.State.Health.Status}}'`
      );

      if (stdout.trim() === 'healthy') {
        logSuccess('Oracle資料庫已就緒');
        return true;
      }

      // 嘗試連線測試
      try {
        await execAsync(
          `docker exec ${CONTAINER_NAME} sqlplus -L system/Oracle123@//localhost:1521/XE @/dev/null <<< "SELECT 1 FROM dual; EXIT;"`
        );
        logSuccess('Oracle資料庫連線測試成功');
        return true;
      } catch {
        // 繼續等待
      }

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      process.stdout.write(`\r⏳ 等待中... (${elapsed}s)`);

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      logError(
        `健康檢查失敗: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  logError(`Oracle資料庫在${timeoutMinutes}分鐘內未能就緒`);
  return false;
}

// 命令實作
async function startOracle() {
  logStep('啟動Oracle開發環境');

  // 檢查Docker
  if (!(await checkDockerInstalled())) {
    process.exit(1);
  }

  // 檢查當前狀態
  const status = await getContainerStatus();
  if (status.exists && status.state === 'running') {
    logWarning('Oracle容器已在運行中');
    return;
  }

  // 啟動容器
  const startResult = await runCommand(
    `docker-compose -f ${COMPOSE_FILE} up -d oracle-db`,
    '啟動Oracle容器'
  );

  if (!startResult.success) {
    process.exit(1);
  }

  logSuccess('Oracle容器啟動指令已執行');

  // 等待Oracle就緒
  const isReady = await waitForOracleReady();
  if (!isReady) {
    logError('Oracle啟動超時，請檢查容器日誌');
    logError(`查看日誌: docker logs ${CONTAINER_NAME}`);
    process.exit(1);
  }

  // 顯示連線資訊
  log('\n🎉 Oracle開發環境已就緒！', 'green');
  log('\n📊 連線資訊:', 'bright');
  log('   主機: localhost');
  log('   埠口: 1521');
  log('   服務名: XE');
  log('   用戶: system');
  log('   密碼: Oracle123');
  log('   連線字串: localhost:1521/XE');
  log('\n🌐 SQL Developer Web: http://localhost:5500/ords/sql-developer');
  log('\n📝 管理指令:');
  log('   查看狀態: npm run docker:oracle:status');
  log('   查看日誌: npm run docker:oracle:logs');
  log('   停止服務: npm run docker:oracle:stop');
}

async function stopOracle() {
  logStep('停止Oracle開發環境');

  const status = await getContainerStatus();
  if (!status.exists || status.state !== 'running') {
    logWarning('Oracle容器未在運行');
    return;
  }

  const stopResult = await runCommand(
    `docker-compose -f ${COMPOSE_FILE} stop oracle-db`,
    '停止Oracle容器'
  );

  if (stopResult.success) {
    logSuccess('Oracle容器已停止');
  }
}

async function resetOracle() {
  logStep('重置Oracle開發環境 (這將刪除所有資料！)');

  // 確認操作
  if (process.env.NODE_ENV !== 'test') {
    log('⚠️  警告：這將刪除所有Oracle資料庫資料！', 'red');
    log('如果您確定要繼續，請在5秒內按 Ctrl+C 取消，或者等待繼續...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // 停止並移除容器
  await runCommand(
    `docker-compose -f ${COMPOSE_FILE} down oracle-db`,
    '停止並移除Oracle容器'
  );

  // 移除卷
  await runCommand(
    'docker volume rm pcm_oracle_data 2>/dev/null || true',
    '移除Oracle資料卷'
  );

  logSuccess('Oracle環境已重置');
  log('執行 npm run docker:oracle:start 重新建立環境', 'cyan');
}

async function statusOracle() {
  logStep('檢查Oracle開發環境狀態');

  const status = await getContainerStatus();

  log('\n📊 容器狀態:', 'bright');
  log(`   容器名稱: ${CONTAINER_NAME}`);

  if (!status.exists) {
    log('   狀態: 未找到', 'red');
    log('\n💡 執行以下命令建立環境:', 'cyan');
    log('   npm run docker:oracle:start');
    return;
  }

  const stateColor = status.state === 'running' ? 'green' : 'red';
  log(`   狀態: ${status.state}`, stateColor);
  log(`   詳細: ${status.status}`);

  if (status.ports) {
    log(`   埠口: ${status.ports}`);
  }

  // 檢查健康狀態
  if (status.state === 'running') {
    try {
      const { stdout } = await execAsync(
        `docker inspect ${CONTAINER_NAME} --format='{{.State.Health.Status}}'`
      );
      const healthStatus = stdout.trim();
      const healthColor = healthStatus === 'healthy' ? 'green' : 'yellow';
      log(`   健康狀態: ${healthStatus}`, healthColor);

      // 測試連線
      try {
        await execAsync(
          `docker exec ${CONTAINER_NAME} sqlplus -L system/Oracle123@//localhost:1521/XE @/dev/null <<< "SELECT 1 FROM dual; EXIT;" 2>/dev/null`
        );
        log('   資料庫連線: 成功', 'green');
      } catch {
        log('   資料庫連線: 失敗', 'red');
      }
    } catch (error) {
      log('   健康檢查: 失敗', 'red');
    }
  }

  // 顯示資源使用
  if (status.state === 'running') {
    try {
      const { stdout } = await execAsync(
        `docker stats ${CONTAINER_NAME} --no-stream --format "table {{.CPUPerc}}\\t{{.MemUsage}}"`
      );
      const lines = stdout.trim().split('\n');
      if (lines.length > 1) {
        const [cpu, memory] = lines[1].split('\t');
        log('\n📈 資源使用:', 'bright');
        log(`   CPU: ${cpu}`);
        log(`   記憶體: ${memory}`);
      }
    } catch {
      // 忽略資源統計錯誤
    }
  }
}

async function logsOracle(follow = false) {
  logStep(`查看Oracle容器日誌${follow ? ' (即時)' : ''}`);

  const status = await getContainerStatus();
  if (!status.exists) {
    logError('Oracle容器不存在');
    return;
  }

  const followFlag = follow ? '-f' : '';
  const command = `docker logs ${followFlag} --tail 50 ${CONTAINER_NAME}`;

  if (follow) {
    log('按 Ctrl+C 停止查看日誌', 'yellow');
    // 對於follow模式，直接執行而不是用promisify
    exec(command, { stdio: 'inherit' });
  } else {
    const result = await runCommand(command, '取得容器日誌');
    if (result.success) {
      console.log(result.stdout);
    }
  }
}

// CLI程式設定
program
  .name('docker-oracle-lifecycle')
  .description('PCM Oracle容器生命週期管理')
  .version('1.0.0');

program.command('start').description('啟動Oracle開發環境').action(startOracle);

program.command('stop').description('停止Oracle開發環境').action(stopOracle);

program
  .command('restart')
  .description('重新啟動Oracle開發環境')
  .action(async () => {
    await stopOracle();
    await startOracle();
  });

program
  .command('reset')
  .description('重置Oracle開發環境 (刪除所有資料)')
  .action(resetOracle);

program
  .command('status')
  .description('檢查Oracle開發環境狀態')
  .action(statusOracle);

program
  .command('logs')
  .description('查看Oracle容器日誌')
  .option('-f, --follow', '即時跟蹤日誌')
  .action(options => logsOracle(options.follow));

// 主程式執行
if (require.main === module) {
  program.parse();
}

// 匯出函數供測試使用
export {
  startOracle,
  stopOracle,
  resetOracle,
  statusOracle,
  logsOracle,
  checkDockerInstalled,
  getContainerStatus,
  waitForOracleReady,
};
