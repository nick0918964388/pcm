-- 廠商測試資料生成腳本（使用正確的枚舉值）

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
-- 保全類型
(uuid_generate_v4(), '台北警衛保全股份有限公司', 'security', 'active', '王保全', '02-2345-6789', 'security@taipei-guard.com', '台北市中山區南京東路三段168號', '2024-01-01', '2025-12-31', 4.5, true, NOW(), NOW()),
(uuid_generate_v4(), '全方位保全服務有限公司', 'security', 'active', '李安全', '03-3456-7890', 'service@all-security.com', '桃園市桃園區中正路200號', '2024-02-01', '2025-11-30', 4.2, true, NOW(), NOW()),
(uuid_generate_v4(), '專業保全管理股份有限公司', 'security', 'suspended', '張管理', '04-2345-6789', 'manage@pro-security.com', '台中市西區台灣大道二段285號', '2024-03-01', '2025-10-31', 3.8, false, NOW(), NOW()),

-- 清潔類型
(uuid_generate_v4(), '環境清潔維護股份有限公司', 'cleaning', 'active', '陳清潔', '02-8765-4321', 'clean@environment-clean.com', '新北市板橋區文化路一段188號', '2024-04-01', '2025-09-30', 4.6, true, NOW(), NOW()),
(uuid_generate_v4(), '綠能清潔服務有限公司', 'cleaning', 'active', '林環保', '07-345-6789', 'green@eco-cleaning.com', '高雄市前鎮區成功二路99號', '2024-05-01', '2025-08-31', 4.3, true, NOW(), NOW()),
(uuid_generate_v4(), '專業清潔工程股份有限公司', 'cleaning', 'inactive', '黃專業', '06-234-5678', 'pro@professional-cleaning.com', '台南市東區長榮路三段158號', '2024-06-01', '2025-07-31', 4.0, false, NOW(), NOW()),

-- 維護類型
(uuid_generate_v4(), '設備維護工程股份有限公司', 'maintenance', 'active', '劉維護', '03-5678-9012', 'maintain@equipment-service.com', '新竹市東區光復路二段301號', '2024-07-01', '2025-06-30', 4.8, true, NOW(), NOW()),
(uuid_generate_v4(), '機電維修服務有限公司', 'maintenance', 'active', '吳機電', '04-2876-5432', 'electric@mech-repair.com', '台中市南屯區文心路一段521號', '2024-08-01', '2025-05-31', 4.5, true, NOW(), NOW()),
(uuid_generate_v4(), '建築維護管理股份有限公司', 'maintenance', 'active', '許建築', '02-2234-5678', 'building@construct-maintain.com', '台北市松山區南京東路五段188號', '2024-09-01', '2025-04-30', 4.7, true, NOW(), NOW()),

-- 餐飲類型
(uuid_generate_v4(), '美味餐飲服務股份有限公司', 'catering', 'active', '馬美味', '02-3456-7890', 'delicious@tasty-catering.com', '台北市大安區信義路四段266號', '2024-10-01', '2025-03-31', 4.4, true, NOW(), NOW()),
(uuid_generate_v4(), '健康餐飲管理有限公司', 'catering', 'active', '鄭健康', '03-4567-8901', 'healthy@health-food.com', '桃園市中壢區中大路500號', '2024-11-01', '2025-02-28', 4.1, true, NOW(), NOW()),
(uuid_generate_v4(), '營養膳食服務股份有限公司', 'catering', 'terminated', '蔡營養', '04-5678-9012', 'nutrition@nutrient-meals.com', '台中市北區中清路一段100號', '2024-12-01', '2025-01-31', 3.5, false, NOW(), NOW()),

-- IT支援類型
(uuid_generate_v4(), '資訊系統整合股份有限公司', 'it_support', 'active', '周資訊', '02-4567-8901', 'info@system-integration.com', '台北市內湖區瑞光路513號', '2024-01-15', '2025-12-15', 4.9, true, NOW(), NOW()),
(uuid_generate_v4(), '網路技術服務有限公司', 'it_support', 'active', '楊網路', '03-5678-9012', 'network@tech-service.com', '新竹市北區西大路300號', '2024-02-15', '2025-11-15', 4.6, true, NOW(), NOW()),
(uuid_generate_v4(), '軟體開發維護股份有限公司', 'it_support', 'active', '謝軟體', '07-456-7890', 'software@dev-maintain.com', '高雄市三民區建國三路125號', '2024-03-15', '2025-10-15', 4.3, true, NOW(), NOW()),

-- 其他類型
(uuid_generate_v4(), '綜合服務供應商股份有限公司', 'other', 'active', '黃綜合', '05-234-5678', 'service@comprehensive.com', '雲林縣斗六市中山路123號', '2024-04-15', '2025-09-15', 4.2, true, NOW(), NOW()),
(uuid_generate_v4(), '特殊需求解決方案有限公司', 'other', 'active', '劉特殊', '089-456-789', 'special@solutions.com', '台東縣台東市更生路789號', '2024-05-15', '2025-08-15', 4.0, true, NOW(), NOW()),
(uuid_generate_v4(), '臨時支援服務股份有限公司', 'other', 'inactive', '陳臨時', '08-345-6789', 'temp@temporary.com', '屏東縣屏東市中正路456號', '2024-06-15', '2025-07-15', 3.7, false, NOW(), NOW());