/**
 * Data Migrator
 * Task 2.3: 實作資料遷移和驗證功能
 *
 * 功能:
 * - 建立批次資料匯出和匯入機制
 * - 實作資料完整性驗證工具
 * - 開發資料計數和內容比對功能
 * - 建立遷移進度追蹤和錯誤處理
 * - 實作資料備份和還原機制
 */

import { DataTypeConverter } from './data-type-converter';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import type {
  DataMigrationOptions,
  DataExportResult,
  DataImportResult,
  DataMigrationResult,
  ValidationReport,
  MigrationProgress,
  MigrationError,
  DataComparisonResult,
  TableComparisonResult,
  MissingRecordsAnalysis,
  BackupResult,
  BackupMetadata,
  BackupValidationResult,
  RestoreResult,
  OracleErrorHandler,
  PerformanceMetrics,
  RecordDifference,
} from './migration-types';

export class DataMigrator {
  private converter: DataTypeConverter;
  private performanceMetrics: PerformanceMetrics[] = [];

  constructor(converter: DataTypeConverter) {
    this.converter = converter;
  }

  // 批次資料匯出機制

  async exportTableData(
    postgresConnection: any,
    tableName: string,
    options: DataMigrationOptions
  ): Promise<DataExportResult> {
    const startTime = new Date();
    const result: DataExportResult = {
      success: false,
      tableName,
      totalRecords: 0,
      batchCount: 0,
      exportedData: [],
      originalSize: 0,
      duration: 0,
      timestamp: startTime,
    };

    try {
      // 獲取總記錄數
      const countQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
      const countResult = await postgresConnection.query(countQuery);
      const totalRecords = parseInt(countResult.rows[0].count);

      let offset = 0;
      let batchNumber = 0;
      const allData: any[] = [];

      // 分批匯出數據
      while (offset < totalRecords) {
        const batchQuery = `
          SELECT * FROM ${tableName}
          ORDER BY ${this.getPrimaryKeyColumn(tableName)}
          LIMIT ${options.batchSize} OFFSET ${offset}
        `;

        const batchResult = await postgresConnection.query(batchQuery);
        const batchData = batchResult.rows;

        if (batchData.length === 0) break;

        allData.push(...batchData);
        offset += options.batchSize;
        batchNumber++;

        // 驗證每個批次（如果啟用）
        if (options.validateEachBatch) {
          await this.validateBatchData(batchData, tableName);
        }
      }

      // 計算原始大小
      const originalData = JSON.stringify(allData);
      result.originalSize = Buffer.byteLength(originalData, 'utf8');

      // 壓縮數據（如果啟用）
      if (options.compressionEnabled) {
        const compressed = zlib.gzipSync(originalData);
        result.compressedSize = compressed.length;
        result.compressionRatio = result.originalSize / result.compressedSize;
      }

      result.success = true;
      result.totalRecords = totalRecords;
      result.batchCount = batchNumber;
      result.exportedData = allData;
      result.duration = Date.now() - startTime.getTime();

      return result;
    } catch (error: any) {
      result.error = error.message;
      result.duration = Date.now() - startTime.getTime();
      return result;
    }
  }

  private getPrimaryKeyColumn(tableName: string): string {
    // 簡化的主鍵列名推斷
    const primaryKeyMap: Record<string, string> = {
      users: 'id',
      projects: 'id',
      orders: 'id',
      large_table: 'id',
      large_content_table: 'id',
    };
    return primaryKeyMap[tableName] || 'id';
  }

  private async validateBatchData(
    batchData: any[],
    tableName: string
  ): Promise<void> {
    // 基本的批次驗證邏輯
    for (const record of batchData) {
      if (!record.id) {
        throw new Error(`Missing ID in record for table ${tableName}`);
      }
    }
  }

  // 批次資料匯入機制

