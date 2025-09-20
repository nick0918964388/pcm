# 廠商人員值班查詢系統設計規格

## 📋 目錄
- [1. 系統概述](#1-系統概述)
- [2. 功能需求](#2-功能需求) 
- [3. 數據模型設計](#3-數據模型設計)
- [4. UI組件設計](#4-ui組件設計)
- [5. API接口規格](#5-api接口規格)
- [6. 實作計劃](#6-實作計劃)

## 1. 系統概述

### 1.1 功能目標
基於現有廠商通訊錄系統架構，設計開發廠商人員值班查詢功能，提供工程項目中廠商人員值班安排的查詢、管理和聯絡功能。

### 1.2 設計原則
- **一致性**: 沿用廠商通訊錄的UI/UX設計模式
- **擴展性**: 支援未來值班管理功能擴展
- **易用性**: 提供直觀的查詢和篩選介面
- **即時性**: 支援即時值班狀態查詢

### 1.3 技術架構
```
├── Frontend (React + TypeScript)
│   ├── Pages/
│   │   └── VendorDutySchedulePage.tsx
│   ├── Components/
│   │   ├── DutyScheduleFilters.tsx
│   │   ├── DutyScheduleTable.tsx
│   │   ├── DutyScheduleCalendar.tsx
│   │   └── DutyPersonDetailDialog.tsx
│   └── Types/
│       └── dutySchedule.ts
├── Backend APIs
│   ├── GET /api/duty-schedules
│   ├── GET /api/duty-schedules/{id}
│   └── GET /api/duty-schedules/current
└── Database
    ├── duty_schedules
    ├── duty_assignments  
    └── shift_types
```

## 2. 功能需求

### 2.1 核心功能
- ✅ **值班查詢**: 按日期、廠商、人員查詢值班安排
- ✅ **即時狀態**: 顯示當前值班人員和聯絡方式
- ✅ **多維篩選**: 支援日期範圍、廠商類型、班別篩選
- ✅ **聯絡整合**: 整合通訊錄資料，提供直接撥號功能
- ✅ **視圖切換**: 提供表格和日曆視圖

### 2.2 進階功能 (未來擴展)
- 🔄 值班提醒通知
- 🔄 替班安排管理
- 🔄 值班統計報表
- 🔄 異常值班處理

### 2.3 用戶場景
1. **工地主管**: 查詢今日值班廠商人員聯絡方式
2. **專案經理**: 檢視週/月值班安排概況
3. **安全督導**: 確認夜班/假日值班人員配置
4. **緊急聯絡**: 快速找到當前值班負責人

## 3. 數據模型設計

### 3.1 核心數據類型

```typescript
// 班別類型
export enum ShiftType {
  DAY = '日班',      // 08:00-17:00
  NIGHT = '夜班',    // 17:00-08:00
  FULL = '全日',     // 00:00-24:00
  EMERGENCY = '緊急', // 待命班
}

// 值班狀態
export enum DutyStatus {
  SCHEDULED = '已排班',
  ON_DUTY = '值班中', 
  OFF_DUTY = '下班',
  ABSENT = '缺勤',
  REPLACED = '代班',
}

// 值班記錄
export interface DutySchedule {
  id: string
  projectId: string
  vendorId: string
  vendorName: string
  personId: string
  personName: string
  personPosition: string
  mobile: string
  extension?: string
  mvpn?: string
  email: string
  
  // 值班資訊
  dutyDate: Date
  shiftType: ShiftType
  startTime: string  // HH:mm
  endTime: string    // HH:mm
  status: DutyStatus
  
  // 工作區域
  workArea?: string
  workLocation?: string
  
  // 代班資訊
  originalPersonId?: string
  originalPersonName?: string
  replacementReason?: string
  
  // 備註
  notes?: string
  emergencyContact?: string
  specialInstructions?: string
  
  // 系統欄位
  createdAt: Date
  updatedAt: Date
  createdBy: string
}
```

### 3.2 查詢篩選類型

```typescript
export interface DutyScheduleFilters {
  // 日期篩選
  dateRange?: {
    from: Date
    to: Date
  }
  specificDate?: Date
  
  // 人員篩選
  vendorIds?: string[]
  vendorTypes?: VendorType[]
  personName?: string
  
  // 班別篩選
  shiftTypes?: ShiftType[]
  
  // 狀態篩選
  statuses?: DutyStatus[]
  
  // 工作區域篩選
  workAreas?: string[]
  
  // 關鍵字搜尋
  search?: string
}

export interface DutyScheduleSort {
  field: keyof DutySchedule | 'vendorName' | 'personName'
  direction: 'asc' | 'desc'
}
```

### 3.3 統計數據類型

```typescript
export interface DutyScheduleStats {
  totalSchedules: number
  activeSchedules: number
  
  byShiftType: Record<ShiftType, number>
  byStatus: Record<DutyStatus, number>
  byVendor: Record<string, number>
  
  currentOnDuty: DutySchedule[]
  upcomingDuties: DutySchedule[]
  alertsCount: number
}
```

## 4. UI組件設計

### 4.1 頁面布局
```
┌─────────────────────────────────────────────────────┐
│ 📱 導航列 > 人力資源 > 廠商人員值班查詢                    │
├─────────────────────────────────────────────────────┤
│ 🔍 搜尋篩選區                                        │
│ ├─ 日期範圍選擇器                                     │
│ ├─ 廠商/人員篩選                                      │
│ ├─ 班別篩選                                          │
│ └─ 狀態篩選                                          │
├─────────────────────────────────────────────────────┤
│ 📊 統計卡片區                                        │
│ ├─ 今日值班人數                                      │ 
│ ├─ 目前值班中                                        │
│ ├─ 緊急聯絡人                                        │
│ └─ 異常提醒                                          │
├─────────────────────────────────────────────────────┤
│ 🔄 視圖切換 [表格] [日曆]                              │
├─────────────────────────────────────────────────────┤
│ 📋 值班資料展示區                                     │
│ └─ 值班表格 / 值班日曆                                │
└─────────────────────────────────────────────────────┘
```

### 4.2 關鍵組件規格

#### 4.2.1 DutyScheduleFilters 組件
```typescript
interface DutyScheduleFiltersProps {
  filters: DutyScheduleFilters
  onFiltersChange: (filters: DutyScheduleFilters) => void
  onSearch: () => void
  onReset: () => void
  loading?: boolean
}

// 功能特色:
// - 日期範圍選擇器 (今日/本週/本月/自訂)
// - 廠商多選下拉框
// - 班別多選標籤
// - 即時搜尋建議
```

#### 4.2.2 DutyScheduleTable 組件  
```typescript
interface DutyScheduleTableProps {
  schedules: DutySchedule[]
  loading?: boolean
  pagination?: Pagination
  onPaginationChange?: (page: number, pageSize: number) => void
  onSort?: (sort: DutyScheduleSort) => void
  onViewPerson?: (schedule: DutySchedule) => void
  onCallPerson?: (schedule: DutySchedule) => void
}

// 欄位設計:
// [日期] [班別] [廠商] [姓名] [職位] [手機] [分機] [MVPN] [狀態] [工作區域] [操作]
```

#### 4.2.3 DutyScheduleCalendar 組件
```typescript
interface DutyScheduleCalendarProps {
  schedules: DutySchedule[]
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  onScheduleClick?: (schedule: DutySchedule) => void
  viewMode?: 'month' | 'week' | 'day'
}

// 功能特色:
// - 月/週/日視圖切換
// - 值班狀態顏色標示
// - 班別時段顯示
// - 點擊查看詳情
```

#### 4.2.4 DutyPersonDetailDialog 組件
```typescript
interface DutyPersonDetailDialogProps {
  schedule: DutySchedule | null
  open: boolean
  onClose: () => void
  onCall?: (number: string) => void
  onEmail?: (email: string) => void
}

// 顯示內容:
// - 人員基本資訊
// - 值班詳細資訊  
// - 聯絡方式
// - 快速操作按鈕
```

### 4.3 響應式設計
- **桌面版**: 完整功能，表格視圖優先
- **平板版**: 收合篩選面板，優化觸控操作
- **手機版**: 卡片式布局，重點顯示聯絡資訊

## 5. API接口規格

### 5.1 查詢值班安排
```
GET /api/projects/{projectId}/duty-schedules

Query Parameters:
- page: number (頁碼)
- pageSize: number (每頁筆數)  
- dateFrom: string (開始日期 YYYY-MM-DD)
- dateTo: string (結束日期 YYYY-MM-DD)
- vendorIds: string[] (廠商ID列表)
- shiftTypes: string[] (班別類型)
- statuses: string[] (狀態)
- search: string (關鍵字搜尋)

Response:
{
  success: boolean
  data: {
    schedules: DutySchedule[]
    pagination: Pagination
    stats: DutyScheduleStats
  }
}
```

### 5.2 取得當前值班
```
GET /api/projects/{projectId}/duty-schedules/current

Response:
{
  success: boolean
  data: {
    currentShifts: DutySchedule[]
    nextShifts: DutySchedule[]
    emergencyContacts: DutySchedule[]
  }
}
```

### 5.3 取得值班詳情
```
GET /api/duty-schedules/{scheduleId}

Response:
{
  success: boolean
  data: DutySchedule & {
    vendorInfo: Vendor
    replacementHistory?: DutySchedule[]
  }
}
```

## 6. 實作計劃

### Phase 1: 基礎查詢功能 (2-3天)
- ✅ 數據類型定義
- ✅ 基本頁面結構
- ✅ 篩選組件
- ✅ 表格展示

### Phase 2: 進階功能 (2天)
- 🔄 日曆視圖
- 🔄 統計卡片
- 🔄 詳情對話框
- 🔄 聯絡整合

### Phase 3: 優化和測試 (1天)
- 🔄 響應式優化
- 🔄 效能優化
- 🔄 測試用例
- 🔄 文檔完善

---

## 📝 設計決策記錄

### 為什麼選擇這個架構?
1. **延續性**: 沿用廠商通訊錄的成功模式，降低學習成本
2. **擴展性**: 預留未來值班管理功能的擴展空間
3. **一致性**: 保持整個系統的UI/UX一致性
4. **實用性**: 重點解決實際工地值班查詢需求

### 主要設計亮點
- 🎯 **情境化設計**: 針對不同用戶角色優化查詢流程
- 📱 **多視圖支援**: 表格和日曆視圖滿足不同查看需求  
- ⚡ **即時資訊**: 突出顯示當前值班和緊急聯絡資訊
- 🔍 **智能篩選**: 多維度篩選提高查詢效率