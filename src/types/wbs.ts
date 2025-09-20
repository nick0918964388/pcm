/**
 * WBS (Work Breakdown Structure) Type Definitions
 * 
 * This module contains comprehensive TypeScript type definitions for the WBS functionality
 * supporting hierarchical project structure management with unlimited nesting levels,
 * drag-and-drop operations, and comprehensive project tracking capabilities.
 * 
 * @module WBSTypes
 * @version 1.0
 * @date 2025-08-31
 */

// ==================== ENUMS ====================

/**
 * WBS item status enumeration representing the lifecycle stages of a WBS item
 * 
 * @enum {string}
 */
export enum WBSStatus {
  /** WBS項目待開始 */
  PENDING = 'pending',
  /** WBS項目正在規劃階段 */
  PLANNING = 'planning',
  /** WBS項目正在進行中 */
  IN_PROGRESS = 'in_progress',
  /** WBS項目已完成 */
  COMPLETED = 'completed',
  /** WBS項目暫停執行 */
  ON_HOLD = 'on_hold',
  /** WBS項目已取消 */
  CANCELLED = 'cancelled',
  /** WBS項目逾期 */
  OVERDUE = 'overdue'
}

/**
 * WBS item priority levels for task prioritization
 * 
 * @enum {string}
 */
export enum WBSPriority {
  /** 低優先級 */
  LOW = 'low',
  /** 中等優先級 */
  MEDIUM = 'medium',
  /** 高優先級 */
  HIGH = 'high',
  /** 關鍵優先級 */
  CRITICAL = 'critical'
}

/**
 * WBS tree operation types for drag-and-drop and structural modifications
 * 
 * @enum {string}
 */
export enum WBSOperationType {
  /** 移動到目標節點之前 */
  MOVE_BEFORE = 'move_before',
  /** 移動到目標節點之後 */
  MOVE_AFTER = 'move_after',
  /** 移動到目標節點內部作為子節點 */
  MOVE_INTO = 'move_into'
}

/**
 * WBS 資源類型枚舉
 * 
 * @enum {string}
 */
export enum WBSResourceType {
  /** 人力資源 */
  HUMAN = 'human',
  /** 設備 */
  EQUIPMENT = 'equipment',
  /** 材料 */
  MATERIAL = 'material',
  /** 服務 */
  SERVICE = 'service',
  /** 軟體 */
  SOFTWARE = 'software'
}

/**
 * WBS import/export format types
 * 
 * @enum {string}
 */
export enum WBSExportFormat {
  /** JSON格式 */
  JSON = 'json',
  /** CSV格式 */
  CSV = 'csv',
  /** Excel格式 */
  EXCEL = 'excel',
  /** Microsoft Project格式 */
  MSP = 'msp'
}

// ==================== CORE INTERFACES ====================

/**
 * Core WBS item interface defining the complete structure and properties
 * of a Work Breakdown Structure item with support for hierarchical organization
 * 
 * @interface WBSItem
 */
export interface WBSItem {
  /** 唯一標識符 */
  id: string
  
  /** 所屬專案ID */
  projectId: string
  
  /** 父節點ID（根節點為undefined） */
  parentId?: string
  
  /** 自動生成的WBS編碼（如：1.1.2） */
  code: string
  
  /** WBS項目名稱 */
  name: string
  
  /** WBS項目描述 */
  description?: string
  
  /** 樹狀層級（0-based，根節點為0） */
  level: number
  
  /** 同級排序權重（用於排序和拖拽操作） */
  order: number
  
  // ==================== 人員配置 ====================
  
  /** 負責人ID */
  assigneeId?: string
  
  /** 負責人ID列表 */
  assigneeIds: string[]
  
  /** 負責人姓名 */
  assigneeName?: string
  
  /** 審核人ID */
  reviewerId?: string
  
  /** 審核人姓名 */
  reviewerName?: string
  
  // ==================== 時間和工時管理 ====================
  
  /** 預估工時（小時） */
  estimatedHours?: number
  
  /** 實際工時（小時） */
  actualHours?: number
  
  /** 開始日期 */
  startDate?: Date
  
  /** 結束日期 */
  endDate?: Date
  
