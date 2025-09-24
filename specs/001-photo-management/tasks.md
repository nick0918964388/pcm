# Tasks: 照片管理系統

**輸入**: `/specs/001-photo-management/` 中的設計文件  
**先決條件**: plan.md, research.md, data-model.md, contracts/  
**技術堆疊**: Python 3.11 + FastAPI + Oracle DB (Docker) + Redis + React 18

## 執行流程

```
1. 載入實作計劃和設計文件 ✅
2. 提取技術堆疊: FastAPI + Oracle + React ✅
3. 分析實體: Photo, Album, Annotation, PhotoAlbum, Thumbnail ✅
4. 分析合約: photos-api.yaml, albums-api.yaml ✅
5. 生成分階段任務 ✅
6. 應用 TDD 原則: 測試先行 ✅
7. 標記並行任務 [P] ✅
```

---

## 格式說明

- **[P]**: 可並行執行 (不同檔案，無相依性)
- **檔案路徑**: 採用 Web 應用結構 (`backend/`, `frontend/`)
- **執行順序**: 嚴格按編號順序，不可跳躍

---

## 第一階段：基礎架構設定 (T001-T010)

### T001 建立專案結構和 Docker 環境

**描述**: 初始化完整的專案結構，包含 Oracle 資料庫容器  
**檔案**: `docker-compose.yml`, `backend/`, `frontend/`  
**驗收**:

- Docker Compose 檔案包含 Oracle XE 容器
- 後端和前端目錄結構建立
- 環境變數範本檔案建立
- README.md 包含啟動指令

### T002 設定 Oracle 資料庫連線

**描述**: 配置 Oracle 資料庫連線和 Python Oracle 驅動  
**檔案**: `backend/requirements.txt`, `backend/src/config.py`  
**依賴**: T001  
**驗收**:

- cx_Oracle 或 oracledb 套件安裝
- 資料庫連線配置完成
- 連線測試通過

### T003 [P] 設定後端 FastAPI 專案架構

**描述**: 初始化 FastAPI 應用程式和專案結構  
**檔案**: `backend/src/main.py`, `backend/src/__init__.py`  
**驗收**:

- FastAPI 應用程式啟動成功
- 基本路由和健康檢查端點
- CORS 中介軟體配置
- 請求日誌中介軟體

### T004 [P] 設定前端 React 專案架構

**描述**: 初始化 React TypeScript 專案  
**檔案**: `frontend/package.json`, `frontend/src/`  
**驗收**:

- React 18 + TypeScript 專案建立
- Tailwind CSS 配置完成
- 基本路由結構
- 代理設定連接後端 API

### T005 [P] 配置開發工具和程式碼品質

**描述**: 設定 linting, formatting, 和測試工具  
**檔案**: `backend/.flake8`, `frontend/.eslintrc.js`, `pytest.ini`  
**驗收**:

- Black + flake8 for Python
- ESLint + Prettier for TypeScript
- pytest 配置
- pre-commit hooks

### T006 設定 Redis 和 Celery 非同步任務

**描述**: 配置 Redis 快取和 Celery 工作者服務  
**檔案**: `backend/src/celery_app.py`, `docker-compose.yml`  
**依賴**: T001  
**驗收**:

- Redis 容器正確運行
- Celery 工作者啟動成功
- 基本任務測試通過
- 任務監控介面可存取

### T007 建立檔案儲存系統

**描述**: 配置照片檔案上傳和儲存機制  
**檔案**: `backend/src/storage.py`  
**驗收**:

- 本地檔案系統儲存
- 檔案類型驗證
- 檔案大小限制 (10MB)
- 儲存路徑組織結構

### T008 [P] 設定圖片處理服務

**描述**: 配置 Pillow 圖片處理和縮圖生成  
**檔案**: `backend/src/image_processor.py`  
**驗收**:

- Pillow 套件安裝和配置
- 縮圖生成函數 (thumb, small, medium)
- WebP 格式支援
- 錯誤處理和日誌

### T009 建立資料庫遷移系統

**描述**: 設定 Alembic 資料庫遷移工具  
**檔案**: `backend/alembic/`, `backend/alembic.ini`  
**依賴**: T002  
**驗收**:

- Alembic 配置完成
- 初始遷移腳本建立
- 遷移指令可正常執行

### T010 建立認證和授權系統

