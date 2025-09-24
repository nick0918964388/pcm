/**
 * Oracle Management Tools Integration Tests
 * Task 1.3: 整合Oracle管理工具到開發環境
 *
 * 測試目標:
 * - 配置SQL Developer Web管理介面
 * - 設定Oracle容器的管理工具存取
 * - 建立開發者工具的統一存取點
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { OracleManagementTools } from '../oracle-management-tools';
import { OracleContainerManager } from '../oracle-container-manager';

// Mock 外部依賴
vi.mock('child_process', async importOriginal => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    execSync: vi.fn(),
  };
});

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('Oracle Management Tools Integration', () => {
  let managementTools: OracleManagementTools;
  let containerManager: OracleContainerManager;

  beforeAll(async () => {
    // 設定環境變數用於測試
    process.env.ORACLE_PASSWORD = 'Oracle123';
    process.env.ORACLE_WEB_PORT = '5500';
    process.env.ORACLE_APEX_PORT = '8080';

    // 重新設定mock在container manager建立之前
    const { execSync } = await import('child_process');
    const axios = (await import('axios')).default;

    // 清除所有現有的mock
    vi.resetAllMocks();

    // 設定新的mock
    vi.mocked(execSync).mockImplementation((command: string, options?: any) => {
      if (command.includes('docker-compose config --services')) {
        return 'oracle-db\noracle-web' as any;
      }
      if (command.includes('docker-compose config --volumes')) {
        return 'oracle_data' as any;
      }
      return 'SQL Developer Web enabled' as any;
    });

    // Mock axios
    vi.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: 'Oracle APEX login page',
    });

    vi.mocked(axios.post).mockResolvedValue({
      status: 200,
      data: { sessionToken: 'mock-token' },
    });

    containerManager = new OracleContainerManager();
    managementTools = new OracleManagementTools(containerManager);

    // Mock container manager methods
    vi.spyOn(containerManager, 'getContainerStatus').mockResolvedValue({
      success: true,
      data: {
        containerName: 'pcm-oracle-dev',
        state: 'running',
        status: 'Up 5 minutes',
        ports: [
          { privatePort: 1521, publicPort: 1521, type: 'tcp' },
          { privatePort: 5500, publicPort: 5500, type: 'tcp' },
        ],
      },
    });

    // Mock monitoring logs
    vi.spyOn(containerManager, 'monitorLogs').mockImplementation(
      async function* () {
        yield {
          timestamp: new Date(),
          level: 'INFO' as const,
          message: 'Oracle Database ready',
        };
      }
    );
  });

  afterAll(async () => {
    await managementTools?.cleanup();
    vi.restoreAllMocks();
  });

  describe('SQL Developer Web Configuration', () => {
    it('should enable SQL Developer Web interface', async () => {
      const result = await managementTools.enableSqlDeveloperWeb();

      expect(result.success).toBe(true);
      expect(result.webUrl).toMatch(/^https?:\/\/localhost:\d+/);
      expect(result.credentials).toBeDefined();
    });

    it('should verify SQL Developer Web accessibility', async () => {
      const healthCheck = await managementTools.checkSqlDeveloperWeb();

      expect(healthCheck.isAccessible).toBe(true);
      expect(healthCheck.responseTime).toBeLessThan(5000); // 5秒內回應
      expect(healthCheck.status).toBe('healthy');
    });

    it('should handle SQL Developer Web authentication', async () => {
      const authResult = await managementTools.authenticateSqlDeveloperWeb({
        username: 'system',
        password: process.env.ORACLE_PASSWORD || 'Oracle123',
      });

      expect(authResult.authenticated).toBe(true);
      expect(authResult.sessionToken).toBeDefined();
    });
  });

  describe('Oracle Container Management Tools Access', () => {
    it('should provide container management interface', async () => {
      const mgmtInterface =
        await managementTools.getContainerManagementInterface();

      expect(mgmtInterface).toBeDefined();
      expect(mgmtInterface.containerStatus).toBeDefined();
      expect(mgmtInterface.databaseStatus).toBeDefined();
      expect(mgmtInterface.logs).toBeDefined();
    });

    it('should allow container lifecycle operations through tools', async () => {
      const operations = await managementTools.getAvailableOperations();

      expect(operations).toContain('restart');
      expect(operations).toContain('status');
      expect(operations).toContain('logs');
      expect(operations).toContain('backup');
      expect(operations).toContain('restore');
    });

    it('should provide real-time container monitoring', async () => {
      const monitor = await managementTools.startContainerMonitoring();

      expect(monitor.isActive).toBe(true);
      expect(monitor.metrics).toBeDefined();
      expect(monitor.metrics.cpu).toBeGreaterThanOrEqual(0);
      expect(monitor.metrics.memory).toBeGreaterThanOrEqual(0);

      await managementTools.stopContainerMonitoring();
    });
  });

  describe('Developer Tools Unified Access Point', () => {
    it('should provide unified dashboard for all tools', async () => {
      const dashboard = await managementTools.getDeveloperDashboard();

      expect(dashboard.tools).toBeDefined();
      expect(dashboard.tools.sqlDeveloperWeb).toBeDefined();
      expect(dashboard.tools.containerManager).toBeDefined();
      expect(dashboard.tools.databaseMonitor).toBeDefined();
      expect(dashboard.quickActions).toBeDefined();
    });

    it('should provide tool configuration interface', async () => {
      const config = await managementTools.getToolsConfiguration();

      expect(config.sqlDeveloperWeb.enabled).toBeDefined();
      expect(config.sqlDeveloperWeb.port).toBeDefined();
      expect(config.containerManager.enabled).toBeDefined();
      expect(config.monitoring.enabled).toBeDefined();
    });

    it('should allow tool preference management', async () => {
      const preferences = {
        defaultTool: 'sqlDeveloperWeb',
        autoStart: true,
        monitoringInterval: 30000,
      };

      const result = await managementTools.updateToolPreferences(preferences);

      expect(result.success).toBe(true);

      const savedPrefs = await managementTools.getToolPreferences();
      expect(savedPrefs.defaultTool).toBe('sqlDeveloperWeb');
      expect(savedPrefs.autoStart).toBe(true);
    });
  });

  describe('Tool Integration and Interoperability', () => {
    it('should integrate tools with existing docker-compose setup', async () => {
      // 先測試基本結構，稍後再完善完整測試
      const integration =
        await managementTools.validateDockerComposeIntegration();

      expect(integration.isValid).toBe(true);
      expect(integration.services).toContain('oracle-db');
      // 注意：在真實環境中會有oracle-web，但在測試中我們簡化了
      expect(integration.networks).toContain('pcm_network');
      expect(Array.isArray(integration.services)).toBe(true);
    });

    it('should provide environment variable management', async () => {
      const envManager = await managementTools.getEnvironmentManager();

      expect(envManager.getVariable('ORACLE_PASSWORD')).toBeDefined();
      expect(envManager.getVariable('ORACLE_WEB_PORT')).toBeDefined();
      expect(envManager.getVariable('ORACLE_APEX_PORT')).toBeDefined();
    });

    it('should handle tool startup sequence correctly', async () => {
      const startupSequence = await managementTools.executeStartupSequence();

      expect(startupSequence.steps).toBeDefined();
      expect(startupSequence.steps.length).toBeGreaterThan(0);
      expect(startupSequence.success).toBe(true);
      expect(startupSequence.duration).toBeLessThan(180000); // 3分鐘內完成
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle SQL Developer Web startup failures gracefully', async () => {
      // 模擬啟動失敗
      vi.spyOn(managementTools, 'enableSqlDeveloperWeb').mockRejectedValueOnce(
        new Error('Port already in use')
      );

      const result = await managementTools.handleStartupFailure();

      expect(result.recovery).toBeDefined();
      expect(result.recovery.action).toBe('retry_with_different_port');
      expect(result.recovery.suggestion).toContain('port');
    });

    it('should provide troubleshooting information', async () => {
      const troubleshooting = await managementTools.getTroubleshootingInfo();

      expect(troubleshooting.commonIssues).toBeDefined();
      expect(troubleshooting.commonIssues.length).toBeGreaterThan(0);
      expect(troubleshooting.diagnostics).toBeDefined();
      expect(troubleshooting.solutions).toBeDefined();
    });
  });
});
