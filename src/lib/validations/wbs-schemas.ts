import { z } from 'zod';

// WBS 項目狀態
export const WbsStatusEnum = z.enum([
  '未開始',
  '進行中', 
  '已完成',
  '暫停',
  '取消',
  '延期'
]);

// WBS 項目類型
export const WbsTypeEnum = z.enum([
  'milestone',  // 里程碑
  'deliverable', // 交付項目
  'task',        // 任務
  'subtask',     // 子任務
  'phase'        // 階段
]);

// WBS 優先級
export const WbsPriorityEnum = z.enum([
  'low',
  'medium',
  'high',
  'critical'
]);

// 基礎 WBS 項目 Schema
export const BaseWbsSchema = z.object({
  wbsCode: z.string()
    .min(1, 'WBS編碼為必填')
    .regex(/^\d+(\.\d+)*$/, 'WBS編碼格式無效（應為1.1.1格式）'),
  name: z.string()
    .min(1, 'WBS項目名稱為必填')
    .max(200, 'WBS項目名稱不可超過200字'),
  description: z.string()
    .max(1000, '描述不可超過1000字')
    .optional(),
  status: WbsStatusEnum,
  type: WbsTypeEnum,
  priority: WbsPriorityEnum,
  parentWbsId: z.string().uuid().optional(),
  level: z.number().int().min(1).max(10),
  sequence: z.number().int().min(1),
  plannedStartDate: z.string().datetime().optional(),
  plannedEndDate: z.string().datetime().optional(),
  actualStartDate: z.string().datetime().optional(),
  actualEndDate: z.string().datetime().optional(),
  estimatedHours: z.number().min(0).optional(),
  actualHours: z.number().min(0).optional(),
  progressPercent: z.number()
    .min(0, '進度百分比不可小於0')
    .max(100, '進度百分比不可大於100'),
  assigneeId: z.string().uuid().optional(),
  reviewerId: z.string().uuid().optional(),
  milestoneId: z.string().uuid().optional()
});

// 建立 WBS 項目 Schema
export const CreateWbsSchema = BaseWbsSchema.omit({
  progressPercent: true
}).extend({
  progressPercent: z.number().min(0).max(100).default(0),
  projectId: z.string().uuid('專案ID格式無效')
}).superRefine((data, ctx) => {
  // 驗證日期邏輯
  if (data.plannedStartDate && data.plannedEndDate) {
    const startDate = new Date(data.plannedStartDate);
    const endDate = new Date(data.plannedEndDate);
    if (startDate >= endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '計劃結束日期必須晚於開始日期',
        path: ['plannedEndDate']
      });
    }
  }
  
  if (data.actualStartDate && data.actualEndDate) {
    const startDate = new Date(data.actualStartDate);
    const endDate = new Date(data.actualEndDate);
    if (startDate >= endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '實際結束日期必須晚於開始日期',
        path: ['actualEndDate']
      });
    }
  }
  
  // 驗證 WBS 編碼層級與 level 一致性
  const codeParts = data.wbsCode.split('.');
  if (codeParts.length !== data.level) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `WBS編碼層級(${codeParts.length})與level(${data.level})不符`,
      path: ['wbsCode']
    });
  }
  
  // 驗證工時邏輯
  if (data.estimatedHours && data.actualHours && data.actualHours > data.estimatedHours * 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '實際工時超出預估工時200%，請確認',
      path: ['actualHours']
    });
  }
});

// 更新 WBS 項目 Schema
export const UpdateWbsSchema = CreateWbsSchema.partial().omit({
  projectId: true
});

