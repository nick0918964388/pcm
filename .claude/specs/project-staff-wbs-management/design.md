# 專案人員查詢與 WBS 項目設定功能設計文檔

## 1. 系統架構設計

### 1.1 整體架構

基於現有 PCM 系統架構，擴展專案範疇管理模組：

```
├── 前端層 (Frontend)
│   ├── Next.js 15.5.2 + React 19.1.0
│   ├── shadcn/ui + Tailwind CSS
│   └── TypeScript 5
├── 狀態管理層 (State Management)  
│   ├── Zustand Store (projectScopeStore 擴展)
│   ├── 本地持久化 (localStorage/sessionStorage)
│   └── 快取管理
├── 服務層 (Service Layer)
│   ├── API 客戶端 (基於現有 projectApi.ts)
│   ├── 業務邏輯處理
│   └── 錯誤處理與重試
└── 後端 API 層 (Backend API)
    ├── RESTful API 端點
    ├── 資料驗證與轉換  
    └── 權限檢查與審計
```

### 1.2 模組劃分

```typescript
// 專案人員查詢模組
src/modules/project-staff/
├── components/           // UI 組件
├── hooks/               // 自定義 hooks
├── services/            // API 服務
├── types/               // 類型定義
└── utils/               // 工具函數

// WBS 管理模組  
src/modules/wbs-management/
├── components/           // UI 組件
├── hooks/               // 自定義 hooks
├── services/            // API 服務
├── types/               // 類型定義
└── utils/               // 工具函數

// 共用組件
src/components/shared/
├── DataTable/           // 數據表格
├── SearchFilter/        // 搜索篩選
├── TreeView/           // 樹狀視圖
└── BatchOperations/    // 批量操作
```

## 2. 數據模型設計

### 2.1 專案人員數據模型

```typescript
// 擴展現有 ProjectMember 介面
interface ProjectMemberExtended extends ProjectMember {
  skills?: string[]            // 技能標籤
  workload?: number           // 目前工作負荷 (%)
  lastActiveAt?: Date         // 最後活躍時間
  preferences?: {             // 個人偏好設定
    timezone?: string
    language?: string
    notifications?: boolean
  }
  statistics?: {              // 統計數據
    totalWBSAssigned: number  // 負責的 WBS 項目數
    completedTasks: number    // 已完成任務數
    avgTaskDuration: number   // 平均任務時長
  }
}

// 查詢和篩選參數
interface ProjectMemberFilters {
  searchTerm?: string
  departments?: string[]
  roles?: string[]  
  permissions?: PermissionLevel[]
  skills?: string[]
  workloadRange?: {
    min: number
    max: number
  }
  activeInDays?: number       // 活躍天數篩選
  sortBy?: keyof ProjectMemberExtended
  sortDirection?: 'asc' | 'desc'
}
```

### 2.2 WBS 數據模型

```typescript
interface WBSItem {
  id: string
  projectId: string  
  parentId?: string
  code: string                // 自動生成編碼 (1.1.2)
  name: string
  description?: string
  level: number              // 樹狀層級 (0-based)
  order: number              // 同級排序權重
  
  // 人員配置
  assigneeId?: string        
  assigneeName?: string
  reviewerId?: string        // 審核人
  
  // 時間和工時
  estimatedHours?: number
  actualHours?: number
  startDate?: Date
  endDate?: Date
  
  // 狀態和進度
  status: WBSStatus
  progress?: number          // 完成進度 (0-100)
  priority: 'low' | 'medium' | 'high' | 'critical'
  
  // 依賴關係
  dependencies?: string[]    // 前置任務 ID 列表
  
  // 元數據
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
  version: number            // 版本控制
  
  // 樹狀結構
  children?: WBSItem[]       // 子項目
  hasChildren?: boolean      // 是否有子項目
  isExpanded?: boolean       // 展開狀態 (UI)
}

// WBS 樹狀操作
interface WBSTreeOperations {
  expandNode: (nodeId: string) => void
  collapseNode: (nodeId: string) => void
  moveNode: (sourceId: string, targetId: string, position: 'before' | 'after' | 'inside') => void
  reorderNodes: (nodeIds: string[], parentId?: string) => void
}
```

## 3. API 設計

### 3.1 擴展現有 ProjectApiService

