# 專案人員查詢與 WBS 項目設定功能需求文檔

## 1. 功能概述

本功能模組為 PCM (專案管理系統) 專案範疇管理的核心子功能，提供專案內部人員查詢管理與 WBS (工作分解結構) 項目設定功能。

### 1.1 核心目標
- 提供高效的專案人員查詢、篩選與管理介面
- 建立完整的 WBS 項目設定與管理系統
- 確保與現有專案範疇管理系統的無縫整合

### 1.2 目標使用者
- **專案經理**: 管理團隊成員和 WBS 結構
- **專案管理員**: 配置專案組織結構
- **團隊成員**: 查詢專案人員資訊

## 2. 功能需求

### 2.1 專案人員查詢功能 (FR-1)

**需求描述**: 提供專案內人員的多維度查詢、篩選和管理功能

**詳細功能**:
- **基本查詢**:
  - 支援姓名、職位、部門的模糊搜索
  - 提供即時搜索建議和自動補全
  - 支援多條件組合查詢

- **高級篩選**:
  - 按部門篩選 (支援多選)
  - 按職位角色篩選 (支援多選)
  - 按權限等級篩選 (viewer/editor/admin/super_admin)
  - 按加入時間範圍篩選

- **結果排序**:
  - 支援按姓名、職位、部門、加入時間排序
  - 提供升序/降序切換
  - 記住用戶排序偏好

**數據結構需求**:
```typescript
interface ProjectMemberQuery {
  projectId: string
  searchTerm?: string           // 搜索關鍵字
  departments?: string[]        // 部門篩選
  roles?: string[]             // 職位篩選  
  permissions?: PermissionLevel[] // 權限等級篩選
  joinDateRange?: {            // 加入時間範圍
    start?: Date
    end?: Date
  }
  sortBy?: 'name' | 'role' | 'joinedAt' | 'department'
  sortDirection?: 'asc' | 'desc'
  page?: number                // 分頁參數
  pageSize?: number           // 每頁筆數
}

interface ProjectMemberQueryResult {
  members: ProjectMember[]     // 查詢結果
  totalCount: number          // 總筆數
  currentPage: number         // 當前頁數
  hasNextPage: boolean        // 是否有下頁
  aggregations?: {            // 聚合統計
    byDepartment: Record<string, number>
    byRole: Record<string, number>
    byPermission: Record<PermissionLevel, number>
  }
}
```

**API 端點**:
- `GET /api/projects/{projectId}/members` - 取得專案成員列表
- `POST /api/projects/{projectId}/members/search` - 高級搜索
- `GET /api/projects/{projectId}/members/aggregations` - 統計資料

### 2.2 專案人員管理功能 (FR-2)

**需求描述**: 提供專案人員的新增、編輯、權限管理功能

**詳細功能**:
- **成員新增**:
  - 從公司人員庫搜索和添加
  - 批量添加多個成員
  - 設定初始權限和角色

- **成員編輯**:
  - 修改成員基本資訊 (職位、部門、聯絡方式)
  - 調整專案內權限等級
  - 設定成員專案角色

- **權限管理**:
  - 支援四級權限系統 (viewer/editor/admin/super_admin)
  - 權限異動歷史記錄
  - 權限到期設定和提醒

**API 端點**:
- `POST /api/projects/{projectId}/members` - 新增成員
- `PUT /api/projects/{projectId}/members/{memberId}` - 編輯成員
- `DELETE /api/projects/{projectId}/members/{memberId}` - 移除成員
- `POST /api/projects/{projectId}/members/batch` - 批量操作

### 2.3 WBS 項目結構管理功能 (FR-3)

**需求描述**: 提供工作分解結構的建立、編輯和管理功能

**詳細功能**:
- **樹狀結構管理**:
  - 支援無限層級的樹狀結構
  - 拖拽方式重新組織結構
  - 節點摺疊/展開控制

- **WBS 項目操作**:
  - 新增、編輯、刪除 WBS 項目
  - 自動生成 WBS 編碼 (1.1.2 格式)
  - 項目間的移動和重組

- **項目屬性管理**:
  - 項目名稱、描述、負責人設定
  - 預估工時和實際工時追蹤
  - 項目狀態管理 (規劃中/進行中/已完成)

**數據結構需求**:
```typescript
interface WBSItem {
  id: string                   // 項目唯一ID
  projectId: string           // 所屬專案ID
  parentId?: string           // 父項目ID
  code: string                // WBS編碼 (如 1.1.2)
  name: string                // 項目名稱
  description?: string        // 項目描述
  level: number              // 層級深度
  order: number              // 同級排序
  assigneeId?: string        // 負責人ID
  assigneeName?: string      // 負責人姓名
  estimatedHours?: number    // 預估工時
  actualHours?: number       // 實際工時
  status: WBSStatus          // 項目狀態
  startDate?: Date           // 計劃開始日期
  endDate?: Date             // 計劃結束日期
  children?: WBSItem[]       // 子項目
  createdAt: Date            // 建立時間
  updatedAt: Date            // 最後更新時間
  createdBy: string          // 建立者
  updatedBy: string          // 最後更新者
}

enum WBSStatus {
  PLANNING = 'planning',      // 規劃中
  IN_PROGRESS = 'in_progress', // 進行中
  COMPLETED = 'completed',     // 已完成
  ON_HOLD = 'on_hold',        // 暫停
  CANCELLED = 'cancelled'      // 已取消
}
```

