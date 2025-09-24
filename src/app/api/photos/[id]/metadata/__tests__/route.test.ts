/**
 * Photo Metadata API Tests - 照片 Metadata API 測試
 * GET /api/photos/[id]/metadata - 取得照片 metadata
 * PUT /api/photos/[id]/metadata - 完整更新照片 metadata
 * PATCH /api/photos/[id]/metadata - 部分更新照片 metadata
 * DELETE /api/photos/[id]/metadata - 清除照片 metadata
 *
 * 任務 7.2: 實作照片管理 Oracle API 端點
 * - 實作照片 metadata 更新和查詢 API
 * - 支援 EXIF 資料管理
 * - 支援標籤和描述管理
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
  updatePhotoMetadata: vi.fn(),
  getPhotoMetadata: vi.fn(),
  clearPhotoMetadata: vi.fn(),
  addPhotoTags: vi.fn(),
  removePhotoTags: vi.fn(),
  updatePhotoDescription: vi.fn(),
  updateExifData: vi.fn(),
};

vi.mock('@/lib/repositories/oracle-repository-factory', () => ({
  OracleRepositoryFactory: {
    getPhotoRepository: vi.fn(() => mockPhotoRepository),
  },
}));

// Mock 驗證函數（暫時跳過權限檢查）
vi.mock('@/lib/auth/permissions', () => ({
  verifyPhotoMetadataUpdatePermission: vi.fn().mockResolvedValue(true),
}));

// 動態 import 測試的函數
let GET: any, PUT: any, PATCH: any, DELETE: any;

beforeAll(async () => {
  const module = await import('../route');
  GET = module.GET;
  PUT = module.PUT;
  PATCH = module.PATCH;
  DELETE = module.DELETE;
});

describe('照片 Metadata API 測試 - TDD Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/photos/[id]/metadata - 取得照片 Metadata', () => {
    it('RED: 應該成功取得照片的完整 metadata', async () => {
      // Arrange
      const photoId = 'photo-123';
      const mockMetadata: PhotoMetadata = {
        tags: ['工程', '現場照片', '鋼構'],
        description: '第一階段鋼構架設照片',
        exif: {
          camera: 'Canon EOS R5',
          lens: 'RF 24-70mm F2.8 L IS USM',
          settings: {
            aperture: 'f/5.6',
            shutterSpeed: '1/250',
            iso: '200',
          },
          dateTime: '2024-09-24T08:30:00.000Z',
          location: {
            latitude: 25.033,
            longitude: 121.5654,
            altitude: 15.5,
          },
        },
        customFields: {
          inspector: '張工程師',
          constructionPhase: '第一階段',
          weatherCondition: '晴天',
          temperature: '28°C',
        },
      };

      const mockPhoto: Photo = {
        id: photoId,
        albumId: 'album-456',
        fileName: 'construction-phase1.jpg',
        filePath: '/uploads/photos/project1/album1/construction-phase1.jpg',
        fileSize: 2048000,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        uploadedBy: 'user-123',
        uploadedAt: new Date('2024-09-24T10:00:00Z'),
        uploadStatus: 'completed',
        metadata: mockMetadata,
      };

      mockPhotoRepository.findById.mockResolvedValue(mockPhoto);
      mockPhotoRepository.getPhotoMetadata.mockResolvedValue(mockMetadata);

      const request = new NextRequest(
        `http://localhost/api/photos/${photoId}/metadata`,
        {
          method: 'GET',
        }
      );

      // Act
      const response = await GET(request, { params: { id: photoId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.tags).toEqual(['工程', '現場照片', '鋼構']);
      expect(responseData.data.description).toBe('第一階段鋼構架設照片');
      expect(responseData.data.exif.camera).toBe('Canon EOS R5');
      expect(responseData.data.exif.location.latitude).toBe(25.033);
      expect(responseData.data.customFields.inspector).toBe('張工程師');
      expect(mockPhotoRepository.getPhotoMetadata).toHaveBeenCalledWith(
        photoId
      );
    });

    it('RED: 應該回傳 404 當照片不存在時', async () => {
      // Arrange
      const photoId = 'nonexistent-photo';

      mockPhotoRepository.findById.mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/photos/${photoId}/metadata`,
        {
          method: 'GET',
        }
      );

      // Act
      const response = await GET(request, { params: { id: photoId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('照片不存在');
    });

    it('RED: 應該處理照片沒有 metadata 的情況', async () => {
      // Arrange
      const photoId = 'photo-no-metadata';

      const mockPhoto: Photo = {
        id: photoId,
        albumId: 'album-789',
        fileName: 'simple-photo.jpg',
        filePath: '/uploads/photos/project2/album2/simple-photo.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
        uploadedBy: 'user-456',
        uploadedAt: new Date('2024-09-24T11:00:00Z'),
        uploadStatus: 'completed',
        metadata: {},
      };

      mockPhotoRepository.findById.mockResolvedValue(mockPhoto);
      mockPhotoRepository.getPhotoMetadata.mockResolvedValue({});

      const request = new NextRequest(
        `http://localhost/api/photos/${photoId}/metadata`,
        {
          method: 'GET',
        }
      );

      // Act
      const response = await GET(request, { params: { id: photoId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual({});
    });
  });

  describe('PUT /api/photos/[id]/metadata - 完整更新照片 Metadata', () => {
    it('RED: 應該成功完整更新照片 metadata', async () => {
      // Arrange
      const photoId = 'photo-update';
      const newMetadata: PhotoMetadata = {
        tags: ['建築', '進度', '混凝土'],
        description: '混凝土澆置完成照片',
        exif: {
          camera: 'Nikon D850',
          lens: '24-120mm f/4G ED VR',
          settings: {
            aperture: 'f/8.0',
            shutterSpeed: '1/125',
            iso: '100',
          },
          dateTime: '2024-09-24T14:30:00.000Z',
        },
        customFields: {
          supervisor: '李主管',
          constructionPhase: '第二階段',
          weatherCondition: '陰天',
        },
      };

      const existingPhoto: Photo = {
        id: photoId,
        albumId: 'album-101',
        fileName: 'concrete-pour.jpg',
        filePath: '/uploads/photos/project3/album3/concrete-pour.jpg',
        fileSize: 3072000,
        mimeType: 'image/jpeg',
        uploadedBy: 'user-789',
        uploadedAt: new Date('2024-09-24T12:00:00Z'),
        uploadStatus: 'completed',
        metadata: {
          tags: ['舊標籤'],
        },
      };

      const updatedPhoto: Photo = {
        ...existingPhoto,
        metadata: newMetadata,
      };

      mockPhotoRepository.findById.mockResolvedValue(existingPhoto);
      mockPhotoRepository.updatePhotoMetadata.mockResolvedValue(updatedPhoto);

      const request = new NextRequest(
        `http://localhost/api/photos/${photoId}/metadata`,
        {
          method: 'PUT',
          body: JSON.stringify(newMetadata),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Act
      const response = await PUT(request, { params: { id: photoId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.tags).toEqual(['建築', '進度', '混凝土']);
      expect(responseData.data.description).toBe('混凝土澆置完成照片');
      expect(responseData.data.exif.camera).toBe('Nikon D850');
      expect(responseData.data.customFields.supervisor).toBe('李主管');
      expect(mockPhotoRepository.updatePhotoMetadata).toHaveBeenCalledWith(
        photoId,
        newMetadata,
        { replaceAll: true }
      );
    });

    it('RED: 應該驗證 metadata 格式', async () => {
      // Arrange
      const photoId = 'photo-invalid-format';
      const invalidMetadata = {
        tags: 'invalid-string-instead-of-array', // 應該是陣列
        exif: {
          settings: 'invalid-object', // 應該是物件
        },
      };

      const request = new NextRequest(
        `http://localhost/api/photos/${photoId}/metadata`,
        {
          method: 'PUT',
          body: JSON.stringify(invalidMetadata),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Act
      const response = await PUT(request, { params: { id: photoId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('metadata 格式無效');
    });
  });

  describe('PATCH /api/photos/[id]/metadata - 部分更新照片 Metadata', () => {
    it('RED: 應該成功部分更新照片標籤', async () => {
      // Arrange
      const photoId = 'photo-patch-tags';
      const partialUpdate = {
        tags: ['新標籤1', '新標籤2'],
      };

      const existingPhoto: Photo = {
        id: photoId,
        albumId: 'album-patch',
        fileName: 'patch-test.jpg',
        filePath: '/uploads/photos/project4/album4/patch-test.jpg',
        fileSize: 1536000,
        mimeType: 'image/jpeg',
        uploadedBy: 'user-patch',
        uploadedAt: new Date('2024-09-24T13:00:00Z'),
        uploadStatus: 'completed',
        metadata: {
          tags: ['舊標籤'],
          description: '原有描述',
          customFields: {
            originalField: '保持不變',
          },
        },
      };

      const updatedPhoto: Photo = {
        ...existingPhoto,
        metadata: {
          tags: ['新標籤1', '新標籤2'],
          description: '原有描述', // 保持不變
          customFields: {
            originalField: '保持不變', // 保持不變
          },
        },
      };

      mockPhotoRepository.findById.mockResolvedValue(existingPhoto);
      mockPhotoRepository.updatePhotoMetadata.mockResolvedValue(updatedPhoto);

      const request = new NextRequest(
        `http://localhost/api/photos/${photoId}/metadata`,
        {
          method: 'PATCH',
          body: JSON.stringify(partialUpdate),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Act
      const response = await PATCH(request, { params: { id: photoId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.tags).toEqual(['新標籤1', '新標籤2']);
      expect(responseData.data.description).toBe('原有描述'); // 應該保持不變
      expect(responseData.data.customFields.originalField).toBe('保持不變');
      expect(mockPhotoRepository.updatePhotoMetadata).toHaveBeenCalledWith(
        photoId,
        partialUpdate,
        { replaceAll: false }
      );
    });

    it('RED: 應該支援深層合併 nested 物件', async () => {
      // Arrange
      const photoId = 'photo-deep-merge';
      const partialUpdate = {
        exif: {
          settings: {
            iso: '400', // 只更新 ISO，保持其他設定
          },
          location: {
            latitude: 25.05, // 只更新緯度
          },
        },
      };

      const existingPhoto: Photo = {
        id: photoId,
        albumId: 'album-deep',
        fileName: 'deep-merge.jpg',
        filePath: '/uploads/photos/project5/album5/deep-merge.jpg',
        fileSize: 2048000,
        mimeType: 'image/jpeg',
        uploadedBy: 'user-deep',
        uploadedAt: new Date('2024-09-24T14:00:00Z'),
        uploadStatus: 'completed',
        metadata: {
          exif: {
            camera: 'Sony A7R IV',
            settings: {
              aperture: 'f/4.0',
              shutterSpeed: '1/60',
              iso: '200',
            },
            location: {
              latitude: 25.033,
              longitude: 121.5654,
            },
          },
        },
      };

      const updatedPhoto: Photo = {
        ...existingPhoto,
        metadata: {
          exif: {
            camera: 'Sony A7R IV', // 保持不變
            settings: {
              aperture: 'f/4.0', // 保持不變
              shutterSpeed: '1/60', // 保持不變
              iso: '400', // 已更新
            },
            location: {
              latitude: 25.05, // 已更新
              longitude: 121.5654, // 保持不變
            },
          },
        },
      };

      mockPhotoRepository.findById.mockResolvedValue(existingPhoto);
      mockPhotoRepository.updatePhotoMetadata.mockResolvedValue(updatedPhoto);

      const request = new NextRequest(
        `http://localhost/api/photos/${photoId}/metadata`,
        {
          method: 'PATCH',
          body: JSON.stringify(partialUpdate),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Act
      const response = await PATCH(request, { params: { id: photoId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.exif.camera).toBe('Sony A7R IV'); // 保持不變
      expect(responseData.data.exif.settings.iso).toBe('400'); // 已更新
      expect(responseData.data.exif.settings.aperture).toBe('f/4.0'); // 保持不變
      expect(responseData.data.exif.location.latitude).toBe(25.05); // 已更新
      expect(responseData.data.exif.location.longitude).toBe(121.5654); // 保持不變
    });
  });

  describe('DELETE /api/photos/[id]/metadata - 清除照片 Metadata', () => {
    it('RED: 應該成功清除所有照片 metadata', async () => {
      // Arrange
      const photoId = 'photo-clear-all';

      const existingPhoto: Photo = {
        id: photoId,
        albumId: 'album-clear',
        fileName: 'clear-metadata.jpg',
        filePath: '/uploads/photos/project6/album6/clear-metadata.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
        uploadedBy: 'user-clear',
        uploadedAt: new Date('2024-09-24T15:00:00Z'),
        uploadStatus: 'completed',
        metadata: {
          tags: ['要被清除的標籤'],
          description: '要被清除的描述',
          customFields: {
            fieldToDelete: '要被刪除',
          },
        },
      };

      const clearedPhoto: Photo = {
        ...existingPhoto,
        metadata: {},
      };

      mockPhotoRepository.findById.mockResolvedValue(existingPhoto);
      mockPhotoRepository.clearPhotoMetadata.mockResolvedValue(clearedPhoto);

      const request = new NextRequest(
        `http://localhost/api/photos/${photoId}/metadata`,
        {
          method: 'DELETE',
        }
      );

      // Act
      const response = await DELETE(request, { params: { id: photoId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual({});
      expect(responseData.message).toContain('metadata 已清除');
      expect(mockPhotoRepository.clearPhotoMetadata).toHaveBeenCalledWith(
        photoId,
        undefined
      );
    });

    it('RED: 應該支援選擇性清除特定欄位', async () => {
      // Arrange
      const photoId = 'photo-selective-clear';
      const fieldsToDelete = ['tags', 'customFields'];

      const existingPhoto: Photo = {
        id: photoId,
        albumId: 'album-selective',
        fileName: 'selective-clear.jpg',
        filePath: '/uploads/photos/project7/album7/selective-clear.jpg',
        fileSize: 1536000,
        mimeType: 'image/jpeg',
        uploadedBy: 'user-selective',
        uploadedAt: new Date('2024-09-24T16:00:00Z'),
        uploadStatus: 'completed',
        metadata: {
          tags: ['要刪除'],
          description: '要保留',
          exif: {
            camera: '要保留',
          },
          customFields: {
            toDelete: '要刪除',
          },
        },
      };

      const selectivelyCleared: Photo = {
        ...existingPhoto,
        metadata: {
          description: '要保留', // 保留
          exif: {
            camera: '要保留', // 保留
          },
          // tags 和 customFields 已被刪除
        },
      };

      mockPhotoRepository.findById.mockResolvedValue(existingPhoto);
      mockPhotoRepository.clearPhotoMetadata.mockResolvedValue(
        selectivelyCleared
      );

      const request = new NextRequest(
        `http://localhost/api/photos/${photoId}/metadata?fields=${fieldsToDelete.join(',')}`,
        {
          method: 'DELETE',
        }
      );

      // Act
      const response = await DELETE(request, { params: { id: photoId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.description).toBe('要保留');
      expect(responseData.data.exif.camera).toBe('要保留');
      expect(responseData.data.tags).toBeUndefined();
      expect(responseData.data.customFields).toBeUndefined();
      expect(mockPhotoRepository.clearPhotoMetadata).toHaveBeenCalledWith(
        photoId,
        { fields: fieldsToDelete }
      );
    });
  });

  describe('Error Handling', () => {
    it('RED: 應該處理 Oracle 資料庫錯誤', async () => {
      // Arrange
      const photoId = 'photo-db-error';

      mockPhotoRepository.getPhotoMetadata.mockRejectedValue(
        new Error('Oracle connection failed')
      );

      const request = new NextRequest(
        `http://localhost/api/photos/${photoId}/metadata`,
        {
          method: 'GET',
        }
      );

      // Act
      const response = await GET(request, { params: { id: photoId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Oracle connection failed');
    });

    it('RED: 應該處理無效的 JSON 格式', async () => {
      // Arrange
      const photoId = 'photo-invalid-json';

      const request = new NextRequest(
        `http://localhost/api/photos/${photoId}/metadata`,
        {
          method: 'PUT',
          body: '{ invalid json format',
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