  /** 基準開始日期（用於比較進度） */
  baselineStartDate?: Date
  
  /** 基準結束日期（用於比較進度） */
  baselineEndDate?: Date
  
  // ==================== 狀態和進度追蹤 ====================
  
  /** WBS項目狀態 */
  status: WBSStatus
  
  /** 完成進度（0-100） */
  progress?: number
  
  /** 優先級 */
  priority: WBSPriority
  
  /** 是否為里程碑 */
  isMilestone: boolean
  
  /** 是否為關鍵路徑 */
  isCriticalPath?: boolean
  
  // ==================== 依賴關係 ====================
  
  /** 前置任務ID列表 */
  dependencies?: string[]
  
  /** 後續任務ID列表 */
  successors?: string[]
  
  /** 依賴類型（FS: Finish-to-Start, SS: Start-to-Start, FF: Finish-to-Finish, SF: Start-to-Finish） */
  dependencyTypes?: Record<string, 'FS' | 'SS' | 'FF' | 'SF'>
  
  // ==================== 成本管理 ====================
  
  /** 預算成本 */
  budgetCost?: number
  
  /** 實際成本 */
  actualCost?: number
  
  /** 貨幣單位 */
  currency?: string
  
  // ==================== 元數據 ====================
  
  /** 建立時間 */
  createdAt: Date
  
  /** 最後更新時間 */
  updatedAt: Date
  
  /** 建立者ID */
  createdBy: string
  
  /** 最後更新者ID */
  updatedBy: string
  
  /** 版本號（用於版本控制） */
  version: number
  
  /** 變更記錄摘要 */
  changeLog?: string
  
  // ==================== 樹狀結構屬性 ====================
  
  /** 子項目列表 */
  children?: WBSItem[]
  
  /** 是否包含子項目 */
  hasChildren?: boolean
  
  /** UI展開狀態 */
  isExpanded?: boolean
  
  /** 是否允許拖拽 */
  isDraggable?: boolean
  
  /** 是否允許作為拖拽目標 */
  isDroppable?: boolean
  
  // ==================== 自定義欄位 ====================
  
  /** 自定義屬性（支援擴展） */
  customFields?: Record<string, any>
  
  /** 標籤 */
  tags?: string[]
  
  /** 備註 */
  notes?: string
}

// ==================== TREE OPERATIONS ====================

/**
 * WBS tree operation interface for structural modifications
 * 
 * @interface WBSTreeOperations
 */
export interface WBSTreeOperations {
  /** 添加子項目 */
  addChild: (parentId: string, item: Omit<WBSItem, 'id' | 'level'>) => Promise<WBSItem>
  
  /** 移除子項目 */
  removeChild: (itemId: string) => Promise<void>
  
  /** 移動WBS項目 */
  moveItem: (itemId: string, newParentId: string, position?: number) => Promise<WBSItem>
  
  /** 更新項目 */
  updateItem: (itemId: string, updates: Partial<WBSItem>) => Promise<WBSItem>
  
  /** 獲取子項目 */
  getChildren: (parentId: string) => Promise<WBSItem[]>
  
  /** 獲取父項目 */
  getParent: (itemId: string) => Promise<WBSItem | null>
  
  /** 獲取路徑 */
  getPath: (itemId: string) => Promise<WBSItem[]>
  
  /** 驗證樹狀結構 */
  validateTree: (projectId: string) => Promise<WBSValidationResult>
  
  /** 複製WBS項目 */
  copyItem: (sourceId: string, targetId?: string) => Promise<WBSItem>
  
  /** 展開/摺疊節點 */
  toggleExpand: (itemId: string) => void
  
  /** 展開所有節點 */
  expandAll: () => void
  
  /** 摺疊所有節點 */
  collapseAll: () => void
  
  /** 展開到指定層級 */
  expandToLevel: (level: number) => void
  
  /** 重新計算層級和編碼 */
  recalculateHierarchy: (parentId?: string) => Promise<void>
  
  /** 驗證樹狀結構完整性 */
  validateTreeStructure: () => Promise<boolean>
  
  /** 查找路徑（從根到指定節點） */
  findPath: (itemId: string) => WBSItem[]
  
