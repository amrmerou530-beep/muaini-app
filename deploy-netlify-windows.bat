@echo off
chcp 65001 >nul
echo تثبيت الاعتماديات...
call npm install
if errorlevel 1 goto error
echo تسجيل الدخول إلى Netlify...
call npx netlify login
if errorlevel 1 goto error
echo ربط المجلد بالموقع الحالي...
call npx netlify link
if errorlevel 1 goto error
echo بناء ونشر النسخة الكاملة...
call npx netlify deploy --build --prod
if errorlevel 1 goto error
echo تم النشر بنجاح.
pause
exit /b 0
:error
echo حدث خطأ. راجع الرسالة أعلى الشاشة.
pause
exit /b 1
