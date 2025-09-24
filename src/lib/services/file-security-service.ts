/**
 * File Security Service
 * Task 7.3: 檔案存取和下載 API
 *
 * 建立安全的檔案存取機制：
 * - 檔案路徑驗證和安全性檢查
 * - 下載令牌生成和驗證
 * - 檔案存取權限控制
 * - 檔案串流和範圍請求處理
 */

import path from 'path';
import crypto from 'crypto';
import { promises as fs } from 'fs';

export interface SecureToken {
  token: string;
  expiresAt: number;
  photoId: string;
  userId: string;
  resolution: string;
}

export interface TokenPayload {
  photoId: string;
  userId: string;
  resolution: string;
  expiresAt: number;
  signature: string;
}

export interface FileAccessOptions {
  userId: string;
  maxFileSize?: number;
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
}

export interface RangeRequest {
  start: number;
  end: number;
  total: number;
}

export class FileSecurityService {
  private static readonly SECRET_KEY =
    process.env.FILE_ACCESS_SECRET || 'default-secret-key';
  private static readonly TOKEN_EXPIRY_HOURS = 1;
  private static readonly ALLOWED_UPLOAD_DIR = '/uploads/photos';
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
  private static readonly RATE_LIMIT_MAX_REQUESTS = 100;

  private static rateLimitCache = new Map<
    string,
    { count: number; resetTime: number }
  >();

  /**
   * 驗證檔案路徑安全性，防止目錄遍歷攻擊
   * Requirements: 3.5 - 安全檔案存取
   */
  static async validateFilePath(filePath: string): Promise<boolean> {
    try {
      // 正規化路徑
      const normalizedPath = path.normalize(filePath);

      // 檢查是否包含危險字符
      const dangerousPatterns = [
        /\.\./, // 父目錄引用
        /[<>:"|?*]/, // Windows 保留字符
        /[\x00-\x1f]/, // 控制字符
        /^\/etc\//, // 系統目錄
        /^\/proc\//, // 系統目錄
        /^\/sys\//, // 系統目錄
        /^[a-zA-Z]:\\/, // Windows 絕對路徑
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(normalizedPath)) {
          return false;
        }
      }

      // 確保路徑在允許的目錄內
      const absolutePath = path.resolve(
        process.cwd(),
        'public',
        normalizedPath
      );
      const allowedBasePath = path.resolve(
        process.cwd(),
        'public',
        this.ALLOWED_UPLOAD_DIR
      );

      return absolutePath.startsWith(allowedBasePath);
    } catch (error) {
      console.error('Path validation error:', error);
      return false;
    }
  }

