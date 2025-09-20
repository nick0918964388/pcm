-- ============================================
-- 廠商通訊錄更新 - 根據 PCM4.PNG 的欄位需求
-- ============================================

-- 1. 新增廠商聯絡人表 (將聯絡人獨立成一個表，支援多個聯絡人)
CREATE TABLE IF NOT EXISTS vendor_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    
    -- 基本資訊
    name VARCHAR(100) NOT NULL,          -- 姓名
    position VARCHAR(100),               -- 職稱
    department VARCHAR(100),             -- 部門
    
    -- 聯絡方式
    phone VARCHAR(20),                   -- 電話
    extension VARCHAR(10),               -- 分機
    mvpn VARCHAR(20),                    -- MVPN
    email VARCHAR(100),                  -- Email
    
    -- 管理資訊
    supervisor VARCHAR(100),             -- 上線主管
    work_supervisor VARCHAR(100),        -- 上班主管
    
    -- 其他資訊
    photo_url VARCHAR(500),              -- 相片URL
    status VARCHAR(20) DEFAULT 'active', -- 狀態
    is_primary BOOLEAN DEFAULT false,    -- 是否為主要聯絡人
    notes TEXT,                          -- 備註
    
    -- 系統欄位
    display_order INTEGER DEFAULT 0,     -- 顯示順序
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- 約束
    CONSTRAINT chk_contact_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT unique_vendor_primary_contact UNIQUE (vendor_id, is_primary) WHERE is_primary = true
);

-- 2. 更新 vendors 表，新增缺少的欄位
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE,          -- 廠商代碼
ADD COLUMN IF NOT EXISTS short_name VARCHAR(100),          -- 廠商簡稱
ADD COLUMN IF NOT EXISTS unified_number VARCHAR(20),       -- 統一編號
ADD COLUMN IF NOT EXISTS fax VARCHAR(20),                  -- 傳真
ADD COLUMN IF NOT EXISTS website VARCHAR(200),             -- 網站
ADD COLUMN IF NOT EXISTS service_items JSONB,              -- 服務項目
ADD COLUMN IF NOT EXISTS work_areas TEXT[],               -- 工作區域
ADD COLUMN IF NOT EXISTS certification JSONB,              -- 認證資訊
ADD COLUMN IF NOT EXISTS insurance_info JSONB,             -- 保險資訊
ADD COLUMN IF NOT EXISTS bank_info JSONB,                 -- 銀行資訊
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;  -- 顯示順序

