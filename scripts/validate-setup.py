#!/usr/bin/env python3
"""
PCM Photo Management System - Setup Validation Script
Validates that all components are properly configured and ready to run.
"""

import sys
import os
from pathlib import Path

def check_file_exists(file_path, description):
    """Check if a file exists and report status"""
    if Path(file_path).exists():
        print(f"✓ {description}: {file_path}")
        return True
    else:
        print(f"✗ {description}: {file_path} (NOT FOUND)")
        return False

def check_directory_exists(dir_path, description):
    """Check if a directory exists and report status"""
    if Path(dir_path).exists() and Path(dir_path).is_dir():
        print(f"✓ {description}: {dir_path}")
        return True
    else:
        print(f"✗ {description}: {dir_path} (NOT FOUND)")
        return False

def main():
    """Main validation function"""
    print("PCM Photo Management System - Setup Validation")
    print("=" * 50)
    
    all_good = True
    
    # Check project structure
    print("\n1. Project Structure:")
    structure_checks = [
        ("backend/src/main.py", "Backend main application"),
        ("backend/src/config.py", "Backend configuration"),
        ("backend/requirements.txt", "Backend dependencies"),
        ("backend/alembic.ini", "Database migrations config"),
        ("frontend/package.json", "Frontend dependencies"),
        ("docker-compose.yml", "Docker composition"),
        (".env.example", "Environment template"),
    ]
    
    for file_path, description in structure_checks:
        if not check_file_exists(file_path, description):
            all_good = False
    
    # Check directories
    print("\n2. Directory Structure:")
    directory_checks = [
        ("backend/src/api", "API routes directory"),
        ("backend/src/models", "Database models directory"),
        ("backend/src/services", "Business logic directory"),
        ("backend/tests", "Backend tests directory"),
        ("frontend/src", "Frontend source directory"),
        ("backend/alembic/versions", "Migration versions"),
    ]
    
    for dir_path, description in directory_checks:
        if not check_directory_exists(dir_path, description):
            all_good = False
    
    # Check backend imports
    print("\n3. Backend Configuration Test:")
    try:
        sys.path.insert(0, 'backend')
        from src.config import get_settings
        settings = get_settings()
        print(f"✓ Configuration loaded successfully")
        print(f"✓ App name: {settings.app_name}")
    except ImportError as e:
        print(f"✗ Configuration import failed: {e}")
        all_good = False
    except Exception as e:
        print(f"✗ Configuration error: {e}")
        all_good = False
    
    # Summary
    print("\n" + "=" * 50)
    if all_good:
        print("✅ All validations passed! Setup is complete.")
        print("\nNext steps:")
        print("1. Copy .env.example to .env and configure your settings")
        print("2. Start services: docker-compose up -d")
        print("3. Run database migrations: alembic upgrade head")
        print("4. Access the application:")
        print("   - Frontend: http://localhost:3000")
        print("   - Backend API: http://localhost:8000/docs")
        return 0
    else:
        print("❌ Some validations failed. Please check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())