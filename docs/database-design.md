# 廠商值班管理系統 - 資料庫設計文件

## 1. 系統架構概述

### 1.1 技術堆疊
- **資料庫**: PostgreSQL 14+
- **後端**: Next.js API Routes
- **ORM**: node-postgres (pg)
- **連線池**: pg-pool
- **資料驗證**: Zod

### 1.2 連線資訊
```env
HOSTNAME=192.168.1.183
DATABASE=app_db  
USERNAME=admin
PASSWORD=XcW04ByX6GbVdt1gw4EJ5XRY
PORT=5432
```

## 2. 資料庫 Schema 設計

### 2.1 廠商表 (vendors)
```sql
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    vendor_type VARCHAR(20) NOT NULL CHECK (vendor_type IN ('承攬商', '供應商', '服務商', '政府單位', '其他')),
    status VARCHAR(20) NOT NULL DEFAULT '正常' CHECK (status IN ('正常', '停用', '暫停', '審查中')),
    contact_person VARCHAR(50),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    address TEXT,
    tax_id VARCHAR(20),
    business_license VARCHAR(50),
    safety_certification JSONB, -- 安全認證資料
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(50),
    updated_by VARCHAR(50)
);

CREATE INDEX idx_vendors_type ON vendors(vendor_type);
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_name ON vendors(name);
```

### 2.2 值班人員表 (duty_persons)
```sql
CREATE TABLE duty_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    position VARCHAR(50) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    extension VARCHAR(10),
    email VARCHAR(100),
    mvpn VARCHAR(20),
    is_primary BOOLEAN DEFAULT FALSE,
    supervisor VARCHAR(50),
    emergency_contact VARCHAR(20),
    special_skills TEXT[], -- 特殊技能陣列
    safety_qualifications TEXT[], -- 安全資格陣列  
    language_requirements TEXT[], -- 語言能力陣列
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_duty_persons_vendor ON duty_persons(vendor_id);
CREATE INDEX idx_duty_persons_mobile ON duty_persons(mobile);
CREATE INDEX idx_duty_persons_name ON duty_persons(name);
CREATE UNIQUE INDEX idx_duty_persons_mobile_active ON duty_persons(mobile) WHERE active = TRUE;
```

### 2.3 班別時間設定表 (shift_times)
```sql
CREATE TABLE shift_times (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_type VARCHAR(10) NOT NULL CHECK (shift_type IN ('日班', '夜班', '全日', '緊急', '加班')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    cross_day BOOLEAN DEFAULT FALSE,
    total_hours DECIMAL(4,2) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_shift_times_type_active ON shift_times(shift_type) WHERE active = TRUE;
```

### 2.4 值班排程主表 (duty_schedules)
```sql
CREATE TABLE duty_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(20) NOT NULL, -- 專案ID
    duty_date DATE NOT NULL,
    shift_type VARCHAR(10) NOT NULL CHECK (shift_type IN ('日班', '夜班', '全日', '緊急', '加班')),
    status VARCHAR(10) NOT NULL DEFAULT '已排班' CHECK (status IN ('已排班', '值班中', '下班', '缺勤', '代班', '取消')),
    
    -- 人員資訊
    person_id UUID NOT NULL REFERENCES duty_persons(id) ON DELETE RESTRICT,
    
    -- 工作區域
    work_area VARCHAR(10) NOT NULL CHECK (work_area IN ('主工區', '辦公區', '倉儲區', '設備區', '安全區', '入口處', '其他')),
    work_location VARCHAR(100),
    
    -- 值班要求
    special_skills_required TEXT[],
    safety_qualifications_required TEXT[],
    language_requirements_required TEXT[],
    
    -- 備註資訊
    notes TEXT,
    special_instructions TEXT,
    urgency_level VARCHAR(10) CHECK (urgency_level IN ('低', '中', '高', '緊急')),
    
    -- 系統欄位
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(50) NOT NULL,
    updated_by VARCHAR(50)
);

CREATE INDEX idx_duty_schedules_project ON duty_schedules(project_id);
CREATE INDEX idx_duty_schedules_date ON duty_schedules(duty_date);
CREATE INDEX idx_duty_schedules_person ON duty_schedules(person_id);
CREATE INDEX idx_duty_schedules_status ON duty_schedules(status);
CREATE INDEX idx_duty_schedules_work_area ON duty_schedules(work_area);
CREATE UNIQUE INDEX idx_duty_schedules_unique ON duty_schedules(project_id, person_id, duty_date, shift_type);
```

