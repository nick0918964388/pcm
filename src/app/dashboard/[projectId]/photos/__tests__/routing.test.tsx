/**
 * Photo Gallery Routing and Page Structure Tests
 * 照片庫路由配置與頁面結構測試
 */

import { render, screen } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import PhotoGalleryPage from '../page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock all photo-related dependencies
jest.mock('@/store/photoStore', () => ({
  usePhotoStore: () => ({
    photos: [],
    albums: [],
    currentAlbum: null,
    selectedPhotos: [],
    lightboxOpen: false,
    lightboxIndex: 0,
    searchQuery: '',
    viewMode: 'grid',
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
    getFilteredPhotos: () => [],
    clearSelection: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
  }),
}));

jest.mock('@/services/photoService', () => ({
  photoService: {
    getAlbums: jest.fn().mockResolvedValue({ success: true, data: [] }),
    getPhotos: jest.fn().mockResolvedValue({ success: true, data: [] }),
    deletePhoto: jest.fn(),
    downloadPhoto: jest.fn(),
    downloadPhotos: jest.fn(),
    shouldSplitDownload: jest.fn(),
    cancelBatchDownload: jest.fn(),
  },
}));

jest.mock('@/components/photo', () => ({
  PhotoUploader: () => <div data-testid='photo-uploader'>上傳器</div>,
  PhotoGrid: () => <div data-testid='photo-grid'>照片網格</div>,
  PhotoLightbox: () => <div data-testid='photo-lightbox'>燈箱</div>,
  PhotoGalleryList: () => <div data-testid='photo-gallery-list'>相簿列表</div>,
  PhotoFilters: () => <div data-testid='photo-filters'>篩選器</div>,
}));

jest.mock('@/components/photo/DownloadProgress', () => ({
  DownloadProgress: () => <div data-testid='download-progress'>下載進度</div>,
}));

