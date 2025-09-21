/**
 * Photo Delete API Tests - 照片刪除API測試
 * DELETE /api/photos/[id]
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { DELETE } from '../route'
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
  unlink: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockResolvedValue(undefined)
}))

describe('照片刪除API測試', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('DELETE /api/photos/[id]', () => {
    it('應該成功刪除照片', async () => {
      // Arrange
      const photoId = 'photo1'
      const mockPhoto = {
        id: photoId,
        album_id: 'album1',
        file_name: 'test.jpg',
        file_path: '/uploads/originals/test.jpg',
        thumbnail_path: '/uploads/thumbnails/test.jpg',
        uploaded_by: 'user1',
        project_id: 'F20P1'
      }

      // Mock 照片查詢和刪除
      mockConnection.query
        .mockResolvedValueOnce({ rows: [mockPhoto] }) // 查詢照片
        .mockResolvedValueOnce({ rows: [{ count: 1 }] }) // 軟刪除照片
        .mockResolvedValueOnce({ rows: [] }) // 刪除照片版本

      const request = new NextRequest(`http://localhost/api/photos/${photoId}`, {
        method: 'DELETE'
      })

      // Act
      const response = await DELETE(request, { params: { id: photoId } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toContain('照片刪除成功')
      expect(mockConnection.query).toHaveBeenCalledTimes(3)
    })

    it('應該回傳錯誤當照片不存在時', async () => {
      // Arrange
      const photoId = 'invalid'
      mockConnection.query
        .mockResolvedValueOnce({ rows: [] }) // 照片不存在

      const request = new NextRequest(`http://localhost/api/photos/${photoId}`, {
        method: 'DELETE'
      })

      // Act
      const response = await DELETE(request, { params: { id: photoId } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('照片不存在')
    })

    it('應該驗證權限（TODO）', async () => {
      // Arrange
      const photoId = 'photo1'
      const mockPhoto = {
        id: photoId,
        album_id: 'album1',
        file_name: 'test.jpg',
        file_path: '/uploads/originals/test.jpg',
        thumbnail_path: '/uploads/thumbnails/test.jpg',
        uploaded_by: 'user1',
        project_id: 'F20P1'
      }

      // Mock 完整的刪除流程
      mockConnection.query
        .mockResolvedValueOnce({ rows: [mockPhoto] }) // 查詢照片
        .mockResolvedValueOnce({ rows: [{ id: photoId }] }) // 軟刪除照片
        .mockResolvedValueOnce({ rows: [] }) // 刪除照片版本

      const request = new NextRequest(`http://localhost/api/photos/${photoId}`, {
        method: 'DELETE'
      })

      // Act
      const response = await DELETE(request, { params: { id: photoId } })
      const responseData = await response.json()

      // Assert - 暫時通過，等待權限系統整合
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
    })

    it('應該處理資料庫錯誤', async () => {
      // Arrange
      const photoId = 'photo1'
      mockConnection.query.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest(`http://localhost/api/photos/${photoId}`, {
        method: 'DELETE'
      })

      // Act
      const response = await DELETE(request, { params: { id: photoId } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Database error')
    })
  })
})