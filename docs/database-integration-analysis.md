# PCM 系統資料庫整合分析報告

## 📊 系統現況分析

### ✅ 已完成資料庫整合的部分

#### 1. **認證系統 (100% 完成)**

- ✅ `/api/auth/login` - 使用 `pcm.users` 表
- ✅ `/api/auth/register` - 寫入 `pcm.users` 表
- ✅ `/api/auth/me` - 查詢 `pcm.users` 表
- ✅ `/api/auth/logout` - 管理 `pcm.user_sessions` 表
- ✅ `/api/auth/change-password` - 更新 `pcm.users` 表
- ✅ `/api/auth/refresh` - 管理 `pcm.user_sessions` 表

#### 2. **資料庫基礎架構 (100% 完成)**

- ✅ Connection Pool 設定 (`src/lib/database/connection.ts`)
- ✅ Schema 設定為 `pcm`
- ✅ Base Repository 模式實作
- ✅ 各實體 Repository 實作

---

### ❌ 尚未整合資料庫的部分

#### 1. **專案管理 API**

| API 端點                             | 檔案路徑                                                  | 目前狀態             | 應使用資料表          |
| ------------------------------------ | --------------------------------------------------------- | -------------------- | --------------------- |
| GET /api/projects                    | `src/app/api/projects/route.ts`                           | ⚠️ 使用 mockProjects | `pcm.projects`        |
| GET /api/projects/[id]/members       | `src/app/api/projects/[projectId]/members/route.ts`       | ⚠️ 使用假資料        | `pcm.project_members` |
| GET /api/projects/[id]/members/stats | `src/app/api/projects/[projectId]/members/stats/route.ts` | ⚠️ 使用假資料        | `pcm.project_members` |
| GET /api/projects/[id]/wbs           | `src/app/api/projects/[projectId]/wbs/route.ts`           | ⚠️ 使用假資料        | `pcm.wbs_items`       |
| GET /api/projects/[id]/wbs/stats     | `src/app/api/projects/[projectId]/wbs/stats/route.ts`     | ⚠️ 使用假資料        | `pcm.wbs_items`       |

#### 2. **廠商管理頁面**

| 頁面/組件      | 檔案路徑                                         | 目前狀態                         | 應使用資料表       |
| -------------- | ------------------------------------------------ | -------------------------------- | ------------------ |
| 廠商通訊錄查詢 | `src/app/dashboard/[projectId]/vendors/page.tsx` | ⚠️ generateMockVendorQueryResult | `pcm.vendors`      |
| 廠商人員管理   | `src/types/vendor.ts`                            | ⚠️ Mock 資料生成函數             | `pcm.duty_persons` |

#### 3. **值班排程系統**

| 功能          | 檔案路徑                                                | 目前狀態               | 應使用資料表         |
| ------------- | ------------------------------------------------------- | ---------------------- | -------------------- |
| 值班查詢 Hook | `src/lib/hooks/useDutySchedules.ts`                     | ⚠️ MockDutyScheduleAPI | `pcm.duty_schedules` |
| 值班 API 服務 | `src/lib/api/dutySchedule.ts`                           | ⚠️ 未實作後端          | `pcm.duty_schedules` |
| 值班頁面      | `src/app/dashboard/[projectId]/duty-schedules/page.tsx` | ⚠️ 使用 Mock API       | `pcm.duty_schedules` |

#### 4. **WBS 工作分解結構**

| 功能     | 檔案路徑                                     | 目前狀態      | 應使用資料表    |
| -------- | -------------------------------------------- | ------------- | --------------- |
| WBS 頁面 | `src/app/dashboard/[projectId]/wbs/page.tsx` | ⚠️ 使用假資料 | `pcm.wbs_items` |
| WBS API  | 需要建立                                     | ❌ 不存在     | `pcm.wbs_items` |

#### 5. **人員管理**

| 功能     | 檔案路徑                                       | 目前狀態      | 應使用資料表                        |
| -------- | ---------------------------------------------- | ------------- | ----------------------------------- |
| 人員頁面 | `src/app/dashboard/[projectId]/staff/page.tsx` | ⚠️ 使用假資料 | `pcm.project_members`               |
| 人員 API | 需要建立                                       | ❌ 不存在     | `pcm.users` + `pcm.project_members` |

---

## 🔧 資料庫整合方案設計

### 階段一：API 端點資料庫整合 (優先級：高)

#### 1.1 專案 API 整合

