/**
 * PhotoGrid 全面單元測試套件
 * 測試照片網格元件的所有功能和邊界情況
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoGrid } from '../PhotoGrid'
import type { Photo } from '@/types/photo.types'

// Mock hooks
vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn()
}))

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(() => ({ isOnline: true }))
}))

vi.mock('@/hooks/useNetworkSpeed', () => ({
  useNetworkSpeed: vi.fn(() => ({ isSlowNetwork: false, effectiveType: '4g' }))
}))

vi.mock('@/store/photoStore', () => ({
  usePhotoStore: vi.fn(() => ({
    selectAllPhotos: vi.fn(),
    clearSelection: vi.fn()
  }))
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock storage API
Object.defineProperty(navigator, 'storage', {
  value: {
    estimate: vi.fn().mockResolvedValue({
      usage: 50 * 1024 * 1024,
      quota: 100 * 1024 * 1024
    })
  },
  configurable: true
})

describe('PhotoGrid Component', () => {
  const mockPhotos: Photo[] = [
    {
      id: 'photo-1',
      projectId: 'project-1',
      albumId: 'album-1',
      fileName: 'foundation.jpg',
      fileSize: 1024 * 1024,
      mimeType: 'image/jpeg',
      width: 1920,
      height: 1080,
      thumbnailUrl: '/thumb/foundation.jpg',
      originalUrl: '/original/foundation.jpg',
      uploadedBy: 'user-1',
      uploadedAt: new Date('2024-01-01'),
      metadata: {
        tags: ['construction', 'foundation'],
        description: 'Foundation work'
      },
      cached: true
    },
    {
      id: 'photo-2',
      projectId: 'project-1',
      albumId: 'album-1',
      fileName: 'steel-frame.jpg',
      fileSize: 2 * 1024 * 1024,
      mimeType: 'image/jpeg',
      width: 1920,
      height: 1080,
      thumbnailUrl: '/thumb/steel-frame.jpg',
      originalUrl: '/original/steel-frame.jpg',
      uploadedBy: 'user-2',
      uploadedAt: new Date('2024-01-02'),
      metadata: {
        tags: ['construction', 'steel'],
        description: 'Steel frame installation'
      },
      cached: false
    },
    {
      id: 'photo-3',
      projectId: 'project-1',
      albumId: 'album-2',
      fileName: 'concrete.jpg',
      fileSize: 1.5 * 1024 * 1024,
      mimeType: 'image/jpeg',
      width: 1920,
      height: 1080,
      thumbnailUrl: '/thumb/concrete.jpg',
      originalUrl: '/original/concrete.jpg',
      uploadedBy: 'user-1',
      uploadedAt: new Date('2024-01-03'),
      metadata: {
        tags: ['construction', 'concrete', 'quality'],
        description: 'Concrete pouring'
      },
      cached: true
    }
  ]

  const defaultProps = {
    photos: mockPhotos,
    selectedPhotos: [],
    loading: false,
    error: null,
    onPhotoClick: vi.fn(),
    onPhotoSelect: vi.fn(),
    onPhotoDownload: vi.fn(),
    onPhotoDelete: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset media query mocks
    const { useMediaQuery } = require('@/hooks/useMediaQuery')
    useMediaQuery.mockReturnValue(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render photo grid with photos', () => {
      render(<PhotoGrid {...defaultProps} />)

      expect(screen.getByTestId('photo-grid')).toBeInTheDocument()
      expect(screen.getAllByTestId('photo-thumbnail')).toHaveLength(3)
    })

    it('should display photo information correctly', () => {
      render(<PhotoGrid {...defaultProps} />)

      expect(screen.getByText('foundation.jpg')).toBeInTheDocument()
      expect(screen.getByText('steel-frame.jpg')).toBeInTheDocument()
      expect(screen.getByText('concrete.jpg')).toBeInTheDocument()

      // Check file sizes
      expect(screen.getByText('1.0MB')).toBeInTheDocument()
      expect(screen.getByText('2.0MB')).toBeInTheDocument()
      expect(screen.getByText('1.5MB')).toBeInTheDocument()
    })

    it('should display tags for photos', () => {
      render(<PhotoGrid {...defaultProps} />)

      expect(screen.getAllByText('construction')).toHaveLength(3)
      expect(screen.getByText('foundation')).toBeInTheDocument()
      expect(screen.getByText('steel')).toBeInTheDocument()
      expect(screen.getByText('concrete')).toBeInTheDocument()
    })

    it('should show truncated tags with count indicator', () => {
      render(<PhotoGrid {...defaultProps} />)

      // Photo 3 has 3 tags but should only show 2 + count
      const photo3Card = screen.getByText('concrete.jpg').closest('.group')
      expect(photo3Card).toBeInTheDocument()
      expect(screen.getByText('+1')).toBeInTheDocument()
    })
  })

  describe('Selection Functionality', () => {
    it('should handle photo selection', async () => {
      const user = userEvent.setup()
      const mockOnPhotoSelect = vi.fn()

      render(<PhotoGrid {...defaultProps} onPhotoSelect={mockOnPhotoSelect} />)

      const checkboxes = screen.getAllByRole('checkbox')
      const firstPhotoCheckbox = checkboxes[1] // Skip the select-all checkbox

      await user.click(firstPhotoCheckbox)

      expect(mockOnPhotoSelect).toHaveBeenCalledWith('photo-1', true)
    })

    it('should handle select all functionality', async () => {
      const user = userEvent.setup()
      const { usePhotoStore } = require('@/store/photoStore')
      const mockSelectAllPhotos = vi.fn()
      const mockClearSelection = vi.fn()

      usePhotoStore.mockReturnValue({
        selectAllPhotos: mockSelectAllPhotos,
        clearSelection: mockClearSelection
      })

      render(<PhotoGrid {...defaultProps} />)

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
      await user.click(selectAllCheckbox)

      expect(mockSelectAllPhotos).toHaveBeenCalled()
    })

    it('should show selected photos count', () => {
      render(<PhotoGrid {...defaultProps} selectedPhotos={['photo-1', 'photo-2']} />)

      expect(screen.getByText('已選取 2 張照片')).toBeInTheDocument()
    })

    it('should show batch download button when photos are selected', () => {
      render(<PhotoGrid {...defaultProps} selectedPhotos={['photo-1', 'photo-2']} />)

      expect(screen.getByText('下載選取項目 (2)')).toBeInTheDocument()
    })
  })

  describe('Photo Interactions', () => {
    it('should handle photo click', async () => {
      const user = userEvent.setup()
      const mockOnPhotoClick = vi.fn()

      render(<PhotoGrid {...defaultProps} onPhotoClick={mockOnPhotoClick} />)

      const firstPhoto = screen.getAllByTestId('photo-thumbnail')[0]
      await user.click(firstPhoto)

      expect(mockOnPhotoClick).toHaveBeenCalledWith(mockPhotos[0], 0)
    })

    it('should handle photo download from dropdown menu', async () => {
      const user = userEvent.setup()
      const mockOnPhotoDownload = vi.fn()

      render(<PhotoGrid {...defaultProps} onPhotoDownload={mockOnPhotoDownload} />)

      // Hover over first photo to show dropdown
      const firstPhotoCard = screen.getAllByTestId('photo-thumbnail')[0].closest('.group')
      await user.hover(firstPhotoCard!)

      // Find and click the more options button
      const moreButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('[data-testid="more-horizontal"]')
      )
      if (moreButton) {
        await user.click(moreButton)

        const downloadItem = screen.getByText('下載')
        await user.click(downloadItem)

        expect(mockOnPhotoDownload).toHaveBeenCalledWith(mockPhotos[0])
      }
    })

    it('should handle batch download', async () => {
      const user = userEvent.setup()
      const mockOnPhotoDownload = vi.fn()

      render(<PhotoGrid
        {...defaultProps}
        selectedPhotos={['photo-1', 'photo-2']}
        onPhotoDownload={mockOnPhotoDownload}
      />)

      const batchDownloadButton = screen.getByText('下載選取項目 (2)')
      await user.click(batchDownloadButton)

      expect(mockOnPhotoDownload).toHaveBeenCalledWith([mockPhotos[0], mockPhotos[1]])
    })
  })

  describe('Responsive Design', () => {
    it('should render mobile layout', () => {
      const { useMediaQuery } = require('@/hooks/useMediaQuery')
      useMediaQuery.mockImplementation((query: string) => {
        return query === '(max-width: 640px)'
      })

      render(<PhotoGrid {...defaultProps} enableResponsive={true} />)

      const grid = screen.getByTestId('photo-grid')
      expect(grid).toHaveClass('grid-cols-1')

      // Should show mobile actions
      expect(screen.getAllByTestId('mobile-photo-actions')).toHaveLength(3)
    })

    it('should render tablet layout', () => {
      const { useMediaQuery } = require('@/hooks/useMediaQuery')
      useMediaQuery.mockImplementation((query: string) => {
        return query === '(min-width: 641px) and (max-width: 1024px)'
      })

      render(<PhotoGrid {...defaultProps} enableResponsive={true} />)

      const grid = screen.getByTestId('photo-grid')
      expect(grid).toHaveClass('sm:grid-cols-2', 'md:grid-cols-3')
    })

    it('should render desktop layout', () => {
      const { useMediaQuery } = require('@/hooks/useMediaQuery')
      useMediaQuery.mockImplementation((query: string) => {
        return query === '(min-width: 1025px)'
      })

      render(<PhotoGrid {...defaultProps} enableResponsive={true} />)

      const grid = screen.getByTestId('photo-grid')
      expect(grid).toHaveClass('lg:grid-cols-4', 'xl:grid-cols-5', '2xl:grid-cols-6')
    })

    it('should adapt columns for small photo counts', () => {
      const { useMediaQuery } = require('@/hooks/useMediaQuery')
      useMediaQuery.mockImplementation((query: string) => {
        return query === '(min-width: 1025px)'
      })

      const smallPhotoSet = [mockPhotos[0], mockPhotos[1]]

      render(<PhotoGrid
        {...defaultProps}
        photos={smallPhotoSet}
        enableResponsive={true}
      />)

      const grid = screen.getByTestId('photo-grid')
      expect(grid).toHaveClass('grid-cols-2')
    })
  })

  describe('Network Status Handling', () => {
    it('should show offline indicator when offline', () => {
      const { useOnlineStatus } = require('@/hooks/useOnlineStatus')
      useOnlineStatus.mockReturnValue({ isOnline: false })

      render(<PhotoGrid {...defaultProps} />)

      expect(screen.getByTestId('offline-indicator')).toBeInTheDocument()
      expect(screen.getByText('離線模式')).toBeInTheDocument()
    })

    it('should show network speed indicator for slow networks', () => {
      const { useNetworkSpeed } = require('@/hooks/useNetworkSpeed')
      useNetworkSpeed.mockReturnValue({
        isSlowNetwork: true,
        effectiveType: '2g'
      })

      render(<PhotoGrid {...defaultProps} />)

      expect(screen.getByTestId('network-speed-indicator')).toBeInTheDocument()
      expect(screen.getByText('慢速網路模式')).toBeInTheDocument()
    })

    it('should show placeholder for uncached photos when offline', () => {
      const { useOnlineStatus } = require('@/hooks/useOnlineStatus')
      useOnlineStatus.mockReturnValue({ isOnline: false })

      render(<PhotoGrid {...defaultProps} />)

      // Photo 2 is not cached, should show placeholder
      const placeholders = screen.getAllByTestId('photo-placeholder')
      expect(placeholders.length).toBeGreaterThan(0)
      expect(screen.getByText('需要網路連線')).toBeInTheDocument()
    })
  })

  describe('Loading and Error States', () => {
    it('should show loading skeleton', () => {
      render(<PhotoGrid {...defaultProps} loading={true} />)

      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBe(8)
    })

    it('should show error message', () => {
      const error = '載入照片失敗'
      render(<PhotoGrid {...defaultProps} error={error} />)

      expect(screen.getByText('載入失敗')).toBeInTheDocument()
      expect(screen.getByText(error)).toBeInTheDocument()
    })

    it('should show empty state when no photos', () => {
      render(<PhotoGrid {...defaultProps} photos={[]} />)

      expect(screen.getByText('目前沒有照片')).toBeInTheDocument()
      expect(screen.getByText('上傳一些照片來開始使用吧！')).toBeInTheDocument()
    })
  })

  describe('Storage Management', () => {
    it('should show storage usage indicator when enabled', async () => {
      const { useNetworkSpeed } = require('@/hooks/useNetworkSpeed')
      useNetworkSpeed.mockReturnValue({
        isSlowNetwork: true,
        effectiveType: '2g'
      })

      render(<PhotoGrid {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('storage-usage-indicator')).toBeInTheDocument()
      })
    })

    it('should show storage warning when space is low', async () => {
      // Mock high storage usage
      navigator.storage.estimate = vi.fn().mockResolvedValue({
        usage: 95 * 1024 * 1024,
        quota: 100 * 1024 * 1024
      })

      const { useNetworkSpeed } = require('@/hooks/useNetworkSpeed')
      useNetworkSpeed.mockReturnValue({
        isSlowNetwork: true,
        effectiveType: '2g'
      })

      render(<PhotoGrid {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('storage-warning')).toBeInTheDocument()
        expect(screen.getByText('儲存空間不足，建議清理快取')).toBeInTheDocument()
      })
    })

    it('should show data saver indicator', async () => {
      const { useNetworkSpeed } = require('@/hooks/useNetworkSpeed')
      useNetworkSpeed.mockReturnValue({
        isSlowNetwork: true,
        effectiveType: '2g'
      })

      render(<PhotoGrid {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('data-saver-indicator')).toBeInTheDocument()
        expect(screen.getByText('數據節省模式已啟用')).toBeInTheDocument()
      })
    })
  })

  describe('Virtualization Features', () => {
    it('should show virtualization container when enabled', () => {
      const manyPhotos = Array.from({ length: 25 }, (_, i) => ({
        ...mockPhotos[0],
        id: `photo-${i + 1}`
      }))

      render(<PhotoGrid
        {...defaultProps}
        photos={manyPhotos}
        enableVirtualization={true}
      />)

      expect(screen.getByTestId('virtual-grid-container')).toBeInTheDocument()
    })

    it('should not show virtualization for small photo sets', () => {
      render(<PhotoGrid
        {...defaultProps}
        enableVirtualization={true}
      />)

      expect(screen.queryByTestId('virtual-grid-container')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PhotoGrid {...defaultProps} />)

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThan(0)

      const images = screen.getAllByRole('img')
      images.forEach((img, index) => {
        expect(img).toHaveAttribute('alt', mockPhotos[index].fileName)
      })
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<PhotoGrid {...defaultProps} />)

      const firstCheckbox = screen.getAllByRole('checkbox')[1]

      // Focus and activate with keyboard
      firstCheckbox.focus()
      expect(firstCheckbox).toHaveFocus()

      await user.keyboard('{Space}')
      expect(defaultProps.onPhotoSelect).toHaveBeenCalled()
    })

    it('should have proper touch targets on mobile', () => {
      const { useMediaQuery } = require('@/hooks/useMediaQuery')
      useMediaQuery.mockImplementation((query: string) => {
        return query === '(max-width: 640px)'
      })

      render(<PhotoGrid {...defaultProps} enableResponsive={true} />)

      const touchTargets = document.querySelectorAll('.touch-target-44')
      expect(touchTargets.length).toBeGreaterThan(0)
    })
  })

  describe('Performance Optimizations', () => {
    it('should implement lazy loading for images', () => {
      render(<PhotoGrid {...defaultProps} />)

      const images = screen.getAllByTestId('photo-thumbnail')
      images.forEach(img => {
        expect(img).toHaveAttribute('loading', 'lazy')
      })
    })

    it('should optimize image URLs for slow networks', () => {
      const { useNetworkSpeed } = require('@/hooks/useNetworkSpeed')
      useNetworkSpeed.mockReturnValue({
        isSlowNetwork: true,
        effectiveType: '2g'
      })

      render(<PhotoGrid {...defaultProps} adaptiveQuality={true} />)

      const images = screen.getAllByTestId('photo-thumbnail')
      images.forEach(img => {
        const src = img.getAttribute('src')
        expect(src).toContain('quality=30')
        expect(src).toContain('format=webp')
      })
    })

    it('should handle resize events efficiently', () => {
      render(<PhotoGrid {...defaultProps} enableResponsive={true} />)

      const grid = screen.getByTestId('photo-grid')
      expect(grid).toHaveAttribute('data-resize-debounced', 'true')
    })
  })

  describe('Error Handling', () => {
    it('should handle image load errors gracefully', async () => {
      render(<PhotoGrid {...defaultProps} />)

      const images = screen.getAllByTestId('photo-thumbnail')
      const firstImage = images[0]

      // Simulate image load error
      fireEvent.error(firstImage)

      await waitFor(() => {
        expect(screen.getByText('載入失敗')).toBeInTheDocument()
      })
    })

    it('should handle missing metadata gracefully', () => {
      const photosWithoutMetadata = [{
        ...mockPhotos[0],
        metadata: {}
      }]

      render(<PhotoGrid {...defaultProps} photos={photosWithoutMetadata} />)

      // Should not crash and should render the photo
      expect(screen.getByTestId('photo-grid')).toBeInTheDocument()
    })
  })
})