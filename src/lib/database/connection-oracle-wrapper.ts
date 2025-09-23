import oracledb from 'oracledb';

/**
 * Oracle 連線包裝器
 * 提供與 PostgreSQL 相容的介面，讓應用程式可以無縫切換
 */

// 初始化 Oracle 客戶端設定
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = false; // 與 PostgreSQL 行為一致

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

// 模擬 PostgreSQL 的 PoolClient 介面
class OraclePoolClient {
  private connection: oracledb.Connection;

  constructor(connection: oracledb.Connection) {
    this.connection = connection;
  }

  async query(text: string, params?: any[]): Promise<{ rows: any[] }> {
    // 轉換 PostgreSQL 參數標記 ($1, $2...) 到 Oracle 綁定變數 (:1, :2...)
    let oracleSql = text;
    const bindParams: any = {};

    if (params && params.length > 0) {
      // 替換 $1, $2 等為 :1, :2
      for (let i = 0; i < params.length; i++) {
        const pgParam = `$${i + 1}`;
        const oracleParam = `:${i + 1}`;
        oracleSql = oracleSql.replace(new RegExp('\\' + pgParam, 'g'), oracleParam);

        // 轉換 boolean 值為數字 (Oracle 不支援 boolean)
        if (typeof params[i] === 'boolean') {
          bindParams[i + 1] = params[i] ? 1 : 0;
        } else {
          bindParams[i + 1] = params[i];
        }
      }
    }

    // 轉換常見的 PostgreSQL 語法到 Oracle
    oracleSql = this.convertPostgreSQLToOracle(oracleSql);

    try {
      const result = await this.connection.execute(oracleSql, bindParams);

      // 如果是 SELECT 語句，返回 rows
      if (result.rows) {
        return { rows: result.rows };
      }

      // 如果是 INSERT/UPDATE/DELETE，返回空 rows
      return { rows: [] };
    } catch (error) {
      console.error('Oracle query error:', error);
      console.error('SQL:', oracleSql);
      console.error('Params:', bindParams);
      throw error;
    }
  }

  private convertPostgreSQLToOracle(sql: string): string {
    let oracleSql = sql;

    // 基本語法轉換
    // 1. 處理 LIMIT 和 OFFSET (Oracle 需要 OFFSET 在 FETCH 之前)
    const limitMatch = oracleSql.match(/LIMIT\s+(\d+)/i);
    const offsetMatch = oracleSql.match(/OFFSET\s+(\d+)/i);

    if (limitMatch || offsetMatch) {
      // 移除原本的 LIMIT 和 OFFSET
      oracleSql = oracleSql.replace(/LIMIT\s+\d+/gi, '');
      oracleSql = oracleSql.replace(/OFFSET\s+\d+/gi, '');

      // 按照 Oracle 語法順序添加（OFFSET 必須在 FETCH 之前）
      if (offsetMatch) {
        oracleSql += ` OFFSET ${offsetMatch[1]} ROWS`;
      }
      if (limitMatch) {
        oracleSql += ` FETCH FIRST ${limitMatch[1]} ROWS ONLY`;
      }
    }

    // 3. ILIKE -> UPPER() LIKE UPPER()
    oracleSql = oracleSql.replace(/(\w+)\s+ILIKE\s+('[^']*'|\:\d+)/gi, 'UPPER($1) LIKE UPPER($2)');

    // 4. PostgreSQL boolean (true/false) -> Oracle (1/0)
    oracleSql = oracleSql.replace(/\btrue\b/gi, '1');
    oracleSql = oracleSql.replace(/\bfalse\b/gi, '0');

    // 5. NOW() -> CURRENT_TIMESTAMP
    oracleSql = oracleSql.replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP');

    // 6. UUID 生成 - uuid_generate_v4() -> sys_guid()
    oracleSql = oracleSql.replace(/uuid_generate_v4\(\)/gi, 'sys_guid()');

    // 7. Schema 參考 - 移除或替換
    oracleSql = oracleSql.replace(/\bpcm\./gi, '');
    oracleSql = oracleSql.replace(/\bpublic\./gi, '');

    // 8. RETURNING * -> RETURNING 列名 INTO
    // 這需要更複雜的處理，暫時簡化
    if (oracleSql.includes('RETURNING *')) {
      oracleSql = oracleSql.replace('RETURNING *', '');
    }

    // 9. 處理 INSERT 語句的 DEFAULT VALUES
    if (oracleSql.includes('DEFAULT VALUES')) {
      // Oracle 不支援 DEFAULT VALUES，需要特殊處理
      oracleSql = oracleSql.replace('DEFAULT VALUES', 'VALUES (DEFAULT)');
    }

    // 10. 將 is_active = true 轉換為 is_active = 1
    oracleSql = oracleSql.replace(/is_active\s*=\s*true/gi, 'is_active = 1');
    oracleSql = oracleSql.replace(/is_active\s*=\s*false/gi, 'is_active = 0');

    return oracleSql;
  }

  async release(): Promise<void> {
    await this.connection.close();
  }
}

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: oracledb.Pool | null = null;
  private config: DatabaseConfig;

