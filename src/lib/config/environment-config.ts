/**
 * Task 5.1: 環境配置管理系統
 *
 * GREEN階段：實作多環境配置管理機制
 */

import { EventEmitter } from 'events';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public suggestion?: string
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

export interface OracleConfig {
  connectString: string;
  user: string;
  password: string;
  poolMin: number;
  poolMax: number;
  poolIncrement: number;
  poolTimeout: number;
  enableStatistics: boolean;
}

export interface OracleSecurityConfig {
  walletLocation?: string;
  walletPassword?: string;
  sslEnabled: boolean;
  certPath?: string;
  keyPath?: string;
}

export interface OracleEnvironmentConfig {
  oracle: OracleConfig;
  security: OracleSecurityConfig;
  environment: string;
  isProduction: boolean;
  debugMode: boolean;
}

export interface EnvironmentInfo {
  environment: string;
  isProduction: boolean;
  debugMode: boolean;
  nodeVersion: string;
  platform: string;
}

export interface ConfigDiagnostic {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export class EnvironmentConfig extends EventEmitter {
  private static instance: EnvironmentConfig;
  private static currentConfig: OracleEnvironmentConfig | null = null;
  private static configFileCache: any = null;

  private constructor() {
    super();
  }

  static getInstance(): EnvironmentConfig {
    if (!this.instance) {
      this.instance = new EnvironmentConfig();
    }
    return this.instance;
  }

  /**
   * 獲取Oracle配置
   */
  static getOracleConfig(): OracleEnvironmentConfig {
    if (!this.currentConfig) {
      this.currentConfig = this.loadOracleConfig();
    }
    return this.currentConfig;
  }

  /**
   * 獲取環境配置資訊
   */
  static getEnvironmentConfig(): EnvironmentInfo {
    const env = process.env.NODE_ENV || 'development';
    const isProduction = env === 'production';

    return {
      environment: env,
      isProduction,
      debugMode: !isProduction,
      nodeVersion: process.version,
      platform: process.platform,
    };
  }

  /**
   * 載入Oracle配置
   */
  private static loadOracleConfig(): OracleEnvironmentConfig {
    const envInfo = this.getEnvironmentConfig();

    // 載入檔案配置（如果存在）
    const fileConfig = this.loadConfigFile();

    // 建構Oracle連線字串
    const host =
      process.env.ORACLE_HOST ||
      process.env.DOCKER_ORACLE_HOST ||
      fileConfig?.oracle?.host ||
      'localhost';

    const port =
      process.env.ORACLE_PORT ||
      process.env.DOCKER_ORACLE_PORT ||
      fileConfig?.oracle?.port ||
      '1521';

    const service =
      process.env.ORACLE_SERVICE ||
      process.env.DOCKER_ORACLE_SERVICE ||
      fileConfig?.oracle?.service ||
      (envInfo.isProduction ? 'PROD' : 'XEPDB1');

    const connectString = `${host}:${port}/${service}`;

    // Oracle基本配置
    const oracle: OracleConfig = {
      connectString,
      user: process.env.ORACLE_USER || fileConfig?.oracle?.user || 'PCM',
      password:
        process.env.ORACLE_PASSWORD ||
        process.env.ORACLE_PWD ||
        fileConfig?.oracle?.password ||
        'oracle123',
      poolMin: parseInt(
        process.env.ORACLE_POOL_MIN ||
          fileConfig?.oracle?.poolMin ||
          (envInfo.isProduction ? '5' : '1')
      ),
      poolMax: parseInt(
        process.env.ORACLE_POOL_MAX ||
          fileConfig?.oracle?.poolMax ||
          (envInfo.isProduction ? '50' : '10')
      ),
      poolIncrement: parseInt(
        process.env.ORACLE_POOL_INCREMENT ||
          fileConfig?.oracle?.poolIncrement ||
          '1'
      ),
      poolTimeout: parseInt(
        process.env.ORACLE_POOL_TIMEOUT ||
          fileConfig?.oracle?.poolTimeout ||
          '60'
      ),
      enableStatistics: !envInfo.isProduction,
    };

    // 安全配置
    const security: OracleSecurityConfig = {
      walletLocation: process.env.ORACLE_WALLET_LOCATION,
      walletPassword: process.env.ORACLE_WALLET_PASSWORD,
      sslEnabled: process.env.ORACLE_SSL_ENABLED === 'true',
      certPath: process.env.ORACLE_SSL_CERT_PATH,
      keyPath: process.env.ORACLE_SSL_KEY_PATH,
    };

    return {
      oracle,
      security,
      environment: envInfo.environment,
      isProduction: envInfo.isProduction,
      debugMode: envInfo.debugMode,
    };
  }

  /**
   * 載入配置檔案
   */
  static loadConfigFile(): any {
    if (this.configFileCache) {
      return this.configFileCache;
    }

    const configPath = this.getConfigFilePath();

    if (existsSync(configPath)) {
      try {
        const configContent = readFileSync(configPath, 'utf-8');
        this.configFileCache = JSON.parse(configContent);
        return this.configFileCache;
      } catch (error) {
        console.warn(`載入配置檔案失敗: ${configPath}`, error);
      }
    }

    return {};
  }

