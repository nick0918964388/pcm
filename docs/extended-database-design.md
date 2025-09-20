# 擴展資料庫設計 - 人員認證管理與專案範疇管理

基於原有的值班管理系統，新增人員認證管理和專案範疇管理功能的完整資料庫設計。

## 1. 人員認證管理系統 Schema

### 1.1 使用者主表 (users)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(32) NOT NULL,
    
    -- 基本資訊
    display_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    employee_id VARCHAR(20),
    department VARCHAR(100),
    title VARCHAR(100),
    
    -- 聯絡資訊
    phone VARCHAR(20),
    mobile VARCHAR(20),
    office_location VARCHAR(100),
    extension VARCHAR(10),
    
    -- 角色和權限
    role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'editor', 'viewer')),
    permissions TEXT[], -- 權限陣列
    
    -- 狀態
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    is_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    
    -- 認證相關
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMP WITH TIME ZONE,
    email_verification_token VARCHAR(255),
    
    -- 會話管理
    session_timeout INTEGER DEFAULT 480, -- 分鐘
    max_concurrent_sessions INTEGER DEFAULT 3,
    force_password_change BOOLEAN DEFAULT FALSE,
    password_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- 個人設定
    profile_settings JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{}',
    ui_preferences JSONB DEFAULT '{}',
    timezone VARCHAR(50) DEFAULT 'Asia/Taipei',
    language VARCHAR(10) DEFAULT 'zh-TW',
    
    -- 系統欄位
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- 軟刪除
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id)
);

