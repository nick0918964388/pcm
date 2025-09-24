# PCM Oracle數據庫設置指南

本指南說明如何設置和使用PCM專案的Oracle本地開發環境。

## 🚀 快速開始

### 1. 啟動Oracle開發環境

```bash
npm run docker:oracle:start
```

該命令會：

- 自動拉取Oracle XE 21c Docker映像檔
- 啟動Oracle容器
- 執行初始化腳本
- 等待資料庫就緒

### 2. 檢查狀態

```bash
npm run docker:oracle:status
```

### 3. 查看日誌

```bash
npm run docker:oracle:logs
```

即時查看日誌：

```bash
npm run docker:oracle:logs:follow
```

### 4. 停止環境

```bash
npm run docker:oracle:stop
```

### 5. 重置環境（刪除所有資料）

```bash
npm run docker:oracle:reset
```

## 📊 連線資訊

- **主機**: localhost
- **埠口**: 1521
- **服務名**: XE
- **系統用戶**: system / Oracle123
- **應用程式用戶**: pcm_user / pcm_pass123
- **連線字串**: `localhost:1521/XE`

## 🌐 管理工具

### SQL Developer Web

訪問: http://localhost:5500/ords/sql-developer

使用系統用戶登入即可管理資料庫。

## 🔧 環境配置

### 環境變數 (.env.local)

```bash
# Oracle設定
ORACLE_PASSWORD=Oracle123
ORACLE_DATABASE=pcm_db
ORACLE_PORT=1521
ORACLE_WEB_PORT=5500

# 應用程式連線
DATABASE_TYPE=oracle
ORACLE_HOST=localhost
ORACLE_USER=pcm_user
ORACLE_SERVICE_NAME=XE
```

### Docker Compose配置

Oracle服務配置在 `docker-compose.yml` 中：

```yaml
services:
  oracle-db:
    image: gvenzl/oracle-xe:21-slim
    container_name: pcm-oracle-dev
    environment:
      ORACLE_PASSWORD: ${ORACLE_PASSWORD:-Oracle123}
      ORACLE_DATABASE: ${ORACLE_DATABASE:-pcm_db}
      ORACLE_CHARACTERSET: AL32UTF8
    ports:
      - '${ORACLE_PORT:-1521}:1521'
      - '${ORACLE_WEB_PORT:-5500}:5500'
    volumes:
      - oracle_data:/opt/oracle/oradata
      - ./database/init:/docker-entrypoint-initdb.d
```

## 📝 應用程式整合

### 連線管理器使用

```typescript
import { getOracleConnection } from '@/lib/database/oracle-connection';

// 獲取連線管理器實例
const oracle = getOracleConnection();

// 初始化連線池
await oracle.initialize({
  connectString: 'localhost:1521/XE',
  user: 'pcm_user',
  password: 'pcm_pass123',
  poolMin: 5,
  poolMax: 20,
  poolIncrement: 2,
  poolTimeout: 60,
  enableStatistics: true,
});

// 執行查詢
const result = await oracle.executeQuery<{ id: number; name: string }>(
  'SELECT id, name FROM projects WHERE status = :status',
  { status: 'active' }
);

if (result.success) {
  console.log('Projects:', result.data);
} else {
  console.error('Query failed:', result.error);
}

// 健康檢查
const health = await oracle.healthCheck();
console.log('Database healthy:', health.data?.isHealthy);

// 關閉連線池
await oracle.shutdown();
```

### 容器管理程式使用

```typescript
import { OracleContainerManager } from '@/lib/docker/oracle-container-manager';

const containerManager = new OracleContainerManager();

// 檢查容器狀態
const status = await containerManager.getContainerStatus();
console.log('Container state:', status.data?.state);

// 執行健康檢查
const health = await containerManager.performHealthCheck();
console.log('Oracle ready:', health.data?.isHealthy);

// 監控日誌
for await (const logEntry of containerManager.monitorLogs()) {
  console.log(`[${logEntry.level}] ${logEntry.message}`);
}
```

## 📋 初始化腳本

初始化腳本位於 `database/init/` 目錄：

- `01-setup-user.sql` - 建立應用程式用戶和基本權限

新增自訂初始化腳本時，請按數字順序命名（如 `02-create-tables.sql`）。

## ⚠️ 故障排除

### 容器啟動失敗

1. 檢查Docker是否運行：

```bash
docker --version
docker-compose --version
```

2. 檢查埠口是否被佔用：

```bash
lsof -i :1521
lsof -i :5500
```

3. 查看容器日誌：

```bash
npm run docker:oracle:logs
```

### 連線失敗

1. 確認容器運行正常：

```bash
npm run docker:oracle:status
```

2. 測試資料庫連線：

```bash
docker exec pcm-oracle-dev sqlplus system/Oracle123@//localhost:1521/XE
```

3. 檢查用戶權限：

```sql
SELECT username, account_status FROM dba_users WHERE username = 'PCM_USER';
```

### 資料遺失

如果需要完全重置環境：

```bash
npm run docker:oracle:reset
npm run docker:oracle:start
```

⚠️ 注意：重置會刪除所有資料！

## 🔒 安全考量

- 預設密碼僅適用於開發環境
- 生產環境必須更改所有預設密碼
- 考慮使用Oracle Wallet進行密碼管理
- 限制網路存取和用戶權限

## 📚 進階設定

### 效能調優

```typescript
// 連線池優化
await oracle.initialize({
  connectString: 'localhost:1521/XE',
  user: 'pcm_user',
  password: 'pcm_pass123',
  poolMin: 10, // 增加最小連線數
  poolMax: 50, // 增加最大連線數
  poolIncrement: 5, // 增加遞增量
  poolTimeout: 30, // 減少超時時間
  enableStatistics: true,
});
```

### 連線監控

```typescript
// 定期檢查連線池狀態
setInterval(() => {
  const status = oracle.getPoolStatus();
  console.log('Pool status:', status);
}, 30000);
```

## 📞 支援

如有問題，請參考：

- [Oracle XE 文檔](https://docs.oracle.com/en/database/oracle/oracle-database/21/xeinl/)
- [node-oracledb 文檔](https://node-oracledb.readthedocs.io/)
- [Docker Compose 文檔](https://docs.docker.com/compose/)

---

_建立時間: 2025-01-23_ _適用版本: PCM v0.1.0_
