/**
 * PhotoUploader 測試套件
 * TDD - RED Phase: 失敗的測試案例
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoUploader } from '../PhotoUploader'

// Mock usePhotoStore
const mockAddToUploadQueue = vi.fn()
const mockUpdateUploadProgress = vi.fn()
const mockUpdateUploadStatus = vi.fn()

vi.mock('@/store/photoStore', () => ({
  usePhotoStore: () => ({
    uploadQueue: [],
    uploadProgress: {},
    addToUploadQueue: mockAddToUploadQueue,
    updateUploadProgress: mockUpdateUploadProgress,
    updateUploadStatus: mockUpdateUploadStatus
  })
}))

// Mock photoService
const mockCreateUploadFile = vi.fn()
const mockValidateFiles = vi.fn()
const mockUploadPhotos = vi.fn()

vi.mock('@/services/photoService', () => ({
  photoService: {
    createUploadFile: mockCreateUploadFile,
    validateFiles: mockValidateFiles,
    uploadPhotos: mockUploadPhotos
  }
}))

describe('PhotoUploader', () => {
  const defaultProps = {
    projectId: 'proj001',
    albumId: 'album-1',
    onUploadComplete: vi.fn(),
    onUploadError: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateFiles.mockReturnValue({ isValid: true, errors: [] })
  })

  describe('Rendering', () => {
    it('should render upload area', () => {
      render(<PhotoUploader {...defaultProps} />)

      expect(screen.getByText('點擊或拖拽照片到此區域')).toBeInTheDocument()
      expect(screen.getByText('支援 JPG、PNG、HEIC 格式，單檔最大 10MB')).toBeInTheDocument()
    })

    it('should render file input', () => {
      render(<PhotoUploader {...defaultProps} />)

      const fileInput = screen.getByRole('button', { name: /選擇檔案/i })
      expect(fileInput).toBeInTheDocument()
    })

    it('should show loading state when disabled', () => {
      render(<PhotoUploader {...defaultProps} disabled />)

      expect(screen.getByText('上傳中...')).toBeInTheDocument()
    })
  })

  describe('File Selection', () => {
    it('should handle file selection via input', async () => {
      const user = userEvent.setup()
      render(<PhotoUploader {...defaultProps} />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByRole('button', { name: /選擇檔案/i }).closest('div')?.querySelector('input[type="file"]')

      expect(input).toBeInTheDocument()

      if (input) {
        await user.upload(input, file)
        expect(mockValidateFiles).toHaveBeenCalledWith([file])
      }
    })

    it('should handle multiple file selection', async () => {
      const user = userEvent.setup()
      render(<PhotoUploader {...defaultProps} multiple />)

      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
      ]

      const input = screen.getByRole('button', { name: /選擇檔案/i }).closest('div')?.querySelector('input[type="file"]')

      if (input) {
        await user.upload(input, files)
        expect(mockValidateFiles).toHaveBeenCalledWith(files)
      }
    })

    it('should show validation errors for invalid files', async () => {
      const user = userEvent.setup()
      mockValidateFiles.mockReturnValue({
        isValid: false,
        errors: ['test.txt: 不支援的檔案格式']
      })

      render(<PhotoUploader {...defaultProps} />)

      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      const input = screen.getByRole('button', { name: /選擇檔案/i }).closest('div')?.querySelector('input[type="file"]')

      if (input) {
        await user.upload(input, file)
        await waitFor(() => {
          expect(screen.getByText(/不支援的檔案格式/)).toBeInTheDocument()
        })
      }
    })
  })

  describe('Drag and Drop', () => {
    it('should handle drag over events', () => {
      render(<PhotoUploader {...defaultProps} />)

      const dropZone = screen.getByText('點擊或拖拽照片到此區域').closest('div')

      if (dropZone) {
        fireEvent.dragOver(dropZone, {
          dataTransfer: {
            items: [{ kind: 'file', type: 'image/jpeg' }]
          }
        })

        expect(dropZone).toHaveClass('border-primary')
      }
    })

    it('should handle file drop', async () => {
      render(<PhotoUploader {...defaultProps} />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const dropZone = screen.getByText('點擊或拖拽照片到此區域').closest('div')

      if (dropZone) {
        fireEvent.drop(dropZone, {
          dataTransfer: {
            files: [file]
          }
        })

        await waitFor(() => {
          expect(mockValidateFiles).toHaveBeenCalledWith([file])
        })
      }
    })

    it('should reject non-image files in drag over', () => {
      render(<PhotoUploader {...defaultProps} />)

      const dropZone = screen.getByText('點擊或拖拽照片到此區域').closest('div')

      if (dropZone) {
        fireEvent.dragOver(dropZone, {
          dataTransfer: {
            items: [{ kind: 'file', type: 'text/plain' }]
          }
        })

        expect(dropZone).not.toHaveClass('border-primary')
      }
    })
  })

  describe('Upload Process', () => {
    it('should create upload files and add to queue', async () => {
      const user = userEvent.setup()
      const mockUploadFile = {
        id: 'upload-1',
        file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
        projectId: 'proj001',
        albumId: 'album-1',
        metadata: {},
        progress: 0,
        status: 'pending' as const
      }

      mockCreateUploadFile.mockResolvedValue(mockUploadFile)

      render(<PhotoUploader {...defaultProps} />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByRole('button', { name: /選擇檔案/i }).closest('div')?.querySelector('input[type="file"]')

      if (input) {
        await user.upload(input, file)

        await waitFor(() => {
          expect(mockCreateUploadFile).toHaveBeenCalledWith(file, 'proj001', 'album-1')
          expect(mockAddToUploadQueue).toHaveBeenCalledWith(mockUploadFile)
        })
      }
    })

    it('should call onUploadComplete when upload succeeds', async () => {
      const onUploadComplete = vi.fn()
      const uploadFile = {
        id: 'upload-1',
        file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
        projectId: 'proj001',
        metadata: {},
        progress: 0,
        status: 'pending' as const
      }

      mockCreateUploadFile.mockResolvedValue(uploadFile)
      mockUploadPhotos.mockResolvedValue([{
        success: true,
        photoId: 'photo-1',
        thumbnailUrl: '/thumbnails/test.jpg',
        originalUrl: '/photos/test.jpg',
        metadata: {}
      }])

      render(<PhotoUploader {...defaultProps} onUploadComplete={onUploadComplete} />)

      const user = userEvent.setup()
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByRole('button', { name: /選擇檔案/i }).closest('div')?.querySelector('input[type="file"]')

      if (input) {
        await user.upload(input, file)

        await waitFor(() => {
          expect(onUploadComplete).toHaveBeenCalled()
        })
      }
    })

    it('should call onUploadError when upload fails', async () => {
      const onUploadError = vi.fn()
      const uploadFile = {
        id: 'upload-1',
        file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
        projectId: 'proj001',
        metadata: {},
        progress: 0,
        status: 'pending' as const
      }

      mockCreateUploadFile.mockResolvedValue(uploadFile)
      mockUploadPhotos.mockResolvedValue([{
        success: false,
        photoId: '',
        thumbnailUrl: '',
        originalUrl: '',
        metadata: {},
        errors: ['Upload failed']
      }])

      render(<PhotoUploader {...defaultProps} onUploadError={onUploadError} />)

      const user = userEvent.setup()
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByRole('button', { name: /選擇檔案/i }).closest('div')?.querySelector('input[type="file"]')

      if (input) {
        await user.upload(input, file)

        await waitFor(() => {
          expect(onUploadError).toHaveBeenCalled()
        })
      }
    })
  })

  describe('Upload Queue Display', () => {
    it('should show upload queue when files are uploading', () => {
      vi.mocked(vi.fn()).mockReturnValue({
        uploadQueue: [{
          id: 'upload-1',
          file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
          projectId: 'proj001',
          metadata: {},
          progress: 50,
          status: 'uploading' as const
        }],
        uploadProgress: { 'upload-1': 50 },
        addToUploadQueue: mockAddToUploadQueue,
        updateUploadProgress: mockUpdateUploadProgress,
        updateUploadStatus: mockUpdateUploadStatus
      })

      render(<PhotoUploader {...defaultProps} />)

      expect(screen.getByText('test.jpg')).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    it('should show completed uploads', () => {
      vi.mocked(vi.fn()).mockReturnValue({
        uploadQueue: [{
          id: 'upload-1',
          file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
          projectId: 'proj001',
          metadata: {},
          progress: 100,
          status: 'completed' as const
        }],
        uploadProgress: { 'upload-1': 100 },
        addToUploadQueue: mockAddToUploadQueue,
        updateUploadProgress: mockUpdateUploadProgress,
        updateUploadStatus: mockUpdateUploadStatus
      })

      render(<PhotoUploader {...defaultProps} />)

      expect(screen.getByText('test.jpg')).toBeInTheDocument()
      expect(screen.getByText('上傳完成')).toBeInTheDocument()
    })
  })
})