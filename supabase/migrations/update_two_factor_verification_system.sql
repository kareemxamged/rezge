-- تحديث نظام المصادقة الثنائية مع نظام حد زمني محسن
-- هذا الملف يحدث الدوال الموجودة ويضيف ميزات جديدة

-- إنشاء جدول لتتبع محاولات طلب رموز المصادقة الثنائية
CREATE TABLE IF NOT EXISTS public.two_factor_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_type VARCHAR(50) DEFAULT 'login' CHECK (code_type IN ('login', 'enable_2fa', 'disable_2fa')),
  request_count INTEGER DEFAULT 1,
  last_request_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  daily_reset_at TIMESTAMP WITH TIME ZONE DEFAULT (DATE_TRUNC('day', NOW()) + INTERVAL '1 day'),
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- فهارس لتحسين الأداء
  INDEX idx_two_factor_rate_limits_user_id (user_id),
  INDEX idx_two_factor_rate_limits_user_type (user_id, code_type),
  INDEX idx_two_factor_rate_limits_daily_reset (daily_reset_at),
  INDEX idx_two_factor_rate_limits_blocked (is_blocked, blocked_until),
  
  -- قيد فريد لكل مستخدم ونوع رمز
  UNIQUE(user_id, code_type)
);

-- إضافة تعليقات للجدول الجديد
COMMENT ON TABLE public.two_factor_rate_limits IS 'جدول تتبع حدود طلبات رموز المصادقة الثنائية';
COMMENT ON COLUMN public.two_factor_rate_limits.user_id IS 'معرف المستخدم';
COMMENT ON COLUMN public.two_factor_rate_limits.code_type IS 'نوع الرمز';
COMMENT ON COLUMN public.two_factor_rate_limits.request_count IS 'عدد الطلبات اليومية';
COMMENT ON COLUMN public.two_factor_rate_limits.last_request_at IS 'وقت آخر طلب';
COMMENT ON COLUMN public.two_factor_rate_limits.daily_reset_at IS 'وقت إعادة تعيين العداد اليومي';
COMMENT ON COLUMN public.two_factor_rate_limits.is_blocked IS 'هل المستخدم محظور';
COMMENT ON COLUMN public.two_factor_rate_limits.blocked_until IS 'محظور حتى هذا التاريخ';

