/**
 * 廠商通訊錄相關類型定義
 * 
 * 基於設計圖片 pcm4.png 分析的廠商通訊錄系統類型定義
 * 
 * @module VendorTypes
 * @version 1.0
 * @date 2025-09-04
 */

// ==================== ENUMS ====================

/**
 * 廠商狀態
 */
export enum VendorStatus {
  ACTIVE = '啟用',
  INACTIVE = '停用',
  PENDING = '待審核',
  SUSPENDED = '暫停'
}

/**
 * 廠商類型
 */
export enum VendorType {
  CONTRACTOR = '承包商',
  SUPPLIER = '供應商',
  SERVICE_PROVIDER = '服務商',
  CONSULTANT = '顧問'
}

/**
 * 聯絡人職位類型
 */
export enum ContactPosition {
  MANAGER = '經理',
  SUPERVISOR = '主管',
  COORDINATOR = '協調員',
  TECHNICIAN = '技術員',
  SALES = '業務',
  OTHER = '其他'
}

// ==================== INTERFACES ====================

/**
 * 廠商聯絡人資訊
 */
export interface VendorContact {
  /** 聯絡人ID */
  id: string
  /** 姓名 */
  name: string
  /** 職位 */
  position: ContactPosition
  /** 手機號碼 */
  mobile: string
  /** 分機 */
  extension?: string
  /** Email */
  email: string
  /** 是否為主要聯絡人 */
  isPrimary: boolean
  /** MVPN */
  mvpn?: string
  /** 上線主管 */
  supervisor?: string
  /** 備註 */
  notes?: string
}

/**
 * 廠商基本資訊
 */
export interface Vendor {
  /** 廠商ID */
  id: string
  /** 廠商代碼 */
  code: string
  /** 廠商名稱 */
  name: string
  /** 廠商別名 */
  alias?: string
  /** 廠商類型 */
  type: VendorType
  /** 廠商狀態 */
  status: VendorStatus
  /** 統一編號 */
  taxId?: string
  /** 地址 */
  address?: string
  /** 電話 */
  phone?: string
  /** 傳真 */
  fax?: string
  /** 網站 */
  website?: string
  /** 聯絡人列表 */
  contacts: VendorContact[]
  /** 建立日期 */
  createdAt: Date
  /** 最後更新日期 */
  updatedAt: Date
  /** 備註 */
  notes?: string
}

/**
 * 廠商查詢篩選條件
 */
export interface VendorFilters {
  /** 搜尋關鍵字（代碼、名稱、別名） */
  search?: string
  /** 廠商類型篩選 */
  type?: VendorType[]
  /** 廠商狀態篩選 */
  status?: VendorStatus[]
  /** 聯絡人姓名篩選 */
  contactName?: string
  /** 電話號碼篩選 */
  phone?: string
  /** Email篩選 */
  email?: string
  /** 建立日期範圍 */
  dateRange?: {
    from: Date
    to: Date
  }
}

/**
 * 廠商排序設定
 */
export interface VendorSort {
  /** 排序欄位 */
  field: keyof Vendor | 'contactName' | 'contactMobile' | 'contactEmail'
  /** 排序方向 */
  direction: 'asc' | 'desc'
}

/**
 * 分頁設定
 */
