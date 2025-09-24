# PCM Photo Management System

一個專為建設專案打造的照片收集管理系統，基於現代化的 web 技術架構，提供高效的照片上傳、管理、搜尋和分享功能。

## 🏗️ 技術架構

### 後端技術棧

- **Framework**: Python 3.11 + FastAPI
- **資料庫**: Oracle XE 21c (Docker)
- **快取**: Redis 7.2
- **非同步任務**: Celery
- **圖片處理**: Pillow
- **認證**: JWT

### 前端技術棧

- **Framework**: React 18 + Next.js 14
- **語言**: TypeScript
- **樣式**: Tailwind CSS
- **狀態管理**: Zustand
- **API 請求**: SWR

### 基礎設施

- **容器化**: Docker + Docker Compose
- **代理**: Nginx (生產環境)
- **監控**: Prometheus + Grafana
- **日誌**: Structured logging with JSON format

## 🚀 快速開始

### 系統需求

- Docker Desktop 4.20+
- Docker Compose 2.15+
- Node.js 18+ (開發環境)
- Python 3.11+ (開發環境)

### 1. 克隆專案

```bash
git clone <repository-url>
cd pcm
```

### 2. 環境設定

```bash
# 複製環境變數範本
cp .env.example .env

# 編輯環境變數 (設定 Oracle 密碼)
# nano .env
```

### 3. 啟動開發環境

```bash
# 啟動所有服務 (首次啟動需要 5-10 分鐘下載映像檔)
docker-compose up -d

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f
```

### 4. 健康檢查

等待所有服務啟動完成後，檢查各服務狀態：

```bash
# API 健康檢查
curl http://localhost:8000/health

# 前端頁面
open http://localhost:3000

# Celery 監控 (Flower)
open http://localhost:5555

# Oracle Enterprise Manager (可選)
open http://localhost:5500/em
```

### 5. 資料庫初始化

```bash
# 執行資料庫遷移 (後續實作後執行)
docker-compose exec backend alembic upgrade head

# 載入測試資料 (可選)
docker-compose exec backend python scripts/seed_data.py
```

## 📁 專案結構

```
pcm-photo-management/
├── backend/                 # Python FastAPI 後端
│   ├── src/
│   │   ├── api/            # API 路由
│   │   ├── models/         # 資料模型
│   │   ├── services/       # 業務邏輯
│   │   ├── repositories/   # 資料存取層
│   │   ├── utils/          # 工具函數
│   │   └── config.py       # 設定檔
│   ├── tests/              # 測試檔案
│   ├── alembic/            # 資料庫遷移
│   └── requirements.txt    # Python 相依套件
│
├── frontend/               # React Next.js 前端
│   ├── src/
│   │   ├── app/           # Next.js App Router
│   │   ├── components/    # React 元件
│   │   ├── hooks/         # 自訂 Hooks
│   │   ├── services/      # API 服務
│   │   ├── store/         # 狀態管理
│   │   └── types/         # TypeScript 型別
│   └── package.json       # Node.js 相依套件
│
├── database/               # 資料庫腳本
│   ├── scripts/           # 維護腳本
│   └── init/              # 初始化腳本
│
├── docs/                   # 專案文件
├── docker-compose.yml      # Docker 服務定義
└── README.md              # 本檔案
```

## 🔧 開發指令

### Docker 操作

```bash
# 啟動所有服務
docker-compose up -d

# 停止所有服務
docker-compose down

# 重建映像檔
docker-compose build

# 查看服務狀態
docker-compose ps

# 查看服務日誌
docker-compose logs -f [service-name]

# 執行指令於容器內
docker-compose exec backend bash
docker-compose exec frontend sh
```

### 後端開發

```bash
# 進入後端容器
docker-compose exec backend bash

# 執行測試
pytest

# 檢查程式碼品質
black --check .
flake8 .

# 資料庫遷移
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### 前端開發

```bash
# 進入前端容器
docker-compose exec frontend sh

# 安裝套件
npm install

# 執行測試
npm test

# 型別檢查
npm run type-check

