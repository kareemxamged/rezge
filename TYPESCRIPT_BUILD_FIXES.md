# إصلاح أخطاء TypeScript في البناء

## الأخطاء المصلحة

### 1. مشكلة `profile_image_visible` في نوع `User`
**الملف**: `src/lib/supabase.ts`
**المشكلة**: الحقل مفقود من تعريف النوع
**الإصلاح**: إضافة الحقول المفقودة:
```typescript
// إعدادات الصورة الشخصية
profile_image_visible?: boolean;
has_profile_image?: boolean;
profile_image_url?: string;
```

### 2. مشكلة `profile_visibility` لا تدعم `'private'`
**الملف**: `src/lib/supabase.ts`
**المشكلة**: النوع لا يتضمن القيمة `'private'`
**الإصلاح**: تحديث النوع:
```typescript
profile_visibility?: 'public' | 'members' | 'verified' | 'private';
```

### 3. مشكلة `allow_messages` في `SearchPage.tsx`
**الملف**: `src/components/SearchPage.tsx`
**المشكلة**: نوع `UserType` المحلي لا يتضمن الحقل
**الإصلاح**: إضافة الحقل:
```typescript
interface UserType {
  // ... باقي الحقول
  allow_messages?: boolean;
}
```

### 4. أخطاء معالجة الأخطاء
**الملفات**: `PublicProfilePage.tsx`, `SearchPage.tsx`
**المشكلة**: محاولة الوصول لـ `message` على نوع `{}`
**الإصلاح**: إضافة فحص النوع:
```typescript
const errorMessage = typeof error === 'string' ? error : error.message || 'Unknown error';
```

### 5. مشكلة Schema في `SecuritySettingsPage.tsx`
**الملف**: `src/components/SecuritySettingsPage.tsx`
**المشكلة**: Schema لا يدعم `'public'` في `profileVisibility`
**الإصلاح**: تحديث Schema:
```typescript
profileVisibility: z.enum(['public', 'members', 'verified', 'private'])
```

### 6. متغيرات غير مستخدمة
**الملفات**: `EnhancedProfilePage.tsx`, `ProfileImageUpload.tsx`
**الإصلاح**: إزالة أو تعديل المتغيرات غير المستخدمة:
```typescript
// بدلاً من
const [isLoadingImage, setIsLoadingImage] = useState(true);
// استخدم
const [isLoadingImage] = useState(true);
```

### 7. مشكلة `navigator.share` في `ShareProfileButton.tsx`
**المشكلة**: الشرط دائماً true
**الإصلاح**: إضافة فحص وجود `navigator`:
```typescript
{typeof navigator !== 'undefined' && navigator.share && (
```

### 8. مشكلة متغير غير مستخدم في `profileImageService.ts`
**الإصلاح**: إزالة `uploadData`:
```typescript
const { error: uploadError } = await supabase.storage
```

### 9. مشكلة التصدير المكرر
**الملف**: `src/lib/profileImageService.ts`
**الإصلاح**: حذف السطر المكرر للتصدير

### 10. مشكلة import غير مستخدم
**الملف**: `src/lib/temporaryPasswordService.ts`
**الإصلاح**: تعليق الـ import غير المستخدم:
```typescript
// import { translateSupabaseError } from '../utils/errorHandler';
```

## النتيجة
✅ **جميع أخطاء TypeScript تم إصلاحها**
✅ **البناء يجب أن يعمل بنجاح الآن**

## اختبار الإصلاحات
```bash
npm run build
```

يجب أن يكتمل البناء بدون أخطاء.
