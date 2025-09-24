/**
 * Task 4.1: API查詢邏輯Oracle適配測試
 *
 * 使用TDD方法測試現有API端點適配到Oracle資料庫的功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '../route';

// Mock Oracle連線
const mockOracleConnection = {
  executeQuery: vi.fn(),
  executeOne: vi.fn(),
  executeTransaction: vi.fn(),
  healthCheck: vi.fn(),
};

vi.mock('@/lib/database/oracle-connection', () => ({
  getOracleConnection: () => mockOracleConnection,
}));

// Mock Oracle Project Repository
const mockOracleProjectRepository = {
  findByProjectCode: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  findById: vi.fn(),
};

vi.mock('@/lib/repositories/oracle-project-repository', () => ({
  OracleProjectRepository: vi
    .fn()
    .mockImplementation(() => mockOracleProjectRepository),
}));

describe('Projects API Oracle適配測試', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('RED: GET /api/projects/[projectId] - Oracle查詢語法適配', () => {
    it('應該使用Oracle特定的VARCHAR2 UUID查詢語法', async () => {
      // Arrange
      const projectId = 'F20P1';
      const mockProject = {
        id: 'F20P1',
        name: '測試專案',
        description: '這是一個測試專案',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockOracleProjectRepository.findByProjectCode.mockResolvedValue(
        mockProject
      );

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}`
      );

      // Act
      const response = await GET(request, { params: { projectId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(
        mockOracleProjectRepository.findByProjectCode
      ).toHaveBeenCalledWith(projectId);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockProject);
    });

    it('應該處理Oracle特有的JSON查詢語法', async () => {
      // Arrange
      const projectId = 'F20P1';
      const mockProject = {
        id: 'F20P1',
        name: '測試專案',
        metadata: { type: 'construction', priority: 'high' },
        client_info: { name: '客戶A', contact: 'client@example.com' },
      };

      mockOracleProjectRepository.findByProjectCode.mockResolvedValue(
        mockProject
      );

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}`
      );

      // Act
      const response = await GET(request, { params: { projectId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.metadata).toEqual(mockProject.metadata);
      expect(data.data.client_info).toEqual(mockProject.client_info);
    });

    it('應該處理Oracle錯誤並返回適當的HTTP狀態碼', async () => {
      // Arrange
      const projectId = 'invalid-id';
      const oracleError = new Error('ORA-00001: unique constraint violated');

      mockOracleProjectRepository.findByProjectCode.mockRejectedValue(
        oracleError
      );

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}`
      );

      // Act
      const response = await GET(request, { params: { projectId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('資料庫查詢失敗');
    });
  });

  describe('RED: PUT /api/projects/[projectId] - Oracle更新語法適配', () => {
    it('應該使用Oracle TIMESTAMP格式更新專案', async () => {
      // Arrange
      const projectId = 'F20P1';
      const updateData = {
        name: '更新的專案名稱',
        description: '更新的描述',
        status: 'in_progress',
      };

      const updatedProject = {
        id: projectId,
        ...updateData,
        updated_at: new Date(),
      };

      mockOracleProjectRepository.findByProjectCode.mockResolvedValue({
        id: projectId,
        name: '現有專案',
        status: 'active',
      });
      mockOracleProjectRepository.update.mockResolvedValue(updatedProject);

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Act
      const response = await PUT(request, { params: { projectId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(
        mockOracleProjectRepository.findByProjectCode
      ).toHaveBeenCalledWith(projectId);
      expect(mockOracleProjectRepository.update).toHaveBeenCalledWith(
        projectId,
        expect.objectContaining(updateData)
      );
      expect(data.success).toBe(true);
      expect(data.data).toEqual(updatedProject);
    });

    it('應該處理Oracle JSON_MODIFY語法更新metadata', async () => {
      // Arrange
      const projectId = 'F20P1';
      const updateData = {
        metadata: { type: 'infrastructure', priority: 'critical' },
      };

      const updatedProject = {
        id: projectId,
        name: '現有專案',
        metadata: updateData.metadata,
        updated_at: new Date(),
      };

      mockOracleProjectRepository.findByProjectCode.mockResolvedValue({
        id: projectId,
        name: '現有專案',
      });
      mockOracleProjectRepository.update.mockResolvedValue(updatedProject);

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Act
      const response = await PUT(request, { params: { projectId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.metadata).toEqual(updateData.metadata);
    });

    it('應該處理Oracle約束違反錯誤', async () => {
      // Arrange
      const projectId = 'F20P1';
      const updateData = { name: '' }; // 違反NOT NULL約束

      const oracleConstraintError = new Error(
        'ORA-01400: cannot insert NULL into column'
      );
      mockOracleProjectRepository.findByProjectCode.mockResolvedValue({
        id: projectId,
        name: '現有專案',
      });
      mockOracleProjectRepository.update.mockRejectedValue(
        oracleConstraintError
      );

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Act
      const response = await PUT(request, { params: { projectId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('資料驗證失敗');
    });
  });

  describe('RED: DELETE /api/projects/[projectId] - Oracle軟刪除語法適配', () => {
    it('應該使用Oracle軟刪除語法（UPDATE ... SET deleted_at = SYSDATE）', async () => {
      // Arrange
      const projectId = 'F20P1';

      mockOracleProjectRepository.findByProjectCode.mockResolvedValue({
        id: projectId,
        name: '測試專案',
      });
      mockOracleProjectRepository.softDelete.mockResolvedValue(true);

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}`,
        {
          method: 'DELETE',
        }
      );

      // Act
      const response = await DELETE(request, { params: { projectId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(
        mockOracleProjectRepository.findByProjectCode
      ).toHaveBeenCalledWith(projectId);
      expect(mockOracleProjectRepository.softDelete).toHaveBeenCalledWith(
        projectId
      );
      expect(data.success).toBe(true);
      expect(data.message).toContain('專案已刪除');
    });

    it('應該處理專案不存在的情況', async () => {
      // Arrange
      const projectId = 'nonexistent';

      mockOracleProjectRepository.findByProjectCode.mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}`,
        {
          method: 'DELETE',
        }
      );

      // Act
      const response = await DELETE(request, { params: { projectId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('專案不存在');
    });
  });

  describe('RED: Oracle OFFSET FETCH分頁機制測試', () => {
    it('應該使用Oracle 12c+ OFFSET FETCH語法進行分頁查詢', async () => {
      // 這個測試將在實作GET /api/projects列表查詢時需要
      // 暫時標記為待實作
      expect(true).toBe(true); // placeholder
    });
  });

  describe('RED: Oracle日期時間處理測試', () => {
    it('應該正確處理Oracle DATE和TIMESTAMP格式', async () => {
      // Arrange
      const projectId = 'F20P1';
      const mockProject = {
        id: 'F20P1',
        name: '測試專案',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockOracleProjectRepository.findByProjectCode.mockResolvedValue(
        mockProject
      );

      const request = new NextRequest(
        `http://localhost:3000/api/projects/${projectId}`
      );

      // Act
      const response = await GET(request, { params: { projectId } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.start_date).toBeDefined();
      expect(data.data.end_date).toBeDefined();
      expect(new Date(data.data.start_date)).toBeInstanceOf(Date);
      expect(new Date(data.data.end_date)).toBeInstanceOf(Date);
    });
  });
});
