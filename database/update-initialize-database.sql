-- ============================================
-- PCM 專案控制管理系統 - 更新的資料庫初始化主腳本
-- ============================================
-- 版本: 1.1.0
-- 建立日期: 2025-01-15
-- 資料庫: PostgreSQL 15+
-- 描述: 支援 pcm schema 的完整資料庫初始化腳本
-- ============================================

\echo '============================================'
\echo 'PCM 專案控制管理系統 - 資料庫初始化開始'
\echo '============================================'

-- 設定客戶端編碼
SET client_encoding = 'UTF8';

-- 設定時區
SET timezone = 'Asia/Taipei';

-- 連接到目標資料庫
\c app_db

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
\echo '步驟 4/4: 插入初始資料和設定...'
\echo '執行: 04-initial-data.sql'

\ir 04-initial-data.sql

\echo '✅ 初始資料插入完成'

-- ============================================
-- 資料庫初始化驗證
-- ============================================

-- 切換到 pcm schema
SET search_path TO pcm, public;

\echo ''
\echo '============================================'
\echo '資料庫初始化驗證 (PCM Schema)'
\echo '============================================'

-- 檢查 pcm schema 中的表數量
SELECT 
    'Tables in pcm schema' as type, 
    COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'pcm' 
  AND table_type = 'BASE TABLE';

-- 檢查基礎資料
\echo ''
\echo '基礎資料統計 (PCM Schema):'

SELECT 'Users' as table_name, COUNT(*) as record_count FROM pcm.users
UNION ALL
SELECT 'Roles', COUNT(*) FROM pcm.roles
UNION ALL
SELECT 'Projects', COUNT(*) FROM pcm.projects
UNION ALL
SELECT 'WBS Items', COUNT(*) FROM pcm.wbs_items
UNION ALL
SELECT 'Vendors', COUNT(*) FROM pcm.vendors
UNION ALL
SELECT 'Duty Persons', COUNT(*) FROM pcm.duty_persons
UNION ALL
SELECT 'Duty Schedules', COUNT(*) FROM pcm.duty_schedules
UNION ALL
SELECT 'System Settings', COUNT(*) FROM pcm.system_settings
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
FROM pcm.users u
JOIN pcm.user_roles ur ON u.id = ur.user_id
JOIN pcm.roles r ON ur.role_id = r.id
WHERE u.username = 'admin';

-- ============================================
-- 連接和效能測試
-- ============================================

\echo ''
\echo '連接和效能測試:'

-- 測試查詢效能
\timing on

-- 測試用戶查詢
SELECT COUNT(*) as user_count FROM pcm.users WHERE is_active = true;

-- 測試專案查詢
SELECT COUNT(*) as active_projects FROM pcm.projects WHERE status = 'active';

-- 測試複雜查詢 (專案與 WBS 關聯)
SELECT 
    p.id,
    p.name,
    COUNT(w.id) as wbs_count,
    AVG(w.completion_percentage) as avg_completion
FROM pcm.projects p
LEFT JOIN pcm.wbs_items w ON p.id = w.project_id AND w.is_active = true
WHERE p.is_active = true
GROUP BY p.id, p.name;

\timing off

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
\echo 'Schema: pcm'
\echo 'Search Path: pcm, public'
\echo ''
\echo '請立即更改預設管理員密碼！'
\echo ''
\echo '資料庫已準備就緒，可以開始使用 API 服務。'
\echo ''
\echo '============================================'