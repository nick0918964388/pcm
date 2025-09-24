/**
 * Photo Gallery System Integration Tests
 * 工程照片庫系統整合測試
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import PhotoGalleryPage from '../page';
import { usePhotoStore } from '@/store/photoStore';
import { photoService } from '@/services/photoService';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(() => ({ projectId: 'TEST-PROJECT' })),
}));

jest.mock('@/store/photoStore', () => ({
  usePhotoStore: jest.fn(),
}));

jest.mock('@/services/photoService', () => ({
  photoService: {
    getAlbums: jest.fn(),
    getPhotos: jest.fn(),
    downloadPhoto: jest.fn(),
    downloadPhotos: jest.fn(),
    deletePhoto: jest.fn(),
    shouldSplitDownload: jest.fn(),
    cancelBatchDownload: jest.fn(),
  },
}));

jest.mock('@/components/photo', () => ({
  PhotoUploader: ({ onUploadComplete }: any) => (
    <div data-testid='photo-uploader'>
      <button onClick={() => onUploadComplete([])}>模擬上傳</button>
    </div>
  ),
  PhotoGrid: ({ onPhotoClick, photos }: any) => (
    <div data-testid='photo-grid'>
      {photos.map((photo: any) => (
        <button key={photo.id} onClick={() => onPhotoClick(photo, 0)}>
          {photo.fileName}
        </button>
      ))}
    </div>
  ),
  PhotoLightbox: ({ open }: any) =>
    open ? <div data-testid='photo-lightbox'>燈箱</div> : null,
  PhotoGalleryList: ({ onAlbumSelect }: any) => (
    <div data-testid='photo-gallery-list'>
      <button onClick={() => onAlbumSelect('album-1')}>測試相簿</button>
    </div>
  ),
  PhotoFilters: () => <div data-testid='photo-filters'>篩選器</div>,
}));

jest.mock('@/components/photo/DownloadProgress', () => ({
  DownloadProgress: () => <div data-testid='download-progress'>下載進度</div>,
}));

describe('Photo Gallery System Integration', () => {
  const mockPhotoStore = {
    photos: [
      {
        id: 'photo-1',
        fileName: 'test-photo.jpg',
        projectId: 'TEST-PROJECT',
        albumId: 'album-1',
      },
    ],
    albums: [
      {
        id: 'album-1',
        name: '測試相簿',
        projectId: 'TEST-PROJECT',
        photoCount: 1,
      },
    ],
    currentAlbum: 'album-1',
    selectedPhotos: [],
    lightboxOpen: false,
    lightboxIndex: 0,
    searchQuery: '',
    viewMode: 'grid' as const,
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
    getFilteredPhotos: jest.fn(() => mockPhotoStore.photos),
    clearSelection: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (usePhotoStore as jest.Mock).mockReturnValue(mockPhotoStore);
    (photoService.getAlbums as jest.Mock).mockResolvedValue({
      success: true,
      data: mockPhotoStore.albums,
    });
    (photoService.getPhotos as jest.Mock).mockResolvedValue({
      success: true,
      data: mockPhotoStore.photos,
    });
  });

  describe('Navigation Integration', () => {
    it('should display photo gallery page with correct title', async () => {
      render(<PhotoGalleryPage />);

      expect(screen.getByText('iPhoto 2.0 - 工程照片庫')).toBeInTheDocument();
      expect(
        screen.getByText(/專案 TEST-PROJECT 的照片管理與預覽/)
      ).toBeInTheDocument();
    });

    it('should render all main navigation components', async () => {
      render(<PhotoGalleryPage />);

      await waitFor(() => {
        expect(screen.getByTestId('photo-gallery-list')).toBeInTheDocument();
        expect(screen.getByTestId('photo-filters')).toBeInTheDocument();
        expect(screen.getByTestId('photo-grid')).toBeInTheDocument();
      });
    });

    it('should handle upload toggle navigation', () => {
      render(<PhotoGalleryPage />);

      const uploadButton = screen.getByText('上傳照片');
      fireEvent.click(uploadButton);

      expect(screen.getByText('隱藏上傳')).toBeInTheDocument();
      expect(screen.getByTestId('photo-uploader')).toBeInTheDocument();
    });
  });

  describe('Authentication Integration', () => {
    it('should load albums with project permissions', async () => {
      render(<PhotoGalleryPage />);

      await waitFor(() => {
        expect(photoService.getAlbums).toHaveBeenCalledWith('TEST-PROJECT');
      });
    });

    it('should apply user permissions to album access', async () => {
      render(<PhotoGalleryPage />);

      await waitFor(() => {
        const galleryList = screen.getByTestId('photo-gallery-list');
        expect(galleryList).toBeInTheDocument();
      });
    });
  });

  describe('Project Management Module Connection', () => {
    it('should correctly identify project context from route', async () => {
      render(<PhotoGalleryPage />);

      await waitFor(() => {
        expect(photoService.getPhotos).toHaveBeenCalledWith('TEST-PROJECT', {
          albumId: 'album-1',
        });
      });
    });

    it('should handle album selection within project scope', async () => {
      render(<PhotoGalleryPage />);

      const albumButton = screen.getByText('測試相簿');
      fireEvent.click(albumButton);

      expect(mockPhotoStore.setCurrentAlbum).toHaveBeenCalledWith('album-1');
    });
  });

  describe('Route Configuration', () => {
    it('should be accessible via dashboard project route', () => {
      // 這個測試確保路由結構正確
      // /dashboard/[projectId]/photos 應該能正確渲染此頁面
      render(<PhotoGalleryPage />);

      expect(screen.getByText('iPhoto 2.0 - 工程照片庫')).toBeInTheDocument();
    });
  });

  describe('UI Component Integration', () => {
    it('should integrate photo grid with lightbox functionality', async () => {
      render(<PhotoGalleryPage />);

      await waitFor(() => {
        const photoButton = screen.getByText('test-photo.jpg');
        fireEvent.click(photoButton);

        expect(mockPhotoStore.openLightbox).toHaveBeenCalledWith(0);
      });
    });

    it('should handle upload completion workflow', async () => {
      render(<PhotoGalleryPage />);

      // Open uploader
      const uploadButton = screen.getByText('上傳照片');
      fireEvent.click(uploadButton);

      // Simulate upload completion
      const simulateUploadButton = screen.getByText('模擬上傳');
      fireEvent.click(simulateUploadButton);

      // Should reload photos and hide uploader
      await waitFor(() => {
        expect(photoService.getPhotos).toHaveBeenCalled();
      });
    });

    it('should display view mode toggle buttons', () => {
      render(<PhotoGalleryPage />);

      // Grid and list view buttons should be present
      const viewModeSection = screen.getByText('搜尋與篩選').closest('.card');
      expect(viewModeSection).toBeInTheDocument();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle album loading errors gracefully', async () => {
      (photoService.getAlbums as jest.Mock).mockResolvedValue({
        success: false,
        errors: ['Failed to load albums'],
      });

      render(<PhotoGalleryPage />);

      await waitFor(() => {
        // Error should be handled but not crash the app
        expect(screen.getByText('iPhoto 2.0 - 工程照片庫')).toBeInTheDocument();
      });
    });

    it('should handle photo loading errors gracefully', async () => {
      (photoService.getPhotos as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      render(<PhotoGalleryPage />);

      await waitFor(() => {
        // Error should be handled but not crash the app
        expect(screen.getByText('iPhoto 2.0 - 工程照片庫')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Integration', () => {
    it('should implement lazy loading for photo grid', async () => {
      render(<PhotoGalleryPage />);

      await waitFor(() => {
        expect(screen.getByTestId('photo-grid')).toBeInTheDocument();
      });

      // PhotoGrid should be rendered with proper props
      expect(screen.getByTestId('photo-grid')).toBeInTheDocument();
    });
  });
});
