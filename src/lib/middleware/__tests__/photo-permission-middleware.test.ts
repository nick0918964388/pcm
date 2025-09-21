/**
 * 照片庫權限驗證中介層測試
 *
 * 測試基於 JWT 的身份驗證、專案級權限控制、角色基礎的存取控制等功能
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { PhotoPermissionMiddleware } from '../photo-permission-middleware'
import { PhotoPermission, PermissionErrorCode, PermissionContext } from '@/types/photo-permissions'
import { ProjectPermission } from '@/store/projectScopeStore'
import { User } from '@/types/auth'

// Mock 相依性
const mockAuthService = {
  getCurrentUser: jest.fn(),
  verifyToken: jest.fn(),
  isAuthenticated: jest.fn()
}

const mockProjectService = {
  getUserProjectPermission: jest.fn(),
  getProjectById: jest.fn()
}

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn()
}

// 測試資料
const mockUser: User = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  name: 'Test User',
  role: 'manager',
  permissions: ['project:read', 'project:write']
}

const mockProject = {
  id: 'project-1',
  name: 'Test Project',
  code: 'TEST-001'
}

describe('PhotoPermissionMiddleware', () => {
  let middleware: PhotoPermissionMiddleware

  beforeEach(() => {
    // 重設所有 mocks
    jest.clearAllMocks()

    // 建立中介層實例
    middleware = new PhotoPermissionMiddleware({
      enabled: true,
      cacheTtl: 300000, // 5 分鐘
      enableLogging: false,
      defaultDeny: true
    }, {
      authService: mockAuthService,
      projectService: mockProjectService,
      cacheService: mockCacheService
    })
  })

  describe('基礎權限驗證', () => {
    it('應該驗證使用者身份', async () => {
      // Arrange
      mockAuthService.isAuthenticated.mockReturnValue(false)

      const context: PermissionContext = {
        userId: 'user-1',
        projectId: 'project-1',
        permission: PhotoPermission.VIEW
      }

      // Act
      const result = await middleware.checkPermission(context)

      // Assert
      expect(result.hasPermission).toBe(false)
      expect(result.errorCode).toBe(PermissionErrorCode.UNAUTHORIZED)
      expect(result.error).toContain('未認證')
    })

    it('應該驗證 JWT token 有效性', async () => {
      // Arrange
      mockAuthService.isAuthenticated.mockReturnValue(true)
      mockAuthService.verifyToken.mockReturnValue(false)

      const context: PermissionContext = {
        userId: 'user-1',
        projectId: 'project-1',
        permission: PhotoPermission.VIEW
      }

      // Act
      const result = await middleware.checkPermission(context)

      // Assert
      expect(result.hasPermission).toBe(false)
      expect(result.errorCode).toBe(PermissionErrorCode.UNAUTHORIZED)
    })

    it('應該獲取當前使用者資訊', async () => {
      // Arrange
      mockAuthService.isAuthenticated.mockReturnValue(true)
      mockAuthService.verifyToken.mockReturnValue(true)
      mockAuthService.getCurrentUser.mockReturnValue(mockUser)
      mockProjectService.getUserProjectPermission.mockResolvedValue(ProjectPermission.VIEWER)

      const context: PermissionContext = {
        userId: 'user-1',
        projectId: 'project-1',
        permission: PhotoPermission.VIEW
      }

      // Act
      await middleware.checkPermission(context)

      // Assert
      expect(mockAuthService.getCurrentUser).toHaveBeenCalled()
    })
  })

  describe('專案權限控制', () => {
    beforeEach(() => {
      mockAuthService.isAuthenticated.mockReturnValue(true)
      mockAuthService.verifyToken.mockReturnValue(true)
      mockAuthService.getCurrentUser.mockReturnValue(mockUser)
    })

    it('應該檢查使用者的專案權限', async () => {
      // Arrange
      mockProjectService.getUserProjectPermission.mockResolvedValue(ProjectPermission.VIEWER)

      const context: PermissionContext = {
        userId: 'user-1',
        projectId: 'project-1',
        permission: PhotoPermission.VIEW
      }

      // Act
      await middleware.checkPermission(context)

      // Assert
      expect(mockProjectService.getUserProjectPermission).toHaveBeenCalledWith('user-1', 'project-1')
    })

    it('應該拒絕沒有專案權限的使用者', async () => {
      // Arrange
      mockProjectService.getUserProjectPermission.mockResolvedValue(null)

      const context: PermissionContext = {
        userId: 'user-1',
        projectId: 'project-1',
        permission: PhotoPermission.VIEW
      }

      // Act
      const result = await middleware.checkPermission(context)

      // Assert
      expect(result.hasPermission).toBe(false)
      expect(result.errorCode).toBe(PermissionErrorCode.FORBIDDEN)
    })

    it('應該允許專案管理員進行所有操作', async () => {
      // Arrange
      mockProjectService.getUserProjectPermission.mockResolvedValue(ProjectPermission.ADMIN)

      const context: PermissionContext = {
        userId: 'user-1',
        projectId: 'project-1',
        permission: PhotoPermission.DELETE
      }

      // Act
      const result = await middleware.checkPermission(context)

      // Assert
      expect(result.hasPermission).toBe(true)
    })

    it('應該根據角色限制權限', async () => {
      // Arrange
      mockProjectService.getUserProjectPermission.mockResolvedValue(ProjectPermission.VIEWER)

      const context: PermissionContext = {
        userId: 'user-1',
        projectId: 'project-1',
        permission: PhotoPermission.UPLOAD
      }

      // Act
      const result = await middleware.checkPermission(context)

      // Assert
      expect(result.hasPermission).toBe(false)
      expect(result.errorCode).toBe(PermissionErrorCode.FORBIDDEN)
    })
  })

  describe('角色基礎權限', () => {
    beforeEach(() => {
      mockAuthService.isAuthenticated.mockReturnValue(true)
      mockAuthService.verifyToken.mockReturnValue(true)
      mockAuthService.getCurrentUser.mockReturnValue(mockUser)
    })

    it('VIEWER 角色應該只能檢視照片', async () => {
      // Arrange
      mockProjectService.getUserProjectPermission.mockResolvedValue(ProjectPermission.VIEWER)

      const viewContext: PermissionContext = {
        userId: 'user-1',
        projectId: 'project-1',
        permission: PhotoPermission.VIEW
      }

      const downloadContext: PermissionContext = {
        userId: 'user-1',
        projectId: 'project-1',
        permission: PhotoPermission.DOWNLOAD
      }

      // Act
      const viewResult = await middleware.checkPermission(viewContext)
      const downloadResult = await middleware.checkPermission(downloadContext)

      // Assert
      expect(viewResult.hasPermission).toBe(true)
      expect(downloadResult.hasPermission).toBe(true)
    })

    it('EDITOR 角色應該能上傳和下載照片', async () => {
      // Arrange
      mockProjectService.getUserProjectPermission.mockResolvedValue(ProjectPermission.EDITOR)

      const uploadContext: PermissionContext = {
        userId: 'user-1',
        projectId: 'project-1',
        permission: PhotoPermission.UPLOAD
      }

      // Act
      const result = await middleware.checkPermission(uploadContext)

      // Assert
      expect(result.hasPermission).toBe(true)
    })

    it('ADMIN 角色應該有所有權限', async () => {
      // Arrange
      mockProjectService.getUserProjectPermission.mockResolvedValue(ProjectPermission.ADMIN)

      const adminPermissions = [
        PhotoPermission.VIEW,
        PhotoPermission.UPLOAD,
        PhotoPermission.DOWNLOAD,
        PhotoPermission.DELETE,
        PhotoPermission.MANAGE_ALBUMS,
        PhotoPermission.ADMIN
      ]

      // Act & Assert
      for (const permission of adminPermissions) {
        const context: PermissionContext = {
          userId: 'user-1',
          projectId: 'project-1',
          permission
        }

        const result = await middleware.checkPermission(context)
        expect(result.hasPermission).toBe(true)
      }
    })
  })

  describe('權限快取機制', () => {
    beforeEach(() => {
      mockAuthService.isAuthenticated.mockReturnValue(true)
      mockAuthService.verifyToken.mockReturnValue(true)
      mockAuthService.getCurrentUser.mockReturnValue(mockUser)
    })

    it('應該從快取獲取權限', async () => {
      // Arrange
      const cachedPermissions = {
        key: 'perm:user-1:project-1',
        permissions: {
          projectId: 'project-1',
          userId: 'user-1',
          projectPermission: ProjectPermission.EDITOR,
          photoPermissions: [PhotoPermission.VIEW, PhotoPermission.UPLOAD],
          source: 'project_role' as const
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 300000)
      }

      mockCacheService.get.mockReturnValue(cachedPermissions)

      const context: PermissionContext = {
        userId: 'user-1',
        projectId: 'project-1',
        permission: PhotoPermission.VIEW
      }

      // Act
      const result = await middleware.checkPermission(context, { useCache: true })

      // Assert
      expect(result.hasPermission).toBe(true)
      expect(mockCacheService.get).toHaveBeenCalledWith('perm:user-1:project-1')
      expect(mockProjectService.getUserProjectPermission).not.toHaveBeenCalled()
    })

    it('應該在快取過期時重新獲取權限', async () => {
      // Arrange
      mockCacheService.get.mockReturnValue(null)
      mockProjectService.getUserProjectPermission.mockResolvedValue(ProjectPermission.EDITOR)

      const context: PermissionContext = {
        userId: 'user-1',
        projectId: 'project-1',
        permission: PhotoPermission.VIEW
      }

      // Act
      await middleware.checkPermission(context, { useCache: true })

      // Assert
      expect(mockProjectService.getUserProjectPermission).toHaveBeenCalled()
      expect(mockCacheService.set).toHaveBeenCalled()
    })

    it('應該清除特定使用者的權限快取', async () => {
      // Act
      await middleware.clearUserPermissionCache('user-1')

      // Assert
      expect(mockCacheService.delete).toHaveBeenCalledWith('perm:user-1:*')
    })
  })

  describe('錯誤處理', () => {
    beforeEach(() => {
      mockAuthService.isAuthenticated.mockReturnValue(true)
      mockAuthService.verifyToken.mockReturnValue(true)
      mockAuthService.getCurrentUser.mockReturnValue(mockUser)
    })

    it('應該處理專案不存在的情況', async () => {
      // Arrange
      mockProjectService.getUserProjectPermission.mockRejectedValue(new Error('Project not found'))

      const context: PermissionContext = {
        userId: 'user-1',
        projectId: 'non-existent',
        permission: PhotoPermission.VIEW
      }

      // Act
      const result = await middleware.checkPermission(context)

      // Assert
      expect(result.hasPermission).toBe(false)
      expect(result.errorCode).toBe(PermissionErrorCode.PROJECT_NOT_FOUND)
    })

    it('應該處理系統錯誤', async () => {
      // Arrange
      mockProjectService.getUserProjectPermission.mockRejectedValue(new Error('Database connection failed'))

      const context: PermissionContext = {
        userId: 'user-1',
        projectId: 'project-1',
        permission: PhotoPermission.VIEW
      }

      // Act
      const result = await middleware.checkPermission(context)

      // Assert
      expect(result.hasPermission).toBe(false)
      expect(result.errorCode).toBe(PermissionErrorCode.SYSTEM_ERROR)
    })

    it('應該提供自訂錯誤訊息', async () => {
      // Arrange
      mockProjectService.getUserProjectPermission.mockResolvedValue(ProjectPermission.VIEWER)

      const context: PermissionContext = {
        userId: 'user-1',
        projectId: 'project-1',
        permission: PhotoPermission.DELETE
      }

      // Act
      const result = await middleware.checkPermission(context, {
        customErrorMessage: '您沒有權限刪除此照片'
      })

      // Assert
      expect(result.hasPermission).toBe(false)
      expect(result.error).toBe('您沒有權限刪除此照片')
    })
  })

  describe('權限記錄', () => {
    beforeEach(() => {
      mockAuthService.isAuthenticated.mockReturnValue(true)
      mockAuthService.verifyToken.mockReturnValue(true)
      mockAuthService.getCurrentUser.mockReturnValue(mockUser)
      mockProjectService.getUserProjectPermission.mockResolvedValue(ProjectPermission.EDITOR)
    })

    it('應該記錄權限檢查日誌', async () => {
      // Arrange
      const logSpy = jest.spyOn(console, 'log').mockImplementation()
      middleware = new PhotoPermissionMiddleware({
        enabled: true,
        cacheTtl: 300000,
        enableLogging: true,
        defaultDeny: true
      }, {
        authService: mockAuthService,
        projectService: mockProjectService,
        cacheService: mockCacheService
      })

      const context: PermissionContext = {
        userId: 'user-1',
        projectId: 'project-1',
        permission: PhotoPermission.VIEW,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      }

      // Act
      await middleware.checkPermission(context, { logAccess: true })

      // Assert
      expect(logSpy).toHaveBeenCalled()

      logSpy.mockRestore()
    })
  })

  describe('中介層停用', () => {
    it('停用時應該允許所有權限', async () => {
      // Arrange
      const disabledMiddleware = new PhotoPermissionMiddleware({
        enabled: false,
        cacheTtl: 300000,
        enableLogging: false,
        defaultDeny: true
      }, {
        authService: mockAuthService,
        projectService: mockProjectService,
        cacheService: mockCacheService
      })

      const context: PermissionContext = {
        userId: 'user-1',
        projectId: 'project-1',
        permission: PhotoPermission.DELETE
      }

      // Act
      const result = await disabledMiddleware.checkPermission(context)

      // Assert
      expect(result.hasPermission).toBe(true)
    })
  })
})