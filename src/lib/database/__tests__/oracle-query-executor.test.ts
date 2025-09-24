/**
 * Oracle Query Executor Tests
 * Task 3.2: 開發Oracle特化的查詢執行層
 *
 * 測試目標:
 * - 實作Oracle SQL語法的查詢適配器
 * - 建立Oracle bind variables的參數處理
 * - 開發預處理語句的快取和重用機制
 * - 實作Oracle特有的交易管理功能
 * - 建立Oracle錯誤碼的統一處理機制
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock oracledb for query execution testing
vi.mock('oracledb', () => ({
  default: {
    execute: vi.fn(),
    getConnection: vi.fn(),
    BIND_IN: 3001,
    BIND_OUT: 3002,
    BIND_INOUT: 3003,
    NUMBER: 2001,
    STRING: 2002,
    DATE: 2003,
    CURSOR: 2004,
    CLOB: 2006,
    BLOB: 2007,
    OUT_FORMAT_OBJECT: 4001,
  },
}));

import { OracleQueryExecutor } from '../oracle-query-executor';
import { OracleConnectionManager } from '../oracle-connection';
import type {
  QueryOptions,
  PreparedStatement,
  TransactionContext,
  BatchOperation,
  QueryResult,
  CursorResult,
  BulkOperationResult,
} from '../oracle-query-types';

describe('Oracle Query Executor - Task 3.2', () => {
  let queryExecutor: OracleQueryExecutor;
  let mockConnectionManager: jest.Mocked<OracleConnectionManager>;
  let mockConnection: any;

  beforeEach(() => {
    // Mock connection
    mockConnection = {
      execute: vi.fn(),
      executeMany: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      close: vi.fn(),
      action: '',
      module: 'PCM_APP',
      clientId: '',
      callTimeout: 60000,
    };

    // Mock connection manager
    mockConnectionManager = {
      getConnection: vi
        .fn()
        .mockResolvedValue({ success: true, data: mockConnection }),
      executeQuery: vi.fn(),
      executeOne: vi.fn(),
      executeTransaction: vi.fn(),
      healthCheck: vi.fn(),
      getPoolStatus: vi.fn(),
      shutdown: vi.fn(),
      initialize: vi.fn(),
    } as any;

    queryExecutor = new OracleQueryExecutor(mockConnectionManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Oracle SQL語法查詢適配器', () => {
    it('should convert PostgreSQL LIMIT/OFFSET to Oracle OFFSET/FETCH', async () => {
      // RED: 測試分頁語法轉換
      const postgresQuery =
        'SELECT * FROM users ORDER BY id LIMIT 10 OFFSET 20';
      const expectedOracleQuery =
        'SELECT * FROM users ORDER BY id OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY';

      mockConnection.execute.mockResolvedValue({
        rows: [{ id: 1, name: 'Test User' }],
        metaData: [{ name: 'ID' }, { name: 'NAME' }],
      });

      const result = await queryExecutor.executeQuery(
        postgresQuery,
        {},
        { convertSyntax: true }
      );

      expect(result.success).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expectedOracleQuery,
        {},
        expect.any(Object)
      );
    });

    it('should convert PostgreSQL JSONB operations to Oracle JSON functions', async () => {
      // RED: 測試JSON操作語法轉換
      const postgresQuery =
        'SELECT data->>\'name\' as name, data @> \'{"status":"active"}\' as is_active FROM projects';
      const expectedOracleQuery =
        "SELECT JSON_VALUE(data, '$.name') as name, JSON_EXISTS(data, '$.status?(@ == \"active\")') as is_active FROM projects";

      mockConnection.execute.mockResolvedValue({
        rows: [{ NAME: 'Project 1', IS_ACTIVE: 1 }],
      });

      const result = await queryExecutor.executeQuery(
        postgresQuery,
        {},
        { convertSyntax: true }
      );

      expect(result.success).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expectedOracleQuery,
        {},
        expect.any(Object)
      );
    });

    it('should convert PostgreSQL date functions to Oracle equivalents', async () => {
      // RED: 測試日期函數轉換
      const postgresQuery =
        'SELECT NOW(), EXTRACT(YEAR FROM created_at), AGE(created_at) FROM users';
      const expectedOracleQuery =
        'SELECT SYSTIMESTAMP, EXTRACT(YEAR FROM created_at), (SYSTIMESTAMP - created_at) FROM users';

      mockConnection.execute.mockResolvedValue({
        rows: [{ SYSTIMESTAMP: new Date(), YEAR: 2023, AGE: 365 }],
      });

      const result = await queryExecutor.executeQuery(
        postgresQuery,
        {},
        { convertSyntax: true }
      );

      expect(result.success).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expectedOracleQuery,
        {},
        expect.any(Object)
      );
    });

    it('should handle ILIKE operations with Oracle REGEXP_LIKE', async () => {
      // RED: 測試不區分大小寫的LIKE操作轉換
      const postgresQuery = "SELECT * FROM users WHERE name ILIKE '%john%'";
      const expectedOracleQuery =
        "SELECT * FROM users WHERE REGEXP_LIKE(name, 'john', 'i')";

      mockConnection.execute.mockResolvedValue({
        rows: [{ id: 1, name: 'John Doe' }],
      });

      const result = await queryExecutor.executeQuery(
        postgresQuery,
        {},
        { convertSyntax: true }
      );

      expect(result.success).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expectedOracleQuery,
        {},
        expect.any(Object)
      );
    });

    it('should convert BOOLEAN values to Oracle NUMBER(1)', async () => {
      // RED: 測試布林值轉換
      const query =
        'INSERT INTO users (name, is_active) VALUES (:name, :is_active)';
      const binds = { name: 'John', is_active: true };

      mockConnection.execute.mockResolvedValue({ rowsAffected: 1 });

      const result = await queryExecutor.executeQuery(query, binds, {
        convertBinds: true,
      });

      expect(result.success).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        query,
        { name: 'John', is_active: 1 }, // Boolean轉換為數字
        expect.any(Object)
      );
    });
  });

  describe('Oracle Bind Variables處理', () => {
    it('should properly handle Oracle bind variable syntax', async () => {
      // RED: 測試Oracle bind variables語法
      const query =
        'SELECT * FROM users WHERE id = :userId AND status = :userStatus';
      const binds = { userId: 123, userStatus: 'active' };

      mockConnection.execute.mockResolvedValue({
        rows: [{ ID: 123, NAME: 'Test User', STATUS: 'active' }],
      });

      const result = await queryExecutor.executeQuery(query, binds);

      expect(result.success).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        query,
        binds,
        expect.objectContaining({
          outFormat: expect.any(Number),
        })
      );
    });

    it('should handle complex bind variable types', async () => {
      // RED: 測試複雜的bind variable類型
      const query = `
        INSERT INTO projects (id, name, metadata, created_at, budget)
        VALUES (:id, :name, :metadata, :created_at, :budget)
      `;
      const binds = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Project',
        metadata: { key: 'value', tags: ['tag1', 'tag2'] },
        created_at: new Date(),
        budget: 100000.5,
      };

      mockConnection.execute.mockResolvedValue({ rowsAffected: 1 });

      const result = await queryExecutor.executeQuery(query, binds, {
        convertBinds: true,
      });

      expect(result.success).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        query,
        expect.objectContaining({
          id: binds.id,
          name: binds.name,
          metadata: JSON.stringify(binds.metadata), // JSON序列化
          created_at: binds.created_at,
          budget: binds.budget,
        }),
        expect.any(Object)
      );
    });

    it('should support OUT and INOUT bind variables', async () => {
      // RED: 測試OUT和INOUT參數
      const query = `
        BEGIN
          update_user(:userId, :newName, :oldName => :oldName);
        END;
      `;
      const binds = {
        userId: 123,
        newName: 'New Name',
        oldName: { type: 'STRING', dir: 'BIND_OUT', maxSize: 255 },
      };

      mockConnection.execute.mockResolvedValue({
        outBinds: { oldName: 'Old Name' },
      });

      const result = await queryExecutor.executeQuery(query, binds);

      expect(result.success).toBe(true);
      expect(result.data?.outBinds).toEqual({ oldName: 'Old Name' });
    });

    it('should handle array bind variables for batch operations', async () => {
      // RED: 測試陣列bind variables用於批次操作
      const query = 'INSERT INTO users (name, email) VALUES (:name, :email)';
      const bindArray = [
        { name: 'User 1', email: 'user1@test.com' },
        { name: 'User 2', email: 'user2@test.com' },
        { name: 'User 3', email: 'user3@test.com' },
      ];

      mockConnection.executeMany.mockResolvedValue({
        rowsAffected: 3,
      });

      const result = await queryExecutor.executeBatch(query, bindArray);

      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(3);
      expect(mockConnection.executeMany).toHaveBeenCalledWith(
        query,
        bindArray,
        expect.any(Object)
      );
    });
  });

  describe('預處理語句快取和重用', () => {
    it('should cache prepared statements for reuse', async () => {
      // RED: 測試預處理語句快取
      const query = 'SELECT * FROM users WHERE id = :id';
      const cacheKey = queryExecutor.generateCacheKey(query);

      // 第一次執行
      mockConnection.execute.mockResolvedValue({
        rows: [{ ID: 1, NAME: 'User 1' }],
      });

      await queryExecutor.executeQuery(query, { id: 1 }, { useCache: true });

      // 第二次執行相同查詢
      await queryExecutor.executeQuery(query, { id: 2 }, { useCache: true });

      const cacheStats = queryExecutor.getCacheStatistics();

      expect(cacheStats.cacheHits).toBe(1);
      expect(cacheStats.cacheMisses).toBe(1);
      expect(cacheStats.totalCachedStatements).toBe(1);
    });

    it('should handle cache eviction when cache is full', async () => {
      // RED: 測試快取滿時的清理機制
      const maxCacheSize = 10;
      const smallCacheExecutor = new OracleQueryExecutor(
        mockConnectionManager,
        {
          maxCacheSize,
          cacheEvictionPolicy: 'LRU',
        }
      );

      mockConnection.execute.mockResolvedValue({ rows: [] });

      // 填滿快取
      for (let i = 0; i <= maxCacheSize; i++) {
        await smallCacheExecutor.executeQuery(
          `SELECT * FROM table${i} WHERE id = :id`,
          { id: i },
          { useCache: true }
        );
      }

      const cacheStats = smallCacheExecutor.getCacheStatistics();

      expect(cacheStats.totalCachedStatements).toBeLessThanOrEqual(
        maxCacheSize
      );
      expect(cacheStats.cacheEvictions).toBeGreaterThan(0);
    });

    it('should support cache invalidation', async () => {
      // RED: 測試快取失效
      const query = 'SELECT * FROM users WHERE id = :id';

      mockConnection.execute.mockResolvedValue({ rows: [] });

      await queryExecutor.executeQuery(query, { id: 1 }, { useCache: true });

      expect(queryExecutor.getCacheStatistics().totalCachedStatements).toBe(1);

      queryExecutor.invalidateCache(query);

      expect(queryExecutor.getCacheStatistics().totalCachedStatements).toBe(0);
    });

    it('should provide cache performance metrics', async () => {
      // RED: 測試快取效能指標
      const query = 'SELECT * FROM users WHERE status = :status';

      mockConnection.execute.mockResolvedValue({ rows: [] });

      // 執行查詢建立快取
      await queryExecutor.executeQuery(
        query,
        { status: 'active' },
        { useCache: true }
      );

      // 多次執行相同查詢模式
      for (let i = 0; i < 5; i++) {
        await queryExecutor.executeQuery(
          query,
          { status: 'active' },
          { useCache: true }
        );
      }

      const metrics = queryExecutor.getCachePerformanceMetrics();

      expect(metrics.hitRate).toBeGreaterThan(0);
      expect(metrics.averageRetrievalTime).toBeGreaterThan(0);
      expect(metrics.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Oracle交易管理', () => {
    it('should handle explicit transaction boundaries', async () => {
      // RED: 測試明確的交易邊界
      const transactionContext: TransactionContext = {
        isolationLevel: 'READ_COMMITTED',
        readOnly: false,
        autoCommit: false,
      };

      mockConnection.execute
        .mockResolvedValueOnce({ rowsAffected: 1 }) // INSERT
        .mockResolvedValueOnce({ rowsAffected: 1 }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      const result = await queryExecutor.executeTransaction(async tx => {
        await tx.execute("INSERT INTO users (name) VALUES ('Test User')");
        await tx.execute(
          "UPDATE users SET status = 'active' WHERE name = 'Test User'"
        );
        return { success: true, message: 'Transaction completed' };
      }, transactionContext);

      expect(result.success).toBe(true);
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('should handle transaction rollback on error', async () => {
      // RED: 測試錯誤時的交易回滾
      mockConnection.execute
        .mockResolvedValueOnce({ rowsAffected: 1 }) // INSERT success
        .mockRejectedValueOnce(
          new Error('ORA-00001: unique constraint violated')
        ); // UPDATE fail

      const result = await queryExecutor.executeTransaction(async tx => {
        await tx.execute("INSERT INTO users (name) VALUES ('Test User')");
        await tx.execute("INSERT INTO users (name) VALUES ('Test User')"); // Duplicate
        return { success: true };
      });

      expect(result.success).toBe(false);
      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(result.error?.message).toContain('unique constraint violated');
    });

    it('should support nested savepoints', async () => {
      // RED: 測試嵌套儲存點
      mockConnection.execute.mockResolvedValue({ rowsAffected: 1 });

      const result = await queryExecutor.executeTransaction(async tx => {
        await tx.execute("INSERT INTO users (name) VALUES ('User 1')");

        const savepoint = await tx.createSavepoint('sp1');
        try {
          await tx.execute("INSERT INTO users (name) VALUES ('User 2')");
          await tx.execute('INVALID SQL'); // This should fail
        } catch (error) {
          await tx.rollbackToSavepoint(savepoint);
        }

        await tx.execute("INSERT INTO users (name) VALUES ('User 3')");
        return { success: true };
      });

      expect(result.success).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('SAVEPOINT'),
        expect.anything(),
        expect.anything()
      );
    });

    it('should handle different isolation levels', async () => {
      // RED: 測試不同隔離級別
      const isolationLevels = [
        'READ_UNCOMMITTED',
        'READ_COMMITTED',
        'REPEATABLE_READ',
        'SERIALIZABLE',
      ] as const;

      for (const level of isolationLevels) {
        mockConnection.execute.mockResolvedValue({ rowsAffected: 1 });

        await queryExecutor.executeTransaction(
          async tx => {
            await tx.execute('SELECT COUNT(*) FROM users');
            return { success: true };
          },
          { isolationLevel: level }
        );

        expect(mockConnection.execute).toHaveBeenCalledWith(
          expect.stringContaining('SET TRANSACTION'),
          expect.anything(),
          expect.anything()
        );
      }
    });
  });

  describe('批次操作和BULK處理', () => {
    it('should execute bulk insert operations efficiently', async () => {
      // RED: 測試批次插入操作
      const batchData = Array.from({ length: 1000 }, (_, i) => ({
        name: `User ${i}`,
        email: `user${i}@test.com`,
        created_at: new Date(),
      }));

      mockConnection.executeMany.mockResolvedValue({
        rowsAffected: 1000,
      });

      const result = await queryExecutor.executeBulkInsert('users', batchData, {
        batchSize: 100,
        enableParallel: true,
      });

      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(1000);
      expect(result.batchCount).toBe(10);
      expect(mockConnection.executeMany).toHaveBeenCalled();
    });

    it('should handle bulk update operations', async () => {
      // RED: 測試批次更新操作
      const updateData = [
        { id: 1, status: 'active' },
        { id: 2, status: 'inactive' },
        { id: 3, status: 'pending' },
      ];

      mockConnection.executeMany.mockResolvedValue({
        rowsAffected: 3,
      });

      const result = await queryExecutor.executeBulkUpdate(
        'users',
        updateData,
        ['status'],
        'id'
      );

      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(3);
    });

    it('should support MERGE operations for upsert functionality', async () => {
      // RED: 測試MERGE操作（upsert）
      const mergeData = [
        { id: 1, name: 'Updated User 1', email: 'updated1@test.com' },
        { id: 4, name: 'New User 4', email: 'new4@test.com' },
      ];

      mockConnection.execute.mockResolvedValue({
        rowsAffected: 2,
      });

      const result = await queryExecutor.executeMerge(
        'users',
        mergeData,
        ['id'],
        ['name', 'email']
      );

      expect(result.success).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('MERGE'),
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe('遊標和大結果集處理', () => {
    it('should handle cursor-based result streaming', async () => {
      // RED: 測試基於遊標的結果串流
      const mockCursor = {
        getRow: vi
          .fn()
          .mockResolvedValueOnce({ ID: 1, NAME: 'User 1' })
          .mockResolvedValueOnce({ ID: 2, NAME: 'User 2' })
          .mockResolvedValueOnce(undefined), // End of data
        close: vi.fn(),
      };

      mockConnection.execute.mockResolvedValue({
        resultSet: mockCursor,
      });

      const result = await queryExecutor.executeQueryWithCursor(
        'SELECT * FROM large_table',
        {},
        { fetchSize: 1000 }
      );

      expect(result.success).toBe(true);
      expect(result.hasMore).toBe(false);
      expect(result.rows).toHaveLength(2);
      expect(mockCursor.close).toHaveBeenCalled();
    });

    it('should support streaming large result sets', async () => {
      // RED: 測試大結果集串流處理
      const mockResultStream = {
        on: vi.fn(),
        pipe: vi.fn(),
        end: vi.fn(),
      };

      const rowCount = 50000;
      const batchSize = 1000;

      let processedRows = 0;
      const rowProcessor = vi.fn().mockImplementation(rows => {
        processedRows += rows.length;
      });

      const result = await queryExecutor.streamQuery(
        'SELECT * FROM very_large_table',
        {},
        {
          batchSize,
          onBatch: rowProcessor,
          onError: error => console.error(error),
          onComplete: () => console.log('Streaming complete'),
        }
      );

      expect(result.success).toBe(true);
      expect(rowProcessor).toHaveBeenCalled();
    });
  });

  describe('Oracle錯誤碼統一處理', () => {
    it('should map Oracle error codes to standardized error types', async () => {
      // RED: 測試Oracle錯誤碼映射
      const oracleErrors = [
        { code: 'ORA-00001', type: 'CONSTRAINT_VIOLATION', severity: 'ERROR' },
        {
          code: 'ORA-01017',
          type: 'AUTHENTICATION_FAILED',
          severity: 'CRITICAL',
        },
        { code: 'ORA-00904', type: 'INVALID_COLUMN', severity: 'ERROR' },
        { code: 'ORA-00942', type: 'TABLE_NOT_EXISTS', severity: 'ERROR' },
        { code: 'ORA-01403', type: 'NO_DATA_FOUND', severity: 'WARNING' },
      ];

      for (const errorInfo of oracleErrors) {
        const oracleError = new Error(`${errorInfo.code}: Test error message`);
        mockConnection.execute.mockRejectedValue(oracleError);

        const result = await queryExecutor.executeQuery(
          'SELECT * FROM test_table'
        );

        expect(result.success).toBe(false);
        expect(result.error?.type).toBe(errorInfo.type);
        expect(result.error?.severity).toBe(errorInfo.severity);
      }
    });

    it('should provide localized error messages', async () => {
      // RED: 測試本地化錯誤訊息
      const oracleError = new Error(
        'ORA-00001: unique constraint (PCM.UK_USERS_EMAIL) violated'
      );
      mockConnection.execute.mockRejectedValue(oracleError);

      const result = await queryExecutor.executeQuery(
        "INSERT INTO users (email) VALUES ('duplicate@test.com')",
        {},
        { locale: 'zh-TW' }
      );

      expect(result.success).toBe(false);
      expect(result.error?.localizedMessage).toContain('重複的值');
      expect(result.error?.suggestedAction).toBeDefined();
    });

    it('should handle constraint violations with detailed information', async () => {
      // RED: 測試約束違反的詳細資訊處理
      const constraintError = new Error(
        'ORA-00001: unique constraint (PCM.UK_USERS_EMAIL) violated'
      );
      mockConnection.execute.mockRejectedValue(constraintError);

      const result = await queryExecutor.executeQuery(
        'INSERT INTO users (email) VALUES (:email)',
        { email: 'test@example.com' }
      );

      expect(result.success).toBe(false);
      expect(result.error?.constraintInfo).toMatchObject({
        constraintName: 'UK_USERS_EMAIL',
        constraintType: 'UNIQUE',
        affectedColumns: ['email'],
        suggestedAction: expect.any(String),
      });
    });
  });

  describe('查詢最佳化和提示', () => {
    it('should support Oracle query hints', async () => {
      // RED: 測試Oracle查詢提示
      const queryWithHints = `
        SELECT /*+ FIRST_ROWS(10) USE_INDEX(users idx_users_status) */
        * FROM users WHERE status = :status
      `;

      mockConnection.execute.mockResolvedValue({ rows: [] });

      const result = await queryExecutor.executeQuery(queryWithHints, {
        status: 'active',
      });

      expect(result.success).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('/*+ FIRST_ROWS(10)'),
        expect.anything(),
        expect.anything()
      );
    });

    it('should provide query execution plan analysis', async () => {
      // RED: 測試查詢執行計畫分析
      const query =
        "SELECT * FROM users u JOIN projects p ON u.id = p.owner_id WHERE u.status = 'active'";

      mockConnection.execute.mockResolvedValue({
        rows: [],
        executionPlan: {
          cost: 1250,
          cardinality: 100,
          operations: ['HASH JOIN', 'INDEX RANGE SCAN'],
        },
      });

      const result = await queryExecutor.executeQuery(
        query,
        {},
        { includeExecutionPlan: true }
      );

      expect(result.success).toBe(true);
      expect(result.executionPlan).toBeDefined();
      expect(result.executionPlan?.cost).toBe(1250);
    });
  });
});
