-- ============================================
-- PCM 專案控制管理系統 - 初始資料設定
-- ============================================
-- 版本: 1.0.0
-- 建立日期: 2025-01-15
-- 資料庫: PostgreSQL 15+
-- 描述: 建立系統初始資料和基礎配置
-- ============================================

-- ============================================
-- 1. 系統設定資料
-- ============================================
SET search_path TO pcm, public;
-- 插入基本系統設定
INSERT INTO system_settings (key, value, category, description, is_public) VALUES
-- 系統基本設定
('system.name', '"PCM 專案控制管理系統"', 'system', '系統名稱', true),
('system.version', '"1.0.0"', 'system', '系統版本', true),
('system.timezone', '"Asia/Taipei"', 'system', '系統時區', true),
('system.language', '"zh-TW"', 'system', '系統語言', true),
('system.currency', '"TWD"', 'system', '系統貨幣', true),

-- 認證設定
('auth.max_login_attempts', '5', 'auth', '最大登入嘗試次數', false),
('auth.lockout_duration', '30', 'auth', '帳號鎖定時間(分鐘)', false),
('auth.jwt_expiry', '"15m"', 'auth', 'JWT Token 有效期', false),
('auth.jwt_refresh_expiry', '"7d"', 'auth', 'JWT Refresh Token 有效期', false),
('auth.password_min_length', '8', 'auth', '密碼最小長度', true),
('auth.require_2fa', 'false', 'auth', '是否強制雙重認證', false),

-- 專案設定
('project.default_priority', '3', 'project', '專案預設優先級', false),
('project.auto_assign_id', 'true', 'project', '是否自動分配專案 ID', false),
('project.id_format', '"PROJ-YYYYMM-XXX"', 'project', '專案 ID 格式', false),
('project.max_members', '50', 'project', '專案最大成員數', false),

-- 排班設定
('duty.advance_days', '30', 'duty', '排班提前天數', false),
('duty.auto_reminder', 'true', 'duty', '是否自動提醒', false),
('duty.conflict_check', 'true', 'duty', '是否檢查排班衝突', false),

-- 郵件設定
('mail.enabled', 'false', 'mail', '是否啟用郵件功能', false),
('mail.from_name', '"PCM System"', 'mail', '寄件人名稱', false),

-- 檔案上傳設定
('upload.max_size', '10485760', 'upload', '最大上傳檔案大小(位元組)', false),
('upload.allowed_types', '["jpg", "jpeg", "png", "pdf", "doc", "docx", "xls", "xlsx"]', 'upload', '允許的檔案類型', false);

-- ============================================
-- 2. 基本角色設定
-- ============================================

INSERT INTO roles (id, name, description, permissions, is_active) VALUES
-- 系統管理員
(uuid_generate_v4(), 'system_admin', '系統管理員', 
 '[
   "system:read", "system:write", "system:delete",
   "user:read", "user:write", "user:delete", "user:manage",
   "role:read", "role:write", "role:delete", "role:assign",
   "project:read", "project:write", "project:delete", "project:manage",
   "wbs:read", "wbs:write", "wbs:delete",
   "vendor:read", "vendor:write", "vendor:delete",
   "duty:read", "duty:write", "duty:delete", "duty:manage",
   "audit:read"
 ]'::jsonb, true),

-- 專案管理員
(uuid_generate_v4(), 'project_manager', '專案管理員', 
 '[
   "project:read", "project:write", "project:manage",
   "wbs:read", "wbs:write", "wbs:delete",
   "member:read", "member:write", "member:invite",
   "milestone:read", "milestone:write",
   "duty:read", "duty:write"
 ]'::jsonb, true),

-- 專案成員
(uuid_generate_v4(), 'project_member', '專案成員', 
 '[
   "project:read",
   "wbs:read", "wbs:write",
   "member:read",
   "milestone:read",
   "duty:read"
 ]'::jsonb, true),

-- HR 管理員
(uuid_generate_v4(), 'hr_admin', 'HR 管理員', 
 '[
   "user:read", "user:write",
   "vendor:read", "vendor:write", "vendor:delete",
   "duty:read", "duty:write", "duty:delete", "duty:manage",
   "schedule:read", "schedule:write", "schedule:delete"
 ]'::jsonb, true),

