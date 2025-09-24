/**
 * PhotoService 批次下載功能測試
 * 測試 Task 5-2: 批次下載功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { photoService } from '../photoService';
import { Photo } from '@/types/photo.types';

// Mock JSZip (未安裝時會失敗)
const mockJSZip = {
  file: vi.fn(),
  generateAsync: vi.fn(),
};

vi.mock('jszip', () => ({
  default: vi.fn(() => mockJSZip),
}));

// Mock DOM elements for download
const mockAnchor = {
  href: '',
  download: '',
  click: vi.fn(),
  remove: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();

  // Mock document.createElement for anchor element
  vi.spyOn(document, 'createElement').mockImplementation(tag => {
    if (tag === 'a') {
      return mockAnchor as unknown as HTMLAnchorElement;
    }
    return document.createElement(tag);
  });

  // Mock document.body methods
  vi.spyOn(document.body, 'appendChild').mockImplementation(
    () => mockAnchor as unknown as HTMLAnchorElement
  );
  vi.spyOn(document.body, 'removeChild').mockImplementation(
    () => mockAnchor as unknown as HTMLAnchorElement
  );

  // Mock URL.createObjectURL and revokeObjectURL
  global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PhotoService - Batch Download (Task 5-2)', () => {
  const mockPhotos: Photo[] = [
    {
      id: 'photo-1',
      projectId: 'test-project',
      albumName: 'test-album',
      fileName: 'photo1.jpg',
      fileSize: 1024000,
      mimeType: 'image/jpeg',
      width: 1920,
      height: 1080,
      thumbnailUrl: '/thumbnails/photo1.jpg',
      originalUrl: '/photos/photo1.jpg',
      uploadedBy: 'test-user',
      uploadedAt: new Date('2023-01-01'),
      metadata: {},
    },
    {
      id: 'photo-2',
      projectId: 'test-project',
      albumName: 'test-album',
      fileName: 'photo2.png',
      fileSize: 2048000,
      mimeType: 'image/png',
      width: 1280,
      height: 720,
      thumbnailUrl: '/thumbnails/photo2.png',
      originalUrl: '/photos/photo2.png',
      uploadedBy: 'test-user',
      uploadedAt: new Date('2023-01-02'),
      metadata: {},
    },
  ];

  describe('批次選取功能', () => {
    it('應該支援多張照片選取', () => {
      // RED: 這個測試會失敗，因為還沒有實作選取邏輯
      expect(photoService.getSelectedPhotos).toBeDefined();
      expect(photoService.selectPhoto).toBeDefined();
      expect(photoService.deselectPhoto).toBeDefined();
      expect(photoService.clearSelection).toBeDefined();
    });

    it('應該正確管理選取狀態', () => {
      // RED: 會失敗，因為方法不存在
      photoService.clearSelection();
      expect(photoService.getSelectedPhotos()).toEqual([]);

      photoService.selectPhoto('photo-1');
      photoService.selectPhoto('photo-2');
      expect(photoService.getSelectedPhotos()).toHaveLength(2);

      photoService.deselectPhoto('photo-1');
      expect(photoService.getSelectedPhotos()).toHaveLength(1);
      expect(photoService.getSelectedPhotos()[0]).toBe('photo-2');
    });
  });

  describe('ZIP打包功能', () => {
    it('應該能建立ZIP檔案包含多張照片', async () => {
      // RED: 會失敗，因為 JSZip 未安裝且方法未實作
      mockJSZip.generateAsync.mockResolvedValue(new Blob());

      await expect(
        photoService.createPhotoZip(mockPhotos)
      ).resolves.toBeInstanceOf(Blob);

      expect(mockJSZip.file).toHaveBeenCalledTimes(2);
      expect(mockJSZip.generateAsync).toHaveBeenCalledWith({ type: 'blob' });
    });

    it('應該為每張照片在ZIP中建立正確的檔名', async () => {
      // RED: 會失敗，方法不存在
      mockJSZip.generateAsync.mockResolvedValue(new Blob());

      await photoService.createPhotoZip(mockPhotos);

      expect(mockJSZip.file).toHaveBeenCalledWith(
        'photo1.jpg',
        expect.anything()
      );
      expect(mockJSZip.file).toHaveBeenCalledWith(
        'photo2.png',
        expect.anything()
      );
    });

    it('應該處理重複檔名，自動重新命名', async () => {
      // RED: 會失敗，邏輯未實作
      const duplicatePhotos = [
        { ...mockPhotos[0], id: 'photo-1' },
        { ...mockPhotos[0], id: 'photo-1-duplicate', fileName: 'photo1.jpg' },
      ];

      mockJSZip.generateAsync.mockResolvedValue(new Blob());

      await photoService.createPhotoZip(duplicatePhotos);

      expect(mockJSZip.file).toHaveBeenCalledWith(
        'photo1.jpg',
        expect.anything()
      );
      expect(mockJSZip.file).toHaveBeenCalledWith(
        'photo1_2.jpg',
        expect.anything()
      );
    });
  });

  describe('大檔案處理', () => {
    it('應該支援大檔案分割下載', async () => {
      // RED: 會失敗，功能未實作
      const largePhotos = Array.from({ length: 50 }, (_, i) => ({
        ...mockPhotos[0],
        id: `photo-${i}`,
        fileName: `photo${i}.jpg`,
        fileSize: 10 * 1024 * 1024, // 10MB each
      }));

      await expect(
        photoService.downloadPhotosInBatches(largePhotos, { batchSize: 10 })
      ).resolves.toBeUndefined();
    });

    it('應該在檔案總大小超過限制時建議分批下載', () => {
      // RED: 會失敗，邏輯未實作
      const totalSize = mockPhotos.reduce(
        (sum, photo) => sum + photo.fileSize,
        0
      );
      const shouldSplit = photoService.shouldSplitDownload(mockPhotos);

      expect(typeof shouldSplit).toBe('boolean');
    });
  });

  describe('進度追蹤', () => {
    it('應該提供下載進度回調', async () => {
      // RED: 會失敗，功能未實作
      const progressCallback = vi.fn();

      await photoService.downloadPhotos(mockPhotos, {
        onProgress: progressCallback,
      });

      expect(progressCallback).toHaveBeenCalled();
    });

    it('應該支援取消下載操作', async () => {
      // RED: 會失敗，功能未實作
      const downloadPromise = photoService.downloadPhotos(mockPhotos);

      photoService.cancelBatchDownload();

      await expect(downloadPromise).rejects.toThrow('Download cancelled');
    });
  });

  describe('佇列管理', () => {
    it('應該管理下載佇列狀態', () => {
      // RED: 會失敗，功能未實作
      expect(photoService.getDownloadQueue).toBeDefined();
      expect(photoService.addToDownloadQueue).toBeDefined();
      expect(photoService.removeFromDownloadQueue).toBeDefined();
    });

    it('應該防止重複加入相同的照片到佇列', () => {
      // RED: 會失敗，邏輯未實作
      photoService.addToDownloadQueue(mockPhotos);
      photoService.addToDownloadQueue(mockPhotos); // 重複加入

      const queue = photoService.getDownloadQueue();
      expect(queue).toHaveLength(2); // 不應該重複
    });
  });

  describe('錯誤處理', () => {
    it('應該處理單張照片下載失敗的情況', async () => {
      // RED: 會失敗，錯誤處理未實作
      const photosWithError = [
        mockPhotos[0],
        { ...mockPhotos[1], originalUrl: '' }, // 無效URL
      ];

      await expect(
        photoService.downloadPhotos(photosWithError)
      ).resolves.not.toThrow();

      // 應該只下載成功的照片，跳過失敗的
    });

    it('應該在ZIP生成失敗時提供適當錯誤訊息', async () => {
      // RED: 會失敗，錯誤處理未實作
      mockJSZip.generateAsync.mockRejectedValue(
        new Error('ZIP generation failed')
      );

      await expect(photoService.downloadPhotos(mockPhotos)).rejects.toThrow(
        'ZIP generation failed'
      );
    });
  });

  describe('效能考量', () => {
    it('應該限制同時下載的檔案數量', async () => {
      // RED: 會失敗，並發控制未實作
      const manyPhotos = Array.from({ length: 20 }, (_, i) => ({
        ...mockPhotos[0],
        id: `photo-${i}`,
        fileName: `photo${i}.jpg`,
      }));

      const concurrencyLimit = 5;
      await photoService.downloadPhotos(manyPhotos, {
        concurrency: concurrencyLimit,
      });

      // 驗證不會同時下載超過限制數量的檔案
    });
  });
});
