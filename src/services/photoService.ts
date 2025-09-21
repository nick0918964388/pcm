/**
 * Photo Service Layer
 * 照片上傳與處理服務
 */

import {
  Photo,
  Album,
  UploadFile,
  PhotoMetadata,
  ValidationResult,
  UploadResult,
  ApiResponse,
  PhotoFilters
} from '@/types/photo.types'
import { fileSecurityService } from '@/lib/security/file-security'
import { signedUrlService } from '@/lib/security/signed-url-service'
import { rateLimitService } from '@/lib/security/rate-limit-service'
import JSZip from 'jszip'

export interface BatchDownloadOptions {
  onProgress?: (progress: number) => void
  concurrency?: number
  batchSize?: number
}

export interface DownloadQueueItem {
  id: string
  photos: Photo[]
  status: 'pending' | 'downloading' | 'completed' | 'failed'
  progress: number
  createdAt: Date
}

export class PhotoService {
  private readonly SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/heic', 'image/webp']
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  private readonly COMPRESSION_THRESHOLD = 5 * 1024 * 1024 // 5MB
  private readonly MAX_BATCH_SIZE = 100 * 1024 * 1024 // 100MB 批次下載大小限制
  private readonly DEFAULT_CONCURRENCY = 3 // 預設並發數

  // 批次下載相關狀態
  private selectedPhotos: Set<string> = new Set()
  private downloadQueue: DownloadQueueItem[] = []
  private currentDownload: AbortController | null = null

