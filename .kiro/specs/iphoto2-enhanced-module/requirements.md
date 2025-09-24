# Requirements Document

## Project Description (Input)

我要建立一個照片管理模組。整合到現有的 Next.js 專案中 , 功能選單 : 溝通管理/iphoto2.0 功能需求如下

# 依照每個專案建立各自的相簿,可以對相簿進行新增/修改/刪除/tag等功能

# 使用者可以上傳相簿，對相片進行新增/修改/刪除/tag等功能，相片上有上傳人員/上傳時間/...等相片管理基礎資訊

# 相片實體檔案以 NFS 為儲存核心 , 儲存在\\192.168.1.103\pcm\內，透過nfs方式來存儲 , 以專案\相簿名稱當作資料夾名稱 , 建立相簿時同時也建立資料夾

# 相片存在nfs中以原檔名為存放。

# 前端 (Frontend):以現在的專案基礎為基底，使用 shadcn/ui來增強

# 後端也維持目前的架構，處理照片中繼資料 (Metadata) 的 CRUD (建立、讀取、更新、刪除) 操作。，

# API設計請照上述需求，如果專案中已經有相同的則可以套用，如果沒有就新增

# 因為是加強目前的功能，故先建立新的branch在進行開發

# 請先完成前後端功能，與驗證，安全性效能都先不要進行測試與考慮

# 前後端請實作完成後，包括playwright的無頭驗證工作

## Introduction

iPhoto
2.0 增強模組旨在為現有 PCM 工程關鍵指標平台建立一個全面的照片管理系統。此模組將整合 NFS 網路儲存、shadcn/ui 現代化介面以及完整的 CRUD 操作，提供工程團隊高效的照片和相簿管理功能。

## Requirements

### Requirement 1: 專案相簿管理系統

**Objective:**
身為專案經理，我希望能為每個工程專案建立獨立的相簿系統，以便有效組織和管理專案相關的照片資料

#### Acceptance Criteria

1. WHEN 使用者存取照片管理功能時 THEN 系統 SHALL 顯示該使用者有權限存取的所有專案列表
2. IF 使用者對專案具有管理權限 THEN 系統 SHALL 允許建立新相簿並自動在 NFS 建立對應資料夾
3. WHEN 建立相簿時 THEN 系統 SHALL 使用「專案代碼\相簿名稱」格式在 \\192.168.1.103\pcm\ 建立資料夾結構
4. WHERE 相簿存在時 THE 系統 SHALL 支援相簿名稱修改、描述更新和標籤管理功能
5. WHEN 刪除相簿時 THEN 系統 SHALL 執行軟刪除保留稽核記錄，並提供確認機制
6. IF 相簿包含照片 THEN 系統 SHALL 警告使用者並要求明確確認刪除操作

### Requirement 2: 照片上傳與管理功能

**Objective:** 身為工程師，我希望能夠上傳、管理和組織工程照片，並自動記錄相關的 metadata 資訊

#### Acceptance Criteria

1. WHEN 使用者上傳照片時 THEN 系統 SHALL 支援拖拽上傳和批次選擇上傳功能
2. IF 照片上傳成功 THEN 系統 SHALL 將原檔案儲存至 NFS 對應相簿資料夾並保持原檔名
3. WHEN 照片儲存完成時 THEN 系統 SHALL 自動記錄上傳人員、上傳時間、檔案大小、解析度等基礎資訊
4. WHERE 照片存在時 THE 系統 SHALL 支援照片重新命名、描述編輯和標籤分類功能
5. WHEN 使用者刪除照片時 THEN 系統 SHALL 從 NFS 移除實體檔案並更新資料庫記錄
6. IF 照片處理失敗 THEN 系統 SHALL 提供清楚的錯誤訊息和重試機制

### Requirement 3: NFS 網路儲存整合

**Objective:** 身為系統管理員，我希望照片檔案透過 NFS 集中儲存管理，確保資料的可靠性和存取效率

#### Acceptance Criteria

1. WHEN 系統初始化時 THEN 系統 SHALL 建立與 \\192.168.1.103\pcm\ 的 NFS 連線
2. IF NFS 連線可用 THEN 系統 SHALL 按照「專案代碼\相簿名稱」格式自動建立目錄結構
3. WHEN 上傳照片時 THEN 系統 SHALL 直接儲存原檔案至 NFS 對應目錄並保持原始檔名
4. WHERE 檔案衝突時 THE 系統 SHALL 提供檔案重新命名或覆蓋選項
5. WHEN 存取照片時 THEN 系統 SHALL 透過安全的檔案存取 API 提供照片預覽和下載
6. IF NFS 服務異常 THEN 系統 SHALL 顯示適當錯誤訊息並提供離線操作提示

