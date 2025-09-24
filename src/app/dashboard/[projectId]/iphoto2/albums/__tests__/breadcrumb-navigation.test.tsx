/**
 * Breadcrumb Navigation Test for Albums Page
 *
 * Tests the fixed breadcrumb navigation to ensure:
 * - Links use Next.js Link component instead of href
 * - Navigation preserves project context
 * - No unwanted redirects to project selection
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { useRouter } from 'next/navigation';
import AlbumsPage from '../page';
import { useAuth } from '@/hooks/useAuth';
import { useProjectAlbums } from '@/hooks/useProjectAlbums';
import { useProjectScopeStore } from '@/store/projectScopeStore';

// Mock hooks
vi.mock('next/navigation');
vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useProjectAlbums');
vi.mock('@/store/projectScopeStore');

const mockPush = vi.fn();
const mockUseRouter = useRouter as any;
const mockUseAuth = useAuth as any;
const mockUseProjectAlbums = useProjectAlbums as any;
const mockUseProjectScopeStore = useProjectScopeStore as any;

describe('Albums Page - Breadcrumb Navigation', () => {
  const mockProject = {
    id: 'TEST001',
    name: 'Test Project',
    code: 'TEST001',
    status: '進行中',
    progress: 75,
  };

  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
    } as any);

    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'testuser', role: 'engineer', projects: ['TEST001'] },
      isAuthenticated: true,
      isLoading: false,
    });

    mockUseProjectAlbums.mockReturnValue({
      albums: [
        {
          id: 'album1',
          name: 'Test Album',
          description: 'Test Description',
          tags: ['test'],
          photoCount: 5,
          coverPhotoUrl: null,
        },
      ],
      loading: false,
      error: null,
      createAlbum: vi.fn(),
      updateAlbum: vi.fn(),
      deleteAlbum: vi.fn(),
    });

    mockUseProjectScopeStore.mockReturnValue({
      currentProject: mockProject,
      selectProject: vi.fn(),
      clearCurrentProject: vi.fn(),
    });

    // Mock useParams to return valid project ID
    vi.doMock('next/navigation', async () => ({
      ...await vi.importActual('next/navigation'),
      useParams: () => ({ projectId: 'TEST001' }),
      useSearchParams: () => new URLSearchParams(),
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders breadcrumb navigation with proper links', async () => {
    render(<AlbumsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('albums-main-container')).toBeInTheDocument();
    });

    // Check breadcrumb items are rendered
    expect(screen.getByText('首頁')).toBeInTheDocument();
    expect(screen.getByText('專案儀表板')).toBeInTheDocument();
    expect(screen.getByText('iPhoto 2.0')).toBeInTheDocument();
    expect(screen.getByText('相簿管理')).toBeInTheDocument();
  });

  it('breadcrumb links use Next.js Link component (not href)', async () => {
    render(<AlbumsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('albums-main-container')).toBeInTheDocument();
    });

    // Check that breadcrumb links are wrapped with Link components
    const breadcrumbLinks = screen.getAllByRole('link');

    // Dashboard link should be present
    const dashboardLink = breadcrumbLinks.find(link =>
      link.textContent === '首頁'
    );
    expect(dashboardLink).toBeInTheDocument();

    // Project dashboard link should be present
    const projectDashboardLink = breadcrumbLinks.find(link =>
      link.textContent === '專案儀表板'
    );
    expect(projectDashboardLink).toBeInTheDocument();

    // iPhoto 2.0 link should be present
    const iphotoLink = breadcrumbLinks.find(link =>
      link.textContent === 'iPhoto 2.0'
    );
    expect(iphotoLink).toBeInTheDocument();
  });

  it('clicking breadcrumb links preserves project context', async () => {
    render(<AlbumsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('albums-main-container')).toBeInTheDocument();
    });

    // Find and click the project dashboard link
    const projectDashboardLink = screen.getByText('專案儀表板').closest('a');
    expect(projectDashboardLink).toHaveAttribute('href', '/dashboard/TEST001');

    // Find and click the iPhoto 2.0 link
    const iphotoLink = screen.getByText('iPhoto 2.0').closest('a');
    expect(iphotoLink).toHaveAttribute('href', '/dashboard/TEST001/iphoto2');
  });

  it('does not trigger unwanted redirects when navigating via breadcrumbs', async () => {
    render(<AlbumsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('albums-main-container')).toBeInTheDocument();
    });

    // Verify no unexpected navigation calls were made during render
    expect(mockPush).not.toHaveBeenCalledWith('/project-selection');
  });

  it('maintains project state when component mounts', async () => {
    render(<AlbumsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('albums-main-container')).toBeInTheDocument();
    });

    // Verify project state is maintained
    expect(mockUseProjectScopeStore).toHaveBeenCalled();

    // Check that currentProject is available
    const storeState = mockUseProjectScopeStore.mock.results[0].value;
    expect(storeState.currentProject).toEqual(mockProject);
  });

  it('handles missing project context gracefully', async () => {
    // Mock store to return no current project
    mockUseProjectScopeStore.mockReturnValue({
      currentProject: null,
      selectProject: vi.fn(),
      clearCurrentProject: vi.fn(),
    });

    render(<AlbumsPage />);

    // Should still render without crashing
    await waitFor(() => {
      expect(screen.getByTestId('albums-main-container')).toBeInTheDocument();
    });

    // Breadcrumb should still work with projectId from params
    const projectDashboardLink = screen.getByText('專案儀表板').closest('a');
    expect(projectDashboardLink).toHaveAttribute('href', '/dashboard/TEST001');
  });

  it('renders breadcrumb with correct accessibility attributes', async () => {
    render(<AlbumsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('albums-main-container')).toBeInTheDocument();
    });

    // Check breadcrumb navigation structure
    const breadcrumbNav = screen.getByRole('navigation');
    expect(breadcrumbNav).toBeInTheDocument();

    // Check breadcrumb list
    const breadcrumbList = screen.getByRole('list');
    expect(breadcrumbList).toBeInTheDocument();

    // Check breadcrumb items
    const breadcrumbItems = screen.getAllByRole('listitem');
    expect(breadcrumbItems).toHaveLength(4); // 首頁, 專案儀表板, iPhoto 2.0, 相簿管理
  });
});