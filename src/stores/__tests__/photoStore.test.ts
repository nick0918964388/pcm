/**
 * PhotoStore 測試套件
 * 測試照片庫狀態管理的所有功能
 */

import { renderHook, act } from '@testing-library/react';
import { usePhotoStore } from '../photoStore';
import type {
  Photo,
  Album,
  UploadFile,
  PhotoFilters,
} from '@/types/photo.types';

describe('PhotoStore', () => {
  beforeEach(() => {
    // 在每個測試前重置 store
    const { result } = renderHook(() => usePhotoStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Store 初始化', () => {
    it('應該正確初始化預設狀態', () => {
      const { result } = renderHook(() => usePhotoStore());

      expect(result.current.photos).toEqual([]);
      expect(result.current.albums).toEqual([]);
      expect(result.current.uploadQueue).toEqual([]);
      expect(result.current.currentAlbumId).toBeNull();
      expect(result.current.filters).toEqual({});
      expect(result.current.viewMode).toBe('grid');
      expect(result.current.sortBy).toBe('uploadedAt');
      expect(result.current.sortOrder).toBe('desc');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('應該提供所有必要的 actions', () => {
      const { result } = renderHook(() => usePhotoStore());

      // 驗證所有必要的 actions 存在
      expect(typeof result.current.setPhotos).toBe('function');
      expect(typeof result.current.addPhoto).toBe('function');
      expect(typeof result.current.removePhoto).toBe('function');
      expect(typeof result.current.updatePhoto).toBe('function');
      expect(typeof result.current.setAlbums).toBe('function');
      expect(typeof result.current.setCurrentAlbum).toBe('function');
      expect(typeof result.current.setFilters).toBe('function');
      expect(typeof result.current.clearFilters).toBe('function');
      expect(typeof result.current.addToUploadQueue).toBe('function');
      expect(typeof result.current.updateUploadProgress).toBe('function');
      expect(typeof result.current.removeFromUploadQueue).toBe('function');
      expect(typeof result.current.setViewMode).toBe('function');
      expect(typeof result.current.setSorting).toBe('function');
      expect(typeof result.current.setLoading).toBe('function');
      expect(typeof result.current.setError).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('照片資料管理', () => {
    const mockPhotos: Photo[] = [
      {
        id: '1',
        projectId: 'proj1',
        albumId: 'album1',
        fileName: 'photo1.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        thumbnailUrl: '/thumb/1.jpg',
        originalUrl: '/orig/1.jpg',
        uploadedBy: 'user1',
        uploadedAt: new Date('2024-01-01'),
        metadata: {
          tags: ['construction', 'foundation'],
          description: 'Foundation work',
        },
      },
      {
        id: '2',
        projectId: 'proj1',
        albumId: 'album1',
        fileName: 'photo2.jpg',
        fileSize: 2048,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        thumbnailUrl: '/thumb/2.jpg',
        originalUrl: '/orig/2.jpg',
        uploadedBy: 'user2',
        uploadedAt: new Date('2024-01-02'),
        metadata: {
          tags: ['construction', 'steel'],
          description: 'Steel frame installation',
        },
      },
    ];

    it('應該能設定照片列表', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.setPhotos(mockPhotos);
      });

      expect(result.current.photos).toEqual(mockPhotos);
    });

    it('應該能新增單張照片', () => {
      const { result } = renderHook(() => usePhotoStore());
      const newPhoto: Photo = mockPhotos[0];

      act(() => {
        result.current.addPhoto(newPhoto);
      });

      expect(result.current.photos).toContainEqual(newPhoto);
      expect(result.current.photos).toHaveLength(1);
    });

    it('應該能移除照片', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.setPhotos(mockPhotos);
      });

      act(() => {
        result.current.removePhoto('1');
      });

      expect(result.current.photos).toHaveLength(1);
      expect(result.current.photos[0].id).toBe('2');
    });

    it('應該能更新照片資訊', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.setPhotos(mockPhotos);
      });

      const updates = {
        metadata: {
          tags: ['construction', 'foundation', 'completed'],
          description: 'Foundation work completed',
        },
      };

      act(() => {
        result.current.updatePhoto('1', updates);
      });

      const updatedPhoto = result.current.photos.find(p => p.id === '1');
      expect(updatedPhoto?.metadata.tags).toContain('completed');
      expect(updatedPhoto?.metadata.description).toBe(
        'Foundation work completed'
      );
    });
  });

  describe('相簿管理', () => {
    const mockAlbums: Album[] = [
      {
        id: 'album1',
        projectId: 'proj1',
        name: '基礎工程',
        description: 'Foundation phase photos',
        coverPhotoId: '1',
        photoCount: 10,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'album2',
        projectId: 'proj1',
        name: '結構工程',
        description: 'Structure phase photos',
        coverPhotoId: '2',
        photoCount: 15,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      },
    ];

    it('應該能設定相簿列表', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.setAlbums(mockAlbums);
      });

      expect(result.current.albums).toEqual(mockAlbums);
    });

    it('應該能設定當前相簿', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.setCurrentAlbum('album1');
      });

      expect(result.current.currentAlbumId).toBe('album1');
    });
  });

  describe('篩選與搜尋', () => {
    it('應該能設定篩選條件', () => {
      const { result } = renderHook(() => usePhotoStore());

      const filters: PhotoFilters = {
        searchQuery: 'foundation',
        tags: ['construction'],
        uploadedBy: 'user1',
        albumId: 'album1',
      };

      act(() => {
        result.current.setFilters(filters);
      });

      expect(result.current.filters).toEqual(filters);
    });

    it('應該能清除所有篩選條件', () => {
      const { result } = renderHook(() => usePhotoStore());

      const filters: PhotoFilters = {
        searchQuery: 'foundation',
        tags: ['construction'],
      };

      act(() => {
        result.current.setFilters(filters);
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual({});
    });

    it('應該能部分更新篩選條件', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.setFilters({
          searchQuery: 'foundation',
          tags: ['construction'],
        });
      });

      act(() => {
        result.current.setFilters({
          searchQuery: 'steel',
        });
      });

      expect(result.current.filters.searchQuery).toBe('steel');
      expect(result.current.filters.tags).toEqual(['construction']);
    });
  });

  describe('上傳佇列管理', () => {
    const mockUploadFile: UploadFile = {
      id: 'upload1',
      file: new File([''], 'test.jpg', { type: 'image/jpeg' }),
      projectId: 'proj1',
      albumId: 'album1',
      metadata: {
        tags: ['test'],
        description: 'Test upload',
      },
      progress: 0,
      status: 'pending',
    };

    it('應該能加入上傳佇列', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.addToUploadQueue(mockUploadFile);
      });

      expect(result.current.uploadQueue).toHaveLength(1);
      expect(result.current.uploadQueue[0]).toEqual(mockUploadFile);
    });

    it('應該能更新上傳進度', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.addToUploadQueue(mockUploadFile);
      });

      act(() => {
        result.current.updateUploadProgress('upload1', 50);
      });

      expect(result.current.uploadQueue[0].progress).toBe(50);
      expect(result.current.uploadQueue[0].status).toBe('uploading');
    });

    it('應該能標記上傳完成', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.addToUploadQueue(mockUploadFile);
      });

      act(() => {
        result.current.updateUploadProgress('upload1', 100);
      });

      expect(result.current.uploadQueue[0].progress).toBe(100);
      expect(result.current.uploadQueue[0].status).toBe('completed');
    });

    it('應該能從佇列中移除', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.addToUploadQueue(mockUploadFile);
      });

      act(() => {
        result.current.removeFromUploadQueue('upload1');
      });

      expect(result.current.uploadQueue).toHaveLength(0);
    });

    it('應該能處理上傳失敗', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.addToUploadQueue(mockUploadFile);
      });

      act(() => {
        result.current.updateUploadProgress('upload1', -1, 'Network error');
      });

      expect(result.current.uploadQueue[0].status).toBe('failed');
      expect(result.current.uploadQueue[0].error).toBe('Network error');
    });
  });

  describe('檢視模式與排序', () => {
    it('應該能切換檢視模式', () => {
      const { result } = renderHook(() => usePhotoStore());

      expect(result.current.viewMode).toBe('grid');

      act(() => {
        result.current.setViewMode('list');
      });

      expect(result.current.viewMode).toBe('list');
    });

    it('應該能設定排序方式', () => {
      const { result } = renderHook(() => usePhotoStore());

      expect(result.current.sortBy).toBe('uploadedAt');
      expect(result.current.sortOrder).toBe('desc');

      act(() => {
        result.current.setSorting('fileName', 'asc');
      });

      expect(result.current.sortBy).toBe('fileName');
      expect(result.current.sortOrder).toBe('asc');
    });
  });

  describe('載入狀態與錯誤處理', () => {
    it('應該能設定載入狀態', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('應該能設定錯誤狀態', () => {
      const { result } = renderHook(() => usePhotoStore());

      act(() => {
        result.current.setError('Failed to load photos');
      });

      expect(result.current.error).toBe('Failed to load photos');

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('快取機制', () => {
    it('應該能快取照片資料', () => {
      const { result } = renderHook(() => usePhotoStore());

      const mockPhotos: Photo[] = [
        {
          id: '1',
          projectId: 'proj1',
          albumId: 'album1',
          fileName: 'photo1.jpg',
          fileSize: 1024,
          mimeType: 'image/jpeg',
          width: 1920,
          height: 1080,
          thumbnailUrl: '/thumb/1.jpg',
          originalUrl: '/orig/1.jpg',
          uploadedBy: 'user1',
          uploadedAt: new Date('2024-01-01'),
          metadata: {},
        },
      ];

      act(() => {
        result.current.setPhotos(mockPhotos);
      });

      // 驗證快取機制 - getFilteredPhotos 應該返回快取結果
      const filtered1 = result.current.getFilteredPhotos();
      const filtered2 = result.current.getFilteredPhotos();

      expect(filtered1).toBe(filtered2); // 相同引用，表示使用快取
    });

    it('應該在資料變更時清除快取', () => {
      const { result } = renderHook(() => usePhotoStore());

      const mockPhotos: Photo[] = [
        {
          id: '1',
          projectId: 'proj1',
          albumId: 'album1',
          fileName: 'photo1.jpg',
          fileSize: 1024,
          mimeType: 'image/jpeg',
          width: 1920,
          height: 1080,
          thumbnailUrl: '/thumb/1.jpg',
          originalUrl: '/orig/1.jpg',
          uploadedBy: 'user1',
          uploadedAt: new Date('2024-01-01'),
          metadata: {},
        },
      ];

      act(() => {
        result.current.setPhotos(mockPhotos);
      });

      const filtered1 = result.current.getFilteredPhotos();

      act(() => {
        result.current.addPhoto({
          ...mockPhotos[0],
          id: '2',
        });
      });

      const filtered2 = result.current.getFilteredPhotos();

      expect(filtered1).not.toBe(filtered2); // 不同引用，快取已清除
    });
  });

  describe('Store 重置', () => {
    it('應該能重置所有狀態到初始值', () => {
      const { result } = renderHook(() => usePhotoStore());

      // 設定一些狀態
      act(() => {
        result.current.setPhotos([
          {
            id: '1',
            projectId: 'proj1',
            albumId: 'album1',
            fileName: 'photo1.jpg',
            fileSize: 1024,
            mimeType: 'image/jpeg',
            width: 1920,
            height: 1080,
            thumbnailUrl: '/thumb/1.jpg',
            originalUrl: '/orig/1.jpg',
            uploadedBy: 'user1',
            uploadedAt: new Date(),
            metadata: {},
          },
        ]);
        result.current.setFilters({ searchQuery: 'test' });
        result.current.setViewMode('list');
        result.current.setLoading(true);
        result.current.setError('Some error');
      });

      // 重置
      act(() => {
        result.current.reset();
      });

      // 驗證所有狀態都已重置
      expect(result.current.photos).toEqual([]);
      expect(result.current.filters).toEqual({});
      expect(result.current.viewMode).toBe('grid');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
