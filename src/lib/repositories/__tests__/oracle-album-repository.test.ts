/**
 * Oracle相簿倉儲測試
 * Task 2.1: 實作 Oracle 相簿倉儲
 *
 * 遵循 TDD 方法論
 * RED: 撰寫失敗的測試
 * GREEN: 實作最小程式碼讓測試通過
 * REFACTOR: 重構並改善程式碼品質
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OracleAlbumRepository } from '../oracle-album-repository';
import { OracleQueryExecutor } from '../../database/oracle-query-executor';
import { getOracleConnection } from '../../database/oracle-connection';

// 模擬 Oracle 連線
vi.mock('../../database/oracle-connection');

describe('OracleAlbumRepository', () => {
  let repository: OracleAlbumRepository;
  let mockQueryExecutor: OracleQueryExecutor;
  let mockOracleConnection: any;

  beforeEach(() => {
    // 設定模擬的 Oracle 連線
    mockOracleConnection = {
      execute: vi.fn(),
      healthCheck: vi
        .fn()
        .mockResolvedValue({ success: true, data: { isHealthy: true } }),
    };

    vi.mocked(getOracleConnection).mockReturnValue(mockOracleConnection);

    // 建立模擬的查詢執行器
    mockQueryExecutor = {
      execute: vi.fn(),
      executeBatch: vi.fn(),
      withTransaction: vi.fn(),
    } as any;

    // 建立倉儲實例
    repository = new OracleAlbumRepository(mockQueryExecutor);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('建立相簿 (Create Album)', () => {
    it('應該成功建立新相簿', async () => {
      // Arrange
      const albumData = {
        projectId: 'proj001',
        name: '施工進度照片',
        description: '記錄專案各階段施工進度',
        createdBy: 'user123',
      };

      const mockCreatedAlbum = {
        id: 'album001',
        project_id: 'proj001',
        name: '施工進度照片',
        description: '記錄專案各階段施工進度',
        photo_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user123',
      };

      // 模擬插入操作返回新ID
      mockQueryExecutor.execute
        .mockResolvedValueOnce({
          rows: [],
          outBinds: { newId: 'album001' },
        })
        // 模擬查詢新建立的相簿
        .mockResolvedValueOnce({
          rows: [mockCreatedAlbum],
        });

      // Act
      const result = await repository.createAlbum(albumData);

      // Assert
      expect(result).toEqual({
        id: 'album001',
        projectId: 'proj001',
        name: '施工進度照片',
        description: '記錄專案各階段施工進度',
        photoCount: 0,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        createdBy: 'user123',
      });

      // 驗證插入 SQL
      expect(mockQueryExecutor.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO photo_albums'),
        expect.objectContaining({
          project_id: 'proj001',
          name: '施工進度照片',
          description: '記錄專案各階段施工進度',
          created_by: 'user123',
        }),
        {}
      );
    });

    it('應該在專案代碼和相簿名稱重複時拋出錯誤', async () => {
      // Arrange
      const albumData = {
        projectId: 'proj001',
        name: '現有相簿',
        description: '測試重複相簿',
        createdBy: 'user123',
      };

      // 模擬唯一約束違反錯誤
      const oracleError = new Error('ORA-00001: unique constraint violated');
      mockQueryExecutor.execute.mockRejectedValue(oracleError);

      // Act & Assert
      await expect(repository.createAlbum(albumData)).rejects.toThrow(
        '相簿名稱已存在於此專案中'
      );
    });
  });

  describe('查詢專案相簿 (Get Project Albums)', () => {
    it('應該返回指定專案的所有活躍相簿', async () => {
      // Arrange
      const projectId = 'proj001';
      const userId = 'user123';

      const mockAlbumsData = [
        {
          id: 'album001',
          project_id: 'proj001',
          name: '施工進度照片',
          description: '記錄專案各階段施工進度',
          photo_count: 5,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-02'),
          created_by: 'user123',
        },
        {
          id: 'album002',
          project_id: 'proj001',
          name: '品質檢查照片',
          description: '品質控制相關照片',
          photo_count: 3,
          created_at: new Date('2024-01-03'),
          updated_at: new Date('2024-01-04'),
          created_by: 'user456',
        },
      ];

      mockQueryExecutor.execute.mockResolvedValue({
        rows: mockAlbumsData,
      });

      // Act
      const result = await repository.getProjectAlbums(projectId, userId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'album001',
        projectId: 'proj001',
        name: '施工進度照片',
        description: '記錄專案各階段施工進度',
        photoCount: 5,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        createdBy: 'user123',
      });

      // 驗證查詢使用了 active_photo_albums 檢視表
      expect(mockQueryExecutor.execute).toHaveBeenCalledWith(
        expect.stringContaining('FROM active_photo_albums'),
        expect.objectContaining({ projectId }),
        {}
      );
    });

    it('應該在使用者沒有專案權限時返回空陣列', async () => {
      // Arrange
      const projectId = 'proj001';
      const userId = 'unauthorized_user';

      mockQueryExecutor.execute.mockResolvedValue({ rows: [] });

      // Act
      const result = await repository.getProjectAlbums(projectId, userId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('驗證相簿存取權限 (Validate Album Access)', () => {
    it('應該對有權限的使用者返回 true', async () => {
      // Arrange
      const albumId = 'album001';
      const userId = 'user123';
      const action = 'read';

      mockQueryExecutor.execute.mockResolvedValue({
        rows: [{ count: 1 }],
      });

      // Act
      const result = await repository.validateAlbumAccess(
        albumId,
        userId,
        action
      );

      // Assert
      expect(result).toBe(true);

      // 驗證權限檢查 SQL
      expect(mockQueryExecutor.execute).toHaveBeenCalledWith(
        expect.stringContaining('JOIN user_projects'),
        expect.objectContaining({ albumId, userId }),
        {}
      );
    });

    it('應該對無權限的使用者返回 false', async () => {
      // Arrange
      const albumId = 'album001';
      const userId = 'unauthorized_user';
      const action = 'write';

      mockQueryExecutor.execute.mockResolvedValue({
        rows: [{ count: 0 }],
      });

      // Act
      const result = await repository.validateAlbumAccess(
        albumId,
        userId,
        action
      );

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('更新相簿 (Update Album)', () => {
    it('應該成功更新相簿資訊', async () => {
      // Arrange
      const albumId = 'album001';
      const updates = {
        name: '更新後的相簿名稱',
        description: '更新後的描述',
      };

      const mockUpdatedAlbum = {
        id: 'album001',
        project_id: 'proj001',
        name: '更新後的相簿名稱',
        description: '更新後的描述',
        photo_count: 5,
        created_at: new Date('2024-01-01'),
        updated_at: new Date(),
        created_by: 'user123',
      };

      // 模擬更新操作
      mockQueryExecutor.execute
        .mockResolvedValueOnce({ rows: [] })
        // 模擬查詢更新後的相簿
        .mockResolvedValueOnce({ rows: [mockUpdatedAlbum] });

      // Act
      const result = await repository.updateAlbum(albumId, updates);

      // Assert
      expect(result.name).toBe('更新後的相簿名稱');
      expect(result.description).toBe('更新後的描述');

      // 驗證更新 SQL
      expect(mockQueryExecutor.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE photo_albums SET'),
        expect.objectContaining({
          name: '更新後的相簿名稱',
          description: '更新後的描述',
          id: albumId,
        }),
        {}
      );
    });
  });

  describe('安全刪除相簿機制 (Safe Album Deletion)', () => {
    it('應該成功軟刪除空相簿', async () => {
      // Arrange
      const albumId = 'album001';
      const userId = 'user123';

      // 模擬檢查相簿為空（photo_count = 0）
      mockQueryExecutor.execute
        .mockResolvedValueOnce({
          rows: [{ photo_count: 0, project_id: 'proj001', name: '空相簿' }],
        })
        // 模擬軟刪除操作
        .mockResolvedValueOnce({ rows: [{}] });

      // Act
      const result = await repository.deleteAlbum(albumId, userId);

      // Assert
      expect(result).toBe(true);

      // 驗證軟刪除 SQL
      expect(mockQueryExecutor.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE photo_albums SET deleted_at = SYSDATE'),
        expect.objectContaining({ id: albumId }),
        {}
      );
    });

    it('應該拒絕刪除包含照片的相簿', async () => {
      // Arrange
      const albumId = 'album001';
      const userId = 'user123';

      // 模擬檢查相簿包含照片（photo_count > 0）
      mockQueryExecutor.execute.mockResolvedValue({
        rows: [
          { photo_count: 5, project_id: 'proj001', name: '包含照片的相簿' },
        ],
      });

      // Act & Assert
      await expect(repository.deleteAlbum(albumId, userId)).rejects.toThrow(
        '無法刪除包含照片的相簿，請先刪除相簿內的所有照片'
      );
    });

    it('應該在強制刪除時清理所有關聯照片', async () => {
      // Arrange
      const albumId = 'album001';
      const userId = 'user123';
      const forceDelete = true;

      // 模擬檢查相簿包含照片
      mockQueryExecutor.execute
        .mockResolvedValueOnce({
          rows: [
            { photo_count: 3, project_id: 'proj001', name: '要強制刪除的相簿' },
          ],
        })
        // 模擬軟刪除關聯照片
        .mockResolvedValueOnce({ rowsAffected: 3 })
        // 模擬軟刪除相簿
        .mockResolvedValueOnce({ rows: [{}] });

      // Act
      const result = await repository.deleteAlbumWithForce(
        albumId,
        userId,
        forceDelete
      );

      // Assert
      expect(result).toBe(true);

      // 驗證執行了3次SQL調用：檢查相簿、刪除照片、刪除相簿
      expect(mockQueryExecutor.execute).toHaveBeenCalledTimes(3);

      // 驗證刪除照片的 SQL（第二次調用）
      expect(mockQueryExecutor.execute).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE photos'),
        expect.objectContaining({ albumId }),
        {}
      );

      // 驗證軟刪除相簿的 SQL（第三次調用）
      expect(mockQueryExecutor.execute).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('UPDATE photo_albums SET deleted_at = SYSDATE'),
        expect.objectContaining({ id: albumId }),
        {}
      );
    });

    it('應該記錄刪除操作的稽核日誌', async () => {
      // Arrange
      const albumId = 'album001';
      const userId = 'user123';

      // 模擬檢查相簿為空
      mockQueryExecutor.execute
        .mockResolvedValueOnce({
          rows: [{ photo_count: 0, project_id: 'proj001', name: '測試相簿' }],
        })
        // 模擬軟刪除操作
        .mockResolvedValueOnce({ rows: [{}] })
        // 模擬插入稽核日誌
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await repository.deleteAlbumWithAudit(
        albumId,
        userId,
        '刪除測試相簿'
      );

      // Assert
      expect(result).toBe(true);

      // 驗證稽核日誌插入
      expect(mockQueryExecutor.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO album_audit_logs'),
        expect.objectContaining({
          album_id: albumId,
          user_id: userId,
          action: 'DELETE',
          reason: '刪除測試相簿',
        }),
        {}
      );
    });

    it('應該檢查使用者是否有刪除權限', async () => {
      // Arrange
      const albumId = 'album001';
      const userId = 'unauthorized_user';

      // 模擬權限檢查失敗
      mockQueryExecutor.execute.mockResolvedValue({
        rows: [{ count: 0 }],
      });

      // Act & Assert
      await expect(
        repository.deleteAlbumWithPermissionCheck(albumId, userId)
      ).rejects.toThrow('使用者沒有刪除此相簿的權限');

      // 驗證權限檢查 SQL
      expect(mockQueryExecutor.execute).toHaveBeenCalledWith(
        expect.stringContaining('JOIN user_projects'),
        expect.objectContaining({ albumId, userId }),
        {}
      );
    });

    it('應該返回刪除前的相簿資訊供確認', async () => {
      // Arrange
      const albumId = 'album001';

      // 模擬查詢相簿詳細資訊
      mockQueryExecutor.execute.mockResolvedValue({
        rows: [
          {
            id: 'album001',
            project_id: 'proj001',
            name: '要刪除的相簿',
            photo_count: 5,
            created_at: new Date('2024-01-01'),
            created_by: 'user123',
          },
        ],
      });

      // Act
      const result = await repository.getAlbumDeletionInfo(albumId);

      // Assert
      expect(result).toEqual({
        id: 'album001',
        projectId: 'proj001',
        name: '要刪除的相簿',
        photoCount: 5,
        createdAt: expect.any(Date),
        createdBy: 'user123',
        canDelete: false, // 因為包含照片
        warningMessage: '此相簿包含 5 張照片，刪除後無法復原',
      });
    });
  });

  describe('資料映射 (Data Mapping)', () => {
    it('應該正確將 Oracle 行資料映射為相簿實體', () => {
      // Arrange
      const oracleRow = {
        id: 'album001',
        project_id: 'proj001',
        name: '測試相簿',
        description: '測試描述',
        photo_count: 3,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-02'),
        created_by: 'user123',
      };

      // Act
      const result = repository['mapFromOracle'](oracleRow);

      // Assert
      expect(result).toEqual({
        id: 'album001',
        projectId: 'proj001',
        name: '測試相簿',
        description: '測試描述',
        photoCount: 3,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        createdBy: 'user123',
      });
    });

    it('應該正確將相簿實體映射為 Oracle 行資料', () => {
      // Arrange
      const albumEntity = {
        projectId: 'proj001',
        name: '測試相簿',
        description: '測試描述',
        createdBy: 'user123',
      };

      // Act
      const result = repository['mapToOracle'](albumEntity);

      // Assert
      expect(result).toEqual({
        project_id: 'proj001',
        name: '測試相簿',
        description: '測試描述',
        created_by: 'user123',
      });
    });
  });
});
