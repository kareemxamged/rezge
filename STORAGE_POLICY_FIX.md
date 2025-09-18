# إصلاح مشكلة الصور الشخصية في Storage

## المشكلة المحددة
```
POST https://sbtzngewizgeqzfbhfjy.supabase.co/storage/v1/object/sign/profile-images/... 400 (Bad Request)
خطأ في إنشاء signed URL: StorageApiError: Object not found
Profile image path does not start with http: [path]
```

## السبب الجذري
سياسات Row Level Security في `storage.objects` تسمح فقط للمستخدم بقراءة صوره الشخصية:

```sql
-- السياسة القديمة (مقيدة)
((bucket_id = 'profile-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))
```

هذا يعني:
- المستخدم `f7d18de3-9102-4c40-a01a-a34f863ce319` (المسجل دخول)
- لا يستطيع قراءة صور المستخدم `27630074-bb7d-4c84-9922-45b21e699a8c` (الملف المطلوب)

## التشخيص من الكونسول
✅ **قاعدة البيانات**: الصورة موجودة في `profile_images`
✅ **Storage**: الملف موجود فعلياً في `storage.objects`
❌ **الصلاحيات**: لا يمكن للمستخدمين الآخرين الوصول للملف

## الإصلاح المطبق

### إضافة سياسة Storage جديدة
```sql
CREATE POLICY "Enable read for visible profile images in storage" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'profile-images' 
  AND EXISTS (
    SELECT 1 
    FROM public.profile_images pi 
    JOIN public.users u ON pi.user_id = u.id 
    WHERE pi.storage_path = objects.name 
    AND pi.is_visible = true 
    AND u.profile_image_visible = true
  )
);
```

### شرح السياسة الجديدة
السياسة تسمح بقراءة ملفات الصور إذا:
1. **الملف في bucket الصحيح**: `bucket_id = 'profile-images'`
2. **الصورة مرئية في قاعدة البيانات**: `pi.is_visible = true`
3. **المستخدم مفعل إظهار الصورة**: `u.profile_image_visible = true`
4. **المسار متطابق**: `pi.storage_path = objects.name`

## النتيجة المتوقعة

### في الكونسول يجب أن نرى:
```
Profile image found, getting signed URL...
getImageWithSignedUrl called with image: [path] storage_path: [path]
إنشاء signed URL جديد للمسار: [path]
Signed URL creation result - data: true error: null
تم إنشاء signed URL جديد بنجاح: https://[signed-url]
Image with signed URL: true https://[signed-url]
Profile image fetched successfully: true https://[signed-url]
getProfileImageUrl called - profileImage: true profile_image_visible: true file_path: https://[signed-url]
Returning profile image URL: https://[signed-url]
```

### في الصفحة:
- ✅ تظهر الصورة الشخصية للمستخدم
- ✅ لا توجد أخطاء في الكونسول
- ✅ يعمل signed URL بشكل صحيح

## اختبار الإصلاح
1. ادخل على الرابط: `http://localhost:5173/profile/27630074-bb7d-4c84-9922-45b21e699a8c`
2. راقب الكونسول للتأكد من عدم وجود أخطاء Storage
3. تأكد من ظهور الصورة الشخصية في الصفحة

## الملفات المحدثة
- قاعدة البيانات: `storage.objects` (سياسة RLS جديدة)