  private constructor() {
    // 從環境變數獲取 Oracle 配置
    this.config = {
      host: process.env.ORACLE_HOST || 'localhost',
      port: parseInt(process.env.ORACLE_PORT || '1521'),
      database: process.env.ORACLE_SERVICE || 'XE',
      user: process.env.ORACLE_USER || 'pcm_user',
      password: process.env.ORACLE_PASSWORD || 'pcm_pass123',
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      min: parseInt(process.env.DB_MIN_CONNECTIONS || '5'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '10000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
    };

    console.log('Oracle database config:', {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
    });
  }

  private async ensurePool() {
    if (!this.pool) {
      const connectString = `${this.config.host}:${this.config.port}/${this.config.database}`;

      this.pool = await oracledb.createPool({
        user: this.config.user,
        password: this.config.password,
        connectString: connectString,
        poolMin: this.config.min || 5,
        poolMax: this.config.max || 20,
        poolIncrement: 1,
        poolTimeout: (this.config.idleTimeoutMillis || 10000) / 1000, // 轉換為秒
      });

      console.log('Oracle connection pool created');
    }
    return this.pool;
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const start = Date.now();
    const pool = await this.ensurePool();
    const connection = await pool.getConnection();

    try {
      const client = new OraclePoolClient(connection as any);
      const result = await client.query(text, params);
      const duration = Date.now() - start;

      // 慢查詢警告 (超過 1 秒)
      if (duration > 1000) {
        console.warn(`Slow query detected: ${duration}ms - ${text.substring(0, 100)}...`);
      }

      return result.rows as T[];
    } catch (error) {
      console.error('Oracle database query error:', error);
      throw error;
    } finally {
      await connection.close();
    }
  }

  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(text, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const pool = await this.ensurePool();
    const connection = await pool.getConnection();
    const client = new OraclePoolClient(connection as any);

    try {
      // Oracle 不需要顯式 BEGIN，自動開始事務
      const result = await callback(client);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await connection.close();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1 FROM DUAL');
      return true;
    } catch (error) {
      console.error('Oracle database health check failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }

  // 取得連接池狀態
  getPoolStatus() {
    if (!this.pool) {
      return {
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0,
      };
    }

    try {
      const stats = this.pool.getStatistics();
      return {
        totalCount: stats?.poolMax || 0,
        idleCount: stats?.connectionsOpen || 0,
        waitingCount: stats?.connectionsInUse || 0,
      };
    } catch (error) {
      // 如果取得統計資訊失敗，返回預設值
      return {
        totalCount: this.config.max || 20,
        idleCount: 0,
        waitingCount: 0,
      };
    }
  }

  // 為了相容性，提供 pool.connect 方法
  async connect() {
    const pool = await this.ensurePool();
    const connection = await pool.getConnection();
    return new OraclePoolClient(connection as any);
  }
}

// 匯出單例實例
export const db = DatabaseConnection.getInstance();
export default DatabaseConnection;