# Project Selection 功能技術設計文件

**版本:** 1.0  
**建立日期:** 2025-08-29  
**專案:** PCM 工程關鍵指標平台  

---

## 1. 概述

### 1.1 功能概述
專案選擇頁面是 PCM 平台的核心入口功能，為使用者登入後第一個看到的頁面。提供統一的專案導航入口，支援權限控制、搜尋篩選、響應式設計，確保使用者能快速找到並進入其有權限的專案。

### 1.2 核心價值
- **統一入口**: 作為所有專案的中央導航中心
- **權限控制**: 只顯示使用者有權限的專案
- **直觀瀏覽**: 提供多種視圖模式和篩選選項
- **響應式設計**: 支援各種裝置的最佳瀏覽體驗

### 1.3 用戶故事對應
- 作為使用者，我希望能看到我有權限的所有專案列表
- 作為使用者，我希望能搜尋和篩選專案
- 作為使用者，我希望能看到專案的關鍵資訊摘要
- 作為使用者，我希望能在不同裝置上都有良好的使用體驗
- 作為使用者，我希望能快速進入指定專案
- 作為使用者，我希望能看到專案的最新狀態和進度

## 2. 系統架構設計

### 2.1 整體架構

```mermaid
graph TB
    subgraph "前端層 (Frontend Layer)"
        A[專案選擇頁面]
        B[權限驗證中介軟體]
        C[狀態管理 - Zustand]
    end
    
    subgraph "元件層 (Component Layer)"
        D[ProjectCard 元件]
        E[ProjectTable 元件]
        F[SearchFilter 元件]
        G[ViewModeToggle 元件]
    end
    
    subgraph "服務層 (Service Layer)"
        H[專案 API 服務]
        I[權限 API 服務]
        J[使用者 API 服務]
    end
    
    subgraph "資料層 (Data Layer)"
        K[PostgreSQL 資料庫]
        L[Mock API 服務]
    end
    
    A --> B
    B --> C
    A --> D
    A --> E
    A --> F
    A --> G
    D --> H
    E --> H
    F --> H
    H --> I
    H --> J
    I --> K
    J --> K
    H --> L
    I --> L
    J --> L
```

### 2.2 資料流設計

```mermaid
sequenceDiagram
    participant U as 使用者
    participant P as 專案選擇頁面
    participant M as 權限中介軟體
    participant S as 狀態管理
    participant A as API 服務
    participant D as 資料庫/Mock API
    
    U->>P: 進入頁面
    P->>M: 檢查登入狀態
    M-->>P: 驗證通過
    P->>A: 請求使用者專案列表
    A->>D: 查詢權限專案
    D-->>A: 返回專案資料
    A-->>S: 更新專案狀態
    S-->>P: 觸發重新渲染
    P-->>U: 顯示專案列表
    
    U->>P: 搜尋/篩選操作
    P->>S: 更新篩選條件
    S->>A: 請求篩選後資料
    A->>D: 執行查詢
    D-->>A: 返回篩選結果
    A-->>S: 更新專案狀態
    S-->>P: 重新渲染列表
    P-->>U: 顯示篩選結果
```

## 3. 元件架構設計

### 3.1 元件層級結構

```mermaid
graph TD
    A[ProjectSelectionPage] --> B[SearchFilters]
    A --> C[ViewModeToggle]
    A --> D[ProjectGrid]
    A --> E[ProjectTable]
    
    B --> B1[SearchInput]
    B --> B2[StatusFilter]
    B --> B3[TypeFilter]
    B --> B4[DateRangeFilter]
    
    D --> D1[ProjectCard]
    D1 --> D2[StatCard - 重用]
    
    E --> E1[DataTable - 重用]
    
    subgraph "現有可重用元件"
        F[StatCard]
        G[DataTable]
        H[DashboardLayout]
        I[shadcn/ui 元件]
    end
    
    D2 -.-> F
    E1 -.-> G
    A -.-> H
    B1 -.-> I
    B2 -.-> I
    B3 -.-> I
    C -.-> I
```

### 3.2 重用現有元件策略

#### 3.2.1 StatCard 元件重用
```typescript
// 專案狀態卡片配置
const projectStatusCard: StatCardProps = {
  title: "專案進度",
  value: "85",
  unit: "%",
  color: "green", // 根據進度狀態動態設定
  subItems: [
    { label: "已完成里程碑", value: 12, unit: "個" },
    { label: "總里程碑", value: 15, unit: "個" }
  ]
}
```

