-- إصلاح سياسات الأمان لجدول طلبات التوثيق
-- تاريخ الإنشاء: 21-08-2025

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Users can view their own verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Users can insert their own verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Users can update their own pending verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Admins can view all verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Admins can update verification requests" ON public.verification_requests;

-- سياسات جديدة للمستخدمين العاديين
CREATE POLICY "Users can view their own verification requests" ON public.verification_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verification requests" ON public.verification_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending verification requests" ON public.verification_requests
    FOR UPDATE USING (
        auth.uid() = user_id
        AND (
            status = 'pending'
            OR (status = 'pending' AND submission_step < 5)
        )
    ) WITH CHECK (
        auth.uid() = user_id
        AND (
            status IN ('pending', 'under_review')
        )
    );

-- سياسات للإداريين
CREATE POLICY "Admins can view all verification requests" ON public.verification_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users au 
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

CREATE POLICY "Admins can update verification requests" ON public.verification_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.admin_users au 
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

-- سياسة للسماح للإداريين بإدراج طلبات التوثيق (إذا لزم الأمر)
CREATE POLICY "Admins can insert verification requests" ON public.verification_requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users au 
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

-- تحديث سياسات جدول التاريخ
DROP POLICY IF EXISTS "Users can view their own verification history" ON public.verification_history;
DROP POLICY IF EXISTS "Admins can view all verification history" ON public.verification_history;
DROP POLICY IF EXISTS "Admins can insert verification history" ON public.verification_history;
DROP POLICY IF EXISTS "System can insert verification history" ON public.verification_history;

CREATE POLICY "Users can view their own verification history" ON public.verification_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all verification history" ON public.verification_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users au
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

CREATE POLICY "Admins can insert verification history" ON public.verification_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users au
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

-- سياسة للسماح للنظام (triggers) بإدراج سجلات التاريخ
CREATE POLICY "System can insert verification history" ON public.verification_history
    FOR INSERT WITH CHECK (true);

-- تحديث سياسات جدول الإعدادات
DROP POLICY IF EXISTS "Admins can manage verification settings" ON public.verification_settings;

CREATE POLICY "Admins can manage verification settings" ON public.verification_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_users au 
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

-- إضافة سياسة للقراءة العامة للإعدادات (للمستخدمين العاديين)
CREATE POLICY "Users can read verification settings" ON public.verification_settings
    FOR SELECT USING (true);

-- التأكد من تفعيل RLS
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_settings ENABLE ROW LEVEL SECURITY;

-- إضافة تعليق
COMMENT ON TABLE public.verification_requests IS 'جدول طلبات توثيق الهوية الشخصية - محدث 21-08-2025';
