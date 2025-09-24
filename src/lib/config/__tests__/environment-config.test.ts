/**
 * Task 5.1: 環境配置管理測試
 *
 * TDD RED階段：建立環境配置管理的測試案例
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  EnvironmentConfig,
  ConfigValidationError,
} from '../environment-config';

describe('環境配置管理測試', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // 保存原始環境變數
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // 恢復原始環境變數
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('RED: Oracle環境配置載入', () => {
    it('應該載入預設的Oracle開發環境配置', () => {
      // Arrange
      const expectedConfig = {
        oracle: {
          connectString: 'localhost:1521/XEPDB1',
          user: 'PCM',
          password: 'oracle123',
          poolMin: 1,
          poolMax: 10,
          poolIncrement: 1,
          poolTimeout: 60,
          enableStatistics: true,
        },
        environment: 'development',
        isProduction: false,
      };

      // Act
      const config = EnvironmentConfig.getOracleConfig();

      // Assert
      expect(config.oracle.connectString).toBe(
        expectedConfig.oracle.connectString
      );
      expect(config.oracle.user).toBe(expectedConfig.oracle.user);
      expect(config.environment).toBe(expectedConfig.environment);
      expect(config.isProduction).toBe(false);
    });

    it('應該支援環境變數覆蓋Oracle配置', () => {
      // Arrange
      process.env.ORACLE_HOST = 'prod-oracle.example.com';
      process.env.ORACLE_PORT = '1521';
      process.env.ORACLE_SERVICE = 'PROD';
      process.env.ORACLE_USER = 'PCM_PROD';
      process.env.ORACLE_PASSWORD = 'secure_password_123';
      process.env.ORACLE_POOL_MIN = '5';
      process.env.ORACLE_POOL_MAX = '50';
      process.env.NODE_ENV = 'production';

      // Act
      const config = EnvironmentConfig.getOracleConfig();

      // Assert
      expect(config.oracle.connectString).toBe(
        'prod-oracle.example.com:1521/PROD'
      );
      expect(config.oracle.user).toBe('PCM_PROD');
      expect(config.oracle.password).toBe('secure_password_123');
      expect(config.oracle.poolMin).toBe(5);
      expect(config.oracle.poolMax).toBe(50);
      expect(config.environment).toBe('production');
      expect(config.isProduction).toBe(true);
    });

    it('應該載入Docker容器環境配置', () => {
      // Arrange
      process.env.DOCKER_ORACLE_HOST = 'pcm-oracle-dev';
      process.env.DOCKER_ORACLE_PORT = '1521';
      process.env.DOCKER_ORACLE_SERVICE = 'XE';
      process.env.ORACLE_PWD = 'docker_oracle_pwd';
      process.env.ORACLE_CHARACTERSET = 'AL32UTF8';

      // Act
      const config = EnvironmentConfig.getOracleConfig();

      // Assert
      expect(config.oracle.connectString).toContain('pcm-oracle-dev:1521/XE');
      expect(config.oracle.password).toBe('docker_oracle_pwd');
    });
  });

  describe('RED: 配置驗證機制', () => {
    it('應該驗證必要的Oracle連線參數', () => {
      // Arrange
      const invalidConfig = {
        connectString: '',
        user: '',
        password: '',
      };

      // Act & Assert
      expect(() => {
        EnvironmentConfig.validateOracleConfig(invalidConfig);
      }).toThrow(ConfigValidationError);
    });

    it('應該驗證連線池參數範圍', () => {
      // Arrange
      const invalidPoolConfig = {
        connectString: 'localhost:1521/XE',
        user: 'PCM',
        password: 'oracle123',
        poolMin: 10,
        poolMax: 5, // poolMax < poolMin
        poolIncrement: 0,
      };

      // Act & Assert
      expect(() => {
        EnvironmentConfig.validateOracleConfig(invalidPoolConfig);
      }).toThrow(ConfigValidationError);
    });

    it('應該驗證Oracle密碼強度', () => {
      // Arrange
      const weakPasswordConfig = {
        connectString: 'localhost:1521/XE',
        user: 'PCM',
        password: '123', // 太簡單的密碼
      };

      // Act & Assert
      expect(() => {
        EnvironmentConfig.validateOracleConfig(weakPasswordConfig);
      }).toThrow(ConfigValidationError);
    });
  });

  describe('RED: 環境切換功能', () => {
    it('應該支援開發、測試、生產環境切換', () => {
      // Test Development
      process.env.NODE_ENV = 'development';
      const devConfig = EnvironmentConfig.getEnvironmentConfig();
      expect(devConfig.environment).toBe('development');
      expect(devConfig.isProduction).toBe(false);
      expect(devConfig.debugMode).toBe(true);

      // Test Production
      process.env.NODE_ENV = 'production';
      const prodConfig = EnvironmentConfig.getEnvironmentConfig();
      expect(prodConfig.environment).toBe('production');
      expect(prodConfig.isProduction).toBe(true);
      expect(prodConfig.debugMode).toBe(false);
    });

    it('應該根據環境載入不同的Oracle配置', () => {
      // Arrange & Act
      process.env.NODE_ENV = 'development';
      const devConfig = EnvironmentConfig.getOracleConfig();

      process.env.NODE_ENV = 'production';
      const prodConfig = EnvironmentConfig.getOracleConfig();

      // Assert
      expect(devConfig.oracle.enableStatistics).toBe(true);
      expect(prodConfig.oracle.enableStatistics).toBe(false);
      expect(devConfig.oracle.poolMin).toBeLessThan(prodConfig.oracle.poolMin);
    });
  });

  describe('RED: 安全性配置', () => {
    it('應該支援Oracle Wallet配置', () => {
      // Arrange
      process.env.ORACLE_WALLET_LOCATION = '/opt/oracle/wallet';
      process.env.ORACLE_WALLET_PASSWORD = 'wallet_password';

      // Act
      const config = EnvironmentConfig.getOracleConfig();

      // Assert
      expect(config.security.walletLocation).toBe('/opt/oracle/wallet');
      expect(config.security.walletPassword).toBe('wallet_password');
    });

    it('應該隱藏敏感資訊在日誌中', () => {
      // Arrange
      process.env.ORACLE_PASSWORD = 'super_secret_password';

      // Act
      const safeConfig = EnvironmentConfig.getSafeConfig();

      // Assert
      expect(safeConfig.oracle.password).toBe('***HIDDEN***');
      expect(safeConfig.oracle.connectString).toBeDefined();
      expect(safeConfig.oracle.user).toBeDefined();
    });

    it('應該驗證SSL/TLS配置', () => {
      // Arrange
      process.env.ORACLE_SSL_ENABLED = 'true';
      process.env.ORACLE_SSL_CERT_PATH = '/path/to/cert.pem';
      process.env.ORACLE_SSL_KEY_PATH = '/path/to/key.pem';

      // Act
      const config = EnvironmentConfig.getOracleConfig();

      // Assert
      expect(config.security.sslEnabled).toBe(true);
      expect(config.security.certPath).toBe('/path/to/cert.pem');
      expect(config.security.keyPath).toBe('/path/to/key.pem');
    });
  });

  describe('RED: 配置熱重載', () => {
    it('應該支援配置動態重載', async () => {
      // Arrange
      const initialConfig = EnvironmentConfig.getOracleConfig();

      // Act - 模擬環境變數變更
      process.env.ORACLE_POOL_MAX = '20';
      await EnvironmentConfig.reloadConfig();
      const reloadedConfig = EnvironmentConfig.getOracleConfig();

      // Assert
      expect(initialConfig.oracle.poolMax).not.toBe(20);
      expect(reloadedConfig.oracle.poolMax).toBe(20);
    });

    it('應該通知配置變更事件', async () => {
      // Arrange
      const mockListener = vi.fn();
      EnvironmentConfig.on('configChanged', mockListener);

      // Act
      process.env.ORACLE_USER = 'NEW_USER';
      await EnvironmentConfig.reloadConfig();

      // Assert
      expect(mockListener).toHaveBeenCalledWith({
        type: 'oracle',
        changes: expect.objectContaining({
          'oracle.user': { old: expect.any(String), new: 'NEW_USER' },
        }),
      });
    });
  });

  describe('RED: 配置檔案支援', () => {
    it('應該載入config.json配置檔案', () => {
      // Arrange
      const mockConfigFile = {
        oracle: {
          connectString: 'file-config:1521/XE',
          user: 'FILE_USER',
          password: 'file_password',
        },
      };

      vi.spyOn(EnvironmentConfig, 'loadConfigFile').mockReturnValue(
        mockConfigFile
      );

      // Act
      const config = EnvironmentConfig.getOracleConfig();

      // Assert
      expect(config.oracle.connectString).toBe('file-config:1521/XE');
      expect(config.oracle.user).toBe('FILE_USER');
    });

    it('應該支援環境特定的配置檔案', () => {
      // Arrange
      process.env.NODE_ENV = 'production';

      // Act
      const configFilePath = EnvironmentConfig.getConfigFilePath();

      // Assert
      expect(configFilePath).toContain('config.production.json');
    });
  });

  describe('RED: 錯誤處理和診斷', () => {
    it('應該提供詳細的配置錯誤診斷', () => {
      // Arrange
      process.env.ORACLE_HOST = '';
      process.env.ORACLE_PORT = 'invalid';

      // Act & Assert
      expect(() => {
        EnvironmentConfig.validateEnvironment();
      }).toThrow(ConfigValidationError);

      const diagnostic = EnvironmentConfig.getDiagnosticInfo();
      expect(diagnostic.errors).toContain('ORACLE_HOST is empty');
      expect(diagnostic.errors).toContain('ORACLE_PORT is not a valid number');
    });

    it('應該提供配置修復建議', () => {
      // Arrange
      const incompleteConfig = {
        connectString: '',
        user: 'PCM',
      };

      // Act
      const suggestions =
        EnvironmentConfig.getConfigSuggestions(incompleteConfig);

      // Assert
      expect(suggestions).toContain('設定ORACLE_HOST環境變數');
      expect(suggestions).toContain('設定ORACLE_PASSWORD環境變數');
    });
  });
});
