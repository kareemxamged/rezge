-- إصلاح دالة trigger لتسجيل تاريخ التوثيق
-- تاريخ الإنشاء: 21-08-2025

-- حذف الدالة القديمة إن وجدت
DROP FUNCTION IF EXISTS log_verification_status_change() CASCADE;

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

-- إعادة إنشاء trigger
DROP TRIGGER IF EXISTS trigger_log_verification_status_change ON public.verification_requests;

CREATE TRIGGER trigger_log_verification_status_change
    AFTER UPDATE ON public.verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_verification_status_change();

-- إضافة دالة لتسجيل إرسال الطلب الأولي
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

-- إنشاء trigger لتسجيل الإرسال
DROP TRIGGER IF EXISTS trigger_log_verification_submission ON public.verification_requests;

CREATE TRIGGER trigger_log_verification_submission
    AFTER UPDATE ON public.verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_verification_submission();

-- إضافة تعليقات
COMMENT ON FUNCTION log_verification_status_change() IS 'دالة لتسجيل تغييرات حالة طلبات التوثيق';
COMMENT ON FUNCTION log_verification_submission() IS 'دالة لتسجيل إرسال طلبات التوثيق';
