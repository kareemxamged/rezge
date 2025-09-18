-- تشغيل النظام الكامل للمقالات متعددة اللغات
-- Run Complete Multilingual Articles System

-- بدء المعاملة الرئيسية
BEGIN;

-- ===================================
-- 1. إنشاء الجداول الأساسية
-- ===================================
\echo 'إنشاء جداول نظام المقالات...'
\i create_articles_tables.sql

-- ===================================
-- 2. تحديث النظام لدعم اللغات المتعددة
-- ===================================
\echo 'تحديث النظام لدعم اللغات المتعددة...'
\i update_articles_multilingual.sql

-- ===================================
-- 3. إدراج المقالات العربية الأساسية
-- ===================================
\echo 'إدراج المقالات العربية الأساسية...'
\i insert_islamic_guidance_articles.sql
\i insert_marriage_tips_articles.sql
\i insert_family_guidance_articles.sql
\i insert_digital_safety_articles.sql

-- ===================================
-- 4. إدراج المقالات العربية الإضافية
-- ===================================
\echo 'إدراج المقالات العربية الإضافية...'
\i insert_additional_comprehensive_articles.sql

-- ===================================
-- 5. إكمال المقالات العربية الناقصة
-- ===================================
\echo 'إكمال المقالات العربية الناقصة...'
\i complete_arabic_articles.sql

-- ===================================
-- 6. إدراج التصنيفات والمقالات الإنجليزية
-- ===================================
\echo 'إدراج التصنيفات الإنجليزية...'
\i insert_english_categories.sql

\echo 'إدراج المقالات الإنجليزية...'
\i insert_english_articles.sql
\i insert_more_english_articles.sql
\i insert_success_stories_english.sql

-- ===================================
-- 7. تحديث الإحصائيات والفهارس
-- ===================================
\echo 'تحديث إحصائيات التصنيفات...'

-- تحديث عدد المقالات في التصنيفات العربية
UPDATE article_categories 
SET article_count = (
    SELECT COUNT(*) 
    FROM articles 
    WHERE articles.category_id = article_categories.id 
    AND articles.status = 'published'
    AND articles.language = 'ar'
)
WHERE language = 'ar';

-- تحديث عدد المقالات في التصنيفات الإنجليزية
UPDATE article_categories 
SET article_count = (
    SELECT COUNT(*) 
    FROM articles 
    WHERE articles.category_id = article_categories.id 
    AND articles.status = 'published'
    AND articles.language = 'en'
)
WHERE language = 'en';

-- إنشاء فهارس إضافية للأداء
CREATE INDEX IF NOT EXISTS idx_articles_category_language_status ON articles(category_id, language, status);
CREATE INDEX IF NOT EXISTS idx_articles_featured_language_published ON articles(featured, language, published_at);
CREATE INDEX IF NOT EXISTS idx_articles_views_language ON articles(views, language);
CREATE INDEX IF NOT EXISTS idx_articles_likes_language ON articles(likes, language);

-- ===================================
-- 8. إنشاء دوال مساعدة إضافية
-- ===================================
\echo 'إنشاء دوال مساعدة إضافية...'

