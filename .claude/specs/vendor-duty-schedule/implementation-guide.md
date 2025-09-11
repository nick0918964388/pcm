# 廠商人員值班查詢功能實作指南

## 📋 實作計劃概覽

### 🎯 實作目標
基於現有廠商通訊錄架構，開發完整的廠商人員值班查詢系統，提供直觀的查詢介面和即時的值班資訊。

### 🗓️ 開發時程
- **Phase 1**: 基礎架構和資料模型 (1-2天)
- **Phase 2**: 核心查詢功能 (2-3天)  
- **Phase 3**: 進階功能和優化 (2天)
- **Phase 4**: 測試和文檔 (1天)

### 🏗️ 技術棧
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **UI Components**: shadcn/ui + Radix UI
- **State Management**: React Hooks + Context API
- **Data Fetching**: SWR + Axios
- **Testing**: Vitest + React Testing Library + Playwright

## 📁 檔案結構

```
src/
├── types/
│   └── dutySchedule.ts                     ✅ 已建立
├── app/dashboard/[projectId]/
│   └── duty-schedules/
│       ├── page.tsx                        📋 主頁面
│       ├── loading.tsx                     📋 載入頁面
│       └── error.tsx                       📋 錯誤頁面
├── components/duty-schedules/
│   ├── index.ts                           📋 匯出文件
│   ├── DutyScheduleFilters.tsx            📋 篩選組件
│   ├── DutyScheduleTable.tsx              📋 表格組件
│   ├── DutyScheduleCalendar.tsx           📋 日曆組件  
│   ├── DutyPersonDetailDialog.tsx         📋 詳情對話框
│   ├── DutyScheduleStats.tsx              📋 統計卡片
│   └── DutyScheduleViewToggle.tsx         📋 視圖切換
├── lib/
│   ├── api/dutySchedule.ts                📋 API 服務
│   ├── hooks/useDutySchedules.ts          📋 自定義 Hook
│   └── utils/dutyScheduleUtils.ts         📋 工具函數
└── __tests__/duty-schedules/
    ├── DutySchedulePage.test.tsx          📋 頁面測試
    ├── DutyScheduleTable.test.tsx         📋 組件測試
    └── dutyScheduleUtils.test.ts          📋 工具測試
```

## 🚀 Phase 1: 基礎架構建立

### 1.1 導航配置更新
更新 `src/lib/navigation.ts`，在人力資源選單中新增值班查詢功能：

```typescript
// 在人力資源子選單中新增
{
  id: 'duty-schedule',
  label: '廠商人員值班查詢',
  href: '/duty-schedules'
}
```

### 1.2 API 服務層建立
建立 `src/lib/api/dutySchedule.ts`：

```typescript
import { api } from '@/lib/api'
import type {
  DutyScheduleFilters,
  DutySchedulePagination,
  DutyScheduleSort,
  DutyScheduleListResponse,
  CurrentDutyResponse,
  DutyScheduleResponse
} from '@/types/dutySchedule'

export class DutyScheduleAPI {
  static async getSchedules(
    projectId: string,
    filters: DutyScheduleFilters = {},
    pagination: Partial<DutySchedulePagination> = {},
    sort: DutyScheduleSort = { field: 'dutyDate', direction: 'desc' }
  ): Promise<DutyScheduleListResponse> {
    const params = new URLSearchParams({
      page: String(pagination.page || 1),
      pageSize: String(pagination.pageSize || 20),
      sortBy: sort.field as string,
      sortOrder: sort.direction,
      ...this.serializeFilters(filters)
    })

    return api.get(`/projects/${projectId}/duty-schedules?${params}`)
  }

  static async getCurrentDuty(projectId: string): Promise<CurrentDutyResponse> {
    return api.get(`/projects/${projectId}/duty-schedules/current`)
  }

  static async getScheduleDetail(
    projectId: string, 
    scheduleId: string
  ): Promise<DutyScheduleResponse> {
    return api.get(`/projects/${projectId}/duty-schedules/${scheduleId}`)
  }

  private static serializeFilters(filters: DutyScheduleFilters): Record<string, string> {
    const params: Record<string, string> = {}
    
    if (filters.search) params.search = filters.search
    if (filters.dateRange) {
      params.dateFrom = filters.dateRange.from.toISOString().split('T')[0]
      params.dateTo = filters.dateRange.to.toISOString().split('T')[0]
    }
    if (filters.specificDate) {
      params.specificDate = filters.specificDate.toISOString().split('T')[0]
    }
    if (filters.vendorIds?.length) {
      params.vendorIds = filters.vendorIds.join(',')
    }
    if (filters.shiftTypes?.length) {
      params.shiftTypes = filters.shiftTypes.join(',')
    }
    if (filters.statuses?.length) {
      params.statuses = filters.statuses.join(',')
    }
    if (filters.workAreas?.length) {
      params.workAreas = filters.workAreas.join(',')
    }
    if (filters.currentOnly) {
      params.currentOnly = 'true'
    }
    
    return params
  }
}
```