#### 3.2.2 DataTable 元件重用
```typescript
// 專案列表表格配置
const projectTableColumns: Column<Project>[] = [
  { key: 'code', title: '專案代碼', sortable: true },
  { key: 'name', title: '專案名稱', sortable: true },
  { key: 'status', title: '狀態', render: (status) => <Badge variant={getStatusVariant(status)}>{status}</Badge> },
  { key: 'progress', title: '進度', render: (progress) => `${progress}%` },
  { key: 'manager', title: '專案經理', sortable: true },
  { key: 'startDate', title: '開始日期', sortable: true },
  { key: 'endDate', title: '預計完成', sortable: true }
]
```

## 4. 資料模型設計

### 4.1 核心資料結構

```typescript
// 專案基本資訊
interface Project {
  id: string
  code: string                    // 專案代碼 (F20P1, F22P4)
  name: string                    // 專案名稱
  description?: string            // 專案描述
  status: ProjectStatus           // 專案狀態
  type: ProjectType              // 專案類型
  progress: number               // 進度百分比 (0-100)
  
  // 日期資訊
  startDate: string              // 開始日期
  endDate: string                // 預計完成日期
  actualStartDate?: string       // 實際開始日期
  actualEndDate?: string         // 實際完成日期
  
  // 人員資訊
  managerId: string              // 專案經理 ID
  managerName: string            // 專案經理姓名
  teamMembers: ProjectMember[]   // 團隊成員
  
  // 統計資訊
  totalBudget?: number           // 總預算
  usedBudget?: number            // 已用預算
  totalMilestones: number        // 總里程碑數
  completedMilestones: number    // 已完成里程碑數
  
  // 權限和存取
  permissions: ProjectPermission // 使用者在此專案的權限
  lastAccessDate?: string        // 最後存取日期
  
  // 元資料
  createdAt: string
  updatedAt: string
  thumbnailUrl?: string          // 專案縮圖
  tags?: string[]               // 專案標籤
}

// 專案狀態枚舉
enum ProjectStatus {
  PLANNING = "規劃中",
  IN_PROGRESS = "進行中", 
  ON_HOLD = "暫停",
  COMPLETED = "已完成",
  CANCELLED = "已取消"
}

// 專案類型枚舉
enum ProjectType {
  CONSTRUCTION = "建築工程",
  INFRASTRUCTURE = "基礎設施",
  RENOVATION = "翻新工程",
  MAINTENANCE = "維護工程"
}

// 專案成員
interface ProjectMember {
  id: string
  name: string
  role: string
  email: string
  department: string
}

// 專案權限
interface ProjectPermission {
  canRead: boolean
  canWrite: boolean
  canManage: boolean
  canDelete: boolean
  modules: string[]             // 可存取的模組列表
}

// 篩選條件
interface ProjectFilters {
  search?: string               // 搜尋關鍵字
  status?: ProjectStatus[]      // 狀態篩選
  type?: ProjectType[]          // 類型篩選
  dateRange?: {
    start: string
    end: string
  }
  managerId?: string            // 專案經理篩選
  tags?: string[]               // 標籤篩選
}

// 檢視模式
enum ViewMode {
  GRID = "grid",               // 卡片網格檢視
  TABLE = "table"              // 表格檢視
}
```

### 4.2 資料庫設計

```sql
-- 專案表
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  actual_start_date DATE,
  actual_end_date DATE,
  
  manager_id UUID NOT NULL,
  total_budget DECIMAL(15,2),
  used_budget DECIMAL(15,2),
  total_milestones INTEGER DEFAULT 0,
  completed_milestones INTEGER DEFAULT 0,
  
  thumbnail_url TEXT,
  tags TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (manager_id) REFERENCES users(id)
);

-- 專案權限表
CREATE TABLE project_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  can_read BOOLEAN DEFAULT true,
  can_write BOOLEAN DEFAULT false,
  can_manage BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  modules TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(project_id, user_id)
);

-- 專案成員表
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role VARCHAR(100) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(project_id, user_id)
);

-- 專案存取記錄表 (用於追蹤最後存取時間)
CREATE TABLE project_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引優化
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_type ON projects(type);
CREATE INDEX idx_projects_manager ON projects(manager_id);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date);
CREATE INDEX idx_project_permissions_user ON project_permissions(user_id);
CREATE INDEX idx_project_access_logs_user_project ON project_access_logs(user_id, project_id);
```