基於現有的 `ProjectApiService` 類別，新增專案人員和 WBS 相關方法：

```typescript
// 擴展現有 ProjectApiService
export class ProjectApiServiceExtension {
  private projectApi: ProjectApiService
  
  constructor(projectApi: ProjectApiService) {
    this.projectApi = projectApi
  }
  
  // ==================== 專案人員 API ====================
  
  /**
   * 獲取專案成員列表
   * 繼承現有的分頁和篩選模式
   */
  async getProjectMembers(
    projectId: string,
    filters?: ProjectMemberFilters,
    pagination?: { page: number; pageSize: number }
  ): Promise<ApiResponse<ProjectMemberQueryResult>> {
    // 使用現有的查詢參數格式
    const queryParams: Record<string, any> = {}
    
    if (filters) {
      Object.assign(queryParams, {
        search: filters.searchTerm,
        departments: filters.departments?.join(','),
        roles: filters.roles?.join(','),
        permissions: filters.permissions?.join(','),
        sortBy: filters.sortBy,
        sortDirection: filters.sortDirection
      })
    }
    
    if (pagination) {
      queryParams.page = pagination.page
      queryParams.pageSize = pagination.pageSize
    }
    
    return this.projectApi.get<ApiResponse<ProjectMemberQueryResult>>(
      `/projects/${projectId}/members`,
      queryParams
    )
  }
  
  /**
   * 搜索專案成員
   * 使用現有的搜索模式
   */
  async searchProjectMembers(
    projectId: string, 
    query: string,
    limit: number = 10
  ): Promise<ApiResponse<ProjectMemberQueryResult>> {
    return this.getProjectMembers(
      projectId,
      { searchTerm: query },
      { page: 1, pageSize: limit }
    )
  }
  
  // ==================== WBS 管理 API ====================
  
  /**
   * 獲取 WBS 樹結構
   */
  async getWBSTree(projectId: string): Promise<ApiResponse<GetWBSTreeResponse>> {
    return this.projectApi.get<ApiResponse<GetWBSTreeResponse>>(
      `/projects/${projectId}/wbs`
    )
  }
  
  /**
   * 創建 WBS 節點
   */
  async createWBSNode(
    projectId: string, 
    nodeData: Partial<WBSItem>
  ): Promise<ApiResponse<WBSItem>> {
    return this.projectApi.post<ApiResponse<WBSItem>>(
      `/projects/${projectId}/wbs`,
      nodeData
    )
  }
  
  /**
   * 更新 WBS 節點
   */
  async updateWBSNode(
    projectId: string,
    nodeId: string,
    updates: Partial<WBSItem>
  ): Promise<ApiResponse<WBSItem>> {
    return this.projectApi.put<ApiResponse<WBSItem>>(
      `/projects/${projectId}/wbs/${nodeId}`,
      updates
    )
  }
  
  /**
   * 刪除 WBS 節點
   */
  async deleteWBSNode(
    projectId: string,
    nodeId: string
  ): Promise<ApiResponse<void>> {
    return this.projectApi.delete<ApiResponse<void>>(
      `/projects/${projectId}/wbs/${nodeId}`
    )
  }
  
  /**
   * 批量更新 WBS 節點
   * 使用現有的批量操作模式
   */
  async batchUpdateWBSNodes(
    projectId: string,
    request: BatchUpdateWBSRequest
  ): Promise<ApiResponse<WBSItem[]>> {
    return this.projectApi.post<ApiResponse<WBSItem[]>>(
      `/projects/${projectId}/wbs/batch-update`,
      request
    )
  }
  
  /**
   * WBS 節點重新排序
   */
  async reorderWBSNodes(
    projectId: string,
    operations: ReorderWBSRequest
  ): Promise<ApiResponse<WBSItem[]>> {
    return this.projectApi.post<ApiResponse<WBSItem[]>>(
      `/projects/${projectId}/wbs/reorder`,
      operations
    )
  }
}

// ==================== API 回應介面 ====================

// 使用現有的 ApiResponse<T> 格式
interface ProjectMemberQueryResult {
  members: ProjectMemberExtended[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  aggregations: {
    byDepartment: Record<string, number>
    byRole: Record<string, number>
    byPermission: Record<string, number>
    avgWorkload: number
  }
}

interface GetWBSTreeResponse {
  tree: WBSItem[]
  metadata: {
    totalNodes: number
    maxDepth: number
    lastModified: Date
    version: string
  }
}

interface ReorderWBSRequest {
  operations: Array<{
    nodeId: string
    newParentId?: string
    newOrder: number
  }>
}

interface BatchUpdateWBSRequest {
  nodeIds: string[]
  updates: Partial<WBSItem>
  updateType: 'merge' | 'replace'
}

// ==================== 服務整合 ====================

// 統一的 API 服務實例
export class ProjectStaffWBSApiService {
  private baseApi: ProjectApiService
  private extensionApi: ProjectApiServiceExtension
  
  constructor() {
    this.baseApi = new ProjectApiService()
    this.extensionApi = new ProjectApiServiceExtension(this.baseApi)
  }
  
  // 代理現有 API 方法
  get projects() {
    return {
      getProjects: this.baseApi.getProjects.bind(this.baseApi),
      getProjectById: this.baseApi.getProjectById.bind(this.baseApi),
      searchProjects: this.baseApi.searchProjects.bind(this.baseApi)
    }
  }
  
  // 新增的專案人員方法
  get members() {
    return {
      getProjectMembers: this.extensionApi.getProjectMembers.bind(this.extensionApi),
      searchProjectMembers: this.extensionApi.searchProjectMembers.bind(this.extensionApi)
    }
  }
  
  // 新增的 WBS 方法
  get wbs() {
    return {
      getWBSTree: this.extensionApi.getWBSTree.bind(this.extensionApi),
      createWBSNode: this.extensionApi.createWBSNode.bind(this.extensionApi),
      updateWBSNode: this.extensionApi.updateWBSNode.bind(this.extensionApi),
      deleteWBSNode: this.extensionApi.deleteWBSNode.bind(this.extensionApi),
      batchUpdateWBSNodes: this.extensionApi.batchUpdateWBSNodes.bind(this.extensionApi),
      reorderWBSNodes: this.extensionApi.reorderWBSNodes.bind(this.extensionApi)
    }
  }
  
  // 代理身份驗證方法
  setAuthToken(token: string): void {
    this.baseApi.setAuthToken(token)
  }
  
  removeAuthToken(): void {
    this.baseApi.removeAuthToken()
  }
}

// 匯出統一的 API 實例
export const projectStaffWBSApi = new ProjectStaffWBSApiService()
```

