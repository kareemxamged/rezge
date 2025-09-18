-- إصلاح عاجل لجدول password_reset_requests
-- Urgent fix for password_reset_requests table

-- إنشاء الجدول مع سياسات مبسطة
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

-- فهارس أساسية
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_id ON password_reset_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_email ON password_reset_requests(email);

-- تفعيل RLS
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

-- سياسة مبسطة للوصول الكامل (للخدمة)
DROP POLICY IF EXISTS "Allow full access to password_reset_requests" ON password_reset_requests;
CREATE POLICY "Allow full access to password_reset_requests" ON password_reset_requests
    FOR ALL USING (true);

-- منح صلاحيات كاملة للجدول
GRANT ALL ON password_reset_requests TO anon;
GRANT ALL ON password_reset_requests TO authenticated;
GRANT ALL ON password_reset_requests TO service_role;

SELECT 'password_reset_requests table created with full access!' as status;
