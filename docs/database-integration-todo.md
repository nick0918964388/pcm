# PCM 系統 PostgreSQL 資料庫整合待辦清單

## 📋 總覽
基於 `database-integration-analysis.md` 的分析結果，本文件列出所有需要完成的資料庫整合任務。

---

## 🔴 第一階段：建立缺失的 API 端點 (Week 1)

### 1. 廠商管理 API
- [ ] **1.1** 建立 `src/lib/repositories/vendor-repository.ts`
  - 實作 CRUD 操作
  - 連接 `pcm.vendors` 表
  - 包含分頁、搜尋、篩選功能
  
- [ ] **1.2** 建立 `src/lib/services/vendor-service.ts`
  - 業務邏輯處理
  - 資料驗證
  - 錯誤處理
  
- [ ] **1.3** 建立 `src/app/api/vendors/route.ts`
  - GET: 取得廠商列表
  - POST: 新增廠商
  
- [ ] **1.4** 建立 `src/app/api/vendors/[vendorId]/route.ts`
  - GET: 取得單一廠商詳情
  - PUT: 更新廠商資料
  - DELETE: 刪除廠商

### 2. 值班排程 API
- [ ] **2.1** 建立 `src/lib/services/duty-schedule-service.ts`
  - 排班衝突檢查
  - 自動排班邏輯
  - 統計資料計算
  
- [ ] **2.2** 建立 `src/app/api/projects/[projectId]/duty-schedules/route.ts`
  - GET: 取得排班列表
  - POST: 新增排班
  
- [ ] **2.3** 建立 `src/app/api/projects/[projectId]/duty-schedules/current/route.ts`
  - GET: 取得當前值班資訊
  
- [ ] **2.4** 建立 `src/app/api/projects/[projectId]/duty-schedules/stats/route.ts`
  - GET: 取得排班統計資料
  
- [ ] **2.5** 建立 `src/app/api/projects/[projectId]/duty-schedules/export/route.ts`
  - POST: 匯出排班資料 (Excel/CSV/PDF)

### 3. WBS 管理 API
- [ ] **3.1** 建立 `src/lib/repositories/wbs-repository.ts`
  - 階層結構查詢
  - 依賴關係管理
  - 進度計算
  
- [ ] **3.2** 建立 `src/lib/services/wbs-service.ts`
  - WBS 階層邏輯
  - 進度自動更新
  - 里程碑關聯
  
- [ ] **3.3** 修改 `src/app/api/projects/[projectId]/wbs/route.ts`
  - 使用 WbsRepository 取代假資料
  - 實作階層查詢
  
- [ ] **3.4** 修改 `src/app/api/projects/[projectId]/wbs/stats/route.ts`
  - 使用真實資料計算統計

### 4. 人員管理 API
- [ ] **4.1** 建立 `src/lib/repositories/project-member-repository.ts`
  - 專案成員 CRUD
  - 權限管理
  - 角色分配
  
- [ ] **4.2** 建立 `src/app/api/projects/[projectId]/staff/route.ts`
  - GET: 取得專案人員列表
  - POST: 新增專案成員
  
- [ ] **4.3** 建立 `src/app/api/projects/[projectId]/staff/[staffId]/route.ts`
  - GET: 取得成員詳情
  - PUT: 更新成員資料
  - DELETE: 移除專案成員

---

## 🟡 第二階段：修改現有 API 使用資料庫 (Week 2)

### 5. 專案管理 API 整合
- [ ] **5.1** 修改 `src/app/api/projects/route.ts`
  ```typescript
  // 移除 mockProjects
  // 使用 ProjectRepository
  // 加入認證中間件
  ```
  
- [ ] **5.2** 修改 `src/app/api/projects/[projectId]/route.ts`
  - 建立檔案（如果不存在）
  - GET: 取得專案詳情
  - PUT: 更新專案
  - DELETE: 刪除專案
  
- [ ] **5.3** 修改 `src/app/api/projects/[projectId]/members/route.ts`
  - 使用 ProjectMemberRepository
  - 移除假資料
  
- [ ] **5.4** 修改 `src/app/api/projects/[projectId]/members/stats/route.ts`
  - 使用真實資料計算統計

### 6. 資料驗證層建立
- [ ] **6.1** 建立 `src/lib/validations/vendor-schemas.ts`
  - Zod schema 定義
  - 輸入驗證規則
  
- [ ] **6.2** 建立 `src/lib/validations/duty-schedule-schemas.ts`
  - 排班資料驗證
  - 日期衝突檢查
  
- [ ] **6.3** 建立 `src/lib/validations/wbs-schemas.ts`
  - WBS 階層驗證
  - 進度百分比驗證

---

## 🟢 第三階段：前端服務層整合 (Week 3)

### 7. Hook 和 API 服務更新
- [ ] **7.1** 修改 `src/lib/hooks/useDutySchedules.ts`
  - 移除 Mock API 判斷（第 17-18 行）
  - 使用真實 DutyScheduleAPI
  
