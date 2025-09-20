import { z } from 'zod';

// 專案狀態和類型枚舉
const projectStatusEnum = z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']);
const projectTypeEnum = z.enum(['internal', 'external', 'maintenance', 'research']);
const wbsStatusEnum = z.enum(['not_started', 'in_progress', 'on_hold', 'completed', 'cancelled']);
const wbsPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);

// 創建專案 Schema
export const createProjectSchema = z.object({
  name: z.string()
    .min(1, '專案名稱不能為空')
    .max(200, '專案名稱長度不能超過 200 個字符'),
  description: z.string()
    .max(1000, '專案描述長度不能超過 1000 個字符')
    .optional(),
  type: projectTypeEnum.default('internal'),
  priority: z.number()
    .min(1, '優先級最小值為 1')
    .max(5, '優先級最大值為 5')
    .default(3),
  startDate: z.string()
    .datetime('請輸入有效的開始日期')
    .optional()
    .transform(val => val ? new Date(val) : undefined),
  endDate: z.string()
    .datetime('請輸入有效的結束日期')
    .optional()
    .transform(val => val ? new Date(val) : undefined),
  budget: z.number()
    .min(0, '預算不能為負數')
    .optional(),
  managerId: z.string()
    .uuid('無效的專案經理 ID'),
  clientInfo: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.startDate <= data.endDate;
  }
  return true;
}, {
  message: '開始日期不能晚於結束日期',
  path: ['endDate'],
});