**描述**: 實作 JWT 認證中介軟體  
**檔案**: `backend/src/auth.py`  
**驗收**:

- JWT token 生成和驗證
- 受保護路由中介軟體
- 使用者權限檢查
- 認證錯誤處理

---

## 第二階段：合約測試 (TDD) ⚠️ 實作前必須完成

### T011 [P] 照片 API 合約測試 - 上傳

**描述**: 測試 POST /api/v1/photos 端點合約  
**檔案**: `backend/tests/contract/test_photos_upload.py`  
**驗收**:

- 測試多檔案上傳請求格式
- 驗證回應 schema 結構
- 錯誤情況測試 (檔案過大、格式不支援)
- **測試必須失敗** (無實作)

### T012 [P] 照片 API 合約測試 - 查詢

**描述**: 測試 GET /api/v1/photos 和詳細檢視端點  
**檔案**: `backend/tests/contract/test_photos_query.py`  
**驗收**:

- 列表查詢參數驗證
- 分頁回應格式測試
- 照片詳細資訊 schema 測試
- **測試必須失敗** (無實作)

### T013 [P] 照片 API 合約測試 - 搜尋和篩選

**描述**: 測試 GET /api/v1/search/photos 端點  
**檔案**: `backend/tests/contract/test_photos_search.py`  
**驗收**:

- 搜尋參數驗證
- 日期篩選參數測試
- 搜尋結果格式驗證
- **測試必須失敗** (無實作)

### T014 [P] 相簿 API 合約測試 - CRUD

**描述**: 測試相簿建立、讀取、更新、刪除端點  
**檔案**: `backend/tests/contract/test_albums_crud.py`  
**驗收**:

- POST /api/v1/albums 建立測試
- GET /api/v1/albums 列表和詳細測試
- PUT /api/v1/albums/{id} 更新測試
- DELETE /api/v1/albums/{id} 刪除測試
- **測試必須失敗** (無實作)

### T015 [P] 相簿照片管理合約測試

**描述**: 測試相簿照片新增、移除、排序端點  
**檔案**: `backend/tests/contract/test_albums_photos.py`  
**驗收**:

- POST /api/v1/albums/{id}/photos 新增測試
- DELETE /api/v1/albums/{id}/photos 移除測試
- PUT /api/v1/albums/{id}/reorder 排序測試
- **測試必須失敗** (無實作)

### T016 [P] 批次操作合約測試

**描述**: 測試 POST /api/v1/photos/batch 端點  
**檔案**: `backend/tests/contract/test_photos_batch.py`  
**驗收**:

- 批次刪除操作測試
- 批次新增到相簿測試
- 批次下載測試
- **測試必須失敗** (無實作)

---

## 第三階段：資料模型實作 (T017-T025)

### T017 [P] Photo 模型實作

**描述**: 實作照片資料模型和 Oracle 表格  
**檔案**: `backend/src/models/photo.py`  
**依賴**: T011-T016 (測試已失敗)  
**驗收**:

- SQLAlchemy 模型定義
- Oracle 特定資料類型使用
- 欄位驗證規則實作
- 關聯關係定義

### T018 [P] Album 模型實作

**描述**: 實作相簿資料模型  
**檔案**: `backend/src/models/album.py`  
**驗收**:

- 相簿基本資訊模型
- 隱私等級枚舉
- 照片數量計算欄位
- 外鍵關聯定義

### T019 [P] Annotation 模型實作

**描述**: 實作照片標註資料模型  
**檔案**: `backend/src/models/annotation.py`  
**驗收**:

- 標註位置座標儲存
- 標註類型枚舉
- 照片關聯外鍵
- 位置座標驗證

### T020 [P] PhotoAlbum 關聯模型實作

**描述**: 實作照片與相簿多對多關聯  
**檔案**: `backend/src/models/photo_album.py`  
**驗收**:

- 多對多關聯表
- 排序欄位實作
- 唯一約束設定
- 級聯刪除規則

### T021 [P] Thumbnail 縮圖模型實作

**描述**: 實作縮圖記錄資料模型  
**檔案**: `backend/src/models/thumbnail.py`  
**驗收**:

- 縮圖尺寸類型枚舉
- 檔案路徑儲存
- 生成時間記錄
- 原照片關聯

### T022 建立資料庫遷移腳本

