@echo off
REM Windows get-content 腳本模擬
REM 用於讀取設計和需求文件進行驗證

if "%1"=="" (
    echo 使用方式: get-content [檔案路徑]
    exit /b 1
)

if not exist "%1" (
    echo 錯誤: 檔案不存在 - %1
    exit /b 1
)

REM 輸出檔案內容
type "%1"