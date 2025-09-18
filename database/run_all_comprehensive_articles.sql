-- تشغيل جميع ملفات المقالات الشاملة
-- Run All Comprehensive Articles SQL Files

-- بدء المعاملة
BEGIN;

-- إنشاء الجداول أولاً
\i create_articles_tables.sql

-- تشغيل المقالات المحسّنة الأساسية
\i insert_enhanced_islamic_guidance_articles.sql
\i insert_enhanced_marriage_tips_articles.sql
\i insert_enhanced_family_guidance_articles.sql
\i insert_enhanced_digital_safety_articles.sql

-- تشغيل المقالات الإضافية الشاملة
\i insert_additional_comprehensive_articles.sql

-- تحديث عدد المقالات في كل تصنيف
UPDATE article_categories 
SET article_count = (
    SELECT COUNT(*) 
    FROM articles 
    WHERE articles.category_id = article_categories.id 
    AND articles.status = 'published'
);

-- إنشاء فهرس للبحث السريع في المقالات
CREATE INDEX IF NOT EXISTS idx_articles_search 
ON articles USING gin(to_tsvector('arabic', title || ' ' || excerpt || ' ' || content));

-- إنشاء فهرس للتصنيفات
CREATE INDEX IF NOT EXISTS idx_articles_category 
ON articles(category_id);

-- إنشاء فهرس للحالة والتاريخ
CREATE INDEX IF NOT EXISTS idx_articles_status_date 
ON articles(status, published_at DESC);

-- إنشاء فهرس للمقالات المميزة
CREATE INDEX IF NOT EXISTS idx_articles_featured 
ON articles(featured, published_at DESC) 
WHERE featured = true AND status = 'published';

