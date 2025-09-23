-- ============================================
-- PCM 測試資料
-- ============================================

-- 插入測試用戶
INSERT INTO users (id, username, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
VALUES ('u001', 'admin', 'admin@pcm.com', '$2b$10$YourHashedPasswordHere', 'Admin', 'User', 'admin', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO users (id, username, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
VALUES ('u002', 'john_doe', 'john@pcm.com', '$2b$10$YourHashedPasswordHere', 'John', 'Doe', 'manager', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO users (id, username, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
VALUES ('u003', 'jane_smith', 'jane@pcm.com', '$2b$10$YourHashedPasswordHere', 'Jane', 'Smith', 'member', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 插入測試客戶
INSERT INTO clients (id, name, description, contact_person, email, phone, address, is_active, created_at, updated_at)
VALUES ('c001', '台積電', '全球領先的晶圓代工企業', '張經理', 'contact@tsmc.com', '03-5636688', '新竹科學園區力行六路8號', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO clients (id, name, description, contact_person, email, phone, address, is_active, created_at, updated_at)
VALUES ('c002', '聯發科', '全球IC設計領導廠商', '林總監', 'contact@mediatek.com', '03-5670766', '新竹市篤行一路1號', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 插入測試廠商
INSERT INTO vendors (id, name, description, contact_person, email, phone, address, vendor_type, is_active, created_at, updated_at)
VALUES ('v001', '宏碁資訊', '提供IT解決方案與服務', '王經理', 'sales@acer.com', '02-26963131', '台北市內湖區基湖路', 'IT服務', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO vendors (id, name, description, contact_person, email, phone, address, vendor_type, is_active, created_at, updated_at)
VALUES ('v002', '精誠資訊', '專業系統整合服務商', '李總監', 'contact@systex.com', '02-66068000', '台北市南港區三重路', '系統整合', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO vendors (id, name, description, contact_person, email, phone, address, vendor_type, is_active, created_at, updated_at)
VALUES ('v003', '資拓宏宇', '政府與企業IT服務', '陳經理', 'info@iisigroup.com', '02-26557688', '台北市南港區園區街', 'IT顧問', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 插入廠商聯絡人
INSERT INTO vendor_contacts (id, vendor_id, name, title, email, phone, department, is_primary, is_active, created_at, updated_at)
VALUES ('vc001', 'v001', '王小明', '業務經理', 'wang@acer.com', '02-26963131#1234', '業務部', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO vendor_contacts (id, vendor_id, name, title, email, phone, department, is_primary, is_active, created_at, updated_at)
VALUES ('vc002', 'v001', '張小華', '技術總監', 'zhang@acer.com', '02-26963131#5678', '技術部', 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO vendor_contacts (id, vendor_id, name, title, email, phone, department, is_primary, is_active, created_at, updated_at)
VALUES ('vc003', 'v002', '李大同', '專案經理', 'li@systex.com', '02-66068000#8888', '專案部', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 插入測試專案
INSERT INTO projects (id, name, description, status, project_type, start_date, end_date, budget, manager_id, client_id, created_at, updated_at)
VALUES ('p001', 'ERP系統升級專案', '升級現有ERP系統至最新版本', 'active', 'internal', DATE '2024-01-01', DATE '2024-12-31', 5000000, 'u002', 'c001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO projects (id, name, description, status, project_type, start_date, end_date, budget, manager_id, client_id, created_at, updated_at)
VALUES ('p002', '資料倉儲建置專案', '建立企業級資料倉儲系統', 'planning', 'external', DATE '2024-03-01', DATE '2024-09-30', 3000000, 'u002', 'c002', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO projects (id, name, description, status, project_type, start_date, end_date, budget, manager_id, client_id, created_at, updated_at)
VALUES ('p003', '系統維護服務', '提供系統日常維護與支援', 'active', 'maintenance', DATE '2024-01-01', DATE '2024-12-31', 1200000, 'u003', 'c001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 插入專案成員
INSERT INTO project_members (id, project_id, user_id, role, joined_at, is_active)
VALUES ('pm001', 'p001', 'u002', '專案經理', CURRENT_TIMESTAMP, 1);

INSERT INTO project_members (id, project_id, user_id, role, joined_at, is_active)
VALUES ('pm002', 'p001', 'u003', '開發人員', CURRENT_TIMESTAMP, 1);

INSERT INTO project_members (id, project_id, user_id, role, joined_at, is_active)
VALUES ('pm003', 'p002', 'u002', '專案經理', CURRENT_TIMESTAMP, 1);

-- 插入WBS項目
INSERT INTO wbs_items (id, project_id, parent_id, wbs_code, name, description, status, priority, progress, estimated_hours, start_date, end_date, assignee_id, created_at, updated_at)
VALUES ('w001', 'p001', NULL, '1.0', '需求分析', '分析並確認系統升級需求', 'completed', 'high', 100, 80, DATE '2024-01-01', DATE '2024-01-31', 'u003', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO wbs_items (id, project_id, parent_id, wbs_code, name, description, status, priority, progress, estimated_hours, start_date, end_date, assignee_id, created_at, updated_at)
VALUES ('w002', 'p001', NULL, '2.0', '系統設計', '設計系統架構與介面', 'in_progress', 'high', 60, 120, DATE '2024-02-01', DATE '2024-03-31', 'u003', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO wbs_items (id, project_id, parent_id, wbs_code, name, description, status, priority, progress, estimated_hours, start_date, end_date, assignee_id, created_at, updated_at)
VALUES ('w003', 'p001', 'w001', '1.1', '需求訪談', '與使用者進行需求訪談', 'completed', 'medium', 100, 40, DATE '2024-01-01', DATE '2024-01-15', 'u003', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 插入任務
INSERT INTO tasks (id, wbs_item_id, name, description, status, priority, estimated_hours, start_date, due_date, assignee_id, created_at, updated_at)
VALUES ('t001', 'w001', '準備需求訪談問卷', '設計並準備需求訪談的問卷', 'done', 'high', 8, DATE '2024-01-01', DATE '2024-01-03', 'u003', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO tasks (id, wbs_item_id, name, description, status, priority, estimated_hours, start_date, due_date, assignee_id, created_at, updated_at)
VALUES ('t002', 'w001', '執行需求訪談', '與各部門主管進行需求訪談', 'done', 'high', 16, DATE '2024-01-04', DATE '2024-01-10', 'u003', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO tasks (id, wbs_item_id, name, description, status, priority, estimated_hours, start_date, due_date, assignee_id, created_at, updated_at)
VALUES ('t003', 'w002', '設計系統架構圖', '繪製系統架構圖與資料流程圖', 'in_progress', 'high', 24, DATE '2024-02-01', DATE '2024-02-10', 'u003', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 插入里程碑
INSERT INTO milestones (id, project_id, name, description, due_date, status, created_at, updated_at)
VALUES ('m001', 'p001', '需求確認', '完成所有需求的確認與文件化', DATE '2024-01-31', 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO milestones (id, project_id, name, description, due_date, status, created_at, updated_at)
VALUES ('m002', 'p001', '系統設計完成', '完成系統設計文件', DATE '2024-03-31', 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO milestones (id, project_id, name, description, due_date, status, created_at, updated_at)
VALUES ('m003', 'p001', '系統上線', 'ERP系統正式上線運行', DATE '2024-12-31', 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

COMMIT;