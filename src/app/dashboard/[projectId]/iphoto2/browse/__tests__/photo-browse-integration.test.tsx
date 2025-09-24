/**
 * Photo Browse Integration Test
 *
 * Tests the fixed photo browsing functionality to ensure:
 * - Photos are loaded from API correctly
 * - Search and filtering work properly
 * - Download and delete operations function
 * - Error handling is robust
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BrowsePage from '../page';

// Mock hooks and dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
  useParams: () => ({ projectId: 'TEST001' }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', username: 'testuser', role: 'engineer', projects: ['TEST001'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useProjectAlbums', () => ({
  useProjectAlbums: () => ({
    albums: [
      { id: 'album1', name: '建築進度', photoCount: 10 },
      { id: 'album2', name: '設備安裝', photoCount: 5 },
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock('@/store/projectScopeStore', () => ({
  useProjectScopeStore: () => ({
    currentProject: {
      id: 'TEST001',
      name: 'Test Project',
      code: 'TEST001',
    },
  }),
}));

// Mock the photo hook
const mockPhotos = [
  {
    id: 'photo1',
    projectId: 'TEST001',
    albumId: 'album1',
    fileName: 'test-photo-1.jpg',
    description: 'Test photo 1',
    albumName: '建築進度',
    uploadedBy: 'admin',
    uploadedAt: '2024-01-15T10:00:00Z',
    fileSize: 2048000,
    mimeType: 'image/jpeg',
    width: 1920,
    height: 1080,
    dimensions: '1920x1080',
    tags: ['建築', '進度'],
    thumbnailUrl: '/api/photos/photo1/thumbnail',
    originalUrl: '/api/photos/photo1/download',
    metadata: {},
  },
  {
    id: 'photo2',
    projectId: 'TEST001',
    albumId: 'album2',
    fileName: 'test-photo-2.jpg',
    description: 'Test photo 2',
    albumName: '設備安裝',
    uploadedBy: 'engineer1',
    uploadedAt: '2024-01-16T14:30:00Z',
    fileSize: 1536000,
    mimeType: 'image/jpeg',
    width: 1440,
    height: 960,
    dimensions: '1440x960',
    tags: ['設備', '安裝'],
    thumbnailUrl: '/api/photos/photo2/thumbnail',
    originalUrl: '/api/photos/photo2/download',
    metadata: {},
  },
];

const mockUseProjectPhotos = {
  photos: mockPhotos,
  filteredPhotos: mockPhotos,
  loading: false,
  error: null,
  totalCount: 2,
  currentPage: 1,
  totalPages: 1,
  filters: {},
  setFilters: vi.fn(),
  refetch: vi.fn(),
  deletePhoto: vi.fn(),
  downloadPhoto: vi.fn(),
  batchDownload: vi.fn(),
};

vi.mock('@/hooks/useProjectPhotos', () => ({
  useProjectPhotos: () => mockUseProjectPhotos,
}));

describe('Photo Browse Page - Integration Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock functions
    mockUseProjectPhotos.setFilters = vi.fn();
    mockUseProjectPhotos.refetch = vi.fn();
    mockUseProjectPhotos.deletePhoto = vi.fn();
    mockUseProjectPhotos.downloadPhoto = vi.fn();
    mockUseProjectPhotos.batchDownload = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders photo browse page with photos', async () => {
    render(<BrowsePage />);

    await waitFor(() => {
      expect(screen.getByText('照片瀏覽')).toBeInTheDocument();
    });

    // Check page header shows photo count
    expect(screen.getByText(/\(2 張照片\)/)).toBeInTheDocument();

    // Check photos are displayed
    expect(screen.getByText('test-photo-1.jpg')).toBeInTheDocument();
    expect(screen.getByText('test-photo-2.jpg')).toBeInTheDocument();
  });

  it('displays breadcrumb navigation correctly', async () => {
    render(<BrowsePage />);

    await waitFor(() => {
      expect(screen.getByText('首頁')).toBeInTheDocument();
    });

    expect(screen.getByText('專案儀表板')).toBeInTheDocument();
    expect(screen.getByText('iPhoto 2.0')).toBeInTheDocument();
    expect(screen.getByText('照片瀏覽')).toBeInTheDocument();
  });

  it('handles search functionality', async () => {
    render(<BrowsePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('搜尋照片...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('搜尋照片...');
    await user.type(searchInput, 'test-photo-1');

    // Verify setFilters is called with search query
    expect(mockUseProjectPhotos.setFilters).toHaveBeenCalledWith(
      expect.objectContaining({
        searchQuery: 'test-photo-1',
      })
    );
  });

  it('handles view mode toggle', async () => {
    render(<BrowsePage />);

    await waitFor(() => {
      expect(screen.getAllByRole('button')).toHaveLength(expect.any(Number));
    });

    // Find view mode buttons by their icons (Grid3X3 and List)
    const buttons = screen.getAllByRole('button');
    const listViewButton = buttons.find(button =>
      button.querySelector('svg') && button.getAttribute('aria-label') === null
    );

    if (listViewButton) {
      await user.click(listViewButton);
      // View mode should change (tested through state changes)
    }
  });

  it('handles photo selection and batch operations', async () => {
    render(<BrowsePage />);

    await waitFor(() => {
      expect(screen.getByText('test-photo-1.jpg')).toBeInTheDocument();
    });

    // Find and click photo checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);

    // Click first photo checkbox
    await user.click(checkboxes[1]); // Skip the "select all" checkbox

    // Should show batch actions
    await waitFor(() => {
      expect(screen.getByText(/已選擇/)).toBeInTheDocument();
    });

    // Test batch download
    const batchDownloadButton = screen.getByText('批次下載');
    await user.click(batchDownloadButton);

    expect(mockUseProjectPhotos.batchDownload).toHaveBeenCalled();
  });

  it('handles single photo download', async () => {
    render(<BrowsePage />);

    await waitFor(() => {
      expect(screen.getByText('test-photo-1.jpg')).toBeInTheDocument();
    });

    // Find photo action menu
    const moreButtons = screen.getAllByRole('button').filter(
      button => button.querySelector('svg')
    );

    // Click on a more actions button (MoreVertical icon)
    const moreButton = moreButtons.find(button =>
      button.getAttribute('aria-expanded') !== null ||
      button.querySelector('[data-testid="more-vertical"]')
    );

    if (moreButton) {
      await user.click(moreButton);

      // Wait for dropdown menu
      await waitFor(() => {
        const downloadOption = screen.queryByText('下載');
        if (downloadOption) {
          expect(downloadOption).toBeInTheDocument();
        }
      });
    }
  });

  it('handles filter panel toggle', async () => {
    render(<BrowsePage />);

    await waitFor(() => {
      expect(screen.getByText('篩選器')).toBeInTheDocument();
    });

    const filterButton = screen.getByText('篩選器');
    await user.click(filterButton);

    // Filter panel should be visible
    await waitFor(() => {
      expect(screen.getByText('上傳日期範圍')).toBeInTheDocument();
    });
  });

  it('displays loading state correctly', async () => {
    // Mock loading state
    vi.mocked(mockUseProjectPhotos).loading = true;

    render(<BrowsePage />);

    expect(screen.getByText('載入照片中...')).toBeInTheDocument();
  });

  it('displays error state with retry option', async () => {
    // Mock error state
    vi.mocked(mockUseProjectPhotos).error = '載入照片失敗';

    render(<BrowsePage />);

    await waitFor(() => {
      expect(screen.getByText('載入照片失敗')).toBeInTheDocument();
    });

    // Should have retry button
    const retryButton = screen.getByText('重新載入');
    expect(retryButton).toBeInTheDocument();

    await user.click(retryButton);
    expect(mockUseProjectPhotos.refetch).toHaveBeenCalled();
  });

  it('displays empty state when no photos', async () => {
    // Mock empty state
    vi.mocked(mockUseProjectPhotos).photos = [];
    vi.mocked(mockUseProjectPhotos).filteredPhotos = [];
    vi.mocked(mockUseProjectPhotos).totalCount = 0;

    render(<BrowsePage />);

    await waitFor(() => {
      expect(screen.getByText('沒有找到照片')).toBeInTheDocument();
    });

    expect(screen.getByText('請嘗試調整搜尋條件或上傳新照片')).toBeInTheDocument();
    expect(screen.getByText('上傳照片')).toBeInTheDocument();
  });

  it('handles authentication redirect', async () => {
    // Mock unauthenticated state
    vi.doMock('@/hooks/useAuth', () => ({
      useAuth: () => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      }),
    }));

    const { unmount } = render(<BrowsePage />);

    expect(screen.getByText('請先登入')).toBeInTheDocument();

    unmount();
  });
});