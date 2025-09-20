-- ============================================
-- 照片庫功能 - 資料庫 Schema
-- ============================================
-- 版本: 1.0.0
-- 建立日期: 2025-09-19
-- 任務: 1-1 建立資料庫架構與表格
-- 資料庫: PostgreSQL 15+
-- ============================================

-- 設定 schema 路徑
SET search_path TO pcm, public;

-- ============================================
-- 1. 建立照片庫相關枚舉類型
-- ============================================

-- 照片版本類型
CREATE TYPE photo_version_type AS ENUM (
    'thumbnail',    -- 縮圖 (150x150)
    'small',        -- 小圖 (400x300)
    'medium',       -- 中圖 (800x600)
    'large',        -- 大圖 (1200x900)
    'original'      -- 原圖
);

-- 上傳狀態
CREATE TYPE upload_status AS ENUM (
    'pending',      -- 處理中
    'processing',   -- 生成縮圖中
    'completed',    -- 完成
    'failed'        -- 失敗
);

-- ============================================
-- 2. 建立相簿表 (photo_albums)
-- ============================================

CREATE TABLE photo_albums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(20) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_photo_id UUID,  -- 封面照片ID (稍後新增外鍵約束)
    photo_count INTEGER DEFAULT 0 CHECK (photo_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,  -- 軟刪除
    created_by UUID REFERENCES users(id),

    -- 約束
    CONSTRAINT uk_album_project_name UNIQUE (project_id, name, deleted_at)  -- 同專案內相簿名稱唯一（未刪除）
);

-- 新增相簿表註解
COMMENT ON TABLE photo_albums IS '專案照片相簿表';
COMMENT ON COLUMN photo_albums.project_id IS '關聯的專案ID';
COMMENT ON COLUMN photo_albums.cover_photo_id IS '封面照片ID';
COMMENT ON COLUMN photo_albums.photo_count IS '相簿內照片數量（自動維護）';
COMMENT ON COLUMN photo_albums.deleted_at IS '軟刪除時間戳';

-- ============================================
-- 3. 建立照片表 (photos)
-- ============================================

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
    metadata JSONB DEFAULT '{}'::jsonb,  -- EXIF資料、GPS位置等
    deleted_at TIMESTAMP WITH TIME ZONE,  -- 軟刪除

    -- 約束
    CONSTRAINT chk_photo_dimensions CHECK (
        (width IS NULL AND height IS NULL) OR
        (width IS NOT NULL AND height IS NOT NULL)
    )
);

-- 新增照片表註解
COMMENT ON TABLE photos IS '照片檔案資訊表';
COMMENT ON COLUMN photos.file_path IS '檔案系統中的實際路徑';
COMMENT ON COLUMN photos.file_size IS '檔案大小（位元組）';
COMMENT ON COLUMN photos.thumbnail_path IS '縮圖檔案路徑';
COMMENT ON COLUMN photos.upload_status IS '上傳處理狀態';
COMMENT ON COLUMN photos.metadata IS 'EXIF資料、GPS位置等JSON格式';
COMMENT ON COLUMN photos.deleted_at IS '軟刪除時間戳';

-- ============================================
-- 4. 建立照片版本表 (photo_versions)
-- ============================================

CREATE TABLE photo_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    version_type photo_version_type NOT NULL,
    file_path TEXT NOT NULL,
    width INTEGER CHECK (width > 0),
    height INTEGER CHECK (height > 0),
    file_size BIGINT CHECK (file_size > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 約束：同一照片的版本類型唯一
    CONSTRAINT uk_photo_version UNIQUE (photo_id, version_type)
);

-- 新增照片版本表註解
COMMENT ON TABLE photo_versions IS '照片多解析度版本表';
COMMENT ON COLUMN photo_versions.version_type IS '版本類型：縮圖、小圖、中圖、大圖、原圖';
COMMENT ON COLUMN photo_versions.file_path IS '版本檔案的實際路徑';

-- ============================================
-- 5. 新增延遲的外鍵約束
-- ============================================

-- 相簿封面照片外鍵約束
ALTER TABLE photo_albums
ADD CONSTRAINT fk_album_cover_photo
FOREIGN KEY (cover_photo_id) REFERENCES photos(id) ON DELETE SET NULL;

-- ============================================
-- 6. 建立效能優化索引
-- ============================================

