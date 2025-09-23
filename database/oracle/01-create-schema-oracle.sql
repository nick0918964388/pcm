-- ============================================
-- PCM 專案控制管理系統 - Oracle Schema
-- ============================================
-- 版本: 1.0.0
-- 建立日期: 2025-01-15
-- 資料庫: Oracle 21c XE
-- ============================================

-- 在Oracle中，我們使用CHECK約束來模擬ENUM

-- ============================================
-- 1. 創建基本表格
-- ============================================

-- 專案表
CREATE TABLE projects (
    id VARCHAR2(36) DEFAULT sys_guid() PRIMARY KEY,
    name VARCHAR2(255) NOT NULL,
    description CLOB,
    status VARCHAR2(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
    project_type VARCHAR2(20) DEFAULT 'internal' CHECK (project_type IN ('internal', 'external', 'maintenance', 'research')),
    start_date DATE,
    end_date DATE,
    budget NUMBER(15,2),
    manager_id VARCHAR2(36),
    client_id VARCHAR2(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR2(36),
    updated_by VARCHAR2(36)
);

-- WBS工作分解結構表
CREATE TABLE wbs_items (
    id VARCHAR2(36) DEFAULT sys_guid() PRIMARY KEY,
    project_id VARCHAR2(36) NOT NULL,
    parent_id VARCHAR2(36),
    wbs_code VARCHAR2(50) NOT NULL,
    name VARCHAR2(255) NOT NULL,
    description CLOB,
    status VARCHAR2(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'on_hold', 'completed', 'cancelled')),
    priority VARCHAR2(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    progress NUMBER(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    estimated_hours NUMBER(8,2),
    actual_hours NUMBER(8,2),
    start_date DATE,
    end_date DATE,
    assignee_id VARCHAR2(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR2(36),
    updated_by VARCHAR2(36),
    CONSTRAINT fk_wbs_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT fk_wbs_parent FOREIGN KEY (parent_id) REFERENCES wbs_items(id)
);

-- 里程碑表
CREATE TABLE milestones (
    id VARCHAR2(36) DEFAULT sys_guid() PRIMARY KEY,
    project_id VARCHAR2(36) NOT NULL,
    name VARCHAR2(255) NOT NULL,
    description CLOB,
    due_date DATE NOT NULL,
    completed_date DATE,
    status VARCHAR2(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR2(36),
    updated_by VARCHAR2(36),
    CONSTRAINT fk_milestone_project FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 任務表
CREATE TABLE tasks (
    id VARCHAR2(36) DEFAULT sys_guid() PRIMARY KEY,
    wbs_item_id VARCHAR2(36) NOT NULL,
    name VARCHAR2(255) NOT NULL,
    description CLOB,
    status VARCHAR2(20) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked')),
    priority VARCHAR2(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    estimated_hours NUMBER(8,2),
    actual_hours NUMBER(8,2),
    start_date DATE,
    due_date DATE,
    completed_date DATE,
    assignee_id VARCHAR2(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR2(36),
    updated_by VARCHAR2(36),
    CONSTRAINT fk_task_wbs FOREIGN KEY (wbs_item_id) REFERENCES wbs_items(id)
);

-- 用戶表
CREATE TABLE users (
    id VARCHAR2(36) DEFAULT sys_guid() PRIMARY KEY,
    username VARCHAR2(100) UNIQUE NOT NULL,
    email VARCHAR2(255) UNIQUE NOT NULL,
    password_hash VARCHAR2(255) NOT NULL,
    first_name VARCHAR2(100),
    last_name VARCHAR2(100),
    role VARCHAR2(20) DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
    is_active NUMBER(1) DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- 客戶表
CREATE TABLE clients (
    id VARCHAR2(36) DEFAULT sys_guid() PRIMARY KEY,
    name VARCHAR2(255) NOT NULL,
    description CLOB,
    contact_person VARCHAR2(255),
    email VARCHAR2(255),
    phone VARCHAR2(50),
    address CLOB,
    is_active NUMBER(1) DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR2(36),
    updated_by VARCHAR2(36)
);

-- 供應商表
CREATE TABLE vendors (
    id VARCHAR2(36) DEFAULT sys_guid() PRIMARY KEY,
    name VARCHAR2(255) NOT NULL,
    description CLOB,
    contact_person VARCHAR2(255),
    email VARCHAR2(255),
    phone VARCHAR2(50),
    address CLOB,
    vendor_type VARCHAR2(50),
    is_active NUMBER(1) DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR2(36),
    updated_by VARCHAR2(36)
);

-- 供應商聯絡人表
CREATE TABLE vendor_contacts (
    id VARCHAR2(36) DEFAULT sys_guid() PRIMARY KEY,
    vendor_id VARCHAR2(36) NOT NULL,
    name VARCHAR2(255) NOT NULL,
    title VARCHAR2(100),
    email VARCHAR2(255),
    phone VARCHAR2(50),
    department VARCHAR2(100),
    is_primary NUMBER(1) DEFAULT 0 CHECK (is_primary IN (0, 1)),
    is_active NUMBER(1) DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR2(36),
    updated_by VARCHAR2(36),
    CONSTRAINT fk_vendor_contact_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- 專案團隊成員表
CREATE TABLE project_members (
    id VARCHAR2(36) DEFAULT sys_guid() PRIMARY KEY,
    project_id VARCHAR2(36) NOT NULL,
    user_id VARCHAR2(36) NOT NULL,
    role VARCHAR2(50) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    is_active NUMBER(1) DEFAULT 1 CHECK (is_active IN (0, 1)),
    CONSTRAINT fk_project_member_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT fk_project_member_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uk_project_user UNIQUE (project_id, user_id)
);

-- 任務依賴關係表
CREATE TABLE task_dependencies (
    id VARCHAR2(36) DEFAULT sys_guid() PRIMARY KEY,
    predecessor_id VARCHAR2(36) NOT NULL,
    successor_id VARCHAR2(36) NOT NULL,
    dependency_type VARCHAR2(20) DEFAULT 'finish_to_start' CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
    lag_days NUMBER(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR2(36),
    CONSTRAINT fk_dependency_predecessor FOREIGN KEY (predecessor_id) REFERENCES tasks(id),
    CONSTRAINT fk_dependency_successor FOREIGN KEY (successor_id) REFERENCES tasks(id),
    CONSTRAINT uk_task_dependency UNIQUE (predecessor_id, successor_id)
);

-- 任務標籤表
CREATE TABLE task_labels (
    id VARCHAR2(36) DEFAULT sys_guid() PRIMARY KEY,
    name VARCHAR2(100) UNIQUE NOT NULL,
    color VARCHAR2(7) DEFAULT '#007bff',
    description CLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR2(36)
);

-- 任務標籤關聯表
CREATE TABLE task_label_associations (
    task_id VARCHAR2(36) NOT NULL,
    label_id VARCHAR2(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR2(36),
    CONSTRAINT pk_task_label PRIMARY KEY (task_id, label_id),
    CONSTRAINT fk_task_label_task FOREIGN KEY (task_id) REFERENCES tasks(id),
    CONSTRAINT fk_task_label_label FOREIGN KEY (label_id) REFERENCES task_labels(id)
);

-- 檔案附件表
CREATE TABLE attachments (
    id VARCHAR2(36) DEFAULT sys_guid() PRIMARY KEY,
    entity_type VARCHAR2(50) NOT NULL,
    entity_id VARCHAR2(36) NOT NULL,
    filename VARCHAR2(255) NOT NULL,
    original_filename VARCHAR2(255) NOT NULL,
    file_path VARCHAR2(500) NOT NULL,
    file_size NUMBER(12),
    mime_type VARCHAR2(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR2(36)
);

-- 評論表
CREATE TABLE comments (
    id VARCHAR2(36) DEFAULT sys_guid() PRIMARY KEY,
    entity_type VARCHAR2(50) NOT NULL,
    entity_id VARCHAR2(36) NOT NULL,
    content CLOB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR2(36),
    updated_by VARCHAR2(36)
);

-- 活動日誌表
CREATE TABLE activity_logs (
    id VARCHAR2(36) DEFAULT sys_guid() PRIMARY KEY,
    entity_type VARCHAR2(50) NOT NULL,
    entity_id VARCHAR2(36) NOT NULL,
    action VARCHAR2(100) NOT NULL,
    old_values CLOB,
    new_values CLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR2(36)
);

-- 系統設定表
CREATE TABLE system_settings (
    key_name VARCHAR2(100) PRIMARY KEY,
    key_value CLOB,
    description CLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR2(36)
);

-- 工作時間記錄表
CREATE TABLE time_entries (
    id VARCHAR2(36) DEFAULT sys_guid() PRIMARY KEY,
    task_id VARCHAR2(36) NOT NULL,
    user_id VARCHAR2(36) NOT NULL,
    description CLOB,
    hours NUMBER(8,2) NOT NULL CHECK (hours > 0),
    entry_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR2(36),
    updated_by VARCHAR2(36),
    CONSTRAINT fk_time_entry_task FOREIGN KEY (task_id) REFERENCES tasks(id),
    CONSTRAINT fk_time_entry_user FOREIGN KEY (user_id) REFERENCES users(id)
);

COMMIT;