**描述**: 建立所有資料表的 Alembic 遷移  
**檔案**: `backend/alembic/versions/001_initial_schema.py`  
**依賴**: T017-T021  
**驗收**:

- 所有表格建立 SQL
- 索引建立腳本
- 外鍵約束設定
- Oracle 特定語法使用

### T023 建立全文搜尋索引

**描述**: 設定 Oracle Text 全文搜尋索引  
**檔案**: `backend/alembic/versions/002_fulltext_search.py`  
**依賴**: T022  
**驗收**:

- Oracle Text 索引建立
- 搜尋向量更新觸發器
- 索引維護程序
- 搜尋效能測試

### T024 [P] 資料存取層 (Repository)

**描述**: 實作各模型的資料存取層  
**檔案**: `backend/src/repositories/`  
**依賴**: T017-T021  
**驗收**:

- PhotoRepository CRUD 方法
- AlbumRepository 操作方法
- 搜尋和篩選方法
- 分頁查詢支援

### T025 整合測試 - 資料模型

**描述**: 測試資料模型整合和關聯  
**檔案**: `backend/tests/integration/test_models.py`  
**依賴**: T017-T024  
**驗收**:

- 模型建立和查詢測試
- 關聯關係測試
- 級聯操作測試
- 資料庫約束測試

---

## 第四階段：服務層實作 (T026-T035)

### T026 [P] PhotoService 照片服務

**描述**: 實作照片業務邏輯服務  
**檔案**: `backend/src/services/photo_service.py`  
**依賴**: T024  
**驗收**:

- 照片上傳處理邏輯
- 元資料提取和儲存
- 檔案驗證和安全檢查
- 錯誤處理和回滾

### T027 [P] AlbumService 相簿服務

**描述**: 實作相簿管理業務邏輯  
**檔案**: `backend/src/services/album_service.py`  
**驗收**:

- 相簿 CRUD 操作
- 照片新增移除邏輯
- 權限檢查機制
- 相簿統計計算

### T028 [P] SearchService 搜尋服務

**描述**: 實作照片搜尋和篩選服務  
**檔案**: `backend/src/services/search_service.py`  
**驗收**:

- 全文搜尋實作
- 複合篩選條件處理
- 日期範圍篩選
- 搜尋結果排序

### T029 [P] ThumbnailService 縮圖服務

**描述**: 實作縮圖生成和管理服務  
**檔案**: `backend/src/services/thumbnail_service.py`  
**驗收**:

- 非同步縮圖生成
- 多尺寸縮圖建立
- WebP 格式優化
- 縮圖檔案清理

### T030 [P] AnnotationService 標註服務

**描述**: 實作照片標註管理服務  
**檔案**: `backend/src/services/annotation_service.py`  
**驗收**:

- 標註新增編輯刪除
- 位置座標驗證
- 標註類型處理
- 權限控制檢查

### T031 [P] FileUploadService 檔案上傳服務

**描述**: 實作檔案上傳和儲存管理  
**檔案**: `backend/src/services/upload_service.py`  
**驗收**:

- 多檔案上傳處理
- 檔案類型驗證
- 病毒掃描整合
- 儲存空間管理

### T032 BatchOperationService 批次操作服務

**描述**: 實作照片批次操作服務  
**檔案**: `backend/src/services/batch_service.py`  
**依賴**: T026, T027  
**驗收**:

- 批次刪除功能
- 批次移動到相簿
- 批次下載打包
- 操作進度追蹤

### T033 [P] CacheService 快取服務

**描述**: 實作 Redis 快取管理服務  
**檔案**: `backend/src/services/cache_service.py`  
**驗收**:

- 照片元資料快取
- 搜尋結果快取
- 快取失效策略
- 快取統計監控

### T034 [P] NotificationService 通知服務

**描述**: 實作系統通知和事件處理  
**檔案**: `backend/src/services/notification_service.py`  
**驗收**:

- 上傳完成通知
- 錯誤通知機制
- WebSocket 即時通知
- 通知歷史記錄

### T035 整合測試 - 服務層

**描述**: 測試所有服務層整合  
**檔案**: `backend/tests/integration/test_services.py`  
**依賴**: T026-T034  
**驗收**:

- 服務間協作測試
- 事務處理測試
- 錯誤處理測試
- 效能基準測試

---

