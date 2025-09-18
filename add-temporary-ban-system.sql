-- إضافة نظام الحظر المؤقت إلى جدول المستخدمين
-- تاريخ الإنشاء: 12-08-2025
-- الغرض: دعم الحظر المؤقت والدائم مع فك الحظر التلقائي

-- بدء المعاملة
BEGIN;

-- إضافة حقل نوع الحظر (دائم أو مؤقت)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ban_type VARCHAR(20) DEFAULT 'permanent' 
    CHECK (ban_type IN ('permanent', 'temporary'));

-- إضافة حقل تاريخ انتهاء الحظر
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMPTZ;

-- إضافة حقل مدة الحظر (للعرض فقط)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ban_duration VARCHAR(50);

-- إضافة حقل لتتبع إذا كان الحظر نشط
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_ban_active BOOLEAN DEFAULT false;

-- إنشاء فهرس لتحسين الأداء عند البحث عن الحظر المنتهي
CREATE INDEX IF NOT EXISTS idx_users_ban_expires_at ON public.users(ban_expires_at) 
    WHERE ban_expires_at IS NOT NULL AND is_ban_active = true;

-- دالة لفك الحظر التلقائي
CREATE OR REPLACE FUNCTION auto_unban_expired_users()
RETURNS INTEGER AS $$
DECLARE
    unbanned_count INTEGER := 0;
BEGIN
    -- فك حظر المستخدمين الذين انتهت مدة حظرهم
    UPDATE public.users 
    SET 
        status = 'active',
        is_ban_active = false,
        ban_expires_at = NULL,
        ban_type = NULL,
        ban_duration = NULL,
        block_reason = NULL,
        blocked_at = NULL,
        blocked_by = NULL,
        block_evidence_files = '[]'::jsonb,
        updated_at = NOW()
    WHERE 
        is_ban_active = true 
        AND ban_type = 'temporary' 
        AND ban_expires_at IS NOT NULL 
        AND ban_expires_at <= NOW();
    
    GET DIAGNOSTICS unbanned_count = ROW_COUNT;
    
    -- تسجيل العملية في سجل الأنشطة
    IF unbanned_count > 0 THEN
        INSERT INTO public.admin_activity_logs (
            admin_id,
            action,
            target_type,
            details,
            created_at
        ) VALUES (
            NULL, -- نظام تلقائي
            'auto_unban',
            'system',
            jsonb_build_object(
                'unbanned_users_count', unbanned_count,
                'timestamp', NOW()
            ),
            NOW()
        );
    END IF;
    
    RETURN unbanned_count;
END;
$$ LANGUAGE plpgsql;

-- إنشاء مهمة مجدولة لتشغيل فك الحظر التلقائي كل 5 دقائق
-- ملاحظة: هذا يتطلب تفعيل pg_cron extension
-- SELECT cron.schedule('auto-unban-expired-users', '*/5 * * * *', 'SELECT auto_unban_expired_users();');

-- دالة مساعدة لحساب تاريخ انتهاء الحظر
CREATE OR REPLACE FUNCTION calculate_ban_expiry(duration_type VARCHAR)
RETURNS TIMESTAMPTZ AS $$
BEGIN
    CASE duration_type
        WHEN '1_day' THEN RETURN NOW() + INTERVAL '1 day';
        WHEN '3_days' THEN RETURN NOW() + INTERVAL '3 days';
        WHEN '1_week' THEN RETURN NOW() + INTERVAL '1 week';
        WHEN '1_month' THEN RETURN NOW() + INTERVAL '1 month';
        WHEN '3_months' THEN RETURN NOW() + INTERVAL '3 months';
        WHEN '6_months' THEN RETURN NOW() + INTERVAL '6 months';
        WHEN '1_year' THEN RETURN NOW() + INTERVAL '1 year';
        ELSE RETURN NULL; -- للحظر الدائم
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- دالة للحصول على نص مدة الحظر بالعربية
CREATE OR REPLACE FUNCTION get_ban_duration_text(duration_type VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
    CASE duration_type
        WHEN '1_day' THEN RETURN 'يوم واحد';
        WHEN '3_days' THEN RETURN 'ثلاثة أيام';
        WHEN '1_week' THEN RETURN 'أسبوع واحد';
        WHEN '1_month' THEN RETURN 'شهر واحد';
        WHEN '3_months' THEN RETURN 'ثلاثة أشهر';
        WHEN '6_months' THEN RETURN 'ستة أشهر';
        WHEN '1_year' THEN RETURN 'سنة واحدة';
        ELSE RETURN 'دائم';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- تحديث المستخدمين المحظورين حالياً ليكونوا محظورين بشكل دائم
UPDATE public.users 
SET 
    ban_type = 'permanent',
    is_ban_active = true,
    ban_duration = 'دائم'
WHERE status = 'banned';

-- تأكيد المعاملة
COMMIT;

-- عرض الحقول الجديدة للتأكد
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name IN ('ban_type', 'ban_expires_at', 'ban_duration', 'is_ban_active')
ORDER BY column_name;
