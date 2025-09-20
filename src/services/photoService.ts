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

export class PhotoService {
  private readonly SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/heic', 'image/webp']
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  private readonly COMPRESSION_THRESHOLD = 5 * 1024 * 1024 // 5MB

  /**
   * 驗證單一檔案
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
   * 建立上傳檔案物件
   */
  async createUploadFile(
    file: File,
    projectId: string,
    albumId?: string
  ): Promise<UploadFile> {
    const metadata = await this.extractMetadata(file)

    return {
      id: this.generateFileId(),
      file,
      projectId,
      albumId,
      metadata,
      progress: 0,
      status: 'pending'
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
   * 上傳單一檔案
   * TODO: 實作實際的 API 呼叫
   */
  async uploadPhoto(uploadFile: UploadFile): Promise<UploadResult> {
    try {
      // 模擬上傳過程
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 模擬成功回應
      return {
        success: true,
        photoId: `photo-${Date.now()}`,
        thumbnailUrl: `/thumbnails/${uploadFile.file.name}`,
        originalUrl: `/photos/${uploadFile.file.name}`,
        metadata: uploadFile.metadata
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
   * 下載照片
   */
  async downloadPhoto(photo: Photo, resolution: 'original' | 'thumbnail' = 'original'): Promise<void> {
    try {
      const url = resolution === 'original' ? photo.originalUrl : photo.thumbnailUrl

      // 建立暫時連結並觸發下載
      const link = document.createElement('a')
      link.href = url
      link.download = photo.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      throw new Error('下載失敗')
    }
  }

  /**
   * 批次下載照片 (ZIP)
   */
  async downloadPhotos(photos: Photo[]): Promise<void> {
    // TODO: 實作 ZIP 下載功能
    // 可能需要額外的函式庫如 JSZip
    console.warn('Batch download not implemented yet')
  }
}

// 單例模式
export const photoService = new PhotoService()