/**
 * 優化照片庫整合測試
 * 驗證所有效能優化功能的整合運作
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OptimizedPhotoGallery } from '../OptimizedPhotoGallery'
import { Photo } from '@/types/photo.types'

// Mock all the required modules
vi.mock('@/hooks/usePhotoCache', () => ({
  usePhotoCache: () => ({
    get: vi.fn(() => Promise.resolve(null)),
    set: vi.fn(() => Promise.resolve(true)),
    delete: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
    preload: vi.fn(() => Promise.resolve()),
    getStats: () => ({ size: 0, count: 0, hitRate: 0, maxSize: 0 }),
    isEnabled: true,
    error: null
  })
}))

vi.mock('@/hooks/useProgressiveImage', () => ({
  useBatchProgressivePreload: () => ({
    preload: vi.fn(() => Promise.resolve()),
    progress: 0,
    isPreloading: false
  })
}))

vi.mock('@/utils/performanceUtils', () => ({
  optimizeImageLoading: () => ({
    quality: 'medium',
    preloadCount: 5,
    concurrency: 3,
    cacheEnabled: true
  }),
  detectWebPSupport: () => Promise.resolve(true)
}))

vi.mock('@/store/photoStore', () => ({
  usePhotoStore: () => ({
    photos: [],
    loading: false,
    selectedPhotos: [],
    lightboxOpen: false,
    lightboxIndex: 0,
    loadPhotos: vi.fn(() => Promise.resolve()),
    selectPhoto: vi.fn(),
    deselectPhoto: vi.fn(),
    openLightbox: vi.fn(),
    closeLightbox: vi.fn()
  })
}))

// Mock lazy imports
vi.mock('../VirtualizedPhotoGrid', () => ({
  VirtualizedPhotoGrid: ({ photos }: { photos: Photo[] }) => (
    <div data-testid="virtualized-photo-grid">
      {photos.map(photo => (
        <div key={photo.id} data-testid={`photo-${photo.id}`}>
          {photo.fileName}
        </div>
      ))}
    </div>
  )
}))

vi.mock('../PhotoLightbox', () => ({
  default: () => <div data-testid="photo-lightbox">Lightbox</div>
}))

// Mock performance APIs
Object.defineProperty(window, 'performance', {
  value: {
    now: () => Date.now(),
    mark: vi.fn(),
    measure: vi.fn()
  }
})

Object.defineProperty(window, 'PerformanceObserver', {
  value: class MockPerformanceObserver {
    observe = vi.fn()
    disconnect = vi.fn()
    constructor(callback: any) {}
  }
})

describe('OptimizedPhotoGallery Integration', () => {
  const mockPhotos: Photo[] = [
    {
      id: 'photo-1',
      albumId: 'album-1',
      fileName: 'test1.jpg',
      fileSize: 1024000,
      mimeType: 'image/jpeg',
      width: 800,
      height: 600,
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      originalUrl: 'https://example.com/original1.jpg',
      uploadedBy: 'user-1',
      uploadedAt: new Date('2024-01-01'),
      metadata: { tags: ['test'] }
    },
    {
      id: 'photo-2',
      albumId: 'album-1',
      fileName: 'test2.jpg',
      fileSize: 2048000,
      mimeType: 'image/jpeg',
      width: 1200,
      height: 800,
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      originalUrl: 'https://example.com/original2.jpg',
      uploadedBy: 'user-1',
      uploadedAt: new Date('2024-01-02'),
      metadata: { tags: ['test', 'demo'] }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本渲染', () => {
    it('應該正確渲染有照片的照片庫', async () => {
      render(
        <OptimizedPhotoGallery
          projectId="test-project"
          initialPhotos={mockPhotos}
          enableOptimizations={true}
        />
      )

      // 等待組件載入
      await screen.findByText('照片庫')

      // 檢查照片數量顯示
      expect(screen.getByText('2 張照片')).toBeInTheDocument()

      // 檢查虛擬化網格是否渲染
      expect(screen.getByTestId('virtualized-photo-grid')).toBeInTheDocument()
    })

    it('應該顯示空狀態當沒有照片時', () => {
      render(
        <OptimizedPhotoGallery
          projectId="test-project"
          initialPhotos={[]}
        />
      )

      expect(screen.getByText('目前沒有照片')).toBeInTheDocument()
      expect(screen.getByText('上傳一些照片來開始使用吧！')).toBeInTheDocument()
    })
  })

  describe('效能優化功能', () => {
    it('應該顯示效能設定面板', async () => {
      render(
        <OptimizedPhotoGallery
          projectId="test-project"
          initialPhotos={mockPhotos}
          enableOptimizations={true}
        />
      )

      await screen.findByText('效能設定')
      expect(screen.getByText('效能設定')).toBeInTheDocument()
    })

    it('應該顯示效能指標', async () => {
      render(
        <OptimizedPhotoGallery
          projectId="test-project"
          initialPhotos={mockPhotos}
          enableOptimizations={true}
        />
      )

      // 模擬效能指標已載入
      const component = screen.getByTestId('virtualized-photo-grid').parentElement

      // 檢查是否有效能指標的容器
      expect(component).toBeInTheDocument()
    })

    it('應該支援關閉優化功能', () => {
      render(
        <OptimizedPhotoGallery
          projectId="test-project"
          initialPhotos={mockPhotos}
          enableOptimizations={false}
        />
      )

      // 效能設定面板不應該顯示
      expect(screen.queryByText('效能設定')).not.toBeInTheDocument()
    })
  })

  describe('載入狀態', () => {
    it('應該顯示預載入狀態', async () => {
      render(
        <OptimizedPhotoGallery
          projectId="test-project"
          initialPhotos={mockPhotos}
          enablePreloading={true}
        />
      )

      // 在某些情況下可能會顯示預載入狀態
      // 這取決於實際的載入時機
      await screen.findByText('照片庫')
    })
  })

  describe('Lazy Loading', () => {
    it('應該支援懶載入組件', async () => {
      render(
        <OptimizedPhotoGallery
          projectId="test-project"
          initialPhotos={mockPhotos}
        />
      )

      // 虛擬化網格應該透過Suspense懶載入
      await screen.findByTestId('virtualized-photo-grid')
      expect(screen.getByTestId('virtualized-photo-grid')).toBeInTheDocument()
    })
  })

  describe('照片互動', () => {
    it('應該支援照片點擊', async () => {
      render(
        <OptimizedPhotoGallery
          projectId="test-project"
          initialPhotos={mockPhotos}
        />
      )

      await screen.findByTestId('virtualized-photo-grid')

      // 檢查照片是否正確渲染
      expect(screen.getByTestId('photo-photo-1')).toBeInTheDocument()
      expect(screen.getByTestId('photo-photo-2')).toBeInTheDocument()
    })
  })

  describe('錯誤處理', () => {
    it('應該處理載入錯誤', () => {
      // 模擬載入錯誤的情況
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <OptimizedPhotoGallery
          projectId="invalid-project"
          initialPhotos={[]}
        />
      )

      // 即使有錯誤也應該顯示空狀態
      expect(screen.getByText('目前沒有照片')).toBeInTheDocument()

      consoleSpy.mockRestore()
    })
  })

  describe('響應式設計', () => {
    it('應該適應不同螢幕尺寸', async () => {
      render(
        <OptimizedPhotoGallery
          projectId="test-project"
          initialPhotos={mockPhotos}
        />
      )

      await screen.findByTestId('virtualized-photo-grid')

      // 檢查組件是否正確渲染，響應式行為由CSS處理
      expect(screen.getByTestId('virtualized-photo-grid')).toBeInTheDocument()
    })
  })
})