## 5. API 設計

### 5.1 REST API 端點

```typescript
// 取得使用者有權限的專案列表
GET /api/projects
Query Parameters:
  - page?: number (預設: 1)
  - limit?: number (預設: 20)
  - search?: string
  - status?: ProjectStatus[]
  - type?: ProjectType[]
  - dateFrom?: string
  - dateTo?: string
  - sortBy?: string (預設: 'updatedAt')
  - sortOrder?: 'asc' | 'desc' (預設: 'desc')

Response: {
  data: Project[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  filters: {
    availableStatuses: ProjectStatus[]
    availableTypes: ProjectType[]
    availableManagers: { id: string, name: string }[]
  }
}

// 取得單一專案詳細資訊
GET /api/projects/:id
Response: Project

// 更新專案存取記錄
POST /api/projects/:id/access
Response: { success: boolean }

// 取得專案統計摘要
GET /api/projects/summary
Response: {
  totalProjects: number
  projectsByStatus: Record<ProjectStatus, number>
  projectsByType: Record<ProjectType, number>
  recentlyAccessed: Project[]
}
```

### 5.2 Mock API 實作

```typescript
// /src/mocks/projects.ts
import { http, HttpResponse } from 'msw'

// Mock 資料
const mockProjects: Project[] = [
  {
    id: '1',
    code: 'F20P1',
    name: '台北捷運信義線延伸工程',
    description: '捷運信義線從象山站延伸至貓空地區',
    status: ProjectStatus.IN_PROGRESS,
    type: ProjectType.INFRASTRUCTURE,
    progress: 65,
    startDate: '2024-01-15',
    endDate: '2025-12-31',
    managerId: 'mgr001',
    managerName: '王大明',
    totalMilestones: 15,
    completedMilestones: 10,
    permissions: {
      canRead: true,
      canWrite: true,
      canManage: false,
      canDelete: false,
      modules: ['schedule', 'quality', 'cost']
    }
  },
  // ... 更多 Mock 資料
]

export const projectHandlers = [
  // 取得專案列表
  http.get('/api/projects', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const search = url.searchParams.get('search')
    const status = url.searchParams.getAll('status')
    
    let filteredProjects = [...mockProjects]
    
    // 搜尋篩選
    if (search) {
      filteredProjects = filteredProjects.filter(p => 
        p.name.includes(search) || p.code.includes(search)
      )
    }
    
    // 狀態篩選
    if (status.length > 0) {
      filteredProjects = filteredProjects.filter(p => 
        status.includes(p.status)
      )
    }
    
    // 分頁
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedProjects = filteredProjects.slice(startIndex, endIndex)
    
    return HttpResponse.json({
      data: paginatedProjects,
      pagination: {
        total: filteredProjects.length,
        page,
        limit,
        totalPages: Math.ceil(filteredProjects.length / limit)
      }
    })
  }),
  
  // 取得單一專案
  http.get('/api/projects/:id', ({ params }) => {
    const project = mockProjects.find(p => p.id === params.id)
    if (!project) {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json(project)
  })
]
```

## 6. UI/UX 設計

### 6.1 設計系統規範

#### 6.1.1 色彩方案
```css
/* 主品牌色 - Cathay Pacific Green */
--brand-primary: #00645A;
--brand-primary-light: #008B7A;
--brand-primary-dark: #004A44;

/* 狀態色彩 */
--status-success: #10B981;  /* 已完成/正常 */
--status-warning: #F59E0B;  /* 警告/延遲 */
--status-danger: #EF4444;   /* 錯誤/取消 */
--status-info: #3B82F6;     /* 資訊/進行中 */
--status-neutral: #6B7280;  /* 暫停/規劃 */
```

#### 6.1.2 間距與尺寸
```css
/* 卡片設計 */
.project-card {
  @apply rounded-lg shadow-sm hover:shadow-md transition-shadow;
  @apply bg-white border border-gray-200;
  padding: 1.5rem;
  min-height: 280px;
}

/* 網格布局 */
.project-grid {
  @apply grid gap-6;
  @apply grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4;
}
```

### 6.2 響應式設計

```mermaid
graph LR
    A[Mobile <768px] --> A1[單欄布局<br/>卡片檢視<br/>簡化篩選]
    B[Tablet 768-1024px] --> B1[雙欄布局<br/>支援表格檢視<br/>側邊篩選]
    C[Desktop >1024px] --> C1[多欄布局<br/>完整功能<br/>進階篩選]
```