// 更新專案 Schema
export const updateProjectSchema = z.object({
  name: z.string()
    .min(1, '專案名稱不能為空')
    .max(200, '專案名稱長度不能超過 200 個字符')
    .optional(),
  description: z.string()
    .max(1000, '專案描述長度不能超過 1000 個字符')
    .optional(),
  status: projectStatusEnum.optional(),
  type: projectTypeEnum.optional(),
  priority: z.number()
    .min(1, '優先級最小值為 1')
    .max(5, '優先級最大值為 5')
    .optional(),
  startDate: z.string()
    .datetime('請輸入有效的開始日期')
    .optional()
    .transform(val => val ? new Date(val) : undefined),
  endDate: z.string()
    .datetime('請輸入有效的結束日期')
    .optional()
    .transform(val => val ? new Date(val) : undefined),
  budget: z.number()
    .min(0, '預算不能為負數')
    .optional(),
  managerId: z.string()
    .uuid('無效的專案經理 ID')
    .optional(),
  progress: z.number()
    .min(0, '進度不能為負數')
    .max(100, '進度不能超過 100%')
    .optional(),
  clientInfo: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

// 創建 WBS 項目 Schema
export const createWBSSchema = z.object({
  parentId: z.string()
    .uuid('無效的父節點 ID')
    .optional(),
  wbsCode: z.string()
    .min(1, 'WBS 代碼不能為空')
    .max(50, 'WBS 代碼長度不能超過 50 個字符')
    .regex(/^[\w\-\.]+$/, 'WBS 代碼只能包含字母、數字、底線、連字符和句號'),
  name: z.string()
    .min(1, 'WBS 項目名稱不能為空')
    .max(200, 'WBS 項目名稱長度不能超過 200 個字符'),
  description: z.string()
    .max(1000, 'WBS 項目描述長度不能超過 1000 個字符')
    .optional(),
  priority: wbsPriorityEnum.default('medium'),
  assignedTo: z.string()
    .uuid('無效的負責人 ID')
    .optional(),
  estimatedHours: z.number()
    .min(0, '預估工時不能為負數')
    .optional(),
  startDate: z.string()
    .datetime('請輸入有效的開始日期')
    .optional()
    .transform(val => val ? new Date(val) : undefined),
  endDate: z.string()
    .datetime('請輸入有效的結束日期')
    .optional()
    .transform(val => val ? new Date(val) : undefined),
  dependencies: z.array(z.string().uuid('無效的依賴項目 ID'))
    .optional()
    .default([]),
  metadata: z.record(z.any()).optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.startDate <= data.endDate;
  }
  return true;
}, {
  message: '開始日期不能晚於結束日期',
  path: ['endDate'],
});

// 更新 WBS 項目 Schema
export const updateWBSSchema = z.object({
  wbsCode: z.string()
    .min(1, 'WBS 代碼不能為空')
    .max(50, 'WBS 代碼長度不能超過 50 個字符')
    .regex(/^[\w\-\.]+$/, 'WBS 代碼只能包含字母、數字、底線、連字符和句號')
    .optional(),
  name: z.string()
    .min(1, 'WBS 項目名稱不能為空')
    .max(200, 'WBS 項目名稱長度不能超過 200 個字符')
    .optional(),
  description: z.string()
    .max(1000, 'WBS 項目描述長度不能超過 1000 個字符')
    .optional(),
  status: wbsStatusEnum.optional(),
  priority: wbsPriorityEnum.optional(),
  assignedTo: z.string()
    .uuid('無效的負責人 ID')
    .optional(),
  estimatedHours: z.number()
    .min(0, '預估工時不能為負數')
    .optional(),
  actualHours: z.number()
    .min(0, '實際工時不能為負數')
    .optional(),
  startDate: z.string()
    .datetime('請輸入有效的開始日期')
    .optional()
    .transform(val => val ? new Date(val) : undefined),
  endDate: z.string()
    .datetime('請輸入有效的結束日期')
    .optional()
    .transform(val => val ? new Date(val) : undefined),
  completionPercentage: z.number()
    .min(0, '完成度不能為負數')
    .max(100, '完成度不能超過 100%')
    .optional(),
  dependencies: z.array(z.string().uuid('無效的依賴項目 ID'))
    .optional(),
  metadata: z.record(z.any()).optional(),
});

// 移動 WBS 項目 Schema
export const moveWBSSchema = z.object({
  newParentId: z.string()
    .uuid('無效的新父節點 ID')
    .optional(),
});

// 專案查詢參數 Schema
export const projectQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(100).optional().default(20),
  sortBy: z.enum(['name', 'status', 'priority', 'start_date', 'end_date', 'created_at']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  status: z.union([projectStatusEnum, z.array(projectStatusEnum)]).optional(),
  type: z.union([projectTypeEnum, z.array(projectTypeEnum)]).optional(),
  managerId: z.string().uuid().optional(),
  priority: z.union([
    z.coerce.number().min(1).max(5),
    z.array(z.coerce.number().min(1).max(5))
  ]).optional(),
  startDateFrom: z.string().datetime().optional(),
  startDateTo: z.string().datetime().optional(),
  endDateFrom: z.string().datetime().optional(),
  endDateTo: z.string().datetime().optional(),
  budgetMin: z.coerce.number().min(0).optional(),
  budgetMax: z.coerce.number().min(0).optional(),
  progressMin: z.coerce.number().min(0).max(100).optional(),
  progressMax: z.coerce.number().min(0).max(100).optional(),
  isOverdue: z.coerce.boolean().optional(),
  upcomingDeadlineDays: z.coerce.number().min(1).optional(),
  includeInactive: z.coerce.boolean().optional().default(false),
});

// WBS 查詢參數 Schema
export const wbsQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(100).optional().default(20),
  sortBy: z.enum(['wbs_code', 'name', 'status', 'priority', 'start_date', 'end_date', 'completion_percentage']).optional().default('wbs_code'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  search: z.string().optional(),
  status: z.union([wbsStatusEnum, z.array(wbsStatusEnum)]).optional(),
  priority: z.union([wbsPriorityEnum, z.array(wbsPriorityEnum)]).optional(),
  assignedTo: z.string().uuid().optional(),
  level: z.coerce.number().min(1).optional(),
  parentId: z.string().uuid().optional(),
  includeCompleted: z.coerce.boolean().optional().default(true),
  overdueOnly: z.coerce.boolean().optional(),
  upcomingDays: z.coerce.number().min(1).optional(),
});

