-- تعيين test6@gmail.com كـ Super Admin للنظام الإداري
-- تاريخ الإنشاء: 12-08-2025
-- الغرض: تعيين المستخدم test6@gmail.com كمشرف عام للوحة التحكم

-- بدء المعاملة
BEGIN;

-- إنشاء الجداول الإدارية إذا لم تكن موجودة

-- جدول الأدوار الإدارية
CREATE TABLE IF NOT EXISTS public.admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول الصلاحيات الإدارية
CREATE TABLE IF NOT EXISTS public.admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول ربط الأدوار بالصلاحيات
CREATE TABLE IF NOT EXISTS public.admin_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.admin_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- جدول المستخدمين الإداريين
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true,
    is_super_admin BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- جدول جلسات المشرفين
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول سجل الأنشطة الإدارية
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إدراج الأدوار الإدارية الأساسية
INSERT INTO public.admin_roles (name, display_name, description) VALUES
('super_admin', 'مشرف عام', 'مشرف عام بجميع الصلاحيات'),
('admin', 'مدير', 'مدير بمعظم الصلاحيات الإدارية'),
('content_manager', 'مدير محتوى', 'مدير المقالات والمحتوى'),
('user_manager', 'مدير مستخدمين', 'مدير المستخدمين والملفات الشخصية'),
('security_manager', 'مدير أمان', 'مدير الأمان ومراقبة النظام'),
('moderator', 'مشرف', 'مشرف المحتوى والتعليقات')
ON CONFLICT (name) DO NOTHING;

-- إدراج الصلاحيات الإدارية
INSERT INTO public.admin_permissions (code, name, description, category) VALUES
-- صلاحيات إدارة المستخدمين
('view_users', 'عرض المستخدمين', 'عرض قائمة المستخدمين وملفاتهم الشخصية', 'users'),
('edit_users', 'تعديل المستخدمين', 'تعديل بيانات المستخدمين', 'users'),
('delete_users', 'حذف المستخدمين', 'حذف حسابات المستخدمين', 'users'),
('manage_user_verification', 'إدارة التحقق', 'إدارة حالة التحقق للمستخدمين', 'users'),

-- صلاحيات إدارة المحتوى
('view_articles', 'عرض المقالات', 'عرض جميع المقالات', 'content'),
('create_articles', 'إنشاء المقالات', 'إنشاء مقالات جديدة', 'content'),
('edit_articles', 'تعديل المقالات', 'تعديل المقالات الموجودة', 'content'),
('delete_articles', 'حذف المقالات', 'حذف المقالات', 'content'),
('manage_categories', 'إدارة التصنيفات', 'إدارة تصنيفات المقالات', 'content'),

-- صلاحيات إدارة النظام
('view_dashboard', 'عرض لوحة التحكم', 'الوصول للوحة التحكم الرئيسية', 'system'),
('view_analytics', 'عرض الإحصائيات', 'عرض إحصائيات الموقع', 'system'),
('manage_settings', 'إدارة الإعدادات', 'إدارة إعدادات النظام', 'system'),
('view_logs', 'عرض السجلات', 'عرض سجلات النظام والأنشطة', 'system'),

-- صلاحيات الأمان
('view_security', 'عرض الأمان', 'عرض تقارير الأمان', 'security'),
('manage_reports', 'إدارة البلاغات', 'إدارة بلاغات المستخدمين', 'security'),
('manage_blocks', 'إدارة الحظر', 'إدارة حظر المستخدمين', 'security'),

-- صلاحيات إدارة المشرفين
('view_admins', 'عرض المشرفين', 'عرض قائمة المشرفين', 'admin'),
('manage_admins', 'إدارة المشرفين', 'إضافة وتعديل وحذف المشرفين', 'admin'),
('manage_roles', 'إدارة الأدوار', 'إدارة أدوار وصلاحيات المشرفين', 'admin')
ON CONFLICT (code) DO NOTHING;

-- ربط دور Super Admin بجميع الصلاحيات
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM public.admin_roles WHERE name = 'super_admin'),
    id
FROM public.admin_permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- البحث عن المستخدم test6@gmail.com
DO $$
DECLARE
    target_user_id UUID;
    super_admin_role_id UUID;
BEGIN
    -- البحث عن المستخدم
    SELECT id INTO target_user_id 
    FROM public.users 
    WHERE email = 'test6@gmail.com';
    
    -- إذا لم يوجد المستخدم، إنشاؤه
    IF target_user_id IS NULL THEN
        INSERT INTO public.users (
            email, 
            first_name, 
            last_name, 
            verified, 
            status,
            created_at
        ) VALUES (
            'test6@gmail.com',
            'Super',
            'Admin',
            true,
            'active',
            NOW()
        ) RETURNING id INTO target_user_id;
        
        RAISE NOTICE 'تم إنشاء المستخدم test6@gmail.com بـ ID: %', target_user_id;
    ELSE
        RAISE NOTICE 'تم العثور على المستخدم test6@gmail.com بـ ID: %', target_user_id;
    END IF;
    
    -- الحصول على ID دور Super Admin
    SELECT id INTO super_admin_role_id 
    FROM public.admin_roles 
    WHERE name = 'super_admin';
    
    -- إضافة المستخدم كـ Super Admin
    INSERT INTO public.admin_users (
        user_id,
        role_id,
        is_super_admin,
        is_active,
        created_at
    ) VALUES (
        target_user_id,
        super_admin_role_id,
        true,
        true,
        NOW()
    ) ON CONFLICT (user_id) DO UPDATE SET
        role_id = EXCLUDED.role_id,
        is_super_admin = EXCLUDED.is_super_admin,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
    
    RAISE NOTICE 'تم تعيين test6@gmail.com كـ Super Admin بنجاح!';
END $$;

-- تفعيل Row Level Security
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات RLS للمشرفين فقط
CREATE POLICY "Admins can view admin data" ON public.admin_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Admins can view admin data" ON public.admin_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Admins can view admin data" ON public.admin_role_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Admins can view admin data" ON public.admin_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Admins can view admin data" ON public.admin_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Admins can view admin data" ON public.admin_activity_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- إنهاء المعاملة
COMMIT;

-- رسالة تأكيد
SELECT 
    u.email,
    u.first_name,
    u.last_name,
    au.is_super_admin,
    au.is_active,
    r.display_name as role_name
FROM public.users u
JOIN public.admin_users au ON u.id = au.user_id
JOIN public.admin_roles r ON au.role_id = r.id
WHERE u.email = 'test6@gmail.com';
