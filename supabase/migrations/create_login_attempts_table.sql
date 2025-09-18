-- إنشاء جدول تتبع محاولات تسجيل الدخول
-- هذا الجدول يتتبع جميع محاولات تسجيل الدخول الناجحة والفاشلة

CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  attempt_type VARCHAR(50) DEFAULT 'login' CHECK (attempt_type IN ('login', 'password_reset', 'account_unlock')),
  success BOOLEAN NOT NULL DEFAULT FALSE,
  failure_reason VARCHAR(100), -- 'invalid_credentials', 'account_not_verified', 'account_suspended', 'rate_limited'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(255), -- معرف الجلسة إن وجد
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- فهارس لتحسين الأداء
  INDEX idx_login_attempts_email (email),
  INDEX idx_login_attempts_ip (ip_address),
  INDEX idx_login_attempts_created_at (created_at),
  INDEX idx_login_attempts_email_created_at (email, created_at),
  INDEX idx_login_attempts_success (success),
  INDEX idx_login_attempts_user_id (user_id)
);

-- إضافة تعليقات للجدول والأعمدة
COMMENT ON TABLE public.login_attempts IS 'جدول تتبع محاولات تسجيل الدخول والأمان';
COMMENT ON COLUMN public.login_attempts.email IS 'البريد الإلكتروني المستخدم في المحاولة';
COMMENT ON COLUMN public.login_attempts.ip_address IS 'عنوان IP الخاص بالمحاولة';
COMMENT ON COLUMN public.login_attempts.user_agent IS 'معلومات المتصفح والجهاز';
COMMENT ON COLUMN public.login_attempts.attempt_type IS 'نوع المحاولة: login, password_reset, account_unlock';
COMMENT ON COLUMN public.login_attempts.success IS 'هل نجحت المحاولة أم لا';
COMMENT ON COLUMN public.login_attempts.failure_reason IS 'سبب فشل المحاولة إن وجد';
COMMENT ON COLUMN public.login_attempts.user_id IS 'معرف المستخدم إن كان موجوداً';
COMMENT ON COLUMN public.login_attempts.session_id IS 'معرف الجلسة الناتجة عن تسجيل الدخول الناجح';

-- إنشاء جدول لتتبع حالات المنع المؤقت
CREATE TABLE IF NOT EXISTS public.login_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  ip_address INET,
  block_type VARCHAR(50) NOT NULL CHECK (block_type IN ('short_term', 'daily_limit', 'manual')),
  block_reason TEXT,
  blocked_until TIMESTAMP WITH TIME ZONE NOT NULL,
  failed_attempts_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- فهارس
  INDEX idx_login_blocks_email (email),
  INDEX idx_login_blocks_ip (ip_address),
  INDEX idx_login_blocks_blocked_until (blocked_until),
  INDEX idx_login_blocks_is_active (is_active),
  INDEX idx_login_blocks_email_active (email, is_active),
  
  -- قيد فريد لمنع التكرار
  UNIQUE(email, block_type, is_active)
);

COMMENT ON TABLE public.login_blocks IS 'جدول تتبع حالات المنع المؤقت لتسجيل الدخول';
COMMENT ON COLUMN public.login_blocks.block_type IS 'نوع المنع: short_term (5 ساعات), daily_limit (24 ساعة), manual (يدوي)';
COMMENT ON COLUMN public.login_blocks.blocked_until IS 'تاريخ انتهاء المنع';
COMMENT ON COLUMN public.login_blocks.failed_attempts_count IS 'عدد المحاولات الفاشلة التي أدت للمنع';

-- دالة لتنظيف البيانات القديمة (تشغل يومياً)
CREATE OR REPLACE FUNCTION cleanup_old_login_data()
RETURNS void AS $$
BEGIN
  -- حذف محاولات تسجيل الدخول الأقدم من 30 يوماً
  DELETE FROM public.login_attempts 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- إلغاء تفعيل حالات المنع المنتهية الصلاحية
  UPDATE public.login_blocks 
  SET is_active = FALSE, updated_at = NOW()
  WHERE blocked_until < NOW() AND is_active = TRUE;
  
  -- حذف حالات المنع القديمة (أقدم من 7 أيام من انتهاء صلاحيتها)
  DELETE FROM public.login_blocks 
  WHERE blocked_until < NOW() - INTERVAL '7 days' AND is_active = FALSE;
  
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_login_blocks_updated_at
  BEFORE UPDATE ON public.login_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- تفعيل Row Level Security
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_blocks ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان - المشرفون فقط يمكنهم الوصول لهذه البيانات
CREATE POLICY "Admins can view login attempts" ON public.login_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND (email LIKE '%admin%' OR id = 'admin-user-id')
    )
  );

CREATE POLICY "Admins can manage login blocks" ON public.login_blocks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND (email LIKE '%admin%' OR id = 'admin-user-id')
    )
  );

-- السماح للنظام بإدراج البيانات (للخدمات الخلفية)
CREATE POLICY "System can insert login attempts" ON public.login_attempts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can manage login blocks" ON public.login_blocks
  FOR ALL WITH CHECK (true);