# 程式碼檢查
npm run lint
```

## 🌐 服務端點

| 服務        | URL                        | 說明             |
| ----------- | -------------------------- | ---------------- |
| 前端應用    | http://localhost:3000      | React 使用者介面 |
| 後端 API    | http://localhost:8000      | FastAPI REST API |
| API 文件    | http://localhost:8000/docs | Swagger UI       |
| Celery 監控 | http://localhost:5555      | Flower 監控介面  |
| Oracle EM   | http://localhost:5500/em   | 資料庫管理介面   |

## 🔐 預設帳號密碼

### 開發環境預設帳號

- **Oracle 資料庫**
  - 系統管理員: `SYS` / `oracle`
  - 應用使用者: `pcm_user` / `oracle123`

- **Celery Flower 監控**
  - 使用者名稱: `admin`
  - 密碼: `flower123`

### 安全提醒

⚠️ **重要**: 生產環境部署前務必修改所有預設密碼和金鑰！

## 📊 監控和日誌

### 健康檢查端點

- **整體健康狀態**: `GET /health`
- **就緒狀態檢查**: `GET /health/ready`
- **存活狀態檢查**: `GET /health/live`

### 日誌查看

```bash
# 查看所有服務日誌
docker-compose logs -f

# 查看特定服務日誌
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f oracle-xe
```

### 效能監控

```bash
# 查看容器資源使用情況
docker stats

# 查看磁碟使用情況
docker system df
```

## 🧪 測試

### 後端測試

```bash
# 執行所有測試
docker-compose exec backend pytest

# 執行特定測試檔案
docker-compose exec backend pytest tests/test_photos.py

# 執行測試並生成覆蓋率報告
docker-compose exec backend pytest --cov=src
```

### 前端測試

```bash
# 執行所有測試
docker-compose exec frontend npm test

# 執行測試監視模式
docker-compose exec frontend npm run test:watch

# 執行測試並生成覆蓋率報告
docker-compose exec frontend npm run test:coverage
```

## 🚀 生產環境部署

### 使用生產 Docker Compose

```bash
# 使用生產設定檔
docker-compose -f docker-compose.prod.yml up -d

# 或者使用覆蓋設定
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 環境變數設定

生產環境部署前，請務必：

1. 修改所有密碼和金鑰
2. 設定正確的 CORS 來源
3. 啟用 HTTPS
4. 配置外部儲存 (如 AWS S3)
5. 設定監控和告警

## 📝 API 文件

啟動開發環境後，可透過以下 URL 查看 API 文件：

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🤝 貢獻指南

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/new-feature`)
3. 提交變更 (`git commit -am 'Add new feature'`)
4. 推送到分支 (`git push origin feature/new-feature`)
5. 建立 Pull Request

## 📄 授權條款

本專案採用 MIT 授權條款。詳細內容請參閱 [LICENSE](LICENSE) 檔案。

## 🆘 故障排除

### 常見問題

**Q: Oracle 容器啟動失敗**

```bash
# 檢查容器日誌
docker-compose logs oracle-xe

# 確保有足夠的系統資源 (至少 4GB RAM)
# 清除舊有的 volume 資料
docker-compose down -v
docker-compose up -d
```

**Q: 後端 API 無法連接資料庫**

```bash
# 檢查資料庫是否完全啟動
docker-compose logs oracle-xe | grep "DATABASE IS READY TO USE"

# 測試資料庫連線
docker-compose exec backend python -c "from src.config import get_settings; print(get_settings().sqlalchemy_database_uri)"
```

**Q: 前端無法連接後端 API**

```bash
# 檢查後端服務狀態
curl http://localhost:8000/health

# 檢查網路設定
docker network ls
docker network inspect pcm_pcm-network
```

**Q: 檔案上傳失敗**

```bash
# 檢查上傳目錄權限
docker-compose exec backend ls -la /app/uploads

# 檢查磁碟空間
df -h
```

### 重置環境

```bash
# 停止所有服務並清除資料
docker-compose down -v

# 清除映像檔 (可選)
docker-compose down --rmi all

# 清除系統 (謹慎使用)
docker system prune -a
```

## 📞 技術支援

如有問題或建議，請：

1. 查閱本 README 的故障排除章節
2. 檢查 [Issues](../../issues) 是否有相關問題
3. 建立新的 Issue 並提供詳細資訊

---

**版本**: 1.0.0  
**最後更新**: 2024年8月29日  
**維護團隊**: PCM 開發團隊