### 6.3 關鍵使用者介面

#### 6.3.1 專案卡片設計
```typescript
const ProjectCard: React.FC<{ project: Project }> = ({ project }) => {
  return (
    <Card className="project-card hover:border-brand-primary transition-colors">
      {/* 專案標頭 */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <Badge variant="secondary">{project.code}</Badge>
          <h3 className="font-semibold text-lg mt-2">{project.name}</h3>
        </div>
        <Badge variant={getStatusVariant(project.status)}>
          {project.status}
        </Badge>
      </div>
      
      {/* 進度資訊 - 重用 StatCard 概念 */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>專案進度</span>
          <span>{project.progress}%</span>
        </div>
        <Progress value={project.progress} className="h-2" />
      </div>
      
      {/* 關鍵資訊 */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">專案經理</span>
          <span>{project.managerName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">預計完成</span>
          <span>{formatDate(project.endDate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">里程碑</span>
          <span>{project.completedMilestones}/{project.totalMilestones}</span>
        </div>
      </div>
      
      {/* 操作按鈕 */}
      <div className="mt-6 flex justify-end">
        <Button 
          onClick={() => navigateToProject(project.id)}
          className="w-full bg-brand-primary hover:bg-brand-primary-dark"
        >
          進入專案
        </Button>
      </div>
    </Card>
  )
}
```

## 7. 狀態管理設計

### 7.1 Zustand Store 結構

```typescript
// /src/store/projectStore.ts
interface ProjectStore {
  // 狀態
  projects: Project[]
  currentProject: Project | null
  loading: boolean
  error: string | null
  filters: ProjectFilters
  viewMode: ViewMode
  pagination: {
    current: number
    pageSize: number
    total: number
  }
  
  // Actions
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  removeProject: (id: string) => void
  setCurrentProject: (project: Project | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setFilters: (filters: Partial<ProjectFilters>) => void
  resetFilters: () => void
  setViewMode: (mode: ViewMode) => void
  setPagination: (pagination: Partial<ProjectStore['pagination']>) => void
  
  // 非同步操作
  fetchProjects: () => Promise<void>
  fetchProjectById: (id: string) => Promise<void>
  searchProjects: (query: string) => Promise<void>
  applyFilters: () => Promise<void>
}

const useProjectStore = create<ProjectStore>((set, get) => ({
  // 初始狀態
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  filters: {},
  viewMode: ViewMode.GRID,
  pagination: {
    current: 1,
    pageSize: 20,
    total: 0
  },
  
  // 同步操作
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (currentProject) => set({ currentProject }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setFilters: (filters) => set(state => ({ 
    filters: { ...state.filters, ...filters } 
  })),
  resetFilters: () => set({ filters: {} }),
  setViewMode: (viewMode) => set({ viewMode }),
  setPagination: (pagination) => set(state => ({
    pagination: { ...state.pagination, ...pagination }
  })),
  
  // 非同步操作
  fetchProjects: async () => {
    const { filters, pagination } = get()
    set({ loading: true, error: null })
    
    try {
      const response = await projectApi.getProjects({
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters
      })
      
      set({
        projects: response.data,
        pagination: { ...pagination, total: response.pagination.total },
        loading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '載入專案失敗',
        loading: false
      })
    }
  },
  
  searchProjects: async (query: string) => {
    set({ filters: { search: query }, pagination: { ...get().pagination, current: 1 } })
    await get().fetchProjects()
  },
  
  applyFilters: async () => {
    set({ pagination: { ...get().pagination, current: 1 } })
    await get().fetchProjects()
  }
}))
```

### 7.2 自定義 Hooks

