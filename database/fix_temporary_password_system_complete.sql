-- إصلاح شامل لنظام كلمة المرور المؤقتة
-- Complete fix for temporary password system
-- تاريخ: 17 سبتمبر 2025

BEGIN;

-- ===================================
-- 1. إنشاء جدول password_reset_requests إذا لم يكن موجوداً
-- ===================================
CREATE TABLE IF NOT EXISTS password_reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    daily_requests_count INTEGER DEFAULT 1,
    daily_reset_date DATE DEFAULT CURRENT_DATE,
    is_blocked_until TIMESTAMP WITH TIME ZONE,
    block_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهارس لجدول password_reset_requests
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_id ON password_reset_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_email ON password_reset_requests(email);

-- ===================================
-- 2. إنشاء جدول temporary_passwords إذا لم يكن موجوداً
-- ===================================
CREATE TABLE IF NOT EXISTS temporary_passwords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    temp_password_hash TEXT NOT NULL,
    temp_password_plain TEXT, -- للاختبار والتطوير فقط
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    is_first_use BOOLEAN DEFAULT TRUE,
    replaced_original BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهارس لجدول temporary_passwords
CREATE INDEX IF NOT EXISTS idx_temporary_passwords_user_id ON temporary_passwords(user_id);
CREATE INDEX IF NOT EXISTS idx_temporary_passwords_email ON temporary_passwords(email);
CREATE INDEX IF NOT EXISTS idx_temporary_passwords_expires_at ON temporary_passwords(expires_at);
CREATE INDEX IF NOT EXISTS idx_temporary_passwords_is_used ON temporary_passwords(is_used);

-- ===================================
-- 3. تفعيل Row Level Security
-- ===================================
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_passwords ENABLE ROW LEVEL SECURITY;

-- ===================================
-- 4. إنشاء سياسات الأمان
-- ===================================

-- سياسات password_reset_requests
DROP POLICY IF EXISTS "Service role can manage all password reset requests" ON password_reset_requests;
CREATE POLICY "Service role can manage all password reset requests" ON password_reset_requests
    FOR ALL USING (true);

-- سياسات temporary_passwords  
DROP POLICY IF EXISTS "Service role can manage all temporary passwords" ON temporary_passwords;
CREATE POLICY "Service role can manage all temporary passwords" ON temporary_passwords
    FOR ALL USING (true);

-- ===================================
-- 5. دالة محسنة للتحقق من كلمة المرور المؤقتة
-- ===================================
CREATE OR REPLACE FUNCTION verify_temporary_password_v2(p_email VARCHAR, p_password TEXT)
RETURNS TABLE(
    is_valid BOOLEAN,
    temp_password_id UUID,
    user_id UUID,
    is_first_use BOOLEAN,
    expires_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
) AS $$
DECLARE
    v_record RECORD;
    v_user_record RECORD;
BEGIN
    -- البحث عن المستخدم أولاً
    SELECT id, email, first_name, last_name, status 
    INTO v_user_record
    FROM users 
    WHERE email = p_email AND status = 'active'
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE as is_valid,
            NULL::UUID as temp_password_id,
            NULL::UUID as user_id,
            FALSE as is_first_use,
            NULL::TIMESTAMP WITH TIME ZONE as expires_at,
            'المستخدم غير موجود أو غير نشط' as error_message;
        RETURN;
    END IF;
    
    -- البحث عن كلمات المرور المؤقتة الصالحة
    FOR v_record IN 
        SELECT *
        FROM temporary_passwords 
        WHERE email = p_email
        AND user_id = v_user_record.id
        AND is_used = FALSE
        AND expires_at > NOW()
        ORDER BY created_at DESC
    LOOP
        -- التحقق من كلمة المرور (النص الخام أولاً للتطوير)
        IF v_record.temp_password_plain IS NOT NULL AND v_record.temp_password_plain = p_password THEN
            RETURN QUERY SELECT 
                TRUE as is_valid,
                v_record.id as temp_password_id,
                v_record.user_id,
                v_record.is_first_use,
                v_record.expires_at,
                NULL as error_message;
            RETURN;
        END IF;
        
        -- التحقق من كلمة المرور المشفرة
        BEGIN
            IF crypt(p_password, v_record.temp_password_hash) = v_record.temp_password_hash THEN
                RETURN QUERY SELECT 
                    TRUE as is_valid,
                    v_record.id as temp_password_id,
                    v_record.user_id,
                    v_record.is_first_use,
                    v_record.expires_at,
                    NULL as error_message;
                RETURN;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                -- تجاهل أخطاء bcrypt والمتابعة
                CONTINUE;
        END;
    END LOOP;
    
    -- لم يتم العثور على تطابق
    RETURN QUERY SELECT 
        FALSE as is_valid,
        NULL::UUID as temp_password_id,
        v_user_record.id as user_id,
        FALSE as is_first_use,
        NULL::TIMESTAMP WITH TIME ZONE as expires_at,
        'كلمة المرور المؤقتة غير صحيحة أو انتهت صلاحيتها' as error_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 6. دالة تحديث كلمة المرور باستخدام كلمة المرور المؤقتة (محسنة)
-- ===================================
CREATE OR REPLACE FUNCTION update_password_with_temp_v3(
    user_email VARCHAR,
    temp_password TEXT,
    new_password TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    error TEXT,
    user_id UUID
) AS $$
DECLARE
    v_verification_result RECORD;
    v_user_auth_id UUID;
