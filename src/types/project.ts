/**
 * Project Management System Type Definitions
 * 
 * This module contains comprehensive TypeScript type definitions for the project selection
 * and management functionality based on requirements US1 and US3.
 * 
 * @module ProjectTypes
 * @version 1.0
 * @date 2025-08-29
 */

// ==================== ENUMS ====================

/**
 * Project status enumeration representing the lifecycle stages of a project
 * 
 * @enum {string}
 */
export enum ProjectStatus {
  /** 專案正在規劃階段 */
  PLANNING = '規劃中',
  /** 專案正在執行中 */
  IN_PROGRESS = '進行中',
  /** 專案暫時停止 */
  PAUSED = '暫停',
  /** 專案已順利完成 */
  COMPLETED = '已完成',
  /** 專案已被取消 */
  CANCELLED = '已取消'
}

/**
 * Project type classification for different kinds of engineering projects
 * 
 * @enum {string}
 */
export enum ProjectType {
  /** 建築相關工程項目 */
  CONSTRUCTION = '建築工程',
  /** 基礎設施建設項目 */
  INFRASTRUCTURE = '基礎設施',
  /** 翻新改造工程 */
  RENOVATION = '翻新工程',
  /** 維護保養工程 */
  MAINTENANCE = '維護工程'
}

/**
 * View mode for displaying project lists
 * 
 * @enum {string}
 */
export enum ViewMode {
  /** 網格卡片模式 */
  GRID = 'grid',
  /** 表格列表模式 */
  TABLE = 'table'
}

/**
 * Project permission levels for access control
 * 
 * @enum {string}
 */
export enum PermissionLevel {
  /** 只能查看 */
  READ = 'read',
  /** 可以編輯 */
  WRITE = 'write',
  /** 完全管理權限 */
  ADMIN = 'admin'
}

// ==================== CORE INTERFACES ====================

/**
 * Team member information within a project
 * 
 * @interface ProjectMember
 */
export interface ProjectMember {
  /** 成員唯一識別ID */
  id: string
  /** 成員姓名 */
  name: string
  /** 成員職位 */
  role: string
  /** 成員部門 */
  department?: string
  /** 成員電子郵件 */
  email?: string
  /** 成員電話 */
  phone?: string
  /** 成員頭像URL */
  avatarUrl?: string
  /** 加入專案日期 */
  joinedAt: Date
}

/**
 * Project permission configuration for access control
 * 
 * @interface ProjectPermission
 */
export interface ProjectPermission {
  /** 用戶ID */
  userId: string
  /** 權限等級 */
  level: PermissionLevel
  /** 權限授予日期 */
  grantedAt: Date
  /** 權限授予者ID */
  grantedBy: string
  /** 權限到期日期（可選） */
  expiresAt?: Date
}

/**
 * Main project entity containing all project information
 * 
 * @interface Project
 */
export interface Project {
  // ===== Basic Information =====
  /** 專案唯一識別ID */
  id: string
  /** 專案代碼（如 F20P1, F22P4 等） */
  code: string
  /** 專案名稱 */
  name: string
  /** 專案描述 */
  description: string
  /** 專案狀態 */
  status: ProjectStatus
  /** 專案類型 */
  type: ProjectType
  /** 專案進度百分比 (0-100) */
  progress: number

  // ===== Date Information =====
  /** 計劃開始日期 */
  startDate: Date
  /** 計劃結束日期 */
  endDate: Date
  /** 實際開始日期 */
  actualStartDate?: Date
  /** 實際結束日期 */
  actualEndDate?: Date

  // ===== Personnel Information =====
  /** 專案經理ID */
  managerId: string
  /** 專案經理姓名 */
  managerName: string
  /** 專案團隊成員 */
  teamMembers: ProjectMember[]

  // ===== Financial Information =====
  /** 總預算金額 */
  totalBudget: number
  /** 已使用預算金額 */
  usedBudget: number
  /** 預算貨幣單位 */
  currency: string

  // ===== Progress Information =====
  /** 總里程碑數量 */
  totalMilestones: number
  /** 已完成里程碑數量 */
  completedMilestones: number

  // ===== Access Control =====
  /** 專案權限設定 */
  permissions: ProjectPermission[]
  /** 最後存取日期 */
  lastAccessDate?: Date

