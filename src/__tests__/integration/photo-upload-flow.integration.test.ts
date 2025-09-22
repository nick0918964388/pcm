/**
 * 照片上傳流程整合測試
 * 測試從文件選擇到照片顯示的完整流程
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoUploader } from '@/components/photo/PhotoUploader'
import { PhotoGrid } from '@/components/photo/PhotoGrid'
import { usePhotoStore } from '@/stores/photoStore'
import { PhotoService } from '@/services/photoService'

// Mock dependencies
vi.mock('@/services/photoService')
vi.mock('@/lib/security/file-security')
vi.mock('@/lib/security/rate-limit-service')

// Mock File API
global.File = class MockFile {
  name: string
  size: number
  type: string
  lastModified: number

  constructor(bits: any[], name: string, options: any = {}) {
    this.name = name
    this.size = options.size || 1024 * 1024 // 1MB default
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

describe('Photo Upload Flow Integration Tests', () => {
  const mockProjectId = 'project-123'
  const mockAlbumId = 'album-456'
  const mockUserId = 'user-789'

  beforeEach(() => {
    vi.clearAllMocks()
    usePhotoStore.getState().reset()

    // Mock successful upload by default
    vi.mocked(PhotoService.prototype.uploadPhoto).mockResolvedValue({
      success: true,
      photoId: 'uploaded-photo-id',
      thumbnailUrl: '/api/photos/uploaded-photo-id/thumbnail',
      originalUrl: '/api/photos/uploaded-photo-id/download',
      metadata: {
        originalName: 'test-photo.jpg',
        fileSize: 1024 * 1024,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Complete Upload Flow', () => {
    it('should handle complete photo upload flow from file selection to display', async () => {
      // Arrange
      const user = userEvent.setup()
      const mockFile = new File(['test content'], 'test-photo.jpg', {
        type: 'image/jpeg',
        size: 1024 * 1024
      })

      const uploadProps = {
        projectId: mockProjectId,
        albumId: mockAlbumId,
        userId: mockUserId,
        onUploadSuccess: vi.fn(),
        onUploadError: vi.fn()
      }

      // RED: This test should fail initially as the component integration doesn't exist
      render(<PhotoUploader {...uploadProps} />)

      // Act: Simulate file selection
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFile)

      // Assert: Check upload queue is updated
      await waitFor(() => {
        const store = usePhotoStore.getState()
        expect(store.uploadQueue).toHaveLength(1)
        expect(store.uploadQueue[0].file.name).toBe('test-photo.jpg')
      })

      // Act: Trigger upload
      const uploadButton = screen.getByTestId('upload-button')
      await user.click(uploadButton)

      // Assert: Check upload service is called
      await waitFor(() => {
        expect(PhotoService.prototype.uploadPhoto).toHaveBeenCalledWith(
          mockFile,
          mockUserId,
          mockProjectId,
          mockAlbumId
        )
      })

      // Assert: Check success callback is triggered
      await waitFor(() => {
        expect(uploadProps.onUploadSuccess).toHaveBeenCalled()
      })

      // Assert: Check upload queue is cleared
      await waitFor(() => {
        const store = usePhotoStore.getState()
        expect(store.uploadQueue).toHaveLength(0)
      })
    })

    it('should handle multiple file uploads in batch', async () => {
      // Arrange
      const user = userEvent.setup()
      const mockFiles = [
        new File(['content1'], 'photo1.jpg', { type: 'image/jpeg' }),
        new File(['content2'], 'photo2.jpg', { type: 'image/jpeg' }),
        new File(['content3'], 'photo3.jpg', { type: 'image/jpeg' })
      ]

      const uploadProps = {
        projectId: mockProjectId,
        albumId: mockAlbumId,
        userId: mockUserId,
        multiple: true,
        onUploadSuccess: vi.fn()
      }

      render(<PhotoUploader {...uploadProps} />)

      // Act: Upload multiple files
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFiles)

      // Assert: Check all files are queued
      await waitFor(() => {
        const store = usePhotoStore.getState()
        expect(store.uploadQueue).toHaveLength(3)
      })

      // Act: Start batch upload
      const uploadButton = screen.getByTestId('upload-button')
      await user.click(uploadButton)

      // Assert: Check all uploads are processed
      await waitFor(() => {
        expect(PhotoService.prototype.uploadPhoto).toHaveBeenCalledTimes(3)
      })
    })

    it('should handle upload progress tracking', async () => {
      // Arrange
      const user = userEvent.setup()
      const mockFile = new File(['content'], 'progress-test.jpg', {
        type: 'image/jpeg'
      })

      // Mock upload with progress callback
      vi.mocked(PhotoService.prototype.uploadPhoto).mockImplementation(
        (file, userId, projectId, albumId, onProgress) => {
          // Simulate progress updates
          setTimeout(() => onProgress?.(25), 100)
          setTimeout(() => onProgress?.(50), 200)
          setTimeout(() => onProgress?.(75), 300)
          setTimeout(() => onProgress?.(100), 400)

          return Promise.resolve({
            success: true,
            photoId: 'progress-photo-id',
            thumbnailUrl: '/api/photos/progress-photo-id/thumbnail',
            originalUrl: '/api/photos/progress-photo-id/download',
            metadata: {
              originalName: 'progress-test.jpg',
              fileSize: 1024,
              mimeType: 'image/jpeg'
            }
          })
        }
      )

      render(<PhotoUploader projectId={mockProjectId} albumId={mockAlbumId} userId={mockUserId} />)

      // Act: Upload with progress tracking
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFile)

      const uploadButton = screen.getByTestId('upload-button')
      await user.click(uploadButton)

      // Assert: Check progress is displayed
      await waitFor(() => {
        expect(screen.getByTestId('upload-progress')).toBeInTheDocument()
      })

      // Assert: Check progress updates
      await waitFor(() => {
        const progressBar = screen.getByTestId('upload-progress')
        expect(progressBar).toHaveAttribute('value', '100')
      }, { timeout: 1000 })
    })

    it('should integrate with PhotoGrid to display uploaded photos', async () => {
      // Arrange
      const user = userEvent.setup()
      const mockFile = new File(['content'], 'integration-test.jpg', {
        type: 'image/jpeg'
      })

      const TestComponent = () => {
        const { photos } = usePhotoStore()

        return (
          <div>
            <PhotoUploader
              projectId={mockProjectId}
              albumId={mockAlbumId}
              userId={mockUserId}
            />
            <PhotoGrid
              photos={photos}
              loading={false}
              error={null}
            />
          </div>
        )
      }

      render(<TestComponent />)

      // Act: Upload photo
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFile)

      const uploadButton = screen.getByTestId('upload-button')
      await user.click(uploadButton)

      // Assert: Check photo appears in grid
      await waitFor(() => {
        expect(screen.getByTestId('photo-grid')).toBeInTheDocument()
        expect(screen.getByAltText('integration-test.jpg')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling in Upload Flow', () => {
    it('should handle upload failures gracefully', async () => {
      // Arrange
      const user = userEvent.setup()
      const mockFile = new File(['content'], 'error-test.jpg', {
        type: 'image/jpeg'
      })

      // Mock upload failure
      vi.mocked(PhotoService.prototype.uploadPhoto).mockRejectedValue(
        new Error('Upload failed due to network error')
      )

      const onErrorSpy = vi.fn()

      render(
        <PhotoUploader
          projectId={mockProjectId}
          albumId={mockAlbumId}
          userId={mockUserId}
          onUploadError={onErrorSpy}
        />
      )

      // Act: Attempt upload
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFile)

      const uploadButton = screen.getByTestId('upload-button')
      await user.click(uploadButton)

      // Assert: Check error handling
      await waitFor(() => {
        expect(onErrorSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Upload failed due to network error'
          })
        )
      })

      // Assert: Check error message is displayed
      await waitFor(() => {
        expect(screen.getByTestId('upload-error')).toBeInTheDocument()
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument()
      })
    })

    it('should handle partial batch upload failures', async () => {
      // Arrange
      const user = userEvent.setup()
      const mockFiles = [
        new File(['content1'], 'success.jpg', { type: 'image/jpeg' }),
        new File(['content2'], 'failure.jpg', { type: 'image/jpeg' }),
        new File(['content3'], 'success2.jpg', { type: 'image/jpeg' })
      ]

      // Mock mixed success/failure
      vi.mocked(PhotoService.prototype.uploadPhoto)
        .mockResolvedValueOnce({
          success: true,
          photoId: 'success-1',
          thumbnailUrl: '/thumb1',
          originalUrl: '/orig1',
          metadata: { originalName: 'success.jpg' }
        })
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          success: true,
          photoId: 'success-2',
          thumbnailUrl: '/thumb2',
          originalUrl: '/orig2',
          metadata: { originalName: 'success2.jpg' }
        })

      render(
        <PhotoUploader
          projectId={mockProjectId}
          albumId={mockAlbumId}
          userId={mockUserId}
          multiple={true}
        />
      )

      // Act: Upload batch with mixed results
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFiles)

      const uploadButton = screen.getByTestId('upload-button')
      await user.click(uploadButton)

      // Assert: Check partial success message
      await waitFor(() => {
        expect(screen.getByTestId('batch-upload-summary')).toBeInTheDocument()
        expect(screen.getByText(/2 of 3 files uploaded successfully/i)).toBeInTheDocument()
      })

      // Assert: Check successful photos are added to store
      await waitFor(() => {
        const store = usePhotoStore.getState()
        expect(store.photos).toHaveLength(2)
        expect(store.photos.map(p => p.fileName)).toEqual(['success.jpg', 'success2.jpg'])
      })
    })

    it('should handle file validation errors before upload', async () => {
      // Arrange
      const user = userEvent.setup()
      const invalidFile = new File(['content'], 'invalid.txt', {
        type: 'text/plain' // Invalid type
      })

      render(
        <PhotoUploader
          projectId={mockProjectId}
          albumId={mockAlbumId}
          userId={mockUserId}
        />
      )

      // Act: Try to upload invalid file
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, invalidFile)

      // Assert: Check validation error is shown
      await waitFor(() => {
        expect(screen.getByTestId('validation-error')).toBeInTheDocument()
        expect(screen.getByText(/unsupported file format/i)).toBeInTheDocument()
      })

      // Assert: Check upload button remains disabled
      const uploadButton = screen.getByTestId('upload-button')
      expect(uploadButton).toBeDisabled()

      // Assert: Check file is not added to queue
      const store = usePhotoStore.getState()
      expect(store.uploadQueue).toHaveLength(0)
    })
  })

  describe('Upload Cancellation', () => {
    it('should allow cancelling upload in progress', async () => {
      // Arrange
      const user = userEvent.setup()
      const mockFile = new File(['content'], 'cancel-test.jpg', {
        type: 'image/jpeg'
      })

      // Mock slow upload that can be cancelled
      let uploadCancelled = false
      vi.mocked(PhotoService.prototype.uploadPhoto).mockImplementation(
        () => new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            if (uploadCancelled) {
              reject(new Error('Upload cancelled'))
            } else {
              resolve({
                success: true,
                photoId: 'cancel-test-id',
                thumbnailUrl: '/thumb',
                originalUrl: '/orig',
                metadata: { originalName: 'cancel-test.jpg' }
              })
            }
          }, 1000)

          // Simulate cancellation mechanism
          return {
            cancel: () => {
              uploadCancelled = true
              clearTimeout(timeoutId)
            }
          }
        })
      )

      render(
        <PhotoUploader
          projectId={mockProjectId}
          albumId={mockAlbumId}
          userId={mockUserId}
        />
      )

      // Act: Start upload
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFile)

      const uploadButton = screen.getByTestId('upload-button')
      await user.click(uploadButton)

      // Act: Cancel upload
      await waitFor(() => {
        expect(screen.getByTestId('cancel-upload-button')).toBeInTheDocument()
      })

      const cancelButton = screen.getByTestId('cancel-upload-button')
      await user.click(cancelButton)

      // Assert: Check upload is cancelled
      await waitFor(() => {
        expect(screen.getByText(/upload cancelled/i)).toBeInTheDocument()
      })

      // Assert: Check upload queue is cleared
      const store = usePhotoStore.getState()
      expect(store.uploadQueue).toHaveLength(0)
    })
  })

  describe('Upload Queue Management', () => {
    it('should manage upload queue state correctly', async () => {
      // Arrange
      const user = userEvent.setup()
      const mockFiles = [
        new File(['content1'], 'queue1.jpg', { type: 'image/jpeg' }),
        new File(['content2'], 'queue2.jpg', { type: 'image/jpeg' })
      ]

      render(
        <PhotoUploader
          projectId={mockProjectId}
          albumId={mockAlbumId}
          userId={mockUserId}
          multiple={true}
        />
      )

      // Act: Add files to queue
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFiles)

      // Assert: Check queue state
      await waitFor(() => {
        const store = usePhotoStore.getState()
        expect(store.uploadQueue).toHaveLength(2)
        expect(store.uploadQueue.every(item => item.status === 'pending')).toBe(true)
      })

      // Act: Remove one file from queue
      const removeButtons = screen.getAllByTestId('remove-from-queue')
      await user.click(removeButtons[0])

      // Assert: Check queue is updated
      await waitFor(() => {
        const store = usePhotoStore.getState()
        expect(store.uploadQueue).toHaveLength(1)
        expect(store.uploadQueue[0].file.name).toBe('queue2.jpg')
      })

      // Act: Clear entire queue
      const clearQueueButton = screen.getByTestId('clear-queue-button')
      await user.click(clearQueueButton)

      // Assert: Check queue is empty
      await waitFor(() => {
        const store = usePhotoStore.getState()
        expect(store.uploadQueue).toHaveLength(0)
      })
    })
  })
})