```typescript
// /src/hooks/useProjects.ts
export const useProjects = () => {
  const store = useProjectStore()
  
  // 載入專案列表
  const loadProjects = useCallback(async () => {
    await store.fetchProjects()
  }, [store.fetchProjects])
  
  // 搜尋專案
  const searchProjects = useCallback(async (query: string) => {
    await store.searchProjects(query)
  }, [store.searchProjects])
  
  // 應用篩選條件
  const applyFilters = useCallback(async (filters: Partial<ProjectFilters>) => {
    store.setFilters(filters)
    await store.applyFilters()
  }, [store.setFilters, store.applyFilters])
  
  // 切換檢視模式
  const toggleViewMode = useCallback(() => {
    const newMode = store.viewMode === ViewMode.GRID ? ViewMode.TABLE : ViewMode.GRID
    store.setViewMode(newMode)
  }, [store.viewMode, store.setViewMode])
  
  // 分頁操作
  const changePage = useCallback(async (page: number, pageSize?: number) => {
    store.setPagination({ current: page, ...(pageSize && { pageSize }) })
    await store.fetchProjects()
  }, [store.setPagination, store.fetchProjects])
  
  return {
    projects: store.projects,
    loading: store.loading,
    error: store.error,
    filters: store.filters,
    viewMode: store.viewMode,
    pagination: store.pagination,
    
    loadProjects,
    searchProjects,
    applyFilters,
    toggleViewMode,
    changePage,
    resetFilters: store.resetFilters
  }
}
```

## 8. 錯誤處理與邊界情況

### 8.1 錯誤處理策略

```typescript
// 錯誤類型定義
enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

// 錯誤處理元件
const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [error, setError] = useState<Error | null>(null)
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            系統發生錯誤
          </h2>
          <p className="text-gray-600 mb-6">
            {error.message}
          </p>
          <Button onClick={() => setError(null)}>
            重新載入
          </Button>
        </div>
      </div>
    )
  }
  
  return <>{children}</>
}

// API 錯誤處理
const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    // 網路錯誤
    if (error.message.includes('NetworkError')) {
      return '網路連線問題，請檢查網路設定'
    }
    
    // 權限錯誤
    if (error.message.includes('401') || error.message.includes('403')) {
      return '權限不足，請聯絡系統管理員'
    }
    
    // 伺服器錯誤
    if (error.message.includes('500')) {
      return '伺服器錯誤，請稍後再試'
    }
    
    return error.message
  }
  
  return '未知錯誤，請聯絡技術支援'
}
```

### 8.2 載入狀態處理

```typescript
// 載入狀態元件
const LoadingState: React.FC<{ mode: ViewMode }> = ({ mode }) => {
  if (mode === ViewMode.GRID) {
    return (
      <div className="project-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="project-card animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-20 mb-4"></div>
            <div className="h-6 bg-gray-300 rounded w-full mb-4"></div>
            <div className="h-2 bg-gray-300 rounded w-full mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 rounded w-full"></div>
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="animate-pulse">
        <div className="h-12 bg-gray-300 rounded-t-lg mb-4"></div>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex space-x-4 p-4 border-b">
            <div className="h-4 bg-gray-300 rounded flex-1"></div>
            <div className="h-4 bg-gray-300 rounded w-20"></div>
            <div className="h-4 bg-gray-300 rounded w-16"></div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 8.3 空狀態處理

```typescript
const EmptyState: React.FC<{ 
  filters: ProjectFilters;
  onResetFilters: () => void;
}> = ({ filters, onResetFilters }) => {
  const hasFilters = Object.keys(filters).some(key => 
    filters[key as keyof ProjectFilters] !== undefined
  )
  
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">📋</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {hasFilters ? '找不到符合條件的專案' : '尚無可用專案'}
      </h3>
      <p className="text-gray-600 mb-6">
        {hasFilters 
          ? '請調整篩選條件或聯絡管理員新增專案權限'
          : '請聯絡系統管理員為您分配專案權限'
        }
      </p>
      {hasFilters && (
        <Button variant="outline" onClick={onResetFilters}>
          重置篩選條件
        </Button>
      )}
    </div>
  )
}
```

## 9. 測試策略

### 9.1 單元測試

```typescript
// /src/components/__tests__/ProjectCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectCard } from '../ProjectCard'
import { mockProjects } from '../../mocks/projects'

describe('ProjectCard', () => {
  const mockProject = mockProjects[0]
  
  it('顯示專案基本資訊', () => {
    render(<ProjectCard project={mockProject} />)
    
    expect(screen.getByText(mockProject.code)).toBeInTheDocument()
    expect(screen.getByText(mockProject.name)).toBeInTheDocument()
    expect(screen.getByText(mockProject.status)).toBeInTheDocument()
    expect(screen.getByText(`${mockProject.progress}%`)).toBeInTheDocument()
  })
  
  it('點擊進入專案按鈕時正確導航', () => {
    const mockNavigate = jest.fn()
    render(<ProjectCard project={mockProject} onNavigate={mockNavigate} />)
    
    fireEvent.click(screen.getByText('進入專案'))
    expect(mockNavigate).toHaveBeenCalledWith(mockProject.id)
  })
})
```

### 9.2 整合測試

```typescript
// /src/pages/__tests__/ProjectSelectionPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectSelectionPage } from '../ProjectSelectionPage'
import { server } from '../../mocks/server'

