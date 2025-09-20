-- ============================================
-- PCM 專案控制管理系統 - 觸發器和函數腳本
-- ============================================
-- 版本: 1.0.0
-- 建立日期: 2025-01-15
-- 資料庫: PostgreSQL 15+
-- 描述: 建立自動化觸發器和系統函數
-- ============================================

-- ============================================
-- 1. 通用函數定義
-- ============================================
SET search_path TO pcm, public;

-- 更新時間戳函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 審計日誌記錄函數
CREATE OR REPLACE FUNCTION record_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[];
    field_name TEXT;
BEGIN
    -- 準備資料
    IF TG_OP = 'DELETE' THEN
        old_data := row_to_json(OLD)::JSONB;
        new_data := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        old_data := row_to_json(OLD)::JSONB;
        new_data := row_to_json(NEW)::JSONB;
        
        -- 找出變更的欄位
        changed_fields := ARRAY[]::TEXT[];
        FOR field_name IN SELECT * FROM jsonb_object_keys(new_data)
        LOOP
            IF old_data->>field_name IS DISTINCT FROM new_data->>field_name THEN
                changed_fields := array_append(changed_fields, field_name);
            END IF;
        END LOOP;
    ELSE -- INSERT
        old_data := NULL;
        new_data := row_to_json(NEW)::JSONB;
    END IF;

    -- 插入審計日誌
    INSERT INTO audit_logs (
        table_name,
        operation,
        record_id,
        old_values,
        new_values,
        changed_fields,
        user_id,
        created_at
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT
            ELSE NEW.id::TEXT
        END,
        old_data,
        new_data,
        changed_fields,
        CURRENT_SETTING('app.current_user_id', true)::UUID,
        NOW()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 專案進度計算函數
CREATE OR REPLACE FUNCTION calculate_project_progress(p_project_id VARCHAR(20))
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_weight DECIMAL(10,2) := 0;
    completed_weight DECIMAL(10,2) := 0;
    progress DECIMAL(5,2) := 0;
BEGIN
    -- 計算 WBS 項目的權重總和和完成權重
    SELECT 
        COALESCE(SUM(estimated_hours), 0),
        COALESCE(SUM(estimated_hours * completion_percentage / 100), 0)
    INTO total_weight, completed_weight
    FROM wbs_items 
    WHERE project_id = p_project_id 
      AND is_active = true
      AND parent_id IS NULL; -- 只計算根節點項目

    -- 如果沒有 WBS 項目，返回 0
    IF total_weight = 0 THEN
        RETURN 0;
    END IF;

    -- 計算進度百分比
    progress := (completed_weight / total_weight) * 100;
    
    -- 確保進度在 0-100 範圍內
    progress := LEAST(GREATEST(progress, 0), 100);
    
    RETURN progress;
END;
$$ LANGUAGE plpgsql;

-- 用戶最後登入時間更新函數
CREATE OR REPLACE FUNCTION update_user_last_login()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.success = true AND OLD.success IS DISTINCT FROM NEW.success THEN
        UPDATE users 
        SET last_login = NEW.login_time,
            failed_login_attempts = 0,
            locked_until = NULL
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- WBS 層級自動設定函數
CREATE OR REPLACE FUNCTION set_wbs_level()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.level := 1;
    ELSE
        SELECT level + 1 INTO NEW.level
        FROM wbs_items 
        WHERE id = NEW.parent_id;
        
        IF NEW.level IS NULL THEN
            RAISE EXCEPTION '無法找到父級 WBS 項目';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 排班衝突檢查函數
CREATE OR REPLACE FUNCTION check_schedule_conflicts()
RETURNS TRIGGER AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    -- 檢查同一人員同一時段是否已有排班
    SELECT COUNT(*)
    INTO conflict_count
    FROM duty_schedules
    WHERE person_id = NEW.person_id
      AND duty_date = NEW.duty_date
      AND shift_type = NEW.shift_type
      AND is_active = true
      AND status NOT IN ('取消', '請假')
      AND id != COALESCE(NEW.id, uuid_generate_v4()); -- 排除自己

    IF conflict_count > 0 THEN
        RAISE EXCEPTION '該人員在此時段已有排班安排';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 廠商合約到期檢查函數
CREATE OR REPLACE FUNCTION check_vendor_contract()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.contract_end IS NOT NULL AND NEW.contract_end < CURRENT_DATE THEN
        NEW.status := 'terminated';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. 時間戳更新觸發器
-- ============================================

-- 用戶表
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 角色表
DROP TRIGGER IF EXISTS trigger_roles_updated_at ON roles;
CREATE TRIGGER trigger_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 專案表
DROP TRIGGER IF EXISTS trigger_projects_updated_at ON projects;
CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- WBS 項目表
DROP TRIGGER IF EXISTS trigger_wbs_items_updated_at ON wbs_items;
CREATE TRIGGER trigger_wbs_items_updated_at
    BEFORE UPDATE ON wbs_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 專案里程碑表
DROP TRIGGER IF EXISTS trigger_project_milestones_updated_at ON project_milestones;
CREATE TRIGGER trigger_project_milestones_updated_at
    BEFORE UPDATE ON project_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 廠商表
DROP TRIGGER IF EXISTS trigger_vendors_updated_at ON vendors;
CREATE TRIGGER trigger_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 值班人員表
DROP TRIGGER IF EXISTS trigger_duty_persons_updated_at ON duty_persons;
CREATE TRIGGER trigger_duty_persons_updated_at
    BEFORE UPDATE ON duty_persons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 值班排程表
DROP TRIGGER IF EXISTS trigger_duty_schedules_updated_at ON duty_schedules;
CREATE TRIGGER trigger_duty_schedules_updated_at
    BEFORE UPDATE ON duty_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 系統設定表
DROP TRIGGER IF EXISTS trigger_system_settings_updated_at ON system_settings;
CREATE TRIGGER trigger_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. 審計日誌觸發器
-- ============================================

-- 用戶表審計
DROP TRIGGER IF EXISTS trigger_users_audit ON users;
CREATE TRIGGER trigger_users_audit
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION record_audit_log();

-- 角色表審計
DROP TRIGGER IF EXISTS trigger_roles_audit ON roles;
CREATE TRIGGER trigger_roles_audit
    AFTER INSERT OR UPDATE OR DELETE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION record_audit_log();

-- 專案表審計
DROP TRIGGER IF EXISTS trigger_projects_audit ON projects;
CREATE TRIGGER trigger_projects_audit
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION record_audit_log();

-- WBS 項目表審計
DROP TRIGGER IF EXISTS trigger_wbs_items_audit ON wbs_items;
CREATE TRIGGER trigger_wbs_items_audit
    AFTER INSERT OR UPDATE OR DELETE ON wbs_items
    FOR EACH ROW
    EXECUTE FUNCTION record_audit_log();

-- 值班排程表審計
DROP TRIGGER IF EXISTS trigger_duty_schedules_audit ON duty_schedules;
CREATE TRIGGER trigger_duty_schedules_audit
    AFTER INSERT OR UPDATE OR DELETE ON duty_schedules
    FOR EACH ROW
    EXECUTE FUNCTION record_audit_log();

-- ============================================
-- 4. 業務邏輯觸發器
-- ============================================

-- 登入成功時更新用戶最後登入時間
DROP TRIGGER IF EXISTS trigger_login_logs_update_user ON login_logs;
CREATE TRIGGER trigger_login_logs_update_user
    AFTER INSERT OR UPDATE ON login_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_user_last_login();

-- WBS 項目插入時自動設定層級
DROP TRIGGER IF EXISTS trigger_wbs_items_set_level ON wbs_items;
CREATE TRIGGER trigger_wbs_items_set_level
    BEFORE INSERT ON wbs_items
    FOR EACH ROW
    EXECUTE FUNCTION set_wbs_level();

-- 排班衝突檢查
DROP TRIGGER IF EXISTS trigger_duty_schedules_conflict_check ON duty_schedules;
CREATE TRIGGER trigger_duty_schedules_conflict_check
    BEFORE INSERT OR UPDATE ON duty_schedules
    FOR EACH ROW
    EXECUTE FUNCTION check_schedule_conflicts();

-- 廠商合約到期檢查
DROP TRIGGER IF EXISTS trigger_vendors_contract_check ON vendors;
CREATE TRIGGER trigger_vendors_contract_check
    BEFORE INSERT OR UPDATE ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION check_vendor_contract();

-- ============================================
-- 5. 專案進度自動更新觸發器
-- ============================================

-- WBS 項目完成度變更時自動更新專案進度
CREATE OR REPLACE FUNCTION update_project_progress_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- 更新專案進度
    UPDATE projects 
    SET progress = calculate_project_progress(NEW.project_id)
    WHERE id = NEW.project_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_wbs_items_update_project_progress ON wbs_items;
CREATE TRIGGER trigger_wbs_items_update_project_progress
    AFTER INSERT OR UPDATE OF completion_percentage ON wbs_items
    FOR EACH ROW
    EXECUTE FUNCTION update_project_progress_trigger();

-- ============================================
-- 6. 會話清理觸發器
-- ============================================

-- 過期會話自動清理函數
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() - INTERVAL '1 day';
    
    -- 記錄清理數量
    RAISE NOTICE '已清理 % 個過期會話', ROW_COUNT();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. 資料驗證觸發器
-- ============================================

-- 專案日期驗證
CREATE OR REPLACE FUNCTION validate_project_dates()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL AND NEW.start_date > NEW.end_date THEN
        RAISE EXCEPTION '專案開始日期不能晚於結束日期';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_projects_validate_dates ON projects;
CREATE TRIGGER trigger_projects_validate_dates
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION validate_project_dates();

-- WBS 項目日期驗證
CREATE OR REPLACE FUNCTION validate_wbs_dates()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL AND NEW.start_date > NEW.end_date THEN
        RAISE EXCEPTION 'WBS 項目開始日期不能晚於結束日期';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_wbs_items_validate_dates ON wbs_items;
CREATE TRIGGER trigger_wbs_items_validate_dates
    BEFORE INSERT OR UPDATE ON wbs_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_wbs_dates();

-- ============================================
-- 8. 統計資訊更新觸發器
-- ============================================

-- 專案統計更新函數
CREATE OR REPLACE FUNCTION update_project_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- 這裡可以加入統計資訊更新邏輯
    -- 例如更新系統設定中的專案統計資料
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_projects_statistics ON projects;
CREATE TRIGGER trigger_projects_statistics
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_project_statistics();

-- ============================================
-- 9. 安全性觸發器
-- ============================================

-- 防止刪除系統管理員
CREATE OR REPLACE FUNCTION protect_system_admin()
RETURNS TRIGGER AS $$
BEGIN
    -- 檢查是否為系統管理員角色
    IF EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = OLD.id 
          AND r.name = 'system_admin'
    ) THEN
        RAISE EXCEPTION '不能刪除系統管理員用戶';
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_protect_admin ON users;
CREATE TRIGGER trigger_users_protect_admin
    BEFORE DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION protect_system_admin();

