/**
 * 照片庫權限服務
 *
 * 整合權限驗證中介層與現有的認證和專案服務
 */

import { PhotoPermissionMiddleware } from '@/lib/middleware/photo-permission-middleware'
import { HybridPermissionCacheService } from '@/lib/services/permission-cache-service'
import { useAuthStore } from '@/store/authStore'
import { useProjectScopeStore, ProjectPermission } from '@/store/projectScopeStore'
import {
  PhotoPermission,
  PermissionContext,
  PermissionCheckResult,
  PermissionCheckOptions,
  PhotoPermissionMiddlewareConfig
} from '@/types/photo-permissions'

/**
 * 專案服務適配器
 */
class ProjectServiceAdapter {
  async getUserProjectPermission(userId: string, projectId: string): Promise<ProjectPermission | null> {
    try {
      // 這裡應該調用實際的 API 或從現有 store 獲取
      // 暫時模擬實作
      const currentProject = useProjectScopeStore.getState().currentProject

      if (currentProject?.id === projectId) {
        return useProjectScopeStore.getState().currentProjectPermission
      }

      // 如果不是當前專案，需要從 API 獲取
      // TODO: 實作實際的 API 調用
      return ProjectPermission.VIEWER

    } catch (error) {
      console.error('Failed to get user project permission:', error)
      throw error
    }
  }

  async getProjectById(projectId: string): Promise<any> {
    try {
      // TODO: 實作實際的專案查詢邏輯
      const currentProject = useProjectScopeStore.getState().currentProject

      if (currentProject?.id === projectId) {
        return currentProject
      }

      throw new Error('Project not found')

    } catch (error) {
      console.error('Failed to get project:', error)
      throw error
    }
  }
}

/**
 * 認證服務適配器
 */
class AuthServiceAdapter {
  getCurrentUser() {
    return useAuthStore.getState().user
  }

  verifyToken(): boolean {
    // 檢查 token 有效性
    const authState = useAuthStore.getState()
    return authState.isAuthenticated && authState.isSessionValid()
  }

  isAuthenticated(): boolean {
    return useAuthStore.getState().isAuthenticated
  }
}

/**
 * 照片庫權限服務
 */
export class PhotoPermissionService {
  private middleware: PhotoPermissionMiddleware
  private static instance: PhotoPermissionService | null = null

  private constructor() {
    const config: PhotoPermissionMiddlewareConfig = {
      enabled: true,
      cacheTtl: 5 * 60 * 1000, // 5 分鐘
      enableLogging: process.env.NODE_ENV === 'development',
      defaultDeny: true
    }

    const dependencies = {
      authService: new AuthServiceAdapter(),
      projectService: new ProjectServiceAdapter(),
      cacheService: new HybridPermissionCacheService()
    }

    this.middleware = new PhotoPermissionMiddleware(config, dependencies)
  }

  /**
   * 獲取服務實例 (單例模式)
   */
  static getInstance(): PhotoPermissionService {
    if (!PhotoPermissionService.instance) {
      PhotoPermissionService.instance = new PhotoPermissionService()
    }
    return PhotoPermissionService.instance
  }

  /**
   * 檢查使用者是否有特定權限
   */
  async checkPermission(
    userId: string,
    projectId: string,
    permission: PhotoPermission,
    options?: PermissionCheckOptions
  ): Promise<PermissionCheckResult> {
    const context: PermissionContext = {
      userId,
      projectId,
      permission
    }

    return this.middleware.checkPermission(context, options)
  }

  /**
   * 檢查照片檢視權限
   */
  async canViewPhotos(userId: string, projectId: string): Promise<boolean> {
    const result = await this.checkPermission(userId, projectId, PhotoPermission.VIEW)
    return result.hasPermission
  }

  /**
   * 檢查照片上傳權限
   */
  async canUploadPhotos(userId: string, projectId: string): Promise<boolean> {
    const result = await this.checkPermission(userId, projectId, PhotoPermission.UPLOAD)
    return result.hasPermission
  }

  /**
   * 檢查照片下載權限
   */
  async canDownloadPhotos(userId: string, projectId: string): Promise<boolean> {
    const result = await this.checkPermission(userId, projectId, PhotoPermission.DOWNLOAD)
    return result.hasPermission
  }

  /**
   * 檢查照片刪除權限
   */
  async canDeletePhotos(userId: string, projectId: string): Promise<boolean> {
    const result = await this.checkPermission(userId, projectId, PhotoPermission.DELETE)
    return result.hasPermission
  }

  /**
   * 檢查相簿管理權限
   */
  async canManageAlbums(userId: string, projectId: string): Promise<boolean> {
    const result = await this.checkPermission(userId, projectId, PhotoPermission.MANAGE_ALBUMS)
    return result.hasPermission
  }

  /**
   * 檢查照片庫管理員權限
   */
  async isPhotoAdmin(userId: string, projectId: string): Promise<boolean> {
    const result = await this.checkPermission(userId, projectId, PhotoPermission.ADMIN)
    return result.hasPermission
  }

  /**
   * 獲取使用者在專案中的所有照片庫權限
   */
  async getUserPhotoPermissions(userId: string, projectId: string): Promise<PhotoPermission[]> {
    const permissions: PhotoPermission[] = []

    const permissionsToCheck = [
      PhotoPermission.VIEW,
      PhotoPermission.UPLOAD,
      PhotoPermission.DOWNLOAD,
      PhotoPermission.DELETE,
      PhotoPermission.MANAGE_ALBUMS,
      PhotoPermission.ADMIN
    ]

    for (const permission of permissionsToCheck) {
      const result = await this.checkPermission(userId, projectId, permission)
      if (result.hasPermission) {
        permissions.push(permission)
      }
    }

    return permissions
  }

  /**
   * 清除使用者權限快取
   */
  async clearUserCache(userId: string): Promise<void> {
    await this.middleware.clearUserPermissionCache(userId)
  }

  /**
   * 驗證使用者是否可以存取特定照片
   */
  async canAccessPhoto(
    userId: string,
    projectId: string,
    photoId: string,
    permission: PhotoPermission
  ): Promise<PermissionCheckResult> {
    const context: PermissionContext = {
      userId,
      projectId,
      permission,
      photoId
    }

    return this.middleware.checkPermission(context)
  }

  /**
   * 驗證使用者是否可以存取特定相簿
   */
  async canAccessAlbum(
    userId: string,
    projectId: string,
    albumId: string,
    permission: PhotoPermission
  ): Promise<PermissionCheckResult> {
    const context: PermissionContext = {
      userId,
      projectId,
      permission,
      albumId
    }

    return this.middleware.checkPermission(context)
  }
}

/**
 * 導出服務實例
 */
export const photoPermissionService = PhotoPermissionService.getInstance()