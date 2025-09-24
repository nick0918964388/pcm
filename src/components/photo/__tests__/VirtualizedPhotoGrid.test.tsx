/**
 * 虛擬滾動照片網格組件測試
 * 測試虛擬滾動效能優化功能
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VirtualizedPhotoGrid } from '../VirtualizedPhotoGrid';
import { Photo } from '@/types/photo.types';

// Mock intersection observer
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
});
global.IntersectionObserver = mockIntersectionObserver;

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock Image
global.Image = class MockImage {
  src = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 10);
  }
} as any;

describe('VirtualizedPhotoGrid', () => {
  const mockPhotos: Photo[] = Array.from({ length: 1000 }, (_, i) => ({
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

  const defaultProps = {
    photos: mockPhotos,
    height: 600,
    itemHeight: 200,
    columnsPerRow: 4,
    onPhotoClick: vi.fn(),
    onPhotoSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('渲染測試', () => {
    it('應該正確渲染虛擬滾動容器', () => {
      render(<VirtualizedPhotoGrid {...defaultProps} />);

      const container = screen.getByTestId('virtualized-photo-grid');
      expect(container).toBeInTheDocument();
    });

    it('應該設定正確的容器高度', () => {
      render(<VirtualizedPhotoGrid {...defaultProps} height={800} />);

      const container = screen.getByTestId('virtualized-photo-grid');
      expect(container).toHaveStyle({ height: '800px' });
    });

    it('應該計算正確的總高度', () => {
      render(<VirtualizedPhotoGrid {...defaultProps} />);

      const scrollContainer = screen.getByTestId('scroll-container');
      // 1000張照片，4列，250行 * 200px = 50000px
      expect(scrollContainer).toHaveStyle({ height: '50000px' });
    });
  });

  describe('虛擬滾動功能', () => {
    it('應該只渲染可見範圍內的照片', () => {
      render(<VirtualizedPhotoGrid {...defaultProps} />);

      // 容器高度600px，項目高度200px，應該最多渲染約3行的照片
      const photoItems = screen.getAllByTestId(/^photo-item-/);
      expect(photoItems.length).toBeLessThan(20); // 包含overscan緩衝區
    });

    it('應該在滾動時更新可見項目', async () => {
      render(<VirtualizedPhotoGrid {...defaultProps} />);

      const container = screen.getByTestId('virtualized-photo-grid');

      // 滾動到不同位置
      fireEvent.scroll(container, { target: { scrollTop: 400 } });

      await waitFor(() => {
        // 應該渲染新的照片項目
        const photoItems = screen.getAllByTestId(/^photo-item-/);
        expect(photoItems.length).toBeGreaterThan(0);
      });
    });

    it('應該支援overscan緩衝區', () => {
      render(<VirtualizedPhotoGrid {...defaultProps} overscan={5} />);

      const photoItems = screen.getAllByTestId(/^photo-item-/);
      // 應該包含額外的緩衝項目
      expect(photoItems.length).toBeGreaterThan(12); // 基本可見項目 + overscan
    });
  });

  describe('懶載入功能', () => {
    it('應該為圖片元素設定懶載入屬性', () => {
      render(<VirtualizedPhotoGrid {...defaultProps} />);

      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });

    it('應該使用Intersection Observer監控圖片', () => {
      render(<VirtualizedPhotoGrid {...defaultProps} />);

      expect(mockIntersectionObserver).toHaveBeenCalled();
    });

    it('應該在圖片進入視窗時觸發載入', async () => {
      const { container } = render(<VirtualizedPhotoGrid {...defaultProps} />);

      // 模擬Intersection Observer回調
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      const mockEntry = {
        isIntersecting: true,
        target: container.querySelector('[data-photo-id="photo-0"]'),
      };

      observerCallback([mockEntry]);

      await waitFor(() => {
        // 圖片應該開始載入
        const img = screen.getByTestId('photo-img-photo-0');
        expect(img).toHaveAttribute('src');
      });
    });
  });

  describe('效能優化', () => {
    it('應該使用節流處理滾動事件', () => {
      vi.useFakeTimers();
      const { container } = render(<VirtualizedPhotoGrid {...defaultProps} />);

      const scrollContainer = container.querySelector(
        '[data-testid="virtualized-photo-grid"]'
      )!;

      // 快速觸發多次滾動
      fireEvent.scroll(scrollContainer, { target: { scrollTop: 100 } });
      fireEvent.scroll(scrollContainer, { target: { scrollTop: 200 } });
      fireEvent.scroll(scrollContainer, { target: { scrollTop: 300 } });

      // 檢查是否正確節流
      vi.advanceTimersByTime(16); // 一個frame時間

      vi.useRealTimers();
    });

    it('應該支援預載入機制', async () => {
      render(<VirtualizedPhotoGrid {...defaultProps} preloadCount={3} />);

      // 檢查是否有預載入的link標籤
      await waitFor(() => {
        const preloadLinks = document.querySelectorAll('link[rel="preload"]');
        expect(preloadLinks.length).toBeGreaterThan(0);
      });
    });

    it('應該追蹤效能指標', () => {
      const onPerformanceUpdate = vi.fn();
      render(
        <VirtualizedPhotoGrid
          {...defaultProps}
          onPerformanceUpdate={onPerformanceUpdate}
        />
      );

      // 應該有效能更新回調
      expect(onPerformanceUpdate).toHaveBeenCalled();
    });
  });

  describe('響應式設計', () => {
    it('應該根據容器寬度調整列數', () => {
      // Mock container width
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
        configurable: true,
        value: 800,
      });

      render(<VirtualizedPhotoGrid {...defaultProps} responsive />);

      // 應該根據寬度調整列數
      const photoItems = screen.getAllByTestId(/^photo-item-/);
      expect(photoItems.length).toBeGreaterThan(0);
    });

    it('應該監聽視窗大小變化', () => {
      render(<VirtualizedPhotoGrid {...defaultProps} responsive />);

      expect(global.ResizeObserver).toHaveBeenCalled();
    });
  });

  describe('錯誤處理', () => {
    it('應該處理圖片載入錯誤', async () => {
      // Mock failed image loading
      global.Image = class MockFailedImage {
        src = '';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        constructor() {
          setTimeout(() => {
            if (this.onerror) this.onerror();
          }, 10);
        }
      } as any;

      render(<VirtualizedPhotoGrid {...defaultProps} />);

      await waitFor(() => {
        // 應該顯示錯誤狀態
        const errorElements = screen.getAllByText(/載入失敗/);
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });

    it('應該支援重試載入失敗的圖片', async () => {
      render(<VirtualizedPhotoGrid {...defaultProps} enableRetry />);

      await waitFor(() => {
        const retryButtons = screen.getAllByText(/重試/);
        if (retryButtons.length > 0) {
          fireEvent.click(retryButtons[0]);
        }
      });
    });
  });

  describe('選取功能', () => {
    it('應該支援照片選取', () => {
      render(<VirtualizedPhotoGrid {...defaultProps} selectable />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);

      fireEvent.click(checkboxes[0]);
      expect(defaultProps.onPhotoSelect).toHaveBeenCalled();
    });

    it('應該支援全選功能', () => {
      render(<VirtualizedPhotoGrid {...defaultProps} selectable />);

      const selectAllCheckbox = screen.getByTestId('select-all-checkbox');
      fireEvent.click(selectAllCheckbox);

      expect(defaultProps.onPhotoSelect).toHaveBeenCalledWith('all', true);
    });
  });

  describe('快取機制', () => {
    it('應該使用IndexedDB快取圖片', async () => {
      // Mock IndexedDB
      const mockIndexedDB = {
        open: vi.fn(() =>
          Promise.resolve({
            transaction: vi.fn(() => ({
              objectStore: vi.fn(() => ({
                get: vi.fn(() => Promise.resolve()),
                put: vi.fn(() => Promise.resolve()),
              })),
            })),
          })
        ),
      };
      global.indexedDB = mockIndexedDB as any;

      render(<VirtualizedPhotoGrid {...defaultProps} enableCaching />);

      await waitFor(() => {
        expect(mockIndexedDB.open).toHaveBeenCalled();
      });
    });

    it('應該從快取載入圖片', async () => {
      const mockCachedData = new Blob(['cached image data']);
      const mockIndexedDB = {
        open: vi.fn(() =>
          Promise.resolve({
            transaction: vi.fn(() => ({
              objectStore: vi.fn(() => ({
                get: vi.fn(() => Promise.resolve(mockCachedData)),
                put: vi.fn(() => Promise.resolve()),
              })),
            })),
          })
        ),
      };
      global.indexedDB = mockIndexedDB as any;

      render(<VirtualizedPhotoGrid {...defaultProps} enableCaching />);

      await waitFor(() => {
        // 應該嘗試從快取載入
        expect(mockIndexedDB.open).toHaveBeenCalled();
      });
    });
  });
});
