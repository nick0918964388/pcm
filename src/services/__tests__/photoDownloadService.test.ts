/**
 * PhotoDownloadService 測試
 * 測試照片下載功能的各種情境
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { PhotoDownloadService } from '../photoDownloadService'
import type {
  DownloadOptions,
  DownloadProgress,
  DownloadRequest,
  DownloadResponse
} from '../../types/photo.types'

// Mock fetch
global.fetch = jest.fn()

describe('PhotoDownloadService', () => {
  let service: PhotoDownloadService

  beforeEach(() => {
    service = new PhotoDownloadService()
    ;(fetch as jest.MockedFunction<typeof fetch>).mockClear()
  })

  describe('downloadPhoto', () => {
    const mockPhoto = {
      id: 'photo-123',
      fileName: 'test-image.jpg',
      projectId: 'project-1'
    }

    const mockDownloadOptions: DownloadOptions = {
      resolution: 'original',
      includeMetadata: true,
      watermark: false
    }

    it('應該成功下載照片並返回下載連結', async () => {
      // Arrange
      const mockResponse: DownloadResponse = {
        success: true,
        downloadUrl: 'https://cdn.example.com/photos/photo-123/original.jpg',
        fileName: 'test-image.jpg',
        fileSize: 2048000,
        expiresAt: new Date(Date.now() + 3600000) // 1小時後過期
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      // Act
      const result = await service.downloadPhoto(mockPhoto.id, mockDownloadOptions)

      // Assert
      expect(result).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledWith(
        `/api/photos/${mockPhoto.id}/download`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            options: mockDownloadOptions
          })
        })
      )
    })

    it('應該處理不同解析度的下載請求', async () => {
      // Arrange
      const resolutions: DownloadOptions['resolution'][] = ['thumbnail', 'small', 'medium', 'large', 'original']

      for (const resolution of resolutions) {
        const options: DownloadOptions = { resolution }
        const mockResponse: DownloadResponse = {
          success: true,
          downloadUrl: `https://cdn.example.com/photos/photo-123/${resolution}.jpg`,
          fileName: `test-image-${resolution}.jpg`,
          fileSize: 1024000,
          expiresAt: new Date()
        }

        ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        } as Response)

        // Act
        const result = await service.downloadPhoto(mockPhoto.id, options)

        // Assert
        expect(result.downloadUrl).toContain(resolution)
        expect(result.fileName).toContain(resolution)
      }
    })

    it('應該在權限不足時拋出錯誤', async () => {
      // Arrange
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          success: false,
          error: '權限不足，無法下載此照片'
        })
      } as Response)

      // Act & Assert
      await expect(
        service.downloadPhoto(mockPhoto.id, mockDownloadOptions)
      ).rejects.toThrow('權限不足，無法下載此照片')
    })

    it('應該在照片不存在時拋出錯誤', async () => {
      // Arrange
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: '照片不存在'
        })
      } as Response)

      // Act & Assert
      await expect(
        service.downloadPhoto('non-existent-photo', mockDownloadOptions)
      ).rejects.toThrow('照片不存在')
    })
  })

  describe('trackDownloadProgress', () => {
    it('應該能追蹤下載進度', async () => {
      // Arrange
      const downloadId = 'download-123'
      const photoId = 'photo-123'

      // Act
      service.startDownloadTracking(downloadId, photoId, 'test-image.jpg')

      // 模擬進度更新
      service.updateDownloadProgress(downloadId, 25)
      service.updateDownloadProgress(downloadId, 50)
      service.updateDownloadProgress(downloadId, 100)

      const progress = service.getDownloadProgress(downloadId)

      // Assert
      expect(progress).toBeDefined()
      expect(progress?.photoId).toBe(photoId)
      expect(progress?.progress).toBe(100)
      expect(progress?.status).toBe('completed')
    })

    it('應該能取消下載', async () => {
      // Arrange
      const downloadId = 'download-456'

      // Act
      service.startDownloadTracking(downloadId, 'photo-456', 'test.jpg')
      service.updateDownloadProgress(downloadId, 30)
      service.cancelDownload(downloadId)

      const progress = service.getDownloadProgress(downloadId)

      // Assert
      expect(progress?.status).toBe('cancelled')
    })

    it('應該清理已完成的下載記錄', () => {
      // Arrange
      const downloadId = 'download-789'

      // Act
      service.startDownloadTracking(downloadId, 'photo-789', 'test.jpg')
      service.updateDownloadProgress(downloadId, 100)
      service.cleanupCompletedDownloads()

      const progress = service.getDownloadProgress(downloadId)

      // Assert
      expect(progress).toBeUndefined()
    })
  })

  describe('generateDownloadFileName', () => {
    it('應該生成適當的檔案名稱', () => {
      // Arrange
      const originalFileName = 'construction-photo.jpg'
      const resolution = 'medium'

      // Act
      const fileName = service.generateDownloadFileName(originalFileName, resolution)

      // Assert
      expect(fileName).toBe('construction-photo-medium.jpg')
    })

    it('應該處理沒有副檔名的檔案', () => {
      // Arrange
      const originalFileName = 'photo'
      const resolution = 'thumbnail'

      // Act
      const fileName = service.generateDownloadFileName(originalFileName, resolution)

      // Assert
      expect(fileName).toBe('photo-thumbnail')
    })

    it('對於原始解析度應該保持原檔名', () => {
      // Arrange
      const originalFileName = 'DSC_001.jpg'
      const resolution = 'original'

      // Act
      const fileName = service.generateDownloadFileName(originalFileName, resolution)

      // Assert
      expect(fileName).toBe('DSC_001.jpg')
    })
  })

  describe('validateDownloadPermissions', () => {
    it('應該驗證使用者是否有下載權限', async () => {
      // Arrange
      const photoId = 'photo-123'
      const userId = 'user-456'

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          canDownload: true
        })
      } as Response)

      // Act
      const hasPermission = await service.validateDownloadPermissions(photoId, userId)

      // Assert
      expect(hasPermission).toBe(true)
      expect(fetch).toHaveBeenCalledWith(`/api/photos/${photoId}/permissions?userId=${userId}`)
    })

    it('應該在沒有權限時返回 false', async () => {
      // Arrange
      const photoId = 'photo-123'
      const userId = 'user-456'

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          canDownload: false
        })
      } as Response)

      // Act
      const hasPermission = await service.validateDownloadPermissions(photoId, userId)

      // Assert
      expect(hasPermission).toBe(false)
    })
  })
})