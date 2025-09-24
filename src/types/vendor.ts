// 廠商相關的類型定義

// 廠商類型
export enum VendorType {
  PRIMARY_CONTRACTOR = '主要承攬商',
  SECONDARY_CONTRACTOR = '次要承攬商',
  EQUIPMENT_SUPPLIER = '設備供應商',
  MATERIAL_SUPPLIER = '材料供應商',
  CONSULTANT = '顧問公司',
  TESTING_AGENCY = '檢測機構',
  OTHER = '其他',
}

// 廠商狀態
export enum VendorStatus {
  ACTIVE = '啟用',
  INACTIVE = '停用',
  PENDING = '待審核',
  SUSPENDED = '暫停',
}

// 聯絡人狀態
export enum ContactStatus {
  ACTIVE = '啟用',
  INACTIVE = '停用',
}

// Vendor 基本介面 - 與現有系統保持一致
export interface Vendor {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  type: VendorType;
  status: VendorStatus;
  contacts?: VendorContact[];
  contactCount?: number;
  lastContactDate?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  displayOrder?: number;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

// 廠商聯絡人介面
export interface VendorContact {
  id: string;
  vendorId: string;
  name: string;
  position?: string;
  department?: string;
  phone?: string;
  extension?: string;
  mvpn?: string;
  email?: string;
  supervisor?: string;
  workSupervisor?: string;
  photoUrl?: string;
  status?: ContactStatus;
  isPrimary: boolean;
  isActive: boolean;
  notes?: string;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}

// 廠商篩選條件
export interface VendorFilters {
  search?: string;
  code?: string;
  name?: string;
  type?: VendorType[];
  status?: VendorStatus[];
  contactName?: string;
  phone?: string;
  email?: string;
  mvpn?: string;
  supervisor?: string;
  position?: string;
}

// 聯絡人篩選條件
export interface ContactFilters {
  search?: string;
  name?: string;
  position?: string;
  department?: string;
  phone?: string;
  email?: string;
  mvpn?: string;
  supervisor?: string;
  status?: ContactStatus[];
  isPrimary?: boolean;
  isActive?: boolean;
}

// 排序設定
export interface VendorSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ContactSort {
  field: string;
  direction: 'asc' | 'desc';
}

// 分頁設定
export interface VendorPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface ContactPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

// 常數設定
export const VENDOR_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 10,
};

export const CONTACT_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 10,
};

// 顏色設定
export const VENDOR_STATUS_COLORS = {
  [VendorStatus.ACTIVE]: 'text-green-600 bg-green-100',
  [VendorStatus.INACTIVE]: 'text-gray-600 bg-gray-100',
  [VendorStatus.PENDING]: 'text-yellow-600 bg-yellow-100',
  [VendorStatus.SUSPENDED]: 'text-red-600 bg-red-100',
};

export const VENDOR_TYPE_ICONS = {
  [VendorType.PRIMARY_CONTRACTOR]: '🏗️',
  [VendorType.SECONDARY_CONTRACTOR]: '🔧',
  [VendorType.EQUIPMENT_SUPPLIER]: '⚙️',
  [VendorType.MATERIAL_SUPPLIER]: '📦',
  [VendorType.CONSULTANT]: '💼',
  [VendorType.TESTING_AGENCY]: '🔬',
  [VendorType.OTHER]: '❓',
};

// Legacy types for backwards compatibility
export type VendorFilter = VendorFilters;
export type ContactFilter = ContactFilters;
export interface Contact extends VendorContact {}

// 廠商統計資料
export interface VendorStats {
  totalVendors: number;
  totalContacts: number;
  totalByStatus: Record<VendorStatus, number>;
  totalByType: Record<VendorType, number>;
  activeVendors: number;
  inactiveVendors: number;
}