-- 索引
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_employee_id ON users(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_department_status ON users(department, status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_last_login ON users(last_login_at);
```

### 1.2 角色定義表 (roles)
```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- 權限設定
    permissions TEXT[] NOT NULL DEFAULT '{}',
    is_system_role BOOLEAN DEFAULT FALSE, -- 系統內建角色不可刪除
    
    -- 層級和優先序
    hierarchy_level INTEGER DEFAULT 0, -- 角色層級，數字越大權限越高
    priority INTEGER DEFAULT 0, -- 同層級排序
    
    -- 限制設定
    max_users INTEGER, -- 最大使用者數量限制
    session_timeout INTEGER DEFAULT 480, -- 預設會話逾時(分鐘)
    
    -- 狀態
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 系統欄位
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- 預設角色資料
INSERT INTO roles (name, display_name, description, permissions, is_system_role, hierarchy_level) VALUES
('admin', '系統管理員', '擁有系統完整管理權限', ARRAY['*'], TRUE, 100),
('manager', '專案管理員', '專案管理和人員管理權限', ARRAY['project.manage', 'user.manage', 'report.view'], TRUE, 80),
('editor', '編輯者', '資料編輯和檢視權限', ARRAY['data.edit', 'data.view', 'report.view'], TRUE, 50),
('viewer', '檢視者', '僅能檢視資料', ARRAY['data.view'], TRUE, 10);
```

### 1.3 使用者角色關聯表 (user_roles)
```sql
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    
    -- 角色範圍限制
    project_ids TEXT[], -- 限制特定專案的角色
    department_scope VARCHAR(100), -- 部門範圍限制
    
    -- 有效期限
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effective_until TIMESTAMP WITH TIME ZONE,
    
    -- 指派資訊
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assignment_reason TEXT,
    
    -- 狀態
    is_active BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT unique_user_role_project UNIQUE(user_id, role_id, project_ids)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_roles_effective ON user_roles(effective_from, effective_until);
```

### 1.4 權限定義表 (permissions)
```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE, -- 權限標識符 (如: project.create)
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- 權限分類
    category VARCHAR(50) NOT NULL, -- 如: project, user, report, system
    sub_category VARCHAR(50),
    
    -- 權限類型
    type VARCHAR(20) NOT NULL DEFAULT 'action' CHECK (type IN ('action', 'resource', 'field')),
    
    -- 權限層級
    security_level INTEGER DEFAULT 1, -- 1:低, 2:中, 3:高, 4:關鍵
    
    -- 依賴關係
    depends_on TEXT[], -- 依賴的其他權限
    
    -- 狀態
    is_active BOOLEAN DEFAULT TRUE,
    is_system_permission BOOLEAN DEFAULT FALSE,
    
    -- 系統欄位  
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 預設權限資料
INSERT INTO permissions (name, display_name, description, category, type, security_level, is_system_permission) VALUES
-- 系統管理
('system.admin', '系統管理', '系統完整管理權限', 'system', 'action', 4, TRUE),
('system.config', '系統設定', '修改系統設定', 'system', 'action', 4, TRUE),

-- 使用者管理
('user.view', '檢視使用者', '查看使用者列表和詳情', 'user', 'action', 1, TRUE),
('user.create', '建立使用者', '建立新使用者帳號', 'user', 'action', 3, TRUE),
('user.edit', '編輯使用者', '修改使用者資訊', 'user', 'action', 2, TRUE),
('user.delete', '刪除使用者', '刪除使用者帳號', 'user', 'action', 3, TRUE),
('user.manage_roles', '管理使用者角色', '指派/移除使用者角色', 'user', 'action', 3, TRUE),

-- 專案管理
('project.view', '檢視專案', '查看專案資訊', 'project', 'action', 1, TRUE),
('project.create', '建立專案', '建立新專案', 'project', 'action', 2, TRUE),
('project.edit', '編輯專案', '修改專案資訊', 'project', 'action', 2, TRUE),
('project.delete', '刪除專案', '刪除專案', 'project', 'action', 3, TRUE),
('project.manage_members', '管理專案成員', '新增/移除專案成員', 'project', 'action', 2, TRUE),

-- 值班管理
('duty.view', '檢視值班', '查看值班排程', 'duty', 'action', 1, TRUE),
('duty.create', '建立值班', '建立值班排程', 'duty', 'action', 2, TRUE),
('duty.edit', '編輯值班', '修改值班排程', 'duty', 'action', 2, TRUE),
('duty.delete', '刪除值班', '刪除值班排程', 'duty', 'action', 2, TRUE),

-- 報表權限
('report.view', '檢視報表', '查看各種報表', 'report', 'action', 1, TRUE),
('report.export', '匯出報表', '匯出報表資料', 'report', 'action', 2, TRUE),
('report.create', '建立報表', '建立自訂報表', 'report', 'action', 2, TRUE);
```

### 1.5 使用者會話表 (user_sessions)
```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255) UNIQUE,
    
    -- 會話資訊
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    
    -- 地理位置（可選）
    country VARCHAR(2),
    city VARCHAR(100),
    
    -- 時間管理
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- 狀態
    is_active BOOLEAN DEFAULT TRUE,
    logout_reason VARCHAR(50), -- manual, timeout, forced, security
    
    -- 安全標記
    is_suspicious BOOLEAN DEFAULT FALSE,
    risk_score INTEGER DEFAULT 0 -- 0-100 風險評分
);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active, expires_at);
CREATE INDEX idx_user_sessions_activity ON user_sessions(last_activity_at);
```

### 1.6 登入記錄表 (login_logs)
```sql
CREATE TABLE login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(50), -- 保留嘗試登入的用戶名
    
    -- 登入結果
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100), -- wrong_password, account_locked, account_disabled等
    
    -- 請求資訊
    ip_address INET,
    user_agent TEXT,
    request_headers JSONB,
    
    -- 地理資訊
    country VARCHAR(2),
    city VARCHAR(100),
    
    -- 安全評估
    is_suspicious BOOLEAN DEFAULT FALSE,
    risk_factors TEXT[], -- 風險因素陣列
    
    -- 時間戳
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_login_logs_user ON login_logs(user_id);
CREATE INDEX idx_login_logs_username ON login_logs(username);
CREATE INDEX idx_login_logs_ip ON login_logs(ip_address);
CREATE INDEX idx_login_logs_time ON login_logs(attempted_at);
CREATE INDEX idx_login_logs_suspicious ON login_logs(is_suspicious) WHERE is_suspicious = TRUE;
```

### 1.7 審計日誌表 (audit_logs)
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 操作者資訊
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(50),
    session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
    
    -- 操作資訊
    action VARCHAR(100) NOT NULL, -- 操作類型
    resource_type VARCHAR(50) NOT NULL, -- 資源類型 (user, project, duty等)
    resource_id VARCHAR(100), -- 資源ID
    resource_name VARCHAR(255), -- 資源名稱
    
    -- 變更詳情
    old_values JSONB, -- 變更前的值
    new_values JSONB, -- 變更後的值
    changes_summary TEXT, -- 變更摘要
    
    -- 請求資訊
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_url TEXT,
    
    -- 結果資訊
    success BOOLEAN NOT NULL,
    error_message TEXT,
    response_status INTEGER,
    
    -- 安全標記
    security_level INTEGER DEFAULT 1, -- 1:一般, 2:敏感, 3:重要, 4:關鍵
    tags TEXT[], -- 標籤陣列
    
    -- 時間戳
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 索引提示
    partition_date DATE GENERATED ALWAYS AS (DATE(occurred_at)) STORED
);

-- 按日期分區 (可選，數據量大時使用)
-- CREATE INDEX idx_audit_logs_user_time ON audit_logs(user_id, occurred_at);
-- CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
-- CREATE INDEX idx_audit_logs_action ON audit_logs(action, occurred_at);
-- CREATE INDEX idx_audit_logs_security ON audit_logs(security_level, occurred_at);
```

