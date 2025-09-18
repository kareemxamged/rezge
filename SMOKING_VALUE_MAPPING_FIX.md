# إصلاح مشكلة قيم التدخين في إنشاء الحساب

## المشكلة
حدث خطأ أثناء إنشاء حساب جديد في مرحلة تعيين كلمة المرور:
```
value too long for type character varying(10)
```

## السبب
كان هناك تضارب في قيم حقل `smoking` بين:

### نموذج التسجيل (RegisterPage.tsx):
- `'never'` (5 أحرف)
- `'occasionally'` (12 حرف) ← **مشكلة!**
- `'regularly'` (9 أحرف)

### قاعدة البيانات:
- حقل `smoking` محدود بـ `VARCHAR(10)`
- القيم المسموحة: `'yes'` أو `'no'`

## الحل المطبق

### 1. إضافة دالة تحويل القيم
```typescript
private static mapSmokingValue(smokingValue?: string): string | null {
  if (!smokingValue) return null;
  
  switch (smokingValue) {
    case 'never':
      return 'no';
    case 'occasionally':
    case 'regularly':
      return 'yes';
    default:
      return smokingValue; // في حالة كانت القيمة 'yes' أو 'no' بالفعل
  }
}
```

### 2. تطبيق التحويل في إنشاء الملف الشخصي
```typescript
smoking: this.mapSmokingValue(verification.user_data.smoking) || null,
```

## النتيجة
الآن يتم تحويل قيم التدخين بشكل صحيح:
- `'never'` → `'no'`
- `'occasionally'` → `'yes'`
- `'regularly'` → `'yes'`

هذا يضمن عدم تجاوز حد الـ 10 أحرف ويحافظ على توافق البيانات مع قاعدة البيانات.

## الملفات المحدثة
- `src/lib/emailVerification.ts`

## اختبار الإصلاح
يجب الآن أن يعمل إنشاء الحساب الجديد بنجاح دون أخطاء في قاعدة البيانات.
