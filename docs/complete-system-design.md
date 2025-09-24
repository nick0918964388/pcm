# PCM 專案控制管理系統 - 完整系統設計

## 系統概述

PCM（Project Control
Management）是一個全面的專案控制管理系統，整合了人員認證管理、專案範疇管理和廠商排班管理三大核心功能模組。系統基於 Next.js
14、TypeScript 和 PostgreSQL 構建，提供企業級的專案管理解決方案。

### 🎯 系統目標

- ✅ 整合認證、專案範疇、排班三大模組
- ✅ 企業級安全認證和權限控制
- ✅ 完整的PostgreSQL資料庫整合
- ✅ 高效能的查詢和索引策略
- ✅ 可擴展的微服務架構
- ✅ 現代化前端UI/UX設計

## 🏗️ 系統架構

### 1. 整體架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                    PCM 專案控制管理系統                        │
├─────────────────────────────────────────────────────────────┤
│  Frontend Layer (Next.js 14 + TypeScript + shadcn/ui)     │
├─────────────────────────────────────────────────────────────┤
│  API Layer (Next.js API Routes)                           │
│  ├── Authentication Module                                │
│  ├── Project Scope Module                                 │
│  └── Vendor Duty Schedule Module                          │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer (Service Layer)                     │
│  ├── AuthService                                          │
│  ├── ProjectService                                       │
│  ├── WBSService                                          │
│  └── DutyScheduleService                                 │
├─────────────────────────────────────────────────────────────┤
│  Data Access Layer (Repository Pattern)                   │
│  ├── UserRepository                                       │
│  ├── ProjectRepository                                    │
│  ├── WBSRepository                                        │
│  └── DutyScheduleRepository                              │
├─────────────────────────────────────────────────────────────┤
│  Database Layer (PostgreSQL)                              │
│  ├── Authentication Tables                                │
│  ├── Project Management Tables                            │
│  └── Duty Schedule Tables                                 │
└─────────────────────────────────────────────────────────────┘
```

### 2. 技術堆疊總覽

#### 前端技術

- **框架**: Next.js 14 (App Router)
- **語言**: TypeScript 5.0+
- **UI 組件**: shadcn/ui + Radix UI
- **樣式**: Tailwind CSS
- **狀態管理**: Zustand + TanStack Query
- **表單處理**: React Hook Form + Zod

#### 後端技術

- **API**: Next.js API Routes
- **資料庫**: PostgreSQL 15+
- **ORM**: Prisma / node-postgres
- **認證**: JWT + bcrypt
- **驗證**: Zod Schema

#### DevOps 技術

- **容器化**: Docker + Docker Compose
- **版本控制**: Git + GitHub
- **CI/CD**: GitHub Actions
- **部署**: Vercel / Kubernetes
- **監控**: Prometheus + Grafana

## 核心功能模組

### 1. 人員認證管理模組 (Authentication Management)

#### 1.1 功能特性

- JWT Token 認證機制
- 角色權限控制 (RBAC)
- 登入登出記錄
- 會話管理
- 安全審計記錄

#### 1.2 主要組件

- **認證中間件**: 驗證 JWT Token 和用戶權限
- **用戶管理**: 用戶 CRUD 操作和權限分配
- **角色管理**: 動態角色和權限配置
- **會話管理**: 多重登入和會話控制
- **安全監控**: 登入異常和操作審計

#### 1.3 API 端點

```
/api/auth/login         POST    用戶登入
/api/auth/logout        POST    用戶登出
/api/auth/refresh       POST    刷新 Token
/api/users              GET     用戶列表
/api/users              POST    新增用戶
/api/users/{id}         PUT     更新用戶
/api/users/{id}         DELETE  刪除用戶
/api/roles              GET     角色列表
/api/roles              POST    新增角色
```

### 2. 專案範疇管理模組 (Project Scope Management)

#### 2.1 功能特性

- 專案生命週期管理
- WBS (工作分解結構) 管理
- 專案成員權限控制
- 里程碑追蹤
- 專案報表和儀表板

#### 2.2 主要組件

- **專案管理**: 專案創建、更新和生命週期控制
- **WBS 管理**: 階層式工作分解和任務追蹤
- **成員管理**: 專案成員角色和權限配置
- **里程碑管理**: 關鍵節點和進度追蹤
- **報表系統**: 專案進度和效能分析

#### 2.3 API 端點

```
/api/projects           GET     專案列表
/api/projects           POST    新增專案
/api/projects/{id}      GET     專案詳情
/api/projects/{id}      PUT     更新專案
/api/projects/{id}/members GET  專案成員
/api/projects/{id}/wbs  GET     WBS 結構
/api/projects/{id}/wbs  POST    新增 WBS 項目
```

### 3. 廠商排班管理模組 (Vendor Duty Schedule Management)

#### 3.1 功能特性

- 廠商資料管理
- 排班計劃制定
- 值班記錄追蹤
- 排班衝突檢測
- 報表和統計分析

#### 3.2 主要組件

- **廠商管理**: 廠商基本資料和能力評估
- **排班規劃**: 智能排班和衝突避免
- **值班追蹤**: 實時值班狀態監控
- **報表系統**: 排班效率和成本分析

## 🗃️ 資料庫設計整合

### 核心資料表關係圖

```
users (認證用戶) ──┐
                  ├── project_members ──── projects (專案)
