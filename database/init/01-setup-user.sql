-- Oracle初始化腳本: 建立PCM用戶和基本權限
-- 這個腳本會在Oracle容器首次啟動時自動執行

-- 設定session參數
ALTER SESSION SET "_ORACLE_SCRIPT"=true;

-- 建立PCM應用程式用戶
CREATE USER pcm_user IDENTIFIED BY pcm_pass123;

-- 授予基本權限
GRANT CREATE SESSION TO pcm_user;
GRANT CREATE TABLE TO pcm_user;
GRANT CREATE VIEW TO pcm_user;
GRANT CREATE SEQUENCE TO pcm_user;
GRANT CREATE PROCEDURE TO pcm_user;
GRANT CREATE TRIGGER TO pcm_user;
GRANT CREATE INDEX TO pcm_user;
GRANT CREATE SYNONYM TO pcm_user;

-- 授予額外權限
GRANT UNLIMITED TABLESPACE TO pcm_user;
GRANT SELECT_CATALOG_ROLE TO pcm_user;

-- 建立PCM schema (使用pcm_user)
CONNECT pcm_user/pcm_pass123@XE;

-- 建立基本的系統設定表
CREATE TABLE system_info (
    id NUMBER(10) PRIMARY KEY,
    key_name VARCHAR2(100) NOT NULL,
    key_value VARCHAR2(4000),
    description VARCHAR2(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入系統資訊
INSERT INTO system_info (id, key_name, key_value, description) VALUES
(1, 'database_version', 'Oracle XE 21c', 'Oracle資料庫版本');

INSERT INTO system_info (id, key_name, key_value, description) VALUES
(2, 'schema_version', '1.0.0', 'PCM資料庫Schema版本');

INSERT INTO system_info (id, key_name, key_value, description) VALUES
(3, 'init_date', TO_CHAR(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'), '資料庫初始化日期');

-- 建立序列
CREATE SEQUENCE system_info_seq START WITH 4 INCREMENT BY 1 NOCACHE;

COMMIT;

-- 返回系統用戶繼續執行其他腳本
CONNECT system/Oracle123@XE;

-- 確保pcm_user有正確的權限
GRANT SELECT ON dba_objects TO pcm_user;
GRANT SELECT ON user_objects TO pcm_user;