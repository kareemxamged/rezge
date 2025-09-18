-- اختبار دالة send_real_email بعد الإصلاح
-- تشغيل هذا الاستعلام للتأكد من عمل الدالة

-- اختبار الدالة مع إيميل تجريبي
SELECT public.send_real_email(
    'kemooamegoo@gmail.com',
    '🧪 اختبار دالة قاعدة البيانات - رزقي (محدث)',
    '<div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px;"><h2 style="color: #1e40af;">🎉 اختبار ناجح!</h2><p>تم تسجيل هذا الإيميل بنجاح في قاعدة البيانات مع العمود sent_at.</p></div>',
    'اختبار دالة قاعدة البيانات - تم التسجيل بنجاح مع sent_at'
) as test_result;

-- فحص آخر 5 إيميلات في السجل (بعد إضافة العمود)
SELECT * FROM public.get_email_logs(5);

-- فحص بنية الجدول للتأكد من وجود العمود
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'email_logs' 
AND table_schema = 'public' 
ORDER BY ordinal_position;
