-- إنشاء نظام الأجهزة الموثقة للمستخدمين والمشرفين
-- تاريخ الإنشاء: 12-09-2025
-- الغرض: تطبيق نظام الأجهزة الموثقة لتحسين الأمان وتجربة المستخدم

-- بدء المعاملة
BEGIN;

-- ===================================
-- 1. جدول الأجهزة الموثقة للمشرفين
-- ===================================

CREATE TABLE IF NOT EXISTS public.admin_trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,                    -- معرف المشرف (من admin_accounts)
    device_fingerprint TEXT NOT NULL,          -- بصمة الجهاز الفريدة
    ip_address INET,                          -- عنوان IP
    user_agent TEXT,                          -- معلومات المتصفح
    trusted_until TIMESTAMP WITH TIME ZONE NOT NULL,   -- صالح حتى (ساعتين)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- تاريخ الإنشاء
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- آخر استخدام
    
    -- قيود الفريدة
    UNIQUE(admin_id, device_fingerprint)
);

-- ===================================
-- 2. جدول الأجهزة الموثقة للمستخدمين
-- ===================================

CREATE TABLE IF NOT EXISTS public.user_trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,          -- بصمة الجهاز الفريدة
    ip_address INET,                          -- عنوان IP
    user_agent TEXT,                          -- معلومات المتصفح
    trusted_until TIMESTAMP WITH TIME ZONE NOT NULL,   -- صالح حتى (ساعتين للمستخدمين)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- تاريخ الإنشاء
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- آخر استخدام
    device_name TEXT,                         -- اسم الجهاز (اختياري)
    
    -- قيود الفريدة
    UNIQUE(user_id, device_fingerprint)
);

-- ===================================
-- 3. جدول أكواد التحقق للمستخدمين
-- ===================================

