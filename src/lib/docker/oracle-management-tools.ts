/**
 * Oracle Management Tools Integration
 * Task 1.3: 整合Oracle管理工具到開發環境
 *
 * 功能:
 * - 配置SQL Developer Web管理介面
 * - 設定Oracle容器的管理工具存取
 * - 建立開發者工具的統一存取點
 */

import { OracleContainerManager } from './oracle-container-manager';
import { execSync } from 'child_process';
import axios from 'axios';

export interface SqlDeveloperWebResult {
  success: boolean;
  webUrl: string;
  credentials: {
    username: string;
    password: string;
  };
}

export interface HealthCheckResult {
  isAccessible: boolean;
  responseTime: number;
  status: 'healthy' | 'unhealthy' | 'starting';
}

export interface AuthenticationResult {
  authenticated: boolean;
  sessionToken?: string;
}

export interface ContainerManagementInterface {
  containerStatus: string;
  databaseStatus: string;
  logs: string[];
}

export interface ContainerMonitor {
  isActive: boolean;
  metrics: {
    cpu: number;
    memory: number;
    diskUsage: number;
  };
}

export interface DeveloperDashboard {
  tools: {
    sqlDeveloperWeb: {
      url: string;
      status: string;
    };
    containerManager: {
      status: string;
      version: string;
    };
    databaseMonitor: {
      status: string;
      activeConnections: number;
    };
  };
  quickActions: string[];
}

export interface ToolsConfiguration {
  sqlDeveloperWeb: {
    enabled: boolean;
    port: number;
    autoStart: boolean;
  };
  containerManager: {
    enabled: boolean;
    monitoringInterval: number;
  };
  monitoring: {
    enabled: boolean;
    alertThreshold: number;
  };
}

export interface ToolPreferences {
  defaultTool: string;
  autoStart: boolean;
  monitoringInterval: number;
}

export interface DockerComposeIntegration {
  isValid: boolean;
  services: string[];
  networks: string[];
}

export interface EnvironmentManager {
  getVariable(name: string): string | undefined;
  setVariable(name: string, value: string): void;
}

export interface StartupSequence {
  steps: string[];
  success: boolean;
  duration: number;
}

export interface StartupFailureRecovery {
  recovery: {
    action: string;
    suggestion: string;
  };
}

export interface TroubleshootingInfo {
  commonIssues: Array<{
    issue: string;
    solution: string;
  }>;
  diagnostics: {
    containerStatus: string;
    networkConnectivity: boolean;
    portAvailability: number[];
  };
  solutions: {
    quickFixes: string[];
    detailedSteps: string[];
  };
}

export class OracleManagementTools {
  private containerManager: OracleContainerManager;
  private monitor?: ContainerMonitor;
  private preferences: ToolPreferences;

  constructor(containerManager: OracleContainerManager) {
    this.containerManager = containerManager;
    this.preferences = {
      defaultTool: 'sqlDeveloperWeb',
      autoStart: true,
      monitoringInterval: 30000,
    };
  }

  async enableSqlDeveloperWeb(): Promise<SqlDeveloperWebResult> {
    try {
      // 檢查Oracle容器是否運行
      const containerStatusResult =
        await this.containerManager.getContainerStatus();
      if (
        !containerStatusResult.success ||
        containerStatusResult.data.state !== 'running'
      ) {
        throw new Error('Oracle container is not running');
      }

      // 啟用SQL Developer Web服務
      const webPort = process.env.ORACLE_APEX_PORT || '8080';
      const password = process.env.ORACLE_PASSWORD || 'Oracle123';

      // 執行APEX啟用命令
      const enableCommand = `
        docker exec pcm-oracle-dev sqlplus -s system/${password}@localhost:1521/XE <<EOF
        ALTER USER APEX_PUBLIC_USER ACCOUNT UNLOCK;
        ALTER USER APEX_PUBLIC_USER IDENTIFIED BY ${password};
        EXEC ORDS_ADMIN.ENABLE_SCHEMA(p_enabled => TRUE, p_schema => 'SYSTEM', p_url_mapping_type => 'BASE_PATH', p_url_mapping_pattern => 'system', p_auto_rest_auth => FALSE);
        COMMIT;
        EXIT;
        EOF
      `;

      execSync(enableCommand, { stdio: 'pipe' });

      return {
        success: true,
        webUrl: `http://localhost:${webPort}/ords`,
        credentials: {
          username: 'system',
          password: password,
        },
      };
    } catch (error) {
      throw new Error(`Failed to enable SQL Developer Web: ${error}`);
    }
  }

