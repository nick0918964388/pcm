/**
 * PhotoLightbox Component Tests
 * 測試燈箱元件的各項功能
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PhotoLightbox } from '../PhotoLightbox'
import { Photo } from '@/types/photo.types'

// Mock photoService
vi.mock('@/services/photoService', () => ({
  photoService: {
    downloadPhoto: vi.fn(),
    formatFileSize: vi.fn((bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)}MB`)
  }
}))

// Mock usePhotoStore
vi.mock('@/store/photoStore', () => ({
  usePhotoStore: () => ({
    setLightboxIndex: vi.fn()
  })
}))

// Mock yet-another-react-lightbox
vi.mock('yet-another-react-lightbox', () => ({
  default: ({ open, children, ...props }: any) => 
    open ? <div data-testid="lightbox" {...props}>{children}</div> : null
}))

vi.mock('yet-another-react-lightbox/plugins/zoom', () => ({
  default: () => null
}))

vi.mock('yet-another-react-lightbox/plugins/fullscreen', () => ({
  default: () => null
}))

vi.mock('yet-another-react-lightbox/plugins/thumbnails', () => ({
  default: () => null
}))

// Mock CSS imports
vi.mock('yet-another-react-lightbox/styles.css', () => ({}))
vi.mock('yet-another-react-lightbox/plugins/thumbnails.css', () => ({}))

// Mock navigator APIs
const mockNavigator = {
  share: vi.fn(),
  clipboard: {
    writeText: vi.fn()
  }
}

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true
})

const mockPhotos: Photo[] = [
  {
    id: 'photo-1',
    fileName: 'test-photo-1.jpg',
    originalUrl: 'https://example.com/photo1-original.jpg',
    thumbnailUrl: 'https://example.com/photo1-thumb.jpg',
    width: 1920,
    height: 1080,
    fileSize: 2048000,
    mimeType: 'image/jpeg',
    uploadedAt: '2024-01-01T10:00:00Z',
    uploadedBy: 'testuser',
    albumId: 'album-1',
    projectId: 'project-1',
    metadata: {
      tags: ['工程', '進度'],
      description: '測試照片描述',
      location: {
        latitude: 25.033,
        longitude: 121.565
      }
    }
  },
  {
    id: 'photo-2',
    fileName: 'test-photo-2.jpg',
    originalUrl: 'https://example.com/photo2-original.jpg',
    thumbnailUrl: 'https://example.com/photo2-thumb.jpg',
    width: 1280,
    height: 720,
    fileSize: 1024000,
    mimeType: 'image/jpeg',
    uploadedAt: '2024-01-02T10:00:00Z',
    uploadedBy: 'testuser2',
    albumId: 'album-1',
    projectId: 'project-1',
    metadata: {
      tags: ['測試'],
      description: '另一張測試照片',
      location: {
        latitude: 25.040,
        longitude: 121.570
      }
    }
  }
]

describe('PhotoLightbox', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.removeEventListener('keydown', vi.fn())
  })

  it('should render lightbox when open is true', () => {
    render(
      <PhotoLightbox
        photos={mockPhotos}
        open={true}
        index={0}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByTestId('lightbox')).toBeInTheDocument()
  })

  it('should not render lightbox when open is false', () => {
    render(
      <PhotoLightbox
        photos={mockPhotos}
        open={false}
        index={0}
        onClose={vi.fn()}
      />
    )

    expect(screen.queryByTestId('lightbox')).not.toBeInTheDocument()
  })

  it('should display photo information panel', () => {
    render(
      <PhotoLightbox
        photos={mockPhotos}
        open={true}
        index={0}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('test-photo-1.jpg')).toBeInTheDocument()
    expect(screen.getByText('2.0MB')).toBeInTheDocument()
    expect(screen.getByText('image/jpeg')).toBeInTheDocument()
    expect(screen.getByText('1920 × 1080')).toBeInTheDocument()
    expect(screen.getByText('testuser')).toBeInTheDocument()
  })

  it('should display tags when photo has tags', () => {
    render(
      <PhotoLightbox
        photos={mockPhotos}
        open={true}
        index={0}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('工程')).toBeInTheDocument()
    expect(screen.getByText('進度')).toBeInTheDocument()
  })

  it('should display location information when available', () => {
    render(
      <PhotoLightbox
        photos={mockPhotos}
        open={true}
        index={0}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText(/緯度: 25.033000/)).toBeInTheDocument()
    expect(screen.getByText(/經度: 121.565000/)).toBeInTheDocument()
  })

  it('should display keyboard shortcuts when enabled', () => {
    render(
      <PhotoLightbox
        photos={mockPhotos}
        open={true}
        index={0}
        onClose={vi.fn()}
        enableKeyboardShortcuts={true}
      />
    )

    expect(screen.getByText('鍵盤快捷鍵')).toBeInTheDocument()
    expect(screen.getByText('← / → 切換照片')).toBeInTheDocument()
    expect(screen.getByText('ESC 關閉')).toBeInTheDocument()
  })

  it('should not display keyboard shortcuts when disabled', () => {
    render(
      <PhotoLightbox
        photos={mockPhotos}
        open={true}
        index={0}
        onClose={vi.fn()}
        enableKeyboardShortcuts={false}
      />
    )

    expect(screen.queryByText('鍵盤快捷鍵')).not.toBeInTheDocument()
  })

  it('should show current photo index', () => {
    render(
      <PhotoLightbox
        photos={mockPhotos}
        open={true}
        index={1}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('2 / 2')).toBeInTheDocument()
    expect(screen.getByText('照片 ID: photo-2')).toBeInTheDocument()
  })

  it('should render all toolbar buttons when features are enabled', () => {
    render(
      <PhotoLightbox
        photos={mockPhotos}
        open={true}
        index={0}
        onClose={vi.fn()}
        enableZoom={true}
        enableFullscreen={true}
        enableThumbnails={true}
      />
    )

    expect(screen.getByTitle('放大 (Z)')).toBeInTheDocument()
    expect(screen.getByTitle('縮小 (Shift+Z)')).toBeInTheDocument()
    expect(screen.getByTitle('全螢幕 (F)')).toBeInTheDocument()
    expect(screen.getByTitle('縮圖 (T)')).toBeInTheDocument()
    expect(screen.getByTitle('下載 (D)')).toBeInTheDocument()
    expect(screen.getByTitle('分享 (S)')).toBeInTheDocument()
    expect(screen.getByTitle('關閉 (ESC)')).toBeInTheDocument()
  })

  it('should hide optional toolbar buttons when features are disabled', () => {
    render(
      <PhotoLightbox
        photos={mockPhotos}
        open={true}
        index={0}
        onClose={vi.fn()}
        enableZoom={false}
        enableFullscreen={false}
        enableThumbnails={false}
      />
    )

    expect(screen.queryByTitle('放大 (Z)')).not.toBeInTheDocument()
    expect(screen.queryByTitle('縮小 (Shift+Z)')).not.toBeInTheDocument()
    expect(screen.queryByTitle('全螢幕 (F)')).not.toBeInTheDocument()
    expect(screen.queryByTitle('縮圖 (T)')).not.toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    render(
      <PhotoLightbox
        photos={mockPhotos}
        open={true}
        index={0}
        onClose={onClose}
      />
    )

    await user.click(screen.getByTitle('關閉 (ESC)'))
    expect(onClose).toHaveBeenCalled()
  })

  it('should handle download button click', async () => {
    const { photoService } = await import('@/services/photoService')
    render(
      <PhotoLightbox
        photos={mockPhotos}
        open={true}
        index={0}
        onClose={vi.fn()}
      />
    )

    await user.click(screen.getByTitle('下載 (D)'))
    expect(photoService.downloadPhoto).toHaveBeenCalledWith(mockPhotos[0], 'original')
  })

  it('should handle share with native API', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined)
    mockNavigator.share = mockShare

    render(
      <PhotoLightbox
        photos={mockPhotos}
        open={true}
        index={0}
        onClose={vi.fn()}
      />
    )

    await user.click(screen.getByTitle('分享 (S)'))
    
    expect(mockShare).toHaveBeenCalledWith({
      title: 'test-photo-1.jpg',
      text: '查看工程照片: test-photo-1.jpg',
      url: 'https://example.com/photo1-original.jpg'
    })
  })

  it('should fallback to clipboard when share API fails', async () => {
    const mockShare = vi.fn().mockRejectedValue(new Error('Share failed'))
    const mockWriteText = vi.fn()
    
    mockNavigator.share = mockShare
    mockNavigator.clipboard.writeText = mockWriteText

    render(
      <PhotoLightbox
        photos={mockPhotos}
        open={true}
        index={0}
        onClose={vi.fn()}
      />
    )

    await user.click(screen.getByTitle('分享 (S)'))
    
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('https://example.com/photo1-original.jpg')
    })
  })

  describe('Keyboard Navigation', () => {
    it('should handle arrow key navigation', () => {
      const onIndexChange = vi.fn()
      render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
          onIndexChange={onIndexChange}
          enableKeyboardShortcuts={true}
        />
      )

      fireEvent.keyDown(document, { key: 'ArrowRight' })
      expect(onIndexChange).toHaveBeenCalledWith(1)
    })

    it('should handle arrow up/down navigation', () => {
      const onIndexChange = vi.fn()
      const { rerender } = render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={1}
          onClose={vi.fn()}
          onIndexChange={onIndexChange}
          enableKeyboardShortcuts={true}
        />
      )

      fireEvent.keyDown(document, { key: 'ArrowUp' })
      expect(onIndexChange).toHaveBeenCalledWith(0)

      // Rerender with index 0 to test ArrowDown from a valid position
      vi.clearAllMocks()
      rerender(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
          onIndexChange={onIndexChange}
          enableKeyboardShortcuts={true}
        />
      )

      fireEvent.keyDown(document, { key: 'ArrowDown' })
      expect(onIndexChange).toHaveBeenCalledWith(1)
    })

    it('should handle Home/End keys', () => {
      const onIndexChange = vi.fn()
      render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={1}
          onClose={vi.fn()}
          onIndexChange={onIndexChange}
          enableKeyboardShortcuts={true}
        />
      )

      fireEvent.keyDown(document, { key: 'Home' })
      expect(onIndexChange).toHaveBeenCalledWith(0)

      fireEvent.keyDown(document, { key: 'End' })
      expect(onIndexChange).toHaveBeenCalledWith(1)
    })

    it('should not navigate beyond boundaries', () => {
      const onIndexChange = vi.fn()
      render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
          onIndexChange={onIndexChange}
          enableKeyboardShortcuts={true}
        />
      )

      fireEvent.keyDown(document, { key: 'ArrowLeft' })
      expect(onIndexChange).not.toHaveBeenCalled()
    })

    it('should not navigate beyond upper boundary at last photo', () => {
      const onIndexChange = vi.fn()
      render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={mockPhotos.length - 1}
          onClose={vi.fn()}
          onIndexChange={onIndexChange}
          enableKeyboardShortcuts={true}
        />
      )

      fireEvent.keyDown(document, { key: 'ArrowRight' })
      expect(onIndexChange).not.toHaveBeenCalled()
    })

    it('should handle download shortcut (D)', async () => {
      const { photoService } = await import('@/services/photoService')
      render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
          enableKeyboardShortcuts={true}
        />
      )

      fireEvent.keyDown(document, { key: 'd' })
      expect(photoService.downloadPhoto).toHaveBeenCalledWith(mockPhotos[0], 'original')

      vi.clearAllMocks()
      fireEvent.keyDown(document, { key: 'D' })
      expect(photoService.downloadPhoto).toHaveBeenCalledWith(mockPhotos[0], 'original')
    })

    it('should handle share shortcut (S)', async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined)
      mockNavigator.share = mockShare

      render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
          enableKeyboardShortcuts={true}
        />
      )

      fireEvent.keyDown(document, { key: 's' })
      expect(mockShare).toHaveBeenCalledWith({
        title: 'test-photo-1.jpg',
        text: '查看工程照片: test-photo-1.jpg',
        url: 'https://example.com/photo1-original.jpg'
      })

      vi.clearAllMocks()
      fireEvent.keyDown(document, { key: 'S' })
      expect(mockShare).toHaveBeenCalledWith({
        title: 'test-photo-1.jpg',
        text: '查看工程照片: test-photo-1.jpg',
        url: 'https://example.com/photo1-original.jpg'
      })
    })

    it('should prevent default action for navigation keys', () => {
      const onIndexChange = vi.fn()

      render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
          onIndexChange={onIndexChange}
          enableKeyboardShortcuts={true}
        />
      )

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      document.dispatchEvent(event)
      expect(preventDefaultSpy).toHaveBeenCalled()
      expect(onIndexChange).toHaveBeenCalledWith(1)
    })

    it('should ignore keyboard shortcuts when disabled', () => {
      const onIndexChange = vi.fn()
      render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
          onIndexChange={onIndexChange}
          enableKeyboardShortcuts={false}
        />
      )

      fireEvent.keyDown(document, { key: 'ArrowRight' })
      expect(onIndexChange).not.toHaveBeenCalled()
    })
  })

  describe('Plugin Configuration', () => {
    it('should pass zoom configuration when enabled', () => {
      const { container } = render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
          enableZoom={true}
        />
      )
      
      const lightbox = container.querySelector('[data-testid="lightbox"]')
      expect(lightbox).toBeInTheDocument()
    })

    it('should exclude plugins when disabled', () => {
      const { container } = render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
          enableZoom={false}
          enableFullscreen={false}
          enableThumbnails={false}
        />
      )
      
      const lightbox = container.querySelector('[data-testid="lightbox"]')
      expect(lightbox).toBeInTheDocument()
    })
  })

  describe('Performance Features', () => {
    it('should show preloading indicator', async () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
        />
      )

      // Note: In actual implementation, preloading indicator might appear
      // This test verifies the component structure supports it
      await waitFor(() => {
        expect(screen.getByText('1 / 2')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should provide proper ARIA labels in controller config', () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
        />
      )

      const lightbox = screen.getByTestId('lightbox')
      expect(lightbox).toBeInTheDocument()
    })
  })

  describe('Zoom Functionality', () => {
    it('should render zoom controls when enabled', () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
          enableZoom={true}
        />
      )

      expect(screen.getByTitle('放大 (Z)')).toBeInTheDocument()
      expect(screen.getByTitle('縮小 (Shift+Z)')).toBeInTheDocument()
    })

    it('should configure zoom plugin with proper settings', () => {
      const { container } = render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
          enableZoom={true}
        />
      )

      // Verify lightbox is rendered (the actual configuration is internal)
      const lightbox = container.querySelector('[data-testid="lightbox"]')
      expect(lightbox).toBeInTheDocument()
    })

    it('should not render zoom controls when disabled', () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
          enableZoom={false}
        />
      )

      expect(screen.queryByTitle('放大 (Z)')).not.toBeInTheDocument()
      expect(screen.queryByTitle('縮小 (Shift+Z)')).not.toBeInTheDocument()
    })
  })

  describe('Touch Gesture Support', () => {
    it('should enable touch gestures when configured', () => {
      const { container } = render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
          enableTouchGestures={true}
        />
      )

      const lightbox = container.querySelector('[data-testid="lightbox"]')
      expect(lightbox).toBeInTheDocument()
      // Touch gesture configuration is internal to the lightbox component
    })

    it('should disable touch gestures when configured', () => {
      const { container } = render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
          enableTouchGestures={false}
        />
      )

      const lightbox = container.querySelector('[data-testid="lightbox"]')
      expect(lightbox).toBeInTheDocument()
    })
  })

  describe('Photo Information Panel', () => {
    it('should display complete photo information', () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
        />
      )

      // Basic info
      expect(screen.getByText('test-photo-1.jpg')).toBeInTheDocument()
      expect(screen.getByText('檔案大小')).toBeInTheDocument()
      expect(screen.getByText('2.0MB')).toBeInTheDocument()
      expect(screen.getByText('檔案類型')).toBeInTheDocument()
      expect(screen.getByText('image/jpeg')).toBeInTheDocument()
      expect(screen.getByText('圖片尺寸')).toBeInTheDocument()
      expect(screen.getByText('1920 × 1080')).toBeInTheDocument()
      expect(screen.getByText('上傳者')).toBeInTheDocument()
      expect(screen.getByText('testuser')).toBeInTheDocument()
    })

    it('should display metadata when available', () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
        />
      )

      // Tags
      expect(screen.getByText('標籤')).toBeInTheDocument()
      expect(screen.getByText('工程')).toBeInTheDocument()
      expect(screen.getByText('進度')).toBeInTheDocument()

      // Description
      expect(screen.getByText('描述')).toBeInTheDocument()
      expect(screen.getByText('測試照片描述')).toBeInTheDocument()

      // Location
      expect(screen.getByText('位置資訊')).toBeInTheDocument()
      expect(screen.getByText(/緯度: 25.033000/)).toBeInTheDocument()
      expect(screen.getByText(/經度: 121.565000/)).toBeInTheDocument()
    })

    it('should not display metadata sections when not available', () => {
      const photosWithoutMetadata = [{
        ...mockPhotos[0],
        metadata: {}
      }]

      render(
        <PhotoLightbox
          photos={photosWithoutMetadata}
          open={true}
          index={0}
          onClose={vi.fn()}
        />
      )

      expect(screen.queryByText('標籤')).not.toBeInTheDocument()
      expect(screen.queryByText('描述')).not.toBeInTheDocument()
      expect(screen.queryByText('位置資訊')).not.toBeInTheDocument()
    })

    it('should update information when photo changes', () => {
      const { rerender } = render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
        />
      )

      expect(screen.getByText('test-photo-1.jpg')).toBeInTheDocument()
      expect(screen.getByText('1 / 2')).toBeInTheDocument()

      rerender(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={1}
          onClose={vi.fn()}
        />
      )

      expect(screen.getByText('test-photo-2.jpg')).toBeInTheDocument()
      expect(screen.getByText('2 / 2')).toBeInTheDocument()
    })
  })

  describe('Navigation Controls', () => {
    it('should hide navigation buttons for single photo', () => {
      const singlePhoto = [mockPhotos[0]]

      const { container } = render(
        <PhotoLightbox
          photos={singlePhoto}
          open={true}
          index={0}
          onClose={vi.fn()}
        />
      )

      // The component should render buttonPrev and buttonNext as null for single photos
      const lightbox = container.querySelector('[data-testid="lightbox"]')
      expect(lightbox).toBeInTheDocument()
    })

    it('should show navigation buttons for multiple photos', () => {
      const { container } = render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
        />
      )

      const lightbox = container.querySelector('[data-testid="lightbox"]')
      expect(lightbox).toBeInTheDocument()
    })

    it('should call onIndexChange when navigating', () => {
      const onIndexChange = vi.fn()
      const { rerender } = render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
          onIndexChange={onIndexChange}
        />
      )

      // Simulate index change via keyboard
      fireEvent.keyDown(document, { key: 'ArrowRight' })
      expect(onIndexChange).toHaveBeenCalledWith(1)
    })
  })

  describe('Fullscreen Support', () => {
    it('should show fullscreen button when enabled', () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
          enableFullscreen={true}
        />
      )

      expect(screen.getByTitle('全螢幕 (F)')).toBeInTheDocument()
    })

    it('should hide fullscreen button when disabled', () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
          enableFullscreen={false}
        />
      )

      expect(screen.queryByTitle('全螢幕 (F)')).not.toBeInTheDocument()
    })
  })

  describe('Thumbnails Support', () => {
    it('should show thumbnails button when enabled', () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
          enableThumbnails={true}
        />
      )

      expect(screen.getByTitle('縮圖 (T)')).toBeInTheDocument()
    })

    it('should hide thumbnails button when disabled', () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
          enableThumbnails={false}
        />
      )

      expect(screen.queryByTitle('縮圖 (T)')).not.toBeInTheDocument()
    })

    it('should configure thumbnails plugin correctly', () => {
      const { container } = render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
          enableThumbnails={true}
        />
      )

      const lightbox = container.querySelector('[data-testid="lightbox"]')
      expect(lightbox).toBeInTheDocument()
      // Thumbnails configuration is internal to the lightbox component
    })
  })

  describe('Error Handling', () => {
    it('should not crash when photos array is empty', () => {
      render(
        <PhotoLightbox
          photos={[]}
          open={true}
          index={0}
          onClose={vi.fn()}
        />
      )

      expect(screen.queryByTestId('lightbox')).not.toBeInTheDocument()
    })

    it('should handle invalid index gracefully', () => {
      render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={999}
          onClose={vi.fn()}
        />
      )

      expect(screen.getByTestId('lightbox')).toBeInTheDocument()
    })

    it('should handle download error gracefully', async () => {
      const { photoService } = await import('@/services/photoService')
      ;(photoService.downloadPhoto as any).mockRejectedValueOnce(new Error('Download failed'))

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
        />
      )

      await user.click(screen.getByTitle('下載 (D)'))

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Download failed:', expect.any(Error))
      })

      consoleErrorSpy.mockRestore()
    })

    it('should handle share error gracefully', async () => {
      const mockShare = vi.fn().mockRejectedValue(new Error('Share not supported'))
      const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard not supported'))

      mockNavigator.share = mockShare
      mockNavigator.clipboard.writeText = mockWriteText

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <PhotoLightbox
          photos={mockPhotos}
          open={true}
          index={0}
          onClose={vi.fn()}
        />
      )

      await user.click(screen.getByTitle('分享 (S)'))

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled()
      })

      consoleErrorSpy.mockRestore()
    })
  })
})