/**
 * PhotoDownload 元件測試
 * 測試照片下載按鈕與介面的互動功能
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhotoDownload from '../PhotoDownload';
import type { Photo, DownloadOptions } from '../../../types/photo.types';

// Mock photoDownloadService
jest.mock('../../../services/photoDownloadService', () => ({
  PhotoDownloadService: jest.fn().mockImplementation(() => ({
    downloadPhoto: jest.fn(),
    validateDownloadPermissions: jest.fn(),
    generateDownloadFileName: jest.fn(),
    startDownloadTracking: jest.fn(),
    updateDownloadProgress: jest.fn(),
    getDownloadProgress: jest.fn(),
    cancelDownload: jest.fn(),
  })),
}));

const mockPhoto: Photo = {
  id: 'photo-123',
  projectId: 'project-1',
  albumId: 'album-1',
  fileName: 'construction-site.jpg',
  fileSize: 2048000,
  mimeType: 'image/jpeg',
  width: 1920,
  height: 1080,
  thumbnailUrl: '/thumbnails/photo-123.jpg',
  originalUrl: '/photos/photo-123.jpg',
  uploadedBy: 'user-456',
  uploadedAt: new Date('2024-01-15T10:30:00Z'),
  metadata: {
    capturedAt: new Date('2024-01-15T10:30:00Z'),
    description: '工地現場照片',
  },
};

describe('PhotoDownload 元件', () => {
  const mockOnDownloadStart = jest.fn();
  const mockOnDownloadComplete = jest.fn();
  const mockOnDownloadError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('應該渲染下載按鈕', () => {
    // Act
    render(
      <PhotoDownload
        photo={mockPhoto}
        onDownloadStart={mockOnDownloadStart}
        onDownloadComplete={mockOnDownloadComplete}
        onDownloadError={mockOnDownloadError}
      />
    );

    // Assert
    expect(screen.getByRole('button', { name: /下載/i })).toBeInTheDocument();
    expect(screen.getByTestId('download-icon')).toBeInTheDocument();
  });

  it('應該顯示解析度選擇選單', async () => {
    // Arrange
    const user = userEvent.setup();

    // Act
    render(
      <PhotoDownload
        photo={mockPhoto}
        onDownloadStart={mockOnDownloadStart}
        onDownloadComplete={mockOnDownloadComplete}
        onDownloadError={mockOnDownloadError}
      />
    );

    // 點擊下載按鈕開啟選單
    await user.click(screen.getByRole('button', { name: /下載/i }));

    // Assert
    expect(screen.getByText('縮圖 (150x150)')).toBeInTheDocument();
    expect(screen.getByText('小圖 (400x300)')).toBeInTheDocument();
    expect(screen.getByText('中圖 (800x600)')).toBeInTheDocument();
    expect(screen.getByText('大圖 (1200x900)')).toBeInTheDocument();
    expect(screen.getByText('原圖 (1920x1080)')).toBeInTheDocument();
  });

  it('應該在選擇解析度後開始下載', async () => {
    // Arrange
    const user = userEvent.setup();
    const mockDownloadService =
      require('../../../services/photoDownloadService').PhotoDownloadService;

    mockDownloadService.prototype.validateDownloadPermissions.mockResolvedValue(
      true
    );
    mockDownloadService.prototype.downloadPhoto.mockResolvedValue({
      success: true,
      downloadUrl: 'https://cdn.example.com/download/photo-123-medium.jpg',
      fileName: 'construction-site-medium.jpg',
      fileSize: 512000,
      expiresAt: new Date(),
    });

    // Act
    render(
      <PhotoDownload
        photo={mockPhoto}
        onDownloadStart={mockOnDownloadStart}
        onDownloadComplete={mockOnDownloadComplete}
        onDownloadError={mockOnDownloadError}
      />
    );

    // 開啟下載選單
    await user.click(screen.getByRole('button', { name: /下載/i }));

    // 選擇中圖解析度
    await user.click(screen.getByText('中圖 (800x600)'));

    // Assert
    await waitFor(() => {
      expect(mockOnDownloadStart).toHaveBeenCalledWith(mockPhoto.id, {
        resolution: 'medium',
        includeMetadata: false,
        watermark: false,
      });
    });
  });

  it('應該顯示下載進度條', async () => {
    // Arrange
    const user = userEvent.setup();
    const mockDownloadService =
      require('../../../services/photoDownloadService').PhotoDownloadService;

    mockDownloadService.prototype.validateDownloadPermissions.mockResolvedValue(
      true
    );
    mockDownloadService.prototype.getDownloadProgress.mockReturnValue({
      id: 'download-123',
      photoId: mockPhoto.id,
      fileName: 'construction-site-medium.jpg',
      progress: 45,
      status: 'downloading',
      startedAt: new Date(),
    });

    // Act
    render(
      <PhotoDownload
        photo={mockPhoto}
        onDownloadStart={mockOnDownloadStart}
        onDownloadComplete={mockOnDownloadComplete}
        onDownloadError={mockOnDownloadError}
        isDownloading={true}
        downloadProgress={45}
      />
    );

    // Assert
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('下載中...')).toBeInTheDocument();
  });

  it('應該能取消下載', async () => {
    // Arrange
    const user = userEvent.setup();
    const mockDownloadService =
      require('../../../services/photoDownloadService').PhotoDownloadService;

    // Act
    render(
      <PhotoDownload
        photo={mockPhoto}
        onDownloadStart={mockOnDownloadStart}
        onDownloadComplete={mockOnDownloadComplete}
        onDownloadError={mockOnDownloadError}
        isDownloading={true}
        downloadProgress={30}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /取消/i });
    await user.click(cancelButton);

    // Assert
    expect(mockDownloadService.prototype.cancelDownload).toHaveBeenCalled();
  });

  it('應該在權限不足時顯示錯誤訊息', async () => {
    // Arrange
    const user = userEvent.setup();
    const mockDownloadService =
      require('../../../services/photoDownloadService').PhotoDownloadService;

    mockDownloadService.prototype.validateDownloadPermissions.mockResolvedValue(
      false
    );

    // Act
    render(
      <PhotoDownload
        photo={mockPhoto}
        onDownloadStart={mockOnDownloadStart}
        onDownloadComplete={mockOnDownloadComplete}
        onDownloadError={mockOnDownloadError}
      />
    );

    await user.click(screen.getByRole('button', { name: /下載/i }));
    await user.click(screen.getByText('原圖 (1920x1080)'));

    // Assert
    await waitFor(() => {
      expect(mockOnDownloadError).toHaveBeenCalledWith(
        mockPhoto.id,
        '權限不足，無法下載此照片'
      );
    });
  });

  it('應該支援快捷鍵下載', async () => {
    // Arrange
    const user = userEvent.setup();
    const mockDownloadService =
      require('../../../services/photoDownloadService').PhotoDownloadService;

    mockDownloadService.prototype.validateDownloadPermissions.mockResolvedValue(
      true
    );

    // Act
    render(
      <PhotoDownload
        photo={mockPhoto}
        onDownloadStart={mockOnDownloadStart}
        onDownloadComplete={mockOnDownloadComplete}
        onDownloadError={mockOnDownloadError}
        enableShortcuts={true}
      />
    );

    // 按下 Ctrl+D (或 Cmd+D)
    await user.keyboard('{Control>}d{/Control}');

    // Assert
    await waitFor(() => {
      expect(mockOnDownloadStart).toHaveBeenCalledWith(mockPhoto.id, {
        resolution: 'original',
        includeMetadata: false,
        watermark: false,
      });
    });
  });

  it('應該顯示檔案大小資訊', () => {
    // Act
    render(
      <PhotoDownload
        photo={mockPhoto}
        onDownloadStart={mockOnDownloadStart}
        onDownloadComplete={mockOnDownloadComplete}
        onDownloadError={mockOnDownloadError}
        showFileSize={true}
      />
    );

    // Assert
    expect(screen.getByText('2.0 MB')).toBeInTheDocument();
  });

  it('應該在 compact 模式下只顯示圖示', () => {
    // Act
    render(
      <PhotoDownload
        photo={mockPhoto}
        onDownloadStart={mockOnDownloadStart}
        onDownloadComplete={mockOnDownloadComplete}
        onDownloadError={mockOnDownloadError}
        compact={true}
      />
    );

    // Assert
    expect(screen.getByTestId('download-icon')).toBeInTheDocument();
    expect(screen.queryByText('下載')).not.toBeInTheDocument();
  });
});
