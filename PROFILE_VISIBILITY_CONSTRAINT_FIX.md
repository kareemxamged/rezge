# إصلاح قيد profile_visibility في قاعدة البيانات

## المشكلة
عند محاولة تغيير إعداد "من يمكنه رؤية ملفي الشخصي" إلى "خاص" في صفحة الأمان والخصوصية:

```
new row for relation "users" violates check constraint "users_profile_visibility_check"
```

## السبب الجذري
قيد التحقق (check constraint) في قاعدة البيانات كان يسمح فقط بالقيم:
- `'public'`
- `'members'`
- `'verified'`

لكن لا يتضمن القيمة `'private'` المطلوبة.

## فحص القيد الأصلي
```sql
CHECK (((profile_visibility)::text = ANY ((ARRAY[
  'public'::character varying, 
  'members'::character varying, 
  'verified'::character varying
])::text[])))
```

## الإصلاح المطبق

### 1. حذف القيد القديم
```sql
ALTER TABLE public.users DROP CONSTRAINT users_profile_visibility_check;
```

### 2. إضافة القيد الجديد مع القيمة المفقودة
```sql
ALTER TABLE public.users ADD CONSTRAINT users_profile_visibility_check 
CHECK (profile_visibility IN ('public', 'members', 'verified', 'private'));
```

## القيد الجديد
```sql
CHECK (((profile_visibility)::text = ANY ((ARRAY[
  'public'::character varying, 
  'members'::character varying, 
  'verified'::character varying, 
  'private'::character varying    -- ← تم إضافتها
])::text[])))
```

## التحقق من الواجهة
✅ **الكود في SecuritySettingsPage.tsx صحيح**:
- Schema validation يتضمن `'private'`
- Select options تتضمن `'private'`
- Form handling يدعم `'private'`

```typescript
profileVisibility: z.enum(['members', 'verified', 'private'])

<option value="private">
  {t('securitySettings.privacySettings.profileVisibility.private')}
</option>
```

## النتيجة المتوقعة

### الآن يمكن للمستخدمين:
- ✅ تغيير إعداد الخصوصية إلى "خاص"
- ✅ تغيير إعداد الخصوصية إلى "للأعضاء فقط"
- ✅ تغيير إعداد الخصوصية إلى "للموثقين فقط"

### القيم المدعومة:
- **`'members'`**: للأعضاء المسجلين فقط
- **`'verified'`**: للأعضاء الموثقين فقط
- **`'private'`**: خاص (لا يمكن لأحد رؤيته)

## اختبار الإصلاح

1. اذهب لصفحة الأمان والخصوصية
2. في قسم "من يمكنه رؤية ملفي الشخصي"
3. اختر "خاص"
4. احفظ التغييرات
5. يجب أن يتم الحفظ بنجاح دون أخطاء

## الملفات المحدثة
- قاعدة البيانات: جدول `users` (تحديث قيد `users_profile_visibility_check`)

## ملاحظة مهمة
هذا الإصلاح يؤثر على قاعدة البيانات فقط. منطق التطبيق كان يدعم القيمة `'private'` بالفعل، لكن قاعدة البيانات كانت ترفضها.
