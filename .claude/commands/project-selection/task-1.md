# project-selection - Task 1

Execute task 1 for the project-selection specification.

## Task Description
Create project types in src/types/project.ts

## Requirements Reference
**Requirements**: US1 (AC1.1, AC1.2), US3 (AC3.1, AC3.2, AC3.3)

## Usage
```
/Task:1-project-selection
```

## Instructions

Execute with @spec-task-executor agent the following task: "Create project types in src/types/project.ts"

```
Use the @spec-task-executor agent to implement task 1: "Create project types in src/types/project.ts" for the project-selection specification and include all the below context.

# Steering Context
## Steering Documents Context (Pre-loaded)

### Product Context
# PCM 工程關鍵指標平台 - 產品規格

## 產品願景 (Product Vision)

PCM (Project Critical Metrics) 是一個專為大型工程建設項目設計的全方位數位化管理平台。透過即時數據監控、智慧儀表板和完整的模組化功能，協助工程團隊提升專案管理效率、降低成本風險，並確保專案品質與進度控制。

## 核心價值主張 (Core Value Propositions)

1. **統一數據中心** - 整合來自各系統的工程數據，提供單一真實來源
2. **即時監控** - 透過 KPI 儀表板和警示系統，即時掌握專案狀態
3. **智慧決策** - 基於歷史數據和趨勢分析，輔助管理決策
4. **權限控制** - 細緻的角色權限管理，確保資料安全與存取控制
5. **行動優先** - 響應式設計，支援各種裝置的無縫使用體驗

## 目標用戶群 (Target Users)

### 主要用戶 (Primary Users)
- **專案經理 (Project Managers)** - 需要全面掌控專案進度、成本、品質
- **工程師 (Engineers)** - 需要存取技術文件、提交報告、查看專案數據
- **管理階層 (Executives)** - 需要高層次的 KPI 總覽和決策支援資訊

### 次要用戶 (Secondary Users)  
- **廠商/承包商 (Contractors)** - 需要存取相關的合約資訊、出勤紀錄
- **系統管理員 (System Admins)** - 負責用戶管理、權限設定、系統維護

## 核心功能模組 (Core Feature Modules)

### 1. 專案範疇管理
- 專案成員查詢和角色管理
- WBS (工作分解結構) 設定和維護

### 2. 人力資源管理
- 廠商人員通訊錄
- 出工統計和刷卡記錄追蹤
- PowerBI 整合報表
- 未刷卡通知系統

### 3. 時程管理
- 專案里程碑視覺化 (甘特圖)
- 發包狀況追蹤
- 法規許可證管理
- 歷史工期比對分析

### 4. 成本管理
- 成本管控儀表板
- 發包文件管理
- DCR (設計變更請求) 流程管理

### 5. 品質管理
- 品質日報/週報系統
- 品質稽核追蹤
- 品質 KPI 監控

### 6. 溝通管理
- 最新消息發布系統
- 文件管理 (IDC)
- 會議室預約系統
- 工程照片庫 (iPhoto 2.0)

### 7. 工安環保 (ESH)
- ESH 管理平台
- ESH 報告系統
- 環保 GPS 即時監控
- 環境數值即時監測

### 8. 即時影像監控
- 工地攝影機整合
- 多點位即時影像查看

## 關鍵績效指標 (KPIs)

### 用戶參與度
- 日活躍用戶數 (DAU)
- 功能模組使用率
- 平均會話時長

### 系統效能
- 頁面載入速度 < 2 秒
- 系統可用性 > 99.5%
- API 回應時間 < 500ms

### 業務影響
- 專案延遲減少 20%
- 成本超支控制在 5% 以內
- 品質問題早期發現率提升 30%

## 多專案支援

- 支援同時管理多個工程專案
- 專案間資料隔離和權限控制
- 跨專案數據比較和分析
- 專案範本和最佳實踐共享

## 未來發展方向

### 短期目標 (3-6 個月)
- 完成核心 8 大模組開發
- 整合 PostgreSQL 資料庫
- 實作完整的權限管理系統

### 中期目標 (6-12 個月)  
- AI 輔助的風險預警系統
- 進階數據分析和預測功能
- 第三方系統整合 (ERP、BIM)

### 長期目標 (1-2 年)
- 行動應用程式開發
- IoT 設備整合
- 機器學習驱動的智慧決策

---

### Technology Context
# PCM 工程關鍵指標平台 - 技術規格

## 前端技術棧 (Frontend Stack)

### 核心框架
- **Next.js 15.5.2** - React 全端框架，使用 App Router 架構
- **React 19.1.0** - 前端 UI 函式庫
- **TypeScript 5** - 靜態類型系統，提供更好的開發體驗和錯誤檢查

### UI/UX 系統
- **Tailwind CSS 3.4.17** - Utility-first CSS 框架
- **shadcn/ui** - 高品質 React 元件庫 (New York 風格)
- **Radix UI** - 無障礙的基礎 UI primitives
  - `@radix-ui/react-dialog`
  - `@radix-ui/react-select`  
  - `@radix-ui/react-tabs`
  - `@radix-ui/react-progress`
  - `@radix-ui/react-label`
- **Lucide React 0.542.0** - 現代化圖示系統
- **class-variance-authority 0.7.1** - 元件變體管理
- **tailwindcss-animate 1.0.7** - 動畫效果支援

### 狀態管理與資料處理
- **Zustand 5.0.8** - 輕量級狀態管理
- **date-fns 4.1.0** - 日期處理工具函式庫
- **clsx 2.1.1** - 條件式 className 合併
- **tailwind-merge 3.3.1** - Tailwind 類別衝突解決

### 圖表與視覺化
- **Recharts 3.1.2** - React 圖表函式庫
- 支援多種圖表類型：線圖、柱狀圖、圓餅圖、面積圖等

### 建置工具
- **PostCSS 8.5.6** - CSS 後處理器
- **Autoprefixer 10.4.21** - 自動添加瀏覽器前綴

## 資料庫架構 (Database Architecture)

### 主要資料庫
- **PostgreSQL** - 主要資料儲存系統
  - 支援複雜查詢和關聯式資料
  - 內建 JSON 支援用於靈活的資料結構
  - 優秀的效能和擴展性

### 資料庫設計原則
- **正規化設計** - 減少資料冗餘，維持資料一致性
- **索引策略** - 針對常用查詢欄位建立適當索引
- **外鍵約束** - 確保資料完整性
- **軟刪除** - 使用 deleted_at 欄位而非真實刪除資料

### 核心資料表結構

#### 用戶與權限
```sql
-- 用戶表
users (id, username, email, password_hash, role, created_at, updated_at)

