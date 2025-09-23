# Docker本地化資料庫與Oracle遷移需求文件

## 專案概述

將PCM工程關鍵指標平台的資料庫系統從遠端PostgreSQL遷移至本地Docker容器中的Oracle資料庫，實現完全的本地開發環境，並更新所有相關API以支援Oracle資料庫操作。

## 需求

### 需求1：Docker容器化環境建置
**目標：** 作為開發團隊，我希望建立統一的Docker本地開發環境，讓所有開發者能在一致的環境中進行開發和測試。

#### 驗收標準
1. WHEN 開發者執行 `docker-compose up` THEN Docker環境 SHALL 啟動完整的Oracle資料庫容器
2. WHEN Oracle容器啟動完成 THEN 容器 SHALL 監聽預設的1521埠口並接受連線
3. WHEN 容器初次啟動 THEN Oracle資料庫 SHALL 自動建立PCM專案所需的資料庫實例
4. WHEN 開發者停止Docker環境 THEN 系統 SHALL 保留所有資料庫資料於持久化儲存卷中
5. IF Docker容器重新啟動 THEN 系統 SHALL 自動恢復所有現有資料庫狀態
6. WHEN 開發者需要重置環境 THEN Docker環境 SHALL 支援完全清除和重建資料庫的指令

### 需求2：資料庫Schema遷移
**目標：** 作為系統架構師，我希望將所有現有PostgreSQL資料庫結構完整遷移至Oracle，確保資料完整性和功能一致性。

#### 驗收標準
1. WHEN 執行schema遷移腳本 THEN Oracle資料庫 SHALL 建立等效的所有現有資料表結構
2. WHEN 建立資料表 THEN Oracle系統 SHALL 正確轉換PostgreSQL特有的資料型別為Oracle對應型別
3. WHEN 處理JSONB欄位 THEN Oracle系統 SHALL 使用JSON資料型別或CLOB欄位實作等效功能
4. WHEN 建立索引 THEN Oracle資料庫 SHALL 建立所有效能優化索引，包括複合索引和函數索引
5. WHEN 建立觸發器 THEN Oracle系統 SHALL 實作所有業務邏輯觸發器，包括更新時間戳和資料驗證
6. WHEN 建立外鍵約束 THEN Oracle資料庫 SHALL 維持所有資料完整性約束條件
7. WHEN 處理UUID主鍵 THEN Oracle系統 SHALL 使用RAW(16)或VARCHAR2(36)實作UUID等效功能
8. WHEN 執行資料遷移 THEN Oracle系統 SHALL 保留所有現有業務資料且無資料遺失

### 需求3：連線層重構
**目標：** 作為後端開發者，我希望更新資料庫連線層從PostgreSQL適配器遷移至Oracle適配器，確保API功能無中斷。

#### 驗收標準
1. WHEN 應用程式啟動 THEN 連線層 SHALL 使用Oracle專用的oracledb驅動程式建立連線池
2. WHEN 建立資料庫連線 THEN 系統 SHALL 支援Oracle特有的連線參數，包括服務名稱和SID
3. WHEN 執行SQL查詢 THEN 連線層 SHALL 正確處理Oracle特有的SQL語法，包括分頁和日期函數
4. WHEN 處理交易操作 THEN 系統 SHALL 支援Oracle的交易管理機制和隔離等級
5. WHEN 連線池滿載 THEN 系統 SHALL 正確管理Oracle連線的建立、釋放和超時處理
6. IF 資料庫連線失敗 THEN 系統 SHALL 提供清楚的Oracle特定錯誤訊息和重連機制
7. WHEN 執行預處理語句 THEN 系統 SHALL 使用Oracle的bind variables提升查詢效能

### 需求4：API端點更新
**目標：** 作為API開發者，我希望更新所有現有API端點以支援Oracle資料庫操作，確保前端功能完全兼容。

#### 驗收標準
1. WHEN API接收到資料查詢請求 THEN 系統 SHALL 使用Oracle優化的查詢語法執行操作
2. WHEN 執行分頁查詢 THEN API SHALL 使用Oracle的OFFSET FETCH或ROW_NUMBER()實作分頁功能
3. WHEN 處理JSON資料 THEN API SHALL 使用Oracle的JSON_VALUE和JSON_QUERY處理metadata欄位
4. WHEN 執行全文搜尋 THEN API SHALL 使用Oracle Text索引或REGEXP_LIKE提供搜尋功能
5. WHEN 處理日期時間操作 THEN API SHALL 正確轉換Oracle的DATE和TIMESTAMP格式
6. WHEN API返回錯誤 THEN 系統 SHALL 提供Oracle特定的錯誤碼對應說明
7. WHEN 執行大量資料操作 THEN API SHALL 使用Oracle的批次處理和BULK COLLECT最佳化效能
8. WHEN 處理序列號 THEN API SHALL 使用Oracle SEQUENCE替代PostgreSQL的SERIAL型別