### 1.3 自定義 Hook 建立
建立 `src/lib/hooks/useDutySchedules.ts`：

```typescript
import { useState, useCallback, useEffect } from 'react'
import useSWR from 'swr'
import { DutyScheduleAPI } from '@/lib/api/dutySchedule'
import type {
  DutySchedule,
  DutyScheduleFilters,
  DutySchedulePagination,
  DutyScheduleSort,
  DutyScheduleStats
} from '@/types/dutySchedule'

export function useDutySchedules(projectId: string) {
  const [filters, setFilters] = useState<DutyScheduleFilters>({})
  const [pagination, setPagination] = useState<DutySchedulePagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  })
  const [sort, setSort] = useState<DutyScheduleSort>({
    field: 'dutyDate',
    direction: 'desc'
  })

  const { data, error, isLoading, mutate } = useSWR(
    ['duty-schedules', projectId, filters, pagination.page, pagination.pageSize, sort],
    () => DutyScheduleAPI.getSchedules(projectId, filters, pagination, sort),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true
    }
  )

  const updateFilters = useCallback((newFilters: DutyScheduleFilters) => {
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  const updatePagination = useCallback((page: number, pageSize: number) => {
    setPagination(prev => ({ ...prev, page, pageSize }))
  }, [])

  const updateSort = useCallback((newSort: DutyScheduleSort) => {
    setSort(newSort)
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  return {
    // 資料
    schedules: data?.data?.schedules || [],
    stats: data?.data?.stats || null,
    pagination: data?.data?.pagination || pagination,
    
    // 狀態
    loading: isLoading,
    error,
    
    // 控制項
    filters,
    sort,
    updateFilters,
    updatePagination,
    updateSort,
    refresh
  }
}

export function useCurrentDuty(projectId: string) {
  const { data, error, isLoading } = useSWR(
    ['current-duty', projectId],
    () => DutyScheduleAPI.getCurrentDuty(projectId),
    {
      refreshInterval: 60000, // 每分鐘刷新
      revalidateOnFocus: true
    }
  )

  return {
    currentShifts: data?.data?.currentShifts || [],
    nextShifts: data?.data?.nextShifts || [],
    emergencyContacts: data?.data?.emergencyContacts || [],
    loading: isLoading,
    error
  }
}
```

## 🎨 Phase 2: UI 組件開發

### 2.1 主頁面組件
建立 `src/app/dashboard/[projectId]/duty-schedules/page.tsx`：