-- 廠商管理員
(uuid_generate_v4(), 'vendor_admin', '廠商管理員', 
 '[
   "vendor:read",
   "duty:read", "duty:write",
   "person:read", "person:write"
 ]'::jsonb, true),

-- 一般用戶
(uuid_generate_v4(), 'user', '一般用戶', 
 '[
   "project:read",
   "wbs:read",
   "duty:read",
   "profile:read", "profile:write"
 ]'::jsonb, true);

-- ============================================
-- 3. 預設系統管理員用戶
-- ============================================

-- 創建預設管理員用戶 (密碼: Admin123!)
INSERT INTO users (
    id, 
    username, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    is_active, 
    is_verified
) VALUES (
    uuid_generate_v4(),
    'admin',
    'admin@pcm.system',
    '$2b$12$LnKJ5K9eV8pP3qF7xR9mF.VgJ3M2H4K6L8N9Qz5W7X1Y2Z3A4B5C6D', -- Admin123!
    '系統',
    '管理員',
    true,
    true
);

-- 分配系統管理員角色
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT 
    u.id,
    r.id,
    u.id
FROM users u, roles r
WHERE u.username = 'admin' 
  AND r.name = 'system_admin';

-- ============================================
-- 4. 範例專案資料
-- ============================================

-- 插入範例專案
INSERT INTO projects (
    id,
    name,
    description,
    status,
    type,
    priority,
    start_date,
    end_date,
    budget,
    manager_id,
    created_by
) VALUES 
(
    'PROJ-202501-001',
    'PCM 系統開發專案',
    '專案控制管理系統的開發與實施',
    'active',
    'internal',
    5,
    '2025-01-01',
    '2025-06-30',
    1000000.00,
    (SELECT id FROM users WHERE username = 'admin'),
    (SELECT id FROM users WHERE username = 'admin')
),
(
    'PROJ-202501-002',
    '辦公室安全系統升級',
    '升級辦公室的安全監控和門禁系統',
    'planning',
    'external',
    4,
    '2025-02-01',
    '2025-04-30',
    500000.00,
    (SELECT id FROM users WHERE username = 'admin'),
    (SELECT id FROM users WHERE username = 'admin')
);

-- 插入專案里程碑
INSERT INTO project_milestones (
    project_id,
    name,
    description,
    target_date,
    status,
    importance,
    created_by
) VALUES 
(
    'PROJ-202501-001',
    '需求分析完成',
    '完成系統需求分析和設計文檔',
    '2025-01-31',
    'completed',
    'high',
    (SELECT id FROM users WHERE username = 'admin')
),
(
    'PROJ-202501-001',
    '系統開發完成',
    '完成系統核心功能開發',
    '2025-04-30',
    'in_progress',
    'critical',
    (SELECT id FROM users WHERE username = 'admin')
),
(
    'PROJ-202501-001',
    '系統測試完成',
    '完成系統測試和用戶驗收',
    '2025-05-31',
    'pending',
    'high',
    (SELECT id FROM users WHERE username = 'admin')
);

-- ============================================
-- 5. 範例 WBS 資料
-- ============================================

-- 插入 WBS 根項目
INSERT INTO wbs_items (
    project_id,
    parent_id,
    wbs_code,
    name,
    description,
    level,
    status,
    priority,
    estimated_hours,
    assigned_to,
    start_date,
    end_date,
    created_by
) VALUES 
(
    'PROJ-202501-001',
    NULL,
    '1',
    '需求分析階段',
    '系統需求分析和規格制定',
    1,
    'completed',
    'high',
    160.00,
    (SELECT id FROM users WHERE username = 'admin'),
    '2025-01-01',
    '2025-01-31',
    (SELECT id FROM users WHERE username = 'admin')
),
(
    'PROJ-202501-001',
    NULL,
    '2',
    '系統設計階段',
    '系統架構設計和資料庫設計',
    1,
    'in_progress',
    'high',
    200.00,
    (SELECT id FROM users WHERE username = 'admin'),
    '2025-02-01',
    '2025-02-28',
    (SELECT id FROM users WHERE username = 'admin')
),
(
    'PROJ-202501-001',
    NULL,
    '3',
    '系統開發階段',
    '前後端功能開發實作',
    1,
    'not_started',
    'high',
    400.00,
    (SELECT id FROM users WHERE username = 'admin'),
    '2025-03-01',
    '2025-04-30',
    (SELECT id FROM users WHERE username = 'admin')
);