-- 專案表  
projects (id, name, code, description, start_date, end_date, status, created_at)

-- 用戶專案關聯
user_projects (user_id, project_id, role, permissions, created_at)
```

#### 專案管理
```sql
-- 里程碑
milestones (id, project_id, name, target_date, actual_date, status, description)

-- KPI 數據
kpi_records (id, project_id, date, metric_type, value, unit, notes)

-- 工作分解結構
wbs_items (id, project_id, parent_id, code, name, description, level)
```

#### 人力資源
```sql
-- 員工資料
employees (id, project_id, name, position, company, contact_info, status)

-- 出勤記錄
attendance_records (id, employee_id, date, check_in, check_out, status, notes)
```

#### 品質與成本
```sql
-- 品質報告
quality_reports (id, project_id, date, type, content, status, created_by)

-- 成本紀錄
cost_records (id, project_id, category, amount, date, description, created_by)
```

## 開發階段資料策略

### 階段一：Mock API 開發
```typescript
// 使用 Mock Service Worker (MSW) 
/src/mocks/
├── handlers/           // API 模擬處理器
│   ├── auth.ts
│   ├── projects.ts
│   ├── dashboard.ts
│   ├── hr.ts
│   ├── schedule.ts
│   ├── quality.ts
│   └── cost.ts
├── data/              // 模擬資料
│   ├── users.json
│   ├── projects.json
│   ├── kpi.json
│   ├── employees.json
│   └── milestones.json
└── server.ts          // MSW 伺服器設定
```

### 階段二：API 抽象層設計
```typescript
// API 服務層，支援 Mock 與真實 API 切換
/src/services/
├── api/
│   ├── base.ts        // 基礎 API 配置
│   ├── auth.ts
│   ├── projects.ts
│   ├── dashboard.ts
│   └── ...
├── types/             // TypeScript 介面定義
│   ├── auth.types.ts
│   ├── project.types.ts
│   └── ...
└── config.ts          // API 環境配置
```

### 階段三：PostgreSQL 整合
- **Prisma ORM** - 資料庫操作抽象層
- **連接池管理** - 優化資料庫連線效能
- **資料遷移** - 版本控制的資料庫結構變更
- **種子資料** - 開發和測試環境的初始資料

## API 設計規範

### RESTful API 原則
```
GET    /api/projects           - 取得專案列表
POST   /api/projects           - 建立新專案
GET    /api/projects/:id       - 取得單一專案
PUT    /api/projects/:id       - 更新專案
DELETE /api/projects/:id       - 刪除專案