-- دالة لفحص وتطبيق حدود طلبات المصادقة الثنائية
CREATE OR REPLACE FUNCTION check_two_factor_rate_limit(
    p_user_id UUID,
    p_code_type VARCHAR(50) DEFAULT 'login'
)
RETURNS TABLE(
    allowed BOOLEAN,
    message TEXT,
    daily_attempts_used INTEGER,
    daily_attempts_limit INTEGER,
    next_allowed_at TIMESTAMP WITH TIME ZONE,
    blocked_until TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_config RECORD;
    v_rate_limit RECORD;
    v_current_time TIMESTAMP WITH TIME ZONE;
    v_start_of_day TIMESTAMP WITH TIME ZONE;
    v_next_day TIMESTAMP WITH TIME ZONE;
    v_last_request_diff INTEGER;
    v_daily_limit INTEGER := 6;
    v_min_wait_seconds INTEGER := 30;
BEGIN
    v_current_time := NOW();
    v_start_of_day := DATE_TRUNC('day', v_current_time);
    v_next_day := v_start_of_day + INTERVAL '1 day';
    
    -- البحث عن سجل الحد الزمني للمستخدم
    SELECT * INTO v_rate_limit
    FROM public.two_factor_rate_limits
    WHERE user_id = p_user_id AND code_type = p_code_type;
    
    -- إذا لم يوجد سجل، إنشاء واحد جديد
    IF NOT FOUND THEN
        INSERT INTO public.two_factor_rate_limits (
            user_id, code_type, request_count, last_request_at, daily_reset_at
        ) VALUES (
            p_user_id, p_code_type, 0, v_current_time, v_next_day
        ) RETURNING * INTO v_rate_limit;
    END IF;
    
    -- فحص إذا كان المستخدم محظوراً
    IF v_rate_limit.is_blocked AND v_rate_limit.blocked_until > v_current_time THEN
        RETURN QUERY SELECT
            FALSE,
            'حدث خطأ غير معروف, حاول مرة اخرى غدا'::TEXT,
            v_rate_limit.request_count,
            v_daily_limit,
            v_rate_limit.blocked_until,
            v_rate_limit.blocked_until;
        RETURN;
    END IF;
    
    -- إعادة تعيين العداد إذا مر يوم جديد
    IF v_current_time >= v_rate_limit.daily_reset_at THEN
        UPDATE public.two_factor_rate_limits
        SET 
            request_count = 0,
            daily_reset_at = v_next_day,
            is_blocked = FALSE,
            blocked_until = NULL,
            updated_at = v_current_time
        WHERE user_id = p_user_id AND code_type = p_code_type
        RETURNING * INTO v_rate_limit;
    END IF;
    
    -- فحص الحد الأدنى للوقت بين الطلبات (30 ثانية)
    IF v_rate_limit.last_request_at IS NOT NULL THEN
        v_last_request_diff := EXTRACT(EPOCH FROM (v_current_time - v_rate_limit.last_request_at));
        
        IF v_last_request_diff < v_min_wait_seconds THEN
            RETURN QUERY SELECT 
                FALSE,
                FORMAT('يرجى الانتظار %s ثانية قبل طلب رمز جديد', v_min_wait_seconds - v_last_request_diff),
                v_rate_limit.request_count,
                v_daily_limit,
                v_rate_limit.last_request_at + INTERVAL '30 seconds',
                v_rate_limit.blocked_until;
            RETURN;
        END IF;
    END IF;
    
    -- فحص الحد اليومي
    IF v_rate_limit.request_count >= v_daily_limit THEN
        -- حظر المستخدم حتى اليوم التالي
        UPDATE public.two_factor_rate_limits
        SET 
            is_blocked = TRUE,
            blocked_until = v_next_day,
            updated_at = v_current_time
        WHERE user_id = p_user_id AND code_type = p_code_type;
        
        RETURN QUERY SELECT
            FALSE,
            'حدث خطأ غير معروف, حاول مرة اخرى غدا'::TEXT,
            v_rate_limit.request_count,
            v_daily_limit,
            v_next_day,
            v_next_day;
        RETURN;
    END IF;
    
    -- السماح بالطلب وتحديث العداد
    UPDATE public.two_factor_rate_limits
    SET 
        request_count = request_count + 1,
        last_request_at = v_current_time,
        updated_at = v_current_time
    WHERE user_id = p_user_id AND code_type = p_code_type
    RETURNING * INTO v_rate_limit;
    
    RETURN QUERY SELECT 
        TRUE,
        'مسموح'::TEXT,
        v_rate_limit.request_count,
        v_daily_limit,
        NULL::TIMESTAMP WITH TIME ZONE,
        NULL::TIMESTAMP WITH TIME ZONE;
END;
$$ LANGUAGE plpgsql;

-- دالة لتنظيف البيانات القديمة
CREATE OR REPLACE FUNCTION cleanup_two_factor_rate_limits()
RETURNS void AS $$
BEGIN
    -- حذف السجلات القديمة (أكثر من 30 يوم)
    DELETE FROM public.two_factor_rate_limits 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- إعادة تعيين الحظر المنتهي الصلاحية
    UPDATE public.two_factor_rate_limits
    SET is_blocked = FALSE, blocked_until = NULL
    WHERE is_blocked = TRUE AND blocked_until <= NOW();
END;
$$ LANGUAGE plpgsql;

-- إعطاء صلاحيات للمستخدمين المصادق عليهم
GRANT SELECT, INSERT, UPDATE ON public.two_factor_rate_limits TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- تعطيل Row Level Security مؤقتاً
ALTER TABLE public.two_factor_rate_limits DISABLE ROW LEVEL SECURITY;

-- تشغيل تنظيف أولي
SELECT cleanup_two_factor_rate_limits();