```typescript
'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Calendar, Table, Download, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import { DutyScheduleFilters } from '@/components/duty-schedules/DutyScheduleFilters'
import { DutyScheduleTable } from '@/components/duty-schedules/DutyScheduleTable'
import { DutyScheduleCalendar } from '@/components/duty-schedules/DutyScheduleCalendar'
import { DutyScheduleStats } from '@/components/duty-schedules/DutyScheduleStats'
import { DutyPersonDetailDialog } from '@/components/duty-schedules/DutyPersonDetailDialog'
import { useDutySchedules, useCurrentDuty } from '@/lib/hooks/useDutySchedules'
import type { DutySchedule } from '@/types/dutySchedule'

type ViewMode = 'table' | 'calendar'

export default function DutySchedulePage() {
  const params = useParams()
  const projectId = params.projectId as string
  
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [selectedSchedule, setSelectedSchedule] = useState<DutySchedule | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  
  const {
    schedules,
    stats,
    pagination,
    loading,
    error,
    filters,
    sort,
    updateFilters,
    updatePagination,
    updateSort,
    refresh
  } = useDutySchedules(projectId)
  
  const { currentShifts } = useCurrentDuty(projectId)

  const handleViewSchedule = (schedule: DutySchedule) => {
    setSelectedSchedule(schedule)
    setShowDetailDialog(true)
  }

  const handleCallPerson = (schedule: DutySchedule) => {
    window.open(`tel:${schedule.person.mobile}`)
    toast.success(`撥打電話給 ${schedule.person.name}`)
  }

  const handleExport = () => {
    // TODO: 實作匯出功能
    toast.info('匯出功能開發中')
  }

  if (error) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <Card className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">載入失敗</h3>
          <p className="text-gray-600 mb-4">無法載入值班資料，請稍後再試</p>
          <Button onClick={refresh}>重新載入</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頁面標題 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              廠商人員值班查詢
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              查詢和管理專案廠商人員值班安排
              {stats && (
                <span className="ml-2">
                  • 共 {stats.totalSchedules} 個排班
                  • 目前 {stats.currentOnDutyCount} 人值班中
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              匯出
            </Button>
            
            {/* 視圖切換 */}
            <div className="flex border border-gray-200 rounded-lg">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-r-none"
              >
                <Table className="h-4 w-4 mr-2" />
                表格
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className="rounded-l-none"
              >
                <Calendar className="h-4 w-4 mr-2" />
                日曆
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="w-full px-6 py-6 space-y-6">
        {/* 統計卡片 */}
        <DutyScheduleStats
          stats={stats}
          currentShifts={currentShifts}
          loading={loading}
        />
        
        {/* 搜尋篩選 */}
        <DutyScheduleFilters
          filters={filters}
          onFiltersChange={updateFilters}
          loading={loading}
        />
        
        {/* 主要內容區 */}
        {viewMode === 'table' ? (
          <DutyScheduleTable
            schedules={schedules}
            loading={loading}
            pagination={pagination}
            onPaginationChange={updatePagination}
            onSort={updateSort}
            onViewSchedule={handleViewSchedule}
            onCallPerson={handleCallPerson}
          />
        ) : (
          <DutyScheduleCalendar
            schedules={schedules}
            loading={loading}
            onScheduleClick={handleViewSchedule}
          />
        )}
        
        {/* 詳情對話框 */}
        <DutyPersonDetailDialog
          schedule={selectedSchedule}
          open={showDetailDialog}
          onClose={() => setShowDetailDialog(false)}
          onCall={handleCallPerson}
        />
      </div>
    </div>
  )
}
```

### 2.2 篩選組件
建立 `src/components/duty-schedules/DutyScheduleFilters.tsx`：

