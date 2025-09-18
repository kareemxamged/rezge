# إصلاح مشاكل الملف الشخصي العام

## المشاكل المحددة

### 1. رسالة "يجب تسجيل الدخول أولاً" رغم تسجيل الدخول
**السبب**: تأخير في تحميل بيانات المستخدم من AuthContext
**الأعراض**: ظهور رسالة خطأ مؤقتة قبل تحميل بيانات المستخدم

### 2. عدم ظهور الصورة الشخصية رغم تفعيلها
**السبب**: سياسات Row Level Security تمنع المستخدمين الآخرين من رؤية الصور
**الأعراض**: `No profile image found for user` في الكونسول

## الإصلاحات المطبقة

### 1. إصلاح مشكلة رسالة المصادقة
**الملف**: `src/components/PublicProfilePage.tsx`

**قبل الإصلاح**:
```typescript
if (!currentUser) {
  setError(t('publicProfile.error.authRequired'));
  setLoading(false);
  return;
}
```

**بعد الإصلاح**:
```typescript
// useEffect منفصل للانتظار حتى انتهاء تحميل المصادقة
if (!currentUser) {
  // لا نعرض خطأ فوراً، ننتظر AuthContext ينتهي من التحميل
  return;
}

// useEffect منفصل للتحقق من انتهاء تحميل المصادقة
useEffect(() => {
  if (!loading && !currentUser) {
    setError(t('publicProfile.error.authRequired'));
  }
}, [loading, currentUser, t]);
```

### 2. إصلاح مشكلة الصورة الشخصية
**قاعدة البيانات**: إضافة سياسة RLS جديدة

**السياسة الجديدة**:
```sql
CREATE POLICY "Enable read access for visible profile images" 
ON public.profile_images 
FOR SELECT 
USING (
  is_visible = true 
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = profile_images.user_id 
    AND users.profile_image_visible = true
  )
);
```

**الشرح**:
- تسمح للمستخدمين بقراءة الصور المرئية (`is_visible = true`)
- فقط إذا كان صاحب الصورة مفعل إظهار الصورة (`profile_image_visible = true`)

## النتيجة المتوقعة

### 1. رسالة المصادقة
- ✅ لن تظهر رسالة "يجب تسجيل الدخول أولاً" مؤقتاً
- ✅ ستنتظر الصفحة حتى انتهاء تحميل بيانات المستخدم
- ✅ ستظهر رسالة الخطأ فقط إذا لم يكن المستخدم مسجل دخول فعلاً

### 2. الصورة الشخصية
- ✅ ستظهر الصور الشخصية للمستخدمين الذين فعلوا إظهارها
- ✅ ستعمل دالة `getUserPrimaryImage` بشكل صحيح
- ✅ ستظهر رسالة في الكونسول: `Profile image found, getting signed URL...`

## اختبار الإصلاحات

1. ادخل على الرابط: `http://localhost:5173/profile/27630074-bb7d-4c84-9922-45b21e699a8c`
2. راقب الكونسول - يجب أن ترى:
   ```
   Profile image query result - data: true error: null
   Profile image found, getting signed URL...
   ```
3. يجب أن تظهر الصورة الشخصية في الصفحة
4. لا يجب أن تظهر رسالة "يجب تسجيل الدخول أولاً"

## الملفات المحدثة
- `src/components/PublicProfilePage.tsx`
- قاعدة البيانات: جدول `profile_images` (سياسة RLS جديدة)
