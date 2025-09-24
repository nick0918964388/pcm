/**
 * 本地檔案儲存系統的類型定義
 */

export type ConflictResolution = 'rename' | 'overwrite' | 'skip';

export interface DirectoryInfo {
  path: string;
  projectCode: string;
  albumName: string;
  createdAt: Date;
}

export interface FileInfo {
  path: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface StorageQuota {
  totalUsed: number;
  totalLimit: number;
  remaining: number;
}

export interface UploadOptions {
  conflictResolution?: ConflictResolution;
  preserveOriginalName?: boolean;
}

export interface ConflictData {
  existingPath: string;
  newFileName: string;
  suggestedNames: string[];
}

export class StorageError extends Error {
  constructor(
    message: string,
    public type:
      | 'VALIDATION_ERROR'
      | 'FILE_CONFLICT'
      | 'PERMISSION_ERROR'
      | 'DISK_ERROR'
      | 'NOT_FOUND',
    public conflictData?: ConflictData
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export interface Result<T, E = StorageError> {
  success: boolean;
  data?: T;
  error?: E;
}

// 檔案 MIME 類型對應
export const MIME_TYPE_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

// 允許的檔案副檔名
export const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.heic',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
];

// 路徑安全驗證常數
export const PATH_SECURITY = {
  BASE_DIRECTORY: 'uploads/photos',
  MAX_PATH_LENGTH: 255,
  MAX_FILENAME_LENGTH: 100,
  DANGEROUS_PATTERNS: [
    /\.\./g, // 路徑遍歷
    /[<>:"/\\|?*]/g, // 危險字符
    /\x00-\x1f/g, // 控制字符
    /^\.+$/, // 僅點號
    /\s+$/, // 尾隨空格
  ],
  RESERVED_NAMES: [
    'CON',
    'PRN',
    'AUX',
    'NUL',
    'COM1',
    'COM2',
    'COM3',
    'COM4',
    'COM5',
    'COM6',
    'COM7',
    'COM8',
    'COM9',
    'LPT1',
    'LPT2',
    'LPT3',
    'LPT4',
    'LPT5',
    'LPT6',
    'LPT7',
    'LPT8',
    'LPT9',
  ],
};

// === Enhanced File Security Types ===

export interface PathValidationResult {
  isValid: boolean;
  normalizedPath: string;
  errors: string[];
  warnings: string[];
}

export interface QuotaInfo {
  totalUsed: number;
  totalLimit: number;
  remaining: number;
  usagePercentage: number;
}

export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export interface ProjectQuotaInfo {
  projectUsed: number;
  projectLimit: number;
  projectRemaining: number;
}

export interface StorageQuotaInfo {
  canUpload: boolean;
  quotaInfo: QuotaInfo;
  rateLimitInfo: RateLimitInfo;
  projectQuota: ProjectQuotaInfo;
}

export interface ConflictResolutionOption {
  strategy: ConflictResolution;
  newPath: string;
  description: string;
}

export interface FileConflictResult {
  hasConflict: boolean;
  existingPath: string;
  originalName: string;
  suggestedResolutions: ConflictResolutionOption[];
}

export interface IntegrityCheckResult {
  isValid: boolean;
  actualChecksum: string;
  expectedChecksum: string;
  fileSize: number;
  verificationTime: Date;
}

export interface ValidationResult {
  canProceed: boolean;
  securityValidation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    sanitizedFilename?: string;
  };
  quotaValidation: StorageQuotaInfo;
  conflictCheck: FileConflictResult;
  recommendedPath: string;
  warnings: string[];
}
