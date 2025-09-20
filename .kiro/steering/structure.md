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