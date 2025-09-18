-- الخطوة الأولى: البحث عن جميع نسخ الدوال الموجودة
-- تاريخ الإنشاء: 12-09-2025

-- ===================================
-- البحث عن جميع نسخ دالة create_notification
-- ===================================

SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments,
    'DROP FUNCTION IF EXISTS ' || proname || '(' || pg_get_function_identity_arguments(oid) || ') CASCADE;' as drop_command
FROM pg_proc 
WHERE proname = 'create_notification'
ORDER BY arguments;

-- ===================================
-- البحث عن دوال الإشعارات الأخرى
-- ===================================

SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments,
    'DROP FUNCTION IF EXISTS ' || proname || '(' || pg_get_function_identity_arguments(oid) || ') CASCADE;' as drop_command
FROM pg_proc 
WHERE proname IN ('notify_user_like', 'notify_profile_view', 'notify_new_message', 'notify_new_match')
ORDER BY proname, arguments;

-- ===================================
-- البحث عن الـ triggers الموجودة
-- ===================================

SELECT 
    trigger_name,
    event_object_table,
    'DROP TRIGGER IF EXISTS ' || trigger_name || ' ON public.' || event_object_table || ';' as drop_command
FROM information_schema.triggers 
WHERE trigger_name LIKE '%notify%'
ORDER BY trigger_name;
