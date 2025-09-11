-- ============================================
-- PCM 專案控制管理系統 - 資料庫 Schema
-- ============================================
-- 版本: 1.0.0
-- 建立日期: 2025-01-15
-- 資料庫: PostgreSQL 15+
-- ============================================
GRANT ALL PRIVILEGES ON DATABASE app_db TO admin;
GRANT USAGE ON SCHEMA public to admin; 
GRANT CREATE ON SCHEMA public TO admin;

CREATE schema pcm AUTHORIZATION admin;
SET search_path TO pcm, public;

-- 創建 UUID 擴展 (如果不存在)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================
-- 1. 創建枚舉類型
-- ============================================

-- 專案狀態
CREATE TYPE project_status AS ENUM (
    'planning',     -- 規劃中
    'active',       -- 進行中
    'on_hold',      -- 暫停
    'completed',    -- 已完成
    'cancelled'     -- 已取消
);

-- 專案類型
CREATE TYPE project_type AS ENUM (
    'internal',     -- 內部專案
    'external',     -- 外部專案
    'maintenance',  -- 維護專案
    'research'      -- 研究專案
);

-- WBS 狀態
CREATE TYPE wbs_status AS ENUM (
    'not_started',  -- 未開始
    'in_progress',  -- 進行中
    'on_hold',      -- 暫停
    'completed',    -- 已完成
    'cancelled'     -- 已取消
);

-- WBS 優先級
CREATE TYPE wbs_priority AS ENUM (
    'low',          -- 低
    'medium',       -- 中
    'high',         -- 高
    'urgent'        -- 緊急
);

-- 班別類型
CREATE TYPE shift_type AS ENUM (
    '日班',
    '夜班',
    '全日',
    '緊急',
    '加班'
);

-- 值班狀態
CREATE TYPE duty_status AS ENUM (
    '已排班',
    '值班中',
    '已完成',
    '取消',
    '請假',
    '代班'
);

-- 緊急程度
CREATE TYPE urgency_level AS ENUM (
    '一般',
    '重要',
    '緊急',
    '危急'
);

-- 廠商類型
CREATE TYPE vendor_type AS ENUM (
    'security',     -- 保全
    'cleaning',     -- 清潔
    'maintenance',  -- 維護
    'catering',     -- 餐飲
    'it_support',   -- IT支援
    'other'         -- 其他
);

-- 廠商狀態
CREATE TYPE vendor_status AS ENUM (
    'active',       -- 活躍
    'inactive',     -- 非活躍
    'suspended',    -- 暫停
    'terminated'    -- 終止
);

-- ============================================
-- 2. 用戶認證相關表
-- ============================================

-- 用戶表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 約束
    CONSTRAINT chk_username_length CHECK (char_length(username) >= 3),
    CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 角色表
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(200),
    permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用戶角色關聯表
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

-- 用戶會話表
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- 登入日誌表
CREATE TABLE login_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    logout_time TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(200),
    session_id UUID REFERENCES user_sessions(id)
);

-- ============================================
-- 3. 專案管理相關表
-- ============================================

-- 專案表
CREATE TABLE projects (
    id VARCHAR(20) PRIMARY KEY,  -- 格式: PROJ-YYYYMM-XXX
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status project_status DEFAULT 'planning',
    type project_type DEFAULT 'internal',
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2) DEFAULT 0.00,
    progress DECIMAL(5,2) DEFAULT 0.00 CHECK (progress BETWEEN 0 AND 100),
    manager_id UUID REFERENCES users(id),
    client_info JSONB,
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- 約束
    CONSTRAINT chk_project_dates CHECK (start_date <= end_date),
    CONSTRAINT chk_budget_positive CHECK (budget >= 0)
);

-- 專案成員表
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(20) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    permissions JSONB DEFAULT '["read"]'::jsonb,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(project_id, user_id)
);

