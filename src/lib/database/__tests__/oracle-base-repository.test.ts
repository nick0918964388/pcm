/**
 * Oracle Base Repository Tests
 * Task 3.3: 更新Repository抽象層以支援Oracle
 *
 * 測試目標:
 * - 重構BaseRepository類別支援Oracle語法
 * - 實作Oracle特有的分頁查詢機制
 * - 建立Oracle JSON查詢功能支援
 * - 開發Oracle日期時間處理功能
 * - 實作Oracle批次操作最佳化
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OracleBaseRepository } from '../oracle-base-repository';
import { OracleQueryExecutor } from '../oracle-query-executor';
import type {
  BaseEntity,
  FindOptions,
  PaginationResult,
  OracleRepositoryOptions,
  JsonQueryOptions,
  BulkOperationOptions,
} from '../oracle-repository-types';

// 測試用實體
interface TestUser extends BaseEntity {
  id: string;
  name: string;
  email: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

// 測試用Repository
class TestUserRepository extends OracleBaseRepository<TestUser> {
  constructor(queryExecutor: OracleQueryExecutor) {
    super('users', queryExecutor, {
      primaryKey: 'id',
      searchFields: ['name', 'email'],
      jsonFields: ['metadata'],
      timestampFields: ['created_at', 'updated_at'],
    });
  }

  mapFromOracle(row: any): TestUser {
    return {
      id: row.ID || row.id,
      name: row.NAME || row.name,
      email: row.EMAIL || row.email,
      metadata: row.METADATA ? JSON.parse(row.METADATA) : {},
      created_at: new Date(row.CREATED_AT || row.created_at),
      updated_at: new Date(row.UPDATED_AT || row.updated_at),
      is_active: (row.IS_ACTIVE || row.is_active) === 1,
    };
  }

  mapToOracle(entity: Partial<TestUser>): Record<string, any> {
    const mapped: Record<string, any> = {};

    if (entity.id !== undefined) mapped.id = entity.id;
    if (entity.name !== undefined) mapped.name = entity.name;
    if (entity.email !== undefined) mapped.email = entity.email;
    if (entity.metadata !== undefined)
      mapped.metadata = JSON.stringify(entity.metadata);
    if (entity.created_at !== undefined) mapped.created_at = entity.created_at;
    if (entity.updated_at !== undefined) mapped.updated_at = entity.updated_at;
    if (entity.is_active !== undefined)
      mapped.is_active = entity.is_active ? 1 : 0;

    return mapped;
  }
}

describe('Oracle Base Repository - Task 3.3', () => {
  let userRepository: TestUserRepository;
  let mockQueryExecutor: jest.Mocked<OracleQueryExecutor>;

  beforeEach(() => {
    // Mock query executor
    mockQueryExecutor = {
      executeQuery: vi.fn(),
      executeBatch: vi.fn(),
      executeBulkInsert: vi.fn(),
      executeBulkUpdate: vi.fn(),
      executeMerge: vi.fn(),
      executeTransaction: vi.fn(),
      executeQueryWithCursor: vi.fn(),
      streamQuery: vi.fn(),
    } as any;

    userRepository = new TestUserRepository(mockQueryExecutor);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Oracle語法支援重構', () => {
    it('should generate Oracle-compatible SELECT queries with proper syntax', async () => {
      // RED: 測試Oracle SELECT語法生成
      const mockUsers = [
        {
          ID: '1',
          NAME: 'John Doe',
          EMAIL: 'john@test.com',
          IS_ACTIVE: 1,
          CREATED_AT: new Date(),
          UPDATED_AT: new Date(),
        },
      ];

      mockQueryExecutor.executeQuery.mockResolvedValue({
        success: true,
        data: mockUsers,
      });

      const result = await userRepository.findById('1');

      expect(mockQueryExecutor.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users'),
        expect.objectContaining({ id: '1' }),
        expect.objectContaining({
          convertSyntax: true,
          convertBinds: true,
        })
      );
      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
      expect(result?.name).toBe('John Doe');
    });

    it('should generate Oracle-compatible INSERT queries with RETURNING clause', async () => {
      // RED: 測試Oracle INSERT語法生成
      const newUser: Partial<TestUser> = {
        name: 'Jane Doe',
        email: 'jane@test.com',
        metadata: { role: 'admin' },
      };

      const mockInsertedUser = {
        ID: '123',
        NAME: 'Jane Doe',
        EMAIL: 'jane@test.com',
        METADATA: '{"role":"admin"}',
        IS_ACTIVE: 1,
        CREATED_AT: new Date(),
        UPDATED_AT: new Date(),
      };

      mockQueryExecutor.executeQuery.mockResolvedValue({
        success: true,
        data: [mockInsertedUser],
      });

      const result = await userRepository.create(newUser);

      expect(mockQueryExecutor.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.objectContaining({
          name: 'Jane Doe',
          email: 'jane@test.com',
          metadata: '{"role":"admin"}',
          is_active: 1,
        }),
        expect.objectContaining({
          convertSyntax: true,
          convertBinds: true,
        })
      );
      expect(result.name).toBe('Jane Doe');
      expect(result.metadata).toEqual({ role: 'admin' });
    });

    it('should generate Oracle-compatible UPDATE queries', async () => {
      // RED: 測試Oracle UPDATE語法生成
      const updateData: Partial<TestUser> = {
        name: 'John Updated',
        metadata: { role: 'user', updated: true },
      };

      const mockUpdatedUser = {
        ID: '1',
        NAME: 'John Updated',
        EMAIL: 'john@test.com',
        METADATA: '{"role":"user","updated":true}',
        IS_ACTIVE: 1,
        CREATED_AT: new Date(),
        UPDATED_AT: new Date(),
      };

      mockQueryExecutor.executeQuery.mockResolvedValue({
        success: true,
        data: [mockUpdatedUser],
      });

      const result = await userRepository.update('1', updateData);

      expect(mockQueryExecutor.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET'),
        expect.objectContaining({
          name: 'John Updated',
          metadata: '{"role":"user","updated":true}',
          updated_at: expect.any(Date),
        }),
        expect.objectContaining({
          convertSyntax: true,
          convertBinds: true,
        })
      );
      expect(result?.name).toBe('John Updated');
    });

    it('should generate Oracle-compatible soft DELETE queries', async () => {
      // RED: 測試Oracle軟刪除語法
      mockQueryExecutor.executeQuery.mockResolvedValue({
        success: true,
        data: [{ ROWS_AFFECTED: 1 }],
      });

      const result = await userRepository.delete('1');

      expect(mockQueryExecutor.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET is_active = :is_active'),
        expect.objectContaining({
          is_active: 0,
          updated_at: expect.any(Date),
          id: '1',
        }),
        expect.objectContaining({
          convertSyntax: true,
          convertBinds: true,
        })
      );
      expect(result).toBe(true);
    });
  });

  describe('Oracle分頁查詢機制', () => {
    it('should implement Oracle OFFSET/FETCH pagination', async () => {
      // RED: 測試Oracle分頁機制
      const mockUsers = [
        {
          ID: '1',
          NAME: 'User 1',
          EMAIL: 'user1@test.com',
          IS_ACTIVE: 1,
          CREATED_AT: new Date(),
          UPDATED_AT: new Date(),
        },
        {
          ID: '2',
          NAME: 'User 2',
          EMAIL: 'user2@test.com',
          IS_ACTIVE: 1,
          CREATED_AT: new Date(),
          UPDATED_AT: new Date(),
        },
      ];

      // Mock count query
      mockQueryExecutor.executeQuery
        .mockResolvedValueOnce({
          success: true,
          data: [{ COUNT: 50 }],
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockUsers,
        });

      const options: FindOptions = {
        page: 2,
        pageSize: 10,
        sortBy: 'name',
        sortOrder: 'ASC',
      };

      const result = await userRepository.findMany(options);

      expect(result.success).toBe(true);
      expect(result.data?.pagination.page).toBe(2);
      expect(result.data?.pagination.pageSize).toBe(10);
      expect(result.data?.pagination.total).toBe(50);
      expect(result.data?.pagination.totalPages).toBe(5);

      // 驗證分頁查詢使用OFFSET/FETCH語法
      expect(mockQueryExecutor.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('OFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY'),
        expect.any(Object),
        expect.objectContaining({
          convertSyntax: true,
          convertBinds: true,
        })
      );
    });

    it('should support Oracle ROWNUM pagination for legacy compatibility', async () => {
      // RED: 測試ROWNUM分頁（舊版相容性）
      const mockUsers = [
        {
          ID: '1',
          NAME: 'User 1',
          EMAIL: 'user1@test.com',
          IS_ACTIVE: 1,
          CREATED_AT: new Date(),
          UPDATED_AT: new Date(),
        },
      ];

      mockQueryExecutor.executeQuery
        .mockResolvedValueOnce({ success: true, data: [{ COUNT: 25 }] })
        .mockResolvedValueOnce({ success: true, data: mockUsers });

      const options: FindOptions = {
        page: 1,
        pageSize: 20,
        useRownum: true, // 使用ROWNUM分頁
      };

      const result = await userRepository.findMany(options);

      expect(result.success).toBe(true);
      expect(mockQueryExecutor.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('ROWNUM'),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle large result sets with cursor-based pagination', async () => {
      // RED: 測試基於遊標的分頁
      const mockCursorResult = {
        success: true,
        rows: [
          {
            ID: '1',
            NAME: 'User 1',
            EMAIL: 'user1@test.com',
            IS_ACTIVE: 1,
            CREATED_AT: new Date(),
            UPDATED_AT: new Date(),
          },
        ],
        hasMore: true,
        cursor: 'cursor_token_123',
      };

      mockQueryExecutor.executeQueryWithCursor.mockResolvedValue(
        mockCursorResult
      );

      const result = await userRepository.findWithCursor({
        pageSize: 1000,
        cursor: undefined,
      });

      expect(result.success).toBe(true);
      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBe('cursor_token_123');
      expect(mockQueryExecutor.executeQueryWithCursor).toHaveBeenCalled();
    });
  });

  describe('Oracle JSON查詢功能', () => {
    it('should support JSON_VALUE queries for extracting JSON fields', async () => {
      // RED: 測試JSON_VALUE查詢
      const mockUsers = [
        {
          ID: '1',
          NAME: 'John',
          METADATA: '{"role":"admin","department":"IT"}',
          IS_ACTIVE: 1,
          CREATED_AT: new Date(),
          UPDATED_AT: new Date(),
        },
      ];

      mockQueryExecutor.executeQuery.mockResolvedValue({
        success: true,
        data: mockUsers,
      });

      const jsonOptions: JsonQueryOptions = {
        jsonField: 'metadata',
        jsonPath: '$.role',
        operator: '=',
        value: 'admin',
      };

      const result = await userRepository.findByJsonQuery(jsonOptions);

      expect(result.success).toBe(true);
      expect(mockQueryExecutor.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("JSON_VALUE(metadata, '$.role') = :jsonValue"),
        expect.objectContaining({
          jsonValue: 'admin',
        }),
        expect.objectContaining({
          convertSyntax: true,
          convertBinds: true,
        })
      );
    });

    it('should support JSON_EXISTS queries for checking JSON structure', async () => {
      // RED: 測試JSON_EXISTS查詢
      const mockUsers = [
        {
          ID: '1',
          NAME: 'John',
          METADATA: '{"permissions":["read","write"]}',
          IS_ACTIVE: 1,
          CREATED_AT: new Date(),
          UPDATED_AT: new Date(),
        },
      ];

      mockQueryExecutor.executeQuery.mockResolvedValue({
        success: true,
        data: mockUsers,
      });

      const jsonOptions: JsonQueryOptions = {
        jsonField: 'metadata',
        jsonPath: '$.permissions[*]?(@ == "admin")',
        operator: 'EXISTS',
      };

      const result = await userRepository.findByJsonQuery(jsonOptions);

      expect(result.success).toBe(true);
      expect(mockQueryExecutor.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining(
          'JSON_EXISTS(metadata, \'$.permissions[*]?(@ == "admin")\')'
        ),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should support complex JSON queries with multiple conditions', async () => {
      // RED: 測試複雜JSON查詢
      const complexJsonOptions: JsonQueryOptions[] = [
        {
          jsonField: 'metadata',
          jsonPath: '$.role',
          operator: '=',
          value: 'manager',
        },
        {
          jsonField: 'metadata',
          jsonPath: '$.department',
          operator: 'IN',
          value: ['IT', 'HR'],
        },
      ];

      mockQueryExecutor.executeQuery.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await userRepository.findByMultipleJsonQueries(
        complexJsonOptions,
        'AND'
      );

      expect(result.success).toBe(true);
      expect(mockQueryExecutor.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("JSON_VALUE(metadata, '$.role') = :jsonValue0"),
        expect.objectContaining({
          jsonValue0: 'manager',
        }),
        expect.any(Object)
      );
    });
  });

  describe('Oracle日期時間處理', () => {
    it('should handle Oracle DATE and TIMESTAMP conversions', async () => {
      // RED: 測試Oracle日期時間轉換
      const testDate = new Date('2023-12-01T10:30:00Z');
      const mockUsers = [
        {
          ID: '1',
          NAME: 'User 1',
          EMAIL: 'user1@test.com',
          CREATED_AT: testDate,
          UPDATED_AT: testDate,
          IS_ACTIVE: 1,
        },
      ];

      mockQueryExecutor.executeQuery.mockResolvedValue({
        success: true,
        data: mockUsers,
      });

      const dateFilter = {
        created_at_from: new Date('2023-12-01'),
        created_at_to: new Date('2023-12-31'),
      };

      const result = await userRepository.findMany({
        filters: dateFilter,
      });

      expect(result.success).toBe(true);
      expect(mockQueryExecutor.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('created_at >= :created_at_from'),
        expect.objectContaining({
          created_at_from: dateFilter.created_at_from,
          created_at_to: dateFilter.created_at_to,
        }),
        expect.any(Object)
      );
    });

    it('should support Oracle date functions in queries', async () => {
      // RED: 測試Oracle日期函數
      mockQueryExecutor.executeQuery.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await userRepository.findByDateRange({
        field: 'created_at',
        range: 'LAST_30_DAYS',
      });

      expect(result.success).toBe(true);
      expect(mockQueryExecutor.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining(
          "created_at >= (SYSTIMESTAMP - INTERVAL '30' DAY)"
        ),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle timezone conversions for Oracle TIMESTAMP WITH TIME ZONE', async () => {
      // RED: 測試時區轉換
      const utcDate = new Date('2023-12-01T10:30:00Z');

      mockQueryExecutor.executeQuery.mockResolvedValue({
        success: true,
        data: [
          {
            ID: '1',
            NAME: 'User 1',
            EMAIL: 'user1@test.com',
            CREATED_AT: utcDate,
            UPDATED_AT: utcDate,
            IS_ACTIVE: 1,
          },
        ],
      });

      const result = await userRepository.findWithTimezone({
        timezone: 'Asia/Taipei',
        dateField: 'created_at',
      });

      expect(result.success).toBe(true);
      expect(mockQueryExecutor.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("AT TIME ZONE 'Asia/Taipei'"),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('Oracle批次操作最佳化', () => {
    it('should use Oracle BULK INSERT for efficient batch creation', async () => {
      // RED: 測試Oracle批次插入最佳化
      const users = [
        { name: 'User 1', email: 'user1@test.com' },
        { name: 'User 2', email: 'user2@test.com' },
        { name: 'User 3', email: 'user3@test.com' },
      ];

      mockQueryExecutor.executeBulkInsert.mockResolvedValue({
        success: true,
        totalProcessed: 3,
        successfulRows: 3,
        failedRows: 0,
        batchCount: 1,
        executionTime: 150,
      });

      const options: BulkOperationOptions = {
        batchSize: 1000,
        enableParallel: true,
        continueOnError: false,
      };

      const result = await userRepository.batchCreate(users, options);

      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(3);
      expect(mockQueryExecutor.executeBulkInsert).toHaveBeenCalledWith(
        'users',
        expect.arrayContaining([
          expect.objectContaining({
            name: 'User 1',
            email: 'user1@test.com',
            is_active: 1,
          }),
        ]),
        expect.objectContaining({
          batchSize: 1000,
          enableParallel: true,
        })
      );
    });

    it('should use Oracle MERGE for efficient upsert operations', async () => {
      // RED: 測試Oracle MERGE操作
      const users = [
        { id: '1', name: 'Updated User 1', email: 'updated1@test.com' },
        { id: '2', name: 'New User 2', email: 'new2@test.com' },
      ];

      mockQueryExecutor.executeMerge.mockResolvedValue({
        success: true,
        totalProcessed: 2,
        successfulRows: 2,
        failedRows: 0,
        batchCount: 1,
        executionTime: 200,
      });

      const result = await userRepository.upsertBatch(
        users,
        ['id'],
        ['name', 'email']
      );

      expect(result.success).toBe(true);
      expect(mockQueryExecutor.executeMerge).toHaveBeenCalledWith(
        'users',
        expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            name: 'Updated User 1',
            email: 'updated1@test.com',
          }),
        ]),
        ['id'],
        ['name', 'email']
      );
    });

    it('should handle batch operations with error recovery', async () => {
      // RED: 測試批次操作錯誤恢復
      const users = [
        { name: 'Valid User', email: 'valid@test.com' },
        { name: 'Invalid User', email: 'duplicate@test.com' }, // 假設會導致錯誤
      ];

      mockQueryExecutor.executeBulkInsert.mockResolvedValue({
        success: false,
        totalProcessed: 2,
        successfulRows: 1,
        failedRows: 1,
        batchCount: 1,
        errors: [
          {
            rowIndex: 1,
            error: {
              code: 'ORA-00001',
              message: 'unique constraint violated',
              type: 'CONSTRAINT_VIOLATION',
              severity: 'ERROR',
            },
          },
        ],
        executionTime: 300,
      });

      const options: BulkOperationOptions = {
        continueOnError: true,
        errorHandling: 'COLLECT_ERRORS',
      };

      const result = await userRepository.batchCreate(users, options);

      expect(result.success).toBe(false);
      expect(result.successfulRows).toBe(1);
      expect(result.failedRows).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should optimize batch operations with Oracle array DML', async () => {
      // RED: 測試Oracle陣列DML最佳化
      const updates = [
        { id: '1', name: 'Updated Name 1' },
        { id: '2', name: 'Updated Name 2' },
        { id: '3', name: 'Updated Name 3' },
      ];

      mockQueryExecutor.executeBulkUpdate.mockResolvedValue({
        success: true,
        totalProcessed: 3,
        successfulRows: 3,
        failedRows: 0,
        batchCount: 1,
        executionTime: 120,
      });

      const result = await userRepository.batchUpdate(updates, ['name'], 'id');

      expect(result.success).toBe(true);
      expect(mockQueryExecutor.executeBulkUpdate).toHaveBeenCalledWith(
        'users',
        expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            name: 'Updated Name 1',
            updated_at: expect.any(Date),
          }),
        ]),
        ['name'],
        'id'
      );
    });
  });

  describe('Oracle特有功能支援', () => {
    it('should support Oracle sequences for ID generation', async () => {
      // RED: 測試Oracle序列ID生成
      mockQueryExecutor.executeQuery.mockResolvedValue({
        success: true,
        data: [{ NEXTVAL: 12345 }],
      });

      const nextId = await userRepository.generateSequenceId('users_seq');

      expect(nextId).toBe(12345);
      expect(mockQueryExecutor.executeQuery).toHaveBeenCalledWith(
        'SELECT users_seq.NEXTVAL as NEXTVAL FROM dual',
        {},
        expect.any(Object)
      );
    });

    it('should support Oracle hints for query optimization', async () => {
      // RED: 測試Oracle查詢提示
      mockQueryExecutor.executeQuery.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await userRepository.findManyWithHints({
        hints: ['FIRST_ROWS(10)', 'USE_INDEX(users idx_users_email)'],
      });

      expect(result.success).toBe(true);
      expect(mockQueryExecutor.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining(
          '/*+ FIRST_ROWS(10) USE_INDEX(users idx_users_email) */'
        ),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should support Oracle LOB handling for large data', async () => {
      // RED: 測試Oracle LOB處理
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        large_data: 'x'.repeat(10000), // 大型資料
      };

      mockQueryExecutor.executeQuery.mockResolvedValue({
        success: true,
        data: [
          {
            ID: '1',
            NAME: 'Test User',
            EMAIL: 'test@example.com',
            LARGE_DATA: userData.large_data,
            IS_ACTIVE: 1,
            CREATED_AT: new Date(),
            UPDATED_AT: new Date(),
          },
        ],
      });

      const result = await userRepository.createWithLob(userData);

      expect(result.success).toBe(true);
      expect(mockQueryExecutor.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.objectContaining({
          large_data: userData.large_data,
        }),
        expect.objectContaining({
          lobHandling: true,
        })
      );
    });
  });
});
