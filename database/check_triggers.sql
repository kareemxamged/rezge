-- فحص الـ triggers الموجودة
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name LIKE '%notify%'
ORDER BY trigger_name;