## 4. UI 組件架構

### 4.1 專案人員查詢組件

```typescript
// 主要組件結構
<ProjectMemberQuery>
  <SearchAndFilters>
    <SearchInput />
    <AdvancedFilters>
      <DepartmentFilter />
      <RoleFilter />
      <SkillsFilter />
      <WorkloadFilter />
    </AdvancedFilters>
  </SearchAndFilters>
  
  <ResultsView>
    <ViewToggle /> {/* 卡片/表格切換 */}
    <SortControls />
    
    {viewMode === 'cards' ? (
      <MemberCardGrid />
    ) : (
      <MemberDataTable />
    )}
    
    <Pagination />
  </ResultsView>
  
  <MemberDetailModal />
  <BatchEditModal />
</ProjectMemberQuery>
```

### 4.2 WBS 管理組件

```typescript
// WBS 樹狀結構組件
<WBSManager>
  <WBSToolbar>
    <AddNodeButton />
    <BatchOperations />
    <ViewOptions />
    <ExportButton />
  </WBSToolbar>
  
  <WBSTree>
    <VirtualizedTree>
      {nodes.map(node => (
        <WBSNode key={node.id}>
          <NodeContent>
            <NodeIcon />
            <NodeTitle />
            <NodeStatus />
            <NodeActions />
          </NodeContent>
          {node.children && (
            <NodeChildren>
              {/* 遞歸子節點 */}
            </NodeChildren>
          )}
        </WBSNode>
      ))}
    </VirtualizedTree>
  </WBSTree>
  
  <NodeEditModal />
  <DragPreview />
</WBSManager>
```

## 5. 狀態管理設計

### 5.1 Store 擴展

