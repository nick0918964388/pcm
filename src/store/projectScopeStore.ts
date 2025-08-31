/**
 * Project Scope Store - 專案範疇管理狀態
 * 
 * 提供專案範疇相關的狀態管理，包括：
 * - 當前選中的專案
 * - 專案權限管理
 * - 專案切換歷史
 * - 專案偏好設定
 * 
 * @module ProjectScopeStore
 * @version 1.0
 * @date 2025-08-31
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { Project } from '@/types/project'

// ==================== TYPES ====================

/**
 * 專案權限等級
 */
export enum ProjectPermission {
  /** 只能檢視 */
  VIEWER = 'viewer',
  /** 可編輯專案資料 */
  EDITOR = 'editor',
  /** 專案管理員 */
  ADMIN = 'admin',
  /** 系統管理員 */
  SUPER_ADMIN = 'super_admin'
}

/**
 * 專案存取記錄
 */
export interface ProjectAccessRecord {
  /** 專案ID */
  projectId: string
  /** 專案名稱 */
  projectName: string
  /** 專案代碼 */
  projectCode: string
  /** 最後存取時間 */
  lastAccessTime: Date
  /** 存取次數 */
  accessCount: number
  /** 是否收藏 */
  isFavorite: boolean
}

/**
 * 使用者專案偏好設定
 */
export interface UserProjectPreferences {
  /** 預設檢視模式 */
  defaultViewMode: 'grid' | 'table'
  /** 預設排序方式 */
  defaultSortBy: 'name' | 'lastAccess' | 'progress' | 'endDate'
  /** 預設排序方向 */
  defaultSortDirection: 'asc' | 'desc'
  /** 每頁顯示數量 */
  defaultPageSize: number
  /** 是否顯示已完成專案 */
  showCompletedProjects: boolean
  /** 是否自動儲存最後選中的專案 */
  autoSaveLastProject: boolean
}

/**
 * 專案範疇管理狀態
 */
export interface ProjectScopeState {
  // ===== 當前專案 =====
  /** 當前選中的專案 */
  currentProject: Project | null
  /** 當前專案的權限等級 */
  currentProjectPermission: ProjectPermission
  
  // ===== 專案歷史 =====
  /** 最近存取的專案記錄 */
  recentProjects: ProjectAccessRecord[]
  /** 收藏的專案 */
  favoriteProjects: string[]
  
  // ===== 使用者偏好 =====
  /** 使用者專案偏好設定 */
  userPreferences: UserProjectPreferences
  
  // ===== UI 狀態 =====
  /** 專案選擇器是否開啟 */
  isProjectSelectorOpen: boolean
  /** 載入狀態 */
  loading: boolean
  /** 錯誤訊息 */
  error: string | null
}

/**
 * 專案範疇管理動作
 */
export interface ProjectScopeActions {
  // ===== 專案選擇 =====
  /** 選擇專案 */
  selectProject: (project: Project, permission?: ProjectPermission) => void
  /** 清除當前專案 */
  clearCurrentProject: () => void
  /** 根據 ID 切換專案 */
  switchToProject: (projectId: string) => Promise<boolean>
  
  // ===== 專案歷史管理 =====
  /** 記錄專案存取 */
  recordProjectAccess: (project: Project) => void
  /** 清除存取記錄 */
  clearAccessHistory: () => void
  /** 移除特定專案的存取記錄 */
  removeProjectFromHistory: (projectId: string) => void
  
  // ===== 收藏管理 =====
  /** 切換專案收藏狀態 */
  toggleProjectFavorite: (projectId: string) => void
  /** 檢查專案是否為收藏 */
  isProjectFavorite: (projectId: string) => boolean
  
  // ===== 偏好設定 =====
  /** 更新使用者偏好 */
  updateUserPreferences: (preferences: Partial<UserProjectPreferences>) => void
  /** 重設為預設偏好 */
  resetUserPreferences: () => void
  
  // ===== UI 控制 =====
  /** 開啟/關閉專案選擇器 */
  toggleProjectSelector: () => void
  /** 設定載入狀態 */
  setLoading: (loading: boolean) => void
  /** 設定錯誤狀態 */
  setError: (error: string | null) => void
  
  // ===== 權限管理 =====
  /** 檢查是否有指定權限 */
  hasPermission: (permission: ProjectPermission) => boolean
  /** 更新當前專案權限 */
  updateCurrentProjectPermission: (permission: ProjectPermission) => void
}

