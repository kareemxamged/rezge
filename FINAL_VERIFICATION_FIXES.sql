-- الإصلاحات النهائية لنظام التوثيق
-- تاريخ الإنشاء: 21-08-2025
-- المشاكل المحلولة:
-- 1. عدم ظهور الصور في نافذة عرض التفاصيل
-- 2. خطأ RLS في verification_history عند إرسال الطلب

-- ==========================================
-- الجزء الأول: إصلاح سياسات RLS
-- ==========================================

-- حذف جميع السياسات القديمة
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

-- سياسة محدثة للسماح بتحديث الطلبات عند تغيير الحالة إلى under_review
CREATE POLICY "Users can update their own pending verification requests" ON public.verification_requests
    FOR UPDATE USING (
        auth.uid() = user_id 
        AND status = 'pending'
    ) WITH CHECK (
        auth.uid() = user_id 
        AND status IN ('pending', 'under_review')
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

-- ==========================================
-- الجزء الثاني: إصلاح سياسات verification_history
-- ==========================================

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

-- سياسة خاصة للنظام (triggers) لتجاوز RLS
CREATE POLICY "System can insert verification history" ON public.verification_history
    FOR INSERT WITH CHECK (true);

-- ==========================================
-- الجزء الثالث: إصلاح دوال trigger
-- ==========================================

-- حذف الدوال القديمة
DROP FUNCTION IF EXISTS log_verification_status_change() CASCADE;
DROP FUNCTION IF EXISTS log_verification_submission() CASCADE;

-- دالة تسجيل تغيير الحالة مع SECURITY DEFINER (محدثة لحل مشكلة constraint)
CREATE OR REPLACE FUNCTION log_verification_status_change()
RETURNS TRIGGER
SECURITY DEFINER -- تجاوز RLS
SET search_path = public
AS $$
DECLARE
    action_value VARCHAR(50);
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- تحديد قيمة action الصحيحة حسب الحالة الجديدة
        CASE NEW.status
            WHEN 'approved' THEN action_value := 'approved';
            WHEN 'rejected' THEN action_value := 'rejected';
            WHEN 'expired' THEN action_value := 'expired';
            WHEN 'cancelled' THEN action_value := 'cancelled';
            WHEN 'under_review' THEN action_value := 'submitted'; -- عند تغيير إلى under_review يعني أنه تم إرسال الطلب
            ELSE action_value := 'submitted'; -- قيمة افتراضية
        END CASE;

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
            action_value, -- استخدام القيمة الصحيحة
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

-- إعادة إنشاء trigger الوحيد (تم حذف log_verification_submission لتجنب التداخل)
DROP TRIGGER IF EXISTS trigger_log_verification_status_change ON public.verification_requests;
DROP TRIGGER IF EXISTS trigger_log_verification_submission ON public.verification_requests;

CREATE TRIGGER trigger_log_verification_status_change
    AFTER UPDATE ON public.verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_verification_status_change();

-- ==========================================
-- الجزء الرابع: إصلاح سياسات التخزين
-- ==========================================

-- حذف سياسات التخزين القديمة
DROP POLICY IF EXISTS "Users can upload verification images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their verification images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all verification images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their verification images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete verification images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their verification images" ON storage.objects;

-- سياسات جديدة للتخزين
CREATE POLICY "Users can upload verification images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'verification-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their verification images" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'verification-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Admins can view all verification images" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'verification-documents' 
        AND EXISTS (
            SELECT 1 FROM public.admin_users au 
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

CREATE POLICY "Users can delete their verification images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'verification-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their verification images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'verification-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- إنشاء/تحديث bucket التوثيق
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'verification-documents',
    'verification-documents',
    true, -- عام لعرض الصور
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
) ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- ==========================================
-- الجزء الخامس: التأكد من تفعيل RLS
-- ==========================================

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_settings ENABLE ROW LEVEL SECURITY;

-- إضافة تعليقات
COMMENT ON TABLE public.verification_requests IS 'جدول طلبات توثيق الهوية - محدث 21-08-2025';
COMMENT ON FUNCTION log_verification_status_change() IS 'دالة تسجيل تغييرات حالة التوثيق';
COMMENT ON FUNCTION log_verification_submission() IS 'دالة تسجيل إرسال طلبات التوثيق';