## 第五階段：API 端點實作 (T036-T045)

### T036 照片上傳 API 實作

**描述**: 實作 POST /api/v1/photos 端點  
**檔案**: `backend/src/api/photos.py`  
**依賴**: T026, T031  
**驗收**:

- 多檔案上傳處理
- 非同步縮圖生成觸發
- 回應格式符合合約
- **T011 測試變為通過**

### T037 照片查詢 API 實作

**描述**: 實作照片列表和詳細檢視 API  
**檔案**: `backend/src/api/photos.py` (擴展)  
**依賴**: T036  
**驗收**:

- GET /api/v1/photos 分頁列表
- GET /api/v1/photos/{id} 詳細資訊
- 排序和篩選參數
- **T012 測試變為通過**

### T038 照片搜尋 API 實作

**描述**: 實作 GET /api/v1/search/photos 端點  
**檔案**: `backend/src/api/search.py`  
**依賴**: T028  
**驗收**:

- 全文搜尋功能
- 複合篩選條件
- 日期範圍篩選
- **T013 測試變為通過**

### T039 相簿管理 API 實作

**描述**: 實作相簿 CRUD API 端點  
**檔案**: `backend/src/api/albums.py`  
**依賴**: T027  
**驗收**:

- 相簿建立、讀取、更新、刪除
- 權限檢查整合
- 相簿統計資訊
- **T014 測試變為通過**

### T040 相簿照片管理 API 實作

**描述**: 實作相簿照片操作 API  
**檔案**: `backend/src/api/albums.py` (擴展)  
**依賴**: T039  
**驗收**:

- 照片新增到相簿
- 照片從相簿移除
- 相簿內照片排序
- **T015 測試變為通過**

### T041 批次操作 API 實作

**描述**: 實作 POST /api/v1/photos/batch 端點  
**檔案**: `backend/src/api/batch.py`  
**依賴**: T032  
**驗收**:

- 批次刪除、移動、下載
- 操作進度回報
- 錯誤處理和回滾
- **T016 測試變為通過**

### T042 [P] 照片下載 API 實作

**描述**: 實作照片檔案下載端點  
**檔案**: `backend/src/api/download.py`  
**驗收**:

- 原始檔案下載
- 縮圖檔案下載
- 檔案串流處理
- 下載權限檢查

### T043 [P] 標註管理 API 實作

**描述**: 實作照片標註 CRUD API  
**檔案**: `backend/src/api/annotations.py`  
**依賴**: T030  
**驗收**:

- 標註新增編輯刪除
- 位置座標驗證
- 標註權限控制
- 標註歷史記錄

### T044 [P] 系統狀態和健康檢查 API

**描述**: 實作系統監控和狀態 API  
**檔案**: `backend/src/api/health.py`  
**驗收**:

- 資料庫連線狀態
- Redis 連線狀態
- 檔案系統狀態
- 系統資源使用情況

### T045 整合測試 - API 層

**描述**: 完整 API 端點整合測試  
**檔案**: `backend/tests/integration/test_api.py`  
**依賴**: T036-T044  
**驗收**:

- 端到端 API 流程測試
- 認證授權測試
- 錯誤處理測試
- API 效能測試

---

## 第六階段：前端元件開發 (T046-T055)

### T046 [P] 照片上傳元件

**描述**: React 照片上傳介面元件  
**檔案**: `frontend/src/components/PhotoUpload.tsx`  
**驗收**:

- 拖放上傳介面
- 多檔案選擇支援
- 上傳進度顯示
- 預覽和移除功能

### T047 [P] 照片網格元件

**描述**: 照片縮圖網格顯示元件  
**檔案**: `frontend/src/components/PhotoGrid.tsx`  
**驗收**:

- 響應式網格佈局
- 虛擬化長列表
- 懶載入圖片
- 選取和批次操作

### T048 [P] 照片預覽元件

**描述**: 照片詳細檢視和預覽元件  
**檔案**: `frontend/src/components/PhotoViewer.tsx`  
**驗收**:

- 全螢幕預覽模式
- 縮放和平移功能
- 標註顯示和編輯
- 元資料面板

### T049 [P] 搜尋和篩選元件

**描述**: 照片搜尋和篩選介面  
**檔案**: `frontend/src/components/SearchFilter.tsx`  
**驗收**:

- 搜尋輸入框
- 日期範圍選擇器
- 篩選條件面板
- 搜尋結果統計

### T050 [P] 相簿管理元件

**描述**: 相簿建立和管理介面  
**檔案**: `frontend/src/components/AlbumManager.tsx`  
**驗收**:

- 相簿建立表單
- 相簿列表顯示
- 照片拖放到相簿
- 相簿權限設定

### T051 [P] 標註編輯元件

**描述**: 照片標註新增和編輯介面  
**檔案**: `frontend/src/components/AnnotationEditor.tsx`  
**驗收**:

- 點擊新增標註
- 標註位置拖拽
- 標註內容編輯
- 標註類型選擇

### T052 照片管理頁面整合

**描述**: 整合所有元件到主要頁面  
**檔案**: `frontend/src/pages/PhotoManagement.tsx`  
**依賴**: T046-T051  
**驗收**:

- 頁面路由配置
- 元件間狀態管理
- API 呼叫整合
- 錯誤邊界處理

### T053 [P] 響應式設計和行動裝置支援

**描述**: 確保行動裝置使用體驗  
**檔案**: `frontend/src/styles/responsive.css`  
**驗收**:

- 行動裝置佈局適配
- 觸控手勢支援
- 行動裝置效能優化
- 離線功能支援

### T054 [P] 無障礙功能實作

**描述**: 實作網頁無障礙標準  
**檔案**: `frontend/src/utils/accessibility.ts`  
**驗收**:

- ARIA 標籤完整
- 鍵盤導航支援
- 螢幕閱讀器相容
- 色彩對比檢查

### T055 前端整合測試

**描述**: 前端元件和頁面整合測試  
**檔案**: `frontend/src/tests/integration/`  
**依賴**: T046-T054  
**驗收**:

- 元件互動測試
- API 整合測試
- 使用者流程測試
- 跨瀏覽器測試

---

## 第七階段：系統整合和最佳化 (T056-T065)

### T056 建立 Docker 部署配置

**描述**: 完整的 Docker 容器化部署  
**檔案**: `docker-compose.prod.yml`, `Dockerfile`  
**驗收**:

- 多階段建置 Dockerfile
- 生產環境 compose 檔案
- 健康檢查配置
- 日誌管理設定

### T057 [P] 效能監控和指標收集

**描述**: 實作系統效能監控  
**檔案**: `backend/src/monitoring.py`  
**驗收**:

- API 回應時間監控
- 資料庫查詢效能追蹤
- 記憶體和 CPU 使用監控
- 自訂業務指標

### T058 [P] 安全性強化

**描述**: 強化系統安全性措施  
**檔案**: `backend/src/security.py`  
**驗收**:

- SQL 注入防護
- XSS 攻擊防護
- 檔案上傳安全檢查
- 速率限制實作

### T059 [P] 快取策略最佳化

**描述**: 實作多層快取策略  
**檔案**: `backend/src/cache_strategy.py`  
**驗收**:

- Redis 快取層
- 應用程式記憶體快取
- CDN 整合準備
- 快取失效策略

### T060 [P] 資料庫效能調優

**描述**: Oracle 資料庫效能最佳化  
**檔案**: `backend/db_optimization/`  
**驗收**:

- 查詢執行計劃分析
- 索引策略優化
- 連線池設定調整
- 慢查詢監控

### T061 備份和災難恢復

**描述**: 實作資料備份和恢復機制  
**檔案**: `scripts/backup.sh`, `scripts/restore.sh`  
**驗收**:

- 自動資料庫備份
- 檔案系統備份
- 備份驗證機制
- 災難恢復測試

### T062 [P] 國際化支援

**描述**: 實作多語言支援  
**檔案**: `frontend/src/i18n/`, `backend/src/i18n/`  
**驗收**:

- React i18n 設定
- 動態語言切換
- 日期時間本地化
- 錯誤訊息翻譯

### T063 [P] API 文件生成

**描述**: 自動生成 API 文件  
**檔案**: `docs/api/`, `backend/src/docs.py`  
**驗收**:

- OpenAPI 3.0 規格
- Swagger UI 介面
- 程式碼範例生成
- 文件版本管理

### T064 [P] 日誌和審計系統

**描述**: 完整的日誌和審計追蹤  
**檔案**: `backend/src/audit.py`  
**驗收**:

