/**
 * Connection Pool Manager
 * 連接池管理器 - 實施任務 1.1
 */

import {
  IConnectionPoolManager,
  DatabaseConnection,
  HealthStatus,
  PoolStatus,
  PoolConfig,
  RetryConfig,
  DatabaseError,
} from './types';

export class ConnectionPoolManager implements IConnectionPoolManager {
  private oraclePool: any = null;
  private postgresPool: any = null;
  private isInitialized = false;
  private readonly retryConfig: RetryConfig = {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 5000,
  };

  constructor(private config: PoolConfig) {}

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await Promise.all([
      this.initializeOraclePool(),
      this.initializePostgreSQLPool(),
    ]);

    this.isInitialized = true;
  }

  private async initializeOraclePool(): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        this.oraclePool = await this.createOraclePool();
        return;
      } catch (error) {
        lastError = error as Error;

        this.logConnectionError('oracle', error as Error, attempt);

        if (attempt < this.retryConfig.maxAttempts) {
          const delayMs = Math.min(
            this.retryConfig.delayMs *
              Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
            this.retryConfig.maxDelayMs
          );
          await this.delay(delayMs);
        }
      }
    }

    throw this.createDatabaseError(
      'CONNECTION_ERROR',
      `Failed to initialize Oracle pool after ${this.retryConfig.maxAttempts} attempts`,
      lastError!,
      'oracle'
    );
  }

  private async initializePostgreSQLPool(): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        this.postgresPool = await this.createPostgreSQLPool();
        return;
      } catch (error) {
        lastError = error as Error;

        this.logConnectionError('postgresql', error as Error, attempt);

        if (attempt < this.retryConfig.maxAttempts) {
          const delayMs = Math.min(
            this.retryConfig.delayMs *
              Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
            this.retryConfig.maxDelayMs
          );
          await this.delay(delayMs);
        }
      }
    }

    throw this.createDatabaseError(
      'CONNECTION_ERROR',
      `Failed to initialize PostgreSQL pool after ${this.retryConfig.maxAttempts} attempts`,
      lastError!,
      'postgresql'
    );
  }

  private async createOraclePool(): Promise<any> {
    // Dynamic import to avoid loading Oracle driver if not needed
    const oracledb = await import('oracledb');

    return await oracledb.createPool({
      user: this.config.oracle.user,
      password: this.config.oracle.password,
      connectString: this.config.oracle.connectString,
      poolMax: this.config.oracle.poolMax,
      poolMin: this.config.oracle.poolMin,
      poolIncrement: this.config.oracle.poolIncrement || 1,
      poolTimeout: this.config.oracle.poolTimeout || 60,
      queueTimeout: this.config.oracle.queueTimeout || 60000,
    });
  }

  private async createPostgreSQLPool(): Promise<any> {
    // Dynamic import to avoid loading PostgreSQL driver if not needed
    const { Pool } = await import('pg');

    const pool = new Pool({
      host: this.config.postgresql.host,
      port: this.config.postgresql.port,
      database: this.config.postgresql.database,
      user: this.config.postgresql.user,
      password: this.config.postgresql.password,
      max: this.config.postgresql.max,
      min: this.config.postgresql.min,
      idleTimeoutMillis: this.config.postgresql.idleTimeoutMillis || 30000,
      connectionTimeoutMillis:
        this.config.postgresql.connectionTimeoutMillis || 5000,
      ssl: this.config.postgresql.ssl,
    });

    // Set up error handling
    pool.on('error', err => {
      console.error('PostgreSQL pool error:', err);
    });

    return pool;
  }

  async getConnection(
    database: 'oracle' | 'postgresql'
  ): Promise<DatabaseConnection> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        if (database === 'oracle') {
          return await this.getOracleConnection();
        } else {
          return await this.getPostgreSQLConnection();
        }
      } catch (error) {
        lastError = error as Error;

        if (this.isPoolExhaustedError(error as Error)) {
          throw this.createDatabaseError(
            'POOL_EXHAUSTED',
            'Connection pool exhausted. Please try again later.',
            error as Error,
            database,
            true,
            5000
          );
        }

        if (attempt < this.retryConfig.maxAttempts) {
          const delayMs = Math.min(
            this.retryConfig.delayMs *
              Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
            this.retryConfig.maxDelayMs
          );
          await this.delay(delayMs);
        }
      }
    }

    throw this.createDatabaseError(
      'CONNECTION_ERROR',
      `Failed to get database connection after ${this.retryConfig.maxAttempts} attempts`,
      lastError!,
      database
    );
  }

  private async getOracleConnection(): Promise<DatabaseConnection> {
    const rawConnection = await this.oraclePool.getConnection();

    return {
      id: `oracle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'oracle',
      query: async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
        const result = await rawConnection.execute(sql, params);
        return result.rows || [];
      },
      queryOne: async <T = any>(
        sql: string,
        params: any[] = []
      ): Promise<T | null> => {
        const result = await rawConnection.execute(sql, params);
        return result.rows?.[0] || null;
      },
      close: async (): Promise<void> => {
        await rawConnection.close();
      },
      isHealthy: (): boolean => {
        return rawConnection && !rawConnection.isClosed;
      },
    };
  }

  private async getPostgreSQLConnection(): Promise<DatabaseConnection> {
    const rawConnection = await this.postgresPool.connect();

    return {
      id: `postgresql-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'postgresql',
      query: async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
        const result = await rawConnection.query(sql, params);
        return result.rows || [];
      },
      queryOne: async <T = any>(
        sql: string,
        params: any[] = []
      ): Promise<T | null> => {
        const result = await rawConnection.query(sql, params);
        return result.rows?.[0] || null;
      },
      close: async (): Promise<void> => {
        rawConnection.release();
      },
      isHealthy: (): boolean => {
        return rawConnection && !rawConnection.destroyed;
      },
    };
  }

  async releaseConnection(connection: DatabaseConnection): Promise<void> {
    try {
      await connection.close();
    } catch (error) {
      console.error(`Failed to release connection ${connection.id}:`, error);
      // Don't throw - connection release errors should not fail the operation
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    const [oracleHealth, postgresHealth] = await Promise.allSettled([
      this.checkOracleHealth(),
      this.checkPostgreSQLHealth(),
    ]);

    const responseTime = Date.now() - startTime;

    const oracleStatus =
      oracleHealth.status === 'fulfilled'
        ? oracleHealth.value
        : {
            status: 'unhealthy' as const,
            error: (oracleHealth.reason as Error).message,
          };

    const postgresStatus =
      postgresHealth.status === 'fulfilled'
        ? postgresHealth.value
        : {
            status: 'unhealthy' as const,
            error: (postgresHealth.reason as Error).message,
          };

    return {
      isHealthy:
        oracleStatus.status === 'connected' &&
        postgresStatus.status === 'connected',
      responseTime,
      oracle: oracleStatus,
      postgresql: postgresStatus,
    };
  }

  private async checkOracleHealth(): Promise<HealthStatus['oracle']> {
    if (!this.oraclePool) {
      return { status: 'disconnected' };
    }

    try {
      const connection = await this.getOracleConnection();
      await connection.query('SELECT 1 FROM DUAL');
      await connection.close();

      return {
        status: 'connected',
        connectionsOpen: this.oraclePool.connectionsOpen,
        connectionsInUse: this.oraclePool.connectionsInUse,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: (error as Error).message,
      };
    }
  }

  private async checkPostgreSQLHealth(): Promise<HealthStatus['postgresql']> {
    if (!this.postgresPool) {
      return { status: 'disconnected' };
    }

    try {
      const connection = await this.getPostgreSQLConnection();
      await connection.query('SELECT 1');
      await connection.close();

      return {
        status: 'connected',
        totalCount: this.postgresPool.totalCount,
        idleCount: this.postgresPool.idleCount,
        waitingCount: this.postgresPool.waitingCount,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: (error as Error).message,
      };
    }
  }

  getPoolStatus(): PoolStatus {
    const oracledb = require('oracledb');

    return {
      oracle: {
        isInitialized: !!this.oraclePool,
        connectionsOpen: this.oraclePool?.connectionsOpen || 0,
        connectionsInUse: this.oraclePool?.connectionsInUse || 0,
        status:
          this.oraclePool?.status === oracledb.POOL_STATUS_OPEN
            ? 'open'
            : 'closed',
      },
      postgresql: {
        isInitialized: !!this.postgresPool,
        totalCount: this.postgresPool?.totalCount || 0,
        idleCount: this.postgresPool?.idleCount || 0,
        waitingCount: this.postgresPool?.waitingCount || 0,
      },
    };
  }

  async close(): Promise<void> {
    const closePromises: Promise<void>[] = [];

    if (this.oraclePool) {
      closePromises.push(
        this.oraclePool.close().catch((error: Error) => {
          console.error('Error closing Oracle pool:', error);
        })
      );
    }

    if (this.postgresPool) {
      closePromises.push(
        this.postgresPool.end().catch((error: Error) => {
          console.error('Error closing PostgreSQL pool:', error);
        })
      );
    }

    await Promise.all(closePromises);

    this.oraclePool = null;
    this.postgresPool = null;
    this.isInitialized = false;
  }

  private logConnectionError(
    database: string,
    error: Error,
    attempt: number
  ): void {
    console.error('Database connection failed:', {
      database,
      error,
      attempt,
      maxAttempts: this.retryConfig.maxAttempts,
      timestamp: new Date().toISOString(),
    });
  }

  private isPoolExhaustedError(error: Error): boolean {
    return (
      error.name === 'PoolExhaustedError' ||
      error.message.includes('pool exhausted') ||
      error.message.includes('timeout acquiring connection')
    );
  }

  private createDatabaseError(
    code: string,
    message: string,
    originalError: Error,
    database?: 'oracle' | 'postgresql',
    retryable = false,
    retryAfter?: number
  ): DatabaseError {
    const error = new Error(message) as DatabaseError;
    error.name = 'DatabaseError';
    error.code = code;
    error.originalError = originalError;
    error.database = database;
    error.retryable = retryable;
    error.retryAfter = retryAfter;
    return error;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
