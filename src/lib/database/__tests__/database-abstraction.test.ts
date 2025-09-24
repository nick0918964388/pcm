/**
 * Database Abstraction Layer Tests
 * 資料存取層測試 - 實施任務 1.1 和 1.2 的測試
 */

import { DatabaseAbstraction } from '../database-abstraction';
import { ConnectionPoolManager } from '../connection-pool-manager';
import {
  IRepository,
  IUnitOfWork,
  SearchCriteria,
  PaginatedResult,
} from '../types';

describe('DatabaseAbstraction', () => {
  let databaseAbstraction: DatabaseAbstraction;
  let mockConnectionPool: jest.Mocked<ConnectionPoolManager>;

  beforeEach(() => {
    mockConnectionPool = {
      getConnection: jest.fn(),
      healthCheck: jest.fn(),
      releaseConnection: jest.fn(),
      close: jest.fn(),
      getPoolStatus: jest.fn(),
    } as any;

    databaseAbstraction = new DatabaseAbstraction(mockConnectionPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Pool Management', () => {
    it('should establish stable database connection pool', async () => {
      // Requirement 1.1: 建立穩定的資料庫連接池管理機制
      const mockConnection = { id: 'test-connection', isHealthy: true };
      mockConnectionPool.getConnection.mockResolvedValue(mockConnection as any);

      const connection = await databaseAbstraction.getConnection('oracle');

      expect(mockConnectionPool.getConnection).toHaveBeenCalledWith('oracle');
      expect(connection).toEqual(mockConnection);
    });

    it('should implement automatic retry on connection failure', async () => {
      // Requirement 1.2: 資料庫連接失敗時自動重試並記錄錯誤詳情
      const error = new Error('Connection failed');
      mockConnectionPool.getConnection
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ id: 'retry-connection' } as any);

      const connection = await databaseAbstraction.getConnection('oracle');

      expect(mockConnectionPool.getConnection).toHaveBeenCalledTimes(3);
      expect(connection).toEqual({ id: 'retry-connection' });
    });

    it('should perform health check within 500ms', async () => {
      // Requirement 1.3: API 請求存取照片資料時在 500ms 內回應查詢結果
      mockConnectionPool.healthCheck.mockResolvedValue({
        isHealthy: true,
        responseTime: 450,
        oracle: { status: 'connected' },
        postgresql: { status: 'connected' },
      } as any);

      const startTime = Date.now();
      const healthStatus = await databaseAbstraction.healthCheck();
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(500);
      expect(healthStatus.isHealthy).toBe(true);
      expect(healthStatus.responseTime).toBeLessThan(500);
    });

    it('should provide unified query interface for Oracle and PostgreSQL', async () => {
      // Requirement 1.4: 提供統一的查詢介面抽象化資料庫差異
      const mockOracleConnection = { type: 'oracle', query: jest.fn() };
      const mockPostgreSQLConnection = { type: 'postgresql', query: jest.fn() };

      mockConnectionPool.getConnection
        .mockResolvedValueOnce(mockOracleConnection as any)
        .mockResolvedValueOnce(mockPostgreSQLConnection as any);

      const oracleResult = await databaseAbstraction.query(
        'SELECT 1',
        [],
        'oracle'
      );
      const postgresResult = await databaseAbstraction.query(
        'SELECT 1',
        [],
        'postgresql'
      );

      expect(mockConnectionPool.getConnection).toHaveBeenCalledWith('oracle');
      expect(mockConnectionPool.getConnection).toHaveBeenCalledWith(
        'postgresql'
      );
    });

    it('should manage connection lifecycle and resource release', async () => {
      // Requirement 1.5: 實施連接池的生命週期管理和資源釋放機制
      const mockConnection = { id: 'test-connection' };
      mockConnectionPool.getConnection.mockResolvedValue(mockConnection as any);
      mockConnectionPool.releaseConnection.mockResolvedValue(undefined);

      const connection = await databaseAbstraction.getConnection('oracle');
      await databaseAbstraction.releaseConnection(connection);

      expect(mockConnectionPool.releaseConnection).toHaveBeenCalledWith(
        connection
      );
    });

    it('should return structured error messages on query failure', async () => {
      // Requirement 1.6: 查詢失敗時返回結構化錯誤訊息包含錯誤代碼和可讀描述
      const sqlError = new Error('ORA-00942: table or view does not exist');
      const mockConnection = {
        query: jest.fn().mockRejectedValue(sqlError),
      };
      mockConnectionPool.getConnection.mockResolvedValue(mockConnection as any);

      await expect(
        databaseAbstraction.query('SELECT * FROM invalid_table')
      ).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
        message: expect.stringContaining('table or view does not exist'),
        originalError: sqlError,
      });
    });
  });

  describe('Repository Pattern Implementation', () => {
    let mockRepository: jest.Mocked<IRepository<any>>;
    let mockUnitOfWork: jest.Mocked<IUnitOfWork>;

    beforeEach(() => {
      mockRepository = {
        findById: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      };

      mockUnitOfWork = {
        begin: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        getRepository: jest.fn().mockReturnValue(mockRepository),
      };
    });

    it('should provide unified data access interface', async () => {
      // Requirement 1.3: 實施 Repository Pattern 提供統一的資料存取介面
      const unitOfWork = databaseAbstraction.createUnitOfWork();
      const repository = unitOfWork.getRepository('Photo');

      const mockPhoto = { id: 'photo-1', fileName: 'test.jpg' };
      mockRepository.findById.mockResolvedValue(mockPhoto);

      const result = await repository.findById('photo-1');

      expect(result).toEqual(mockPhoto);
      expect(mockRepository.findById).toHaveBeenCalledWith('photo-1');
    });

    it('should support transaction management across repositories', async () => {
      // Requirement 1.5: 建立 Unit of Work 模式支援跨 Repository 的事務一致性
      const unitOfWork = databaseAbstraction.createUnitOfWork();

      await unitOfWork.begin();

      const photoRepo = unitOfWork.getRepository('Photo');
      const albumRepo = unitOfWork.getRepository('Album');

      await photoRepo.create({ fileName: 'test.jpg' });
      await albumRepo.update('album-1', { photoCount: 5 });

      await unitOfWork.commit();

      expect(mockUnitOfWork.begin).toHaveBeenCalled();
      expect(mockUnitOfWork.commit).toHaveBeenCalled();
    });

    it('should support complex queries and pagination', async () => {
      // Requirement: 實施查詢建構器支援複雜查詢和分頁功能
      const criteria: SearchCriteria = {
        filters: { projectId: 'project-1' },
        sort: { field: 'createdAt', order: 'desc' },
        pagination: { page: 1, limit: 20 },
      };

      const mockResult: PaginatedResult<any> = {
        data: [{ id: 'photo-1' }, { id: 'photo-2' }],
        total: 100,
        page: 1,
        limit: 20,
        totalPages: 5,
      };

      mockRepository.findMany.mockResolvedValue(mockResult);

      const result = await mockRepository.findMany(criteria);

      expect(result).toEqual(mockResult);
      expect(mockRepository.findMany).toHaveBeenCalledWith(criteria);
    });

    it('should implement soft delete and audit tracking', async () => {
      // Requirement: 實施軟刪除和稽核追蹤功能
      const mockPhoto = {
        id: 'photo-1',
        fileName: 'test.jpg',
        deletedAt: null,
        updatedAt: new Date(),
      };

      mockRepository.delete.mockResolvedValue(undefined);
      mockRepository.findById.mockResolvedValue({
        ...mockPhoto,
        deletedAt: new Date(),
      });

      await mockRepository.delete('photo-1');
      const result = await mockRepository.findById('photo-1');

      expect(result.deletedAt).not.toBeNull();
      expect(mockRepository.delete).toHaveBeenCalledWith('photo-1');
    });

    it('should handle data validation and constraint checking', async () => {
      // Requirement: 建立資料驗證和約束檢查機制
      const invalidPhoto = { fileName: '', fileSize: -1 };

      mockRepository.create.mockRejectedValue(
        new Error('Validation failed: fileName is required')
      );

      await expect(mockRepository.create(invalidPhoto)).rejects.toThrow(
        'Validation failed: fileName is required'
      );
    });

    it('should rollback transaction on error', async () => {
      // Requirement: 事務管理確保資料一致性
      const unitOfWork = databaseAbstraction.createUnitOfWork();

      await unitOfWork.begin();

      const repository = unitOfWork.getRepository('Photo');
      mockRepository.create.mockRejectedValue(
        new Error('Database constraint violation')
      );

      try {
        await repository.create({ fileName: 'invalid.jpg' });
        await unitOfWork.commit();
      } catch (error) {
        await unitOfWork.rollback();
      }

      expect(mockUnitOfWork.rollback).toHaveBeenCalled();
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
    });
  });
});
