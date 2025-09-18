-- إصلاح سياسة الأمان لجدول email_queue لحل مشكلة التسجيل
-- Fix RLS policy for email_queue table to resolve registration issue

-- إنشاء الجدول إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.email_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT,
    text_content TEXT,
    from_email TEXT DEFAULT 'manage@kareemamged.com',
    email_type TEXT DEFAULT 'general',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 5
);

-- تفعيل RLS
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- حذف السياسات الموجودة
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.email_queue;
DROP POLICY IF EXISTS "Allow insert for all users" ON public.email_queue;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.email_queue;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.email_queue;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.email_queue;

-- إنشاء سياسة للسماح بالإدراج للجميع (للتسجيل)
CREATE POLICY "Allow insert for all users" ON public.email_queue
    FOR INSERT 
    WITH CHECK (true);

-- إنشاء سياسة للسماح بالقراءة للمستخدمين المصادق عليهم
CREATE POLICY "Allow select for authenticated users" ON public.email_queue
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- إنشاء سياسة للسماح بالتحديث للمستخدمين المصادق عليهم
CREATE POLICY "Allow update for authenticated users" ON public.email_queue
    FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- إنشاء سياسة للسماح بالحذف للمستخدمين المصادق عليهم
CREATE POLICY "Allow delete for authenticated users" ON public.email_queue
    FOR DELETE 
    USING (auth.role() = 'authenticated');

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON public.email_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_email_type ON public.email_queue(email_type);
CREATE INDEX IF NOT EXISTS idx_email_queue_to_email ON public.email_queue(to_email);

-- منح الصلاحيات للمستخدمين المجهولين للإدراج فقط
GRANT INSERT ON public.email_queue TO anon;
GRANT SELECT, UPDATE, DELETE ON public.email_queue TO authenticated;
GRANT ALL ON public.email_queue TO service_role;

-- التأكد من وجود الأعمدة المطلوبة
DO $$ 
BEGIN
    -- إضافة الأعمدة المفقودة إذا لم تكن موجودة
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_queue' 
                   AND column_name = 'html_content' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.email_queue ADD COLUMN html_content TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_queue' 
                   AND column_name = 'text_content' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.email_queue ADD COLUMN text_content TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_queue' 
                   AND column_name = 'sent_at' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.email_queue ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_queue' 
                   AND column_name = 'error_message' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.email_queue ADD COLUMN error_message TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_queue' 
                   AND column_name = 'retry_count' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.email_queue ADD COLUMN retry_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_queue' 
                   AND column_name = 'priority' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.email_queue ADD COLUMN priority INTEGER DEFAULT 5;
    END IF;
END $$;

-- إضافة أو تحديث قيد نوع الإيميل لدعم password_setup
DO $$
BEGIN
    -- حذف القيد القديم إذا كان موجوداً
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'check_email_queue_email_type'
        AND constraint_schema = 'public'
    ) THEN
        ALTER TABLE public.email_queue DROP CONSTRAINT check_email_queue_email_type;
    END IF;
    
    -- إضافة القيد الجديد مع نوع password_setup
    ALTER TABLE public.email_queue 
    ADD CONSTRAINT check_email_queue_email_type 
    CHECK (email_type IN ('general', 'verification', 'notification', 'two_factor', 'temporary_password', 'admin_notification', 'password_setup'));
END $$;
