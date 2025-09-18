@echo off
echo 🚀 بدء تشغيل مشروع رزقي مع خادم SMTP المدمج
echo ================================================

REM التحقق من وجود Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js غير مثبت! يرجى تثبيت Node.js أولاً
    echo 📥 تحميل من: https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js متوفر

REM التحقق من وجود المكتبات المطلوبة
if not exist "node_modules" (
    echo 📦 تثبيت المكتبات المطلوبة...
    npm install
    
    if %errorlevel% neq 0 (
        echo ❌ فشل في تثبيت المكتبات
        pause
        exit /b 1
    )
    
    echo ✅ تم تثبيت المكتبات بنجاح
)

REM التحقق من وجود مكتبات SMTP
npm list nodemailer >nul 2>&1
if %errorlevel% neq 0 (
    echo 📧 تثبيت مكتبات SMTP...
    npm install nodemailer cors concurrently
    
    if %errorlevel% neq 0 (
        echo ❌ فشل في تثبيت مكتبات SMTP
        pause
        exit /b 1
    )
    
    echo ✅ تم تثبيت مكتبات SMTP بنجاح
)

echo 🔄 إيقاف العمليات السابقة...
REM إيقاف العمليات السابقة على البورت 5173 و 3001
for /f "tokens=5" %%a in ('netstat -ano ^| find "5173" ^| find "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| find "3001" ^| find "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

timeout /t 2 >nul

echo 🚀 بدء تشغيل المشروع مع خادم SMTP...
echo ================================================
echo 📱 التطبيق: http://localhost:5173
echo 📧 خادم SMTP: http://localhost:3001
echo ================================================
echo.
echo 💡 لإيقاف الخوادم: اضغط Ctrl+C
echo.

REM تشغيل المشروع مع خادم SMTP
npm run dev

pause