CREATE TABLE IF NOT EXISTS public.user_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    verification_type VARCHAR(20) DEFAULT 'login' CHECK (verification_type IN ('login', 'device_trust', 'password_reset')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- 4. إنشاء الفهارس للأداء
-- ===================================

-- فهارس للأجهزة الموثقة للمشرفين
CREATE INDEX IF NOT EXISTS idx_admin_trusted_devices_admin_id ON public.admin_trusted_devices(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_trusted_devices_fingerprint ON public.admin_trusted_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_admin_trusted_devices_trusted_until ON public.admin_trusted_devices(trusted_until);
CREATE INDEX IF NOT EXISTS idx_admin_trusted_devices_last_used ON public.admin_trusted_devices(last_used_at);

-- فهارس للأجهزة الموثقة للمستخدمين
CREATE INDEX IF NOT EXISTS idx_user_trusted_devices_user_id ON public.user_trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trusted_devices_fingerprint ON public.user_trusted_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_trusted_devices_trusted_until ON public.user_trusted_devices(trusted_until);
CREATE INDEX IF NOT EXISTS idx_user_trusted_devices_last_used ON public.user_trusted_devices(last_used_at);

-- فهارس لأكواد التحقق للمستخدمين
CREATE INDEX IF NOT EXISTS idx_user_verification_codes_user_id ON public.user_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verification_codes_code ON public.user_verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_user_verification_codes_expires ON public.user_verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_verification_codes_type ON public.user_verification_codes(verification_type);

-- ===================================
-- 5. دوال RPC للأجهزة الموثقة للمشرفين
-- ===================================

-- دالة فحص الجهاز الموثوق للمشرفين
CREATE OR REPLACE FUNCTION public.check_trusted_device(
    p_admin_id UUID,
    p_device_fingerprint TEXT,
    p_current_time TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
    id UUID,
    admin_id UUID,
    device_fingerprint TEXT,
    trusted_until TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        atd.id,
        atd.admin_id,
        atd.device_fingerprint,
        atd.trusted_until,
        atd.last_used_at
    FROM public.admin_trusted_devices atd
    WHERE atd.admin_id = p_admin_id
    AND atd.device_fingerprint = p_device_fingerprint
    AND atd.trusted_until > p_current_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة إضافة جهاز موثوق للمشرفين
CREATE OR REPLACE FUNCTION public.add_trusted_device(
    p_admin_id UUID,
    p_device_fingerprint TEXT,
    p_ip_address INET,
    p_user_agent TEXT,
    p_trusted_until TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.admin_trusted_devices (
        admin_id,
        device_fingerprint,
        ip_address,
        user_agent,
        trusted_until,
        created_at,
        last_used_at
    ) VALUES (
        p_admin_id,
        p_device_fingerprint,
        p_ip_address,
        p_user_agent,
        p_trusted_until,
        NOW(),
        NOW()
    ) ON CONFLICT (admin_id, device_fingerprint) 
    DO UPDATE SET
        ip_address = EXCLUDED.ip_address,
        user_agent = EXCLUDED.user_agent,
        trusted_until = EXCLUDED.trusted_until,
        last_used_at = NOW();
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة إزالة جهاز موثوق للمشرفين
CREATE OR REPLACE FUNCTION public.remove_trusted_device(
    p_admin_id UUID,
    p_device_fingerprint TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.admin_trusted_devices
    WHERE admin_id = p_admin_id
    AND device_fingerprint = p_device_fingerprint;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 6. دوال RPC للأجهزة الموثقة للمستخدمين
-- ===================================

-- دالة فحص الجهاز الموثوق للمستخدمين
CREATE OR REPLACE FUNCTION public.check_user_trusted_device(
    p_user_id UUID,
    p_device_fingerprint TEXT,
    p_current_time TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    device_fingerprint TEXT,
    trusted_until TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    device_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        utd.id,
        utd.user_id,
        utd.device_fingerprint,
        utd.trusted_until,
        utd.last_used_at,
        utd.device_name
    FROM public.user_trusted_devices utd
    WHERE utd.user_id = p_user_id
    AND utd.device_fingerprint = p_device_fingerprint
    AND utd.trusted_until > p_current_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة إضافة جهاز موثوق للمستخدمين
CREATE OR REPLACE FUNCTION public.add_user_trusted_device(
    p_user_id UUID,
    p_device_fingerprint TEXT,
    p_ip_address INET,
    p_user_agent TEXT,
    p_trusted_until TIMESTAMP WITH TIME ZONE,
    p_device_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.user_trusted_devices (
        user_id,
        device_fingerprint,
        ip_address,
        user_agent,
        trusted_until,
        device_name,
        created_at,
        last_used_at
    ) VALUES (
        p_user_id,
        p_device_fingerprint,
        p_ip_address,
        p_user_agent,
        p_trusted_until,
        p_device_name,
        NOW(),
        NOW()
    ) ON CONFLICT (user_id, device_fingerprint) 
    DO UPDATE SET
        ip_address = EXCLUDED.ip_address,
        user_agent = EXCLUDED.user_agent,
        trusted_until = EXCLUDED.trusted_until,
        device_name = COALESCE(EXCLUDED.device_name, user_trusted_devices.device_name),
        last_used_at = NOW();
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة إزالة جهاز موثوق للمستخدمين
CREATE OR REPLACE FUNCTION public.remove_user_trusted_device(
    p_user_id UUID,
    p_device_fingerprint TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.user_trusted_devices
    WHERE user_id = p_user_id
    AND device_fingerprint = p_device_fingerprint;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 7. دوال إدارة أكواد التحقق للمستخدمين
-- ===================================

-- دالة إنشاء كود تحقق للمستخدمين
CREATE OR REPLACE FUNCTION public.create_user_verification_code(
    p_user_id UUID,
    p_verification_type VARCHAR(20) DEFAULT 'login'
)
RETURNS TABLE(
    code VARCHAR(6),
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_code VARCHAR(6);
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- توليد كود عشوائي من 6 أرقام
    v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    v_expires_at := NOW() + INTERVAL '10 minutes';
    
    -- حذف الأكواد القديمة غير المستخدمة
    DELETE FROM public.user_verification_codes
    WHERE user_id = p_user_id
    AND verification_type = p_verification_type
    AND used = FALSE;
    
    -- إدراج الكود الجديد
    INSERT INTO public.user_verification_codes (
        user_id,
        code,
        expires_at,
        verification_type,
        used
    ) VALUES (
        p_user_id,
        v_code,
        v_expires_at,
        p_verification_type,
        FALSE
    );
    
    RETURN QUERY SELECT v_code, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة التحقق من كود التحقق للمستخدمين
CREATE OR REPLACE FUNCTION public.verify_user_code(
    p_user_id UUID,
    p_code VARCHAR(6),
    p_verification_type VARCHAR(20) DEFAULT 'login'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_found BOOLEAN := FALSE;
BEGIN
    -- البحث عن الكود والتحقق من صحته
    UPDATE public.user_verification_codes
    SET used = TRUE, updated_at = NOW()
    WHERE user_id = p_user_id
    AND code = p_code
    AND verification_type = p_verification_type
    AND used = FALSE
    AND expires_at > NOW();
    
    GET DIAGNOSTICS v_found = FOUND;
    
    RETURN v_found;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 8. دوال التنظيف والصيانة
-- ===================================

-- دالة تنظيف الأجهزة المنتهية الصلاحية
CREATE OR REPLACE FUNCTION public.cleanup_expired_trusted_devices()
RETURNS TABLE(
    admin_devices_cleaned INTEGER,
    user_devices_cleaned INTEGER
) AS $$
DECLARE
    v_admin_count INTEGER := 0;
    v_user_count INTEGER := 0;
BEGIN
    -- تنظيف أجهزة المشرفين المنتهية الصلاحية
    DELETE FROM public.admin_trusted_devices
    WHERE trusted_until < NOW();
    GET DIAGNOSTICS v_admin_count = ROW_COUNT;

    -- تنظيف أجهزة المستخدمين المنتهية الصلاحية
    DELETE FROM public.user_trusted_devices
    WHERE trusted_until < NOW();
    GET DIAGNOSTICS v_user_count = ROW_COUNT;

    RETURN QUERY SELECT v_admin_count, v_user_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة تنظيف أكواد التحقق المنتهية الصلاحية
CREATE OR REPLACE FUNCTION public.cleanup_expired_user_verification_codes()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_verification_codes
    WHERE expires_at < NOW() OR (used = TRUE AND created_at < NOW() - INTERVAL '24 hours');

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 9. دوال الإحصائيات والمراقبة
-- ===================================

-- دالة إحصائيات الأجهزة الموثقة للمستخدم
CREATE OR REPLACE FUNCTION public.get_user_trusted_devices_stats(p_user_id UUID)
RETURNS TABLE(
    total_devices INTEGER,
    active_devices INTEGER,
    last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_devices,
        COUNT(CASE WHEN trusted_until > NOW() THEN 1 END)::INTEGER as active_devices,
        MAX(last_used_at) as last_activity
    FROM public.user_trusted_devices
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة قائمة الأجهزة الموثقة للمستخدم
CREATE OR REPLACE FUNCTION public.get_user_trusted_devices_list(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    device_fingerprint TEXT,
    ip_address INET,
    user_agent TEXT,
    device_name TEXT,
    trusted_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_current BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        utd.id,
        utd.device_fingerprint,
        utd.ip_address,
        utd.user_agent,
        utd.device_name,
        utd.trusted_until,
        utd.created_at,
        utd.last_used_at,
        (utd.trusted_until > NOW()) as is_current
    FROM public.user_trusted_devices utd
    WHERE utd.user_id = p_user_id
    ORDER BY utd.last_used_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 10. سياسات الأمان (RLS)
-- ===================================

-- تفعيل RLS للجداول
ALTER TABLE public.admin_trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_verification_codes ENABLE ROW LEVEL SECURITY;

-- سياسات للأجهزة الموثقة للمشرفين
CREATE POLICY "Admins can manage their own trusted devices" ON public.admin_trusted_devices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_accounts
            WHERE admin_accounts.id = admin_trusted_devices.admin_id
        )
    );

-- سياسات للأجهزة الموثقة للمستخدمين
CREATE POLICY "Users can manage their own trusted devices" ON public.user_trusted_devices
    FOR ALL USING (auth.uid() = user_id);

-- سياسات لأكواد التحقق للمستخدمين
CREATE POLICY "Users can manage their own verification codes" ON public.user_verification_codes
    FOR ALL USING (auth.uid() = user_id);

-- ===================================
-- 11. منح الصلاحيات
-- ===================================

-- صلاحيات للجداول
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_trusted_devices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_trusted_devices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_verification_codes TO authenticated;

-- صلاحيات للدوال
GRANT EXECUTE ON FUNCTION public.check_trusted_device TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_trusted_device TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_trusted_device TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_trusted_device TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_user_trusted_device TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_trusted_device TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_verification_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_user_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_trusted_devices TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_user_verification_codes TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_trusted_devices_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_trusted_devices_list TO authenticated;

-- ===================================
-- 12. Triggers للتحديث التلقائي
-- ===================================

-- دالة تحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لجدول أكواد التحقق
CREATE TRIGGER trigger_update_user_verification_codes_updated_at
    BEFORE UPDATE ON public.user_verification_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- 13. تعليقات الجداول والدوال
-- ===================================

COMMENT ON TABLE public.admin_trusted_devices IS 'جدول الأجهزة الموثقة للمشرفين - يحفظ بصمات الأجهزة الموثقة لمدة ساعتين';
COMMENT ON TABLE public.user_trusted_devices IS 'جدول الأجهزة الموثقة للمستخدمين - يحفظ بصمات الأجهزة الموثقة لمدة 24 ساعة';
COMMENT ON TABLE public.user_verification_codes IS 'جدول أكواد التحقق للمستخدمين - يحفظ أكواد التحقق الثنائي';

COMMENT ON FUNCTION public.check_trusted_device IS 'فحص ما إذا كان الجهاز موثوق للمشرف';
COMMENT ON FUNCTION public.check_user_trusted_device IS 'فحص ما إذا كان الجهاز موثوق للمستخدم';
COMMENT ON FUNCTION public.create_user_verification_code IS 'إنشاء كود تحقق جديد للمستخدم';
COMMENT ON FUNCTION public.verify_user_code IS 'التحقق من صحة كود التحقق للمستخدم';

-- إنهاء المعاملة
COMMIT;
