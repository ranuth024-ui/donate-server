@echo off
cd /d %~dp0

echo ================================================
echo   DONATE SERVER
echo ================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [LOI] Khong tim thay Node.js tren may nay.
    echo Hay cai Node.js tai https://nodejs.org ^(ban LTS^), roi chay lai file nay.
    echo.
    pause
    exit /b 1
)

echo Da tim thay Node.js, phien ban:
call node --version
echo.

if not exist "C:\donate-data" (
    mkdir "C:\donate-data"
)

if not exist "node_modules" (
    if not exist "C:\donate-data\node_modules" mkdir "C:\donate-data\node_modules"
    mklink /J "node_modules" "C:\donate-data\node_modules" >nul 2>nul
)

echo Dang kiem tra / cai thu vien can thiet...
echo ^(lan dau co the mat 1-2 phut, cac lan sau se nhanh hon nhieu^)
echo.
call npm install --no-audit --no-fund > npm-install-log.txt 2>&1
node -e "require('express')" >nul 2>nul
if errorlevel 1 (
    echo Kiem tra chua du thu vien, dang cai lai lan nua...
    echo ^(co the do phan mem diet virus hoac OneDrive can thiep luc cai dat lan truoc^)
    echo.
    call npm install --no-audit --no-fund >> npm-install-log.txt 2>&1
    node -e "require('express')" >nul 2>nul
    if errorlevel 1 (
        echo.
        echo [LOI] Cai dat thu vien khong thanh cong sau 2 lan thu.
        echo Chi tiet da luu vao file npm-install-log.txt trong thu muc nay.
        echo Neu can hoi Claude, hay chup lai man hinh nay hoac gui file npm-install-log.txt.
        echo.
        pause
        exit /b 1
    )
    echo.
    echo Da cai lai thanh cong.
    echo.
)
echo.
echo San sang.
echo.

set DB_PATH=C:\donate-data\donate.db

echo Du lieu ^(donate.db^) se duoc luu tai: %DB_PATH%
echo ^(luu ngoai OneDrive de tranh loi dong bo lam hong du lieu^)
echo.
echo ================================================
echo   Dang khoi dong server...
echo.
echo   Trang donate (cong khai):  http://localhost:3000/
echo   Trang quan tri:            http://localhost:3000/admin.html
echo.
echo   QUAN TRONG: de cua so nay luon MO trong luc dung trang.
echo   Dong cua so nay se tat server, trang se ngung hoat dong.
echo.
echo   De dung server: bam Ctrl+C, hoac dong cua so nay.
echo ================================================
echo.

call npm start

echo.
echo Server da dung.
pause
