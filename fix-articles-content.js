/**
 * سكريبت إصلاح محتوى المقالات في قاعدة البيانات
 * يقوم بتحويل \n النصية إلى أسطر جديدة فعلية وتحسين التنسيق
 */

import { createClient } from '@supabase/supabase-js';

// إعدادات Supabase
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * دالة إصلاح المحتوى
 * @param {string} content - المحتوى الأصلي
 * @returns {string} - المحتوى المُصلح
 */
function fixArticleContent(content) {
  if (!content || typeof content !== 'string') {
    return content;
  }

  let fixedContent = content;

  // تحويل \n النصية إلى أسطر جديدة فعلية
  fixedContent = fixedContent.replace(/\\n/g, '\n');

  // تقليل الأسطر الفارغة المتعددة
  fixedContent = fixedContent.replace(/\n{3,}/g, '\n\n');

  // إزالة المسافات الزائدة من البداية والنهاية
  fixedContent = fixedContent.trim();

  // تحسين تنسيق العناوين
  fixedContent = fixedContent
    .replace(/^#{1}\s+/gm, '# ')
    .replace(/^#{2}\s+/gm, '## ')
    .replace(/^#{3}\s+/gm, '### ')
    .replace(/^#{4}\s+/gm, '#### ');

  // تحسين تنسيق القوائم
  fixedContent = fixedContent
    .replace(/^-\s+/gm, '- ')
    .replace(/^\*\s+/gm, '- ')
    .replace(/^\d+\.\s+/gm, (match) => match.replace(/\s+/g, ' '));

  // تحسين تنسيق النصوص العريضة
  fixedContent = fixedContent
    .replace(/\*\*\s+/g, '**')
    .replace(/\s+\*\*/g, '**');

  // تحسين تنسيق الاقتباسات
  fixedContent = fixedContent
    .replace(/^>\s+/gm, '> ');

  return fixedContent;
}

/**
 * دالة جلب وإصلاح جميع المقالات
 */
async function fixAllArticles() {
  try {
    console.log('🔄 بدء عملية إصلاح المقالات...');

    // جلب جميع المقالات
    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, title, content');

    if (error) {
      console.error('❌ خطأ في جلب المقالات:', error);
      return;
    }

    if (!articles || articles.length === 0) {
      console.log('📝 لا توجد مقالات للإصلاح');
      return;
    }

    console.log(`📊 تم العثور على ${articles.length} مقالة`);

    let fixedCount = 0;
    let errorCount = 0;

    // إصلاح كل مقال
    for (const article of articles) {
      try {
        const originalContent = article.content;
        const fixedContent = fixArticleContent(originalContent);

        // التحقق من وجود تغيير
        if (originalContent !== fixedContent) {
          // تحديث المقال في قاعدة البيانات
          const { error: updateError } = await supabase
            .from('articles')
            .update({ content: fixedContent })
            .eq('id', article.id);

          if (updateError) {
            console.error(`❌ خطأ في تحديث المقال "${article.title}":`, updateError);
            errorCount++;
          } else {
            console.log(`✅ تم إصلاح المقال: "${article.title}"`);
            fixedCount++;
          }
        } else {
          console.log(`⏭️ المقال "${article.title}" لا يحتاج إصلاح`);
        }

        // انتظار قصير لتجنب الضغط على قاعدة البيانات
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (articleError) {
        console.error(`❌ خطأ في معالجة المقال "${article.title}":`, articleError);
        errorCount++;
      }
    }

    console.log('\n📊 تقرير الإصلاح:');
    console.log(`✅ تم إصلاح: ${fixedCount} مقالة`);
    console.log(`❌ أخطاء: ${errorCount} مقالة`);
    console.log(`📝 إجمالي: ${articles.length} مقالة`);

  } catch (error) {
    console.error('❌ خطأ عام في عملية الإصلاح:', error);
  }
}

/**
 * دالة إصلاح مقال واحد بالـ ID
 * @param {string} articleId - معرف المقال
 */
async function fixSingleArticle(articleId) {
  try {
    console.log(`🔄 إصلاح المقال بالمعرف: ${articleId}`);

    const { data: article, error } = await supabase
      .from('articles')
      .select('id, title, content')
      .eq('id', articleId)
      .single();

    if (error) {
      console.error('❌ خطأ في جلب المقال:', error);
      return;
    }

    if (!article) {
      console.log('❌ لم يتم العثور على المقال');
      return;
    }

    const originalContent = article.content;
    const fixedContent = fixArticleContent(originalContent);

    if (originalContent !== fixedContent) {
      const { error: updateError } = await supabase
        .from('articles')
        .update({ content: fixedContent })
        .eq('id', articleId);

      if (updateError) {
        console.error('❌ خطأ في تحديث المقال:', updateError);
      } else {
        console.log(`✅ تم إصلاح المقال: "${article.title}"`);
        console.log('\n📝 المحتوى قبل الإصلاح:');
        console.log(originalContent.substring(0, 200) + '...');
        console.log('\n📝 المحتوى بعد الإصلاح:');
        console.log(fixedContent.substring(0, 200) + '...');
      }
    } else {
      console.log(`⏭️ المقال "${article.title}" لا يحتاج إصلاح`);
    }

  } catch (error) {
    console.error('❌ خطأ في إصلاح المقال:', error);
  }
}

// تشغيل السكريبت
if (process.argv.length > 2) {
  // إصلاح مقال واحد
  const articleId = process.argv[2];
  fixSingleArticle(articleId);
} else {
  // إصلاح جميع المقالات
  fixAllArticles();
}

export { fixArticleContent, fixAllArticles, fixSingleArticle };
