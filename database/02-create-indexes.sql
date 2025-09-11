-- ============================================
-- PCM 專案控制管理系統 - 索引建立腳本
-- ============================================
-- 版本: 1.0.0
-- 建立日期: 2025-01-15
-- 資料庫: PostgreSQL 15+
-- 描述: 建立效能優化索引和額外約束
-- ============================================

-- ============================================
-- 1. 用戶認證相關索引
-- ============================================
SET search_path TO pcm, public;
-- 用戶表索引
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_users_username ON users(username);
CREATE INDEX CONCURRENTLY idx_users_is_active ON users(is_active);
CREATE INDEX CONCURRENTLY idx_users_created_at ON users(created_at);
CREATE INDEX CONCURRENTLY idx_users_last_login ON users(last_login);
CREATE INDEX CONCURRENTLY idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;

-- 角色表索引
CREATE INDEX CONCURRENTLY idx_roles_name ON roles(name);
CREATE INDEX CONCURRENTLY idx_roles_is_active ON roles(is_active);

-- 用戶角色關聯表索引
CREATE INDEX CONCURRENTLY idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX CONCURRENTLY idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX CONCURRENTLY idx_user_roles_assigned_at ON user_roles(assigned_at);

-- 用戶會話表索引
CREATE INDEX CONCURRENTLY idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX CONCURRENTLY idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX CONCURRENTLY idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX CONCURRENTLY idx_user_sessions_last_activity ON user_sessions(last_activity);

-- 登入日誌表索引
CREATE INDEX CONCURRENTLY idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX CONCURRENTLY idx_login_logs_login_time ON login_logs(login_time);
CREATE INDEX CONCURRENTLY idx_login_logs_ip_address ON login_logs(ip_address);
CREATE INDEX CONCURRENTLY idx_login_logs_success ON login_logs(success);

-- ============================================
-- 2. 專案管理相關索引
-- ============================================

-- 專案表索引
CREATE INDEX CONCURRENTLY idx_projects_status ON projects(status);
CREATE INDEX CONCURRENTLY idx_projects_type ON projects(type);
CREATE INDEX CONCURRENTLY idx_projects_manager_id ON projects(manager_id);
CREATE INDEX CONCURRENTLY idx_projects_start_date ON projects(start_date);
CREATE INDEX CONCURRENTLY idx_projects_end_date ON projects(end_date);
CREATE INDEX CONCURRENTLY idx_projects_created_at ON projects(created_at);
CREATE INDEX CONCURRENTLY idx_projects_is_active ON projects(is_active);
CREATE INDEX CONCURRENTLY idx_projects_priority ON projects(priority);

-- 專案成員表索引
CREATE INDEX CONCURRENTLY idx_project_members_project_id ON project_members(project_id);
CREATE INDEX CONCURRENTLY idx_project_members_user_id ON project_members(user_id);
CREATE INDEX CONCURRENTLY idx_project_members_role ON project_members(role);
CREATE INDEX CONCURRENTLY idx_project_members_is_active ON project_members(is_active);

-- WBS 項目表索引
CREATE INDEX CONCURRENTLY idx_wbs_items_project_id ON wbs_items(project_id);
CREATE INDEX CONCURRENTLY idx_wbs_items_parent_id ON wbs_items(parent_id);
CREATE INDEX CONCURRENTLY idx_wbs_items_wbs_code ON wbs_items(wbs_code);
CREATE INDEX CONCURRENTLY idx_wbs_items_status ON wbs_items(status);
CREATE INDEX CONCURRENTLY idx_wbs_items_priority ON wbs_items(priority);
CREATE INDEX CONCURRENTLY idx_wbs_items_assigned_to ON wbs_items(assigned_to);
CREATE INDEX CONCURRENTLY idx_wbs_items_level ON wbs_items(level);
CREATE INDEX CONCURRENTLY idx_wbs_items_start_date ON wbs_items(start_date);
CREATE INDEX CONCURRENTLY idx_wbs_items_end_date ON wbs_items(end_date);
CREATE INDEX CONCURRENTLY idx_wbs_items_is_active ON wbs_items(is_active);

-- 複合索引 - WBS 階層查詢優化
CREATE INDEX CONCURRENTLY idx_wbs_items_project_parent ON wbs_items(project_id, parent_id);
CREATE INDEX CONCURRENTLY idx_wbs_items_project_level ON wbs_items(project_id, level);

