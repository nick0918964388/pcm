import { z } from 'zod';

// 廠商類型 - 使用與 vendor.ts 相同的中文值
export const VendorTypeSchema = z.enum([
  '主要承攬商',
  '次要承攬商',
  '設備供應商',
  '材料供應商',
  '顧問公司',
  '檢測機構',
  '其他'
]);

// 廠商狀態 - 使用與 vendor.ts 相同的中文值
export const VendorStatusSchema = z.enum([
  '啟用',
  '停用',
  '待審核',
  '暫停'
]);

// 建立廠商的驗證 schema
export const CreateVendorSchema = z.object({
  code: z.string()
    .min(1, '廠商代碼為必填')
    .max(50, '廠商代碼不能超過 50 個字元'),
  
  name: z.string()
    .min(1, '廠商名稱為必填')
    .max(200, '廠商名稱不能超過 200 個字元'),
  
  short_name: z.string()
    .max(100, '廠商簡稱不能超過 100 個字元')
    .optional(),
  
  type: VendorTypeSchema,
  
  status: VendorStatusSchema.default('active'),
  
  unified_number: z.string()
    .max(20, '統一編號不能超過 20 個字元')
    .optional(),
  
  phone: z.string()
    .regex(/^[\d\-\+\(\)\s]+$/, '請輸入有效的電話號碼')
    .max(20, '電話號碼不能超過 20 個字元')
    .optional(),
  
  fax: z.string()
    .regex(/^[\d\-\+\(\)\s]+$/, '請輸入有效的傳真號碼')
    .max(20, '傳真號碼不能超過 20 個字元')
    .optional(),
  
  email: z.string()
    .email('請輸入有效的電子郵件')
    .max(100, '電子郵件不能超過 100 個字元')
    .optional(),
  
  website: z.string()
    .url('請輸入有效的網址')
    .max(200, '網址不能超過 200 個字元')
    .optional(),
  
  address: z.string()
    .max(300, '地址不能超過 300 個字元')
    .optional(),
  
  contract_start: z.string()
    .datetime()
    .or(z.date())
    .transform(val => val instanceof Date ? val : new Date(val))
    .optional(),
  
  contract_end: z.string()
    .datetime()
    .or(z.date())
    .transform(val => val instanceof Date ? val : new Date(val))
    .optional(),
  
  rating: z.number()
    .min(1, '評分必須在 1-5 之間')
    .max(5, '評分必須在 1-5 之間')
    .optional(),
  
  service_items: z.array(z.string()).optional(),
  work_areas: z.array(z.string()).optional(),
  certification: z.record(z.any()).optional(),
  insurance_info: z.record(z.any()).optional(),
  bank_info: z.record(z.any()).optional(),
  display_order: z.number().min(0).default(0),
  metadata: z.record(z.any()).optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true)
}).refine(data => {
  if (data.contract_start && data.contract_end) {
    const start = new Date(data.contract_start);
    const end = new Date(data.contract_end);
    return end > start;
  }
  return true;
}, {
  message: '合約結束日期必須晚於開始日期',
  path: ['contract_end']
});

// 更新廠商的驗證 schema
export const UpdateVendorSchema = CreateVendorSchema.partial().omit({
  is_active: true
});

// 查詢廠商的驗證 schema
export const QueryVendorSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  types: z.array(VendorTypeSchema).optional(),
  statuses: z.array(VendorStatusSchema).optional(),
  ratingMin: z.coerce.number().min(1).max(5).optional(),
  ratingMax: z.coerce.number().min(1).max(5).optional(),
  contractStartFrom: z.string().datetime().optional(),
  contractStartTo: z.string().datetime().optional(),
  contractEndFrom: z.string().datetime().optional(),
  contractEndTo: z.string().datetime().optional(),
  isExpired: z.coerce.boolean().optional(),
  isExpiring: z.coerce.boolean().optional(),
  expiringDays: z.coerce.number().min(1).max(365).optional(),
  hasRating: z.coerce.boolean().optional(),
  hasContact: z.coerce.boolean().optional(),
  sortBy: z.enum(['code', 'name', 'type', 'status', 'rating', 'contract_start', 'contract_end', 'created_at', 'updated_at']).optional(),
  sortOrder: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional()
});

// 更新評分的驗證 schema
export const UpdateRatingSchema = z.object({
  rating: z.number()
    .min(1, '評分必須在 1-5 之間')
    .max(5, '評分必須在 1-5 之間')
});

// 更新狀態的驗證 schema
export const UpdateStatusSchema = z.object({
  status: VendorStatusSchema
});

// 續約的驗證 schema
export const RenewContractSchema = z.object({
  contract_end: z.string()
    .datetime()
    .or(z.date())
    .transform(val => val instanceof Date ? val : new Date(val))
});

// 聯絡人狀態 - 使用與 vendor.ts 相同的中文值
export const ContactStatusSchema = z.enum([
  '啟用',
  '停用'
]);

// 建立聯絡人的驗證 schema
export const CreateContactSchema = z.object({
  vendor_id: z.string().uuid('必須是有效的 UUID'),
  name: z.string()
    .min(1, '聯絡人姓名為必填')
    .max(100, '姓名不能超過 100 個字元'),
  position: z.string().max(100, '職稱不能超過 100 個字元').optional(),
  department: z.string().max(100, '部門不能超過 100 個字元').optional(),
  phone: z.string()
    .regex(/^[\d\-\+\(\)\s]+$/, '請輸入有效的電話號碼')
    .max(20, '電話號碼不能超過 20 個字元')
    .optional(),
  extension: z.string().max(10, '分機不能超過 10 個字元').optional(),
  mvpn: z.string().max(20, 'MVPN 不能超過 20 個字元').optional(),
  email: z.string()
    .email('請輸入有效的電子郵件')
    .max(100, '電子郵件不能超過 100 個字元')
    .optional(),
  supervisor: z.string().max(100, '主管姓名不能超過 100 個字元').optional(),
  work_supervisor: z.string().max(100, '上班主管姓名不能超過 100 個字元').optional(),
  photo_url: z.string().url('請輸入有效的 URL').max(500).optional(),
  status: ContactStatusSchema.default('active'),
  is_primary: z.boolean().default(false),
  notes: z.string().optional(),
  display_order: z.number().min(0).default(0)
});

// 更新聯絡人的驗證 schema
export const UpdateContactSchema = CreateContactSchema.partial().omit({
  vendor_id: true
});

// 查詢聯絡人的驗證 schema
export const QueryContactSchema = z.object({
  vendor_id: z.string().uuid().optional(),
  name: z.string().optional(),
  status: ContactStatusSchema.optional(),
  is_primary: z.boolean().optional()
});

// 匯出 schema 的型別 (移除與 vendor.ts 衝突的類型導出)
export type CreateVendorInput = z.infer<typeof CreateVendorSchema>;
export type UpdateVendorInput = z.infer<typeof UpdateVendorSchema>;
export type QueryVendorInput = z.infer<typeof QueryVendorSchema>;
export type UpdateRatingInput = z.infer<typeof UpdateRatingSchema>;
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;
export type RenewContractInput = z.infer<typeof RenewContractSchema>;
export type CreateContactInput = z.infer<typeof CreateContactSchema>;
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;
export type QueryContactInput = z.infer<typeof QueryContactSchema>;
// VendorType, VendorStatus, ContactStatus 從 @/types/vendor 導入