-- إنشاء دالة فحص الجهاز الموثوق للمستخدمين
-- تاريخ الإنشاء: 12-09-2025

-- إنشاء الجدول إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.user_trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    trusted_until TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    device_name TEXT,
    UNIQUE(user_id, device_fingerprint)
);

-- إنشاء دالة فحص الجهاز الموثوق
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
    
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT FALSE as is_trusted, NULL::UUID as device_id, NULL::TIMESTAMP WITH TIME ZONE as trusted_until, NULL::TIMESTAMP WITH TIME ZONE as last_used_at;
    END IF;
END;
$$;

-- إعطاء صلاحيات
GRANT EXECUTE ON FUNCTION public.check_user_trusted_device TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_trusted_devices TO authenticated;
