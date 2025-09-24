/**
 * LocalFileStorageService 單元測試
 * 測試本地檔案系統操作的核心功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { LocalFileStorageService } from '../local-file-storage';
import {
  DirectoryInfo,
  FileInfo,
  StorageError,
  ConflictResolution,
} from '../types';

// Mock fs 模組
vi.mock('fs/promises');
const mockFs = fs as any;

describe('LocalFileStorageService', () => {
  let service: LocalFileStorageService;
  const testBaseDir = 'uploads/photos';

  beforeEach(() => {
    service = new LocalFileStorageService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createAlbumDirectory', () => {
    it('應該成功建立專案/相簿目錄結構', async () => {
      // Arrange
      const projectCode = 'TEST001';
      const albumName = '工程進度照片';
      const expectedPath = path.join(testBaseDir, projectCode, albumName);

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));

      // Act
      const result = await service.createAlbumDirectory(projectCode, albumName);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        path: expectedPath,
        projectCode,
        albumName,
        createdAt: expect.any(Date),
      } as DirectoryInfo);
      expect(mockFs.mkdir).toHaveBeenCalledWith(expectedPath, {
        recursive: true,
      });
    });

    it('應該回傳錯誤當專案代碼包含不安全字符', async () => {
      // Arrange
      const dangerousProjectCode = '../../../etc';
      const albumName = '正常相簿';

      // Act
      const result = await service.createAlbumDirectory(
        dangerousProjectCode,
        albumName
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('不安全的路徑');
      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });

    it('應該回傳錯誤當相簿名稱包含路徑遍歷字符', async () => {
      // Arrange
      const projectCode = 'TEST001';
      const dangerousAlbumName = '../../危險目錄';

      // Act
      const result = await service.createAlbumDirectory(
        projectCode,
        dangerousAlbumName
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('不安全的路徑');
      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });

    it('應該處理目錄已存在的情況', async () => {
      // Arrange
      const projectCode = 'TEST001';
      const albumName = '現有相簿';
      const expectedPath = path.join(testBaseDir, projectCode, albumName);

      mockFs.access.mockResolvedValue(undefined); // 目錄已存在
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        birthtime: new Date('2023-01-01'),
      } as any);

      // Act
      const result = await service.createAlbumDirectory(projectCode, albumName);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.path).toBe(expectedPath);
      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });

    it('應該處理檔案系統錯誤', async () => {
      // Arrange
      const projectCode = 'TEST001';
      const albumName = '測試相簿';

      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      // Act
      const result = await service.createAlbumDirectory(projectCode, albumName);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Permission denied');
    });
  });

  describe('uploadFile', () => {
    it('應該成功上傳檔案到相簿目錄', async () => {
      // Arrange
      const projectCode = 'TEST001';
      const albumName = '工程照片';
      const file = new File(['test content'], 'test.jpg', {
        type: 'image/jpeg',
      });
      const expectedPath = path.join(
        testBaseDir,
        projectCode,
        albumName,
        'test.jpg'
      );

      mockFs.access.mockResolvedValue(undefined); // 目錄存在
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({
        size: 12,
        birthtime: new Date(),
      } as any);

      // Act
      const result = await service.uploadFile(projectCode, albumName, file);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        path: expectedPath,
        originalName: 'test.jpg',
        size: 12,
        mimeType: 'image/jpeg',
        uploadedAt: expect.any(Date),
      } as FileInfo);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expectedPath,
        expect.any(Buffer)
      );
    });

    it('應該檢測檔案名稱衝突', async () => {
      // Arrange
      const projectCode = 'TEST001';
      const albumName = '工程照片';
      const file = new File(['test content'], 'existing.jpg', {
        type: 'image/jpeg',
      });

      mockFs.access.mockResolvedValue(undefined); // 目錄和檔案都存在

      // Act
      const result = await service.uploadFile(projectCode, albumName, file);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('FILE_CONFLICT');
      expect(result.error?.conflictData).toEqual({
        existingPath: path.join(
          testBaseDir,
          projectCode,
          albumName,
          'existing.jpg'
        ),
        newFileName: 'existing.jpg',
        suggestedNames: expect.arrayContaining([
          expect.stringContaining('existing_'),
          expect.stringContaining('.jpg'),
        ]),
      });
    });

    it('應該拒絕不安全的檔案名稱', async () => {
      // Arrange
      const projectCode = 'TEST001';
      const albumName = '工程照片';
      const file = new File(['test content'], '../../../malicious.exe', {
        type: 'application/octet-stream',
      });

      // Act
      const result = await service.uploadFile(projectCode, albumName, file);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('不安全的檔案名稱');
    });

    it('應該建立缺失的相簿目錄', async () => {
      // Arrange
      const projectCode = 'TEST001';
      const albumName = '新相簿';
      const file = new File(['test content'], 'test.jpg', {
        type: 'image/jpeg',
      });

      mockFs.access
        .mockRejectedValueOnce(new Error('Directory does not exist')) // 相簿不存在
        .mockResolvedValueOnce(undefined); // 建立後存在
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({
        size: 12,
        birthtime: new Date(),
      } as any);

      // Act
      const result = await service.uploadFile(projectCode, albumName, file);

      // Assert
      expect(result.success).toBe(true);
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(testBaseDir, projectCode, albumName),
        { recursive: true }
      );
    });
  });

  describe('deleteFile', () => {
    it('應該成功刪除檔案', async () => {
      // Arrange
      const filePath = path.join(testBaseDir, 'TEST001', '相簿', 'test.jpg');

      mockFs.unlink.mockResolvedValue(undefined);

      // Act
      const result = await service.deleteFile(filePath);

      // Assert
      expect(result.success).toBe(true);
      expect(mockFs.unlink).toHaveBeenCalledWith(filePath);
    });

    it('應該拒絕刪除基礎目錄外的檔案', async () => {
      // Arrange
      const maliciousPath = '/etc/passwd';

      // Act
      const result = await service.deleteFile(maliciousPath);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('路徑不在允許的範圍內');
      expect(mockFs.unlink).not.toHaveBeenCalled();
    });

    it('應該處理檔案不存在的情況', async () => {
      // Arrange
      const filePath = path.join(
        testBaseDir,
        'TEST001',
        '相簿',
        'nonexistent.jpg'
      );

      mockFs.unlink.mockRejectedValue(new Error('File not found'));

      // Act
      const result = await service.deleteFile(filePath);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('File not found');
    });
  });

  describe('checkFileExists', () => {
    it('應該正確檢查檔案是否存在', async () => {
      // Arrange
      const filePath = path.join(testBaseDir, 'TEST001', '相簿', 'test.jpg');

      mockFs.access.mockResolvedValue(undefined);

      // Act
      const result = await service.checkFileExists(filePath);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('應該正確檢查檔案不存在', async () => {
      // Arrange
      const filePath = path.join(
        testBaseDir,
        'TEST001',
        '相簿',
        'nonexistent.jpg'
      );

      mockFs.access.mockRejectedValue(new Error('File not found'));

      // Act
      const result = await service.checkFileExists(filePath);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe('resolveFileConflict', () => {
    it('應該產生重新命名的檔案路徑', async () => {
      // Arrange
      const originalPath = path.join(
        testBaseDir,
        'TEST001',
        '相簿',
        'test.jpg'
      );
      const strategy: ConflictResolution = 'rename';

      // Act
      const result = await service.resolveFileConflict(originalPath, strategy);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toMatch(/test_\d+\.jpg$/);
    });

    it('應該支援覆蓋策略', async () => {
      // Arrange
      const originalPath = path.join(
        testBaseDir,
        'TEST001',
        '相簿',
        'test.jpg'
      );
      const strategy: ConflictResolution = 'overwrite';

      // Act
      const result = await service.resolveFileConflict(originalPath, strategy);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(originalPath);
    });

    it('應該支援跳過策略', async () => {
      // Arrange
      const originalPath = path.join(
        testBaseDir,
        'TEST001',
        '相簿',
        'test.jpg'
      );
      const strategy: ConflictResolution = 'skip';

      // Act
      const result = await service.resolveFileConflict(originalPath, strategy);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe('');
    });
  });

  describe('ensureDirectoryExists', () => {
    it('應該建立不存在的目錄', async () => {
      // Arrange
      const directoryPath = path.join(testBaseDir, 'NEW_PROJECT', '新相簿');

      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));
      mockFs.mkdir.mockResolvedValue(undefined);

      // Act
      const result = await service.ensureDirectoryExists(directoryPath);

      // Assert
      expect(result.success).toBe(true);
      expect(mockFs.mkdir).toHaveBeenCalledWith(directoryPath, {
        recursive: true,
      });
    });

    it('應該跳過已存在的目錄', async () => {
      // Arrange
      const directoryPath = path.join(
        testBaseDir,
        'EXISTING_PROJECT',
        '現有相簿'
      );

      mockFs.access.mockResolvedValue(undefined);

      // Act
      const result = await service.ensureDirectoryExists(directoryPath);

      // Assert
      expect(result.success).toBe(true);
      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });
  });

  describe('getDirectoryListing', () => {
    it('應該回傳目錄中的檔案列表', async () => {
      // Arrange
      const directoryPath = path.join(testBaseDir, 'TEST001', '相簿');
      const mockFiles = ['image1.jpg', 'image2.png', 'document.pdf'];

      mockFs.readdir.mockResolvedValue(mockFiles as any);
      mockFs.stat.mockImplementation(filePath => {
        const fileName = path.basename(filePath as string);
        return Promise.resolve({
          isFile: () => true,
          isDirectory: () => false,
          size: 1024,
          mtime: new Date(),
          birthtime: new Date(),
        } as any);
      });

      // Act
      const result = await service.getDirectoryListing(directoryPath);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data?.[0]).toEqual({
        path: expect.stringContaining('image1.jpg'),
        originalName: 'image1.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: expect.any(Date),
      } as FileInfo);
    });

    it('應該處理空目錄', async () => {
      // Arrange
      const directoryPath = path.join(testBaseDir, 'TEST001', '空相簿');

      mockFs.readdir.mockResolvedValue([]);

      // Act
      const result = await service.getDirectoryListing(directoryPath);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('應該處理目錄不存在的錯誤', async () => {
      // Arrange
      const directoryPath = path.join(testBaseDir, 'NONEXISTENT', '不存在相簿');

      mockFs.readdir.mockRejectedValue(new Error('Directory not found'));

      // Act
      const result = await service.getDirectoryListing(directoryPath);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Directory not found');
    });
  });
});