- [ ] **7.2** 更新 `src/lib/api/dutySchedule.ts`
  - 確認所有端點路徑正確
  - 移除 Mock 相關程式碼
  
- [ ] **7.3** 建立 `src/lib/hooks/useVendors.ts`
  - 廠商資料 Hook
  - SWR 快取策略
  
- [ ] **7.4** 建立 `src/lib/api/vendor.ts`
  - 廠商 API 服務層
  - 完整 CRUD 操作

### 8. 頁面組件更新
- [ ] **8.1** 修改 `src/app/dashboard/[projectId]/vendors/page.tsx`
  - 移除 generateMockVendorQueryResult
  - 使用 useVendors Hook
  
- [ ] **8.2** 修改 `src/app/dashboard/[projectId]/duty-schedules/page.tsx`
  - 確認使用真實 API
  - 移除所有 Mock 資料參考
  
- [ ] **8.3** 修改 `src/app/dashboard/[projectId]/wbs/page.tsx`
  - 使用真實 WBS API
  - 實作階層展開/收合
  
- [ ] **8.4** 修改 `src/app/dashboard/[projectId]/staff/page.tsx`
  - 使用真實人員 API
  - 實作權限管理介面

---

## 🔵 第四階段：清理和優化 (Week 4)

### 9. 移除 Mock 資料和函數
- [ ] **9.1** 清理 `src/types/vendor.ts`
  - 移除 generateMockVendorQueryResult
  - 移除所有 mock 相關函數
  
- [ ] **9.2** 清理 `src/types/dutySchedule.ts`
  - 移除 Mock 資料定義
  - 保留必要的類型定義
  
- [ ] **9.3** 刪除 `src/lib/api/MockDutyScheduleAPI.ts`（如果存在）
  
- [ ] **9.4** 清理測試檔案中的 mock 資料引用

### 10. 效能優化
- [ ] **10.1** 實作資料快取策略
  - Redis 快取層（可選）
  - SWR 快取優化
  
- [ ] **10.2** 資料庫查詢優化
  - 新增必要的索引
  - 優化複雜查詢
  
- [ ] **10.3** API 回應優化
  - 實作分頁
  - 實作延遲載入

### 11. 錯誤處理和日誌
- [ ] **11.1** 完善錯誤處理機制
  - 統一錯誤格式
  - 用戶友好錯誤訊息
  
- [ ] **11.2** 加入操作日誌
  - API 請求日誌
  - 資料變更審計

---

## 🧪 第五階段：測試和文檔 (Week 5)

### 12. 整合測試
- [ ] **12.1** 建立 API 整合測試
  - 測試所有端點
  - 測試資料庫連接
  
- [ ] **12.2** 建立 E2E 測試
  - Playwright 測試腳本
  - 完整使用者流程測試
  
- [ ] **12.3** 效能測試
  - 負載測試
  - 查詢效能測試

### 13. 文檔更新
- [ ] **13.1** 更新 API 文檔
  - OpenAPI/Swagger 規格
  - 端點說明文檔
  
- [ ] **13.2** 更新開發者指南
  - 資料庫設定說明
  - 部署指南更新
  
- [ ] **13.3** 更新 README.md
  - 移除 mock 資料相關說明
  - 新增資料庫設定步驟

---

## 📊 進度追蹤

### 總計任務數：57 項

| 階段 | 任務數 | 預計時程 | 狀態 |
|------|--------|----------|------|
| 第一階段 | 15 | Week 1 | ⏳ 待開始 |
| 第二階段 | 10 | Week 2 | ⏳ 待開始 |
| 第三階段 | 8 | Week 3 | ⏳ 待開始 |
| 第四階段 | 11 | Week 4 | ⏳ 待開始 |
| 第五階段 | 13 | Week 5 | ⏳ 待開始 |

### 優先執行項目（本週）
1. 廠商管理 API (1.1 - 1.4)
2. 專案 API 整合 (5.1)
3. 值班排程 API (2.1 - 2.5)

---

## 🚀 執行建議

### 每日任務分配
- **Day 1-2**: 建立 Repository 層
- **Day 3-4**: 建立 Service 層和 API 端點
- **Day 5**: 測試和除錯
- **Day 6-7**: 前端整合和測試

### 關鍵依賴
1. 確保資料庫已初始化（執行 `initialize-database.sql`）
2. 確保 `.env.local` 配置正確
3. 確保開發環境正常運行

### 測試檢查點
- [ ] 每個 API 端點都有對應的測試
- [ ] 資料庫連接正常
- [ ] 前端能正確顯示資料
- [ ] 沒有殘留的 mock 資料

---

## 📝 備註

### 風險項目
- 資料遷移可能影響現有功能
- 需要協調前後端同步更新
- 效能可能需要優化

### 成功標準
- 所有 API 都從資料庫取得資料
- 移除所有 mock 資料和函數
- 通過所有整合測試
- 系統效能達標

---

*最後更新：2025-01-15*
*預計完成時間：5 週*
*負責人：開發團隊*