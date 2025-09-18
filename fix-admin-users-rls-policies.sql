-- إصلاح سياسات RLS لجدول المستخدمين للسماح للمشرفين بالتعديل
-- تاريخ الإنشاء: 12-08-2025
-- الغرض: السماح للمشرفين بعرض وتعديل بيانات المستخدمين

-- بدء المعاملة
BEGIN;

-- حذف السياسات الموجودة إذا كانت موجودة
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- إضافة سياسة للسماح للمشرفين بعرض جميع المستخدمين
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- إضافة سياسة للسماح للمشرفين بتحديث بيانات المستخدمين
CREATE POLICY "Admins can update users" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- إضافة سياسة للسماح للمشرفين بإنشاء مستخدمين جدد
CREATE POLICY "Admins can insert users" ON public.users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- إضافة سياسة للسماح للمشرفين بحذف المستخدمين (حذف ناعم)
CREATE POLICY "Admins can delete users" ON public.users
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- إضافة صلاحية إدارة المستخدمين إذا لم تكن موجودة
INSERT INTO public.admin_permissions (code, name, description, category) VALUES
('manage_users', 'إدارة المستخدمين', 'إدارة حالة وبيانات المستخدمين', 'users')
ON CONFLICT (code) DO NOTHING;

-- ربط صلاحية إدارة المستخدمين بالأدوار المناسبة
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE r.name IN ('super_admin', 'admin', 'user_manager')
AND p.code = 'manage_users'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- إنهاء المعاملة
COMMIT;

-- التحقق من السياسات المضافة
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'users' 
AND schemaname = 'public'
ORDER BY policyname;

-- التحقق من الصلاحيات
SELECT 
    r.name as role_name,
    r.display_name,
    p.code as permission_code,
    p.name as permission_name
FROM public.admin_role_permissions rp
JOIN public.admin_roles r ON rp.role_id = r.id
JOIN public.admin_permissions p ON rp.permission_id = p.id
WHERE p.code = 'manage_users'
ORDER BY r.name;
