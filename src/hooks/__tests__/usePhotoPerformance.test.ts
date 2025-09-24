/**
 * 照片效能優化Hook測試
 * 測試懶載入、虛擬滾動、快取等效能優化功能
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePhotoPerformance } from '../usePhotoPerformance';
import { Photo } from '@/types/photo.types';

// Mock Intersection Observer
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
});
global.IntersectionObserver = mockIntersectionObserver;

// Mock IndexedDB for caching tests
const mockIndexedDB = {
  open: vi.fn(() =>
    Promise.resolve({
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          get: vi.fn(() => Promise.resolve(undefined)),
          put: vi.fn(() => Promise.resolve()),
          delete: vi.fn(() => Promise.resolve()),
        })),
      })),
    })
  ),
};
global.indexedDB = mockIndexedDB as any;

describe('usePhotoPerformance', () => {
  const mockPhotos: Photo[] = Array.from({ length: 100 }, (_, i) => ({
    id: `photo-${i}`,
    albumId: 'album-1',
    fileName: `image-${i}.jpg`,
    fileSize: 1024 * 1024,
    mimeType: 'image/jpeg',
    width: 800,
    height: 600,
    thumbnailUrl: `https://example.com/thumb-${i}.jpg`,
    originalUrl: `https://example.com/original-${i}.jpg`,
    uploadedBy: 'user-1',
    uploadedAt: new Date(`2024-01-${(i % 30) + 1}`),
    metadata: {
      tags: [`tag-${i % 5}`],
      description: `Photo ${i}`,
    },
  }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('懶載入機制', () => {
    it('應該初始化時不載入任何圖片', () => {
      const { result } = renderHook(() =>
        usePhotoPerformance({
          photos: mockPhotos,
          containerHeight: 600,
          itemHeight: 200,
          threshold: 0.1,
        })
      );

      expect(result.current.visiblePhotos).toHaveLength(0);
      expect(result.current.loadedImages).toEqual(new Set());
    });

    it('應該在元素進入視窗時觸發載入', () => {
      const { result } = renderHook(() =>
        usePhotoPerformance({
          photos: mockPhotos,
          containerHeight: 600,
          itemHeight: 200,
          threshold: 0.1,
        })
      );

      act(() => {
        // 模擬Intersection Observer觸發
        const mockEntry = {
          isIntersecting: true,
          target: { dataset: { photoId: 'photo-0' } },
        };
        result.current.handleIntersection([mockEntry as any]);
      });

      expect(result.current.loadedImages.has('photo-0')).toBe(true);
    });

    it('應該支援預載入機制', () => {
      const { result } = renderHook(() =>
        usePhotoPerformance({
          photos: mockPhotos,
          containerHeight: 600,
          itemHeight: 200,
          threshold: 0.1,
          preloadCount: 3,
        })
      );

      act(() => {
        // 當前圖片進入視窗
        const mockEntry = {
          isIntersecting: true,
          target: { dataset: { photoId: 'photo-5' } },
        };
        result.current.handleIntersection([mockEntry as any]);
      });

      // 應該預載入下3張圖片
      expect(result.current.preloadedImages.has('photo-6')).toBe(true);
      expect(result.current.preloadedImages.has('photo-7')).toBe(true);
      expect(result.current.preloadedImages.has('photo-8')).toBe(true);
    });
  });

  describe('虛擬滾動', () => {
    it('應該計算可見範圍內的照片', () => {
      const { result } = renderHook(() =>
        usePhotoPerformance({
          photos: mockPhotos,
          containerHeight: 600,
          itemHeight: 200,
          columnsPerRow: 4,
        })
      );

      act(() => {
        result.current.handleScroll(0); // 滾動到頂部
      });

      // 容器高度600，項目高度200，應該顯示約3行 * 4列 = 12個項目
      expect(result.current.visiblePhotos.length).toBeLessThanOrEqual(16); // 包含緩衝區
    });

    it('應該在滾動時更新可見範圍', () => {
      const { result } = renderHook(() =>
        usePhotoPerformance({
          photos: mockPhotos,
          containerHeight: 600,
          itemHeight: 200,
          columnsPerRow: 4,
        })
      );

      act(() => {
        result.current.handleScroll(0);
      });
      const initialVisible = result.current.visiblePhotos.length;

      act(() => {
        result.current.handleScroll(400); // 滾動400px
      });
      const afterScrollVisible = result.current.visiblePhotos.length;

      expect(afterScrollVisible).toBeGreaterThan(0);
      // 可見項目數量應該保持在合理範圍內
      expect(Math.abs(afterScrollVisible - initialVisible)).toBeLessThan(20);
    });

    it('應該計算正確的容器總高度', () => {
      const { result } = renderHook(() =>
        usePhotoPerformance({
          photos: mockPhotos,
          containerHeight: 600,
          itemHeight: 200,
          columnsPerRow: 4,
        })
      );

      // 100張照片，4列，應該是25行 * 200px = 5000px
      expect(result.current.totalHeight).toBe(5000);
    });
  });

  describe('快取機制', () => {
    it('應該檢查快取中的圖片', async () => {
      const { result } = renderHook(() =>
        usePhotoPerformance({
          photos: mockPhotos,
          containerHeight: 600,
          itemHeight: 200,
          enableCaching: true,
        })
      );

      await act(async () => {
        await result.current.checkCache('photo-0');
      });

      expect(mockIndexedDB.open).toHaveBeenCalled();
    });

    it('應該將載入的圖片存入快取', async () => {
      const { result } = renderHook(() =>
        usePhotoPerformance({
          photos: mockPhotos,
          containerHeight: 600,
          itemHeight: 200,
          enableCaching: true,
        })
      );

      const mockImageData = new Blob(['image data']);

      await act(async () => {
        await result.current.cacheImage('photo-0', mockImageData);
      });

      expect(mockIndexedDB.open).toHaveBeenCalled();
    });

    it('應該支援快取清理機制', async () => {
      const { result } = renderHook(() =>
        usePhotoPerformance({
          photos: mockPhotos,
          containerHeight: 600,
          itemHeight: 200,
          enableCaching: true,
          maxCacheSize: 50 * 1024 * 1024, // 50MB
        })
      );

      await act(async () => {
        await result.current.clearOldCache();
      });

      expect(mockIndexedDB.open).toHaveBeenCalled();
    });
  });

  describe('漸進式載入', () => {
    it('應該支援漸進式JPEG載入', () => {
      const { result } = renderHook(() =>
        usePhotoPerformance({
          photos: mockPhotos,
          containerHeight: 600,
          itemHeight: 200,
          enableProgressiveLoading: true,
        })
      );

      expect(result.current.progressiveLoadingEnabled).toBe(true);
    });

    it('應該追蹤圖片載入進度', () => {
      const { result } = renderHook(() =>
        usePhotoPerformance({
          photos: mockPhotos,
          containerHeight: 600,
          itemHeight: 200,
          enableProgressiveLoading: true,
        })
      );

      act(() => {
        result.current.updateLoadingProgress('photo-0', 50);
      });

      expect(result.current.loadingProgress['photo-0']).toBe(50);
    });
  });

  describe('效能監控', () => {
    it('應該追蹤載入時間', () => {
      const { result } = renderHook(() =>
        usePhotoPerformance({
          photos: mockPhotos,
          containerHeight: 600,
          itemHeight: 200,
          enablePerformanceMonitoring: true,
        })
      );

      act(() => {
        result.current.startLoadTimer('photo-0');
      });

      act(() => {
        result.current.endLoadTimer('photo-0');
      });

      expect(
        result.current.performanceMetrics.loadTimes['photo-0']
      ).toBeGreaterThan(0);
    });

    it('應該追蹤記憶體使用量', () => {
      const { result } = renderHook(() =>
        usePhotoPerformance({
          photos: mockPhotos,
          containerHeight: 600,
          itemHeight: 200,
          enablePerformanceMonitoring: true,
        })
      );

      // 模擬載入圖片
      act(() => {
        result.current.trackMemoryUsage('photo-0', 1024 * 1024); // 1MB
      });

      expect(result.current.performanceMetrics.memoryUsage).toBeGreaterThan(0);
    });

    it('應該計算平均載入時間', () => {
      const { result } = renderHook(() =>
        usePhotoPerformance({
          photos: mockPhotos,
          containerHeight: 600,
          itemHeight: 200,
          enablePerformanceMonitoring: true,
        })
      );

      act(() => {
        result.current.startLoadTimer('photo-0');
        result.current.endLoadTimer('photo-0');
        result.current.startLoadTimer('photo-1');
        result.current.endLoadTimer('photo-1');
      });

      expect(result.current.performanceMetrics.averageLoadTime).toBeGreaterThan(
        0
      );
    });
  });

  describe('錯誤處理', () => {
    it('應該處理圖片載入錯誤', () => {
      const { result } = renderHook(() =>
        usePhotoPerformance({
          photos: mockPhotos,
          containerHeight: 600,
          itemHeight: 200,
        })
      );

      act(() => {
        result.current.handleImageError('photo-0', new Error('載入失敗'));
      });

      expect(result.current.failedImages.has('photo-0')).toBe(true);
    });

    it('應該支援重試機制', () => {
      const { result } = renderHook(() =>
        usePhotoPerformance({
          photos: mockPhotos,
          containerHeight: 600,
          itemHeight: 200,
          maxRetries: 3,
        })
      );

      act(() => {
        result.current.handleImageError('photo-0', new Error('載入失敗'));
      });

      act(() => {
        result.current.retryFailedImage('photo-0');
      });

      expect(result.current.retryCount['photo-0']).toBe(1);
    });
  });
});
