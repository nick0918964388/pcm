# 廠商人員值班查詢 API 規格

## 📋 API 概覽

### 基礎資訊
- **Base URL**: `/api/projects/{projectId}/duty-schedules`
- **認證方式**: Bearer Token
- **請求格式**: JSON
- **回應格式**: JSON
- **API 版本**: v1

### 通用回應格式
```typescript
interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  errorCode?: string
  timestamp: string
}

interface ErrorResponse {
  success: false
  message: string
  errorCode: string
  timestamp: string
  details?: any
}
```

## 🔍 1. 查詢值班安排列表

### 請求
```http
GET /api/projects/{projectId}/duty-schedules
```

#### 查詢參數
```typescript
interface QueryParams {
  // 分頁參數
  page?: number              // 頁碼，預設 1
  pageSize?: number          // 每頁筆數，預設 20，最大 100
  
  // 排序參數
  sortBy?: string           // 排序欄位
  sortOrder?: 'asc' | 'desc' // 排序方向，預設 'desc'
  
  // 日期篩選
  dateFrom?: string         // 開始日期 YYYY-MM-DD
  dateTo?: string          // 結束日期 YYYY-MM-DD
  specificDate?: string    // 特定日期 YYYY-MM-DD
  
  // 廠商篩選
  vendorIds?: string       // 廠商ID，逗號分隔
  vendorTypes?: string     // 廠商類型，逗號分隔
  
  // 人員篩選
  personName?: string      // 人員姓名（模糊搜尋）
  personPosition?: string  // 職位（模糊搜尋）
  
  // 班別篩選
  shiftTypes?: string      // 班別類型，逗號分隔
  
  // 狀態篩選
  statuses?: string        // 值班狀態，逗號分隔
  
  // 工作區域篩選
  workAreas?: string       // 工作區域，逗號分隔
  
  // 其他篩選
  currentOnly?: boolean    // 只顯示當前值班，預設 false
  includeReplacements?: boolean // 包含代班記錄，預設 true
  
  // 搜尋關鍵字
  search?: string          // 全文搜尋（姓名、廠商名稱、備註）
}
```

#### 請求範例
```http
GET /api/projects/proj001/duty-schedules?page=1&pageSize=20&dateFrom=2025-01-15&dateTo=2025-01-20&shiftTypes=日班,夜班&statuses=值班中,已排班&search=張三
Authorization: Bearer {token}
```

### 回應
```typescript
interface DutyScheduleListResponse {
  success: true
  data: {
    schedules: DutySchedule[]
    pagination: {
      page: number
      pageSize: number
      total: number
      totalPages: number
    }
    stats: {
      totalSchedules: number
      activeSchedules: number
      currentOnDutyCount: number
      byShiftType: Record<ShiftType, number>
      byStatus: Record<DutyStatus, number>
      byVendor: Record<string, {
        vendorName: string
        count: number
        currentOnDuty: number
      }>
      byWorkArea: Record<WorkArea, number>
      alertsCount: number
      anomaliesCount: number
    }
  }
  timestamp: string
}
```

