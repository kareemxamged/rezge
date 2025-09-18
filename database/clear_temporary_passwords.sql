-- حذف جميع كلمات المرور المؤقتة من قاعدة البيانات
-- يجب تشغيل هذا في Supabase SQL Editor

-- عرض عدد السجلات قبل الحذف
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_used = false THEN 1 END) as unused_records,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as valid_records
FROM temporary_passwords;

-- عرض السجلات الموجودة (اختياري)
SELECT 
    id,
    email,
    is_used,
    expires_at,
    created_at,
    temp_password_plain
FROM temporary_passwords
ORDER BY created_at DESC;

-- حذف جميع السجلات
DELETE FROM temporary_passwords;

-- التحقق من أن الجدول فارغ
SELECT COUNT(*) as remaining_records FROM temporary_passwords;

-- رسالة تأكيد
DO $$
BEGIN
    RAISE NOTICE 'تم حذف جميع كلمات المرور المؤقتة بنجاح';
    RAISE NOTICE 'تاريخ التنظيف: %', NOW();
END $$;
