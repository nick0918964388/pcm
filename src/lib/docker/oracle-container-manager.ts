import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { readdir, access } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// 容器狀態介面
export interface ContainerStatus {
  containerName: string;
  state: 'running' | 'exited' | 'paused' | 'restarting' | 'not_found';
  status: string;
  ports: Array<{
    privatePort: number;
    publicPort: number;
    type: string;
  }>;
  createdAt?: string;
  uptime?: string;
}

// 資料庫初始化狀態
export interface DatabaseInitStatus {
  isInitialized: boolean;
  scriptsExecuted: string[];
  errors: string[];
  initTime: Date;
}

// 健康檢查狀態
export interface HealthStatus {
  isHealthy: boolean;
  listenPort: number;
  databaseStatus: 'STARTING' | 'READY' | 'ERROR';
  lastCheckTime: Date;
  errorDetails?: string;
}

// 腳本執行結果
export interface ScriptExecution {
  scriptName: string;
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
}

// 日誌條目介面
export interface LogEntry {
  timestamp: Date;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  source?: string;
}

// 容器資源監控指標
export interface ContainerMetrics {
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
  cpuPercent: number;
  networkRx: number;
  networkTx: number;
  diskRead: number;
  diskWrite: number;
}

// 結果類型定義
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

// 容器錯誤類型
export class ContainerError extends Error {
  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ContainerError';
  }
}

// 初始化錯誤類型
export class InitError extends Error {
  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'InitError';
  }
}

// 健康檢查錯誤類型
export class HealthCheckError extends Error {
  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'HealthCheckError';
  }
}

// 腳本錯誤類型
export class ScriptError extends Error {
  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ScriptError';
  }
}

// 資源監控錯誤類型
export class MetricsError extends Error {
  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'MetricsError';
  }
}

export class OracleContainerManager {
  private readonly containerName = 'pcm-oracle-dev';
  private readonly oraclePassword = process.env.ORACLE_PASSWORD || 'Oracle123';
  private readonly initScriptPath = './database/init';

