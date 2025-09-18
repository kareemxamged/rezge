-- إنشاء جدول طلبات إعادة تعيين كلمة المرور
-- Create password reset requests table

BEGIN;

-- ===================================
-- 1. إنشاء جدول password_reset_requests
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

-- ===================================
-- 2. إنشاء فهارس للأداء
-- ===================================
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_id ON password_reset_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_email ON password_reset_requests(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_daily_reset_date ON password_reset_requests(daily_reset_date);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_is_blocked_until ON password_reset_requests(is_blocked_until);

-- ===================================
-- 3. تفعيل Row Level Security
-- ===================================
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

-- ===================================
-- 4. إنشاء سياسات الأمان
-- ===================================

-- السماح للمستخدمين بقراءة سجلاتهم فقط
CREATE POLICY "Users can view their own password reset requests" ON password_reset_requests
    FOR SELECT USING (auth.uid() = user_id);

-- السماح للمستخدمين بإدراج سجلات جديدة لأنفسهم
CREATE POLICY "Users can create their own password reset requests" ON password_reset_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- السماح للمستخدمين بتحديث سجلاتهم فقط
CREATE POLICY "Users can update their own password reset requests" ON password_reset_requests
    FOR UPDATE USING (auth.uid() = user_id);

-- السماح للخدمة (service role) بالوصول الكامل
CREATE POLICY "Service role can manage all password reset requests" ON password_reset_requests
    FOR ALL USING (true);

-- ===================================
-- 5. دالة تحديث updated_at تلقائياً
-- ===================================
CREATE OR REPLACE FUNCTION update_password_reset_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق التحديث التلقائي
DROP TRIGGER IF EXISTS update_password_reset_requests_updated_at ON password_reset_requests;
CREATE TRIGGER update_password_reset_requests_updated_at
    BEFORE UPDATE ON password_reset_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_password_reset_requests_updated_at();

-- ===================================
-- 6. دالة تنظيف السجلات القديمة
-- ===================================
CREATE OR REPLACE FUNCTION cleanup_old_password_reset_requests()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- حذف السجلات الأقدم من 30 يوماً
    DELETE FROM password_reset_requests 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 7. دالة فحص حدود الطلبات اليومية
-- ===================================
CREATE OR REPLACE FUNCTION check_daily_password_reset_limit(p_user_id UUID, p_email VARCHAR)
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
    v_daily_limit INTEGER := 5; -- الحد الأقصى اليومي
    v_record RECORD;
    v_is_blocked BOOLEAN := FALSE;
    v_block_reason TEXT := NULL;
    v_wait_time INTEGER := 0;
BEGIN
    -- البحث عن السجل الحالي
    SELECT * INTO v_record
    FROM password_reset_requests
    WHERE user_id = p_user_id
    LIMIT 1;
    
    IF FOUND THEN
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
            v_current_count := 0; -- يوم جديد
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

-- عرض ملخص الإنشاء
SELECT 'Password reset requests table created successfully!' as status;
SELECT 
    table_name, 
    table_type,
    (SELECT count(*) FROM information_schema.columns WHERE table_name = 'password_reset_requests') as column_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'password_reset_requests';