**API 端點**:
- `GET /api/projects/{projectId}/wbs` - 取得 WBS 結構
- `POST /api/projects/{projectId}/wbs` - 新增 WBS 項目
- `PUT /api/projects/{projectId}/wbs/{wbsId}` - 編輯 WBS 項目
- `DELETE /api/projects/{projectId}/wbs/{wbsId}` - 刪除 WBS 項目
- `POST /api/projects/{projectId}/wbs/reorder` - 重新排序

### 2.4 WBS 項目批量操作功能 (FR-4)

**需求描述**: 提供 WBS 項目的批量操作和導入導出功能

**詳細功能**:
- **批量編輯**:
  - 多選項目進行批量狀態更新
  - 批量設定負責人
  - 批量調整預估工時

- **導入導出**:
  - Excel 格式的 WBS 結構導入
  - WBS 結構導出為 Excel/PDF 格式
  - 支援模板下載和驗證

- **結構驗證**:
  - 檢查循環依賴
  - 驗證編碼格式正確性
  - 負責人有效性檢查

**API 端點**:
- `POST /api/projects/{projectId}/wbs/batch-update` - 批量更新
- `POST /api/projects/{projectId}/wbs/import` - 導入 WBS
- `GET /api/projects/{projectId}/wbs/export` - 導出 WBS
- `POST /api/projects/{projectId}/wbs/validate` - 結構驗證

### 2.5 整合查詢功能 (FR-5)

**需求描述**: 提供人員和 WBS 項目的關聯查詢功能

**詳細功能**:
- **人員工作負荷查詢**:
  - 查詢成員負責的所有 WBS 項目
  - 計算成員工時分配和負荷
  - 識別工作分配衝突

- **項目人員配置分析**:
  - 分析 WBS 項目的人員配置狀況
  - 識別未分配負責人的項目
  - 生成人員配置建議

**API 端點**:
- `GET /api/projects/{projectId}/analysis/workload` - 工作負荷分析
- `GET /api/projects/{projectId}/analysis/assignment` - 分配狀況分析

## 3. 非功能性需求

### 3.1 效能需求 (NFR-1)
- 人員查詢回應時間 < 2 秒
- WBS 樹狀結構載入時間 < 3 秒
- 支援大型專案 (1000+ 人員, 5000+ WBS 項目)
- 分頁機制支援大量資料瀏覽

### 3.2 可用性需求 (NFR-2)
- 響應式設計支援行動裝置
- 無障礙設計符合 WCAG 2.1 AA 標準
- 支援多語言 (繁體中文、英文)
- 操作回饋和狀態指示清晰

### 3.3 安全性需求 (NFR-3)
- 基於角色的存取控制 (RBAC)
- 敏感操作需要二次確認
- 所有操作記錄審計日誌
- 資料傳輸使用 HTTPS 加密

### 3.4 相容性需求 (NFR-4)
- 支援主流瀏覽器 (Chrome, Firefox, Safari, Edge)
- 與現有 PCM 系統 API 完全相容
- 支援現有的權限和認證系統
- 資料格式向後相容

## 4. 系統整合需求

### 4.1 與專案範疇系統整合
- 繼承專案選擇和範疇切換功能
- 使用統一的專案權限檢查機制
- 整合專案存取記錄追蹤

### 4.2 與現有 UI 組件整合
- 使用 shadcn/ui 組件庫
- 遵循現有的設計系統和主題
- 統一的載入狀態和錯誤處理

### 4.3 與狀態管理系統整合
- 擴展現有的 Zustand store
- 支援資料持久化和快取
- 與其他模組的狀態同步

## 5. 使用者介面需求

### 5.1 專案人員查詢介面
- 搜索框支援即時搜索和建議
- 篩選面板可摺疊和展開
- 結果列表支援卡片和表格檢視
- 分頁控制和每頁筆數設定

### 5.2 WBS 管理介面
- 樹狀結構的直覺化展示
- 拖拽操作的視覺回饋
- 項目編輯的模態對話框
- 批量操作的選取介面

### 5.3 響應式設計
- 手機版: 單欄布局，觸控優化
- 平板版: 雙欄布局，手勢支援
- 桌面版: 多欄布局，鍵盤快捷鍵

## 6. 資料需求

### 6.1 資料模型設計
- 人員資料與公司人事系統同步
- WBS 結構支援版本管理
- 操作日誌完整記錄變更歷史

### 6.2 資料驗證規則
- 必填欄位檢查和格式驗證
- 業務邏輯規則檢查
- 資料一致性約束檢查

### 6.3 資料備份與恢復
- 支援 WBS 結構的版本回滾
- 誤操作的資料恢復機制
- 定期資料備份和驗證

## 7. 測試需求

### 7.1 功能測試
- 所有功能需求的正向測試
- 邊界條件和異常情況測試
- 整合測試確保模組間協作

### 7.2 效能測試
- 大量資料下的查詢效能測試
- 並發用戶操作的壓力測試
- 記憶體使用和效能監控

### 7.3 安全測試
- 權限控制的滲透測試
- 輸入資料的安全驗證測試
- API 安全性和攻擊防護測試

## 8. 部署與維護需求

### 8.1 部署需求
- 支援段階式部署和功能開關
- 資料庫遷移腳本和回滾計劃
- 生產環境的監控和告警

### 8.2 維護需求
- 系統監控和健康檢查
- 錯誤追蹤和性能分析
- 用戶回饋收集和處理機制