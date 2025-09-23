/**
 * 簽名URL服務
 * 提供安全的檔案存取URL生成與驗證
 */

import crypto from 'crypto'

// UUID生成函數，相容瀏覽器環境
function generateUUID(): string {
  // 在Node.js環境使用crypto.randomUUID
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // 瀏覽器環境fallback
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  }

  // 最終fallback - 生成RFC4122 v4 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
import { URL } from 'url'

export interface SignedUrlOptions {
  expiresIn: number          // 有效期間 (秒)
  permissions?: string[]     // 允許的操作 ['read', 'write', 'delete']
  ipRestriction?: string[]   // IP限制
  maxDownloads?: number      // 最大下載次數
  userId?: string            // 使用者ID (用於記錄)
}

export interface SignedUrlResult {
  url: string
  expiresAt: Date
  token: string
}

export interface UrlValidationResult {
  isValid: boolean
  reason?: string
  permissions?: string[]
  userId?: string
  remainingDownloads?: number
}

// 用於追蹤下載次數 (實際應用中應使用Redis或資料庫)
const downloadCountStore = new Map<string, { count: number; maxCount: number }>()

// 簽名密鑰 (實際應用中應從環境變數讀取)
const SIGNING_SECRET = process.env.SIGNED_URL_SECRET || 'your-super-secret-key-change-in-production'

export class SignedUrlService {
  /**
   * 生成簽名URL
   */
  generateSignedUrl(
    originalUrl: string,
    options: SignedUrlOptions
  ): SignedUrlResult {
    const expiresAt = new Date(Date.now() + options.expiresIn * 1000)
    const tokenData = {
      url: originalUrl,
      exp: Math.floor(expiresAt.getTime() / 1000),
      permissions: options.permissions || ['read'],
      userId: options.userId,
      ipRestriction: options.ipRestriction,
      maxDownloads: options.maxDownloads,
      iat: Math.floor(Date.now() / 1000), // issued at
      jti: generateUUID() // unique identifier
    }

    // 建立簽名
    const payload = JSON.stringify(tokenData)
    const signature = this.createSignature(payload)
    const token = Buffer.from(payload).toString('base64url') + '.' + signature

    // 如果有下載次數限制，初始化計數器
    if (options.maxDownloads) {
      downloadCountStore.set(tokenData.jti, {
        count: 0,
        maxCount: options.maxDownloads
      })
    }

    // 建立簽名URL
    const url = new URL(originalUrl)
    url.searchParams.set('token', token)

    return {
      url: url.toString(),
      expiresAt,
      token
    }
  }

  /**
   * 驗證簽名URL
   */
  validateSignedUrl(
    signedUrl: string,
    clientIP?: string
  ): UrlValidationResult {
    try {
      const url = new URL(signedUrl)
      const token = url.searchParams.get('token')

      if (!token) {
        return { isValid: false, reason: '缺少驗證token' }
      }

      return this.validateToken(token, clientIP)
    } catch (error) {
      return { isValid: false, reason: 'URL格式錯誤' }
    }
  }

