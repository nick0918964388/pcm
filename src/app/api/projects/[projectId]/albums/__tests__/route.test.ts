/**
 * 相簿管理 API 端點測試
 * TDD: RED Phase - 撰寫失敗的測試
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '../route';
import { OracleConnectionWrapper } from '@/lib/database/oracle-adapter';

// Mock Oracle 連線
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

// Mock Oracle 倉儲工廠
vi.mock('@/lib/repositories/oracle-repository-factory', () => ({
  OracleRepositoryFactory: {
    getInstance: vi.fn().mockReturnValue({
      getAlbumRepository: vi.fn(),
      getProjectRepository: vi.fn(),
    }),
  },
}));

describe('Albums API Routes', () => {
  describe('GET /api/projects/[projectId]/albums', () => {
    it('應該返回專案的相簿列表', async () => {
      // Arrange
      const mockAlbums = [
        {
          id: 'album_1',
          project_id: 'F20P1',
          name: '工地進度照片',
          description: '2024年1月工地進度',
          photo_count: 10,
          tags: ['施工', '進度'],
          created_at: new Date('2024-01-01'),
        },
        {
          id: 'album_2',
          project_id: 'F20P1',
          name: '品質檢查照片',
          description: '品質檢驗記錄',
          photo_count: 5,
          tags: ['品質', '檢查'],
          created_at: new Date('2024-01-15'),
        },
      ];

      const mockRequest = new NextRequest(
        'http://localhost/api/projects/F20P1/albums'
      );
      const params = { projectId: 'F20P1' };

      // Act
      const response = await GET(mockRequest, {
        params: Promise.resolve(params),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toBe('工地進度照片');
      expect(data.data[1].name).toBe('品質檢查照片');
    });

    it('應該處理專案不存在的情況', async () => {
      // Arrange
      const mockRequest = new NextRequest(
        'http://localhost/api/projects/INVALID/albums'
      );
      const params = { projectId: 'INVALID' };

      // Act
      const response = await GET(mockRequest, {
        params: Promise.resolve(params),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('專案不存在');
    });

    it('應該支援分頁參數', async () => {
      // Arrange
      const mockRequest = new NextRequest(
        'http://localhost/api/projects/F20P1/albums?page=1&limit=10'
      );
      const params = { projectId: 'F20P1' };

      // Act
      const response = await GET(mockRequest, {
        params: Promise.resolve(params),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.meta).toBeDefined();
      expect(data.meta.page).toBe(1);
      expect(data.meta.limit).toBe(10);
    });
  });

  describe('POST /api/projects/[projectId]/albums', () => {
    it('應該建立新相簿並自動建立本地目錄', async () => {
      // Arrange
      const mockRequest = new NextRequest(
        'http://localhost/api/projects/F20P1/albums',
        {
          method: 'POST',
          body: JSON.stringify({
            name: '新工程相簿',
            description: '2024年2月進度',
            tags: ['新建', '測試'],
          }),
        }
      );
      const params = { projectId: 'F20P1' };

      // Act
      const response = await POST(mockRequest, {
        params: Promise.resolve(params),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('新工程相簿');
      expect(data.data.project_id).toBe('F20P1');
      expect(data.data.nfs_path).toContain('uploads/photos/F20P1/新工程相簿');
    });

    it('應該驗證必要欄位', async () => {
      // Arrange
      const mockRequest = new NextRequest(
        'http://localhost/api/projects/F20P1/albums',
        {
          method: 'POST',
          body: JSON.stringify({
            // 缺少 name 欄位
            description: '測試相簿',
          }),
        }
      );
      const params = { projectId: 'F20P1' };

      // Act
      const response = await POST(mockRequest, {
        params: Promise.resolve(params),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('相簿名稱為必填');
    });

    it('應該處理重複的相簿名稱', async () => {
      // Arrange
      const mockRequest = new NextRequest(
        'http://localhost/api/projects/F20P1/albums',
        {
          method: 'POST',
          body: JSON.stringify({
            name: '工地進度照片', // 已存在的名稱
          }),
        }
      );
      const params = { projectId: 'F20P1' };

      // Act
      const response = await POST(mockRequest, {
        params: Promise.resolve(params),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toContain('相簿名稱已存在');
    });

    it('應該驗證使用者權限', async () => {
      // Arrange
      const mockRequest = new NextRequest(
        'http://localhost/api/projects/F20P1/albums',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer invalid_token',
          },
          body: JSON.stringify({
            name: '測試相簿',
          }),
        }
      );
      const params = { projectId: 'F20P1' };

      // Act
      const response = await POST(mockRequest, {
        params: Promise.resolve(params),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('無權限');
    });
  });
});