-- 3. 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_vendor_contacts_vendor_id ON vendor_contacts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_contacts_is_primary ON vendor_contacts(vendor_id, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_vendor_contacts_status ON vendor_contacts(status);
CREATE INDEX IF NOT EXISTS idx_vendors_code ON vendors(code);
CREATE INDEX IF NOT EXISTS idx_vendors_unified_number ON vendors(unified_number);

-- 4. 建立視圖方便查詢
CREATE OR REPLACE VIEW v_vendor_contact_list AS
SELECT 
    vc.id,
    vc.vendor_id,
    v.code as vendor_code,
    v.name as vendor_name,
    v.type as vendor_type,
    v.status as vendor_status,
    vc.name as contact_name,
    vc.position,
    vc.department,
    vc.phone,
    vc.extension,
    vc.mvpn,
    vc.email,
    vc.supervisor,
    vc.work_supervisor,
    vc.photo_url,
    vc.status as contact_status,
    vc.is_primary,
    vc.notes,
    vc.display_order,
    vc.created_at,
    vc.updated_at
FROM vendor_contacts vc
JOIN vendors v ON vc.vendor_id = v.id
WHERE vc.is_active = true AND v.is_active = true
ORDER BY v.display_order, v.name, vc.display_order, vc.name;

-- 5. 遷移現有資料 (如果有的話)
INSERT INTO vendor_contacts (
    vendor_id,
    name,
    phone,
    email,
    is_primary,
    status
)
SELECT 
    id as vendor_id,
    COALESCE(contact_person, '預設聯絡人') as name,
    phone,
    email,
    true as is_primary,
    CASE 
        WHEN status = 'active' THEN 'active'
        ELSE 'inactive'
    END as status
FROM vendors
WHERE contact_person IS NOT NULL OR phone IS NOT NULL OR email IS NOT NULL
ON CONFLICT DO NOTHING;

-- 6. 建立觸發器自動更新 updated_at
CREATE OR REPLACE FUNCTION update_vendor_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vendor_contacts_updated_at
    BEFORE UPDATE ON vendor_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_contacts_updated_at();

-- 7. 註解說明
COMMENT ON TABLE vendor_contacts IS '廠商聯絡人表';
COMMENT ON COLUMN vendor_contacts.name IS '聯絡人姓名';
COMMENT ON COLUMN vendor_contacts.position IS '職稱';
COMMENT ON COLUMN vendor_contacts.department IS '部門';
COMMENT ON COLUMN vendor_contacts.phone IS '電話';
COMMENT ON COLUMN vendor_contacts.extension IS '分機';
COMMENT ON COLUMN vendor_contacts.mvpn IS 'MVPN號碼';
COMMENT ON COLUMN vendor_contacts.email IS '電子郵件';
COMMENT ON COLUMN vendor_contacts.supervisor IS '上線主管';
COMMENT ON COLUMN vendor_contacts.work_supervisor IS '上班主管';
COMMENT ON COLUMN vendor_contacts.photo_url IS '相片URL';
COMMENT ON COLUMN vendor_contacts.is_primary IS '是否為主要聯絡人';

COMMENT ON COLUMN vendors.code IS '廠商代碼';
COMMENT ON COLUMN vendors.short_name IS '廠商簡稱';
COMMENT ON COLUMN vendors.unified_number IS '統一編號';
COMMENT ON COLUMN vendors.fax IS '傳真號碼';
COMMENT ON COLUMN vendors.website IS '公司網站';
COMMENT ON COLUMN vendors.service_items IS '服務項目';
COMMENT ON COLUMN vendors.work_areas IS '工作區域';
COMMENT ON COLUMN vendors.certification IS '認證資訊';
COMMENT ON COLUMN vendors.insurance_info IS '保險資訊';
COMMENT ON COLUMN vendors.bank_info IS '銀行資訊';

-- 8. 插入測試資料 (根據 pcm4.png 的範例)
INSERT INTO vendors (code, name, type, status, unified_number) VALUES
('V001', '盛群電', 'maintenance', 'active', '23456789'),
('V002', '聯動工程師', 'engineering', 'active', '34567890'),
('V003', '明銓工程師', 'engineering', 'active', '45678901'),
('V004', '明昌工程師', 'engineering', 'active', '56789012'),
('V005', '明鈺工程師', 'engineering', 'active', '67890123'),
('V006', '豐力工程師', 'engineering', 'active', '78901234'),
('V007', '吉城', 'other', 'active', '89012345'),
('V008', '明鈺外牆', 'construction', 'active', '90123456'),
('V009', '聖佶', 'other', 'active', '01234567'),
('V010', '駿陽', 'other', 'active', '12345678')
ON CONFLICT (code) DO NOTHING;

-- 插入聯絡人資料
INSERT INTO vendor_contacts (vendor_id, name, position, phone, extension, mvpn, email, supervisor, is_primary) 
SELECT 
    v.id,
    CASE v.code
        WHEN 'V001' THEN '高嘉堂'
        WHEN 'V002' THEN '李雲嘉'
        WHEN 'V003' THEN '范嘉昌'
        WHEN 'V004' THEN '何志文'
        WHEN 'V005' THEN '周嘉章'
        WHEN 'V006' THEN '吳昇民'
        WHEN 'V007' THEN '盧嘉芬'
        WHEN 'V008' THEN '李文達'
        WHEN 'V009' THEN '許建民'
        WHEN 'V010' THEN '鄧曉冬'
    END as name,
    '工程師' as position,
    CASE v.code
        WHEN 'V001' THEN '0919-225902'
        WHEN 'V002' THEN '0928-578938'
        WHEN 'V003' THEN '0937-821073'
        WHEN 'V004' THEN '0978-275361'
        WHEN 'V005' THEN '0974-102382'
        WHEN 'V006' THEN '0905-260924'
        WHEN 'V007' THEN '0974-103423'
        WHEN 'V008' THEN '0965-039617'
        WHEN 'V009' THEN '0937-821091'
        WHEN 'V010' THEN '0919-367002'
    END as phone,
    NULL as extension,
    CASE v.code
        WHEN 'V001' THEN '766-9393'
        WHEN 'V002' THEN '762-4132'
        WHEN 'V003' THEN '762-0075'
        WHEN 'V004' THEN '744-0266'
        WHEN 'V005' THEN '789-7455'
        WHEN 'V006' THEN '763-4554'
        WHEN 'V007' THEN '789-7449'
        WHEN 'V008' THEN '763-7888'
        WHEN 'V009' THEN '762-0126'
        WHEN 'V010' THEN '741-3364'
    END as mvpn,
    CASE v.code
        WHEN 'V001' THEN 'F9150390@ndr1.ypro.com.tw'
        WHEN 'V002' THEN 'Q2497180@ndr1.ypro.com.tw'
        WHEN 'V003' THEN 'K2682990@ndr1.ypro.com.tw'
        WHEN 'V004' THEN 'F8562120@ndr1.ypro.com.tw'
        WHEN 'V005' THEN 'C3860600@ndr1.ypro.com.tw'
        WHEN 'V006' THEN 'J2400520@ndr1.ypro.com.tw'
        WHEN 'V007' THEN 'C2690500@ndr1.ypro.com.tw'
        WHEN 'V008' THEN 'K411652J@ndr1.ypro.com.tw'
        WHEN 'V009' THEN 'Q9068170@ndr1.ypro.com.tw'
        WHEN 'V010' THEN 'L1609290@ndr1.ypro.com.tw'
    END as email,
    CASE v.code
        WHEN 'V001' THEN '吳嘉平'
        WHEN 'V002' THEN '吳嘉平'
        WHEN 'V003' THEN '吳嘉平'
        WHEN 'V004' THEN '莊志嘉'
        WHEN 'V005' THEN '莊志嘉'
        WHEN 'V006' THEN '吳嘉平'
        WHEN 'V007' THEN '吳嘉平'
        WHEN 'V008' THEN '莊志嘉'
        WHEN 'V009' THEN '吳嘉平'
        WHEN 'V010' THEN '吳嘉平'
    END as supervisor,
    true as is_primary
FROM vendors v
WHERE v.code IN ('V001', 'V002', 'V003', 'V004', 'V005', 'V006', 'V007', 'V008', 'V009', 'V010')
ON CONFLICT DO NOTHING;