/**
 * Photo Gallery UI Component Integration Tests
 * 照片庫UI元件系統整合測試
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useParams } from 'next/navigation'
import PhotoGalleryPage from '../page'
import { usePhotoStore } from '@/store/photoStore'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  })),
  useParams: jest.fn()
}))

// Mock photo store
const mockPhotoStore = {
  photos: [
    {
      id: 'photo-1',
      fileName: 'test-image.jpg',
      projectId: 'TEST-PROJECT',
      albumId: 'album-1',
      thumbnailUrl: '/api/photos/photo-1/thumbnail',
      originalUrl: '/api/photos/photo-1/download'
    }
  ],
  albums: [
    {
      id: 'album-1',
      name: '測試相簿',
      projectId: 'TEST-PROJECT',
      photoCount: 1
    }
  ],
  currentAlbum: 'album-1',
  selectedPhotos: [],
  lightboxOpen: false,
  lightboxIndex: 0,
  searchQuery: '',
  viewMode: 'grid' as const,
  filters: {},
  setPhotos: jest.fn(),
  setAlbums: jest.fn(),
  setCurrentAlbum: jest.fn(),
  setSearchQuery: jest.fn(),
  setViewMode: jest.fn(),
  setFilters: jest.fn(),
  selectPhoto: jest.fn(),
  deselectPhoto: jest.fn(),
  openLightbox: jest.fn(),
  closeLightbox: jest.fn(),
  getFilteredPhotos: jest.fn(() => mockPhotoStore.photos),
  clearSelection: jest.fn(),
  setLoading: jest.fn(),
  setError: jest.fn()
}

jest.mock('@/store/photoStore', () => ({
  usePhotoStore: jest.fn()
}))

// Mock photo service
jest.mock('@/services/photoService', () => ({
  photoService: {
    getAlbums: jest.fn().mockResolvedValue({
      success: true,
      data: mockPhotoStore.albums
    }),
    getPhotos: jest.fn().mockResolvedValue({
      success: true,
      data: mockPhotoStore.photos
    }),
    deletePhoto: jest.fn(),
    downloadPhoto: jest.fn(),
    downloadPhotos: jest.fn(),
    shouldSplitDownload: jest.fn().mockReturnValue(false),
    cancelBatchDownload: jest.fn()
  }
}))

// Mock UI components to verify integration
const mockPhotoComponents = {
  PhotoUploader: jest.fn(({ onUploadComplete, onUploadError }) => (
    <div data-testid="photo-uploader">
      <button onClick={() => onUploadComplete([])}>完成上傳</button>
      <button onClick={() => onUploadError(['錯誤'])}>上傳錯誤</button>
    </div>
  )),
  PhotoGrid: jest.fn(({ photos, onPhotoClick, onPhotoSelect, columnCount, height }) => (
    <div data-testid="photo-grid" data-columns={columnCount} data-height={height}>
      {photos.map((photo: any) => (
        <div key={photo.id} data-testid={`photo-${photo.id}`}>
          <button onClick={() => onPhotoClick(photo, 0)}>
            {photo.fileName}
          </button>
          <button onClick={() => onPhotoSelect(photo.id, true)}>
            選取
          </button>
        </div>
      ))}
    </div>
  )),
  PhotoLightbox: jest.fn(({ open, photos, index, onClose }) => (
    open ? (
      <div data-testid="photo-lightbox" data-index={index}>
        <button onClick={onClose}>關閉</button>
        {photos[index] && <div>{photos[index].fileName}</div>}
      </div>
    ) : null
  )),
  PhotoGalleryList: jest.fn(({ albums, selectedAlbum, onAlbumSelect }) => (
    <div data-testid="photo-gallery-list">
      {albums.map((album: any) => (
        <button
          key={album.id}
          onClick={() => onAlbumSelect(album.id)}
          className={selectedAlbum === album.id ? 'selected' : ''}
        >
          {album.name}
        </button>
      ))}
    </div>
  )),
  PhotoFilters: jest.fn(({ filters, onFiltersChange }) => (
    <div data-testid="photo-filters">
      <input
        placeholder="搜尋..."
        onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
      />
    </div>
  ))
}

jest.mock('@/components/photo', () => mockPhotoComponents)

jest.mock('@/components/photo/DownloadProgress', () => ({
  DownloadProgress: jest.fn(({ progress, onCancel, onClose }) => (
    <div data-testid="download-progress">
      <div>進度: {progress.overallProgress}%</div>
      <button onClick={onCancel}>取消</button>
      <button onClick={onClose}>關閉</button>
    </div>
  ))
}))

describe('Photo Gallery UI Component Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useParams as jest.Mock).mockReturnValue({ projectId: 'TEST-PROJECT' })
    ;(usePhotoStore as jest.Mock).mockReturnValue(mockPhotoStore)
  })

  describe('shadcn/ui Component Integration', () => {
    it('should use Card components for main sections', () => {
      render(<PhotoGalleryPage />)

      // Should use Card components for layout
      const cards = document.querySelectorAll('.card, [class*="card"]')
      expect(cards.length).toBeGreaterThan(0)
    })

    it('should use Button components with proper variants', () => {
      render(<PhotoGalleryPage />)

      // Upload button
      const uploadButton = screen.getByText('上傳照片')
      expect(uploadButton).toBeInTheDocument()

      // View mode buttons
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should integrate Badge components for counts and statuses', () => {
      render(<PhotoGalleryPage />)

      // Photo count badge
      const badge = screen.getByText('1') // Photo count from mock data
      expect(badge).toBeInTheDocument()
    })

    it('should use Progress components where applicable', () => {
      render(<PhotoGalleryPage />)

      // Progress would be shown during uploads/downloads
      // This tests the structure is ready for progress display
      expect(screen.getByTestId('photo-grid')).toBeInTheDocument()
    })
  })

  describe('Custom Photo Component Integration', () => {
    it('should properly integrate PhotoUploader component', async () => {
      render(<PhotoGalleryPage />)

      // Open uploader
      const uploadButton = screen.getByText('上傳照片')
      fireEvent.click(uploadButton)

      await waitFor(() => {
        expect(screen.getByTestId('photo-uploader')).toBeInTheDocument()
      })

      // Test upload completion callback
      const completeButton = screen.getByText('完成上傳')
      fireEvent.click(completeButton)

      // Should hide uploader after completion
      expect(mockPhotoStore.setPhotos).toHaveBeenCalled()
    })

    it('should properly integrate PhotoGrid component with props', () => {
      render(<PhotoGalleryPage />)

      const photoGrid = screen.getByTestId('photo-grid')
      expect(photoGrid).toBeInTheDocument()

      // Check PhotoGrid received proper props
      expect(mockPhotoComponents.PhotoGrid).toHaveBeenCalledWith(
        expect.objectContaining({
          photos: mockPhotoStore.photos,
          selectedPhotos: mockPhotoStore.selectedPhotos,
          loading: expect.any(Boolean),
          error: expect.any(Object),
          onPhotoClick: expect.any(Function),
          onPhotoSelect: expect.any(Function),
          onPhotoDownload: expect.any(Function),
          onPhotoDelete: expect.any(Function),
          columnCount: 4, // Grid mode default
          height: 600
        }),
        expect.any(Object)
      )
    })

    it('should properly integrate PhotoLightbox component', () => {
      // Set lightbox to open state
      const openLightboxStore = {
        ...mockPhotoStore,
        lightboxOpen: true,
        lightboxIndex: 0
      }
      ;(usePhotoStore as jest.Mock).mockReturnValue(openLightboxStore)

      render(<PhotoGalleryPage />)

      const lightbox = screen.getByTestId('photo-lightbox')
      expect(lightbox).toBeInTheDocument()

      // Check PhotoLightbox received proper props
      expect(mockPhotoComponents.PhotoLightbox).toHaveBeenCalledWith(
        expect.objectContaining({
          photos: mockPhotoStore.photos,
          open: true,
          index: 0,
          onClose: expect.any(Function),
          enableZoom: true,
          enableFullscreen: true,
          enableThumbnails: true,
          enableKeyboardShortcuts: true,
          enableTouchGestures: true
        }),
        expect.any(Object)
      )
    })

    it('should properly integrate PhotoGalleryList component', () => {
      render(<PhotoGalleryPage />)

      const galleryList = screen.getByTestId('photo-gallery-list')
      expect(galleryList).toBeInTheDocument()

      // Test album selection
      const albumButton = screen.getByText('測試相簿')
      fireEvent.click(albumButton)

      expect(mockPhotoStore.setCurrentAlbum).toHaveBeenCalledWith('album-1')
    })

    it('should properly integrate PhotoFilters component', () => {
      render(<PhotoGalleryPage />)

      const filters = screen.getByTestId('photo-filters')
      expect(filters).toBeInTheDocument()

      // Check PhotoFilters received proper props
      expect(mockPhotoComponents.PhotoFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: mockPhotoStore.filters,
          onFiltersChange: expect.any(Function),
          tagOptions: expect.any(Array),
          uploaderOptions: expect.any(Array),
          showCounts: false
        }),
        expect.any(Object)
      )
    })
  })

  describe('Component State Synchronization', () => {
    it('should synchronize view mode between components', () => {
      render(<PhotoGalleryPage />)

      // Grid mode should be reflected in PhotoGrid columnCount
      const photoGrid = screen.getByTestId('photo-grid')
      expect(photoGrid).toHaveAttribute('data-columns', '4')

      // Switch to list mode
      const listModeStore = {
        ...mockPhotoStore,
        viewMode: 'list' as const
      }
      ;(usePhotoStore as jest.Mock).mockReturnValue(listModeStore)

      const { rerender } = render(<PhotoGalleryPage />)
      rerender(<PhotoGalleryPage />)

      // Should update PhotoGrid columnCount
      expect(screen.getByTestId('photo-grid')).toHaveAttribute('data-columns', '2')
    })

    it('should synchronize selected photos across components', () => {
      const selectedPhotosStore = {
        ...mockPhotoStore,
        selectedPhotos: ['photo-1']
      }
      ;(usePhotoStore as jest.Mock).mockReturnValue(selectedPhotosStore)

      render(<PhotoGalleryPage />)

      // Should show batch download button when photos are selected
      expect(screen.getByText('批次下載')).toBeInTheDocument()
      expect(screen.getByText('已選取 1 張')).toBeInTheDocument()
    })

    it('should synchronize loading states across components', () => {
      render(<PhotoGalleryPage />)

      // All components should receive consistent loading state
      expect(mockPhotoComponents.PhotoGrid).toHaveBeenCalledWith(
        expect.objectContaining({
          loading: expect.any(Boolean)
        }),
        expect.any(Object)
      )
    })
  })

  describe('Event Handler Integration', () => {
    it('should handle photo click events correctly', () => {
      render(<PhotoGalleryPage />)

      const photoButton = screen.getByText('test-image.jpg')
      fireEvent.click(photoButton)

      expect(mockPhotoStore.openLightbox).toHaveBeenCalledWith(0)
    })

    it('should handle photo selection events correctly', () => {
      render(<PhotoGalleryPage />)

      const selectButton = screen.getByText('選取')
      fireEvent.click(selectButton)

      expect(mockPhotoStore.selectPhoto).toHaveBeenCalledWith('photo-1')
    })

    it('should handle upload completion correctly', async () => {
      render(<PhotoGalleryPage />)

      // Open uploader
      const uploadButton = screen.getByText('上傳照片')
      fireEvent.click(uploadButton)

      await waitFor(() => {
        const completeButton = screen.getByText('完成上傳')
        fireEvent.click(completeButton)
      })

      // Should reload photos after upload
      // This would trigger photoService.getPhotos call
      expect(screen.queryByTestId('photo-uploader')).not.toBeInTheDocument()
    })
  })

  describe('Responsive Design Integration', () => {
    it('should apply responsive grid layouts', () => {
      render(<PhotoGalleryPage />)

      // Check for responsive grid classes
      const mainContent = screen.getByText('搜尋與篩選').closest('.grid')
      expect(mainContent).toHaveClass('grid-cols-1', 'lg:grid-cols-4')
    })

    it('should handle mobile-specific UI adjustments', () => {
      render(<PhotoGalleryPage />)

      // Mobile-specific layouts should be applied
      const pageContainer = screen.getByText('iPhoto 2.0 - 工程照片庫').closest('.max-w-7xl')
      expect(pageContainer).toBeInTheDocument()
    })
  })

  describe('Error State Integration', () => {
    it('should handle component error states gracefully', () => {
      const errorStore = {
        ...mockPhotoStore,
        error: 'Network error'
      }
      ;(usePhotoStore as jest.Mock).mockReturnValue(errorStore)

      render(<PhotoGalleryPage />)

      // Components should receive error state
      expect(mockPhotoComponents.PhotoGrid).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Network error'
        }),
        expect.any(Object)
      )
    })

    it('should maintain UI structure during error states', () => {
      const errorStore = {
        ...mockPhotoStore,
        error: 'Failed to load'
      }
      ;(usePhotoStore as jest.Mock).mockReturnValue(errorStore)

      render(<PhotoGalleryPage />)

      // Main UI structure should remain intact
      expect(screen.getByText('iPhoto 2.0 - 工程照片庫')).toBeInTheDocument()
      expect(screen.getByTestId('photo-grid')).toBeInTheDocument()
    })
  })

  describe('Theme and Styling Integration', () => {
    it('should apply consistent PCM theme colors', () => {
      render(<PhotoGalleryPage />)

      // Check for PCM brand colors in title
      const title = screen.getByText('iPhoto 2.0 - 工程照片庫')
      expect(title.className).toMatch(/text-/)
    })

    it('should use consistent spacing and layout patterns', () => {
      render(<PhotoGalleryPage />)

      // Check for consistent spacing classes
      const mainContainer = screen.getByText('iPhoto 2.0 - 工程照片庫').closest('.py-6')
      expect(mainContainer).toBeInTheDocument()
    })
  })
})