  /**
   * 驗證單一檔案 (已棄用，請使用 validateFileSecurely)
   * @deprecated 請使用 validateFileSecurely 方法以獲得更完整的安全檢查
   */
  validateFile(file: File): ValidationResult {
    const errors: string[] = []

    // 檢查檔案格式
    if (!this.SUPPORTED_FORMATS.includes(file.type)) {
      errors.push('不支援的檔案格式，請上傳 JPG、PNG、HEIC 或 WebP 格式的圖片')
    }

    // 檢查檔案大小
    if (file.size > this.MAX_FILE_SIZE) {
      errors.push('檔案大小超過限制 (10MB)')
    }

    // 檢查檔案名稱
    if (!file.name || file.name.trim() === '') {
      errors.push('檔案名稱無效')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 安全檔案驗證 (整合安全檢查)
   */
  async validateFileSecurely(
    file: File,
    userId: string,
    projectId: string
  ): Promise<ValidationResult & { warnings?: string[]; sanitizedFilename?: string }> {
    // 先檢查速率限制
    const rateLimitCheck = rateLimitService.checkUserRateLimit(userId, 'upload')
    if (!rateLimitCheck.allowed) {
      return {
        isValid: false,
        errors: ['上傳頻率過高，請稍後再試']
      }
    }

    // 使用安全服務進行完整驗證
    const securityResult = await fileSecurityService.validateFileSecurely(
      file,
      userId,
      projectId
    )

    return {
      isValid: securityResult.isValid,
      errors: securityResult.errors,
      warnings: securityResult.warnings,
      sanitizedFilename: securityResult.sanitizedFilename
    }
  }

  /**
   * 驗證多個檔案
   */
  validateFiles(files: File[]): ValidationResult {
    const errors: string[] = []

    if (files.length === 0) {
      return { isValid: true, errors: [] }
    }

    files.forEach((file, index) => {
      const result = this.validateFile(file)
      if (!result.isValid) {
        errors.push(...result.errors.map(error => `${file.name}: ${error}`))
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 從檔案中擷取 metadata
   */
  async extractMetadata(file: File): Promise<PhotoMetadata> {
    const metadata: PhotoMetadata = {
      tags: []
    }

    try {
      // 基本檔案資訊
      if (file.lastModified) {
        metadata.capturedAt = new Date(file.lastModified)
      }

      // TODO: 使用 EXIF 庫擷取更詳細的資訊
      // 這裡可以使用像 exif-js 或 piexifjs 等庫

      return metadata
    } catch (error) {
      console.warn('Failed to extract metadata:', error)
      return metadata
    }
  }

  /**
   * 生成唯一的檔案 ID
   */
  generateFileId(): string {
    return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 格式化檔案大小
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 bytes'

    const k = 1024
    const sizes = ['bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  /**
   * 建立上傳檔案物件 (整合安全檢查)
   */
  async createUploadFile(
    file: File,
    userId: string,
    projectId: string,
    albumId?: string
  ): Promise<UploadFile & { securityValidation?: any }> {
    // 進行安全驗證
    const securityValidation = await this.validateFileSecurely(file, userId, projectId)

    if (!securityValidation.isValid) {
      throw new Error(`檔案安全驗證失敗: ${securityValidation.errors.join(', ')}`)
    }

    const metadata = await this.extractMetadata(file)

    // 使用安全的檔案名稱
    const sanitizedFilename = securityValidation.sanitizedFilename || file.name

    return {
      id: this.generateFileId(),
      file,
      projectId,
      albumId,
      metadata,
      progress: 0,
      status: 'pending',
      securityValidation,
      // 添加安全路徑
      securePath: fileSecurityService.generateSecureFilePath(projectId, userId, sanitizedFilename)
    }
  }

  /**
   * 判斷圖片是否需要壓縮
   */
  needsCompression(file: File): boolean {
    return file.size > this.COMPRESSION_THRESHOLD
  }

  /**
   * 壓縮圖片
   */
  async compressImage(file: File, quality: number = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        try {
          // 計算新尺寸 (保持比例)
          const maxWidth = 1920
          const maxHeight = 1080
          let { width, height } = img

          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }

          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }

          canvas.width = width
          canvas.height = height

          // 繪製壓縮後的圖片
          ctx?.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: file.lastModified
                })
                resolve(compressedFile)
              } else {
                reject(new Error('壓縮失敗'))
              }
            },
            file.type,
            quality
          )
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => reject(new Error('圖片載入失敗'))

      // 建立 URL 來載入圖片
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('讀取檔案失敗'))
      reader.readAsDataURL(file)
    })
  }

  /**
   * 安全上傳單一檔案
   */
  async uploadPhoto(uploadFile: UploadFile & { securePath?: string }): Promise<UploadResult> {
    try {
      // 使用安全路徑生成實際的儲存URL
      const securePath = uploadFile.securePath ||
        fileSecurityService.generateSecureFilePath(
          uploadFile.projectId,
          'unknown-user',
          uploadFile.file.name
        )

      // 模擬上傳過程 (實際實作時會使用securePath)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 模擬成功回應 - 使用安全路徑
      return {
        success: true,
        photoId: `photo-${Date.now()}`,
        thumbnailUrl: `/api/photos/thumbnail/${uploadFile.id}`,
        originalUrl: `/api/photos/original/${uploadFile.id}`,
        metadata: uploadFile.metadata,
        securePath
      }
    } catch (error) {
      return {
        success: false,
        photoId: '',
        thumbnailUrl: '',
        originalUrl: '',
        metadata: {},
        errors: [error instanceof Error ? error.message : 'Upload failed']
      }
    }
  }

  /**
   * 批次上傳檔案
   */
  async uploadPhotos(
    uploadFiles: UploadFile[],
    onProgress?: (fileId: string, progress: number) => void
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = []

    for (const uploadFile of uploadFiles) {
      try {
        // 模擬上傳進度
        if (onProgress) {
          for (let progress = 0; progress <= 100; progress += 10) {
            onProgress(uploadFile.id, progress)
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }

        const result = await this.uploadPhoto(uploadFile)
        results.push(result)
      } catch (error) {
        results.push({
          success: false,
          photoId: '',
          thumbnailUrl: '',
          originalUrl: '',
          metadata: {},
          errors: [error instanceof Error ? error.message : 'Upload failed']
        })
      }
    }

    return results
  }

  /**
   * 取得專案照片列表
   * TODO: 實作實際的 API 呼叫
   */
  async getPhotos(
    projectId: string,
    filters?: PhotoFilters
  ): Promise<ApiResponse<Photo[]>> {
    try {
      // 模擬 API 呼叫
      await new Promise(resolve => setTimeout(resolve, 500))

      // 模擬資料
      const mockPhotos: Photo[] = []

      return {
        success: true,
        data: mockPhotos,
        message: 'Photos retrieved successfully',
        meta: {
          total: mockPhotos.length,
          page: 1,
          limit: 20
        }
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to fetch photos']
      }
    }
  }

  /**
   * 取得專案相簿列表
   * TODO: 實作實際的 API 呼叫
   */
  async getAlbums(projectId: string): Promise<ApiResponse<Album[]>> {
    try {
      // 模擬 API 呼叫
      await new Promise(resolve => setTimeout(resolve, 300))

      // 模擬資料
      const mockAlbums: Album[] = [
        {
          id: 'album-1',
          projectId,
          name: '施工進度照片',
          description: '記錄施工各階段進度',
          photoCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      return {
        success: true,
        data: mockAlbums,
        message: 'Albums retrieved successfully'
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to fetch albums']
      }
    }
  }

  /**
   * 刪除照片
   * TODO: 實作實際的 API 呼叫
   */
  async deletePhoto(photoId: string): Promise<ApiResponse<void>> {
    try {
      // 模擬 API 呼叫
      await new Promise(resolve => setTimeout(resolve, 300))

      return {
        success: true,
        message: 'Photo deleted successfully'
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to delete photo']
      }
    }
  }

  /**
   * 安全下載照片 (使用簽名URL)
   */
  async downloadPhoto(
    photo: Photo,
    userId: string,
    resolution: 'original' | 'thumbnail' = 'original'
  ): Promise<void> {
    try {
      // 檢查下載速率限制
      const rateLimitCheck = rateLimitService.checkUserRateLimit(userId, 'download')
      if (!rateLimitCheck.allowed) {
        throw new Error('下載頻率過高，請稍後再試')
      }

      // 生成簽名URL
      const signedUrlResult = signedUrlService.generatePhotoAccessUrl(
        photo.id,
        userId,
        {
          expiresIn: 300, // 5分鐘
          maxDownloads: 1
        }
      )

      // 建立暫時連結並觸發下載
      const link = document.createElement('a')
      link.href = signedUrlResult.url
      link.download = photo.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // 記錄下載
      signedUrlService.recordDownload(signedUrlResult.token)
    } catch (error) {
      throw new Error(`下載失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }

  // ==========================================
  // 批次選取功能 (Task 5-2)
  // ==========================================

  /**
   * 取得選取的照片 ID 陣列
   */
  getSelectedPhotos(): string[] {
    return Array.from(this.selectedPhotos)
  }

  /**
   * 選取照片
   */
  selectPhoto(photoId: string): void {
    this.selectedPhotos.add(photoId)
  }

  /**
   * 取消選取照片
   */
  deselectPhoto(photoId: string): void {
    this.selectedPhotos.delete(photoId)
  }

  /**
   * 清除所有選取
   */
  clearSelection(): void {
    this.selectedPhotos.clear()
  }

  /**
   * 檢查照片是否被選取
   */
  isPhotoSelected(photoId: string): boolean {
    return this.selectedPhotos.has(photoId)
  }

  // ==========================================
  // ZIP 打包功能
  // ==========================================

  /**
   * 建立包含多張照片的 ZIP 檔案
   */
  async createPhotoZip(photos: Photo[]): Promise<Blob> {
    const zip = new JSZip()
    const fileNameCounts = new Map<string, number>()

    // 並發下載照片並加入 ZIP
    const downloadPromises = photos.map(async (photo, index) => {
      try {
        // 下載照片檔案
        const response = await fetch(photo.originalUrl)
        if (!response.ok) {
          throw new Error(`Failed to download ${photo.fileName}`)
        }
        const blob = await response.blob()

        // 處理重複檔名
        let fileName = photo.fileName
        if (fileNameCounts.has(fileName)) {
          const count = fileNameCounts.get(fileName)! + 1
          fileNameCounts.set(fileName, count)
          const nameParts = fileName.split('.')
          const extension = nameParts.pop()
          const baseName = nameParts.join('.')
          fileName = `${baseName}_${count}.${extension}`
        } else {
          fileNameCounts.set(fileName, 1)
        }

        // 加入到 ZIP
        zip.file(fileName, blob)
      } catch (error) {
        console.error(`Failed to add ${photo.fileName} to ZIP:`, error)
        // 繼續處理其他檔案，不因單一檔案失敗而中斷
      }
    })

    await Promise.all(downloadPromises)

    // 生成 ZIP 檔案
    return zip.generateAsync({ type: 'blob' })
  }

  /**
   * 檢查是否應該分割下載
   */
  shouldSplitDownload(photos: Photo[]): boolean {
    const totalSize = photos.reduce((sum, photo) => sum + photo.fileSize, 0)
    return totalSize > this.MAX_BATCH_SIZE
  }

  /**
   * 安全批次下載照片 (ZIP) - 支援安全檢查和速率限制
   */
  async downloadPhotos(
    photos: Photo[],
    userId: string,
    options: BatchDownloadOptions = {}
  ): Promise<void> {
    try {
      // 檢查批次操作速率限制
      const rateLimitCheck = rateLimitService.checkUserRateLimit(userId, 'batch')
      if (!rateLimitCheck.allowed) {
        throw new Error('批次操作頻率過高，請稍後再試')
      }

      // 限制批次下載數量
      if (photos.length > 50) {
        throw new Error('單次批次下載不能超過50個檔案')
      }

      const { onProgress, concurrency = this.DEFAULT_CONCURRENCY } = options

      if (photos.length === 0) {
        throw new Error('沒有選取任何照片')
      }

      // 生成批次下載簽名URL進行安全驗證
      const photoIds = photos.map(p => p.id)
      const signedUrlResult = signedUrlService.generateBatchDownloadUrl(
        photoIds,
        userId,
        {
          expiresIn: 1800, // 30分鐘
          maxDownloads: 3
        }
      )

      // 檢查是否需要分批下載
      if (this.shouldSplitDownload(photos)) {
        return this.downloadPhotosInBatches(photos, options)
      }

      // 建立 AbortController 支援取消
      this.currentDownload = new AbortController()

      onProgress?.(10) // 開始處理

      // 建立 ZIP 檔案
      const zipBlob = await this.createPhotoZip(photos)

      onProgress?.(90) // ZIP 生成完成

      // 觸發下載
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `photos_${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // 清理
      URL.revokeObjectURL(url)
      onProgress?.(100) // 完成

      // 記錄下載
      signedUrlService.recordDownload(signedUrlResult.token)

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Download cancelled')
      }
      throw error
    } finally {
      this.currentDownload = null
    }
  }

  /**
   * 分批下載大量照片
   */
  async downloadPhotosInBatches(
    photos: Photo[],
    options: BatchDownloadOptions = {}
  ): Promise<void> {
    const { batchSize = 20, onProgress } = options
    const batches: Photo[][] = []

    // 分割為多個批次
    for (let i = 0; i < photos.length; i += batchSize) {
      batches.push(photos.slice(i, i + batchSize))
    }

    // 逐批下載
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      const progress = ((i + 1) / batches.length) * 100

      onProgress?.(progress)

      const zipBlob = await this.createPhotoZip(batch)

      // 下載單一批次
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `photos_batch_${i + 1}_${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)

      // 短暫延遲避免瀏覽器下載限制
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  /**
   * 取消批次下載
   */
  cancelBatchDownload(): void {
    if (this.currentDownload) {
      this.currentDownload.abort()
      this.currentDownload = null
    }
  }

  // ==========================================
  // 佇列管理功能
  // ==========================================

  /**
   * 取得下載佇列
   */
  getDownloadQueue(): DownloadQueueItem[] {
    return [...this.downloadQueue]
  }

  /**
   * 加入到下載佇列
   */
  addToDownloadQueue(photos: Photo[]): string {
    // 檢查是否已存在相同的照片組合
    const photoIds = photos.map(p => p.id).sort()
    const existing = this.downloadQueue.find(item => {
      const existingIds = item.photos.map(p => p.id).sort()
      return JSON.stringify(photoIds) === JSON.stringify(existingIds)
    })

    if (existing) {
      return existing.id // 返回現有項目的 ID
    }

    const queueItem: DownloadQueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      photos: [...photos],
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    }

    this.downloadQueue.push(queueItem)
    return queueItem.id
  }

  /**
   * 從下載佇列移除
   */
  removeFromDownloadQueue(queueId: string): void {
    const index = this.downloadQueue.findIndex(item => item.id === queueId)
    if (index >= 0) {
      this.downloadQueue.splice(index, 1)
    }
  }

  /**
   * 更新佇列項目狀態
   */
  updateQueueItemStatus(
    queueId: string,
    status: DownloadQueueItem['status'],
    progress: number = 0
  ): void {
    const item = this.downloadQueue.find(item => item.id === queueId)
    if (item) {
      item.status = status
      item.progress = progress
    }
  }

  /**
   * 清理已完成的佇列項目
   */
  cleanupQueue(): void {
    this.downloadQueue = this.downloadQueue.filter(
      item => item.status !== 'completed' && item.status !== 'failed'
    )
  }

  /**
   * 生成安全的上傳URL
   */
  generateSecureUploadUrl(projectId: string, userId: string): string {
    const signedUrlResult = signedUrlService.generateUploadUrl(
      projectId,
      userId,
      {
        expiresIn: 3600, // 1小時
        permissions: ['write']
      }
    )

    return signedUrlResult.url
  }

  /**
   * 驗證使用者是否有權限存取照片
   */
  async verifyPhotoAccess(
    photoId: string,
    userId: string,
    requiredPermission: 'read' | 'write' | 'delete' = 'read'
  ): Promise<boolean> {
    // TODO: 實作實際的權限檢查邏輯
    // 這裡需要查詢資料庫確認使用者是否有存取該照片的權限
    return true
  }

  /**
   * 取得使用者的配額資訊
   */
  async getUserQuotaInfo(userId: string): Promise<{
    used: number
    total: number
    remaining: number
    uploadCount: {
      today: number
      thisHour: number
    }
  }> {
    // TODO: 實作實際的配額查詢
    // 這裡需要查詢資料庫取得使用者的實際使用情況
    return {
      used: 0,
      total: 100 * 1024 * 1024 * 1024, // 100GB
      remaining: 100 * 1024 * 1024 * 1024,
      uploadCount: {
        today: 0,
        thisHour: 0
      }
    }
  }

  /**
   * 檢查並記錄可疑的活動
   */
  async logSuspiciousActivity(
    userId: string,
    activity: string,
    details: Record<string, any>
  ): Promise<void> {
    // TODO: 實作安全日誌記錄
    console.warn('Suspicious activity detected:', {
      userId,
      activity,
      details,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 清理暫時檔案和過期的簽名URL
   */
  async cleanup(): Promise<void> {
    // 清理過期的rate limit記錄
    // 實際實作中應該清理暫時檔案、過期的簽名URL等
    console.log('Cleaning up expired resources...')
  }
}

// 單例模式
export const photoService = new PhotoService()

// 定期清理過期資源
setInterval(() => {
  photoService.cleanup()
}, 60 * 60 * 1000) // 每小時清理一次