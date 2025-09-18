-- اختبار النظام الإداري والتحقق من حالة test6@gmail.com
-- تاريخ الإنشاء: 12-08-2025
-- الغرض: التحقق من حالة النظام الإداري وصلاحيات المستخدم

-- التحقق من وجود الجداول الإدارية
SELECT 
    'admin_roles' as table_name,
    COUNT(*) as record_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'admin_roles'
UNION ALL
SELECT 
    'admin_permissions' as table_name,
    COUNT(*) as record_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'admin_permissions'
UNION ALL
SELECT 
    'admin_users' as table_name,
    COUNT(*) as record_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'admin_users'
UNION ALL
SELECT 
    'admin_role_permissions' as table_name,
    COUNT(*) as record_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'admin_role_permissions';

-- التحقق من وجود المستخدم test6@gmail.com
SELECT 
    'User Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'test6@gmail.com') 
        THEN 'موجود' 
        ELSE 'غير موجود' 
    END as status,
    (SELECT id FROM public.users WHERE email = 'test6@gmail.com') as user_id;

-- التحقق من حالة المستخدم الإدارية
SELECT 
    'Admin Status Check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.admin_users au 
            JOIN public.users u ON au.user_id = u.id 
            WHERE u.email = 'test6@gmail.com'
        ) 
        THEN 'مشرف' 
        ELSE 'ليس مشرف' 
    END as status;

-- عرض تفاصيل المستخدم الإداري إذا كان موجوداً
SELECT 
    u.email,
    u.first_name,
    u.last_name,
    u.verified,
    u.status as user_status,
    au.is_super_admin,
    au.is_active as admin_active,
    r.name as role_name,
    r.display_name as role_display_name,
    au.created_at as admin_created_at,
    au.last_login_at
FROM public.users u
LEFT JOIN public.admin_users au ON u.id = au.user_id
LEFT JOIN public.admin_roles r ON au.role_id = r.id
WHERE u.email = 'test6@gmail.com';

-- عرض عدد الأدوار الإدارية
SELECT 
    'Admin Roles Count' as info_type,
    COUNT(*) as count
FROM public.admin_roles
WHERE is_active = true;

-- عرض الأدوار الإدارية المتاحة
SELECT 
    name,
    display_name,
    description,
    is_active
FROM public.admin_roles
ORDER BY name;

-- عرض عدد الصلاحيات
SELECT 
    'Admin Permissions Count' as info_type,
    COUNT(*) as count
FROM public.admin_permissions
WHERE is_active = true;

-- عرض الصلاحيات حسب الفئة
SELECT 
    category,
    COUNT(*) as permissions_count
FROM public.admin_permissions
WHERE is_active = true
GROUP BY category
ORDER BY category;

-- التحقق من صلاحيات دور Super Admin
SELECT 
    r.display_name as role_name,
    COUNT(rp.permission_id) as permissions_count
FROM public.admin_roles r
LEFT JOIN public.admin_role_permissions rp ON r.id = rp.role_id
WHERE r.name = 'super_admin'
GROUP BY r.id, r.display_name;

-- عرض جميع المشرفين الحاليين
SELECT 
    u.email,
    u.first_name,
    u.last_name,
    r.display_name as role,
    au.is_super_admin,
    au.is_active,
    au.created_at
FROM public.admin_users au
JOIN public.users u ON au.user_id = u.id
JOIN public.admin_roles r ON au.role_id = r.id
ORDER BY au.created_at DESC;

-- التحقق من سياسات RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('admin_roles', 'admin_permissions', 'admin_users', 'admin_role_permissions')
ORDER BY tablename, policyname;

-- إحصائيات سريعة
SELECT 
    'System Statistics' as info_type,
    json_build_object(
        'total_users', (SELECT COUNT(*) FROM public.users),
        'active_users', (SELECT COUNT(*) FROM public.users WHERE status = 'active'),
        'verified_users', (SELECT COUNT(*) FROM public.users WHERE verified = true),
        'admin_users', (SELECT COUNT(*) FROM public.admin_users WHERE is_active = true),
        'super_admins', (SELECT COUNT(*) FROM public.admin_users WHERE is_super_admin = true AND is_active = true),
        'admin_roles', (SELECT COUNT(*) FROM public.admin_roles WHERE is_active = true),
        'admin_permissions', (SELECT COUNT(*) FROM public.admin_permissions WHERE is_active = true)
    ) as statistics;