  /**
   * 檢查檔案權限和可存取性
   * Requirements: 3.5 - 檔案存取控制
   */
  static async checkFilePermissions(
    filePath: string,
    options: FileAccessOptions
  ): Promise<{
    accessible: boolean;
    error?: string;
    fileStats?: any;
  }> {
    try {
      // 驗證路徑安全性
      if (!(await this.validateFilePath(filePath))) {
        return { accessible: false, error: '檔案路徑不安全' };
      }

      // 建構完整檔案路徑
      const fullPath = path.resolve(process.cwd(), 'public', filePath);

      // 檢查檔案是否存在和可讀取
      const stats = await fs.stat(fullPath);

      if (!stats.isFile()) {
        return { accessible: false, error: '指定路徑不是檔案' };
      }

      // 檢查檔案大小限制
      const maxSize = options.maxFileSize || this.MAX_FILE_SIZE;
      if (stats.size > maxSize) {
        return { accessible: false, error: '檔案大小超過限制' };
      }

      // 檢查檔案擴展名
      if (options.allowedExtensions && options.allowedExtensions.length > 0) {
        const ext = path.extname(filePath).toLowerCase();
        if (!options.allowedExtensions.includes(ext)) {
          return { accessible: false, error: '不支援的檔案類型' };
        }
      }

      return { accessible: true, fileStats: stats };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { accessible: false, error: '檔案不存在' };
      }
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        return { accessible: false, error: '檔案權限不足' };
      }
      return { accessible: false, error: '檔案存取錯誤' };
    }
  }

  /**
   * 生成安全的下載令牌
   * Requirements: 3.5 - 安全下載連結
   */
  static generateSecureToken(
    photoId: string,
    userId: string,
    resolution: string = 'original'
  ): SecureToken {
    const expiresAt = Date.now() + this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;

    const payload: Omit<TokenPayload, 'signature'> = {
      photoId,
      userId,
      resolution,
      expiresAt,
    };

    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', this.SECRET_KEY)
      .update(payloadString)
      .digest('hex');

    const tokenPayload: TokenPayload = { ...payload, signature };
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString(
      'base64url'
    );

    return {
      token,
      expiresAt,
      photoId,
      userId,
      resolution,
    };
  }

  /**
   * 驗證下載令牌
   * Requirements: 3.5 - 令牌驗證
   */
  static validateToken(token: string): {
    valid: boolean;
    payload?: TokenPayload;
    error?: string;
  } {
    try {
      // 解碼令牌
      const tokenData = Buffer.from(token, 'base64url').toString();
      const payload: TokenPayload = JSON.parse(tokenData);

      // 檢查令牌格式
      if (
        !payload.photoId ||
        !payload.userId ||
        !payload.resolution ||
        !payload.expiresAt ||
        !payload.signature
      ) {
        return { valid: false, error: '令牌格式無效' };
      }

      // 檢查過期時間
      if (Date.now() > payload.expiresAt) {
        return { valid: false, error: '令牌已過期' };
      }

      // 驗證簽名
      const { signature, ...payloadWithoutSignature } = payload;
      const payloadString = JSON.stringify(payloadWithoutSignature);
      const expectedSignature = crypto
        .createHmac('sha256', this.SECRET_KEY)
        .update(payloadString)
        .digest('hex');

      if (signature !== expectedSignature) {
        return { valid: false, error: '令牌簽名無效' };
      }

      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: '令牌解析失敗' };
    }
  }

  /**
   * 檢查使用者下載速率限制
   * Requirements: 3.5 - 下載頻率控制
   */
  static checkRateLimit(userId: string): {
    allowed: boolean;
    remainingRequests: number;
    resetTime: number;
  } {
    const now = Date.now();
    const userLimit = this.rateLimitCache.get(userId);

    // 如果沒有記錄或已過期，重置
    if (!userLimit || now > userLimit.resetTime) {
      const resetTime = now + this.RATE_LIMIT_WINDOW;
      this.rateLimitCache.set(userId, { count: 1, resetTime });
      return {
        allowed: true,
        remainingRequests: this.RATE_LIMIT_MAX_REQUESTS - 1,
        resetTime,
      };
    }

    // 檢查是否超過限制
    if (userLimit.count >= this.RATE_LIMIT_MAX_REQUESTS) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: userLimit.resetTime,
      };
    }

    // 增加計數
    userLimit.count++;
    this.rateLimitCache.set(userId, userLimit);

    return {
      allowed: true,
      remainingRequests: this.RATE_LIMIT_MAX_REQUESTS - userLimit.count,
      resetTime: userLimit.resetTime,
    };
  }

  /**
   * 解析 HTTP Range 請求
   * Requirements: 3.5 - 大檔案串流支援
   */
  static parseRangeHeader(
    rangeHeader: string | null,
    fileSize: number
  ): RangeRequest | null {
    if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
      return null;
    }

    const ranges = rangeHeader.substring(6).split(',');
    if (ranges.length !== 1) {
      // 僅支援單一範圍請求
      return null;
    }

    const range = ranges[0].trim();
    const [startStr, endStr] = range.split('-');

    let start = 0;
    let end = fileSize - 1;

    if (startStr) {
      start = parseInt(startStr, 10);
      if (isNaN(start) || start < 0) {
        return null;
      }
    }

    if (endStr) {
      end = parseInt(endStr, 10);
      if (isNaN(end) || end >= fileSize || end < start) {
        return null;
      }
    } else if (startStr) {
      end = fileSize - 1;
    } else {
      // 後綴範圍請求，如 -500 表示最後500個字節
      const suffixLength = parseInt(startStr || '0', 10);
      if (isNaN(suffixLength)) {
        return null;
      }
      start = Math.max(0, fileSize - suffixLength);
      end = fileSize - 1;
    }

    return { start, end, total: fileSize };
  }

  /**
   * 生成檔案 ETag
   * Requirements: 3.5 - 快取優化
   */
  static generateETag(stats: any): string {
    const hash = crypto.createHash('md5');
    hash.update(`${stats.size}-${stats.mtime.getTime()}`);
    return `"${hash.digest('hex')}"`;
  }

  /**
   * 清理過期的速率限制記錄
   */
  static cleanupExpiredRateLimits(): void {
    const now = Date.now();
    for (const [userId, limit] of this.rateLimitCache.entries()) {
      if (now > limit.resetTime) {
        this.rateLimitCache.delete(userId);
      }
    }
  }

  /**
   * 取得 MIME 類型
   */
  static getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * 產生安全的檔案名稱
   */
  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, '_') // 只保留中英文數字和安全字符
      .replace(/_{2,}/g, '_') // 合併多個底線
      .substring(0, 255); // 限制長度
  }
}

// 定期清理過期的速率限制記錄
setInterval(
  () => {
    FileSecurityService.cleanupExpiredRateLimits();
  },
  5 * 60 * 1000
); // 每5分鐘清理一次
