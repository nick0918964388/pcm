# 擴展API架構設計 - 認證管理與專案範疇管理

基於原有API架構，新增人員認證管理和專案範疇管理的完整API設計。

## 1. 認證管理API設計

### 1.1 認證相關API端點

#### 基礎路徑: `/api/auth`

| HTTP方法 | 路徑 | 功能 | 說明 |
|---------|------|------|------|
| POST | `/login` | 用戶登入 | 支援用戶名/信箱登入 |
| POST | `/logout` | 用戶登出 | 清除會話和token |
| POST | `/refresh` | 刷新token | 延長會話時間 |
| POST | `/register` | 用戶註冊 | 建立新用戶帳號 |
| POST | `/forgot-password` | 忘記密碼 | 發送重設密碼連結 |
| POST | `/reset-password` | 重設密碼 | 使用token重設密碼 |
| POST | `/change-password` | 變更密碼 | 已登入用戶變更密碼 |
| GET | `/profile` | 取得個人資料 | 當前用戶資料 |
| PUT | `/profile` | 更新個人資料 | 修改用戶資料 |
| POST | `/verify-email` | 信箱驗證 | 驗證信箱地址 |
| GET | `/sessions` | 取得會話列表 | 當前用戶的所有會話 |
| DELETE | `/sessions/{id}` | 刪除特定會話 | 登出特定裝置 |
| DELETE | `/sessions/all` | 登出所有裝置 | 清除所有會話 |

### 1.2 用戶管理API端點

#### 基礎路徑: `/api/users`

| HTTP方法 | 路徑 | 功能 | 說明 |
|---------|------|------|------|
| GET | `/` | 查詢用戶列表 | 支持分頁、篩選、排序 |
| POST | `/` | 建立新用戶 | 管理員建立用戶 |
| GET | `/{id}` | 取得用戶詳情 | 特定用戶資料 |
| PUT | `/{id}` | 更新用戶資料 | 修改用戶資訊 |
| DELETE | `/{id}` | 刪除用戶 | 軟刪除用戶 |
| POST | `/{id}/activate` | 啟用用戶 | 重新啟用停用的用戶 |
| POST | `/{id}/deactivate` | 停用用戶 | 停用用戶帳號 |
| GET | `/{id}/permissions` | 取得用戶權限 | 用戶完整權限清單 |
| PUT | `/{id}/permissions` | 設定用戶權限 | 修改用戶權限 |
| GET | `/{id}/roles` | 取得用戶角色 | 用戶角色清單 |
| POST | `/{id}/roles` | 指派角色 | 為用戶指派角色 |
| DELETE | `/{id}/roles/{roleId}` | 移除角色 | 移除用戶角色 |
| GET | `/{id}/sessions` | 取得用戶會話 | 管理員查看用戶會話 |
| DELETE | `/{id}/sessions/all` | 強制登出 | 管理員強制用戶登出 |
| GET | `/{id}/audit-logs` | 取得操作記錄 | 用戶操作歷史 |
| POST | `/bulk-update` | 批量更新 | 批量修改用戶資料 |
| POST | `/import` | 匯入用戶 | 從檔案匯入用戶 |
| GET | `/export` | 匯出用戶 | 匯出用戶資料 |

### 1.3 角色權限管理API端點

#### 基礎路徑: `/api/roles`

| HTTP方法 | 路徑 | 功能 | 說明 |
|---------|------|------|------|
| GET | `/` | 取得角色列表 | 所有角色清單 |
| POST | `/` | 建立新角色 | 建立自訂角色 |
| GET | `/{id}` | 取得角色詳情 | 角色資訊和權限 |
| PUT | `/{id}` | 更新角色 | 修改角色資訊和權限 |
| DELETE | `/{id}` | 刪除角色 | 刪除自訂角色 |
| GET | `/{id}/users` | 取得角色用戶 | 擁有此角色的用戶 |
| GET | `/{id}/permissions` | 取得角色權限 | 角色權限清單 |
| PUT | `/{id}/permissions` | 設定角色權限 | 修改角色權限 |

#### 基礎路徑: `/api/permissions`