  // ===== Metadata =====
  /** 建立日期 */
  createdAt: Date
  /** 最後更新日期 */
  updatedAt: Date
  /** 專案縮圖URL */
  thumbnailUrl?: string
  /** 專案標籤 */
  tags: string[]
  /** 專案位置 */
  location?: string
  /** 專案客戶 */
  client?: string
  /** 專案備註 */
  notes?: string
}

// ==================== UTILITY INTERFACES ====================

/**
 * Project filtering options for search and filter functionality
 * 
 * @interface ProjectFilters
 */
export interface ProjectFilters {
  /** 搜尋關鍵字 */
  search?: string
  /** 專案狀態篩選 */
  status?: ProjectStatus[]
  /** 專案類型篩選 */
  type?: ProjectType[]
  /** 專案經理ID篩選 */
  managerId?: string
  /** 開始日期範圍篩選 */
  startDateRange?: {
    from: Date
    to: Date
  }
  /** 結束日期範圍篩選 */
  endDateRange?: {
    from: Date
    to: Date
  }
  /** 進度範圍篩選 */
  progressRange?: {
    min: number
    max: number
  }
  /** 標籤篩選 */
  tags?: string[]
  /** 預算範圍篩選 */
  budgetRange?: {
    min: number
    max: number
  }
}

/**
 * Project sorting configuration
 * 
 * @interface ProjectSort
 */
export interface ProjectSort {
  /** 排序欄位 */
  field: keyof Project
  /** 排序方向 */
  direction: 'asc' | 'desc'
}

/**
 * Pagination configuration for project lists
 * 
 * @interface ProjectPagination
 */
export interface ProjectPagination {
  /** 當前頁碼 */
  page: number
  /** 每頁資料筆數 */
  pageSize: number
  /** 總資料筆數 */
  total: number
  /** 總頁數 */
  totalPages: number
}

// ==================== API RESPONSE TYPES ====================

/**
 * Generic API response wrapper
 * 
 * @template T The type of data being returned
 * @interface ApiResponse
 */
export interface ApiResponse<T> {
  /** 請求是否成功 */
  success: boolean
  /** 回應資料 */
  data: T
  /** 錯誤訊息（如果有） */
  message?: string
  /** 錯誤代碼（如果有） */
  errorCode?: string
  /** 請求時間戳 */
  timestamp: Date
}

/**
 * Paginated API response for project lists
 * 
 * @interface ProjectListResponse
 */
export interface ProjectListResponse extends ApiResponse<Project[]> {
  /** 分頁資訊 */
  pagination: ProjectPagination
}

/**
 * Single project API response
 * 
 * @interface ProjectResponse
 */
export interface ProjectResponse extends ApiResponse<Project> {}

/**
 * Project statistics for dashboard display
 * 
 * @interface ProjectStatistics
 */
export interface ProjectStatistics {
  /** 總專案數量 */
  totalProjects: number
  /** 進行中專案數量 */
  activeProjects: number
  /** 已完成專案數量 */
  completedProjects: number
  /** 暫停專案數量 */
  pausedProjects: number
  /** 已取消專案數量 */
  cancelledProjects: number
  /** 平均專案進度 */
  averageProgress: number
  /** 總預算金額 */
  totalBudget: number
  /** 已使用預算金額 */
  usedBudget: number
  /** 預算使用率 */
  budgetUtilization: number
}

/**
 * Project dashboard summary information
 * 
 * @interface ProjectDashboard
 */
export interface ProjectDashboard {
  /** 統計資訊 */
  statistics: ProjectStatistics
  /** 最近更新的專案 */
  recentProjects: Project[]
  /** 即將到期的專案 */
  upcomingDeadlines: Project[]
  /** 需要關注的專案 */
  attentionRequired: Project[]
}

// ==================== COMPONENT PROPS TYPES ====================

/**
 * Props for ProjectCard component
 * 
 * @interface ProjectCardProps
 */
export interface ProjectCardProps {
  /** 專案資料 */
  project: Project
  /** 檢視模式 */
  viewMode: ViewMode
  /** 點擊事件處理 */
  onClick?: (project: Project) => void
  /** 是否顯示詳細資訊 */
  showDetails?: boolean
  /** 自定義類別名稱 */
  className?: string
}