-- 相簿表索引
CREATE INDEX idx_albums_project_id ON photo_albums(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_albums_created_at ON photo_albums(created_at);
CREATE INDEX idx_albums_deleted_at ON photo_albums(deleted_at) WHERE deleted_at IS NOT NULL;

-- 照片表索引
CREATE INDEX idx_photos_album_id ON photos(album_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_photos_uploaded_at ON photos(uploaded_at);
CREATE INDEX idx_photos_uploaded_by ON photos(uploaded_by);
CREATE INDEX idx_photos_status ON photos(upload_status);
CREATE INDEX idx_photos_deleted_at ON photos(deleted_at) WHERE deleted_at IS NOT NULL;

-- 照片metadata的JSONB索引（GIN索引用於高效JSON查詢）
CREATE INDEX idx_photos_metadata_gin ON photos USING GIN (metadata);

-- 照片版本表索引
CREATE INDEX idx_photo_versions_photo_id ON photo_versions(photo_id);
CREATE INDEX idx_photo_versions_type ON photo_versions(version_type);

-- ============================================
-- 7. 建立觸發器函數用於自動化
-- ============================================

-- 更新 updated_at 欄位的觸發器函數
CREATE OR REPLACE FUNCTION update_photo_albums_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 自動維護相簿照片數量的觸發器函數
CREATE OR REPLACE FUNCTION update_album_photo_count()
RETURNS TRIGGER AS $$
BEGIN
    -- 處理新增照片
    IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
        UPDATE photo_albums
        SET photo_count = photo_count + 1,
            updated_at = NOW()
        WHERE id = NEW.album_id;
        RETURN NEW;
    END IF;

    -- 處理刪除照片
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN
        UPDATE photo_albums
        SET photo_count = photo_count - 1,
            updated_at = NOW()
        WHERE id = COALESCE(NEW.album_id, OLD.album_id);
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- 處理恢復照片（從軟刪除狀態恢復）
    IF TG_OP = 'UPDATE' AND NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
        UPDATE photo_albums
        SET photo_count = photo_count + 1,
            updated_at = NOW()
        WHERE id = NEW.album_id;
        RETURN NEW;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. 建立觸發器
-- ============================================

-- 相簿 updated_at 自動更新觸發器
CREATE TRIGGER trigger_photo_albums_updated_at
    BEFORE UPDATE ON photo_albums
    FOR EACH ROW
    EXECUTE FUNCTION update_photo_albums_updated_at();

-- 照片數量自動維護觸發器
CREATE TRIGGER trigger_album_photo_count
    AFTER INSERT OR UPDATE OR DELETE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION update_album_photo_count();

-- ============================================
-- 9. 建立檢視表用於常用查詢
-- ============================================

-- 活躍相簿檢視（未軟刪除）
CREATE VIEW active_photo_albums AS
SELECT
    pa.*,
    p.name as project_name,
    u.username as created_by_username
FROM photo_albums pa
JOIN projects p ON pa.project_id = p.id
LEFT JOIN users u ON pa.created_by = u.id
WHERE pa.deleted_at IS NULL
ORDER BY pa.updated_at DESC;

-- 活躍照片檢視（未軟刪除）
CREATE VIEW active_photos AS
SELECT
    ph.*,
    pa.name as album_name,
    pa.project_id,
    u.username as uploaded_by_username
FROM photos ph
JOIN photo_albums pa ON ph.album_id = pa.id
JOIN users u ON ph.uploaded_by = u.id
WHERE ph.deleted_at IS NULL AND pa.deleted_at IS NULL
ORDER BY ph.uploaded_at DESC;

-- 照片統計檢視
CREATE VIEW photo_statistics AS
SELECT
    pa.project_id,
    p.name as project_name,
    COUNT(DISTINCT pa.id) as album_count,
    COUNT(ph.id) as total_photos,
    SUM(ph.file_size) as total_size_bytes,
    MAX(ph.uploaded_at) as latest_upload
FROM photo_albums pa
LEFT JOIN photos ph ON pa.id = ph.album_id AND ph.deleted_at IS NULL
JOIN projects p ON pa.project_id = p.id
WHERE pa.deleted_at IS NULL
GROUP BY pa.project_id, p.name;

-- ============================================
-- 10. 建立範例資料（僅用於開發測試）
-- ============================================

-- 建立範例相簿（如果專案存在）
DO $$
DECLARE
    test_project_id VARCHAR(20);
    admin_user_id UUID;
    album_id UUID;
BEGIN
    -- 尋找第一個可用的專案和管理員用戶
    SELECT id INTO test_project_id FROM projects WHERE is_active = true LIMIT 1;
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin' LIMIT 1;

    IF test_project_id IS NOT NULL AND admin_user_id IS NOT NULL THEN
        -- 建立範例相簿
        INSERT INTO photo_albums (project_id, name, description, created_by)
        VALUES
            (test_project_id, '施工進度照片', '記錄專案各階段施工進度', admin_user_id),
            (test_project_id, '品質檢查照片', '品質控制相關照片', admin_user_id),
            (test_project_id, '設備照片', '施工設備與機具照片', admin_user_id)
        ON CONFLICT (project_id, name, deleted_at) DO NOTHING;

        RAISE NOTICE '已建立範例照片相簿';
    END IF;
END $$;

-- ============================================
-- 11. 權限設定
-- ============================================

-- 授予 admin 用戶完整權限
GRANT ALL PRIVILEGES ON photo_albums TO admin;
GRANT ALL PRIVILEGES ON photos TO admin;
GRANT ALL PRIVILEGES ON photo_versions TO admin;
GRANT SELECT ON active_photo_albums TO admin;
GRANT SELECT ON active_photos TO admin;
GRANT SELECT ON photo_statistics TO admin;

-- 授予序列權限
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA pcm TO admin;

-- ============================================
-- 完成
-- ============================================

RAISE NOTICE '照片庫資料庫架構建立完成！';
RAISE NOTICE '- 已建立 photo_albums（相簿表）';
RAISE NOTICE '- 已建立 photos（照片表）';
RAISE NOTICE '- 已建立 photo_versions（照片版本表）';
RAISE NOTICE '- 已建立相關索引、觸發器和檢視表';
RAISE NOTICE '- 已建立範例資料';