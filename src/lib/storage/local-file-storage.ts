/**
 * 本地檔案儲存服務
 * 提供專案相簿的本地檔案系統操作功能
 */

import fs from 'fs/promises';
import path from 'path';
import {
  DirectoryInfo,
  FileInfo,
  StorageError,
  StorageQuota,
  UploadOptions,
  ConflictResolution,
  ConflictData,
  Result,
  MIME_TYPE_MAP,
  ALLOWED_EXTENSIONS,
  PATH_SECURITY,
} from './types';

export interface LocalFileStorageOptions {
  baseDir?: string;
  maxFileSize?: number;
  chunkSize?: number;
}

export class LocalFileStorageService {
  private readonly baseDirectory: string;
  private readonly maxFileSize: number;
  private readonly chunkSize: number;

  constructor(options?: LocalFileStorageOptions) {
    this.baseDirectory = options?.baseDir || PATH_SECURITY.BASE_DIRECTORY;
    this.maxFileSize = options?.maxFileSize || 100 * 1024 * 1024; // 100MB default
    this.chunkSize = options?.chunkSize || 1024 * 1024; // 1MB default chunk size
  }

  /**
   * 建立相簿目錄
   */
  async createAlbumDirectory(
    projectCode: string,
    albumName: string
  ): Promise<Result<DirectoryInfo, StorageError>> {
    // 驗證路徑安全性
    const validation = this.validatePathSecurity(projectCode, albumName);
    if (!validation.isValid) {
      return this.createErrorResult(
        `不安全的路徑: ${validation.errors.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }

    const albumPath = this.buildAlbumPath(projectCode, albumName);

    try {
      // 檢查目錄是否已存在
      const existingDirectory = await this.getExistingDirectory(albumPath);
      if (existingDirectory) {
        return this.createSuccessResult(existingDirectory);
      }

      // 建立新目錄
      await fs.mkdir(albumPath, { recursive: true });

      return this.createSuccessResult({
        path: albumPath,
        projectCode,
        albumName,
        createdAt: new Date(),
      });
    } catch (error) {
      return this.createErrorResult(
        `建立目錄失敗: ${this.getErrorMessage(error)}`,
        'DISK_ERROR'
      );
    }
  }

  /**
   * 上傳檔案到相簿
   */
  async uploadFile(
    projectCode: string,
    albumName: string,
    file: File,
    options?: UploadOptions
  ): Promise<Result<FileInfo, StorageError>> {
    // 驗證檔案名稱安全性
    const fileValidation = this.validateFileName(file.name);
    if (!fileValidation.isValid) {
      return this.createErrorResult(
        `不安全的檔案名稱: ${fileValidation.errors.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }

    // 驗證路徑安全性
    const pathValidation = this.validatePathSecurity(projectCode, albumName);
    if (!pathValidation.isValid) {
      return this.createErrorResult(
        `不安全的路徑: ${pathValidation.errors.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }

    try {
      const albumPath = this.buildAlbumPath(projectCode, albumName);

      // 確保相簿目錄存在
      await this.ensureParentDirectory(path.join(albumPath, 'dummy'));

      const fileName = options?.preserveOriginalName
        ? file.name
        : this.sanitizeFileName(file.name);
      const filePath = path.join(albumPath, fileName);

      // 檢查檔案衝突
      const conflictResult = await this.checkFileConflict(filePath, fileName);
      if (conflictResult) {
        return conflictResult;
      }

      // 上傳檔案
      const buffer = await this.fileToBuffer(file);
      await fs.writeFile(filePath, buffer);

      // 獲取檔案資訊並回傳結果
      const fileInfo = await this.createFileInfo(filePath, file, fileName);
      return this.createSuccessResult(fileInfo);
    } catch (error) {
      return this.createErrorResult(
        `上傳檔案失敗: ${this.getErrorMessage(error)}`,
        'DISK_ERROR'
      );
    }
  }

  /**
   * 刪除檔案
   */
  async deleteFile(filePath: string): Promise<Result<void, StorageError>> {
    try {
      // 驗證檔案路徑在允許範圍內
      if (!this.isPathWithinBase(filePath)) {
        return {
          success: false,
          error: new StorageError('路徑不在允許的範圍內', 'VALIDATION_ERROR'),
        };
      }

      await fs.unlink(filePath);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: new StorageError(
          `刪除檔案失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
          'DISK_ERROR'
        ),
      };
    }
  }

  /**
   * 檢查檔案是否存在
   */
  async checkFileExists(
    filePath: string
  ): Promise<Result<boolean, StorageError>> {
    try {
      await fs.access(filePath);
      return { success: true, data: true };
    } catch {
      return { success: true, data: false };
    }
  }

  /**
   * 解決檔案衝突
   */
  async resolveFileConflict(
    filePath: string,
    strategy: ConflictResolution
  ): Promise<Result<string, StorageError>> {
    try {
      switch (strategy) {
        case 'overwrite':
          return { success: true, data: filePath };

        case 'skip':
          return { success: true, data: '' };

        case 'rename':
          const newPath = this.generateUniqueFileName(filePath);
          return { success: true, data: newPath };

        default:
          return {
            success: false,
            error: new StorageError(
              `不支援的衝突解決策略: ${strategy}`,
              'VALIDATION_ERROR'
            ),
          };
      }
    } catch (error) {
      return {
        success: false,
        error: new StorageError(
          `解決檔案衝突失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
          'DISK_ERROR'
        ),
      };
    }
  }

  /**
   * 確保目錄存在
   */
  async ensureDirectoryExists(
    directoryPath: string
  ): Promise<Result<void, StorageError>> {
    try {
      // 檢查目錄是否已存在
      try {
        await fs.access(directoryPath);
        return { success: true };
      } catch {
        // 目錄不存在，建立它
        await fs.mkdir(directoryPath, { recursive: true });
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        error: new StorageError(
          `確保目錄存在失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
          'DISK_ERROR'
        ),
      };
    }
  }

  /**
   * 獲取目錄檔案列表
   */
  async getDirectoryListing(
    directoryPath: string
  ): Promise<Result<FileInfo[], StorageError>> {
    try {
      const files = await fs.readdir(directoryPath);
      const fileInfos: FileInfo[] = [];

      for (const fileName of files) {
        const filePath = path.join(directoryPath, fileName);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          fileInfos.push({
            path: filePath,
            originalName: fileName,
            size: stats.size,
            mimeType: this.getMimeTypeFromExtension(fileName),
            uploadedAt: stats.birthtime,
          });
        }
      }

      return { success: true, data: fileInfos };
    } catch (error) {
      return {
        success: false,
        error: new StorageError(
          `讀取目錄失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
          'DISK_ERROR'
        ),
      };
    }
  }

  /**
   * 儲存檔案（支援大檔案和 Buffer）
   * 用於效能測試的檔案儲存功能
   */
  async storeFile(
    filePath: string,
    projectCode: string,
    albumName: string
  ): Promise<Result<FileInfo, StorageError>> {
    try {
      // 驗證路徑安全性
      const pathValidation = this.validatePathSecurity(projectCode, albumName);
      if (!pathValidation.isValid) {
        return this.createErrorResult(
          `不安全的路徑: ${pathValidation.errors.join(', ')}`,
          'VALIDATION_ERROR'
        );
      }

      // 檢查檔案是否存在
      try {
        await fs.access(filePath);
      } catch {
        return this.createErrorResult(
          `來源檔案不存在: ${filePath}`,
          'VALIDATION_ERROR'
        );
      }

      const fileName = path.basename(filePath);
      const fileValidation = this.validateFileName(fileName);
      if (!fileValidation.isValid) {
        return this.createErrorResult(
          `不安全的檔案名稱: ${fileValidation.errors.join(', ')}`,
          'VALIDATION_ERROR'
        );
      }

      // 檢查檔案大小
      const stats = await fs.stat(filePath);
      if (stats.size > this.maxFileSize) {
        return this.createErrorResult(
          `檔案太大: ${stats.size} bytes, 最大允許: ${this.maxFileSize} bytes`,
          'VALIDATION_ERROR'
        );
      }

      const albumPath = this.buildAlbumPath(projectCode, albumName);
      await this.ensureDirectoryExists(albumPath);

      const destFilePath = path.join(albumPath, fileName);

      // 檢查檔案衝突
      const conflictResult = await this.checkFileConflict(destFilePath, fileName);
      if (conflictResult) {
        return conflictResult;
      }

      // 複製檔案
      await fs.copyFile(filePath, destFilePath);

      // 建立檔案資訊
      const finalStats = await fs.stat(destFilePath);
      const fileInfo: FileInfo = {
        path: destFilePath,
        originalName: fileName,
        size: finalStats.size,
        mimeType: this.getMimeTypeFromExtension(fileName),
        uploadedAt: finalStats.birthtime,
      };

      return this.createSuccessResult(fileInfo);
    } catch (error) {
      return this.createErrorResult(
        `儲存檔案失敗: ${this.getErrorMessage(error)}`,
        'DISK_ERROR'
      );
    }
  }

  /**
   * 大檔案分塊上傳
   * 支援可恢復的大檔案上傳
   */
  async uploadLargeFile(
    filePath: string,
    projectCode: string,
    albumName: string,
    onProgress?: (progress: { uploaded: number; total: number; percentage: number }) => void
  ): Promise<Result<FileInfo, StorageError>> {
    try {
      // 檢查來源檔案
      const sourceStats = await fs.stat(filePath);
      const fileName = path.basename(filePath);

      // 驗證
      const pathValidation = this.validatePathSecurity(projectCode, albumName);
      if (!pathValidation.isValid) {
        return this.createErrorResult(
          `不安全的路徑: ${pathValidation.errors.join(', ')}`,
          'VALIDATION_ERROR'
        );
      }

      const fileValidation = this.validateFileName(fileName);
      if (!fileValidation.isValid) {
        return this.createErrorResult(
          `不安全的檔案名稱: ${fileValidation.errors.join(', ')}`,
          'VALIDATION_ERROR'
        );
      }

      const albumPath = this.buildAlbumPath(projectCode, albumName);
      await this.ensureDirectoryExists(albumPath);

      const destFilePath = path.join(albumPath, fileName);

      // 檢查檔案衝突
      const conflictResult = await this.checkFileConflict(destFilePath, fileName);
      if (conflictResult) {
        return conflictResult;
      }

      // 分塊複製檔案
      const sourceFile = await fs.open(filePath, 'r');
      const destFile = await fs.open(destFilePath, 'w');

      try {
        let uploadedBytes = 0;
        const totalBytes = sourceStats.size;
        const buffer = Buffer.alloc(this.chunkSize);

        while (uploadedBytes < totalBytes) {
          const remainingBytes = totalBytes - uploadedBytes;
          const chunkSize = Math.min(this.chunkSize, remainingBytes);

          const { bytesRead } = await sourceFile.read(buffer, 0, chunkSize, uploadedBytes);
          await destFile.write(buffer, 0, bytesRead);

          uploadedBytes += bytesRead;

          // 報告進度
          if (onProgress) {
            onProgress({
              uploaded: uploadedBytes,
              total: totalBytes,
              percentage: (uploadedBytes / totalBytes) * 100,
            });
          }
        }

        // 建立檔案資訊
        const finalStats = await fs.stat(destFilePath);
        const fileInfo: FileInfo = {
          path: destFilePath,
          originalName: fileName,
          size: finalStats.size,
          mimeType: this.getMimeTypeFromExtension(fileName),
          uploadedAt: finalStats.birthtime,
        };

        return this.createSuccessResult(fileInfo);
      } finally {
        await sourceFile.close();
        await destFile.close();
      }
    } catch (error) {
      return this.createErrorResult(
        `大檔案上傳失敗: ${this.getErrorMessage(error)}`,
        'DISK_ERROR'
      );
    }
  }

  /**
   * 批次檔案處理
   * 支援並行處理多個檔案
   */
  async processBatch(
    files: string[],
    projectCode: string,
    albumName: string,
    concurrency: number = 3
  ): Promise<Result<{ successful: FileInfo[]; failed: { file: string; error: string }[] }, StorageError>> {
    try {
      const successful: FileInfo[] = [];
      const failed: { file: string; error: string }[] = [];

      // 分批處理檔案
      for (let i = 0; i < files.length; i += concurrency) {
        const batch = files.slice(i, i + concurrency);

        const promises = batch.map(async (filePath) => {
          const result = await this.storeFile(filePath, projectCode, albumName);
          if (result.success && result.data) {
            successful.push(result.data);
          } else {
            failed.push({
              file: filePath,
              error: result.error?.message || 'Unknown error',
            });
          }
        });

        await Promise.all(promises);
      }

      return this.createSuccessResult({ successful, failed });
    } catch (error) {
      return this.createErrorResult(
        `批次處理失敗: ${this.getErrorMessage(error)}`,
        'DISK_ERROR'
      );
    }
  }

  /**
   * 檢查系統資源使用情況
   */
  async checkSystemResources(): Promise<Result<{
    diskSpace: { used: number; available: number; total: number };
    memoryUsage: NodeJS.MemoryUsage;
  }, StorageError>> {
    try {
      // 獲取記憶體使用情況
      const memoryUsage = process.memoryUsage();

      // 模擬磁碟空間檢查（實際環境會使用 statvfs 或類似 API）
      const diskSpace = {
        used: 50 * 1024 * 1024 * 1024, // 50GB
        available: 450 * 1024 * 1024 * 1024, // 450GB
        total: 500 * 1024 * 1024 * 1024, // 500GB
      };

      return this.createSuccessResult({
        diskSpace,
        memoryUsage,
      });
    } catch (error) {
      return this.createErrorResult(
        `檢查系統資源失敗: ${this.getErrorMessage(error)}`,
        'DISK_ERROR'
      );
    }
  }

  /**
   * 獲取儲存配額資訊
   */
  async getStorageQuota(): Promise<Result<StorageQuota, StorageError>> {
    try {
      // TODO: 實作實際的配額計算
      // 這裡先回傳模擬資料
      return {
        success: true,
        data: {
          totalUsed: 0,
          totalLimit: 100 * 1024 * 1024 * 1024, // 100GB
          remaining: 100 * 1024 * 1024 * 1024,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: new StorageError(
          `獲取配額資訊失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
          'DISK_ERROR'
        ),
      };
    }
  }