  /** 獲取所有祖先節點 */
  getAncestors: (itemId: string) => WBSItem[]
  
  /** 獲取所有後代節點 */
  getDescendants: (itemId: string) => WBSItem[]
  
  /** 獲取同級節點 */
  getSiblings: (itemId: string) => WBSItem[]
}

// ==================== FILTERING AND SEARCH ====================

/**
 * WBS filtering interface for advanced search and filtering capabilities
 * 
 * @interface WBSFilters
 */
export interface WBSFilters {
  /** 專案ID篩選 */
  projectId?: string
  
  /** 狀態篩選 */
  status?: WBSStatus[]
  
  /** 優先級篩選 */
  priority?: WBSPriority[]
  
  /** 負責人篩選 */
  assigneeId?: string[]
  
  /** 審核人篩選 */
  reviewerId?: string[]
  
  /** 關鍵字搜尋 */
  keyword?: string
  
  /** 日期範圍篩選 */
  dateRange?: {
    startDate?: Date
    endDate?: Date
  }
  
  /** 進度範圍篩選 */
  progressRange?: {
    min?: number
    max?: number
  }
  
  /** 工時範圍篩選 */
  hoursRange?: {
    estimated?: { min?: number; max?: number }
    actual?: { min?: number; max?: number }
  }
  
  /** 層級篩選 */
  levelRange?: {
    min?: number
    max?: number
  }
  
  /** 是否為里程碑 */
  isMilestone?: boolean
  
  /** 是否為關鍵路徑 */
  isCriticalPath?: boolean
  
  /** 標籤篩選 */
  tags?: string[]
  
  /** 自定義欄位篩選 */
  customFields?: Record<string, any>
  
  /** 是否包含子項目 */
  includeChildren?: boolean
  
  /** 排序設定 */
  sortBy?: {
    field: keyof WBSItem
    direction: 'asc' | 'desc'
  }[]
}

// ==================== IMPORT/EXPORT ====================

/**
 * WBS import/export format interface
 * 
 * @interface WBSImportExportFormat
 */
export interface WBSImportExportFormat {
  /** 匯出格式 */
  format: WBSExportFormat
  
  /** 是否包含子項目 */
  includeChildren?: boolean
  
  /** 匯出欄位選擇 */
  fields?: (keyof WBSItem)[]
  
  /** 匯出篩選條件 */
  filters?: WBSFilters
  
  /** 檔案名稱 */
  filename?: string
  
  /** 編碼格式 */
  encoding?: 'UTF-8' | 'UTF-16' | 'ASCII'
  
  /** CSV分隔符（僅CSV格式） */
  csvDelimiter?: ',' | ';' | '\t'
  
  /** 日期格式 */
  dateFormat?: string
  
  /** 匯出模板設定 */
  template?: {
    name: string
    description?: string
    customMapping?: Record<string, string>
  }
}

/**
 * WBS import validation result interface
 * 
 * @interface WBSImportValidation
 */
export interface WBSImportValidation {
  /** 是否驗證通過 */
  isValid: boolean
  
  /** 警告訊息 */
  warnings: {
    row: number
    field: string
    message: string
  }[]
  
  /** 錯誤訊息 */
  errors: {
    row: number
    field: string
    message: string
  }[]
  
  /** 總行數 */
  totalRows: number
  
  /** 有效行數 */
  validRows: number
  
  /** 預覽資料 */
  preview?: Partial<WBSItem>[]
}

// ==================== BATCH OPERATIONS ====================

/**
 * Batch update request interface for mass operations
 * 
 * @interface BatchUpdateWBSRequest
 */
export interface BatchUpdateWBSRequest {
  /** 目標項目ID列表 */
  itemIds: string[]
  
  /** 更新欄位 */
  updates: Partial<Pick<WBSItem, 
    'status' | 'priority' | 'assigneeId' | 'assigneeName' | 
    'reviewerId' | 'reviewerName' | 'estimatedHours' | 'actualHours' |
    'startDate' | 'endDate' | 'progress' | 'tags' | 'notes'
  >>
  
  /** 是否更新子項目 */
  updateChildren?: boolean
  
  /** 更新原因 */
  reason?: string
  