### 需求5：環境配置管理
**目標：** 作為DevOps工程師，我希望建立完整的環境配置管理，支援本地開發、測試和生產環境的一致性。

#### 驗收標準
1. WHEN 設定本地開發環境 THEN 系統 SHALL 使用Docker環境變數配置Oracle連線參數
2. WHEN 切換環境 THEN 系統 SHALL 支援透過環境變數無縫切換不同Oracle實例
3. WHEN 配置資料庫認證 THEN 系統 SHALL 支援安全的密碼管理和Oracle Wallet整合
4. WHEN 監控資料庫效能 THEN 系統 SHALL 提供Oracle特有的AWR和統計資料監控
5. IF 環境配置錯誤 THEN 系統 SHALL 在啟動時提供清楚的配置錯誤提示和解決方案
6. WHEN 設定字元編碼 THEN 系統 SHALL 正確配置Oracle的NLS_LANG和字元集設定

### 需求6：資料一致性驗證
**目標：** 作為品質保證工程師，我希望驗證遷移後的Oracle資料庫與原PostgreSQL資料庫在功能和資料上完全一致。

#### 驗收標準
1. WHEN 執行資料比對測試 THEN 驗證工具 SHALL 確認Oracle中的資料與PostgreSQL源資料100%一致
2. WHEN 執行功能測試 THEN 所有現有API端點 SHALL 在Oracle環境下提供相同的回應結果
3. WHEN 執行效能測試 THEN Oracle環境 SHALL 達到或超越原PostgreSQL環境的查詢效能
4. WHEN 執行並發測試 THEN Oracle系統 SHALL 正確處理多使用者同時存取情境
5. WHEN 執行備份還原測試 THEN Oracle系統 SHALL 支援完整的資料備份和還原機制
6. WHEN 執行資料完整性檢查 THEN 系統 SHALL 驗證所有外鍵約束和資料關聯正確性
7. WHEN 執行邊界值測試 THEN Oracle系統 SHALL 正確處理極大資料量和特殊字元

### 需求7：開發工具整合
**目標：** 作為開發團隊，我希望整合必要的開發工具，提升Oracle資料庫的開發和維護效率。

#### 驗收標準
1. WHEN 開發者需要查看資料庫 THEN Docker環境 SHALL 包含Oracle SQL Developer Web或等效的管理工具
2. WHEN 執行資料庫遷移 THEN 系統 SHALL 提供自動化的遷移腳本和回滾機制
3. WHEN 開發者修改Schema THEN 系統 SHALL 支援版本控制的資料庫變更管理
4. WHEN 進行測試 THEN 系統 SHALL 提供測試資料的自動載入和清理機制
5. WHEN 監控系統狀態 THEN Docker環境 SHALL 整合logging和健康檢查機制
6. WHEN 進行資料庫調優 THEN 系統 SHALL 提供Oracle特有的執行計畫分析工具
7. WHEN 開發者需要除錯 THEN 系統 SHALL 支援SQL trace和詳細的錯誤日誌記錄

### 需求8：向後相容性與移轉策略
**目標：** 作為專案經理，我希望確保遷移過程平順，並維持系統的可用性和穩定性。

#### 驗收標準
1. WHEN 執行系統遷移 THEN 遷移策略 SHALL 支援階段性切換，允許回滾至PostgreSQL
2. WHEN 進行資料同步 THEN 系統 SHALL 支援PostgreSQL和Oracle之間的資料同步機制
3. WHEN 測試新環境 THEN 系統 SHALL 允許並行運行兩套資料庫進行比較測試
4. WHEN 發現遷移問題 THEN 系統 SHALL 提供快速回滾和問題診斷機制
5. WHEN 培訓開發團隊 THEN 文件 SHALL 包含PostgreSQL到Oracle的差異對照和最佳實踐
6. WHEN 維護系統 THEN Oracle環境 SHALL 提供與PostgreSQL等效的維護工具和程序

## 技術限制條件

1. **Oracle版本：** 使用Oracle Database 19c或21c Express Edition (適合開發環境)
2. **Docker版本：** 支援Docker 20.x以上版本和docker-compose 2.x
3. **資料遷移：** 必須支援現有6個SQL檔案的完整遷移
4. **效能要求：** API回應時間不得超過原PostgreSQL環境的150%
5. **資料完整性：** 零資料遺失，100%功能對等性
6. **相容性：** 支援Node.js 18+和現有的TypeScript程式碼結構

## 成功標準

1. 本地Docker環境能完全替代現有遠端PostgreSQL環境
2. 所有現有API功能在Oracle環境下正常運作
3. 資料庫查詢效能符合或超越原系統標準
4. 開發團隊能在統一的本地環境中進行協作開發
5. 系統具備完整的備份、還原和災難恢復機制
6. 遷移過程文件化，可重複執行和維護