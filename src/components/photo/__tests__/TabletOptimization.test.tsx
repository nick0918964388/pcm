/**
 * 平板裝置優化測試
 * 測試照片庫在平板裝置上的佈局和操作優化
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { PhotoGrid } from '../PhotoGrid'
import { PhotoLightbox } from '../PhotoLightbox'
import PhotoGalleryPage from '@/app/dashboard/[projectId]/photos/page'
import { mockPhotos } from '@/mocks/data/photos.json'

// Mock tablet viewport
const mockTabletViewport = () => {
  Object.defineProperty(window, 'innerWidth', { value: 768, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: 1024, writable: true })
  Object.defineProperty(window, 'screen', {
    value: {
      width: 768,
      height: 1024,
      orientation: { angle: 0, type: 'portrait-primary' }
    },
    writable: true
  })
}

// Mock landscape tablet
const mockTabletLandscape = () => {
  Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: 768, writable: true })
  Object.defineProperty(window, 'screen', {
    value: {
      width: 1024,
      height: 768,
      orientation: { angle: 90, type: 'landscape-primary' }
    },
    writable: true
  })
}

// Mock matchMedia for tablet
const mockMatchMediaTablet = (query: string) => {
  const tabletQueries = ['(min-width: 768px)', '(max-width: 1024px)']
  return {
    matches: tabletQueries.some(tq => query.includes(tq.slice(1, -1))),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }
}

describe('TabletOptimization', () => {
  let originalMatchMedia: typeof window.matchMedia

  beforeAll(() => {
    originalMatchMedia = window.matchMedia
    window.matchMedia = jest.fn().mockImplementation(mockMatchMediaTablet)
  })

  afterAll(() => {
    window.matchMedia = originalMatchMedia
  })

  describe('Tablet Portrait Layout', () => {
    beforeEach(() => {
      mockTabletViewport()
    })

    test('should use optimized grid layout for tablet portrait', () => {
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

      const grid = screen.getByTestId('photo-grid')

      // Should use 2-3 columns on tablet portrait
      expect(grid).toHaveClass(['grid-cols-2', 'md:grid-cols-3'])
    })

    test('should show larger thumbnails on tablet', () => {
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
          columnCount={3}
          height={600}
        />
      )

      const thumbnails = screen.getAllByTestId('photo-thumbnail')

      // Thumbnails should be larger on tablet
      expect(thumbnails[0]).toHaveClass('h-48')
    })

    test('should position controls optimally for touch', () => {
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
          columnCount={3}
          height={600}
        />
      )

      const actionButtons = screen.getAllByTestId('photo-actions')

      // Action buttons should be positioned for easy touch access
      actionButtons.forEach(button => {
        expect(button).toHaveClass('touch-target-44')
      })
    })
  })

  describe('Tablet Landscape Layout', () => {
    beforeEach(() => {
      mockTabletLandscape()
    })

    test('should use expanded grid for landscape mode', () => {
      const photos = mockPhotos.slice(0, 15)

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

      const grid = screen.getByTestId('photo-grid')

      // Should use more columns in landscape
      expect(grid).toHaveClass(['lg:grid-cols-4', 'xl:grid-cols-5'])
    })

    test('should show sidebar in landscape mode', async () => {
      mockTabletLandscape()

      // Mock router params
      jest.mock('next/navigation', () => ({
        useParams: () => ({ projectId: 'test-project' }),
        useRouter: () => ({
          push: jest.fn(),
          replace: jest.fn(),
          pathname: '/dashboard/test-project/photos'
        })
      }))

      render(<PhotoGalleryPage />)

      await waitFor(() => {
        const sidebar = screen.queryByTestId('photo-sidebar')
        expect(sidebar).toBeInTheDocument()
      })
    })
  })

  describe('Touch Optimization', () => {
    beforeEach(() => {
      mockTabletViewport()
    })

    test('should have appropriate touch targets', () => {
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
          columnCount={3}
          height={600}
        />
      )

      const selectButtons = screen.getAllByLabelText(/選擇照片/)

      // Touch targets should meet minimum size requirements (44px)
      selectButtons.forEach(button => {
        const computedStyle = window.getComputedStyle(button)
        expect(parseInt(computedStyle.minWidth)).toBeGreaterThanOrEqual(44)
        expect(parseInt(computedStyle.minHeight)).toBeGreaterThanOrEqual(44)
      })
    })

    test('should support multi-touch gestures in lightbox', () => {
      const photos = mockPhotos.slice(0, 3)
      const onClose = jest.fn()

      render(
        <PhotoLightbox
          photos={photos}
          open={true}
          index={1}
          onClose={onClose}
          enableTouchGestures={true}
          enableZoom={true}
        />
      )

      const image = screen.getByRole('img')

      // Should support pinch-to-zoom on tablet
      expect(image).toHaveAttribute('data-touch-zoom', 'enabled')
    })

    test('should handle edge swipes properly', () => {
      const photos = mockPhotos.slice(0, 5)
      const onClose = jest.fn()

      render(
        <PhotoLightbox
          photos={photos}
          open={true}
          index={2}
          onClose={onClose}
          enableTouchGestures={true}
        />
      )

      const lightbox = screen.getByRole('dialog')

      // Should handle edge swipes from screen edges
      expect(lightbox).toHaveAttribute('data-edge-swipe', 'enabled')
    })
  })

  describe('Split View Layout', () => {
    test('should support split view mode on larger tablets', () => {
      mockTabletLandscape()

      const photos = mockPhotos.slice(0, 8)

      render(
        <PhotoGrid
          photos={photos}
          selectedPhotos={['photo-1']}
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

      // Should show split view with preview panel
      const splitView = screen.queryByTestId('split-view-container')
      expect(splitView).toBeInTheDocument()
    })

    test('should maintain state when switching orientations', () => {
      const photos = mockPhotos.slice(0, 6)
      let selectedPhotos = ['photo-1', 'photo-2']
      const onSelect = jest.fn()

      const { rerender } = render(
        <PhotoGrid
          photos={photos}
          selectedPhotos={selectedPhotos}
          loading={false}
          error={null}
          onPhotoClick={jest.fn()}
          onPhotoSelect={onSelect}
          onPhotoDownload={jest.fn()}
          onPhotoDelete={jest.fn()}
          columnCount={3}
          height={600}
        />
      )

      // Switch to landscape
      mockTabletLandscape()
      fireEvent(window, new Event('orientationchange'))

      rerender(
        <PhotoGrid
          photos={photos}
          selectedPhotos={selectedPhotos}
          loading={false}
          error={null}
          onPhotoClick={jest.fn()}
          onPhotoSelect={onSelect}
          onPhotoDownload={jest.fn()}
          onPhotoDelete={jest.fn()}
          columnCount={4}
          height={600}
        />
      )

      // Selection should be preserved
      const selectedElements = screen.getAllByTestId(/photo-.*-selected/)
      expect(selectedElements).toHaveLength(2)
    })
  })

  describe('Performance on Tablet', () => {
    test('should implement efficient rendering for tablet grids', () => {
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

      // Should implement virtual scrolling for large lists
      const virtualContainer = screen.getByTestId('virtual-grid-container')
      expect(virtualContainer).toBeInTheDocument()
    })

    test('should lazy load images for tablet display', () => {
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
          columnCount={3}
          height={600}
        />
      )

      const images = screen.getAllByRole('img')

      // Images should have lazy loading attributes
      images.forEach(img => {
        expect(img).toHaveAttribute('loading', 'lazy')
      })
    })
  })
})