// 複製專案 Schema
export const duplicateProjectSchema = z.object({
  name: z.string()
    .min(1, '新專案名稱不能為空')
    .max(200, '專案名稱長度不能超過 200 個字符'),
  description: z.string()
    .max(1000, '專案描述長度不能超過 1000 個字符')
    .optional(),
  managerId: z.string()
    .uuid('無效的專案經理 ID')
    .optional(),
  startDate: z.string()
    .datetime('請輸入有效的開始日期')
    .optional()
    .transform(val => val ? new Date(val) : undefined),
  endDate: z.string()
    .datetime('請輸入有效的結束日期')
    .optional()
    .transform(val => val ? new Date(val) : undefined),
  copyWBS: z.boolean().default(true),
  copyMembers: z.boolean().default(false),
  copyMilestones: z.boolean().default(true),
});

// 專案成員管理 Schema
export const addProjectMemberSchema = z.object({
  userId: z.string().uuid('無效的用戶 ID'),
  role: z.string()
    .min(1, '角色不能為空')
    .max(50, '角色名稱長度不能超過 50 個字符'),
  permissions: z.array(z.string())
    .optional()
    .default(['read']),
});

export const updateProjectMemberSchema = z.object({
  role: z.string()
    .min(1, '角色不能為空')
    .max(50, '角色名稱長度不能超過 50 個字符')
    .optional(),
  permissions: z.array(z.string()).optional(),
});

// 里程碑管理 Schema
export const createMilestoneSchema = z.object({
  name: z.string()
    .min(1, '里程碑名稱不能為空')
    .max(200, '里程碑名稱長度不能超過 200 個字符'),
  description: z.string()
    .max(1000, '里程碑描述長度不能超過 1000 個字符')
    .optional(),
  targetDate: z.string()
    .datetime('請輸入有效的目標日期')
    .transform(val => new Date(val)),
  importance: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  deliverables: z.array(z.string())
    .optional()
    .default([]),
});

export const updateMilestoneSchema = z.object({
  name: z.string()
    .min(1, '里程碑名稱不能為空')
    .max(200, '里程碑名稱長度不能超過 200 個字符')
    .optional(),
  description: z.string()
    .max(1000, '里程碑描述長度不能超過 1000 個字符')
    .optional(),
  targetDate: z.string()
    .datetime('請輸入有效的目標日期')
    .optional()
    .transform(val => val ? new Date(val) : undefined),
  actualDate: z.string()
    .datetime('請輸入有效的實際日期')
    .optional()
    .transform(val => val ? new Date(val) : undefined),
  status: z.enum(['pending', 'in_progress', 'completed', 'delayed']).optional(),
  importance: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  deliverables: z.array(z.string()).optional(),
});

// 批量 WBS 操作 Schema
export const batchWBSOperationSchema = z.object({
  wbsIds: z.array(z.string().uuid('無效的 WBS 項目 ID'))
    .min(1, '至少需要選擇一個 WBS 項目'),
  action: z.enum(['update_status', 'assign', 'delete', 'move']),
  data: z.record(z.any()),
});

// 導出所有 Schema 類型
export type CreateProjectRequest = z.infer<typeof createProjectSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectSchema>;
export type CreateWBSRequest = z.infer<typeof createWBSSchema>;
export type UpdateWBSRequest = z.infer<typeof updateWBSSchema>;
export type MoveWBSRequest = z.infer<typeof moveWBSSchema>;
export type ProjectQueryParams = z.infer<typeof projectQuerySchema>;
export type WBSQueryParams = z.infer<typeof wbsQuerySchema>;
export type DuplicateProjectRequest = z.infer<typeof duplicateProjectSchema>;
export type AddProjectMemberRequest = z.infer<typeof addProjectMemberSchema>;
export type UpdateProjectMemberRequest = z.infer<typeof updateProjectMemberSchema>;
export type CreateMilestoneRequest = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneRequest = z.infer<typeof updateMilestoneSchema>;
export type BatchWBSOperationRequest = z.infer<typeof batchWBSOperationSchema>;