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

import React from 'react'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { Project, ProjectMemberExtended, ProjectMemberFilters } from '@/types/project'
import { WBSItem, WBSFilters, WBSStatistics } from '@/types/wbs'

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
 * 專案人員狀態管理
 */
export interface ProjectMembersState {
  /** 人員資料 */
  data: ProjectMemberExtended[]
  /** 篩選後的資料 */
  filteredData: ProjectMemberExtended[]
  /** 當前篩選條件 */
  currentFilters: ProjectMemberFilters
  /** 載入狀態 */
  loading: boolean
  /** 錯誤訊息 */
  error: string | null
  /** 分頁資訊 */
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  /** 快取配置 */
  cache: {
    lastFetchTime: Date | null
    ttl: number // Time to live in milliseconds
  }
}

/**
 * WBS 管理狀態
 */
export interface WBSManagementState {
  /** 樹狀資料 */
  treeData: WBSItem[]
  /** 展開的節點 */
  expandedNodes: Set<string>
  /** 選中的節點 */
  selectedNodes: Set<string>
  /** 拖拽狀態 */
  dragState: {
    isDragging: boolean
    draggedNode: string | null
    dropTarget: string | null
  }
  /** 檢視狀態 */
  viewState: {
    showCompleted: boolean
    viewMode: 'tree' | 'gantt' | 'kanban'
    filterPanelOpen: boolean
  }
  /** 當前篩選條件 */
  currentFilters: WBSFilters
  /** 統計資料 */
  statistics: WBSStatistics | null
  /** 載入狀態 */
  loading: boolean
  /** 錯誤訊息 */
  error: string | null
  /** 快取配置 */
  cache: {
    lastFetchTime: Date | null
    ttl: number
  }
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
  
  // ===== 擴展狀態分支 =====
  /** 專案人員管理狀態 */
  projectMembers: ProjectMembersState
  /** WBS 管理狀態 */
  wbsManagement: WBSManagementState
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
  
  // ===== 專案人員管理 =====
  /** 載入專案人員 */
  loadProjectMembers: (members: ProjectMemberExtended[], page: number, pageSize: number, total: number) => void
  /** 設定專案人員載入狀態 */
  setProjectMembersLoading: (loading: boolean) => void
  /** 設定專案人員錯誤狀態 */
  setProjectMembersError: (error: string | null) => void
  /** 套用人員篩選條件 */
  applyMemberFilters: (filters: ProjectMemberFilters) => void
  /** 清除人員篩選條件 */
  clearMemberFilters: () => void
  /** 更新人員分頁 */
  updateMemberPagination: (pagination: { page?: number; pageSize?: number }) => void
  /** 檢查人員快取是否有效 */
  isMemberCacheValid: () => boolean
  /** 刷新人員快取 */
  refreshMemberCache: () => void
  
  // ===== WBS 管理 =====
  /** 載入 WBS 樹狀結構 */
  loadWBSTree: (treeData: WBSItem[]) => void
  /** 切換 WBS 節點展開狀態 */
  toggleWBSNode: (nodeId: string) => void
  /** 選取 WBS 節點 */
  selectWBSNode: (nodeId: string, multiSelect?: boolean) => void
  /** 開始 WBS 拖拽 */
  startWBSDrag: (nodeId: string) => void
  /** 設定 WBS 放置目標 */
  setWBSDropTarget: (targetId: string) => void
  /** 結束 WBS 拖拽 */
  endWBSDrag: () => void
  /** 套用 WBS 篩選條件 */
  applyWBSFilters: (filters: WBSFilters) => void
  /** 清除 WBS 篩選條件 */
  clearWBSFilters: () => void
  /** 載入 WBS 統計資料 */
  loadWBSStatistics: (statistics: WBSStatistics) => void
  /** 設定 WBS 檢視模式 */
  setWBSViewMode: (mode: 'tree' | 'gantt' | 'kanban') => void
  /** 切換完成項目顯示 */
  toggleWBSShowCompleted: () => void
  /** 切換篩選面板 */
  toggleWBSFilterPanel: () => void
  /** 設定 WBS 載入狀態 */
  setWBSLoading: (loading: boolean) => void
  /** 設定 WBS 錯誤狀態 */
  setWBSError: (error: string | null) => void
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
  
