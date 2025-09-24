/**
 * Basic Photo Upload Page Tests
 * Simplified tests for core functionality verification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import PhotoUploadPage from '../page';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
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
        tags: ['建築', '進度'],
      },
    ],
    loading: false,
    error: null,
  }),
}));

// Mock photo upload hook
vi.mock('@/hooks/usePhotoUpload', () => ({
  usePhotoUpload: () => ({
    uploading: false,
    progress: 0,
    uploadedFiles: [],
    errors: [],
    uploadPhotos: vi.fn(),
    cancelUpload: vi.fn(),
    clearUploads: vi.fn(),
  }),
}));

describe('PhotoUploadPage Basic Tests', () => {
  const mockPush = vi.fn();
  const mockParams = { albumId: 'album-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (useParams as any).mockReturnValue(mockParams);
  });

  it('should render page with heading', () => {
    render(<PhotoUploadPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: /照片上傳/i })
    ).toBeInTheDocument();
  });

  it('should display breadcrumb navigation', () => {
    render(<PhotoUploadPage />);
    expect(screen.getByLabelText('breadcrumb')).toBeInTheDocument();
  });

  it('should display album selection', () => {
    render(<PhotoUploadPage />);
    expect(
      screen.getByRole('combobox', { name: /選擇相簿/i })
    ).toBeInTheDocument();
  });

  it('should display upload dropzone', () => {
    render(<PhotoUploadPage />);
    expect(screen.getByTestId('upload-dropzone')).toBeInTheDocument();
    expect(screen.getByText(/拖拽照片至此/i)).toBeInTheDocument();
  });

  it('should show file input', () => {
    render(<PhotoUploadPage />);
    expect(screen.getByLabelText(/選擇檔案/i)).toBeInTheDocument();
  });

  it('should display supported formats info', () => {
    render(<PhotoUploadPage />);
    expect(screen.getByText(/支援 JPG, PNG, HEIC 格式/i)).toBeInTheDocument();
  });

  it('should show mobile layout indicator', () => {
    render(<PhotoUploadPage />);
    expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
  });
});
