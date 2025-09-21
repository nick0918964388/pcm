/**
 * 照片庫權限驗證中介層
 *
 * 提供基於 JWT 的身份驗證、專案級權限控制和角色基礎的存取控制
 */

import {
  PhotoPermission,
  PermissionCheckResult,
  ProjectPhotoPermissions,
  PhotoPermissionMiddlewareConfig,
  PermissionCacheItem,
  PermissionContext,
  PermissionErrorCode,
  PermissionCheckOptions
} from '@/types/photo-permissions'
import { ProjectPermission } from '@/store/projectScopeStore'
import { User } from '@/types/auth'

/**
 * 權限驗證中介層依賴服務介面
 */
interface PermissionMiddlewareDependencies {
  authService: {
    getCurrentUser(): User | null
    verifyToken(): boolean
    isAuthenticated(): boolean
  }
  projectService: {
    getUserProjectPermission(userId: string, projectId: string): Promise<ProjectPermission | null>
    getProjectById(projectId: string): Promise<any>
  }
  cacheService: {
    get(key: string): PermissionCacheItem | null
    set(key: string, value: PermissionCacheItem, ttl: number): void
    delete(key: string): void
    clear(): void
  }
}

/**
 * 照片庫權限驗證中介層
 */
export class PhotoPermissionMiddleware {
  private config: PhotoPermissionMiddlewareConfig
  private dependencies: PermissionMiddlewareDependencies

  constructor(
    config: PhotoPermissionMiddlewareConfig,
    dependencies: PermissionMiddlewareDependencies
  ) {
    this.config = config
    this.dependencies = dependencies
  }

  /**
   * 檢查權限
   */
  async checkPermission(
    context: PermissionContext,
    options: PermissionCheckOptions = {}
  ): Promise<PermissionCheckResult> {
    try {
      // 如果中介層被停用，允許所有權限
      if (!this.config.enabled) {
        return { hasPermission: true }
      }

      // 1. 驗證使用者身份
      const authResult = await this.verifyAuthentication(context)
      if (!authResult.hasPermission) {
        return authResult
      }

      // 2. 檢查快取
      if (options.useCache !== false) {
        const cachedResult = this.getPermissionFromCache(context)
        if (cachedResult) {
          this.logPermissionCheck(context, cachedResult, 'cache_hit', options)
          return cachedResult
        }
      }

      // 3. 檢查專案權限
      const projectPermissionResult = await this.checkProjectPermission(context)
      if (!projectPermissionResult.hasPermission) {
        this.logPermissionCheck(context, projectPermissionResult, 'project_denied', options)
        return projectPermissionResult
      }

      // 4. 檢查照片庫特定權限
      const photoPermissionResult = await this.checkPhotoPermission(context)

      // 5. 快取結果
      if (options.useCache !== false && photoPermissionResult.hasPermission) {
        this.cachePermissionResult(context, photoPermissionResult)
      }

      // 6. 記錄日誌
      this.logPermissionCheck(context, photoPermissionResult, 'permission_check', options)

      return photoPermissionResult

    } catch (error) {
      const errorResult: PermissionCheckResult = {
        hasPermission: false,
        error: options.customErrorMessage || '權限檢查時發生系統錯誤',
        errorCode: this.getErrorCodeFromError(error)
      }

      this.logPermissionCheck(context, errorResult, 'error', options)
      return errorResult
    }
  }

  /**
   * 驗證使用者身份
   */
  private async verifyAuthentication(context: PermissionContext): Promise<PermissionCheckResult> {
    // 檢查是否已認證
    if (!this.dependencies.authService.isAuthenticated()) {
      return {
        hasPermission: false,
        error: '使用者未認證，請先登入',
        errorCode: PermissionErrorCode.UNAUTHORIZED
      }
    }

    // 驗證 JWT token
    if (!this.dependencies.authService.verifyToken()) {
      return {
        hasPermission: false,
        error: 'Token 無效或已過期',
        errorCode: PermissionErrorCode.UNAUTHORIZED
      }
    }

    // 獲取當前使用者
    const currentUser = this.dependencies.authService.getCurrentUser()
    if (!currentUser || currentUser.id !== context.userId) {
      return {
        hasPermission: false,
        error: '使用者身份不符',
        errorCode: PermissionErrorCode.UNAUTHORIZED
      }
    }

    return { hasPermission: true }
  }

  /**
   * 檢查專案權限
   */
  private async checkProjectPermission(context: PermissionContext): Promise<PermissionCheckResult> {
    try {
      const projectPermission = await this.dependencies.projectService.getUserProjectPermission(
        context.userId,
        context.projectId
      )

      if (!projectPermission) {
        return {
          hasPermission: false,
          error: '您沒有此專案的存取權限',
          errorCode: PermissionErrorCode.FORBIDDEN
        }
      }

      return { hasPermission: true }

    } catch (error: any) {
      if (error.message?.includes('not found')) {
        return {
          hasPermission: false,
          error: '專案不存在',
          errorCode: PermissionErrorCode.PROJECT_NOT_FOUND
        }
      }

      throw error
    }
  }

