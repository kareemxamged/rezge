-- إصلاح مخطط جدول email_logs - إضافة الأعمدة المفقودة
-- تاريخ الإنشاء: 15 سبتمبر 2025
-- الهدف: إصلاح خطأ "column html_content of relation email_logs does not exist"

-- إضافة الأعمدة المفقودة إذا لم تكن موجودة
DO $$ 
BEGIN
    -- إضافة عمود html_content
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_logs' 
                   AND column_name = 'html_content' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.email_logs ADD COLUMN html_content TEXT;
        RAISE NOTICE 'تم إضافة عمود html_content إلى جدول email_logs';
    ELSE
        RAISE NOTICE 'عمود html_content موجود بالفعل في جدول email_logs';
    END IF;
    
    -- إضافة عمود text_content
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_logs' 
                   AND column_name = 'text_content' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.email_logs ADD COLUMN text_content TEXT;
        RAISE NOTICE 'تم إضافة عمود text_content إلى جدول email_logs';
    ELSE
        RAISE NOTICE 'عمود text_content موجود بالفعل في جدول email_logs';
    END IF;
    
    -- إضافة عمود sent_at إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_logs' 
                   AND column_name = 'sent_at' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.email_logs ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'تم إضافة عمود sent_at إلى جدول email_logs';
    ELSE
        RAISE NOTICE 'عمود sent_at موجود بالفعل في جدول email_logs';
    END IF;
    
    -- إضافة عمود method إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_logs' 
                   AND column_name = 'method' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.email_logs ADD COLUMN method VARCHAR(100);
        RAISE NOTICE 'تم إضافة عمود method إلى جدول email_logs';
    ELSE
        RAISE NOTICE 'عمود method موجود بالفعل في جدول email_logs';
    END IF;
    
    -- إضافة عمود error_message إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_logs' 
                   AND column_name = 'error_message' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.email_logs ADD COLUMN error_message TEXT;
        RAISE NOTICE 'تم إضافة عمود error_message إلى جدول email_logs';
    ELSE
        RAISE NOTICE 'عمود error_message موجود بالفعل في جدول email_logs';
    END IF;
    
END $$;

-- التحقق من الأعمدة الموجودة
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'email_logs' 
AND table_schema = 'public'
ORDER BY ordinal_position;
