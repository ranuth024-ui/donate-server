@echo off
cd /d %~dp0

echo ================================================
echo   MO DIA CHI CONG KHAI (ngrok)
echo ================================================
echo.
echo Truoc khi chay file nay, kiem tra lai:
echo   1. Cua so chay-server.bat phai dang MO (server dang chay).
echo   2. Ban da chay lenh ngrok config add-authtoken (mot lan duy nhat,
echo      sau khi dang ky tai khoan tai dashboard.ngrok.com - xem huong dan).
echo.
echo ================================================
echo.

set NGROK_EXE=%~dp0..\ngrok\ngrok.exe
if not exist "%NGROK_EXE%" set NGROK_EXE=C:\ngrok\ngrok.exe

if exist "%NGROK_EXE%" (
    echo Dang chay ngrok tu %NGROK_EXE% ...
    echo Dia chi cong khai co dinh: https://chummy-giggly-antitrust.ngrok-free.dev
    echo.
    "%NGROK_EXE%" http 127.0.0.1:3000 --url https://chummy-giggly-antitrust.ngrok-free.dev
) else (
    where ngrok >nul 2>nul
    if errorlevel 1 (
        echo [LOI] Khong tim thay ngrok.exe.
        echo Kiem tra file ngrok.exe co nam trong thu muc donate\ngrok\ khong.
        echo.
        pause
        exit /b 1
    ) else (
        ngrok http 127.0.0.1:3000 --url https://chummy-giggly-antitrust.ngrok-free.dev
    )
)

echo.
echo ngrok da dung.
pause