  // 專案人員管理初始狀態
  projectMembers: {
    data: [],
    filteredData: [],
    currentFilters: {},
    loading: false,
    error: null,
    pagination: {
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0
    },
    cache: {
      lastFetchTime: null,
      ttl: 300000 // 5 minutes
    }
  },
  
  // WBS 管理初始狀態
  wbsManagement: {
    treeData: [],
    expandedNodes: new Set<string>(),
    selectedNodes: new Set<string>(),
    dragState: {
      isDragging: false,
      draggedNode: null,
      dropTarget: null
    },
    viewState: {
      showCompleted: true,
      viewMode: 'tree',
      filterPanelOpen: false
    },
    currentFilters: {},
    statistics: null,
    loading: false,
    error: null,
    cache: {
      lastFetchTime: null,
      ttl: 300000 // 5 minutes
    }
  }
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

        // ===== 專案人員管理動作 =====
        loadProjectMembers: (members: ProjectMemberExtended[], page: number, pageSize: number, total: number) => {
          set(
            (state) => ({
              ...state,
              projectMembers: {
                ...state.projectMembers,
                data: members,
                filteredData: members,
                pagination: {
                  page,
                  pageSize,
                  total,
                  totalPages: Math.ceil(total / pageSize)
                },
                cache: {
                  ...state.projectMembers.cache,
                  lastFetchTime: new Date()
                },
                loading: false,
                error: null
              }
            }),
            false,
            'loadProjectMembers'
          )
        },

        setProjectMembersLoading: (loading: boolean) => {
          set(
            (state) => ({
              ...state,
              projectMembers: {
                ...state.projectMembers,
                loading
              }
            }),
            false,
            'setProjectMembersLoading'
          )
        },

        setProjectMembersError: (error: string | null) => {
          set(
            (state) => ({
              ...state,
              projectMembers: {
                ...state.projectMembers,
                error,
                loading: false
              }
            }),
            false,
            'setProjectMembersError'
          )
        },

        applyMemberFilters: (filters: ProjectMemberFilters) => {
          set(
            (state) => ({
              ...state,
              projectMembers: {
                ...state.projectMembers,
                currentFilters: filters,
                // TODO: 實際的篩選邏輯會在後續實現
                filteredData: state.projectMembers.data
              }
            }),
            false,
            'applyMemberFilters'
          )
        },

        clearMemberFilters: () => {
          set(
            (state) => ({
              ...state,
              projectMembers: {
                ...state.projectMembers,
                currentFilters: {},
                filteredData: state.projectMembers.data
              }
            }),
            false,
            'clearMemberFilters'
          )
        },

        updateMemberPagination: (pagination: { page?: number; pageSize?: number }) => {
          set(
            (state) => ({
              ...state,
              projectMembers: {
                ...state.projectMembers,
                pagination: {
                  ...state.projectMembers.pagination,
                  ...pagination
                }
              }
            }),
            false,
            'updateMemberPagination'
          )
        },

        isMemberCacheValid: () => {
          const state = get()
          const { lastFetchTime, ttl } = state.projectMembers.cache
          if (!lastFetchTime) return false
          return Date.now() - lastFetchTime.getTime() < ttl
        },

        refreshMemberCache: () => {
          set(
            (state) => ({
              ...state,
              projectMembers: {
                ...state.projectMembers,
                cache: {
                  ...state.projectMembers.cache,
                  lastFetchTime: new Date()
                }
              }
            }),
            false,
            'refreshMemberCache'
          )
        },

        // ===== WBS 管理動作 =====
        loadWBSTree: (treeData: WBSItem[]) => {
          set(
            (state) => ({
              ...state,
              wbsManagement: {
                ...state.wbsManagement,
                treeData,
                loading: false,
                error: null,
                cache: {
                  ...state.wbsManagement.cache,
                  lastFetchTime: new Date()
                }
              }
            }),
            false,
            'loadWBSTree'
          )
        },

        toggleWBSNode: (nodeId: string) => {
          set(
            (state) => {
              const newExpandedNodes = new Set(state.wbsManagement.expandedNodes)
              if (newExpandedNodes.has(nodeId)) {
                newExpandedNodes.delete(nodeId)
              } else {
                newExpandedNodes.add(nodeId)
              }
              
              return {
                ...state,
                wbsManagement: {
                  ...state.wbsManagement,
                  expandedNodes: newExpandedNodes
                }
              }
            },
            false,
            'toggleWBSNode'
          )
        },

