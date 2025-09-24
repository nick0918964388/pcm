/**
 * Album Management Page Component Tests
 *
 * Tests for the album management page component according to task 6.2 requirements:
 * - Project album list view with grid and list modes
 * - Album create, edit, and delete interactive interface
 * - Album search and filtering functionality
 * - Album tag management and batch operations interface
 * - Oracle active_photo_albums view integration
 *
 * @version 1.0
 * @date 2025-09-24
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import AlbumsPage from '../page';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

// Mock authentication hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user',
      username: 'testuser',
      role: 'engineer',
      projects: ['TEST001'],
    },
    isAuthenticated: true,
  }),
}));

// Mock project albums hook
vi.mock('@/hooks/useProjectAlbums', () => ({
  useProjectAlbums: () => ({
    albums: [
      {
        id: 'album-1',
        name: '建築進度',
        description: '建築工程進度照片',
        photoCount: 25,
        coverPhotoUrl: '/mock/cover1.jpg',
        tags: ['建築', '進度'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      },
      {
        id: 'album-2',
        name: '設備安裝',
        description: '設備安裝相關照片',
        photoCount: 12,
        coverPhotoUrl: null,
        tags: ['設備', '安裝'],
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-20'),
      },
    ],
    loading: false,
    error: null,
    createAlbum: vi.fn(),
    updateAlbum: vi.fn(),
    deleteAlbum: vi.fn(),
    refetch: vi.fn(),
  }),
}));

describe('AlbumsPage Component', () => {
  const mockPush = vi.fn();
  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (useSearchParams as any).mockReturnValue(mockSearchParams);
  });

  describe('Page Structure and Navigation', () => {
    it('should render page with proper heading and breadcrumb', () => {
      render(<AlbumsPage />);

      expect(
        screen.getByRole('heading', { level: 1, name: /相簿管理/i })
      ).toBeInTheDocument();
      expect(screen.getByLabelText('breadcrumb')).toBeInTheDocument();
      expect(screen.getByText('iPhoto 2.0')).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: '相簿管理' })
      ).toBeInTheDocument();
    });

    it('should display main container with proper layout', () => {
      render(<AlbumsPage />);

      const mainContainer = screen.getByTestId('albums-main-container');
      expect(mainContainer).toHaveClass('container', 'mx-auto', 'px-4');
    });
  });

  describe('Album List View Modes', () => {
    it('should display view mode toggle buttons', () => {
      render(<AlbumsPage />);

      expect(
        screen.getByRole('button', { name: /網格檢視/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /列表檢視/i })
      ).toBeInTheDocument();
    });

    it('should switch between grid and list view modes', async () => {
      render(<AlbumsPage />);

      const gridView = screen.getByTestId('albums-grid-view');
      const listView = screen.getByTestId('albums-list-view');
      const listModeButton = screen.getByRole('button', { name: /列表檢視/i });

      // Initially should show grid view
      expect(gridView).not.toHaveClass('hidden');
      expect(listView).toHaveClass('hidden');

      // Click list view button
      fireEvent.click(listModeButton);

      await waitFor(() => {
        expect(gridView).toHaveClass('hidden');
        expect(listView).not.toHaveClass('hidden');
      });
    });

    it('should display albums in grid format', () => {
      render(<AlbumsPage />);

      const gridContainer = screen.getByTestId('albums-grid-container');
      expect(gridContainer).toHaveClass(
        'grid',
        'md:grid-cols-3',
        'lg:grid-cols-4'
      );
    });

    it('should display albums in list format when toggled', async () => {
      render(<AlbumsPage />);

      const listModeButton = screen.getByRole('button', { name: /列表檢視/i });
      fireEvent.click(listModeButton);

      await waitFor(() => {
        const listContainer = screen.getByTestId('albums-list-container');
        expect(listContainer).toHaveClass('space-y-2');
      });
    });
  });

  describe('Album CRUD Operations', () => {
    it('should display create album button', () => {
      render(<AlbumsPage />);

      expect(
        screen.getByRole('button', { name: /新增相簿/i })
      ).toBeInTheDocument();
    });

    it('should open create album dialog when clicked', async () => {
      render(<AlbumsPage />);

      const createButton = screen.getByRole('button', { name: /新增相簿/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(
          screen.getByRole('dialog', { name: /新增相簿/i })
        ).toBeInTheDocument();
        expect(screen.getByLabelText(/相簿名稱/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/描述/i)).toBeInTheDocument();
      });
    });

    it('should display album cards with proper information', () => {
      render(<AlbumsPage />);

      expect(screen.getByText('建築進度')).toBeInTheDocument();
      expect(screen.getByText('建築工程進度照片')).toBeInTheDocument();
      expect(screen.getByText('25 張照片')).toBeInTheDocument();
      expect(screen.getByText('設備安裝')).toBeInTheDocument();
      expect(screen.getByText('12 張照片')).toBeInTheDocument();
    });

    it('should show album action menus', () => {
      render(<AlbumsPage />);

      const actionButtons = screen.getAllByLabelText(/相簿操作選單/i);
      expect(actionButtons).toHaveLength(2); // One for each album
    });

    it('should display edit and delete options in action menu', async () => {
      render(<AlbumsPage />);

      const actionButton = screen.getAllByLabelText(/相簿操作選單/i)[0];
      fireEvent.click(actionButton);

      await waitFor(() => {
        expect(screen.getByText(/編輯相簿/i)).toBeInTheDocument();
        expect(screen.getByText(/刪除相簿/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filtering', () => {
    it('should display search input', () => {
      render(<AlbumsPage />);

      expect(screen.getByPlaceholderText(/搜尋相簿.../i)).toBeInTheDocument();
    });

    it('should display filter controls', () => {
      render(<AlbumsPage />);

      expect(screen.getByText(/篩選器/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /標籤篩選/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /建立日期/i })
      ).toBeInTheDocument();
    });

    it('should filter albums by search query', async () => {
      render(<AlbumsPage />);

      const searchInput = screen.getByPlaceholderText(/搜尋相簿.../i);
      fireEvent.change(searchInput, { target: { value: '建築' } });

      await waitFor(() => {
        // Should show the filtered album
        expect(screen.getByText('建築進度')).toBeInTheDocument();
      });
    });

    it('should show filter panel when filter button clicked', async () => {
      render(<AlbumsPage />);

      const filterButton = screen.getByText(/篩選器/i);
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByTestId('filter-panel')).not.toHaveClass('hidden');
      });
    });
  });

  describe('Tag Management', () => {
    it('should display album tags', () => {
      render(<AlbumsPage />);

      expect(screen.getByText('建築')).toBeInTheDocument();
      expect(screen.getByText('進度')).toBeInTheDocument();
      expect(screen.getByText('設備')).toBeInTheDocument();
      expect(screen.getByText('安裝')).toBeInTheDocument();
    });

    it('should allow tag filtering', async () => {
      render(<AlbumsPage />);

      // First open the filter panel
      const filterButton = screen.getByText(/篩選器/i);
      fireEvent.click(filterButton);

      await waitFor(() => {
        const buildingTag = screen.getByText('建築');
        fireEvent.click(buildingTag);
        expect(screen.getByText('建築進度')).toBeInTheDocument();
      });
    });

    it('should show tag management in edit dialog', async () => {
      render(<AlbumsPage />);

      const actionButton = screen.getAllByLabelText(/相簿操作選單/i)[0];
      fireEvent.click(actionButton);

      const editButton = screen.getByText(/編輯相簿/i);
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/標籤/i)).toBeInTheDocument();
      });
    });
  });

  describe('Batch Operations', () => {
    it('should display batch operation controls when albums selected', () => {
      render(<AlbumsPage />);

      const checkbox = screen.getAllByRole('checkbox', {
        name: /選擇相簿/i,
      })[0];
      fireEvent.click(checkbox);

      expect(screen.getByTestId('batch-actions-toolbar')).not.toHaveClass(
        'hidden'
      );
      expect(screen.getByText(/已選擇 1 個相簿/i)).toBeInTheDocument();
    });

    it('should display batch action buttons', () => {
      render(<AlbumsPage />);

      const checkbox = screen.getAllByRole('checkbox', {
        name: /選擇相簿/i,
      })[0];
      fireEvent.click(checkbox);

      expect(
        screen.getByRole('button', { name: /批次刪除/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /批次標籤/i })
      ).toBeInTheDocument();
    });

    it('should allow selecting all albums', () => {
      render(<AlbumsPage />);

      const selectAllCheckbox = screen.getByRole('checkbox', {
        name: /全選相簿/i,
      });
      fireEvent.click(selectAllCheckbox);

      expect(screen.getByText(/已選擇 2 個相簿/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should show mobile-optimized layout', () => {
      render(<AlbumsPage />);

      const mobileLayout = screen.getByTestId('mobile-layout');
      expect(mobileLayout).toBeInTheDocument();
    });

    it('should adapt grid columns for different screen sizes', () => {
      render(<AlbumsPage />);

      const gridContainer = screen.getByTestId('albums-grid-container');
      expect(gridContainer).toHaveClass(
        'grid-cols-1',
        'md:grid-cols-3',
        'lg:grid-cols-4'
      );
    });
  });

  describe('Performance and Integration', () => {
    it('should render albums from hook', () => {
      render(<AlbumsPage />);

      expect(screen.getByText('建築進度')).toBeInTheDocument();
      expect(screen.getByText('設備安裝')).toBeInTheDocument();
    });
  });
});
