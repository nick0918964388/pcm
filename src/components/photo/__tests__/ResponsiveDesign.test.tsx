/**
 * 響應式設計測試
 * 測試照片庫在不同裝置上的響應式行為
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PhotoGrid } from '../PhotoGrid';
import { PhotoLightbox } from '../PhotoLightbox';
import { mockPhotos } from '@/mocks/data/photos.json';

// Mock window.matchMedia
const mockMatchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

// Mock touch events
const createTouchEvent = (
  type: string,
  touches: Array<{ clientX: number; clientY: number }>
) => {
  const touchEvent = new Event(type, { bubbles: true });
  Object.defineProperty(touchEvent, 'touches', {
    value: touches.map(touch => ({
      clientX: touch.clientX,
      clientY: touch.clientY,
      identifier: Math.random(),
      target: document.body,
      pageX: touch.clientX,
      pageY: touch.clientY,
      screenX: touch.clientX,
      screenY: touch.clientY,
    })),
    writable: false,
  });
  return touchEvent;
};

describe('ResponsiveDesign', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeAll(() => {
    originalMatchMedia = window.matchMedia;
    window.matchMedia = jest.fn().mockImplementation(mockMatchMedia);
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  describe('Mobile Touch Interactions', () => {
    test('should handle swipe gestures on mobile lightbox', async () => {
      const photos = mockPhotos.slice(0, 3);
      const onClose = jest.fn();
      let currentIndex = 0;

      const { rerender } = render(
        <PhotoLightbox
          photos={photos}
          open={true}
          index={currentIndex}
          onClose={onClose}
          enableTouchGestures={true}
        />
      );

      const lightboxContainer = screen.getByRole('dialog');

      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        writable: true,
      });
      Object.defineProperty(window, 'innerHeight', {
        value: 667,
        writable: true,
      });

      // Test swipe right (previous photo)
      const swipeRightStart = createTouchEvent('touchstart', [
        { clientX: 100, clientY: 300 },
      ]);
      const swipeRightMove = createTouchEvent('touchmove', [
        { clientX: 250, clientY: 300 },
      ]);
      const swipeRightEnd = createTouchEvent('touchend', []);

      fireEvent(lightboxContainer, swipeRightStart);
      fireEvent(lightboxContainer, swipeRightMove);
      fireEvent(lightboxContainer, swipeRightEnd);

      // Should trigger navigation to previous photo
      expect(lightboxContainer).toHaveAttribute(
        'data-swipe-direction',
        'right'
      );
    });

    test('should handle pinch zoom gestures', async () => {
      const photos = mockPhotos.slice(0, 1);
      const onClose = jest.fn();

      render(
        <PhotoLightbox
          photos={photos}
          open={true}
          index={0}
          onClose={onClose}
          enableZoom={true}
          enableTouchGestures={true}
        />
      );

      const image = screen.getByRole('img');

      // Test pinch zoom
      const pinchStart = createTouchEvent('touchstart', [
        { clientX: 100, clientY: 300 },
        { clientX: 200, clientY: 300 },
      ]);
      const pinchMove = createTouchEvent('touchmove', [
        { clientX: 80, clientY: 300 },
        { clientX: 220, clientY: 300 },
      ]);
      const pinchEnd = createTouchEvent('touchend', []);

      fireEvent(image, pinchStart);
      fireEvent(image, pinchMove);
      fireEvent(image, pinchEnd);

      // Should trigger zoom
      expect(image).toHaveStyle('transform: scale(1.5)');
    });

    test('should handle tap-to-close on mobile', async () => {
      const photos = mockPhotos.slice(0, 1);
      const onClose = jest.fn();

      render(
        <PhotoLightbox
          photos={photos}
          open={true}
          index={0}
          onClose={onClose}
          enableTouchGestures={true}
        />
      );

      const overlay = screen.getByTestId('lightbox-overlay');

      // Test double tap to close
      const doubleTap = createTouchEvent('touchend', [
        { clientX: 100, clientY: 100 },
      ]);

      fireEvent(overlay, doubleTap);
      setTimeout(() => {
        fireEvent(overlay, doubleTap);
      }, 100);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 350));
      });

      expect(onClose).toHaveBeenCalled();
    });

    test('should prevent default touch behaviors', () => {
      const photos = mockPhotos.slice(0, 3);
      const onClose = jest.fn();

      render(
        <PhotoLightbox
          photos={photos}
          open={true}
          index={0}
          onClose={onClose}
          enableTouchGestures={true}
        />
      );

      const lightboxContainer = screen.getByRole('dialog');

      const touchStart = createTouchEvent('touchstart', [
        { clientX: 100, clientY: 300 },
      ]);
      const preventDefault = jest.spyOn(touchStart, 'preventDefault');

      fireEvent(lightboxContainer, touchStart);

      expect(preventDefault).toHaveBeenCalled();
    });
  });

  describe('Mobile Photo Grid Layout', () => {
    test('should adapt grid columns for mobile viewport', () => {
      const photos = mockPhotos.slice(0, 8);

      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        writable: true,
      });

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

      // Should use single column on mobile
      expect(grid).toHaveClass('grid-cols-1');
    });

    test('should show mobile-optimized controls', () => {
      const photos = mockPhotos.slice(0, 4);

      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        writable: true,
      });

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

      // Should show mobile-specific action buttons
      const mobileActions = screen.getAllByTestId('mobile-photo-actions');
      expect(mobileActions).toHaveLength(photos.length);
    });
  });

  describe('Touch Gesture Recognition', () => {
    test('should detect vertical swipe for dismissal', async () => {
      const photos = mockPhotos.slice(0, 1);
      const onClose = jest.fn();

      render(
        <PhotoLightbox
          photos={photos}
          open={true}
          index={0}
          onClose={onClose}
          enableTouchGestures={true}
        />
      );

      const lightbox = screen.getByRole('dialog');

      // Vertical swipe down
      const swipeStart = createTouchEvent('touchstart', [
        { clientX: 200, clientY: 100 },
      ]);
      const swipeMove = createTouchEvent('touchmove', [
        { clientX: 200, clientY: 300 },
      ]);
      const swipeEnd = createTouchEvent('touchend', []);

      fireEvent(lightbox, swipeStart);
      fireEvent(lightbox, swipeMove);
      fireEvent(lightbox, swipeEnd);

      expect(onClose).toHaveBeenCalled();
    });

    test('should handle edge cases for touch gestures', () => {
      const photos = mockPhotos.slice(0, 3);
      const onClose = jest.fn();

      render(
        <PhotoLightbox
          photos={photos}
          open={true}
          index={0}
          onClose={onClose}
          enableTouchGestures={true}
        />
      );

      const lightbox = screen.getByRole('dialog');

      // Test minimal movement (should not trigger navigation)
      const minimalSwipe = createTouchEvent('touchstart', [
        { clientX: 200, clientY: 300 },
      ]);
      const minimalMove = createTouchEvent('touchmove', [
        { clientX: 205, clientY: 300 },
      ]);
      const minimalEnd = createTouchEvent('touchend', []);

      fireEvent(lightbox, minimalSwipe);
      fireEvent(lightbox, minimalMove);
      fireEvent(lightbox, minimalEnd);

      // Should not trigger navigation for minimal movement
      expect(lightbox).not.toHaveAttribute('data-swipe-direction');
    });
  });
});
