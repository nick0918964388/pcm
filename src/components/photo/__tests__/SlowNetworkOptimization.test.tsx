/**
 * 慢速網路優化測試
 * 測試照片庫在慢速網路環境下的效能優化
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PhotoGrid } from '../PhotoGrid'
import { PhotoLightbox } from '../PhotoLightbox'
import { PhotoUploader } from '../PhotoUploader'
import { mockPhotos } from '@/mocks/data/photos.json'

// Mock slow network conditions
const mockSlowNetwork = (downloadThroughput = 1000000, uploadThroughput = 500000, latency = 2000) => {
  Object.defineProperty(navigator, 'connection', {
    value: {
      effectiveType: '2g',
      downlink: downloadThroughput / 1000000, // Mbps
      rtt: latency,
      saveData: true,
    },
    writable: true,
  })

  // Mock fetch with delay to simulate slow network
  const originalFetch = global.fetch
  global.fetch = jest.fn().mockImplementation(async (...args) => {
    await new Promise(resolve => setTimeout(resolve, latency))
    return originalFetch(...args)
  })

  return () => {
    global.fetch = originalFetch
  }
}

// Mock IntersectionObserver for lazy loading
const mockIntersectionObserver = () => {
  const mockObserver = {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }

  global.IntersectionObserver = jest.fn().mockImplementation((callback) => {
    mockObserver.callback = callback
    return mockObserver
  })

  return mockObserver
}

describe('SlowNetworkOptimization', () => {
  let restoreNetwork: () => void
  let mockObserver: any

  beforeEach(() => {
    restoreNetwork = mockSlowNetwork()
    mockObserver = mockIntersectionObserver()
  })

  afterEach(() => {
    restoreNetwork()
    jest.clearAllMocks()
  })

  describe('Network Detection', () => {
    test('should detect slow network connection', async () => {
      const photos = mockPhotos.slice(0, 6)

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
        const networkIndicator = screen.getByTestId('network-speed-indicator')
        expect(networkIndicator).toHaveTextContent('慢速網路模式')
      })
    })

    test('should enable data saver mode automatically', async () => {
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
        const dataSaverIndicator = screen.getByTestId('data-saver-indicator')
        expect(dataSaverIndicator).toHaveTextContent('數據節省模式已啟用')
      })
    })
  })

  describe('Progressive Image Loading', () => {
    test('should load low-quality images first on slow networks', async () => {
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

      const images = screen.getAllByRole('img')

      // Should load low-quality thumbnails first
      images.forEach(img => {
        expect(img).toHaveAttribute('src', expect.stringContaining('quality=30'))
      })

      // Wait for progressive enhancement
      await waitFor(() => {
        images.forEach(img => {
          expect(img).toHaveAttribute('data-progressive-loaded', 'true')
        })
      }, { timeout: 5000 })
    })

    test('should implement blur-to-clear loading effect', async () => {
      const photos = mockPhotos.slice(0, 3)

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
          columnCount={3}
          height={600}
        />
      )

      const thumbnails = screen.getAllByTestId('photo-thumbnail')

      // Should start with blurred low-quality image
      thumbnails.forEach(thumbnail => {
        expect(thumbnail).toHaveClass('blur-sm')
      })

      // Should remove blur when high-quality loads
      await waitFor(() => {
        thumbnails.forEach(thumbnail => {
          expect(thumbnail).not.toHaveClass('blur-sm')
        })
      }, { timeout: 10000 })
    })
  })

  describe('Lazy Loading Optimization', () => {
    test('should implement aggressive lazy loading on slow networks', () => {
      const photos = mockPhotos.slice(0, 20)

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

      // Should only load images in viewport
      expect(mockObserver.observe).toHaveBeenCalled()

      const visibleImages = screen.getAllByRole('img')
      const placeholders = screen.getAllByTestId('image-placeholder')

      // Should show more placeholders on slow networks
      expect(placeholders.length).toBeGreaterThan(visibleImages.length)
    })

    test('should preload only critical images', async () => {
      const photos = mockPhotos.slice(0, 12)

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

      // Simulate intersection
      await act(async () => {
        const entries = photos.slice(0, 4).map((_, index) => ({
          isIntersecting: true,
          target: { dataset: { photoIndex: index.toString() } },
        }))
        mockObserver.callback(entries)
      })

      await waitFor(() => {
        const preloadedImages = screen.getAllByTestId('preloaded-image')
        expect(preloadedImages).toHaveLength(4) // Only first row
      })
    })
  })

  describe('Upload Optimization', () => {
    test('should compress images more aggressively on slow networks', async () => {
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

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg', size: 5 * 1024 * 1024 }) // 5MB
      const input = screen.getByTestId('file-input')

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } })
      })

      await waitFor(() => {
        const compressionIndicator = screen.getByTestId('compression-indicator')
        expect(compressionIndicator).toHaveTextContent('高壓縮模式 (適用於慢速網路)')
      })
    })

    test('should show detailed upload progress on slow networks', async () => {
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

      const uploadButton = screen.getByTestId('upload-button')
      fireEvent.click(uploadButton)

      await waitFor(() => {
        const detailedProgress = screen.getByTestId('detailed-upload-progress')
        expect(detailedProgress).toHaveTextContent(/上傳中.*剩餘時間/)
      })
    })

    test('should implement retry mechanism for failed uploads', async () => {
      // Mock upload failure
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Upload failed'))

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

      const uploadButton = screen.getByTestId('upload-button')
      fireEvent.click(uploadButton)

      await waitFor(() => {
        const retryButton = screen.getByTestId('retry-upload-button')
        expect(retryButton).toBeInTheDocument()
      })
    })
  })

  describe('Lightbox Optimization', () => {
    test('should load medium quality images in lightbox on slow networks', async () => {
      const photos = mockPhotos.slice(0, 3)
      const onClose = jest.fn()

      render(
        <PhotoLightbox
          photos={photos}
          open={true}
          index={0}
          onClose={onClose}
          enableZoom={true}
        />
      )

      const image = screen.getByRole('img')

      // Should load medium quality first
      expect(image).toHaveAttribute('src', expect.stringContaining('quality=60'))

      await waitFor(() => {
        // Should upgrade to high quality after loading
        expect(image).toHaveAttribute('data-quality-upgraded', 'true')
      }, { timeout: 8000 })
    })

    test('should preload adjacent images with lower priority', async () => {
      const photos = mockPhotos.slice(0, 5)
      const onClose = jest.fn()

      render(
        <PhotoLightbox
          photos={photos}
          open={true}
          index={2}
          onClose={onClose}
          enableZoom={true}
        />
      )

      await waitFor(() => {
        const preloadedImages = screen.getAllByTestId('preloaded-lightbox-image')
        // Should preload previous and next image only
        expect(preloadedImages).toHaveLength(2)
      })
    })
  })

  describe('Data Usage Monitoring', () => {
    test('should track data usage and show warnings', async () => {
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

      // Simulate data usage exceeding threshold
      await act(async () => {
        // Mock data usage API
        Object.defineProperty(navigator, 'storage', {
          value: {
            estimate: jest.fn().mockResolvedValue({
              usage: 50 * 1024 * 1024, // 50MB
            }),
          },
          writable: true,
        })
      })

      await waitFor(() => {
        const dataUsageWarning = screen.getByTestId('data-usage-warning')
        expect(dataUsageWarning).toHaveTextContent('已使用大量數據')
      })
    })

    test('should offer reduced quality mode', async () => {
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
        const qualityToggle = screen.getByTestId('quality-mode-toggle')
        expect(qualityToggle).toHaveTextContent('降低畫質以節省流量')
      })

      fireEvent.click(qualityToggle)

      const images = screen.getAllByRole('img')
      images.forEach(img => {
        expect(img).toHaveAttribute('src', expect.stringContaining('quality=20'))
      })
    })
  })

  describe('Background Sync', () => {
    test('should defer non-critical updates on slow networks', async () => {
      const photos = mockPhotos.slice(0, 6)

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
        const backgroundSyncIndicator = screen.getByTestId('background-sync-indicator')
        expect(backgroundSyncIndicator).toHaveTextContent('背景同步已暫停以節省流量')
      })
    })

    test('should batch API requests to reduce overhead', async () => {
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

      // Simulate multiple selections
      const selectButtons = screen.getAllByLabelText(/選擇照片/)
      selectButtons.slice(0, 3).forEach(button => {
        fireEvent.click(button)
      })

      await waitFor(() => {
        const batchIndicator = screen.getByTestId('batch-request-indicator')
        expect(batchIndicator).toHaveTextContent('批次處理請求以提高效率')
      })
    })
  })

  describe('Performance Metrics', () => {
    test('should measure and display load times', async () => {
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
        const performanceIndicator = screen.getByTestId('performance-indicator')
        expect(performanceIndicator).toHaveTextContent(/載入時間.*秒/)
      }, { timeout: 8000 })
    })

    test('should adapt behavior based on performance metrics', async () => {
      const photos = mockPhotos.slice(0, 12)

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

      // Should reduce number of concurrent requests on slow networks
      await waitFor(() => {
        const adaptiveIndicator = screen.getByTestId('adaptive-loading-indicator')
        expect(adaptiveIndicator).toHaveTextContent('已調整載入策略以適應網路狀況')
      })
    })
  })
})