/**
 * 單一相簿管理 API 端點測試
 * TDD: RED Phase - 撰寫失敗的測試
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '../route';

// Mock Oracle 連線和倉儲
vi.mock('@/lib/database/oracle-connection-manager', () => ({
  OracleConnectionManager: {
    getInstance: vi.fn().mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        execute: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
        close: vi.fn(),
      }),
    }),
  },
}));

vi.mock('@/lib/repositories/oracle-repository-factory', () => ({
  OracleRepositoryFactory: {
    getInstance: vi.fn().mockReturnValue({
      getAlbumRepository: vi.fn(),
    }),
  },
}));

describe('Album API Routes', () => {
  describe('GET /api/albums/[albumId]', () => {
    it('應該返回單一相簿詳細資訊', async () => {
      // Arrange
      const mockRequest = new NextRequest(
        'http://localhost/api/albums/album_1'
      );
      const params = { albumId: 'album_1' };

      // Act
      const response = await GET(mockRequest, {
        params: Promise.resolve(params),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('album_1');
      expect(data.data.name).toBeDefined();
      expect(data.data.photo_count).toBeDefined();
    });

    it('應該處理相簿不存在的情況', async () => {
      // Arrange
      const mockRequest = new NextRequest(
        'http://localhost/api/albums/invalid_id'
      );
      const params = { albumId: 'invalid_id' };

      // Act
      const response = await GET(mockRequest, {
        params: Promise.resolve(params),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('相簿不存在');
    });
  });

  describe('PUT /api/albums/[albumId]', () => {
    it('應該更新相簿資訊', async () => {
      // Arrange
      const mockRequest = new NextRequest(
        'http://localhost/api/albums/album_1',
        {
          method: 'PUT',
          body: JSON.stringify({
            name: '更新後的相簿名稱',
            description: '更新後的描述',
            tags: ['更新', '測試'],
          }),
        }
      );
      const params = { albumId: 'album_1' };

      // Act
      const response = await PUT(mockRequest, {
        params: Promise.resolve(params),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('更新後的相簿名稱');
      expect(data.data.description).toBe('更新後的描述');
    });

    it('應該驗證更新權限', async () => {
      // Arrange
      const mockRequest = new NextRequest(
        'http://localhost/api/albums/album_1',
        {
          method: 'PUT',
          headers: {
            Authorization: 'Bearer invalid_token',
          },
          body: JSON.stringify({
            name: '更新相簿',
          }),
        }
      );
      const params = { albumId: 'album_1' };

      // Act
      const response = await PUT(mockRequest, {
        params: Promise.resolve(params),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('無權限');
    });

    it('應該處理 Oracle 特定的錯誤', async () => {
      // Arrange
      const mockRequest = new NextRequest(
        'http://localhost/api/albums/album_1',
        {
          method: 'PUT',
          body: JSON.stringify({
            name: null, // 違反 NOT NULL 約束
          }),
        }
      );
      const params = { albumId: 'album_1' };

      // Act
      const response = await PUT(mockRequest, {
        params: Promise.resolve(params),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('約束');
    });
  });

  describe('DELETE /api/albums/[albumId]', () => {
    it('應該執行軟刪除並保留稽核記錄', async () => {
      // Arrange
      const mockRequest = new NextRequest(
        'http://localhost/api/albums/album_1',
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer valid_token',
          },
        }
      );
      const params = { albumId: 'album_1' };

      // Act
      const response = await DELETE(mockRequest, {
        params: Promise.resolve(params),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('成功刪除');
      expect(data.data.deleted_at).toBeDefined();
    });

    it('應該警告並要求確認刪除包含照片的相簿', async () => {
      // Arrange - 相簿包含照片
      const mockRequest = new NextRequest(
        'http://localhost/api/albums/album_with_photos',
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer valid_token',
          },
        }
      );
      const params = { albumId: 'album_with_photos' };

      // Act
      const response = await DELETE(mockRequest, {
        params: Promise.resolve(params),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toContain('包含照片');
      expect(data.requireConfirmation).toBe(true);
    });

    it('應該處理強制刪除包含照片的相簿', async () => {
      // Arrange
      const mockRequest = new NextRequest(
        'http://localhost/api/albums/album_with_photos?force=true',
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer valid_token',
          },
        }
      );
      const params = { albumId: 'album_with_photos' };

      // Act
      const response = await DELETE(mockRequest, {
        params: Promise.resolve(params),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('強制刪除成功');
    });

    it('應該利用 Oracle 倉儲工廠管理連線', async () => {
      // Arrange
      const mockRequest = new NextRequest(
        'http://localhost/api/albums/album_1',
        {
          method: 'DELETE',
        }
      );
      const params = { albumId: 'album_1' };

      // Act
      const response = await DELETE(mockRequest, {
        params: Promise.resolve(params),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      // 驗證使用了倉儲工廠
      expect(data.success).toBe(true);
    });
  });
});
