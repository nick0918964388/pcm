/**
 * 廠商人員值班查詢相關類型定義
 * 
 * 基於廠商通訊錄架構擴展的值班管理系統類型定義
 * 
 * @module DutyScheduleTypes
 * @version 1.0
 * @date 2025-01-15
 */

import { VendorType, VendorStatus } from './vendor'

// 因為 vendor.ts 中的 VendorType 枚舉值與本文件中使用的不同，
// 在這裡重新定義以保持一致性
export { VendorType, VendorStatus } from './vendor'

// ==================== ENUMS ====================

/**
 * 班別類型
 */
export enum ShiftType {
  DAY = '日班',          // 08:00-17:00
  NIGHT = '夜班',        // 17:00-08:00  
  FULL = '全日',         // 00:00-24:00
  EMERGENCY = '緊急',    // 待命班
  OVERTIME = '加班',     // 延長工時
}

/**
 * 值班狀態
 */
export enum DutyStatus {
  SCHEDULED = '已排班',  // 已安排但尚未開始
  ON_DUTY = '值班中',    // 正在值班
  OFF_DUTY = '下班',     // 已下班
  ABSENT = '缺勤',       // 未到班
  REPLACED = '代班',     // 由他人代班
  CANCELLED = '取消',    // 班次取消
}

/**
 * 工作區域類型
 */
export enum WorkArea {
  MAIN_SITE = '主工區',
  OFFICE = '辦公區',
  WAREHOUSE = '倉儲區',
  EQUIPMENT = '設備區',
  SAFETY = '安全區',
  ENTRANCE = '入口處',
  OTHER = '其他'
}

/**
 * 緊急程度
 */
export enum UrgencyLevel {
  LOW = '低',
  MEDIUM = '中',
  HIGH = '高',
  CRITICAL = '緊急'
}

// ==================== INTERFACES ====================

/**
 * 值班時間段
 */
export interface ShiftTime {
  /** 開始時間 HH:mm */
  startTime: string
  /** 結束時間 HH:mm */
  endTime: string
  /** 是否跨日 */
  crossDay: boolean
  /** 總時數 */
  totalHours: number
}

/**
 * 值班人員資訊
 */
export interface DutyPerson {
  /** 人員ID */
  id: string
  /** 姓名 */
  name: string
  /** 職位 */
  position: string
  /** 手機號碼 */
  mobile: string
  /** 分機 */
  extension?: string
  /** Email */
  email: string
  /** MVPN */
  mvpn?: string
  /** 廠商ID */
  vendorId: string
  /** 廠商名稱 */
  vendorName: string
  /** 廠商類型 */
  vendorType: VendorType
  /** 是否為主要聯絡人 */
  isPrimary: boolean
  /** 上線主管 */
  supervisor?: string
  /** 緊急聯絡人 */
  emergencyContact?: string
}

/**
 * 值班安排記錄
 */
export interface DutySchedule {
  /** 值班記錄ID */
  id: string
  /** 專案ID */
  projectId: string
  /** 值班日期 */
  dutyDate: Date
  /** 班別類型 */
  shiftType: ShiftType
  /** 班次時間 */
  shiftTime: ShiftTime
  /** 值班狀態 */
  status: DutyStatus
  
  /** 值班人員 */
  person: DutyPerson
  
  /** 工作區域 */
  workArea: WorkArea
  /** 具體工作地點 */
  workLocation?: string
  
  /** 代班資訊 */
  replacement?: {
    originalPersonId: string
    originalPersonName: string
    replacementPersonId: string
    replacementPersonName: string
    reason: string
    approvedBy?: string
    approvedAt?: Date
  }
  
  /** 值班要求 */
  requirements?: {
    /** 特殊技能要求 */
    specialSkills?: string[]
    /** 安全資格要求 */
    safetyQualifications?: string[]
    /** 語言要求 */
    languageRequirements?: string[]
  }
  
  /** 備註資訊 */
  notes?: string
  /** 特殊指示 */
  specialInstructions?: string
  /** 緊急程度 */
  urgencyLevel?: UrgencyLevel
  