roles (角色) ──────┤                        │
                  └── user_roles            ├── wbs_items (WBS)
                                           │
user_sessions (會話)                        ├── project_milestones (里程碑)
login_logs (登入記錄)                       │
audit_logs (審計記錄)                       └── duty_schedules (排班)
                                               │
                                           vendors (廠商)
```

### 資料表設計規範

- 使用 UUID 作為主鍵確保全域唯一性
- JSONB 欄位存儲複雜配置和元數據
- 軟刪除機制保護重要資料
- 時間戳追蹤資料變更歷程
- 外鍵約束確保資料完整性

### 詳細資料表設計

#### 1.1 用戶認證表 (users)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 1.2 專案表 (projects)

```sql
CREATE TABLE projects (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status project_status DEFAULT 'planning',
    type project_type DEFAULT 'internal',
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    progress DECIMAL(5,2) DEFAULT 0.00,
    manager_id UUID REFERENCES users(id),
    client_info JSONB,
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 1.3 WBS項目表 (wbs_items)

```sql
CREATE TABLE wbs_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(20) NOT NULL REFERENCES projects(id),
    parent_id UUID REFERENCES wbs_items(id),
    wbs_code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    level INTEGER NOT NULL,
    status wbs_status DEFAULT 'not_started',
    priority wbs_priority DEFAULT 'medium',
    assigned_to UUID REFERENCES users(id),
    estimated_hours DECIMAL(8,2),
    actual_hours DECIMAL(8,2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    dependencies UUID[],
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, wbs_code)
);
```

### 2. 索引策略

```sql
-- 主要查詢索引
CREATE INDEX idx_duty_schedules_project_date ON duty_schedules(project_id, duty_date);
CREATE INDEX idx_duty_schedules_person_status ON duty_schedules(person_id, status);
CREATE INDEX idx_duty_schedules_date_shift_area ON duty_schedules(duty_date, shift_type, work_area);

-- 搜尋索引
CREATE INDEX idx_duty_persons_name_gin ON duty_persons USING gin(to_tsvector('simple', name));
CREATE INDEX idx_vendors_name_gin ON vendors USING gin(to_tsvector('simple', name));
```

### 3. 觸發器和審計

```sql
-- 自動更新時間戳
CREATE TRIGGER update_duty_schedules_updated_at
    BEFORE UPDATE ON duty_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 審計日誌
CREATE TRIGGER duty_schedules_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON duty_schedules
    FOR EACH ROW EXECUTE FUNCTION log_table_changes();
```

## 安全架構設計

### 認證流程

```
1. 用戶登入 → 驗證憑證
2. 生成 JWT Access Token (15分鐘)
3. 生成 Refresh Token (7天)
4. 記錄登入日誌
5. 創建用戶會話
```

### 權限控制

- **角色層級**: 系統管理員、專案經理、一般用戶
- **資源權限**: 專案層級的讀寫權限控制
- **功能權限**: 模組功能的細粒度權限控制
- **資料權限**: 基於組織架構的資料存取限制

### 安全措施

- JWT Token 機制
- 會話併發限制
- 密碼複雜度要求
- 登入失敗鎖定
- 操作審計記錄
- SQL 注入防護
- XSS 攻擊防護

## 🔌 API 設計原則

### RESTful 規範

- HTTP 動詞對應 CRUD 操作
- 資源導向的 URL 結構
- 統一的錯誤回應格式
- 版本控制策略

### 錯誤處理

```typescript
interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// 標準化錯誤回應
{
  "error": {
    "code": "AUTH_INVALID_TOKEN",
    "message": "無效的認證 Token",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### 分頁和查詢

```typescript
// 查詢參數標準化
interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  filter?: Record<string, any>;
  search?: string;
}
```

## API 端點設計

### 1. 認證管理 API

```
/api/auth/login         POST    用戶登入
/api/auth/logout        POST    用戶登出
/api/auth/refresh       POST    刷新 Token
/api/auth/me            GET     取得當前用戶資訊
/api/users              GET     用戶列表
/api/users              POST    新增用戶
/api/users/{id}         GET     用戶詳情
/api/users/{id}         PUT     更新用戶
/api/users/{id}         DELETE  刪除用戶
/api/roles              GET     角色列表
/api/roles              POST    新增角色
```

### 2. 專案管理 API

```
/api/projects           GET     專案列表
/api/projects           POST    新增專案
/api/projects/{id}      GET     專案詳情
/api/projects/{id}      PUT     更新專案
/api/projects/{id}      DELETE  刪除專案
/api/projects/{id}/members GET  專案成員
/api/projects/{id}/members POST 新增成員
/api/projects/{id}/wbs  GET     WBS 結構
/api/projects/{id}/wbs  POST    新增 WBS 項目
/api/projects/{id}/milestones GET 里程碑列表
```

### 3. 廠商排班管理 API

```
/api/projects/{id}/duty-schedules GET  排班列表
/api/projects/{id}/duty-schedules POST 新增排班
/api/duty-schedules/{id}         GET   排班詳情
/api/duty-schedules/{id}         PUT   更新排班
/api/duty-schedules/{id}         DELETE 刪除排班
/api/vendors                     GET   廠商列表
/api/vendors                     POST  新增廠商
/api/vendors/{id}                GET   廠商詳情
/api/vendors/{id}                PUT   更新廠商
```

### 4. 查詢參數範例

```typescript
interface DutyScheduleQueryParams {
  // 分頁
  page?: number; // 頁數 (預設: 1)
  pageSize?: number; // 每頁筆數 (預設: 20, 最大: 100)

