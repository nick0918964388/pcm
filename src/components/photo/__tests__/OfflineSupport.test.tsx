/**
 * 離線模式支援測試
 * 測試照片庫在離線環境下的功能和使用者體驗
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PhotoGrid } from '../PhotoGrid'
import { PhotoUploader } from '../PhotoUploader'
import { PhotoLightbox } from '../PhotoLightbox'
import { mockPhotos } from '@/mocks/data/photos.json'

// Mock Service Worker
const mockServiceWorker = () => {
  const swRegistration = {
    installing: null,
    waiting: null,
    active: {
      state: 'activated',
      postMessage: jest.fn(),
    },
    scope: 'http://localhost:3000/',
    unregister: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }

  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      register: jest.fn().mockResolvedValue(swRegistration),
      ready: Promise.resolve(swRegistration),
      controller: swRegistration.active,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    writable: true,
  })

  return swRegistration
}

// Mock online/offline status
const mockOnlineStatus = (isOnline: boolean) => {
  Object.defineProperty(navigator, 'onLine', {
    value: isOnline,
    writable: true,
  })

  if (!isOnline) {
    fireEvent(window, new Event('offline'))
  } else {
    fireEvent(window, new Event('online'))
  }
}

// Mock IndexedDB for offline storage
const mockIndexedDB = () => {
  const mockDB = {
    transaction: jest.fn(() => ({
      objectStore: jest.fn(() => ({
        add: jest.fn(),
        get: jest.fn(),
        getAll: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
      })),
    })),
    close: jest.fn(),
  }

  const mockRequest = {
    result: mockDB,
    error: null,
    onsuccess: null,
    onerror: null,
  }

  global.indexedDB = {
    open: jest.fn(() => mockRequest),
    deleteDatabase: jest.fn(),
    databases: jest.fn(),
  } as any

  return { mockDB, mockRequest }
}

describe('OfflineSupport', () => {
  beforeEach(() => {
    mockServiceWorker()
    mockIndexedDB()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Offline Detection', () => {
    test('should detect offline status', async () => {
      mockOnlineStatus(false)

      const photos = mockPhotos.slice(0, 4)

      render(
        <PhotoGrid
          photos={photos}
          selectedPhotos={[]}
          loading={false}
          error={null}
          onPhotoClick={jest.fn()}
          onPhotoSelect={jest.fn()}
          onPhotoDownload={jest.fn()}
          onPhotoDelete={jest.fn()}
          columnCount={4}
          height={600}
        />
      )

      await waitFor(() => {
        const offlineIndicator = screen.getByTestId('offline-indicator')
        expect(offlineIndicator).toBeInTheDocument()
        expect(offlineIndicator).toHaveTextContent('離線模式')
      })
    })

    test('should update UI when coming back online', async () => {
      // Start offline
      mockOnlineStatus(false)

      const photos = mockPhotos.slice(0, 4)

      render(
        <PhotoGrid
          photos={photos}
          selectedPhotos={[]}
          loading={false}
          error={null}
          onPhotoClick={jest.fn()}
          onPhotoSelect={jest.fn()}
          onPhotoDownload={jest.fn()}
          onPhotoDelete={jest.fn()}
          columnCount={4}
          height={600}
        />
      )

      // Go back online
      await act(async () => {
        mockOnlineStatus(true)
      })

      await waitFor(() => {
        const syncIndicator = screen.getByTestId('sync-indicator')
        expect(syncIndicator).toHaveTextContent('正在同步...')
      })
    })
  })

  describe('Cached Photo Display', () => {
    test('should display cached photos when offline', async () => {
      mockOnlineStatus(false)

      const cachedPhotos = mockPhotos.slice(0, 6)

      render(
        <PhotoGrid
          photos={cachedPhotos}
          selectedPhotos={[]}
          loading={false}
          error={null}
          onPhotoClick={jest.fn()}
          onPhotoSelect={jest.fn()}
          onPhotoDownload={jest.fn()}
          onPhotoDelete={jest.fn()}
          columnCount={4}
          height={600}
        />
      )

      const thumbnails = screen.getAllByTestId('photo-thumbnail')
      expect(thumbnails).toHaveLength(6)

      // Should show cached indicator
      thumbnails.forEach(thumbnail => {
        expect(thumbnail).toHaveAttribute('data-cached', 'true')
      })
    })

    test('should show placeholder for non-cached photos', async () => {
      mockOnlineStatus(false)

      const mixedPhotos = [
        ...mockPhotos.slice(0, 2).map(photo => ({ ...photo, cached: true })),
        ...mockPhotos.slice(2, 4).map(photo => ({ ...photo, cached: false }))
      ]

      render(
        <PhotoGrid
          photos={mixedPhotos}
          selectedPhotos={[]}
          loading={false}
          error={null}
          onPhotoClick={jest.fn()}
          onPhotoSelect={jest.fn()}
          onPhotoDownload={jest.fn()}
          onPhotoDelete={jest.fn()}
          columnCount={4}
          height={600}
        />
      )

      const placeholders = screen.getAllByTestId('photo-placeholder')
      expect(placeholders).toHaveLength(2)
    })
  })

  describe('Offline Upload Queue', () => {
    test('should queue uploads when offline', async () => {
      mockOnlineStatus(false)

      const onUploadComplete = jest.fn()
      const onUploadError = jest.fn()

      render(
        <PhotoUploader
          projectId="test-project"
          albumId="test-album"
          onUploadComplete={onUploadComplete}
          onUploadError={onUploadError}
        />
      )

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByTestId('file-input')

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } })
      })

      await waitFor(() => {
        const queueIndicator = screen.getByTestId('upload-queue-indicator')
        expect(queueIndicator).toHaveTextContent('1 個檔案等待上傳')
      })
    })

    test('should process upload queue when back online', async () => {
      // Start offline with queued uploads
      mockOnlineStatus(false)

      const onUploadComplete = jest.fn()
      const onUploadError = jest.fn()

      const { rerender } = render(
        <PhotoUploader
          projectId="test-project"
          albumId="test-album"
          onUploadComplete={onUploadComplete}
          onUploadError={onUploadError}
        />
      )

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByTestId('file-input')

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } })
      })

      // Go back online
      await act(async () => {
        mockOnlineStatus(true)
      })

      rerender(
        <PhotoUploader
          projectId="test-project"
          albumId="test-album"
          onUploadComplete={onUploadComplete}
          onUploadError={onUploadError}
        />
      )

      await waitFor(() => {
        const uploadingIndicator = screen.getByTestId('uploading-indicator')
        expect(uploadingIndicator).toHaveTextContent('正在上傳佇列中的檔案...')
      })
    })

    test('should handle upload queue failures gracefully', async () => {
      mockOnlineStatus(false)

      const onUploadComplete = jest.fn()
      const onUploadError = jest.fn()

      render(
        <PhotoUploader
          projectId="test-project"
          albumId="test-album"
          onUploadComplete={onUploadComplete}
          onUploadError={onUploadError}
        />
      )

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByTestId('file-input')

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } })
      })

      // Go online but simulate upload failure
      await act(async () => {
        mockOnlineStatus(true)
        // Mock API failure
        global.fetch = jest.fn().mockRejectedValue(new Error('Upload failed'))
      })

      await waitFor(() => {
        const errorIndicator = screen.getByTestId('upload-error-indicator')
        expect(errorIndicator).toHaveTextContent('上傳失敗，請稍後重試')
      })
    })
  })

  describe('Offline Lightbox', () => {
    test('should work with cached images in lightbox', async () => {
      mockOnlineStatus(false)

      const cachedPhotos = mockPhotos.slice(0, 3).map(photo => ({
        ...photo,
        cached: true
      }))

      const onClose = jest.fn()

      render(
        <PhotoLightbox
          photos={cachedPhotos}
          open={true}
          index={0}
          onClose={onClose}
          enableZoom={true}
        />
      )

      const image = screen.getByRole('img')
      expect(image).toHaveAttribute('src', expect.stringContaining('blob:'))
    })

    test('should show loading state for non-cached images', async () => {
      mockOnlineStatus(false)

      const nonCachedPhotos = mockPhotos.slice(0, 3).map(photo => ({
        ...photo,
        cached: false
      }))

      const onClose = jest.fn()

      render(
        <PhotoLightbox
          photos={nonCachedPhotos}
          open={true}
          index={0}
          onClose={onClose}
          enableZoom={true}
        />
      )

      const loadingState = screen.getByTestId('image-loading-offline')
      expect(loadingState).toHaveTextContent('圖片需要網路連線才能載入')
    })
  })

  describe('Data Synchronization', () => {
    test('should sync data when connection is restored', async () => {
      // Start with offline cached data
      mockOnlineStatus(false)

      const photos = mockPhotos.slice(0, 4)

      const { rerender } = render(
        <PhotoGrid
          photos={photos}
          selectedPhotos={[]}
          loading={false}
          error={null}
          onPhotoClick={jest.fn()}
          onPhotoSelect={jest.fn()}
          onPhotoDownload={jest.fn()}
          onPhotoDelete={jest.fn()}
          columnCount={4}
          height={600}
        />
      )

      // Go back online
      await act(async () => {
        mockOnlineStatus(true)
      })

      // Should trigger sync
      await waitFor(() => {
        const syncIndicator = screen.getByTestId('sync-indicator')
        expect(syncIndicator).toBeInTheDocument()
      })

      // After sync completion
      rerender(
        <PhotoGrid
          photos={[...photos, { id: 'new-photo', fileName: 'new.jpg' } as any]}
          selectedPhotos={[]}
          loading={false}
          error={null}
          onPhotoClick={jest.fn()}
          onPhotoSelect={jest.fn()}
          onPhotoDownload={jest.fn()}
          onPhotoDelete={jest.fn()}
          columnCount={4}
          height={600}
        />
      )

      const updatedPhotos = screen.getAllByTestId('photo-thumbnail')
      expect(updatedPhotos).toHaveLength(5)
    })

    test('should handle sync conflicts', async () => {
      mockOnlineStatus(false)

      const photos = mockPhotos.slice(0, 4)

      render(
        <PhotoGrid
          photos={photos}
          selectedPhotos={[]}
          loading={false}
          error={null}
          onPhotoClick={jest.fn()}
          onPhotoSelect={jest.fn()}
          onPhotoDownload={jest.fn()}
          onPhotoDelete={jest.fn()}
          columnCount={4}
          height={600}
        />
      )

      // Simulate local changes while offline
      const deleteButton = screen.getAllByTestId('delete-photo-btn')[0]
      fireEvent.click(deleteButton)

      // Go back online with conflicting server data
      await act(async () => {
        mockOnlineStatus(true)
        // Mock conflict response
        global.fetch = jest.fn().mockResolvedValue({
          ok: false,
          status: 409,
          json: () => Promise.resolve({ error: 'Conflict detected' })
        })
      })

      await waitFor(() => {
        const conflictDialog = screen.getByTestId('sync-conflict-dialog')
        expect(conflictDialog).toBeInTheDocument()
      })
    })
  })

  describe('Offline Storage Management', () => {
    test('should manage storage quota effectively', async () => {
      mockOnlineStatus(false)

      // Mock storage quota API
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: jest.fn().mockResolvedValue({
            usage: 50 * 1024 * 1024, // 50MB used
            quota: 100 * 1024 * 1024  // 100MB total
          }),
          persist: jest.fn().mockResolvedValue(true),
        },
        writable: true,
      })

      const photos = mockPhotos.slice(0, 10)

      render(
        <PhotoGrid
          photos={photos}
          selectedPhotos={[]}
          loading={false}
          error={null}
          onPhotoClick={jest.fn()}
          onPhotoSelect={jest.fn()}
          onPhotoDownload={jest.fn()}
          onPhotoDelete={jest.fn()}
          columnCount={4}
          height={600}
        />
      )

      await waitFor(() => {
        const storageIndicator = screen.getByTestId('storage-usage-indicator')
        expect(storageIndicator).toHaveTextContent('儲存空間使用: 50%')
      })
    })

    test('should show warning when storage is nearly full', async () => {
      mockOnlineStatus(false)

      // Mock high storage usage
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: jest.fn().mockResolvedValue({
            usage: 90 * 1024 * 1024, // 90MB used
            quota: 100 * 1024 * 1024  // 100MB total
          }),
        },
        writable: true,
      })

      const photos = mockPhotos.slice(0, 8)

      render(
        <PhotoGrid
          photos={photos}
          selectedPhotos={[]}
          loading={false}
          error={null}
          onPhotoClick={jest.fn()}
          onPhotoSelect={jest.fn()}
          onPhotoDownload={jest.fn()}
          onPhotoDelete={jest.fn()}
          columnCount={4}
          height={600}
        />
      )

      await waitFor(() => {
        const storageWarning = screen.getByTestId('storage-warning')
        expect(storageWarning).toHaveTextContent('儲存空間不足，建議清理快取')
      })
    })
  })
})