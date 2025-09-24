/**
 * Photo Types 測試套件
 * TDD - RED Phase: 失敗的測試案例
 */

import { describe, it, expect } from 'vitest';
import {
  Photo,
  Album,
  UploadFile,
  PhotoFilters,
  PhotoMetadata,
  UploadResult,
  ApiResponse,
} from '../photo.types';

describe('Photo Types', () => {
  describe('Photo interface', () => {
    it('should create valid photo object', () => {
      const photo: Photo = {
        id: 'test-photo-1',
        projectId: 'proj001',
        albumId: 'album-1',
        fileName: 'test.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        thumbnailUrl: '/thumbnails/test.jpg',
        originalUrl: '/photos/test.jpg',
        uploadedBy: 'user-1',
        uploadedAt: new Date('2024-01-01'),
        metadata: {
          capturedAt: new Date('2024-01-01'),
          description: 'Test photo',
        },
      };

      expect(photo.id).toBe('test-photo-1');
      expect(photo.projectId).toBe('proj001');
      expect(photo.fileSize).toBe(1024000);
      expect(photo.metadata.description).toBe('Test photo');
    });
  });

  describe('Album interface', () => {
    it('should create valid album object', () => {
      const album: Album = {
        id: 'album-1',
        projectId: 'proj001',
        name: 'Test Album',
        photoCount: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      expect(album.id).toBe('album-1');
      expect(album.projectId).toBe('proj001');
      expect(album.photoCount).toBe(0);
    });
  });

  describe('UploadFile interface', () => {
    it('should create valid upload file object', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      const uploadFile: UploadFile = {
        id: 'upload-1',
        file,
        projectId: 'proj001',
        metadata: {},
        progress: 0,
        status: 'pending',
      };

      expect(uploadFile.id).toBe('upload-1');
      expect(uploadFile.file.name).toBe('test.jpg');
      expect(uploadFile.status).toBe('pending');
    });
  });

  describe('PhotoFilters interface', () => {
    it('should create valid photo filters object', () => {
      const filters: PhotoFilters = {
        searchQuery: 'test',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        },
        tags: ['construction', 'progress'],
        albumId: 'album-1',
      };

      expect(filters.searchQuery).toBe('test');
      expect(filters.tags).toContain('construction');
      expect(filters.dateRange?.start).toEqual(new Date('2024-01-01'));
    });
  });

  describe('UploadResult interface', () => {
    it('should create valid upload result object for success', () => {
      const result: UploadResult = {
        success: true,
        photoId: 'photo-1',
        thumbnailUrl: '/thumbnails/photo-1.jpg',
        originalUrl: '/photos/photo-1.jpg',
        metadata: {
          capturedAt: new Date('2024-01-01'),
        },
      };

      expect(result.success).toBe(true);
      expect(result.photoId).toBe('photo-1');
      expect(result.errors).toBeUndefined();
    });

    it('should create valid upload result object for failure', () => {
      const result: UploadResult = {
        success: false,
        photoId: '',
        thumbnailUrl: '',
        originalUrl: '',
        metadata: {},
        errors: ['File too large', 'Invalid format'],
      };

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('File too large');
    });
  });

  describe('ApiResponse interface', () => {
    it('should create valid API response for photos list', () => {
      const photos: Photo[] = [
        {
          id: 'photo-1',
          projectId: 'proj001',
          albumId: 'album-1',
          fileName: 'test1.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          width: 1920,
          height: 1080,
          thumbnailUrl: '/thumbnails/test1.jpg',
          originalUrl: '/photos/test1.jpg',
          uploadedBy: 'user-1',
          uploadedAt: new Date('2024-01-01'),
          metadata: {},
        },
      ];

      const response: ApiResponse<Photo[]> = {
        success: true,
        data: photos,
        message: 'Photos retrieved successfully',
        meta: {
          total: 1,
          page: 1,
          limit: 20,
        },
      };

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
      expect(response.meta?.total).toBe(1);
    });
  });
});
