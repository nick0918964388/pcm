// 基本實體介面
export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

// 用戶認證相關類型
export interface User extends BaseEntity {
  username: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  is_verified: boolean;
  last_login?: Date;
  failed_login_attempts: number;
  locked_until?: Date;
}

export interface Role extends BaseEntity {
  name: string;
  description?: string;
  permissions: string[];
}

export interface UserRole {
  user_id: string;
  role_id: string;
  assigned_at: Date;
  assigned_by: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  expires_at: Date;
  created_at: Date;
  last_activity: Date;
  ip_address?: string;
  user_agent?: string;
}

// 專案管理相關類型
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectType = 'internal' | 'external' | 'maintenance' | 'research';

export interface Project extends BaseEntity {
  name: string;
  description?: string;
  status: ProjectStatus;
  type: ProjectType;
  priority: number; // 1-5
  start_date?: Date;
  end_date?: Date;
  budget?: number;
  progress: number; // 0-100
  manager_id: string;
  client_info?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  permissions: string[];
  joined_at: Date;
  added_by: string;
  is_active: boolean;
}

export type WBSStatus = 'not_started' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type WBSPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface WBSItem extends BaseEntity {
  project_id: string;
  parent_id?: string;
  wbs_code: string;
  name: string;
  description?: string;
  level: number;
  status: WBSStatus;
  priority: WBSPriority;
  assigned_to?: string;
  estimated_hours?: number;
  actual_hours: number;
  start_date?: Date;
  end_date?: Date;
  completion_percentage: number;
  dependencies: string[];
  metadata?: Record<string, any>;
}

export interface ProjectMilestone extends BaseEntity {
  project_id: string;
  name: string;
  description?: string;
  target_date: Date;
  actual_date?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  importance: 'low' | 'medium' | 'high' | 'critical';
  deliverables: string[];
}

// 廠商排班相關類型
export type VendorType = 'security' | 'cleaning' | 'maintenance' | 'catering' | 'it_support' | 'other';
export type VendorStatus = 'active' | 'inactive' | 'suspended' | 'terminated';

export interface Vendor extends BaseEntity {
  name: string;
  type: VendorType;
  status: VendorStatus;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  contract_start?: Date;
  contract_end?: Date;
  rating?: number; // 1-5
  metadata?: Record<string, any>;
}

export interface DutyPerson extends BaseEntity {
  vendor_id: string;
  name: string;
  employee_id?: string;
  phone?: string;
  email?: string;
  position?: string;
  skills: string[];
  availability: Record<string, any>;
  rating?: number;
  metadata?: Record<string, any>;
}

export type ShiftType = '日班' | '夜班' | '全日' | '緊急' | '加班';
export type DutyStatus = '已排班' | '值班中' | '已完成' | '取消' | '請假' | '代班';
export type UrgencyLevel = '一般' | '重要' | '緊急' | '危急';

export interface DutySchedule extends BaseEntity {
  project_id: string;
  person_id: string;
  duty_date: Date;
  shift_type: ShiftType;
  work_area?: string;
  status: DutyStatus;
  urgency_level: UrgencyLevel;
  notes?: string;
  check_in_time?: Date;
  check_out_time?: Date;
  replacement_person_id?: string;
  replacement_reason?: string;
  created_by: string;
  approved_by?: string;
  approved_at?: Date;
  metadata?: Record<string, any>;
}

// 審計和日誌類型
export interface AuditLog {
  id: string;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changed_fields?: string[];
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface LoginLog {
  id: string;
  user_id: string;
  login_time: Date;
  logout_time?: Date;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  failure_reason?: string;
  session_id?: string;
}

// API 回應類型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
  timestamp: string;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    filters?: Record<string, any>;
  };
}

// 查詢參數類型
export interface BaseQueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  includeInactive?: boolean;
}

export interface UserQueryParams extends BaseQueryParams {
  role?: string;
  isVerified?: boolean;
  lastLoginFrom?: string;
  lastLoginTo?: string;
}

export interface ProjectQueryParams extends BaseQueryParams {
  status?: ProjectStatus | ProjectStatus[];
  type?: ProjectType | ProjectType[];
  managerId?: string;
  startDateFrom?: string;
  startDateTo?: string;
  priority?: number[];
  hasMembers?: boolean;
}

export interface DutyScheduleQueryParams extends BaseQueryParams {
  projectId?: string;
  personId?: string;
  vendorId?: string;
  dateFrom?: string;
  dateTo?: string;
  specificDate?: string;
  shiftTypes?: ShiftType[];
  statuses?: DutyStatus[];
  urgencyLevels?: UrgencyLevel[];
  workAreas?: string[];
  currentOnly?: boolean;
  includeReplacements?: boolean;
}

// 資料庫錯誤類型
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public table?: string,
    public constraint?: string,
    public detail?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// 常用的聯合類型
export type EntityId = string;
export type Timestamp = Date;
export type JSONObject = Record<string, any>;

// 資料驗證結果類型
export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}