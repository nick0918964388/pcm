-- ============================================
-- PCM 專案控制管理系統 - 資料庫初始化主腳本
-- ============================================
-- 版本: 1.0.0
-- 建立日期: 2025-01-15
-- 資料庫: PostgreSQL 15+
-- 描述: 完整資料庫初始化腳本，按順序執行所有建立腳本
-- ============================================

\echo '============================================'
\echo 'PCM 專案控制管理系統 - 資料庫初始化開始'
\echo '============================================'

-- 設定客戶端編碼
SET client_encoding = 'UTF8';

-- 設定時區
SET timezone = 'Asia/Taipei';

-- 設定搜尋路徑
SET search_path = public;

-- ============================================
-- 步驟 1: 建立基本 Schema 和表結構
-- ============================================

\echo ''
\echo '步驟 1/4: 建立基本 Schema 和表結構...'
\echo '執行: 01-create-schema.sql'

\ir 01-create-schema.sql

\echo '✅ Schema 建立完成'

-- ============================================
-- 步驟 2: 建立索引和約束
-- ============================================

\echo ''
\echo '步驟 2/4: 建立索引和約束...'
\echo '執行: 02-create-indexes.sql'

\ir 02-create-indexes.sql

\echo '✅ 索引建立完成'

-- ============================================
-- 步驟 3: 建立觸發器和函數
-- ============================================

\echo ''
\echo '步驟 3/4: 建立觸發器和函數...'
\echo '執行: 03-create-triggers.sql'

\ir 03-create-triggers.sql

\echo '✅ 觸發器和函數建立完成'

-- ============================================
-- 步驟 4: 插入初始資料
-- ============================================

\echo ''
\echo '步驟 4/5: 插入初始資料和設定...'
\echo '執行: 04-initial-data.sql'

\ir 04-initial-data.sql

\echo '✅ 初始資料插入完成'

-- ============================================
-- 步驟 5: 建立照片庫架構
-- ============================================

\echo ''
\echo '步驟 5/5: 建立照片庫架構...'
\echo '執行: 06-photo-gallery-schema.sql'

\ir 06-photo-gallery-schema.sql

\echo '✅ 照片庫架構建立完成'

-- ============================================
-- 資料庫初始化驗證
-- ============================================

\echo ''
\echo '============================================'
\echo '資料庫初始化驗證'
\echo '============================================'
SET search_path TO pcm, public;
-- 檢查表數量
SELECT 
    'Tables' as type, 
    COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'pcm' 
  AND table_type = 'BASE TABLE';

-- 檢查索引數量
SELECT 
    'Indexes' as type, 
    COUNT(*) as count
FROM pg_indexes 
WHERE schemaname = 'pcm';

-- 檢查觸發器數量
SELECT 
    'Triggers' as type, 
    COUNT(*) as count
FROM information_schema.triggers 
WHERE trigger_schema = 'pcm';

-- 檢查函數數量
SELECT 
    'Functions' as type, 
    COUNT(*) as count
FROM information_schema.routines 
WHERE routine_schema = 'pcm';

-- 檢查枚舉類型數量
SELECT 
    'Enum Types' as type, 
    COUNT(*) as count
FROM pg_type 
WHERE typnamespace = (
    SELECT oid FROM pg_namespace WHERE nspname = 'pcm'
) AND typtype = 'e';

-- 檢查基礎資料
\echo ''
\echo '基礎資料統計:'

SELECT 'Users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'Roles', COUNT(*) FROM roles
UNION ALL
SELECT 'Projects', COUNT(*) FROM projects
UNION ALL
SELECT 'WBS Items', COUNT(*) FROM wbs_items
UNION ALL
SELECT 'Vendors', COUNT(*) FROM vendors
UNION ALL
SELECT 'Duty Persons', COUNT(*) FROM duty_persons
UNION ALL
SELECT 'Duty Schedules', COUNT(*) FROM duty_schedules
UNION ALL
SELECT 'Photo Albums', COUNT(*) FROM photo_albums
UNION ALL
SELECT 'Photos', COUNT(*) FROM photos
UNION ALL
SELECT 'Photo Versions', COUNT(*) FROM photo_versions
UNION ALL
SELECT 'System Settings', COUNT(*) FROM system_settings
ORDER BY table_name;

-- ============================================
-- 權限設定驗證
-- ============================================

\echo ''
\echo '權限設定驗證:'

-- 檢查管理員用戶和角色
SELECT 
    u.username,
    u.email,
    r.name as role_name,
    u.is_active,
    u.is_verified
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.username = 'admin';

-- ============================================
-- 連接和效能測試
-- ============================================

\echo ''
\echo '連接和效能測試:'

-- 測試查詢效能
\timing on

-- 測試用戶查詢
SELECT COUNT(*) as user_count FROM users WHERE is_active = true;

-- 測試專案查詢
SELECT COUNT(*) as active_projects FROM projects WHERE status = 'active';

-- 測試複雜查詢 (專案與 WBS 關聯)
SELECT 
    p.id,
    p.name,
    COUNT(w.id) as wbs_count,
    AVG(w.completion_percentage) as avg_completion
FROM projects p
LEFT JOIN wbs_items w ON p.id = w.project_id AND w.is_active = true
WHERE p.is_active = true
GROUP BY p.id, p.name;

\timing off

-- ============================================
-- 安全性檢查
-- ============================================

\echo ''
\echo '安全性檢查:'

-- 檢查密碼是否已加密
SELECT 
    username,
    CASE 
        WHEN password_hash LIKE '$2b$%' THEN '✅ bcrypt 加密'
        ELSE '❌ 未加密或格式錯誤'
    END as password_security
FROM users 
LIMIT 5;

-- 檢查是否有未設定的權限
SELECT 
    name,
    CASE 
        WHEN permissions IS NULL OR permissions = '[]'::jsonb THEN '⚠️  無權限設定'
        ELSE '✅ 已設定權限'
    END as permission_status
FROM roles;

-- ============================================
-- 備份建議
-- ============================================

\echo ''
\echo '============================================'
\echo '備份建議'
\echo '============================================'
\echo ''
\echo '建議在開始使用系統前執行以下備份命令:'
\echo ''
\echo 'pg_dump -h <host> -U <username> -d <database> -f pcm_initial_backup.sql'
\echo ''
\echo '或使用完整備份:'
\echo 'pg_dump -h <host> -U <username> -d <database> -Fc -f pcm_initial_backup.dump'

-- ============================================
-- 初始化完成
-- ============================================

\echo ''
\echo '============================================'
\echo '✅ PCM 資料庫初始化完成！'
\echo '============================================'
\echo ''
\echo '預設登入資訊:'
\echo '  用戶名: admin'
\echo '  郵箱: admin@pcm.system'  
\echo '  密碼: Admin123!'
\echo ''
\echo '請立即更改預設管理員密碼！'
\echo ''
\echo '資料庫已準備就緒，可以開始使用 API 服務。'
\echo ''
\echo '============================================'