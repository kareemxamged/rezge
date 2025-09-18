-- تحديث نظام المقالات لدعم اللغات المتعددة
-- Update Articles System for Multilingual Support

BEGIN;

-- إضافة عمود اللغة إلى جدول المقالات
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'ar' CHECK (language IN ('ar', 'en'));

-- إضافة عمود اللغة إلى جدول التصنيفات
ALTER TABLE article_categories 
ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'ar' CHECK (language IN ('ar', 'en'));

-- إضافة فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_articles_language ON articles(language);
CREATE INDEX IF NOT EXISTS idx_article_categories_language ON article_categories(language);
CREATE INDEX IF NOT EXISTS idx_articles_language_status ON articles(language, status);

-- إنشاء جدول ترجمات المقالات (للمقالات المترجمة)
CREATE TABLE IF NOT EXISTS article_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    translated_article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    original_language VARCHAR(5) NOT NULL,
    translated_language VARCHAR(5) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(original_article_id, translated_language),
    CHECK (original_language != translated_language)
);

-- إنشاء فهارس لجدول الترجمات
CREATE INDEX IF NOT EXISTS idx_article_translations_original ON article_translations(original_article_id);
CREATE INDEX IF NOT EXISTS idx_article_translations_translated ON article_translations(translated_article_id);

-- تحديث المقالات الموجودة لتكون باللغة العربية
UPDATE articles SET language = 'ar' WHERE language IS NULL;
UPDATE article_categories SET language = 'ar' WHERE language IS NULL;

-- إنشاء دالة للحصول على المقالات حسب اللغة
CREATE OR REPLACE FUNCTION get_articles_by_language(
    p_language VARCHAR(5) DEFAULT 'ar',
    p_category_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
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
    AND (p_category_id IS NULL OR a.category_id = p_category_id)
    ORDER BY a.published_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة للحصول على التصنيفات حسب اللغة
CREATE OR REPLACE FUNCTION get_categories_by_language(p_language VARCHAR(5) DEFAULT 'ar')
RETURNS TABLE(
    id UUID,
    name VARCHAR(255),
    description TEXT,
    color VARCHAR(100),
    icon VARCHAR(100),
    article_count INTEGER,
    language VARCHAR(5)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id, c.name, c.description, c.color, c.icon, 
        COALESCE((
            SELECT COUNT(*)::INTEGER 
            FROM articles a 
            WHERE a.category_id = c.id 
            AND a.status = 'published' 
            AND a.language = p_language
        ), 0) as article_count,
        c.language
    FROM article_categories c
    WHERE c.language = p_language
    ORDER BY c.name;
END;
$$ LANGUAGE plpgsql;

COMMIT;