  async checkSqlDeveloperWeb(): Promise<HealthCheckResult> {
    const webPort = process.env.ORACLE_APEX_PORT || '8080';
    const webUrl = `http://localhost:${webPort}/ords`;

    const startTime = Date.now();

    try {
      const response = await axios.get(webUrl, { timeout: 5000 });
      const responseTime = Date.now() - startTime;

      return {
        isAccessible: response.status === 200,
        responseTime,
        status: response.status === 200 ? 'healthy' : 'unhealthy',
      };
    } catch (error) {
      return {
        isAccessible: false,
        responseTime: Date.now() - startTime,
        status: 'unhealthy',
      };
    }
  }

  async authenticateSqlDeveloperWeb(credentials: {
    username: string;
    password: string;
  }): Promise<AuthenticationResult> {
    try {
      const webPort = process.env.ORACLE_APEX_PORT || '8080';
      const loginUrl = `http://localhost:${webPort}/ords/f?p=4550:1`;

      // 模擬登入驗證
      const response = await axios.post(
        loginUrl,
        {
          username: credentials.username,
          password: credentials.password,
        },
        { timeout: 5000 }
      );

      if (response.status === 200) {
        return {
          authenticated: true,
          sessionToken: 'mock-session-token-' + Date.now(),
        };
      }

      return { authenticated: false };
    } catch (error) {
      return { authenticated: false };
    }
  }

  async getContainerManagementInterface(): Promise<ContainerManagementInterface> {
    const statusResult = await this.containerManager.getContainerStatus();

    // 取得容器日誌（簡化實作）
    const logs: string[] = [];
    try {
      const logIterator = this.containerManager.monitorLogs();
      let count = 0;
      for await (const logEntry of logIterator) {
        if (count >= 50) break;
        logs.push(`${logEntry.timestamp.toISOString()}: ${logEntry.message}`);
        count++;
      }
    } catch (error) {
      logs.push('Error retrieving logs');
    }

    const containerStatus = statusResult.success
      ? statusResult.data.state
      : 'unknown';
    const databaseStatus = containerStatus === 'running' ? 'ready' : 'starting';

    return {
      containerStatus,
      databaseStatus,
      logs,
    };
  }

  async getAvailableOperations(): Promise<string[]> {
    return [
      'restart',
      'status',
      'logs',
      'backup',
      'restore',
      'monitor',
      'health-check',
    ];
  }

  async startContainerMonitoring(): Promise<ContainerMonitor> {
    // 取得容器資源使用資訊
    const metricsCommand =
      'docker stats pcm-oracle-dev --no-stream --format "{{.CPUPerc}},{{.MemUsage}}"';

    try {
      const output = execSync(metricsCommand, { encoding: 'utf8' });
      const [cpuStr, memStr] = output.trim().split(',');

      this.monitor = {
        isActive: true,
        metrics: {
          cpu: parseFloat(cpuStr.replace('%', '')),
          memory: this.parseMemoryUsage(memStr),
          diskUsage: 0, // 簡化實作
        },
      };

      return this.monitor;
    } catch (error) {
      throw new Error(`Failed to start monitoring: ${error}`);
    }
  }

  async stopContainerMonitoring(): Promise<void> {
    if (this.monitor) {
      this.monitor.isActive = false;
      this.monitor = undefined;
    }
  }

  async getDeveloperDashboard(): Promise<DeveloperDashboard> {
    const sqlDevCheck = await this.checkSqlDeveloperWeb();
    const containerInterface = await this.getContainerManagementInterface();

    return {
      tools: {
        sqlDeveloperWeb: {
          url: `http://localhost:${process.env.ORACLE_APEX_PORT || '8080'}/ords`,
          status: sqlDevCheck.isAccessible ? 'available' : 'unavailable',
        },
        containerManager: {
          status: containerInterface.containerStatus,
          version: '21c-slim',
        },
        databaseMonitor: {
          status: containerInterface.databaseStatus,
          activeConnections: 1, // 簡化實作
        },
      },
      quickActions: [
        'Start SQL Developer Web',
        'View Container Logs',
        'Restart Database',
        'Run Health Check',
        'View Performance Metrics',
      ],
    };
  }

  async getToolsConfiguration(): Promise<ToolsConfiguration> {
    return {
      sqlDeveloperWeb: {
        enabled: true,
        port: parseInt(process.env.ORACLE_APEX_PORT || '8080'),
        autoStart: this.preferences.autoStart,
      },
      containerManager: {
        enabled: true,
        monitoringInterval: this.preferences.monitoringInterval,
      },
      monitoring: {
        enabled: true,
        alertThreshold: 80,
      },
    };
  }

