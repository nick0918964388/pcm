-- 廠商測試資料生成腳本（基於實際資料庫結構）
-- 執行前請確保資料庫連線正常

-- 插入測試廠商資料（基於現有的 vendors 表結構）
INSERT INTO vendors (
  id, 
  name, 
  type, 
  status, 
  contact_person, 
  phone, 
  email, 
  address, 
  contract_start, 
  contract_end, 
  rating, 
  is_active, 
  created_at, 
  updated_at
) VALUES
-- 主要承攬商
(uuid_generate_v4(), '台灣營造工程股份有限公司', 'primary_contractor', 'active', '李建國', '02-2345-6789', 'contact@taiwan-construction.com', '台北市信義區信義路五段7號', '2024-01-01', '2025-12-31', 4.5, true, NOW(), NOW()),
(uuid_generate_v4(), '大安建設開發有限公司', 'primary_contractor', 'active', '林淑芬', '02-2876-5432', 'info@daan-dev.com', '台北市大安區敦化南路二段216號', '2024-02-01', '2025-11-30', 4.2, true, NOW(), NOW()),

-- 次要承攬商
(uuid_generate_v4(), '精密機電工程有限公司', 'secondary_contractor', 'active', '劉正雄', '03-3456-7890', 'service@precision-mech.com', '桃園市中壢區中大路300號', '2024-03-01', '2025-10-31', 4.8, true, NOW(), NOW()),
(uuid_generate_v4(), '智慧系統整合股份有限公司', 'secondary_contractor', 'active', '鄭大偉', '04-2345-6789', 'contact@smart-systems.com', '台中市西屯區台灣大道四段1086號', '2024-04-01', '2025-09-30', 4.6, true, NOW(), NOW()),

-- 設備供應商
(uuid_generate_v4(), '高科技設備供應商股份有限公司', 'equipment_supplier', 'active', '廖建成', '03-5678-9012', 'sales@hitech-equipment.com', '新竹市東區光復路二段101號', '2024-05-01', '2025-08-31', 4.3, true, NOW(), NOW()),
(uuid_generate_v4(), '精密儀器設備有限公司', 'equipment_supplier', 'active', '范淑君', '07-345-6789', 'info@precision-instruments.com', '高雄市前鎮區成功二路88號', '2024-06-01', '2025-07-31', 4.7, true, NOW(), NOW()),

-- 材料供應商
(uuid_generate_v4(), '優質建材供應股份有限公司', 'material_supplier', 'active', '張建材', '02-8765-4321', 'order@quality-materials.com', '新北市板橋區縣民大道二段7號', '2024-07-01', '2025-06-30', 4.1, true, NOW(), NOW()),
(uuid_generate_v4(), '環保材料科技有限公司', 'material_supplier', 'pending', '王環保', '06-234-5678', 'contact@eco-materials.com', '台南市安南區工業二路31號', '2024-08-01', '2025-05-31', 3.9, true, NOW(), NOW()),

-- 顧問公司
(uuid_generate_v4(), '國際工程顧問股份有限公司', 'consultant', 'active', '王建華', '02-2234-5678', 'consultant@intl-engineering.com', '台北市松山區南京東路五段188號', '2024-09-01', '2025-04-30', 4.9, true, NOW(), NOW()),
(uuid_generate_v4(), '永續發展顧問有限公司', 'consultant', 'active', '蘇雅琴', '04-2876-5432', 'info@sustainability-consulting.com', '台中市南屯區文心路一段521號', '2024-10-01', '2025-03-31', 4.4, true, NOW(), NOW()),

-- 檢測機構
(uuid_generate_v4(), '專業檢測認證股份有限公司', 'testing_agency', 'active', '陳檢測', '03-4567-8901', 'testing@professional-cert.com', '桃園市桃園區復興路195號', '2024-11-01', '2025-02-28', 4.0, true, NOW(), NOW()),
(uuid_generate_v4(), '品質保證檢驗中心', 'testing_agency', 'suspended', '李品保', '02-3456-7890', 'qc@quality-assurance.com', '台北市內湖區瑞光路513號', '2024-12-01', '2025-01-31', 3.5, false, NOW(), NOW()),

-- 其他類型
(uuid_generate_v4(), '綜合服務供應商有限公司', 'other', 'active', '黃綜合', '05-234-5678', 'service@comprehensive-services.com', '雲林縣斗六市中山路123號', '2024-01-15', '2025-12-15', 4.2, true, NOW(), NOW()),
(uuid_generate_v4(), '臨時支援服務股份有限公司', 'other', 'inactive', '陳臨時', '08-345-6789', 'temp@temporary-support.com', '屏東縣屏東市中正路456號', '2023-12-01', '2024-11-30', 3.8, false, NOW(), NOW()),
(uuid_generate_v4(), '特殊需求解決方案有限公司', 'other', 'active', '劉特殊', '089-456-789', 'special@special-solutions.com', '台東縣台東市更生路789號', '2024-02-15', '2025-11-15', 4.1, true, NOW(), NOW());