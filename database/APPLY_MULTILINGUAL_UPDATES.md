# تطبيق تحديثات نظام المقالات متعدد اللغات
# Apply Multilingual Articles System Updates

## 🚨 ملاحظة مهمة / Important Note

تم إصلاح الأخطاء مؤقتاً في الكود لتجنب استخدام الأعمدة والدوال غير الموجودة. لتفعيل النظام الكامل متعدد اللغات، يجب تطبيق التحديثات التالية على قاعدة البيانات.

The errors have been temporarily fixed in the code to avoid using non-existent columns and functions. To activate the complete multilingual system, the following database updates must be applied.

## 📋 خطوات التطبيق / Application Steps

### 1. تطبيق تحديثات قاعدة البيانات / Apply Database Updates

```sql
-- تشغيل النظام الكامل
\i database/run_complete_articles_system.sql

-- أو تطبيق التحديثات فقط
\i database/update_articles_multilingual.sql
\i database/insert_english_categories.sql
\i database/insert_english_articles.sql
\i database/insert_more_english_articles.sql
\i database/insert_success_stories_english.sql
\i database/complete_arabic_articles.sql
```

### 2. إعادة تفعيل الكود متعدد اللغات / Re-enable Multilingual Code

بعد تطبيق تحديثات قاعدة البيانات، قم بالتغييرات التالية:

After applying database updates, make the following changes:

#### في `src/services/articleService.ts`:

```typescript
// استبدال هذا
async getCategories(language: 'ar' | 'en' = 'ar'): Promise<ArticleCategory[]> {
  try {
    return this.getCategoriesOldMethod();
  } catch (error) {
    console.error('Error in getCategories:', error);
    return [];
  }
}

// بهذا
async getCategories(language: 'ar' | 'en' = 'ar'): Promise<ArticleCategory[]> {
  try {
    const { data, error } = await supabase.rpc('get_categories_by_language', { p_language: language });
    if (error) {
      console.error('Error fetching categories with counts:', error);
      return this.getCategoriesOldMethod(language);
    }
    return data || [];
  } catch (error) {
    console.error('Error in getCategories:', error);
    return this.getCategoriesOldMethod(language);
  }
}
```

```typescript
// في getCategoriesOldMethod، استبدال
private async getCategoriesOldMethod(): Promise<ArticleCategory[]> {
  const { data: categories, error: categoriesError } = await supabase
    .from('article_categories')
    .select('*')
    .order('name');

// بهذا
private async getCategoriesOldMethod(language: 'ar' | 'en' = 'ar'): Promise<ArticleCategory[]> {
  const { data: categories, error: categoriesError } = await supabase
    .from('article_categories')
    .select('*')
    .eq('language', language)
    .order('name');
```

```typescript
// في getArticles، إعادة إضافة
.eq('language', language)

// في transformedData، إزالة
language: 'ar' as const, // Default to Arabic for now
```

#### في `src/components/ArticlesPage.tsx`:

```typescript
// إعادة إضافة
const result = await articleService.getCategories(currentLanguage);
const result = await articleService.getArticles({
  // ... other options
  language: currentLanguage
});

// إعادة إضافة dependencies
useEffect(() => {
  loadCategories();
}, [currentLanguage]);

useEffect(() => {
  loadArticles();
}, [currentPage, selectedCategory, searchQuery, sortBy, currentLanguage]);
```

## 🔧 الحالة الحالية / Current State

### ✅ ما يعمل الآن / What Works Now:
- صفحة المقالات تعمل بدون أخطاء
- صفحة المقال الفردي تعمل بدون أخطاء
- عرض المقالات والتصنيفات العربية
- جميع الوظائف الأساسية تعمل
- البحث والفلترة والترتيب

### ⏳ ما يحتاج تطبيق / What Needs Application:
- دعم اللغة الإنجليزية
- التبديل بين اللغات
- المقالات الإنجليزية الجديدة
- الدوال المحسنة لقاعدة البيانات
- جداول الإعجابات والتعليقات (article_likes, article_comments, comment_likes)

## 🛠️ الإصلاحات المؤقتة المطبقة / Temporary Fixes Applied

### في `src/services/articleService.ts`:
- ✅ `checkUserLikedArticle()` - يعيد false مؤقتاً
- ✅ `toggleLike()` - يزيد العدد فقط (مبسط)
- ✅ `getComments()` - يعيد مصفوفة فارغة
- ✅ `addComment()` - يعيد null مؤقتاً
- ✅ `checkUserLikedComment()` - يعيد false مؤقتاً
- ✅ `toggleCommentLike()` - يعيد قيم افتراضية
- ✅ `getCommentReplies()` - يعيد مصفوفة فارغة
- ✅ `deleteComment()` - يعيد false مؤقتاً

## 📊 الملفات المتأثرة / Affected Files

### ملفات قاعدة البيانات / Database Files:
- `database/update_articles_multilingual.sql`
- `database/insert_english_categories.sql`
- `database/insert_english_articles.sql`
- `database/insert_more_english_articles.sql`
- `database/insert_success_stories_english.sql`
- `database/complete_arabic_articles.sql`
- `database/run_complete_articles_system.sql`

### ملفات الكود / Code Files:
- `src/services/articleService.ts` (تم إصلاحه مؤقتاً)
- `src/components/ArticlesPage.tsx` (تم إصلاحه مؤقتاً)

### ملفات الجداول المفقودة / Missing Tables Files:
- `database/create_missing_tables.sql` (إنشاء جداول الإعجابات والتعليقات)

## 🎯 النتيجة المتوقعة / Expected Result

بعد تطبيق جميع التحديثات:
- نظام مقالات متكامل يدعم العربية والإنجليزية
- تبديل سلس بين اللغات
- محتوى غني في كلا اللغتين
- أداء محسن مع الفهارس الجديدة
- نظام إعجابات وتعليقات كامل
- تفاعل المستخدمين مع المقالات

After applying all updates:
- Complete articles system supporting Arabic and English
- Smooth language switching
- Rich content in both languages
- Improved performance with new indexes
- Complete likes and comments system
- User interaction with articles

## 🚀 خطوات التطبيق السريع / Quick Application Steps

```sql
-- 1. إنشاء الجداول المفقودة
\i database/create_missing_tables.sql

-- 2. تطبيق النظام متعدد اللغات
\i database/run_complete_articles_system.sql
```
