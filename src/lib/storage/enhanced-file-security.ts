/**
 * Enhanced File Security Service
 * 整合現有檔案安全服務，支援本地檔案路徑驗證、配額管理、衝突檢測等功能
 */

import crypto from 'crypto';
import path from 'path';
import { LocalFileStorageService } from './local-file-storage';
import { FileSecurityService } from '../security/file-security';
import {
  Result,
  StorageError,
  PathValidationResult,
  QuotaInfo,
  RateLimitInfo,
  ProjectQuotaInfo,
  StorageQuotaInfo,
  ConflictResolutionOption,
  FileConflictResult,
  IntegrityCheckResult,
  ValidationResult,
  PATH_SECURITY,
} from './types';

export class EnhancedFileSecurityService {
  constructor(
    private localStorageService: LocalFileStorageService,
    private fileSecurityService: FileSecurityService
  ) {}

  /**
   * 驗證本地檔案路徑
   */
  async validateLocalFilePath(
    filePath: string
  ): Promise<Result<PathValidationResult, StorageError>> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // 檢查路徑是否在允許範圍內
      if (!this.isPathWithinBaseDirectory(filePath)) {
        return {
          success: false,
          error: new StorageError('路徑不在允許範圍內', 'VALIDATION_ERROR'),
        };
      }

      // 檢查危險字符
      if (this.containsDangerousPatterns(filePath)) {
        return {
          success: false,
          error: new StorageError('路徑包含危險字符', 'VALIDATION_ERROR'),
        };
      }

      // 正規化路徑
      const normalizedPath = path.normalize(filePath);

      // 檢查檔案是否存在（可選）
      const existsResult =
        await this.localStorageService.checkFileExists(normalizedPath);
      if (!existsResult.success) {
        warnings.push('無法驗證檔案存在性');
      }

