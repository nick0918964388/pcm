# PCM 資料庫設定指南

## 📋 概述

這個目錄包含 PCM（專案控制管理）系統的完整資料庫設定腳本，使用 PostgreSQL 15+ 資料庫。

## 🗂️ 檔案結構

```
database/
├── 01-create-schema.sql      # 基本表結構、枚舉類型、約束
├── 02-create-indexes.sql     # 效能優化索引、複合索引、JSONB 索引
├── 03-create-triggers.sql    # 自動化觸發器、業務邏輯函數
├── 04-initial-data.sql       # 初始系統資料、預設用戶、範例資料
├── initialize-database.sql   # 主初始化腳本（執行所有腳本）
└── README.md                 # 本檔案
```

## 🚀 快速開始

### 1. 環境準備

確保已安裝 PostgreSQL 15+ 並可正常連接：

```bash
psql --version
```

### 2. 建立資料庫

```sql
-- 登入 PostgreSQL
psql -U postgres -h localhost

-- 建立資料庫和用戶
CREATE DATABASE app_db;
CREATE USER admin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE app_db TO admin;

-- 切換到目標資料庫
\c app_db
```

### 3. 執行初始化腳本

**方法一：使用主腳本（推薦）**
```bash
psql -U admin -d app_db -h localhost -f initialize-database.sql
```

**方法二：逐步執行**
```bash
psql -U admin -d app_db -h localhost -f 01-create-schema.sql
psql -U admin -d app_db -h localhost -f 02-create-indexes.sql
psql -U admin -d app_db -h localhost -f 03-create-triggers.sql
psql -U admin -d app_db -h localhost -f 04-initial-data.sql
```

## 📊 資料庫架構

### 核心表結構

#### 用戶認證模組
- `users` - 用戶基本資訊
- `roles` - 角色定義和權限
- `user_roles` - 用戶角色關聯
- `user_sessions` - 用戶會話管理
- `login_logs` - 登入日誌記錄

#### 專案管理模組
- `projects` - 專案主表
- `project_members` - 專案成員
- `wbs_items` - WBS 工作分解結構
- `project_milestones` - 專案里程碑

#### 廠商排班模組
- `vendors` - 廠商資訊
- `duty_persons` - 值班人員
- `duty_schedules` - 排班安排

#### 系統管理模組
- `audit_logs` - 審計日誌
- `system_settings` - 系統設定

### 主要特性

#### 🔐 安全性
- bcrypt 密碼加密（12輪）
- 帳號鎖定機制（5次失敗鎖定30分鐘）
- 完整審計日誌記錄
- 細粒度權限控制（RBAC）

#### ⚡ 效能優化
- 全面索引策略（B-tree、GIN、部分索引）
- 連接池支援（20最大，5最小）
- JSONB 欄位高效查詢
- 查詢優化建議

#### 🤖 自動化
- 時間戳自動更新
- 專案進度自動計算
- 排班衝突自動檢查
- WBS 層級自動設定
- 廠商合約到期檢查

## 👤 預設帳號

系統會自動建立以下預設帳號：

**系統管理員**
- 用戶名：`admin`
- 郵箱：`admin@pcm.system`
- 密碼：`Admin123!`

**⚠️ 重要提醒：請立即修改預設密碼！**

## 🎭 預設角色

系統包含以下預設角色：

1. **系統管理員** (`system_admin`) - 完整系統權限
2. **專案管理員** (`project_manager`) - 專案管理權限
3. **專案成員** (`project_member`) - 專案參與權限
4. **HR 管理員** (`hr_admin`) - 人力資源管理
5. **廠商管理員** (`vendor_admin`) - 廠商相關權限
6. **一般用戶** (`user`) - 基本查詢權限

## 📝 範例資料

初始化後會包含：

- 2 個範例專案
- 3 個範例廠商
- 4 個範例值班人員
- 相關 WBS 項目和排班資料

## 🔧 維護操作

### 備份資料庫

```bash
# 結構和資料完整備份
pg_dump -U admin -h localhost -d app_db -Fc -f pcm_backup_$(date +%Y%m%d).dump

# 僅結構備份
pg_dump -U admin -h localhost -d app_db -s -f pcm_schema_backup.sql
```

### 恢復資料庫

```bash
# 從 dump 檔案恢復
pg_restore -U admin -h localhost -d app_db -v pcm_backup_20250115.dump

# 從 SQL 檔案恢復
psql -U admin -h localhost -d app_db -f pcm_schema_backup.sql
```

### 清理過期資料

```sql
-- 清理過期會話（自動觸發器已處理）
SELECT cleanup_expired_sessions();

-- 清理舊日誌（保留90天）
DELETE FROM login_logs WHERE login_time < NOW() - INTERVAL '90 days';
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
```

## 📈 效能調優

### 監控查詢效能

```sql
-- 查看慢查詢
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- 查看索引使用情況
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;
```

### 連接池設定建議

```ini
# postgresql.conf
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
```

## 🚨 故障排除

### 常見問題

**1. 連接失敗**
```
解決方案：
- 檢查 pg_hba.conf 設定
- 確認 SSL 設定正確
- 驗證用戶權限
```

**2. 權限錯誤**
```sql
-- 重設用戶權限
GRANT ALL PRIVILEGES ON DATABASE app_db TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;
```

**3. 觸發器錯誤**
```sql
-- 檢查觸發器狀態
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname LIKE 'trigger_%';

-- 重建觸發器
\i 03-create-triggers.sql
```

## 🔄 版本升級

當有新版本的資料庫腳本時：

1. **備份現有資料**
2. **測試升級腳本**
3. **執行升級**
4. **驗證資料完整性**

## 📞 支援

如有問題，請參考：

1. [PostgreSQL 官方文檔](https://www.postgresql.org/docs/)
2. [PCM 系統 API 文檔](../docs/api/)
3. [系統架構文檔](../docs/architecture.md)

---

*最後更新：2025-01-15*