-- ============================================
-- 10. 效能監控觸發器
-- ============================================

-- 慢查詢記錄函數
CREATE OR REPLACE FUNCTION log_slow_operations()
RETURNS TRIGGER AS $$
DECLARE
    start_time TIMESTAMP;
    duration INTERVAL;
BEGIN
    start_time := clock_timestamp();
    
    -- 模擬操作時間記錄
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        duration := clock_timestamp() - start_time;
        
        -- 如果操作時間超過 1 秒，記錄到日誌
        IF EXTRACT(EPOCH FROM duration) > 1.0 THEN
            RAISE NOTICE '慢操作檢測: 表 %, 操作 %, 耗時 %', 
                TG_TABLE_NAME, TG_OP, duration;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 11. 觸發器註解
-- ============================================

COMMENT ON FUNCTION update_updated_at_column() IS '自動更新 updated_at 欄位的觸發器函數';
COMMENT ON FUNCTION record_audit_log() IS '記錄審計日誌的觸發器函數';
COMMENT ON FUNCTION calculate_project_progress(VARCHAR) IS '計算專案進度的函數';
COMMENT ON FUNCTION update_user_last_login() IS '更新用戶最後登入時間的函數';
COMMENT ON FUNCTION set_wbs_level() IS '自動設定 WBS 項目層級的函數';
COMMENT ON FUNCTION check_schedule_conflicts() IS '檢查排班衝突的函數';

-- ============================================
-- 完成
-- ============================================