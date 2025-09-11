# PCM 系統 CRUD 實作指南

## 🎯 概述

本指南詳細說明 PCM（專案控制管理）系統的完整 CRUD 實作，包含資料庫設計、Repository 模式、Service 層業務邏輯和 API 端點。

## 🏗️ 系統架構

### 分層架構設計
```
┌─────────────────────────────────┐
│     API Layer (Next.js Routes)  │  ← HTTP 端點和中間件
├─────────────────────────────────┤
│     Service Layer               │  ← 業務邏輯處理
├─────────────────────────────────┤
│     Repository Layer            │  ← 資料存取層
├─────────────────────────────────┤
│     Database Layer (PostgreSQL) │  ← 資料持久化
└─────────────────────────────────┘
```

### 核心組件

#### 1. 資料庫連線層
- **`connection.ts`** - PostgreSQL 連線池管理
- **`query-builder.ts`** - 動態 SQL 查詢建構器
- **`base-repository.ts`** - 通用 CRUD 操作基類

#### 2. Repository 層 (資料存取)
- **`user-repository.ts`** - 用戶認證管理
- **`role-repository.ts`** - 角色權限管理
- **`project-repository.ts`** - 專案管理
- **`wbs-repository.ts`** - WBS 工作分解結構
- **`vendor-repository.ts`** - 廠商管理
- **`duty-schedule-repository.ts`** - 排班管理

#### 3. Service 層 (業務邏輯)
- **`auth-service.ts`** - 認證服務
- **`project-service.ts`** - 專案服務
- **`duty-schedule-service.ts`** - 排班服務

#### 4. API 層 (HTTP 端點)
- **`/api/auth/*`** - 認證相關 API
- **`/api/projects/*`** - 專案管理 API
- **`/api/duty-schedules/*`** - 排班管理 API

## 🚀 快速開始

### 1. 環境設定

確保 `.env.local` 包含正確的資料庫配置：

```env
DATABASE_URL="postgresql://admin:XcW04ByX6GbVdt1gw4EJ5XRY@192.168.1.183:30432/app_db?sslmode=require"
JWT_SECRET="your-secure-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"
JWT_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
```

### 2. 安裝依賴

```bash
npm install pg bcrypt jsonwebtoken zod
```

### 3. 測試 CRUD 功能

```bash
node test-crud.js
```

## 📋 功能特色

### 🔐 認證安全系統

#### JWT Token 機制
- **Access Token**: 15分鐘有效期
- **Refresh Token**: 7天有效期
- **Token 黑名單**: 支援登出時撤銷 Token

#### 密碼安全
- **bcrypt 加密**: 12輪雜湊
- **密碼強度驗證**: 大小寫字母、數字、特殊字符
- **失敗鎖定**: 5次失敗鎖定30分鐘

#### 權限控制
- **RBAC 系統**: 角色基礎的權限控制
- **細粒度權限**: 資源級別的權限檢查
- **動態角色**: 可動態分配和撤銷角色

### 📊 專案管理系統

#### 專案生命週期
- **狀態管理**: planning → active → completed
- **進度追蹤**: 自動計算 WBS 完成度
- **專案複製**: 支援專案模板和複製

#### WBS 工作分解
- **階層結構**: 支援多層級 WBS
- **依賴管理**: 任務依賴關係追蹤
- **進度計算**: 自動更新專案整體進度

### 🕒 智能排班系統

#### 衝突檢測
- **時段衝突**: 同一人員同一時段檢查
- **技能匹配**: 人員技能與工作要求匹配
- **工作區域**: 區域人員配置檢查

#### 排班管理
- **簽到簽退**: 完整的出勤記錄
- **代班機制**: 靈活的代班人員安排
- **緊急排班**: 支援緊急情況處理

## 🔧 API 使用指南

### 認證 API

#### 登入
```bash
POST /api/auth/login
Content-Type: application/json

{
  "usernameOrEmail": "admin@example.com",
  "password": "your_password"
}
```

#### 註冊
```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "newuser",
  "email": "user@example.com", 
  "password": "NewPass123!",
  "firstName": "新",
  "lastName": "用戶"
}
```

