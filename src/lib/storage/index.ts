/**
 * 本地檔案儲存系統 - 主要導出模組
 */

export { LocalFileStorageService } from './local-file-storage'
export { EnhancedFileSecurityService } from './enhanced-file-security'
export {
  type DirectoryInfo,
  type FileInfo,
  type StorageError,
  type StorageQuota,
  type UploadOptions,
  type ConflictData,
  type Result,
  type ConflictResolution,
  type PathValidationResult,
  type QuotaInfo,
  type RateLimitInfo,
  type ProjectQuotaInfo,
  type StorageQuotaInfo,
  type ConflictResolutionOption,
  type FileConflictResult,
  type IntegrityCheckResult,
  type ValidationResult,
  MIME_TYPE_MAP,
  ALLOWED_EXTENSIONS,
  PATH_SECURITY
} from './types'

// 建立單例實例供系統使用
import { fileSecurityService } from '../security/file-security'

export const localFileStorageService = new LocalFileStorageService()
export const enhancedFileSecurityService = new EnhancedFileSecurityService(
  localFileStorageService,
  fileSecurityService
)