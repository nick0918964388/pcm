# PCM 工程關鍵指標平台 - 技術規格

## 前端技術棧 (Frontend Stack)

### 核心框架
- **Next.js 15.5.2** - React 全端框架，使用 App Router 架構
- **React 19.1.0** - 前端 UI 函式庫
- **TypeScript 5** - 靜態類型系統，提供更好的開發體驗和錯誤檢查

### UI/UX 系統
- **Tailwind CSS 3.4.17** - Utility-first CSS 框架
- **shadcn/ui** - 高品質 React 元件庫 (New York 風格)
- **Radix UI** - 無障礙的基礎 UI primitives
  - `@radix-ui/react-dialog`
  - `@radix-ui/react-select`  
  - `@radix-ui/react-tabs`
  - `@radix-ui/react-progress`
  - `@radix-ui/react-label`
- **Lucide React 0.542.0** - 現代化圖示系統
- **class-variance-authority 0.7.1** - 元件變體管理
- **tailwindcss-animate 1.0.7** - 動畫效果支援

### 狀態管理與資料處理
- **Zustand 5.0.8** - 輕量級狀態管理
- **date-fns 4.1.0** - 日期處理工具函式庫
- **clsx 2.1.1** - 條件式 className 合併
- **tailwind-merge 3.3.1** - Tailwind 類別衝突解決

### 圖表與視覺化
- **Recharts 3.1.2** - React 圖表函式庫
- 支援多種圖表類型：線圖、柱狀圖、圓餅圖、面積圖等

### 建置工具
- **PostCSS 8.5.6** - CSS 後處理器
- **Autoprefixer 10.4.21** - 自動添加瀏覽器前綴

## 資料庫架構 (Database Architecture)

### 主要資料庫
- **PostgreSQL** - 主要資料儲存系統
  - 支援複雜查詢和關聯式資料
  - 內建 JSON 支援用於靈活的資料結構
  - 優秀的效能和擴展性

### 資料庫設計原則
- **正規化設計** - 減少資料冗餘，維持資料一致性
- **索引策略** - 針對常用查詢欄位建立適當索引
- **外鍵約束** - 確保資料完整性
- **軟刪除** - 使用 deleted_at 欄位而非真實刪除資料

### 核心資料表結構

#### 用戶與權限
```sql
-- 用戶表
users (id, username, email, password_hash, role, created_at, updated_at)

-- 專案表  
projects (id, name, code, description, start_date, end_date, status, created_at)

-- 用戶專案關聯
user_projects (user_id, project_id, role, permissions, created_at)
```

#### 專案管理
```sql
-- 里程碑
milestones (id, project_id, name, target_date, actual_date, status, description)

-- KPI 數據
kpi_records (id, project_id, date, metric_type, value, unit, notes)

-- 工作分解結構
wbs_items (id, project_id, parent_id, code, name, description, level)
```

#### 人力資源
```sql
-- 員工資料
employees (id, project_id, name, position, company, contact_info, status)

-- 出勤記錄
attendance_records (id, employee_id, date, check_in, check_out, status, notes)
```

#### 品質與成本
```sql
-- 品質報告
quality_reports (id, project_id, date, type, content, status, created_by)

-- 成本紀錄
cost_records (id, project_id, category, amount, date, description, created_by)
```

## 開發階段資料策略

### 階段一：Mock API 開發
```typescript
// 使用 Mock Service Worker (MSW) 
/src/mocks/
├── handlers/           // API 模擬處理器
│   ├── auth.ts
│   ├── projects.ts
│   ├── dashboard.ts
│   ├── hr.ts
│   ├── schedule.ts
│   ├── quality.ts
│   └── cost.ts
├── data/              // 模擬資料
│   ├── users.json
│   ├── projects.json
│   ├── kpi.json
│   ├── employees.json
│   └── milestones.json
└── server.ts          // MSW 伺服器設定
```

### 階段二：API 抽象層設計
```typescript
// API 服務層，支援 Mock 與真實 API 切換
/src/services/
├── api/
│   ├── base.ts        // 基礎 API 配置
│   ├── auth.ts
│   ├── projects.ts
│   ├── dashboard.ts
│   └── ...
├── types/             // TypeScript 介面定義
│   ├── auth.types.ts
│   ├── project.types.ts
│   └── ...
└── config.ts          // API 環境配置
```

### 階段三：PostgreSQL 整合
- **Prisma ORM** - 資料庫操作抽象層
- **連接池管理** - 優化資料庫連線效能
- **資料遷移** - 版本控制的資料庫結構變更
- **種子資料** - 開發和測試環境的初始資料

## API 設計規範

### RESTful API 原則
```
GET    /api/projects           - 取得專案列表
POST   /api/projects           - 建立新專案
GET    /api/projects/:id       - 取得單一專案
PUT    /api/projects/:id       - 更新專案
DELETE /api/projects/:id       - 刪除專案

GET    /api/projects/:id/kpi   - 取得專案 KPI
POST   /api/projects/:id/kpi   - 新增 KPI 資料
```

### 回應格式標準
```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  errors?: string[]
  meta?: {
    total: number
    page: number
    limit: number
  }
}
```

## 效能優化策略

### 前端優化
- **程式碼分割** - 按路由和功能模組分割
- **懶加載** - 非關鍵元件延遲載入
- **圖片優化** - next/image 自動優化
- **快取策略** - SWR 或 React Query 實作資料快取

### 資料庫優化
- **查詢優化** - 適當的索引和查詢最佳化
- **資料分頁** - 大量資料的分頁處理
- **連線池** - 資料庫連線管理
- **讀寫分離** - 高負載時的資料庫架構

## 安全性要求

### 身份驗證
- **JWT Token** - 無狀態的身份驗證
- **Refresh Token** - 長期登入狀態維持
- **Role-based Access Control (RBAC)** - 角色權限控制

### 資料安全
- **密碼加密** - bcrypt 密碼雜湊
- **HTTPS** - 傳輸加密
- **SQL Injection 防護** - 參數化查詢
- **XSS 防護** - 輸入驗證和輸出編碼

## 部署架構

### 開發環境
- **本地開發** - Docker Compose 統一環境
- **熱重載** - Next.js dev mode
- **Mock API** - MSW 本地模擬

### 生產環境
- **容器化部署** - Docker 容器
- **反向代理** - Nginx 負載均衡
- **資料庫** - PostgreSQL 高可用集群
- **監控** - 系統監控和日誌管理

## 第三方整合

### 已規劃整合
- **PowerBI** - 數據視覺化和報表
- **GPS 監控系統** - 車輛/設備定位
- **攝影機系統** - 即時影像串流
- **刷卡機系統** - 出勤資料同步

### 未來整合考慮
- **ERP 系統** - 企業資源規劃整合
- **BIM 系統** - 建築資訊模型
- **IoT 設備** - 物聯網感測器資料
- **郵件系統** - 自動通知和報告