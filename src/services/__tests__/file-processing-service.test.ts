/**
 * File Processing Service Tests
 * 檔案處理服務測試 - 實施任務 2.2 的測試
 */

import { FileProcessingService } from '../file-processing-service';
import { EventBus } from '../event-bus';

const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  once: jest.fn(),
} as jest.Mocked<EventBus>;

// Mock Canvas API for image processing
const mockCanvas = {
  getContext: jest.fn().mockReturnValue({
    drawImage: jest.fn(),
    canvas: { toBlob: jest.fn() },
  }),
  width: 0,
  height: 0,
  toBlob: jest.fn(),
};

const mockImage = {
  onload: null as any,
  onerror: null as any,
  src: '',
  width: 1920,
  height: 1080,
};

// Mock global objects
global.HTMLCanvasElement = jest.fn().mockImplementation(() => mockCanvas);
global.Image = jest.fn().mockImplementation(() => mockImage);

// Mock FileReader
global.FileReader = jest.fn().mockImplementation(() => ({
  readAsDataURL: jest.fn(),
  onload: null as any,
  onerror: null as any,
  result: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...',
}));

describe('FileProcessingService', () => {
  let fileProcessingService: FileProcessingService;

  beforeEach(() => {
    fileProcessingService = new FileProcessingService(mockEventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Asynchronous File Processing (Task 2.2)', () => {
    it('should implement background compression and format conversion', async () => {
      // Requirement 6.1: 在背景進行壓縮、格式轉換和縮圖生成
      const mockFile = new File(['test image data'], 'test.jpg', {
        type: 'image/jpeg',
      });

      // Mock successful compression
      mockCanvas.toBlob.mockImplementation(callback => {
        const compressedBlob = new Blob(['compressed data'], {
          type: 'image/jpeg',
        });
        callback(compressedBlob);
      });

      const result = await fileProcessingService.processFileAsync(mockFile, {
        compress: true,
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1080,
        async: true,
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'file.processing.started',
        expect.objectContaining({
          fileId: expect.any(String),
          fileName: 'test.jpg',
          originalSize: mockFile.size,
        })
      );

      expect(result).toMatchObject({
        id: expect.any(String),
        originalPath: expect.any(String),
        compressedPath: expect.any(String),
        compressionRatio: expect.any(Number),
        processingTime: expect.any(Number),
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'file.processing.completed',
        expect.objectContaining({
          fileId: result.id,
          status: 'success',
        })
      );
    });

    it('should implement progressive compression algorithm for large files', async () => {
      // Requirement 6.2: 使用漸進式壓縮算法保持最佳品質
      const largeFile = new File(
        [new ArrayBuffer(15 * 1024 * 1024)], // 15MB file
        'large-image.jpg',
        { type: 'image/jpeg' }
      );

      const result = await fileProcessingService.compressFile(largeFile, {
        targetSize: 5 * 1024 * 1024, // Target 5MB
        progressive: true,
        preserveQuality: true,
      });

      expect(result.compressed).toBe(true);
      expect(result.finalSize).toBeLessThan(largeFile.size);
      expect(result.qualityScore).toBeGreaterThan(0.7); // Maintain reasonable quality
      expect(result.compressionSteps).toBeGreaterThan(1); // Progressive compression
    });

    it('should implement content hash for file integrity and deduplication', async () => {
      // Requirement 6.3: 使用內容散列確保檔案完整性和去重
      const mockFile = new File(['identical content'], 'test1.jpg', {
        type: 'image/jpeg',
      });
      const duplicateFile = new File(['identical content'], 'test2.jpg', {
        type: 'image/jpeg',
      });

      const hash1 = await fileProcessingService.calculateFileHash(mockFile);
      const hash2 =
        await fileProcessingService.calculateFileHash(duplicateFile);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^sha256:[a-f0-9]{64}$/);

      const verificationResult =
        await fileProcessingService.verifyFileIntegrity(mockFile, hash1);
      expect(verificationResult.isValid).toBe(true);
      expect(verificationResult.checksum).toBe(hash1);
    });

    it('should generate adaptive images for different device requirements', async () => {
      // Requirement 6.4: 動態生成適應性圖片服務不同裝置需求
      const mockFile = new File(['test image'], 'test.jpg', {
        type: 'image/jpeg',
      });

      const result = await fileProcessingService.generateThumbnails(mockFile, {
        sizes: {
          thumbnail: { width: 150, height: 150 },
          small: { width: 300, height: 200 },
          medium: { width: 600, height: 400 },
          large: { width: 1200, height: 800 },
        },
        formats: ['webp', 'jpeg'],
        responsive: true,
      });

      expect(result.thumbnails).toHaveProperty('thumbnail');
      expect(result.thumbnails).toHaveProperty('small');
      expect(result.thumbnails).toHaveProperty('medium');
      expect(result.thumbnails).toHaveProperty('large');

      expect(result.srcSet).toBeDefined();
      expect(result.srcSet).toContain('webp');
      expect(result.srcSet).toContain('jpeg');

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'thumbnails.generated',
        expect.objectContaining({
          fileId: expect.any(String),
          thumbnailCount: 4,
          formats: ['webp', 'jpeg'],
        })
      );
    });

    it('should implement queue mechanism and parallel processing', async () => {
      // Requirement 6.5: 使用佇列機制和並行處理提升吞吐量
      const files = [
        new File(['image1'], 'image1.jpg', { type: 'image/jpeg' }),
        new File(['image2'], 'image2.jpg', { type: 'image/jpeg' }),
        new File(['image3'], 'image3.jpg', { type: 'image/jpeg' }),
        new File(['image4'], 'image4.jpg', { type: 'image/jpeg' }),
        new File(['image5'], 'image5.jpg', { type: 'image/jpeg' }),
      ];

      const progressCallback = jest.fn();
      const result = await fileProcessingService.batchProcessFiles(files, {
        concurrency: 3,
        onProgress: progressCallback,
        operations: ['compress', 'thumbnail'],
      });

      expect(progressCallback).toHaveBeenCalled();
      expect(result.totalProcessed).toBe(5);
      expect(result.results).toHaveLength(5);
      expect(result.processingTime).toBeGreaterThan(0);

      // Verify parallel processing (should be faster than sequential)
      expect(result.processingTime).toBeLessThan(files.length * 1000); // Assuming 1s per file sequentially
    });

    it('should implement automatic cleanup and tiered storage', async () => {
      // Requirement 6.6: 自動清理策略和分層儲存機制
      const mockStorageStatus = {
        totalSpace: 100 * 1024 * 1024 * 1024, // 100GB
        usedSpace: 95 * 1024 * 1024 * 1024, // 95GB (95% full)
        availableSpace: 5 * 1024 * 1024 * 1024, // 5GB
      };

      jest
        .spyOn(fileProcessingService as any, 'getStorageStatus')
        .mockResolvedValue(mockStorageStatus);

      const cleanupResult = await fileProcessingService.performStorageCleanup({
        strategy: 'tiered',
        thresholdPercent: 90,
        preserveRecent: true,
        archiveOld: true,
      });

      expect(cleanupResult.cleanupTriggered).toBe(true);
      expect(cleanupResult.filesArchived).toBeGreaterThan(0);
      expect(cleanupResult.filesDeleted).toBeGreaterThan(0);
      expect(cleanupResult.spaceFreed).toBeGreaterThan(0);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'storage.cleanup.completed',
        expect.objectContaining({
          spaceFreed: cleanupResult.spaceFreed,
          filesProcessed:
            cleanupResult.filesArchived + cleanupResult.filesDeleted,
        })
      );
    });
  });

  describe('File Validation and Security', () => {
    it('should validate file types and sizes', async () => {
      const validFile = new File(['image data'], 'test.jpg', {
        type: 'image/jpeg',
      });
      const invalidFile = new File(['script'], 'malicious.exe', {
        type: 'application/exe',
      });
      const oversizedFile = new File(
        [new ArrayBuffer(50 * 1024 * 1024)],
        'huge.jpg',
        { type: 'image/jpeg' }
      );

      const validResult = await fileProcessingService.validateFile(validFile);
      expect(validResult.isValid).toBe(true);

      const invalidResult =
        await fileProcessingService.validateFile(invalidFile);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Unsupported file type');

      const oversizedResult =
        await fileProcessingService.validateFile(oversizedFile);
      expect(oversizedResult.isValid).toBe(false);
      expect(oversizedResult.errors).toContain('File size exceeds limit');
    });

    it('should extract metadata safely', async () => {
      const mockFile = new File(['image with exif'], 'test.jpg', {
        type: 'image/jpeg',
      });

      const metadata = await fileProcessingService.extractMetadata(mockFile);

      expect(metadata).toMatchObject({
        fileName: 'test.jpg',
        fileSize: expect.any(Number),
        mimeType: 'image/jpeg',
        checksum: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
        width: expect.any(Number),
        height: expect.any(Number),
        extractedAt: expect.any(Date),
      });

      // Should sanitize potentially dangerous metadata
      expect(metadata.sanitized).toBe(true);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle processing errors gracefully', async () => {
      const corruptFile = new File(['corrupt data'], 'corrupt.jpg', {
        type: 'image/jpeg',
      });

      // Mock Image loading failure
      setTimeout(() => {
        if (mockImage.onerror) {
          mockImage.onerror(new Error('Failed to load image'));
        }
      }, 0);

      const result = await fileProcessingService.processFileAsync(corruptFile, {
        compress: true,
        generateThumbnails: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Failed to load image');

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'file.processing.failed',
        expect.objectContaining({
          fileId: expect.any(String),
          error: expect.any(String),
        })
      );
    });

    it('should implement retry mechanism for transient failures', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      let attemptCount = 0;
      jest
        .spyOn(fileProcessingService as any, 'processImage')
        .mockImplementation(async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Transient processing error');
          }
          return { success: true, processedImage: new Blob() };
        });

      const result = await fileProcessingService.processFileAsync(mockFile, {
        retryAttempts: 3,
        retryDelay: 100,
      });

      expect(attemptCount).toBe(3);
      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(2);
    });

    it('should handle memory constraints during processing', async () => {
      const largeFile = new File(
        [new ArrayBuffer(100 * 1024 * 1024)],
        'massive.jpg',
        { type: 'image/jpeg' }
      );

      const result = await fileProcessingService.processFileAsync(largeFile, {
        memoryLimit: 50 * 1024 * 1024, // 50MB limit
        enableStreaming: true,
      });

      if (result.success) {
        expect(result.streamProcessed).toBe(true);
        expect(result.memoryUsage).toBeLessThan(50 * 1024 * 1024);
      } else {
        expect(result.error).toContain('Memory limit exceeded');
      }
    });
  });

  describe('Performance Optimization', () => {
    it('should cache processed images', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      // First processing
      const result1 = await fileProcessingService.processFileAsync(mockFile, {
        compress: true,
        enableCache: true,
      });

      // Second processing should use cache
      const result2 = await fileProcessingService.processFileAsync(mockFile, {
        compress: true,
        enableCache: true,
      });

      expect(result2.fromCache).toBe(true);
      expect(result2.processingTime).toBeLessThan(result1.processingTime);
    });

    it('should monitor processing performance', async () => {
      const files = Array.from(
        { length: 10 },
        (_, i) => new File([`test${i}`], `test${i}.jpg`, { type: 'image/jpeg' })
      );

      const result = await fileProcessingService.batchProcessFiles(files, {
        collectMetrics: true,
      });

      expect(result.metrics).toMatchObject({
        totalFiles: 10,
        avgProcessingTime: expect.any(Number),
        throughput: expect.any(Number),
        memoryPeak: expect.any(Number),
        cacheHitRate: expect.any(Number),
      });
    });
  });
});
