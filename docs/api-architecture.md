# API 架構設計文件

## 1. 技術架構概述

### 1.1 架構層次
```
┌─────────────────────────────┐
│    Frontend (Next.js)       │
├─────────────────────────────┤
│    API Routes (Next.js)     │
├─────────────────────────────┤
│    Business Logic Layer     │
├─────────────────────────────┤
│    Data Access Layer (DAL)  │
├─────────────────────────────┤
│    PostgreSQL Database      │
└─────────────────────────────┘
```

### 1.2 核心依賴套件
```json
{
  "pg": "^8.11.0",
  "pg-pool": "^3.6.0", 
  "zod": "^3.22.0",
  "@types/pg": "^8.10.0"
}
```

## 2. API 路由規劃

### 2.1 值班管理 API 端點

#### 基礎路徑: `/api/projects/[projectId]/duty-schedules`

| HTTP方法 | 路徑 | 功能 | 說明 |
|---------|------|------|------|
| GET | `/` | 查詢值班列表 | 支持分頁、篩選、排序 |
| POST | `/` | 新增值班排程 | 建立新的值班記錄 |
| GET | `/{id}` | 取得值班詳情 | 單一值班記錄詳細資訊 |
| PUT | `/{id}` | 更新值班排程 | 修改值班記錄 |
| DELETE | `/{id}` | 刪除值班排程 | 軟刪除值班記錄 |
| GET | `/current` | 當前值班狀況 | 即時值班人員資訊 |
| GET | `/stats` | 值班統計資訊 | 各種統計數據 |
| POST | `/export` | 匯出值班資料 | 支持Excel/CSV/PDF |
| POST | `/{id}/check-in` | 值班簽到 | 記錄簽到時間和位置 |
| POST | `/{id}/check-out` | 值班簽退 | 記錄簽退時間 |
| POST | `/{id}/replace` | 值班代理 | 處理代班申請 |

### 2.2 人員管理 API 端點

#### 基礎路徑: `/api/duty-persons`

| HTTP方法 | 路徑 | 功能 | 說明 |
|---------|------|------|------|
| GET | `/` | 查詢人員列表 | 支持按廠商篩選 |
| POST | `/` | 新增人員資料 | 建立值班人員檔案 |
| GET | `/{id}` | 取得人員詳情 | 個人詳細資訊 |
| PUT | `/{id}` | 更新人員資料 | 修改人員資訊 |
| DELETE | `/{id}` | 刪除人員資料 | 軟刪除人員記錄 |
| GET | `/{id}/schedules` | 個人值班歷程 | 該人員的值班記錄 |

### 2.3 廠商管理 API 端點

#### 基礎路徑: `/api/vendors`

| HTTP方法 | 路徑 | 功能 | 說明 |
|---------|------|------|------|
| GET | `/` | 查詢廠商列表 | 全部廠商資訊 |
| POST | `/` | 新增廠商資料 | 建立廠商檔案 |
| GET | `/{id}` | 取得廠商詳情 | 廠商詳細資訊 |
| PUT | `/{id}` | 更新廠商資料 | 修改廠商資訊 |
| DELETE | `/{id}` | 刪除廠商資料 | 軟刪除廠商記錄 |
| GET | `/{id}/persons` | 廠商人員列表 | 該廠商的所有人員 |

## 3. 請求/回應格式規範

### 3.1 通用回應格式
```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
  timestamp: string;
  meta?: {
    pagination?: PaginationInfo;
    filters?: AppliedFilters;
  };
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ApiError {
  success: false;
  message: string;
  errorCode: string;
  details?: Record<string, any>;
  timestamp: string;
}
```

### 3.2 查詢參數規範

