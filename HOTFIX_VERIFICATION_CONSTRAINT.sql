-- إصلاح سريع لمشكلة constraint في verification_history
-- تاريخ الإنشاء: 21-08-2025
-- المشكلة: new row for relation "verification_history" violates check constraint "verification_history_action_check"

-- ===== الحل السريع =====

-- حذف الدالة القديمة التي تسبب المشكلة
DROP FUNCTION IF EXISTS log_verification_status_change() CASCADE;
DROP FUNCTION IF EXISTS log_verification_submission() CASCADE;

-- إنشاء دالة جديدة مع إصلاح قيم action
CREATE OR REPLACE FUNCTION log_verification_status_change()
RETURNS TRIGGER 
SECURITY DEFINER -- تجاوز RLS
SET search_path = public
AS $$
DECLARE
    action_value VARCHAR(50);
BEGIN
    -- إدراج سجل في جدول التاريخ عند تغيير الحالة
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
            action_value, -- استخدام القيمة الصحيحة بدلاً من NEW.status
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
DROP TRIGGER IF EXISTS trigger_log_verification_submission ON public.verification_requests;

CREATE TRIGGER trigger_log_verification_status_change
    AFTER UPDATE ON public.verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_verification_status_change();

-- إضافة تعليق
COMMENT ON FUNCTION log_verification_status_change() IS 'دالة لتسجيل تغييرات حالة طلبات التوثيق - إصلاح constraint 21-08-2025';

-- ===== التحقق من الإصلاح =====

-- عرض القيم المسموحة في constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as allowed_values
FROM pg_constraint 
WHERE conrelid = 'public.verification_history'::regclass 
    AND contype = 'c'
    AND conname = 'verification_history_action_check';

-- عرض الدالة الجديدة
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname = 'log_verification_status_change';
