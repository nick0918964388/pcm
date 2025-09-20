# 照片管理系統快速開始指南

**版本**: 1.0.0  
**日期**: 2025-09-11  
**適用對象**: 開發人員、測試人員、產品經理

## 概述

本指南提供照片管理系統的快速設定和測試流程，涵蓋核心功能的端到端驗證。遵循此指南可以驗證系統的主要使用者場景是否正常運作。

## 前置需求

### 系統要求
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- 至少 2GB 可用磁碟空間

### 開發工具
- Docker Desktop (推薦用於本地開發)
- Git
- VS Code 或類似 IDE
- 瀏覽器 (Chrome/Firefox/Safari)

## 環境設定

### 1. 取得專案程式碼
```bash
git clone [repository-url]
cd photo-management-system
git checkout 001-photo-management
```

### 2. 設定環境變數
建立 `.env` 檔案：
```env
# 資料庫設定
DATABASE_URL=postgresql://username:password@localhost:5432/photo_db
REDIS_URL=redis://localhost:6379/0

# 檔案儲存設定
UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=10485760
ALLOWED_EXTENSIONS=jpg,jpeg,png,gif,webp

# API 設定
SECRET_KEY=your-secret-key-here
DEBUG=True
CORS_ORIGINS=http://localhost:3000

# 縮圖設定
THUMBNAIL_SIZES=150,400,800
THUMBNAIL_QUALITY=85
```

### 3. 啟動服務 (使用 Docker)
```bash
# 啟動資料庫和 Redis
docker-compose up -d postgres redis

# 等待服務就緒
sleep 10

# 執行資料庫遷移
docker-compose run --rm backend alembic upgrade head

# 啟動完整服務
docker-compose up -d
```

### 4. 驗證服務啟動
```bash
# 檢查後端 API
curl http://localhost:8000/health

# 檢查前端
curl http://localhost:3000
```

## 核心功能測試

### 測試場景 1: 照片上傳流程

**目標**: 驗證照片上傳、元資料處理和縮圖生成功能

#### 1.1 準備測試資料
```bash
# 建立測試專案
curl -X POST http://localhost:8000/api/v1/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "測試專案",
    "description": "照片管理系統測試專案"
  }'

# 記錄回傳的 project_id
export TEST_PROJECT_ID="[返回的專案ID]"
```

#### 1.2 上傳測試照片
```bash
# 上傳單張照片
curl -X POST http://localhost:8000/api/v1/photos \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@test-images/sample1.jpg" \
  -F "project_id=$TEST_PROJECT_ID" \
  -F "description=測試照片上傳" \
  -F "tags=測試,上傳,第一張"

# 批次上傳多張照片
curl -X POST http://localhost:8000/api/v1/photos \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@test-images/sample2.jpg" \
  -F "files=@test-images/sample3.png" \
  -F "project_id=$TEST_PROJECT_ID" \
  -F "location=台北101"
```

#### 1.3 驗證上傳結果
- ✅ 檢查 HTTP 回應碼為 201
- ✅ 確認回傳的照片 ID 和元資料
- ✅ 驗證縮圖檔案已生成 (thumb, small, medium)
- ✅ 確認搜尋索引已更新

### 測試場景 2: 照片檢視和預覽

**目標**: 驗證照片列表、詳細檢視和不同尺寸的圖片顯示

#### 2.1 取得照片列表
```bash
# 取得專案的照片列表
curl -X GET "http://localhost:8000/api/v1/photos?project_id=$TEST_PROJECT_ID&per_page=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 驗證分頁功能
curl -X GET "http://localhost:8000/api/v1/photos?project_id=$TEST_PROJECT_ID&page=1&per_page=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 2.2 檢視照片詳細資訊
```bash
# 取得特定照片詳細資訊
export PHOTO_ID="[從列表取得的照片ID]"
curl -X GET "http://localhost:8000/api/v1/photos/$PHOTO_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 2.3 下載不同尺寸的照片
```bash
# 下載原始尺寸
curl -X GET "http://localhost:8000/api/v1/photos/$PHOTO_ID/download?size=original" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o "test-download-original.jpg"

# 下載縮圖
curl -X GET "http://localhost:8000/api/v1/photos/$PHOTO_ID/download?size=thumb" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o "test-download-thumb.jpg"
```

#### 2.4 前端介面測試
開啟瀏覽器訪問 `http://localhost:3000`：
- ✅ 檢查照片網格檢視載入正常
- ✅ 點擊照片能開啟預覽模式
- ✅ 預覽模式顯示完整資訊和標註
- ✅ 縮圖和懶載入功能正常運作

### 測試場景 3: 搜尋和篩選功能

**目標**: 驗證全文搜尋、日期篩選和複合查詢功能