describe('ProjectSelectionPage', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())
  
  it('載入並顯示專案列表', async () => {
    render(<ProjectSelectionPage />)
    
    expect(screen.getByText('載入中...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('F20P1')).toBeInTheDocument()
      expect(screen.getByText('F22P4')).toBeInTheDocument()
    })
  })
  
  it('搜尋功能正常運作', async () => {
    const user = userEvent.setup()
    render(<ProjectSelectionPage />)
    
    await waitFor(() => {
      expect(screen.getByText('F20P1')).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText('搜尋專案...')
    await user.type(searchInput, 'F20P1')
    
    await waitFor(() => {
      expect(screen.getByText('F20P1')).toBeInTheDocument()
      expect(screen.queryByText('F22P4')).not.toBeInTheDocument()
    })
  })
})
```

### 9.3 E2E 測試

```typescript
// /cypress/integration/project-selection.spec.ts
describe('專案選擇功能', () => {
  beforeEach(() => {
    cy.login('testuser@example.com')
    cy.visit('/projects')
  })
  
  it('使用者可以瀏覽專案列表', () => {
    cy.get('[data-testid=project-card]').should('have.length.at.least', 1)
    cy.contains('F20P1').should('be.visible')
  })
  
  it('使用者可以搜尋專案', () => {
    cy.get('[data-testid=search-input]').type('F20P1')
    cy.get('[data-testid=project-card]').should('have.length', 1)
    cy.contains('F20P1').should('be.visible')
  })
  
  it('使用者可以切換檢視模式', () => {
    cy.get('[data-testid=view-toggle]').click()
    cy.get('[data-testid=project-table]').should('be.visible')
    cy.get('[data-testid=project-grid]').should('not.exist')
  })
  
  it('使用者可以進入專案', () => {
    cy.get('[data-testid=project-card]').first().within(() => {
      cy.get('button').contains('進入專案').click()
    })
    cy.url().should('match', /\/projects\/[^\/]+\/dashboard/)
  })
})
```

## 10. 效能優化

### 10.1 前端優化策略

```typescript
// 虛擬滾動 - 大量專案列表優化
import { FixedSizeList as List } from 'react-window'

const VirtualProjectGrid: React.FC<{ projects: Project[] }> = ({ projects }) => {
  const itemsPerRow = 4
  const itemHeight = 320
  const itemWidth = 300
  
  const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => {
    const startIndex = index * itemsPerRow
    const endIndex = Math.min(startIndex + itemsPerRow, projects.length)
    const rowProjects = projects.slice(startIndex, endIndex)
    
    return (
      <div style={style} className="flex space-x-6 px-6">
        {rowProjects.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    )
  }
  
  return (
    <List
      height={600}
      itemCount={Math.ceil(projects.length / itemsPerRow)}
      itemSize={itemHeight}
      itemData={projects}
    >
      {Row}
    </List>
  )
}

// 記憶化元件
const MemoizedProjectCard = React.memo(ProjectCard, (prevProps, nextProps) => {
  return prevProps.project.id === nextProps.project.id &&
         prevProps.project.updatedAt === nextProps.project.updatedAt
})

// 防抖搜尋
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value)
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  
  return debouncedValue
}
```

### 10.2 資料載入優化

```typescript
// SWR 快取策略
import useSWR from 'swr'

const useProjectsWithCache = (filters: ProjectFilters) => {
  const cacheKey = ['projects', filters]
  
  const { data, error, mutate } = useSWR(
    cacheKey,
    () => projectApi.getProjects(filters),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // 5秒內相同請求去重
      staleTime: 30000,       // 30秒內資料視為新鮮
    }
  )
  
  return {
    projects: data?.data || [],
    pagination: data?.pagination,
    loading: !error && !data,
    error,
    refresh: mutate
  }
}

