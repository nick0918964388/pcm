/**
 * 檔案安全檢查服務
 * 提供檔案上傳的各種安全驗證與防護
 */

import crypto from 'crypto'
import path from 'path'

// 危險檔案副檔名黑名單
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
  '.zip', '.rar', '.7z', '.tar', '.gz', '.dmg', '.iso', '.msi', '.deb', '.rpm',
  '.sh', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl', '.sql'
]

// 允許的圖片MIME類型
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
  'image/gif'
]

// 檔案標頭簽名 (Magic Numbers) 用於真實類型檢測
const FILE_SIGNATURES = {
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF],
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  ],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46], // RIFF
  ]
}

export interface SecurityValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sanitizedFilename?: string
}

export interface FileQuota {
  maxFileSize: number        // 單檔最大大小 (bytes)
  maxTotalSize: number      // 使用者總檔案大小限制 (bytes)
  maxFilesPerHour: number   // 每小時上傳檔案數限制
  maxFilesPerDay: number    // 每日上傳檔案數限制
}

export class FileSecurityService {
  private readonly DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  private readonly UPLOAD_RATE_LIMIT = new Map<string, { count: number; resetTime: number }>()

  /**
   * 驗證檔案是否為真實的圖片類型 (檢查檔案標頭)
   */
  async validateFileSignature(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const buffer = new Uint8Array(e.target?.result as ArrayBuffer)
          const signatures = FILE_SIGNATURES[file.type as keyof typeof FILE_SIGNATURES]

          if (!signatures) {
            resolve(false)
            return
          }

          // 檢查是否匹配任一簽名
          const matches = signatures.some(signature => {
            if (buffer.length < signature.length) return false

            return signature.every((byte, index) => buffer[index] === byte)
          })

          resolve(matches)
        } catch (error) {
          resolve(false)
        }
      }

      reader.onerror = () => resolve(false)

      // 只讀取前16個位元組檢查檔案簽名
      const slice = file.slice(0, 16)
      reader.readAsArrayBuffer(slice)
    })
  }

  /**
   * 檢查檔案名稱是否包含危險字符或路徑遍歷攻擊
   */
  validateFilename(filename: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // 檢查空檔名
    if (!filename || filename.trim() === '') {
      errors.push('檔案名稱不能為空')
      return { isValid: false, errors }
    }

    // 檢查危險字符
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/g
    if (dangerousChars.test(filename)) {
      errors.push('檔案名稱包含不安全的字符')
    }

    // 檢查路徑遍歷攻擊
    if (filename.includes('..') || filename.includes('./') || filename.includes('.\\')) {
      errors.push('檔案名稱不能包含路徑遍歷字符')
    }

    // 檢查檔案名稱長度
    if (filename.length > 255) {
      errors.push('檔案名稱過長 (最大255字符)')
    }

    // 檢查危險副檔名
    const extension = path.extname(filename).toLowerCase()
    if (DANGEROUS_EXTENSIONS.includes(extension)) {
      errors.push(`不允許的檔案類型: ${extension}`)
    }

    return { isValid: errors.length === 0, errors }
  }

  /**
   * 產生安全的檔案名稱
   */
  sanitizeFilename(filename: string): string {
    // 移除危險字符
    let sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')

    // 移除路徑遍歷
    sanitized = sanitized.replace(/\.\./g, '_')

    // 限制長度
    if (sanitized.length > 200) {
      const ext = path.extname(sanitized)
      const name = path.basename(sanitized, ext)
      sanitized = name.substring(0, 200 - ext.length) + ext
    }

    // 添加時間戳確保唯一性
    const timestamp = Date.now()
    const ext = path.extname(sanitized)
    const name = path.basename(sanitized, ext)

    return `${name}_${timestamp}${ext}`
  }

  /**
   * 生成安全的檔案儲存路徑
   */
  generateSecureFilePath(projectId: string, userId: string, originalFilename: string): string {
    // 生成隨機檔案名避免路徑猜測
    const fileId = crypto.randomUUID()
    const extension = path.extname(originalFilename)
    const secureFilename = `${fileId}${extension}`

    // 使用專案和使用者ID建立目錄結構
    const hashedProjectId = crypto.createHash('sha256').update(projectId).digest('hex').substring(0, 8)
    const hashedUserId = crypto.createHash('sha256').update(userId).digest('hex').substring(0, 8)

    // 建立日期目錄結構
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    return `uploads/${hashedProjectId}/${hashedUserId}/${year}/${month}/${day}/${secureFilename}`
  }

  /**
   * 檢查使用者配額
   */
  async checkUserQuota(
    userId: string,
    fileSize: number,
    quota: FileQuota
  ): Promise<{ allowed: boolean; reason?: string }> {
    // 檢查單檔大小限制
    if (fileSize > quota.maxFileSize) {
      return {
        allowed: false,
        reason: `檔案大小超過限制 (${this.formatFileSize(quota.maxFileSize)})`
      }
    }

    // TODO: 實作實際的資料庫查詢檢查總檔案大小和上傳頻率
    // 這裡先模擬檢查

    return { allowed: true }
  }

  /**
   * 檢查上傳頻率限制
   */
  checkUploadRateLimit(
    userId: string,
    maxUploadsPerHour: number = 100
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const windowMs = 60 * 60 * 1000 // 1小時
    const record = this.UPLOAD_RATE_LIMIT.get(userId)

    if (!record || now > record.resetTime) {
      const resetTime = now + windowMs
      this.UPLOAD_RATE_LIMIT.set(userId, { count: 1, resetTime })
      return { allowed: true, remaining: maxUploadsPerHour - 1, resetTime }
    }

    if (record.count >= maxUploadsPerHour) {
      return { allowed: false, remaining: 0, resetTime: record.resetTime }
    }

    record.count++
    return {
      allowed: true,
      remaining: maxUploadsPerHour - record.count,
      resetTime: record.resetTime
    }
  }

  /**
   * 完整的檔案安全驗證
   */
  async validateFileSecurely(
    file: File,
    userId: string,
    projectId: string,
    quota?: Partial<FileQuota>
  ): Promise<SecurityValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // 設定預設配額
    const fileQuota: FileQuota = {
      maxFileSize: quota?.maxFileSize || this.DEFAULT_MAX_FILE_SIZE,
      maxTotalSize: quota?.maxTotalSize || 100 * 1024 * 1024 * 1024, // 100GB
      maxFilesPerHour: quota?.maxFilesPerHour || 100,
      maxFilesPerDay: quota?.maxFilesPerDay || 1000
    }

    // 1. 檢查檔案名稱安全性
    const filenameValidation = this.validateFilename(file.name)
    if (!filenameValidation.isValid) {
      errors.push(...filenameValidation.errors)
    }

    // 2. 檢查檔案類型
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      errors.push(`不支援的檔案類型: ${file.type}`)
    }

    // 3. 檢查檔案標頭簽名 (防止檔案類型偽造)
    if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
      const signatureValid = await this.validateFileSignature(file)
      if (!signatureValid) {
        errors.push('檔案內容與宣告類型不符，可能是惡意檔案')
      }
    }

    // 4. 檢查檔案大小
    if (file.size === 0) {
      errors.push('檔案大小為0')
    } else if (file.size > fileQuota.maxFileSize) {
      errors.push(`檔案大小超過限制 (${this.formatFileSize(fileQuota.maxFileSize)})`)
    }

    // 5. 檢查上傳頻率限制
    const rateLimitCheck = this.checkUploadRateLimit(userId, fileQuota.maxFilesPerHour)
    if (!rateLimitCheck.allowed) {
      errors.push('上傳頻率超過限制，請稍後再試')
    }

    // 6. 檢查使用者配額
    const quotaCheck = await this.checkUserQuota(userId, file.size, fileQuota)
    if (!quotaCheck.allowed) {
      errors.push(quotaCheck.reason || '配額檢查失敗')
    }

    // 7. 產生安全的檔案名稱
    const sanitizedFilename = this.sanitizeFilename(file.name)

    // 警告提示
    if (file.size > 5 * 1024 * 1024) { // 5MB
      warnings.push('大檔案上傳可能需要較長時間')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedFilename
    }
  }

  /**
   * 格式化檔案大小顯示
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 bytes'

    const k = 1024
    const sizes = ['bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  /**
   * 清理過期的速率限制記錄
   */
  private cleanup() {
    const now = Date.now()
    for (const [userId, record] of this.UPLOAD_RATE_LIMIT.entries()) {
      if (now > record.resetTime) {
        this.UPLOAD_RATE_LIMIT.delete(userId)
      }
    }
  }
}

// 單例模式
export const fileSecurityService = new FileSecurityService()

// 定期清理過期記錄
setInterval(() => {
  ;(fileSecurityService as any).cleanup()
}, 5 * 60 * 1000) // 每5分鐘清理一次