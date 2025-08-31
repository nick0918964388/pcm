# PCM 工程關鍵指標平台 - 開發任務規劃

**文件版本:** 1.0  
**建立日期:** 2025年8月29日  
**基於文件:** public/design/architecture.md, design.json, pcm1-5.png  
**目前分支:** feature/shadcn-ui-migration

---

## 📊 專案現狀分析 (Current Status)

### ✅ 已完成項目
- **Shadcn/UI 元件庫遷移完成**
  - Button, Input, Select, Dialog, Card, Badge, Table, Tabs, Skeleton, Progress
  - 完整的 TypeScript 支援和變體系統
  - 響應式設計基礎架構

- **基礎頁面結構 (7個頁面)**
  - 登入頁面 (`/login`)
  - 首頁重定向 (`/`)
  - 專案儀表板 (`/dashboard`)
  - 人力資源-廠商通訊錄 (`/human-resources/contacts`)
  - 時程管理-里程碑 (`/schedule/milestones`)
  - 品質管理-報告 (`/quality/reports`)
  - 元件測試頁面 (`/components-test`)

- **核心共用元件**
  - `DataTable` (支援排序、篩選、分頁)
  - `DashboardWidget` & `StatCard`
  - `FilterBar` (可配置篩選器)
  - `ChartComponent` (Recharts 整合)
  - `MainNavigation` (響應式導航)