// 預載入策略
const useProjectPreload = () => {
  const router = useRouter()
  
  const preloadProject = useCallback((projectId: string) => {
    // 預載入專案詳細資料
    router.prefetch(`/projects/${projectId}/dashboard`)
    
    // 預載入 API 資料
    mutate(['project', projectId], projectApi.getProjectById(projectId))
  }, [router])
  
  return { preloadProject }
}
```

## 11. 安全性考量

### 11.1 權限驗證

```typescript
// 權限檢查 Hook
const useProjectPermission = (projectId: string) => {
  const { data: permissions, loading } = useSWR(
    ['permissions', projectId],
    () => permissionApi.getProjectPermissions(projectId)
  )
  
  const hasPermission = useCallback((action: string) => {
    if (!permissions) return false
    
    switch (action) {
      case 'read':
        return permissions.canRead
      case 'write':
        return permissions.canWrite
      case 'manage':
        return permissions.canManage
      case 'delete':
        return permissions.canDelete
      default:
        return false
    }
  }, [permissions])
  
  return { permissions, hasPermission, loading }
}

// 路由守衛中介軟體
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!)
    
    // 檢查 token 是否即將過期
    const now = Date.now() / 1000
    if (payload.exp - now < 300) { // 5分鐘內過期
      // 重新整理 token
      const newToken = jwt.sign(
        { userId: payload.userId },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      )
      
      const response = NextResponse.next()
      response.cookies.set('auth-token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 // 24 hours
      })
      
      return response
    }
    
    return NextResponse.next()
  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

### 11.2 資料驗證

```typescript
// Zod 資料驗證
import { z } from 'zod'

const ProjectFilterSchema = z.object({
  search: z.string().optional(),
  status: z.array(z.enum(['規劃中', '進行中', '暫停', '已完成', '已取消'])).optional(),
  type: z.array(z.enum(['建築工程', '基礎設施', '翻新工程', '維護工程'])).optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional()
})

const validateFilters = (filters: unknown): ProjectFilters => {
  try {
    return ProjectFilterSchema.parse(filters)
  } catch (error) {
    throw new Error('篩選條件格式不正確')
  }
}

// XSS 防護
import DOMPurify from 'isomorphic-dompurify'

const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  })
}
```

## 12. 部署與維護

### 12.1 檔案結構

```plaintext
/src/app/projects/
├── page.tsx                    # 專案選擇主頁面
├── loading.tsx                 # 載入狀態頁面
├── error.tsx                   # 錯誤頁面
└── components/
    ├── ProjectCard.tsx         # 專案卡片元件
    ├── ProjectGrid.tsx         # 專案網格檢視
    ├── ProjectTable.tsx        # 專案表格檢視
    ├── SearchFilters.tsx       # 搜尋篩選元件
    ├── ViewModeToggle.tsx      # 檢視模式切換
    └── EmptyState.tsx          # 空狀態元件

/src/hooks/
├── useProjects.ts              # 專案相關 Hook
├── useProjectPermission.ts     # 權限檢查 Hook
└── useDebounce.ts             # 防抖 Hook

/src/services/
├── projectApi.ts               # 專案 API 服務
├── permissionApi.ts            # 權限 API 服務
└── types.ts                    # 型別定義

/src/store/
├── projectStore.ts             # 專案狀態管理
└── index.ts                    # Store 匯出

/src/mocks/
├── projects.ts                 # 專案 Mock 資料
├── handlers.ts                 # MSW 處理器
└── server.ts                   # Mock 伺服器設定
```

### 12.2 環境變數配置

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_ENV=development
JWT_SECRET=your-super-secret-jwt-key
DATABASE_URL=postgresql://user:password@localhost:5432/pcm_db
```

### 12.3 建置和部署

```bash
# 開發環境啟動
npm run dev

# 生產建置
npm run build
npm run start

# 測試
npm run test
npm run test:e2e

# 型別檢查
npm run type-check

# 程式碼品質檢查
npm run lint
npm run lint:fix
```

---

## 總結

此設計文件詳細規劃了 PCM 平台的專案選擇功能，充分重用了現有的 StatCard、DataTable、DashboardLayout 等元件，遵循 shadcn/ui 設計系統，並採用 Zustand 進行狀態管理。設計考慮了權限控制、響應式介面、效能優化、安全性等各個面向，為後續開發提供了完整的技術規範。

**重點特色:**
- 充分重用現有元件系統
- 響應式設計支援各種裝置
- 完整的權限控制機制
- 高效的狀態管理和資料快取
- 全面的錯誤處理和邊界情況考量
- 完善的測試策略和效能優化