/**
 * 照片庫完整使用者流程 E2E 測試
 * 測試真實使用者從登入到完成照片管理的完整流程
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { PhotoGalleryApp } from '@/components/photo/PhotoGalleryApp'
import { usePhotoStore } from '@/stores/photoStore'
import { AuthService } from '@/services/authService'
import { PhotoService } from '@/services/photoService'

// Mock browser APIs for E2E testing
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    pathname: '/dashboard/project-1/photos',
    search: '',
    hash: ''
  },
  writable: true
})

// Mock File API for uploads
global.File = class MockFile {
  name: string
  size: number
  type: string
  lastModified: number

  constructor(bits: any[], name: string, options: any = {}) {
    this.name = name
    this.size = options.size || 1024 * 1024
    this.type = options.type || 'image/jpeg'
    this.lastModified = options.lastModified || Date.now()
  }

  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(this.size))
  }

  stream() {
    return new ReadableStream()
  }

  text() {
    return Promise.resolve('mock file content')
  }

  slice() {
    return new MockFile([], this.name, {
      size: this.size,
      type: this.type
    })
  }
} as any

// Mock drag and drop events
Object.defineProperty(window, 'DataTransfer', {
  value: class MockDataTransfer {
    files: File[] = []
    types: string[] = []

    setData(format: string, data: string) {}
    getData(format: string) { return '' }
  }
})

describe('Photo Gallery E2E User Flow Tests', () => {
  const mockUser = {
    id: 'user-123',
    name: 'John Engineer',
    email: 'john@construction.com',
    role: 'engineer',
    projects: ['project-1'],
    permissions: {
      'project-1': ['read', 'upload', 'download']
    }
  }

  const mockProject = {
    id: 'project-1',
    name: 'Metro Construction Project',
    description: 'Major urban infrastructure project'
  }

  const mockAlbums = [
    {
      id: 'album-1',
      projectId: 'project-1',
      name: 'Foundation Work',
      description: 'Foundation and excavation photos',
      photoCount: 12,
      coverPhotoId: 'photo-1'
    },
    {
      id: 'album-2',
      projectId: 'project-1',
      name: 'Steel Frame',
      description: 'Steel structure installation',
      photoCount: 8,
      coverPhotoId: 'photo-5'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    usePhotoStore.getState().reset()

    // Mock authentication
    vi.mocked(AuthService.getCurrentUser).mockResolvedValue(mockUser)
    vi.mocked(AuthService.validateToken).mockResolvedValue(true)

    // Mock photo service responses
    vi.mocked(PhotoService.prototype.getProjectAlbums).mockResolvedValue(mockAlbums)
    vi.mocked(PhotoService.prototype.getPhotos).mockResolvedValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Complete User Journey: Engineer Upload and Management Flow', () => {
    it('should complete full engineer workflow - login to photo management', async () => {
      // Arrange
      const user = userEvent.setup()

      const FullPhotoGalleryApp = () => (
        <BrowserRouter>
          <PhotoGalleryApp projectId="project-1" userId="user-123" />
        </BrowserRouter>
      )

      // RED: This test should fail initially as the complete flow doesn't exist
      render(<FullPhotoGalleryApp />)

      // STEP 1: User Authentication and Project Access
      await waitFor(() => {
        expect(screen.getByTestId('photo-gallery-main')).toBeInTheDocument()
      })

      // STEP 2: View Project Albums
      await waitFor(() => {
        expect(screen.getByText('Metro Construction Project')).toBeInTheDocument()
        expect(screen.getByText('Foundation Work')).toBeInTheDocument()
        expect(screen.getByText('Steel Frame')).toBeInTheDocument()
      })

      // Assert: Album statistics are displayed
      expect(screen.getByText('12 photos')).toBeInTheDocument()
      expect(screen.getByText('8 photos')).toBeInTheDocument()

      // STEP 3: Navigate to Specific Album
      const foundationAlbum = screen.getByTestId('album-card-album-1')
      await user.click(foundationAlbum)

      await waitFor(() => {
        expect(screen.getByTestId('photo-grid-album-1')).toBeInTheDocument()
      })

      // STEP 4: Upload New Photos
      // Mock successful upload
      vi.mocked(PhotoService.prototype.uploadPhoto).mockResolvedValue({
        success: true,
        photoId: 'uploaded-photo-new',
        thumbnailUrl: '/api/photos/uploaded-photo-new/thumbnail',
        originalUrl: '/api/photos/uploaded-photo-new/download',
        metadata: {
          originalName: 'foundation-progress-day5.jpg',
          fileSize: 2 * 1024 * 1024,
          mimeType: 'image/jpeg',
          width: 1920,
          height: 1080
        }
      })

      // Click upload button
      const uploadButton = screen.getByTestId('open-upload-dialog')
      await user.click(uploadButton)

      // Upload dialog should open
      await waitFor(() => {
        expect(screen.getByTestId('upload-dialog')).toBeInTheDocument()
      })

      // Select files for upload
      const fileInput = screen.getByTestId('file-input')
      const testFiles = [
        new File(['photo1'], 'foundation-progress-day5.jpg', { type: 'image/jpeg' }),
        new File(['photo2'], 'foundation-inspection.jpg', { type: 'image/jpeg' })
      ]

      await user.upload(fileInput, testFiles)

      // Assert: Files appear in upload queue
      await waitFor(() => {
        expect(screen.getByText('foundation-progress-day5.jpg')).toBeInTheDocument()
        expect(screen.getByText('foundation-inspection.jpg')).toBeInTheDocument()
      })

      // Start upload process
      const startUploadButton = screen.getByTestId('start-upload-button')
      await user.click(startUploadButton)

      // Assert: Upload progress is shown
      await waitFor(() => {
        expect(screen.getByTestId('upload-progress-foundation-progress-day5.jpg')).toBeInTheDocument()
      })

      // Assert: Upload completion
      await waitFor(() => {
        expect(screen.getByTestId('upload-success-message')).toBeInTheDocument()
        expect(screen.getByText(/2 photos uploaded successfully/i)).toBeInTheDocument()
      })

      // STEP 5: View Uploaded Photos in Grid
      const closeUploadButton = screen.getByTestId('close-upload-dialog')
      await user.click(closeUploadButton)

      // Photos should appear in the grid
      await waitFor(() => {
        expect(screen.getByAltText('foundation-progress-day5.jpg')).toBeInTheDocument()
      })

      // STEP 6: Search and Filter Photos
      const searchInput = screen.getByTestId('search-photos-input')
      await user.type(searchInput, 'foundation')

      await waitFor(() => {
        const searchResults = screen.getByTestId('search-results')
        expect(searchResults).toBeInTheDocument()
      })

      // STEP 7: View Photo in Lightbox
      const firstPhoto = screen.getByTestId('photo-thumbnail-uploaded-photo-new')
      await user.click(firstPhoto)

      await waitFor(() => {
        expect(screen.getByTestId('photo-lightbox')).toBeInTheDocument()
        expect(screen.getByTestId('lightbox-photo')).toBeInTheDocument()
      })

      // Assert: Lightbox navigation controls
      expect(screen.getByTestId('lightbox-prev-button')).toBeInTheDocument()
      expect(screen.getByTestId('lightbox-next-button')).toBeInTheDocument()
      expect(screen.getByTestId('lightbox-close-button')).toBeInTheDocument()

      // STEP 8: Download Photo
      const downloadButton = screen.getByTestId('lightbox-download-button')

      // Mock download
      vi.mocked(PhotoService.prototype.downloadPhoto).mockResolvedValue(undefined)

      await user.click(downloadButton)

      await waitFor(() => {
        expect(PhotoService.prototype.downloadPhoto).toHaveBeenCalled()
      })

      // STEP 9: Close Lightbox and Return to Grid
      const closeLightboxButton = screen.getByTestId('lightbox-close-button')
      await user.click(closeLightboxButton)

      await waitFor(() => {
        expect(screen.queryByTestId('photo-lightbox')).not.toBeInTheDocument()
        expect(screen.getByTestId('photo-grid-album-1')).toBeInTheDocument()
      })

      // STEP 10: Navigate Back to Album List
      const backToAlbumsButton = screen.getByTestId('back-to-albums')
      await user.click(backToAlbumsButton)

      await waitFor(() => {
        expect(screen.getByTestId('albums-grid')).toBeInTheDocument()
        expect(screen.getByText('Foundation Work')).toBeInTheDocument()
      })

      // Assert: Album photo count updated
      expect(screen.getByText('14 photos')).toBeInTheDocument() // 12 + 2 uploaded
    })
  })

  describe('Manager Batch Operations Flow', () => {
    it('should complete manager workflow - batch selection and download', async () => {
      // Arrange
      const user = userEvent.setup()
      const managerUser = {
        ...mockUser,
        role: 'manager',
        permissions: {
          'project-1': ['read', 'upload', 'download', 'delete']
        }
      }

      vi.mocked(AuthService.getCurrentUser).mockResolvedValue(managerUser)

      // Mock photos in album
      const mockPhotos = [
        {
          id: 'photo-1',
          fileName: 'foundation-1.jpg',
          thumbnailUrl: '/thumb/1.jpg',
          originalUrl: '/orig/1.jpg',
          uploadedAt: new Date('2024-01-01'),
          uploadedBy: 'contractor-1',
          metadata: { tags: ['foundation'] }
        },
        {
          id: 'photo-2',
          fileName: 'foundation-2.jpg',
          thumbnailUrl: '/thumb/2.jpg',
          originalUrl: '/orig/2.jpg',
          uploadedAt: new Date('2024-01-02'),
          uploadedBy: 'contractor-1',
          metadata: { tags: ['foundation'] }
        },
        {
          id: 'photo-3',
          fileName: 'steel-1.jpg',
          thumbnailUrl: '/thumb/3.jpg',
          originalUrl: '/orig/3.jpg',
          uploadedAt: new Date('2024-01-03'),
          uploadedBy: 'contractor-2',
          metadata: { tags: ['steel'] }
        }
      ]

      vi.mocked(PhotoService.prototype.getPhotos).mockResolvedValue(mockPhotos)

      render(
        <BrowserRouter>
          <PhotoGalleryApp projectId="project-1" userId="user-123" />
        </BrowserRouter>
      )

      // Navigate to album
      await waitFor(() => {
        expect(screen.getByText('Foundation Work')).toBeInTheDocument()
      })

      const foundationAlbum = screen.getByTestId('album-card-album-1')
      await user.click(foundationAlbum)

      // STEP 1: Enable Batch Selection Mode
      await waitFor(() => {
        expect(screen.getByTestId('photo-grid-album-1')).toBeInTheDocument()
      })

      const batchModeButton = screen.getByTestId('enable-batch-mode')
      await user.click(batchModeButton)

      // Assert: Batch mode UI appears
      await waitFor(() => {
        expect(screen.getByTestId('batch-selection-toolbar')).toBeInTheDocument()
        expect(screen.getByTestId('select-all-checkbox')).toBeInTheDocument()
      })

      // STEP 2: Select Multiple Photos
      const photo1Checkbox = screen.getByTestId('photo-checkbox-photo-1')
      const photo2Checkbox = screen.getByTestId('photo-checkbox-photo-2')

      await user.click(photo1Checkbox)
      await user.click(photo2Checkbox)

      // Assert: Selection count updates
      await waitFor(() => {
        expect(screen.getByText('2 photos selected')).toBeInTheDocument()
      })

      // STEP 3: Apply Batch Filter
      const tagFilter = screen.getByTestId('batch-tag-filter')
      await user.selectOptions(tagFilter, 'foundation')

      // Assert: Only foundation photos remain visible
      await waitFor(() => {
        expect(screen.getByTestId('photo-thumbnail-photo-1')).toBeInTheDocument()
        expect(screen.getByTestId('photo-thumbnail-photo-2')).toBeInTheDocument()
        expect(screen.queryByTestId('photo-thumbnail-photo-3')).not.toBeInTheDocument()
      })

      // STEP 4: Select All Filtered Photos
      const selectAllButton = screen.getByTestId('select-all-filtered')
      await user.click(selectAllButton)

      await waitFor(() => {
        expect(screen.getByText('2 photos selected')).toBeInTheDocument()
      })

      // STEP 5: Batch Download
      vi.mocked(PhotoService.prototype.downloadPhotos).mockResolvedValue(undefined)

      const batchDownloadButton = screen.getByTestId('batch-download-button')
      await user.click(batchDownloadButton)

      // Assert: Download confirmation dialog
      await waitFor(() => {
        expect(screen.getByTestId('download-confirmation-dialog')).toBeInTheDocument()
        expect(screen.getByText(/download 2 selected photos/i)).toBeInTheDocument()
      })

      const confirmDownloadButton = screen.getByTestId('confirm-batch-download')
      await user.click(confirmDownloadButton)

      // Assert: Batch download initiated
      await waitFor(() => {
        expect(PhotoService.prototype.downloadPhotos).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ id: 'photo-1' }),
            expect.objectContaining({ id: 'photo-2' })
          ]),
          'user-123'
        )
      })

      // STEP 6: Clear Selection and Exit Batch Mode
      const clearSelectionButton = screen.getByTestId('clear-selection')
      await user.click(clearSelectionButton)

      await waitFor(() => {
        expect(screen.getByText('0 photos selected')).toBeInTheDocument()
      })

      const exitBatchModeButton = screen.getByTestId('exit-batch-mode')
      await user.click(exitBatchModeButton)

      await waitFor(() => {
        expect(screen.queryByTestId('batch-selection-toolbar')).not.toBeInTheDocument()
      })
    })
  })

  describe('Contractor Upload-Only Flow', () => {
    it('should complete contractor workflow - restricted to upload only', async () => {
      // Arrange
      const user = userEvent.setup()
      const contractorUser = {
        ...mockUser,
        role: 'contractor',
        permissions: {
          'project-1': ['upload'] // Only upload permission
        }
      }

      vi.mocked(AuthService.getCurrentUser).mockResolvedValue(contractorUser)

      render(
        <BrowserRouter>
          <PhotoGalleryApp projectId="project-1" userId="user-123" />
        </BrowserRouter>
      )

      // STEP 1: Verify Limited Access
      await waitFor(() => {
        expect(screen.getByTestId('contractor-upload-view')).toBeInTheDocument()
      })

      // Assert: Contractor can see albums but with limited actions
      expect(screen.getByText('Foundation Work')).toBeInTheDocument()
      expect(screen.queryByTestId('batch-operations')).not.toBeInTheDocument()
      expect(screen.queryByTestId('download-all-button')).not.toBeInTheDocument()

      // STEP 2: Navigate to Upload-enabled Album
      const foundationAlbum = screen.getByTestId('album-card-album-1')
      await user.click(foundationAlbum)

      await waitFor(() => {
        expect(screen.getByTestId('contractor-album-view')).toBeInTheDocument()
      })

      // Assert: Upload interface is prominent for contractors
      expect(screen.getByTestId('primary-upload-area')).toBeInTheDocument()
      expect(screen.getByText(/drag and drop your photos here/i)).toBeInTheDocument()

      // STEP 3: Drag and Drop Upload
      const dropZone = screen.getByTestId('primary-upload-area')
      const mockFiles = [
        new File(['content'], 'daily-progress.jpg', { type: 'image/jpeg' })
      ]

      // Mock drag and drop
      const dragEnterEvent = new Event('dragenter', { bubbles: true })
      const dragOverEvent = new Event('dragover', { bubbles: true })
      const dropEvent = new Event('drop', { bubbles: true })

      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: mockFiles,
          types: ['Files']
        }
      })

      fireEvent(dropZone, dragEnterEvent)
      fireEvent(dropZone, dragOverEvent)
      fireEvent(dropZone, dropEvent)

      // Assert: File is added to upload queue
      await waitFor(() => {
        expect(screen.getByText('daily-progress.jpg')).toBeInTheDocument()
        expect(screen.getByTestId('upload-queue-item')).toBeInTheDocument()
      })

      // STEP 4: Add Metadata and Upload
      const descriptionInput = screen.getByTestId('photo-description-input')
      await user.type(descriptionInput, 'Daily progress on foundation work')

      const tagInput = screen.getByTestId('photo-tags-input')
      await user.type(tagInput, 'foundation,progress,daily')

      vi.mocked(PhotoService.prototype.uploadPhoto).mockResolvedValue({
        success: true,
        photoId: 'contractor-upload-1',
        thumbnailUrl: '/api/photos/contractor-upload-1/thumbnail',
        originalUrl: '/api/photos/contractor-upload-1/download',
        metadata: {
          originalName: 'daily-progress.jpg',
          fileSize: 1024 * 1024,
          mimeType: 'image/jpeg'
        }
      })

      const uploadButton = screen.getByTestId('contractor-upload-button')
      await user.click(uploadButton)

      // Assert: Upload progress and completion
      await waitFor(() => {
        expect(screen.getByTestId('upload-progress')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByTestId('upload-success')).toBeInTheDocument()
        expect(screen.getByText(/photo uploaded successfully/i)).toBeInTheDocument()
      })

      // STEP 5: Verify Upload Restrictions
      // Assert: Contractor cannot see download options
      expect(screen.queryByTestId('download-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('bulk-download')).not.toBeInTheDocument()

      // Assert: Contractor cannot delete photos
      expect(screen.queryByTestId('delete-button')).not.toBeInTheDocument()

      // STEP 6: View Upload History
      const uploadHistoryButton = screen.getByTestId('view-upload-history')
      await user.click(uploadHistoryButton)

      await waitFor(() => {
        expect(screen.getByTestId('contractor-upload-history')).toBeInTheDocument()
        expect(screen.getByText('daily-progress.jpg')).toBeInTheDocument()
        expect(screen.getByText('Daily progress on foundation work')).toBeInTheDocument()
      })
    })
  })

  describe('Mobile Device User Flow', () => {
    it('should complete mobile user experience', async () => {
      // Arrange
      const user = userEvent.setup()

      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      })

      // Mock touch events
      const mockTouchStart = vi.fn()
      const mockTouchEnd = vi.fn()

      render(
        <BrowserRouter>
          <PhotoGalleryApp projectId="project-1" userId="user-123" isMobile={true} />
        </BrowserRouter>
      )

      // STEP 1: Mobile Album Navigation
      await waitFor(() => {
        expect(screen.getByTestId('mobile-albums-view')).toBeInTheDocument()
      })

      // Assert: Mobile-optimized layout
      expect(screen.getByTestId('mobile-album-cards')).toBeInTheDocument()
      expect(screen.getByTestId('mobile-navigation-tabs')).toBeInTheDocument()

      // STEP 2: Touch Navigation
      const foundationAlbum = screen.getByTestId('mobile-album-foundation')
      await user.click(foundationAlbum)

      await waitFor(() => {
        expect(screen.getByTestId('mobile-photo-grid')).toBeInTheDocument()
      })

      // STEP 3: Mobile Photo Viewer
      const firstPhoto = screen.getByTestId('mobile-photo-thumb-1')
      await user.click(firstPhoto)

      await waitFor(() => {
        expect(screen.getByTestId('mobile-photo-viewer')).toBeInTheDocument()
      })

      // Assert: Mobile viewer controls
      expect(screen.getByTestId('mobile-swipe-area')).toBeInTheDocument()
      expect(screen.getByTestId('mobile-photo-info')).toBeInTheDocument()

      // STEP 4: Swipe Navigation (simulated)
      const swipeArea = screen.getByTestId('mobile-swipe-area')

      // Simulate touch swipe left
      fireEvent.touchStart(swipeArea, {
        touches: [{ clientX: 200, clientY: 200 }]
      })
      fireEvent.touchMove(swipeArea, {
        touches: [{ clientX: 100, clientY: 200 }]
      })
      fireEvent.touchEnd(swipeArea, {
        changedTouches: [{ clientX: 100, clientY: 200 }]
      })

      // Assert: Next photo is shown
      await waitFor(() => {
        expect(screen.getByTestId('mobile-photo-2')).toBeInTheDocument()
      })

      // STEP 5: Mobile Upload Interface
      const uploadTab = screen.getByTestId('mobile-upload-tab')
      await user.click(uploadTab)

      await waitFor(() => {
        expect(screen.getByTestId('mobile-upload-interface')).toBeInTheDocument()
      })

      // Assert: Mobile-friendly upload
      expect(screen.getByTestId('camera-capture-button')).toBeInTheDocument()
      expect(screen.getByTestId('gallery-select-button')).toBeInTheDocument()

      // STEP 6: Camera Capture (simulated)
      const cameraButton = screen.getByTestId('camera-capture-button')

      // Mock camera API
      const mockStream = {
        getTracks: () => [{ stop: vi.fn() }]
      }

      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: vi.fn().mockResolvedValue(mockStream)
        }
      })

      await user.click(cameraButton)

      await waitFor(() => {
        expect(screen.getByTestId('camera-interface')).toBeInTheDocument()
      })

      const captureButton = screen.getByTestId('capture-photo-button')
      await user.click(captureButton)

      // Assert: Photo captured and ready for upload
      await waitFor(() => {
        expect(screen.getByTestId('captured-photo-preview')).toBeInTheDocument()
        expect(screen.getByTestId('confirm-upload-button')).toBeInTheDocument()
      })
    })
  })

  describe('Error Recovery Flow', () => {
    it('should handle and recover from various error conditions', async () => {
      // Arrange
      const user = userEvent.setup()

      render(
        <BrowserRouter>
          <PhotoGalleryApp projectId="project-1" userId="user-123" />
        </BrowserRouter>
      )

      // STEP 1: Network Error Recovery
      vi.mocked(PhotoService.prototype.getProjectAlbums).mockRejectedValueOnce(
        new Error('Network connection failed')
      )

      // Assert: Error message is shown
      await waitFor(() => {
        expect(screen.getByTestId('network-error')).toBeInTheDocument()
        expect(screen.getByText(/network connection failed/i)).toBeInTheDocument()
      })

      // Act: Retry after network error
      const retryButton = screen.getByTestId('retry-button')

      // Mock successful retry
      vi.mocked(PhotoService.prototype.getProjectAlbums).mockResolvedValueOnce(mockAlbums)

      await user.click(retryButton)

      // Assert: Recovery successful
      await waitFor(() => {
        expect(screen.queryByTestId('network-error')).not.toBeInTheDocument()
        expect(screen.getByText('Foundation Work')).toBeInTheDocument()
      })

      // STEP 2: Upload Error Recovery
      const foundationAlbum = screen.getByTestId('album-card-album-1')
      await user.click(foundationAlbum)

      const uploadButton = screen.getByTestId('open-upload-dialog')
      await user.click(uploadButton)

      const fileInput = screen.getByTestId('file-input')
      const testFile = new File(['content'], 'error-test.jpg', { type: 'image/jpeg' })
      await user.upload(fileInput, testFile)

      // Mock upload failure
      vi.mocked(PhotoService.prototype.uploadPhoto).mockRejectedValueOnce(
        new Error('Upload failed: Server error')
      )

      const startUploadButton = screen.getByTestId('start-upload-button')
      await user.click(startUploadButton)

      // Assert: Upload error is handled
      await waitFor(() => {
        expect(screen.getByTestId('upload-error')).toBeInTheDocument()
        expect(screen.getByText(/upload failed: server error/i)).toBeInTheDocument()
      })

      // Act: Retry failed upload
      const retryUploadButton = screen.getByTestId('retry-upload-button')

      // Mock successful retry
      vi.mocked(PhotoService.prototype.uploadPhoto).mockResolvedValueOnce({
        success: true,
        photoId: 'retry-success',
        thumbnailUrl: '/thumb/retry.jpg',
        originalUrl: '/orig/retry.jpg',
        metadata: { originalName: 'error-test.jpg' }
      })

      await user.click(retryUploadButton)

      // Assert: Retry successful
      await waitFor(() => {
        expect(screen.getByTestId('upload-success-message')).toBeInTheDocument()
      })

      // STEP 3: Permission Error Handling
      // Mock permission denied error
      vi.mocked(PhotoService.prototype.downloadPhoto).mockRejectedValueOnce(
        new Error('Permission denied: Insufficient access rights')
      )

      const closeUploadDialog = screen.getByTestId('close-upload-dialog')
      await user.click(closeUploadDialog)

      const photoThumbnail = screen.getByTestId('photo-thumbnail-retry-success')
      await user.click(photoThumbnail)

      const downloadButton = screen.getByTestId('lightbox-download-button')
      await user.click(downloadButton)

      // Assert: Permission error is shown
      await waitFor(() => {
        expect(screen.getByTestId('permission-error')).toBeInTheDocument()
        expect(screen.getByText(/permission denied/i)).toBeInTheDocument()
      })

      // Assert: User is guided to contact admin
      expect(screen.getByTestId('contact-admin-link')).toBeInTheDocument()
    })
  })
})