-- WBS 項目表
CREATE TABLE wbs_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(20) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES wbs_items(id) ON DELETE CASCADE,
    wbs_code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 1,
    status wbs_status DEFAULT 'not_started',
    priority wbs_priority DEFAULT 'medium',
    assigned_to UUID REFERENCES users(id),
    estimated_hours DECIMAL(8,2) DEFAULT 0.00,
    actual_hours DECIMAL(8,2) DEFAULT 0.00,
    start_date DATE,
    end_date DATE,
    completion_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (completion_percentage BETWEEN 0 AND 100),
    dependencies UUID[],
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- 約束
    UNIQUE(project_id, wbs_code),
    CONSTRAINT chk_wbs_dates CHECK (start_date <= end_date),
    CONSTRAINT chk_hours_positive CHECK (estimated_hours >= 0 AND actual_hours >= 0)
);

-- 專案里程碑表
CREATE TABLE project_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(20) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    target_date DATE NOT NULL,
    actual_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed')),
    importance VARCHAR(20) DEFAULT 'medium' CHECK (importance IN ('low', 'medium', 'high', 'critical')),
    deliverables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- ============================================
-- 4. 廠商排班相關表
-- ============================================

-- 廠商表
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    type vendor_type NOT NULL,
    status vendor_status DEFAULT 'active',
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address VARCHAR(300),
    contract_start DATE,
    contract_end DATE,
    rating DECIMAL(2,1) CHECK (rating BETWEEN 1 AND 5),
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- 約束
    CONSTRAINT chk_vendor_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_contract_dates CHECK (contract_start <= contract_end)
);

-- 值班人員表
CREATE TABLE duty_persons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    employee_id VARCHAR(50),
    phone VARCHAR(20),
    email VARCHAR(100),
    position VARCHAR(100),
    skills JSONB DEFAULT '[]'::jsonb,
    availability JSONB,
    rating DECIMAL(2,1) CHECK (rating BETWEEN 1 AND 5),
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 約束
    CONSTRAINT chk_person_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 值班排程表
CREATE TABLE duty_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(20) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES duty_persons(id),
    duty_date DATE NOT NULL,
    shift_type shift_type NOT NULL,
    work_area VARCHAR(100),
    status duty_status DEFAULT '已排班',
    urgency_level urgency_level DEFAULT '一般',
    notes TEXT,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    replacement_person_id UUID REFERENCES duty_persons(id),
    replacement_reason VARCHAR(200),
    created_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 約束
    CONSTRAINT chk_check_times CHECK (check_in_time IS NULL OR check_out_time IS NULL OR check_in_time < check_out_time)
);

-- ============================================
-- 5. 審計和日誌表
-- ============================================

-- 審計日誌表
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 系統設定表
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    category VARCHAR(50),
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. 註解說明
-- ============================================

-- 添加表註解
COMMENT ON TABLE users IS '系統用戶表';
COMMENT ON TABLE roles IS '角色表';
COMMENT ON TABLE user_roles IS '用戶角色關聯表';
COMMENT ON TABLE projects IS '專案主表';
COMMENT ON TABLE project_members IS '專案成員表';
COMMENT ON TABLE wbs_items IS 'WBS工作分解結構表';
COMMENT ON TABLE project_milestones IS '專案里程碑表';
COMMENT ON TABLE vendors IS '廠商表';
COMMENT ON TABLE duty_persons IS '值班人員表';
COMMENT ON TABLE duty_schedules IS '值班排程表';
COMMENT ON TABLE audit_logs IS '審計日誌表';

-- 添加欄位註解
COMMENT ON COLUMN users.failed_login_attempts IS '登入失敗次數';
COMMENT ON COLUMN users.locked_until IS '帳號鎖定到期時間';
COMMENT ON COLUMN projects.progress IS '專案進度百分比 (0-100)';
COMMENT ON COLUMN wbs_items.level IS 'WBS層級 (1為根節點)';
COMMENT ON COLUMN duty_schedules.urgency_level IS '緊急程度';

-- ============================================
-- 完成
-- ============================================


ALTER ROLE admin SET search_path TO pcm, public;