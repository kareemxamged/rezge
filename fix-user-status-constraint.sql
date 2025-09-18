-- إصلاح قيد التحقق لعمود status في جدول users
-- تاريخ الإنشاء: 12-08-2025
-- الغرض: السماح بالقيمة 'banned' في عمود status

-- بدء المعاملة
BEGIN;

-- حذف القيد الحالي إذا كان موجوداً
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS check_status;

-- إضافة قيد جديد يسمح بجميع القيم المطلوبة
ALTER TABLE public.users ADD CONSTRAINT users_status_check 
    CHECK (status IN ('active', 'suspended', 'banned', 'pending', 'inactive') OR status IS NULL);

-- تأكيد المعاملة
COMMIT;

-- عرض القيود الحالية للتأكد
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass 
AND conname LIKE '%status%';