## 2. 專案範疇管理系統 Schema

### 2.1 專案主表 (projects) 
```sql
-- 擴展原有專案表或建立新表
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE, -- 專案代碼 如：PROJ001
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- 專案分類
    type VARCHAR(50) NOT NULL CHECK (type IN ('建築工程', '基礎設施', '翻新工程', '維護工程', '其他')),
    category VARCHAR(50), -- 專案類別
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- 狀態管理
    status VARCHAR(20) NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'paused', 'completed', 'cancelled')),
    health_status VARCHAR(20) DEFAULT 'green' CHECK (health_status IN ('green', 'yellow', 'red')),
    
    -- 時程資訊
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    baseline_start_date DATE,
    baseline_end_date DATE,
    
    -- 進度和里程碑
    overall_progress DECIMAL(5,2) DEFAULT 0.00 CHECK (overall_progress >= 0 AND overall_progress <= 100),
    total_milestones INTEGER DEFAULT 0,
    completed_milestones INTEGER DEFAULT 0,
    
    -- 預算資訊
    total_budget DECIMAL(15,2),
    approved_budget DECIMAL(15,2),
    spent_budget DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'TWD',
    budget_variance DECIMAL(15,2) GENERATED ALWAYS AS (approved_budget - spent_budget) STORED,
    
    -- 人員配置
    project_manager_id UUID REFERENCES users(id),
    sponsor_id UUID REFERENCES users(id), -- 專案贊助者
    team_size INTEGER DEFAULT 0,
    
    -- 位置和客戶資訊
    location TEXT,
    client_name VARCHAR(255),
    client_contact_name VARCHAR(100),
    client_contact_email VARCHAR(255),
    client_contact_phone VARCHAR(20),
    
    -- 風險和問題追蹤
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    open_issues_count INTEGER DEFAULT 0,
    critical_issues_count INTEGER DEFAULT 0,
    
    -- 品質指標
    quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 5),
    defect_count INTEGER DEFAULT 0,
    
    -- 文件和資源
    project_charter_url TEXT,
    documents_folder TEXT,
    external_links JSONB DEFAULT '[]',
    
    -- 標籤和分類
    tags TEXT[] DEFAULT '{}',
    keywords TEXT[] DEFAULT '{}',
    
    -- 自定義欄位
    custom_fields JSONB DEFAULT '{}',
    
    -- 通知設定
    notification_settings JSONB DEFAULT '{}',
    
    -- 狀態標記
    is_archived BOOLEAN DEFAULT FALSE,
    is_template BOOLEAN DEFAULT FALSE,
    is_confidential BOOLEAN DEFAULT FALSE,
    
    -- 系統欄位
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- 軟刪除
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id)
);

-- 索引優化
CREATE INDEX idx_projects_code ON projects(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_type_status ON projects(type, status);
CREATE INDEX idx_projects_manager ON projects(project_manager_id);
CREATE INDEX idx_projects_dates ON projects(planned_start_date, planned_end_date);
CREATE INDEX idx_projects_priority_health ON projects(priority, health_status);
CREATE INDEX idx_projects_tags ON projects USING gin(tags);
CREATE INDEX idx_projects_client ON projects(client_name);
```

