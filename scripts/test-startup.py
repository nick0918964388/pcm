#!/usr/bin/env python3
"""
PCM Photo Management System - Quick Startup Test
Tests what can be started and accessed right now without database setup.
"""

import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, 'backend')

def test_basic_imports():
    """Test if we can import the basic modules"""
    print("測試基本模組導入...")
    try:
        from src.config import get_settings
        print("✓ Config 模組導入成功")
        
        settings = get_settings()
        print(f"✓ 應用程式名稱: {settings.app_name}")
        
        return True
    except Exception as e:
        print(f"✗ 配置導入失敗: {e}")
        return False

def test_api_structure():
    """Test if API structure is ready"""
    print("\n測試 API 結構...")
    try:
        from src.api.v1.health import router as health_router
        print("✓ Health API 路由已準備")
        
        from src.api.v1.photos import router as photos_router
        print("✓ Photos API 路由已準備")
        
        from src.api.v1.albums import router as albums_router
        print("✓ Albums API 路由已準備")
        
        return True
    except Exception as e:
        print(f"✗ API 結構測試失敗: {e}")
        return False

def show_available_endpoints():
    """Show what endpoints would be available"""
    print("\n🌐 目前可用的端點 (需要啟動服務):")
    print("━" * 50)
    print("Backend API (http://localhost:8000):")
    print("  📋 根端點: GET /")
    print("  📋 API 文件: GET /docs")
    print("  📋 健康檢查: GET /api/v1/health/")
    print("  📋 存活檢查: GET /api/v1/health/live")
    print("  📋 準備檢查: GET /api/v1/health/ready")
    print("")
    print("照片管理端點 (未連接資料庫會顯示錯誤):")
    print("  📸 照片列表: GET /api/v1/photos")
    print("  📸 上傳照片: POST /api/v1/photos")
    print("  📁 相簿管理: GET /api/v1/albums")
    print("  🔍 搜尋照片: GET /api/v1/search/photos")
    print("")
    print("Frontend (http://localhost:3000):")
    print("  🎨 Next.js 應用程式 (需要 npm start)")
    print("")
    print("監控服務:")
    print("  🌸 Flower (Celery): http://localhost:5555")

def show_startup_commands():
    """Show commands to start the services"""
    print("\n🚀 啟動命令:")
    print("━" * 50)
    print("1. 使用 Docker (推薦):")
    print("   docker-compose up -d")
    print("")
    print("2. 手動啟動 Backend:")
    print("   cd backend")
    print("   pip install -r requirements.txt")
    print("   python src/main.py")
    print("")
    print("3. 手動啟動 Frontend:")
    print("   cd frontend")
    print("   npm install")
    print("   npm run dev")
    print("")
    print("⚠️  注意: 需要先設定資料庫和 Redis 才能完全運作")

def main():
    print("PCM 照片管理系統 - 啟動測試")
    print("=" * 50)
    
    # Test imports
    imports_ok = test_basic_imports()
    api_ok = test_api_structure()
    
    if imports_ok and api_ok:
        print("\n✅ 基礎架構準備完成！")
        show_available_endpoints()
        show_startup_commands()
        print("\n💡 提示: 即使沒有資料庫，你也可以啟動服務查看 API 文件")
    else:
        print("\n❌ 基礎架構還有問題需要修復")

if __name__ == "__main__":
    os.chdir(Path(__file__).parent.parent)
    main()