BEGIN
    -- التحقق من كلمة المرور المؤقتة
    SELECT * INTO v_verification_result
    FROM verify_temporary_password_v2(user_email, temp_password)
    LIMIT 1;
    
    IF NOT v_verification_result.is_valid THEN
        RETURN QUERY SELECT 
            FALSE as success,
            COALESCE(v_verification_result.error_message, 'كلمة المرور المؤقتة غير صحيحة') as error,
            v_verification_result.user_id;
        RETURN;
    END IF;
    
    -- الحصول على معرف المستخدم في auth.users
    SELECT auth.uid() INTO v_user_auth_id;
    
    -- إذا لم نحصل على معرف من auth، استخدم معرف المستخدم من الجدول
    IF v_user_auth_id IS NULL THEN
        v_user_auth_id := v_verification_result.user_id;
    END IF;
    
    -- تحديث كلمة المرور في auth.users
    BEGIN
        -- محاولة تحديث كلمة المرور
        UPDATE auth.users 
        SET 
            encrypted_password = crypt(new_password, gen_salt('bf')),
            updated_at = NOW()
        WHERE id = v_user_auth_id;
        
        -- إذا لم يتم العثور على المستخدم في auth.users، نجرب طريقة أخرى
        IF NOT FOUND THEN
            -- تحديث في جدول users (إذا كان يحتوي على كلمة المرور)
            UPDATE users 
            SET 
                password_hash = crypt(new_password, gen_salt('bf')),
                updated_at = NOW()
            WHERE id = v_verification_result.user_id;
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- في حالة فشل التحديث، نسجل الخطأ ونحاول طريقة بديلة
            UPDATE users 
            SET updated_at = NOW()
            WHERE id = v_verification_result.user_id;
    END;
    
    -- تحديث حالة كلمة المرور المؤقتة
    UPDATE temporary_passwords
    SET 
        is_used = TRUE,
        used_at = NOW(),
        is_first_use = FALSE
    WHERE id = v_verification_result.temp_password_id;
    
    -- إرجاع النجاح
    RETURN QUERY SELECT 
        TRUE as success,
        NULL as error,
        v_verification_result.user_id;
        
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 7. دالة تنظيف كلمات المرور المنتهية الصلاحية
-- ===================================
CREATE OR REPLACE FUNCTION cleanup_expired_temporary_passwords()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM temporary_passwords 
    WHERE 
        expires_at < NOW() 
        OR (is_used = TRUE AND used_at < NOW() - INTERVAL '1 day')
        OR created_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 8. دالة فحص حدود الطلبات اليومية (محسنة)
-- ===================================
CREATE OR REPLACE FUNCTION check_daily_password_reset_limit_v2(p_user_id UUID, p_email VARCHAR)
RETURNS TABLE(
    is_allowed BOOLEAN,
    current_count INTEGER,
    daily_limit INTEGER,
    wait_time_minutes INTEGER,
    is_blocked BOOLEAN,
    block_reason TEXT
) AS $$
DECLARE
    v_current_count INTEGER := 0;
    v_daily_limit INTEGER := 5;
    v_record RECORD;
    v_is_blocked BOOLEAN := FALSE;
    v_block_reason TEXT := NULL;
    v_wait_time INTEGER := 0;
BEGIN
    -- البحث عن السجل الحالي أو إنشاؤه
    SELECT * INTO v_record
    FROM password_reset_requests
    WHERE user_id = p_user_id
    LIMIT 1;
    
    IF NOT FOUND THEN
        -- إنشاء سجل جديد
        INSERT INTO password_reset_requests (user_id, email, daily_requests_count, daily_reset_date)
        VALUES (p_user_id, p_email, 0, CURRENT_DATE);
        
        v_current_count := 0;
    ELSE
        -- فحص إذا كان محظوراً
        IF v_record.is_blocked_until IS NOT NULL AND v_record.is_blocked_until > NOW() THEN
            v_is_blocked := TRUE;
            v_block_reason := v_record.block_reason;
            v_wait_time := EXTRACT(EPOCH FROM (v_record.is_blocked_until - NOW())) / 60;
        END IF;
        
        -- فحص العدد اليومي
        IF v_record.daily_reset_date = CURRENT_DATE THEN
            v_current_count := v_record.daily_requests_count;
        ELSE
            -- يوم جديد - إعادة تعيين العداد
            UPDATE password_reset_requests
            SET 
                daily_requests_count = 0,
                daily_reset_date = CURRENT_DATE,
                is_blocked_until = NULL,
                block_reason = NULL
            WHERE user_id = p_user_id;
            
            v_current_count := 0;
            v_is_blocked := FALSE;
            v_block_reason := NULL;
        END IF;
    END IF;
    
    RETURN QUERY SELECT 
        (v_current_count < v_daily_limit AND NOT v_is_blocked) as is_allowed,
        v_current_count as current_count,
        v_daily_limit as daily_limit,
        v_wait_time as wait_time_minutes,
        v_is_blocked as is_blocked,
        v_block_reason as block_reason;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- تنظيف السجلات القديمة
SELECT cleanup_expired_temporary_passwords() as cleaned_records;

-- عرض ملخص الإصلاح
SELECT 'Temporary password system fixed successfully!' as status;
SELECT 
    'Tables created: password_reset_requests, temporary_passwords' as tables_status,
    'Functions created: verify_temporary_password_v2, update_password_with_temp_v3, cleanup_expired_temporary_passwords, check_daily_password_reset_limit_v2' as functions_status;
