/**
 * PhotoGrid Component Tests
 * Tests for 響應式照片網格顯示元件
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoGrid } from '../PhotoGrid'
import { Photo, PhotoMetadata } from '@/types/photo.types'
import { usePhotoStore } from '@/store/photoStore'

// Mock Zustand store
vi.mock('@/store/photoStore', () => ({
  usePhotoStore: vi.fn()
}))

// Mock UI components
vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, indeterminate, className, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      data-indeterminate={indeterminate}
      className={className}
      {...props}
    />
  )
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className, ...props }: any) => (
    <span className={className} data-variant={variant} {...props}>
      {children}
    </span>
  )
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>
      {children}
    </div>
  )
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, variant, size, className, onClick, ...props }: any) => (
    <button
      className={className}
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick, className }: any) => (
    <div className={className} onClick={onClick} data-testid="dropdown-item">
      {children}
    </div>
  ),
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>
}))

const mockPhotoStore = {
  selectAllPhotos: vi.fn(),
  clearSelection: vi.fn()
}

const createMockPhoto = (id: string, overrides: Partial<Photo> = {}): Photo => ({
  id,
  projectId: 'F20P1',
  albumName: 'default',
  fileName: `photo-${id}.jpg`,
  fileSize: 1024 * 1024 * 2, // 2MB
  mimeType: 'image/jpeg',
  width: 1920,
  height: 1080,
  thumbnailUrl: `https://example.com/thumbnails/${id}.jpg`,
  originalUrl: `https://example.com/photos/${id}.jpg`,
  uploadedBy: 'user123',
  uploadedAt: new Date('2024-01-01T10:00:00Z'),
  metadata: {
    tags: ['工程', '進度'],
    description: `Photo ${id} description`,
    capturedAt: new Date('2024-01-01T09:00:00Z')
  } as PhotoMetadata,
  ...overrides
})

describe('PhotoGrid Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(usePhotoStore as any).mockReturnValue(mockPhotoStore)
  })

  describe('Basic Rendering', () => {
    it('should render loading state with skeleton items', () => {
      render(
        <PhotoGrid
          photos={[]}
          loading={true}
        />
      )

      // Should show 8 skeleton items
      const skeletonItems = screen.getAllByRole('generic').filter(
        el => el.className.includes('animate-pulse')
      )
      expect(skeletonItems).toHaveLength(8)
    })

    it('should render empty state when no photos', () => {
      render(
        <PhotoGrid
          photos={[]}
          loading={false}
        />
      )

      expect(screen.getByText('目前沒有照片')).toBeInTheDocument()
      expect(screen.getByText('上傳一些照片來開始使用吧！')).toBeInTheDocument()
    })

    it('should render error state when error occurs', () => {
      const errorMessage = '載入照片失敗'

      render(
        <PhotoGrid
          photos={[]}
          error={errorMessage}
        />
      )

      expect(screen.getByText('載入失敗')).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    it('should render photos in grid layout', () => {
      const photos = [
        createMockPhoto('1'),
        createMockPhoto('2'),
        createMockPhoto('3')
      ]

      render(
        <PhotoGrid
          photos={photos}
        />
      )

      // Should show photo count
      expect(screen.getByText('共 3 張照片')).toBeInTheDocument()

      // Should render all photos
      expect(screen.getByAltText('photo-1.jpg')).toBeInTheDocument()
      expect(screen.getByAltText('photo-2.jpg')).toBeInTheDocument()
      expect(screen.getByAltText('photo-3.jpg')).toBeInTheDocument()
    })
  })

  describe('Photo Selection', () => {
    const photos = [
      createMockPhoto('1'),
      createMockPhoto('2'),
      createMockPhoto('3')
    ]

    it('should handle individual photo selection', async () => {
      const user = userEvent.setup()
      const onPhotoSelect = vi.fn()

      render(
        <PhotoGrid
          photos={photos}
          onPhotoSelect={onPhotoSelect}
        />
      )

      // Click on first photo's checkbox (hover to make it visible)
      const firstPhoto = screen.getByAltText('photo-1.jpg').closest('[role="img"]')
      if (firstPhoto) {
        await user.hover(firstPhoto)

        const checkbox = screen.getAllByRole('checkbox')[1] // Skip select-all checkbox
        await user.click(checkbox)

        expect(onPhotoSelect).toHaveBeenCalledWith('1', true)
      }
    })

    it('should handle select all functionality', async () => {
      const user = userEvent.setup()

      render(
        <PhotoGrid
          photos={photos}
          selectedPhotos={[]}
        />
      )

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
      await user.click(selectAllCheckbox)

      expect(mockPhotoStore.selectAllPhotos).toHaveBeenCalled()
    })

    it('should handle clear selection when all selected', async () => {
      const user = userEvent.setup()

      render(
        <PhotoGrid
          photos={photos}
          selectedPhotos={['1', '2', '3']}
        />
      )

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
      expect(selectAllCheckbox).toBeChecked()

      await user.click(selectAllCheckbox)

      expect(mockPhotoStore.clearSelection).toHaveBeenCalled()
    })

    it('should show indeterminate state for partial selection', () => {
      render(
        <PhotoGrid
          photos={photos}
          selectedPhotos={['1', '2']}
        />
      )

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
      expect(selectAllCheckbox).toHaveAttribute('data-indeterminate', 'true')
    })

    it('should show selected count and batch actions', () => {
      render(
        <PhotoGrid
          photos={photos}
          selectedPhotos={['1', '2']}
        />
      )

      expect(screen.getByText('已選取 2 張照片')).toBeInTheDocument()
      expect(screen.getByText('下載選取項目')).toBeInTheDocument()
    })
  })

  describe('Photo Interactions', () => {
    const photos = [createMockPhoto('1')]

    it('should handle photo click', async () => {
      const user = userEvent.setup()
      const onPhotoClick = vi.fn()

      render(
        <PhotoGrid
          photos={photos}
          onPhotoClick={onPhotoClick}
        />
      )

      const photoImg = screen.getByAltText('photo-1.jpg')
      await user.click(photoImg)

      expect(onPhotoClick).toHaveBeenCalledWith(photos[0], 0)
    })

    it('should handle photo download', async () => {
      const user = userEvent.setup()
      const onPhotoDownload = vi.fn()

      render(
        <PhotoGrid
          photos={photos}
          onPhotoDownload={onPhotoDownload}
        />
      )

      // Hover to show dropdown menu
      const photoCard = screen.getByAltText('photo-1.jpg').closest('.group')
      if (photoCard) {
        await user.hover(photoCard)

        const downloadButton = screen.getByText('下載')
        await user.click(downloadButton)

        expect(onPhotoDownload).toHaveBeenCalledWith(photos[0])
      }
    })

    it('should handle photo deletion', async () => {
      const user = userEvent.setup()
      const onPhotoDelete = vi.fn()

      render(
        <PhotoGrid
          photos={photos}
          onPhotoDelete={onPhotoDelete}
        />
      )

      // Hover to show dropdown menu
      const photoCard = screen.getByAltText('photo-1.jpg').closest('.group')
      if (photoCard) {
        await user.hover(photoCard)

        const deleteButton = screen.getByText('刪除')
        await user.click(deleteButton)

        expect(onPhotoDelete).toHaveBeenCalledWith(photos[0])
      }
    })
  })

  describe('Lazy Loading', () => {
    const photos = [createMockPhoto('1')]

    it('should show loading state before image loads', () => {
      render(
        <PhotoGrid
          photos={photos}
        />
      )

      // Should have loading="lazy" attribute
      const img = screen.getByAltText('photo-1.jpg')
      expect(img).toHaveAttribute('loading', 'lazy')
    })

    it('should handle image load success', async () => {
      render(
        <PhotoGrid
          photos={photos}
        />
      )

      const img = screen.getByAltText('photo-1.jpg')

      // Simulate image load
      fireEvent.load(img)

      // Should apply opacity-100 class when loaded
      await waitFor(() => {
        expect(img).toHaveClass('opacity-100')
      })
    })

    it('should handle image load error', async () => {
      render(
        <PhotoGrid
          photos={photos}
        />
      )

      const img = screen.getByAltText('photo-1.jpg')

      // Simulate image error
      fireEvent.error(img)

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText('載入失敗')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Grid Layout', () => {
    const photos = Array.from({ length: 12 }, (_, i) => createMockPhoto(`${i + 1}`))

    it('should apply correct grid classes for different column counts', () => {
      const { rerender } = render(
        <PhotoGrid
          photos={photos}
          columnCount={2}
        />
      )

      let gridContainer = screen.getByText('共 12 張照片').parentElement?.nextElementSibling
      expect(gridContainer).toHaveClass('grid-cols-1', 'sm:grid-cols-2')

      rerender(
        <PhotoGrid
          photos={photos}
          columnCount={3}
        />
      )

      gridContainer = screen.getByText('共 12 張照片').parentElement?.nextElementSibling
      expect(gridContainer).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3')

      rerender(
        <PhotoGrid
          photos={photos}
          columnCount={4}
        />
      )

      gridContainer = screen.getByText('共 12 張照片').parentElement?.nextElementSibling
      expect(gridContainer).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4')
    })

    it('should apply custom height when specified', () => {
      render(
        <PhotoGrid
          photos={photos}
          height={800}
        />
      )

      const gridContainer = screen.getByText('共 12 張照片').parentElement?.nextElementSibling
      expect(gridContainer).toHaveStyle({ maxHeight: '800px' })
    })
  })

  describe('Photo Metadata Display', () => {
    it('should display photo filename and metadata', () => {
      const photo = createMockPhoto('1', {
        fileName: 'construction-progress.jpg',
        fileSize: 1024 * 1024 * 3.5, // 3.5MB
        uploadedAt: new Date('2024-01-15T14:30:00Z'),
        metadata: {
          tags: ['工程', '進度', '施工'],
          description: 'Construction progress photo'
        } as PhotoMetadata
      })

      render(
        <PhotoGrid
          photos={[photo]}
        />
      )

      expect(screen.getByText('construction-progress.jpg')).toBeInTheDocument()
      expect(screen.getByText('3.5MB')).toBeInTheDocument()
      expect(screen.getByText('2024/1/15')).toBeInTheDocument()
      expect(screen.getByText('工程')).toBeInTheDocument()
      expect(screen.getByText('進度')).toBeInTheDocument()
      expect(screen.getByText('+1')).toBeInTheDocument() // +1 more tag
    })

    it('should handle photos without tags', () => {
      const photo = createMockPhoto('1', {
        metadata: {
          description: 'Photo without tags'
        } as PhotoMetadata
      })

      render(
        <PhotoGrid
          photos={[photo]}
        />
      )

      // Should not crash and should still display other metadata
      expect(screen.getByText('photo-1.jpg')).toBeInTheDocument()
      expect(screen.getByText('2.0MB')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    const photos = [createMockPhoto('1')]

    it('should have proper ARIA labels and roles', () => {
      render(
        <PhotoGrid
          photos={photos}
        />
      )

      const img = screen.getByAltText('photo-1.jpg')
      expect(img).toHaveAttribute('alt', 'photo-1.jpg')

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThan(0)
    })

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup()
      const onPhotoClick = vi.fn()

      render(
        <PhotoGrid
          photos={photos}
          onPhotoClick={onPhotoClick}
        />
      )

      const img = screen.getByAltText('photo-1.jpg')

      // Focus and press Enter should trigger click
      img.focus()
      await user.keyboard('{Enter}')

      expect(onPhotoClick).toHaveBeenCalledWith(photos[0], 0)
    })
  })

  describe('Performance', () => {
    it('should handle large photo sets efficiently', () => {
      const largePhotoSet = Array.from({ length: 100 }, (_, i) => createMockPhoto(`${i + 1}`))

      const { rerender } = render(
        <PhotoGrid
          photos={largePhotoSet}
        />
      )

      expect(screen.getByText('共 100 張照片')).toBeInTheDocument()

      // Should re-render efficiently when props change
      const startTime = performance.now()

      rerender(
        <PhotoGrid
          photos={largePhotoSet}
          selectedPhotos={['1', '2', '3']}
        />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render in reasonable time (less than 100ms)
      expect(renderTime).toBeLessThan(100)
    })
  })
})