import { z } from 'zod';

// 班別和狀態枚舉
const shiftTypeEnum = z.enum(['日班', '夜班', '全日', '緊急', '加班']);
const dutyStatusEnum = z.enum(['已排班', '值班中', '已完成', '取消', '請假', '代班']);
const urgencyLevelEnum = z.enum(['一般', '重要', '緊急', '危急']);
const vendorTypeEnum = z.enum(['security', 'cleaning', 'maintenance', 'catering', 'it_support', 'other']);
const vendorStatusEnum = z.enum(['active', 'inactive', 'suspended', 'terminated']);

// 創建排班 Schema
export const createDutyScheduleSchema = z.object({
  projectId: z.string()
    .uuid('無效的專案 ID'),
  personId: z.string()
    .uuid('無效的人員 ID'),
  dutyDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必須是 YYYY-MM-DD')
    .transform(val => new Date(val + 'T00:00:00.000Z')),
  shiftType: shiftTypeEnum,
  workArea: z.string()
    .max(100, '工作區域名稱長度不能超過 100 個字符')
    .optional(),
  urgencyLevel: urgencyLevelEnum.default('一般'),
  notes: z.string()
    .max(500, '備註長度不能超過 500 個字符')
    .optional(),
}).refine((data) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return data.dutyDate >= today;
}, {
  message: '不能為過去的日期排班',
  path: ['dutyDate'],
});

// 更新排班 Schema
export const updateDutyScheduleSchema = z.object({
  dutyDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必須是 YYYY-MM-DD')
    .optional()
    .transform(val => val ? new Date(val + 'T00:00:00.000Z') : undefined),
  shiftType: shiftTypeEnum.optional(),
  workArea: z.string()
    .max(100, '工作區域名稱長度不能超過 100 個字符')
    .optional(),
  status: dutyStatusEnum.optional(),
  urgencyLevel: urgencyLevelEnum.optional(),
  notes: z.string()
    .max(500, '備註長度不能超過 500 個字符')
    .optional(),
});

// 簽到 Schema
export const checkInSchema = z.object({
  checkInTime: z.string()
    .datetime('請輸入有效的簽到時間')
    .optional()
    .transform(val => val ? new Date(val) : undefined),
});

// 簽退 Schema
export const checkOutSchema = z.object({
  checkOutTime: z.string()
    .datetime('請輸入有效的簽退時間')
    .optional()
    .transform(val => val ? new Date(val) : undefined),
});

// 請假 Schema
export const requestLeaveSchema = z.object({
  reason: z.string()
    .min(1, '請假原因不能為空')
    .max(200, '請假原因長度不能超過 200 個字符'),
});

// 設定代班 Schema
export const setReplacementSchema = z.object({
  replacementPersonId: z.string()
    .uuid('無效的代班人員 ID'),
  reason: z.string()
    .min(1, '代班原因不能為空')
    .max(200, '代班原因長度不能超過 200 個字符'),
});

// 取消排班 Schema
export const cancelScheduleSchema = z.object({
  reason: z.string()
    .min(1, '取消原因不能為空')
    .max(200, '取消原因長度不能超過 200 個字符'),
});

// 批量創建排班 Schema
export const batchCreateScheduleSchema = z.object({
  schedules: z.array(createDutyScheduleSchema)
    .min(1, '至少需要一個排班記錄')
    .max(50, '一次最多只能創建 50 個排班記錄'),
});

// 排班查詢參數 Schema
export const dutyScheduleQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(100).optional().default(20),
  sortBy: z.enum(['duty_date', 'shift_type', 'status', 'urgency_level', 'created_at']).optional().default('duty_date'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  projectId: z.string().uuid().optional(),
  personId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  specificDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  shiftTypes: z.union([shiftTypeEnum, z.array(shiftTypeEnum)]).optional(),
  statuses: z.union([dutyStatusEnum, z.array(dutyStatusEnum)]).optional(),
  urgencyLevels: z.union([urgencyLevelEnum, z.array(urgencyLevelEnum)]).optional(),
  workAreas: z.array(z.string()).optional(),
  currentOnly: z.coerce.boolean().optional(),
  includeReplacements: z.coerce.boolean().optional().default(true),
  pendingApproval: z.coerce.boolean().optional(),
  hasReplacement: z.coerce.boolean().optional(),
  includeInactive: z.coerce.boolean().optional().default(false),
});