- 結構化日誌記錄
- 使用者操作審計
- 錯誤追蹤和告警
- 日誌分析儀表板

### T065 系統整合測試

**描述**: 完整系統端到端測試  
**檔案**: `tests/e2e/`  
**依賴**: T056-T064  
**驗收**:

- 完整使用者流程測試
- 負載測試和壓力測試
- 安全性滲透測試
- 容錯和恢復測試

---

## 第八階段：測試品質保證 (T066-T070)

### T066 單元測試覆蓋率提升

**描述**: 確保程式碼測試覆蓋率達到 90%+  
**檔案**: `backend/tests/unit/`, `frontend/src/tests/unit/`  
**驗收**:

- 後端覆蓋率 ≥ 90%
- 前端覆蓋率 ≥ 85%
- 關鍵路徑 100% 覆蓋
- 測試報告生成

### T067 [P] 負載和壓力測試

**描述**: 系統效能和擴展性測試  
**檔案**: `tests/performance/`  
**驗收**:

- 100 並發使用者測試
- API 回應時間 < 500ms
- 檔案上傳效能測試
- 記憶體洩漏檢查

### T068 [P] 安全性測試

**描述**: 全面安全性漏洞掃描  
**檔案**: `tests/security/`  
**驗收**:

- OWASP Top 10 漏洞測試
- 檔案上傳安全測試
- 認證授權測試
- 資料隱私保護測試

### T069 [P] 可用性測試

**描述**: 使用者體驗和可用性測試  
**檔案**: `tests/usability/`  
**驗收**:

- 使用者介面易用性測試
- 無障礙功能測試
- 行動裝置相容性測試
- 瀏覽器相容性測試

### T070 最終驗收測試

**描述**: 基於快速開始指南的完整驗收  
**檔案**: 執行 `specs/001-photo-management/quickstart.md`  
**依賴**: T066-T069  
**驗收**:

- 所有驗收場景通過
- 效能指標達標
- 安全要求滿足
- 使用者體驗良好

---

## 相依性圖表

```
T001 → T002,T006,T009
T002 → T022,T023
T003,T004,T005 [並行]
T006 → T029,T034
T007,T008 [並行]
T010 → T036-T045

T011-T016 [並行] → T017-T021 [並行]
T017-T021 → T022 → T023 → T024 → T025

T024 → T026-T035 [部分並行]
T026,T027,T028,T029,T030,T031 [並行]
T032 依賴 T026,T027
T033,T034 [並行]
T035 依賴 T026-T034

T026,T031 → T036
T036 → T037
T028 → T038
T027 → T039 → T040
T032 → T041
T030 → T043
T042,T044 [並行]
T036-T044 → T045

T046-T051 [並行]
T046-T051 → T052
T053,T054 [並行]
T046-T054 → T055

T056-T064 [部分並行]
T056-T064 → T065

T066-T069 [並行]
T066-T069 → T070
```

## 並行執行範例

### 階段 1: 專案設定

```bash
# 同時執行 T003, T004, T005
Task: "設定後端 FastAPI 專案架構"
Task: "設定前端 React 專案架構"
Task: "配置開發工具和程式碼品質"
```

### 階段 2: 合約測試

```bash
# 同時執行 T011-T016
Task: "照片 API 合約測試 - 上傳"
Task: "照片 API 合約測試 - 查詢"
Task: "照片 API 合約測試 - 搜尋和篩選"
Task: "相簿 API 合約測試 - CRUD"
Task: "相簿照片管理合約測試"
Task: "批次操作合約測試"
```

## 預估時間和資源

**總任務數**: 70 個任務  
**預估時間**: 280-350 小時 (7-9 週)  
**建議團隊**:

- 後端開發 1 名 (Python/Oracle)
- 前端開發 1 名 (React/TypeScript)
- 測試工程師 1 名
- DevOps 工程師 0.5 名 (兼職)

## 關鍵成功因素

1. **嚴格遵循 TDD**: 所有測試必須先於實作
2. **不跳躍任務**: 按編號順序執行，確保相依性
3. **Oracle 專業知識**: 需要 Oracle 資料庫最佳化經驗
4. **持續整合**: 每個任務完成後立即整合測試
5. **程式碼品質**: 維持測試覆蓋率和程式碼標準

---

**任務清單已準備就緒，可立即開始執行 T001** 🚀
