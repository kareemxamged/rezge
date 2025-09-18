-- إعادة تعيين محاولات المصادقة الثنائية لحساب talae@gmail.com
-- يجب تشغيل هذا الملف في Supabase Dashboard > SQL Editor

-- 1. حذف جميع رموز المصادقة الثنائية للمستخدم
DELETE FROM public.two_factor_codes 
WHERE email = 'talae@gmail.com';

-- 2. حذف سجلات الحد الزمني إذا كانت موجودة (للنظام الجديد)
DELETE FROM public.two_factor_rate_limits 
WHERE user_id IN (
    SELECT u.id 
    FROM auth.users u 
    JOIN public.profiles p ON u.id = p.id 
    WHERE p.email = 'talae@gmail.com'
);

-- 3. التحقق من النتائج
SELECT 
    'تم حذف رموز المصادقة الثنائية' as message,
    COUNT(*) as remaining_codes
FROM public.two_factor_codes 
WHERE email = 'talae@gmail.com';

-- 4. عرض معلومات المستخدم للتأكد
SELECT 
    u.id as user_id,
    p.email,
    p.first_name,
    p.last_name,
    'جاهز للاختبار' as status
FROM auth.users u 
JOIN public.profiles p ON u.id = p.id 
WHERE p.email = 'talae@gmail.com';