### 2.2 專案成員表 (project_members)
```sql
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 角色和職責
    role VARCHAR(100) NOT NULL, -- 專案中的角色
    responsibilities TEXT[], -- 職責描述陣列
    authority_level INTEGER DEFAULT 1, -- 權限等級 1-5
    
    -- 參與度和工作量
    allocation_percentage DECIMAL(5,2) DEFAULT 100, -- 分配百分比
    estimated_hours DECIMAL(8,2), -- 預估工時
    actual_hours DECIMAL(8,2) DEFAULT 0, -- 實際工時
    billable_rate DECIMAL(10,2), -- 計費費率（敏感資料）
    
    -- 技能和資格
    required_skills TEXT[],
    certifications TEXT[],
    experience_level VARCHAR(20) CHECK (experience_level IN ('junior', 'intermediate', 'senior', 'expert')),
    
    -- 時程安排
    start_date DATE,
    end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    
    -- 狀態和可用性
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'transferred', 'completed')),
    availability VARCHAR(20) DEFAULT 'full_time' CHECK (availability IN ('full_time', 'part_time', 'on_call', 'consultant')),
    
    -- 績效追蹤
    performance_rating DECIMAL(3,2) CHECK (performance_rating >= 1 AND performance_rating <= 5),
    completed_tasks INTEGER DEFAULT 0,
    pending_tasks INTEGER DEFAULT 0,
    overdue_tasks INTEGER DEFAULT 0,
    
    -- 通訊偏好
    preferred_contact_method VARCHAR(20) DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'chat', 'in_person')),
    emergency_contact TEXT,
    
    -- 加入資訊
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    invited_by UUID REFERENCES users(id),
    invitation_accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- 離開資訊
    left_at TIMESTAMP WITH TIME ZONE,
    leaving_reason TEXT,
    handover_completed BOOLEAN DEFAULT FALSE,
    
    -- 備註
    notes TEXT,
    
    -- 系統欄位
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_project_user UNIQUE(project_id, user_id, start_date)
);

-- 索引
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(role);
CREATE INDEX idx_project_members_status ON project_members(status);
CREATE INDEX idx_project_members_dates ON project_members(start_date, end_date);
CREATE INDEX idx_project_members_skills ON project_members USING gin(required_skills);
```

