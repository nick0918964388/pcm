-- 廠商通訊錄測試資料生成腳本
-- 執行前請確保資料庫連線正常

-- 清除現有測試資料（可選）
-- DELETE FROM vendor_contacts WHERE vendor_id IN (SELECT id FROM vendors WHERE code LIKE 'TEST%');
-- DELETE FROM vendors WHERE code LIKE 'TEST%';

-- 插入測試廠商資料
INSERT INTO vendors (id, code, name, short_name, type, status, phone, email, address, display_order, is_active, created_at, updated_at) VALUES
-- 主要承攬商
(uuid_generate_v4(), 'TEST001', '台灣營造工程股份有限公司', '台灣營造', '主要承攬商', '啟用', '02-2345-6789', 'contact@taiwan-construction.com', '台北市信義區信義路五段7號', 1, true, NOW(), NOW()),
(uuid_generate_v4(), 'TEST002', '大安建設開發有限公司', '大安建設', '主要承攬商', '啟用', '02-2876-5432', 'info@daan-dev.com', '台北市大安區敦化南路二段216號', 2, true, NOW(), NOW()),

-- 次要承攬商
(uuid_generate_v4(), 'TEST003', '精密機電工程有限公司', '精密機電', '次要承攬商', '啟用', '03-3456-7890', 'service@precision-mech.com', '桃園市中壢區中大路300號', 3, true, NOW(), NOW()),
(uuid_generate_v4(), 'TEST004', '智慧系統整合股份有限公司', '智慧系統', '次要承攬商', '啟用', '04-2345-6789', 'contact@smart-systems.com', '台中市西屯區台灣大道四段1086號', 4, true, NOW(), NOW()),

-- 設備供應商
(uuid_generate_v4(), 'TEST005', '高科技設備供應商股份有限公司', '高科設備', '設備供應商', '啟用', '03-5678-9012', 'sales@hitech-equipment.com', '新竹市東區光復路二段101號', 5, true, NOW(), NOW()),
(uuid_generate_v4(), 'TEST006', '精密儀器設備有限公司', '精密儀器', '設備供應商', '啟用', '07-345-6789', 'info@precision-instruments.com', '高雄市前鎮區成功二路88號', 6, true, NOW(), NOW()),

-- 材料供應商
(uuid_generate_v4(), 'TEST007', '優質建材供應股份有限公司', '優質建材', '材料供應商', '啟用', '02-8765-4321', 'order@quality-materials.com', '新北市板橋區縣民大道二段7號', 7, true, NOW(), NOW()),
(uuid_generate_v4(), 'TEST008', '環保材料科技有限公司', '環保材料', '材料供應商', '待審核', '06-234-5678', 'contact@eco-materials.com', '台南市安南區工業二路31號', 8, true, NOW(), NOW()),

-- 顧問公司
(uuid_generate_v4(), 'TEST009', '國際工程顧問股份有限公司', '國際顧問', '顧問公司', '啟用', '02-2234-5678', 'consultant@intl-engineering.com', '台北市松山區南京東路五段188號', 9, true, NOW(), NOW()),
(uuid_generate_v4(), 'TEST010', '永續發展顧問有限公司', '永續顧問', '顧問公司', '啟用', '04-2876-5432', 'info@sustainability-consulting.com', '台中市南屯區文心路一段521號', 10, true, NOW(), NOW()),

-- 檢測機構
(uuid_generate_v4(), 'TEST011', '專業檢測認證股份有限公司', '專業檢測', '檢測機構', '啟用', '03-4567-8901', 'testing@professional-cert.com', '桃園市桃園區復興路195號', 11, true, NOW(), NOW()),
(uuid_generate_v4(), 'TEST012', '品質保證檢驗中心', '品保檢驗', '檢測機構', '暫停', '02-3456-7890', 'qc@quality-assurance.com', '台北市內湖區瑞光路513號', 12, false, NOW(), NOW());

-- 獲取剛插入的廠商ID以便插入聯絡人資料
DO $$
DECLARE
    vendor_rec RECORD;
    contact_id UUID;
