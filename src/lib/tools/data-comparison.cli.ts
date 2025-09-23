#!/usr/bin/env node

import { program } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  DatabaseConfig,
  ComparisonConfig,
  ComparisonReport,
  DatabaseConnection
} from './data-comparison.types';
import { DataComparisonService } from './data-comparison.service';

// PostgreSQL 連線實作
class PostgreSQLConnection implements DatabaseConnection {
  private config: DatabaseConfig;
  private client: any = null;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      const { Pool } = await import('pg');
      this.client = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: false
      });
    } catch (error) {
      throw new Error(`Failed to connect to PostgreSQL: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }

  async executeQuery(query: string, params?: any[]): Promise<any[]> {
    if (!this.client) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.client.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Query execution failed: ${error}`);
    }
  }

  async getMetadata(tableName: string): Promise<any> {
    const query = `
      SELECT
        column_name as name,
        data_type as "dataType",
        is_nullable = 'YES' as "isNullable",
        column_default as "defaultValue",
        character_maximum_length as "characterMaxLength",
        numeric_precision as "numericPrecision",
        numeric_scale as "numericScale"
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `;

    const columns = await this.executeQuery(query, [tableName]);

    const pkQuery = `
      SELECT column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
    `;

    const pkResult = await this.executeQuery(pkQuery, [tableName]);
    const primaryKeys = pkResult.map(row => row.column_name);

    return {
      name: tableName,
      schema: 'public',
      columns,
      primaryKeys,
      indexes: []
    };
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}