-- 專案里程碑表索引
CREATE INDEX CONCURRENTLY idx_project_milestones_project_id ON project_milestones(project_id);
CREATE INDEX CONCURRENTLY idx_project_milestones_target_date ON project_milestones(target_date);
CREATE INDEX CONCURRENTLY idx_project_milestones_actual_date ON project_milestones(actual_date);
CREATE INDEX CONCURRENTLY idx_project_milestones_status ON project_milestones(status);
CREATE INDEX CONCURRENTLY idx_project_milestones_importance ON project_milestones(importance);
CREATE INDEX CONCURRENTLY idx_project_milestones_is_active ON project_milestones(is_active);

-- ============================================
-- 3. 廠商排班相關索引
-- ============================================

-- 廠商表索引
CREATE INDEX CONCURRENTLY idx_vendors_type ON vendors(type);
CREATE INDEX CONCURRENTLY idx_vendors_status ON vendors(status);
CREATE INDEX CONCURRENTLY idx_vendors_is_active ON vendors(is_active);
CREATE INDEX CONCURRENTLY idx_vendors_contract_start ON vendors(contract_start);
CREATE INDEX CONCURRENTLY idx_vendors_contract_end ON vendors(contract_end);
CREATE INDEX CONCURRENTLY idx_vendors_rating ON vendors(rating);

-- 值班人員表索引
CREATE INDEX CONCURRENTLY idx_duty_persons_vendor_id ON duty_persons(vendor_id);
CREATE INDEX CONCURRENTLY idx_duty_persons_employee_id ON duty_persons(employee_id);
CREATE INDEX CONCURRENTLY idx_duty_persons_is_active ON duty_persons(is_active);
CREATE INDEX CONCURRENTLY idx_duty_persons_rating ON duty_persons(rating);

-- 值班排程表索引
CREATE INDEX CONCURRENTLY idx_duty_schedules_project_id ON duty_schedules(project_id);
CREATE INDEX CONCURRENTLY idx_duty_schedules_person_id ON duty_schedules(person_id);
CREATE INDEX CONCURRENTLY idx_duty_schedules_duty_date ON duty_schedules(duty_date);
CREATE INDEX CONCURRENTLY idx_duty_schedules_shift_type ON duty_schedules(shift_type);
CREATE INDEX CONCURRENTLY idx_duty_schedules_status ON duty_schedules(status);
CREATE INDEX CONCURRENTLY idx_duty_schedules_urgency_level ON duty_schedules(urgency_level);
CREATE INDEX CONCURRENTLY idx_duty_schedules_work_area ON duty_schedules(work_area);
CREATE INDEX CONCURRENTLY idx_duty_schedules_replacement_person_id ON duty_schedules(replacement_person_id);
CREATE INDEX CONCURRENTLY idx_duty_schedules_is_active ON duty_schedules(is_active);

-- 複合索引 - 排班查詢優化
CREATE INDEX CONCURRENTLY idx_duty_schedules_date_shift ON duty_schedules(duty_date, shift_type);
CREATE INDEX CONCURRENTLY idx_duty_schedules_person_date ON duty_schedules(person_id, duty_date);
CREATE INDEX CONCURRENTLY idx_duty_schedules_project_date ON duty_schedules(project_id, duty_date);
CREATE INDEX CONCURRENTLY idx_duty_schedules_area_date ON duty_schedules(work_area, duty_date);

-- ============================================
-- 4. 審計和系統相關索引
-- ============================================

-- 審計日誌表索引
CREATE INDEX CONCURRENTLY idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX CONCURRENTLY idx_audit_logs_operation ON audit_logs(operation);
CREATE INDEX CONCURRENTLY idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX CONCURRENTLY idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX CONCURRENTLY idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX CONCURRENTLY idx_audit_logs_ip_address ON audit_logs(ip_address);

-- 複合索引 - 審計查詢優化
CREATE INDEX CONCURRENTLY idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX CONCURRENTLY idx_audit_logs_user_time ON audit_logs(user_id, created_at);

-- 系統設定表索引
CREATE INDEX CONCURRENTLY idx_system_settings_key ON system_settings(key);
CREATE INDEX CONCURRENTLY idx_system_settings_category ON system_settings(category);
CREATE INDEX CONCURRENTLY idx_system_settings_is_public ON system_settings(is_public);

-- ============================================
-- 5. JSONB 欄位索引 (GIN 索引)
-- ============================================

-- 角色權限 JSONB 索引
CREATE INDEX CONCURRENTLY idx_roles_permissions_gin ON roles USING GIN(permissions);

-- 專案客戶資訊和元資料索引
CREATE INDEX CONCURRENTLY idx_projects_client_info_gin ON projects USING GIN(client_info);
CREATE INDEX CONCURRENTLY idx_projects_metadata_gin ON projects USING GIN(metadata);

-- WBS 依賴關係和元資料索引
CREATE INDEX CONCURRENTLY idx_wbs_items_dependencies_gin ON wbs_items USING GIN(dependencies);
CREATE INDEX CONCURRENTLY idx_wbs_items_metadata_gin ON wbs_items USING GIN(metadata);