```typescript
// 擴展 projectScopeStore
interface ProjectScopeStoreExtension {
  // 專案人員狀態
  projectMembers: {
    data: ProjectMemberExtended[]
    filters: ProjectMemberFilters
    pagination: PaginationState
    loading: boolean
    error: string | null
  }
  
  // WBS 管理狀態  
  wbsManagement: {
    tree: WBSItem[]
    selectedNodes: string[]
    expandedNodes: Set<string>
    dragState: {
      isDragging: boolean
      draggedNode: string | null
      dropTarget: string | null
    }
    loading: boolean
    error: string | null
  }
  
  // 動作
  actions: {
    // 專案人員動作
    searchProjectMembers: (filters: ProjectMemberFilters) => Promise<void>
    updateMemberFilters: (filters: Partial<ProjectMemberFilters>) => void
    selectMember: (memberId: string) => void
    batchUpdateMembers: (memberIds: string[], updates: Partial<ProjectMemberExtended>) => Promise<void>
    
    // WBS 動作
    loadWBSTree: (projectId: string) => Promise<void>
    expandNode: (nodeId: string) => void
    collapseNode: (nodeId: string) => void
    selectNodes: (nodeIds: string[]) => void
    moveWBSNode: (sourceId: string, targetId: string, position: DropPosition) => Promise<void>
    updateWBSNode: (nodeId: string, updates: Partial<WBSItem>) => Promise<void>
    batchUpdateWBS: (nodeIds: string[], updates: Partial<WBSItem>) => Promise<void>
  }
}
```

### 5.2 資料快取策略

```typescript
// 智慧快取機制
interface CacheStrategy {
  // 成員資料快取 (5分鐘)
  projectMembers: {
    key: `members-${projectId}-${JSON.stringify(filters)}`
    ttl: 5 * 60 * 1000
    invalidateOn: ['member-updated', 'member-added', 'member-removed']
  }
  
  // WBS 樹快取 (10分鐘)  
  wbsTree: {
    key: `wbs-${projectId}`
    ttl: 10 * 60 * 1000
    invalidateOn: ['wbs-updated', 'wbs-reordered']
  }
  
  // 搜索建議快取 (30分鐘)
  searchSuggestions: {
    key: `suggestions-${projectId}`
    ttl: 30 * 60 * 1000
  }
}
```

## 6. 效能優化設計

### 6.1 虛擬化渲染

```typescript
// WBS 樹的虛擬化實現
interface VirtualTreeProps {
  nodes: WBSItem[]
  itemHeight: number
  containerHeight: number
  overscan?: number
}

// 使用 react-window 或 @tanstack/react-virtual
const VirtualWBSTree: React.FC<VirtualTreeProps> = ({
  nodes,
  itemHeight = 48,
  containerHeight,
  overscan = 5
}) => {
  const flattenedNodes = useMemo(() => 
    flattenTreeWithVisibility(nodes), [nodes])
  
  return (
    <FixedSizeList
      height={containerHeight}
      itemCount={flattenedNodes.length}
      itemSize={itemHeight}
      overscanCount={overscan}
      itemData={flattenedNodes}
    >
      {VirtualWBSNode}
    </FixedSizeList>
  )
}
```

### 6.2 延遲載入策略

```typescript
// 分層載入 WBS 節點
const useLazyWBSTree = (projectId: string, maxInitialDepth = 2) => {
  const [loadedLevels, setLoadedLevels] = useState<Set<number>>(new Set([0, 1, 2]))
  
  const loadNodeChildren = useCallback(async (nodeId: string, level: number) => {
    if (loadedLevels.has(level + 1)) return
    
    const children = await wbsApi.getNodeChildren(projectId, nodeId)
    // 更新 store 和載入狀態
    setLoadedLevels(prev => new Set([...prev, level + 1]))
  }, [projectId, loadedLevels])
  
  return { loadNodeChildren, loadedLevels }
}
```

### 6.3 搜索優化

```typescript
// 防抖搜索 Hook
const useDebounceSearch = (searchTerm: string, delay = 300) => {
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm)
    }, delay)
    
    return () => clearTimeout(timer)
  }, [searchTerm, delay])
  
  return debouncedTerm
}

// 預測性載入
const usePredictiveLoading = () => {
  const prefetchMemberDetails = useCallback((memberId: string) => {
    // 預載入使用者可能查看的成員詳情
    queryClient.prefetchQuery(['member-details', memberId], () =>
      memberApi.getMemberDetails(memberId)
    )
  }, [])
  
  return { prefetchMemberDetails }
}
```