      return {
        success: true,
        data: {
          isValid: true,
          normalizedPath,
          errors,
          warnings,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: new StorageError(
          `路徑驗證失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
          'VALIDATION_ERROR'
        ),
      };
    }
  }

  /**
   * 檢查儲存配額
   */
  async checkStorageQuota(
    userId: string,
    projectId: string,
    fileSize: number
  ): Promise<Result<StorageQuotaInfo, StorageError>> {
    try {
      // 獲取基礎配額資訊
      const quotaResult = await this.getBasicQuotaInfo();
      if (!quotaResult.success) {
        return quotaResult;
      }

      const quota = quotaResult.data!;
      const rateLimitResult = this.checkUploadRateLimit(userId);
      const projectQuota = this.calculateProjectQuota(quota, projectId);

      // 判斷是否可以上傳
      const canUpload = this.canPerformUpload(
        quota,
        rateLimitResult,
        projectQuota,
        fileSize
      );

      return this.createSuccessResult({
        canUpload,
        quotaInfo: this.buildQuotaInfo(quota),
        rateLimitInfo: this.buildRateLimitInfo(rateLimitResult),
        projectQuota,
      });
    } catch (error) {
      return this.createErrorResult(
        `配額檢查失敗: ${this.getErrorMessage(error)}`,
        'DISK_ERROR'
      );
    }
  }

  /**
   * 檢測檔案衝突
   */
  async detectFileConflict(
    filePath: string,
    originalName: string
  ): Promise<Result<FileConflictResult, StorageError>> {
    try {
      // 檢查檔案是否存在
      const existsResult =
        await this.localStorageService.checkFileExists(filePath);

      if (!existsResult.success) {
        return {
          success: false,
          error:
            existsResult.error ||
            new StorageError('檔案檢查失敗', 'DISK_ERROR'),
        };
      }

      const hasConflict = existsResult.data!;

      if (!hasConflict) {
        return {
          success: true,
          data: {
            hasConflict: false,
            existingPath: filePath,
            originalName,
            suggestedResolutions: [],
          },
        };
      }

      // 產生解決方案
      const suggestedResolutions: ConflictResolutionOption[] = [];

      // 重新命名選項
      const renameResult = await this.localStorageService.resolveFileConflict(
        filePath,
        'rename'
      );
      if (renameResult.success) {
        suggestedResolutions.push({
          strategy: 'rename',
          newPath: renameResult.data!,
          description: '自動重新命名檔案以避免衝突',
        });
      }

      // 覆蓋選項
      suggestedResolutions.push({
        strategy: 'overwrite',
        newPath: filePath,
        description: '覆蓋現有檔案（將遺失原檔案）',
      });

      // 跳過選項
      suggestedResolutions.push({
        strategy: 'skip',
        newPath: '',
        description: '跳過此檔案，不進行上傳',
      });

      return {
        success: true,
        data: {
          hasConflict: true,
          existingPath: filePath,
          originalName,
          suggestedResolutions,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: new StorageError(
          `衝突檢測失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
          'DISK_ERROR'
        ),
      };
    }
  }

  /**
   * 驗證檔案完整性
   */
  async verifyFileIntegrity(
    file: File,
    expectedChecksum: string
  ): Promise<Result<IntegrityCheckResult, StorageError>> {
    try {
      // 計算檔案檢查碼
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const actualChecksum = crypto
        .createHash('sha256')
        .update(buffer)
        .digest('hex');

      const isValid = actualChecksum === expectedChecksum;

      return {
        success: true,
        data: {
          isValid,
          actualChecksum,
          expectedChecksum,
          fileSize: file.size,
          verificationTime: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: new StorageError(
          `完整性驗證失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
          'VALIDATION_ERROR'
        ),
      };
    }
  }

  /**
   * 整合驗證流程
   */
  async integratedValidation(
    file: File,
    projectId: string,
    albumName: string,
    userId: string
  ): Promise<Result<ValidationResult, StorageError>> {
    try {
      const warnings: string[] = [];

      // 1. 安全性驗證
      const securityValidation =
        await this.fileSecurityService.validateFileSecurely(
          file,
          userId,
          projectId
        );

      if (!securityValidation.isValid) {
        return {
          success: true,
          data: {
            canProceed: false,
            securityValidation,
            quotaValidation: {} as StorageQuotaInfo,
            conflictCheck: {} as FileConflictResult,
            recommendedPath: '',
            warnings: securityValidation.errors,
          },
        };
      }

      // 2. 配額驗證
      const quotaValidation = await this.checkStorageQuota(
        userId,
        projectId,
        file.size
      );
      if (!quotaValidation.success) {
        return {
          success: false,
          error: quotaValidation.error!,
        };
      }

      if (!quotaValidation.data!.canUpload) {
        return {
          success: true,
          data: {
            canProceed: false,
            securityValidation,
            quotaValidation: quotaValidation.data!,
            conflictCheck: {} as FileConflictResult,
            recommendedPath: '',
            warnings: ['檔案大小超過配額限制或頻率限制'],
          },
        };
      }

      // 3. 建議路徑
      const sanitizedFilename =
        securityValidation.sanitizedFilename || file.name;
      const recommendedPath = path.join(
        PATH_SECURITY.BASE_DIRECTORY,
        projectId,
        albumName,
        sanitizedFilename
      );

      // 4. 衝突檢查
      const conflictCheck = await this.detectFileConflict(
        recommendedPath,
        file.name
      );
      if (!conflictCheck.success) {
        return {
          success: false,
          error: conflictCheck.error!,
        };
      }

      // 5. 警告訊息
      if (securityValidation.warnings.length > 0) {
        warnings.push(...securityValidation.warnings);
      }

      if (conflictCheck.data!.hasConflict) {
        warnings.push('檔案名稱存在衝突，建議選擇解決方案');
      }

      return {
        success: true,
        data: {
          canProceed: true,
          securityValidation,
          quotaValidation: quotaValidation.data!,
          conflictCheck: conflictCheck.data!,
          recommendedPath,
          warnings,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: new StorageError(
          `整合驗證失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
          'VALIDATION_ERROR'
        ),
      };
    }
  }

  // === 私有輔助方法 ===

  /**
   * 檢查路徑是否在基礎目錄內
   */
  private isPathWithinBaseDirectory(targetPath: string): boolean {
    const normalizedBasePath = path.resolve(PATH_SECURITY.BASE_DIRECTORY);
    const normalizedTargetPath = path.resolve(targetPath);

    return normalizedTargetPath.startsWith(normalizedBasePath);
  }

  /**
   * 檢查字串是否包含危險模式
   */
  private containsDangerousPatterns(input: string): boolean {
    return PATH_SECURITY.DANGEROUS_PATTERNS.some(pattern =>
      pattern.test(input)
    );
  }

  // === 配額管理輔助方法 ===

  /**
   * 獲取基礎配額資訊
   */
  private async getBasicQuotaInfo() {
    const quotaResult = await this.localStorageService.getStorageQuota();
    if (!quotaResult.success) {
      return this.createErrorResult('無法獲取配額資訊', 'DISK_ERROR');
    }
    return quotaResult;
  }

  /**
   * 檢查上傳頻率限制
   */
  private checkUploadRateLimit(userId: string) {
    return this.fileSecurityService.checkUploadRateLimit(userId);
  }

  /**
   * 計算專案配額
   */
  private calculateProjectQuota(
    quota: any,
    projectId: string
  ): ProjectQuotaInfo {
    // 這裡可以根據實際需求實作專案特定的配額邏輯
    return {
      projectUsed: quota.totalUsed * 0.1, // 假設專案使用10%
      projectLimit: quota.totalLimit * 0.2, // 假設專案限制20%
      projectRemaining: quota.totalLimit * 0.2 - quota.totalUsed * 0.1,
    };
  }

  /**
   * 判斷是否可以執行上傳
   */
  private canPerformUpload(
    quota: any,
    rateLimitResult: any,
    projectQuota: ProjectQuotaInfo,
    fileSize: number
  ): boolean {
    return (
      quota.remaining >= fileSize &&
      rateLimitResult.allowed &&
      projectQuota.projectRemaining >= fileSize
    );
  }

  /**
   * 建立配額資訊物件
   */
  private buildQuotaInfo(quota: any): QuotaInfo {
    return {
      totalUsed: quota.totalUsed,
      totalLimit: quota.totalLimit,
      remaining: quota.remaining,
      usagePercentage: (quota.totalUsed / quota.totalLimit) * 100,
    };
  }

  /**
   * 建立頻率限制資訊物件
   */
  private buildRateLimitInfo(rateLimitResult: any): RateLimitInfo {
    return {
      allowed: rateLimitResult.allowed,
      remaining: rateLimitResult.remaining,
      resetTime: rateLimitResult.resetTime,
    };
  }

  // === 通用輔助方法 ===

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
    type: StorageError['type']
  ): Result<any, StorageError> {
    return {
      success: false,
      error: new StorageError(message, type),
    };
  }

  /**
   * 獲取統一的錯誤訊息
   */
  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : '未知錯誤';
  }
}