#### 回應範例
```json
{
  "success": true,
  "data": {
    "schedules": [
      {
        "id": "duty-001",
        "projectId": "proj001",
        "dutyDate": "2025-01-15T00:00:00.000Z",
        "shiftType": "日班",
        "shiftTime": {
          "startTime": "08:00",
          "endTime": "17:00",
          "crossDay": false,
          "totalHours": 9
        },
        "status": "值班中",
        "person": {
          "id": "person-001",
          "name": "張三",
          "position": "現場主管",
          "mobile": "0912345678",
          "extension": "101",
          "email": "zhang@vendor.com.tw",
          "mvpn": "123-4567",
          "vendorId": "vendor-001",
          "vendorName": "ABC建設",
          "vendorType": "承包商",
          "isPrimary": true,
          "supervisor": "李經理"
        },
        "workArea": "主工區",
        "workLocation": "A區鋼構工程",
        "notes": "負責鋼構吊裝作業監督",
        "createdAt": "2025-01-10T08:00:00.000Z",
        "updatedAt": "2025-01-15T08:30:00.000Z",
        "createdBy": "admin"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 45,
      "totalPages": 3
    },
    "stats": {
      "totalSchedules": 45,
      "activeSchedules": 38,
      "currentOnDutyCount": 12,
      "byShiftType": {
        "日班": 20,
        "夜班": 15,
        "全日": 8,
        "緊急": 2
      },
      "byStatus": {
        "已排班": 26,
        "值班中": 12,
        "下班": 5,
        "缺勤": 1,
        "代班": 1
      },
      "byVendor": {
        "vendor-001": {
          "vendorName": "ABC建設",
          "count": 15,
          "currentOnDuty": 4
        }
      },
      "byWorkArea": {
        "主工區": 25,
        "辦公區": 8,
        "倉儲區": 6,
        "設備區": 4,
        "其他": 2
      },
      "alertsCount": 3,
      "anomaliesCount": 1
    }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## 📅 2. 取得當前值班資訊

### 請求
```http
GET /api/projects/{projectId}/duty-schedules/current
```

### 回應
```typescript
interface CurrentDutyResponse {
  success: true
  data: {
    currentShifts: DutySchedule[]     // 目前值班中
    nextShifts: DutySchedule[]        // 即將開始值班（2小時內）
    emergencyContacts: DutySchedule[] // 緊急聯絡人（待命班）
    summary: {
      totalOnDuty: number
      byShiftType: Record<ShiftType, number>
      byWorkArea: Record<WorkArea, number>
      lastUpdated: string
    }
  }
  timestamp: string
}
```

## 🔍 3. 取得單一值班記錄詳情

### 請求
```http
GET /api/projects/{projectId}/duty-schedules/{scheduleId}
```

### 回應
```typescript
interface DutyScheduleDetailResponse {
  success: true
  data: DutySchedule & {
    vendorInfo: {
      id: string
      name: string
      type: VendorType
      phone?: string
      address?: string
      contactCount: number
    }
    replacementHistory?: Array<{
      id: string
      originalPersonName: string
      replacementPersonName: string
      reason: string
      replacementDate: string
      approvedBy?: string
    }>
    relatedSchedules?: DutySchedule[] // 同人員的其他排班
  }
  timestamp: string
}
```

## 📊 4. 取得值班統計資訊

### 請求
```http
GET /api/projects/{projectId}/duty-schedules/stats
```

#### 查詢參數
```typescript
interface StatsQueryParams {
  dateFrom?: string    // 統計開始日期
  dateTo?: string     // 統計結束日期
  groupBy?: 'day' | 'week' | 'month' // 分組方式
  includeDetails?: boolean // 是否包含詳細資料
}
```

### 回應
```typescript
interface DutyScheduleStatsResponse {
  success: true
  data: {
    overview: {
      totalSchedules: number
      totalPersonnel: number
      totalVendors: number
      averageDailyOnDuty: number
      peakOnDutyCount: number
      peakOnDutyDate: string
    }
    trends: Array<{
      date: string
      scheduledCount: number
      actualOnDutyCount: number
      absentCount: number
      replacementCount: number
    }>
    distributions: {
      byShiftType: Record<ShiftType, number>
      byWorkArea: Record<WorkArea, number>
      byVendor: Record<string, {
        vendorName: string
        totalHours: number
        scheduleCount: number
        reliabilityRate: number // 出勤率
      }>
    }
    alerts: Array<{
      type: 'absent' | 'late' | 'overtime' | 'coverage_gap'
      message: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      scheduleId?: string
      timestamp: string
    }>
  }
  timestamp: string
}
```

## 📅 5. 取得值班日曆資料

### 請求
```http
GET /api/projects/{projectId}/duty-schedules/calendar
```

#### 查詢參數
```typescript
interface CalendarQueryParams {
  year: number         // 年份
  month: number        // 月份 (1-12)
  viewMode?: 'month' | 'week' // 檢視模式
  vendorIds?: string   // 篩選特定廠商
  workAreas?: string   // 篩選特定工作區域
}
```

### 回應
```typescript
interface DutyCalendarResponse {
  success: true
  data: {
    events: Array<{
      id: string
      title: string        // 顯示文字：「張三 (ABC建設) - 日班」
      start: string        // ISO 8601 格式
      end: string         // ISO 8601 格式
      allDay: boolean
      color: string       // 基於狀態的顏色
      dutySchedule: DutySchedule
      conflicts?: string[] // 衝突的排班ID
    }>
    summary: {
      totalDays: number
      scheduledDays: number
      peakDayCount: number
      peakDayDate: string
      averageDailySchedules: number
    }
  }
  timestamp: string
}
```

## ⚠️ 6. 取得值班提醒和異常

### 請求
```http
GET /api/projects/{projectId}/duty-schedules/alerts
```

#### 查詢參數
```typescript
interface AlertsQueryParams {
  severity?: 'low' | 'medium' | 'high' | 'critical'
  type?: 'absent' | 'late' | 'overtime' | 'coverage_gap' | 'conflict'
  dateFrom?: string
  dateTo?: string
  resolved?: boolean   // 是否已解決
}
```

### 回應
```typescript
interface DutyAlertsResponse {
  success: true
  data: {
    alerts: Array<{
      id: string
      type: 'absent' | 'late' | 'overtime' | 'coverage_gap' | 'conflict'
      severity: 'low' | 'medium' | 'high' | 'critical'
      title: string
      message: string
      scheduleId?: string
      affectedPersons: string[]
      suggestedActions: string[]
      createdAt: string
      resolvedAt?: string
      resolvedBy?: string
    }>
    summary: {
      total: number
      byType: Record<string, number>
      bySeverity: Record<string, number>
      unresolved: number
    }
  }
  timestamp: string
}
```

## 🔍 7. 搜尋建議 API

### 請求
```http
GET /api/projects/{projectId}/duty-schedules/suggestions
```

#### 查詢參數
```typescript
interface SuggestionsQueryParams {
  type: 'person' | 'vendor' | 'workArea'
  query: string        // 搜尋關鍵字
  limit?: number       // 回傳數量限制，預設 10
}
```

### 回應
```typescript
interface SuggestionsResponse {
  success: true
  data: {
    suggestions: Array<{
      id: string
      label: string      // 顯示文字
      value: string      // 實際值
      metadata?: any     // 額外資訊
    }>
  }
  timestamp: string
}
```

## 📱 8. 匯出功能 API

### 請求
```http
POST /api/projects/{projectId}/duty-schedules/export
Content-Type: application/json