## 6.4 錯誤處理和恢復策略

### 6.4.1 錯誤分類和處理

```typescript
// 統一錯誤處理架構
import { ApiError, NetworkError, ValidationError } from '@/services/projectApi'

// 錯誤類型分類
enum ErrorType {
  NETWORK = 'network',           // 網路錯誤
  API = 'api',                   // API 錯誤  
  VALIDATION = 'validation',     // 資料驗證錯誤
  PERMISSION = 'permission',     // 權限錯誤
  BUSINESS = 'business',         // 業務邏輯錯誤
  SYSTEM = 'system'             // 系統錯誤
}

// 錯誤嚴重程度
enum ErrorSeverity {
  LOW = 'low',                  // 可忽略的警告
  MEDIUM = 'medium',            // 需要處理但不阻塞
  HIGH = 'high',                // 嚴重錯誤，需要立即處理
  CRITICAL = 'critical'         // 系統性錯誤，可能影響整體功能
}

// 統一錯誤介面
interface AppError {
  type: ErrorType
  severity: ErrorSeverity
  message: string
  code?: string
  details?: any
  timestamp: Date
  userId?: string
  projectId?: string
  action?: string
}

// 錯誤處理策略配置
interface ErrorHandlingStrategy {
  // 網路錯誤處理
  networkErrors: {
    retry: boolean
    maxRetries: number
    backoffStrategy: 'linear' | 'exponential'
    showOfflineMode: boolean
  }
  
  // 驗證錯誤處理
  validationErrors: {
    showInline: boolean
    persistErrors: boolean
    autoFocus: boolean
  }
  
  // 系統錯誤處理
  systemErrors: {
    fallbackUI: boolean
    errorBoundary: boolean
    reportToService: boolean
  }
  
  // 權限錯誤處理
  permissionErrors: {
    redirectToAuth: boolean
    showPermissionRequest: boolean
  }
}

// 預設錯誤處理配置
const DEFAULT_ERROR_STRATEGY: ErrorHandlingStrategy = {
  networkErrors: {
    retry: true,
    maxRetries: 3,
    backoffStrategy: 'exponential',
    showOfflineMode: true
  },
  validationErrors: {
    showInline: true,
    persistErrors: false,
    autoFocus: true
  },
  systemErrors: {
    fallbackUI: true,
    errorBoundary: true,
    reportToService: true
  },
  permissionErrors: {
    redirectToAuth: false,
    showPermissionRequest: true
  }
}
```

### 6.4.2 錯誤處理 Hook

```typescript
// 統一錯誤處理 Hook
const useErrorHandler = () => {
  const [errors, setErrors] = useState<AppError[]>([])
  const { currentProject } = useProjectScopeStore()
  
  const handleError = useCallback((error: any, action?: string) => {
    const appError = normalizeError(error, action)
    
    // 記錄錯誤
    logError(appError)
    
    // 根據錯誤類型和嚴重程度決定處理策略
    switch (appError.type) {
      case ErrorType.NETWORK:
        handleNetworkError(appError)
        break
      case ErrorType.VALIDATION:
        handleValidationError(appError)
        break
      case ErrorType.PERMISSION:
        handlePermissionError(appError)
        break
      case ErrorType.SYSTEM:
        handleSystemError(appError)
        break
      default:
        handleGenericError(appError)
    }
    
    // 更新錯誤狀態
    setErrors(prev => [...prev, appError])
  }, [currentProject])
  
  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])
  
  const removeError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(err => err.code !== errorId))
  }, [])
  
  return {
    errors,
    handleError,
    clearErrors,
    removeError
  }
}

// 錯誤正規化函數
const normalizeError = (error: any, action?: string): AppError => {
  if (error instanceof ApiError) {
    return {
      type: ErrorType.API,
      severity: error.statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
      message: error.message,
      code: error.errorCode,
      details: error.details,
      timestamp: new Date(),
      action
    }
  }
  
  if (error instanceof NetworkError) {
    return {
      type: ErrorType.NETWORK,
      severity: ErrorSeverity.HIGH,
      message: error.message,
      details: error.originalError,
      timestamp: new Date(),
      action
    }
  }
  
  if (error instanceof ValidationError) {
    return {
      type: ErrorType.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      message: error.message,
      details: error.errors,
      timestamp: new Date(),
      action
    }
  }
  
  // 預設錯誤處理
  return {
    type: ErrorType.SYSTEM,
    severity: ErrorSeverity.HIGH,
    message: error.message || '發生未知錯誤',
    timestamp: new Date(),
    action
  }
}
```