-- 專案里程碑交付項目索引
CREATE INDEX CONCURRENTLY idx_project_milestones_deliverables_gin ON project_milestones USING GIN(deliverables);

-- 廠商和值班人員元資料索引
CREATE INDEX CONCURRENTLY idx_vendors_metadata_gin ON vendors USING GIN(metadata);
CREATE INDEX CONCURRENTLY idx_duty_persons_skills_gin ON duty_persons USING GIN(skills);
CREATE INDEX CONCURRENTLY idx_duty_persons_availability_gin ON duty_persons USING GIN(availability);
CREATE INDEX CONCURRENTLY idx_duty_persons_metadata_gin ON duty_persons USING GIN(metadata);

-- 值班排程元資料索引
CREATE INDEX CONCURRENTLY idx_duty_schedules_metadata_gin ON duty_schedules USING GIN(metadata);

-- 系統設定值索引
CREATE INDEX CONCURRENTLY idx_system_settings_value_gin ON system_settings USING GIN(value);

-- ============================================
-- 6. 部分索引 (條件索引)
-- ============================================

-- 只為活躍用戶建立索引
CREATE INDEX CONCURRENTLY idx_users_active_email ON users(email) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_users_active_username ON users(username) WHERE is_active = true;

-- 只為進行中的專案建立索引
CREATE INDEX CONCURRENTLY idx_projects_active ON projects(status, priority) WHERE is_active = true AND status = 'active';

-- 只為未完成的 WBS 項目建立索引
CREATE INDEX CONCURRENTLY idx_wbs_items_incomplete ON wbs_items(project_id, status, priority) 
    WHERE is_active = true AND status IN ('not_started', 'in_progress', 'on_hold');

-- 只為當日和未來的排班建立索引
CREATE INDEX CONCURRENTLY idx_duty_schedules_current ON duty_schedules(duty_date, shift_type, status) 
    WHERE is_active = true AND duty_date >= CURRENT_DATE;

-- 只為成功登入建立索引
CREATE INDEX CONCURRENTLY idx_login_logs_success_recent ON login_logs(user_id, login_time) 
    WHERE success = true AND login_time >= CURRENT_DATE - INTERVAL '30 days';

-- ============================================
-- 7. 文字搜尋索引
-- ============================================

-- 專案名稱和描述全文搜尋索引
CREATE INDEX CONCURRENTLY idx_projects_search ON projects USING GIN(
    to_tsvector('english', 
        COALESCE(name, '') || ' ' || COALESCE(description, '')
    )
);

-- WBS 項目名稱和描述全文搜尋索引
CREATE INDEX CONCURRENTLY idx_wbs_items_search ON wbs_items USING GIN(
    to_tsvector('english', 
        COALESCE(name, '') || ' ' || COALESCE(description, '')
    )
);

-- 廠商名稱搜尋索引
CREATE INDEX CONCURRENTLY idx_vendors_search ON vendors USING GIN(
    to_tsvector('english', 
        COALESCE(name, '') || ' ' || COALESCE(contact_person, '')
    )
);

-- ============================================
-- 8. 唯一約束索引
-- ============================================

-- 確保 WBS 代碼在專案內唯一
CREATE UNIQUE INDEX CONCURRENTLY idx_wbs_items_project_code_unique 
    ON wbs_items(project_id, wbs_code) WHERE is_active = true;

-- 確保每個專案的員工不重複
CREATE UNIQUE INDEX CONCURRENTLY idx_project_members_project_user_unique 
    ON project_members(project_id, user_id) WHERE is_active = true;

-- 確保同一人員同一時段不重複排班
CREATE UNIQUE INDEX CONCURRENTLY idx_duty_schedules_person_time_unique 
    ON duty_schedules(person_id, duty_date, shift_type) WHERE is_active = true AND status != '取消';

-- ============================================
-- 9. 統計資訊更新
-- ============================================

-- 更新表統計資訊
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
ANALYZE audit_logs;
ANALYZE system_settings;

-- ============================================
-- 10. 註解說明
-- ============================================

-- 索引註解
COMMENT ON INDEX idx_users_email IS '用戶電子郵件索引，用於登入查詢';
COMMENT ON INDEX idx_projects_status IS '專案狀態索引，用於專案清單篩選';
COMMENT ON INDEX idx_wbs_items_project_parent IS '複合索引，用於 WBS 階層查詢';
COMMENT ON INDEX idx_duty_schedules_date_shift IS '複合索引，用於排班查詢優化';
COMMENT ON INDEX idx_projects_search IS '專案全文搜尋索引';

-- ============================================
-- 完成
-- ============================================