```typescript
// src/app/api/projects/route.ts
// 需要修改為使用 ProjectRepository

import { ProjectRepository } from '@/lib/repositories/project-repository';
import { authenticateToken } from '@/lib/middleware/auth-middleware';

export async function GET(request: NextRequest) {
  // 驗證用戶
  const authResult = await authenticateToken(request);

  // 使用 Repository 查詢資料庫
  const projectRepo = new ProjectRepository();
  const projects = await projectRepo.findAll({
    page,
    pageSize,
    sortBy,
    sortOrder,
    filters: { search, status },
  });

  return successResponse(projects);
}
```

#### 1.2 廠商管理 API 建立

```typescript
// 需要建立: src/app/api/vendors/route.ts
// 需要建立: src/lib/repositories/vendor-repository.ts
```

#### 1.3 值班排程 API 建立

```typescript
// 需要建立: src/app/api/duty-schedules/route.ts
// 已存在: src/lib/repositories/duty-schedule-repository.ts
```

### 階段二：前端 Hook 調整 (優先級：中)

#### 2.1 移除 Mock API 判斷

```typescript
// src/lib/hooks/useDutySchedules.ts
// 修改第 17-18 行
// 從: const API = isDevelopment ? MockDutyScheduleAPI : DutyScheduleAPI
// 改為: const API = DutyScheduleAPI
```

#### 2.2 更新 API 服務層

```typescript
// src/lib/api/dutySchedule.ts
// 確保所有 API 端點都指向真實後端
```

### 階段三：頁面組件更新 (優先級：低)

#### 3.1 移除 Mock 資料生成函數

- 刪除 `generateMockVendorQueryResult`
- 刪除 `MockDutyScheduleAPI`
- 刪除所有 mock 資料定義

---

## 📝 需要修改的檔案清單

### 🔴 高優先級 (API 端點)

1. ✏️ `src/app/api/projects/route.ts` - 專案列表 API
2. ✏️ `src/app/api/projects/[projectId]/members/route.ts` - 專案成員 API
3. ✏️ `src/app/api/projects/[projectId]/wbs/route.ts` - WBS API
4. ➕ `src/app/api/vendors/route.ts` - 新建廠商 API
5. ➕ `src/app/api/duty-schedules/route.ts` - 新建排班 API
6. ➕ `src/lib/repositories/vendor-repository.ts` - 新建廠商 Repository

### 🟡 中優先級 (服務層)

7. ✏️ `src/lib/hooks/useDutySchedules.ts` - 移除 Mock API
8. ✏️ `src/lib/api/dutySchedule.ts` - 更新 API 路徑
9. ➕ `src/lib/services/vendor-service.ts` - 新建廠商服務
10. ➕ `src/lib/services/duty-schedule-service.ts` - 新建排班服務

### 🟢 低優先級 (前端組件)

11. ✏️ `src/app/dashboard/[projectId]/vendors/page.tsx` - 移除 mock 資料
12. ✏️ `src/app/dashboard/[projectId]/duty-schedules/page.tsx` - 使用真實 API
13. ✏️ `src/types/vendor.ts` - 移除 mock 生成函數
14. ✏️ `src/types/dutySchedule.ts` - 移除 mock 定義

---

## 🎯 實施建議

### 第一步：建立缺失的 API 端點

1. 建立廠商管理 API (`/api/vendors`)
2. 建立值班排程 API (`/api/duty-schedules`)
3. 建立 WBS 管理 API (`/api/wbs`)

### 第二步：修改現有 API 使用資料庫

1. 修改專案列表 API 使用 `ProjectRepository`
2. 修改專案成員 API 使用 `ProjectMemberRepository`

### 第三步：前端整合

1. 移除所有 Mock API 判斷
2. 更新 API 服務層路徑
3. 測試所有功能

### 第四步：清理程式碼

1. 刪除所有 mock 資料生成函數
2. 刪除測試用的假資料
3. 更新文檔

---

## 📊 整合進度追蹤

| 模組           | 完成度 | 狀態      |
| -------------- | ------ | --------- |
| 認證系統       | 100%   | ✅ 完成   |
| 資料庫基礎架構 | 100%   | ✅ 完成   |
| 專案管理 API   | 0%     | ❌ 待整合 |
| 廠商管理 API   | 0%     | ❌ 待建立 |
| 值班排程 API   | 0%     | ❌ 待建立 |
| WBS 管理 API   | 0%     | ❌ 待建立 |
| 前端 Hook 整合 | 0%     | ❌ 待修改 |
| 頁面組件整合   | 0%     | ❌ 待修改 |

**總體完成度：約 25%**

---

## 🚀 下一步行動

1. **立即行動**：建立廠商管理 API 端點
2. **本週目標**：完成所有 API 端點的資料庫整合
3. **月度目標**：完成整個系統的資料庫整合，移除所有假資料

---

_報告生成時間：2025-01-15_ _分析工具：Claude AI System Design Module_