### 6.4.3 特定業務錯誤處理

```typescript
// WBS 操作錯誤處理
const useWBSErrorHandler = () => {
  const { handleError } = useErrorHandler()
  
  const handleWBSError = useCallback((error: any, operation: string) => {
    // 特殊業務邏輯錯誤處理
    if (error.code === 'CIRCULAR_DEPENDENCY') {
      toast.error('無法建立循環依賴關係')
      return
    }
    
    if (error.code === 'MAX_DEPTH_EXCEEDED') {
      toast.error('WBS 層級深度已達上限')
      return
    }
    
    if (error.code === 'INVALID_WBS_CODE') {
      toast.error('WBS 編碼格式不正確')
      return
    }
    
    // 使用通用錯誤處理
    handleError(error, `WBS ${operation}`)
  }, [handleError])
  
  return { handleWBSError }
}

// 專案人員錯誤處理
const useProjectMemberErrorHandler = () => {
  const { handleError } = useErrorHandler()
  
  const handleMemberError = useCallback((error: any, operation: string) => {
    // 權限相關錯誤
    if (error.code === 'INSUFFICIENT_PERMISSIONS') {
      toast.error('權限不足，無法執行此操作')
      return
    }
    
    if (error.code === 'MEMBER_NOT_FOUND') {
      toast.error('找不到指定的專案成員')
      return
    }
    
    if (error.code === 'DUPLICATE_MEMBER') {
      toast.error('該成員已存在於專案中')
      return
    }
    
    // 使用通用錯誤處理
    handleError(error, `專案成員 ${operation}`)
  }, [handleError])
  
  return { handleMemberError }
}
```

### 6.4.4 錯誤邊界組件

```typescript
// React 錯誤邊界
class ProjectStaffWBSErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 記錄到錯誤追蹤服務
    console.error('專案人員WBS模組錯誤:', error, errorInfo)
    
    // 發送錯誤報告
    reportError({
      type: ErrorType.SYSTEM,
      severity: ErrorSeverity.CRITICAL,
      message: error.message,
      details: {
        stack: error.stack,
        componentStack: errorInfo.componentStack
      },
      timestamp: new Date()
    })
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">發生系統錯誤</h2>
          <p className="text-gray-600 text-center mb-4">
            專案人員或 WBS 模組遇到未預期的錯誤，請重新整理頁面或聯繫系統管理員。
          </p>
          <div className="flex space-x-3">
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
            >
              重新整理頁面
            </Button>
            <Button 
              onClick={() => this.setState({ hasError: false })}
              variant="default"
            >
              重試
            </Button>
          </div>
        </div>
      )
    }
    
    return this.props.children
  }
}
```

### 6.4.5 離線模式和恢復策略

```typescript
// 離線狀態管理
const useOfflineSupport = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingOperations, setPendingOperations] = useState<any[]>([])
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // 重新執行待處理的操作
      processPendingOperations()
    }
    
    const handleOffline = () => {
      setIsOnline(false)
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  const addPendingOperation = useCallback((operation: any) => {
    setPendingOperations(prev => [...prev, operation])
  }, [])
  
  const processPendingOperations = useCallback(async () => {
    for (const operation of pendingOperations) {
      try {
        await operation()
      } catch (error) {
        console.warn('待處理操作執行失敗:', error)
      }
    }
    setPendingOperations([])
  }, [pendingOperations])
  
  return {
    isOnline,
    addPendingOperation,
    pendingOperations: pendingOperations.length
  }
}
```

### 6.4.6 資料完整性檢查