  // 排序
  sortBy?: 'dutyDate' | 'personName' | 'vendorName' | 'status';
  sortOrder?: 'asc' | 'desc';

  // 篩選
  search?: string; // 姓名/廠商名稱關鍵字
  dateFrom?: string; // 開始日期 (YYYY-MM-DD)
  dateTo?: string; // 結束日期 (YYYY-MM-DD)
  specificDate?: string; // 特定日期 (YYYY-MM-DD)
  vendorIds?: string; // 廠商ID (逗號分隔)
  vendorTypes?: string; // 廠商類型 (逗號分隔)
  shiftTypes?: string; // 班別 (逗號分隔)
  statuses?: string; // 狀態 (逗號分隔)
  workAreas?: string; // 工作區域 (逗號分隔)
  urgencyLevels?: string; // 緊急程度 (逗號分隔)
  currentOnly?: boolean; // 只顯示當前值班
  includeReplacements?: boolean; // 包含代班記錄
}
```

### 2. 回應格式標準

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

// 成功回應範例
{
  "success": true,
  "data": {
    "schedules": [...],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 150,
      "totalPages": 8
    }
  },
  "timestamp": "2025-01-15T10:30:00Z"
}

// 錯誤回應範例
{
  "success": false,
  "message": "資料驗證失敗",
  "errorCode": "VAL_2000",
  "details": {
    "field": "mobile",
    "message": "手機號碼格式不正確"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## 前端架構設計

### 組件架構

```
components/
├── ui/                 # shadcn/ui 基礎組件
├── auth/              # 認證相關組件
├── projects/          # 專案管理組件
├── wbs/               # WBS 管理組件
├── duty-schedule/     # 排班管理組件
└── common/            # 共用組件
```

### 狀態管理

- **全域狀態**: Zustand 管理用戶認證和應用配置
- **伺服器狀態**: TanStack Query 管理 API 資料
- **表單狀態**: React Hook Form 管理表單驗證
- **UI 狀態**: 組件內部 useState 管理

### 路由設計

```
/login                 # 登入頁面
/dashboard             # 系統儀表板
/projects              # 專案列表
/projects/[id]         # 專案詳情
/projects/[id]/wbs     # WBS 管理
/duty-schedule         # 排班管理
/vendors               # 廠商管理
/admin                 # 系統管理
```

## 部署架構設計

### 環境配置

- **開發環境**: 本地 PostgreSQL + Next.js Dev Server
- **測試環境**: Docker Compose + 自動化測試
- **生產環境**: Kubernetes + PostgreSQL Cluster

### CI/CD 流程

```
Code Push → GitHub Actions →
Build & Test → Docker Image →
Deploy to Staging → Integration Test →
Deploy to Production
```

### 監控和日誌

- **應用監控**: 效能指標和錯誤追蹤
- **資料庫監控**: 查詢效能和連接狀況
- **安全監控**: 異常登入和權限操作
- **業務監控**: 專案進度和排班效率

## 開發流程規範

### Git 工作流程

```
main (生產分支)
├── develop (開發分支)
    ├── feature/auth-module
    ├── feature/project-scope
    └── feature/duty-schedule
