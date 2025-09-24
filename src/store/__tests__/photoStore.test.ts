/**
 * PhotoStore 測試套件
 * TDD - RED Phase: 失敗的測試案例
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePhotoStore } from '../photoStore';
import { Photo, Album, UploadFile, PhotoFilters } from '@/types/photo.types';

// Mock data
const mockPhoto: Photo = {
  id: 'photo-1',
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
  metadata: {},
};

const mockAlbum: Album = {
  id: 'album-1',
  projectId: 'proj001',
  name: 'Test Album',
  photoCount: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('PhotoStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => usePhotoStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => usePhotoStore());

      expect(result.current.photos).toEqual([]);
      expect(result.current.albums).toEqual([]);
      expect(result.current.currentAlbum).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.filters).toEqual({});
      expect(result.current.searchQuery).toBe('');
      expect(result.current.uploadQueue).toEqual([]);
      expect(result.current.uploadProgress).toEqual({});
    });
  });

  describe('Photos Management', () => {
    it('should set photos', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.setPhotos([mockPhoto]);
      });

      expect(result.current.photos).toHaveLength(1);
      expect(result.current.photos[0]).toEqual(mockPhoto);
    });

    it('should add photo', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.addPhoto(mockPhoto);
      });

      expect(result.current.photos).toHaveLength(1);
      expect(result.current.photos[0]).toEqual(mockPhoto);
    });

    it('should remove photo', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.setPhotos([mockPhoto]);
        result.current.removePhoto('photo-1');
      });

      expect(result.current.photos).toHaveLength(0);
    });
  });

  describe('Albums Management', () => {
    it('should set albums', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.setAlbums([mockAlbum]);
      });

      expect(result.current.albums).toHaveLength(1);
      expect(result.current.albums[0]).toEqual(mockAlbum);
    });

    it('should set current album', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.setCurrentAlbum('album-1');
      });

      expect(result.current.currentAlbum).toBe('album-1');
    });
  });

  describe('Loading and Error States', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);
    });

    it('should set error state', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');
    });

    it('should clear error', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.setError('Test error');
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Filtering and Search', () => {
    it('should set filters', () => {
      const { result } = renderHook(() => usePhotoStore());
      const filters: PhotoFilters = {
        searchQuery: 'test',
        albumId: 'album-1',
      };

      act(() => {
        result.current.setFilters(filters);
      });

      expect(result.current.filters).toEqual(filters);
    });

    it('should set search query', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.setSearchQuery('test query');
      });

      expect(result.current.searchQuery).toBe('test query');
    });

    it('should get filtered photos', () => {
      const { result } = renderHook(() => usePhotoStore());
      const photos = [
        { ...mockPhoto, fileName: 'construction.jpg' },
        { ...mockPhoto, id: 'photo-2', fileName: 'progress.jpg' },
      ];

      act(() => {
        result.current.setPhotos(photos);
        result.current.setSearchQuery('construction');
      });

      const filteredPhotos = result.current.getFilteredPhotos();
      expect(filteredPhotos).toHaveLength(1);
      expect(filteredPhotos[0].fileName).toBe('construction.jpg');
    });
  });

  describe('Upload Queue Management', () => {
    it('should add to upload queue', () => {
      const { result } = renderHook(() => usePhotoStore());
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const uploadFile: UploadFile = {
        id: 'upload-1',
        file,
        projectId: 'proj001',
        metadata: {},
        progress: 0,
        status: 'pending',
      };

      act(() => {
        result.current.addToUploadQueue(uploadFile);
      });

      expect(result.current.uploadQueue).toHaveLength(1);
      expect(result.current.uploadQueue[0]).toEqual(uploadFile);
    });

    it('should update upload progress', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.updateUploadProgress('upload-1', 50);
      });

      expect(result.current.uploadProgress['upload-1']).toBe(50);
    });

    it('should remove from upload queue', () => {
      const { result } = renderHook(() => usePhotoStore());
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const uploadFile: UploadFile = {
        id: 'upload-1',
        file,
        projectId: 'proj001',
        metadata: {},
        progress: 0,
        status: 'pending',
      };

      act(() => {
        result.current.addToUploadQueue(uploadFile);
        result.current.removeFromUploadQueue('upload-1');
      });

      expect(result.current.uploadQueue).toHaveLength(0);
    });
  });

  describe('Store Reset', () => {
    it('should reset store to initial state', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.setPhotos([mockPhoto]);
        result.current.setAlbums([mockAlbum]);
        result.current.setLoading(true);
        result.current.setError('Test error');
        result.current.reset();
      });

      expect(result.current.photos).toEqual([]);
      expect(result.current.albums).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