#### 3.1 關鍵字搜尋
```bash
# 搜尋描述和標籤
curl -X GET "http://localhost:8000/api/v1/search/photos?q=測試" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 搜尋位置資訊
curl -X GET "http://localhost:8000/api/v1/search/photos?q=台北" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3.2 日期篩選
```bash
# 快速日期篩選
curl -X GET "http://localhost:8000/api/v1/photos?project_id=$TEST_PROJECT_ID&quick_filter=today" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 自訂日期範圍
curl -X GET "http://localhost:8000/api/v1/photos?project_id=$TEST_PROJECT_ID&date_from=2025-09-01&date_to=2025-09-30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3.3 複合搜尋
```bash
# 結合關鍵字和日期篩選
curl -X GET "http://localhost:8000/api/v1/search/photos?q=測試&project_id=$TEST_PROJECT_ID&date_from=2025-09-01" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 測試場景 4: 相簿管理功能

**目標**: 驗證相簿建立、照片組織和管理功能

#### 4.1 建立相簿
```bash
# 建立新相簿
curl -X POST http://localhost:8000/api/v1/albums \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "測試相簿",
    "description": "用於測試的照片相簿",
    "project_id": "'$TEST_PROJECT_ID'",
    "privacy_level": "project"
  }'

export ALBUM_ID="[返回的相簿ID]"
```

#### 4.2 管理相簿照片
```bash
# 新增照片到相簿
curl -X POST "http://localhost:8000/api/v1/albums/$ALBUM_ID/photos" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "photo_ids": ["'$PHOTO_ID'"],
    "sort_position": "end"
  }'

# 取得相簿詳細資訊
curl -X GET "http://localhost:8000/api/v1/albums/$ALBUM_ID?include_photos=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 測試場景 5: 批次操作功能

**目標**: 驗證多張照片的批次處理功能

#### 5.1 批次新增到相簿
```bash
# 取得多張照片 ID
export PHOTO_IDS='["photo_id_1", "photo_id_2", "photo_id_3"]'

# 批次新增到相簿
curl -X POST http://localhost:8000/api/v1/photos/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "photo_ids": '$PHOTO_IDS',
    "action": "add_to_album",
    "album_id": "'$ALBUM_ID'"
  }'
```

#### 5.2 批次刪除
```bash
# 批次刪除照片
curl -X POST http://localhost:8000/api/v1/photos/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "photo_ids": '$PHOTO_IDS',
    "action": "delete"
  }'
```

## 效能測試

### 負載測試
```bash
# 使用 Apache Bench 測試 API 效能
ab -n 1000 -c 10 -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/v1/photos?project_id=$TEST_PROJECT_ID"

# 期望結果:
# - 回應時間 < 500ms (95th percentile)
# - 錯誤率 < 1%
# - 能處理 100 併發請求
```

### 檔案上傳測試
```bash
# 測試大檔案上傳 (接近 10MB 限制)
curl -X POST http://localhost:8000/api/v1/photos \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@test-images/large-image-9mb.jpg" \
  -F "project_id=$TEST_PROJECT_ID" \
  -w "上傳時間: %{time_total}s\n"

# 期望結果:
# - 上傳時間 < 30s
# - 縮圖生成 < 10s
# - 記憶體使用穩定
```

## 驗收標準

### 功能性需求
- [ ] 所有 API 端點回應正確的狀態碼和資料格式
- [ ] 照片上傳支援指定的檔案格式和大小限制
- [ ] 縮圖自動生成且品質符合要求
- [ ] 搜尋功能回應時間 < 500ms
- [ ] 前端介面在不同螢幕尺寸下正常顯示
- [ ] 分頁功能正確載入和導航

### 效能需求
- [ ] API 回應時間 < 200ms (不含檔案傳輸)
- [ ] 支援 100 併發使用者
- [ ] 圖片載入時間 < 2s
- [ ] 記憶體使用 < 1GB (單一實例)

### 安全性需求
- [ ] 檔案類型驗證防止惡意檔案上傳
- [ ] JWT 認證正確保護 API 端點
- [ ] 使用者只能存取有權限的照片和相簿
- [ ] 檔案上傳路徑不可被遍歷

### 可用性需求
- [ ] 前端介面響應式設計適配行動裝置
- [ ] 載入狀態和錯誤訊息清楚顯示
- [ ] 支援鍵盤導航和螢幕閱讀器
- [ ] 圖片預覽支援縮放和手勢操作

## 故障排除

### 常見問題

**Q: 照片上傳失敗，提示檔案過大**
A: 檢查 `MAX_FILE_SIZE` 環境變數設定，預設為 10MB

**Q: 縮圖生成失敗**
A: 確認 Pillow 套件正確安裝，檢查 Celery 工作者是否正常運行

**Q: 搜尋功能無結果**
A: 檢查 PostgreSQL 的全文搜尋設定，確認 GIN 索引已建立

**Q: 前端無法載入照片**
A: 檢查 CORS 設定，確認前端和後端的 URL 配置正確

### 除錯資訊
```bash
# 檢查後端日誌
docker-compose logs backend

# 檢查 Celery 工作者狀態
docker-compose logs celery

# 檢查資料庫連線
docker-compose exec postgres psql -U username -d photo_db -c "SELECT COUNT(*) FROM photos;"

# 檢查 Redis 連線
docker-compose exec redis redis-cli ping
```

## 下一步

完成快速開始測試後，您可以：

1. **進入開發階段**: 使用 `/tasks` 指令產生詳細的實作任務
2. **自訂配置**: 根據具體需求調整環境變數和系統設定
3. **擴展功能**: 參考 API 文件實作額外的功能需求
4. **部署準備**: 設定生產環境的容器化部署流程

---

**注意**: 本指南假設您已有基本的 Docker 和 API 測試經驗。如需更詳細的設定指導，請參考專案的完整文件。