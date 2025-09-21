/**
 * Photo List API Tests - 照片列表API測試
 * GET /api/projects/[projectId]/photos
 * POST /api/projects/[projectId]/photos
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
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

// Mock sharp
vi.mock('sharp', () => {
  const mockSharp = vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue({ width: 300, height: 300 }),
    metadata: vi.fn().mockResolvedValue({ width: 1920, height: 1080 })
  }))
  return { default: mockSharp }
})

// Mock fs/promises
vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined)
}))

describe('照片列表API測試', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/projects/[projectId]/photos', () => {
    it('應該回傳專案照片列表', async () => {
      // Arrange
      const projectId = 'F20P1'
      const mockPhotos = [
        {
          id: 'photo1',
          album_id: 'album1',
          file_name: 'test.jpg',
          file_size: 1000000,
          mime_type: 'image/jpeg',
          width: 1920,
          height: 1080,
          thumbnail_path: '/thumbnails/photo1.jpg',
          uploaded_by: 'user1',
          uploaded_at: new Date(),
          metadata: {},
          project_id: projectId,
          album_name: 'Test Album'
        }
      ]

      // Mock 專案存在查詢
      mockConnection.query
        .mockResolvedValueOnce({ rows: [{ id: projectId }] }) // 專案存在
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // 總數查詢
        .mockResolvedValueOnce({ rows: mockPhotos }) // 照片查詢

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/photos`)

      // Act
      const response = await GET(request, { params: { projectId } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toHaveLength(1)
      expect(responseData.data[0].id).toBe('photo1')
      expect(mockConnection.query).toHaveBeenCalled()
    })

    it('應該支援分頁查詢', async () => {
      // Arrange
      const projectId = 'F20P1'
      const mockPhotos = Array.from({ length: 10 }, (_, i) => ({
        id: `photo${i}`,
        album_id: 'album1',
        file_name: `test${i}.jpg`,
        file_size: 1000000,
        mime_type: 'image/jpeg',
        width: 1920,
        height: 1080,
        thumbnail_path: `/thumbnails/photo${i}.jpg`,
        uploaded_by: 'user1',
        uploaded_at: new Date(),
        metadata: {},
        project_id: projectId,
        album_name: 'Test Album'
      }))

      const mockCountResult = { rows: [{ count: '25' }] }
      mockConnection.query
        .mockResolvedValueOnce({ rows: [{ id: projectId }] }) // 專案存在
        .mockResolvedValueOnce(mockCountResult) // 總數查詢
        .mockResolvedValueOnce({ rows: mockPhotos.slice(0, 10) }) // 照片查詢

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/photos?page=1&limit=10`)

      // Act
      const response = await GET(request, { params: { projectId } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toHaveLength(10)
      expect(responseData.meta).toEqual({
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3
      })
    })

    it('應該回傳錯誤當專案不存在時', async () => {
      // Arrange
      const projectId = 'INVALID'
      mockConnection.query
        .mockResolvedValueOnce({ rows: [] }) // 專案不存在

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/photos`)

      // Act
      const response = await GET(request, { params: { projectId } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('專案不存在')
    })

    it('應該處理資料庫錯誤', async () => {
      // Arrange
      const projectId = 'F20P1'
      mockConnection.query.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/photos`)

      // Act
      const response = await GET(request, { params: { projectId } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Database error')
    })
  })

  describe('POST /api/projects/[projectId]/photos', () => {
    it('應該驗證檔案格式', async () => {
      // Arrange
      const projectId = 'F20P1'
      const mockFormData = new FormData()
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      mockFormData.append('photos', mockFile)
      mockFormData.append('albumId', 'album1')

      // Mock 相簿查詢成功
      mockConnection.query
        .mockResolvedValueOnce({ rows: [{ id: 'album1', project_id: projectId, name: 'Test Album' }] })

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/photos`, {
        method: 'POST',
        body: mockFormData
      })

      // Act
      const response = await POST(request, { params: { projectId } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.data[0].errors[0]).toContain('不支援的檔案格式')
    })

    it('應該驗證檔案大小', async () => {
      // Arrange
      const projectId = 'F20P1'
      const mockFormData = new FormData()
      // 建立一個大檔案 (超過 10MB)
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
      mockFormData.append('photos', largeFile)
      mockFormData.append('albumId', 'album1')

      // Mock 相簿查詢成功
      mockConnection.query
        .mockResolvedValueOnce({ rows: [{ id: 'album1', project_id: projectId, name: 'Test Album' }] })

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/photos`, {
        method: 'POST',
        body: mockFormData
      })

      // Act
      const response = await POST(request, { params: { projectId } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.data[0].errors[0]).toContain('檔案大小超過限制')
    })

    it('應該要求相簿ID', async () => {
      // Arrange
      const projectId = 'F20P1'
      const mockFormData = new FormData()
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      mockFormData.append('photos', mockFile)
      // 故意不提供 albumId

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/photos`, {
        method: 'POST',
        body: mockFormData
      })

      // Act
      const response = await POST(request, { params: { projectId } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('相簿ID為必要欄位')
    })
  })
})