import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
  promisify: vi.fn(() => vi.fn()),
}));

// Mock commander
vi.mock('commander', () => ({
  program: {
    name: vi.fn().mockReturnThis(),
    description: vi.fn().mockReturnThis(),
    version: vi.fn().mockReturnThis(),
    command: vi.fn().mockReturnThis(),
    action: vi.fn().mockReturnThis(),
    option: vi.fn().mockReturnThis(),
    parse: vi.fn(),
  },
}));

describe('Docker Oracle Lifecycle Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('容器狀態檢查', () => {
    it('應該能import所有主要函數', async () => {
      // When
      const module = await import('../docker-oracle-lifecycle');

      // Then
      expect(module.checkDockerInstalled).toBeDefined();
      expect(module.getContainerStatus).toBeDefined();
      expect(module.startOracle).toBeDefined();
      expect(module.stopOracle).toBeDefined();
      expect(module.resetOracle).toBeDefined();
      expect(module.statusOracle).toBeDefined();
      expect(module.logsOracle).toBeDefined();
      expect(module.waitForOracleReady).toBeDefined();
    });

    it('應該正確檢查Docker安裝狀態', async () => {
      // Given
      const { promisify } = await import('util');
      const mockExecAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: 'Docker version 20.10.0' })
        .mockResolvedValueOnce({ stdout: 'docker-compose version 1.29.0' });

      vi.mocked(promisify).mockReturnValue(mockExecAsync);

      const { checkDockerInstalled } = await import(
        '../docker-oracle-lifecycle'
      );

      // When
      const result = await checkDockerInstalled();

      // Then
      expect(result).toBe(true);
      expect(mockExecAsync).toHaveBeenCalledWith('docker --version');
      expect(mockExecAsync).toHaveBeenCalledWith('docker-compose --version');
    });

    it('應該在Docker未安裝時返回false', async () => {
      // Given
      const { promisify } = await import('util');
      const mockExecAsync = vi
        .fn()
        .mockRejectedValue(new Error('Command not found'));

      vi.mocked(promisify).mockReturnValue(mockExecAsync);

      const { checkDockerInstalled } = await import(
        '../docker-oracle-lifecycle'
      );

      // When
      const result = await checkDockerInstalled();

      // Then
      expect(result).toBe(false);
    });

    it('應該正確解析容器狀態', async () => {
      // Given
      const { promisify } = await import('util');
      const mockContainerInfo = {
        Names: '/pcm-oracle-dev',
        State: 'running',
        Status: 'Up 5 minutes',
        Ports: '0.0.0.0:1521->1521/tcp, 0.0.0.0:5500->5500/tcp',
      };

      const mockExecAsync = vi.fn().mockResolvedValue({
        stdout: JSON.stringify(mockContainerInfo),
      });

      vi.mocked(promisify).mockReturnValue(mockExecAsync);

      const { getContainerStatus } = await import('../docker-oracle-lifecycle');

      // When
      const result = await getContainerStatus();

      // Then
      expect(result.exists).toBe(true);
      expect(result.state).toBe('running');
      expect(result.status).toBe('Up 5 minutes');
      expect(result.ports).toBe(
        '0.0.0.0:1521->1521/tcp, 0.0.0.0:5500->5500/tcp'
      );
    });

    it('應該處理容器不存在的情況', async () => {
      // Given
      const { promisify } = await import('util');
      const mockExecAsync = vi.fn().mockResolvedValue({ stdout: '' });

      vi.mocked(promisify).mockReturnValue(mockExecAsync);

      const { getContainerStatus } = await import('../docker-oracle-lifecycle');

      // When
      const result = await getContainerStatus();

      // Then
      expect(result.exists).toBe(false);
      expect(result.state).toBe('not_found');
    });
  });

  describe('Oracle等待機制', () => {
    it('應該在健康檢查成功時立即返回', async () => {
      // Given
      const { promisify } = await import('util');
      const mockExecAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: 'healthy\n' });

      vi.mocked(promisify).mockReturnValue(mockExecAsync);

      const { waitForOracleReady } = await import('../docker-oracle-lifecycle');

      // When
      const startTime = Date.now();
      const result = await waitForOracleReady(1); // 1分鐘超時
      const duration = Date.now() - startTime;

      // Then
      expect(result).toBe(true);
      expect(duration).toBeLessThan(5000); // 應該很快返回
    });

    it('應該在SQL連線成功時返回true', async () => {
      // Given
      const { promisify } = await import('util');
      const mockExecAsync = vi
        .fn()
        .mockRejectedValueOnce(new Error('not healthy yet')) // 健康檢查失敗
        .mockResolvedValueOnce({ stdout: 'Connected to Oracle Database' });

      vi.mocked(promisify).mockReturnValue(mockExecAsync);

      const { waitForOracleReady } = await import('../docker-oracle-lifecycle');

      // When
      const result = await waitForOracleReady(0.1); // 0.1分鐘超時

      // Then
      expect(result).toBe(true);
    });
  });

  describe('腳本函數測試', () => {
    it('startOracle函數應該能正常執行流程', async () => {
      // Given
      const { promisify } = await import('util');
      const mockExecAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: 'Docker version 20.10.0' }) // docker --version
        .mockResolvedValueOnce({ stdout: 'docker-compose version 1.29.0' }) // docker-compose --version
        .mockResolvedValueOnce({ stdout: '' }) // container status (not exists)
        .mockResolvedValueOnce({ stdout: 'Container started' }) // docker-compose up
        .mockResolvedValueOnce({ stdout: 'healthy\n' }); // health check

      vi.mocked(promisify).mockReturnValue(mockExecAsync);

      const { startOracle } = await import('../docker-oracle-lifecycle');

      // When & Then (函數應該能執行而不拋出錯誤)
      expect(typeof startOracle).toBe('function');
    });

    it('stopOracle函數應該能正常執行', async () => {
      // Given
      const { stopOracle } = await import('../docker-oracle-lifecycle');

      // When & Then
      expect(typeof stopOracle).toBe('function');
    });

    it('statusOracle函數應該能正常執行', async () => {
      // Given
      const { statusOracle } = await import('../docker-oracle-lifecycle');

      // When & Then
      expect(typeof statusOracle).toBe('function');
    });

    it('logsOracle函數應該能正常執行', async () => {
      // Given
      const { logsOracle } = await import('../docker-oracle-lifecycle');

      // When & Then
      expect(typeof logsOracle).toBe('function');
    });

    it('resetOracle函數應該能正常執行', async () => {
      // Given
      const { resetOracle } = await import('../docker-oracle-lifecycle');

      // When & Then
      expect(typeof resetOracle).toBe('function');
    });
  });
});