// Oracle 連線實作
class OracleConnection implements DatabaseConnection {
  private config: DatabaseConfig;
  private connection: any = null;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      const oracledb = await import('oracledb');
      this.connection = await oracledb.getConnection({
        user: this.config.username,
        password: this.config.password,
        connectString: `${this.config.host}:${this.config.port}/${this.config.database}`
      });
    } catch (error) {
      throw new Error(`Failed to connect to Oracle: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }

  async executeQuery(query: string, params?: any[]): Promise<any[]> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.connection.execute(query, params || [], {
        outFormat: 'OBJECT'
      });
      return result.rows;
    } catch (error) {
      throw new Error(`Query execution failed: ${error}`);
    }
  }

  async getMetadata(tableName: string): Promise<any> {
    const query = `
      SELECT
        COLUMN_NAME as name,
        DATA_TYPE as "dataType",
        CASE WHEN NULLABLE = 'Y' THEN 1 ELSE 0 END as "isNullable",
        DATA_DEFAULT as "defaultValue",
        DATA_LENGTH as "characterMaxLength",
        DATA_PRECISION as "numericPrecision",
        DATA_SCALE as "numericScale"
      FROM USER_TAB_COLUMNS
      WHERE TABLE_NAME = UPPER(:tableName)
      ORDER BY COLUMN_ID
    `;

    const columns = await this.executeQuery(query, [tableName]);

    const pkQuery = `
      SELECT COLUMN_NAME as column_name
      FROM USER_CONS_COLUMNS
      WHERE CONSTRAINT_NAME = (
        SELECT CONSTRAINT_NAME
        FROM USER_CONSTRAINTS
        WHERE TABLE_NAME = UPPER(:tableName) AND CONSTRAINT_TYPE = 'P'
      )
    `;

    const pkResult = await this.executeQuery(pkQuery, [tableName]);
    const primaryKeys = pkResult.map(row => row.column_name);

    return {
      name: tableName,
      schema: this.config.schema || 'public',
      columns,
      primaryKeys,
      indexes: []
    };
  }

  isConnected(): boolean {
    return this.connection !== null;
  }
}

// 配置檔案載入
function loadConfig(configPath: string): ComparisonConfig {
  try {
    const configData = readFileSync(configPath, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    throw new Error(`Failed to load config file: ${error}`);
  }
}

// 結果儲存
function saveResults(report: ComparisonReport, outputPath: string, format: string): void {
  let content: string;

  switch (format.toLowerCase()) {
    case 'json':
      content = JSON.stringify(report, null, 2);
      break;
    case 'txt':
      content = generateTextReport(report);
      break;
    default:
      throw new Error(`Unsupported output format: ${format}`);
  }

  writeFileSync(outputPath, content, 'utf-8');
}

// 文字報告生成
function generateTextReport(report: ComparisonReport): string {
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push('資料比對報告');
  lines.push('='.repeat(80));
  lines.push(`執行時間: ${report.timestamp.toISOString()}`);
  lines.push(`執行 ID: ${report.executionId}`);
  lines.push(`總耗時: ${report.executionTime}ms`);
  lines.push('');

  // 摘要
  lines.push('摘要');
  lines.push('-'.repeat(40));
  lines.push(`總表格數: ${report.summary.totalTables}`);
  lines.push(`計數不匹配: ${report.summary.tablesWithCountMismatch}`);
  lines.push(`內容差異: ${report.summary.tablesWithContentDifferences}`);
  lines.push(`結構差異: ${report.summary.tablesWithStructureDifferences}`);
  lines.push(`資料完整性: ${report.summary.overallDataIntegrity.toFixed(2)}%`);
  lines.push('');

  // 詳細結果
  if (report.countResults.length > 0) {
    lines.push('表格計數比對');
    lines.push('-'.repeat(40));
    for (const result of report.countResults) {
      const status = result.countMatch ? '✓' : '✗';
      lines.push(`${status} ${result.tableName}: ${result.sourceCount} -> ${result.targetCount}`);
      if (!result.countMatch) {
        lines.push(`  差異: ${result.difference} (${result.percentageDiff.toFixed(2)}%)`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

// 主程式
async function main() {
  program
    .name('data-comparison')
    .description('PCM 資料庫比對工具')
    .version('1.0.0');

  program
    .command('compare')
    .description('執行資料庫比對')
    .option('-c, --config <path>', '配置檔案路徑', './comparison-config.json')
    .option('-o, --output <path>', '輸出檔案路徑', './comparison-report.json')
    .option('-f, --format <format>', '輸出格式 (json|txt)', 'json')
    .option('--tables <tables>', '指定要比對的表格 (逗號分隔)')
    .option('--count-only', '只執行計數比對')
    .option('--content-only', '只執行內容比對')
    .option('--structure-only', '只執行結構比對')
    .action(async (options) => {
      try {
        console.log('🔍 開始資料庫比對...');

        // 載入配置
        const config = loadConfig(options.config);

        // 如果指定了表格，覆蓋配置
        if (options.tables) {
          config.tables = options.tables.split(',').map((t: string) => t.trim());
        }

        // 建立連線
        const sourceConnection = config.sourceDb.type === 'postgresql'
          ? new PostgreSQLConnection(config.sourceDb)
          : new OracleConnection(config.sourceDb);

        const targetConnection = config.targetDb.type === 'postgresql'
          ? new PostgreSQLConnection(config.targetDb)
          : new OracleConnection(config.targetDb);

        // 建立比對服務
        const comparisonTool = new DataComparisonService(sourceConnection, targetConnection);

        let report: ComparisonReport;

        if (options.countOnly || options.contentOnly || options.structureOnly) {
          // 執行部分比對
          await sourceConnection.connect();
          await targetConnection.connect();

          const countResults = options.countOnly ? await comparisonTool.compareTableCounts(config.tables) : [];
          const contentResults = options.contentOnly ? await comparisonTool.compareTableContent(config.tables) : [];
          const structureResults = options.structureOnly ? await comparisonTool.compareTableStructure(config.tables) : [];

          report = {
            executionId: `partial_${Date.now()}`,
            timestamp: new Date(),
            config,
            summary: {
              totalTables: config.tables.length,
              tablesWithCountMismatch: countResults.filter(r => !r.countMatch).length,
              tablesWithContentDifferences: contentResults.filter(r => r.exactMatches < r.totalRecords).length,
              tablesWithStructureDifferences: structureResults.filter(r => !r.structureMatch).length,
              overallDataIntegrity: 100,
              criticalIssues: 0,
              warnings: 0
            },
            countResults,
            contentResults,
            structureResults,
            errors: [],
            executionTime: 0
          };

          await sourceConnection.disconnect();
          await targetConnection.disconnect();
        } else {
          // 執行完整比對
          report = await comparisonTool.performFullComparison(config);
        }

        // 儲存結果
        saveResults(report, options.output, options.format);

        // 顯示摘要
        console.log(`✅ 比對完成！`);
        console.log(`📊 總表格數: ${report.summary.totalTables}`);
        console.log(`⚠️  計數不匹配: ${report.summary.tablesWithCountMismatch}`);
        console.log(`📈 資料完整性: ${report.summary.overallDataIntegrity.toFixed(2)}%`);
        console.log(`💾 結果已儲存至: ${options.output}`);

        if (report.summary.tablesWithCountMismatch > 0) {
          process.exit(1);
        }

      } catch (error) {
        console.error(`❌ 錯誤: ${error}`);
        process.exit(1);
      }
    });

  program
    .command('init')
    .description('建立預設配置檔案')
    .option('-o, --output <path>', '配置檔案路徑', './comparison-config.json')
    .action((options) => {
      const defaultConfig: ComparisonConfig = {
        sourceDb: {
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          database: 'pcm_source',
          username: 'postgres',
          password: 'password'
        },
        targetDb: {
          type: 'oracle',
          host: 'localhost',
          port: 1521,
          database: 'XE',
          username: 'pcm',
          password: 'password'
        },
        tables: [
          'users',
          'projects',
          'project_members',
          'wbs_items',
          'vendors',
          'duty_schedules'
        ],
        excludeColumns: ['created_at', 'updated_at'],
        includeSystemTables: false,
        maxSampleSize: 1000,
        batchSize: 100
      };

      writeFileSync(options.output, JSON.stringify(defaultConfig, null, 2), 'utf-8');
      console.log(`✅ 預設配置檔案已建立: ${options.output}`);
      console.log('📝 請編輯配置檔案以符合您的環境設定');
    });

  await program.parseAsync(process.argv);
}

// 錯誤處理
process.on('unhandledRejection', (error) => {
  console.error('❌ 未處理的 Promise 拒絕:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ 未捕獲的例外:', error);
  process.exit(1);
});

// 執行主程式
if (require.main === module) {
  main().catch(console.error);
}

export { main };