  /** 簽到退記錄 */
  checkIn?: {
    checkInTime?: Date
    checkOutTime?: Date
    actualHours?: number
    gpsLocation?: string
  }
  
  /** 系統欄位 */
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

/**
 * 值班查詢篩選條件
 */
export interface DutyScheduleFilters {
  /** 搜尋關鍵字（姓名、廠商名稱） */
  search?: string
  
  /** 日期篩選 */
  dateRange?: {
    from: Date
    to: Date
  }
  /** 特定日期 */
  specificDate?: Date
  
  /** 廠商篩選 */
  vendorIds?: string[]
  vendorTypes?: VendorType[]
  vendorStatuses?: VendorStatus[]
  
  /** 人員篩選 */
  personName?: string
  personPosition?: string
  
  /** 班別篩選 */
  shiftTypes?: ShiftType[]
  
  /** 狀態篩選 */
  statuses?: DutyStatus[]
  
  /** 工作區域篩選 */
  workAreas?: WorkArea[]
  
  /** 緊急程度篩選 */
  urgencyLevels?: UrgencyLevel[]
  
  /** 是否只顯示當前值班 */
  currentOnly?: boolean
  
  /** 是否包含代班記錄 */
  includeReplacements?: boolean
}

/**
 * 值班排序設定
 */
export interface DutyScheduleSort {
  /** 排序欄位 */
  field: keyof DutySchedule | 'personName' | 'vendorName' | 'dutyDate' | 'shiftTime'
  /** 排序方向 */
  direction: 'asc' | 'desc'
}

/**
 * 分頁設定
 */
export interface DutySchedulePagination {
  /** 當前頁碼 */
  page: number
  /** 每頁資料筆數 */
  pageSize: number
  /** 總資料筆數 */
  total: number
  /** 總頁數 */
  totalPages: number
}

/**
 * 值班統計資訊
 */
export interface DutyScheduleStats {
  /** 總排班數 */
  totalSchedules: number
  /** 有效排班數 */
  activeSchedules: number
  /** 當前值班人數 */
  currentOnDutyCount: number
  
  /** 按班別統計 */
  byShiftType: Record<ShiftType, number>
  /** 按狀態統計 */
  byStatus: Record<DutyStatus, number>
  /** 按廠商統計 */
  byVendor: Record<string, {
    vendorName: string
    count: number
    currentOnDuty: number
  }>
  /** 按工作區域統計 */
  byWorkArea: Record<WorkArea, number>
  
  /** 當前值班中的人員 */
  currentOnDuty: DutySchedule[]
  /** 即將開始值班的人員 */
  upcomingDuties: DutySchedule[]
  /** 緊急聯絡人 */
  emergencyContacts: DutySchedule[]
  