GET    /api/projects/:id/kpi   - 取得專案 KPI
POST   /api/projects/:id/kpi   - 新增 KPI 資料
```

### 回應格式標準
```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  errors?: string[]
  meta?: {
    total: number
    page: number
    limit: number
  }
}
```

## 效能優化策略

### 前端優化
- **程式碼分割** - 按路由和功能模組分割
- **懶加載** - 非關鍵元件延遲載入
- **圖片優化** - next/image 自動優化
- **快取策略** - SWR 或 React Query 實作資料快取

### 資料庫優化
- **查詢優化** - 適當的索引和查詢最佳化
- **資料分頁** - 大量資料的分頁處理
- **連線池** - 資料庫連線管理
- **讀寫分離** - 高負載時的資料庫架構

## 安全性要求

### 身份驗證
- **JWT Token** - 無狀態的身份驗證
- **Refresh Token** - 長期登入狀態維持
- **Role-based Access Control (RBAC)** - 角色權限控制

### 資料安全
- **密碼加密** - bcrypt 密碼雜湊
- **HTTPS** - 傳輸加密
- **SQL Injection 防護** - 參數化查詢
- **XSS 防護** - 輸入驗證和輸出編碼

## 部署架構

### 開發環境
- **本地開發** - Docker Compose 統一環境
- **熱重載** - Next.js dev mode
- **Mock API** - MSW 本地模擬

### 生產環境
- **容器化部署** - Docker 容器
- **反向代理** - Nginx 負載均衡
- **資料庫** - PostgreSQL 高可用集群
- **監控** - 系統監控和日誌管理

## 第三方整合

### 已規劃整合
- **PowerBI** - 數據視覺化和報表
- **GPS 監控系統** - 車輛/設備定位
- **攝影機系統** - 即時影像串流
- **刷卡機系統** - 出勤資料同步

### 未來整合考慮
- **ERP 系統** - 企業資源規劃整合
- **BIM 系統** - 建築資訊模型
- **IoT 設備** - 物聯網感測器資料
- **郵件系統** - 自動通知和報告

---

### Structure Context
# PCM 工程關鍵指標平台 - 專案結構與編碼規範

## 專案目錄結構 (Project Structure)

### 根目錄配置
```
E:\nworkspace\pcm\
├── .claude/                    # Claude 規格文件
│   └── steering/              # 引導文件
├── public/                    # 靜態資源
│   ├── design/               # 設計文件和原型
│   └── icons/               # 圖示文件
├── src/                      # 源代碼
└── 配置文件...
```

### 核心源代碼結構
```
src/
├── app/                      # Next.js App Router 頁面
│   ├── (auth)/              # 認證相關頁面群組
│   │   └── login/
│   ├── dashboard/           # 儀表板頁面
│   ├── projects/            # 專案管理頁面
│   ├── human-resources/     # 人力資源模組
│   │   ├── contacts/       
│   │   ├── attendance/     
│   │   └── statistics/     
│   ├── schedule/           # 時程管理模組
│   │   ├── milestones/    
│   │   ├── packages/      
│   │   └── permits/       
│   ├── cost/               # 成本管理模組
│   ├── quality/            # 品質管理模組
│   ├── communication/      # 溝通管理模組
│   ├── esh/               # 工安環保模組
│   ├── video/             # 即時影像模組
│   ├── components-test/    # 元件測試頁面
│   ├── globals.css        # 全局樣式
│   ├── layout.tsx         # 根布局元件
│   └── page.tsx           # 首頁 (重定向到登入)
├── components/             # 可複用元件
│   ├── ui/                # shadcn/ui 基礎元件
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   └── index.ts      # 統一導出
│   ├── layout/           # 布局相關元件
│   │   └── DashboardLayout.tsx
│   ├── navigation/       # 導航相關元件
│   │   ├── MainNavigation.tsx
│   │   ├── NavigationDropdown.tsx
│   │   └── Breadcrumbs.tsx
│   └── shared/           # 共用業務元件
│       ├── ChartComponent.tsx
│       ├── DashboardWidget.tsx
│       ├── DataTable.tsx
│       ├── FilterBar.tsx
│       ├── KPIProgressBar.tsx
│       ├── MilestoneTimeline.tsx
│       ├── Modal.tsx
│       ├── StatCard.tsx
│       └── index.ts      # 統一導出
├── hooks/                # 自定義 React Hooks
│   ├── useAuth.ts       # 認證相關
│   ├── useProjects.ts   # 專案資料
│   ├── useDashboard.ts  # 儀表板資料
│   └── useLocalStorage.ts # 本地儲存
├── lib/                  # 工具函式庫
│   ├── utils.ts         # 通用工具函式
│   ├── navigation.ts    # 導航配置
│   ├── auth.ts          # 認證工具
│   └── constants.ts     # 常數定義
├── services/             # API 服務層 (未來新增)
│   ├── api/
│   │   ├── base.ts      # 基礎 API 配置
│   │   ├── auth.ts      # 認證 API
│   │   ├── projects.ts  # 專案 API
│   │   └── dashboard.ts # 儀表板 API
│   └── types/           # TypeScript 類型定義
│       ├── auth.types.ts
│       ├── project.types.ts
│       └── api.types.ts
├── store/               # 狀態管理 (Zustand)
│   ├── authStore.ts    # 用戶狀態
│   ├── projectStore.ts # 專案狀態
│   └── uiStore.ts      # UI 狀態
└── mocks/              # Mock API (MSW)
    ├── handlers/       # API 處理器
    │   ├── auth.ts
    │   ├── projects.ts
    │   ├── dashboard.ts
    │   └── index.ts
    ├── data/          # 模擬資料
    │   ├── users.json
    │   ├── projects.json
    │   └── kpi.json
    └── server.ts      # MSW 設定