        selectWBSNode: (nodeId: string, multiSelect = false) => {
          set(
            (state) => {
              let newSelectedNodes = new Set<string>()
              
              if (multiSelect) {
                newSelectedNodes = new Set(state.wbsManagement.selectedNodes)
                if (newSelectedNodes.has(nodeId)) {
                  newSelectedNodes.delete(nodeId)
                } else {
                  newSelectedNodes.add(nodeId)
                }
              } else {
                newSelectedNodes.add(nodeId)
              }
              
              return {
                ...state,
                wbsManagement: {
                  ...state.wbsManagement,
                  selectedNodes: newSelectedNodes
                }
              }
            },
            false,
            'selectWBSNode'
          )
        },

        startWBSDrag: (nodeId: string) => {
          set(
            (state) => ({
              ...state,
              wbsManagement: {
                ...state.wbsManagement,
                dragState: {
                  isDragging: true,
                  draggedNode: nodeId,
                  dropTarget: null
                }
              }
            }),
            false,
            'startWBSDrag'
          )
        },

        setWBSDropTarget: (targetId: string) => {
          set(
            (state) => ({
              ...state,
              wbsManagement: {
                ...state.wbsManagement,
                dragState: {
                  ...state.wbsManagement.dragState,
                  dropTarget: targetId
                }
              }
            }),
            false,
            'setWBSDropTarget'
          )
        },

        endWBSDrag: () => {
          set(
            (state) => ({
              ...state,
              wbsManagement: {
                ...state.wbsManagement,
                dragState: {
                  isDragging: false,
                  draggedNode: null,
                  dropTarget: null
                }
              }
            }),
            false,
            'endWBSDrag'
          )
        },

        applyWBSFilters: (filters: WBSFilters) => {
          set(
            (state) => ({
              ...state,
              wbsManagement: {
                ...state.wbsManagement,
                currentFilters: filters
              }
            }),
            false,
            'applyWBSFilters'
          )
        },

        clearWBSFilters: () => {
          set(
            (state) => ({
              ...state,
              wbsManagement: {
                ...state.wbsManagement,
                currentFilters: {}
              }
            }),
            false,
            'clearWBSFilters'
          )
        },

        loadWBSStatistics: (statistics: WBSStatistics) => {
          set(
            (state) => ({
              ...state,
              wbsManagement: {
                ...state.wbsManagement,
                statistics
              }
            }),
            false,
            'loadWBSStatistics'
          )
        },

        setWBSViewMode: (mode: 'tree' | 'gantt' | 'kanban') => {
          set(
            (state) => ({
              ...state,
              wbsManagement: {
                ...state.wbsManagement,
                viewState: {
                  ...state.wbsManagement.viewState,
                  viewMode: mode
                }
              }
            }),
            false,
            'setWBSViewMode'
          )
        },

        toggleWBSShowCompleted: () => {
          set(
            (state) => ({
              ...state,
              wbsManagement: {
                ...state.wbsManagement,
                viewState: {
                  ...state.wbsManagement.viewState,
                  showCompleted: !state.wbsManagement.viewState.showCompleted
                }
              }
            }),
            false,
            'toggleWBSShowCompleted'
          )
        },

        toggleWBSFilterPanel: () => {
          set(
            (state) => ({
              ...state,
              wbsManagement: {
                ...state.wbsManagement,
                viewState: {
                  ...state.wbsManagement.viewState,
                  filterPanelOpen: !state.wbsManagement.viewState.filterPanelOpen
                }
              }
            }),
            false,
            'toggleWBSFilterPanel'
          )
        },

        setWBSLoading: (loading: boolean) => {
          set(
            (state) => ({
              ...state,
              wbsManagement: {
                ...state.wbsManagement,
                loading
              }
            }),
            false,
            'setWBSLoading'
          )
        },