  async importTableData(
    oracleConnection: any,
    tableName: string,
    data: any[],
    options: DataMigrationOptions
  ): Promise<DataImportResult> {
    const startTime = new Date();
    const result: DataImportResult = {
      success: false,
      tableName,
      totalRecords: data.length,
      insertedRecords: 0,
      failedRecords: 0,
      batchCount: 0,
      conversions: {
        uuid: 0,
        jsonb: 0,
        boolean: 0,
        timestamp: 0,
        serial: 0,
      },
      errors: [],
      duration: 0,
      timestamp: startTime,
    };

    try {
      const batches = this.createBatches(data, options.batchSize);
      result.batchCount = batches.length;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        try {
          if (batch.length >= 1000 && options.batchSize >= 1000) {
            // 使用Oracle BULK INSERT 優化
            await this.bulkInsert(oracleConnection, tableName, batch);
            result.insertedRecords += batch.length;
          } else {
            // 逐筆插入
            for (const record of batch) {
              try {
                const convertedRecord = await this.convertRecord(
                  record,
                  tableName
                );
                await this.insertSingleRecord(
                  oracleConnection,
                  tableName,
                  convertedRecord
                );
                result.insertedRecords++;

                // 統計轉換
                this.updateConversionStats(record, result.conversions!);
              } catch (error: any) {
                result.failedRecords++;

                if (!options.continueOnError) {
                  throw error;
                }

                const migrationError: MigrationError = {
                  tableName,
                  operation: 'import',
                  errorMessage: error.message,
                  oracleErrorCode: this.extractOracleErrorCode(error.message),
                  affectedRecord: record,
                  batchNumber: i + 1,
                  isRetryable: this.isRetryableError(error),
                  suggestedAction: this.getSuggestedAction(error),
                  severity: this.getErrorSeverity(error),
                  timestamp: new Date(),
                };

                result.errors!.push(migrationError);

                // 重試邏輯
                if (migrationError.isRetryable) {
                  const retryResult = await this.retryOperation(
                    () =>
                      this.insertSingleRecord(
                        oracleConnection,
                        tableName,
                        convertedRecord
                      ),
                    options.maxRetryAttempts || 3,
                    options.retryDelayMs || 1000
                  );

                  if (retryResult.success) {
                    result.insertedRecords++;
                    result.failedRecords--;
                    result.retryAttempts =
                      (result.retryAttempts || 0) + retryResult.attempts;
                  }
                }
              }
            }
          }
        } catch (batchError: any) {
          if (!options.continueOnError) {
            throw batchError;
          }
          result.failedRecords += batch.length;
        }
      }

      result.success = result.failedRecords === 0 || options.continueOnError;
      result.duration = Date.now() - startTime.getTime();

      return result;
    } catch (error: any) {
      result.duration = Date.now() - startTime.getTime();
      return result;
    }
  }

  private createBatches<T>(data: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }
    return batches;
  }

  private async bulkInsert(
    oracleConnection: any,
    tableName: string,
    batch: any[]
  ): Promise<void> {
    // 模擬Oracle BULK INSERT - 在實際實作中需要使用Oracle特定的批次插入
    const placeholders = batch.map(() => '?').join(',');
    const insertSQL = `INSERT INTO ${tableName} VALUES (${placeholders})`;

    await oracleConnection.execute(insertSQL, batch.flat());
  }

  private async insertSingleRecord(
    oracleConnection: any,
    tableName: string,
    record: any
  ): Promise<void> {
    const columns = Object.keys(record);
    const values = Object.values(record);
    const placeholders = values.map(() => '?').join(',');

    const insertSQL = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`;
    await oracleConnection.execute(insertSQL, values);
  }

  private async convertRecord(record: any, tableName: string): Promise<any> {
    const converted: any = {};

    for (const [key, value] of Object.entries(record)) {
      // 基本的資料類型轉換
      if (typeof value === 'string' && this.isUUID(value)) {
        converted[key] = value.toUpperCase();
      } else if (typeof value === 'object' && value !== null) {
        converted[key] = JSON.stringify(value);
      } else if (typeof value === 'boolean') {
        converted[key] = value ? 1 : 0;
      } else if (value instanceof Date) {
        converted[key] = value;
      } else {
        converted[key] = value;
      }
    }

    return converted;
  }

  private isUUID(str: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  private updateConversionStats(record: any, stats: any): void {
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === 'string' && this.isUUID(value)) {
        stats.uuid++;
      } else if (typeof value === 'object' && value !== null) {
        stats.jsonb++;
      } else if (typeof value === 'boolean') {
        stats.boolean++;
      } else if (value instanceof Date) {
        stats.timestamp++;
      }
    }
  }

  // 錯誤處理

  private extractOracleErrorCode(errorMessage: string): string | undefined {
    const match = errorMessage.match(/ORA-(\d+)/);
    return match ? `ORA-${match[1]}` : undefined;
  }

  private isRetryableError(error: any): boolean {
    const retryableErrors = ['ORA-12541', 'ORA-12545', 'ORA-03113'];
    const errorCode = this.extractOracleErrorCode(error.message);
    return errorCode ? retryableErrors.includes(errorCode) : false;
  }

  private getSuggestedAction(error: any): string {
    const errorCode = this.extractOracleErrorCode(error.message);

    const suggestions: Record<string, string> = {
      'ORA-01400': 'Check for NULL values in NOT NULL columns',
      'ORA-00001': 'Check for duplicate values in unique constraints',
      'ORA-12541': 'Verify Oracle listener is running and accessible',
      'ORA-12545': 'Check network connectivity to Oracle database',
    };

    return errorCode
      ? suggestions[errorCode] || 'Review error details and retry'
      : 'Unknown error - check logs';
  }

  private getErrorSeverity(error: any): 'low' | 'medium' | 'high' | 'critical' {
    const errorCode = this.extractOracleErrorCode(error.message);

    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> =
      {
        'ORA-01400': 'medium',
        'ORA-00001': 'medium',
        'ORA-12541': 'high',
        'ORA-12545': 'high',
      };

    return errorCode ? severityMap[errorCode] || 'medium' : 'medium';
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxAttempts: number,
    baseDelay: number
  ): Promise<{ success: boolean; result?: T; attempts: number }> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const result = await operation();
        return { success: true, result, attempts };
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          return { success: false, attempts };
        }

        // 指數退避
        const delay = baseDelay * Math.pow(2, attempts - 1);
        await this.sleep(delay);
      }
    }

    return { success: false, attempts };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public handleOracleError(error: Error): OracleErrorHandler {
    const errorCode = this.extractOracleErrorCode(error.message) || 'UNKNOWN';

    return {
      errorCode,
      errorMessage: error.message,
      isRetryable: this.isRetryableError(error),
      suggestedAction: this.getSuggestedAction(error),
      severity: this.getErrorSeverity(error),
      retryStrategy: this.isRetryableError(error)
        ? {
            maxAttempts: 3,
            baseDelayMs: 1000,
            backoffMultiplier: 2,
          }
        : undefined,
    };
  }

  // 資料完整性驗證

  async validateDataIntegrity(
    postgresConnection: any,
    oracleConnection: any,
    tableName: string
  ): Promise<ValidationReport> {
    const report: ValidationReport = {
      isValid: false,
      tableName,
      postgresCount: 0,
      oracleCount: 0,
      issues: [],
      timestamp: new Date(),
    };

    try {
      // 獲取PostgreSQL計數
      const pgCountResult = await postgresConnection.query(
        `SELECT COUNT(*) as count FROM ${tableName}`
      );
      report.postgresCount = parseInt(pgCountResult.rows[0].count);

      // 獲取Oracle計數
      const oracleCountResult = await oracleConnection.execute(
        `SELECT COUNT(*) as COUNT FROM ${tableName}`
      );
      report.oracleCount = oracleCountResult.rows[0].COUNT;

      // 比較計數
      if (report.postgresCount !== report.oracleCount) {
        report.issues.push(
          `Count mismatch: PostgreSQL has ${report.postgresCount} records, Oracle has ${report.oracleCount}`
        );
      }

      report.isValid = report.issues.length === 0;
      return report;
    } catch (error: any) {
      report.issues.push(`Validation error: ${error.message}`);
      return report;
    }
  }

  async validateSampleData(
    postgresConnection: any,
    oracleConnection: any,
    tableName: string,
    sampleSize: number
  ): Promise<ValidationReport> {
    const report: ValidationReport = {
      isValid: false,
      tableName,
      postgresCount: 0,
      oracleCount: 0,
      issues: [],
      timestamp: new Date(),
      validationDetails: {
        sampleSize: 0,
        matchedRecords: 0,
        mismatchedRecords: 0,
        differences: [],
      },
    };

    try {
      // 獲取PostgreSQL樣本數據
      const pgSampleQuery = `SELECT * FROM ${tableName} ORDER BY ${this.getPrimaryKeyColumn(tableName)} LIMIT ${sampleSize}`;
      const pgSampleResult = await postgresConnection.query(pgSampleQuery);
      const pgData = pgSampleResult.rows;

      // 獲取Oracle樣本數據
      const oracleSampleQuery = `SELECT * FROM ${tableName} WHERE ROWNUM <= ${sampleSize} ORDER BY ${this.getPrimaryKeyColumn(tableName)}`;
      const oracleSampleResult =
        await oracleConnection.execute(oracleSampleQuery);
      const oracleData = oracleSampleResult.rows;

      report.validationDetails!.sampleSize = pgData.length;

      // 比較樣本數據
      const differences: RecordDifference[] = [];
      let matchedRecords = 0;

      for (let i = 0; i < Math.min(pgData.length, oracleData.length); i++) {
        const pgRecord = pgData[i];
        const oracleRecord = oracleData[i];

        if (this.recordsMatch(pgRecord, oracleRecord)) {
          matchedRecords++;
        } else {
          const recordDiffs = this.compareRecords(pgRecord, oracleRecord);
          differences.push(...recordDiffs);
        }
      }

      report.validationDetails!.matchedRecords = matchedRecords;
      report.validationDetails!.mismatchedRecords =
        pgData.length - matchedRecords;
      report.validationDetails!.differences = differences;

      report.isValid = differences.length === 0;
      return report;
    } catch (error: any) {
      report.issues.push(`Sample validation error: ${error.message}`);
      return report;
    }
  }

  private recordsMatch(pgRecord: any, oracleRecord: any): boolean {
    // 簡化的記錄比較 - 實際實作需要考慮資料類型轉換
    const pgKeys = Object.keys(pgRecord);
    const oracleKeys = Object.keys(oracleRecord).map(k => k.toLowerCase());

    for (const key of pgKeys) {
      if (!oracleKeys.includes(key.toLowerCase())) {
        return false;
      }

      const pgValue = pgRecord[key];
      const oracleValue = oracleRecord[key.toUpperCase()] || oracleRecord[key];

      if (pgValue !== oracleValue) {
        return false;
      }
    }

    return true;
  }

  private compareRecords(pgRecord: any, oracleRecord: any): RecordDifference[] {
    const differences: RecordDifference[] = [];
    const recordId = pgRecord.id || pgRecord.ID || 'unknown';

    const pgKeys = Object.keys(pgRecord);
    for (const key of pgKeys) {
      const pgValue = pgRecord[key];
      const oracleValue = oracleRecord[key.toUpperCase()] || oracleRecord[key];

      if (pgValue !== oracleValue) {
        differences.push({
          recordId: recordId.toString(),
          field: key,
          postgresValue: pgValue,
          oracleValue: oracleValue,
          differenceType: 'value_mismatch',
        });
      }
    }

    return differences;
  }

  // 資料計數和比對功能

  async compareAllTableCounts(
    postgresConnection: any,
    oracleConnection: any,
    tables: string[]
  ): Promise<DataComparisonResult> {
    const results: TableComparisonResult[] = [];
    let totalPostgresRecords = 0;
    let totalOracleRecords = 0;
    let matchingTables = 0;

    for (const tableName of tables) {
      try {
        const pgCountResult = await postgresConnection.query(
          `SELECT COUNT(*) as count FROM ${tableName}`
        );
        const postgresCount = parseInt(pgCountResult.rows[0].count);

        const oracleCountResult = await oracleConnection.execute(
          `SELECT COUNT(*) as COUNT FROM ${tableName}`
        );
        const oracleCount = oracleCountResult.rows[0].COUNT;

        const isMatch = postgresCount === oracleCount;
        if (isMatch) matchingTables++;

        const result: TableComparisonResult = {
          tableName,
          postgresCount,
          oracleCount,
          isMatch,
          difference: postgresCount - oracleCount,
          percentageMatch:
            oracleCount === 0
              ? 0
              : (Math.min(postgresCount, oracleCount) /
                  Math.max(postgresCount, oracleCount)) *
                100,
        };

        results.push(result);
        totalPostgresRecords += postgresCount;
        totalOracleRecords += oracleCount;
      } catch (error: any) {
        results.push({
          tableName,
          postgresCount: 0,
          oracleCount: 0,
          isMatch: false,
          difference: 0,
          percentageMatch: 0,
        });
      }
    }

    return {
      totalTables: tables.length,
      matchingTables,
      mismatchedTables: tables.length - matchingTables,
      results,
      summary: {
        totalPostgresRecords,
        totalOracleRecords,
        overallMatch: totalPostgresRecords === totalOracleRecords,
      },
      timestamp: new Date(),
    };
  }

  async analyzeMissingRecords(
    postgresConnection: any,
    oracleConnection: any,
    tableName: string,
    primaryKey: string
  ): Promise<MissingRecordsAnalysis> {
    // 獲取PostgreSQL所有主鍵
    const pgKeysResult = await postgresConnection.query(
      `SELECT ${primaryKey} FROM ${tableName} ORDER BY ${primaryKey}`
    );
    const pgKeys = pgKeysResult.rows.map((row: any) =>
      row[primaryKey].toString()
    );

    // 獲取Oracle所有主鍵
    const oracleKeysResult = await oracleConnection.execute(
      `SELECT ${primaryKey.toUpperCase()} FROM ${tableName} ORDER BY ${primaryKey.toUpperCase()}`
    );
    const oracleKeys = oracleKeysResult.rows.map((row: any) =>
      row[primaryKey.toUpperCase()].toString()
    );

    // 分析差異
    const missingInOracle = pgKeys.filter(key => !oracleKeys.includes(key));
    const missingInPostgres = oracleKeys.filter(key => !pgKeys.includes(key));
    const commonRecords = pgKeys.filter(key => oracleKeys.includes(key));

    return {
      tableName,
      primaryKey,
      missingInOracle,
      missingInPostgres,
      commonRecords,
      summary: {
        totalPostgres: pgKeys.length,
        totalOracle: oracleKeys.length,
        missing: missingInOracle.length,
        extra: missingInPostgres.length,
      },
    };
  }

  // 遷移進度追蹤

  async migrateAllTables(
    postgresConnection: any,
    oracleConnection: any,
    tables: string[],
    options: DataMigrationOptions,
    progressCallback?: (progress: MigrationProgress) => void
  ): Promise<DataMigrationResult> {
    const startTime = new Date();
    const result: DataMigrationResult = {
      success: false,
      totalTables: tables.length,
      completedTables: 0,
      failedTables: 0,
      totalRecords: 0,
      migratedRecords: 0,
      errors: [],
      duration: 0,
      timestamp: startTime,
      summary: {
        tablesProcessed: [],
        tablesSkipped: [],
        tablesFailed: [],
      },
    };

    for (let i = 0; i < tables.length; i++) {
      const tableName = tables[i];

      try {
        const tableResult = await this.migrateTable(
          postgresConnection,
          oracleConnection,
          tableName,
          options,
          progress => {
            if (progressCallback) {
              progressCallback({
                ...progress,
                tableIndex: i,
                totalTables: tables.length,
              });
            }
          }
        );

        if (tableResult.success) {
          result.completedTables++;
          result.summary.tablesProcessed.push(tableName);
        } else {
          result.failedTables++;
          result.summary.tablesFailed.push(tableName);
          if (tableResult.errors) {
            result.errors!.push(...tableResult.errors);
          }
        }

        result.totalRecords += tableResult.totalRecords;
        result.migratedRecords += tableResult.insertedRecords;
      } catch (error: any) {
        result.failedTables++;
        result.summary.tablesFailed.push(tableName);
      }
    }

    result.success = result.failedTables === 0;
    result.duration = Date.now() - startTime.getTime();

    return result;
  }

  async migrateTable(
    postgresConnection: any,
    oracleConnection: any,
    tableName: string,
    options: DataMigrationOptions,
    progressCallback?: (progress: MigrationProgress) => void
  ): Promise<DataImportResult> {
    // 匯出數據
    const exportResult = await this.exportTableData(
      postgresConnection,
      tableName,
      options
    );

    if (!exportResult.success) {
      return {
        success: false,
        tableName,
        totalRecords: 0,
        insertedRecords: 0,
        failedRecords: 0,
        batchCount: 0,
        errors: [
          {
            tableName,
            operation: 'export',
            errorMessage: exportResult.error || 'Export failed',
            isRetryable: false,
            suggestedAction: 'Check source database connectivity',
            severity: 'high',
            timestamp: new Date(),
          },
        ],
        duration: 0,
        timestamp: new Date(),
      };
    }

    // 進度回調
    if (progressCallback) {
      progressCallback({
        currentTable: tableName,
        tableIndex: 0,
        totalTables: 1,
        currentBatch: 0,
        totalBatches: exportResult.batchCount,
        recordsProcessed: 0,
        totalRecords: exportResult.totalRecords,
        percentComplete: 0,
        estimatedTimeRemaining: 0,
        currentOperation: 'import',
        completed: false,
      });
    }

    // 匯入數據
    const importResult = await this.importTableData(
      oracleConnection,
      tableName,
      exportResult.exportedData,
      options
    );

    // 完成進度回調
    if (progressCallback) {
      progressCallback({
        currentTable: tableName,
        tableIndex: 0,
        totalTables: 1,
        currentBatch: importResult.batchCount,
        totalBatches: importResult.batchCount,
        recordsProcessed: importResult.insertedRecords,
        totalRecords: importResult.totalRecords,
        percentComplete: 100,
        estimatedTimeRemaining: 0,
        currentOperation: 'import',
        completed: true,
      });
    }

    return importResult;
  }

  // 資料備份和還原機制

  async createBackup(
    oracleConnection: any,
    backupPath: string,
    options: { includeData: boolean; compression: boolean }
  ): Promise<BackupResult> {
    const startTime = new Date();

    try {
      // 獲取所有表
      const tablesResult = await oracleConnection.execute(`
        SELECT table_name as TABLE_NAME
        FROM user_tables
        ORDER BY table_name
      `);

      const tables = tablesResult.rows.map((row: any) => row.TABLE_NAME);

      // 生成備份腳本
      let backupScript = `-- Oracle Database Backup\n-- Created: ${startTime.toISOString()}\n\n`;

      // 添加表結構
      for (const tableName of tables) {
        // 簡化的DDL生成（實際需要更複雜的邏輯）
        backupScript += `-- Table: ${tableName}\n`;
        backupScript += `DROP TABLE ${tableName} CASCADE CONSTRAINTS;\n`;
        backupScript += `CREATE TABLE ${tableName} (id VARCHAR2(36) PRIMARY KEY);\n\n`;

        // 添加數據（如果啟用）
        if (options.includeData) {
          const dataResult = await oracleConnection.execute(
            `SELECT * FROM ${tableName}`
          );
          for (const row of dataResult.rows) {
            const values = Object.values(row)
              .map(v => `'${v}'`)
              .join(',');
            backupScript += `INSERT INTO ${tableName} VALUES (${values});\n`;
          }
          backupScript += '\n';
        }
      }

      // 寫入檔案
      let finalScript = backupScript;
      if (options.compression) {
        finalScript = zlib.gzipSync(backupScript).toString('base64');
      }

      fs.writeFileSync(backupPath, finalScript);

      // 計算校驗和
      const checksum = crypto
        .createHash('sha256')
        .update(backupScript)
        .digest('hex');

      const metadata: BackupMetadata = {
        version: '1.0',
        createdAt: startTime,
        tableCount: tables.length,
        totalRecords: 0, // 需要計算
        checksum,
        includesData: options.includeData,
        compressed: options.compression,
        oracleVersion: '21c',
      };

      return {
        success: true,
        backupPath,
        size: Buffer.byteLength(finalScript),
        metadata,
        duration: Date.now() - startTime.getTime(),
      };
    } catch (error: any) {
      return {
        success: false,
        backupPath,
        size: 0,
        metadata: {
          version: '1.0',
          createdAt: startTime,
          tableCount: 0,
          totalRecords: 0,
          checksum: '',
          includesData: options.includeData,
          compressed: options.compression,
          oracleVersion: '21c',
        },
        duration: Date.now() - startTime.getTime(),
        error: error.message,
      };
    }
  }

  async restoreFromBackup(
    oracleConnection: any,
    backupPath: string
  ): Promise<RestoreResult> {
    const startTime = new Date();

    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      const backupContent = fs.readFileSync(backupPath, 'utf8');

      // 分割SQL語句
      const statements = backupContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      let executedStatements = 0;
      let restoredTables = 0;
      let restoredRecords = 0;

      for (const statement of statements) {
        try {
          await oracleConnection.execute(statement);
          executedStatements++;

          if (statement.toUpperCase().includes('CREATE TABLE')) {
            restoredTables++;
          } else if (statement.toUpperCase().includes('INSERT INTO')) {
            restoredRecords++;
          }
        } catch (error: any) {
          // 繼續執行其他語句
          console.warn(`Statement execution failed: ${error.message}`);
        }
      }

      return {
        success: true,
        backupPath,
        executedStatements,
        restoredTables,
        restoredRecords,
        duration: Date.now() - startTime.getTime(),
      };
    } catch (error: any) {
      return {
        success: false,
        backupPath,
        executedStatements: 0,
        restoredTables: 0,
        restoredRecords: 0,
        duration: Date.now() - startTime.getTime(),
        error: error.message,
      };
    }
  }

  async validateBackup(
    backupPath: string,
    expectedMetadata: BackupMetadata
  ): Promise<BackupValidationResult> {
    try {
      if (!fs.existsSync(backupPath)) {
        return {
          isValid: false,
          checksumMatch: false,
          structureValid: false,
          dataIntegrityCheck: false,
          issues: ['Backup file not found'],
          recommendations: ['Ensure backup file exists and is accessible'],
        };
      }

      const backupContent = fs.readFileSync(backupPath, 'utf8');
      const actualChecksum = crypto
        .createHash('sha256')
        .update(backupContent)
        .digest('hex');

      const issues: string[] = [];
      const recommendations: string[] = [];

      // 校驗和檢查
      const checksumMatch = actualChecksum === expectedMetadata.checksum;
      if (!checksumMatch) {
        issues.push('Checksum mismatch - backup may be corrupted');
        recommendations.push('Re-create backup from source database');
      }

      // 結構檢查
      const structureValid =
        backupContent.includes('CREATE TABLE') ||
        backupContent.includes('DROP TABLE');
      if (!structureValid) {
        issues.push('Backup does not contain valid table structures');
        recommendations.push('Verify backup generation process');
      }

      // 數據完整性檢查
      const dataIntegrityCheck =
        !expectedMetadata.includesData || backupContent.includes('INSERT INTO');
      if (!dataIntegrityCheck) {
        issues.push('Expected data not found in backup');
        recommendations.push('Check data export configuration');
      }

      return {
        isValid: issues.length === 0,
        checksumMatch,
        structureValid,
        dataIntegrityCheck,
        issues,
        recommendations,
      };
    } catch (error: any) {
      return {
        isValid: false,
        checksumMatch: false,
        structureValid: false,
        dataIntegrityCheck: false,
        issues: [`Backup validation error: ${error.message}`],
        recommendations: ['Check file permissions and disk space'],
      };
    }
  }
}
