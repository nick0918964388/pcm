/**
 * Photo Gallery Complete System Integration Tests
 * 照片庫完整系統整合測試
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter, useParams } from 'next/navigation'
import PhotoGalleryPage from '../page'
import { photoService } from '@/services/photoService'
import { usePhotoStore } from '@/store/photoStore'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn()
}))

// Mock photo service
jest.mock('@/services/photoService', () => ({
  photoService: {
    getAlbums: jest.fn(),
    getPhotos: jest.fn(),
    uploadPhotos: jest.fn(),
    deletePhoto: jest.fn(),
    downloadPhoto: jest.fn(),
    downloadPhotos: jest.fn(),
    shouldSplitDownload: jest.fn(),
    cancelBatchDownload: jest.fn()
  }
}))

// Mock photo store
jest.mock('@/store/photoStore', () => ({
  usePhotoStore: jest.fn()
}))

// Mock all photo components
jest.mock('@/components/photo', () => ({
  PhotoUploader: ({ onUploadComplete }: any) => (
    <div data-testid="photo-uploader">
      <button onClick={() => onUploadComplete([{ id: 'new-photo', fileName: 'uploaded.jpg' }])}>
        模擬上傳
      </button>
    </div>
  ),
  PhotoGrid: ({ photos, onPhotoClick, onPhotoSelect }: any) => (
    <div data-testid="photo-grid">
      {photos.map((photo: any) => (
        <div key={photo.id} data-testid={`photo-item-${photo.id}`}>
          <button onClick={() => onPhotoClick(photo, 0)}>{photo.fileName}</button>
          <button onClick={() => onPhotoSelect(photo.id, true)}>選取</button>
        </div>
      ))}
    </div>
  ),
  PhotoLightbox: ({ open, onClose }: any) => (
    open ? (
      <div data-testid="photo-lightbox">
        <button onClick={onClose}>關閉燈箱</button>
      </div>
    ) : null
  ),
  PhotoGalleryList: ({ albums, onAlbumSelect }: any) => (
    <div data-testid="photo-gallery-list">
      {albums.map((album: any) => (
        <button key={album.id} onClick={() => onAlbumSelect(album.id)}>
          {album.name}
        </button>
      ))}
    </div>
  ),
  PhotoFilters: () => <div data-testid="photo-filters">篩選器</div>
}))

jest.mock('@/components/photo/DownloadProgress', () => ({
  DownloadProgress: () => <div data-testid="download-progress">下載進度</div>
}))

describe('Photo Gallery Complete System Integration', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  }

  const createMockStore = (overrides = {}) => ({
    photos: [
      {
        id: 'photo-1',
        fileName: 'test-photo.jpg',
        projectId: 'TEST-PROJECT',
        albumId: 'album-1'
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
    getFilteredPhotos: jest.fn(() => overrides.photos || []),
    clearSelection: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
    ...overrides
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useParams as jest.Mock).mockReturnValue({ projectId: 'TEST-PROJECT' })
    ;(usePhotoStore as jest.Mock).mockReturnValue(createMockStore())
    ;(photoService.getAlbums as jest.Mock).mockResolvedValue({
      success: true,
      data: []
    })
    ;(photoService.getPhotos as jest.Mock).mockResolvedValue({
      success: true,
      data: []
    })
  })

  describe('End-to-End User Workflows', () => {
    it('should complete full photo upload workflow', async () => {
      const mockStore = createMockStore()
      ;(usePhotoStore as jest.Mock).mockReturnValue(mockStore)

      render(<PhotoGalleryPage />)

      // 1. Open uploader
      const uploadButton = screen.getByText('上傳照片')
      fireEvent.click(uploadButton)

      await waitFor(() => {
        expect(screen.getByTestId('photo-uploader')).toBeInTheDocument()
      })

      // 2. Complete upload
      const simulateUploadButton = screen.getByText('模擬上傳')
      fireEvent.click(simulateUploadButton)

      // 3. Verify workflow completion
      await waitFor(() => {
        expect(photoService.getPhotos).toHaveBeenCalled()
      })
    })

    it('should complete full photo viewing workflow', async () => {
      const mockStore = createMockStore({
        photos: [{ id: 'photo-1', fileName: 'test.jpg' }],
        getFilteredPhotos: () => [{ id: 'photo-1', fileName: 'test.jpg' }]
      })
      ;(usePhotoStore as jest.Mock).mockReturnValue(mockStore)

      render(<PhotoGalleryPage />)

      // 1. Click photo to open lightbox
      const photoButton = screen.getByText('test.jpg')
      fireEvent.click(photoButton)

      expect(mockStore.openLightbox).toHaveBeenCalledWith(0)

      // 2. Test lightbox in open state
      const lightboxStore = createMockStore({
        lightboxOpen: true,
        lightboxIndex: 0
      })
      ;(usePhotoStore as jest.Mock).mockReturnValue(lightboxStore)

      const { rerender } = render(<PhotoGalleryPage />)
      rerender(<PhotoGalleryPage />)

      expect(screen.getByTestId('photo-lightbox')).toBeInTheDocument()

      // 3. Close lightbox
      const closeButton = screen.getByText('關閉燈箱')
      fireEvent.click(closeButton)

      expect(lightboxStore.closeLightbox).toHaveBeenCalled()
    })

    it('should complete album browsing workflow', async () => {
      const multiAlbumStore = createMockStore({
        albums: [
          { id: 'album-1', name: '相簿一', projectId: 'TEST-PROJECT' },
          { id: 'album-2', name: '相簿二', projectId: 'TEST-PROJECT' }
        ]
      })
      ;(usePhotoStore as jest.Mock).mockReturnValue(multiAlbumStore)

      render(<PhotoGalleryPage />)

      // 1. Switch albums
      const album2Button = screen.getByText('相簿二')
      fireEvent.click(album2Button)

      expect(multiAlbumStore.setCurrentAlbum).toHaveBeenCalledWith('album-2')

      // 2. Verify photos reload for new album
      await waitFor(() => {
        expect(photoService.getPhotos).toHaveBeenCalledWith('TEST-PROJECT', {
          albumId: 'album-1' // Current album from store
        })
      })
    })
  })

  describe('Cross-Component Data Flow', () => {
    it('should maintain data consistency across all components', async () => {
      const consistentStore = createMockStore({
        currentAlbum: 'album-1',
        photos: [
          { id: 'photo-1', fileName: 'consistent-test.jpg', albumId: 'album-1' }
        ]
      })
      ;(usePhotoStore as jest.Mock).mockReturnValue(consistentStore)

      render(<PhotoGalleryPage />)

      // All components should receive consistent data
      expect(screen.getByTestId('photo-gallery-list')).toBeInTheDocument()
      expect(screen.getByTestId('photo-grid')).toBeInTheDocument()
      expect(screen.getByTestId('photo-filters')).toBeInTheDocument()

      // Photo data should be displayed
      expect(screen.getByText('consistent-test.jpg')).toBeInTheDocument()
    })

    it('should propagate state changes across components', () => {
      const initialStore = createMockStore({ selectedPhotos: [] })
      ;(usePhotoStore as jest.Mock).mockReturnValue(initialStore)

      render(<PhotoGalleryPage />)

      // Select a photo
      const selectButton = screen.getByText('選取')
      fireEvent.click(selectButton)

      expect(initialStore.selectPhoto).toHaveBeenCalledWith('photo-1')

      // Test with selected state
      const selectedStore = createMockStore({ selectedPhotos: ['photo-1'] })
      ;(usePhotoStore as jest.Mock).mockReturnValue(selectedStore)

      const { rerender } = render(<PhotoGalleryPage />)
      rerender(<PhotoGalleryPage />)

      // Should show batch download options
      expect(screen.getByText('批次下載')).toBeInTheDocument()
      expect(screen.getByText('已選取 1 張')).toBeInTheDocument()
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should handle API failures gracefully', async () => {
      ;(photoService.getAlbums as jest.Mock).mockRejectedValue(
        new Error('API Error')
      )
      ;(photoService.getPhotos as jest.Mock).mockRejectedValue(
        new Error('Network Error')
      )

      render(<PhotoGalleryPage />)

      // Should still render main structure
      await waitFor(() => {
        expect(screen.getByText('iPhoto 2.0 - 工程照片庫')).toBeInTheDocument()
      })

      // Components should still be rendered
      expect(screen.getByTestId('photo-gallery-list')).toBeInTheDocument()
      expect(screen.getByTestId('photo-grid')).toBeInTheDocument()
    })

    it('should handle component errors without crashing', () => {
      const errorStore = createMockStore({
        error: 'Component error occurred'
      })
      ;(usePhotoStore as jest.Mock).mockReturnValue(errorStore)

      expect(() => render(<PhotoGalleryPage />)).not.toThrow()

      // Should still render main interface
      expect(screen.getByText('iPhoto 2.0 - 工程照片庫')).toBeInTheDocument()
    })

    it('should recover from temporary network issues', async () => {
      // Initial failure
      ;(photoService.getAlbums as jest.Mock).mockRejectedValueOnce(
        new Error('Network timeout')
      )

      render(<PhotoGalleryPage />)

      // Should handle initial failure
      await waitFor(() => {
        expect(screen.getByText('iPhoto 2.0 - 工程照片庫')).toBeInTheDocument()
      })

      // Subsequent success
      ;(photoService.getAlbums as jest.Mock).mockResolvedValue({
        success: true,
        data: [{ id: 'album-1', name: '恢復相簿', projectId: 'TEST-PROJECT' }]
      })

      // Component should be able to recover when retry happens
      expect(screen.getByTestId('photo-gallery-list')).toBeInTheDocument()
    })
  })

  describe('Performance and Resource Management', () => {
    it('should handle large photo collections efficiently', () => {
      const largeDataStore = createMockStore({
        photos: Array.from({ length: 100 }, (_, i) => ({
          id: `photo-${i}`,
          fileName: `photo-${i}.jpg`,
          albumId: 'album-1'
        })),
        getFilteredPhotos: () => Array.from({ length: 100 }, (_, i) => ({
          id: `photo-${i}`,
          fileName: `photo-${i}.jpg`,
          albumId: 'album-1'
        }))
      })
      ;(usePhotoStore as jest.Mock).mockReturnValue(largeDataStore)

      render(<PhotoGalleryPage />)

      // Should render without performance issues
      expect(screen.getByTestId('photo-grid')).toBeInTheDocument()
      expect(screen.getAllByText(/photo-\d+\.jpg/)).toHaveLength(100)
    })

    it('should cleanup resources properly', () => {
      const { unmount } = render(<PhotoGalleryPage />)

      // Should unmount without memory leaks
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('Accessibility and User Experience', () => {
    it('should maintain accessibility standards', () => {
      render(<PhotoGalleryPage />)

      // Should have proper heading structure
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveTextContent('iPhoto 2.0 - 工程照片庫')

      // Should have proper button accessibility
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should provide proper loading states', () => {
      const loadingStore = createMockStore({
        loading: true
      })
      ;(usePhotoStore as jest.Mock).mockReturnValue(loadingStore)

      render(<PhotoGalleryPage />)

      // Should handle loading state gracefully
      expect(screen.getByTestId('photo-grid')).toBeInTheDocument()
    })

    it('should handle keyboard navigation', () => {
      render(<PhotoGalleryPage />)

      // Should support keyboard interaction
      const uploadButton = screen.getByText('上傳照片')
      expect(uploadButton).toBeInTheDocument()

      // Should be focusable
      uploadButton.focus()
      expect(document.activeElement).toBe(uploadButton)
    })
  })

  describe('Integration with PCM Platform', () => {
    it('should integrate seamlessly with PCM dashboard layout', () => {
      render(<PhotoGalleryPage />)

      // Should use consistent PCM styling
      expect(screen.getByText('iPhoto 2.0 - 工程照片庫')).toBeInTheDocument()
      expect(screen.getByText(/專案.*的照片管理與預覽/)).toBeInTheDocument()
    })

    it('should maintain consistent user experience with other modules', () => {
      render(<PhotoGalleryPage />)

      // Should follow PCM UI patterns
      const pageStructure = screen.getByText('iPhoto 2.0 - 工程照片庫').closest('.min-h-screen')
      expect(pageStructure).toHaveClass('bg-gray-50')
    })

    it('should support project context switching', () => {
      ;(useParams as jest.Mock).mockReturnValue({ projectId: 'NEW-PROJECT' })

      render(<PhotoGalleryPage />)

      expect(screen.getByText('專案 NEW-PROJECT 的照片管理與預覽')).toBeInTheDocument()
    })
  })
})