| HTTP方法 | 路徑 | 功能 | 說明 |
|---------|------|------|------|
| GET | `/` | 取得權限列表 | 所有系統權限 |
| GET | `/categories` | 取得權限分類 | 權限分類清單 |
| POST | `/check` | 檢查權限 | 驗證用戶是否有特定權限 |

### 1.4 審計日誌API端點

#### 基礎路徑: `/api/audit-logs`

| HTTP方法 | 路徑 | 功能 | 說明 |
|---------|------|------|------|
| GET | `/` | 查詢審計日誌 | 支持複雜篩選條件 |
| GET | `/{id}` | 取得日誌詳情 | 特定日誌詳細資訊 |
| GET | `/summary` | 取得統計摘要 | 操作統計和趨勢 |
| GET | `/users/{userId}` | 用戶操作記錄 | 特定用戶的操作歷史 |
| POST | `/export` | 匯出日誌 | 匯出審計報告 |

## 2. 專案範疇管理API設計

### 2.1 專案管理API端點

#### 基礎路徑: `/api/projects`

| HTTP方法 | 路徑 | 功能 | 說明 |
|---------|------|------|------|
| GET | `/` | 查詢專案列表 | 支持分頁、篩選、排序 |
| POST | `/` | 建立新專案 | 建立專案 |
| GET | `/{id}` | 取得專案詳情 | 完整專案資訊 |
| PUT | `/{id}` | 更新專案 | 修改專案資訊 |
| DELETE | `/{id}` | 刪除專案 | 軟刪除專案 |
| POST | `/{id}/archive` | 封存專案 | 專案封存 |
| POST | `/{id}/restore` | 還原專案 | 從封存還原 |
| GET | `/{id}/statistics` | 專案統計 | 進度、成本、時程統計 |
| GET | `/{id}/health` | 專案健康度 | 專案健康指標 |
| POST | `/{id}/duplicate` | 複製專案 | 建立專案副本 |

### 2.2 專案成員管理API端點

#### 基礎路徑: `/api/projects/{projectId}/members`

| HTTP方法 | 路徑 | 功能 | 說明 |
|---------|------|------|------|
| GET | `/` | 取得成員列表 | 專案成員清單 |
| POST | `/` | 新增成員 | 邀請新成員加入 |
| GET | `/{memberId}` | 取得成員詳情 | 成員詳細資訊 |
| PUT | `/{memberId}` | 更新成員 | 修改成員角色和資訊 |
| DELETE | `/{memberId}` | 移除成員 | 從專案移除成員 |
| POST | `/{memberId}/activate` | 啟用成員 | 重新啟用成員 |
| POST | `/{memberId}/deactivate` | 停用成員 | 暫時停用成員 |
| GET | `/roles` | 取得專案角色 | 可用的專案角色 |
| GET | `/skills` | 取得技能清單 | 專案需要的技能 |
| POST | `/bulk-invite` | 批量邀請 | 批量新增成員 |
| GET | `/workload` | 工作負載分析 | 成員工作負載統計 |
| GET | `/performance` | 績效報告 | 成員績效統計 |

### 2.3 WBS管理API端點

#### 基礎路徑: `/api/projects/{projectId}/wbs`

| HTTP方法 | 路徑 | 功能 | 說明 |
|---------|------|------|------|
| GET | `/` | 取得WBS樹狀結構 | 完整WBS階層 |
| POST | `/` | 建立WBS項目 | 新增WBS節點 |
| GET | `/{itemId}` | 取得WBS項目詳情 | 特定項目資訊 |
| PUT | `/{itemId}` | 更新WBS項目 | 修改項目資訊 |
| DELETE | `/{itemId}` | 刪除WBS項目 | 刪除節點和子節點 |
| POST | `/{itemId}/move` | 移動WBS項目 | 變更階層結構 |
| POST | `/{itemId}/copy` | 複製WBS項目 | 複製節點結構 |
| GET | `/flat` | 取得扁平化清單 | 表格檢視用 |
| POST | `/reorder` | 重新排序 | 調整節點順序 |
| POST | `/bulk-update` | 批量更新 | 批量修改項目 |
| GET | `/templates` | 取得WBS範本 | 可用的WBS範本 |
| POST | `/from-template` | 從範本建立 | 使用範本建立WBS |
| POST | `/export` | 匯出WBS | 匯出為Excel/CSV |
| POST | `/import` | 匯入WBS | 從檔案匯入 |
| GET | `/critical-path` | 關鍵路徑分析 | 關鍵路徑計算 |
| GET | `/dependencies` | 依賴關係圖 | 任務依賴分析 |
| POST | `/validate` | 驗證WBS結構 | 檢查結構完整性 |

