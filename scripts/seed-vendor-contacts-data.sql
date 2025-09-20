-- 創建廠商聯絡人測試資料
-- 這個腳本會為現有的廠商創建各種聯絡人資料

-- 獲取一些廠商 ID 來建立聯絡人資料
-- 我們將為前 10 個廠商創建聯絡人資料

-- 查詢現有廠商，為每個廠商創建 2-4 個聯絡人
WITH vendor_sample AS (
  SELECT id, name FROM vendors ORDER BY created_at DESC LIMIT 10
)

INSERT INTO vendor_contacts (
  vendor_id,
  name, 
  position, 
  title,
  phone, 
  extension, 
  mobile,
  email, 
  department,
  supervisor_name,
  is_supervisor,
  status,
  notes
) 

-- 為每個廠商建立多個聯絡人
SELECT 
  v.id as vendor_id,
  contact_data.name,
  contact_data.position::contact_position,
  contact_data.title,
  contact_data.phone,
  contact_data.extension,
  contact_data.mobile,
  contact_data.email,
  contact_data.department,
  contact_data.supervisor_name,
  contact_data.is_supervisor,
  contact_data.status::contact_status,
  contact_data.notes
FROM vendor_sample v
CROSS JOIN (
  VALUES 
    -- 廠商聯絡人資料範本 1: 經理
    ('張建國', 'manager', '營運經理', '02-2345-6789', '101', '0912-345-678', 'manager@company.com', '營運部', NULL, true, 'active', '負責整體營運管理'),
    
    -- 廠商聯絡人資料範本 2: 主管
    ('林淑芬', 'supervisor', '工程主管', '02-2345-6789', '201', '0923-456-789', 'supervisor@company.com', '工程部', '張建國', true, 'active', '負責工程監督管理'),
    
    -- 廠商聯絡人資料範本 3: 技術員
    ('王小明', 'technician', '資深技術員', '02-2345-6789', '301', '0934-567-890', 'tech@company.com', '技術部', '林淑芬', false, 'active', '負責現場技術支援'),
    
    -- 廠商聯絡人資料範本 4: 行政人員  
    ('李美華', 'administrator', '行政專員', '02-2345-6789', '401', '0945-678-901', 'admin@company.com', '行政部', '張建國', false, 'active', '負責行政庶務工作')
) AS contact_data(name, position, title, phone, extension, mobile, email, department, supervisor_name, is_supervisor, status, notes)

-- 只為前 10 個廠商建立聯絡人，每個廠商 4 個聯絡人
WHERE v.id IN (SELECT id FROM vendor_sample);

-- 為特定廠商建立額外的專業聯絡人
INSERT INTO vendor_contacts (
  vendor_id,
  name, 
  position, 
  title,
  phone, 
  extension, 
  mobile,
  email, 
  department,
  supervisor_name,
  is_supervisor,
  status,
  notes
) 
SELECT 
  v.id as vendor_id,
  CASE v.type
    WHEN 'security' THEN '保全隊長'
    WHEN 'cleaning' THEN '清潔主任'  
    WHEN 'maintenance' THEN '維修工程師'
    WHEN 'catering' THEN '餐飲經理'
    WHEN 'it_support' THEN '系統管理員'
    ELSE '聯絡窗口'
  END as name,
  CASE v.type
    WHEN 'security' THEN 'supervisor'::contact_position
    WHEN 'cleaning' THEN 'manager'::contact_position
    WHEN 'maintenance' THEN 'engineer'::contact_position
    WHEN 'catering' THEN 'manager'::contact_position
    WHEN 'it_support' THEN 'specialist'::contact_position
    ELSE 'coordinator'::contact_position
  END as position,
  CASE v.type
    WHEN 'security' THEN '保全部主管'
    WHEN 'cleaning' THEN '清潔部經理'
    WHEN 'maintenance' THEN '維修部工程師'
    WHEN 'catering' THEN '餐飲部經理'
    WHEN 'it_support' THEN 'IT系統專員'
    ELSE '業務聯絡人'
  END as title,
  v.phone as phone,
  '100' as extension,
  CASE 
    WHEN v.type = 'security' THEN '0911-111-111'
    WHEN v.type = 'cleaning' THEN '0922-222-222'
    WHEN v.type = 'maintenance' THEN '0933-333-333'
    WHEN v.type = 'catering' THEN '0944-444-444'
    WHEN v.type = 'it_support' THEN '0955-555-555'
    ELSE '0966-666-666'
  END as mobile,
  v.type::text || '@' || REPLACE(LOWER(v.name), ' ', '') || '.com' as email,
  CASE v.type
    WHEN 'security' THEN '保全部'
    WHEN 'cleaning' THEN '清潔部'
    WHEN 'maintenance' THEN '維修部'
    WHEN 'catering' THEN '餐飲部'
    WHEN 'it_support' THEN 'IT部'
    ELSE '業務部'
  END as department,
  NULL as supervisor_name,
  true as is_supervisor,
  CASE v.status
    WHEN 'active' THEN 'active'::contact_status
    WHEN 'inactive' THEN 'inactive'::contact_status
    WHEN 'suspended' THEN 'suspended'::contact_status
    ELSE 'active'::contact_status
  END as status,
  '專業' || 
  CASE v.type
    WHEN 'security' THEN '保全'
    WHEN 'cleaning' THEN '清潔'
    WHEN 'maintenance' THEN '維修'
    WHEN 'catering' THEN '餐飲'
    WHEN 'it_support' THEN 'IT支援'
    ELSE '服務'
  END || '聯絡窗口' as notes
FROM vendors v 
WHERE v.id IN (
  SELECT id FROM vendors 
  ORDER BY created_at DESC 
  LIMIT 15
);

-- 顯示插入結果統計
SELECT 
  '廠商聯絡人資料創建完成' as message,
  COUNT(*) as total_contacts
FROM vendor_contacts;