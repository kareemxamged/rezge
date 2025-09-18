-- إضافة سياسة Row Level Security للسماح بالبحث عن المستخدمين
-- تاريخ الإنشاء: 2025-07-17
-- الغرض: السماح للمستخدمين المصادقين برؤية المستخدمين الآخرين النشطين والمحققين للبحث

-- إضافة سياسة للسماح للمستخدمين برؤية المستخدمين الآخرين للبحث
CREATE POLICY "Users can view other users for matching" 
ON public.users 
FOR SELECT 
USING (status = 'active' AND verified = true);

-- تعليق على السياسة
COMMENT ON POLICY "Users can view other users for matching" ON public.users IS 
'تسمح هذه السياسة للمستخدمين المصادقين برؤية المستخدمين الآخرين النشطين والمحققين فقط لأغراض البحث والتعارف';

-- التحقق من السياسات الموجودة
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'users';
