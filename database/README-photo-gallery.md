# 照片庫資料庫架構說明

## 概述
此文檔記錄照片庫功能的資料庫架構實作，遵循TDD (測試驅動開發) 方法論完成。

## 實作任務
- **任務編號**: 1-1
- **任務名稱**: 建立資料庫架構與表格
- **實作方法**: TDD (紅燈 → 綠燈 → 重構)

## 架構組成

### 1. 核心資料表

#### photo_albums (相簿表)
```sql
CREATE TABLE photo_albums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id VARCHAR(20) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_photo_id UUID,  -- 封面照片 (延遲外鍵)
  photo_count INTEGER DEFAULT 0 CHECK (photo_count >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,  -- 軟刪除
  created_by UUID REFERENCES users(id)
);
```

**設計特點:**
- 每個專案可以有多個相簿
- 支援軟刪除機制
- 自動維護照片數量
- 封面照片功能

#### photos (照片表)
```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  album_id UUID NOT NULL REFERENCES photo_albums(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,  -- 原始檔案路徑
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  mime_type VARCHAR(100) NOT NULL,
  width INTEGER CHECK (width > 0),
  height INTEGER CHECK (height > 0),
  thumbnail_path TEXT,  -- 縮圖路徑
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  upload_status upload_status DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,  -- EXIF、GPS等
  deleted_at TIMESTAMP WITH TIME ZONE
);
```

**設計特點:**
- 儲存完整的檔案資訊和metadata
- 支援EXIF資料和GPS位置 (JSONB格式)
- 上傳狀態追蹤
- 軟刪除支援

#### photo_versions (照片版本表)
```sql
CREATE TABLE photo_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  version_type photo_version_type NOT NULL,  -- enum
  file_path TEXT NOT NULL,
  width INTEGER CHECK (width > 0),
  height INTEGER CHECK (height > 0),
  file_size BIGINT CHECK (file_size > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uk_photo_version UNIQUE (photo_id, version_type)
);
```

**設計特點:**
- 支援多解析度版本 (thumbnail, small, medium, large, original)
- 每個照片每種版本類型唯一
- 自動級聯刪除

### 2. 枚舉類型

#### photo_version_type
```sql
CREATE TYPE photo_version_type AS ENUM (
  'thumbnail',    -- 縮圖 150x150
  'small',        -- 小圖 400x300
  'medium',       -- 中圖 800x600
  'large',        -- 大圖 1200x900
  'original'      -- 原圖
);
```

#### upload_status
```sql
CREATE TYPE upload_status AS ENUM (
  'pending',      -- 待處理
  'processing',   -- 處理中
  'completed',    -- 完成
  'failed'        -- 失敗
);
```

### 3. 效能優化索引

#### 基本索引
- **相簿表**: `project_id` (部分索引，排除軟刪除)
- **照片表**: `album_id`, `uploaded_at`, `uploaded_by`
- **版本表**: `photo_id`, `version_type`

#### 特殊索引
- **JSONB索引**: `photos.metadata` 使用 GIN 索引
- **軟刪除索引**: `deleted_at IS NULL` 部分索引

```sql
-- 範例索引建立
CREATE INDEX idx_albums_project_id ON photo_albums(project_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_photos_metadata_gin ON photos
  USING GIN (metadata);
```

### 4. 自動化功能

#### 觸發器
- **updated_at自動更新**: 相簿表修改時自動更新時間戳
- **照片數量維護**: 照片新增/刪除時自動更新相簿照片數量

#### 檢視表
- **active_photo_albums**: 未軟刪除的相簿檢視
- **active_photos**: 未軟刪除的照片檢視
- **photo_statistics**: 照片統計檢視

### 5. 資料完整性

#### 約束條件
- 檔案大小必須大於0
- 圖片尺寸必須大於0或同時為NULL
- 相簿照片數量非負數
- 同專案內相簿名稱唯一 (排除軟刪除)

#### 外鍵關聯
- `photo_albums.project_id` → `projects.id`
- `photo_albums.created_by` → `users.id`
- `photos.album_id` → `photo_albums.id`
- `photos.uploaded_by` → `users.id`
- `photo_versions.photo_id` → `photos.id`

## 安全性考量

### 軟刪除
- 所有核心表格支援軟刪除
- 使用 `deleted_at` 時間戳標記
- 部分索引優化活躍資料查詢

### 權限控制
- 基於專案權限控制相簿存取
- 上傳者記錄追蹤
- 檔案路徑安全性考量

## 測試覆蓋

### TDD測試項目
1. **表格結構測試** - 驗證所有欄位存在且類型正確
2. **約束測試** - 主鍵、外鍵、檢查約束
3. **索引測試** - 效能索引和唯一索引
4. **軟刪除測試** - 軟刪除機制和部分索引
5. **關聯測試** - 表格間外鍵關聯正確性

### 測試檔案
- `tests/photo-gallery-schema.test.js` - Playwright測試
- `scripts/test-photo-gallery-migration.ts` - TypeScript測試腳本

## 部署說明

### 執行順序
1. 確保基本架構已建立 (`01-create-schema.sql`)
2. 執行照片庫架構 (`06-photo-gallery-schema.sql`)
3. 執行測試驗證架構正確性

### 更新現有資料庫
照片庫架構為新增功能，不影響現有表格，可安全部署。

## 效能考量

### 查詢優化
- 相簿查詢按專案過濾
- 照片查詢按相簿過濾
- JSONB metadata支援靈活查詢

### 儲存策略
- 原圖和縮圖分離儲存
- 多解析度版本按需生成
- 檔案路徑相對路徑儲存

## 未來擴展

### 可能的功能擴展
- 照片標籤系統
- 相簿分享權限
- 照片評論功能
- 自動照片分類

### 架構彈性
- JSONB metadata支援靈活擴展
- 版本系統支援新解析度
- 觸發器支援自動化擴展