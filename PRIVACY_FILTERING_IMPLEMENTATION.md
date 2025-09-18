# تطبيق فلترة الخصوصية في نظام المطابقات

## 🎯 الهدف

ضمان احترام إعدادات الخصوصية `profile_visibility` للمستخدمين في جميع أنحاء النظام، بحيث:
- المستخدمون الذين اختاروا "خاص" لا يظهرون في أي مطابقات
- المستخدمون الذين اختاروا "للأعضاء الموثقين فقط" يظهرون فقط للمستخدمين الموثقين
- وهكذا لباقي الإعدادات

## 🔒 مستويات الخصوصية

### القيم المتاحة في `profile_visibility`:
- `'public'`: للجميع (حتى الزوار غير المسجلين)
- `'members'`: للأعضاء المسجلين فقط
- `'verified'`: للأعضاء الموثقين فقط
- `'private'`: خاص (لا يظهر لأحد في المطابقات)

### منطق الفلترة:

#### للمستخدم الموثق (`verified = true`):
```sql
profile_visibility IN ('public', 'members', 'verified')
```

#### للمستخدم غير الموثق (`verified = false`):
```sql
profile_visibility IN ('public', 'members')
```

#### للزوار غير المسجلين:
```sql
profile_visibility = 'public'
```

## 🔧 الخدمات المحدثة

### 1. MatchingService.findMatches()
**الملف**: `src/lib/matchingService.ts`

```typescript
// فلترة حسب إعدادات الخصوصية
if (currentUser.verified) {
  // المستخدم الحالي موثق - يمكنه رؤية: public, members, verified
  query = query.in('profile_visibility', ['public', 'members', 'verified']);
} else {
  // المستخدم الحالي غير موثق - يمكنه رؤية: public, members فقط
  query = query.in('profile_visibility', ['public', 'members']);
}
```

### 2. userService.searchUsersForMatching()
**الملف**: `src/lib/supabase.ts`

```typescript
// جلب بيانات المستخدم الحالي لمعرفة حالة التحقق
const { data: currentUser } = await supabase
  .from('users')
  .select('verified')
  .eq('id', currentUserId)
  .single();

// تطبيق فلترة الخصوصية
if (currentUser.verified) {
  query = query.in('profile_visibility', ['public', 'members', 'verified']);
} else {
  query = query.in('profile_visibility', ['public', 'members']);
}
```

### 3. userService.getUsers()
**الملف**: `src/lib/supabase.ts`

```typescript
// إضافة معامل currentUserId للفلترة
async getUsers(filters: {
  // ... باقي المعاملات
  currentUserId?: string; // لفلترة الخصوصية
} = {})

// فلترة حسب إعدادات الخصوصية
if (filters.currentUserId) {
  const { data: currentUser } = await supabase
    .from('users')
    .select('verified')
    .eq('id', filters.currentUserId)
    .single();

  if (currentUser?.verified) {
    query = query.in('profile_visibility', ['public', 'members', 'verified']);
  } else {
    query = query.in('profile_visibility', ['public', 'members']);
  }
} else {
  // إذا لم يتم تمرير معرف المستخدم، اعرض public فقط
  query = query.eq('profile_visibility', 'public');
}
```

### 4. dashboardService.getSuggestedMatches()
**الملف**: `src/lib/dashboardService.ts`

```typescript
// فلترة حسب إعدادات الخصوصية
if (currentUser.verified) {
  query = query.in('profile_visibility', ['public', 'members', 'verified']);
} else {
  query = query.in('profile_visibility', ['public', 'members']);
}
```

## 🧪 كيفية الاختبار

### 1. إنشاء حسابات اختبار:
```sql
-- حساب خاص
UPDATE users SET profile_visibility = 'private' WHERE id = 'test-user-1';

-- حساب للموثقين فقط
UPDATE users SET profile_visibility = 'verified' WHERE id = 'test-user-2';

-- حساب للأعضاء فقط
UPDATE users SET profile_visibility = 'members' WHERE id = 'test-user-3';

-- حساب عام
UPDATE users SET profile_visibility = 'public' WHERE id = 'test-user-4';
```

### 2. اختبار السيناريوهات:

#### مستخدم موثق يبحث:
- ✅ يجب أن يرى: public, members, verified
- ❌ يجب ألا يرى: private

#### مستخدم غير موثق يبحث:
- ✅ يجب أن يرى: public, members
- ❌ يجب ألا يرى: verified, private

### 3. فحص السجلات:
```
🔒 فلتر الخصوصية: public, members, verified (مستخدم موثق)
🔒 فلتر الخصوصية: public, members (مستخدم غير موثق)
```

## 🔍 نقاط التحقق

### ✅ ما تم تطبيقه:
- [x] فلترة في MatchingService.findMatches()
- [x] فلترة في userService.searchUsersForMatching()
- [x] فلترة في userService.getUsers()
- [x] فلترة في dashboardService.getSuggestedMatches()
- [x] تسجيل مفصل للتشخيص
- [x] معالجة حالات الخطأ

### 🎯 النتيجة المتوقعة:
- المستخدمون الذين اختاروا "خاص" لن يظهروا في أي مطابقات
- المستخدمون الذين اختاروا "للموثقين فقط" سيظهرون فقط للمستخدمين الموثقين
- النظام يحترم جميع إعدادات الخصوصية بدقة

## 🚀 التأثير

### الأمان:
- ✅ حماية كاملة لخصوصية المستخدمين
- ✅ احترام اختيارات المستخدمين
- ✅ منع الوصول غير المصرح به

### الأداء:
- ✅ فلترة على مستوى قاعدة البيانات (سريعة)
- ✅ تقليل البيانات المنقولة
- ✅ استعلامات محسنة

### تجربة المستخدم:
- ✅ شفافية في النتائج المعروضة
- ✅ احترام التفضيلات الشخصية
- ✅ ثقة أكبر في النظام
