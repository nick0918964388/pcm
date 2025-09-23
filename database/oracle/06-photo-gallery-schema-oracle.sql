-- ============================================
-- 照片庫功能 - Oracle 資料庫 Schema
-- ============================================
-- 版本: 1.0.0
-- 建立日期: 2025-09-23
-- 任務: 修復Oracle照片庫表結構
-- 資料庫: Oracle 21c XE
-- ============================================

-- ============================================
-- 1. 建立相簿表 (photo_albums)
-- ============================================

CREATE TABLE photo_albums (
    id VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
    project_id VARCHAR2(20) NOT NULL,
    name VARCHAR2(255) NOT NULL,
    description CLOB,
    cover_photo_id VARCHAR2(36),  -- 封面照片ID
    photo_count NUMBER(10) DEFAULT 0 CHECK (photo_count >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,  -- 軟刪除
    created_by VARCHAR2(36),

    -- 約束
    CONSTRAINT uk_album_project_name UNIQUE (project_id, name)
);

-- 新增相簿表註解
COMMENT ON TABLE photo_albums IS '專案照片相簿表';
COMMENT ON COLUMN photo_albums.project_id IS '關聯的專案ID';
COMMENT ON COLUMN photo_albums.cover_photo_id IS '封面照片ID';
COMMENT ON COLUMN photo_albums.photo_count IS '相簿內照片數量（自動維護）';
COMMENT ON COLUMN photo_albums.deleted_at IS '軟刪除時間戳';

-- ============================================
-- 2. 建立照片表 (photos)
-- ============================================

CREATE TABLE photos (
    id VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
    album_id VARCHAR2(36) NOT NULL,
    file_name VARCHAR2(255) NOT NULL,
    file_path CLOB NOT NULL,  -- 原始檔案路徑
    file_size NUMBER(19) NOT NULL CHECK (file_size > 0),
    mime_type VARCHAR2(100) NOT NULL,
    width NUMBER(10) CHECK (width > 0),
    height NUMBER(10) CHECK (height > 0),
    thumbnail_path CLOB,  -- 縮圖路徑
    uploaded_by VARCHAR2(36) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    upload_status VARCHAR2(20) DEFAULT 'pending',
    metadata CLOB DEFAULT '{}',  -- JSON格式的metadata
    deleted_at TIMESTAMP,  -- 軟刪除

    -- 約束
    CONSTRAINT chk_photo_dimensions CHECK (
        (width IS NULL AND height IS NULL) OR
        (width IS NOT NULL AND height IS NOT NULL)
    ),
    CONSTRAINT chk_upload_status CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed')),

    -- 外鍵約束
    CONSTRAINT fk_photos_album FOREIGN KEY (album_id) REFERENCES photo_albums(id) ON DELETE CASCADE
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
-- 3. 建立照片版本表 (photo_versions)
-- ============================================

CREATE TABLE photo_versions (
    id VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
    photo_id VARCHAR2(36) NOT NULL,
    version_type VARCHAR2(20) NOT NULL,
    file_path CLOB NOT NULL,
    width NUMBER(10) CHECK (width > 0),
    height NUMBER(10) CHECK (height > 0),
    file_size NUMBER(19) CHECK (file_size > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 約束：同一照片的版本類型唯一
    CONSTRAINT uk_photo_version UNIQUE (photo_id, version_type),
    CONSTRAINT chk_version_type CHECK (version_type IN ('thumbnail', 'small', 'medium', 'large', 'original')),

    -- 外鍵約束
    CONSTRAINT fk_photo_versions_photo FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
);

-- 新增照片版本表註解
COMMENT ON TABLE photo_versions IS '照片多解析度版本表';
COMMENT ON COLUMN photo_versions.version_type IS '版本類型：縮圖、小圖、中圖、大圖、原圖';
COMMENT ON COLUMN photo_versions.file_path IS '版本檔案的實際路徑';

-- ============================================
-- 4. 新增延遲的外鍵約束
-- ============================================

-- 相簿封面照片外鍵約束
ALTER TABLE photo_albums
ADD CONSTRAINT fk_album_cover_photo
FOREIGN KEY (cover_photo_id) REFERENCES photos(id) ON DELETE SET NULL;

-- ============================================
-- 5. 建立效能優化索引
-- ============================================

-- 相簿表索引
CREATE INDEX idx_albums_project_id ON photo_albums(project_id);
CREATE INDEX idx_albums_created_at ON photo_albums(created_at);
CREATE INDEX idx_albums_deleted_at ON photo_albums(deleted_at);

-- 照片表索引
CREATE INDEX idx_photos_album_id ON photos(album_id);
CREATE INDEX idx_photos_uploaded_at ON photos(uploaded_at);
CREATE INDEX idx_photos_uploaded_by ON photos(uploaded_by);
CREATE INDEX idx_photos_status ON photos(upload_status);
CREATE INDEX idx_photos_deleted_at ON photos(deleted_at);

-- 照片版本表索引
CREATE INDEX idx_photo_versions_photo_id ON photo_versions(photo_id);
CREATE INDEX idx_photo_versions_type ON photo_versions(version_type);

-- ============================================
-- 6. 建立觸發器用於自動化
-- ============================================

-- 更新 updated_at 欄位的觸發器
CREATE OR REPLACE TRIGGER trg_photo_albums_updated_at
    BEFORE UPDATE ON photo_albums
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

-- 自動維護相簿照片數量的觸發器
CREATE OR REPLACE TRIGGER trg_album_photo_count
    AFTER INSERT OR UPDATE OR DELETE ON photos
    FOR EACH ROW
DECLARE
    v_album_id VARCHAR2(36);
BEGIN
    -- 處理新增照片
    IF INSERTING AND :NEW.deleted_at IS NULL THEN
        UPDATE photo_albums
        SET photo_count = photo_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :NEW.album_id;
    END IF;

    -- 處理刪除照片
    IF DELETING OR (UPDATING AND :NEW.deleted_at IS NOT NULL AND :OLD.deleted_at IS NULL) THEN
        v_album_id := CASE WHEN DELETING THEN :OLD.album_id ELSE :NEW.album_id END;
        UPDATE photo_albums
        SET photo_count = photo_count - 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_album_id;
    END IF;

    -- 處理恢復照片（從軟刪除狀態恢復）
    IF UPDATING AND :NEW.deleted_at IS NULL AND :OLD.deleted_at IS NOT NULL THEN
        UPDATE photo_albums
        SET photo_count = photo_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :NEW.album_id;
    END IF;
END;
/

-- ============================================
-- 7. 建立檢視表用於常用查詢
-- ============================================

-- 活躍相簿檢視（未軟刪除）
CREATE OR REPLACE VIEW active_photo_albums AS
SELECT
    pa.*,
    p.name as project_name
FROM photo_albums pa
JOIN projects p ON pa.project_id = p.id
WHERE pa.deleted_at IS NULL
ORDER BY pa.updated_at DESC;

-- 活躍照片檢視（未軟刪除）
CREATE OR REPLACE VIEW active_photos AS
SELECT
    ph.*,
    pa.name as album_name,
    pa.project_id
FROM photos ph
JOIN photo_albums pa ON ph.album_id = pa.id
WHERE ph.deleted_at IS NULL AND pa.deleted_at IS NULL
ORDER BY ph.uploaded_at DESC;

-- 照片統計檢視
CREATE OR REPLACE VIEW photo_statistics AS
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
-- 8. 建立範例資料（僅用於開發測試）
-- ============================================

-- 建立範例相簿
DECLARE
    v_count NUMBER;
BEGIN
    -- 檢查是否已有proj001專案的相簿
    SELECT COUNT(*) INTO v_count FROM photo_albums WHERE project_id = 'proj001';

    IF v_count = 0 THEN
        -- 建立範例相簿
        INSERT INTO photo_albums (project_id, name, description, created_by)
        VALUES ('proj001', '施工進度照片', '記錄專案各階段施工進度', 'system');

        INSERT INTO photo_albums (project_id, name, description, created_by)
        VALUES ('proj001', '品質檢查照片', '品質控制相關照片', 'system');

        INSERT INTO photo_albums (project_id, name, description, created_by)
        VALUES ('proj001', '設備照片', '施工設備與機具照片', 'system');

        COMMIT;

        DBMS_OUTPUT.PUT_LINE('已建立範例照片相簿');
    ELSE
        DBMS_OUTPUT.PUT_LINE('照片相簿已存在，跳過建立');
    END IF;
END;
/

-- ============================================
-- 完成
-- ============================================

BEGIN
    DBMS_OUTPUT.PUT_LINE('照片庫 Oracle 資料庫架構建立完成！');
    DBMS_OUTPUT.PUT_LINE('- 已建立 photo_albums（相簿表）');
    DBMS_OUTPUT.PUT_LINE('- 已建立 photos（照片表）');
    DBMS_OUTPUT.PUT_LINE('- 已建立 photo_versions（照片版本表）');
    DBMS_OUTPUT.PUT_LINE('- 已建立相關索引、觸發器和檢視表');
    DBMS_OUTPUT.PUT_LINE('- 已建立範例資料');
END;
/