  /**
   * 取得容器狀態
   */
  async getContainerStatus(): Promise<Result<ContainerStatus, ContainerError>> {
    try {
      const { stdout } = await execAsync(
        `docker ps -a --format "{{json .}}" --filter "name=${this.containerName}"`
      );

      if (!stdout.trim()) {
        return {
          success: true,
          data: {
            containerName: this.containerName,
            state: 'not_found',
            status: 'Container not found',
            ports: [],
          },
        };
      }

      const containerInfo = JSON.parse(stdout.trim());

      // 解析埠口資訊
      const ports: Array<{
        privatePort: number;
        publicPort: number;
        type: string;
      }> = [];
      if (containerInfo.Ports) {
        const portMatches = containerInfo.Ports.match(/(\d+):(\d+)\/(\w+)/g);
        if (portMatches) {
          portMatches.forEach((portStr: string) => {
            const [, publicPort, privatePort, type] =
              portStr.match(/(\d+):(\d+)\/(\w+)/) || [];
            if (publicPort && privatePort && type) {
              ports.push({
                privatePort: parseInt(privatePort),
                publicPort: parseInt(publicPort),
                type,
              });
            }
          });
        }
      }

      return {
        success: true,
        data: {
          containerName: containerInfo.Names,
          state: containerInfo.State.toLowerCase(),
          status: containerInfo.Status,
          ports,
          createdAt: containerInfo.CreatedAt,
          uptime: containerInfo.Status.includes('Up')
            ? containerInfo.Status
            : undefined,
        },
      };
    } catch (error) {
      const containerError = new ContainerError(
        `Failed to get container status: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error))
      );
      return { success: false, error: containerError };
    }
  }

  /**
   * 初始化資料庫
   */
  async initializeDatabase(): Promise<Result<DatabaseInitStatus, InitError>> {
    const initTime = new Date();
    const scriptsExecuted: string[] = [];
    const errors: string[] = [];

    try {
      // 檢查容器是否運行
      const containerStatus = await this.getContainerStatus();
      if (
        !containerStatus.success ||
        containerStatus.data?.state !== 'running'
      ) {
        throw new Error('Oracle container is not running');
      }

      // 等待Oracle完全啟動
      await this.waitForOracleReady(60000); // 等待最多60秒

      // 執行初始化腳本
      const scriptResult = await this.executeStartupScripts();
      if (scriptResult.success && scriptResult.data) {
        scriptResult.data.forEach(script => {
          scriptsExecuted.push(script.scriptName);
          if (!script.success && script.error) {
            errors.push(`${script.scriptName}: ${script.error}`);
          }
        });
      }

      const isInitialized = errors.length === 0;

      return {
        success: isInitialized,
        data: {
          isInitialized,
          scriptsExecuted,
          errors,
          initTime,
        },
      };
    } catch (error) {
      const initError = new InitError(
        `Database initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error))
      );
      return { success: false, error: initError };
    }
  }

  /**
   * 執行健康檢查
   */
  async performHealthCheck(): Promise<Result<HealthStatus, HealthCheckError>> {
    const checkTime = new Date();

    try {
      // 檢查容器狀態
      const containerStatus = await this.getContainerStatus();
      if (
        !containerStatus.success ||
        containerStatus.data?.state !== 'running'
      ) {
        return {
          success: false,
          data: {
            isHealthy: false,
            listenPort: 1521,
            databaseStatus: 'ERROR',
            lastCheckTime: checkTime,
            errorDetails: 'Container is not running',
          },
        };
      }

      // 測試Oracle連線
      try {
        const { stdout, stderr } = await execAsync(
          `docker exec ${this.containerName} sqlplus -L system/${this.oraclePassword}@//localhost:1521/XE @/dev/null <<EOF\nSELECT 1 FROM dual;\nEXIT;\nEOF`
        );

        if (
          stdout.includes('Connected to Oracle Database') ||
          stdout.includes('1')
        ) {
          return {
            success: true,
            data: {
              isHealthy: true,
              listenPort: 1521,
              databaseStatus: 'READY',
              lastCheckTime: checkTime,
            },
          };
        } else if (
          stdout.includes('starting up') ||
          stdout.includes('mounting')
        ) {
          return {
            success: true,
            data: {
              isHealthy: false,
              listenPort: 1521,
              databaseStatus: 'STARTING',
              lastCheckTime: checkTime,
            },
          };
        } else {
          throw new Error(`Unexpected SQL*Plus output: ${stdout} ${stderr}`);
        }
      } catch (sqlError) {
        const errorMessage =
          sqlError instanceof Error ? sqlError.message : String(sqlError);

        return {
          success: false,
          data: {
            isHealthy: false,
            listenPort: 1521,
            databaseStatus: 'ERROR',
            lastCheckTime: checkTime,
            errorDetails: errorMessage,
          },
        };
      }
    } catch (error) {
      const healthCheckError = new HealthCheckError(
        `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error))
      );
      return { success: false, error: healthCheckError };
    }
  }

  /**
   * 執行啟動腳本
   */
  async executeStartupScripts(): Promise<
    Result<ScriptExecution[], ScriptError>
  > {
    try {
      // 檢查腳本目錄是否存在
      try {
        await access(this.initScriptPath);
      } catch {
        return {
          success: true,
          data: [], // 沒有腳本目錄，返回空結果
        };
      }

      // 讀取腳本檔案
      const files = await readdir(this.initScriptPath);
      const sqlFiles = files.filter(file => file.endsWith('.sql')).sort(); // 按檔案名稱排序

      const results: ScriptExecution[] = [];

      for (const sqlFile of sqlFiles) {
        const startTime = Date.now();
        const scriptPath = path.join(this.initScriptPath, sqlFile);

        try {
          const { stdout, stderr } = await execAsync(
            `docker exec ${this.containerName} sqlplus -L system/${this.oraclePassword}@//localhost:1521/XE @${scriptPath}`
          );

          const duration = Date.now() - startTime;
          const success = !stderr || !stderr.includes('ORA-');

          results.push({
            scriptName: sqlFile,
            success,
            output: stdout,
            error: success ? undefined : stderr,
            duration,
          });
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          results.push({
            scriptName: sqlFile,
            success: false,
            error: errorMessage,
            duration,
          });
        }
      }

      const hasFailures = results.some(result => !result.success);

      return {
        success: !hasFailures,
        data: results,
      };
    } catch (error) {
      const scriptError = new ScriptError(
        `Failed to execute startup scripts: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error))
      );
      return { success: false, error: scriptError };
    }
  }

  /**
   * 監控容器日誌
   */
  async *monitorLogs(
    level?: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
  ): AsyncIterable<LogEntry> {
    try {
      const { stdout } = await execAsync(`docker logs ${this.containerName}`);
      const lines = stdout.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const logEntry = this.parseLogLine(line);
        if (logEntry && (!level || logEntry.level === level)) {
          yield logEntry;
        }
      }
    } catch (error) {
      console.error('Failed to get container logs:', error);
    }
  }

  /**
   * 取得容器資源使用指標
   */
  async getContainerMetrics(): Promise<Result<ContainerMetrics, MetricsError>> {
    try {
      const { stdout } = await execAsync(
        `docker stats ${this.containerName} --no-stream --format "{{json .}}"`
      );
      const stats = JSON.parse(stdout.trim());

      // 解析記憶體使用
      const memoryUsage = this.parseSize(stats.MemUsage.split(' / ')[0]);
      const memoryLimit = this.parseSize(stats.MemUsage.split(' / ')[1]);
      const memoryPercent = parseFloat(stats.MemPerc.replace('%', ''));

      // 解析CPU使用率
      const cpuPercent = parseFloat(stats.CPUPerc.replace('%', ''));

      // 解析網路I/O
      const [networkRx, networkTx] = stats.NetIO.split(' / ').map(
        this.parseSize
      );

      // 解析磁碟I/O
      const [diskRead, diskWrite] = stats.BlockIO.split(' / ').map(
        this.parseSize
      );

      return {
        success: true,
        data: {
          memoryUsage,
          memoryLimit,
          memoryPercent,
          cpuPercent,
          networkRx,
          networkTx,
          diskRead,
          diskWrite,
        },
      };
    } catch (error) {
      const metricsError = new MetricsError(
        `Failed to get container metrics: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error))
      );
      return { success: false, error: metricsError };
    }
  }

  /**
   * 等待Oracle準備就緒
   */
  private async waitForOracleReady(timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 2000; // 每2秒檢查一次

    while (Date.now() - startTime < timeoutMs) {
      const healthCheck = await this.performHealthCheck();
      if (healthCheck.success && healthCheck.data?.isHealthy) {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(
      `Oracle database did not become ready within ${timeoutMs}ms`
    );
  }

  /**
   * 解析日誌行
   */
  private parseLogLine(line: string): LogEntry | null {
    // 嘗試解析日誌格式: TIMESTAMP [LEVEL] MESSAGE
    const match = line.match(
      /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)\] (.+)$/
    );

    if (match) {
      const [, timestampStr, levelStr, message] = match;
      const timestamp = new Date(timestampStr);
      const level = levelStr.toUpperCase() as LogEntry['level'];

      return {
        timestamp,
        level,
        message,
        source: 'oracle',
      };
    }

    // 如果不匹配特定格式，返回基本日誌條目
    return {
      timestamp: new Date(),
      level: 'INFO',
      message: line,
      source: 'oracle',
    };
  }

  /**
   * 解析大小字串（如 "1.5GB", "512MB"）
   */
  private parseSize(sizeStr: string): number {
    const match = sizeStr.match(/^([\d.]+)(\w+)$/);
    if (!match) return 0;

    const [, value, unit] = match;
    const numValue = parseFloat(value);

    switch (unit.toUpperCase()) {
      case 'B':
        return numValue;
      case 'KB':
        return numValue * 1024;
      case 'MB':
        return numValue * 1024 * 1024;
      case 'GB':
        return numValue * 1024 * 1024 * 1024;
      case 'TB':
        return numValue * 1024 * 1024 * 1024 * 1024;
      default:
        return numValue;
    }
  }
}