-- إنشاء دوال مساعدة للإحصائيات
CREATE OR REPLACE FUNCTION increment_article_views(article_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE articles 
    SET views = views + 1 
    WHERE id = article_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_article_likes(article_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE articles 
    SET likes = likes + 1 
    WHERE id = article_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_article_likes(article_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE articles 
    SET likes = GREATEST(likes - 1, 0) 
    WHERE id = article_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_article_comments(article_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE articles 
    SET comments_count = comments_count + 1 
    WHERE id = article_id;
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة للبحث في المقالات
CREATE OR REPLACE FUNCTION search_articles(
    search_query TEXT,
    category_filter UUID DEFAULT NULL,
    limit_count INTEGER DEFAULT 10,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    excerpt TEXT,
    author_name TEXT,
    category_name TEXT,
    published_at TIMESTAMP,
    read_time INTEGER,
    views INTEGER,
    likes INTEGER,
    comments_count INTEGER,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.excerpt,
        u.name as author_name,
        c.name as category_name,
        a.published_at,
        a.read_time,
        a.views,
        a.likes,
        a.comments_count,
        ts_rank(to_tsvector('arabic', a.title || ' ' || a.excerpt || ' ' || a.content), 
                plainto_tsquery('arabic', search_query)) as rank
    FROM articles a
    JOIN users u ON a.author_id = u.id
    JOIN article_categories c ON a.category_id = c.id
    WHERE a.status = 'published'
    AND (category_filter IS NULL OR a.category_id = category_filter)
    AND (search_query IS NULL OR 
         to_tsvector('arabic', a.title || ' ' || a.excerpt || ' ' || a.content) @@ 
         plainto_tsquery('arabic', search_query))
    ORDER BY rank DESC, a.published_at DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة للحصول على المقالات ذات الصلة
CREATE OR REPLACE FUNCTION get_related_articles(
    article_id UUID,
    limit_count INTEGER DEFAULT 3
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    excerpt TEXT,
    author_name TEXT,
    category_name TEXT,
    published_at TIMESTAMP,
    read_time INTEGER,
    views INTEGER,
    likes INTEGER
) AS $$
DECLARE
    article_category UUID;
    article_tags TEXT[];
BEGIN
    -- الحصول على تصنيف وعلامات المقال
    SELECT category_id, tags INTO article_category, article_tags
    FROM articles WHERE id = article_id;
    
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.excerpt,
        u.name as author_name,
        c.name as category_name,
        a.published_at,
        a.read_time,
        a.views,
        a.likes
    FROM articles a
    JOIN users u ON a.author_id = u.id
    JOIN article_categories c ON a.category_id = c.id
    WHERE a.status = 'published'
    AND a.id != article_id
    AND (
        a.category_id = article_category OR
        a.tags && article_tags
    )
    ORDER BY 
        CASE WHEN a.category_id = article_category THEN 1 ELSE 2 END,
        a.published_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة للحصول على إحصائيات المقالات
CREATE OR REPLACE FUNCTION get_articles_statistics()
RETURNS TABLE(
    total_articles BIGINT,
    total_views BIGINT,
    total_likes BIGINT,
    total_comments BIGINT,
    categories_count BIGINT,
    featured_articles BIGINT,
    avg_read_time NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_articles,
        SUM(a.views) as total_views,
        SUM(a.likes) as total_likes,
        SUM(a.comments_count) as total_comments,
        COUNT(DISTINCT a.category_id) as categories_count,
        COUNT(*) FILTER (WHERE a.featured = true) as featured_articles,
        AVG(a.read_time) as avg_read_time
    FROM articles a
    WHERE a.status = 'published';
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة للحصول على أشهر المقالات
CREATE OR REPLACE FUNCTION get_popular_articles(
    limit_count INTEGER DEFAULT 5,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    excerpt TEXT,
    author_name TEXT,
    category_name TEXT,
    views INTEGER,
    likes INTEGER,
    published_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.excerpt,
        u.name as author_name,
        c.name as category_name,
        a.views,
        a.likes,
        a.published_at
    FROM articles a
    JOIN users u ON a.author_id = u.id
    JOIN article_categories c ON a.category_id = c.id
    WHERE a.status = 'published'
    AND a.published_at >= CURRENT_DATE - INTERVAL '%s days' % days_back
    ORDER BY (a.views + a.likes * 2) DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة للحصول على أحدث المقالات
CREATE OR REPLACE FUNCTION get_latest_articles(
    limit_count INTEGER DEFAULT 5,
    category_filter UUID DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    excerpt TEXT,
    author_name TEXT,
    category_name TEXT,
    published_at TIMESTAMP,
    read_time INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.excerpt,
        u.name as author_name,
        c.name as category_name,
        a.published_at,
        a.read_time
    FROM articles a
    JOIN users u ON a.author_id = u.id
    JOIN article_categories c ON a.category_id = c.id
    WHERE a.status = 'published'
    AND (category_filter IS NULL OR a.category_id = category_filter)
    ORDER BY a.published_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- تحديث الإحصائيات النهائية
DO $$
DECLARE
    stats RECORD;
BEGIN
    SELECT * INTO stats FROM get_articles_statistics();
    
    RAISE NOTICE 'تم إدراج المقالات بنجاح!';
    RAISE NOTICE 'إجمالي المقالات: %', stats.total_articles;
    RAISE NOTICE 'إجمالي المشاهدات: %', stats.total_views;
    RAISE NOTICE 'إجمالي الإعجابات: %', stats.total_likes;
    RAISE NOTICE 'إجمالي التعليقات: %', stats.total_comments;
    RAISE NOTICE 'عدد التصنيفات: %', stats.categories_count;
    RAISE NOTICE 'المقالات المميزة: %', stats.featured_articles;
    RAISE NOTICE 'متوسط وقت القراءة: % دقيقة', ROUND(stats.avg_read_time, 1);
END $$;

-- إنهاء المعاملة
COMMIT;

-- رسالة النجاح
SELECT 'تم تشغيل جميع ملفات المقالات الشاملة بنجاح! 🎉' as message;