  /** 提醒數量 */
  alertsCount: number
  /** 異常情況數量 */
  anomaliesCount: number
}

/**
 * 值班查詢結果
 */
export interface DutyScheduleQueryResult {
  /** 值班安排列表 */
  schedules: DutySchedule[]
  /** 分頁資訊 */
  pagination: DutySchedulePagination
  /** 統計資訊 */
  stats?: DutyScheduleStats
}

/**
 * 值班日曆事件
 */
export interface DutyCalendarEvent {
  /** 事件ID */
  id: string
  /** 標題 */
  title: string
  /** 開始時間 */
  start: Date
  /** 結束時間 */
  end: Date
  /** 值班記錄 */
  dutySchedule: DutySchedule
  /** 事件顏色（基於狀態） */
  color: string
  /** 是否全日事件 */
  allDay: boolean
}

// ==================== API RESPONSE TYPES ====================

/**
 * API 回應格式
 */
export interface ApiResponse<T> {
  /** 請求是否成功 */
  success: boolean
  /** 回應資料 */
  data: T
  /** 錯誤訊息 */
  message?: string
  /** 錯誤代碼 */
  errorCode?: string
  /** 請求時間戳 */
  timestamp: Date
}

/**
 * 值班查詢 API 回應
 */
export interface DutyScheduleListResponse extends ApiResponse<DutyScheduleQueryResult> {}

/**
 * 單一值班記錄 API 回應
 */
export interface DutyScheduleResponse extends ApiResponse<DutySchedule> {}

/**
 * 當前值班 API 回應
 */
export interface CurrentDutyResponse extends ApiResponse<{
  currentShifts: DutySchedule[]
  nextShifts: DutySchedule[]
  emergencyContacts: DutySchedule[]
}> {}

// ==================== CONSTANTS ====================

/**
 * 值班相關常數
 */
export const DUTY_SCHEDULE_CONSTANTS = {
  /** 預設分頁大小 */
  DEFAULT_PAGE_SIZE: 20,
  /** 最大分頁大小 */
  MAX_PAGE_SIZE: 100,
  /** 搜尋最小字元數 */
  MIN_SEARCH_LENGTH: 2,
  /** 最大查詢天數範圍 */
  MAX_DATE_RANGE_DAYS: 365,
  /** 預設查詢天數範圍 */
  DEFAULT_DATE_RANGE_DAYS: 30,
  /** 自動刷新間隔（毫秒） */
  AUTO_REFRESH_INTERVAL: 300000, // 5分鐘
} as const

/**
 * 班別預設時間配置
 */
export const SHIFT_TIME_CONFIG: Record<ShiftType, ShiftTime> = {
  [ShiftType.DAY]: {
    startTime: '08:00',
    endTime: '17:00',
    crossDay: false,
    totalHours: 9
  },
  [ShiftType.NIGHT]: {
    startTime: '17:00',
    endTime: '08:00',
    crossDay: true,
    totalHours: 15
  },
  [ShiftType.FULL]: {
    startTime: '00:00',
    endTime: '24:00',
    crossDay: false,
    totalHours: 24
  },
  [ShiftType.EMERGENCY]: {
    startTime: '00:00',
    endTime: '24:00',
    crossDay: false,
    totalHours: 24
  },
  [ShiftType.OVERTIME]: {
    startTime: '17:00',
    endTime: '20:00',
    crossDay: false,
    totalHours: 3
  }
}

/**
 * 值班狀態顏色對應
 */
export const DUTY_STATUS_COLORS = {
  [DutyStatus.SCHEDULED]: '#6B7280',    // gray
  [DutyStatus.ON_DUTY]: '#10B981',      // green
  [DutyStatus.OFF_DUTY]: '#9CA3AF',     // gray-400
  [DutyStatus.ABSENT]: '#EF4444',       // red
  [DutyStatus.REPLACED]: '#F59E0B',     // yellow
  [DutyStatus.CANCELLED]: '#DC2626',    // red-600
} as const

/**
 * 班別類型圖示對應
 */
export const SHIFT_TYPE_ICONS = {
  [ShiftType.DAY]: '☀️',
  [ShiftType.NIGHT]: '🌙',
  [ShiftType.FULL]: '🕐',
  [ShiftType.EMERGENCY]: '🚨',
  [ShiftType.OVERTIME]: '⏰',
} as const

/**
 * 工作區域圖示對應
 */
export const WORK_AREA_ICONS = {
  [WorkArea.MAIN_SITE]: '🏗️',
  [WorkArea.OFFICE]: '🏢',
  [WorkArea.WAREHOUSE]: '📦',
  [WorkArea.EQUIPMENT]: '⚙️',
  [WorkArea.SAFETY]: '🦺',
  [WorkArea.ENTRANCE]: '🚪',
  [WorkArea.OTHER]: '📍',
} as const

// ==================== TYPE GUARDS ====================

/**
 * 檢查是否為有效的班別類型
 */
export function isShiftType(value: any): value is ShiftType {
  return Object.values(ShiftType).includes(value)
}

/**
 * 檢查是否為有效的值班狀態
 */
export function isDutyStatus(value: any): value is DutyStatus {
  return Object.values(DutyStatus).includes(value)
}

/**
 * 檢查是否為有效的工作區域
 */
export function isWorkArea(value: any): value is WorkArea {
  return Object.values(WorkArea).includes(value)
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * 計算班次是否正在進行中
 */
export function isShiftActive(schedule: DutySchedule, currentTime: Date = new Date()): boolean {
  const dutyDate = new Date(schedule.dutyDate)
  const startTime = new Date(dutyDate)
  const endTime = new Date(dutyDate)
  
  const [startHour, startMinute] = schedule.shiftTime.startTime.split(':').map(Number)
  const [endHour, endMinute] = schedule.shiftTime.endTime.split(':').map(Number)
  
  startTime.setHours(startHour, startMinute, 0, 0)
  endTime.setHours(endHour, endMinute, 0, 0)
  
  // 處理跨日情況
  if (schedule.shiftTime.crossDay && endHour < startHour) {
    endTime.setDate(endTime.getDate() + 1)
  }
  
  return currentTime >= startTime && currentTime <= endTime
}

/**
 * 格式化班次時間顯示
 */
export function formatShiftTime(shiftTime: ShiftTime): string {
  if (shiftTime.crossDay) {
    return `${shiftTime.startTime} - 次日 ${shiftTime.endTime}`
  }
  return `${shiftTime.startTime} - ${shiftTime.endTime}`
}

/**
 * 取得值班狀態的顯示文字
 */
export function getDutyStatusText(status: DutyStatus): string {
  return status
}

/**
 * 取得班別類型的顯示文字
 */
export function getShiftTypeText(shiftType: ShiftType): string {
  return shiftType
}

// ==================== MOCK DATA GENERATION ====================

/**
 * 生成模擬值班人員資料
 */
export function generateMockDutySchedules(count: number = 50): DutySchedule[] {
  const mockVendors = [
    { id: 'vendor-001', name: '台積電', type: VendorType.CONSTRUCTION },
    { id: 'vendor-002', name: '聯發科技', type: VendorType.SUPPLIER },
    { id: 'vendor-003', name: '中華電信', type: VendorType.SERVICE },
    { id: 'vendor-004', name: '台灣電力', type: VendorType.GOVERNMENT },
    { id: 'vendor-005', name: '中鋼集團', type: VendorType.CONSTRUCTION },
    { id: 'vendor-006', name: '統一企業', type: VendorType.SUPPLIER },
    { id: 'vendor-007', name: '富邦金控', type: VendorType.SERVICE },
  ]

  const mockPersonNames = [
    '張志明', '李雅婷', '王大明', '陳小華', '林志偉', '黃淑芬', '劉建宏', '蔡英文',
    '吳宗憲', '鄭成功', '周杰倫', '徐若瑄', '邱淑貞', '馬英九', '蔡依林', '郭台銘'
  ]

  const mockPositions = [
    '現場主管', '安全督導', '技術專員', '工程師', '品管人員', '機電維修', '保全人員', '清潔人員'
  ]

  const mockWorkLocations = [
    '一號廠房', '二號廠房', '辦公大樓A棟', '辦公大樓B棟', '中央控制室', '機房', '停車場', '大門口'
  ]

  const schedules: DutySchedule[] = []

  for (let i = 0; i < count; i++) {
    const vendor = mockVendors[Math.floor(Math.random() * mockVendors.length)]
    const personName = mockPersonNames[Math.floor(Math.random() * mockPersonNames.length)]
    const position = mockPositions[Math.floor(Math.random() * mockPositions.length)]
    const shiftTypeValues = Object.values(ShiftType)
    const shiftType = shiftTypeValues[Math.floor(Math.random() * shiftTypeValues.length)]
    const statusValues = Object.values(DutyStatus)
    const status = statusValues[Math.floor(Math.random() * statusValues.length)]
    const workAreaValues = Object.values(WorkArea)
    const workArea = workAreaValues[Math.floor(Math.random() * workAreaValues.length)]

    // 生成隨機日期（過去30天到未來30天）
    const baseDate = new Date()
    const randomDays = Math.floor(Math.random() * 60) - 30
    const dutyDate = new Date(baseDate)
    dutyDate.setDate(dutyDate.getDate() + randomDays)

    const person: DutyPerson = {
      id: `person-${String(i + 1).padStart(3, '0')}`,
      name: personName,
      position,
      mobile: `09${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      extension: Math.random() > 0.5 ? String(Math.floor(Math.random() * 9999) + 1000) : undefined,
      email: `${personName.toLowerCase()}@${vendor.name.toLowerCase()}.com.tw`,
      mvpn: Math.random() > 0.7 ? `mvpn-${String(Math.floor(Math.random() * 999) + 100)}` : undefined,
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorType: vendor.type,
      isPrimary: Math.random() > 0.8,
      supervisor: Math.random() > 0.6 ? mockPersonNames[Math.floor(Math.random() * mockPersonNames.length)] : undefined,
      emergencyContact: Math.random() > 0.7 ? `09${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}` : undefined
    }

    const schedule: DutySchedule = {
      id: `schedule-${String(i + 1).padStart(3, '0')}`,
      projectId: 'proj-001',
      dutyDate,
      shiftType,
      shiftTime: SHIFT_TIME_CONFIG[shiftType],
      status,
      person,
      workArea,
      workLocation: Math.random() > 0.5 ? mockWorkLocations[Math.floor(Math.random() * mockWorkLocations.length)] : undefined,
      replacement: Math.random() > 0.9 ? {
        originalPersonId: `person-original-${i}`,
        originalPersonName: mockPersonNames[Math.floor(Math.random() * mockPersonNames.length)],
        replacementPersonId: person.id,
        replacementPersonName: person.name,
        reason: '原班人員臨時請假',
        approvedBy: '張主管',
        approvedAt: new Date(Date.now() - Math.random() * 86400000)
      } : undefined,
      requirements: Math.random() > 0.7 ? {
        specialSkills: ['高空作業', '電氣維修'].filter(() => Math.random() > 0.5),
        safetyQualifications: ['工安證照', '急救證照'].filter(() => Math.random() > 0.5),
        languageRequirements: ['中文', '英文'].filter(() => Math.random() > 0.7)
      } : undefined,
      notes: Math.random() > 0.6 ? '請注意安全防護措施' : undefined,
      specialInstructions: Math.random() > 0.8 ? '需配合夜間施工作業' : undefined,
      urgencyLevel: Math.random() > 0.8 ? Object.values(UrgencyLevel)[Math.floor(Math.random() * Object.values(UrgencyLevel).length)] : undefined,
      checkIn: status === DutyStatus.ON_DUTY || status === DutyStatus.OFF_DUTY ? {
        checkInTime: new Date(dutyDate.getTime() + Math.random() * 3600000),
        checkOutTime: status === DutyStatus.OFF_DUTY ? new Date(dutyDate.getTime() + 8 * 3600000 + Math.random() * 3600000) : undefined,
        actualHours: status === DutyStatus.OFF_DUTY ? 8 + Math.random() * 2 : undefined,
        gpsLocation: `${24.7 + Math.random() * 0.2}, ${121.0 + Math.random() * 0.2}`
      } : undefined,
      createdAt: new Date(Date.now() - Math.random() * 7 * 86400000),
      updatedAt: new Date(),
      createdBy: 'system',
      updatedBy: Math.random() > 0.5 ? 'admin' : undefined
    }

    schedules.push(schedule)
  }

  return schedules.sort((a, b) => new Date(b.dutyDate).getTime() - new Date(a.dutyDate).getTime())
}

/**
 * 生成模擬查詢結果
 */
export function generateMockDutyScheduleQueryResult(
  filters: DutyScheduleFilters = {},
  pagination: Partial<DutySchedulePagination> = {}
): DutyScheduleQueryResult {
  // 生成完整的模擬資料
  let allSchedules = generateMockDutySchedules(200)

  // 應用篩選條件
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    allSchedules = allSchedules.filter(schedule =>
      schedule.person.name.toLowerCase().includes(searchLower) ||
      schedule.person.vendorName.toLowerCase().includes(searchLower) ||
      schedule.person.position.toLowerCase().includes(searchLower)
    )
  }

  if (filters.dateRange) {
    allSchedules = allSchedules.filter(schedule => {
      const scheduleDate = new Date(schedule.dutyDate)
      return scheduleDate >= filters.dateRange!.from && scheduleDate <= filters.dateRange!.to
    })
  }

  if (filters.specificDate) {
    allSchedules = allSchedules.filter(schedule => {
      const scheduleDate = new Date(schedule.dutyDate)
      const filterDate = new Date(filters.specificDate!)
      return scheduleDate.toDateString() === filterDate.toDateString()
    })
  }

  if (filters.vendorIds?.length) {
    allSchedules = allSchedules.filter(schedule =>
      filters.vendorIds!.includes(schedule.person.vendorId)
    )
  }

  if (filters.vendorTypes?.length) {
    allSchedules = allSchedules.filter(schedule =>
      filters.vendorTypes!.includes(schedule.person.vendorType)
    )
  }

  if (filters.shiftTypes?.length) {
    allSchedules = allSchedules.filter(schedule =>
      filters.shiftTypes!.includes(schedule.shiftType)
    )
  }

  if (filters.statuses?.length) {
    allSchedules = allSchedules.filter(schedule =>
      filters.statuses!.includes(schedule.status)
    )
  }

  if (filters.workAreas?.length) {
    allSchedules = allSchedules.filter(schedule =>
      filters.workAreas!.includes(schedule.workArea)
    )
  }

  if (filters.urgencyLevels?.length) {
    allSchedules = allSchedules.filter(schedule =>
      schedule.urgencyLevel && filters.urgencyLevels!.includes(schedule.urgencyLevel)
    )
  }

  if (filters.currentOnly) {
    const now = new Date()
    allSchedules = allSchedules.filter(schedule =>
      schedule.status === DutyStatus.ON_DUTY && isShiftActive(schedule, now)
    )
  }

  if (filters.includeReplacements === false) {
    allSchedules = allSchedules.filter(schedule => !schedule.replacement)
  }

  // 應用分頁
  const page = pagination.page || 1
  const pageSize = pagination.pageSize || DUTY_SCHEDULE_CONSTANTS.DEFAULT_PAGE_SIZE
  const total = allSchedules.length
  const totalPages = Math.ceil(total / pageSize)
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedSchedules = allSchedules.slice(startIndex, endIndex)

  // 生成統計資訊
  const stats: DutyScheduleStats = {
    totalSchedules: total,
    activeSchedules: allSchedules.filter(s => s.status !== DutyStatus.CANCELLED).length,
    currentOnDutyCount: allSchedules.filter(s => s.status === DutyStatus.ON_DUTY).length,
    byShiftType: Object.values(ShiftType).reduce((acc, type) => {
      acc[type] = allSchedules.filter(s => s.shiftType === type).length
      return acc
    }, {} as Record<ShiftType, number>),
    byStatus: Object.values(DutyStatus).reduce((acc, status) => {
      acc[status] = allSchedules.filter(s => s.status === status).length
      return acc
    }, {} as Record<DutyStatus, number>),
    byVendor: allSchedules.reduce((acc, schedule) => {
      const vendorId = schedule.person.vendorId
      if (!acc[vendorId]) {
        acc[vendorId] = {
          vendorName: schedule.person.vendorName,
          count: 0,
          currentOnDuty: 0
        }
      }
      acc[vendorId].count++
      if (schedule.status === DutyStatus.ON_DUTY) {
        acc[vendorId].currentOnDuty++
      }
      return acc
    }, {} as Record<string, { vendorName: string; count: number; currentOnDuty: number }>),
    byWorkArea: Object.values(WorkArea).reduce((acc, area) => {
      acc[area] = allSchedules.filter(s => s.workArea === area).length
      return acc
    }, {} as Record<WorkArea, number>),
    currentOnDuty: allSchedules.filter(s => s.status === DutyStatus.ON_DUTY).slice(0, 10),
    upcomingDuties: allSchedules
      .filter(s => s.status === DutyStatus.SCHEDULED && new Date(s.dutyDate) > new Date())
      .slice(0, 5),
    emergencyContacts: allSchedules
      .filter(s => s.shiftType === ShiftType.EMERGENCY || s.urgencyLevel === UrgencyLevel.CRITICAL)
      .slice(0, 3),
    alertsCount: allSchedules.filter(s => s.status === DutyStatus.ABSENT).length,
    anomaliesCount: allSchedules.filter(s => s.replacement || s.status === DutyStatus.CANCELLED).length
  }

  return {
    schedules: paginatedSchedules,
    pagination: {
      page,
      pageSize,
      total,
      totalPages
    },
    stats
  }
}