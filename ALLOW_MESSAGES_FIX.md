# إصلاح مشكلة عدم ظهور زر المراسلة في الملف الشخصي العام

## المشكلة
- المستخدم مفعل إعداد "السماح بالرسائل" في صفحة الأمان والخصوصية
- لكن زر المراسلة لا يظهر في صفحة الملف الشخصي العام

## السبب
كان حقل `allow_messages` مفقود من:
1. **استعلام قاعدة البيانات** في `getPublicUserProfile`
2. **تعريف النوع** `PublicUserProfile` في `PublicProfilePage.tsx`

## الإصلاحات المطبقة

### 1. إضافة حقل allow_messages للاستعلام
**الملف**: `src/lib/supabase.ts`
```typescript
// في دالة getPublicUserProfile
.select(`
  // ... باقي الحقول
  profile_image_url,
  profile_image_visible,
  has_profile_image,
  profile_visibility,
  allow_messages  // ← تم إضافته
`)
```

### 2. تحديث تعريف النوع PublicUserProfile
**الملف**: `src/components/PublicProfilePage.tsx`
```typescript
interface PublicUserProfile {
  // ... باقي الحقول
  smoking?: string;
  beard?: string;
  hijab?: string;
  education_level?: string;
  financial_status?: string;
  allow_messages?: boolean;  // ← تم إضافته
}
```

### 3. إضافة تسجيل للتشخيص
تم إضافة تسجيل لقيمة `allow_messages` في:
- `getPublicUserProfile` في `supabase.ts`
- `fetchUserProfile` في `PublicProfilePage.tsx`

## كيفية التحقق من الإصلاح

1. افتح Developer Tools (F12)
2. انتقل لتبويب Console
3. ادخل على رابط الملف الشخصي العام
4. ابحث عن رسالة مثل:
   ```
   Target user profile result - allow_messages: true
   getPublicUserProfile result - allow_messages: true
   ```

## النتيجة المتوقعة
الآن يجب أن يظهر زر المراسلة في الملف الشخصي العام إذا كان:
- المستخدم مسجل دخول
- صاحب الملف مفعل إعداد "السماح بالرسائل"
- `profile.allow_messages === true`

## الملفات المحدثة
- `src/lib/supabase.ts`
- `src/components/PublicProfilePage.tsx`
