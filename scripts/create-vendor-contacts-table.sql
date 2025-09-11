-- 創建廠商聯絡人表和相關資料
-- 執行前請確保資料庫連線正常

-- 創建職位枚舉類型（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_position') THEN
        CREATE TYPE contact_position AS ENUM (
            'manager',         -- 經理
            'supervisor',      -- 主管 
            'technician',      -- 技術員
            'administrator',   -- 行政人員
            'engineer',        -- 工程師
            'coordinator',     -- 協調員
            'specialist',      -- 專員
            'assistant',       -- 助理
            'director',        -- 主任/處長
            'consultant',      -- 顧問
            'other'            -- 其他
        );
    END IF;
END
$$;

-- 創建聯絡人狀態枚舉類型（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_status') THEN
        CREATE TYPE contact_status AS ENUM (
            'active',     -- 在職
            'inactive',   -- 離職
            'suspended',  -- 暫停
            'retired'     -- 退休
        );
    END IF;
END
$$;

-- 創建廠商聯絡人表
CREATE TABLE IF NOT EXISTS vendor_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    
    -- 基本資訊
    name VARCHAR(100) NOT NULL,                    -- 姓名
    position contact_position NOT NULL DEFAULT 'other', -- 職位
    title VARCHAR(100),                           -- 職稱（自由文字）
    
    -- 聯絡資訊
    phone VARCHAR(50),                            -- 電話
    extension VARCHAR(20),                        -- 分機 (MVPN)
    mobile VARCHAR(50),                           -- 手機
    email VARCHAR(255),                           -- Email
    
    -- 工作資訊
    department VARCHAR(100),                      -- 部門
    supervisor_name VARCHAR(100),                 -- 上班主管
    is_supervisor BOOLEAN DEFAULT FALSE,          -- 是否為主管
    
    -- 狀態與其他
    status contact_status DEFAULT 'active',      -- 狀態
    photo_url TEXT,                              -- 相片URL
    notes TEXT,                                  -- 備註
    
    -- 系統欄位
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_vendor_contacts_vendor_id ON vendor_contacts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_contacts_name ON vendor_contacts(name);
CREATE INDEX IF NOT EXISTS idx_vendor_contacts_status ON vendor_contacts(status);
CREATE INDEX IF NOT EXISTS idx_vendor_contacts_position ON vendor_contacts(position);
CREATE INDEX IF NOT EXISTS idx_vendor_contacts_is_active ON vendor_contacts(is_active);

-- 添加外鍵約束（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_vendor_contacts_vendor_id'
        AND table_name = 'vendor_contacts'
    ) THEN
        ALTER TABLE vendor_contacts 
        ADD CONSTRAINT fk_vendor_contacts_vendor_id 
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 創建更新時間觸發器
CREATE OR REPLACE FUNCTION update_vendor_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_vendor_contacts_updated_at ON vendor_contacts;
CREATE TRIGGER trigger_update_vendor_contacts_updated_at
    BEFORE UPDATE ON vendor_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_contacts_updated_at();

-- 顯示創建結果
SELECT 'vendor_contacts 表創建完成' AS result;