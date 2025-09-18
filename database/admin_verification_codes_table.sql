-- جدول أكواد التحقق الإضافي للمشرفين
CREATE TABLE IF NOT EXISTS admin_verification_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_admin_verification_codes_admin_id ON admin_verification_codes(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_verification_codes_code ON admin_verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_admin_verification_codes_expires_at ON admin_verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_verification_codes_used ON admin_verification_codes(used);
CREATE INDEX IF NOT EXISTS idx_admin_verification_codes_created_at ON admin_verification_codes(created_at);

-- فهرس مركب للبحث السريع
CREATE INDEX IF NOT EXISTS idx_admin_verification_codes_lookup 
ON admin_verification_codes(admin_id, code, used, expires_at);

-- تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_admin_verification_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_verification_codes_updated_at
    BEFORE UPDATE ON admin_verification_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_verification_codes_updated_at();

-- دالة تنظيف الأكواد المنتهية الصلاحية (يتم تشغيلها دورياً)
CREATE OR REPLACE FUNCTION cleanup_expired_admin_verification_codes()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM admin_verification_codes 
    WHERE expires_at < NOW() OR (used = TRUE AND created_at < NOW() - INTERVAL '24 hours');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- سياسة الأمان (RLS)
ALTER TABLE admin_verification_codes ENABLE ROW LEVEL SECURITY;

-- سياسة للمشرفين فقط
CREATE POLICY admin_verification_codes_policy ON admin_verification_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_accounts 
            WHERE admin_accounts.id = admin_verification_codes.admin_id
        )
    );

-- تعليقات للتوثيق
COMMENT ON TABLE admin_verification_codes IS 'جدول أكواد التحقق الإضافي للمشرفين';
COMMENT ON COLUMN admin_verification_codes.id IS 'معرف فريد للكود';
COMMENT ON COLUMN admin_verification_codes.admin_id IS 'معرف المشرف';
COMMENT ON COLUMN admin_verification_codes.code IS 'كود التحقق (6 أرقام)';
COMMENT ON COLUMN admin_verification_codes.expires_at IS 'تاريخ انتهاء صلاحية الكود';
COMMENT ON COLUMN admin_verification_codes.used IS 'هل تم استخدام الكود';
COMMENT ON COLUMN admin_verification_codes.created_at IS 'تاريخ إنشاء الكود';
COMMENT ON COLUMN admin_verification_codes.updated_at IS 'تاريخ آخر تحديث';