### 2.3 WBS 項目表 (wbs_items) - 增強版
```sql
-- 基於現有 WBS 結構，增加資料庫整合功能
CREATE TABLE wbs_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- 階層結構
    parent_id UUID REFERENCES wbs_items(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL, -- WBS編碼 如：1.2.3
    name VARCHAR(255) NOT NULL,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    -- 狀態和進度
    status VARCHAR(20) NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'on_hold', 'cancelled', 'overdue')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    progress DECIMAL(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    -- 時程管理
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    baseline_start_date DATE,
    baseline_end_date DATE,
    duration_days INTEGER,
    
    -- 工作量估算
    estimated_hours DECIMAL(8,2),
    actual_hours DECIMAL(8,2) DEFAULT 0,
    remaining_hours DECIMAL(8,2),
    
    -- 成本管理
    estimated_cost DECIMAL(12,2),
    actual_cost DECIMAL(12,2) DEFAULT 0,
    approved_budget DECIMAL(12,2),
    
    -- 人員分派
    assignee_ids UUID[] DEFAULT '{}', -- 負責人ID陣列
    primary_assignee_id UUID REFERENCES users(id),
    reviewer_id UUID REFERENCES users(id),
    
    -- 依賴關係
    predecessor_ids UUID[] DEFAULT '{}', -- 前置任務
    dependency_type VARCHAR(10) DEFAULT 'FS' CHECK (dependency_type IN ('FS', 'SS', 'FF', 'SF')),
    lag_days INTEGER DEFAULT 0,
    
    -- 里程碑和交付物
    is_milestone BOOLEAN DEFAULT FALSE,
    is_critical_path BOOLEAN DEFAULT FALSE,
    deliverables TEXT[],
    acceptance_criteria TEXT[],
    
    -- 風險和問題
    risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    identified_risks TEXT[],
    mitigation_plans TEXT[],
    
    -- 品質管控
    quality_criteria TEXT[],
    quality_score DECIMAL(3,2) CHECK (quality_score >= 1 AND quality_score <= 5),
    review_required BOOLEAN DEFAULT FALSE,
    approval_required BOOLEAN DEFAULT FALSE,
    
    -- 資源需求
    required_resources JSONB DEFAULT '{}', -- 資源需求詳情
    allocated_resources JSONB DEFAULT '{}', -- 已分配資源
    
    -- 文件和附件
    documents JSONB DEFAULT '[]', -- 相關文件
    attachments JSONB DEFAULT '[]', -- 附件清單
    external_references JSONB DEFAULT '[]', -- 外部參考
    
    -- 狀態標記
    is_template BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE, -- 鎖定編輯
    
    -- 標籤和分類
    tags TEXT[] DEFAULT '{}',
    category VARCHAR(50),
    work_type VARCHAR(50), -- 工作類型
    
    -- 自定義欄位
    custom_fields JSONB DEFAULT '{}',
    
    -- 追蹤資訊
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    last_status_update TIMESTAMP WITH TIME ZONE,
    next_review_date DATE,
    
    -- 系統欄位
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    version INTEGER DEFAULT 1,
    
    -- 樹狀結構約束
    CONSTRAINT wbs_no_self_reference CHECK (id != parent_id),
    CONSTRAINT unique_wbs_project_code UNIQUE(project_id, code)
);

-- WBS 專用索引
CREATE INDEX idx_wbs_project ON wbs_items(project_id);
CREATE INDEX idx_wbs_parent ON wbs_items(parent_id);
CREATE INDEX idx_wbs_level_order ON wbs_items(level, sort_order);
CREATE INDEX idx_wbs_status ON wbs_items(status);
CREATE INDEX idx_wbs_assignee ON wbs_items USING gin(assignee_ids);
CREATE INDEX idx_wbs_dates ON wbs_items(planned_start_date, planned_end_date);
CREATE INDEX idx_wbs_critical ON wbs_items(is_critical_path, is_milestone);
CREATE INDEX idx_wbs_tags ON wbs_items USING gin(tags);
CREATE INDEX idx_wbs_progress ON wbs_items(progress, status);

-- 全文搜尋索引
CREATE INDEX idx_wbs_search ON wbs_items USING gin(to_tsvector('simple', name || ' ' || COALESCE(description, '')));
```