  /** 更新者ID */
  updatedBy: string
}

/**
 * Batch operation result interface
 * 
 * @interface BatchOperationResult
 */
export interface BatchOperationResult {
  /** 操作是否成功 */
  success: boolean
  
  /** 成功更新的項目數量 */
  successCount: number
  
  /** 失敗的項目數量 */
  failureCount: number
  
  /** 失敗的項目詳情 */
  failures: {
    itemId: string
    error: string
  }[]
  
  /** 操作摘要 */
  summary: string
  
  /** 操作時間 */
  timestamp: Date
}

// ==================== WBS STATISTICS ====================

/**
 * WBS statistics interface for project overview and reporting
 * 
 * @interface WBSStatistics
 */
export interface WBSStatistics {
  /** 總項目數 */
  totalItems: number
  
  /** 各狀態項目統計 */
  statusCounts: Record<WBSStatus, number>
  
  /** 各優先級項目統計 */
  priorityCounts: Record<WBSPriority, number>
  
  /** 總預估工時 */
  totalEstimatedHours: number
  
  /** 總實際工時 */
  totalActualHours: number
  
  /** 平均完成進度 */
  averageProgress: number
  
  /** 里程碑統計 */
  milestoneStats: {
    total: number
    completed: number
    overdue: number
  }
  
  /** 關鍵路徑統計 */
  criticalPathStats: {
    totalTasks: number
    completedTasks: number
    remainingHours: number
  }
  
  /** 層級分佈 */
  levelDistribution: Record<number, number>
  
  /** 負責人工作負載 */
  assigneeWorkload: {
    assigneeId: string
    assigneeName: string
    totalTasks: number
    completedTasks: number
    totalHours: number
  }[]
  
  /** 預算與成本統計 */
  costStats: {
    totalBudget: number
    totalActualCost: number
    costVariance: number
    costPerformanceIndex: number
  }
  
  /** 時程統計 */
  scheduleStats: {
    totalTasks: number
    onScheduleTasks: number
    delayedTasks: number
    averageDelay: number // 天數
  }
}

// ==================== API RESPONSE TYPES ====================

/**
 * Generic API response wrapper
 * 
 * @interface WBSApiResponse
 */
export interface WBSApiResponse<T> {
  /** 操作是否成功 */
  success: boolean
  
  /** 回應資料 */
  data?: T
  
  /** 錯誤訊息 */
  error?: string
  
  /** 錯誤代碼 */
  errorCode?: string
  
  /** 回應時間戳 */
  timestamp: Date
  
  /** 請求ID（用於追蹤） */
  requestId?: string
}

/**
 * WBS list response with pagination support
 * 
 * @interface WBSListResponse
 */
export interface WBSListResponse extends WBSApiResponse<WBSItem[]> {
  /** 分頁資訊 */
  pagination?: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
  
  /** 篩選後的總數 */
  filteredCount?: number
  
  /** 應用的篩選條件 */
  appliedFilters?: WBSFilters
}

// ==================== FORM DATA TYPES ====================

/**
 * WBS item form data for create/update operations
 * 
 * @interface WBSFormData
 */
export interface WBSFormData {
  /** WBS項目名稱 */
  name: string
  
  /** WBS項目描述 */
  description?: string
  
  /** 父節點ID */
  parentId?: string
  
  /** 負責人ID */
  assigneeId?: string
  
  /** 審核人ID */
  reviewerId?: string
  
  /** 預估工時 */
  estimatedHours?: number
  
  /** 開始日期 */
  startDate?: Date
  
  /** 結束日期 */
  endDate?: Date
  
  /** 狀態 */
  status: WBSStatus
  
  /** 優先級 */
  priority: WBSPriority
  
  /** 是否為里程碑 */
  isMilestone: boolean
  
  /** 前置任務 */
  dependencies?: string[]
  
  /** 預算成本 */
  budgetCost?: number
  
  /** 標籤 */
  tags?: string[]
  
  /** 備註 */
  notes?: string
  
  /** 自定義欄位 */
  customFields?: Record<string, any>
}

/**
 * WBS form validation errors
 * 
 * @interface WBSFormErrors
 */