        setWBSError: (error: string | null) => {
          set(
            (state) => ({
              ...state,
              wbsManagement: {
                ...state.wbsManagement,
                error,
                loading: false
              }
            }),
            false,
            'setWBSError'
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
          try {
            const state = JSON.parse(str)
            return {
              ...state,
              recentProjects: (state.recentProjects || []).map((project: any) => ({
                ...project,
                lastAccessTime: new Date(project.lastAccessTime),
              })),
            }
          } catch (error) {
            console.warn('Failed to parse stored state:', error)
            return {}
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
  const allProjects = useProjectScopeStore((state) => state.recentProjects)
  return React.useMemo(() => {
    return (allProjects || []).slice(0, limit)
  }, [allProjects, limit])
}

/**
 * 獲取收藏專案的 Hook
 */
export const useFavoriteProjects = () => {
  const favoriteProjectIds = useProjectScopeStore((state) => state.favoriteProjects)
  const toggleFavorite = useProjectScopeStore((state) => state.toggleProjectFavorite)
  const isFavorite = useProjectScopeStore((state) => state.isProjectFavorite)
  
  return React.useMemo(() => ({
    favoriteProjectIds,
    toggleFavorite,
    isFavorite,
  }), [favoriteProjectIds, toggleFavorite, isFavorite])
}

/**
 * 獲取使用者偏好的 Hook
 */
export const useUserPreferences = () => {
  const preferences = useProjectScopeStore((state) => state.userPreferences)
  const updatePreferences = useProjectScopeStore((state) => state.updateUserPreferences)
  const resetPreferences = useProjectScopeStore((state) => state.resetUserPreferences)
  
  return React.useMemo(() => ({
    preferences,
    updatePreferences,
    resetPreferences,
  }), [preferences, updatePreferences, resetPreferences])
}

// ==================== EXTENDED UTILITY HOOKS ====================

/**
 * 專案人員管理 Hook
 */
export const useProjectMembers = () => {
  const state = useProjectScopeStore()
  
  return {
    members: state.projectMembers?.data || [],
    filteredMembers: state.projectMembers?.filteredData || [],
    filters: state.projectMembers?.currentFilters || {},
    pagination: state.projectMembers?.pagination || { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    loading: state.projectMembers?.loading || false,
    error: state.projectMembers?.error || null,
    isCacheValid: state.isMemberCacheValid?.() || false,
    
    // 操作方法
    loadMembers: state.loadProjectMembers,
    setLoading: state.setProjectMembersLoading,
    setError: state.setProjectMembersError,
    applyFilters: state.applyMemberFilters,
    clearFilters: state.clearMemberFilters,
    updatePagination: state.updateMemberPagination,
    refreshCache: state.refreshMemberCache,
  }
}

/**
 * WBS 樹管理 Hook
 */
export const useWBSTree = () => {
  const state = useProjectScopeStore()
  
  return {
    treeData: state.wbsManagement?.treeData || [],
    expandedNodes: state.wbsManagement?.expandedNodes || new Set(),
    selectedNodes: state.wbsManagement?.selectedNodes || new Set(),
    dragState: state.wbsManagement?.dragState || { isDragging: false, draggedNode: null, dropTarget: null },
    viewState: state.wbsManagement?.viewState || { showCompleted: true, viewMode: 'tree', filterPanelOpen: false },
    filters: state.wbsManagement?.currentFilters || {},
    statistics: state.wbsManagement?.statistics || null,
    loading: state.wbsManagement?.loading || false,
    error: state.wbsManagement?.error || null,
    
    // 操作方法
    loadTree: state.loadWBSTree,
    toggleNode: state.toggleWBSNode,
    selectNode: state.selectWBSNode,
    startDrag: state.startWBSDrag,
    setDropTarget: state.setWBSDropTarget,
    endDrag: state.endWBSDrag,
    applyFilters: state.applyWBSFilters,
    clearFilters: state.clearWBSFilters,
    loadStatistics: state.loadWBSStatistics,
    setViewMode: state.setWBSViewMode,
    toggleShowCompleted: state.toggleWBSShowCompleted,
    toggleFilterPanel: state.toggleWBSFilterPanel,
    setLoading: state.setWBSLoading,
    setError: state.setWBSError,
  }
}

/**
 * 專案人員篩選 Hook
 */
export const useMemberFilters = () => {
  const state = useProjectScopeStore()
  
  return {
    filters: state.projectMembers?.currentFilters || {},
    applyFilters: state.applyMemberFilters,
    clearFilters: state.clearMemberFilters,
  }
}

/**
 * WBS 操作 Hook
 */
export const useWBSOperations = () => {
  const state = useProjectScopeStore()
  
  return {
    startDrag: state.startWBSDrag,
    setDropTarget: state.setWBSDropTarget,
    endDrag: state.endWBSDrag,
    setViewMode: state.setWBSViewMode,
    toggleShowCompleted: state.toggleWBSShowCompleted,
    toggleFilterPanel: state.toggleWBSFilterPanel,
  }
}