```typescript
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Search, Filter, X, Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

import type { DutyScheduleFilters as FiltersType } from '@/types/dutySchedule'
import { ShiftType, DutyStatus, WorkArea } from '@/types/dutySchedule'

interface DutyScheduleFiltersProps {
  filters: FiltersType
  onFiltersChange: (filters: FiltersType) => void
  loading?: boolean
}

export function DutyScheduleFilters({
  filters,
  onFiltersChange,
  loading = false
}: DutyScheduleFiltersProps) {
  const [expanded, setExpanded] = useState(false)
  const [localSearch, setLocalSearch] = useState(filters.search || '')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onFiltersChange({ ...filters, search: localSearch })
  }

  const handleDateRangeChange = (range: { from: Date; to: Date } | undefined) => {
    onFiltersChange({ 
      ...filters, 
      dateRange: range,
      specificDate: undefined 
    })
  }

  const handleSpecificDateChange = (date: Date | undefined) => {
    onFiltersChange({ 
      ...filters, 
      specificDate: date,
      dateRange: undefined 
    })
  }

  const handleShiftTypeToggle = (shiftType: ShiftType) => {
    const current = filters.shiftTypes || []
    const updated = current.includes(shiftType)
      ? current.filter(t => t !== shiftType)
      : [...current, shiftType]
    onFiltersChange({ ...filters, shiftTypes: updated })
  }

  const handleStatusToggle = (status: DutyStatus) => {
    const current = filters.statuses || []
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status]
    onFiltersChange({ ...filters, statuses: updated })
  }

  const handleReset = () => {
    setLocalSearch('')
    onFiltersChange({})
  }

  const activeFilterCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof FiltersType]
    return value !== undefined && value !== null && value !== ''
  }).length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            篩選條件
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? '收起' : '展開'}
            </Button>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-1" />
                清除
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 搜尋欄 */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜尋人員姓名、廠商名稱..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={loading}>
            搜尋
          </Button>
        </form>

        {/* 快速日期篩選 */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={!filters.dateRange && !filters.specificDate ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFiltersChange({ ...filters, dateRange: undefined, specificDate: undefined })}
          >
            全部
          </Button>
          <Button
            variant={filters.specificDate ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSpecificDateChange(new Date())}
          >
            今日
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date()
              const tomorrow = new Date(today)
              tomorrow.setDate(tomorrow.getDate() + 1)
              handleDateRangeChange({ from: today, to: tomorrow })
            }}
          >
            明日
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date()
              const weekLater = new Date(today)
              weekLater.setDate(weekLater.getDate() + 7)
              handleDateRangeChange({ from: today, to: weekLater })
            }}
          >
            本週
          </Button>
        </div>

        {expanded && (
          <>
            {/* 日期範圍選擇器 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>日期範圍</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !filters.dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange ? (
                        `${format(filters.dateRange.from, 'yyyy/MM/dd')} - ${format(filters.dateRange.to, 'yyyy/MM/dd')}`
                      ) : (
                        "選擇日期範圍"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={filters.dateRange}
                      onSelect={handleDateRangeChange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>特定日期</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !filters.specificDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.specificDate ? (
                        format(filters.specificDate, 'yyyy/MM/dd')
                      ) : (
                        "選擇特定日期"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.specificDate}
                      onSelect={handleSpecificDateChange}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* 班別篩選 */}
            <div>
              <Label className="text-sm font-medium">班別</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {Object.values(ShiftType).map(shiftType => (
                  <Badge
                    key={shiftType}
                    variant={filters.shiftTypes?.includes(shiftType) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => handleShiftTypeToggle(shiftType)}
                  >
                    {shiftType}
                  </Badge>
                ))}
              </div>
            </div>

            {/* 狀態篩選 */}
            <div>
              <Label className="text-sm font-medium">值班狀態</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {Object.values(DutyStatus).map(status => (
                  <Badge
                    key={status}
                    variant={filters.statuses?.includes(status) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => handleStatusToggle(status)}
                  >
                    {status}
                  </Badge>
                ))}
              </div>
            </div>

            {/* 其他選項 */}
            <div className="flex gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.currentOnly || false}
                  onChange={(e) => onFiltersChange({ 
                    ...filters, 
                    currentOnly: e.target.checked 
                  })}
                  className="rounded"
                />
                <span className="text-sm">只顯示當前值班</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.includeReplacements !== false}
                  onChange={(e) => onFiltersChange({ 
                    ...filters, 
                    includeReplacements: e.target.checked 
                  })}
                  className="rounded"
                />
                <span className="text-sm">包含代班記錄</span>
              </label>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
```

## 🧪 Phase 3: 測試規範

### 3.1 單元測試
建立 `src/__tests__/duty-schedules/DutySchedulePage.test.tsx`：

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import DutySchedulePage from '@/app/dashboard/[projectId]/duty-schedules/page'

// Mock hooks
vi.mock('@/lib/hooks/useDutySchedules')
vi.mock('next/navigation', () => ({
  useParams: () => ({ projectId: 'test-project' })
}))

describe('DutySchedulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render page title correctly', () => {
    render(<DutySchedulePage />)
    expect(screen.getByText('廠商人員值班查詢')).toBeInTheDocument()
  })

  it('should switch between table and calendar view', async () => {
    const user = userEvent.setup()
    render(<DutySchedulePage />)
    
    // 預設為表格視圖
    expect(screen.getByText('表格')).toHaveClass('bg-primary')
    
    // 切換到日曆視圖
    await user.click(screen.getByText('日曆'))
    expect(screen.getByText('日曆')).toHaveClass('bg-primary')
  })

  it('should handle refresh action', async () => {
    const user = userEvent.setup()
    const mockRefresh = vi.fn()
    
    // Mock hook return value
    vi.mocked(useDutySchedules).mockReturnValue({
      refresh: mockRefresh,
      schedules: [],
      loading: false,
      // ... other properties
    })
    
    render(<DutySchedulePage />)
    
    await user.click(screen.getByText('刷新'))
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })
})
```

### 3.2 E2E 測試
建立 `tests/duty-schedule.spec.ts`：

```typescript
import { test, expect } from '@playwright/test'

