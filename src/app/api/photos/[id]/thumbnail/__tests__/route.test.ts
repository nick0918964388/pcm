/**
 * Photo Thumbnail API Tests - 照片縮圖API測試
 * GET /api/photos/[id]/thumbnail
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { DatabaseConnection } from '@/lib/database/connection'

// Mock 資料庫連接
const mockConnection = {
  connect: vi.fn(),
  close: vi.fn(),
  query: vi.fn()
}

vi.mock('@/lib/database/connection', () => ({
  DatabaseConnection: vi.fn().mockImplementation(() => mockConnection)
}))

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from('fake-image-data')),
  access: vi.fn().mockResolvedValue(undefined)
}))

describe('照片縮圖API測試', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/photos/[id]/thumbnail', () => {
    it('應該回傳照片縮圖', async () => {
      // Arrange
      const photoId = 'photo1'
      const mockPhoto = {
        id: photoId,
        album_id: 'album1',
        file_name: 'test.jpg',
        thumbnail_path: '/uploads/thumbnails/test.jpg',
        mime_type: 'image/jpeg',
        project_id: 'F20P1'
      }

      mockConnection.query
        .mockResolvedValueOnce({ rows: [mockPhoto] }) // 查詢照片

      const request = new NextRequest(`http://localhost/api/photos/${photoId}/thumbnail`)

      // Act
      const response = await GET(request, { params: { id: photoId } })

      // Assert
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/jpeg')
      expect(response.headers.get('Cache-Control')).toContain('public')
      expect(mockConnection.query).toHaveBeenCalled()
    })

    it('應該支援不同尺寸的縮圖', async () => {
      // Arrange
      const photoId = 'photo1'
      const mockPhoto = {
        id: photoId,
        thumbnail_path: '/uploads/thumbnails/test.jpg',
        mime_type: 'image/jpeg',
        project_id: 'F20P1'
      }

      mockConnection.query
        .mockResolvedValueOnce({ rows: [mockPhoto] })

      const request = new NextRequest(`http://localhost/api/photos/${photoId}/thumbnail?size=large`)

      // Act
      const response = await GET(request, { params: { id: photoId } })

      // Assert
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/jpeg')
    })

    it('應該回傳錯誤當照片不存在時', async () => {
      // Arrange
      const photoId = 'invalid'
      mockConnection.query
        .mockResolvedValueOnce({ rows: [] })

      const request = new NextRequest(`http://localhost/api/photos/${photoId}/thumbnail`)

      // Act
      const response = await GET(request, { params: { id: photoId } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('照片不存在')
    })

    it('應該回傳預設圖片當縮圖檔案不存在時', async () => {
      // Arrange
      const photoId = 'photo1'
      const mockPhoto = {
        id: photoId,
        thumbnail_path: '/uploads/thumbnails/missing.jpg',
        mime_type: 'image/jpeg',
        project_id: 'F20P1'
      }

      mockConnection.query
        .mockResolvedValueOnce({ rows: [mockPhoto] })

      // Mock 檔案不存在
      const { access } = await import('fs/promises')
      vi.mocked(access).mockRejectedValue(new Error('File not found'))

      const request = new NextRequest(`http://localhost/api/photos/${photoId}/thumbnail`)

      // Act
      const response = await GET(request, { params: { id: photoId } })

      // Assert
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml')
    })

    it('應該處理資料庫錯誤', async () => {
      // Arrange
      const photoId = 'photo1'
      mockConnection.query.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest(`http://localhost/api/photos/${photoId}/thumbnail`)

      // Act
      const response = await GET(request, { params: { id: photoId } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Database error')
    })
  })
})