#### 值班查詢參數
```typescript
interface DutyScheduleQueryParams {
  // 分頁
  page?: number;
  pageSize?: number;
  
  // 排序
  sortBy?: 'dutyDate' | 'personName' | 'vendorName' | 'status';
  sortOrder?: 'asc' | 'desc';
  
  // 篩選
  search?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  specificDate?: string; // YYYY-MM-DD
  vendorIds?: string; // comma-separated
  vendorTypes?: string; // comma-separated
  shiftTypes?: string; // comma-separated
  statuses?: string; // comma-separated
  workAreas?: string; // comma-separated
  urgencyLevels?: string; // comma-separated
  currentOnly?: boolean;
  includeReplacements?: boolean;
}
```

### 3.3 資料驗證 Schema

```typescript
// Zod 驗證 Schema
import { z } from 'zod';

export const CreateDutyScheduleSchema = z.object({
  projectId: z.string().min(1),
  dutyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shiftType: z.enum(['日班', '夜班', '全日', '緊急', '加班']),
  personId: z.string().uuid(),
  workArea: z.enum(['主工區', '辦公區', '倉儲區', '設備區', '安全區', '入口處', '其他']),
  workLocation: z.string().optional(),
  notes: z.string().optional(),
  specialInstructions: z.string().optional(),
  urgencyLevel: z.enum(['低', '中', '高', '緊急']).optional(),
});

export const CreatePersonSchema = z.object({
  vendorId: z.string().uuid(),
  name: z.string().min(1).max(50),
  position: z.string().min(1).max(50),
  mobile: z.string().regex(/^09\d{8}$/),
  extension: z.string().max(10).optional(),
  email: z.string().email().optional(),
  mvpn: z.string().max(20).optional(),
  isPrimary: z.boolean().default(false),
  supervisor: z.string().max(50).optional(),
  emergencyContact: z.string().optional(),
});
```

## 4. 錯誤處理機制

### 4.1 錯誤碼定義
```typescript
export enum ErrorCodes {
  // 系統錯誤 (1000-1099)
  INTERNAL_SERVER_ERROR = 'SYS_1000',
  DATABASE_CONNECTION_ERROR = 'SYS_1001',
  DATABASE_QUERY_ERROR = 'SYS_1002',
  
  // 驗證錯誤 (2000-2099)
  VALIDATION_ERROR = 'VAL_2000',
  MISSING_REQUIRED_FIELD = 'VAL_2001',
  INVALID_FORMAT = 'VAL_2002',
  INVALID_DATE_RANGE = 'VAL_2003',
  
  // 業務邏輯錯誤 (3000-3099)
  RESOURCE_NOT_FOUND = 'BUS_3000',
  DUPLICATE_SCHEDULE = 'BUS_3001',
  PERSON_NOT_AVAILABLE = 'BUS_3002',
  SCHEDULE_CONFLICT = 'BUS_3003',
  
  // 權限錯誤 (4000-4099)
  UNAUTHORIZED = 'AUTH_4000',
  FORBIDDEN = 'AUTH_4001',
  PROJECT_ACCESS_DENIED = 'AUTH_4002',
}
```

### 4.2 錯誤處理中介軟體
```typescript
export function errorHandler(
  error: Error,
  req: NextRequest,
  res: NextResponse
): NextResponse {
  console.error('API Error:', error);
  
  // 驗證錯誤
  if (error instanceof z.ZodError) {
    return NextResponse.json({
      success: false,
      message: '資料驗證失敗',
      errorCode: ErrorCodes.VALIDATION_ERROR,
      details: error.errors,
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }
  
  // 資料庫錯誤
  if (error.message.includes('database')) {
    return NextResponse.json({
      success: false,
      message: '資料庫操作失敗',
      errorCode: ErrorCodes.DATABASE_QUERY_ERROR,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
  
  // 預設錯誤
  return NextResponse.json({
    success: false,
    message: '系統內部錯誤',
    errorCode: ErrorCodes.INTERNAL_SERVER_ERROR,
    timestamp: new Date().toISOString()
  }, { status: 500 });
}
```

## 5. 資料庫連線設定