```typescript
// 資料完整性驗證
const useDataIntegrityChecker = () => {
  const checkWBSIntegrity = useCallback((wbsTree: WBSItem[]): string[] => {
    const issues: string[] = []
    const nodeIds = new Set<string>()
    
    const validateNode = (node: WBSItem, parentId?: string) => {
      // 檢查重複 ID
      if (nodeIds.has(node.id)) {
        issues.push(`重複的 WBS 節點 ID: ${node.id}`)
      }
      nodeIds.add(node.id)
      
      // 檢查父子關係
      if (node.parentId !== parentId) {
        issues.push(`WBS 節點 ${node.id} 的父節點關係不一致`)
      }
      
      // 檢查 WBS 編碼格式
      if (!/^\d+(\.\d+)*$/.test(node.code)) {
        issues.push(`WBS 節點 ${node.id} 的編碼格式不正確: ${node.code}`)
      }
      
      // 檢查必填欄位
      if (!node.name.trim()) {
        issues.push(`WBS 節點 ${node.id} 缺少名稱`)
      }
      
      // 遞歸檢查子節點
      if (node.children) {
        node.children.forEach(child => validateNode(child, node.id))
      }
    }
    
    wbsTree.forEach(node => validateNode(node))
    return issues
  }, [])
  
  const checkMemberDataIntegrity = useCallback((members: ProjectMemberExtended[]): string[] => {
    const issues: string[] = []
    const memberIds = new Set<string>()
    
    members.forEach(member => {
      // 檢查重複 ID
      if (memberIds.has(member.id)) {
        issues.push(`重複的成員 ID: ${member.id}`)
      }
      memberIds.add(member.id)
      
      // 檢查必填欄位
      if (!member.name.trim()) {
        issues.push(`成員 ${member.id} 缺少姓名`)
      }
      
      if (!member.role.trim()) {
        issues.push(`成員 ${member.id} 缺少職位資訊`)
      }
      
      // 檢查 email 格式
      if (member.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
        issues.push(`成員 ${member.id} 的 email 格式不正確: ${member.email}`)
      }
    })
    
    return issues
  }, [])
  
  return {
    checkWBSIntegrity,
    checkMemberDataIntegrity
  }
}
```

## 7. 安全性實現方案

### 7.1 權限控制架構

```typescript
// 導入現有的權限系統
import { ProjectPermission } from '@/store/projectScopeStore'
import { PermissionLevel } from '@/types/project'

// 統一的權限檢查介面
interface WBSPermissionChecks {
  hasViewPermission: () => boolean
  hasEditPermission: () => boolean
  hasCreatePermission: () => boolean
  hasDeletePermission: () => boolean
  hasReorderPermission: () => boolean
  hasAssignPermission: () => boolean
  hasMemberViewPermission: () => boolean
  hasMemberManagePermission: () => boolean
}

// 權限檢查 Hook - 整合現有的 projectScopeStore
const useWBSPermissions = (): WBSPermissionChecks => {
  const { hasPermission, currentProjectPermission } = useProjectScopeStore()
  
  return useMemo(() => ({
    // 基礎檢視權限 - 所有角色都可以
    hasViewPermission: () => hasPermission(ProjectPermission.VIEWER),
    
    // 編輯權限 - EDITOR 以上
    hasEditPermission: () => hasPermission(ProjectPermission.EDITOR),
    
    // 建立權限 - EDITOR 以上  
    hasCreatePermission: () => hasPermission(ProjectPermission.EDITOR),
    
    // 刪除權限 - ADMIN 以上
    hasDeletePermission: () => hasPermission(ProjectPermission.ADMIN),
    
    // 重新排序權限 - EDITOR 以上
    hasReorderPermission: () => hasPermission(ProjectPermission.EDITOR),
    
    // 任務指派權限 - EDITOR 以上
    hasAssignPermission: () => hasPermission(ProjectPermission.EDITOR),
    
    // 成員檢視權限 - VIEWER 以上
    hasMemberViewPermission: () => hasPermission(ProjectPermission.VIEWER),
    
    // 成員管理權限 - ADMIN 以上
    hasMemberManagePermission: () => hasPermission(ProjectPermission.ADMIN)
  }), [hasPermission, currentProjectPermission])
}

// 權限等級對應表 (與現有系統一致)
const PERMISSION_HIERARCHY = {
  [ProjectPermission.VIEWER]: 1,
  [ProjectPermission.EDITOR]: 2, 
  [ProjectPermission.ADMIN]: 3,
  [ProjectPermission.SUPER_ADMIN]: 4
} as const

// 權限檢查工具函數
const hasMinimumPermission = (
  currentPermission: ProjectPermission,
  requiredPermission: ProjectPermission
): boolean => {
  return PERMISSION_HIERARCHY[currentPermission] >= PERMISSION_HIERARCHY[requiredPermission]
}
```

