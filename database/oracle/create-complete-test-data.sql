-- 完整測試資料腳本
-- 包含專案、廠商、聯絡人、照片相簿等所有測試資料

-- ============================================
-- 1. 建立專案測試資料
-- ============================================

-- 檢查並建立 projects 表
DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM user_tables WHERE table_name = 'PROJECTS';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE 'CREATE TABLE projects (
            id VARCHAR2(20) PRIMARY KEY,
            name VARCHAR2(255) NOT NULL,
            description CLOB,
            status VARCHAR2(20) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active NUMBER(1) DEFAULT 1,
            start_date DATE,
            end_date DATE,
            budget NUMBER(15,2),
            progress NUMBER(5,2) DEFAULT 0,
            project_manager VARCHAR2(100),
            location VARCHAR2(255)
        )';
        DBMS_OUTPUT.PUT_LINE('已建立 projects 表');
    END IF;
END;
/

-- 清空並插入專案資料
DELETE FROM projects;

INSERT INTO projects (id, name, description, status, start_date, end_date, budget, progress, project_manager, location) VALUES
('proj001', 'FAB20 Phase1 專案', '半導體廠建設專案第一期，包含主體建築及基礎設施', 'active', DATE '2024-01-01', DATE '2025-12-31', 50000000000, 65.00, '王建民', '台南科學園區');

INSERT INTO projects (id, name, description, status, start_date, end_date, budget, progress, project_manager, location) VALUES
('proj002', 'FAB21 Phase2 專案', '廠房擴建專案，增加生產線設備及配套設施', 'active', DATE '2024-06-01', DATE '2026-05-31', 75000000000, 25.00, '李美玲', '新竹科學園區');

INSERT INTO projects (id, name, description, status, start_date, end_date, budget, progress, project_manager, location) VALUES
('proj003', 'FAB22 Phase3 專案', '智慧工廠建設專案，整合IoT和AI技術', 'completed', DATE '2023-03-01', DATE '2024-02-29', 30000000000, 100.00, '陳志豪', '高雄科學園區');

INSERT INTO projects (id, name, description, status, start_date, end_date, budget, progress, project_manager, location) VALUES
('proj004', 'AP8 潔淨室專案', '無塵室建設與環境控制系統', 'active', DATE '2024-09-01', DATE '2025-08-31', 25000000000, 15.00, '張雅琴', '竹北生醫園區');

INSERT INTO projects (id, name, description, status, start_date, end_date, budget, progress, project_manager, location) VALUES
('proj005', 'F18 設備安裝專案', '精密製程設備安裝與調校', 'planning', DATE '2025-01-01', DATE '2025-10-31', 18000000000, 5.00, '劉志明', '台中科學園區');

COMMIT;

-- ============================================
-- 2. 建立廠商測試資料
-- ============================================

-- 檢查並建立 vendors 表
DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM user_tables WHERE table_name = 'VENDORS';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE 'CREATE TABLE vendors (
            id VARCHAR2(20) PRIMARY KEY,
            code VARCHAR2(50) NOT NULL UNIQUE,
            name VARCHAR2(255) NOT NULL,
            type VARCHAR2(100),
            status VARCHAR2(20) DEFAULT 'active',
            address CLOB,
            phone VARCHAR2(50),
            email VARCHAR2(255),
            tax_id VARCHAR2(20),
            contact_person VARCHAR2(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            notes CLOB
        )';
        DBMS_OUTPUT.PUT_LINE('已建立 vendors 表');
    END IF;
END;
/

-- 清空並插入廠商資料
DELETE FROM vendors;

INSERT INTO vendors (id, code, name, type, status, address, phone, email, tax_id, contact_person, notes) VALUES
('vendor001', 'TSC001', '台積建設股份有限公司', '營造工程', 'active', '台北市信義區信義路五段7號', '02-8101-5678', 'contact@tsmc-const.com', '12345678', '陳建國', '主要承包商，負責廠房主體建設');

INSERT INTO vendors (id, code, name, type, status, address, phone, email, tax_id, contact_person, notes) VALUES
('vendor002', 'AE002', '日月光設備工程有限公司', '機電工程', 'active', '高雄市楠梓區加昌路123號', '07-3612-9999', 'service@ase-eng.com', '23456789', '林志偉', '專業機電設備安裝廠商');

INSERT INTO vendors (id, code, name, type, status, address, phone, email, tax_id, contact_person, notes) VALUES
('vendor003', 'HTC003', '宏達電環控股份有限公司', '空調工程', 'active', '桃園市龜山區文青路100號', '03-3906-1234', 'info@htc-hvac.com', '34567890', '王美華', '無塵室環控系統專家');