```

## 命名規範 (Naming Conventions)

### 檔案命名
- **React 元件**: PascalCase - `DashboardWidget.tsx`
- **Hooks**: camelCase，以 "use" 開頭 - `useAuth.ts`
- **工具函式**: camelCase - `utils.ts`
- **常數檔案**: camelCase - `constants.ts`
- **類型定義**: camelCase，以 ".types" 結尾 - `auth.types.ts`

### 變數與函式命名
```typescript
// 變數使用 camelCase
const userProject = 'F20P1'
const isAuthenticated = true

// 函式使用 camelCase
function getUserProjects() {}
const handleSubmit = () => {}

// 常數使用 UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.pcm.com'
const MAX_RETRY_ATTEMPTS = 3

// 型別使用 PascalCase
interface UserProject {
  id: string
  name: string
}

type ApiResponse<T> = {
  data: T
  success: boolean
}
```

### React 元件命名
```typescript
// 元件名稱使用 PascalCase
const DashboardWidget = () => {}
const StatCard = () => {}
const DataTable = () => {}

// Props 介面以元件名 + Props
interface DashboardWidgetProps {
  title: string
  value: number
}
```

## 程式碼組織原則

### 元件結構
```typescript
// 元件檔案標準結構
import { FC } from 'react'
import { cn } from '@/lib/utils'