- **設計系統整合**
  - Cathay Pacific 品牌色彩 (#00645A)
  - Tailwind CSS 響應式設計
  - 統一的設計規範和 CSS 變數

### ⚠️ 需要完善的項目
- **導航系統**: 下拉選單功能不完整
- **儀表板**: KPI 卡片和圖表資料不完整
- **資料管理**: 缺少 Mock API 和狀態管理
- **頁面完整度**: 大多數功能模組頁面內容簡化

---

## 🎯 開發階段規劃 (Development Phases)

### 階段一：核心功能完善 (P0 - 高優先級) 
**預估時間:** 2-3 週

#### 1.1 專案選擇頁面開發 (`/projects`)
- **參考設計:** `pcm1.png`
- **功能需求:**
  - 左側專案列表 (F20P1, F22P4, AP5B 等)
  - 主區域專案概覽和里程碑時間線
  - 底部專案圖片輪播
  - 專案權限控制
- **技術實作:**
  - 使用 shadcn Card 元件
  - 實作 Carousel 元件 (或使用 shadcn carousel)
  - 建立專案資料結構和 API

#### 1.2 儀表板功能完善 (`/dashboard`)
- **參考設計:** `pcm2.png`, `pcm3.png`
- **功能需求:**
  - 完整的 KPI 卡片 (專案起算、專案進度、今日出工、送審文件)
  - 實時數據圖表 (KPI 進度條、趨勢圖)
  - ESH 要點和最新消息列表
  - 資料自動更新機制
- **技術實作:**
  - 增強 `StatCard` 元件
  - 整合更多 Chart.js/Recharts 圖表類型
  - 實作即時資料更新 hook

#### 1.3 導航系統完善
- **參考設計:** `pcm3.png` 的下拉選單
- **功能需求:**
  - 8 大主選單的完整下拉功能
  - 權限控制的選單項目顯示
  - 麵包屑導航整合
- **技術實作:**
  - 完善 `NavigationDropdown` 元件
  - 建立路由權限系統
  - 整合 `Breadcrumbs` 元件

### 階段二：主要功能模組開發 (P1 - 中優先級)
**預估時間:** 4-5 週

#### 2.1 人力資源模組擴充
- **刷卡紀錄查詢頁面** (`/human-resources/attendance`)
  - 參考設計: `pcm5.png`
  - 日期篩選、人員搜尋、匯出功能
- **出工統計儀表板** (`/human-resources/statistics`)
  - 日報、週報、月報圖表
  - PowerBI 整合介面
- **未刷卡通知管理** (`/human-resources/notifications`)

#### 2.2 時程管理模組
- **專案里程碑甘特圖** (`/schedule/milestones`)
- **發包狀況追蹤** (`/schedule/packages`)
- **法規許可證管理** (`/schedule/permits`)
- **工期比對分析** (`/schedule/timeline-analysis`)

#### 2.3 成本管理模組
- **成本管控儀表板** (`/cost/dashboard`)
- **發包文件管理** (`/cost/contracts`)
- **DCR 管理系統** (`/cost/dcr`)

#### 2.4 品質管理模組
- **品質日報/週報** (`/quality/reports`)
- **品質稽核系統** (`/quality/audits`)
- **品質 KPI 儀表板** (`/quality/kpi`)

### 階段三：進階功能模組 (P2 - 低優先級)
**預估時間:** 3-4 週

#### 3.1 溝通管理模組
- **最新消息管理** (`/communication/news`)
- **文件管理系統** (`/communication/documents`)
- **會議室預約** (`/communication/meeting-rooms`)
- **工程照片庫** (`/communication/photos`)

#### 3.2 風險與工安環保模組
- **ESH 管理平台** (`/safety/esh`)
- **環保 GPS 監控** (`/safety/gps`)
- **環保數值監測** (`/safety/monitoring`)

#### 3.3 即時影像模組
- **工地攝影機整合** (`/live-camera`)

---

## 🛠 技術實作策略 (Technical Implementation)

### 新增 Shadcn/UI 元件需求
```bash
# 階段一需要
npx shadcn@latest add calendar date-picker carousel
npx shadcn@latest add tooltip popover dropdown-menu
npx shadcn@latest add checkbox radio-group switch

# 階段二需要  
npx shadcn@latest add form textarea
npx shadcn@latest add alert sheet
npx shadcn@latest add pagination breadcrumb

# 階段三需要
npx shadcn@latest add command navigation-menu
npx shadcn@latest add scroll-area resizable
```

### 資料管理架構
```typescript
// 1. Mock API 設計 (使用 MSW)
/src/mocks/
├── handlers/
│   ├── projects.ts      // 專案資料
│   ├── dashboard.ts     // 儀表板 KPI
│   ├── hr.ts           // 人力資源
│   └── auth.ts         // 身份驗證
└── data/
    ├── projects.json
    ├── employees.json
    └── kpi.json

// 2. Zustand 狀態管理
/src/store/
├── authStore.ts        // 使用者狀態
├── projectStore.ts     // 專案狀態  
└── uiStore.ts         // UI 狀態

// 3. API Hooks (使用 SWR)
/src/hooks/
├── useProjects.ts
├── useDashboard.ts
├── useEmployees.ts
└── useAuth.ts
```

### 頁面結構規劃
```
/src/app/
├── (auth)/
│   └── login/
├── projects/                    # 新增
│   └── page.tsx                # pcm1.png
├── dashboard/                   
│   └── page.tsx                # 完善 pcm2.png
├── human-resources/
│   ├── contacts/               # 現有
│   ├── attendance/             # 新增 pcm5.png  
│   ├── statistics/             # 新增
│   └── notifications/          # 新增
├── schedule/
│   ├── milestones/            # 現有，需完善
│   ├── packages/              # 新增
│   └── permits/               # 新增
├── cost/                      # 新增模組
├── quality/                   # 現有，需擴充
├── communication/             # 新增模組
├── safety/                    # 新增模組
└── live-camera/               # 新增模組
```

### 元件開發優先序
1. **專案卡片元件** (`ProjectCard`) - 階段一
2. **KPI 儀表板元件** (`KPIDashboard`) - 階段一  
3. **資料表格增強** (`EnhancedDataTable`) - 階段二
4. **圖表元件擴充** (`ChartLibrary`) - 階段二
5. **表單構建器** (`FormBuilder`) - 階段三

---

## 🧪 品質保證策略 (Quality Assurance)

### 測試策略
- **單元測試:** Jest + React Testing Library
- **整合測試:** MSW + API 測試
- **E2E 測試:** Playwright (已配置)
- **視覺測試:** Storybook + Chromatic

### 效能優化
- **程式碼分割:** 按模組分割載入
- **圖片優化:** next/image 最佳化
- **快取策略:** SWR 資料快取
- **Bundle 分析:** webpack-bundle-analyzer

### 可訪問性 (A11y)
- **WCAG 2.1 AA 標準**
- **鍵盤導航支援**
- **螢幕閱讀器相容**
- **色彩對比度檢查**

---

## ⏰ 時程預估 (Timeline Estimation)

| 階段 | 功能範圍 | 預估時間 | 累積進度 |
|------|----------|----------|----------|
| 階段一 | 核心功能 (專案選擇、儀表板、導航) | 2-3 週 | 30% |
| 階段二 | 主要模組 (HR、時程、成本、品質) | 4-5 週 | 80% |
| 階段三 | 進階模組 (溝通、安全、影像) | 3-4 週 | 100% |
| **總計** | **完整 PCM 平台** | **9-12 週** | **100%** |

---

## 🚀 立即可開始的任務 (Ready to Start)

### 本週可完成 (Week 1)
1. **建立專案選擇頁面骨架**
   - 建立 `/src/app/projects/page.tsx`
   - 實作基本的專案列表 UI
   - 使用 shadcn Card 和 Grid 佈局

2. **增強儀表板 KPI 卡片**
   - 擴充 `StatCard` 元件功能
   - 加入更多即時數據顯示
   - 完善響應式佈局

3. **建立 Mock API 基礎**
   - 設定 MSW handlers
   - 建立基礎專案和 KPI 數據
   - 整合到現有頁面

### 下週規劃 (Week 2)
1. **完善導航下拉選單**
2. **實作專案圖片輪播**  
3. **建立 Zustand 狀態管理**

---

## 📝 結語 (Summary)

基於現有的 shadcn/ui 基礎和完整的設計規範，PCM 平台具備了良好的開發基礎。通過三個階段的漸進式開發，可以在 9-12 週內完成一個功能完整、設計精美、技術先進的工程管理平台。

**下一步行動:**
1. 確認開發優先級和時程安排
2. 開始階段一的核心功能開發
3. 建立持續整合和測試流程

---

*文件建立於: 2025年8月29日*  
*最後更新: 2025年8月29日*