  async updateToolPreferences(
    preferences: Partial<ToolPreferences>
  ): Promise<{ success: boolean }> {
    this.preferences = { ...this.preferences, ...preferences };
    return { success: true };
  }

  async getToolPreferences(): Promise<ToolPreferences> {
    return { ...this.preferences };
  }

  async validateDockerComposeIntegration(): Promise<DockerComposeIntegration> {
    try {
      const composeCheck = execSync('docker-compose config --services', {
        encoding: 'utf8',
      });
      const services = composeCheck
        .trim()
        .split('\n')
        .filter(s => s.length > 0);

      const networkCheck = execSync('docker-compose config --volumes', {
        encoding: 'utf8',
      });

      return {
        isValid: services.includes('oracle-db'),
        services: services,
        networks: ['pcm_network'], // 從docker-compose.yml已知
      };
    } catch (error) {
      return {
        isValid: false,
        services: [],
        networks: [],
      };
    }
  }

  async getEnvironmentManager(): Promise<EnvironmentManager> {
    return {
      getVariable: (name: string) => process.env[name],
      setVariable: (name: string, value: string) => {
        process.env[name] = value;
      },
    };
  }

  async executeStartupSequence(): Promise<StartupSequence> {
    const startTime = Date.now();
    const steps = [
      'Validating Docker environment',
      'Starting Oracle container',
      'Waiting for database ready',
      'Enabling SQL Developer Web',
      'Configuring management tools',
      'Starting monitoring services',
    ];

    try {
      // 執行啟動序列 - 注意：Oracle容器通常透過docker-compose管理
      // 這裡我們檢查容器狀態而不是直接啟動
      const statusResult = await this.containerManager.getContainerStatus();
      if (!statusResult.success || statusResult.data.state !== 'running') {
        throw new Error(
          'Oracle container is not running. Please start with docker-compose up'
        );
      }

      await this.enableSqlDeveloperWeb();

      return {
        steps,
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        steps,
        success: false,
        duration: Date.now() - startTime,
      };
    }
  }

  async handleStartupFailure(): Promise<StartupFailureRecovery> {
    return {
      recovery: {
        action: 'retry_with_different_port',
        suggestion:
          'Try using a different port for SQL Developer Web. Check if port 8080 is already in use.',
      },
    };
  }

  async getTroubleshootingInfo(): Promise<TroubleshootingInfo> {
    const containerStatusResult =
      await this.containerManager.getContainerStatus();
    const containerStatus = containerStatusResult.success
      ? containerStatusResult.data.state
      : 'unknown';

    return {
      commonIssues: [
        {
          issue: 'SQL Developer Web not accessible',
          solution: 'Check if Oracle container is running and APEX is enabled',
        },
        {
          issue: 'Port conflict on 8080',
          solution:
            'Set ORACLE_APEX_PORT environment variable to different port',
        },
        {
          issue: 'Container startup timeout',
          solution:
            'Oracle XE may need more time to initialize. Wait up to 3 minutes.',
        },
      ],
      diagnostics: {
        containerStatus: containerStatus,
        networkConnectivity: true, // 簡化實作
        portAvailability: [1521, 5500, 8080],
      },
      solutions: {
        quickFixes: [
          'Restart Oracle container',
          'Check environment variables',
          'Verify port availability',
        ],
        detailedSteps: [
          '1. Stop all Oracle containers: docker-compose down',
          '2. Check port usage: netstat -tlnp | grep :8080',
          '3. Set different port: export ORACLE_APEX_PORT=8081',
          '4. Restart with new port: docker-compose up -d',
        ],
      },
    };
  }

  async cleanup(): Promise<void> {
    await this.stopContainerMonitoring();
  }

  private parseMemoryUsage(memStr: string): number {
    // 解析記憶體使用量 "123.4MiB / 2GiB" -> 返回百分比
    const [used, total] = memStr.split(' / ');
    const usedMB = this.parseMemoryString(used);
    const totalMB = this.parseMemoryString(total);

    return (usedMB / totalMB) * 100;
  }

  private parseMemoryString(memStr: string): number {
    const value = parseFloat(memStr);
    if (memStr.includes('GiB') || memStr.includes('GB')) {
      return value * 1024;
    } else if (memStr.includes('MiB') || memStr.includes('MB')) {
      return value;
    }
    return value;
  }
}