// 1. 型別定義
interface ComponentProps {
  className?: string
  children: React.ReactNode
}

// 2. 元件實作
const Component: FC<ComponentProps> = ({ 
  className, 
  children,
  ...props 
}) => {
  return (
    <div className={cn("base-styles", className)} {...props}>
      {children}
    </div>
  )
}

// 3. 預設導出
export default Component

// 4. 具名導出 (如果需要)
export { Component }
export type { ComponentProps }
```

### API 服務結構
```typescript
// API 服務標準結構
import { ApiResponse, Project } from '@/services/types'

export class ProjectService {
  private baseUrl = '/api/projects'

  async getProjects(): Promise<ApiResponse<Project[]>> {
    // 實作
  }

  async getProject(id: string): Promise<ApiResponse<Project>> {
    // 實作  
  }

  async createProject(data: CreateProjectData): Promise<ApiResponse<Project>> {
    // 實作
  }
}

export const projectService = new ProjectService()
```

## 樣式規範 (Styling Guidelines)

### Tailwind CSS 使用原則
```typescript
// 1. 使用 cn() 函式合併類別
import { cn } from '@/lib/utils'

const Button = ({ variant, className, ...props }) => {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium",
        variant === "primary" && "bg-primary text-primary-foreground",
        variant === "secondary" && "bg-secondary text-secondary-foreground",
        className
      )}
      {...props}
    />
  )
}

// 2. 響應式設計優先
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// 3. 使用 CSS 變數進行主題管理
:root {
  --primary: #00645A;        /* Cathay Pacific 品牌色 */
  --primary-foreground: #ffffff;
  --secondary: #f1f5f9;
  --border: #e2e8f0;
}
```

### shadcn/ui 元件客製化
```typescript
// 基於 shadcn/ui 擴展業務元件
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const StatCard = ({ title, value, trend, status }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <Badge variant={status === 'good' ? 'default' : 'destructive'}>
          {trend}
        </Badge>
      </CardContent>
    </Card>
  )
}
```

## 類型安全規範

### TypeScript 配置
```json
// tsconfig.json 重要設定
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### 型別定義最佳實踐
```typescript
// 1. 使用 interface 定義物件結構
interface User {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: Date
}

// 2. 使用 type 定義聯合類型和工具類型
type UserRole = 'admin' | 'manager' | 'engineer' | 'contractor'
type UserCreateData = Omit<User, 'id' | 'createdAt'>

// 3. 使用泛型提高複用性
interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

// 4. 嚴格定義 Props
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
}
```

## 測試策略

### 測試檔案結構
```
src/
├── components/
│   ├── Button.tsx
│   └── __tests__/
│       └── Button.test.tsx
├── hooks/
│   ├── useAuth.ts
│   └── __tests__/
│       └── useAuth.test.ts
└── services/
    ├── api/
    │   ├── projects.ts
    │   └── __tests__/
    │       └── projects.test.ts
```

### 測試命名和結構
```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import Button from '../Button'

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

## 效能優化規範

### 元件優化
```typescript
// 1. 使用 memo 避免不必要的重渲染
import { memo } from 'react'

const ExpensiveComponent = memo(({ data }) => {
  // 昂貴的計算或渲染邏輯
})

// 2. 使用 useMemo 緩存計算結果
import { useMemo } from 'react'

const Dashboard = ({ projects }) => {
  const totalBudget = useMemo(() => {
    return projects.reduce((sum, project) => sum + project.budget, 0)
  }, [projects])

  return <div>Total: {totalBudget}</div>
}

// 3. 使用 useCallback 緩存函式
import { useCallback } from 'react'

const ProjectList = ({ projects, onProjectSelect }) => {
  const handleSelect = useCallback((projectId) => {
    onProjectSelect(projectId)
  }, [onProjectSelect])

  return projects.map(project => (
    <ProjectCard key={project.id} onSelect={handleSelect} />
  ))
}
```

## 錯誤處理規範

### 統一錯誤處理
```typescript
// 1. API 錯誤處理
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// 2. 錯誤邊界元件
class ErrorBoundary extends React.Component {
  state = { hasError: false }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }
    return this.props.children
  }
}