export interface VendorPagination {
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
 * 廠商查詢結果
 */
export interface VendorQueryResult {
  /** 廠商列表 */
  vendors: Vendor[]
  /** 分頁資訊 */
  pagination: VendorPagination
  /** 查詢統計 */
  stats?: {
    totalByType: Record<VendorType, number>
    totalByStatus: Record<VendorStatus, number>
    totalContacts: number
  }
}

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
 * 廠商列表 API 回應
 */
export interface VendorListResponse extends ApiResponse<VendorQueryResult> {}

/**
 * 單一廠商 API 回應
 */
export interface VendorResponse extends ApiResponse<Vendor> {}

/**
 * 廠商表單資料
 */
export interface VendorFormData {
  /** 廠商代碼 */
  code: string
  /** 廠商名稱 */
  name: string
  /** 廠商別名 */
  alias?: string
  /** 廠商類型 */
  type: VendorType
  /** 統一編號 */
  taxId?: string
  /** 地址 */
  address?: string
  /** 電話 */
  phone?: string
  /** 傳真 */
  fax?: string
  /** 網站 */
  website?: string
  /** 聯絡人列表 */
  contacts: Omit<VendorContact, 'id'>[]
  /** 備註 */
  notes?: string
}

/**
 * 廠商表單驗證錯誤
 */
export interface VendorFormErrors {
  [key: string]: string[]
}

// ==================== CONSTANTS ====================

/**
 * 廠商相關常數
 */
export const VENDOR_CONSTANTS = {
  /** 預設分頁大小 */
  DEFAULT_PAGE_SIZE: 10,
  /** 最大分頁大小 */
  MAX_PAGE_SIZE: 100,
  /** 搜尋最小字元數 */
  MIN_SEARCH_LENGTH: 2,
  /** 廠商代碼最大長度 */
  MAX_CODE_LENGTH: 20,
  /** 廠商名稱最大長度 */
  MAX_NAME_LENGTH: 100,
  /** 最大聯絡人數量 */
  MAX_CONTACTS: 10,
} as const

/**
 * 廠商狀態顏色對應
 */
export const VENDOR_STATUS_COLORS = {
  [VendorStatus.ACTIVE]: 'green',
  [VendorStatus.INACTIVE]: 'gray',
  [VendorStatus.PENDING]: 'yellow',
  [VendorStatus.SUSPENDED]: 'red',
} as const

/**
 * 廠商類型圖示對應
 */
export const VENDOR_TYPE_ICONS = {
  [VendorType.CONTRACTOR]: '🏗️',
  [VendorType.SUPPLIER]: '📦',
  [VendorType.SERVICE_PROVIDER]: '🛠️',
  [VendorType.CONSULTANT]: '💼',
} as const

// ==================== TYPE GUARDS ====================

/**
 * 檢查是否為有效的廠商狀態
 */
export function isVendorStatus(value: any): value is VendorStatus {
  return Object.values(VendorStatus).includes(value)
}

/**
 * 檢查是否為有效的廠商類型
 */
export function isVendorType(value: any): value is VendorType {
  return Object.values(VendorType).includes(value)
}

/**
 * 檢查是否為有效的聯絡人職位
 */
export function isContactPosition(value: any): value is ContactPosition {
  return Object.values(ContactPosition).includes(value)
}

// ==================== MOCK DATA HELPERS ====================

/**
 * 生成模擬廠商資料
 */
export function generateMockVendors(count: number = 10): Vendor[] {
  const vendors: Vendor[] = []
  
  for (let i = 1; i <= count; i++) {
    vendors.push({
      id: `vendor-${i.toString().padStart(3, '0')}`,
      code: `V${i.toString().padStart(6, '0')}`,
      name: `廠商${i}`,
      alias: i % 3 === 0 ? `別名${i}` : undefined,
      type: Object.values(VendorType)[i % 4] as VendorType,
      status: Object.values(VendorStatus)[i % 4] as VendorStatus,
      taxId: `${Math.floor(Math.random() * 100000000)}-${Math.floor(Math.random() * 100)}`,
      address: `台北市信義區信義路${i}號`,
      phone: `02-${Math.floor(Math.random() * 90000000) + 10000000}`,
      contacts: [
        {
          id: `contact-${i}-1`,
          name: `聯絡人${i}`,
          position: ContactPosition.MANAGER,
          mobile: `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
          extension: Math.floor(Math.random() * 9999).toString(),
          email: `contact${i}@vendor${i}.com.tw`,
          isPrimary: true,
          mvpn: `${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
          supervisor: i % 2 === 0 ? '主管' : '經理',
          notes: i % 3 === 0 ? '重要聯絡人' : undefined
        }
      ],
      createdAt: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      updatedAt: new Date(),
      notes: i % 4 === 0 ? `廠商${i}的備註資訊` : undefined
    })
  }
  
  return vendors
}

/**
 * 生成模擬查詢結果
 */
export function generateMockVendorQueryResult(
  filters?: VendorFilters,
  pagination?: Partial<VendorPagination>
): VendorQueryResult {
  const allVendors = generateMockVendors(50)
  let filteredVendors = allVendors
  
  // 應用篩選
  if (filters?.search) {
    const search = filters.search.toLowerCase()
    filteredVendors = filteredVendors.filter(vendor => 
      vendor.name.toLowerCase().includes(search) ||
      vendor.code.toLowerCase().includes(search) ||
      (vendor.alias && vendor.alias.toLowerCase().includes(search)) ||
      vendor.contacts.some(contact => contact.name.toLowerCase().includes(search))
    )
  }
  
  if (filters?.type && filters.type.length > 0) {
    filteredVendors = filteredVendors.filter(vendor => filters.type!.includes(vendor.type))
  }
  
  if (filters?.status && filters.status.length > 0) {
    filteredVendors = filteredVendors.filter(vendor => filters.status!.includes(vendor.status))
  }
  
  // 分頁
  const page = pagination?.page || 1
  const pageSize = pagination?.pageSize || VENDOR_CONSTANTS.DEFAULT_PAGE_SIZE
  const total = filteredVendors.length
  const totalPages = Math.ceil(total / pageSize)
  
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedVendors = filteredVendors.slice(startIndex, endIndex)
  
  return {
    vendors: paginatedVendors,
    pagination: {
      page,
      pageSize,
      total,
      totalPages
    },
    stats: {
      totalByType: Object.values(VendorType).reduce((acc, type) => {
        acc[type] = filteredVendors.filter(v => v.type === type).length
        return acc
      }, {} as Record<VendorType, number>),
      totalByStatus: Object.values(VendorStatus).reduce((acc, status) => {
        acc[status] = filteredVendors.filter(v => v.status === status).length
        return acc
      }, {} as Record<VendorStatus, number>),
      totalContacts: filteredVendors.reduce((acc, vendor) => acc + vendor.contacts.length, 0)
    }
  }
}