export type WBSFormErrors = {
  /** 欄位錯誤 */
  [K in keyof WBSFormData]?: string
} & {
  /** 全域錯誤 */
  _global?: string
}

// ==================== COMPONENT PROPS ====================

/**
 * WBS tree component props interface
 * 
 * @interface WBSTreeProps
 */
export interface WBSTreeProps {
  /** WBS項目列表 */
  items: WBSItem[]
  
  /** 是否可編輯 */
  editable?: boolean
  
  /** 是否支援拖拽 */
  draggable?: boolean
  
  /** 選中的項目ID */
  selectedId?: string
  
  /** 展開的項目ID列表 */
  expandedIds?: string[]
  
  /** 項目選擇回調 */
  onSelect?: (item: WBSItem) => void
  
  /** 項目展開/摺疊回調 */
  onToggleExpand?: (itemId: string) => void
  
  /** 項目拖拽回調 */
  onMove?: (sourceId: string, targetId: string, operation: WBSOperationType) => void
  
  /** 項目編輯回調 */
  onEdit?: (item: WBSItem) => void
  
  /** 項目刪除回調 */
  onDelete?: (itemId: string) => void
  
  /** 新增項目回調 */
  onAdd?: (parentId?: string) => void
  
  /** 自定義渲染函數 */
  renderItem?: (item: WBSItem, level: number) => React.ReactNode
  
  /** 載入狀態 */
  loading?: boolean
  
  /** 錯誤狀態 */
  error?: string
  
  /** CSS類名 */
  className?: string
}

// ==================== UTILITY TYPES ====================

/**
 * WBS item creation input (excludes auto-generated fields)
 */
export type CreateWBSItemInput = Omit<WBSItem, 
  'id' | 'code' | 'level' | 'order' | 'createdAt' | 'updatedAt' | 'version' |
  'children' | 'hasChildren' | 'isExpanded'
>

/**
 * WBS item update input (partial with required id)
 */
export type UpdateWBSItemInput = Partial<Omit<WBSItem, 
  'id' | 'projectId' | 'createdAt' | 'createdBy' | 'children'
>> & {
  id: string
}

/**
 * Flattened WBS item for table display or export
 */
export type FlatWBSItem = Omit<WBSItem, 'children'> & {
  /** 路徑字串（如：Project > Phase1 > Task1） */
  path: string
  /** 縮排層級（用於表格顯示） */
  indent: number
}

/**
 * WBS template for creating predefined structures
 */
export interface WBSTemplate {
  /** 模板ID */
  id: string
  /** 模板名稱 */
  name: string
  /** 模板描述 */
  description?: string
  /** 適用專案類型 */
  projectType?: string[]
  /** 模板結構 */
  structure: Omit<CreateWBSItemInput, 'projectId'>[]
  /** 建立者 */
  createdBy: string
  /** 建立時間 */
  createdAt: Date
  /** 是否為公開模板 */
  isPublic: boolean
  /** 使用次數 */
  usageCount: number
  /** 標籤 */
  tags?: string[]
}

// ==================== 測試支援介面 ====================

/**
 * 日期範圍介面
 */
export interface DateRange {
  from: Date
  to: Date
}

/**
 * WBS 資源需求介面
 */
export interface WBSResourceRequirement {
  id: string
  wbsItemId: string
  resourceType: WBSResourceType
  name: string
  quantity: number
  unit: string
  estimatedCost: number
  actualCost: number
  requiredSkills?: string[]
  notes?: string
  isAllocated?: boolean
  allocatedTo?: string
}

/**
 * WBS 風險管理介面
 */
export interface WBSRisk {
  id: string
  wbsItemId: string
  title: string
  description: string
  probability: number
  impact: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  mitigation: string
  contingency?: string
  owner: string
  status: 'identified' | 'analyzing' | 'planning' | 'mitigating' | 'monitoring' | 'closed'
  identifiedAt: Date
  lastReviewAt: Date
  dueDate?: Date
}

/**
 * WBS 里程碑介面
 */