### 2.4 里程碑管理API端點

#### 基礎路徑: `/api/projects/{projectId}/milestones`

| HTTP方法 | 路徑 | 功能 | 說明 |
|---------|------|------|------|
| GET | `/` | 取得里程碑列表 | 專案里程碑清單 |
| POST | `/` | 建立新里程碑 | 新增里程碑 |
| GET | `/{milestoneId}` | 取得里程碑詳情 | 里程碑詳細資訊 |
| PUT | `/{milestoneId}` | 更新里程碑 | 修改里程碑資訊 |
| DELETE | `/{milestoneId}` | 刪除里程碑 | 刪除里程碑 |
| POST | `/{milestoneId}/achieve` | 標記為達成 | 完成里程碑 |
| GET | `/timeline` | 里程碑時間軸 | 時間軸檢視 |
| GET | `/upcoming` | 即將到來的里程碑 | 近期里程碑 |
| GET | `/overdue` | 逾期里程碑 | 已逾期里程碑 |

## 3. API請求/回應格式

### 3.1 認證API格式

#### 登入請求
```typescript
// POST /api/auth/login
interface LoginRequest {
  username: string;        // 用戶名或信箱
  password: string;
  rememberMe?: boolean;    // 記住登入狀態
  deviceInfo?: {
    deviceType: string;    // web, mobile, desktop
    browser?: string;
    os?: string;
    fingerprint?: string;
  };
}

interface LoginResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      username: string;
      displayName: string;
      email: string;
      role: string;
      permissions: string[];
      avatar?: string;
      lastLoginAt?: string;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;     // 秒數
      tokenType: string;     // Bearer
    };
    session: {
      id: string;
      expiresAt: string;
      deviceInfo: object;
    };
  };
  timestamp: string;
}
```

#### 權限檢查請求
```typescript
// POST /api/permissions/check
interface PermissionCheckRequest {
  permissions: string[];   // 要檢查的權限列表
  resource?: {             // 可選：特定資源
    type: string;         // project, user, duty等
    id: string;
  };
  context?: {              // 可選：上下文資訊
    projectId?: string;
    departmentId?: string;
  };
}

interface PermissionCheckResponse {
  success: boolean;
  data: {
    results: {
      [permission: string]: {
        granted: boolean;
        reason?: string;    // 拒絕原因
      };
    };
    overallAccess: boolean;
  };
  timestamp: string;
}
```

### 3.2 專案管理API格式

#### 建立專案請求
```typescript
// POST /api/projects
interface CreateProjectRequest {
  code: string;
  name: string;
  description?: string;
  type: 'construction' | 'infrastructure' | 'renovation' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // 時程資訊
  plannedStartDate: string;  // YYYY-MM-DD
  plannedEndDate: string;
  
  // 人員配置
  projectManagerId: string;
  sponsorId?: string;
  initialMembers?: {
    userId: string;
    role: string;
    responsibilities?: string[];
  }[];
  
  // 預算資訊
  totalBudget?: number;
  currency: string;
  
  // 其他資訊
  location?: string;
  clientName?: string;
  clientContactInfo?: {
    name: string;
    email: string;
    phone: string;
  };
  tags?: string[];
  customFields?: Record<string, any>;
}
```