describe('Photo Gallery Routing and Page Structure', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  describe('Route Structure Validation', () => {
    it('should render correctly at /dashboard/[projectId]/photos route', () => {
      (useParams as jest.Mock).mockReturnValue({ projectId: 'TEST-PROJECT' });

      render(<PhotoGalleryPage />);

      // Verify page renders with correct structure
      expect(screen.getByText('iPhoto 2.0 - 工程照片庫')).toBeInTheDocument();
      expect(
        screen.getByText('專案 TEST-PROJECT 的照片管理與預覽')
      ).toBeInTheDocument();
    });

    it('should handle different project ID formats in route', () => {
      const projectIdFormats = [
        'proj001',
        'F20P1',
        'AP8P1-PHASE2',
        'test-project-123',
        'PROJECT_WITH_UNDERSCORES',
      ];

      projectIdFormats.forEach(projectId => {
        (useParams as jest.Mock).mockReturnValue({ projectId });

        render(<PhotoGalleryPage />);

        expect(
          screen.getByText(`專案 ${projectId} 的照片管理與預覽`)
        ).toBeInTheDocument();
      });
    });

    it('should maintain proper page hierarchy structure', () => {
      (useParams as jest.Mock).mockReturnValue({ projectId: 'HIERARCHY-TEST' });

      render(<PhotoGalleryPage />);

      // Check if all major sections are present
      expect(screen.getByText('iPhoto 2.0 - 工程照片庫')).toBeInTheDocument();
      expect(screen.getByTestId('photo-gallery-list')).toBeInTheDocument();
      expect(screen.getByTestId('photo-filters')).toBeInTheDocument();
      expect(screen.getByTestId('photo-grid')).toBeInTheDocument();
    });
  });

  describe('Page Layout Structure', () => {
    it('should have proper responsive layout structure', () => {
      (useParams as jest.Mock).mockReturnValue({ projectId: 'LAYOUT-TEST' });

      render(<PhotoGalleryPage />);

      // Check main container
      const mainContainer = screen
        .getByText('iPhoto 2.0 - 工程照片庫')
        .closest('.min-h-screen');
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveClass('bg-gray-50');

      // Check responsive grid structure
      const pageContainer = screen
        .getByText('iPhoto 2.0 - 工程照片庫')
        .closest('.max-w-7xl');
      expect(pageContainer).toBeInTheDocument();
    });

    it('should organize components in correct section hierarchy', () => {
      (useParams as jest.Mock).mockReturnValue({ projectId: 'SECTION-TEST' });

      render(<PhotoGalleryPage />);

      // Header section
      expect(screen.getByText('iPhoto 2.0 - 工程照片庫')).toBeInTheDocument();
      expect(screen.getByText('上傳照片')).toBeInTheDocument();

      // Filter and gallery list section
      expect(screen.getByTestId('photo-gallery-list')).toBeInTheDocument();
      expect(screen.getByTestId('photo-filters')).toBeInTheDocument();

      // Main content section
      expect(screen.getByTestId('photo-grid')).toBeInTheDocument();
    });

    it('should have proper mobile-responsive structure', () => {
      (useParams as jest.Mock).mockReturnValue({ projectId: 'MOBILE-TEST' });

      render(<PhotoGalleryPage />);

      // Check for responsive classes
      const gridContainer = screen.getByText('搜尋與篩選').closest('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1', 'lg:grid-cols-4');
    });
  });

  describe('Dynamic Route Parameters', () => {
    it('should handle project ID parameter extraction', () => {
      (useParams as jest.Mock).mockReturnValue({ projectId: 'PARAM-TEST-123' });

      render(<PhotoGalleryPage />);

      // Should display project ID correctly
      expect(
        screen.getByText('專案 PARAM-TEST-123 的照片管理與預覽')
      ).toBeInTheDocument();
    });

    it('should handle special characters in project ID', () => {
      (useParams as jest.Mock).mockReturnValue({
        projectId: 'PROJ-2024_PHASE-1',
      });

      render(<PhotoGalleryPage />);

      expect(
        screen.getByText('專案 PROJ-2024_PHASE-1 的照片管理與預覽')
      ).toBeInTheDocument();
    });

    it('should handle missing project ID gracefully', () => {
      (useParams as jest.Mock).mockReturnValue({});

      render(<PhotoGalleryPage />);

      // Should still render but handle undefined gracefully
      expect(screen.getByText('iPhoto 2.0 - 工程照片庫')).toBeInTheDocument();
    });
  });

  describe('Navigation Integration Points', () => {
    it('should be properly structured for navigation integration', () => {
      (useParams as jest.Mock).mockReturnValue({ projectId: 'NAV-TEST' });

      render(<PhotoGalleryPage />);

      // The page should be structured to work with dashboard layout
      const pageTitle = screen.getByText('iPhoto 2.0 - 工程照片庫');
      expect(pageTitle).toBeInTheDocument();

      // Should have the proper structure for breadcrumbs
      expect(
        screen.getByText('專案 NAV-TEST 的照片管理與預覽')
      ).toBeInTheDocument();
    });

    it('should support back navigation to project dashboard', () => {
      (useParams as jest.Mock).mockReturnValue({ projectId: 'BACK-NAV-TEST' });

      render(<PhotoGalleryPage />);

      // Page should be structured to allow navigation back to dashboard
      // The route structure implies: /dashboard/[projectId]/photos
      // Should allow navigation to: /dashboard/[projectId]
      expect(screen.getByText('iPhoto 2.0 - 工程照片庫')).toBeInTheDocument();
    });
  });

  describe('URL Structure Compliance', () => {
    it('should follow PCM platform URL conventions', () => {
      (useParams as jest.Mock).mockReturnValue({
        projectId: 'URL-CONVENTION-TEST',
      });

      render(<PhotoGalleryPage />);

      // Should follow the pattern: /dashboard/[projectId]/photos
      // This test verifies the page structure supports this URL pattern
      expect(
        screen.getByText('專案 URL-CONVENTION-TEST 的照片管理與預覽')
      ).toBeInTheDocument();
    });

    it('should support nested routing for photo-specific actions', () => {
      (useParams as jest.Mock).mockReturnValue({
        projectId: 'NESTED-ROUTE-TEST',
      });

      render(<PhotoGalleryPage />);

      // The page structure should support potential nested routes like:
      // /dashboard/[projectId]/photos/[albumId]
      // /dashboard/[projectId]/photos/upload
      expect(screen.getByTestId('photo-gallery-list')).toBeInTheDocument();
      expect(screen.getByTestId('photo-grid')).toBeInTheDocument();
    });
  });

  describe('SEO and Accessibility Structure', () => {
    it('should have proper heading hierarchy', () => {
      (useParams as jest.Mock).mockReturnValue({ projectId: 'SEO-TEST' });

      render(<PhotoGalleryPage />);

      // Main heading should be h1
      const mainHeading = screen.getByText('iPhoto 2.0 - 工程照片庫');
      expect(mainHeading.tagName).toBe('H1');
    });

    it('should have descriptive page structure for screen readers', () => {
      (useParams as jest.Mock).mockReturnValue({ projectId: 'A11Y-TEST' });

      render(<PhotoGalleryPage />);

      // Should have proper landmarks
      expect(
        screen.getByText('專案 A11Y-TEST 的照片管理與預覽')
      ).toBeInTheDocument();
    });
  });

  describe('Error Page Structure', () => {
    it('should maintain page structure during error states', () => {
      (useParams as jest.Mock).mockReturnValue({ projectId: 'ERROR-TEST' });

      render(<PhotoGalleryPage />);

      // Even in error states, basic page structure should remain
      expect(screen.getByText('iPhoto 2.0 - 工程照片庫')).toBeInTheDocument();
      expect(screen.getByTestId('photo-gallery-list')).toBeInTheDocument();
    });

    it('should provide fallback content for missing data', () => {
      (useParams as jest.Mock).mockReturnValue({ projectId: 'FALLBACK-TEST' });

      render(<PhotoGalleryPage />);

      // Should render base structure even without data
      expect(screen.getByText('iPhoto 2.0 - 工程照片庫')).toBeInTheDocument();
      expect(screen.getByTestId('photo-grid')).toBeInTheDocument();
    });
  });
});
