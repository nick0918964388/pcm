/**
 * Data Migrator Tests
 * Task 2.3: 實作資料遷移和驗證功能
 *
 * 測試目標:
 * - 建立批次資料匯出和匯入機制
 * - 實作資料完整性驗證工具
 * - 開發資料計數和內容比對功能
 * - 建立遷移進度追蹤和錯誤處理
 * - 實作資料備份和還原機制
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataMigrator } from '../data-migrator';
import { DataTypeConverter } from '../data-type-converter';
import type {
  DataMigrationOptions,
  DataMigrationResult,
  ValidationReport,
  MigrationProgress,
  BackupMetadata,
  DataComparisonResult,
  DataExportResult,
  DataImportResult
} from '../migration-types';

describe('Data Migrator', () => {
  let dataMigrator: DataMigrator;
  let mockPostgresConnection: any;
  let mockOracleConnection: any;
  let mockConverter: DataTypeConverter;

  beforeEach(() => {
    // Mock PostgreSQL connection
    mockPostgresConnection = {
      query: vi.fn(),
      end: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined)
    };

    // Mock Oracle connection
    mockOracleConnection = {
      execute: vi.fn(),
      close: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn()
    };

    mockConverter = new DataTypeConverter();
    dataMigrator = new DataMigrator(mockConverter);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('批次資料匯出機制', () => {
    it('should export data from PostgreSQL in batches', async () => {
      // RED: 測試尚未實作的批次匯出功能
      const mockTableData = [
        { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Test User 1', created_at: new Date() },
        { id: '223e4567-e89b-12d3-a456-426614174001', name: 'Test User 2', created_at: new Date() }
      ];

      mockPostgresConnection.query.mockResolvedValueOnce({ rows: mockTableData, rowCount: 2 });

      const options: DataMigrationOptions = {
        batchSize: 1000,
        parallelTables: 2,
        validateEachBatch: true,
        continueOnError: false,
        compressionEnabled: true
      };

      const result = await dataMigrator.exportTableData(
        mockPostgresConnection,
        'users',
        options
      );

      expect(result.success).toBe(true);
      expect(result.totalRecords).toBe(2);
      expect(result.batchCount).toBe(1);
      expect(result.exportedData).toHaveLength(2);
      expect(mockPostgresConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users')
      );
    });

    it('should handle large datasets with pagination', async () => {
      // RED: 測試大數據集的分頁處理
      const batchSize = 10;
      const totalRecords = 25;

      // 模擬分批返回數據
      mockPostgresConnection.query
        .mockResolvedValueOnce({ rows: new Array(batchSize).fill(0).map((_, i) => ({ id: i })), rowCount: batchSize })
        .mockResolvedValueOnce({ rows: new Array(batchSize).fill(0).map((_, i) => ({ id: i + batchSize })), rowCount: batchSize })
        .mockResolvedValueOnce({ rows: new Array(5).fill(0).map((_, i) => ({ id: i + 20 })), rowCount: 5 });

      const options: DataMigrationOptions = {
        batchSize,
        parallelTables: 1,
        validateEachBatch: false,
        continueOnError: false,
        compressionEnabled: false
      };

      const result = await dataMigrator.exportTableData(
        mockPostgresConnection,
        'large_table',
        options
      );

      expect(result.success).toBe(true);
      expect(result.totalRecords).toBe(totalRecords);
      expect(result.batchCount).toBe(3);
      expect(mockPostgresConnection.query).toHaveBeenCalledTimes(3);
    });

    it('should handle export errors gracefully', async () => {
      // RED: 測試匯出錯誤處理
      mockPostgresConnection.query.mockRejectedValueOnce(new Error('Connection timeout'));

      const options: DataMigrationOptions = {
        batchSize: 1000,
        parallelTables: 1,
        validateEachBatch: true,
        continueOnError: false,
        compressionEnabled: false
      };

      const result = await dataMigrator.exportTableData(
        mockPostgresConnection,
        'problematic_table',
        options
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection timeout');
      expect(result.totalRecords).toBe(0);
    });

    it('should apply data compression when enabled', async () => {
      // RED: 測試數據壓縮功能
      const mockData = new Array(1000).fill(0).map((_, i) => ({
        id: i,
        data: 'Large text content that should be compressed'.repeat(100)
      }));

      mockPostgresConnection.query.mockResolvedValueOnce({ rows: mockData, rowCount: 1000 });

      const options: DataMigrationOptions = {
        batchSize: 1000,
        parallelTables: 1,
        validateEachBatch: false,
        continueOnError: false,
        compressionEnabled: true
      };

      const result = await dataMigrator.exportTableData(
        mockPostgresConnection,
        'large_content_table',
        options
      );

      expect(result.success).toBe(true);
      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.compressedSize).toBeLessThan(result.originalSize);
    });
  });

  describe('批次資料匯入機制', () => {
    it('should import data to Oracle in batches', async () => {
      // RED: 測試批次匯入功能
      const mockData = [
        { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Test User 1' },
        { id: '223e4567-e89b-12d3-a456-426614174001', name: 'Test User 2' }
      ];

      mockOracleConnection.execute.mockResolvedValue({ rowsAffected: 1 });

      const options: DataMigrationOptions = {
        batchSize: 1000,
        parallelTables: 1,
        validateEachBatch: true,
        continueOnError: false,
        compressionEnabled: false
      };

      const result = await dataMigrator.importTableData(
        mockOracleConnection,
        'users',
        mockData,
        options
      );

      expect(result.success).toBe(true);
      expect(result.totalRecords).toBe(2);
      expect(result.insertedRecords).toBe(2);
      expect(mockOracleConnection.execute).toHaveBeenCalledTimes(2);
    });

    it('should use Oracle BULK INSERT for better performance', async () => {
      // RED: 測試Oracle批次插入最佳化
      const mockData = new Array(5000).fill(0).map((_, i) => ({
        id: `id_${i}`,
        name: `User ${i}`
      }));

      mockOracleConnection.execute.mockResolvedValue({ rowsAffected: 1000 });

      const options: DataMigrationOptions = {
        batchSize: 1000,
        parallelTables: 1,
        validateEachBatch: false,
        continueOnError: false,
        compressionEnabled: false
      };

      const result = await dataMigrator.importTableData(
        mockOracleConnection,
        'users',
        mockData,
        options
      );

      expect(result.success).toBe(true);
      expect(result.totalRecords).toBe(5000);
      expect(result.batchCount).toBe(5);
      // 應該使用BULK INSERT而不是單筆插入
      expect(mockOracleConnection.execute).toHaveBeenCalledTimes(5);
    });

    it('should handle data type conversion during import', async () => {
      // RED: 測試匯入時的資料類型轉換
      const mockPostgresData = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          metadata: { key: 'value' },
          is_active: true,
          created_at: new Date()
        }
      ];

      mockOracleConnection.execute.mockResolvedValue({ rowsAffected: 1 });

      const options: DataMigrationOptions = {
        batchSize: 1000,
        parallelTables: 1,
        validateEachBatch: true,
        continueOnError: false,
        compressionEnabled: false
      };

      const result = await dataMigrator.importTableData(
        mockOracleConnection,
        'users',
        mockPostgresData,
        options
      );

      expect(result.success).toBe(true);
      expect(result.conversions).toBeDefined();
      expect(result.conversions!.uuid).toBe(1);
      expect(result.conversions!.jsonb).toBe(1);
      expect(result.conversions!.boolean).toBe(1);
    });

    it('should continue on error when configured', async () => {
      // RED: 測試錯誤繼續處理模式
      const mockData = [
        { id: 'valid_id_1', name: 'Valid User 1' },
        { id: 'invalid_id', name: null }, // 會導致錯誤
        { id: 'valid_id_2', name: 'Valid User 2' }
      ];

      mockOracleConnection.execute
        .mockResolvedValueOnce({ rowsAffected: 1 })
        .mockRejectedValueOnce(new Error('ORA-01400: cannot insert NULL'))
        .mockResolvedValueOnce({ rowsAffected: 1 });

      const options: DataMigrationOptions = {
        batchSize: 1,
        parallelTables: 1,
        validateEachBatch: false,
        continueOnError: true,
        compressionEnabled: false
      };

      const result = await dataMigrator.importTableData(
        mockOracleConnection,
        'users',
        mockData,
        options
      );

      expect(result.success).toBe(true); // 整體成功，但有錯誤
      expect(result.insertedRecords).toBe(2);
      expect(result.failedRecords).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('資料完整性驗證', () => {
    it('should validate data integrity between PostgreSQL and Oracle', async () => {
      // RED: 測試資料完整性驗證
      mockPostgresConnection.query.mockResolvedValueOnce({
        rows: [{ count: '1000' }]
      });

      mockOracleConnection.execute.mockResolvedValueOnce({
        rows: [{ COUNT: 1000 }]
      });

      const report = await dataMigrator.validateDataIntegrity(
        mockPostgresConnection,
        mockOracleConnection,
        'users'
      );

      expect(report.isValid).toBe(true);
      expect(report.tableName).toBe('users');
      expect(report.postgresCount).toBe(1000);
      expect(report.oracleCount).toBe(1000);
      expect(report.issues).toHaveLength(0);
    });

    it('should detect count mismatches', async () => {
      // RED: 測試數量不匹配檢測
      mockPostgresConnection.query.mockResolvedValueOnce({
        rows: [{ count: '1000' }]
      });

      mockOracleConnection.execute.mockResolvedValueOnce({
        rows: [{ COUNT: 995 }]
      });

      const report = await dataMigrator.validateDataIntegrity(
        mockPostgresConnection,
        mockOracleConnection,
        'users'
      );

      expect(report.isValid).toBe(false);
      expect(report.postgresCount).toBe(1000);
      expect(report.oracleCount).toBe(995);
      expect(report.issues).toContain('Count mismatch: PostgreSQL has 1000 records, Oracle has 995');
    });

    it('should validate sample data content', async () => {
      // RED: 測試樣本數據內容驗證
      const sampleData = [
        { id: '123', name: 'User 1', email: 'user1@test.com' },
        { id: '456', name: 'User 2', email: 'user2@test.com' }
      ];

      mockPostgresConnection.query.mockResolvedValueOnce({
        rows: sampleData
      });

      mockOracleConnection.execute.mockResolvedValueOnce({
        rows: sampleData
      });

      const report = await dataMigrator.validateSampleData(
        mockPostgresConnection,
        mockOracleConnection,
        'users',
        10 // 樣本大小
      );

      expect(report.isValid).toBe(true);
      expect(report.sampleSize).toBe(2);
      expect(report.matchedRecords).toBe(2);
      expect(report.mismatchedRecords).toBe(0);
    });

    it('should detect data content differences', async () => {
      // RED: 測試數據內容差異檢測
      const postgresData = [
        { id: '123', name: 'User 1', email: 'user1@test.com' }
      ];

      const oracleData = [
        { ID: '123', NAME: 'User 1', EMAIL: 'different@test.com' }
      ];

      mockPostgresConnection.query.mockResolvedValueOnce({
        rows: postgresData
      });

      mockOracleConnection.execute.mockResolvedValueOnce({
        rows: oracleData
      });

      const report = await dataMigrator.validateSampleData(
        mockPostgresConnection,
        mockOracleConnection,
        'users',
        10
      );

      expect(report.isValid).toBe(false);
      expect(report.matchedRecords).toBe(0);
      expect(report.mismatchedRecords).toBe(1);
      expect(report.differences).toBeDefined();
      expect(report.differences!).toHaveLength(1);
    });
  });

  describe('資料計數和比對功能', () => {
    it('should compare row counts across all tables', async () => {
      // RED: 測試全表計數比對
      const tables = ['users', 'projects', 'orders'];

      mockPostgresConnection.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockResolvedValueOnce({ rows: [{ count: '200' }] });

      mockOracleConnection.execute
        .mockResolvedValueOnce({ rows: [{ COUNT: 100 }] })
        .mockResolvedValueOnce({ rows: [{ COUNT: 48 }] }) // 故意不匹配
        .mockResolvedValueOnce({ rows: [{ COUNT: 200 }] });

      const comparison = await dataMigrator.compareAllTableCounts(
        mockPostgresConnection,
        mockOracleConnection,
        tables
      );

      expect(comparison.totalTables).toBe(3);
      expect(comparison.matchingTables).toBe(2);
      expect(comparison.mismatchedTables).toBe(1);
      expect(comparison.results.find(r => r.tableName === 'projects')?.isMatch).toBe(false);
    });

    it('should generate detailed comparison report', async () => {
      // RED: 測試詳細比對報告生成
      const tables = ['users'];

      mockPostgresConnection.query.mockResolvedValueOnce({
        rows: [{ count: '100' }]
      });

      mockOracleConnection.execute.mockResolvedValueOnce({
        rows: [{ COUNT: 95 }]
      });

      const comparison = await dataMigrator.compareAllTableCounts(
        mockPostgresConnection,
        mockOracleConnection,
        tables
      );

      expect(comparison.summary).toBeDefined();
      expect(comparison.summary.totalPostgresRecords).toBe(100);
      expect(comparison.summary.totalOracleRecords).toBe(95);
      expect(comparison.summary.overallMatch).toBe(false);
      expect(comparison.timestamp).toBeDefined();
    });

    it('should identify missing records in either database', async () => {
      // RED: 測試缺失記錄識別
      const postgresData = [
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' },
        { id: '3', name: 'User 3' }
      ];

      const oracleData = [
        { ID: '1', NAME: 'User 1' },
        { ID: '3', NAME: 'User 3' }
        // 缺少 ID: '2'
      ];

      mockPostgresConnection.query.mockResolvedValueOnce({
        rows: postgresData
      });

      mockOracleConnection.execute.mockResolvedValueOnce({
        rows: oracleData
      });

      const analysis = await dataMigrator.analyzeMissingRecords(
        mockPostgresConnection,
        mockOracleConnection,
        'users',
        'id'
      );

      expect(analysis.missingInOracle).toHaveLength(1);
      expect(analysis.missingInOracle[0]).toBe('2');
      expect(analysis.missingInPostgres).toHaveLength(0);
      expect(analysis.commonRecords).toHaveLength(2);
    });
  });

  describe('遷移進度追蹤', () => {
    it('should track migration progress across tables', async () => {
      // RED: 測試遷移進度追蹤
      const tables = ['users', 'projects'];

      const progressCallback = vi.fn();

      // 模擬成功的遷移
      mockPostgresConnection.query.mockResolvedValue({
        rows: [{ id: '1', name: 'Test' }]
      });

      mockOracleConnection.execute.mockResolvedValue({
        rowsAffected: 1
      });

      const options: DataMigrationOptions = {
        batchSize: 1000,
        parallelTables: 1,
        validateEachBatch: false,
        continueOnError: false,
        compressionEnabled: false
      };

      const result = await dataMigrator.migrateAllTables(
        mockPostgresConnection,
        mockOracleConnection,
        tables,
        options,
        progressCallback
      );

      expect(result.success).toBe(true);
      expect(result.completedTables).toBe(2);
      expect(result.totalTables).toBe(2);
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should provide real-time progress updates', async () => {
      // RED: 測試實時進度更新
      const progressUpdates: MigrationProgress[] = [];
      const progressCallback = (progress: MigrationProgress) => {
        progressUpdates.push(progress);
      };

      mockPostgresConnection.query.mockResolvedValue({
        rows: new Array(100).fill(0).map((_, i) => ({ id: i }))
      });

      mockOracleConnection.execute.mockResolvedValue({
        rowsAffected: 100
      });

      const options: DataMigrationOptions = {
        batchSize: 25, // 小批次以觸發多次進度更新
        parallelTables: 1,
        validateEachBatch: false,
        continueOnError: false,
        compressionEnabled: false
      };

      await dataMigrator.migrateTable(
        mockPostgresConnection,
        mockOracleConnection,
        'users',
        options,
        progressCallback
      );

      expect(progressUpdates.length).toBeGreaterThan(1);
      expect(progressUpdates[0].currentTable).toBe('users');
      expect(progressUpdates[progressUpdates.length - 1].completed).toBe(true);
    });

    it('should track error details and recovery actions', async () => {
      // RED: 測試錯誤詳情和恢復操作追蹤
      mockPostgresConnection.query.mockResolvedValue({
        rows: [{ id: '1', invalid_data: null }]
      });

      mockOracleConnection.execute.mockRejectedValue(
        new Error('ORA-01400: cannot insert NULL into ("SCHEMA"."TABLE"."COLUMN")')
      );

      const progressCallback = vi.fn();

      const options: DataMigrationOptions = {
        batchSize: 1000,
        parallelTables: 1,
        validateEachBatch: false,
        continueOnError: true,
        compressionEnabled: false
      };

      const result = await dataMigrator.migrateTable(
        mockPostgresConnection,
        mockOracleConnection,
        'problematic_table',
        options,
        progressCallback
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0].oracleErrorCode).toBe('ORA-01400');
      expect(result.errors![0].suggestedAction).toBeDefined();
    });
  });

  describe('資料備份和還原機制', () => {
    it('should create database backup before migration', async () => {
      // RED: 測試遷移前資料庫備份
      const backupPath = '/tmp/backup_20231201_120000.sql';

      mockOracleConnection.execute.mockResolvedValue({
        rows: [{ TABLE_NAME: 'USERS' }, { TABLE_NAME: 'PROJECTS' }]
      });

      const backup = await dataMigrator.createBackup(
        mockOracleConnection,
        backupPath,
        { includeData: true, compression: true }
      );

      expect(backup.success).toBe(true);
      expect(backup.backupPath).toBe(backupPath);
      expect(backup.metadata.tableCount).toBe(2);
      expect(backup.metadata.includesData).toBe(true);
      expect(backup.metadata.compressed).toBe(true);
      expect(backup.size).toBeGreaterThan(0);
    });

    it('should restore database from backup', async () => {
      // RED: 測試從備份還原資料庫
      const backupPath = '/tmp/backup_20231201_120000.sql';
      const mockBackupContent = `
        CREATE TABLE users (id VARCHAR2(36) PRIMARY KEY);
        INSERT INTO users VALUES ('123');
      `;

      // 模擬檔案讀取
      vi.doMock('fs', () => ({
        readFileSync: vi.fn().mockReturnValue(mockBackupContent),
        existsSync: vi.fn().mockReturnValue(true)
      }));

      mockOracleConnection.execute.mockResolvedValue({
        rowsAffected: 1
      });

      const restore = await dataMigrator.restoreFromBackup(
        mockOracleConnection,
        backupPath
      );

      expect(restore.success).toBe(true);
      expect(restore.executedStatements).toBeGreaterThan(0);
      expect(mockOracleConnection.execute).toHaveBeenCalled();
    });

    it('should validate backup integrity', async () => {
      // RED: 測試備份完整性驗證
      const backupMetadata: BackupMetadata = {
        version: '1.0',
        createdAt: new Date(),
        tableCount: 5,
        totalRecords: 10000,
        checksum: 'abc123def456',
        includesData: true,
        compressed: true,
        oracleVersion: '21c'
      };

      const validation = await dataMigrator.validateBackup(
        '/tmp/backup_20231201_120000.sql',
        backupMetadata
      );

      expect(validation.isValid).toBe(true);
      expect(validation.checksumMatch).toBe(true);
      expect(validation.structureValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should handle backup corruption gracefully', async () => {
      // RED: 測試備份損壞的優雅處理
      const corruptedBackupPath = '/tmp/corrupted_backup.sql';

      const validation = await dataMigrator.validateBackup(
        corruptedBackupPath,
        {
          version: '1.0',
          createdAt: new Date(),
          tableCount: 5,
          totalRecords: 10000,
          checksum: 'wrong_checksum',
          includesData: true,
          compressed: false,
          oracleVersion: '21c'
        }
      );

      expect(validation.isValid).toBe(false);
      expect(validation.checksumMatch).toBe(false);
      expect(validation.issues).toContain('Checksum mismatch - backup may be corrupted');
    });
  });

  describe('錯誤處理和恢復', () => {
    it('should handle Oracle-specific errors with appropriate actions', async () => {
      // RED: 測試Oracle特定錯誤的適當處理
      const oracleErrors = [
        { code: 'ORA-00001', message: 'unique constraint violated' },
        { code: 'ORA-01400', message: 'cannot insert NULL' },
        { code: 'ORA-12541', message: 'TNS:no listener' }
      ];

      for (const error of oracleErrors) {
        const mockError = new Error(`${error.code}: ${error.message}`);
        const errorHandler = dataMigrator.handleOracleError(mockError);

        expect(errorHandler.errorCode).toBe(error.code);
        expect(errorHandler.isRetryable).toBeDefined();
        expect(errorHandler.suggestedAction).toBeDefined();
        expect(errorHandler.severity).toBeDefined();
      }
    });

    it('should implement exponential backoff for retryable errors', async () => {
      // RED: 測試可重試錯誤的指數退避機制
      let attemptCount = 0;

      mockOracleConnection.execute.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('ORA-12541: TNS:no listener');
        }
        return Promise.resolve({ rowsAffected: 1 });
      });

      const options: DataMigrationOptions = {
        batchSize: 1000,
        parallelTables: 1,
        validateEachBatch: false,
        continueOnError: false,
        compressionEnabled: false
      };

      const result = await dataMigrator.importTableData(
        mockOracleConnection,
        'users',
        [{ id: '1', name: 'Test' }],
        options
      );

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
      expect(result.retryAttempts).toBe(2);
    });
  });
});