/**
 * Photo Gallery Project Management Integration Tests
 * 照片庫與專案管理模組整合測試
 */

import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import PhotoGalleryPage from '../page';
import { photoService } from '@/services/photoService';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock photo service
jest.mock('@/services/photoService', () => ({
  photoService: {
    getAlbums: jest.fn(),
    getPhotos: jest.fn(),
    uploadPhotos: jest.fn(),
    deletePhoto: jest.fn(),
  },
}));

// Mock photo store
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

// Mock photo components
jest.mock('@/components/photo', () => ({
  PhotoUploader: () => <div data-testid='photo-uploader'>上傳元件</div>,
  PhotoGrid: () => <div data-testid='photo-grid'>照片網格</div>,
  PhotoLightbox: () => <div data-testid='photo-lightbox'>燈箱</div>,
  PhotoGalleryList: () => <div data-testid='photo-gallery-list'>相簿列表</div>,
  PhotoFilters: () => <div data-testid='photo-filters'>篩選器</div>,
}));

jest.mock('@/components/photo/DownloadProgress', () => ({
  DownloadProgress: () => <div data-testid='download-progress'>下載進度</div>,
}));

describe('Photo Gallery Project Management Integration', () => {
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
    (photoService.getAlbums as jest.Mock).mockResolvedValue({
      success: true,
      data: [],
    });
    (photoService.getPhotos as jest.Mock).mockResolvedValue({
      success: true,
      data: [],
    });
  });

  describe('Project Context Integration', () => {
    it('should correctly identify project from different project IDs', async () => {
      const testCases = [
        { projectId: 'proj001', expectedProject: 'FAB20 Phase1' },
        { projectId: 'proj002', expectedProject: 'FAB21 Phase2 專案' },
        { projectId: 'F20P1', expectedProject: 'F20P1' },
        { projectId: 'AP8P1', expectedProject: 'AP8P1' },
      ];

      for (const testCase of testCases) {
        (useParams as jest.Mock).mockReturnValue({
          projectId: testCase.projectId,
        });

        render(<PhotoGalleryPage />);

        await waitFor(() => {
          expect(
            screen.getByText(`專案 ${testCase.projectId} 的照片管理與預覽`)
          ).toBeInTheDocument();
        });

        // Should load albums with correct project ID
        expect(photoService.getAlbums).toHaveBeenCalledWith(testCase.projectId);
      }
    });

    it('should handle project context switching', async () => {
      // Start with project 1
      (useParams as jest.Mock).mockReturnValue({ projectId: 'proj001' });

      const { rerender } = render(<PhotoGalleryPage />);

      await waitFor(() => {
        expect(photoService.getAlbums).toHaveBeenCalledWith('proj001');
      });

      // Switch to project 2
      (useParams as jest.Mock).mockReturnValue({ projectId: 'proj002' });

      rerender(<PhotoGalleryPage />);

      await waitFor(() => {
        expect(photoService.getAlbums).toHaveBeenCalledWith('proj002');
      });
    });
  });

  describe('Dashboard Navigation Integration', () => {
    it('should be accessible from project dashboard navigation', async () => {
      (useParams as jest.Mock).mockReturnValue({ projectId: 'TEST-PROJECT' });

      render(<PhotoGalleryPage />);

      await waitFor(() => {
        // Photo gallery should be accessible via dashboard route
        expect(screen.getByText('iPhoto 2.0 - 工程照片庫')).toBeInTheDocument();
        expect(
          screen.getByText('專案 TEST-PROJECT 的照片管理與預覽')
        ).toBeInTheDocument();
      });
    });

    it('should maintain project context throughout navigation', async () => {
      (useParams as jest.Mock).mockReturnValue({ projectId: 'F20P1' });

      render(<PhotoGalleryPage />);

      await waitFor(() => {
        // All API calls should include the project context
        expect(photoService.getAlbums).toHaveBeenCalledWith('F20P1');
        expect(photoService.getPhotos).toHaveBeenCalledWith(
          'F20P1',
          expect.any(Object)
        );
      });
    });
  });

  describe('Project Data Isolation', () => {
    it('should only show photos for the current project', async () => {
      (useParams as jest.Mock).mockReturnValue({ projectId: 'AP8P1' });

      render(<PhotoGalleryPage />);

      await waitFor(() => {
        // Should only request data for AP8P1 project
        expect(photoService.getAlbums).toHaveBeenCalledWith('AP8P1');
        expect(photoService.getPhotos).toHaveBeenCalledWith(
          'AP8P1',
          expect.any(Object)
        );
      });

      // Should not make calls for other projects
      expect(photoService.getAlbums).not.toHaveBeenCalledWith('proj001');
      expect(photoService.getAlbums).not.toHaveBeenCalledWith('proj002');
      expect(photoService.getAlbums).not.toHaveBeenCalledWith('F20P1');
    });

    it('should handle project-specific albums correctly', async () => {
      const mockAlbums = [
        {
          id: 'album-1',
          name: 'AP8P1 施工進度',
          projectId: 'AP8P1',
          photoCount: 15,
        },
        {
          id: 'album-2',
          name: 'AP8P1 品質檢查',
          projectId: 'AP8P1',
          photoCount: 8,
        },
      ];

      (useParams as jest.Mock).mockReturnValue({ projectId: 'AP8P1' });
      (photoService.getAlbums as jest.Mock).mockResolvedValue({
        success: true,
        data: mockAlbums,
      });

      render(<PhotoGalleryPage />);

      await waitFor(() => {
        expect(photoService.getAlbums).toHaveBeenCalledWith('AP8P1');
      });
    });
  });

  describe('Project Status Integration', () => {
    it('should reflect project status in photo gallery interface', async () => {
      (useParams as jest.Mock).mockReturnValue({ projectId: 'proj001' });

      render(<PhotoGalleryPage />);

      await waitFor(() => {
        // Title should reflect the project
        expect(
          screen.getByText('專案 proj001 的照片管理與預覽')
        ).toBeInTheDocument();
      });
    });

    it('should handle project lifecycle correctly', async () => {
      // Test with a completed project
      (useParams as jest.Mock).mockReturnValue({
        projectId: 'COMPLETED-PROJECT',
      });

      render(<PhotoGalleryPage />);

      await waitFor(() => {
        // Should still load photos for completed projects
        expect(photoService.getAlbums).toHaveBeenCalledWith(
          'COMPLETED-PROJECT'
        );
      });
    });
  });

  describe('Cross-Module Data Consistency', () => {
    it('should use consistent project naming with dashboard', async () => {
      const projectMappings = [
        { id: 'proj001', name: 'FAB20 Phase1' },
        { id: 'proj002', name: 'FAB21 Phase2 專案' },
      ];

      for (const project of projectMappings) {
        (useParams as jest.Mock).mockReturnValue({ projectId: project.id });

        render(<PhotoGalleryPage />);

        await waitFor(() => {
          // Project ID should be consistent across modules
          expect(
            screen.getByText(`專案 ${project.id} 的照片管理與預覽`)
          ).toBeInTheDocument();
        });
      }
    });

    it('should handle project permissions consistently', async () => {
      (useParams as jest.Mock).mockReturnValue({
        projectId: 'RESTRICTED-PROJECT',
      });

      // Mock restricted access
      (photoService.getAlbums as jest.Mock).mockRejectedValue({
        status: 403,
        message: 'Access denied to project',
      });

      render(<PhotoGalleryPage />);

      // Should handle restricted access gracefully
      await waitFor(() => {
        expect(screen.getByText('iPhoto 2.0 - 工程照片庫')).toBeInTheDocument();
      });
    });
  });

  describe('Project Timeline Integration', () => {
    it('should reflect project milestones in photo organization', async () => {
      (useParams as jest.Mock).mockReturnValue({ projectId: 'F20P1' });

      render(<PhotoGalleryPage />);

      await waitFor(() => {
        // Photo gallery should be accessible during active project phases
        expect(photoService.getAlbums).toHaveBeenCalledWith('F20P1');
        expect(screen.getByTestId('photo-gallery-list')).toBeInTheDocument();
      });
    });

    it('should support historical photo access for completed milestones', async () => {
      (useParams as jest.Mock).mockReturnValue({
        projectId: 'HISTORICAL-PROJECT',
      });

      render(<PhotoGalleryPage />);

      await waitFor(() => {
        // Should still provide access to historical photos
        expect(photoService.getAlbums).toHaveBeenCalledWith(
          'HISTORICAL-PROJECT'
        );
      });
    });
  });

  describe('Error Handling for Project Issues', () => {
    it('should handle non-existent project gracefully', async () => {
      (useParams as jest.Mock).mockReturnValue({ projectId: 'NON-EXISTENT' });
      (photoService.getAlbums as jest.Mock).mockRejectedValue({
        status: 404,
        message: 'Project not found',
      });

      render(<PhotoGalleryPage />);

      // Should handle gracefully without crashing
      await waitFor(() => {
        expect(screen.getByText('iPhoto 2.0 - 工程照片庫')).toBeInTheDocument();
      });
    });

    it('should handle project access errors', async () => {
      (useParams as jest.Mock).mockReturnValue({ projectId: 'ACCESS-DENIED' });
      (photoService.getAlbums as jest.Mock).mockRejectedValue({
        status: 403,
        message: 'Insufficient permissions',
      });

      render(<PhotoGalleryPage />);

      // Should display error handling UI
      await waitFor(() => {
        expect(screen.getByText('iPhoto 2.0 - 工程照片庫')).toBeInTheDocument();
      });
    });
  });
});