BEGIN
    -- 為每個測試廠商插入聯絡人資料
    FOR vendor_rec IN SELECT id, code, name FROM vendors WHERE code LIKE 'TEST%' ORDER BY code
    LOOP
        CASE vendor_rec.code
            WHEN 'TEST001' THEN
                -- 台灣營造工程股份有限公司 - 3位聯絡人
                INSERT INTO vendor_contacts (id, vendor_id, name, position, department, phone, extension, mvpn, email, supervisor, work_supervisor, status, is_primary, is_active, notes, display_order, created_at, updated_at) VALUES
                (uuid_generate_v4(), vendor_rec.id, '李建國', '專案經理', '工程部', '0912-345-678', '101', 'M001', 'li.jianguo@taiwan-construction.com', '王總監', '陳副理', '啟用', true, true, '負責主要工程項目管理', 1, NOW(), NOW()),
                (uuid_generate_v4(), vendor_rec.id, '張美玲', '品管主任', '品管部', '0923-456-789', '201', 'M002', 'zhang.meiling@taiwan-construction.com', '李專案經理', '劉組長', '啟用', false, true, '負責工程品質管控', 2, NOW(), NOW()),
                (uuid_generate_v4(), vendor_rec.id, '陳志明', '安全督導', '安全部', '0934-567-890', '301', 'M003', 'chen.zhiming@taiwan-construction.com', '李專案經理', '王安全經理', '啟用', false, true, '負責工地安全督導工作', 3, NOW(), NOW());

            WHEN 'TEST002' THEN
                -- 大安建設開發有限公司 - 2位聯絡人
                INSERT INTO vendor_contacts (id, vendor_id, name, position, department, phone, extension, mvpn, email, supervisor, work_supervisor, status, is_primary, is_active, notes, display_order, created_at, updated_at) VALUES
                (uuid_generate_v4(), vendor_rec.id, '林淑芬', '業務經理', '業務部', '0945-678-901', '102', 'M011', 'lin.shufen@daan-dev.com', '總經理', '業務總監', '啟用', true, true, '主要業務聯絡窗口', 1, NOW(), NOW()),
                (uuid_generate_v4(), vendor_rec.id, '黃志華', '技術總監', '技術部', '0956-789-012', '201', 'M012', 'huang.zhihua@daan-dev.com', '總經理', '技術副總', '啟用', false, true, '負責技術支援與指導', 2, NOW(), NOW());

            WHEN 'TEST003' THEN
                -- 精密機電工程有限公司 - 4位聯絡人
                INSERT INTO vendor_contacts (id, vendor_id, name, position, department, phone, extension, mvpn, email, supervisor, work_supervisor, status, is_primary, is_active, notes, display_order, created_at, updated_at) VALUES
                (uuid_generate_v4(), vendor_rec.id, '劉正雄', '機電經理', '機電部', '0967-890-123', '103', 'M021', 'liu.zhengxiong@precision-mech.com', '副總經理', '機電總監', '啟用', true, true, '機電工程主要負責人', 1, NOW(), NOW()),
                (uuid_generate_v4(), vendor_rec.id, '吳佳穎', '電控工程師', '控制部', '0978-901-234', '205', 'M022', 'wu.jiaying@precision-mech.com', '劉機電經理', '電控主任', '啟用', false, true, '負責電控系統設計', 2, NOW(), NOW()),
                (uuid_generate_v4(), vendor_rec.id, '許文凱', '維護技師', '維護部', '0989-012-345', '305', 'M023', 'xu.wenkai@precision-mech.com', '劉機電經理', '維護主管', '啟用', false, true, '設備維護與保養', 3, NOW(), NOW()),
                (uuid_generate_v4(), vendor_rec.id, '蔡雅雯', '品保專員', '品保部', '0912-123-456', '405', 'M024', 'cai.yawen@precision-mech.com', '品保經理', '品保主任', '停用', false, false, '原品保專員，已調職', 4, NOW(), NOW());

            WHEN 'TEST004' THEN
                -- 智慧系統整合股份有限公司 - 3位聯絡人
                INSERT INTO vendor_contacts (id, vendor_id, name, position, department, phone, extension, mvpn, email, supervisor, work_supervisor, status, is_primary, is_active, notes, display_order, created_at, updated_at) VALUES
                (uuid_generate_v4(), vendor_rec.id, '鄭大偉', '系統架構師', 'IT部', '0923-234-567', '104', 'M031', 'zheng.dawei@smart-systems.com', 'CTO', '系統部經理', '啟用', true, true, '系統整合主要負責人', 1, NOW(), NOW()),
                (uuid_generate_v4(), vendor_rec.id, '呂美慧', '專案協調員', '專案部', '0934-345-678', '206', 'M032', 'lv.meihui@smart-systems.com', '鄭大偉', '專案經理', '啟用', false, true, '負責專案進度協調', 2, NOW(), NOW()),
                (uuid_generate_v4(), vendor_rec.id, '馬志強', '測試工程師', '測試部', '0945-456-789', '306', 'M033', 'ma.zhiqiang@smart-systems.com', '鄭大偉', '測試主管', '啟用', false, true, '系統測試與驗證', 3, NOW(), NOW());

            WHEN 'TEST005' THEN
                -- 高科技設備供應商股份有限公司 - 2位聯絡人
                INSERT INTO vendor_contacts (id, vendor_id, name, position, department, phone, extension, mvpn, email, supervisor, work_supervisor, status, is_primary, is_active, notes, display_order, created_at, updated_at) VALUES
                (uuid_generate_v4(), vendor_rec.id, '廖建成', '銷售經理', '銷售部', '0956-567-890', '105', 'M041', 'liao.jiancheng@hitech-equipment.com', '銷售總監', '業務主管', '啟用', true, true, '設備銷售主要聯絡人', 1, NOW(), NOW()),
                (uuid_generate_v4(), vendor_rec.id, '范淑君', '技術支援', '技術部', '0967-678-901', '207', 'M042', 'fan.shujun@hitech-equipment.com', '技術總監', '技術經理', '啟用', false, true, '提供技術支援服務', 2, NOW(), NOW());

            WHEN 'TEST009' THEN
                -- 國際工程顧問股份有限公司 - 5位聯絡人
                INSERT INTO vendor_contacts (id, vendor_id, name, position, department, phone, extension, mvpn, email, supervisor, work_supervisor, status, is_primary, is_active, notes, display_order, created_at, updated_at) VALUES
                (uuid_generate_v4(), vendor_rec.id, '王建華', '資深顧問', '工程部', '0978-789-012', '106', 'M051', 'wang.jianhua@intl-engineering.com', '執行董事', '工程總監', '啟用', true, true, '資深工程顧問，經驗豐富', 1, NOW(), NOW()),
                (uuid_generate_v4(), vendor_rec.id, '蘇雅琴', '環境顧問', '環境部', '0989-890-123', '208', 'M052', 'su.yaqin@intl-engineering.com', '王建華', '環境部經理', '啟用', false, true, '環境影響評估專家', 2, NOW(), NOW()),
                (uuid_generate_v4(), vendor_rec.id, '陳俊宏', '結構工程師', '結構部', '0912-901-234', '308', 'M053', 'chen.junhong@intl-engineering.com', '王建華', '結構部主任', '啟用', false, true, '結構設計與分析', 3, NOW(), NOW()),
                (uuid_generate_v4(), vendor_rec.id, '李明珠', '財務顧問', '財務部', '0923-012-345', '408', 'M054', 'li.mingzhu@intl-engineering.com', '財務總監', '財務經理', '啟用', false, true, '財務規劃與分析', 4, NOW(), NOW()),
                (uuid_generate_v4(), vendor_rec.id, '張文龍', '法務顧問', '法務部', '0934-123-456', '508', 'M055', 'zhang.wenlong@intl-engineering.com', '法務長', '法務主管', '停用', false, false, '法務支援，已離職', 5, NOW(), NOW());

            ELSE
                -- 其他廠商至少插入1位聯絡人
                INSERT INTO vendor_contacts (id, vendor_id, name, position, department, phone, extension, mvpn, email, supervisor, work_supervisor, status, is_primary, is_active, notes, display_order, created_at, updated_at) VALUES
                (uuid_generate_v4(), vendor_rec.id, '預設聯絡人', '聯絡窗口', '業務部', '0912-000-000', '100', 'M000', 'default@company.com', '主管', '值班主管', '啟用', true, true, '預設聯絡人資料', 1, NOW(), NOW());
        END CASE;
    END LOOP;
    
    RAISE NOTICE '測試資料插入完成！';
    RAISE NOTICE '- 插入了 12 個測試廠商';
    RAISE NOTICE '- 插入了約 25+ 個測試聯絡人';
    RAISE NOTICE '- 涵蓋所有廠商類型和狀態';
END $$;