  /**
   * 獲取配置檔案路徑
   */
  static getConfigFilePath(): string {
    const env = process.env.NODE_ENV || 'development';
    const configFileName =
      env === 'production'
        ? 'config.production.json'
        : 'config.development.json';
    return join(process.cwd(), 'config', configFileName);
  }

  /**
   * 驗證Oracle配置
   */
  static validateOracleConfig(config: Partial<OracleConfig>): void {
    const errors: string[] = [];

    // 檢查必要欄位
    if (!config.connectString?.trim()) {
      errors.push('connectString is required');
    }

    if (!config.user?.trim()) {
      errors.push('user is required');
    }

    if (!config.password?.trim()) {
      errors.push('password is required');
    }

    // 檢查密碼強度
    if (config.password && config.password.length < 6) {
      errors.push('password must be at least 6 characters long');
    }

    // 檢查連線池參數
    if (config.poolMin !== undefined && config.poolMax !== undefined) {
      if (config.poolMin > config.poolMax) {
        errors.push('poolMin cannot be greater than poolMax');
      }
    }

    if (config.poolIncrement !== undefined && config.poolIncrement <= 0) {
      errors.push('poolIncrement must be greater than 0');
    }

    if (errors.length > 0) {
      throw new ConfigValidationError(`配置驗證失敗: ${errors.join(', ')}`);
    }
  }

  /**
   * 驗證環境配置
   */
  static validateEnvironment(): void {
    const errors: string[] = [];

    // 檢查Oracle主機配置
    const host = process.env.ORACLE_HOST || process.env.DOCKER_ORACLE_HOST;
    if (host === '') {
      errors.push('ORACLE_HOST is empty');
    }

    // 檢查埠號配置
    const port = process.env.ORACLE_PORT || process.env.DOCKER_ORACLE_PORT;
    if (port && isNaN(parseInt(port))) {
      errors.push('ORACLE_PORT is not a valid number');
    }

    if (errors.length > 0) {
      throw new ConfigValidationError(`環境配置驗證失敗: ${errors.join(', ')}`);
    }
  }

  /**
   * 獲取安全的配置（隱藏敏感資訊）
   */
  static getSafeConfig(): OracleEnvironmentConfig {
    const config = this.getOracleConfig();

    return {
      ...config,
      oracle: {
        ...config.oracle,
        password: '***HIDDEN***',
      },
      security: {
        ...config.security,
        walletPassword: config.security.walletPassword
          ? '***HIDDEN***'
          : undefined,
      },
    };
  }

  /**
   * 重載配置
   */
  static async reloadConfig(): Promise<void> {
    const oldConfig = this.currentConfig;
    this.currentConfig = null;
    this.configFileCache = null;

    const newConfig = this.getOracleConfig();

    // 比較配置變更
    if (oldConfig) {
      const changes = this.getConfigChanges(oldConfig, newConfig);
      if (Object.keys(changes).length > 0) {
        this.getInstance().emit('configChanged', {
          type: 'oracle',
          changes,
        });
      }
    }
  }

  /**
   * 比較配置變更
   */
  private static getConfigChanges(
    oldConfig: OracleEnvironmentConfig,
    newConfig: OracleEnvironmentConfig
  ): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};

    // 比較Oracle配置
    Object.keys(newConfig.oracle).forEach(key => {
      const oldValue = (oldConfig.oracle as any)[key];
      const newValue = (newConfig.oracle as any)[key];

      if (oldValue !== newValue) {
        changes[`oracle.${key}`] = { old: oldValue, new: newValue };
      }
    });

    return changes;
  }

  /**
   * 獲取診斷資訊
   */
  static getDiagnosticInfo(): ConfigDiagnostic {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      const config = this.getOracleConfig();
      this.validateOracleConfig(config.oracle);
    } catch (error) {
      if (error instanceof ConfigValidationError) {
        errors.push(error.message);
      }
    }

    // 檢查環境變數
    const host = process.env.ORACLE_HOST || process.env.DOCKER_ORACLE_HOST;
    if (!host) {
      warnings.push('未設定ORACLE_HOST環境變數，使用預設值localhost');
      suggestions.push('設定ORACLE_HOST環境變數以指定Oracle伺服器位址');
    }

    const password = process.env.ORACLE_PASSWORD || process.env.ORACLE_PWD;
    if (!password) {
      warnings.push('未設定Oracle密碼環境變數，使用預設密碼');
      suggestions.push('設定ORACLE_PASSWORD環境變數以提高安全性');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * 獲取配置建議
   */
  static getConfigSuggestions(config: Partial<OracleConfig>): string[] {
    const suggestions: string[] = [];

    if (!config.connectString) {
      suggestions.push('設定ORACLE_HOST環境變數');
    }

    if (!config.password) {
      suggestions.push('設定ORACLE_PASSWORD環境變數');
    }

    if (config.password && config.password.length < 8) {
      suggestions.push('使用至少8個字元的強密碼');
    }

    if (!config.user) {
      suggestions.push('設定ORACLE_USER環境變數');
    }

    return suggestions;
  }

  /**
   * 檢查配置是否準備就緒
   */
  static isConfigReady(): boolean {
    try {
      const config = this.getOracleConfig();
      this.validateOracleConfig(config.oracle);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 匯出配置到檔案
   */
  static exportConfig(): string {
    const safeConfig = this.getSafeConfig();
    return JSON.stringify(safeConfig, null, 2);
  }
}
