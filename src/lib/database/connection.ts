// 使用環境變數來決定使用哪個資料庫
const USE_ORACLE = process.env.USE_ORACLE === 'true' || true; // 預設使用 Oracle

// 根據環境變數動態載入資料庫連線
let db: any;
let DatabaseConnection: any;

if (USE_ORACLE) {
  // 使用 Oracle
  console.log('Using Oracle database connection');
  const oracleModule = require('./connection-oracle-wrapper');
  db = oracleModule.db;
  DatabaseConnection = oracleModule.default;
} else {
  // 使用 PostgreSQL (保留原始邏輯以便未來切換)
  console.log('Using PostgreSQL database connection');
  const { Pool, PoolClient } = require('pg');

  // Database connection configuration
  interface DatabaseConfig {
    host: string;
    database: string;
    user: string;
    password: string;
    port: number;
    ssl?: {
      rejectUnauthorized: boolean;
    };
    max?: number;
    min?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  }

  class PostgreSQLConnection {
    private static instance: PostgreSQLConnection;
    private pool: any;

    private constructor() {
      // 從環境變數或預設值獲取配置
      const config: DatabaseConfig = {
        host: process.env.DB_HOST || process.env.HOSTNAME || '192.168.1.183',
        database: process.env.DB_DATABASE || process.env.DATABASE || 'app_db',
        user: process.env.DB_USER || process.env.USERNAME || 'admin',
        password:
          process.env.DB_PASSWORD ||
          process.env.PASSWORD ||
          'XcW04ByX6GbVdt1gw4EJ5XRY',
        port: parseInt(process.env.DB_PORT || process.env.PORT || '30432'),
        ssl: process.env.DATABASE_URL?.includes('sslmode=require')
          ? { rejectUnauthorized: false }
          : false,
        max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
        min: parseInt(process.env.DB_MIN_CONNECTIONS || '5'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '10000'),
        connectionTimeoutMillis: parseInt(
          process.env.DB_CONNECTION_TIMEOUT || '5000'
        ),
      };

      console.log('PostgreSQL config:', {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        ssl: config.ssl,
      });

      this.pool = new Pool(config);

      // 設定 schema 搜尋路徑為 pcm
      this.pool.on('connect', async (client: any) => {
        try {
          await client.query('SET search_path TO pcm, public');
        } catch (error) {
          console.error('Failed to set search_path:', error);
        }
      });

      // 監聽連接池事件
      this.pool.on('error', (err: any) => {
        console.error('Database connection pool error:', err);
      });

      this.pool.on('connect', () => {
        console.log('New database connection established');
      });
    }

    public static getInstance(): PostgreSQLConnection {
      if (!PostgreSQLConnection.instance) {
        PostgreSQLConnection.instance = new PostgreSQLConnection();
      }
      return PostgreSQLConnection.instance;
    }

    async query<T = any>(text: string, params?: any[]): Promise<T[]> {
      const start = Date.now();
      const client = await this.pool.connect();
      try {
        const result = await client.query(text, params);
        const duration = Date.now() - start;

        // 慢查詢警告 (超過 1 秒)
        if (duration > 1000) {
          console.warn(
            `Slow query detected: ${duration}ms - ${text.substring(0, 100)}...`
          );
        }

        return result.rows;
      } catch (error) {
        console.error('Database query error:', error);
        throw error;
      } finally {
        client.release();
      }
    }

    async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
      const rows = await this.query<T>(text, params);
      return rows.length > 0 ? rows[0] : null;
    }

    async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    async healthCheck(): Promise<boolean> {
      try {
        await this.query('SELECT 1');
        return true;
      } catch (error) {
        console.error('Database health check failed:', error);
        return false;
      }
    }

    async close(): Promise<void> {
      await this.pool.end();
    }

    // 取得連接池狀態
    getPoolStatus() {
      return {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount,
      };
    }
  }

  DatabaseConnection = PostgreSQLConnection;
  db = PostgreSQLConnection.getInstance();
}

// 匯出單例實例
export { db };
export default DatabaseConnection;