test.describe('Duty Schedule Page', () => {
  test.beforeEach(async ({ page }) => {
    // 登入並導航到值班查詢頁面
    await page.goto('/login')
    await page.fill('[data-testid="username"]', 'admin')
    await page.fill('[data-testid="password"]', 'password')
    await page.click('[data-testid="login-button"]')
    
    // 選擇專案
    await page.click('[data-testid="project-proj001"]')
    
    // 導航到值班查詢
    await page.hover('[data-testid="nav-hr"]')
    await page.click('[data-testid="nav-duty-schedule"]')
  })

  test('should display duty schedule list', async ({ page }) => {
    // 等待頁面載入
    await expect(page.locator('h1')).toContainText('廠商人員值班查詢')
    
    // 檢查統計卡片
    await expect(page.locator('[data-testid="stats-cards"]')).toBeVisible()
    
    // 檢查表格
    await expect(page.locator('[data-testid="duty-table"]')).toBeVisible()
  })

  test('should filter by date range', async ({ page }) => {
    // 點擊日期篩選
    await page.click('[data-testid="date-filter"]')
    
    // 選擇今日
    await page.click('[data-testid="filter-today"]')
    
    // 驗證篩選結果
    await expect(page.locator('[data-testid="filter-active-count"]')).toContainText('1')
  })

  test('should switch to calendar view', async ({ page }) => {
    // 切換到日曆視圖
    await page.click('[data-testid="view-calendar"]')
    
    // 驗證日曆顯示
    await expect(page.locator('[data-testid="duty-calendar"]')).toBeVisible()
  })

  test('should open detail dialog when clicking on schedule', async ({ page }) => {
    // 點擊第一個值班記錄
    await page.click('[data-testid="duty-row"]:first-child [data-testid="view-button"]')
    
    // 驗證詳情對話框開啟
    await expect(page.locator('[data-testid="detail-dialog"]')).toBeVisible()
    
    // 驗證詳情內容
    await expect(page.locator('[data-testid="person-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="contact-info"]')).toBeVisible()
  })

  test('should make phone call', async ({ page }) => {
    // 模擬點擊撥號按鈕
    await page.click('[data-testid="duty-row"]:first-child [data-testid="call-button"]')
    
    // 驗證 toast 訊息
    await expect(page.locator('[data-testid="toast"]')).toContainText('撥打電話給')
  })
})
```

### 3.3 效能測試
```typescript
// tests/duty-schedule-performance.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Duty Schedule Performance', () => {
  test('should load within 3 seconds', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/dashboard/proj001/duty-schedules')
    await page.waitForSelector('[data-testid="duty-table"]')
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(3000)
  })

  test('should handle large dataset efficiently', async ({ page }) => {
    // 模擬大量資料載入
    await page.goto('/dashboard/proj001/duty-schedules?pageSize=100')
    
    // 測試捲動效能
    const startTime = Date.now()
    await page.mouse.wheel(0, 1000)
    const scrollTime = Date.now() - startTime
    
    expect(scrollTime).toBeLessThan(100)
  })
})
```

## 📋 Phase 4: 部署和監控

### 4.1 部署清單
- ✅ 類型定義檔案 (`dutySchedule.ts`)
- ✅ API 服務層 (`dutySchedule.ts`)
- ✅ 自定義 Hooks (`useDutySchedules.ts`)
- 📋 主頁面組件
- 📋 UI 組件庫
- 📋 測試檔案
- 📋 導航更新
- 📋 路由配置

### 4.2 效能監控指標
- 頁面載入時間 < 3秒
- API 回應時間 < 500ms
- 記憶體使用 < 50MB
- 表格渲染 < 200ms
- 日曆渲染 < 300ms

### 4.3 錯誤監控
- API 錯誤追蹤
- 前端錯誤捕捉
- 使用者操作記錄
- 效能瓶頸分析

## 📝 開發注意事項

### 最佳實踐
1. **程式碼品質**: 遵循 TypeScript 嚴格模式
2. **效能優化**: 使用 React.memo 和 useMemo 
3. **無障礙設計**: 支援鍵盤導航和螢幕閱讀器
4. **響應式設計**: 支援桌面、平板、手機版本
5. **錯誤處理**: 提供友善的錯誤提示

### 安全考量
1. **資料驗證**: 所有輸入都要驗證
2. **權限檢查**: 確認使用者有專案存取權
3. **資料脫敏**: 敏感資訊適當遮蔽
4. **HTTPS**: 強制使用安全連線

### 未來擴展
1. **值班管理**: 新增、編輯、刪除值班安排
2. **推播通知**: 值班提醒和異常通知
3. **報表功能**: 值班統計和分析報表
4. **整合功能**: 與考勤系統整合