### 2.4 專案里程碑表 (project_milestones)
```sql
CREATE TABLE project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    wbs_item_id UUID REFERENCES wbs_items(id) ON DELETE SET NULL,
    
    -- 里程碑基本資訊
    name VARCHAR(255) NOT NULL,
    description TEXT,
    milestone_type VARCHAR(50) DEFAULT 'delivery' CHECK (milestone_type IN ('delivery', 'review', 'approval', 'decision', 'external')),
    
    -- 時程資訊
    target_date DATE NOT NULL,
    baseline_date DATE,
    actual_date DATE,
    
    -- 狀態管理
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'achieved', 'missed', 'cancelled')),
    health_status VARCHAR(20) DEFAULT 'green' CHECK (health_status IN ('green', 'yellow', 'red')),
    
    -- 重要性和影響
    importance VARCHAR(20) DEFAULT 'medium' CHECK (importance IN ('low', 'medium', 'high', 'critical')),
    impact_on_schedule INTEGER DEFAULT 0, -- 對整體時程的影響天數
    impact_on_budget DECIMAL(12,2) DEFAULT 0, -- 對預算的影響
    
    -- 完成條件
    success_criteria TEXT[],
    deliverables TEXT[],
    acceptance_criteria TEXT[],
    
    -- 負責人和利害關係人
    owner_id UUID REFERENCES users(id),
    stakeholders UUID[] DEFAULT '{}', -- 利害關係人ID陣列
    approver_id UUID REFERENCES users(id),
    
    -- 依賴和風險
    dependencies UUID[] DEFAULT '{}', -- 依賴的其他里程碑或任務
    risks TEXT[],
    mitigation_plans TEXT[],
    
    -- 追蹤資訊
    progress DECIMAL(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    completion_notes TEXT,
    lessons_learned TEXT,
    
    -- 通知和提醒
    notification_days INTEGER DEFAULT 7, -- 提前幾天通知
    reminder_sent BOOLEAN DEFAULT FALSE,
    escalation_required BOOLEAN DEFAULT FALSE,
    
    -- 文件和證據
    supporting_documents JSONB DEFAULT '[]',
    evidence_of_completion JSONB DEFAULT '[]',
    
    -- 標籤
    tags TEXT[] DEFAULT '{}',
    
    -- 系統欄位
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- 里程碑索引
CREATE INDEX idx_milestones_project ON project_milestones(project_id);
CREATE INDEX idx_milestones_target_date ON project_milestones(target_date);
CREATE INDEX idx_milestones_status ON project_milestones(status);
CREATE INDEX idx_milestones_owner ON project_milestones(owner_id);
CREATE INDEX idx_milestones_importance ON project_milestones(importance, target_date);
```

## 3. 關聯整合和觸發器

### 3.1 統計更新觸發器
```sql
-- 自動更新專案統計資訊
CREATE OR REPLACE FUNCTION update_project_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- 更新專案的 WBS 統計
    UPDATE projects SET
        updated_at = NOW()
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 觸發器：WBS 項目變更時更新專案統計
CREATE TRIGGER trigger_update_project_stats_on_wbs_change
    AFTER INSERT OR UPDATE OR DELETE ON wbs_items
    FOR EACH ROW EXECUTE FUNCTION update_project_statistics();

-- 觸發器：里程碑變更時更新專案統計  
CREATE TRIGGER trigger_update_project_stats_on_milestone_change
    AFTER INSERT OR UPDATE OR DELETE ON project_milestones
    FOR EACH ROW EXECUTE FUNCTION update_project_statistics();
```

### 3.2 安全性觸發器
```sql
-- 密碼變更時清除所有會話
CREATE OR REPLACE FUNCTION invalidate_user_sessions_on_password_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.password_hash != NEW.password_hash THEN
        UPDATE user_sessions 
        SET is_active = FALSE, 
            logout_reason = 'password_changed'
        WHERE user_id = NEW.id AND is_active = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invalidate_sessions_on_password_change
    AFTER UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION invalidate_user_sessions_on_password_change();
```

