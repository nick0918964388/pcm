import oracledb from 'oracledb';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';

// Types for migration results
interface MigrationResult {
  success: boolean;
  scriptsExecuted: number;
  error?: string;
  details?: string[];
}

interface VersionUpdateResult {
  success: boolean;
  previousVersion: string;
  newVersion: string;
  error?: string;
}

interface TestDataResult {
  success: boolean;
  tablesPopulated?: number;
  tablesCleaned?: number;
  error?: string;
}

interface ValidationResult {
  isValid: boolean;
  validationErrors: string[];
}

interface TableStatistics {
  tableName: string;
  rowCount: number;
  sizeInMB: number;
  lastAnalyzed: Date | null;
}

interface MaintenanceResult {
  success: boolean;
  tablesUpdated?: number;
  indexesRebuilt?: number;
  error?: string;
}

/**
 * Oracle資料庫遷移管理器
 * 負責執行Schema遷移腳本和版本控制
 */
export class OracleMigrationManager {
  private connectionConfig: any;

  constructor() {
    this.connectionConfig = {
      user: process.env.ORACLE_USER || 'pcm_user',
      password: process.env.ORACLE_PASSWORD || 'pcm_pass123',
      connectString: process.env.ORACLE_CONNECT_STRING || 'localhost:1521/XE',
    };
  }