#### 獲取用戶信息
```bash
GET /api/auth/me
Authorization: Bearer your_access_token
```

### Repository 使用範例

#### 用戶管理
```typescript
const userRepository = new UserRepository();

// 創建用戶
const user = await userRepository.create({
  username: 'testuser',
  email: 'test@example.com',
  password_hash: hashedPassword
});

// 查找用戶
const foundUser = await userRepository.findByEmail('test@example.com');

// 更新用戶
await userRepository.update(user.id, {
  first_name: '測試',
  last_name: '用戶'
});
```

#### 專案管理
```typescript
const projectRepository = new ProjectRepository();

// 創建專案
const project = await projectRepository.create({
  id: 'PROJ-202501-001',
  name: '測試專案',
  manager_id: userId,
  status: 'planning'
});

// 查找專案
const projects = await projectRepository.findByStatus('active');
```

### Service 使用範例

#### 認證服務
```typescript
const authService = new AuthService();

// 用戶登入
const result = await authService.login({
  usernameOrEmail: 'admin@example.com',
  password: 'password'
});

// 驗證 Token
const user = await authService.verifyToken(accessToken);
```

#### 專案服務
```typescript
const projectService = new ProjectService();

// 創建專案
const project = await projectService.createProject({
  name: '新專案',
  managerId: userId,
  type: 'internal'
}, createdBy);

// 創建 WBS 項目
const wbsItem = await projectService.createWBSItem({
  projectId: project.id,
  wbsCode: '1.1',
  name: '需求分析'
}, createdBy);
```

## 🛡️ 安全最佳實踐

### 1. 資料庫安全
- ✅ **參數化查詢**: 防止 SQL 注入
- ✅ **連線加密**: SSL 連線保護
- ✅ **最小權限**: 資料庫用戶權限限制

### 2. 認證安全
- ✅ **Token 過期**: 短期 Access Token
- ✅ **速率限制**: 防止暴力破解
- ✅ **密碼策略**: 強密碼要求

### 3. API 安全
- ✅ **輸入驗證**: Zod Schema 嚴格驗證
- ✅ **錯誤處理**: 統一錯誤回應格式
- ✅ **日誌記錄**: 完整的操作審計

## 📈 效能優化

### 1. 資料庫優化
- **連線池**: 20個最大連線，5個最小連線
- **索引策略**: 主要查詢欄位建立索引
- **查詢優化**: 分頁查詢和條件篩選

### 2. 記憶體管理
- **軟刪除**: 保護重要資料
- **批次操作**: 大量資料處理優化
- **快取機制**: 熱點資料快取

### 3. API 效能
- **分頁支援**: 避免大量資料傳輸
- **並發控制**: 連線池管理
- **回應壓縮**: 減少網路傳輸

## 🧪 測試策略

### 1. 單元測試
- Repository 層測試
- Service 層測試
- 工具函數測試

### 2. 整合測試
- API 端點測試
- 資料庫連接測試
- 認證流程測試

### 3. E2E 測試
- 完整業務流程測試
- 用戶操作場景測試

## 🚦 部署指南

### 1. 環境準備
```bash
# 安裝依賴
npm install

# 設定環境變數
cp .env.example .env.local

# 測試資料庫連接
node test-crud.js
```

### 2. 資料庫遷移
```sql
-- 執行資料表創建腳本
-- 設定索引和約束
-- 初始化基礎資料
```

### 3. 服務啟動
```bash
# 開發環境
npm run dev

# 生產環境
npm run build
npm start
```

## 📚 API 文檔

完整的 API 文檔請參考：
- [認證 API 文檔](./api/auth-api.md)
- [專案 API 文檔](./api/project-api.md)  
- [排班 API 文檔](./api/duty-schedule-api.md)

## 🔄 更新日誌

### v1.0.0 (2025-01-15)
- ✅ 完成基礎 CRUD 架構
- ✅ 實作認證系統
- ✅ 建立專案管理功能
- ✅ 實作排班系統
- ✅ 完成 API 端點

---

*本文檔最後更新：2025-01-15*