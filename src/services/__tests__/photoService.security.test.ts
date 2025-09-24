/**
 * PhotoService 安全功能測試套件
 * 測試安全檔案驗證、速率限制和權限控制
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PhotoService } from '../photoService';
import { fileSecurityService } from '@/lib/security/file-security';
import { rateLimitService } from '@/lib/security/rate-limit-service';
import { signedUrlService } from '@/lib/security/signed-url-service';
import type { ValidationResult } from '@/types/photo.types';

// Mock安全服務
vi.mock('@/lib/security/file-security');
vi.mock('@/lib/security/rate-limit-service');
vi.mock('@/lib/security/signed-url-service');

// Mock File API
global.File = class MockFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;

  constructor(chunks: any[], filename: string, options: any = {}) {
    this.name = filename;
    this.size = options.size || 1024;
    this.type = options.type || 'text/plain';
    this.lastModified = options.lastModified || Date.now();
  }
} as any;

describe('PhotoService - Security Features', () => {
  let photoService: PhotoService;
  const mockUserId = 'user-123';
  const mockProjectId = 'project-456';

  beforeEach(() => {
    photoService = new PhotoService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateFileSecurely', () => {
    it('should fail validation when rate limit is exceeded', async () => {
      // Arrange
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      vi.mocked(rateLimitService.checkUserRateLimit).mockReturnValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
      });

      // Act
      const result = await photoService.validateFileSecurely(
        file,
        mockUserId,
        mockProjectId
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('上傳頻率過高，請稍後再試');
      expect(rateLimitService.checkUserRateLimit).toHaveBeenCalledWith(
        mockUserId,
        'upload'
      );
    });

    it('should pass validation when rate limit is not exceeded', async () => {
      // Arrange
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      vi.mocked(rateLimitService.checkUserRateLimit).mockReturnValue({
        allowed: true,
        remaining: 10,
        resetTime: Date.now() + 60000,
      });

      vi.mocked(fileSecurityService.validateFileSecurely).mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedFilename: 'test_sanitized.jpg',
      });

      // Act
      const result = await photoService.validateFileSecurely(
        file,
        mockUserId,
        mockProjectId
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.sanitizedFilename).toBe('test_sanitized.jpg');
      expect(fileSecurityService.validateFileSecurely).toHaveBeenCalledWith(
        file,
        mockUserId,
        mockProjectId
      );
    });

    it('should handle security validation failures', async () => {
      // Arrange
      const file = new File(['malicious'], 'malware.exe', {
        type: 'application/exe',
      });

      vi.mocked(rateLimitService.checkUserRateLimit).mockReturnValue({
        allowed: true,
        remaining: 10,
        resetTime: Date.now() + 60000,
      });

      vi.mocked(fileSecurityService.validateFileSecurely).mockResolvedValue({
        isValid: false,
        errors: ['檔案類型不安全', '檔案可能包含惡意內容'],
        warnings: [],
      });

      // Act
      const result = await photoService.validateFileSecurely(
        file,
        mockUserId,
        mockProjectId
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('檔案類型不安全');
      expect(result.errors).toContain('檔案可能包含惡意內容');
    });

    it('should return warnings for potentially risky files', async () => {
      // Arrange
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      vi.mocked(rateLimitService.checkUserRateLimit).mockReturnValue({
        allowed: true,
        remaining: 5,
        resetTime: Date.now() + 60000,
      });

      vi.mocked(fileSecurityService.validateFileSecurely).mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: ['檔案包含GPS位置資訊'],
        sanitizedFilename: 'test_clean.jpg',
      });

      // Act
      const result = await photoService.validateFileSecurely(
        file,
        mockUserId,
        mockProjectId
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('檔案包含GPS位置資訊');
    });
  });

  describe('createUploadFile - Security Integration', () => {
    it('should create upload file with security validation', async () => {
      // Arrange
      const file = new File(['test'], 'test.jpg', {
        type: 'image/jpeg',
        size: 1024,
      });

      vi.mocked(rateLimitService.checkUserRateLimit).mockReturnValue({
        allowed: true,
        remaining: 10,
        resetTime: Date.now() + 60000,
      });

      vi.mocked(fileSecurityService.validateFileSecurely).mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedFilename: 'secure_test.jpg',
      });

      vi.mocked(fileSecurityService.generateSecureFilePath).mockReturnValue(
        '/secure/path/secure_test.jpg'
      );

      // Act
      const result = await photoService.createUploadFile(
        file,
        mockUserId,
        mockProjectId
      );

      // Assert
      expect(result.securePath).toBe('/secure/path/secure_test.jpg');
      expect(result.securityValidation).toBeDefined();
      expect(result.securityValidation.isValid).toBe(true);
    });

    it('should throw error when security validation fails', async () => {
      // Arrange
      const file = new File(['malicious'], 'malware.jpg', {
        type: 'image/jpeg',
      });

      vi.mocked(rateLimitService.checkUserRateLimit).mockReturnValue({
        allowed: true,
        remaining: 10,
        resetTime: Date.now() + 60000,
      });

      vi.mocked(fileSecurityService.validateFileSecurely).mockResolvedValue({
        isValid: false,
        errors: ['檔案驗證失敗'],
        warnings: [],
      });

      // Act & Assert
      await expect(
        photoService.createUploadFile(file, mockUserId, mockProjectId)
      ).rejects.toThrow('檔案安全驗證失敗: 檔案驗證失敗');
    });
  });

  describe('downloadPhoto - Security', () => {
    it('should check rate limit before download', async () => {
      // Arrange
      const photo = {
        id: 'photo-123',
        fileName: 'test.jpg',
        projectId: mockProjectId,
        albumName: 'test-album',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        width: 800,
        height: 600,
        thumbnailUrl: '/thumb/test.jpg',
        originalUrl: '/original/test.jpg',
        uploadedBy: 'user-456',
        uploadedAt: new Date(),
        metadata: {},
      };

      vi.mocked(rateLimitService.checkUserRateLimit).mockReturnValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
      });

      // Act & Assert
      await expect(
        photoService.downloadPhoto(photo, mockUserId)
      ).rejects.toThrow('下載頻率過高，請稍後再試');

      expect(rateLimitService.checkUserRateLimit).toHaveBeenCalledWith(
        mockUserId,
        'download'
      );
    });

    it('should generate signed URL for secure download', async () => {
      // Arrange
      const photo = {
        id: 'photo-123',
        fileName: 'test.jpg',
        projectId: mockProjectId,
        albumName: 'test-album',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        width: 800,
        height: 600,
        thumbnailUrl: '/thumb/test.jpg',
        originalUrl: '/original/test.jpg',
        uploadedBy: 'user-456',
        uploadedAt: new Date(),
        metadata: {},
      };

      vi.mocked(rateLimitService.checkUserRateLimit).mockReturnValue({
        allowed: true,
        remaining: 10,
        resetTime: Date.now() + 60000,
      });

      vi.mocked(signedUrlService.generatePhotoAccessUrl).mockReturnValue({
        url: 'https://secure.example.com/download?token=abc123',
        token: 'token-123',
      });

      // Mock DOM operations
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();

      vi.stubGlobal('document', {
        createElement: vi.fn().mockReturnValue(mockLink),
        body: {
          appendChild: mockAppendChild,
          removeChild: mockRemoveChild,
        },
      });

      // Act
      await photoService.downloadPhoto(photo, mockUserId);

      // Assert
      expect(signedUrlService.generatePhotoAccessUrl).toHaveBeenCalledWith(
        'photo-123',
        mockUserId,
        {
          expiresIn: 300,
          maxDownloads: 1,
        }
      );
      expect(mockLink.href).toBe(
        'https://secure.example.com/download?token=abc123'
      );
      expect(mockLink.download).toBe('test.jpg');
      expect(mockLink.click).toHaveBeenCalled();
      expect(signedUrlService.recordDownload).toHaveBeenCalledWith('token-123');
    });
  });

  describe('downloadPhotos - Batch Security', () => {
    it('should check batch rate limit', async () => {
      // Arrange
      const photos = [
        {
          id: 'photo-1',
          fileName: 'test1.jpg',
          projectId: mockProjectId,
          albumName: 'test-album',
          fileSize: 1024,
          mimeType: 'image/jpeg',
          width: 800,
          height: 600,
          thumbnailUrl: '/thumb/test1.jpg',
          originalUrl: '/original/test1.jpg',
          uploadedBy: 'user-456',
          uploadedAt: new Date(),
          metadata: {},
        },
      ];

      vi.mocked(rateLimitService.checkUserRateLimit).mockReturnValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
      });

      // Act & Assert
      await expect(
        photoService.downloadPhotos(photos, mockUserId)
      ).rejects.toThrow('批次操作頻率過高，請稍後再試');

      expect(rateLimitService.checkUserRateLimit).toHaveBeenCalledWith(
        mockUserId,
        'batch'
      );
    });

    it('should enforce batch size limit', async () => {
      // Arrange
      const photos = Array.from({ length: 51 }, (_, i) => ({
        id: `photo-${i}`,
        fileName: `test${i}.jpg`,
        projectId: mockProjectId,
        albumName: 'test-album',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        width: 800,
        height: 600,
        thumbnailUrl: `/thumb/test${i}.jpg`,
        originalUrl: `/original/test${i}.jpg`,
        uploadedBy: 'user-456',
        uploadedAt: new Date(),
        metadata: {},
      }));

      vi.mocked(rateLimitService.checkUserRateLimit).mockReturnValue({
        allowed: true,
        remaining: 10,
        resetTime: Date.now() + 60000,
      });

      // Act & Assert
      await expect(
        photoService.downloadPhotos(photos, mockUserId)
      ).rejects.toThrow('單次批次下載不能超過50個檔案');
    });

    it('should generate batch download signed URL', async () => {
      // Arrange
      const photos = [
        {
          id: 'photo-1',
          fileName: 'test1.jpg',
          projectId: mockProjectId,
          albumName: 'test-album',
          fileSize: 1024,
          mimeType: 'image/jpeg',
          width: 800,
          height: 600,
          thumbnailUrl: '/thumb/test1.jpg',
          originalUrl: '/original/test1.jpg',
          uploadedBy: 'user-456',
          uploadedAt: new Date(),
          metadata: {},
        },
      ];

      vi.mocked(rateLimitService.checkUserRateLimit).mockReturnValue({
        allowed: true,
        remaining: 10,
        resetTime: Date.now() + 60000,
      });

      vi.mocked(signedUrlService.generateBatchDownloadUrl).mockReturnValue({
        url: 'https://secure.example.com/batch-download?token=batch123',
        token: 'batch-token-123',
      });

      // Mock fetch for ZIP creation
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['test data'])),
      });

      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url');
      global.URL.revokeObjectURL = vi.fn();

      // Mock DOM operations
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      vi.stubGlobal('document', {
        createElement: vi.fn().mockReturnValue(mockLink),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      });

      // Act
      await photoService.downloadPhotos(photos, mockUserId);

      // Assert
      expect(signedUrlService.generateBatchDownloadUrl).toHaveBeenCalledWith(
        ['photo-1'],
        mockUserId,
        {
          expiresIn: 1800,
          maxDownloads: 3,
        }
      );
      expect(signedUrlService.recordDownload).toHaveBeenCalledWith(
        'batch-token-123'
      );
    });
  });

  describe('Security Error Handling', () => {
    it('should handle security service errors gracefully', async () => {
      // Arrange
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      vi.mocked(rateLimitService.checkUserRateLimit).mockReturnValue({
        allowed: true,
        remaining: 10,
        resetTime: Date.now() + 60000,
      });

      vi.mocked(fileSecurityService.validateFileSecurely).mockRejectedValue(
        new Error('Security service unavailable')
      );

      // Act & Assert
      await expect(
        photoService.validateFileSecurely(file, mockUserId, mockProjectId)
      ).rejects.toThrow('Security service unavailable');
    });

    it('should handle rate limit service errors', async () => {
      // Arrange
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      vi.mocked(rateLimitService.checkUserRateLimit).mockImplementation(() => {
        throw new Error('Rate limit service error');
      });

      // Act & Assert
      await expect(
        photoService.validateFileSecurely(file, mockUserId, mockProjectId)
      ).rejects.toThrow('Rate limit service error');
    });
  });
});