### 2.5 代班記錄表 (duty_replacements)
```sql
CREATE TABLE duty_replacements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    duty_schedule_id UUID NOT NULL REFERENCES duty_schedules(id) ON DELETE CASCADE,
    original_person_id UUID NOT NULL REFERENCES duty_persons(id),
    replacement_person_id UUID NOT NULL REFERENCES duty_persons(id),
    reason TEXT NOT NULL,
    approved_by VARCHAR(50),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_duty_replacements_schedule ON duty_replacements(duty_schedule_id);
CREATE INDEX idx_duty_replacements_original ON duty_replacements(original_person_id);
CREATE INDEX idx_duty_replacements_replacement ON duty_replacements(replacement_person_id);
```

### 2.6 簽到退記錄表 (duty_check_ins)
```sql
CREATE TABLE duty_check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    duty_schedule_id UUID NOT NULL REFERENCES duty_schedules(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    actual_hours DECIMAL(4,2),
    gps_location POINT, -- PostgreSQL地理座標類型
    check_in_method VARCHAR(20) DEFAULT '手動' CHECK (check_in_method IN ('手動', '刷卡', 'GPS', 'QR碼')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_duty_check_ins_schedule ON duty_check_ins(duty_schedule_id);
CREATE INDEX idx_duty_check_ins_checkin_time ON duty_check_ins(check_in_time);
```

### 2.7 系統日誌表 (system_logs)
```sql
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    user_id VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_system_logs_table_record ON system_logs(table_name, record_id);
CREATE INDEX idx_system_logs_user ON system_logs(user_id);
CREATE INDEX idx_system_logs_created ON system_logs(created_at);
```

## 3. 初始化數據腳本

### 3.1 預設班別時間設定
```sql
INSERT INTO shift_times (shift_type, start_time, end_time, cross_day, total_hours, description) VALUES
('日班', '08:00', '17:00', FALSE, 9.0, '標準日班時間'),
('夜班', '17:00', '08:00', TRUE, 15.0, '夜班時間(跨日)'),
('全日', '00:00', '24:00', FALSE, 24.0, '24小時全日班'),
('緊急', '00:00', '24:00', FALSE, 24.0, '緊急待命班'),
('加班', '17:00', '20:00', FALSE, 3.0, '延長工時班');
```

### 3.2 建立觸發器函數
```sql
-- 更新時間戳觸發器函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 為相關表格建立觸發器
CREATE TRIGGER update_vendors_updated_at 
    BEFORE UPDATE ON vendors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_duty_persons_updated_at 
    BEFORE UPDATE ON duty_persons 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_duty_schedules_updated_at 
    BEFORE UPDATE ON duty_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.3 建立審計日誌觸發器
```sql
CREATE OR REPLACE FUNCTION log_table_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO system_logs(table_name, record_id, action, old_values, user_id)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), current_setting('app.current_user', true));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO system_logs(table_name, record_id, action, old_values, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), current_setting('app.current_user', true));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO system_logs(table_name, record_id, action, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW), current_setting('app.current_user', true));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 為主要表格建立審計觸發器
CREATE TRIGGER duty_schedules_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON duty_schedules
    FOR EACH ROW EXECUTE FUNCTION log_table_changes();

CREATE TRIGGER duty_persons_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON duty_persons
    FOR EACH ROW EXECUTE FUNCTION log_table_changes();
```

## 4. 查詢優化

### 4.1 常用查詢索引
```sql
-- 複合索引用於常用查詢組合
CREATE INDEX idx_duty_schedules_project_date_status ON duty_schedules(project_id, duty_date, status);
CREATE INDEX idx_duty_schedules_date_shift_area ON duty_schedules(duty_date, shift_type, work_area);
CREATE INDEX idx_duty_persons_vendor_active ON duty_persons(vendor_id, active);
```

### 4.2 分區策略 (可選)
```sql
-- 按年份對值班記錄進行分區（數據量大時使用）
-- CREATE TABLE duty_schedules_y2025 PARTITION OF duty_schedules
-- FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

## 5. 資料安全性

### 5.1 資料備份策略
- 每日自動備份
- 保留30天備份檔案
- 關鍵操作前手動備份

### 5.2 資料存取權限
```sql
-- 建立應用程式專用角色
CREATE ROLE app_user WITH LOGIN PASSWORD 'app_secure_password';
GRANT CONNECT ON DATABASE app_db TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

## 6. 性能指標

### 6.1 預期查詢性能
- 單日值班查詢: < 100ms
- 月度統計查詢: < 500ms
- 複雜篩選查詢: < 1000ms

### 6.2 容量規劃
- 值班記錄：約 50,000 筆/年
- 人員資料：約 1,000 筆
- 廠商資料：約 200 筆