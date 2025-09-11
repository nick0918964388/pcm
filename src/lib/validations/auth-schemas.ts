import { z } from 'zod';

// 密碼強度驗證
const passwordSchema = z.string()
  .min(8, '密碼長度至少需要 8 個字符')
  .regex(/(?=.*[a-z])/, '密碼必須包含至少一個小寫字母')
  .regex(/(?=.*[A-Z])/, '密碼必須包含至少一個大寫字母')
  .regex(/(?=.*\d)/, '密碼必須包含至少一個數字')
  .regex(/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?])/, '密碼必須包含至少一個特殊字符');

// 登入 Schema
export const loginSchema = z.object({
  usernameOrEmail: z.string()
    .min(1, '請輸入用戶名或信箱')
    .max(100, '用戶名或信箱長度不能超過 100 個字符'),
  password: z.string()
    .min(1, '請輸入密碼')
});

// 註冊 Schema
export const registerSchema = z.object({
  username: z.string()
    .min(3, '用戶名至少需要 3 個字符')
    .max(50, '用戶名長度不能超過 50 個字符')
    .regex(/^[a-zA-Z0-9_-]+$/, '用戶名只能包含字母、數字、底線和連字符'),
  email: z.string()
    .email('請輸入有效的信箱地址')
    .max(100, '信箱長度不能超過 100 個字符'),
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: z.string()
    .max(50, '姓名長度不能超過 50 個字符')
    .optional(),
  lastName: z.string()
    .max(50, '姓名長度不能超過 50 個字符')
    .optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '密碼確認不匹配',
  path: ['confirmPassword'],
});

// 修改密碼 Schema
export const changePasswordSchema = z.object({
  oldPassword: z.string()
    .min(1, '請輸入舊密碼'),
  newPassword: passwordSchema,
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: '新密碼確認不匹配',
  path: ['confirmNewPassword'],
}).refine((data) => data.oldPassword !== data.newPassword, {
  message: '新密碼不能與舊密碼相同',
  path: ['newPassword'],
});

// 重設密碼 Schema
export const resetPasswordSchema = z.object({
  email: z.string()
    .email('請輸入有效的信箱地址'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
  resetToken: z.string()
    .min(1, '重設密碼 Token 不能為空'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '密碼確認不匹配',
  path: ['confirmPassword'],
});

// 刷新 Token Schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string()
    .min(1, 'Refresh Token 不能為空'),
});

// 用戶更新 Schema
export const updateUserSchema = z.object({
  firstName: z.string()
    .max(50, '姓名長度不能超過 50 個字符')
    .optional(),
  lastName: z.string()
    .max(50, '姓名長度不能超過 50 個字符')
    .optional(),
  email: z.string()
    .email('請輸入有效的信箱地址')
    .max(100, '信箱長度不能超過 100 個字符')
    .optional(),
});

// 創建用戶 Schema (管理員用)
export const createUserSchema = z.object({
  username: z.string()
    .min(3, '用戶名至少需要 3 個字符')
    .max(50, '用戶名長度不能超過 50 個字符')
    .regex(/^[a-zA-Z0-9_-]+$/, '用戶名只能包含字母、數字、底線和連字符'),
  email: z.string()
    .email('請輸入有效的信箱地址')
    .max(100, '信箱長度不能超過 100 個字符'),
  password: passwordSchema,
  firstName: z.string()
    .max(50, '姓名長度不能超過 50 個字符')
    .optional(),
  lastName: z.string()
    .max(50, '姓名長度不能超過 50 個字符')
    .optional(),
  roles: z.array(z.string().uuid('無效的角色 ID')).optional(),
});

// 角色管理 Schema
export const createRoleSchema = z.object({
  name: z.string()
    .min(1, '角色名稱不能為空')
    .max(50, '角色名稱長度不能超過 50 個字符')
    .regex(/^[a-zA-Z0-9_-]+$/, '角色名稱只能包含字母、數字、底線和連字符'),
  description: z.string()
    .max(200, '描述長度不能超過 200 個字符')
    .optional(),
  permissions: z.array(z.string())
    .min(1, '至少需要一個權限'),
});

export const updateRoleSchema = z.object({
  name: z.string()
    .min(1, '角色名稱不能為空')
    .max(50, '角色名稱長度不能超過 50 個字符')
    .regex(/^[a-zA-Z0-9_-]+$/, '角色名稱只能包含字母、數字、底線和連字符')
    .optional(),
  description: z.string()
    .max(200, '描述長度不能超過 200 個字符')
    .optional(),
  permissions: z.array(z.string()).optional(),
});

// 分配角色 Schema
export const assignRoleSchema = z.object({
  userIds: z.array(z.string().uuid('無效的用戶 ID'))
    .min(1, '至少需要選擇一個用戶'),
  roleIds: z.array(z.string().uuid('無效的角色 ID'))
    .min(1, '至少需要選擇一個角色'),
});

// 查詢參數 Schema
export const userQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(100).optional().default(20),
  sortBy: z.enum(['username', 'email', 'created_at', 'last_login']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  role: z.string().optional(),
  isVerified: z.coerce.boolean().optional(),
  includeInactive: z.coerce.boolean().optional().default(false),
  lastLoginFrom: z.string().datetime().optional(),
  lastLoginTo: z.string().datetime().optional(),
});

// 批量操作 Schema
export const batchUserOperationSchema = z.object({
  userIds: z.array(z.string().uuid('無效的用戶 ID'))
    .min(1, '至少需要選擇一個用戶'),
  action: z.enum(['lock', 'unlock', 'verify', 'delete']),
  reason: z.string()
    .max(200, '原因描述不能超過 200 個字符')
    .optional(),
});

// 驗證郵箱 Schema
export const verifyEmailSchema = z.object({
  token: z.string()
    .min(1, '驗證 Token 不能為空'),
  email: z.string()
    .email('請輸入有效的信箱地址'),
});

// 導出所有 Schema 類型
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;
export type UpdateUserRequest = z.infer<typeof updateUserSchema>;
export type CreateUserRequest = z.infer<typeof createUserSchema>;
export type CreateRoleRequest = z.infer<typeof createRoleSchema>;
export type UpdateRoleRequest = z.infer<typeof updateRoleSchema>;
export type AssignRoleRequest = z.infer<typeof assignRoleSchema>;
export type UserQueryParams = z.infer<typeof userQuerySchema>;
export type BatchUserOperationRequest = z.infer<typeof batchUserOperationSchema>;
export type VerifyEmailRequest = z.infer<typeof verifyEmailSchema>;