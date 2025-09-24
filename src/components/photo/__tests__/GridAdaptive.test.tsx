/**
 * 網格自適應調整測試
 * 測試照片網格根據螢幕尺寸和內容自動調整佈局
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { PhotoGrid } from '../PhotoGrid';
import { mockPhotos } from '@/mocks/data/photos.json';

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

// Mock different viewport sizes
const mockViewportSize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
  Object.defineProperty(window, 'innerHeight', {
    value: height,
    writable: true,
  });

  // Trigger resize event
  fireEvent(window, new Event('resize'));
};

// Mock matchMedia for different breakpoints
const mockMatchMediaForBreakpoint = (width: number) => (query: string) => {
  const breakpoints = {
    '(min-width: 640px)': width >= 640,
    '(min-width: 768px)': width >= 768,
    '(min-width: 1024px)': width >= 1024,
    '(min-width: 1280px)': width >= 1280,
    '(min-width: 1536px)': width >= 1536,
  };

  const matches = Object.entries(breakpoints).some(
    ([bp, match]) => query.includes(bp.slice(1, -1)) && match
  );

  return {
    matches,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  };
};

describe('GridAdaptive', () => {
  let originalMatchMedia: typeof window.matchMedia;
  let originalResizeObserver: typeof window.ResizeObserver;

  beforeAll(() => {
    originalMatchMedia = window.matchMedia;
    originalResizeObserver = window.ResizeObserver;
    window.ResizeObserver = MockResizeObserver as any;
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
    window.ResizeObserver = originalResizeObserver;
  });

  describe('Responsive Grid Columns', () => {
    test('should use 1 column on mobile (< 640px)', () => {
      mockViewportSize(375, 667);
      window.matchMedia = jest
        .fn()
        .mockImplementation(mockMatchMediaForBreakpoint(375));

      const photos = mockPhotos.slice(0, 6);

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
      );

      const grid = screen.getByTestId('photo-grid');
      expect(grid).toHaveClass('grid-cols-1');
    });

    test('should use 2 columns on small tablet (640px - 768px)', () => {
      mockViewportSize(640, 900);
      window.matchMedia = jest
        .fn()
        .mockImplementation(mockMatchMediaForBreakpoint(640));

      const photos = mockPhotos.slice(0, 8);

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
      );

      const grid = screen.getByTestId('photo-grid');
      expect(grid).toHaveClass('sm:grid-cols-2');
    });

    test('should use 3 columns on tablet (768px - 1024px)', () => {
      mockViewportSize(768, 1024);
      window.matchMedia = jest
        .fn()
        .mockImplementation(mockMatchMediaForBreakpoint(768));

      const photos = mockPhotos.slice(0, 9);

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
      );

      const grid = screen.getByTestId('photo-grid');
      expect(grid).toHaveClass('md:grid-cols-3');
    });

    test('should use 4+ columns on desktop (> 1024px)', () => {
      mockViewportSize(1280, 800);
      window.matchMedia = jest
        .fn()
        .mockImplementation(mockMatchMediaForBreakpoint(1280));

      const photos = mockPhotos.slice(0, 12);

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
      );

      const grid = screen.getByTestId('photo-grid');
      expect(grid).toHaveClass(['lg:grid-cols-4', 'xl:grid-cols-5']);
    });
  });

  describe('Dynamic Column Adjustment', () => {
    test('should adjust columns based on container width', async () => {
      const photos = mockPhotos.slice(0, 16);

      const { container } = render(
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
      );

      const grid = screen.getByTestId('photo-grid');

      // Simulate container resize
      const resizeObserver = new MockResizeObserver();

      // Mock container width change
      Object.defineProperty(container.firstChild, 'offsetWidth', {
        value: 800,
      });

      await act(async () => {
        // Trigger resize observation
        resizeObserver.observe(grid);

        // Simulate ResizeObserver callback
        const callback = resizeObserver.observe.mock.calls[0]?.[1];
        if (callback) {
          callback([{ contentRect: { width: 800, height: 600 } }]);
        }
      });

      // Should adjust to appropriate column count for 800px width
      expect(grid).toHaveAttribute('data-auto-columns', 'true');
    });

    test('should maintain aspect ratio across different column counts', () => {
      const photos = mockPhotos.slice(0, 9);

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
          columnCount={3}
          height={600}
        />
      );

      let thumbnails = screen.getAllByTestId('photo-thumbnail');
      const initialAspectRatio =
        thumbnails[0].getAttribute('data-aspect-ratio');

      // Change to different column count
      rerender(
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
      );

      thumbnails = screen.getAllByTestId('photo-thumbnail');
      const newAspectRatio = thumbnails[0].getAttribute('data-aspect-ratio');

      // Aspect ratio should be maintained
      expect(newAspectRatio).toBe(initialAspectRatio);
    });
  });

  describe('Content-Based Adjustment', () => {
    test('should adjust grid based on photo content type', () => {
      const landscapePhotos = mockPhotos.slice(0, 4).map(photo => ({
        ...photo,
        width: 1920,
        height: 1080,
        metadata: { ...photo.metadata, orientation: 'landscape' },
      }));

      render(
        <PhotoGrid
          photos={landscapePhotos}
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
      );

      const grid = screen.getByTestId('photo-grid');

      // Should adjust for landscape photos
      expect(grid).toHaveAttribute('data-content-type', 'landscape');
    });

    test('should handle mixed orientation photos', () => {
      const mixedPhotos = [
        ...mockPhotos.slice(0, 2).map(photo => ({
          ...photo,
          width: 1080,
          height: 1920,
          metadata: { ...photo.metadata, orientation: 'portrait' },
        })),
        ...mockPhotos.slice(2, 4).map(photo => ({
          ...photo,
          width: 1920,
          height: 1080,
          metadata: { ...photo.metadata, orientation: 'landscape' },
        })),
      ];

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
      );

      const grid = screen.getByTestId('photo-grid');

      // Should use masonry layout for mixed orientations
      expect(grid).toHaveClass('masonry-grid');
    });

    test('should optimize for few photos', () => {
      const fewPhotos = mockPhotos.slice(0, 2);

      render(
        <PhotoGrid
          photos={fewPhotos}
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
      );

      const grid = screen.getByTestId('photo-grid');

      // Should use fewer columns for few photos
      expect(grid).toHaveClass('grid-cols-2');
    });
  });

  describe('Responsive Layout Changes', () => {
    test('should handle orientation changes smoothly', async () => {
      mockViewportSize(768, 1024); // Portrait tablet
      window.matchMedia = jest
        .fn()
        .mockImplementation(mockMatchMediaForBreakpoint(768));

      const photos = mockPhotos.slice(0, 8);

      const { rerender } = render(
        <PhotoGrid
          photos={photos}
          selectedPhotos={['photo-1']}
          loading={false}
          error={null}
          onPhotoClick={jest.fn()}
          onPhotoSelect={jest.fn()}
          onPhotoDownload={jest.fn()}
          onPhotoDelete={jest.fn()}
          columnCount={3}
          height={600}
        />
      );

      // Rotate to landscape
      mockViewportSize(1024, 768);
      window.matchMedia = jest
        .fn()
        .mockImplementation(mockMatchMediaForBreakpoint(1024));

      await act(async () => {
        fireEvent(window, new Event('orientationchange'));
      });

      rerender(
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
      );

      // Should maintain selection state through orientation change
      const selectedPhoto = screen.getByTestId('photo-photo-1-selected');
      expect(selectedPhoto).toBeInTheDocument();
    });

    test('should update grid gap based on screen size', () => {
      mockViewportSize(375, 667); // Mobile
      window.matchMedia = jest
        .fn()
        .mockImplementation(mockMatchMediaForBreakpoint(375));

      const photos = mockPhotos.slice(0, 6);

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
          columnCount={1}
          height={600}
        />
      );

      let grid = screen.getByTestId('photo-grid');
      expect(grid).toHaveClass('gap-2'); // Small gap on mobile

      // Switch to desktop
      mockViewportSize(1280, 800);
      window.matchMedia = jest
        .fn()
        .mockImplementation(mockMatchMediaForBreakpoint(1280));

      rerender(
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
      );

      grid = screen.getByTestId('photo-grid');
      expect(grid).toHaveClass('lg:gap-4'); // Larger gap on desktop
    });
  });

  describe('Performance Optimization', () => {
    test('should debounce resize events', async () => {
      const photos = mockPhotos.slice(0, 10);
      const onResize = jest.fn();

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
      );

      // Rapid resize events
      for (let i = 0; i < 5; i++) {
        mockViewportSize(800 + i * 10, 600);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Should debounce resize handling
      await waitFor(() => {
        expect(screen.getByTestId('photo-grid')).toHaveAttribute(
          'data-resize-debounced',
          'true'
        );
      });
    });

    test('should use CSS Grid for optimal performance', () => {
      const photos = mockPhotos.slice(0, 12);

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
      );

      const grid = screen.getByTestId('photo-grid');

      // Should use CSS Grid instead of flexbox for better performance
      expect(grid).toHaveClass('grid');
    });
  });
});
