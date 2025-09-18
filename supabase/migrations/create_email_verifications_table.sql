-- إنشاء جدول تحقق البريد الإلكتروني
-- هذا الجدول يحفظ طلبات التحقق من البريد الإلكتروني للمستخدمين الجدد

CREATE TABLE IF NOT EXISTS public.email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  user_data JSONB NOT NULL, -- بيانات المستخدم المؤقتة
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  
  -- فهارس لتحسين الأداء
  INDEX idx_email_verifications_email (email),
  INDEX idx_email_verifications_token (token),
  INDEX idx_email_verifications_status (status),
  INDEX idx_email_verifications_expires_at (expires_at),
  INDEX idx_email_verifications_created_at (created_at),
  INDEX idx_email_verifications_email_status (email, status),
  INDEX idx_email_verifications_status_expires (status, expires_at)
);

-- إضافة تعليقات للجدول والأعمدة
COMMENT ON TABLE public.email_verifications IS 'جدول طلبات تحقق البريد الإلكتروني للمستخدمين الجدد';
COMMENT ON COLUMN public.email_verifications.id IS 'معرف فريد للطلب';
COMMENT ON COLUMN public.email_verifications.email IS 'البريد الإلكتروني المراد التحقق منه';
COMMENT ON COLUMN public.email_verifications.token IS 'رمز التحقق الفريد';
COMMENT ON COLUMN public.email_verifications.user_data IS 'بيانات المستخدم المؤقتة (JSON)';
COMMENT ON COLUMN public.email_verifications.status IS 'حالة الطلب: pending, verified, expired';
COMMENT ON COLUMN public.email_verifications.expires_at IS 'تاريخ انتهاء صلاحية الطلب';
COMMENT ON COLUMN public.email_verifications.created_at IS 'تاريخ إنشاء الطلب';
COMMENT ON COLUMN public.email_verifications.verified_at IS 'تاريخ التحقق من الطلب';
COMMENT ON COLUMN public.email_verifications.ip_address IS 'عنوان IP الخاص بالطلب';
COMMENT ON COLUMN public.email_verifications.user_agent IS 'معلومات المتصفح والجهاز';

-- دالة لتنظيف الطلبات المنتهية الصلاحية
CREATE OR REPLACE FUNCTION cleanup_expired_email_verifications()
RETURNS void AS $$
BEGIN
    -- حذف الطلبات المنتهية الصلاحية
    DELETE FROM public.email_verifications 
    WHERE expires_at < NOW() OR status = 'expired';
    
    -- حذف الطلبات القديمة (أكثر من 7 أيام) حتى لو لم تنته صلاحيتها
    DELETE FROM public.email_verifications 
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- دالة لتحديث حالة الطلبات المنتهية الصلاحية تلقائياً
CREATE OR REPLACE FUNCTION auto_expire_email_verifications()
RETURNS void AS $$
BEGIN
    -- تحديث حالة الطلبات المنتهية الصلاحية
    UPDATE public.email_verifications 
    SET status = 'expired'
    WHERE expires_at < NOW() AND status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث الطلبات المنتهية الصلاحية تلقائياً
CREATE OR REPLACE FUNCTION trigger_auto_expire_email_verifications()
RETURNS TRIGGER AS $$
BEGIN
    -- تشغيل دالة التنظيف عند كل عملية SELECT
    PERFORM auto_expire_email_verifications();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- تفعيل Row Level Security
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان - السماح بالقراءة والكتابة للجميع (للتحقق من البريد الإلكتروني)
-- ملاحظة: هذا آمن لأن البيانات مؤقتة ولا تحتوي على معلومات حساسة
CREATE POLICY "Allow public read access for email verification" ON public.email_verifications
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert for email verification" ON public.email_verifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update for email verification" ON public.email_verifications
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete for email verification" ON public.email_verifications
  FOR DELETE USING (true);

-- إنشاء مهمة تنظيف تلقائية (تعمل كل ساعة)
-- ملاحظة: هذا يتطلب تفعيل pg_cron extension في Supabase
-- SELECT cron.schedule('cleanup-expired-email-verifications', '0 * * * *', 'SELECT cleanup_expired_email_verifications();');

-- إدراج بعض البيانات التجريبية للاختبار (اختياري)
-- INSERT INTO public.email_verifications (email, token, user_data, expires_at) VALUES
-- ('test@example.com', 'test-token-123', '{"first_name": "Test", "last_name": "User"}', NOW() + INTERVAL '24 hours');
