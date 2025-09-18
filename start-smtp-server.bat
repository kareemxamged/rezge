@echo off
echo 🚀 بدء تشغيل خادم SMTP المستقل لموقع رزقي
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
    
    REM إنشاء package.json إذا لم يكن موجوداً
    if not exist "package.json" (
        copy smtp-package.json package.json
    )
    
    npm install nodemailer cors
    
    if %errorlevel% neq 0 (
        echo ❌ فشل في تثبيت المكتبات
        pause
        exit /b 1
    )
    
    echo ✅ تم تثبيت المكتبات بنجاح
)

REM التحقق من توفر البورت 3001
netstat -an | find "3001" >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️ البورت 3001 مستخدم بالفعل
    echo 🔄 محاولة إيقاف العملية السابقة...
    
    REM محاولة إيقاف العملية السابقة
    for /f "tokens=5" %%a in ('netstat -ano ^| find "3001" ^| find "LISTENING"') do (
        taskkill /PID %%a /F >nul 2>&1
    )
    
    timeout /t 2 >nul
)

echo 🚀 بدء تشغيل خادم SMTP...
echo 📡 العنوان: http://localhost:3001
echo 📧 جاهز لاستقبال طلبات الإرسال
echo.
echo 💡 لإيقاف الخادم: اضغط Ctrl+C
echo ================================================

REM تشغيل الخادم
node smtp-server.js

pause
