-- إضافة صلاحية إنشاء المستخدمين للنظام الإداري
-- تاريخ الإنشاء: 12-08-2025
-- الغرض: إضافة صلاحية create_users وربطها بدور Super Admin

-- بدء المعاملة
BEGIN;

-- إضافة صلاحية إنشاء المستخدمين
INSERT INTO public.admin_permissions (code, name, description, category) VALUES
('create_users', 'إنشاء المستخدمين', 'إنشاء حسابات مستخدمين جديدة في النظام', 'users')
ON CONFLICT (code) DO NOTHING;

-- ربط الصلاحية الجديدة بدور Super Admin
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM public.admin_roles WHERE name = 'super_admin'),
    (SELECT id FROM public.admin_permissions WHERE code = 'create_users')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ربط الصلاحية الجديدة بدور Admin
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM public.admin_roles WHERE name = 'admin'),
    (SELECT id FROM public.admin_permissions WHERE code = 'create_users')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ربط الصلاحية الجديدة بدور User Manager
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM public.admin_roles WHERE name = 'user_manager'),
    (SELECT id FROM public.admin_permissions WHERE code = 'create_users')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- إنهاء المعاملة
COMMIT;

-- التحقق من إضافة الصلاحية
SELECT 
    p.code,
    p.name,
    p.description,
    p.category
FROM public.admin_permissions p
WHERE p.code = 'create_users';

-- التحقق من ربط الصلاحية بالأدوار
SELECT 
    r.name as role_name,
    r.display_name,
    p.code as permission_code,
    p.name as permission_name
FROM public.admin_role_permissions rp
JOIN public.admin_roles r ON rp.role_id = r.id
JOIN public.admin_permissions p ON rp.permission_id = p.id
WHERE p.code = 'create_users'
ORDER BY r.name;