INSERT INTO vendors (id, code, name, type, status, address, phone, email, tax_id, contact_person, notes) VALUES
('vendor004', 'FX004', '富士康自動化科技', '自動化設備', 'active', '新北市土城區中央路二段99號', '02-2268-3456', 'auto@foxconn.com', '45678901', '張志明', '生產線自動化設備供應商');

INSERT INTO vendors (id, code, name, type, status, address, phone, email, tax_id, contact_person, notes) VALUES
('vendor005', 'SC005', '上銀科技股份有限公司', '精密機械', 'active', '台中市大甲區順帆路123號', '04-2681-8888', 'sales@hiwin.tw', '56789012', '李淑芬', '線性滑軌與精密傳動元件');

INSERT INTO vendors (id, code, name, type, status, address, phone, email, tax_id, contact_person, notes) VALUES
('vendor006', 'DE006', '達方電子股份有限公司', '電子工程', 'active', '桃園市蘆竹區南崁路一段88號', '03-3119-9999', 'contact@darfon.com', '67890123', '黃建志', '電子控制系統整合');

INSERT INTO vendors (id, code, name, type, status, address, phone, email, tax_id, contact_person, notes) VALUES
('vendor007', 'WS007', '偉詮電子工業股份有限公司', '半導體設備', 'active', '新竹市東區園區二路201號', '03-5789-0123', 'support@weltrend.com', '78901234', '吳雅玲', '晶圓製程設備供應商');

INSERT INTO vendors (id, code, name, type, status, address, phone, email, tax_id, contact_person, notes) VALUES
('vendor008', 'CL008', '中磊電子股份有限公司', '通訊設備', 'active', '新北市中和區建一路166號', '02-6606-0888', 'info@zyxel.com.tw', '89012345', '鄭明輝', '廠區通訊網路建置');

INSERT INTO vendors (id, code, name, type, status, address, phone, email, tax_id, contact_person, notes) VALUES
('vendor009', 'GW009', '廣達電腦股份有限公司', 'IT設備', 'suspended', '桃園市龜山區文化一路211號', '03-327-0000', 'service@quanta.com.tw', '90123456', '劉建德', '暫停合作，設備品質問題');

INSERT INTO vendors (id, code, name, type, status, address, phone, email, tax_id, contact_person, notes) VALUES
('vendor010', 'MT010', '明泰科技股份有限公司', '網路設備', 'active', '新北市汐止區新台五路一段188號', '02-2698-2888', 'sales@alpha.com.tw', '01234567', '許美玲', '廠區網路基礎建設');

COMMIT;

-- ============================================
-- 3. 建立聯絡人測試資料
-- ============================================

-- 檢查並建立 contacts 表
DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM user_tables WHERE table_name = 'CONTACTS';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE 'CREATE TABLE contacts (
            id VARCHAR2(20) PRIMARY KEY,
            vendor_id VARCHAR2(20) NOT NULL,
            name VARCHAR2(100) NOT NULL,
            title VARCHAR2(100),
            department VARCHAR2(100),
            phone VARCHAR2(50),
            mobile VARCHAR2(50),
            email VARCHAR2(255),
            is_primary NUMBER(1) DEFAULT 0,
            status VARCHAR2(20) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            notes CLOB,
            CONSTRAINT fk_contacts_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id)
        )';
        DBMS_OUTPUT.PUT_LINE('已建立 contacts 表');
    END IF;
END;
/

-- 清空並插入聯絡人資料
DELETE FROM contacts;

-- 台積建設聯絡人
INSERT INTO contacts (id, vendor_id, name, title, department, phone, mobile, email, is_primary, notes) VALUES
('contact001', 'vendor001', '陳建國', '專案經理', '工程部', '02-8101-5678', '0912-345-678', 'chen.jg@tsmc-const.com', 1, '主要聯絡窗口，負責整體專案協調');

INSERT INTO contacts (id, vendor_id, name, title, department, phone, mobile, email, is_primary, notes) VALUES
('contact002', 'vendor001', '林志偉', '施工主任', '工程部', '02-8101-5679', '0923-456-789', 'lin.zw@tsmc-const.com', 0, '現場施工負責人');

INSERT INTO contacts (id, vendor_id, name, title, department, phone, mobile, email, is_primary, notes) VALUES
('contact003', 'vendor001', '張美玲', '品管經理', '品質部', '02-8101-5680', '0934-567-890', 'zhang.ml@tsmc-const.com', 0, '品質控制與檢驗');

