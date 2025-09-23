# 資料比對工具使用範例

## 安裝和設定

1. 確保已安裝必要的資料庫驅動程式：
```bash
npm install pg oracledb
```

2. 建立預設配置檔案：
```bash
npm run data-compare:init
```

## 配置檔案範例

```json
{
  "sourceDb": {
    "type": "postgresql",
    "host": "localhost",
    "port": 5432,
    "database": "pcm_source",
    "username": "postgres",
    "password": "password"
  },
  "targetDb": {
    "type": "oracle",
    "host": "localhost",
    "port": 1521,
    "database": "XE",
    "username": "pcm",
    "password": "password"
  },
  "tables": [
    "users",
    "projects",
    "project_members",
    "wbs_items",
    "vendors",
    "duty_schedules"
  ],
  "excludeColumns": ["created_at", "updated_at"],
  "includeSystemTables": false,
  "maxSampleSize": 1000,
  "batchSize": 100
}
```

## 使用方式

### 1. 完整資料比對
```bash
npm run data-compare compare
```

### 2. 只比對計數
```bash
npm run data-compare compare --count-only
```

### 3. 只比對特定表格
```bash
npm run data-compare compare --tables "users,projects"
```

### 4. 指定輸出格式和路徑
```bash
npm run data-compare compare -o ./reports/comparison.txt -f txt
```

### 5. 使用自訂配置檔案
```bash
npm run data-compare compare -c ./configs/production.json
```

## 輸出範例

### 文字格式報告
```
================================================================================
資料比對報告
================================================================================
執行時間: 2024-01-23T10:30:00.000Z
執行 ID: comp_1705998600000
總耗時: 2500ms

摘要
----------------------------------------
總表格數: 6
計數不匹配: 1
內容差異: 0
結構差異: 0
資料完整性: 83.33%

表格計數比對
----------------------------------------
✓ users: 1000 -> 1000
✓ projects: 50 -> 50
✗ project_members: 200 -> 195
  差異: 5 (2.50%)
✓ wbs_items: 500 -> 500
✓ vendors: 25 -> 25
✓ duty_schedules: 1500 -> 1500
```

### JSON 格式報告
```json
{
  "executionId": "comp_1705998600000",
  "timestamp": "2024-01-23T10:30:00.000Z",
  "summary": {
    "totalTables": 6,
    "tablesWithCountMismatch": 1,
    "tablesWithContentDifferences": 0,
    "tablesWithStructureDifferences": 0,
    "overallDataIntegrity": 83.33,
    "criticalIssues": 1,
    "warnings": 0
  },
  "countResults": [
    {
      "tableName": "users",
      "sourceCount": 1000,
      "targetCount": 1000,
      "countMatch": true,
      "difference": 0,
      "percentageDiff": 0
    },
    {
      "tableName": "project_members",
      "sourceCount": 200,
      "targetCount": 195,
      "countMatch": false,
      "difference": 5,
      "percentageDiff": 2.5
    }
  ],
  "executionTime": 2500
}
```

## 程式化使用

```typescript
import { DataComparisonService } from './data-comparison.service';
import { PostgreSQLConnection, OracleConnection } from './connections';

// 建立連線
const sourceConn = new PostgreSQLConnection(sourceConfig);
const targetConn = new OracleConnection(targetConfig);

// 建立比對服務
const comparisonTool = new DataComparisonService(sourceConn, targetConn);

// 執行比對
const report = await comparisonTool.performFullComparison({
  sourceDb: sourceConfig,
  targetDb: targetConfig,
  tables: ['users', 'projects'],
  maxSampleSize: 1000
});

console.log('資料完整性:', report.summary.overallDataIntegrity);
```

## 錯誤處理

### 常見錯誤和解決方案

1. **連線失敗**
   - 檢查資料庫是否運行
   - 驗證連線參數
   - 確認防火牆設定

2. **權限不足**
   - 確認使用者有讀取權限
   - 檢查表格是否存在

3. **記憶體不足**
   - 減少 `maxSampleSize`
   - 調整 `batchSize`

## 進階配置

### 自訂比對選項
```typescript
const options: ComparisonOptions = {
  ignoreCase: true,
  trimWhitespace: true,
  ignoreDateFormats: false,
  numericTolerance: 0.01,
  onProgress: {
    onTableStart: (tableName) => console.log(`開始比對 ${tableName}`),
    onTableComplete: (tableName, result) => console.log(`完成 ${tableName}`)
  }
};
```

### 排程執行
```bash
# 使用 cron 排程每日執行
0 2 * * * cd /path/to/pcm && npm run data-compare compare
```