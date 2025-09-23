-- Oracle PCM Database Schema
-- 建立測試所需的基本資料表結構

-- 建立專案表
CREATE TABLE projects (
    id VARCHAR2(20) PRIMARY KEY,
    name VARCHAR2(255) NOT NULL,
    description CLOB,
    status VARCHAR2(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
    type VARCHAR2(20) DEFAULT 'construction' CHECK (type IN ('construction', 'infrastructure', 'maintenance')),
    priority NUMBER(2) DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    budget NUMBER(15,2),
    progress NUMBER(5,2) DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    manager_id VARCHAR2(36),
    metadata JSON,
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP,
    updated_at TIMESTAMP DEFAULT SYSTIMESTAMP,
    deleted_at TIMESTAMP
);

-- 建立索引
CREATE INDEX idx_projects_status ON projects (status);
CREATE INDEX idx_projects_type ON projects (type);
CREATE INDEX idx_projects_manager ON projects (manager_id);
CREATE INDEX idx_projects_dates ON projects (start_date, end_date);
CREATE INDEX idx_projects_deleted ON projects (deleted_at);

-- 建立使用者表
CREATE TABLE users (
    id VARCHAR2(36) PRIMARY KEY,
    username VARCHAR2(100) UNIQUE NOT NULL,
    email VARCHAR2(255) UNIQUE NOT NULL,
    password_hash VARCHAR2(255) NOT NULL,
    role VARCHAR2(20) DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'engineer', 'contractor', 'user')),
    first_name VARCHAR2(100),
    last_name VARCHAR2(100),
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP,
    updated_at TIMESTAMP DEFAULT SYSTIMESTAMP,
    deleted_at TIMESTAMP
);

-- 建立相簿表
CREATE TABLE photo_albums (
    id VARCHAR2(36) PRIMARY KEY,
    project_id VARCHAR2(20) NOT NULL,
    name VARCHAR2(255) NOT NULL,
    description CLOB,
    cover_photo_id VARCHAR2(36),
    photo_count NUMBER(10) DEFAULT 0,
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP,
    updated_at TIMESTAMP DEFAULT SYSTIMESTAMP,
    deleted_at TIMESTAMP,
    created_by VARCHAR2(36),
    CONSTRAINT fk_album_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT fk_album_creator FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 建立相片表
CREATE TABLE photos (
    id VARCHAR2(36) PRIMARY KEY,
    album_id VARCHAR2(36) NOT NULL,
    original_filename VARCHAR2(500) NOT NULL,
    stored_filename VARCHAR2(500) NOT NULL,
    file_path VARCHAR2(1000) NOT NULL,
    file_size NUMBER(12) NOT NULL,
    content_type VARCHAR2(100) NOT NULL,
    width NUMBER(6),
    height NUMBER(6),
    taken_at TIMESTAMP,
    metadata JSON,
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP,
    updated_at TIMESTAMP DEFAULT SYSTIMESTAMP,
    deleted_at TIMESTAMP,
    uploaded_by VARCHAR2(36),
    CONSTRAINT fk_photo_album FOREIGN KEY (album_id) REFERENCES photo_albums(id),
    CONSTRAINT fk_photo_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- 建立更新觸發器 (自動更新 updated_at)
CREATE OR REPLACE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
BEGIN
    :NEW.updated_at := SYSTIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
BEGIN
    :NEW.updated_at := SYSTIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_photo_albums_updated_at
    BEFORE UPDATE ON photo_albums
    FOR EACH ROW
BEGIN
    :NEW.updated_at := SYSTIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_photos_updated_at
    BEFORE UPDATE ON photos
    FOR EACH ROW
BEGIN
    :NEW.updated_at := SYSTIMESTAMP;
END;
/

-- 建立序列用於自增ID（如需要）
CREATE SEQUENCE seq_photo_id START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_album_id START WITH 1 INCREMENT BY 1;

-- 建立函數產生UUID
CREATE OR REPLACE FUNCTION generate_uuid RETURN VARCHAR2 IS
BEGIN
    RETURN REGEXP_REPLACE(SYS_GUID(), '([A-F0-9]{8})([A-F0-9]{4})([A-F0-9]{4})([A-F0-9]{4})([A-F0-9]{12})', '\1-\2-\3-\4-\5');
END;
/

-- 建立檢視用於健康檢查
CREATE OR REPLACE VIEW v_system_health AS
SELECT
    'oracle_database' as service,
    'healthy' as status,
    SYSTIMESTAMP as check_time,
    (SELECT COUNT(*) FROM projects) as total_projects,
    (SELECT COUNT(*) FROM users) as total_users
FROM dual;

-- 插入測試使用者
INSERT INTO users (id, username, email, password_hash, role, first_name, last_name)
VALUES ('TEST_USER_001', 'test_user_e2e', 'test@pcm.test', 'test_hash', 'manager', 'Test', 'User');

-- 提交變更
COMMIT;

-- 輸出建立完成訊息
SELECT 'PCM Oracle database schema created successfully' as message FROM dual;