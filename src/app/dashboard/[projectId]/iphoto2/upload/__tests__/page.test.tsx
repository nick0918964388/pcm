/**
 * Photo Upload Page Component Tests
 *
 * Tests for the photo upload page component according to task 6.3 requirements:
 * - Drag-and-drop photo upload component with multi-file selection
 * - Upload progress indicators and real-time status feedback
 * - Photo preview and large image view functionality
 * - Photo editing interface with rename and tag management
 * - Batch upload interface with progress and result summary
 *
 * @version 1.0
 * @date 2025-09-24
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

// Mock albums hook for album selection
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
      {
        id: 'album-2',
        name: '設備安裝',
        description: '設備安裝相關照片',
        photoCount: 12,
        tags: ['設備', '安裝'],
      },
    ],
    loading: false,
    error: null,
  }),
}));

// Mock file reading
Object.defineProperty(window, 'FileReader', {
  writable: true,
  value: function () {
    this.readAsDataURL = vi.fn(() => {
      this.result = 'data:image/jpeg;base64,mockbase64data';
      this.onload?.();
    });
  },
});

describe('PhotoUploadPage Component', () => {
  const mockPush = vi.fn();
  const mockParams = { albumId: 'album-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (useParams as any).mockReturnValue(mockParams);
  });

  describe('Page Structure and Navigation', () => {
    it('should render page with proper heading and breadcrumb', () => {
      render(<PhotoUploadPage />);

      expect(
        screen.getByRole('heading', { level: 1, name: /照片上傳/i })
      ).toBeInTheDocument();
      expect(screen.getByLabelText('breadcrumb')).toBeInTheDocument();
      expect(screen.getByText('iPhoto 2.0')).toBeInTheDocument();
    });

    it('should display main container with proper layout', () => {
      render(<PhotoUploadPage />);

      const mainContainer = screen.getByTestId('upload-main-container');
      expect(mainContainer).toHaveClass('container', 'mx-auto', 'px-4');
    });
  });

  describe('Album Selection', () => {
    it('should display album selection dropdown', () => {
      render(<PhotoUploadPage />);

      expect(
        screen.getByRole('combobox', { name: /選擇相簿/i })
      ).toBeInTheDocument();
    });

    it('should show available albums in dropdown', async () => {
      render(<PhotoUploadPage />);

      const albumSelect = screen.getByRole('combobox', { name: /選擇相簿/i });
      fireEvent.click(albumSelect);

      await waitFor(() => {
        expect(screen.getByText('建築進度')).toBeInTheDocument();
        expect(screen.getByText('設備安裝')).toBeInTheDocument();
      });
    });

    it('should allow creating new album option', async () => {
      render(<PhotoUploadPage />);

      const albumSelect = screen.getByRole('combobox', { name: /選擇相簿/i });
      fireEvent.click(albumSelect);

      await waitFor(() => {
        expect(screen.getByText(/建立新相簿/i)).toBeInTheDocument();
      });
    });
  });

  describe('Drag and Drop Upload', () => {
    it('should display drag and drop zone', () => {
      render(<PhotoUploadPage />);

      expect(screen.getByTestId('upload-dropzone')).toBeInTheDocument();
      expect(screen.getByText(/拖拽照片至此/i)).toBeInTheDocument();
    });

    it('should show file input for click upload', () => {
      render(<PhotoUploadPage />);

      expect(screen.getByLabelText(/選擇檔案/i)).toBeInTheDocument();
    });

    it('should display supported formats info', () => {
      render(<PhotoUploadPage />);

      expect(screen.getByText(/支援 JPG, PNG, HEIC 格式/i)).toBeInTheDocument();
    });

    it('should handle drag over events', () => {
      render(<PhotoUploadPage />);

      const dropzone = screen.getByTestId('upload-dropzone');

      fireEvent.dragOver(dropzone);
      expect(dropzone).toHaveClass('border-primary');
    });

    it('should handle file drop', async () => {
      render(<PhotoUploadPage />);

      const dropzone = screen.getByTestId('upload-dropzone');
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
    });
  });

  describe('File Preview and Management', () => {
    it('should display selected files list', async () => {
      render(<PhotoUploadPage />);

      const fileInput = screen.getByLabelText(/選擇檔案/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId('file-preview-list')).toBeInTheDocument();
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
    });

    it('should show file thumbnails', async () => {
      render(<PhotoUploadPage />);

      const fileInput = screen.getByLabelText(/選擇檔案/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const thumbnail = screen.getByRole('img', { name: /test.jpg 縮圖/i });
        expect(thumbnail).toBeInTheDocument();
      });
    });

    it('should display file size and info', async () => {
      render(<PhotoUploadPage />);

      const fileInput = screen.getByLabelText(/選擇檔案/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/4 bytes/i)).toBeInTheDocument();
      });
    });

    it('should allow removing individual files', async () => {
      render(<PhotoUploadPage />);

      const fileInput = screen.getByLabelText(/選擇檔案/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(async () => {
        const removeButton = screen.getByRole('button', {
          name: /移除 test.jpg/i,
        });
        fireEvent.click(removeButton);

        await waitFor(() => {
          expect(screen.queryByText('test.jpg')).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('Photo Editing Interface', () => {
    it('should show edit options for selected files', async () => {
      render(<PhotoUploadPage />);

      const fileInput = screen.getByLabelText(/選擇檔案/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /編輯檔案資訊/i })
        ).toBeInTheDocument();
      });
    });

    it('should open edit dialog when clicked', async () => {
      render(<PhotoUploadPage />);

      const fileInput = screen.getByLabelText(/選擇檔案/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(async () => {
        const editButton = screen.getByRole('button', {
          name: /編輯檔案資訊/i,
        });
        fireEvent.click(editButton);

        await waitFor(() => {
          expect(
            screen.getByRole('dialog', { name: /編輯照片資訊/i })
          ).toBeInTheDocument();
        });
      });
    });

    it('should show rename and tag inputs in edit dialog', async () => {
      render(<PhotoUploadPage />);

      const fileInput = screen.getByLabelText(/選擇檔案/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(async () => {
        const editButton = screen.getByRole('button', {
          name: /編輯檔案資訊/i,
        });
        fireEvent.click(editButton);

        await waitFor(() => {
          expect(screen.getByLabelText(/檔案名稱/i)).toBeInTheDocument();
          expect(screen.getByLabelText(/標籤/i)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Upload Progress and Status', () => {
    it('should display upload button', () => {
      render(<PhotoUploadPage />);

      expect(
        screen.getByRole('button', { name: /開始上傳/i })
      ).toBeInTheDocument();
    });

    it('should show progress bar when uploading', () => {
      // Mock uploading state
      vi.doMock('@/hooks/usePhotoUpload', () => ({
        usePhotoUpload: () => ({
          uploading: true,
          progress: 45,
          uploadedFiles: [],
          errors: [],
          uploadPhotos: vi.fn(),
          cancelUpload: vi.fn(),
          clearUploads: vi.fn(),
        }),
      }));

      render(<PhotoUploadPage />);

      expect(screen.getByTestId('upload-progress-bar')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    it('should show cancel button during upload', () => {
      vi.doMock('@/hooks/usePhotoUpload', () => ({
        usePhotoUpload: () => ({
          uploading: true,
          progress: 45,
          uploadedFiles: [],
          errors: [],
          uploadPhotos: vi.fn(),
          cancelUpload: vi.fn(),
          clearUploads: vi.fn(),
        }),
      }));

      render(<PhotoUploadPage />);

      expect(
        screen.getByRole('button', { name: /取消上傳/i })
      ).toBeInTheDocument();
    });

    it('should display upload results summary', () => {
      vi.doMock('@/hooks/usePhotoUpload', () => ({
        usePhotoUpload: () => ({
          uploading: false,
          progress: 100,
          uploadedFiles: [
            { id: '1', name: 'photo1.jpg', status: 'success' },
            { id: '2', name: 'photo2.jpg', status: 'success' },
          ],
          errors: [{ fileName: 'photo3.jpg', message: '檔案過大' }],
          uploadPhotos: vi.fn(),
          cancelUpload: vi.fn(),
          clearUploads: vi.fn(),
        }),
      }));

      render(<PhotoUploadPage />);

      expect(screen.getByTestId('upload-results-summary')).toBeInTheDocument();
      expect(screen.getByText(/成功上傳 2 張照片/i)).toBeInTheDocument();
      expect(screen.getByText(/1 個錯誤/i)).toBeInTheDocument();
    });
  });

  describe('Batch Upload Interface', () => {
    it('should show batch upload controls when multiple files selected', async () => {
      render(<PhotoUploadPage />);

      const fileInput = screen.getByLabelText(/選擇檔案/i);
      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }),
      ];

      fireEvent.change(fileInput, { target: { files } });

      await waitFor(() => {
        expect(screen.getByTestId('batch-upload-controls')).toBeInTheDocument();
        expect(screen.getByText(/已選擇 2 個檔案/i)).toBeInTheDocument();
      });
    });

    it('should show batch operations buttons', async () => {
      render(<PhotoUploadPage />);

      const fileInput = screen.getByLabelText(/選擇檔案/i);
      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }),
      ];

      fireEvent.change(fileInput, { target: { files } });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /批次編輯/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /全部移除/i })
        ).toBeInTheDocument();
      });
    });

    it('should allow selecting all files', async () => {
      render(<PhotoUploadPage />);

      const fileInput = screen.getByLabelText(/選擇檔案/i);
      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }),
      ];

      fireEvent.change(fileInput, { target: { files } });

      await waitFor(() => {
        const selectAllCheckbox = screen.getByRole('checkbox', {
          name: /全選檔案/i,
        });
        fireEvent.click(selectAllCheckbox);

        expect(screen.getByText(/已選擇 2 個檔案/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should show mobile-optimized layout', () => {
      render(<PhotoUploadPage />);

      const mobileLayout = screen.getByTestId('mobile-layout');
      expect(mobileLayout).toBeInTheDocument();
    });

    it('should adapt upload zone for different screen sizes', () => {
      render(<PhotoUploadPage />);

      const uploadZone = screen.getByTestId('upload-dropzone');
      expect(uploadZone).toHaveClass('min-h-64', 'md:min-h-80');
    });
  });
});