// 廠商管理 Schema
export const createVendorSchema = z.object({
  name: z.string()
    .min(1, '廠商名稱不能為空')
    .max(200, '廠商名稱長度不能超過 200 個字符'),
  type: vendorTypeEnum,
  contactPerson: z.string()
    .max(100, '聯絡人姓名長度不能超過 100 個字符')
    .optional(),
  phone: z.string()
    .regex(/^[\d\-\+\(\)\s]+$/, '請輸入有效的電話號碼')
    .max(20, '電話號碼長度不能超過 20 個字符')
    .optional(),
  email: z.string()
    .email('請輸入有效的信箱地址')
    .max(100, '信箱長度不能超過 100 個字符')
    .optional(),
  address: z.string()
    .max(300, '地址長度不能超過 300 個字符')
    .optional(),
  contractStart: z.string()
    .datetime('請輸入有效的合約開始日期')
    .optional()
    .transform(val => val ? new Date(val) : undefined),
  contractEnd: z.string()
    .datetime('請輸入有效的合約結束日期')
    .optional()
    .transform(val => val ? new Date(val) : undefined),
  rating: z.number()
    .min(1, '評分最小值為 1')
    .max(5, '評分最大值為 5')
    .optional(),
  metadata: z.record(z.any()).optional(),
}).refine((data) => {
  if (data.contractStart && data.contractEnd) {
    return data.contractStart <= data.contractEnd;
  }
  return true;
}, {
  message: '合約開始日期不能晚於結束日期',
  path: ['contractEnd'],
});

// 更新廠商 Schema
export const updateVendorSchema = z.object({
  name: z.string()
    .min(1, '廠商名稱不能為空')
    .max(200, '廠商名稱長度不能超過 200 個字符')
    .optional(),
  type: vendorTypeEnum.optional(),
  status: vendorStatusEnum.optional(),
  contactPerson: z.string()
    .max(100, '聯絡人姓名長度不能超過 100 個字符')
    .optional(),
  phone: z.string()
    .regex(/^[\d\-\+\(\)\s]+$/, '請輸入有效的電話號碼')
    .max(20, '電話號碼長度不能超過 20 個字符')
    .optional(),
  email: z.string()
    .email('請輸入有效的信箱地址')
    .max(100, '信箱長度不能超過 100 個字符')
    .optional(),
  address: z.string()
    .max(300, '地址長度不能超過 300 個字符')
    .optional(),
  contractStart: z.string()
    .datetime('請輸入有效的合約開始日期')
    .optional()
    .transform(val => val ? new Date(val) : undefined),
  contractEnd: z.string()
    .datetime('請輸入有效的合約結束日期')
    .optional()
    .transform(val => val ? new Date(val) : undefined),
  rating: z.number()
    .min(1, '評分最小值為 1')
    .max(5, '評分最大值為 5')
    .optional(),
  metadata: z.record(z.any()).optional(),
});

// 廠商查詢參數 Schema
export const vendorQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(100).optional().default(20),
  sortBy: z.enum(['name', 'type', 'status', 'rating', 'contract_end', 'created_at']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  search: z.string().optional(),
  types: z.union([vendorTypeEnum, z.array(vendorTypeEnum)]).optional(),
  statuses: z.union([vendorStatusEnum, z.array(vendorStatusEnum)]).optional(),
  ratingMin: z.coerce.number().min(1).max(5).optional(),
  ratingMax: z.coerce.number().min(1).max(5).optional(),
  contractStartFrom: z.string().datetime().optional(),
  contractStartTo: z.string().datetime().optional(),
  contractEndFrom: z.string().datetime().optional(),
  contractEndTo: z.string().datetime().optional(),
  isExpired: z.coerce.boolean().optional(),
  isExpiring: z.coerce.boolean().optional(),
  expiringDays: z.coerce.number().min(1).optional().default(30),
  hasRating: z.coerce.boolean().optional(),
  hasContact: z.coerce.boolean().optional(),
  includeInactive: z.coerce.boolean().optional().default(false),
});

