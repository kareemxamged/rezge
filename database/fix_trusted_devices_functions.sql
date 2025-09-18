-- إصلاح دوال نظام الأجهزة الموثقة للمستخدمين
-- تاريخ الإنشاء: 12-09-2025
-- الغرض: إنشاء الدوال المطلوبة لنظام الأجهزة الموثقة

-- بدء المعاملة
BEGIN;

-- ===================================
-- 1. دالة فحص الجهاز الموثوق للمستخدمين
-- ===================================

CREATE OR REPLACE FUNCTION public.check_user_trusted_device(
    p_user_id UUID,
    p_device_fingerprint TEXT,
    p_current_time TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
    is_trusted BOOLEAN,
    device_id UUID,
    trusted_until TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN utd.trusted_until > p_current_time THEN TRUE
            ELSE FALSE
        END as is_trusted,
        utd.id as device_id,
        utd.trusted_until,
        utd.last_used_at
    FROM public.user_trusted_devices utd
    WHERE utd.user_id = p_user_id 
      AND utd.device_fingerprint = p_device_fingerprint
    ORDER BY utd.last_used_at DESC
    LIMIT 1;
    
    -- إذا لم يتم العثور على الجهاز، إرجاع نتيجة فارغة
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT FALSE as is_trusted, NULL::UUID as device_id, NULL::TIMESTAMP WITH TIME ZONE as trusted_until, NULL::TIMESTAMP WITH TIME ZONE as last_used_at;
    END IF;
END;
$$;

-- ===================================
-- 2. دالة إضافة جهاز موثوق للمستخدمين
-- ===================================

CREATE OR REPLACE FUNCTION public.add_user_trusted_device(
    p_user_id UUID,
    p_device_fingerprint TEXT,
    p_ip_address INET,
    p_user_agent TEXT,
    p_trust_duration_hours INTEGER DEFAULT 2
)
RETURNS TABLE(
    device_id UUID,
    trusted_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_trusted_until TIMESTAMP WITH TIME ZONE;
    v_device_id UUID;
    v_created_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- حساب وقت انتهاء الثقة (ساعتين افتراضياً)
    v_trusted_until := NOW() + (p_trust_duration_hours || ' hours')::INTERVAL;
    v_created_at := NOW();
    
    -- إدراج أو تحديث الجهاز الموثوق
    INSERT INTO public.user_trusted_devices (
        user_id,
        device_fingerprint,
        ip_address,
        user_agent,
        trusted_until,
        created_at,
        last_used_at
    ) VALUES (
        p_user_id,
        p_device_fingerprint,
        p_ip_address,
        p_user_agent,
        v_trusted_until,
        v_created_at,
        v_created_at
    )
    ON CONFLICT (user_id, device_fingerprint)
    DO UPDATE SET
        ip_address = EXCLUDED.ip_address,
        user_agent = EXCLUDED.user_agent,
        trusted_until = EXCLUDED.trusted_until,
        last_used_at = NOW()
    RETURNING id, trusted_until, created_at
    INTO v_device_id, v_trusted_until, v_created_at;
    
    RETURN QUERY
    SELECT v_device_id as device_id, v_trusted_until as trusted_until, v_created_at as created_at;
END;
$$;

-- ===================================
-- 3. دالة تحديث آخر استخدام للجهاز الموثوق
-- ===================================

CREATE OR REPLACE FUNCTION public.update_user_trusted_device_usage(
    p_user_id UUID,
    p_device_fingerprint TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.user_trusted_devices
    SET last_used_at = NOW()
    WHERE user_id = p_user_id 
      AND device_fingerprint = p_device_fingerprint
      AND trusted_until > NOW();
    
    RETURN FOUND;
END;
$$;

-- ===================================
-- 4. دالة حذف الأجهزة المنتهية الصلاحية
-- ===================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_user_trusted_devices()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_trusted_devices
    WHERE trusted_until < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- ===================================
-- 5. دالة الحصول على جميع الأجهزة الموثقة للمستخدم
-- ===================================

CREATE OR REPLACE FUNCTION public.get_user_trusted_devices(
    p_user_id UUID
)
RETURNS TABLE(
    device_id UUID,
    device_fingerprint TEXT,
    ip_address INET,
    user_agent TEXT,
    device_name TEXT,
    trusted_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        utd.id as device_id,
        utd.device_fingerprint,
        utd.ip_address,
        utd.user_agent,
        utd.device_name,
        utd.trusted_until,
        utd.created_at,
        utd.last_used_at,
        CASE WHEN utd.trusted_until > NOW() THEN TRUE ELSE FALSE END as is_active
    FROM public.user_trusted_devices utd
    WHERE utd.user_id = p_user_id
    ORDER BY utd.last_used_at DESC;
END;
$$;

-- ===================================
-- 6. دالة حذف جهاز موثوق محدد
-- ===================================

CREATE OR REPLACE FUNCTION public.remove_user_trusted_device(
    p_user_id UUID,
    p_device_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.user_trusted_devices
    WHERE user_id = p_user_id AND id = p_device_id;
    
    RETURN FOUND;
END;
$$;

-- ===================================
-- 7. دالة حذف جميع الأجهزة الموثقة للمستخدم
-- ===================================

CREATE OR REPLACE FUNCTION public.remove_all_user_trusted_devices(
    p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_trusted_devices
    WHERE user_id = p_user_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- ===================================
-- 8. إنشاء فهارس لتحسين الأداء
-- ===================================

-- فهرس على user_id و device_fingerprint
CREATE INDEX IF NOT EXISTS idx_user_trusted_devices_user_fingerprint 
ON public.user_trusted_devices(user_id, device_fingerprint);

-- فهرس على trusted_until للتنظيف
CREATE INDEX IF NOT EXISTS idx_user_trusted_devices_trusted_until 
ON public.user_trusted_devices(trusted_until);

-- فهرس على last_used_at للترتيب
CREATE INDEX IF NOT EXISTS idx_user_trusted_devices_last_used 
ON public.user_trusted_devices(last_used_at DESC);

-- ===================================
-- 9. إعطاء صلاحيات للمستخدمين المصادق عليهم
-- ===================================

-- صلاحيات تنفيذ الدوال
GRANT EXECUTE ON FUNCTION public.check_user_trusted_device TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_user_trusted_device TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_trusted_device_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_trusted_devices TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_trusted_device TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_all_user_trusted_devices TO authenticated;

-- صلاحية تنفيذ دالة التنظيف للخدمة
GRANT EXECUTE ON FUNCTION public.cleanup_expired_user_trusted_devices TO service_role;

-- صلاحيات الجدول
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_trusted_devices TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- إنهاء المعاملة
COMMIT;

-- ===================================
-- 10. اختبار الدوال
-- ===================================

-- اختبار دالة فحص الجهاز الموثوق (يجب أن ترجع FALSE للجهاز غير الموجود)
DO $$
DECLARE
    test_result RECORD;
BEGIN
    SELECT * INTO test_result 
    FROM public.check_user_trusted_device(
        '00000000-0000-0000-0000-000000000000'::UUID,
        'test_fingerprint',
        NOW()
    );
    
    IF test_result.is_trusted = FALSE THEN
        RAISE NOTICE '✅ اختبار دالة فحص الجهاز الموثوق نجح';
    ELSE
        RAISE NOTICE '❌ اختبار دالة فحص الجهاز الموثوق فشل';
    END IF;
END;
$$;

RAISE NOTICE '🎉 تم إنشاء جميع دوال نظام الأجهزة الموثقة للمستخدمين بنجاح!';
RAISE NOTICE '📋 الدوال المتاحة:';
RAISE NOTICE '   - check_user_trusted_device()';
RAISE NOTICE '   - add_user_trusted_device()';
RAISE NOTICE '   - update_user_trusted_device_usage()';
RAISE NOTICE '   - get_user_trusted_devices()';
RAISE NOTICE '   - remove_user_trusted_device()';
RAISE NOTICE '   - remove_all_user_trusted_devices()';
RAISE NOTICE '   - cleanup_expired_user_trusted_devices()';
