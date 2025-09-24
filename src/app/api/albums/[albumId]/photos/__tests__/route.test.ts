/**
 * Album Photos API Tests - 相簿照片API測試
 * POST /api/albums/[albumId]/photos - 批次上傳照片到相簿
 * GET /api/albums/[albumId]/photos - 取得相簿中的照片列表
 *
 * 任務 7.2: 實作照片管理 Oracle API 端點
 * - 實作 /api/albums/[albumId]/photos 批次上傳端點
 *
 * 使用 TDD 方法: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Photo } from '@/lib/repositories/types/photo.types';

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
  getAlbumPhotos: vi.fn(),
  batchCreatePhotos: vi.fn(),
  createPhoto: vi.fn(),
};

const mockAlbumRepository = {
  findById: vi.fn(),
};

const mockChunkedUploadService = {
  uploadBatch: vi.fn(),
};

vi.mock('@/lib/repositories/oracle-repository-factory', () => ({
  OracleRepositoryFactory: {
    getPhotoRepository: vi.fn(() => mockPhotoRepository),
    getAlbumRepository: vi.fn(() => mockAlbumRepository),
  },
}));

vi.mock('@/lib/services/chunked-upload-service', () => ({
  ChunkedUploadService: vi.fn(() => mockChunkedUploadService),
}));

vi.mock('@/lib/storage/local-file-storage', () => ({
  LocalFileStorageService: vi.fn(() => ({
    uploadFile: vi.fn(),
  })),
}));

// 動態 import 測試的函數
let GET: any, POST: any;

beforeAll(async () => {
  const module = await import('../route');
  GET = module.GET;
  POST = module.POST;
});

describe('相簿照片API測試 - TDD Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/albums/[albumId]/photos - 取得相簿照片列表', () => {
    it('RED: 應該成功取得相簿中的照片列表', async () => {
      // Arrange
      const albumId = 'album-123';
      const mockPhotos: Photo[] = [
        {
          id: 'photo-1',
          albumId: albumId,
          fileName: 'construction-1.jpg',
          filePath: '/uploads/photos/project1/album1/construction-1.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          width: 1920,
          height: 1080,
          uploadedBy: 'user-123',
          uploadedAt: new Date('2024-09-24T10:00:00Z'),
          uploadStatus: 'completed',
          metadata: {
            tags: ['工程', '現場'],
            description: '第一階段施工照片',
          },
        },
        {
          id: 'photo-2',
          albumId: albumId,
          fileName: 'progress-2.jpg',
          filePath: '/uploads/photos/project1/album1/progress-2.jpg',
          fileSize: 2048000,
          mimeType: 'image/jpeg',
          width: 2560,
          height: 1440,
          uploadedBy: 'user-456',
          uploadedAt: new Date('2024-09-24T11:00:00Z'),
          uploadStatus: 'completed',
          metadata: {
            tags: ['進度', '鋼構'],
            description: '鋼構架設進度',
          },
        },
      ];

      // Mock 相簿存在檢查
      mockAlbumRepository.findById.mockResolvedValue({
        id: albumId,
        projectId: 'project-123',
        name: '工程施工照片',
      });

      mockPhotoRepository.getAlbumPhotos.mockResolvedValue(mockPhotos);

      const request = new NextRequest(
        `http://localhost/api/albums/${albumId}/photos`,
        {
          method: 'GET',
        }
      );

      // Act
      const response = await GET(request, { params: { albumId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveLength(2);
      expect(responseData.data[0].fileName).toBe('construction-1.jpg');
      expect(responseData.data[1].fileName).toBe('progress-2.jpg');
      expect(mockPhotoRepository.getAlbumPhotos).toHaveBeenCalledWith(albumId);
    });

    it('RED: 應該回傳 404 當相簿不存在時', async () => {
      // Arrange
      const albumId = 'nonexistent-album';

      mockAlbumRepository.findById.mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/albums/${albumId}/photos`,
        {
          method: 'GET',
        }
      );

      // Act
      const response = await GET(request, { params: { albumId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('相簿不存在');
    });

    it('RED: 應該支援分頁查詢', async () => {
      // Arrange
      const albumId = 'album-456';
      const page = 2;
      const limit = 5;

      mockAlbumRepository.findById.mockResolvedValue({
        id: albumId,
        projectId: 'project-456',
        name: '測試相簿',
      });

      mockPhotoRepository.getAlbumPhotos.mockResolvedValue([]);

      const request = new NextRequest(
        `http://localhost/api/albums/${albumId}/photos?page=${page}&limit=${limit}`,
        {
          method: 'GET',
        }
      );

      // Act
      const response = await GET(request, { params: { albumId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.meta).toEqual({
        page: 2,
        limit: 5,
        total: 0,
        totalPages: 0,
      });
    });
  });

  describe('POST /api/albums/[albumId]/photos - 批次上傳照片', () => {
    it('RED: 應該成功批次上傳照片到相簿', async () => {
      // Arrange
      const albumId = 'album-789';
      const uploadFiles = [
        {
          name: 'photo1.jpg',
          size: 1024000,
          type: 'image/jpeg',
        },
        {
          name: 'photo2.png',
          size: 2048000,
          type: 'image/png',
        },
      ];

      const mockUploadResult = {
        successful: [
          {
            id: 'photo-new-1',
            albumId: albumId,
            fileName: 'photo1.jpg',
            filePath: '/uploads/photos/project2/album2/photo1.jpg',
            fileSize: 1024000,
            mimeType: 'image/jpeg',
            uploadedBy: 'user-789',
            uploadedAt: new Date('2024-09-24T12:00:00Z'),
            uploadStatus: 'completed',
            metadata: {},
          },
          {
            id: 'photo-new-2',
            albumId: albumId,
            fileName: 'photo2.png',
            filePath: '/uploads/photos/project2/album2/photo2.png',
            fileSize: 2048000,
            mimeType: 'image/png',
            uploadedBy: 'user-789',
            uploadedAt: new Date('2024-09-24T12:01:00Z'),
            uploadStatus: 'completed',
            metadata: {},
          },
        ],
        failed: [],
        totalProcessed: 2,
        totalSuccess: 2,
        totalFailed: 0,
      };

      // Mock 相簿存在檢查
      mockAlbumRepository.findById.mockResolvedValue({
        id: albumId,
        projectId: 'project-789',
        name: '批次上傳測試相簿',
      });

      mockChunkedUploadService.uploadBatch.mockResolvedValue(mockUploadResult);

      const formData = new FormData();
      uploadFiles.forEach((file, index) => {
        const blob = new Blob(['fake file content'], { type: file.type });
        formData.append('files', blob, file.name);
      });

      const request = new NextRequest(
        `http://localhost/api/albums/${albumId}/photos`,
        {
          method: 'POST',
          body: formData,
        }
      );

      // Act
      const response = await POST(request, { params: { albumId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data.totalSuccess).toBe(2);
      expect(responseData.data.totalFailed).toBe(0);
      expect(responseData.data.successful).toHaveLength(2);
      expect(mockChunkedUploadService.uploadBatch).toHaveBeenCalled();
    });

    it('RED: 應該處理部分成功的批次上傳', async () => {
      // Arrange
      const albumId = 'album-partial';

      const mockUploadResult = {
        successful: [
          {
            id: 'photo-success',
            albumId: albumId,
            fileName: 'success.jpg',
            filePath: '/uploads/photos/project3/album3/success.jpg',
            fileSize: 1024000,
            mimeType: 'image/jpeg',
            uploadedBy: 'user-partial',
            uploadedAt: new Date('2024-09-24T13:00:00Z'),
            uploadStatus: 'completed',
            metadata: {},
          },
        ],
        failed: [
          {
            fileName: 'failed.jpg',
            error: '檔案格式不支援',
            originalIndex: 1,
          },
        ],
        totalProcessed: 2,
        totalSuccess: 1,
        totalFailed: 1,
      };

      mockAlbumRepository.findById.mockResolvedValue({
        id: albumId,
        projectId: 'project-partial',
        name: '部分成功測試相簿',
      });

      mockChunkedUploadService.uploadBatch.mockResolvedValue(mockUploadResult);

      const formData = new FormData();
      const blob1 = new Blob(['success content'], { type: 'image/jpeg' });
      const blob2 = new Blob(['failed content'], { type: 'application/pdf' });
      formData.append('files', blob1, 'success.jpg');
      formData.append('files', blob2, 'failed.jpg');

      const request = new NextRequest(
        `http://localhost/api/albums/${albumId}/photos`,
        {
          method: 'POST',
          body: formData,
        }
      );

      // Act
      const response = await POST(request, { params: { albumId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(207); // Multi-Status
      expect(responseData.success).toBe(true);
      expect(responseData.data.totalSuccess).toBe(1);
      expect(responseData.data.totalFailed).toBe(1);
      expect(responseData.data.failed).toHaveLength(1);
      expect(responseData.data.failed[0].error).toContain('檔案格式不支援');
    });

    it('RED: 應該回傳錯誤當沒有上傳檔案時', async () => {
      // Arrange
      const albumId = 'album-no-files';

      mockAlbumRepository.findById.mockResolvedValue({
        id: albumId,
        projectId: 'project-test',
        name: '無檔案測試相簿',
      });

      const formData = new FormData();
      const request = new NextRequest(
        `http://localhost/api/albums/${albumId}/photos`,
        {
          method: 'POST',
          body: formData,
        }
      );

      // Act
      const response = await POST(request, { params: { albumId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('沒有選擇要上傳的檔案');
    });

    it('RED: 應該回傳 404 當相簿不存在時', async () => {
      // Arrange
      const albumId = 'nonexistent-upload-album';

      mockAlbumRepository.findById.mockResolvedValue(null);

      const formData = new FormData();
      const blob = new Blob(['test'], { type: 'image/jpeg' });
      formData.append('files', blob, 'test.jpg');

      const request = new NextRequest(
        `http://localhost/api/albums/${albumId}/photos`,
        {
          method: 'POST',
          body: formData,
        }
      );

      // Act
      const response = await POST(request, { params: { albumId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('相簿不存在');
    });
  });

  describe('Error Handling', () => {
    it('RED: 應該處理 Oracle 資料庫錯誤', async () => {
      // Arrange
      const albumId = 'album-db-error';

      mockAlbumRepository.findById.mockRejectedValue(
        new Error('Oracle connection failed')
      );

      const request = new NextRequest(
        `http://localhost/api/albums/${albumId}/photos`,
        {
          method: 'GET',
        }
      );

      // Act
      const response = await GET(request, { params: { albumId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Oracle connection failed');
    });
  });
});