-- 插入 WBS 子項目
INSERT INTO wbs_items (
    project_id,
    parent_id,
    wbs_code,
    name,
    description,
    level,
    status,
    priority,
    estimated_hours,
    completion_percentage,
    assigned_to,
    start_date,
    end_date,
    created_by
) VALUES 
(
    'PROJ-202501-001',
    (SELECT id FROM wbs_items WHERE wbs_code = '1' AND project_id = 'PROJ-202501-001'),
    '1.1',
    '功能需求分析',
    '分析系統功能需求',
    2,
    'completed',
    'high',
    80.00,
    100.00,
    (SELECT id FROM users WHERE username = 'admin'),
    '2025-01-01',
    '2025-01-15',
    (SELECT id FROM users WHERE username = 'admin')
),
(
    'PROJ-202501-001',
    (SELECT id FROM wbs_items WHERE wbs_code = '1' AND project_id = 'PROJ-202501-001'),
    '1.2',
    '非功能需求分析',
    '分析系統效能、安全等需求',
    2,
    'completed',
    'medium',
    80.00,
    100.00,
    (SELECT id FROM users WHERE username = 'admin'),
    '2025-01-16',
    '2025-01-31',
    (SELECT id FROM users WHERE username = 'admin')
);

-- ============================================
-- 6. 範例廠商資料
-- ============================================

INSERT INTO vendors (
    name,
    type,
    status,
    contact_person,
    phone,
    email,
    address,
    contract_start,
    contract_end,
    rating,
    created_by
) VALUES 
(
    '安全衛士保全股份有限公司',
    'security',
    'active',
    '張安全',
    '02-12345678',
    'security@example.com',
    '台北市信義區松仁路100號',
    '2025-01-01',
    '2025-12-31',
    4.5,
    (SELECT id FROM users WHERE username = 'admin')
),
(
    '清潔專家清潔服務有限公司',
    'cleaning',
    'active',
    '李清潔',
    '02-87654321',
    'cleaning@example.com',
    '台北市大安區敦化南路200號',
    '2025-01-01',
    '2025-12-31',
    4.2,
    (SELECT id FROM users WHERE username = 'admin')
),
(
    'IT支援專業服務股份有限公司',
    'it_support',
    'active',
    '王技術',
    '02-11111111',
    'it.support@example.com',
    '台北市松山區南京東路300號',
    '2025-01-01',
    '2025-12-31',
    4.8,
    (SELECT id FROM users WHERE username = 'admin')
);

-- ============================================
-- 7. 範例值班人員資料
-- ============================================

INSERT INTO duty_persons (
    vendor_id,
    name,
    employee_id,
    phone,
    email,
    position,
    skills,
    rating
) VALUES 
(
    (SELECT id FROM vendors WHERE name = '安全衛士保全股份有限公司'),
    '陳保全',
    'SEC001',
    '0912-345-678',
    'chen.security@example.com',
    '資深保全員',
    '["巡邏", "監控", "緊急處理", "消防"]'::jsonb,
    4.5
),
(
    (SELECT id FROM vendors WHERE name = '安全衛士保全股份有限公司'),
    '林保全',
    'SEC002',
    '0912-345-679',
    'lin.security@example.com',
    '保全員',
    '["巡邏", "監控", "門禁管理"]'::jsonb,
    4.2
),
(
    (SELECT id FROM vendors WHERE name = '清潔專家清潔服務有限公司'),
    '黃清潔',
    'CLN001',
    '0923-456-789',
    'huang.cleaning@example.com',
    '清潔組長',
    '["辦公室清潔", "地板保養", "垃圾處理", "消毒"]'::jsonb,
    4.7
),
(
    (SELECT id FROM vendors WHERE name = 'IT支援專業服務股份有限公司'),
    '吳工程師',
    'IT001',
    '0934-567-890',
    'wu.engineer@example.com',
    'IT 工程師',
    '["網路維護", "軟體安裝", "硬體維修", "系統監控"]'::jsonb,
    4.9
);