```

### 程式碼規範

- ESLint + Prettier 程式碼格式化
- Husky + lint-staged Git Hook
- 元件設計原則 (單一職責、可重用)
- TypeScript 嚴格模式

### 測試策略

- **單元測試**: Jest + Testing Library
- **整合測試**: Playwright 端對端測試
- **API 測試**: Supertest HTTP 測試
- **資料庫測試**: 測試資料庫隔離

## 效能最佳化策略

### 前端效能

- Next.js Image 優化
- 程式碼分割和懶載入
- React 效能優化 (memo, useMemo)
- PWA 離線支援

### 資料庫效能

- 索引優化策略
- 查詢效能分析
- 連接池管理
- 快取策略 (Redis)

### API 效能

- 回應快取機制
- 分頁和查詢最佳化
- 併發請求控制
- CDN 靜態資源

## 💻 資料存取層設計

### 1. Repository 模式實作

```typescript
// src/lib/database/connection.ts
class DatabaseConnection {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.HOSTNAME!,
      database: process.env.DATABASE!,
      user: process.env.USERNAME!,
      password: process.env.PASSWORD!,
      port: 5432,
      max: 20, // 最大連線數
      min: 5, // 最小連線數
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });
  }

  async query<T>(text: string, params?: any[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } finally {
      client.release();
    }
  }
}
```

### 2. Service 層業務邏輯

```typescript
// src/lib/repositories/duty-schedule-repository.ts
export class DutyScheduleRepository extends BaseRepository<DutySchedule> {
  constructor() {
    super('duty_schedules');
  }

  async findWithPersonDetails(filters: any = {}): Promise<DutySchedule[]> {
    const builder = new QueryBuilder();
    builder
      .select(['ds.*', 'dp.name as person_name', 'v.name as vendor_name'])
      .from('duty_schedules ds')
      .leftJoin('duty_persons dp', 'ds.person_id = dp.id')
      .leftJoin('vendors v', 'dp.vendor_id = v.id');

    this.applyFilters(builder, filters);

    const { query, params } = builder.build();
    const rows = await this.db.query(query, params);
    return rows.map(row => this.mapFromDB(row));
  }

  async getCurrentDuty(projectId: string): Promise<DutySchedule[]> {
    const query = `
      SELECT ds.*, dp.name as person_name
      FROM duty_schedules ds
      JOIN duty_persons dp ON ds.person_id = dp.id
      WHERE ds.project_id = $1 
        AND ds.status = '值班中'
        AND ds.duty_date = CURRENT_DATE
    `;
    const rows = await this.db.query(query, [projectId]);
    return rows.map(row => this.mapFromDB(row));
  }
}
```

### 3. 連接池管理

```typescript
// src/lib/services/duty-schedule-service.ts
export class DutyScheduleService {
  constructor(
    private repository: DutyScheduleRepository,
    private personRepository: DutyPersonRepository
  ) {}

  async createSchedule(
    projectId: string,
    scheduleData: Partial<DutySchedule>,
    createdBy: string
  ): Promise<DutySchedule> {
    // 1. 驗證人員存在
    const person = await this.personRepository.findById(scheduleData.personId!);
    if (!person) throw new Error('指定的值班人員不存在');

    // 2. 檢查排程衝突
    await this.checkScheduleConflict(
      projectId,
      scheduleData.personId!,
      scheduleData.dutyDate!,
      scheduleData.shiftType!
    );

    // 3. 建立排程
    return await this.repository.create({
      ...scheduleData,
      projectId,
      status: '已排班',
      createdBy,
    });
  }

