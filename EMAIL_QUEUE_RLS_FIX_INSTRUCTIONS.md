# إصلاح مشكلة email_queue RLS Policy

## المشكلة
```
❌ فشل في حفظ إيميل التحقق: new row violates row-level security policy for table "email_queue"
```

## السبب
جدول `email_queue` يحتوي على سياسة أمان على مستوى الصف (RLS) تمنع المستخدمين غير المصادق عليهم من إدراج البيانات، مما يمنع إرسال إيميلات التحقق أثناء التسجيل.

## الحل المطلوب

### 1. تنفيذ SQL في Supabase Dashboard
انسخ والصق الكود التالي في **SQL Editor** في لوحة تحكم Supabase:

```sql
-- إصلاح سياسة الأمان لجدول email_queue لحل مشكلة التسجيل

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

-- منح الصلاحيات للمستخدمين المجهولين للإدراج فقط
GRANT INSERT ON public.email_queue TO anon;
GRANT SELECT, UPDATE, DELETE ON public.email_queue TO authenticated;
GRANT ALL ON public.email_queue TO service_role;
```

### 2. خطوات التنفيذ

1. **افتح Supabase Dashboard**
2. **اذهب إلى SQL Editor**
3. **انسخ والصق الكود أعلاه**
4. **اضغط Run**
5. **تأكد من عدم وجود أخطاء**

### 3. التحقق من الإصلاح

بعد تنفيذ الكود:
- جرب إنشاء حساب جديد
- يجب أن يعمل إرسال إيميل التحقق بدون أخطاء
- تحقق من وصول الإيميل

## الملفات المتأثرة
- `src/lib/clientEmailService.ts` - يستخدم جدول email_queue
- `database/fix_email_queue_rls_policy.sql` - ملف الإصلاح

## ملاحظات الأمان
- السياسة الجديدة تسمح للمستخدمين غير المصادق عليهم بإدراج الإيميلات فقط
- القراءة والتحديث والحذف محصورة على المستخدمين المصادق عليهم
- هذا آمن لأن إدراج إيميلات التحقق مطلوب للتسجيل

## حالة الإصلاح
✅ تم إنشاء ملف الإصلاح: `database/fix_email_queue_rls_policy.sql`
⏳ **مطلوب من المستخدم**: تنفيذ الكود في Supabase Dashboard