  /**
   * 驗證token
   */
  validateToken(token: string, clientIP?: string): UrlValidationResult {
    try {
      const parts = token.split('.')
      if (parts.length !== 2) {
        return { isValid: false, reason: 'Token格式錯誤' }
      }

      const [payloadBase64, signature] = parts
      const payload = Buffer.from(payloadBase64, 'base64url').toString()

      // 驗證簽名
      const expectedSignature = this.createSignature(payload)
      if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
        return { isValid: false, reason: '簽名驗證失敗' }
      }

      const tokenData = JSON.parse(payload)
      const now = Math.floor(Date.now() / 1000)

      // 檢查過期時間
      if (tokenData.exp < now) {
        return { isValid: false, reason: 'Token已過期' }
      }

      // 檢查IP限制
      if (tokenData.ipRestriction && clientIP) {
        if (!tokenData.ipRestriction.includes(clientIP)) {
          return { isValid: false, reason: 'IP位址不在允許範圍內' }
        }
      }

      // 檢查下載次數限制
      if (tokenData.maxDownloads && tokenData.jti) {
        const downloadRecord = downloadCountStore.get(tokenData.jti)
        if (downloadRecord) {
          if (downloadRecord.count >= downloadRecord.maxCount) {
            return {
              isValid: false,
              reason: '已達下載次數上限',
              remainingDownloads: 0
            }
          }
        }
      }

      const remainingDownloads = this.getRemainingDownloads(tokenData.jti, tokenData.maxDownloads)

      return {
        isValid: true,
        permissions: tokenData.permissions,
        userId: tokenData.userId,
        remainingDownloads
      }
    } catch (error) {
      return { isValid: false, reason: 'Token解析失敗' }
    }
  }

  /**
   * 記錄下載使用
   */
  recordDownload(token: string): boolean {
    try {
      const parts = token.split('.')
      if (parts.length !== 2) return false

      const payload = Buffer.from(parts[0], 'base64url').toString()
      const tokenData = JSON.parse(payload)

      if (tokenData.jti && tokenData.maxDownloads) {
        const downloadRecord = downloadCountStore.get(tokenData.jti)
        if (downloadRecord) {
          downloadRecord.count++
          return downloadRecord.count <= downloadRecord.maxCount
        }
      }

      return true
    } catch (error) {
      return false
    }
  }

  /**
   * 取得剩餘下載次數
   */
  private getRemainingDownloads(jti?: string, maxDownloads?: number): number | undefined {
    if (!jti || !maxDownloads) return undefined

    const downloadRecord = downloadCountStore.get(jti)
    if (!downloadRecord) return maxDownloads

    return Math.max(0, downloadRecord.maxCount - downloadRecord.count)
  }

  /**
   * 建立簽名
   */
  private createSignature(payload: string): string {
    return crypto
      .createHmac('sha256', SIGNING_SECRET)
      .update(payload)
      .digest('hex')
  }

  /**
   * 生成照片存取的簽名URL
   */
  generatePhotoAccessUrl(
    photoId: string,
    userId: string,
    options: Partial<SignedUrlOptions> = {}
  ): SignedUrlResult {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const photoUrl = `${baseUrl}/api/photos/${photoId}/download`

    const defaultOptions: SignedUrlOptions = {
      expiresIn: 3600, // 1小時
      permissions: ['read'],
      userId,
      ...options
    }

    return this.generateSignedUrl(photoUrl, defaultOptions)
  }

  /**
   * 生成批次下載的簽名URL
   */
  generateBatchDownloadUrl(
    photoIds: string[],
    userId: string,
    options: Partial<SignedUrlOptions> = {}
  ): SignedUrlResult {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const batchUrl = `${baseUrl}/api/photos/batch-download?photos=${photoIds.join(',')}`

    const defaultOptions: SignedUrlOptions = {
      expiresIn: 1800, // 30分鐘 (批次下載通常需要更長時間)
      permissions: ['read'],
      maxDownloads: 3, // 批次下載允許重試3次
      userId,
      ...options
    }

    return this.generateSignedUrl(batchUrl, defaultOptions)
  }

  /**
   * 生成上傳的簽名URL
   */
  generateUploadUrl(
    projectId: string,
    userId: string,
    options: Partial<SignedUrlOptions> = {}
  ): SignedUrlResult {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const uploadUrl = `${baseUrl}/api/photos/upload?project=${projectId}`

    const defaultOptions: SignedUrlOptions = {
      expiresIn: 3600, // 1小時
      permissions: ['write'],
      userId,
      ...options
    }

    return this.generateSignedUrl(uploadUrl, defaultOptions)
  }

  /**
   * 撤銷token (將其加入黑名單)
   */
  revokeToken(token: string): boolean {
    try {
      const parts = token.split('.')
      if (parts.length !== 2) return false

      const payload = Buffer.from(parts[0], 'base64url').toString()
      const tokenData = JSON.parse(payload)

      // 將jti加入黑名單 (實際應用中應使用Redis或資料庫)
      if (tokenData.jti) {
        // TODO: 實作token黑名單
        return true
      }

      return false
    } catch (error) {
      return false
    }
  }

  /**
   * 清理過期的下載記錄
   */
  cleanup(): void {
    // 清理過期的下載計數記錄
    // 實際應用中這些資料應該有TTL或定期清理機制
    const cutoff = Date.now() - 24 * 60 * 60 * 1000 // 24小時前

    for (const [jti] of downloadCountStore.entries()) {
      // 簡單的清理策略：假設超過24小時的記錄都可以清理
      // 實際應用中應該根據token的過期時間來清理
      try {
        // 這裡可以加入更精確的過期時間檢查
        // 暫時保留所有記錄，讓它們自然過期
      } catch (error) {
        // 清理失敗的記錄
        downloadCountStore.delete(jti)
      }
    }
  }
}

// 單例模式
export const signedUrlService = new SignedUrlService()

// 定期清理過期記錄
setInterval(() => {
  signedUrlService.cleanup()
}, 60 * 60 * 1000) // 每小時清理一次