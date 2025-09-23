-- 創建測試專案數據
-- 確保proj001專案存在

-- 檢查是否有projects表，沒有則創建
DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM user_tables WHERE table_name = 'PROJECTS';

    IF v_count = 0 THEN
        -- 創建projects表
        EXECUTE IMMEDIATE 'CREATE TABLE projects (
            id VARCHAR2(20) PRIMARY KEY,
            name VARCHAR2(255) NOT NULL,
            description CLOB,
            status VARCHAR2(20) DEFAULT ''active'',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active NUMBER(1) DEFAULT 1
        )';

        DBMS_OUTPUT.PUT_LINE('已創建projects表');
    END IF;
END;
/

-- 插入測試專案數據
MERGE INTO projects p
USING (SELECT 'proj001' as id, 'FAB20 Phase1 專案' as name, '半導體廠建設專案第一期' as description FROM dual) s
ON (p.id = s.id)
WHEN NOT MATCHED THEN
    INSERT (id, name, description, status, is_active)
    VALUES (s.id, s.name, s.description, 'active', 1);

-- 插入更多測試專案
MERGE INTO projects p
USING (SELECT 'proj002' as id, 'FAB21 Phase2 專案' as name, '廠房擴建專案' as description FROM dual) s
ON (p.id = s.id)
WHEN NOT MATCHED THEN
    INSERT (id, name, description, status, is_active)
    VALUES (s.id, s.name, s.description, 'active', 1);

MERGE INTO projects p
USING (SELECT 'proj003' as id, 'FAB22 Phase3 專案' as name, '智慧工廠建設專案' as description FROM dual) s
ON (p.id = s.id)
WHEN NOT MATCHED THEN
    INSERT (id, name, description, status, is_active)
    VALUES (s.id, s.name, s.description, 'completed', 1);

COMMIT;

-- 顯示結果
SELECT id, name, status FROM projects ORDER BY id;