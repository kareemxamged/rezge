-- تطبيق جميع إصلاحات نظام التوثيق
-- تاريخ الإنشاء: 21-08-2025

-- ===== إصلاح سياسات RLS لجدول طلبات التوثيق =====

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Users can view their own verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Users can insert their own verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Users can update their own pending verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Admins can view all verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Admins can update verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Admins can insert verification requests" ON public.verification_requests;

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

CREATE POLICY "Admins can insert verification requests" ON public.verification_requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users au 
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

-- ===== إصلاح سياسات جدول التاريخ =====

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

-- ===== إصلاح سياسات جدول الإعدادات =====

DROP POLICY IF EXISTS "Admins can manage verification settings" ON public.verification_settings;
DROP POLICY IF EXISTS "Users can read verification settings" ON public.verification_settings;

CREATE POLICY "Admins can manage verification settings" ON public.verification_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_users au 
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

CREATE POLICY "Users can read verification settings" ON public.verification_settings
    FOR SELECT USING (true);

-- ===== إصلاح دوال trigger =====

-- حذف الدوال القديمة إن وجدت
DROP FUNCTION IF EXISTS log_verification_status_change() CASCADE;
DROP FUNCTION IF EXISTS log_verification_submission() CASCADE;

-- إنشاء دالة جديدة مع صلاحيات SECURITY DEFINER
CREATE OR REPLACE FUNCTION log_verification_status_change()
RETURNS TRIGGER 
SECURITY DEFINER -- هذا يسمح للدالة بتجاوز RLS
SET search_path = public
AS $$
BEGIN
    -- إدراج سجل في جدول التاريخ عند تغيير الحالة
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.verification_history (
            user_id,
            verification_request_id,
            action,
            status_from,
            status_to,
            performed_by,
            notes,
            created_at
        ) VALUES (
            NEW.user_id,
            NEW.id,
            NEW.status,
            OLD.status,
            NEW.status,
            NEW.reviewed_by,
            NEW.admin_notes,
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة لتسجيل إرسال الطلب الأولي
CREATE OR REPLACE FUNCTION log_verification_submission()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- تسجيل إرسال الطلب عند تغيير submission_step إلى 5
    IF OLD.submission_step IS DISTINCT FROM NEW.submission_step 
       AND NEW.submission_step = 5 
       AND NEW.status = 'under_review' THEN
        INSERT INTO public.verification_history (
            user_id,
            verification_request_id,
            action,
            status_from,
            status_to,
            performed_by,
            notes,
            created_at
        ) VALUES (
            NEW.user_id,
            NEW.id,
            'submitted',
            'pending',
            'under_review',
            NEW.user_id,
            'تم إرسال طلب التوثيق للمراجعة',
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إعادة إنشاء triggers
DROP TRIGGER IF EXISTS trigger_log_verification_status_change ON public.verification_requests;
DROP TRIGGER IF EXISTS trigger_log_verification_submission ON public.verification_requests;

CREATE TRIGGER trigger_log_verification_status_change
    AFTER UPDATE ON public.verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_verification_status_change();

CREATE TRIGGER trigger_log_verification_submission
    AFTER UPDATE ON public.verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_verification_submission();

-- ===== التأكد من تفعيل RLS =====
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_settings ENABLE ROW LEVEL SECURITY;

-- ===== إضافة تعليقات =====
COMMENT ON TABLE public.verification_requests IS 'جدول طلبات توثيق الهوية الشخصية - محدث 21-08-2025';
COMMENT ON FUNCTION log_verification_status_change() IS 'دالة لتسجيل تغييرات حالة طلبات التوثيق';
COMMENT ON FUNCTION log_verification_submission() IS 'دالة لتسجيل إرسال طلبات التوثيق';
