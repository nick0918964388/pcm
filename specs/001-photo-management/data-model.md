# 照片管理系統資料模型

**版本**: 1.0.0  
**日期**: 2025-09-11  
**狀態**: 設計階段

## 核心實體

### Photo (照片)

主要實體，代表系統中的單一照片記錄。

```python
class Photo:
    id: UUID                    # 主鍵
    filename: str               # 原始檔名
    file_path: str              # 檔案儲存路徑
    file_size: int              # 檔案大小 (bytes)
    mime_type: str              # MIME 類型
    width: int                  # 圖片寬度
    height: int                 # 圖片高度
    uploaded_at: datetime       # 上傳時間
    custom_date: datetime       # 自訂日期 (可編輯)
    uploader_id: UUID           # 上傳者 ID
    project_id: UUID            # 所屬專案 ID
    location: str               # 拍攝/儲存位置
    description: str            # 照片描述
    tags: List[str]             # 標籤列表
    search_vector: tsvector     # 全文搜尋向量
    created_at: datetime        # 記錄建立時間
    updated_at: datetime        # 記錄更新時間
    is_deleted: bool = False    # 軟刪除標記
```

**驗證規則**:

- filename: 必填，最大 255 字元，不可包含路徑分隔符號
- file_size: 必須 > 0 且 ≤ 10MB (10,485,760 bytes)
- mime_type: 必須為支援的圖片格式 (image/jpeg, image/png, image/gif, image/webp)
- width, height: 必須 > 0
- custom_date: 不可早於 1900-01-01，不可晚於當前時間 +1 年
- location: 最大 255 字元
- description: 最大 1000 字元

### Album (相簿)

照片集合的組織單位，可包含多張相關照片。

```python
class Album:
    id: UUID                    # 主鍵
    name: str                   # 相簿名稱
    description: str            # 相簿描述
    cover_photo_id: UUID        # 封面照片 ID (可空)
    creator_id: UUID            # 建立者 ID
    project_id: UUID            # 所屬專案 ID (可空，跨專案相簿)
    privacy_level: str          # 隱私等級 (public, private, project)
    created_at: datetime        # 建立時間
    updated_at: datetime        # 更新時間
    photo_count: int = 0        # 照片數量 (計算欄位)
    is_deleted: bool = False    # 軟刪除標記
```

**驗證規則**:

- name: 必填，最大 100 字元，同專案內不可重複
- description: 最大 500 字元
- privacy_level: 必須為有效值 (public, private, project)
- photo_count: 由系統維護，只讀

### Annotation (標註)

附加在照片上的文字標註資訊。

```python
class Annotation:
    id: UUID                    # 主鍵
    photo_id: UUID              # 關聯照片 ID
    content: str                # 標註內容
    author_id: UUID             # 標註作者 ID
    position_x: float           # X 座標 (0-1 相對位置)
    position_y: float           # Y 座標 (0-1 相對位置)
    annotation_type: str        # 標註類型 (text, date, location)
    created_at: datetime        # 建立時間
    updated_at: datetime        # 更新時間
    is_deleted: bool = False    # 軟刪除標記
```

**驗證規則**:

- content: 必填，最大 500 字元
- position_x, position_y: 必須在 0.0-1.0 範圍內
- annotation_type: 必須為有效值 (text, date, location)

### PhotoAlbum (照片-相簿關聯)

多對多關聯表，記錄照片與相簿的關係。

```python
class PhotoAlbum:
    id: UUID                    # 主鍵
    photo_id: UUID              # 照片 ID
    album_id: UUID              # 相簿 ID
    added_by: UUID              # 添加者 ID
    added_at: datetime          # 添加時間
    sort_order: int             # 排序順序
```

**驗證規則**:

- (photo_id, album_id): 唯一組合
- sort_order: 必須 ≥ 0

### Thumbnail (縮圖)

照片的縮圖版本記錄。

```python
class Thumbnail:
    id: UUID                    # 主鍵
    photo_id: UUID              # 原始照片 ID
    size_type: str              # 尺寸類型 (thumb, small, medium)
    file_path: str              # 縮圖檔案路徑
    width: int                  # 縮圖寬度
    height: int                 # 縮圖高度
    file_size: int              # 檔案大小
    format: str                 # 檔案格式 (webp, jpeg)
    generated_at: datetime      # 生成時間
```

**驗證規則**:

- size_type: 必須為有效值 (thumb, small, medium)
- (photo_id, size_type): 唯一組合
- format: 必須為支援格式 (webp, jpeg)

## 關聯關係

### 一對多關聯

