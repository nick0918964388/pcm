/**
 * 照片庫權限 Hook
 *
 * 提供便利的權限檢查功能給 React 元件使用
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useProjectScopeStore } from '@/store/projectScopeStore'
import { photoPermissionService } from '@/lib/services/photo-permission-service'
import { PhotoPermission, PermissionCheckResult } from '@/types/photo-permissions'

/**
 * 照片庫權限狀態
 */
interface PhotoPermissionState {
  /** 是否正在載入權限 */
  loading: boolean
  /** 錯誤訊息 */
  error: string | null
  /** 權限檢查結果 */
  permissions: {
    canView: boolean
    canUpload: boolean
    canDownload: boolean
    canDelete: boolean
    canManageAlbums: boolean
    isAdmin: boolean
  }
}

/**
 * 照片庫權限 Hook
 */
export function usePhotoPermissions(projectId?: string) {
  const user = useAuthStore((state) => state.user)
  const currentProject = useProjectScopeStore((state) => state.currentProject)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const [state, setState] = useState<PhotoPermissionState>({
    loading: false,
    error: null,
    permissions: {
      canView: false,
      canUpload: false,
      canDownload: false,
      canDelete: false,
      canManageAlbums: false,
      isAdmin: false
    }
  })

  // 使用傳入的 projectId 或當前選中的專案
  const targetProjectId = projectId || currentProject?.id

  /**
   * 載入權限
   */
  const loadPermissions = useCallback(async () => {
    if (!user || !targetProjectId || !isAuthenticated) {
      setState(prev => ({
        ...prev,
        loading: false,
        permissions: {
          canView: false,
          canUpload: false,
          canDownload: false,
          canDelete: false,
          canManageAlbums: false,
          isAdmin: false
        }
      }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const [
        canView,
        canUpload,
        canDownload,
        canDelete,
        canManageAlbums,
        isAdmin
      ] = await Promise.all([
        photoPermissionService.canViewPhotos(user.id, targetProjectId),
        photoPermissionService.canUploadPhotos(user.id, targetProjectId),
        photoPermissionService.canDownloadPhotos(user.id, targetProjectId),
        photoPermissionService.canDeletePhotos(user.id, targetProjectId),
        photoPermissionService.canManageAlbums(user.id, targetProjectId),
        photoPermissionService.isPhotoAdmin(user.id, targetProjectId)
      ])

      setState(prev => ({
        ...prev,
        loading: false,
        permissions: {
          canView,
          canUpload,
          canDownload,
          canDelete,
          canManageAlbums,
          isAdmin
        }
      }))

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '載入權限時發生錯誤'
      }))
    }
  }, [user, targetProjectId, isAuthenticated])

  /**
   * 檢查特定權限
   */
  const checkPermission = useCallback(async (
    permission: PhotoPermission
  ): Promise<PermissionCheckResult> => {
    if (!user || !targetProjectId) {
      return {
        hasPermission: false,
        error: '使用者或專案資訊不完整'
      }
    }

    return photoPermissionService.checkPermission(user.id, targetProjectId, permission)
  }, [user, targetProjectId])

  /**
   * 檢查照片存取權限
   */
  const checkPhotoAccess = useCallback(async (
    photoId: string,
    permission: PhotoPermission
  ): Promise<PermissionCheckResult> => {
    if (!user || !targetProjectId) {
      return {
        hasPermission: false,
        error: '使用者或專案資訊不完整'
      }
    }

    return photoPermissionService.canAccessPhoto(user.id, targetProjectId, photoId, permission)
  }, [user, targetProjectId])

  /**
   * 檢查相簿存取權限
   */
  const checkAlbumAccess = useCallback(async (
    albumId: string,
    permission: PhotoPermission
  ): Promise<PermissionCheckResult> => {
    if (!user || !targetProjectId) {
      return {
        hasPermission: false,
        error: '使用者或專案資訊不完整'
      }
    }

    return photoPermissionService.canAccessAlbum(user.id, targetProjectId, albumId, permission)
  }, [user, targetProjectId])

  /**
   * 重新載入權限
   */
  const refreshPermissions = useCallback(() => {
    loadPermissions()
  }, [loadPermissions])

  /**
   * 清除權限快取
   */
  const clearCache = useCallback(async () => {
    if (user) {
      await photoPermissionService.clearUserCache(user.id)
      await loadPermissions()
    }
  }, [user, loadPermissions])

  // 當依賴變更時重新載入權限
  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  return {
    ...state,
    checkPermission,
    checkPhotoAccess,
    checkAlbumAccess,
    refreshPermissions,
    clearCache
  }
}

/**
 * 單一權限檢查 Hook
 */
export function usePhotoPermission(
  permission: PhotoPermission,
  projectId?: string
): {
  hasPermission: boolean
  loading: boolean
  error: string | null
} {
  const user = useAuthStore((state) => state.user)
  const currentProject = useProjectScopeStore((state) => state.currentProject)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const [hasPermission, setHasPermission] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const targetProjectId = projectId || currentProject?.id

  useEffect(() => {
    if (!user || !targetProjectId || !isAuthenticated) {
      setHasPermission(false)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    photoPermissionService.checkPermission(user.id, targetProjectId, permission)
      .then((result) => {
        setHasPermission(result.hasPermission)
        setError(result.error || null)
      })
      .catch((err) => {
        setHasPermission(false)
        setError(err instanceof Error ? err.message : '權限檢查失敗')
      })
      .finally(() => {
        setLoading(false)
      })

  }, [user, targetProjectId, permission, isAuthenticated])

  return { hasPermission, loading, error }
}

/**
 * 權限守衛 Hook
 */
export function usePhotoPermissionGuard(
  requiredPermissions: PhotoPermission[],
  projectId?: string
): {
  isAllowed: boolean
  loading: boolean
  error: string | null
  missingPermissions: PhotoPermission[]
} {
  const user = useAuthStore((state) => state.user)
  const currentProject = useProjectScopeStore((state) => state.currentProject)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const [isAllowed, setIsAllowed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [missingPermissions, setMissingPermissions] = useState<PhotoPermission[]>([])

  const targetProjectId = projectId || currentProject?.id

  useEffect(() => {
    if (!user || !targetProjectId || !isAuthenticated || requiredPermissions.length === 0) {
      setIsAllowed(false)
      setMissingPermissions(requiredPermissions)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    Promise.all(
      requiredPermissions.map(permission =>
        photoPermissionService.checkPermission(user.id, targetProjectId, permission)
      )
    )
      .then((results) => {
        const missing = requiredPermissions.filter((_, index) => !results[index].hasPermission)
        setMissingPermissions(missing)
        setIsAllowed(missing.length === 0)

        const errors = results.filter(r => r.error).map(r => r.error)
        if (errors.length > 0) {
          setError(errors[0] || null)
        }
      })
      .catch((err) => {
        setIsAllowed(false)
        setMissingPermissions(requiredPermissions)
        setError(err instanceof Error ? err.message : '權限檢查失敗')
      })
      .finally(() => {
        setLoading(false)
      })

  }, [user, targetProjectId, requiredPermissions, isAuthenticated])

  return { isAllowed, loading, error, missingPermissions }
}