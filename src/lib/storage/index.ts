/**
 * 本地檔案儲存系統 - 主要導出模組
 */

export { LocalFileStorageService } from './local-file-storage'
export {
  type DirectoryInfo,
  type FileInfo,
  type StorageError,
  type StorageQuota,
  type UploadOptions,
  type ConflictData,
  type Result,
  type ConflictResolution,
  MIME_TYPE_MAP,
  ALLOWED_EXTENSIONS,
  PATH_SECURITY
} from './types'

// 建立單例實例供系統使用
export const localFileStorageService = new LocalFileStorageService()