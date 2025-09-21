/**
 * Photo Gallery 權限管理相關類型定義
 */

import { ProjectPermission } from '@/store/projectScopeStore'

/**
 * 照片庫操作權限
 */
export enum PhotoPermission {
  /** 檢視照片 */
  VIEW = 'photo:view',
  /** 上傳照片 */
  UPLOAD = 'photo:upload',
  /** 下載照片 */
  DOWNLOAD = 'photo:download',
  /** 刪除照片 */
  DELETE = 'photo:delete',
  /** 管理相簿 */
  MANAGE_ALBUMS = 'photo:manage_albums',
  /** 管理所有照片 */
  ADMIN = 'photo:admin'
}

/**
 * 權限檢查結果
 */
export interface PermissionCheckResult {
  /** 是否有權限 */
  hasPermission: boolean
  /** 錯誤訊息 */
  error?: string
  /** 錯誤代碼 */
  errorCode?: string
}

/**
 * 專案照片庫權限配置
 */
export interface ProjectPhotoPermissions {
  /** 專案ID */
  projectId: string
  /** 使用者ID */
  userId: string
  /** 專案權限等級 */
  projectPermission: ProjectPermission
  /** 照片庫特定權限 */
  photoPermissions: PhotoPermission[]
  /** 權限來源 */
  source: 'project_role' | 'direct_assignment' | 'inherited'
  /** 權限到期時間 */
  expiresAt?: Date
}

/**
 * 權限驗證中介層配置
 */
export interface PhotoPermissionMiddlewareConfig {
  /** 是否啟用權限檢查 */
  enabled: boolean
  /** 快取TTL (毫秒) */
  cacheTtl: number
  /** 是否記錄權限檢查日誌 */
  enableLogging: boolean
  /** 預設拒絕存取 */
  defaultDeny: boolean
}

/**
 * 權限快取項目
 */
export interface PermissionCacheItem {
  /** 快取鍵值 */
  key: string
  /** 權限結果 */
  permissions: ProjectPhotoPermissions
  /** 快取建立時間 */
  createdAt: Date
  /** 快取到期時間 */
  expiresAt: Date
}

/**
 * 權限檢查上下文
 */
export interface PermissionContext {
  /** 使用者ID */
  userId: string
  /** 專案ID */
  projectId: string
  /** 要檢查的權限 */
  permission: PhotoPermission
  /** 照片ID (可選) */
  photoId?: string
  /** 相簿ID (可選) */
  albumId?: string
  /** 請求來源IP */
  ipAddress?: string
  /** 使用者代理 */
  userAgent?: string
}

/**
 * 權限錯誤類型
 */
export enum PermissionErrorCode {
  /** 使用者未認證 */
  UNAUTHORIZED = 'UNAUTHORIZED',
  /** 沒有權限 */
  FORBIDDEN = 'FORBIDDEN',
  /** 專案不存在 */
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  /** 照片不存在 */
  PHOTO_NOT_FOUND = 'PHOTO_NOT_FOUND',
  /** 權限已過期 */
  PERMISSION_EXPIRED = 'PERMISSION_EXPIRED',
  /** 系統錯誤 */
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

/**
 * 權限檢查選項
 */
export interface PermissionCheckOptions {
  /** 是否使用快取 */
  useCache?: boolean
  /** 是否記錄日誌 */
  logAccess?: boolean
  /** 自訂錯誤訊息 */
  customErrorMessage?: string
}