// 值班人員管理 Schema
export const createDutyPersonSchema = z.object({
  vendorId: z.string().uuid('無效的廠商 ID'),
  name: z.string()
    .min(1, '人員姓名不能為空')
    .max(100, '人員姓名長度不能超過 100 個字符'),
  employeeId: z.string()
    .max(50, '員工編號長度不能超過 50 個字符')
    .optional(),
  phone: z.string()
    .regex(/^[\d\-\+\(\)\s]+$/, '請輸入有效的電話號碼')
    .max(20, '電話號碼長度不能超過 20 個字符')
    .optional(),
  email: z.string()
    .email('請輸入有效的信箱地址')
    .max(100, '信箱長度不能超過 100 個字符')
    .optional(),
  position: z.string()
    .max(100, '職位名稱長度不能超過 100 個字符')
    .optional(),
  skills: z.array(z.string())
    .optional()
    .default([]),
  availability: z.record(z.any()).optional(),
  rating: z.number()
    .min(1, '評分最小值為 1')
    .max(5, '評分最大值為 5')
    .optional(),
  metadata: z.record(z.any()).optional(),
});

// 更新值班人員 Schema
export const updateDutyPersonSchema = z.object({
  name: z.string()
    .min(1, '人員姓名不能為空')
    .max(100, '人員姓名長度不能超過 100 個字符')
    .optional(),
  employeeId: z.string()
    .max(50, '員工編號長度不能超過 50 個字符')
    .optional(),
  phone: z.string()
    .regex(/^[\d\-\+\(\)\s]+$/, '請輸入有效的電話號碼')
    .max(20, '電話號碼長度不能超過 20 個字符')
    .optional(),
  email: z.string()
    .email('請輸入有效的信箱地址')
    .max(100, '信箱長度不能超過 100 個字符')
    .optional(),
  position: z.string()
    .max(100, '職位名稱長度不能超過 100 個字符')
    .optional(),
  skills: z.array(z.string()).optional(),
  availability: z.record(z.any()).optional(),
  rating: z.number()
    .min(1, '評分最小值為 1')
    .max(5, '評分最大值為 5')
    .optional(),
  metadata: z.record(z.any()).optional(),
});

// 排班統計查詢 Schema
export const scheduleStatsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  vendorId: z.string().uuid().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
});

// 廠商評分更新 Schema
export const updateVendorRatingSchema = z.object({
  rating: z.number()
    .min(1, '評分最小值為 1')
    .max(5, '評分最大值為 5'),
  comment: z.string()
    .max(300, '評價內容長度不能超過 300 個字符')
    .optional(),
});

// 廠商合約續約 Schema
export const renewVendorContractSchema = z.object({
  newEndDate: z.string()
    .datetime('請輸入有效的新合約結束日期')
    .transform(val => new Date(val)),
  terms: z.record(z.any()).optional(),
  notes: z.string()
    .max(500, '備註長度不能超過 500 個字符')
    .optional(),
});

// 批量排班操作 Schema
export const batchScheduleOperationSchema = z.object({
  scheduleIds: z.array(z.string().uuid('無效的排班 ID'))
    .min(1, '至少需要選擇一個排班記錄'),
  action: z.enum(['approve', 'cancel', 'update_status', 'assign_replacement']),
  data: z.record(z.any()).optional(),
  reason: z.string()
    .max(200, '操作原因長度不能超過 200 個字符')
    .optional(),
});

// 導出所有 Schema 類型
export type CreateDutyScheduleRequest = z.infer<typeof createDutyScheduleSchema>;
export type UpdateDutyScheduleRequest = z.infer<typeof updateDutyScheduleSchema>;
export type CheckInRequest = z.infer<typeof checkInSchema>;
export type CheckOutRequest = z.infer<typeof checkOutSchema>;
export type RequestLeaveRequest = z.infer<typeof requestLeaveSchema>;
export type SetReplacementRequest = z.infer<typeof setReplacementSchema>;
export type CancelScheduleRequest = z.infer<typeof cancelScheduleSchema>;
export type BatchCreateScheduleRequest = z.infer<typeof batchCreateScheduleSchema>;
export type DutyScheduleQueryParams = z.infer<typeof dutyScheduleQuerySchema>;
export type CreateVendorRequest = z.infer<typeof createVendorSchema>;
export type UpdateVendorRequest = z.infer<typeof updateVendorSchema>;
export type VendorQueryParams = z.infer<typeof vendorQuerySchema>;
export type CreateDutyPersonRequest = z.infer<typeof createDutyPersonSchema>;
export type UpdateDutyPersonRequest = z.infer<typeof updateDutyPersonSchema>;
export type ScheduleStatsQueryParams = z.infer<typeof scheduleStatsQuerySchema>;
export type UpdateVendorRatingRequest = z.infer<typeof updateVendorRatingSchema>;
export type RenewVendorContractRequest = z.infer<typeof renewVendorContractSchema>;
export type BatchScheduleOperationRequest = z.infer<typeof batchScheduleOperationSchema>;