export interface WBSMilestone {
  id: string
  wbsItemId: string
  name: string
  description: string
  targetDate: Date
  actualDate?: Date
  status: 'pending' | 'achieved' | 'missed' | 'cancelled'
  criteria: string[]
  dependencies?: string[]
  importance: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * WBS 依賴關係介面
 */
export interface WBSDependency {
  id: string
  predecessorId: string
  successorId: string
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'
  lagDays?: number
  description?: string
}

/**
 * WBS 驗證規則介面
 */
export interface WBSValidationRule {
  field: keyof WBSItem
  type: 'required' | 'range' | 'pattern' | 'custom'
  min?: number
  max?: number
  pattern?: string
  customValidator?: (value: any) => boolean
  required: boolean
  message: string
}

/**
 * WBS 驗證錯誤介面
 */
export interface WBSValidationError {
  field: string
  message: string
}

/**
 * WBS 驗證結果介面
 */
export interface WBSValidationResult {
  isValid: boolean
  errors: WBSValidationError[]
}

/**
 * WBS 批次刪除請求介面
 */
export interface WBSBatchDeleteRequest {
  itemIds: string[]
  force: boolean
}

/**
 * WBS 批次更新請求介面
 */
export interface WBSBatchUpdateRequest {
  itemIds: string[]
  updates: Partial<Pick<WBSItem, 'status' | 'priority' | 'assigneeId' | 'startDate' | 'endDate'>>
}

/**
 * WBS 批次移動請求介面
 */
export interface WBSBatchMoveRequest {
  itemIds: string[]
  targetParentId: string
  insertPosition?: number
}

/**
 * WBS 批次操作介面
 */
export interface WBSBatchOperations {
  delete: (request: WBSBatchDeleteRequest) => Promise<WBSBatchResult>
  update: (request: WBSBatchUpdateRequest) => Promise<WBSBatchResult>
  move: (request: WBSBatchMoveRequest) => Promise<WBSBatchResult>
  export: (itemIds: string[], format: WBSImportExportFormat) => Promise<Blob>
  import: (file: File, format: WBSImportExportFormat) => Promise<WBSImportResult>
}

/**
 * WBS 批次結果介面
 */
export interface WBSBatchResult {
  success: boolean
  processedCount: number
  failedCount: number
  errors: Array<{
    itemId: string
    error: string
  }>
}

/**
 * WBS 匯入結果介面
 */
export interface WBSImportResult {
  success: boolean
  importedCount: number
  skippedCount: number
  errors: Array<{
    row: number
    error: string
  }>
  importedItems: WBSItem[]
}

// ==================== ADDITIONAL API INTERFACES ====================

/**
 * WBS 查詢結果介面
 */
export interface WBSQueryResult {
  items: WBSItem[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  statistics?: WBSStatistics
}

/**
 * 創建 WBS 項目輸入介面
 */
export interface CreateWBSItemInput {
  /** 項目名稱 */
  name: string
  /** 項目描述 */
  description?: string
  /** 父項目ID */
  parentId?: string
  /** 狀態 */
  status: WBSStatus
  /** 優先級 */
  priority: WBSPriority
  /** 負責人ID列表 */
  assigneeIds?: string[]
  /** 預估工時 */
  estimatedHours?: number
  /** 開始日期 */
  startDate?: Date
  /** 結束日期 */
  endDate?: Date
  /** 是否為里程碑 */
  isMilestone: boolean
  /** 標籤 */
  tags?: string[]
  /** 備註 */
  notes?: string
  /** 自定義欄位 */
  customFields?: Record<string, any>
}

/**
 * 更新 WBS 項目輸入介面
 */
export interface UpdateWBSItemInput {
  /** 項目名稱 */
  name?: string
  /** 項目描述 */
  description?: string
  /** 狀態 */
  status?: WBSStatus
  /** 優先級 */
  priority?: WBSPriority
  /** 負責人ID列表 */
  assigneeIds?: string[]
  /** 預估工時 */
  estimatedHours?: number
  /** 實際工時 */
  actualHours?: number
  /** 進度 */
  progress?: number
  /** 開始日期 */
  startDate?: Date
  /** 結束日期 */
  endDate?: Date
  /** 是否為里程碑 */
  isMilestone?: boolean
  /** 標籤 */
  tags?: string[]
  /** 備註 */
  notes?: string
  /** 自定義欄位 */
  customFields?: Record<string, any>
}