### Requirement 4: 前端介面增強設計

**Objective:** 身為使用者，我希望有現代化且直觀的照片管理介面，提供流暢的使用體驗

#### Acceptance Criteria

1. WHEN 使用者存取功能選單時 THEN 系統 SHALL 在「溝通管理」下顯示「iphoto2.0」選項
2. IF 使用者進入照片管理頁面 THEN 系統 SHALL 使用 shadcn/ui 元件呈現現代化介面
3. WHEN 瀏覽相簿時 THEN 系統 SHALL 提供網格檢視、列表檢視和大圖預覽模式
4. WHERE 操作相簿或照片時 THE 系統 SHALL 提供即時的載入狀態和操作回饋
5. WHEN 使用行動裝置時 THEN 系統 SHALL 提供響應式設計確保最佳使用體驗
6. IF 執行批次操作 THEN 系統 SHALL 提供進度指示器和操作結果摘要

### Requirement 5: API 層設計與整合

**Objective:** 身為開發人員，我希望有完整的 RESTful API 支援所有照片管理功能，並能與現有系統架構整合

#### Acceptance Criteria

1. WHEN 設計 API 端點時 THEN 系統 SHALL 遵循 RESTful 設計原則和現有 API 慣例
2. IF 現有專案中有相似 API THEN 系統 SHALL 重用現有端點並擴展功能
3. WHEN 處理相簿 CRUD 操作時 THEN 系統 SHALL 提供 /api/albums 相關端點
4. WHERE 處理照片操作時 THE 系統 SHALL 提供 /api/photos 相關端點支援上傳、更新、刪除
5. WHEN API 回應時 THEN 系統 SHALL 使用統一的回應格式包含狀態、資料和錯誤訊息
6. IF API 發生錯誤 THEN 系統 SHALL 提供詳細的錯誤代碼和使用者友善的錯誤訊息

### Requirement 6: 照片 Metadata 管理

**Objective:**
身為資料管理員，我希望系統能完整記錄和管理照片的所有 metadata 資訊，支援搜尋和分析需求

#### Acceptance Criteria

1. WHEN 照片上傳完成時 THEN 系統 SHALL 在資料庫記錄檔案路徑、大小、格式、上傳者和時間戳
2. IF 照片包含 EXIF 資料 THEN 系統 SHALL 提取並儲存拍攝時間、GPS 位置、相機資訊等
3. WHEN 使用者編輯照片資訊時 THEN 系統 SHALL 支援描述、標籤、分類等自訂 metadata 更新
4. WHERE 需要搜尋照片時 THE 系統 SHALL 支援按照日期、標籤、上傳者、檔案類型等條件篩選
5. WHEN 匯出照片資料時 THEN 系統 SHALL 提供包含完整 metadata 的資料匯出功能
6. IF metadata 更新失敗 THEN 系統 SHALL 保持資料一致性並記錄操作日誌

### Requirement 7: 開發分支管理

**Objective:** 身為開發團隊，我希望在獨立分支中開發新功能，確保不影響主要系統的穩定性

#### Acceptance Criteria

1. WHEN 開始開發時 THEN 團隊 SHALL 建立新的 feature branch 進行功能開發
2. IF 功能開發完成 THEN 團隊 SHALL 通過完整測試驗證後才合併至主分支
3. WHEN 進行程式碼審查時 THEN 團隊 SHALL 確保程式碼品質和架構一致性
4. WHERE 發生衝突時 THE 團隊 SHALL 優先解決衝突確保系統整合正常
5. WHEN 部署新功能時 THEN 系統 SHALL 進行漸進式部署降低風險
6. IF 發現問題 THEN 團隊 SHALL 能快速回滾至穩定版本

### Requirement 8: 測試與驗證機制

**Objective:** 身為品質保證人員，我希望有完整的自動化測試確保功能正確性和使用者體驗

#### Acceptance Criteria

1. WHEN 功能開發完成時 THEN 系統 SHALL 包含完整的單元測試覆蓋所有核心功能
2. IF 涉及 API 操作 THEN 系統 SHALL 提供整合測試驗證前後端互動正確性
3. WHEN 前端功能完成時 THEN 系統 SHALL 使用 Playwright 進行端到端無頭測試
4. WHERE 測試涵蓋範圍時 THE 系統 SHALL 包含正常流程、錯誤處理和邊界條件測試
5. WHEN 執行自動化測試時 THEN 系統 SHALL 提供清楚的測試報告和錯誤定位
6. IF 測試失敗 THEN 系統 SHALL 阻止部署並提供修復指引