-- 日月光設備工程聯絡人
INSERT INTO contacts (id, vendor_id, name, title, department, phone, mobile, email, is_primary, notes) VALUES
('contact004', 'vendor002', '林志偉', '技術經理', '技術部', '07-3612-9999', '0945-678-901', 'lin.zw@ase-eng.com', 1, '技術支援主要窗口');

INSERT INTO contacts (id, vendor_id, name, title, department, phone, mobile, email, is_primary, notes) VALUES
('contact005', 'vendor002', '王建明', '安裝主管', '安裝部', '07-3612-9998', '0956-789-012', 'wang.jm@ase-eng.com', 0, '設備安裝負責人');

-- 宏達電環控聯絡人
INSERT INTO contacts (id, vendor_id, name, title, department, phone, mobile, email, is_primary, notes) VALUES
('contact006', 'vendor003', '王美華', '專案經理', '專案部', '03-3906-1234', '0967-890-123', 'wang.mh@htc-hvac.com', 1, '環控系統專案負責人');

INSERT INTO contacts (id, vendor_id, name, title, department, phone, mobile, email, is_primary, notes) VALUES
('contact007', 'vendor003', '陳志豪', '技術工程師', '技術部', '03-3906-1235', '0978-901-234', 'chen.zh@htc-hvac.com', 0, '技術問題諮詢');

-- 富士康自動化聯絡人
INSERT INTO contacts (id, vendor_id, name, title, department, phone, mobile, email, is_primary, notes) VALUES
('contact008', 'vendor004', '張志明', '業務經理', '業務部', '02-2268-3456', '0989-012-345', 'zhang.zm@foxconn.com', 1, '業務洽談主要窗口');

INSERT INTO contacts (id, vendor_id, name, title, department, phone, mobile, email, is_primary, notes) VALUES
('contact009', 'vendor004', '劉淑芬', '系統工程師', '技術部', '02-2268-3457', '0990-123-456', 'liu.sf@foxconn.com', 0, '自動化系統技術支援');

-- 上銀科技聯絡人
INSERT INTO contacts (id, vendor_id, name, title, department, phone, mobile, email, is_primary, notes) VALUES
('contact010', 'vendor005', '李淑芬', '專案經理', '專案部', '04-2681-8888', '0901-234-567', 'li.sf@hiwin.tw', 1, '精密機械專案負責人');

-- 達方電子聯絡人
INSERT INTO contacts (id, vendor_id, name, title, department, phone, mobile, email, is_primary, notes) VALUES
('contact011', 'vendor006', '黃建志', '技術經理', '技術部', '03-3119-9999', '0912-345-678', 'huang.jz@darfon.com', 1, '電子控制系統技術負責人');

-- 偉詮電子聯絡人
INSERT INTO contacts (id, vendor_id, name, title, department, phone, mobile, email, is_primary, notes) VALUES
('contact012', 'vendor007', '吳雅玲', '業務主管', '業務部', '03-5789-0123', '0923-456-789', 'wu.yl@weltrend.com', 1, '半導體設備業務窗口');

-- 中磊電子聯絡人
INSERT INTO contacts (id, vendor_id, name, title, department, phone, mobile, email, is_primary, notes) VALUES
('contact013', 'vendor008', '鄭明輝', '網路工程師', '技術部', '02-6606-0888', '0934-567-890', 'zheng.mh@zyxel.com.tw', 1, '通訊網路建置技術負責人');

-- 廣達電腦聯絡人
INSERT INTO contacts (id, vendor_id, name, title, department, phone, mobile, email, is_primary, notes) VALUES
('contact014', 'vendor009', '劉建德', '客服經理', '客服部', '03-327-0000', '0945-678-901', 'liu.jd@quanta.com.tw', 1, '暫停合作中，僅保留聯絡資訊');

-- 明泰科技聯絡人
INSERT INTO contacts (id, vendor_id, name, title, department, phone, mobile, email, is_primary, notes) VALUES
('contact015', 'vendor010', '許美玲', '專案經理', '專案部', '02-2698-2888', '0956-789-012', 'xu.ml@alpha.com.tw', 1, '網路基礎建設專案負責人');

COMMIT;

-- ============================================
-- 4. 建立照片相簿測試資料
-- ============================================

-- 檢查並建立照片相關表格
DECLARE
    v_count NUMBER;