  /**
   * 執行遷移腳本
   */
  async executeMigrationScripts(): Promise<MigrationResult> {
    let connection: oracledb.Connection | undefined;

    try {
      connection = await oracledb.getConnection(this.connectionConfig);

      // 確保migrations表存在
      await this.ensureMigrationTable(connection);

      // 獲取所有遷移腳本 - 使用Oracle專用目錄
      const scriptsDir = path.join(process.cwd(), 'database', 'oracle');
      const scriptFiles = this.getMigrationScripts(scriptsDir);

      const executedScripts: string[] = [];

      for (const scriptFile of scriptFiles) {
        // 檢查腳本是否已執行
        const isExecuted = await this.isScriptExecuted(connection, scriptFile);

        if (!isExecuted) {
          await this.executeScript(connection, scriptFile);
          await this.recordScriptExecution(connection, scriptFile);
          executedScripts.push(scriptFile);
        }
      }

      return {
        success: true,
        scriptsExecuted: executedScripts.length,
        details: executedScripts,
      };
    } catch (error) {
      return {
        success: false,
        scriptsExecuted: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  /**
   * 獲取遷移歷史
   */
  async getMigrationHistory(): Promise<any[]> {
    let connection: oracledb.Connection | undefined;

    try {
      connection = await oracledb.getConnection(this.connectionConfig);

      const result = await connection.execute(`
        SELECT script_name, executed_at, success, error_message
        FROM migration_history
        ORDER BY executed_at DESC
      `);

      return result.rows || [];
    } catch (error) {
      console.error('Failed to get migration history:', error);
      return [];
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  /**
   * 獲取當前Schema版本
   */
  async getCurrentSchemaVersion(): Promise<string> {
    let connection: oracledb.Connection | undefined;

    try {
      connection = await oracledb.getConnection(this.connectionConfig);

      const result = await connection.execute(`
        SELECT key_value
        FROM system_info
        WHERE key_name = 'schema_version'
      `);

      if (result.rows && result.rows.length > 0) {
        return (result.rows[0] as any[])[0] as string;
      }

      return '1.0.0'; // 預設版本
    } catch (error) {
      console.error('Failed to get schema version:', error);
      return '1.0.0';
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  /**
   * 更新Schema版本
   */
  async updateSchemaVersion(newVersion: string): Promise<VersionUpdateResult> {
    let connection: oracledb.Connection | undefined;

    try {
      connection = await oracledb.getConnection(this.connectionConfig);

      const previousVersion = await this.getCurrentSchemaVersion();

      await connection.execute(
        `
        UPDATE system_info
        SET key_value = :newVersion, updated_at = CURRENT_TIMESTAMP
        WHERE key_name = 'schema_version'
      `,
        { newVersion }
      );

      await connection.commit();

      return {
        success: true,
        previousVersion,
        newVersion,
      };
    } catch (error) {
      return {
        success: false,
        previousVersion: '1.0.0',
        newVersion,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  private async ensureMigrationTable(
    connection: oracledb.Connection
  ): Promise<void> {
    const createTableSQL = `
      CREATE TABLE migration_history (
        id NUMBER PRIMARY KEY,
        script_name VARCHAR2(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        success NUMBER(1) DEFAULT 1,
        error_message CLOB,
        CONSTRAINT unique_script_name UNIQUE (script_name)
      )
    `;

    const createSequenceSQL = `
      CREATE SEQUENCE migration_history_seq START WITH 1 INCREMENT BY 1 NOCACHE
    `;

    try {
      await connection.execute(createTableSQL);
      await connection.execute(createSequenceSQL);
      await connection.commit();
    } catch (error) {
      // 表可能已存在，忽略錯誤
      if (!String(error).includes('ORA-00955')) {
        throw error;
      }
    }
  }

  private getMigrationScripts(scriptsDir: string): string[] {
    try {
      const files = readdirSync(scriptsDir);
      return files.filter(file => file.endsWith('.sql')).sort(); // 按檔名排序確保執行順序
    } catch (error) {
      console.error('Failed to read migration scripts directory:', error);
      return [];
    }
  }

  private async isScriptExecuted(
    connection: oracledb.Connection,
    scriptName: string
  ): Promise<boolean> {
    const result = await connection.execute(
      `
      SELECT COUNT(*) as count
      FROM migration_history
      WHERE script_name = :scriptName AND success = 1
    `,
      { scriptName }
    );

    return result.rows && (result.rows[0] as any[])[0] > 0;
  }

  private async executeScript(
    connection: oracledb.Connection,
    scriptFile: string
  ): Promise<void> {
    const scriptsDir = path.join(process.cwd(), 'database', 'oracle');
    const scriptPath = path.join(scriptsDir, scriptFile);
    const scriptContent = readFileSync(scriptPath, 'utf-8');

    // 分割SQL語句（以分號分隔）
    const statements = scriptContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.length > 0) {
        await connection.execute(statement);
      }
    }

    await connection.commit();
  }

  private async recordScriptExecution(
    connection: oracledb.Connection,
    scriptName: string
  ): Promise<void> {
    await connection.execute(
      `
      INSERT INTO migration_history (id, script_name, executed_at, success)
      VALUES (migration_history_seq.NEXTVAL, :scriptName, CURRENT_TIMESTAMP, 1)
    `,
      { scriptName }
    );

    await connection.commit();
  }
}

/**
 * Oracle測試資料管理器
 * 負責載入和清理測試資料
 */
export class OracleTestDataManager {
  private connectionConfig: any;

  constructor() {
    this.connectionConfig = {
      user: process.env.ORACLE_USER || 'pcm_user',
      password: process.env.ORACLE_PASSWORD || 'pcm_pass123',
      connectString: process.env.ORACLE_CONNECT_STRING || 'localhost:1521/XE',
    };
  }

  /**
   * 載入測試資料
   */
  async loadTestData(): Promise<TestDataResult> {
    let connection: oracledb.Connection | undefined;

    try {
      connection = await oracledb.getConnection(this.connectionConfig);

      const testDataScript = path.join(
        process.cwd(),
        'database',
        '04-initial-data.sql'
      );

      if (require('fs').existsSync(testDataScript)) {
        const scriptContent = readFileSync(testDataScript, 'utf-8');
        const statements = this.parseSQL(scriptContent);

        for (const statement of statements) {
          await connection.execute(statement);
        }

        await connection.commit();

        return {
          success: true,
          tablesPopulated: statements.length,
        };
      }

      return {
        success: true,
        tablesPopulated: 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  /**
   * 清理測試資料
   */
  async cleanTestData(): Promise<TestDataResult> {
    let connection: oracledb.Connection | undefined;

    try {
      connection = await oracledb.getConnection(this.connectionConfig);

      // 獲取所有表格並清理
      const tables = await this.getUserTables(connection);
      let cleanedTables = 0;

      for (const table of tables) {
        try {
          await connection.execute(`DELETE FROM ${table}`);
          cleanedTables++;
        } catch (error) {
          console.warn(`Failed to clean table ${table}:`, error);
        }
      }

      await connection.commit();

      return {
        success: true,
        tablesCleaned: cleanedTables,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  /**
   * 驗證測試資料完整性
   */
  async validateTestData(): Promise<ValidationResult> {
    let connection: oracledb.Connection | undefined;
    const errors: string[] = [];

    try {
      connection = await oracledb.getConnection(this.connectionConfig);

      // 檢查關鍵表是否存在資料
      const criticalTables = ['system_info'];

      for (const table of criticalTables) {
        const result = await connection.execute(
          `SELECT COUNT(*) as count FROM ${table}`
        );
        const count = (result.rows?.[0] as any[])?.[0] || 0;

        if (count === 0) {
          errors.push(`Table ${table} is empty`);
        }
      }

      return {
        isValid: errors.length === 0,
        validationErrors: errors,
      };
    } catch (error) {
      errors.push(
        `Validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return {
        isValid: false,
        validationErrors: errors,
      };
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  private parseSQL(content: string): string[] {
    return content
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
  }

  private async getUserTables(
    connection: oracledb.Connection
  ): Promise<string[]> {
    const result = await connection.execute(`
      SELECT table_name
      FROM user_tables
      WHERE table_name NOT LIKE 'MIGRATION_%'
      ORDER BY table_name
    `);

    return (result.rows || []).map(row => (row as any[])[0] as string);
  }
}

/**
 * Oracle維護工具
 * 負責資料庫維護任務
 */
export class OracleMaintenanceTools {
  private connectionConfig: any;

  constructor() {
    this.connectionConfig = {
      user: process.env.ORACLE_USER || 'pcm_user',
      password: process.env.ORACLE_PASSWORD || 'pcm_pass123',
      connectString: process.env.ORACLE_CONNECT_STRING || 'localhost:1521/XE',
    };
  }

  /**
   * 分析表格統計資訊
   */
  async analyzeTableStatistics(): Promise<TableStatistics[]> {
    let connection: oracledb.Connection | undefined;

    try {
      connection = await oracledb.getConnection(this.connectionConfig);

      const result = await connection.execute(`
        SELECT
          t.table_name,
          t.num_rows,
          ROUND(s.bytes / 1024 / 1024, 2) as size_mb,
          t.last_analyzed
        FROM user_tables t
        LEFT JOIN (
          SELECT segment_name, SUM(bytes) as bytes
          FROM user_segments
          WHERE segment_type = 'TABLE'
          GROUP BY segment_name
        ) s ON t.table_name = s.segment_name
        WHERE t.table_name NOT LIKE 'MIGRATION_%'
        ORDER BY t.table_name
      `);

      return (result.rows || []).map(row => {
        const [tableName, numRows, sizeMB, lastAnalyzed] = row as any[];
        return {
          tableName: tableName as string,
          rowCount: numRows || 0,
          sizeInMB: sizeMB || 0,
          lastAnalyzed: lastAnalyzed ? new Date(lastAnalyzed) : null,
        };
      });
    } catch (error) {
      console.error('Failed to analyze table statistics:', error);
      return [];
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  /**
   * 更新表格統計資訊
   */
  async updateTableStatistics(): Promise<MaintenanceResult> {
    let connection: oracledb.Connection | undefined;

    try {
      connection = await oracledb.getConnection(this.connectionConfig);

      const tables = await this.getUserTables(connection);
      let updatedTables = 0;

      for (const table of tables) {
        try {
          await connection.execute(`ANALYZE TABLE ${table} COMPUTE STATISTICS`);
          updatedTables++;
        } catch (error) {
          console.warn(
            `Failed to update statistics for table ${table}:`,
            error
          );
        }
      }

      return {
        success: true,
        tablesUpdated: updatedTables,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  /**
   * 重建索引
   */
  async rebuildIndexes(): Promise<MaintenanceResult> {
    let connection: oracledb.Connection | undefined;

    try {
      connection = await oracledb.getConnection(this.connectionConfig);

      // 獲取需要重建的索引
      const result = await connection.execute(`
        SELECT index_name
        FROM user_indexes
        WHERE status = 'UNUSABLE' OR leaf_blocks = 0
      `);

      const indexes = (result.rows || []).map(
        row => (row as any[])[0] as string
      );
      let rebuiltIndexes = 0;

      for (const index of indexes) {
        try {
          await connection.execute(`ALTER INDEX ${index} REBUILD`);
          rebuiltIndexes++;
        } catch (error) {
          console.warn(`Failed to rebuild index ${index}:`, error);
        }
      }

      return {
        success: true,
        indexesRebuilt: rebuiltIndexes,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  private async getUserTables(
    connection: oracledb.Connection
  ): Promise<string[]> {
    const result = await connection.execute(`
      SELECT table_name
      FROM user_tables
      WHERE table_name NOT LIKE 'MIGRATION_%'
      ORDER BY table_name
    `);

    return (result.rows || []).map(row => (row as any[])[0] as string);
  }
}
