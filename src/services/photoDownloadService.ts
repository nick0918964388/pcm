/**
 * PhotoDownloadService - 照片下載服務
 * 處理單張照片的下載功能，包含權限驗證、進度追蹤和檔案管理
 */

import type {
  DownloadOptions,
  DownloadProgress,
  DownloadRequest,
  DownloadResponse,
  PhotoResolution
} from '../types/photo.types'

export class PhotoDownloadService {
  private downloadProgress: Map<string, DownloadProgress> = new Map()
  private abortControllers: Map<string, AbortController> = new Map()

  /**
   * 下載照片
   * @param photoId 照片ID
   * @param options 下載選項
   * @returns 下載回應
   */
  async downloadPhoto(photoId: string, options: DownloadOptions): Promise<DownloadResponse> {
    try {
      const response = await fetch(`/api/photos/${photoId}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          options
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '下載失敗')
    }
  }

  /**
   * 驗證下載權限
   * @param photoId 照片ID
   * @param userId 使用者ID
   * @returns 是否有權限
   */
  async validateDownloadPermissions(photoId: string, userId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/photos/${photoId}/permissions?userId=${userId}`)

      if (!response.ok) {
        return false
      }

      const result = await response.json()
      return result.success && result.canDownload
    } catch (error) {
      console.error('權限驗證失敗:', error)
      return false
    }
  }

  /**
   * 開始下載追蹤
   * @param downloadId 下載ID
   * @param photoId 照片ID
   * @param fileName 檔案名稱
   */
  startDownloadTracking(downloadId: string, photoId: string, fileName: string): void {
    const progress: DownloadProgress = {
      id: downloadId,
      photoId,
      fileName,
      progress: 0,
      status: 'pending',
      startedAt: new Date()
    }

    this.downloadProgress.set(downloadId, progress)
  }

  /**
   * 更新下載進度
   * @param downloadId 下載ID
   * @param progress 進度百分比 (0-100)
   */
  updateDownloadProgress(downloadId: string, progress: number): void {
    const current = this.downloadProgress.get(downloadId)
    if (!current) return

    current.progress = Math.min(100, Math.max(0, progress))

    if (progress === 100) {
      current.status = 'completed'
      current.completedAt = new Date()
    } else if (progress > 0) {
      current.status = 'downloading'
    }

    this.downloadProgress.set(downloadId, current)
  }

  /**
   * 取得下載進度
   * @param downloadId 下載ID
   * @returns 下載進度
   */
  getDownloadProgress(downloadId: string): DownloadProgress | undefined {
    return this.downloadProgress.get(downloadId)
  }

  /**
   * 取消下載
   * @param downloadId 下載ID
   */
  cancelDownload(downloadId: string): void {
    const progress = this.downloadProgress.get(downloadId)
    if (progress) {
      progress.status = 'cancelled'
      this.downloadProgress.set(downloadId, progress)
    }

    const controller = this.abortControllers.get(downloadId)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(downloadId)
    }
  }

  /**
   * 清理已完成的下載記錄
   */
  cleanupCompletedDownloads(): void {
    for (const [id, progress] of this.downloadProgress.entries()) {
      if (progress.status === 'completed' || progress.status === 'cancelled') {
        this.downloadProgress.delete(id)
      }
    }
  }

  /**
   * 生成下載檔案名稱
   * @param originalFileName 原始檔案名
   * @param resolution 解析度
   * @returns 下載檔名
   */
  generateDownloadFileName(originalFileName: string, resolution: PhotoResolution): string {
    if (resolution === 'original') {
      return originalFileName
    }

    const lastDotIndex = originalFileName.lastIndexOf('.')

    if (lastDotIndex === -1) {
      // 沒有副檔名
      return `${originalFileName}-${resolution}`
    }

    const nameWithoutExt = originalFileName.substring(0, lastDotIndex)
    const extension = originalFileName.substring(lastDotIndex)

    return `${nameWithoutExt}-${resolution}${extension}`
  }

  /**
   * 取得解析度顯示名稱
   * @param resolution 解析度
   * @returns 顯示名稱
   */
  getResolutionDisplayName(resolution: PhotoResolution): string {
    const names = {
      thumbnail: '縮圖 (150x150)',
      small: '小圖 (400x300)',
      medium: '中圖 (800x600)',
      large: '大圖 (1200x900)',
      original: '原圖'
    }

    return names[resolution]
  }

  /**
   * 格式化檔案大小
   * @param bytes 位元組數
   * @returns 格式化後的大小
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * 創建下載連結並觸發下載
   * @param url 下載URL
   * @param fileName 檔案名稱
   */
  triggerDownload(url: string, fileName: string): void {
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.style.display = 'none'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}