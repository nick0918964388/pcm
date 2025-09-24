/**
 * BullMQ 佇列處理配置
 * 支援可配置的並行控制、優先級和重試策略
 */

export interface BatchConfiguration {
  maxConcurrentWorkers: number; // 最大並行 worker 數量
  batchSize: number; // 每批次處理檔案數量
  retryAttempts: number; // 最大重試次數
  retryDelay: number; // 重試延遲 (ms)
  timeout: number; // 單一任務逾時 (ms)
  priorityLevels: Record<string, number>; // 優先級設定
  redis: RedisConfiguration; // Redis 連線配置
  cleanup: CleanupConfiguration; // 清理配置
}

export interface RedisConfiguration {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest: number;
  retryDelayOnFailover: number;
  keyPrefix?: string;
}

export interface CleanupConfiguration {
  removeOnComplete: number; // 保留的已完成任務數量
  removeOnFail: number; // 保留的失敗任務數量
  maxAge: number; // 任務最大保留時間 (ms)
  cleanupInterval: number; // 清理間隔 (ms)
}

export interface QueueLimiter {
  max: number; // 每個時間窗口的最大任務數
  duration: number; // 時間窗口 (ms)
}

export interface JobOptions {
  priority: number;
  delay?: number;
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
}

/**
 * 預設配置
 */
export const DEFAULT_BATCH_CONFIG: BatchConfiguration = {
  maxConcurrentWorkers: 4,
  batchSize: 8,
  retryAttempts: 3,
  retryDelay: 2000,
  timeout: 30000,
  priorityLevels: {
    urgent: 10,
    normal: 5,
    low: 1,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'pcm:',
  },
  cleanup: {
    removeOnComplete: 10,
    removeOnFail: 50,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    cleanupInterval: 60 * 60 * 1000, // 1 hour
  },
};

/**
 * 開發環境配置
 */
export const DEV_BATCH_CONFIG: BatchConfiguration = {
  ...DEFAULT_BATCH_CONFIG,
  maxConcurrentWorkers: 2,
  batchSize: 3,
  cleanup: {
    ...DEFAULT_BATCH_CONFIG.cleanup,
    removeOnComplete: 5,
    removeOnFail: 10,
  },
};

/**
 * 生產環境配置
 */
export const PROD_BATCH_CONFIG: BatchConfiguration = {
  ...DEFAULT_BATCH_CONFIG,
  maxConcurrentWorkers: 8,
  batchSize: 15,
  timeout: 60000, // 1 minute
  cleanup: {
    ...DEFAULT_BATCH_CONFIG.cleanup,
    removeOnComplete: 20,
    removeOnFail: 100,
  },
};

/**
 * 根據環境獲取配置
 */
export function getBatchConfiguration(): BatchConfiguration {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return PROD_BATCH_CONFIG;
    case 'development':
    case 'test':
      return DEV_BATCH_CONFIG;
    default:
      return DEFAULT_BATCH_CONFIG;
  }
}

/**
 * 驗證配置的有效性
 */
export function validateBatchConfiguration(
  config: BatchConfiguration
): string[] {
  const errors: string[] = [];

  if (config.maxConcurrentWorkers < 1) {
    errors.push('maxConcurrentWorkers must be at least 1');
  }

  if (config.batchSize < 1) {
    errors.push('batchSize must be at least 1');
  }

  if (config.retryAttempts < 0) {
    errors.push('retryAttempts must be non-negative');
  }

  if (config.retryDelay < 0) {
    errors.push('retryDelay must be non-negative');
  }

  if (config.timeout < 1000) {
    errors.push('timeout must be at least 1000ms');
  }

  if (!config.redis.host) {
    errors.push('Redis host is required');
  }

  if (config.redis.port < 1 || config.redis.port > 65535) {
    errors.push('Redis port must be between 1 and 65535');
  }

  return errors;
}

/**
 * 建立 JobOptions 從優先級
 */
export function createJobOptions(
  priority: keyof typeof DEFAULT_BATCH_CONFIG.priorityLevels,
  config: BatchConfiguration = getBatchConfiguration()
): JobOptions {
  return {
    priority: config.priorityLevels[priority],
    removeOnComplete: config.cleanup.removeOnComplete,
    removeOnFail: config.cleanup.removeOnFail,
    attempts: config.retryAttempts,
    backoff: {
      type: 'exponential',
      delay: config.retryDelay,
    },
  };
}