/**
 * Props for ProjectList component
 * 
 * @interface ProjectListProps
 */
export interface ProjectListProps {
  /** 專案列表資料 */
  projects: Project[]
  /** 載入中狀態 */
  loading?: boolean
  /** 檢視模式 */
  viewMode: ViewMode
  /** 篩選條件 */
  filters?: ProjectFilters
  /** 排序設定 */
  sort?: ProjectSort
  /** 分頁設定 */
  pagination?: ProjectPagination
  /** 篩選變更事件 */
  onFiltersChange?: (filters: ProjectFilters) => void
  /** 排序變更事件 */
  onSortChange?: (sort: ProjectSort) => void
  /** 分頁變更事件 */
  onPaginationChange?: (pagination: ProjectPagination) => void
  /** 專案點擊事件 */
  onProjectClick?: (project: Project) => void
  /** 檢視模式變更事件 */
  onViewModeChange?: (mode: ViewMode) => void
}

// ==================== FORM TYPES ====================

/**
 * Project creation/update form data
 * 
 * @interface ProjectFormData
 */
export interface ProjectFormData {
  /** 專案代碼 */
  code: string
  /** 專案名稱 */
  name: string
  /** 專案描述 */
  description: string
  /** 專案類型 */
  type: ProjectType
  /** 計劃開始日期 */
  startDate: string
  /** 計劃結束日期 */
  endDate: string
  /** 專案經理ID */
  managerId: string
  /** 總預算 */
  totalBudget: number
  /** 預算貨幣 */
  currency: string
  /** 專案位置 */
  location?: string
  /** 專案客戶 */
  client?: string
  /** 專案標籤 */
  tags: string[]
  /** 專案備註 */
  notes?: string
}

/**
 * Validation errors for project form
 * 
 * @interface ProjectFormErrors
 */
export interface ProjectFormErrors {
  [key: string]: string[]
}

// ==================== TYPE GUARDS ====================

/**
 * Type guard to check if a value is a valid ProjectStatus
 * 
 * @param value The value to check
 * @returns True if the value is a valid ProjectStatus
 */
export function isProjectStatus(value: any): value is ProjectStatus {
  return Object.values(ProjectStatus).includes(value)
}

/**
 * Type guard to check if a value is a valid ProjectType
 * 
 * @param value The value to check
 * @returns True if the value is a valid ProjectType
 */
export function isProjectType(value: any): value is ProjectType {
  return Object.values(ProjectType).includes(value)
}

/**
 * Type guard to check if a value is a valid ViewMode
 * 
 * @param value The value to check
 * @returns True if the value is a valid ViewMode
 */
export function isViewMode(value: any): value is ViewMode {
  return Object.values(ViewMode).includes(value)
}

// ==================== CONSTANTS ====================

/**
 * Default values for project-related configurations
 */
export const PROJECT_CONSTANTS = {
  /** 預設分頁大小 */
  DEFAULT_PAGE_SIZE: 10,
  /** 最大分頁大小 */
  MAX_PAGE_SIZE: 100,
  /** 搜尋最小字元數 */
  MIN_SEARCH_LENGTH: 2,
  /** 預設貨幣 */
  DEFAULT_CURRENCY: 'TWD',
  /** 進度最小值 */
  MIN_PROGRESS: 0,
  /** 進度最大值 */
  MAX_PROGRESS: 100,
} as const

/**
 * Project status color mapping for UI display
 */
export const PROJECT_STATUS_COLORS = {
  [ProjectStatus.PLANNING]: 'gray',
  [ProjectStatus.IN_PROGRESS]: 'blue',
  [ProjectStatus.PAUSED]: 'yellow',
  [ProjectStatus.COMPLETED]: 'green',
  [ProjectStatus.CANCELLED]: 'red',
} as const

/**
 * Project type icon mapping for UI display
 */
export const PROJECT_TYPE_ICONS = {
  [ProjectType.CONSTRUCTION]: '🏗️',
  [ProjectType.INFRASTRUCTURE]: '🏢',
  [ProjectType.RENOVATION]: '🔨',
  [ProjectType.MAINTENANCE]: '🔧',
} as const