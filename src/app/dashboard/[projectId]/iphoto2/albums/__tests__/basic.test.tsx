/**
 * Basic Albums Page Tests
 * Simplified tests for core functionality verification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    ],
    loading: false,
    error: null,
    createAlbum: vi.fn(),
    updateAlbum: vi.fn(),
    deleteAlbum: vi.fn(),
    refetch: vi.fn(),
  }),
}));

describe('AlbumsPage Basic Tests', () => {
  const mockPush = vi.fn();
  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (useSearchParams as any).mockReturnValue(mockSearchParams);
  });

  it('should render page with heading', () => {
    render(<AlbumsPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: /相簿管理/i })
    ).toBeInTheDocument();
  });

  it('should display breadcrumb navigation', () => {
    render(<AlbumsPage />);
    expect(screen.getByLabelText('breadcrumb')).toBeInTheDocument();
  });

  it('should display view mode toggle buttons', () => {
    render(<AlbumsPage />);
    expect(
      screen.getByRole('button', { name: /網格檢視/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /列表檢視/i })
    ).toBeInTheDocument();
  });

  it('should display search input', () => {
    render(<AlbumsPage />);
    expect(screen.getByPlaceholderText(/搜尋相簿.../i)).toBeInTheDocument();
  });

  it('should display create album button', () => {
    render(<AlbumsPage />);
    expect(
      screen.getByRole('button', { name: /新增相簿/i })
    ).toBeInTheDocument();
  });

  it('should display filter button', () => {
    render(<AlbumsPage />);
    expect(screen.getByText(/篩選器/i)).toBeInTheDocument();
  });

  it('should switch between grid and list view', () => {
    render(<AlbumsPage />);

    const gridView = screen.getByTestId('albums-grid-view');
    const listView = screen.getByTestId('albums-list-view');
    const listModeButton = screen.getByRole('button', { name: /列表檢視/i });

    // Initially grid view should be visible
    expect(gridView).not.toHaveClass('hidden');
    expect(listView).toHaveClass('hidden');

    // Click list view button
    fireEvent.click(listModeButton);

    // Now list view should be visible
    expect(gridView).toHaveClass('hidden');
    expect(listView).not.toHaveClass('hidden');
  });

  it('should show albums in grid', () => {
    render(<AlbumsPage />);

    const gridContainer = screen.getByTestId('albums-grid-container');
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveClass('grid');
  });
});