  private async checkScheduleConflict(
    projectId: string,
    personId: string,
    dutyDate: Date,
    shiftType: string
  ): Promise<void> {
    const conflicts = await this.repository.findAll({
      projectId,
      personId,
      specificDate: dutyDate,
      shiftType,
    });

    if (conflicts.some(s => s.status !== '取消')) {
      throw new Error('該時段已有其他值班排程');
    }
  }
}
```

## 系統整合架構

PCM 系統透過統一的 API Gateway 和共享的資料存取層，實現三個核心模組的無縫整合：

1. **認證模組** 提供系統級的用戶認證和權限控制
2. **專案範疇模組** 管理專案生命週期和工作分解
3. **排班管理模組** 處理廠商資源調度和值班安排

系統設計遵循微服務架構原則，各模組既可獨立運作又能協同合作，確保系統的可擴展性和維護性。

## 🔧 實施步驟

### 第一階段：基礎架構建立 (第1-2週)

#### 1. 環境準備

```bash
# 安裝核心依賴
npm install @prisma/client prisma
npm install jsonwebtoken bcrypt
npm install zod @tanstack/react-query zustand
npm install @radix-ui/react-* shadcn-ui

# 設定環境變數 (.env.local)
HOSTNAME=192.168.1.183
DATABASE=app_db
USERNAME=admin
PASSWORD=XcW04ByX6GbVdt1gw4EJ5XRY
PORT=30432
JWT_SECRET=your-secure-secret-key

# 建立專案目錄結構
mkdir -p src/lib/{auth,database,models,repositories,services}
mkdir -p src/app/api/{auth,users,projects,duty-schedules}
mkdir -p src/components/{auth,projects,wbs,duty-schedule}
```

#### 2. 資料庫建立

```sql
-- 執行認證模組 Schema
CREATE SCHEMA auth;
CREATE TABLE auth.users (...);
CREATE TABLE auth.roles (...);
CREATE TABLE auth.permissions (...);

-- 執行專案管理 Schema
CREATE SCHEMA project;
CREATE TABLE project.projects (...);
CREATE TABLE project.wbs_items (...);
CREATE TABLE project.milestones (...);

-- 執行排班管理 Schema
CREATE SCHEMA duty;
CREATE TABLE duty.vendors (...);
CREATE TABLE duty.schedules (...);
```

### 第二階段：核心功能開發 (第3-4週)

#### 3. 認證模組實作

```bash
# 實作順序:
# 1. src/lib/auth/jwt.ts - JWT Token 管理
# 2. src/lib/auth/middleware.ts - 認證中間件
# 3. src/lib/repositories/user-repository.ts - 用戶資料存取
# 4. src/lib/services/auth-service.ts - 認證業務邏輯
# 5. src/app/api/auth/*/route.ts - 認證 API 端點
```

#### 4. 專案範疇模組實作

```bash
# 實作順序:
# 1. src/lib/repositories/project-repository.ts - 專案資料存取
# 2. src/lib/repositories/wbs-repository.ts - WBS 資料存取
# 3. src/lib/services/project-service.ts - 專案業務邏輯
# 4. src/lib/services/wbs-service.ts - WBS 業務邏輯
# 5. src/app/api/projects/*/route.ts - 專案 API 端點
```

#### 5. 排班管理模組實作

```bash
# 實作順序:
# 1. src/lib/repositories/vendor-repository.ts - 廠商資料存取
# 2. src/lib/repositories/schedule-repository.ts - 排班資料存取
# 3. src/lib/services/vendor-service.ts - 廠商業務邏輯
# 4. src/lib/services/schedule-service.ts - 排班業務邏輯
# 5. src/app/api/duty-schedules/*/route.ts - 排班 API 端點
```

### 第三階段：整合與測試 (第5-6週)

#### 6. 系統整合測試

```bash
# 整合測試:
# 1. 認證流程測試 - 登入、登出、Token 刷新
# 2. 權限控制測試 - 角色權限、資源存取控制
# 3. 專案管理測試 - CRUD 操作、WBS 管理
# 4. 排班系統測試 - 排班衝突檢測、值班追蹤
# 5. 端對端測試 - 完整業務流程測試
```

## 🧪 測試策略

### 1. 單元測試

```typescript
// 測試 Repository 層
describe('DutyScheduleRepository', () => {
  test('should create duty schedule', async () => {
    const repository = new DutyScheduleRepository();
    const schedule = await repository.create({
      projectId: 'test-project',
      dutyDate: new Date('2025-01-15'),
      shiftType: '日班',
      personId: 'person-id',
      workArea: '主工區',
      createdBy: 'test-user',
    });
    expect(schedule.id).toBeDefined();
  });
});