// 查詢 WBS 項目 Schema
export const QueryWbsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  search: z.string().optional(),
  status: WbsStatusEnum.optional(),
  type: WbsTypeEnum.optional(),
  priority: WbsPriorityEnum.optional(),
  assigneeId: z.string().uuid().optional(),
  parentWbsId: z.string().uuid().optional(),
  level: z.coerce.number().int().min(1).max(10).optional(),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
  progressMin: z.coerce.number().min(0).max(100).optional(),
  progressMax: z.coerce.number().min(0).max(100).optional(),
  sortBy: z.enum(['wbsCode', 'name', 'status', 'priority', 'plannedEndDate', 'progressPercent'])
    .default('wbsCode'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  includeClosed: z.coerce.boolean().default(false),
  includeSubtasks: z.coerce.boolean().default(true)
}).superRefine((data, ctx) => {
  // 驗證進度範圍
  if (data.progressMin !== undefined && data.progressMax !== undefined && data.progressMin > data.progressMax) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '進度最小值不可大於最大值',
      path: ['progressMin']
    });
  }
  
  // 驗證日期範圍
  if (data.dueDateFrom && data.dueDateTo) {
    const fromDate = new Date(data.dueDateFrom);
    const toDate = new Date(data.dueDateTo);
    if (fromDate > toDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '開始日期不可晚於結束日期',
        path: ['dueDateFrom']
      });
    }
  }
});

// WBS 批量更新 Schema
export const BatchUpdateWbsSchema = z.object({
  wbsIds: z.array(z.string().uuid()).min(1, '至少需要選擇一個WBS項目'),
  updates: z.object({
    status: WbsStatusEnum.optional(),
    priority: WbsPriorityEnum.optional(),
    assigneeId: z.string().uuid().optional(),
    reviewerId: z.string().uuid().optional(),
    progressPercent: z.number().min(0).max(100).optional()
  }).refine((data) => Object.keys(data).length > 0, {
    message: '至少需要更新一個欄位'
  })
});

// WBS 進度更新 Schema
export const UpdateWbsProgressSchema = z.object({
  progressPercent: z.number()
    .min(0, '進度百分比不可小於0')
    .max(100, '進度百分比不可大於100'),
  actualHours: z.number().min(0).optional(),
  notes: z.string().max(500, '備註不可超過500字').optional(),
  status: WbsStatusEnum.optional()
}).superRefine((data, ctx) => {
  // 根據進度自動判斷狀態
  if (data.progressPercent === 0 && data.status && data.status !== '未開始') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '進度為0%時，狀態應為「未開始」',
      path: ['status']
    });
  }
  
  if (data.progressPercent === 100 && data.status && data.status !== '已完成') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '進度為100%時，狀態應為「已完成」',
      path: ['status']
    });
  }
  
  if (data.progressPercent > 0 && data.progressPercent < 100 && data.status && 
      !['進行中', '暫停'].includes(data.status)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '進度在0-100%之間時，狀態應為「進行中」或「暫停」',
      path: ['status']
    });
  }
});

// WBS 統計查詢 Schema
export const WbsStatsQuerySchema = z.object({
  groupBy: z.enum(['status', 'type', 'priority', 'assignee', 'level']).default('status'),
  dateRange: z.enum(['week', 'month', 'quarter', 'year']).optional(),
  includeSubprojects: z.coerce.boolean().default(false)
});

// WBS 依賴關係 Schema
export const WbsDependencySchema = z.object({
  dependentWbsId: z.string().uuid('依賴項目ID格式無效'),
  dependsOnWbsId: z.string().uuid('被依賴項目ID格式無效'),
  dependencyType: z.enum(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'])
    .default('finish_to_start'),
  lag: z.number().int().default(0), // 滯後時間（天）
  description: z.string().max(200).optional()
}).superRefine((data, ctx) => {
  // 防止自我依賴
  if (data.dependentWbsId === data.dependsOnWbsId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'WBS項目不可依賴自己',
      path: ['dependsOnWbsId']
    });
  }
});

// 型別匯出
export type WbsStatus = z.infer<typeof WbsStatusEnum>;
export type WbsType = z.infer<typeof WbsTypeEnum>;
export type WbsPriority = z.infer<typeof WbsPriorityEnum>;
export type CreateWbsInput = z.infer<typeof CreateWbsSchema>;
export type UpdateWbsInput = z.infer<typeof UpdateWbsSchema>;
export type QueryWbsInput = z.infer<typeof QueryWbsSchema>;
export type BatchUpdateWbsInput = z.infer<typeof BatchUpdateWbsSchema>;
export type UpdateWbsProgressInput = z.infer<typeof UpdateWbsProgressSchema>;
export type WbsStatsQueryInput = z.infer<typeof WbsStatsQuerySchema>;
export type WbsDependencyInput = z.infer<typeof WbsDependencySchema>;