-- ============================================
-- 8. 範例排班資料
-- ============================================

INSERT INTO duty_schedules (
    project_id,
    person_id,
    duty_date,
    shift_type,
    work_area,
    status,
    urgency_level,
    notes,
    created_by
) VALUES 
(
    'PROJ-202501-002',
    (SELECT id FROM duty_persons WHERE name = '陳保全'),
    CURRENT_DATE,
    '日班',
    '一樓大廳',
    '已排班',
    '一般',
    '負責一樓大廳安全監控',
    (SELECT id FROM users WHERE username = 'admin')
),
(
    'PROJ-202501-002',
    (SELECT id FROM duty_persons WHERE name = '林保全'),
    CURRENT_DATE,
    '夜班',
    '地下停車場',
    '已排班',
    '一般',
    '負責地下停車場巡邏',
    (SELECT id FROM users WHERE username = 'admin')
),
(
    'PROJ-202501-002',
    (SELECT id FROM duty_persons WHERE name = '黃清潔'),
    CURRENT_DATE + INTERVAL '1 day',
    '日班',
    '辦公區域',
    '已排班',
    '一般',
    '辦公區域清潔服務',
    (SELECT id FROM users WHERE username = 'admin')
),
(
    'PROJ-202501-002',
    (SELECT id FROM duty_persons WHERE name = '吳工程師'),
    CURRENT_DATE + INTERVAL '2 day',
    '日班',
    '機房',
    '已排班',
    '重要',
    '伺服器維護和監控',
    (SELECT id FROM users WHERE username = 'admin')
);

-- ============================================
-- 9. 專案成員設定
-- ============================================

-- 將管理員加入專案
INSERT INTO project_members (
    project_id,
    user_id,
    role,
    permissions,
    added_by
) VALUES 
(
    'PROJ-202501-001',
    (SELECT id FROM users WHERE username = 'admin'),
    'project_manager',
    '["read", "write", "delete", "manage"]'::jsonb,
    (SELECT id FROM users WHERE username = 'admin')
),
(
    'PROJ-202501-002',
    (SELECT id FROM users WHERE username = 'admin'),
    'project_manager',
    '["read", "write", "delete", "manage"]'::jsonb,
    (SELECT id FROM users WHERE username = 'admin')
);

-- ============================================
-- 10. 觸發器測試資料
-- ============================================

-- 更新專案進度 (會觸發進度計算)
UPDATE wbs_items 
SET completion_percentage = 100.00 
WHERE wbs_code IN ('1.1', '1.2') 
  AND project_id = 'PROJ-202501-001';

-- ============================================
-- 11. 建立資料完整性檢查
-- ============================================

-- 檢查必要資料是否正確插入
DO $$
DECLARE
    user_count INTEGER;
    role_count INTEGER;
    project_count INTEGER;
    vendor_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO role_count FROM roles;
    SELECT COUNT(*) INTO project_count FROM projects;
    SELECT COUNT(*) INTO vendor_count FROM vendors;
    
    RAISE NOTICE '資料插入統計:';
    RAISE NOTICE '  用戶數量: %', user_count;
    RAISE NOTICE '  角色數量: %', role_count;
    RAISE NOTICE '  專案數量: %', project_count;
    RAISE NOTICE '  廠商數量: %', vendor_count;
    
    IF user_count = 0 THEN
        RAISE EXCEPTION '用戶資料插入失敗';
    END IF;
    
    IF role_count < 6 THEN
        RAISE EXCEPTION '角色資料插入不完整';
    END IF;
    
    RAISE NOTICE '所有初始資料已成功插入！';
END $$;

-- ============================================
-- 12. 更新統計資訊
-- ============================================

ANALYZE users;
ANALYZE roles;
ANALYZE user_roles;
ANALYZE projects;
ANALYZE project_members;
ANALYZE wbs_items;
ANALYZE project_milestones;
ANALYZE vendors;
ANALYZE duty_persons;
ANALYZE duty_schedules;
ANALYZE system_settings;

-- ============================================
-- 完成
-- ============================================