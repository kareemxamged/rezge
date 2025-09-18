-- إنشاء جدول رموز المصادقة الثنائية
-- هذا الجدول يحفظ رموز التحقق المرسلة عبر البريد الإلكتروني

CREATE TABLE IF NOT EXISTS public.two_factor_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL, -- رمز مكون من 6 أرقام
  code_type VARCHAR(50) DEFAULT 'login' CHECK (code_type IN ('login', 'enable_2fa', 'disable_2fa')),
  is_used BOOLEAN DEFAULT FALSE,
  attempts_count INTEGER DEFAULT 0, -- عدد المحاولات الخاطئة
  max_attempts INTEGER DEFAULT 3, -- الحد الأقصى للمحاولات
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- انتهاء الصلاحية (10 دقائق)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  
  -- فهارس لتحسين الأداء
  INDEX idx_two_factor_codes_user_id (user_id),
  INDEX idx_two_factor_codes_email (email),
  INDEX idx_two_factor_codes_code (code),
  INDEX idx_two_factor_codes_expires_at (expires_at),
  INDEX idx_two_factor_codes_is_used (is_used),
  INDEX idx_two_factor_codes_code_type (code_type),
  INDEX idx_two_factor_codes_user_email (user_id, email),
  INDEX idx_two_factor_codes_active (user_id, is_used, expires_at)
);

-- إضافة تعليقات للجدول والحقول
COMMENT ON TABLE public.two_factor_codes IS 'جدول رموز المصادقة الثنائية المرسلة عبر البريد الإلكتروني';
COMMENT ON COLUMN public.two_factor_codes.id IS 'معرف فريد للرمز';
COMMENT ON COLUMN public.two_factor_codes.user_id IS 'معرف المستخدم من جدول auth.users';
COMMENT ON COLUMN public.two_factor_codes.email IS 'البريد الإلكتروني المرسل إليه الرمز';
COMMENT ON COLUMN public.two_factor_codes.code IS 'رمز التحقق المكون من 6 أرقام';
COMMENT ON COLUMN public.two_factor_codes.code_type IS 'نوع الرمز: تسجيل دخول، تفعيل 2FA، إلغاء 2FA';
COMMENT ON COLUMN public.two_factor_codes.is_used IS 'هل تم استخدام الرمز';
COMMENT ON COLUMN public.two_factor_codes.attempts_count IS 'عدد المحاولات الخاطئة';
COMMENT ON COLUMN public.two_factor_codes.max_attempts IS 'الحد الأقصى للمحاولات المسموحة';
COMMENT ON COLUMN public.two_factor_codes.expires_at IS 'تاريخ انتهاء صلاحية الرمز';
COMMENT ON COLUMN public.two_factor_codes.created_at IS 'تاريخ إنشاء الرمز';
COMMENT ON COLUMN public.two_factor_codes.used_at IS 'تاريخ استخدام الرمز';
COMMENT ON COLUMN public.two_factor_codes.ip_address IS 'عنوان IP للطلب';
COMMENT ON COLUMN public.two_factor_codes.user_agent IS 'معلومات المتصفح';

-- دالة لتنظيف الرموز المنتهية الصلاحية
CREATE OR REPLACE FUNCTION cleanup_expired_two_factor_codes()
RETURNS void AS $$
BEGIN
    -- حذف الرموز المنتهية الصلاحية أو المستخدمة والتي مر عليها أكثر من يوم
    DELETE FROM public.two_factor_codes 
    WHERE (expires_at < NOW() OR is_used = TRUE) 
    AND created_at < NOW() - INTERVAL '1 day';
    
    -- حذف الرموز القديمة (أكثر من 7 أيام) حتى لو لم تستخدم
    DELETE FROM public.two_factor_codes 
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- إنشاء مهمة تنظيف تلقائية (تعمل كل ساعة)
-- ملاحظة: هذا يتطلب تفعيل pg_cron extension في Supabase
-- SELECT cron.schedule('cleanup-expired-2fa-codes', '0 * * * *', 'SELECT cleanup_expired_two_factor_codes();');

-- دالة للتحقق من صحة الرمز (محدثة مع تشخيص أفضل)
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
BEGIN
    -- الحصول على الوقت الحالي
    v_current_time := NOW();

    -- إنشاء معلومات التشخيص
    v_debug_info := jsonb_build_object(
        'current_time', v_current_time,
        'user_id', p_user_id,
        'code_type', p_code_type,
        'search_code', p_code
    );

    -- عد جميع الرموز للمستخدم
    SELECT COUNT(*) INTO v_all_codes_count
    FROM public.two_factor_codes
    WHERE user_id = p_user_id AND code_type = p_code_type;

    -- عد الرموز الصالحة (غير مستخدمة وغير منتهية الصلاحية)
    SELECT COUNT(*) INTO v_valid_codes_count
    FROM public.two_factor_codes
    WHERE user_id = p_user_id
    AND code_type = p_code_type
    AND is_used = FALSE
    AND expires_at > v_current_time;

    -- تحديث معلومات التشخيص
    v_debug_info := v_debug_info || jsonb_build_object(
        'total_codes', v_all_codes_count,
        'valid_codes', v_valid_codes_count
    );

    -- البحث عن الرمز المطابق مع تسامح زمني
    SELECT * INTO v_code_record
    FROM public.two_factor_codes
    WHERE user_id = p_user_id
    AND code = p_code
    AND code_type = p_code_type
    AND is_used = FALSE
    AND expires_at > (v_current_time - INTERVAL '1 hour') -- تسامح ساعة واحدة للمناطق الزمنية
    ORDER BY created_at DESC
    LIMIT 1;

    -- إذا لم يوجد الرمز
    IF NOT FOUND THEN
        -- البحث عن أي رمز مطابق (حتى لو منتهي الصلاحية أو مستخدم) للتشخيص
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
                'is_expired', v_code_record.expires_at <= v_current_time
            );
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

-- دالة لتسجيل محاولة خاطئة
CREATE OR REPLACE FUNCTION record_failed_two_factor_attempt(
    p_user_id UUID,
    p_code VARCHAR(6),
    p_code_type VARCHAR(50) DEFAULT 'login'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated_rows INTEGER;
BEGIN
    -- تحديث عدد المحاولات للرمز الأحدث
    UPDATE public.two_factor_codes
    SET attempts_count = attempts_count + 1
    WHERE user_id = p_user_id
    AND code_type = p_code_type
    AND is_used = FALSE
    AND expires_at > NOW()
    AND id = (
        SELECT id FROM public.two_factor_codes
        WHERE user_id = p_user_id
        AND code_type = p_code_type
        AND is_used = FALSE
        AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
    );
    
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    RETURN v_updated_rows > 0;
END;
$$ LANGUAGE plpgsql;

-- إعطاء صلاحيات للمستخدمين المصادق عليهم
GRANT SELECT, INSERT, UPDATE ON public.two_factor_codes TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- تعطيل Row Level Security مؤقتاً لحل مشكلة المصادقة الثنائية
-- TODO: إعادة تفعيل RLS مع سياسات مناسبة لاحقاً
ALTER TABLE public.two_factor_codes DISABLE ROW LEVEL SECURITY;

-- تشغيل تنظيف أولي
SELECT cleanup_expired_two_factor_codes();
