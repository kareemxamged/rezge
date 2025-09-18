-- إصلاح سياسات التخزين لصور التوثيق
-- تاريخ الإنشاء: 21-08-2025

-- حذف السياسات القديمة للتخزين إن وجدت
DROP POLICY IF EXISTS "Users can upload verification images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view verification images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all verification images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their verification images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete verification images" ON storage.objects;

-- سياسة للسماح للمستخدمين برفع صور التوثيق الخاصة بهم
CREATE POLICY "Users can upload verification images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'verification-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- سياسة للسماح للمستخدمين بعرض صور التوثيق الخاصة بهم
CREATE POLICY "Users can view their verification images" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'verification-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- سياسة للسماح للإداريين بعرض جميع صور التوثيق
CREATE POLICY "Admins can view all verification images" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'verification-documents' 
        AND EXISTS (
            SELECT 1 FROM public.admin_users au 
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

-- سياسة للسماح للمستخدمين بحذف صور التوثيق الخاصة بهم (إذا لزم الأمر)
CREATE POLICY "Users can delete their verification images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'verification-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- سياسة للسماح للإداريين بحذف صور التوثيق (إذا لزم الأمر)
CREATE POLICY "Admins can delete verification images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'verification-documents' 
        AND EXISTS (
            SELECT 1 FROM public.admin_users au 
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

-- سياسة للسماح للمستخدمين بتحديث صور التوثيق الخاصة بهم
CREATE POLICY "Users can update their verification images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'verification-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- التأكد من وجود bucket التوثيق
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'verification-documents',
    'verification-documents',
    true, -- جعل الـ bucket عام لعرض الصور
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
) ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- إضافة تعليق
COMMENT ON POLICY "Users can upload verification images" ON storage.objects IS 'السماح للمستخدمين برفع صور التوثيق الخاصة بهم';
COMMENT ON POLICY "Admins can view all verification images" ON storage.objects IS 'السماح للإداريين بعرض جميع صور التوثيق';