### 7.2 審計日誌設計

```typescript
interface AuditLogEntry {
  id: string
  projectId: string
  userId: string
  action: AuditAction
  resourceType: 'wbs' | 'member' | 'permission'
  resourceId: string
  changes?: {
    before: Record<string, any>
    after: Record<string, any>
  }
  metadata: {
    ipAddress: string
    userAgent: string
    timestamp: Date
  }
}

enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update', 
  DELETE = 'delete',
  MOVE = 'move',
  ASSIGN = 'assign',
  PERMISSION_CHANGE = 'permission_change'
}

// 審計日誌 Hook
const useAuditLogger = () => {
  const logAction = useCallback(async (entry: Omit<AuditLogEntry, 'id' | 'metadata'>) => {
    await auditApi.createLogEntry({
      ...entry,
      metadata: {
        ipAddress: await getClientIP(),
        userAgent: navigator.userAgent,
        timestamp: new Date()
      }
    })
  }, [])
  
  return { logAction }
}
```

## 8. 測試策略

### 8.1 測試金字塔

```
E2E Tests (10%)
├── 完整使用者流程測試
├── 跨瀏覽器相容性測試  
└── 效能回歸測試

Integration Tests (20%)
├── API 整合測試
├── Store 狀態管理測試
└── 組件協作測試

Unit Tests (70%)  
├── Hook 邏輯測試
├── 工具函數測試
├── 組件渲染測試
└── 業務邏輯測試
```

### 8.2 關鍵測試場景

```typescript
// WBS 樹操作測試
describe('WBS Tree Operations', () => {
  it('should handle drag and drop reordering', async () => {
    // 測試拖拽重排序邏輯
  })
  
  it('should validate circular dependency prevention', () => {
    // 測試循環依賴檢查
  })
  
  it('should handle large tree performance', () => {
    // 測試大量節點效能
  })
})

// 權限控制測試  
describe('Permission Controls', () => {
  it('should restrict actions based on user role', () => {
    // 測試基於角色的功能限制
  })
  
  it('should log audit trail for sensitive operations', () => {
    // 測試審計日誌記錄
  })
})
```

## 9. 部署和監控

### 9.1 部署策略

```typescript
// 功能開關配置
interface FeatureFlags {
  enableWBSManagement: boolean
  enableAdvancedMemberSearch: boolean  
  enableBatchOperations: boolean
  enableAuditLogging: boolean
}

// 段階式部署
const deploymentPhases = {
  alpha: {
    userPercentage: 5,
    features: ['enableWBSManagement']
  },
  beta: {
    userPercentage: 20, 
    features: ['enableWBSManagement', 'enableAdvancedMemberSearch']
  },
  production: {
    userPercentage: 100,
    features: 'all'
  }
}
```

### 9.2 效能監控

```typescript
// 效能指標追蹤
interface PerformanceMetrics {
  wbsTreeLoadTime: number      // WBS 樹載入時間
  memberSearchTime: number     // 成員搜索回應時間  
  dragDropLatency: number      // 拖拽操作延遲
  memoryUsage: number          // 記憶體使用量
  bundleSize: number           // 打包大小
}

// 監控 Hook
const usePerformanceMonitoring = () => {
  const trackMetric = useCallback((metric: keyof PerformanceMetrics, value: number) => {
    // 發送到監控服務 (如 DataDog, New Relic)
    analytics.track('performance_metric', {
      metric,
      value,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    })
  }, [])
  
  return { trackMetric }
}
```

## 10. 結論

此設計文檔提供了專案人員查詢與 WBS 項目設定功能的完整技術實現方案，確保：

- **技術一致性**: 與現有 PCM 系統架構保持一致
- **擴展性**: 模組化設計支援未來功能擴展  
- **效能優化**: 虛擬化和快取策略處理大量資料
- **安全可靠**: 完善的權限控制和審計機制
- **維護性**: 清晰的代碼組織和測試策略

下一階段將進入具體的任務分解和實現階段。