BEGIN
    -- 檢查 photo_albums 表
    SELECT COUNT(*) INTO v_count FROM user_tables WHERE table_name = 'PHOTO_ALBUMS';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE 'CREATE TABLE photo_albums (
            id VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
            project_id VARCHAR2(20) NOT NULL,
            name VARCHAR2(255) NOT NULL,
            description CLOB,
            cover_photo_id VARCHAR2(36),
            photo_count NUMBER(10) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP,
            created_by VARCHAR2(36),
            CONSTRAINT fk_albums_project FOREIGN KEY (project_id) REFERENCES projects(id)
        )';
        DBMS_OUTPUT.PUT_LINE('已建立 photo_albums 表');
    END IF;

    -- 檢查 photos 表
    SELECT COUNT(*) INTO v_count FROM user_tables WHERE table_name = 'PHOTOS';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE 'CREATE TABLE photos (
            id VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
            album_id VARCHAR2(36) NOT NULL,
            file_name VARCHAR2(255) NOT NULL,
            file_path CLOB NOT NULL,
            file_size NUMBER(19) NOT NULL,
            mime_type VARCHAR2(100) NOT NULL,
            width NUMBER(10),
            height NUMBER(10),
            thumbnail_path CLOB,
            uploaded_by VARCHAR2(36) NOT NULL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            upload_status VARCHAR2(20) DEFAULT 'pending',
            metadata CLOB DEFAULT '{}',
            deleted_at TIMESTAMP,
            CONSTRAINT fk_photos_album FOREIGN KEY (album_id) REFERENCES photo_albums(id)
        )';
        DBMS_OUTPUT.PUT_LINE('已建立 photos 表');
    END IF;
END;
/

-- 清空並插入照片相簿資料
DELETE FROM photos;
DELETE FROM photo_albums;

-- 為每個專案建立相簿
-- proj001 相簿
INSERT INTO photo_albums (project_id, name, description, created_by) VALUES
('proj001', '施工進度照片', 'FAB20 Phase1 專案各階段施工進度記錄', 'system');

INSERT INTO photo_albums (project_id, name, description, created_by) VALUES
('proj001', '品質檢查照片', '品質控制與檢驗相關照片記錄', 'system');

INSERT INTO photo_albums (project_id, name, description, created_by) VALUES
('proj001', '設備安裝照片', '機電設備安裝過程記錄', 'system');

INSERT INTO photo_albums (project_id, name, description, created_by) VALUES
('proj001', '安全檢查照片', '工地安全檢查與事件記錄', 'system');

-- proj002 相簿
INSERT INTO photo_albums (project_id, name, description, created_by) VALUES
('proj002', '廠房建設進度', 'FAB21 Phase2 廠房建設進度記錄', 'system');

INSERT INTO photo_albums (project_id, name, description, created_by) VALUES
('proj002', '環境監測記錄', '施工環境影響監測照片', 'system');

-- proj003 相簿
INSERT INTO photo_albums (project_id, name, description, created_by) VALUES
('proj003', '智慧工廠完工照片', 'FAB22 Phase3 完工驗收照片', 'system');

-- proj004 相簿
INSERT INTO photo_albums (project_id, name, description, created_by) VALUES
('proj004', '無塵室建設', 'AP8 潔淨室建設過程記錄', 'system');

-- proj005 相簿
INSERT INTO photo_albums (project_id, name, description, created_by) VALUES
('proj005', '設備安裝規劃', 'F18 設備安裝前置規劃照片', 'system');

COMMIT;

-- 建立索引以提升查詢效能
CREATE INDEX idx_albums_project_id ON photo_albums(project_id);
CREATE INDEX idx_photos_album_id ON photos(album_id);
CREATE INDEX idx_photos_uploaded_at ON photos(uploaded_at);
CREATE INDEX idx_vendors_code ON vendors(code);
CREATE INDEX idx_vendors_name ON vendors(name);
CREATE INDEX idx_contacts_vendor_id ON contacts(vendor_id);

-- 顯示建立結果
SELECT '專案資料' as category, COUNT(*) as count FROM projects
UNION ALL
SELECT '廠商資料' as category, COUNT(*) as count FROM vendors
UNION ALL
SELECT '聯絡人資料' as category, COUNT(*) as count FROM contacts
UNION ALL
SELECT '照片相簿' as category, COUNT(*) as count FROM photo_albums;

DBMS_OUTPUT.PUT_LINE('==================================');
DBMS_OUTPUT.PUT_LINE('測試資料建立完成！');
DBMS_OUTPUT.PUT_LINE('==================================');
DBMS_OUTPUT.PUT_LINE('專案: 5個');
DBMS_OUTPUT.PUT_LINE('廠商: 10個');
DBMS_OUTPUT.PUT_LINE('聯絡人: 15位');
DBMS_OUTPUT.PUT_LINE('照片相簿: 9個');
DBMS_OUTPUT.PUT_LINE('==================================');