### 5.1 連線池配置
```typescript
import { Pool, PoolConfig } from 'pg';

const poolConfig: PoolConfig = {
  host: process.env.HOSTNAME,
  database: process.env.DATABASE,
  user: process.env.USERNAME,
  password: process.env.PASSWORD,
  port: parseInt(process.env.PORT || '5432'),
  
  // 連線池設定
  max: 20, // 最大連線數
  min: 5,  // 最小連線數
  idle: 10000, // 10秒閒置時間
  connect_timeout: 5000, // 5秒連線超時
  
  // SSL 設定（生產環境）
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
};

export const db = new Pool(poolConfig);
```

### 5.2 資料庫查詢輔助函數
```typescript
export class DatabaseHelper {
  static async query<T>(
    text: string, 
    params?: any[]
  ): Promise<T[]> {
    const client = await db.connect();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw new Error('資料庫查詢失敗');
    } finally {
      client.release();
    }
  }

  static async queryOne<T>(
    text: string, 
    params?: any[]
  ): Promise<T | null> {
    const results = await this.query<T>(text, params);
    return results.length > 0 ? results[0] : null;
  }

  static async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
```

## 6. 快取策略

### 6.1 記憶體快取
```typescript
interface CacheItem<T> {
  data: T;
  expiry: number;
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const cache = new MemoryCache();
```

### 6.2 快取鍵規則
```typescript
export const CacheKeys = {
  DUTY_SCHEDULES: (projectId: string, page: number, filters: string) => 
    `duty_schedules:${projectId}:${page}:${filters}`,
  CURRENT_DUTY: (projectId: string) => 
    `current_duty:${projectId}`,
  DUTY_STATS: (projectId: string, filters: string) => 
    `duty_stats:${projectId}:${filters}`,
  PERSON_DETAIL: (personId: string) => 
    `person:${personId}`,
  VENDOR_LIST: () => 
    `vendors:all`,
};
```

## 7. 安全性考量

### 7.1 輸入驗證
- 使用 Zod 進行嚴格的資料驗證
- SQL 參數化查詢防止 SQL 注入
- XSS 防護和輸入清理

### 7.2 權限控制
```typescript
export function requireProjectAccess(projectId: string) {
  return async (req: NextRequest) => {
    // 檢查用戶是否有專案存取權限
    const userProjects = await getUserProjects(req);
    if (!userProjects.includes(projectId)) {
      throw new Error('專案存取權限不足');
    }
  };
}
```

### 7.3 資料脫敏
```typescript
export function sanitizePersonData(person: DutyPerson): Partial<DutyPerson> {
  return {
    ...person,
    mobile: person.mobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'),
    email: person.email?.replace(/(.{2}).+(@.+)/, '$1****$2'),
  };
}
```

## 8. 監控和日誌

### 8.1 API 效能監控
```typescript
export function performanceMonitor(endpoint: string) {
  return async (req: NextRequest, res: NextResponse) => {
    const startTime = Date.now();
    
    // 執行 API 邏輯
    
    const duration = Date.now() - startTime;
    console.log(`API ${endpoint} took ${duration}ms`);
    
    // 記錄慢查詢
    if (duration > 1000) {
      console.warn(`Slow query detected: ${endpoint} - ${duration}ms`);
    }
  };
}
```

### 8.2 結構化日誌
```typescript
export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },
  
  error: (message: string, error?: Error, meta?: Record<string, any>) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }
};
```

## 9. 部署考量

### 9.1 環境變數
```env
# 資料庫連線
HOSTNAME=192.168.1.183
DATABASE=app_db
USERNAME=admin
PASSWORD=XcW04ByX6GbVdt1gw4EJ5XRY
PORT=5432

# API 設定
NEXT_PUBLIC_API_URL=http://localhost:3000/api
API_RATE_LIMIT=100

# 快取設定
CACHE_TTL=300
ENABLE_CACHE=true

# 日誌層級
LOG_LEVEL=info
```

### 9.2 健康檢查端點
```typescript
// /api/health
export async function GET() {
  try {
    // 檢查資料庫連線
    await db.query('SELECT 1');
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      cache: 'active'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}
```