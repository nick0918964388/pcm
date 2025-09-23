-- 簡化版Oracle照片表建立
-- 先建立基本表結構

-- 1. 建立相簿表
CREATE TABLE photo_albums (
    id VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
    project_id VARCHAR2(20) NOT NULL,
    name VARCHAR2(255) NOT NULL,
    description CLOB,
    cover_photo_id VARCHAR2(36),
    photo_count NUMBER(10) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    created_by VARCHAR2(36)
);

-- 2. 建立照片表
CREATE TABLE photos (
    id VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
    album_id VARCHAR2(36) NOT NULL,
    file_name VARCHAR2(255) NOT NULL,
    file_path CLOB NOT NULL,
    file_size NUMBER(19) NOT NULL,
    mime_type VARCHAR2(100) NOT NULL,
    width NUMBER(10),
    height NUMBER(10),
    thumbnail_path CLOB,
    uploaded_by VARCHAR2(36) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    upload_status VARCHAR2(20) DEFAULT 'pending',
    metadata CLOB DEFAULT '{}',
    deleted_at TIMESTAMP
);

-- 3. 建立照片版本表
CREATE TABLE photo_versions (
    id VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
    photo_id VARCHAR2(36) NOT NULL,
    version_type VARCHAR2(20) NOT NULL,
    file_path CLOB NOT NULL,
    width NUMBER(10),
    height NUMBER(10),
    file_size NUMBER(19),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 建立基本索引
CREATE INDEX idx_albums_project_id ON photo_albums(project_id);
CREATE INDEX idx_photos_album_id ON photos(album_id);
CREATE INDEX idx_photos_uploaded_at ON photos(uploaded_at);

-- 5. 建立範例相簿
INSERT INTO photo_albums (project_id, name, description, created_by)
VALUES ('proj001', '施工進度照片', '記錄專案各階段施工進度', 'system');

INSERT INTO photo_albums (project_id, name, description, created_by)
VALUES ('proj001', '品質檢查照片', '品質控制相關照片', 'system');

INSERT INTO photo_albums (project_id, name, description, created_by)
VALUES ('proj001', '設備照片', '施工設備與機具照片', 'system');

COMMIT;