-- دالة للحصول على أحدث المقالات حسب اللغة
CREATE OR REPLACE FUNCTION get_latest_articles_by_language(
    p_language VARCHAR(5) DEFAULT 'ar',
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
    id UUID,
    title VARCHAR(500),
    excerpt TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    read_time INTEGER,
    views INTEGER,
    likes INTEGER,
    category_name VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id, a.title, a.excerpt, a.published_at, a.read_time, 
        a.views, a.likes, c.name as category_name
    FROM articles a
    JOIN article_categories c ON a.category_id = c.id
    WHERE a.status = 'published'
    AND a.language = p_language
    ORDER BY a.published_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- دالة للحصول على أكثر المقالات مشاهدة حسب اللغة
CREATE OR REPLACE FUNCTION get_popular_articles_by_language(
    p_language VARCHAR(5) DEFAULT 'ar',
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
    id UUID,
    title VARCHAR(500),
    excerpt TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    read_time INTEGER,
    views INTEGER,
    likes INTEGER,
    category_name VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id, a.title, a.excerpt, a.published_at, a.read_time, 
        a.views, a.likes, c.name as category_name
    FROM articles a
    JOIN article_categories c ON a.category_id = c.id
    WHERE a.status = 'published'
    AND a.language = p_language
    ORDER BY a.views DESC, a.likes DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- دالة للحصول على المقالات المتداولة حسب اللغة
CREATE OR REPLACE FUNCTION get_trending_articles_by_language(
    p_language VARCHAR(5) DEFAULT 'ar',
    p_days INTEGER DEFAULT 7,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
    id UUID,
    title VARCHAR(500),
    excerpt TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    read_time INTEGER,
    views INTEGER,
    likes INTEGER,
    category_name VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id, a.title, a.excerpt, a.published_at, a.read_time, 
        a.views, a.likes, c.name as category_name
    FROM articles a
    JOIN article_categories c ON a.category_id = c.id
    WHERE a.status = 'published'
    AND a.language = p_language
    AND a.published_at >= NOW() - INTERVAL '1 day' * p_days
    ORDER BY (a.views + a.likes * 2) DESC, a.published_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 9. إنشاء مشاهدات (Views) للاستعلامات السريعة
-- ===================================
\echo 'إنشاء مشاهدات للاستعلامات السريعة...'

-- مشاهدة للمقالات العربية مع تفاصيل كاملة
CREATE OR REPLACE VIEW articles_arabic_full AS
SELECT 
    a.*,
    c.name as category_name,
    c.color as category_color,
    c.icon as category_icon,
    u.first_name || ' ' || u.last_name as author_name,
    u.profile_image_url as author_avatar
FROM articles a
JOIN article_categories c ON a.category_id = c.id
JOIN users u ON a.author_id = u.id
WHERE a.language = 'ar' AND a.status = 'published';

-- مشاهدة للمقالات الإنجليزية مع تفاصيل كاملة
CREATE OR REPLACE VIEW articles_english_full AS
SELECT 
    a.*,
    c.name as category_name,
    c.color as category_color,
    c.icon as category_icon,
    u.first_name || ' ' || u.last_name as author_name,
    u.profile_image_url as author_avatar
FROM articles a
JOIN article_categories c ON a.category_id = c.id
JOIN users u ON a.author_id = u.id
WHERE a.language = 'en' AND a.status = 'published';

-- ===================================
-- 10. تحديث البيانات الوصفية
-- ===================================
\echo 'تحديث البيانات الوصفية...'

-- تحديث أوقات القراءة بناءً على طول المحتوى
UPDATE articles 
SET read_time = GREATEST(
    CEIL(LENGTH(content) / 1000.0), -- تقدير دقيقة لكل 1000 حرف
    3 -- حد أدنى 3 دقائق
)
WHERE read_time IS NULL OR read_time < 3;

-- تحديث تواريخ التحديث
UPDATE articles 
SET updated_at = NOW() 
WHERE updated_at IS NULL;

-- ===================================
-- 11. إنشاء تقرير النظام
-- ===================================
\echo 'إنشاء تقرير النظام...'

-- دالة لإنشاء تقرير شامل
CREATE OR REPLACE FUNCTION generate_articles_system_report()
RETURNS TABLE(
    metric VARCHAR(50),
    arabic_count BIGINT,
    english_count BIGINT,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Total Articles'::VARCHAR(50),
        (SELECT COUNT(*) FROM articles WHERE language = 'ar'),
        (SELECT COUNT(*) FROM articles WHERE language = 'en'),
        (SELECT COUNT(*) FROM articles);
    
    RETURN QUERY
    SELECT 
        'Published Articles'::VARCHAR(50),
        (SELECT COUNT(*) FROM articles WHERE language = 'ar' AND status = 'published'),
        (SELECT COUNT(*) FROM articles WHERE language = 'en' AND status = 'published'),
        (SELECT COUNT(*) FROM articles WHERE status = 'published');
    
    RETURN QUERY
    SELECT 
        'Featured Articles'::VARCHAR(50),
        (SELECT COUNT(*) FROM articles WHERE language = 'ar' AND featured = true),
        (SELECT COUNT(*) FROM articles WHERE language = 'en' AND featured = true),
        (SELECT COUNT(*) FROM articles WHERE featured = true);
    
    RETURN QUERY
    SELECT 
        'Categories'::VARCHAR(50),
        (SELECT COUNT(*) FROM article_categories WHERE language = 'ar'),
        (SELECT COUNT(*) FROM article_categories WHERE language = 'en'),
        (SELECT COUNT(*) FROM article_categories);
    
    RETURN QUERY
    SELECT 
        'Total Views'::VARCHAR(50),
        (SELECT COALESCE(SUM(views), 0) FROM articles WHERE language = 'ar'),
        (SELECT COALESCE(SUM(views), 0) FROM articles WHERE language = 'en'),
        (SELECT COALESCE(SUM(views), 0) FROM articles);
    
    RETURN QUERY
    SELECT 
        'Total Likes'::VARCHAR(50),
        (SELECT COALESCE(SUM(likes), 0) FROM articles WHERE language = 'ar'),
        (SELECT COALESCE(SUM(likes), 0) FROM articles WHERE language = 'en'),
        (SELECT COALESCE(SUM(likes), 0) FROM articles);
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ===================================
-- 12. عرض التقرير النهائي
-- ===================================
\echo '========================================='
\echo 'تقرير نظام المقالات متعدد اللغات'
\echo '========================================='

SELECT * FROM generate_articles_system_report();

\echo ''
\echo 'التصنيفات العربية:'
SELECT name, article_count FROM article_categories WHERE language = 'ar' ORDER BY name;

\echo ''
\echo 'التصنيفات الإنجليزية:'
SELECT name, article_count FROM article_categories WHERE language = 'en' ORDER BY name;

\echo ''
\echo '========================================='
\echo 'تم إكمال إعداد نظام المقالات بنجاح!'
\echo '========================================='