### 3.3 資料完整性約束
```sql
-- 確保專案經理是專案成員
ALTER TABLE projects ADD CONSTRAINT check_project_manager_is_member
CHECK (
    project_manager_id IS NULL OR 
    EXISTS (
        SELECT 1 FROM project_members 
        WHERE project_id = projects.id 
        AND user_id = projects.project_manager_id 
        AND status = 'active'
    )
);

-- 確保 WBS 不會形成循環依賴
CREATE OR REPLACE FUNCTION check_wbs_circular_dependency()
RETURNS TRIGGER AS $$
DECLARE
    current_parent UUID;
    visited_nodes UUID[];
BEGIN
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    current_parent := NEW.parent_id;
    visited_nodes := ARRAY[NEW.id];
    
    WHILE current_parent IS NOT NULL LOOP
        IF current_parent = ANY(visited_nodes) THEN
            RAISE EXCEPTION 'Circular dependency detected in WBS structure';
        END IF;
        
        visited_nodes := array_append(visited_nodes, current_parent);
        
        SELECT parent_id INTO current_parent 
        FROM wbs_items 
        WHERE id = current_parent;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_wbs_circular_dependency
    BEFORE INSERT OR UPDATE ON wbs_items
    FOR EACH ROW EXECUTE FUNCTION check_wbs_circular_dependency();
```

## 4. 視圖和查詢優化

### 4.1 使用者權限檢視
```sql
CREATE VIEW user_permissions_view AS
SELECT 
    u.id as user_id,
    u.username,
    u.display_name,
    u.role as primary_role,
    r.name as role_name,
    r.display_name as role_display_name,
    ur.project_ids,
    ur.department_scope,
    ur.effective_from,
    ur.effective_until,
    r.permissions as role_permissions,
    u.permissions as user_permissions,
    -- 合併權限
    array(
        SELECT DISTINCT unnest(r.permissions || COALESCE(u.permissions, '{}'))
    ) as all_permissions
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = TRUE
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.deleted_at IS NULL 
    AND u.status = 'active'
    AND (ur.effective_until IS NULL OR ur.effective_until > NOW());
```

### 4.2 專案統計檢視  
```sql
CREATE VIEW project_statistics_view AS
SELECT 
    p.id,
    p.code,
    p.name,
    p.status,
    p.overall_progress,
    
    -- WBS 統計
    COUNT(w.id) as total_wbs_items,
    COUNT(CASE WHEN w.status = 'completed' THEN 1 END) as completed_wbs_items,
    COUNT(CASE WHEN w.is_milestone THEN 1 END) as total_milestones,
    COUNT(CASE WHEN w.is_milestone AND w.status = 'completed' THEN 1 END) as completed_milestones,
    
    -- 成員統計
    COUNT(DISTINCT pm.user_id) as team_size,
    COUNT(DISTINCT CASE WHEN pm.status = 'active' THEN pm.user_id END) as active_members,
    
    -- 時程統計
    COALESCE(SUM(w.estimated_hours), 0) as total_estimated_hours,
    COALESCE(SUM(w.actual_hours), 0) as total_actual_hours,
    
    -- 成本統計
    p.total_budget,
    p.spent_budget,
    p.budget_variance
    
FROM projects p
LEFT JOIN wbs_items w ON p.id = w.project_id AND w.deleted_at IS NULL
LEFT JOIN project_members pm ON p.id = pm.project_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.code, p.name, p.status, p.overall_progress, p.total_budget, p.spent_budget, p.budget_variance;
```

### 4.3 效能優化索引
```sql
-- 複合索引用於常見查詢
CREATE INDEX idx_users_status_role_dept ON users(status, role, department) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_status_manager_type ON projects(status, project_manager_id, type) WHERE deleted_at IS NULL;
CREATE INDEX idx_wbs_project_status_assignee ON wbs_items(project_id, status, primary_assignee_id);
CREATE INDEX idx_project_members_project_status_user ON project_members(project_id, status, user_id);

-- 分區表索引（大數據量時）
CREATE INDEX idx_audit_logs_partition ON audit_logs(occurred_at, user_id, action);
CREATE INDEX idx_login_logs_partition ON login_logs(attempted_at, user_id, success);
```

這個擴展設計提供了完整的人員認證管理和專案範疇管理功能，包括：

- **完整的使用者認證系統** - 支援角色權限、會話管理、安全審計
- **詳細的專案管理** - WBS 整合、里程碑追蹤、成員管理  
- **安全性和合規性** - 審計日誌、登入追蹤、權限控制
- **效能優化** - 適當的索引策略和統計檢視
- **資料完整性** - 約束和觸發器確保資料一致性