{
  "format": "excel" | "csv" | "pdf",
  "filters": DutyScheduleFilters,
  "columns": string[],  // 要匯出的欄位
  "fileName": string    // 檔案名稱
}
```

### 回應
```typescript
interface ExportResponse {
  success: true
  data: {
    downloadUrl: string  // 下載連結
    fileName: string
    fileSize: number
    expiresAt: string   // 連結過期時間
  }
  timestamp: string
}
```

## 🔄 WebSocket 即時更新

### 連線端點
```
ws://api.domain.com/ws/projects/{projectId}/duty-schedules
```

### 訊息格式
```typescript
interface WebSocketMessage {
  type: 'duty_update' | 'status_change' | 'alert' | 'schedule_change'
  data: any
  timestamp: string
}

// 值班狀態更新
interface DutyUpdateMessage {
  type: 'duty_update'
  data: {
    scheduleId: string
    previousStatus: DutyStatus
    newStatus: DutyStatus
    personName: string
    shiftType: ShiftType
  }
  timestamp: string
}

// 新增提醒
interface AlertMessage {
  type: 'alert'
  data: {
    alertId: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    affectedSchedules: string[]
  }
  timestamp: string
}
```

## 🚫 錯誤代碼表

| 錯誤代碼 | HTTP狀態碼 | 說明 |
|---------|-----------|------|
| DUTY_NOT_FOUND | 404 | 找不到指定的值班記錄 |
| INVALID_DATE_RANGE | 400 | 日期範圍無效 |
| INVALID_PAGINATION | 400 | 分頁參數無效 |
| UNAUTHORIZED_ACCESS | 403 | 無權限存取此專案 |
| PROJECT_NOT_FOUND | 404 | 專案不存在 |
| VENDOR_NOT_FOUND | 404 | 廠商不存在 |
| PERSON_NOT_FOUND | 404 | 人員不存在 |
| SCHEDULE_CONFLICT | 409 | 排班衝突 |
| INVALID_SHIFT_TIME | 400 | 班次時間設定無效 |
| EXPORT_FAILED | 500 | 匯出失敗 |
| WEBSOCKET_AUTH_FAILED | 401 | WebSocket 認證失敗 |

## 📝 API 使用範例

### JavaScript/TypeScript 客戶端範例
```typescript
class DutyScheduleAPI {
  private baseUrl: string
  private token: string

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl
    this.token = token
  }

  // 查詢值班列表
  async getSchedules(
    projectId: string, 
    filters: DutyScheduleFilters = {},
    pagination: { page?: number, pageSize?: number } = {}
  ): Promise<DutyScheduleListResponse> {
    const params = new URLSearchParams({
      page: String(pagination.page || 1),
      pageSize: String(pagination.pageSize || 20),
      ...this.serializeFilters(filters)
    })

    const response = await fetch(`${this.baseUrl}/projects/${projectId}/duty-schedules?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    })

    return response.json()
  }

  // 取得當前值班
  async getCurrentDuty(projectId: string): Promise<CurrentDutyResponse> {
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/duty-schedules/current`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    })

    return response.json()
  }

  // WebSocket 連線
  connectWebSocket(projectId: string): WebSocket {
    const ws = new WebSocket(`ws://api.domain.com/ws/projects/${projectId}/duty-schedules`)
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'auth',
        token: this.token
      }))
    }

    ws.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data)
      this.handleWebSocketMessage(message)
    }

    return ws
  }

  private serializeFilters(filters: DutyScheduleFilters): Record<string, string> {
    // 實作篩選參數序列化邏輯
    return {}
  }

  private handleWebSocketMessage(message: WebSocketMessage) {
    // 處理 WebSocket 訊息
    console.log('Received message:', message)
  }
}
```

## 🔒 安全性考量

### 認證與授權
- 所有 API 都需要有效的 Bearer Token
- 驗證使用者對特定專案的存取權限
- API 金鑰有適當的權限範圍設定

### 資料驗證
- 所有輸入參數都進行格式驗證
- 日期範圍不超過最大允許範圍
- 分頁參數在合理範圍內
- SQL 注入防護

### 效能考量
- API 回應包含 ETag 支援快取
- 分頁查詢避免全表掃描
- WebSocket 連線數量限制
- 匯出功能非同步處理

### 隱私保護
- 敏感個人資訊遮罩
- API 記錄不包含個人資料
- 符合 GDPR 規範