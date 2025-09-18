-- إصلاح دائم لمشكلة المنطقة الزمنية في المصادقة الثنائية
-- يجب تشغيل هذا في Supabase Dashboard > SQL Editor

-- 1. تحديث دالة التحقق لتتعامل مع مشاكل المنطقة الزمنية
CREATE OR REPLACE FUNCTION verify_two_factor_code(
    p_user_id UUID,
    p_code VARCHAR(6),
    p_code_type VARCHAR(50) DEFAULT 'login'
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    code_id UUID,
    debug_info JSONB
) AS $$
DECLARE
    v_code_record RECORD;
    v_current_time TIMESTAMP WITH TIME ZONE;
    v_debug_info JSONB;
    v_all_codes_count INTEGER;
    v_valid_codes_count INTEGER;
    v_time_tolerance INTERVAL := INTERVAL '5 minutes'; -- تسامح 5 دقائق
BEGIN
    -- الحصول على الوقت الحالي
    v_current_time := NOW();
    
    -- إنشاء معلومات التشخيص
    v_debug_info := jsonb_build_object(
        'current_time', v_current_time,
        'user_id', p_user_id,
        'code_type', p_code_type,
        'search_code', p_code,
        'time_tolerance_minutes', 5
    );
    
    -- عد جميع الرموز للمستخدم
    SELECT COUNT(*) INTO v_all_codes_count
    FROM public.two_factor_codes
    WHERE user_id = p_user_id AND code_type = p_code_type;
    
    -- عد الرموز الصالحة (مع التسامح الزمني)
    SELECT COUNT(*) INTO v_valid_codes_count
    FROM public.two_factor_codes
    WHERE user_id = p_user_id 
    AND code_type = p_code_type
    AND is_used = FALSE
    AND expires_at > (v_current_time - v_time_tolerance);
    
    -- تحديث معلومات التشخيص
    v_debug_info := v_debug_info || jsonb_build_object(
        'total_codes', v_all_codes_count,
        'valid_codes_with_tolerance', v_valid_codes_count
    );
    
    -- البحث عن الرمز المطابق مع التسامح الزمني
    SELECT * INTO v_code_record
    FROM public.two_factor_codes
    WHERE user_id = p_user_id
    AND code = p_code
    AND code_type = p_code_type
    AND is_used = FALSE
    AND expires_at > (v_current_time - v_time_tolerance) -- تسامح 5 دقائق
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- إذا لم يوجد الرمز مع التسامح، ابحث بدون تسامح للتشخيص
    IF NOT FOUND THEN
        SELECT * INTO v_code_record
        FROM public.two_factor_codes
        WHERE user_id = p_user_id
        AND code = p_code
        AND code_type = p_code_type
        ORDER BY created_at DESC
        LIMIT 1;
        
        IF FOUND THEN
            v_debug_info := v_debug_info || jsonb_build_object(
                'found_matching_code', true,
                'code_is_used', v_code_record.is_used,
                'code_expires_at', v_code_record.expires_at,
                'code_created_at', v_code_record.created_at,
                'code_attempts', v_code_record.attempts_count,
                'is_expired_strict', v_code_record.expires_at <= v_current_time,
                'is_expired_with_tolerance', v_code_record.expires_at <= (v_current_time - v_time_tolerance),
                'minutes_since_expiry', EXTRACT(EPOCH FROM (v_current_time - v_code_record.expires_at)) / 60
            );
            
            -- إذا كان الرمز منتهي الصلاحية بأقل من 5 دقائق، اقبله
            IF NOT v_code_record.is_used 
               AND v_code_record.attempts_count < v_code_record.max_attempts
               AND v_code_record.expires_at > (v_current_time - v_time_tolerance) THEN
                
                -- تحديث الرمز كمستخدم
                UPDATE public.two_factor_codes
                SET is_used = TRUE, used_at = v_current_time
                WHERE id = v_code_record.id;
                
                v_debug_info := v_debug_info || jsonb_build_object('accepted_with_tolerance', true);
                
                RETURN QUERY SELECT TRUE, 'تم التحقق بنجاح (مع التسامح الزمني)'::TEXT, v_code_record.id, v_debug_info;
                RETURN;
            END IF;
        ELSE
            v_debug_info := v_debug_info || jsonb_build_object(
                'found_matching_code', false
            );
        END IF;
        
        RETURN QUERY SELECT FALSE, 'رمز التحقق غير صحيح أو منتهي الصلاحية'::TEXT, NULL::UUID, v_debug_info;
        RETURN;
    END IF;
    
    -- إضافة معلومات الرمز الموجود للتشخيص
    v_debug_info := v_debug_info || jsonb_build_object(
        'found_valid_code', true,
        'code_id', v_code_record.id,
        'code_created_at', v_code_record.created_at,
        'code_expires_at', v_code_record.expires_at,
        'code_attempts', v_code_record.attempts_count,
        'max_attempts', v_code_record.max_attempts
    );
    
    -- التحقق من عدد المحاولات
    IF v_code_record.attempts_count >= v_code_record.max_attempts THEN
        RETURN QUERY SELECT FALSE, 'تم تجاوز الحد الأقصى للمحاولات'::TEXT, NULL::UUID, v_debug_info;
        RETURN;
    END IF;
    
    -- تحديث الرمز كمستخدم
    UPDATE public.two_factor_codes
    SET is_used = TRUE, used_at = v_current_time
    WHERE id = v_code_record.id;
    
    -- إرجاع النجاح
    RETURN QUERY SELECT TRUE, 'تم التحقق بنجاح'::TEXT, v_code_record.id, v_debug_info;
END;
$$ LANGUAGE plpgsql;

-- 2. إضافة فهرس لتحسين الأداء مع التسامح الزمني
CREATE INDEX IF NOT EXISTS idx_two_factor_codes_user_code_type_time 
ON public.two_factor_codes (user_id, code, code_type, expires_at DESC, is_used);

-- 3. دالة لتنظيف الرموز القديمة مع الاحتفاظ بالحديثة
CREATE OR REPLACE FUNCTION cleanup_old_two_factor_codes()
RETURNS void AS $$
BEGIN
    -- حذف الرموز المنتهية الصلاحية بأكثر من ساعة
    DELETE FROM public.two_factor_codes 
    WHERE expires_at < NOW() - INTERVAL '1 hour'
    AND is_used = TRUE;
    
    -- حذف الرموز غير المستخدمة والمنتهية الصلاحية بأكثر من 6 ساعات
    DELETE FROM public.two_factor_codes 
    WHERE expires_at < NOW() - INTERVAL '6 hours'
    AND is_used = FALSE;
    
    -- حذف الرموز القديمة جداً (أكثر من 7 أيام)
    DELETE FROM public.two_factor_codes 
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- 4. تشغيل تنظيف أولي
SELECT cleanup_old_two_factor_codes();

-- 5. عرض إحصائيات الرموز الحالية
SELECT 
    'إحصائيات رموز المصادقة الثنائية' as info,
    COUNT(*) as total_codes,
    COUNT(*) FILTER (WHERE is_used = FALSE) as unused_codes,
    COUNT(*) FILTER (WHERE expires_at > NOW()) as valid_codes,
    COUNT(*) FILTER (WHERE expires_at > NOW() - INTERVAL '5 minutes') as valid_with_tolerance
FROM public.two_factor_codes;
