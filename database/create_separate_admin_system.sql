-- إنشاء نظام إدارة منفصل بالكامل
-- تاريخ الإنشاء: 15-08-2025

-- 1. جدول حسابات الإدارة المنفصل
CREATE TABLE IF NOT EXISTS admin_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL, -- اسم المستخدم للإدارة
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role_id UUID REFERENCES admin_roles(id),
    is_active BOOLEAN DEFAULT true,
    is_super_admin BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    must_change_password BOOLEAN DEFAULT false,
    profile_image_url TEXT,
    phone VARCHAR(20),
    created_by UUID REFERENCES admin_accounts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. جدول جلسات الإدارة المنفصل
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_account_id UUID REFERENCES admin_accounts(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. جدول سجل أنشطة الإدارة المحدث
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_account_id UUID REFERENCES admin_accounts(id),
    action_type VARCHAR(100) NOT NULL,
    action_description TEXT,
    target_type VARCHAR(100), -- users, admin_accounts, settings, etc.
    target_id UUID,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_admin_accounts_username ON admin_accounts(username);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_email ON admin_accounts(email);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_active ON admin_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_account_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin_id ON admin_activity_log(admin_account_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created ON admin_activity_log(created_at);

-- 5. إنشاء حساب Super Admin الأول
INSERT INTO admin_accounts (
    username,
    email,
    password_hash,
    first_name,
    last_name,
    is_super_admin,
    is_active
) VALUES (
    'superadmin',
    'admin@rezge.com',
    '$2b$12$LQv3c1yqBwlVHpPjrEyXCO.4mLUoEHD9HpVllSEVHs9r6aaI9NiP6', -- كلمة المرور: Admin@123
    'مشرف',
    'عام',
    true,
    true
) ON CONFLICT (username) DO NOTHING;

-- 6. إنشاء دور Super Admin إذا لم يكن موجود
INSERT INTO admin_roles (
    name,
    display_name,
    description,
    is_active
) VALUES (
    'super_admin',
    'مشرف عام',
    'مشرف عام بجميع الصلاحيات',
    true
) ON CONFLICT (name) DO NOTHING;

-- 7. ربط Super Admin بالدور
UPDATE admin_accounts 
SET role_id = (SELECT id FROM admin_roles WHERE name = 'super_admin' LIMIT 1)
WHERE username = 'superadmin' AND role_id IS NULL;

-- 8. إنشاء دالة تشفير كلمة المرور
CREATE OR REPLACE FUNCTION hash_admin_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    -- هذه دالة مؤقتة - في الإنتاج يجب استخدام bcrypt من التطبيق
    RETURN encode(digest(password || 'admin_salt_2025', 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- 9. إنشاء دالة التحقق من كلمة المرور
CREATE OR REPLACE FUNCTION verify_admin_password(username_input TEXT, password_input TEXT)
RETURNS TABLE(
    account_id UUID,
    is_valid BOOLEAN,
    account_data JSONB
) AS $$
DECLARE
    account_record admin_accounts%ROWTYPE;
    hashed_password TEXT;
BEGIN
    -- البحث عن الحساب
    SELECT * INTO account_record 
    FROM admin_accounts 
    WHERE (username = username_input OR email = username_input) 
    AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, false, NULL::JSONB;
        RETURN;
    END IF;
    
    -- التحقق من كلمة المرور
    hashed_password := hash_admin_password(password_input);
    
    IF account_record.password_hash = hashed_password THEN
        -- تحديث آخر تسجيل دخول
        UPDATE admin_accounts 
        SET last_login_at = NOW(), 
            failed_login_attempts = 0,
            updated_at = NOW()
        WHERE id = account_record.id;
        
        RETURN QUERY SELECT 
            account_record.id,
            true,
            jsonb_build_object(
                'id', account_record.id,
                'username', account_record.username,
                'email', account_record.email,
                'first_name', account_record.first_name,
                'last_name', account_record.last_name,
                'is_super_admin', account_record.is_super_admin,
                'role_id', account_record.role_id
            );
    ELSE
        -- زيادة عدد المحاولات الفاشلة
        UPDATE admin_accounts 
        SET failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE 
                WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '30 minutes'
                ELSE locked_until
            END,
            updated_at = NOW()
        WHERE id = account_record.id;
        
        RETURN QUERY SELECT account_record.id, false, NULL::JSONB;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 10. إنشاء دالة إنشاء جلسة إدارية
CREATE OR REPLACE FUNCTION create_admin_session(
    admin_id UUID,
    session_token TEXT,
    ip_addr INET DEFAULT NULL,
    user_agent_str TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    session_id UUID;
BEGIN
    -- حذف الجلسات المنتهية الصلاحية
    DELETE FROM admin_sessions 
    WHERE admin_account_id = admin_id 
    AND expires_at < NOW();
    
    -- إنشاء جلسة جديدة
    INSERT INTO admin_sessions (
        admin_account_id,
        session_token,
        ip_address,
        user_agent,
        expires_at
    ) VALUES (
        admin_id,
        session_token,
        ip_addr,
        user_agent_str,
        NOW() + INTERVAL '24 hours'
    ) RETURNING id INTO session_id;
    
    RETURN session_id;
END;
$$ LANGUAGE plpgsql;

-- 11. إنشاء سياسات الأمان (RLS)
ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- سياسة للسماح للمشرفين بالوصول لبياناتهم فقط
CREATE POLICY admin_accounts_policy ON admin_accounts
    FOR ALL USING (auth.uid()::text = id::text);

CREATE POLICY admin_sessions_policy ON admin_sessions
    FOR ALL USING (auth.uid()::text = admin_account_id::text);

CREATE POLICY admin_activity_policy ON admin_activity_log
    FOR ALL USING (auth.uid()::text = admin_account_id::text);

-- 12. منح الصلاحيات
GRANT SELECT, INSERT, UPDATE ON admin_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_sessions TO authenticated;
GRANT SELECT, INSERT ON admin_activity_log TO authenticated;

-- 13. إنشاء حساب تجريبي إضافي
INSERT INTO admin_accounts (
    username,
    email,
    password_hash,
    first_name,
    last_name,
    is_super_admin,
    is_active
) VALUES (
    'testadmin',
    'testadmin@rezge.com',
    '$2b$12$LQv3c1yqBwlVHpPjrEyXCO.4mLUoEHD9HpVllSEVHs9r6aaI9NiP6', -- كلمة المرور: Admin@123
    'مشرف',
    'تجريبي',
    false,
    true
) ON CONFLICT (username) DO NOTHING;

COMMENT ON TABLE admin_accounts IS 'جدول حسابات الإدارة المنفصل عن المستخدمين العاديين';
COMMENT ON TABLE admin_sessions IS 'جلسات تسجيل الدخول للمشرفين';
COMMENT ON TABLE admin_activity_log IS 'سجل أنشطة المشرفين';