// ==================== DEFAULT VALUES ====================

/**
 * 預設使用者偏好設定
 */
const defaultUserPreferences: UserProjectPreferences = {
  defaultViewMode: 'grid',
  defaultSortBy: 'lastAccess',
  defaultSortDirection: 'desc',
  defaultPageSize: 12,
  showCompletedProjects: true,
  autoSaveLastProject: true,
}

/**
 * 初始狀態
 */
const initialState: ProjectScopeState = {
  currentProject: null,
  currentProjectPermission: ProjectPermission.VIEWER,
  recentProjects: [],
  favoriteProjects: [],
  userPreferences: defaultUserPreferences,
  isProjectSelectorOpen: false,
  loading: false,
  error: null,
}

// ==================== STORE IMPLEMENTATION ====================

/**
 * 專案範疇管理 Store
 */
export const useProjectScopeStore = create<ProjectScopeState & ProjectScopeActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ===== 專案選擇 =====
        selectProject: (project: Project, permission = ProjectPermission.VIEWER) => {
          set(
            (state) => ({
              ...state,
              currentProject: project,
              currentProjectPermission: permission,
              error: null,
            }),
            false,
            'selectProject'
          )
          
          // 記錄存取
          get().recordProjectAccess(project)
          
          // 如果開啟自動儲存，儲存到 sessionStorage
          if (get().userPreferences.autoSaveLastProject) {
            sessionStorage.setItem('selectedProject', JSON.stringify(project))
          }
        },

        clearCurrentProject: () => {
          set(
            (state) => ({
              ...state,
              currentProject: null,
              currentProjectPermission: ProjectPermission.VIEWER,
            }),
            false,
            'clearCurrentProject'
          )
          
          sessionStorage.removeItem('selectedProject')
        },

        switchToProject: async (projectId: string) => {
          const state = get()
          const projectRecord = state.recentProjects.find(p => p.projectId === projectId)
          
          if (projectRecord) {
            // 這裡應該從 API 或其他 store 獲取完整的專案資料
            // 暫時返回 false 表示需要外部處理
            return false
          }
          
          return false
        },

        // ===== 專案歷史管理 =====
        recordProjectAccess: (project: Project) => {
          set(
            (state) => {
              const existingIndex = state.recentProjects.findIndex(
                p => p.projectId === project.id
              )
              
              let updatedRecentProjects: ProjectAccessRecord[]
              
              if (existingIndex >= 0) {
                // 更新現有記錄
                const updatedRecord = {
                  ...state.recentProjects[existingIndex],
                  lastAccessTime: new Date(),
                  accessCount: state.recentProjects[existingIndex].accessCount + 1,
                }
                
                updatedRecentProjects = [
                  updatedRecord,
                  ...state.recentProjects.slice(0, existingIndex),
                  ...state.recentProjects.slice(existingIndex + 1),
                ]
              } else {
                // 新增記錄
                const newRecord: ProjectAccessRecord = {
                  projectId: project.id,
                  projectName: project.name,
                  projectCode: project.code,
                  lastAccessTime: new Date(),
                  accessCount: 1,
                  isFavorite: state.favoriteProjects.includes(project.id),
                }
                
                updatedRecentProjects = [newRecord, ...state.recentProjects]
              }
              
              // 只保留最近 20 筆記錄
              return {
                ...state,
                recentProjects: updatedRecentProjects.slice(0, 20),
              }
            },
            false,
            'recordProjectAccess'
          )
        },

        clearAccessHistory: () => {
          set(
            (state) => ({
              ...state,
              recentProjects: [],
            }),
            false,
            'clearAccessHistory'
          )
        },

        removeProjectFromHistory: (projectId: string) => {
          set(
            (state) => ({
              ...state,
              recentProjects: state.recentProjects.filter(p => p.projectId !== projectId),
            }),
            false,
            'removeProjectFromHistory'
          )
        },

        // ===== 收藏管理 =====
        toggleProjectFavorite: (projectId: string) => {
          set(
            (state) => {
              const isFavorite = state.favoriteProjects.includes(projectId)
              const updatedFavorites = isFavorite
                ? state.favoriteProjects.filter(id => id !== projectId)
                : [...state.favoriteProjects, projectId]
              
              // 同時更新 recentProjects 中的收藏狀態
              const updatedRecentProjects = state.recentProjects.map(project =>
                project.projectId === projectId
                  ? { ...project, isFavorite: !isFavorite }
                  : project
              )
              
              return {
                ...state,
                favoriteProjects: updatedFavorites,
                recentProjects: updatedRecentProjects,
              }
            },
            false,
            'toggleProjectFavorite'
          )
        },

        isProjectFavorite: (projectId: string) => {
          return get().favoriteProjects.includes(projectId)
        },

        // ===== 偏好設定 =====
        updateUserPreferences: (preferences: Partial<UserProjectPreferences>) => {
          set(
            (state) => ({
              ...state,
              userPreferences: {
                ...state.userPreferences,
                ...preferences,
              },
            }),
            false,
            'updateUserPreferences'
          )
        },

        resetUserPreferences: () => {
          set(
            (state) => ({
              ...state,
              userPreferences: defaultUserPreferences,
            }),
            false,
            'resetUserPreferences'
          )
        },

        // ===== UI 控制 =====
        toggleProjectSelector: () => {
          set(
            (state) => ({
              ...state,
              isProjectSelectorOpen: !state.isProjectSelectorOpen,
            }),
            false,
            'toggleProjectSelector'
          )
        },

        setLoading: (loading: boolean) => {
          set(
            (state) => ({
              ...state,
              loading,
            }),
            false,
            'setLoading'
          )
        },

        setError: (error: string | null) => {
          set(
            (state) => ({
              ...state,
              error,
            }),
            false,
            'setError'
          )
        },

        // ===== 權限管理 =====
        hasPermission: (permission: ProjectPermission) => {
          const currentPermission = get().currentProjectPermission
          const permissionLevels = {
            [ProjectPermission.VIEWER]: 1,
            [ProjectPermission.EDITOR]: 2,
            [ProjectPermission.ADMIN]: 3,
            [ProjectPermission.SUPER_ADMIN]: 4,
          }
          
          return permissionLevels[currentPermission] >= permissionLevels[permission]
        },

        updateCurrentProjectPermission: (permission: ProjectPermission) => {
          set(
            (state) => ({
              ...state,
              currentProjectPermission: permission,
            }),
            false,
            'updateCurrentProjectPermission'
          )
        },
      }),
      {
        name: 'project-scope-store',
        // 只持久化部分狀態
        partialize: (state) => ({
          recentProjects: state.recentProjects,
          favoriteProjects: state.favoriteProjects,
          userPreferences: state.userPreferences,
        }),
        // 自訂序列化，處理日期物件
        serialize: (state) => {
          return JSON.stringify({
            ...state,
            recentProjects: state.recentProjects.map(project => ({
              ...project,
              lastAccessTime: project.lastAccessTime.toISOString(),
            })),
          })
        },
        // 自訂反序列化，還原日期物件
        deserialize: (str) => {
          const state = JSON.parse(str)
          return {
            ...state,
            recentProjects: (state.recentProjects || []).map((project: any) => ({
              ...project,
              lastAccessTime: new Date(project.lastAccessTime),
            })),
          }
        },
      }
    ),
    {
      name: 'ProjectScopeStore',
    }
  )
)

// ==================== UTILITY HOOKS ====================

/**
 * 獲取當前專案的 Hook
 */
export const useCurrentProject = () => {
  return useProjectScopeStore((state) => state.currentProject)
}

/**
 * 獲取最近專案的 Hook
 */
export const useRecentProjects = (limit = 5) => {
  return useProjectScopeStore(
    (state) => state.recentProjects.slice(0, limit),
    (prev, curr) => {
      if (prev.length !== curr.length) return false
      return prev.every((item, index) => item.projectId === curr[index]?.projectId)
    }
  )
}

/**
 * 獲取收藏專案的 Hook
 */
export const useFavoriteProjects = () => {
  return useProjectScopeStore((state) => ({
    favoriteProjectIds: state.favoriteProjects,
    toggleFavorite: state.toggleProjectFavorite,
    isFavorite: state.isProjectFavorite,
  }))
}

/**
 * 獲取使用者偏好的 Hook
 */
export const useUserPreferences = () => {
  return useProjectScopeStore((state) => ({
    preferences: state.userPreferences,
    updatePreferences: state.updateUserPreferences,
    resetPreferences: state.resetUserPreferences,
  }))
}