  // === 私有輔助方法 ===

  /**
   * 驗證路徑安全性
   */
  private validatePathSecurity(
    projectCode: string,
    albumName: string
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 檢查專案代碼
    if (!projectCode || projectCode.trim() === '') {
      errors.push('專案代碼不能為空');
    } else if (this.containsDangerousPatterns(projectCode)) {
      errors.push('專案代碼包含不安全字符');
    }

    // 檢查相簿名稱
    if (!albumName || albumName.trim() === '') {
      errors.push('相簿名稱不能為空');
    } else if (this.containsDangerousPatterns(albumName)) {
      errors.push('相簿名稱包含不安全字符');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 驗證檔案名稱安全性
   */
  private validateFileName(fileName: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!fileName || fileName.trim() === '') {
      errors.push('檔案名稱不能為空');
      return { isValid: false, errors };
    }

    // 檢查檔案名稱長度
    if (fileName.length > PATH_SECURITY.MAX_FILENAME_LENGTH) {
      errors.push(
        `檔案名稱過長 (最大${PATH_SECURITY.MAX_FILENAME_LENGTH}字符)`
      );
    }

    // 檢查危險字符和模式
    if (this.containsDangerousPatterns(fileName)) {
      errors.push('檔案名稱包含不安全字符');
    }

    // 檢查副檔名
    const extension = path.extname(fileName).toLowerCase();
    if (extension && !ALLOWED_EXTENSIONS.includes(extension)) {
      errors.push(`不支援的檔案類型: ${extension}`);
    }

    // 檢查保留名稱 (Windows)
    const baseName = path.basename(fileName, extension).toUpperCase();
    if (PATH_SECURITY.RESERVED_NAMES.includes(baseName)) {
      errors.push(`檔案名稱為系統保留名稱: ${baseName}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 檢查字串是否包含危險模式
   */
  private containsDangerousPatterns(input: string): boolean {
    return PATH_SECURITY.DANGEROUS_PATTERNS.some(pattern =>
      pattern.test(input)
    );
  }

  /**
   * 清理檔案名稱
   */
  private sanitizeFileName(fileName: string): string {
    let sanitized = fileName;

    // 移除或替換危險字符
    PATH_SECURITY.DANGEROUS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '_');
    });

    // 移除尾隨空格和點號
    sanitized = sanitized.trim().replace(/\.+$/, '');

    // 確保不是空的或僅包含點號
    if (!sanitized || sanitized === '') {
      sanitized = `file_${Date.now()}`;
    }

    return sanitized;
  }

  /**
   * 產生替代檔案名稱
   */
  private generateAlternativeNames(fileName: string): string[] {
    const extension = path.extname(fileName);
    const baseName = path.basename(fileName, extension);
    const timestamp = Date.now();

    return [
      `${baseName}_${timestamp}${extension}`,
      `${baseName}_copy${extension}`,
      `${baseName}_new${extension}`,
      `${baseName}_1${extension}`,
      `${baseName}_2${extension}`,
    ];
  }

  /**
   * 產生唯一檔案名稱
   */
  private generateUniqueFileName(originalPath: string): string {
    const extension = path.extname(originalPath);
    const directory = path.dirname(originalPath);
    const baseName = path.basename(originalPath, extension);
    const timestamp = Date.now();

    return path.join(directory, `${baseName}_${timestamp}${extension}`);
  }

  /**
   * 根據副檔名獲取 MIME 類型
   */
  private getMimeTypeFromExtension(fileName: string): string {
    const extension = path.extname(fileName).toLowerCase();
    return MIME_TYPE_MAP[extension] || 'application/octet-stream';
  }

  /**
   * 檢查路徑是否在基礎目錄內
   */
  private isPathWithinBase(targetPath: string): boolean {
    const normalizedBasePath = path.resolve(this.baseDirectory);
    const normalizedTargetPath = path.resolve(targetPath);

    return normalizedTargetPath.startsWith(normalizedBasePath);
  }

  // === 重構輔助方法 ===

  /**
   * 建立相簿路徑
   */
  private buildAlbumPath(projectCode: string, albumName: string): string {
    return path.join(this.baseDirectory, projectCode, albumName);
  }

  /**
   * 檢查並獲取現有目錄資訊
   */
  private async getExistingDirectory(
    albumPath: string
  ): Promise<DirectoryInfo | null> {
    try {
      await fs.access(albumPath);
      const stats = await fs.stat(albumPath);

      if (stats.isDirectory()) {
        const pathParts = albumPath
          .replace(this.baseDirectory + path.sep, '')
          .split(path.sep);
        return {
          path: albumPath,
          projectCode: pathParts[0],
          albumName: pathParts[1],
          createdAt: stats.birthtime,
        };
      }
    } catch {
      // 目錄不存在
    }
    return null;
  }

  /**
   * 建立成功結果
   */
  private createSuccessResult<T>(data: T): Result<T, StorageError> {
    return { success: true, data };
  }

  /**
   * 建立錯誤結果
   */
  private createErrorResult(
    message: string,
    type: StorageError['type'],
    conflictData?: ConflictData
  ): Result<any, StorageError> {
    return {
      success: false,
      error: new StorageError(message, type, conflictData),
    };
  }

  /**
   * 獲取統一的錯誤訊息
   */
  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : '未知錯誤';
  }

  /**
   * 將 File 物件轉換為 Buffer
   */
  private async fileToBuffer(file: File): Promise<Buffer> {
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * 檢查並建立父目錄
   */
  private async ensureParentDirectory(filePath: string): Promise<void> {
    const parentDir = path.dirname(filePath);
    try {
      await fs.access(parentDir);
    } catch {
      await fs.mkdir(parentDir, { recursive: true });
    }
  }

  /**
   * 檢查檔案衝突
   */
  private async checkFileConflict(
    filePath: string,
    fileName: string
  ): Promise<Result<any, StorageError> | null> {
    try {
      await fs.access(filePath);
      // 檔案已存在，回傳衝突錯誤
      const conflictData: ConflictData = {
        existingPath: filePath,
        newFileName: fileName,
        suggestedNames: this.generateAlternativeNames(fileName),
      };

      return this.createErrorResult(
        `檔案已存在: ${fileName}`,
        'FILE_CONFLICT',
        conflictData
      );
    } catch {
      // 檔案不存在，無衝突
      return null;
    }
  }

  /**
   * 建立檔案資訊物件
   */
  private async createFileInfo(
    filePath: string,
    originalFile: File,
    fileName: string
  ): Promise<FileInfo> {
    const stats = await fs.stat(filePath);

    return {
      path: filePath,
      originalName: originalFile.name,
      size: stats.size,
      mimeType: originalFile.type || this.getMimeTypeFromExtension(fileName),
      uploadedAt: stats.birthtime,
    };
  }
}
