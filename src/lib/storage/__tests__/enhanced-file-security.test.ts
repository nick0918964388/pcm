/**
 * Enhanced File Security Service 單元測試
 * 測試整合本地檔案路徑驗證、配額管理、衝突檢測等功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import { EnhancedFileSecurityService } from '../enhanced-file-security'
import { LocalFileStorageService } from '../local-file-storage'
import { FileSecurityService } from '../../security/file-security'
import {
  QuotaInfo,
  FileConflictResult,
  IntegrityCheckResult,
  StorageQuotaInfo,
  ValidationResult,
  ConflictResolutionOption
} from '../types'

// Mock 相關模組
vi.mock('fs/promises')
vi.mock('../../security/file-security')
vi.mock('../local-file-storage')

const mockFs = fs as any
const mockFileSecurityService = FileSecurityService as any
const mockLocalFileStorageService = LocalFileStorageService as any

describe('EnhancedFileSecurityService', () => {
  let service: EnhancedFileSecurityService
  let mockLocalStorage: any
  let mockFileSecurity: any

  beforeEach(() => {
    mockLocalStorage = {
      checkFileExists: vi.fn(),
      getStorageQuota: vi.fn(),
      resolveFileConflict: vi.fn()
    }

    mockFileSecurity = {
      validateFileSecurely: vi.fn(),
      checkUploadRateLimit: vi.fn(),
      sanitizeFilename: vi.fn()
    }

    service = new EnhancedFileSecurityService(mockLocalStorage, mockFileSecurity)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('validateLocalFilePath', () => {
    it('應該成功驗證有效的本地檔案路徑', async () => {
      // Arrange
      const filePath = 'uploads/photos/TEST001/相簿/test.jpg'

      mockLocalStorage.checkFileExists.mockResolvedValue({ success: true, data: true })

      // Act
      const result = await service.validateLocalFilePath(filePath)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data?.isValid).toBe(true)
      expect(result.data?.normalizedPath).toBe(path.normalize(filePath))
      expect(mockLocalStorage.checkFileExists).toHaveBeenCalledWith(filePath)
    })

    it('應該拒絕基礎目錄外的路徑', async () => {
      // Arrange
      const maliciousPath = '/etc/passwd'

      // Act
      const result = await service.validateLocalFilePath(maliciousPath)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('路徑不在允許範圍內')
      expect(mockLocalStorage.checkFileExists).not.toHaveBeenCalled()
    })

    it('應該拒絕包含路徑遍歷的路徑', async () => {
      // Arrange
      const traversalPath = 'uploads/photos/../../../etc/passwd'

      // Act
      const result = await service.validateLocalFilePath(traversalPath)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('路徑包含危險字符')
    })

    it('應該正規化相對路徑', async () => {
      // Arrange
      const relativePath = 'uploads/photos/TEST001/../TEST002/相簿/test.jpg'
      const expectedNormalized = 'uploads/photos/TEST002/相簿/test.jpg'

      mockLocalStorage.checkFileExists.mockResolvedValue({ success: true, data: false })

      // Act
      const result = await service.validateLocalFilePath(relativePath)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data?.normalizedPath).toBe(expectedNormalized)
    })
  })

  describe('checkStorageQuota', () => {
    it('應該回傳詳細的儲存配額資訊', async () => {
      // Arrange
      const userId = 'user123'
      const projectId = 'proj456'
      const fileSize = 5 * 1024 * 1024 // 5MB

      mockLocalStorage.getStorageQuota.mockResolvedValue({
        success: true,
        data: {
          totalUsed: 100 * 1024 * 1024, // 100MB
          totalLimit: 1024 * 1024 * 1024, // 1GB
          remaining: 924 * 1024 * 1024 // 924MB
        }
      })

      mockFileSecurity.checkUploadRateLimit.mockReturnValue({
        allowed: true,
        remaining: 95,
        resetTime: Date.now() + 3600000
      })

      // Act
      const result = await service.checkStorageQuota(userId, projectId, fileSize)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        canUpload: true,
        quotaInfo: {
          totalUsed: 100 * 1024 * 1024,
          totalLimit: 1024 * 1024 * 1024,
          remaining: 924 * 1024 * 1024,
          usagePercentage: expect.any(Number)
        },
        rateLimitInfo: {
          allowed: true,
          remaining: 95,
          resetTime: expect.any(Number)
        },
        projectQuota: expect.any(Object)
      } as StorageQuotaInfo)
    })

    it('應該拒絕超過配額限制的上傳', async () => {
      // Arrange
      const userId = 'user123'
      const projectId = 'proj456'
      const fileSize = 100 * 1024 * 1024 // 100MB

      mockLocalStorage.getStorageQuota.mockResolvedValue({
        success: true,
        data: {
          totalUsed: 950 * 1024 * 1024, // 950MB
          totalLimit: 1024 * 1024 * 1024, // 1GB
          remaining: 74 * 1024 * 1024 // 74MB
        }
      })

      // Act
      const result = await service.checkStorageQuota(userId, projectId, fileSize)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data?.canUpload).toBe(false)
      expect(result.data?.quotaInfo.remaining).toBeLessThan(fileSize)
    })

    it('應該拒絕超過頻率限制的上傳', async () => {
      // Arrange
      const userId = 'user123'
      const projectId = 'proj456'
      const fileSize = 5 * 1024 * 1024

      mockLocalStorage.getStorageQuota.mockResolvedValue({
        success: true,
        data: {
          totalUsed: 100 * 1024 * 1024,
          totalLimit: 1024 * 1024 * 1024,
          remaining: 924 * 1024 * 1024
        }
      })

      mockFileSecurity.checkUploadRateLimit.mockReturnValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 3600000
      })

      // Act
      const result = await service.checkStorageQuota(userId, projectId, fileSize)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data?.canUpload).toBe(false)
      expect(result.data?.rateLimitInfo.allowed).toBe(false)
    })
  })

  describe('detectFileConflict', () => {
    it('應該檢測檔案名稱衝突並提供解決方案', async () => {
      // Arrange
      const filePath = 'uploads/photos/TEST001/相簿/existing.jpg'
      const originalName = 'existing.jpg'

      mockLocalStorage.checkFileExists.mockResolvedValue({ success: true, data: true })
      mockLocalStorage.resolveFileConflict.mockImplementation((path, strategy) => {
        if (strategy === 'rename') {
          return Promise.resolve({
            success: true,
            data: path.replace('.jpg', '_1.jpg')
          })
        }
        return Promise.resolve({ success: true, data: path })
      })

      // Act
      const result = await service.detectFileConflict(filePath, originalName)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        hasConflict: true,
        existingPath: filePath,
        originalName,
        suggestedResolutions: [
          {
            strategy: 'rename',
            newPath: expect.stringContaining('_1.jpg'),
            description: expect.any(String)
          },
          {
            strategy: 'overwrite',
            newPath: filePath,
            description: expect.any(String)
          },
          {
            strategy: 'skip',
            newPath: '',
            description: expect.any(String)
          }
        ]
      } as FileConflictResult)
    })

    it('應該回傳無衝突當檔案不存在', async () => {
      // Arrange
      const filePath = 'uploads/photos/TEST001/相簿/new.jpg'
      const originalName = 'new.jpg'

      mockLocalStorage.checkFileExists.mockResolvedValue({ success: true, data: false })

      // Act
      const result = await service.detectFileConflict(filePath, originalName)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data?.hasConflict).toBe(false)
      expect(result.data?.suggestedResolutions).toEqual([])
    })

    it('應該處理檔案檢查錯誤', async () => {
      // Arrange
      const filePath = 'uploads/photos/TEST001/相簿/error.jpg'
      const originalName = 'error.jpg'

      mockLocalStorage.checkFileExists.mockResolvedValue({
        success: false,
        error: { message: 'File system error' }
      })

      // Act
      const result = await service.detectFileConflict(filePath, originalName)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('File system error')
    })
  })

  describe('verifyFileIntegrity', () => {
    it('應該驗證檔案完整性', async () => {
      // Arrange
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' })
      // 計算 'test content' 的實際 SHA256 checksum
      const crypto = await import('crypto')
      const actualChecksum = crypto.createHash('sha256').update('test content').digest('hex')

      // Act
      const result = await service.verifyFileIntegrity(file, actualChecksum)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        isValid: true,
        actualChecksum,
        expectedChecksum: actualChecksum,
        fileSize: file.size,
        verificationTime: expect.any(Date)
      } as IntegrityCheckResult)
    })

    it('應該檢測檔案完整性不匹配', async () => {
      // Arrange
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' })
      const wrongChecksum = 'wrong_checksum_value'

      // Act
      const result = await service.verifyFileIntegrity(file, wrongChecksum)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data?.isValid).toBe(false)
      expect(result.data?.actualChecksum).not.toBe(wrongChecksum)
      expect(result.data?.expectedChecksum).toBe(wrongChecksum)
    })

    it('應該處理檔案讀取錯誤', async () => {
      // Arrange
      const file = new File([''], 'empty.jpg', { type: 'image/jpeg' })

      // Mock arrayBuffer to throw error
      vi.spyOn(file, 'arrayBuffer').mockRejectedValue(new Error('Read error'))

      // Act
      const result = await service.verifyFileIntegrity(file, 'checksum')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('Read error')
    })
  })

  describe('integratedValidation', () => {
    it('應該執行完整的整合驗證流程', async () => {
      // Arrange
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' })
      const projectId = 'TEST001'
      const albumName = '測試相簿'
      const userId = 'user123'

      // Mock all dependencies
      mockFileSecurity.validateFileSecurely.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedFilename: 'test.jpg'
      })

      mockLocalStorage.getStorageQuota.mockResolvedValue({
        success: true,
        data: { totalUsed: 0, totalLimit: 1024*1024*1024, remaining: 1024*1024*1024 }
      })

      mockFileSecurity.checkUploadRateLimit.mockReturnValue({
        allowed: true, remaining: 99, resetTime: Date.now() + 3600000
      })

      mockLocalStorage.checkFileExists.mockResolvedValue({ success: true, data: false })

      // Act
      const result = await service.integratedValidation(file, projectId, albumName, userId)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        canProceed: true,
        securityValidation: expect.any(Object),
        quotaValidation: expect.any(Object),
        conflictCheck: expect.any(Object),
        recommendedPath: expect.any(String),
        warnings: expect.any(Array)
      } as ValidationResult)
    })

    it('應該阻止不安全的檔案上傳', async () => {
      // Arrange
      const file = new File(['malicious'], 'virus.exe', { type: 'application/octet-stream' })
      const projectId = 'TEST001'
      const albumName = '測試相簿'
      const userId = 'user123'

      mockFileSecurity.validateFileSecurely.mockResolvedValue({
        isValid: false,
        errors: ['不支援的檔案類型'],
        warnings: [],
        sanitizedFilename: null
      })

      // Act
      const result = await service.integratedValidation(file, projectId, albumName, userId)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data?.canProceed).toBe(false)
      expect(result.data?.securityValidation.isValid).toBe(false)
    })

    it('應該阻止超過配額的檔案上傳', async () => {
      // Arrange
      const file = new File(['large file content'], 'large.jpg', { type: 'image/jpeg' })
      const projectId = 'TEST001'
      const albumName = '測試相簿'
      const userId = 'user123'

      mockFileSecurity.validateFileSecurely.mockResolvedValue({
        isValid: true, errors: [], warnings: [], sanitizedFilename: 'large.jpg'
      })

      mockLocalStorage.getStorageQuota.mockResolvedValue({
        success: true,
        data: { totalUsed: 1020*1024*1024, totalLimit: 1024*1024*1024, remaining: 4*1024*1024 }
      })

      mockFileSecurity.checkUploadRateLimit.mockReturnValue({
        allowed: true, remaining: 99, resetTime: Date.now() + 3600000
      })

      // Act
      const result = await service.integratedValidation(file, projectId, albumName, userId)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data?.canProceed).toBe(false)
      expect(result.data?.quotaValidation.canUpload).toBe(false)
    })
  })
})