  /**
   * 檢查照片庫特定權限
   */
  private async checkPhotoPermission(context: PermissionContext): Promise<PermissionCheckResult> {
    const projectPermission = await this.dependencies.projectService.getUserProjectPermission(
      context.userId,
      context.projectId
    )

    if (!projectPermission) {
      return {
        hasPermission: false,
        error: '無法獲取專案權限',
        errorCode: PermissionErrorCode.FORBIDDEN
      }
    }

    // 建立權限映射
    const permissionMapping = this.createPermissionMapping(projectPermission)

    // 檢查是否有所需權限
    const hasPermission = permissionMapping.includes(context.permission)

    if (!hasPermission) {
      return {
        hasPermission: false,
        error: '您沒有執行此操作的權限',
        errorCode: PermissionErrorCode.FORBIDDEN
      }
    }

    return { hasPermission: true }
  }

  /**
   * 建立權限映射
   */
  private createPermissionMapping(projectPermission: ProjectPermission): PhotoPermission[] {
    switch (projectPermission) {
      case ProjectPermission.VIEWER:
        return [PhotoPermission.VIEW, PhotoPermission.DOWNLOAD]

      case ProjectPermission.EDITOR:
        return [
          PhotoPermission.VIEW,
          PhotoPermission.DOWNLOAD,
          PhotoPermission.UPLOAD
        ]

      case ProjectPermission.ADMIN:
      case ProjectPermission.SUPER_ADMIN:
        return [
          PhotoPermission.VIEW,
          PhotoPermission.DOWNLOAD,
          PhotoPermission.UPLOAD,
          PhotoPermission.DELETE,
          PhotoPermission.MANAGE_ALBUMS,
          PhotoPermission.ADMIN
        ]

      default:
        return []
    }
  }

  /**
   * 從快取獲取權限
   */
  private getPermissionFromCache(context: PermissionContext): PermissionCheckResult | null {
    const cacheKey = this.buildCacheKey(context.userId, context.projectId)
    const cachedItem = this.dependencies.cacheService.get(cacheKey)

    if (!cachedItem || cachedItem.expiresAt < new Date()) {
      return null
    }

    const hasPermission = cachedItem.permissions.photoPermissions.includes(context.permission)

    return {
      hasPermission,
      error: hasPermission ? undefined : '您沒有執行此操作的權限',
      errorCode: hasPermission ? undefined : PermissionErrorCode.FORBIDDEN
    }
  }

  /**
   * 快取權限結果
   */
  private async cachePermissionResult(
    context: PermissionContext,
    result: PermissionCheckResult
  ): Promise<void> {
    if (!result.hasPermission) {
      return
    }

    const projectPermission = await this.dependencies.projectService.getUserProjectPermission(
      context.userId,
      context.projectId
    )

    if (!projectPermission) {
      return
    }

    const photoPermissions = this.createPermissionMapping(projectPermission)
    const cacheKey = this.buildCacheKey(context.userId, context.projectId)
    const now = new Date()

    const cacheItem: PermissionCacheItem = {
      key: cacheKey,
      permissions: {
        projectId: context.projectId,
        userId: context.userId,
        projectPermission,
        photoPermissions,
        source: 'project_role'
      },
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.config.cacheTtl)
    }

    this.dependencies.cacheService.set(cacheKey, cacheItem, this.config.cacheTtl)
  }

  /**
   * 清除使用者權限快取
   */
  async clearUserPermissionCache(userId: string): Promise<void> {
    const pattern = `perm:${userId}:*`
    this.dependencies.cacheService.delete(pattern)
  }

  /**
   * 建立快取鍵值
   */
  private buildCacheKey(userId: string, projectId: string): string {
    return `perm:${userId}:${projectId}`
  }

  /**
   * 記錄權限檢查日誌
   */
  private logPermissionCheck(
    context: PermissionContext,
    result: PermissionCheckResult,
    checkType: string,
    options: PermissionCheckOptions
  ): void {
    if (!this.config.enableLogging && !options.logAccess) {
      return
    }

    const logData = {
      timestamp: new Date().toISOString(),
      userId: context.userId,
      projectId: context.projectId,
      permission: context.permission,
      result: result.hasPermission,
      errorCode: result.errorCode,
      checkType,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    }

    console.log('PhotoPermissionCheck:', JSON.stringify(logData))
  }

  /**
   * 從錯誤獲取錯誤代碼
   */
  private getErrorCodeFromError(error: any): PermissionErrorCode {
    if (error.message?.includes('not found')) {
      return PermissionErrorCode.PROJECT_NOT_FOUND
    }

    if (error.message?.includes('unauthorized') || error.message?.includes('token')) {
      return PermissionErrorCode.UNAUTHORIZED
    }

    if (error.message?.includes('forbidden') || error.message?.includes('permission')) {
      return PermissionErrorCode.FORBIDDEN
    }

    return PermissionErrorCode.SYSTEM_ERROR
  }
}