#### WBS項目建立請求
```typescript
// POST /api/projects/{projectId}/wbs
interface CreateWBSItemRequest {
  parentId?: string;        // 父節點ID，無則為根節點
  name: string;
  description?: string;
  
  // 時程和工作量
  plannedStartDate?: string;
  plannedEndDate?: string;
  estimatedHours?: number;
  
  // 狀態和優先級
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // 人員分派
  assigneeIds?: string[];
  primaryAssigneeId?: string;
  reviewerId?: string;
  
  // 里程碑和依賴
  isMilestone: boolean;
  predecessorIds?: string[];
  dependencyType?: 'FS' | 'SS' | 'FF' | 'SF';
  
  // 成本和資源
  estimatedCost?: number;
  requiredResources?: {
    type: string;
    name: string;
    quantity: number;
    unit: string;
  }[];
  
  // 品質和風險
  qualityCriteria?: string[];
  identifiedRisks?: string[];
  mitigationPlans?: string[];
  
  // 分類和標籤
  category?: string;
  workType?: string;
  tags?: string[];
  
  // 自訂欄位
  customFields?: Record<string, any>;
}
```

### 3.3 查詢參數標準

#### 通用查詢參數
```typescript
interface CommonQueryParams {
  // 分頁
  page?: number;           // 頁碼（從1開始）
  pageSize?: number;       // 每頁筆數
  
  // 排序
  sortBy?: string;         // 排序欄位
  sortOrder?: 'asc' | 'desc';
  
  // 搜尋
  search?: string;         // 關鍵字搜尋
  
  // 日期篩選
  dateFrom?: string;       // 開始日期 YYYY-MM-DD
  dateTo?: string;         // 結束日期 YYYY-MM-DD
  
  // 狀態篩選
  status?: string;         // 逗號分隔的狀態清單
  
  // 其他常用篩選
  tags?: string;           // 標籤篩選
  archived?: boolean;      // 是否包含封存項目
}
```

#### 專案查詢參數
```typescript
interface ProjectQueryParams extends CommonQueryParams {
  type?: string;           // 專案類型篩選
  managerId?: string;      // 專案經理篩選
  priority?: string;       // 優先級篩選
  healthStatus?: string;   // 健康狀態篩選
  clientName?: string;     // 客戶名稱篩選
  budgetMin?: number;      // 最小預算
  budgetMax?: number;      // 最大預算
  progressMin?: number;    // 最小進度
  progressMax?: number;    // 最大進度
  memberUserId?: string;   // 包含特定成員的專案
}
```

#### WBS查詢參數
```typescript
interface WBSQueryParams extends CommonQueryParams {
  parentId?: string;       // 特定父節點的子項目
  level?: number;          // 特定層級
  assigneeId?: string;     // 負責人篩選
  isMilestone?: boolean;   // 只顯示里程碑
  isCriticalPath?: boolean; // 只顯示關鍵路徑
  progressMin?: number;    // 最小進度
  progressMax?: number;    // 最大進度
  includeChildren?: boolean; // 是否包含子項目
  expandLevel?: number;    // 展開到第幾層
}
```

## 4. 錯誤處理和狀態碼

### 4.1 HTTP狀態碼標準

| 狀態碼 | 說明 | 使用場景 |
|--------|------|----------|
| 200 | OK | 成功查詢 |
| 201 | Created | 成功建立資源 |
| 204 | No Content | 成功刪除或無內容回應 |
| 400 | Bad Request | 請求參數錯誤 |
| 401 | Unauthorized | 未登入或token無效 |
| 403 | Forbidden | 無權限存取 |
| 404 | Not Found | 資源不存在 |
| 409 | Conflict | 資料衝突（如重複建立） |
| 422 | Unprocessable Entity | 驗證錯誤 |
| 429 | Too Many Requests | 請求過於頻繁 |
| 500 | Internal Server Error | 伺服器內部錯誤 |

### 4.2 錯誤碼定義