// 測試 Service 層
describe('DutyScheduleService', () => {
  test('should prevent schedule conflicts', async () => {
    const service = new DutyScheduleService(mockRepository, mockPersonRepo);
    await expect(service.createSchedule(conflictingData)).rejects.toThrow('該時段已有其他值班排程');
  });
});
```

### 2. 整合測試

```typescript
// 測試 API 端點
describe('Duty Schedule API', () => {
  test('GET /api/projects/proj-001/duty-schedules', async () => {
    const response = await fetch('/api/projects/proj-001/duty-schedules');
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.schedules).toBeInstanceOf(Array);
  });
});
```

### 3. 效能測試

```bash
# 使用工具進行負載測試
npm install --save-dev artillery
artillery run load-test.yml
```

## 🔒 安全性考量

### 1. SQL 注入防護

```typescript
// ✅ 使用參數化查詢
const query = 'SELECT * FROM duty_schedules WHERE project_id = $1';
await db.query(query, [projectId]);

// ❌ 避免字串拼接
const badQuery = `SELECT * FROM duty_schedules WHERE project_id = '${projectId}'`;
```

### 2. 資料驗證

```typescript
// 使用 Zod 進行嚴格驗證
const CreateDutyScheduleSchema = z.object({
  projectId: z.string().min(1),
  dutyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shiftType: z.enum(['日班', '夜班', '全日', '緊急', '加班']),
  personId: z.string().uuid(),
});
```

### 3. 權限控制

```typescript
// API 路由中的權限檢查
export async function GET(request: NextRequest, { params }) {
  // 檢查用戶是否有專案存取權限
  const hasAccess = await checkProjectAccess(request, params.projectId);
  if (!hasAccess) {
    return NextResponse.json({ error: '存取權限不足' }, { status: 403 });
  }
  // ... 處理請求
}
```

## 📊 監控和維護

### 1. 效能監控

```typescript
// API 效能監控
const startTime = Date.now();
// ... API 處理邏輯
const duration = Date.now() - startTime;
console.log(`API ${endpoint} took ${duration}ms`);

// 慢查詢警告
if (duration > 1000) {
  console.warn(`Slow query: ${endpoint} - ${duration}ms`);
}
```

### 2. 健康檢查

```typescript
// /api/health 端點
export async function GET() {
  try {
    await db.query('SELECT 1');
    return NextResponse.json({ status: 'healthy' });
  } catch (error) {
    return NextResponse.json({ status: 'unhealthy' }, { status: 503 });
  }
}
```

### 3. 日誌管理

```typescript
// 結構化日誌
const logger = {
  info: (message: string, meta?: any) => {
    console.log(
      JSON.stringify({
        level: 'info',
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      })
    );
  },
};
```

## 📈 擴展考量

### 1. 資料庫優化

- **分區策略**: 大量資料時按年份分區
- **讀寫分離**: 使用讀副本分散查詢負載
- **快取策略**: Redis 快取熱點資料

### 2. API 優化

- **GraphQL**: 靈活的資料查詢
- **分頁優化**: 遊標分頁處理大量資料
- **批次操作**: 支援批次建立/更新

### 3. 微服務拆分

未來可考慮拆分為以下微服務：

- 廠商管理服務
- 人員管理服務
- 值班排程服務
- 通知服務

---

## 未來擴展規劃

### 短期目標 (3個月)

- 完成三大核心模組開發
- 實現基本的權限控制
- 部署測試環境
- 整合即時通知功能

### 中期目標 (6個月)

- 新增行動應用支援
- 實現即時協作功能
- 整合第三方系統 API
- 建立資料分析儀表板

### 長期目標 (1年)

- AI 輔助排班優化
- 機器學習預測分析
- 多租戶架構支援
- 微服務架構完整轉型

## 📋 總結

PCM 專案控制管理系統整合了人員認證、專案範疇和廠商排班三大核心功能，提供了一個完整的企業級專案管理解決方案。系統具備以下核心優勢：

✅ **整合性**: 三大模組無縫整合，資料互通共享  
✅ **安全性**: 企業級認證授權，完善的權限控制  
✅ **可擴展性**: 微服務架構設計，支援橫向擴展  
✅ **可維護性**: 清晰的分層架構，標準化設計模式  
✅ **效能優化**: 資料庫索引策略，快取機制支援  
✅ **現代化**: 採用最新技術棧，響應式設計

系統設計遵循業界最佳實踐，結合現代化開發理念，為企業提供高效、安全、可靠的專案管理平台。

---

_本文件版本: 1.0_  
_最後更新: 2024-01-15_  
_文件狀態: 設計完成_
