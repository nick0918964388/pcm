/**
 * Enhanced Photo Management API Tests - 增強照片管理API測試
 * PUT /api/photos/[id] - 更新照片
 * PATCH /api/photos/[id]/metadata - 更新照片metadata
 *
 * 任務 7.2: 實作照片管理 Oracle API 端點
 * - 擴展現有 /api/photos 端點支援相簿特定操作
 * - 實作照片 metadata 更新和查詢 API
 *
 * 使用 TDD 方法: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type {
  Photo,
  PhotoMetadata,
} from '@/lib/repositories/types/photo.types';

// Mock 所有資料庫相關的模組
vi.mock('@/lib/database/connection', () => ({
  DatabaseConnection: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    close: vi.fn(),
    query: vi.fn(),
  })),
}));

vi.mock('@/lib/database/connection-oracle-wrapper', () => ({
  default: vi.fn(),
  db: vi.fn(),
}));

// Mock Oracle Repository Factory
const mockPhotoRepository = {
  findById: vi.fn(),
  update: vi.fn(),
  updatePhotoMetadata: vi.fn(),
  addPhotoTags: vi.fn(),
  updatePhotoDescription: vi.fn(),
  renamePhoto: vi.fn(),
};

vi.mock('@/lib/repositories/oracle-repository-factory', () => ({
  OracleRepositoryFactory: {
    getPhotoRepository: vi.fn(() => mockPhotoRepository),
  },
}));

// Mock 驗證函數（暫時跳過權限檢查）
vi.mock('@/lib/auth/permissions', () => ({
  verifyPhotoUpdatePermission: vi.fn().mockResolvedValue(true),
}));

// 動態 import 測試的函數
let PUT: any, PATCH: any;

beforeAll(async () => {
  const module = await import('../route');
  PUT = module.PUT;
  PATCH = module.PATCH;
});

describe('增強照片管理API測試 - TDD Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PUT /api/photos/[id] - 更新照片基本資訊', () => {
    it('RED: 應該成功更新照片檔案名稱', async () => {
      // Arrange
      const photoId = 'photo-123';
      const updateRequest = {
        fileName: 'new-photo-name.jpg',
      };

      const existingPhoto: Photo = {
        id: photoId,
        albumId: 'album-456',
        fileName: 'old-photo.jpg',
        filePath: '/uploads/photos/project1/album1/old-photo.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        uploadedBy: 'user-123',
        uploadedAt: new Date('2024-09-24T10:00:00Z'),
        uploadStatus: 'completed',
        metadata: {},
      };

      const updatedPhoto: Photo = {
        ...existingPhoto,
        fileName: updateRequest.fileName,
      };

      mockPhotoRepository.findById.mockResolvedValue(existingPhoto);
      mockPhotoRepository.renamePhoto.mockResolvedValue(updatedPhoto);

      const request = new NextRequest(
        `http://localhost/api/photos/${photoId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateRequest),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Act
      const response = await PUT(request, { params: { id: photoId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.fileName).toBe(updateRequest.fileName);
      expect(mockPhotoRepository.renamePhoto).toHaveBeenCalledWith(
        photoId,
        updateRequest.fileName
      );
    });

    it('RED: 應該回傳 404 當照片不存在時', async () => {
      // Arrange
      const photoId = 'nonexistent-photo';
      const updateRequest = { fileName: 'new-name.jpg' };

      mockPhotoRepository.findById.mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/photos/${photoId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateRequest),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Act
      const response = await PUT(request, { params: { id: photoId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('照片不存在');
    });

    it('RED: 應該驗證檔案名稱格式', async () => {
      // Arrange
      const photoId = 'photo-123';
      const invalidRequest = {
        fileName: '', // 空檔案名稱
      };

      const request = new NextRequest(
        `http://localhost/api/photos/${photoId}`,
        {
          method: 'PUT',
          body: JSON.stringify(invalidRequest),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Act
      const response = await PUT(request, { params: { id: photoId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('檔案名稱不能為空');
    });
  });

  describe('PATCH /api/photos/[id]/metadata - 更新照片 Metadata', () => {
    it('RED: 應該成功更新照片標籤', async () => {
      // Arrange
      const photoId = 'photo-456';
      const metadataUpdate = {
        tags: ['工程', '現場照片', '鋼構'],
      };

      const existingPhoto: Photo = {
        id: photoId,
        albumId: 'album-789',
        fileName: 'construction.jpg',
        filePath: '/uploads/photos/project2/album2/construction.jpg',
        fileSize: 2048000,
        mimeType: 'image/jpeg',
        uploadedBy: 'user-456',
        uploadedAt: new Date('2024-09-24T11:00:00Z'),
        uploadStatus: 'completed',
        metadata: {
          description: '舊描述',
        },
      };

      const updatedPhoto: Photo = {
        ...existingPhoto,
        metadata: {
          ...existingPhoto.metadata,
          tags: metadataUpdate.tags,
        },
      };

      mockPhotoRepository.findById.mockResolvedValue(existingPhoto);
      mockPhotoRepository.updatePhotoMetadata.mockResolvedValue(updatedPhoto);

      const request = new NextRequest(
        `http://localhost/api/photos/${photoId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ metadata: metadataUpdate }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Act
      const response = await PATCH(request, { params: { id: photoId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.metadata.tags).toEqual(metadataUpdate.tags);
      expect(mockPhotoRepository.updatePhotoMetadata).toHaveBeenCalledWith(
        photoId,
        metadataUpdate
      );
    });

    it('RED: 應該成功更新照片描述', async () => {
      // Arrange
      const photoId = 'photo-789';
      const metadataUpdate = {
        description: '工程現場施工進度照片 - 第一階段完成',
      };

      const existingPhoto: Photo = {
        id: photoId,
        albumId: 'album-101',
        fileName: 'progress.jpg',
        filePath: '/uploads/photos/project3/album3/progress.jpg',
        fileSize: 1536000,
        mimeType: 'image/jpeg',
        uploadedBy: 'user-789',
        uploadedAt: new Date('2024-09-24T12:00:00Z'),
        uploadStatus: 'completed',
        metadata: {
          tags: ['工程', '進度'],
        },
      };

      const updatedPhoto: Photo = {
        ...existingPhoto,
        metadata: {
          ...existingPhoto.metadata,
          description: metadataUpdate.description,
        },
      };

      mockPhotoRepository.findById.mockResolvedValue(existingPhoto);
      mockPhotoRepository.updatePhotoMetadata.mockResolvedValue(updatedPhoto);

      const request = new NextRequest(
        `http://localhost/api/photos/${photoId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ metadata: metadataUpdate }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Act
      const response = await PATCH(request, { params: { id: photoId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.metadata.description).toBe(
        metadataUpdate.description
      );
    });

    it('RED: 應該支援 EXIF 資料更新', async () => {
      // Arrange
      const photoId = 'photo-exif';
      const metadataUpdate: Partial<PhotoMetadata> = {
        exif: {
          camera: 'Canon EOS R5',
          lens: 'RF 24-70mm F2.8 L IS USM',
          settings: {
            aperture: 'f/5.6',
            shutterSpeed: '1/250',
            iso: '200',
          },
          dateTime: '2024-09-24T08:30:00.000Z',
        },
      };

      const existingPhoto: Photo = {
        id: photoId,
        albumId: 'album-202',
        fileName: 'drone-aerial.jpg',
        filePath: '/uploads/photos/project4/album4/drone-aerial.jpg',
        fileSize: 4096000,
        mimeType: 'image/jpeg',
        uploadedBy: 'user-101',
        uploadedAt: new Date('2024-09-24T13:00:00Z'),
        uploadStatus: 'completed',
        metadata: {},
      };

      const updatedPhoto: Photo = {
        ...existingPhoto,
        metadata: {
          ...existingPhoto.metadata,
          exif: metadataUpdate.exif,
        },
      };

      mockPhotoRepository.findById.mockResolvedValue(existingPhoto);
      mockPhotoRepository.updatePhotoMetadata.mockResolvedValue(updatedPhoto);

      const request = new NextRequest(
        `http://localhost/api/photos/${photoId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ metadata: metadataUpdate }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Act
      const response = await PATCH(request, { params: { id: photoId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.metadata.exif).toEqual(metadataUpdate.exif);
    });

    it('RED: 應該回傳錯誤當 metadata 格式無效時', async () => {
      // Arrange
      const photoId = 'photo-invalid';
      const invalidMetadata = {
        metadata: {
          tags: 'invalid-not-array', // 標籤應該是陣列
        },
      };

      const request = new NextRequest(
        `http://localhost/api/photos/${photoId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(invalidMetadata),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Act
      const response = await PATCH(request, { params: { id: photoId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('標籤必須是陣列格式');
    });
  });

  describe('Error Handling', () => {
    it('RED: 應該處理 Oracle 資料庫錯誤', async () => {
      // Arrange
      const photoId = 'photo-error';
      const updateRequest = { fileName: 'valid-name.jpg' };

      mockPhotoRepository.findById.mockRejectedValue(
        new Error('Oracle connection failed')
      );

      const request = new NextRequest(
        `http://localhost/api/photos/${photoId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateRequest),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Act
      const response = await PUT(request, { params: { id: photoId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Oracle connection failed');
    });

    it('RED: 應該處理 JSON 解析錯誤', async () => {
      // Arrange
      const photoId = 'photo-json-error';

      const request = new NextRequest(
        `http://localhost/api/photos/${photoId}`,
        {
          method: 'PUT',
          body: 'invalid-json{',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Act
      const response = await PUT(request, { params: { id: photoId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('請求格式無效');
    });
  });
});
