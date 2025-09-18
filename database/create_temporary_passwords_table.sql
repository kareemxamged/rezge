-- إنشاء جدول كلمات المرور المؤقتة
-- Create temporary passwords table

BEGIN;

-- ===================================
-- 1. إنشاء جدول temporary_passwords
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

-- ===================================
-- 2. إنشاء فهارس للأداء
-- ===================================
CREATE INDEX IF NOT EXISTS idx_temporary_passwords_user_id ON temporary_passwords(user_id);
CREATE INDEX IF NOT EXISTS idx_temporary_passwords_email ON temporary_passwords(email);
CREATE INDEX IF NOT EXISTS idx_temporary_passwords_expires_at ON temporary_passwords(expires_at);
CREATE INDEX IF NOT EXISTS idx_temporary_passwords_is_used ON temporary_passwords(is_used);
CREATE INDEX IF NOT EXISTS idx_temporary_passwords_created_at ON temporary_passwords(created_at);

-- فهرس مركب للبحث السريع عن كلمات المرور الصالحة
CREATE INDEX IF NOT EXISTS idx_temporary_passwords_active ON temporary_passwords(email, is_used, expires_at)
WHERE is_used = FALSE AND expires_at > NOW();

-- ===================================
-- 3. تفعيل Row Level Security
-- ===================================
ALTER TABLE temporary_passwords ENABLE ROW LEVEL SECURITY;

-- ===================================
-- 4. إنشاء سياسات الأمان
-- ===================================

-- السماح للمستخدمين بقراءة كلمات المرور المؤقتة الخاصة بهم فقط
CREATE POLICY "Users can view their own temporary passwords" ON temporary_passwords
    FOR SELECT USING (auth.uid() = user_id);

-- السماح للمستخدمين بإنشاء كلمات مرور مؤقتة لأنفسهم
CREATE POLICY "Users can create their own temporary passwords" ON temporary_passwords
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- السماح للمستخدمين بتحديث كلمات المرور المؤقتة الخاصة بهم
CREATE POLICY "Users can update their own temporary passwords" ON temporary_passwords
    FOR UPDATE USING (auth.uid() = user_id);

-- السماح للخدمة (service role) بالوصول الكامل
CREATE POLICY "Service role can manage all temporary passwords" ON temporary_passwords
    FOR ALL USING (true);

-- ===================================
-- 5. دالة تحديث updated_at تلقائياً
-- ===================================
CREATE OR REPLACE FUNCTION update_temporary_passwords_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق التحديث التلقائي
DROP TRIGGER IF EXISTS update_temporary_passwords_updated_at ON temporary_passwords;
CREATE TRIGGER update_temporary_passwords_updated_at
    BEFORE UPDATE ON temporary_passwords
    FOR each ROW
    EXECUTE FUNCTION update_temporary_passwords_updated_at();

-- ===================================
-- 6. دالة تنظيف كلمات المرور المنتهية الصلاحية
-- ===================================
CREATE OR REPLACE FUNCTION cleanup_expired_temporary_passwords()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- حذف كلمات المرور المنتهية الصلاحية أو المستخدمة والأقدم من يوم واحد
    DELETE FROM temporary_passwords 
    WHERE 
        expires_at < NOW() 
        OR (is_used = TRUE AND used_at < NOW() - INTERVAL '1 day')
        OR created_at < NOW() - INTERVAL '7 days'; -- تنظيف عام للسجلات القديمة
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 7. دالة التحقق من كلمة المرور المؤقتة
-- ===================================
CREATE OR REPLACE FUNCTION verify_temporary_password(p_email VARCHAR, p_password TEXT)
RETURNS TABLE(
    is_valid BOOLEAN,
    temp_password_id UUID,
    user_id UUID,
    is_first_use BOOLEAN,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_record RECORD;
BEGIN
    -- البحث عن كلمات المرور المؤقتة الصالحة
    FOR v_record IN 
        SELECT tp.*, u.id as found_user_id
        FROM temporary_passwords tp
        JOIN users u ON u.id = tp.user_id
        WHERE tp.email = p_email
        AND tp.is_used = FALSE
        AND tp.expires_at > NOW()
        ORDER BY tp.created_at DESC
    LOOP
        -- التحقق من كلمة المرور (النص الخام أولاً للتطوير)
        IF v_record.temp_password_plain = p_password THEN
            RETURN QUERY SELECT 
                TRUE as is_valid,
                v_record.id as temp_password_id,
                v_record.found_user_id as user_id,
                v_record.is_first_use,
                v_record.expires_at;
            RETURN;
        END IF;
        
        -- التحقق من كلمة المرور المشفرة باستخدام bcrypt
        IF crypt(p_password, v_record.temp_password_hash) = v_record.temp_password_hash THEN
            RETURN QUERY SELECT 
                TRUE as is_valid,
                v_record.id as temp_password_id,
                v_record.found_user_id as user_id,
                v_record.is_first_use,
                v_record.expires_at;
            RETURN;
        END IF;
    END LOOP;
    
    -- لم يتم العثور على تطابق
    RETURN QUERY SELECT 
        FALSE as is_valid,
        NULL::UUID as temp_password_id,
        NULL::UUID as user_id,
        FALSE as is_first_use,
        NULL::TIMESTAMP WITH TIME ZONE as expires_at;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 8. دالة تحديث حالة الاستخدام
-- ===================================
CREATE OR REPLACE FUNCTION mark_temporary_password_used(p_temp_password_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE temporary_passwords
    SET 
        is_used = TRUE,
        used_at = NOW(),
        is_first_use = FALSE
    WHERE id = p_temp_password_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 9. دالة جدولة تنظيف تلقائي (اختيارية)
-- ===================================
CREATE OR REPLACE FUNCTION schedule_temporary_password_cleanup()
RETURNS VOID AS $$
BEGIN
    -- يمكن استدعاء هذه الدالة من cron job
    PERFORM cleanup_expired_temporary_passwords();
    
    -- تسجيل العملية
    INSERT INTO admin_logs (admin_id, action, details, created_at)
    VALUES (
        '00000000-0000-0000-0000-000000000000', -- system user
        'cleanup_temporary_passwords',
        jsonb_build_object('cleaned_at', NOW()),
        NOW()
    );
EXCEPTION
    WHEN OTHERS THEN
        -- تجاهل الأخطاء في حالة عدم وجود جدول admin_logs
        NULL;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- عرض ملخص الإنشاء
SELECT 'Temporary passwords table created successfully!' as status;
SELECT 
    table_name, 
    table_type,
    (SELECT count(*) FROM information_schema.columns WHERE table_name = 'temporary_passwords') as column_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'temporary_passwords';