1. **User → Photo**: 一個使用者可以上傳多張照片
2. **Project → Photo**: 一個專案可以包含多張照片
3. **User → Album**: 一個使用者可以建立多個相簿
4. **Photo → Annotation**: 一張照片可以有多個標註
5. **Photo → Thumbnail**: 一張照片可以有多個縮圖

### 多對多關聯

1. **Photo ↔ Album**: 照片可以屬於多個相簿，相簿可以包含多張照片

### 外鍵約束

```sql
-- 照片表外鍵
ALTER TABLE photos ADD CONSTRAINT fk_photo_uploader
    FOREIGN KEY (uploader_id) REFERENCES users(id);
ALTER TABLE photos ADD CONSTRAINT fk_photo_project
    FOREIGN KEY (project_id) REFERENCES projects(id);

-- 相簿表外鍵
ALTER TABLE albums ADD CONSTRAINT fk_album_creator
    FOREIGN KEY (creator_id) REFERENCES users(id);
ALTER TABLE albums ADD CONSTRAINT fk_album_project
    FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE albums ADD CONSTRAINT fk_album_cover
    FOREIGN KEY (cover_photo_id) REFERENCES photos(id);

-- 標註表外鍵
ALTER TABLE annotations ADD CONSTRAINT fk_annotation_photo
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE;
ALTER TABLE annotations ADD CONSTRAINT fk_annotation_author
    FOREIGN KEY (author_id) REFERENCES users(id);

-- 照片相簿關聯表外鍵
ALTER TABLE photo_albums ADD CONSTRAINT fk_photoalbum_photo
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE;
ALTER TABLE photo_albums ADD CONSTRAINT fk_photoalbum_album
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE;
ALTER TABLE photo_albums ADD CONSTRAINT fk_photoalbum_adder
    FOREIGN KEY (added_by) REFERENCES users(id);

-- 縮圖表外鍵
ALTER TABLE thumbnails ADD CONSTRAINT fk_thumbnail_photo
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE;
```

## 索引策略

### 主要索引

```sql
-- 基本索引
CREATE INDEX idx_photos_project_id ON photos(project_id);
CREATE INDEX idx_photos_uploader_id ON photos(uploader_id);
CREATE INDEX idx_photos_uploaded_at ON photos(uploaded_at DESC);
CREATE INDEX idx_photos_custom_date ON photos(custom_date DESC);

-- 全文搜尋索引
CREATE INDEX idx_photos_search_vector ON photos USING GIN(search_vector);
CREATE INDEX idx_photos_tags ON photos USING GIN(tags);

-- 相簿索引
CREATE INDEX idx_albums_project_id ON albums(project_id);
CREATE INDEX idx_albums_creator_id ON albums(creator_id);

-- 標註索引
CREATE INDEX idx_annotations_photo_id ON annotations(photo_id);

-- 照片相簿關聯索引
CREATE INDEX idx_photoalbums_photo_id ON photo_albums(photo_id);
CREATE INDEX idx_photoalbums_album_id ON photo_albums(album_id);
CREATE INDEX idx_photoalbums_sort_order ON photo_albums(album_id, sort_order);

-- 縮圖索引
CREATE INDEX idx_thumbnails_photo_size ON thumbnails(photo_id, size_type);
```

### 複合索引

```sql
-- 專案內的照片排序
CREATE INDEX idx_photos_project_date ON photos(project_id, custom_date DESC);

-- 使用者的照片排序
CREATE INDEX idx_photos_uploader_date ON photos(uploader_id, uploaded_at DESC);

-- 相簿內照片排序
CREATE INDEX idx_photoalbums_album_sort ON photo_albums(album_id, sort_order, added_at);

-- 軟刪除過濾
CREATE INDEX idx_photos_active ON photos(project_id, is_deleted, custom_date DESC)
    WHERE is_deleted = false;
```

## 狀態管理

### 照片生命週期

1. **uploading**: 上傳中
2. **processing**: 處理縮圖中
3. **active**: 可正常使用
4. **archived**: 已封存
5. **deleted**: 已刪除 (軟刪除)

### 相簿狀態

1. **active**: 可正常使用
2. **private**: 私人相簿
3. **deleted**: 已刪除 (軟刪除)

## 資料遷移考量

### 版本控制

- 使用 Alembic 進行資料庫遷移
- 每次結構變更都需要建立遷移腳本
- 保持向後相容性，避免破壞性變更

### 效能考量

- 大型資料表的遷移需要分批處理
- 索引建立時考慮對生產環境的影響
- 準備回滾計畫和資料備份

### 資料清理

- 定期清理軟刪除的記錄
- 清理無效的縮圖檔案
- 維護搜尋向量的更新

---

**下一步**: 基於此資料模型建立 API 合約和資料庫遷移腳本。