```typescript
export enum ErrorCodes {
  // 認證相關錯誤 (1000-1099)
  INVALID_CREDENTIALS = 'AUTH_1001',
  ACCOUNT_LOCKED = 'AUTH_1002',
  PASSWORD_EXPIRED = 'AUTH_1003',
  EMAIL_NOT_VERIFIED = 'AUTH_1004',
  TOKEN_EXPIRED = 'AUTH_1005',
  INVALID_TOKEN = 'AUTH_1006',
  SESSION_EXPIRED = 'AUTH_1007',
  MAX_SESSIONS_EXCEEDED = 'AUTH_1008',
  PERMISSION_DENIED = 'AUTH_1009',
  
  // 用戶管理錯誤 (1100-1199)
  USER_NOT_FOUND = 'USER_1101',
  USER_ALREADY_EXISTS = 'USER_1102',
  INVALID_EMAIL_FORMAT = 'USER_1103',
  WEAK_PASSWORD = 'USER_1104',
  USERNAME_TAKEN = 'USER_1105',
  EMAIL_TAKEN = 'USER_1106',
  INVALID_ROLE = 'USER_1107',
  CANNOT_DELETE_SELF = 'USER_1108',
  
  // 專案管理錯誤 (2000-2099)
  PROJECT_NOT_FOUND = 'PROJ_2001',
  PROJECT_CODE_EXISTS = 'PROJ_2002',
  INVALID_PROJECT_STATUS = 'PROJ_2003',
  PROJECT_ACCESS_DENIED = 'PROJ_2004',
  CANNOT_DELETE_ACTIVE_PROJECT = 'PROJ_2005',
  INVALID_DATE_RANGE = 'PROJ_2006',
  MEMBER_ALREADY_EXISTS = 'PROJ_2007',
  MEMBER_NOT_FOUND = 'PROJ_2008',
  INVALID_MEMBER_ROLE = 'PROJ_2009',
  
  // WBS管理錯誤 (2100-2199)
  WBS_ITEM_NOT_FOUND = 'WBS_2101',
  CIRCULAR_DEPENDENCY = 'WBS_2102',
  INVALID_WBS_HIERARCHY = 'WBS_2103',
  CANNOT_MOVE_TO_DESCENDANT = 'WBS_2104',
  WBS_CODE_CONFLICT = 'WBS_2105',
  INVALID_WBS_STATUS_TRANSITION = 'WBS_2106',
  MILESTONE_DATE_CONFLICT = 'WBS_2107',
  
  // 系統錯誤 (9000-9099)
  DATABASE_ERROR = 'SYS_9001',
  VALIDATION_ERROR = 'SYS_9002',
  FILE_UPLOAD_ERROR = 'SYS_9003',
  EXPORT_ERROR = 'SYS_9004',
  IMPORT_ERROR = 'SYS_9005',
}
```

### 4.3 錯誤回應格式

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;          // 錯誤碼
    message: string;       // 使用者友好的錯誤訊息
    details?: any;         // 詳細錯誤資訊
    field?: string;        // 相關欄位（驗證錯誤時）
    traceId?: string;      // 追蹤ID（除錯用）
  };
  timestamp: string;
}