// 3. 表單驗證錯誤處理
const validateForm = (data: FormData) => {
  const errors: Record<string, string> = {}
  
  if (!data.name) errors.name = '專案名稱為必填'
  if (!data.startDate) errors.startDate = '開始日期為必填'
  
  return { isValid: Object.keys(errors).length === 0, errors }
}
```

## 安全性規範

### 輸入驗證與清理
```typescript
// 1. 使用 zod 進行資料驗證
import { z } from 'zod'

const ProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  startDate: z.date(),
  budget: z.number().positive()
})

// 2. XSS 防護
import DOMPurify from 'dompurify'

const sanitizeHtml = (html: string) => {
  return DOMPurify.sanitize(html)
}

// 3. 權限檢查
const usePermission = (requiredRole: UserRole) => {
  const { user } = useAuth()
  return user?.role === requiredRole || user?.role === 'admin'
}
```

這個結構化的引導文件將為所有未來的開發工作提供一致的標準和最佳實踐指引。

**Note**: Steering documents have been pre-loaded. Do not use get-content to fetch them again.

# Specification Context
## Specification Context (Pre-loaded): project-selection

### Requirements
# Project Selection 功能需求文件

**版本:** 1.0  
**建立日期:** 2025-08-29  
**專案:** PCM 工程關鍵指標平台  

---

## 用戶故事

### US1: 專案列表瀏覽
作為使用者，我希望能看到我有權限的所有專案列表，以便我可以選擇要進入的專案。

**驗收條件:**
- AC1.1: 顯示使用者有權限的專案列表
- AC1.2: 每個專案顯示基本資訊（代碼、名稱、狀態、進度）
- AC1.3: 支援卡片和表格兩種檢視模式

### US2: 專案搜尋和篩選
作為使用者，我希望能搜尋和篩選專案，以便快速找到目標專案。

**驗收條件:**
- AC2.1: 支援按專案名稱和代碼搜尋
- AC2.2: 支援按狀態篩選專案
- AC2.3: 支援按專案類型篩選

### US3: 專案資訊查看
作為使用者，我希望能看到專案的關鍵資訊摘要，以便了解專案狀態。

**驗收條件:**
- AC3.1: 顯示專案進度資訊
- AC3.2: 顯示專案經理資訊
- AC3.3: 顯示專案時程資訊

### US4: 響應式體驗
作為使用者，我希望能在不同裝置上都有良好的使用體驗。

**驗收條件:**
- AC4.1: 支援桌面版完整功能
- AC4.2: 支援行動版最佳化介面

### US5: 專案導航
作為使用者，我希望能快速進入指定專案，開始工作。

**驗收條件:**
- AC5.1: 點擊專案卡片或按鈕可進入專案
- AC5.2: 記錄專案存取歷史

### US6: 即時狀態
作為使用者，我希望能看到專案的最新狀態和進度資訊。

**驗收條件:**
- AC6.1: 即時顯示專案進度更新
- AC6.2: 顯示專案狀態變更

---

### Design
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

**Note**: Specification documents have been pre-loaded. Do not use get-content to fetch them again.

## Task Details
- Task ID: 1
- Description: Create project types in src/types/project.ts
- Requirements: US1 (AC1.1, AC1.2), US3 (AC3.1, AC3.2, AC3.3)

## Instructions
- Implement ONLY task 1: "Create project types in src/types/project.ts"
- Follow all project conventions and leverage existing code
- Mark the task as complete using: claude-code-spec-workflow get-tasks project-selection 1 --mode complete
- Provide a completion summary
```

## Task Completion
When the task is complete, mark it as done:
```bash
claude-code-spec-workflow get-tasks project-selection 1 --mode complete
```

## Next Steps
After task completion, you can:
- Execute the next task using /project-selection-task-[next-id]
- Check overall progress with /spec-status project-selection
