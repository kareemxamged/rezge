-- إعداد نظام المقالات متعدد اللغات
-- Setup Multilingual Articles System

-- بدء المعاملة
BEGIN;

-- تشغيل تحديث النظام لدعم اللغات المتعددة
\i update_articles_multilingual.sql

-- إدراج التصنيفات الإنجليزية
\i insert_english_categories.sql

-- إدراج المقالات الإنجليزية
\i insert_english_articles.sql
\i insert_more_english_articles.sql
\i insert_success_stories_english.sql

-- تحديث عدد المقالات في كل تصنيف للغة العربية
UPDATE article_categories 
SET article_count = (
    SELECT COUNT(*) 
    FROM articles 
    WHERE articles.category_id = article_categories.id 
    AND articles.status = 'published'
    AND articles.language = 'ar'
)
WHERE language = 'ar';

-- تحديث عدد المقالات في كل تصنيف للغة الإنجليزية
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
CREATE INDEX IF NOT EXISTS idx_articles_category_language ON articles(category_id, language);
CREATE INDEX IF NOT EXISTS idx_articles_status_language ON articles(status, language);
CREATE INDEX IF NOT EXISTS idx_articles_featured_language ON articles(featured, language);
CREATE INDEX IF NOT EXISTS idx_articles_published_language ON articles(published_at, language);

-- إنشاء دالة البحث المحسنة
CREATE OR REPLACE FUNCTION search_articles_by_language(
    search_query TEXT,
    p_language VARCHAR(5) DEFAULT 'ar',
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    id UUID,
    title VARCHAR(500),
    excerpt TEXT,
    content TEXT,
    author_id UUID,
    category_id UUID,
    tags TEXT[],
    published_at TIMESTAMP WITH TIME ZONE,
    read_time INTEGER,
    views INTEGER,
    likes INTEGER,
    comments_count INTEGER,
    featured BOOLEAN,
    image_url TEXT,
    language VARCHAR(5),
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id, a.title, a.excerpt, a.content, a.author_id, a.category_id,
        a.tags, a.published_at, a.read_time, a.views, a.likes, 
        a.comments_count, a.featured, a.image_url, a.language,
        ts_rank(
            to_tsvector(CASE WHEN p_language = 'ar' THEN 'arabic' ELSE 'english' END, 
                       a.title || ' ' || a.excerpt || ' ' || a.content), 
            plainto_tsquery(CASE WHEN p_language = 'ar' THEN 'arabic' ELSE 'english' END, 
                           search_query)
        ) as rank
    FROM articles a
    WHERE a.status = 'published'
    AND a.language = p_language
    AND (
        a.title ILIKE '%' || search_query || '%' OR
        a.excerpt ILIKE '%' || search_query || '%' OR
        a.content ILIKE '%' || search_query || '%' OR
        search_query = ANY(a.tags)
    )
    ORDER BY rank DESC, a.published_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة للحصول على المقالات المميزة حسب اللغة
CREATE OR REPLACE FUNCTION get_featured_articles_by_language(
    p_language VARCHAR(5) DEFAULT 'ar',
    p_limit INTEGER DEFAULT 3
)
RETURNS TABLE(
    id UUID,
    title VARCHAR(500),
    excerpt TEXT,
    content TEXT,
    author_id UUID,
    category_id UUID,
    tags TEXT[],
    published_at TIMESTAMP WITH TIME ZONE,
    read_time INTEGER,
    views INTEGER,
    likes INTEGER,
    comments_count INTEGER,
    featured BOOLEAN,
    image_url TEXT,
    language VARCHAR(5)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id, a.title, a.excerpt, a.content, a.author_id, a.category_id,
        a.tags, a.published_at, a.read_time, a.views, a.likes, 
        a.comments_count, a.featured, a.image_url, a.language
    FROM articles a
    WHERE a.status = 'published'
    AND a.language = p_language
    AND a.featured = true
    ORDER BY a.published_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة للحصول على المقالات ذات الصلة حسب اللغة
CREATE OR REPLACE FUNCTION get_related_articles_by_language(
    article_id UUID,
    category_id UUID,
    p_language VARCHAR(5) DEFAULT 'ar',
    p_limit INTEGER DEFAULT 3
)
RETURNS TABLE(
    id UUID,
    title VARCHAR(500),
    excerpt TEXT,
    content TEXT,
    author_id UUID,
    category_id UUID,
    tags TEXT[],
    published_at TIMESTAMP WITH TIME ZONE,
    read_time INTEGER,
    views INTEGER,
    likes INTEGER,
    comments_count INTEGER,
    featured BOOLEAN,
    image_url TEXT,
    language VARCHAR(5)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id, a.title, a.excerpt, a.content, a.author_id, a.category_id,
        a.tags, a.published_at, a.read_time, a.views, a.likes, 
        a.comments_count, a.featured, a.image_url, a.language
    FROM articles a
    WHERE a.status = 'published'
    AND a.language = p_language
    AND a.category_id = get_related_articles_by_language.category_id
    AND a.id != article_id
    ORDER BY a.published_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة لإحصائيات المقالات حسب اللغة
CREATE OR REPLACE FUNCTION get_articles_stats_by_language(p_language VARCHAR(5) DEFAULT 'ar')
RETURNS TABLE(
    total_articles BIGINT,
    published_articles BIGINT,
    featured_articles BIGINT,
    total_views BIGINT,
    total_likes BIGINT,
    total_comments BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_articles,
        COUNT(*) FILTER (WHERE status = 'published') as published_articles,
        COUNT(*) FILTER (WHERE featured = true AND status = 'published') as featured_articles,
        COALESCE(SUM(views), 0) as total_views,
        COALESCE(SUM(likes), 0) as total_likes,
        COALESCE(SUM(comments_count), 0) as total_comments
    FROM articles
    WHERE language = p_language;
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة لتحديث عدد المقالات في التصنيفات
CREATE OR REPLACE FUNCTION update_category_article_counts()
RETURNS VOID AS $$
BEGIN
    -- تحديث العربية
    UPDATE article_categories 
    SET article_count = (
        SELECT COUNT(*) 
        FROM articles 
        WHERE articles.category_id = article_categories.id 
        AND articles.status = 'published'
        AND articles.language = article_categories.language
    )
    WHERE language = 'ar';
    
    -- تحديث الإنجليزية
    UPDATE article_categories 
    SET article_count = (
        SELECT COUNT(*) 
        FROM articles 
        WHERE articles.category_id = article_categories.id 
        AND articles.status = 'published'
        AND articles.language = article_categories.language
    )
    WHERE language = 'en';
END;
$$ LANGUAGE plpgsql;

-- تشغيل تحديث عدد المقالات
SELECT update_category_article_counts();

COMMIT;

-- عرض إحصائيات النظام الجديد
SELECT 'Arabic Articles Stats:' as info;
SELECT * FROM get_articles_stats_by_language('ar');

SELECT 'English Articles Stats:' as info;
SELECT * FROM get_articles_stats_by_language('en');

SELECT 'Arabic Categories:' as info;
SELECT name, article_count FROM article_categories WHERE language = 'ar' ORDER BY name;

SELECT 'English Categories:' as info;
SELECT name, article_count FROM article_categories WHERE language = 'en' ORDER BY name;