// 驗證錯誤範例
{
  "success": false,
  "error": {
    "code": "SYS_9002",
    "message": "資料驗證失敗",
    "details": {
      "name": ["專案名稱為必填欄位"],
      "plannedStartDate": ["開始日期不能晚於結束日期"]
    }
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## 5. 安全性和中介軟體

### 5.1 認證中介軟體

```typescript
// 認證檢查中介軟體
export function requireAuth(
  req: NextRequest,
  res: NextResponse
): Promise<NextResponse | void> {
  const token = extractToken(req);
  if (!token) {
    return NextResponse.json({
      success: false,
      error: {
        code: ErrorCodes.INVALID_TOKEN,
        message: '需要有效的認證token'
      }
    }, { status: 401 });
  }
  
  // 驗證token並設置用戶資訊
  const user = await validateToken(token);
  if (!user) {
    return NextResponse.json({
      success: false,
      error: {
        code: ErrorCodes.TOKEN_EXPIRED,
        message: 'Token已過期，請重新登入'
      }
    }, { status: 401 });
  }
  
  // 將用戶資訊附加到請求中
  req.user = user;
}

// 權限檢查中介軟體
export function requirePermission(permission: string) {
  return async (req: NextRequest, res: NextResponse) => {
    const user = req.user;
    if (!user) {
      return NextResponse.json({
        success: false,
        error: {
          code: ErrorCodes.PERMISSION_DENIED,
          message: '需要登入才能存取此資源'
        }
      }, { status: 403 });
    }
    
    const hasPermission = await checkUserPermission(user.id, permission);
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: {
          code: ErrorCodes.PERMISSION_DENIED,
          message: '您沒有權限執行此操作'
        }
      }, { status: 403 });
    }
  };
}
```

### 5.2 速率限制

```typescript
// API速率限制設定
const RATE_LIMITS = {
  // 認證相關API
  '/api/auth/login': { requests: 5, window: 15 * 60 * 1000 },      // 15分鐘5次
  '/api/auth/register': { requests: 3, window: 60 * 60 * 1000 },   // 1小時3次
  '/api/auth/forgot-password': { requests: 3, window: 60 * 60 * 1000 },
  
  // 一般API
  '/api/*': { requests: 1000, window: 60 * 60 * 1000 },           // 1小時1000次
  
  // 檔案上傳API
  '/api/*/upload': { requests: 20, window: 60 * 60 * 1000 },      // 1小時20次
};

export function rateLimiter(endpoint: string) {
  return async (req: NextRequest) => {
    const clientId = getClientIdentifier(req); // IP + User-Agent hash
    const key = `rate_limit:${endpoint}:${clientId}`;
    const limit = RATE_LIMITS[endpoint] || RATE_LIMITS['/api/*'];
    
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, Math.ceil(limit.window / 1000));
    }
    
    if (current > limit.requests) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '請求過於頻繁，請稍後再試'
        }
      }, { status: 429 });
    }
  };
}
```

### 5.3 資料驗證

```typescript
// Zod 驗證 Schema 範例
export const CreateUserSchema = z.object({
  username: z.string()
    .min(3, '用戶名至少3個字符')
    .max(50, '用戶名最多50個字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用戶名只能包含字母、數字和底線'),
  
  email: z.string()
    .email('請輸入有效的信箱地址'),
  
  password: z.string()
    .min(8, '密碼至少8個字符')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密碼必須包含大小寫字母和數字'),
  
  displayName: z.string()
    .min(1, '顯示名稱為必填')
    .max(100, '顯示名稱最多100個字符'),
  
  role: z.enum(['admin', 'manager', 'editor', 'viewer']),
  
  department: z.string().optional(),
  
  permissions: z.array(z.string()).optional(),
});

export const CreateProjectSchema = z.object({
  code: z.string()
    .min(3, '專案代碼至少3個字符')
    .max(20, '專案代碼最多20個字符')
    .regex(/^[A-Z0-9-_]+$/, '專案代碼只能包含大寫字母、數字、連字號和底線'),
  
  name: z.string()
    .min(1, '專案名稱為必填')
    .max(255, '專案名稱最多255個字符'),
  
  type: z.enum(['construction', 'infrastructure', 'renovation', 'maintenance']),
  
  plannedStartDate: z.string()
    .datetime('請輸入有效的開始日期'),
  
  plannedEndDate: z.string()
    .datetime('請輸入有效的結束日期'),
  
  projectManagerId: z.string()
    .uuid('專案經理ID格式錯誤'),
  
  totalBudget: z.number()
    .positive('預算必須為正數')
    .optional(),
}).refine((data) => {
  return new Date(data.plannedStartDate) < new Date(data.plannedEndDate);
}, {
  message: "開始日期必須早於結束日期",
  path: ["plannedEndDate"],
});
```

這個擴展API架構提供了完整的認證管理和專案範疇管理功能，包括：

- **完整的認證系統** - 登入/登出、權限管理、會話管理、安全審計
- **用戶和角色管理** - CRUD操作、權限分配、批量操作
- **專案生命週期管理** - 建立、更新、封存、統計分析
- **WBS和里程碑管理** - 階層結構管理、依賴關係、進度追蹤
- **安全性和合規性** - 認證中介軟體、權限檢查、速率限制、資料驗證

所有API都遵循RESTful設計原則，提供一致的請求/回應格式和完善的錯誤處理機制。