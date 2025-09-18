-- إنشاء الجداول المفقودة لنظام المقالات
-- Create Missing Tables for Articles System

BEGIN;

-- ===================================
-- 1. جدول إعجابات المقالات
-- ===================================
CREATE TABLE IF NOT EXISTS article_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(article_id, user_id)
);

-- فهارس لجدول إعجابات المقالات
CREATE INDEX IF NOT EXISTS idx_article_likes_article_id ON article_likes(article_id);
CREATE INDEX IF NOT EXISTS idx_article_likes_user_id ON article_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_article_likes_created_at ON article_likes(created_at);

-- ===================================
-- 2. جدول تعليقات المقالات
-- ===================================
CREATE TABLE IF NOT EXISTS article_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES article_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهارس لجدول تعليقات المقالات
CREATE INDEX IF NOT EXISTS idx_article_comments_article_id ON article_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_user_id ON article_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_parent_id ON article_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_created_at ON article_comments(created_at);

-- ===================================
-- 3. جدول إعجابات التعليقات
-- ===================================
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID REFERENCES article_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- فهارس لجدول إعجابات التعليقات
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_created_at ON comment_likes(created_at);

-- ===================================
-- 4. دوال مساعدة لإدارة الإعجابات والتعليقات
-- ===================================

-- دالة زيادة إعجابات المقال
CREATE OR REPLACE FUNCTION increment_article_likes(article_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE articles 
    SET likes = likes + 1 
    WHERE id = article_id;
END;
$$ LANGUAGE plpgsql;

-- دالة تقليل إعجابات المقال
CREATE OR REPLACE FUNCTION decrement_article_likes(article_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE articles 
    SET likes = GREATEST(likes - 1, 0) 
    WHERE id = article_id;
END;
$$ LANGUAGE plpgsql;

-- دالة زيادة تعليقات المقال
CREATE OR REPLACE FUNCTION increment_article_comments(article_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE articles 
    SET comments_count = comments_count + 1 
    WHERE id = article_id;
END;
$$ LANGUAGE plpgsql;

-- دالة تقليل تعليقات المقال
CREATE OR REPLACE FUNCTION decrement_article_comments(article_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE articles 
    SET comments_count = GREATEST(comments_count - 1, 0) 
    WHERE id = article_id;
END;
$$ LANGUAGE plpgsql;

-- دالة زيادة إعجابات التعليق
CREATE OR REPLACE FUNCTION increment_comment_likes(comment_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE article_comments 
    SET likes = likes + 1 
    WHERE id = comment_id;
END;
$$ LANGUAGE plpgsql;

-- دالة تقليل إعجابات التعليق
CREATE OR REPLACE FUNCTION decrement_comment_likes(comment_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE article_comments 
    SET likes = GREATEST(likes - 1, 0) 
    WHERE id = comment_id;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 5. تحديث تلقائي لـ updated_at
-- ===================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق التحديث التلقائي على جدول التعليقات
DROP TRIGGER IF EXISTS update_article_comments_updated_at ON article_comments;
CREATE TRIGGER update_article_comments_updated_at
    BEFORE UPDATE ON article_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- 6. سياسات الأمان (RLS)
-- ===================================

-- تفعيل RLS للجداول الجديدة
ALTER TABLE article_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- سياسات إعجابات المقالات
CREATE POLICY "Users can view all article likes" ON article_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own article likes" ON article_likes
    FOR ALL USING (auth.uid() = user_id);

-- سياسات تعليقات المقالات
CREATE POLICY "Users can view all article comments" ON article_comments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON article_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON article_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON article_comments
    FOR DELETE USING (auth.uid() = user_id);

-- سياسات إعجابات التعليقات
CREATE POLICY "Users can view all comment likes" ON comment_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own comment likes" ON comment_likes
    FOR ALL USING (auth.uid() = user_id);

-- ===================================
-- 7. دوال إحصائية
-- ===================================

-- دالة للحصول على إحصائيات المقال
CREATE OR REPLACE FUNCTION get_article_stats(article_id UUID)
RETURNS TABLE(
    total_likes BIGINT,
    total_comments BIGINT,
    total_views INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE((SELECT COUNT(*) FROM article_likes WHERE article_likes.article_id = get_article_stats.article_id), 0) as total_likes,
        COALESCE((SELECT COUNT(*) FROM article_comments WHERE article_comments.article_id = get_article_stats.article_id), 0) as total_comments,
        COALESCE((SELECT views FROM articles WHERE id = get_article_stats.article_id), 0) as total_views;
END;
$$ LANGUAGE plpgsql;

-- دالة للحصول على أكثر المقالات تفاعلاً
CREATE OR REPLACE FUNCTION get_most_engaging_articles(p_limit INTEGER DEFAULT 5)
RETURNS TABLE(
    article_id UUID,
    title VARCHAR(500),
    engagement_score BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id as article_id,
        a.title,
        (a.views + a.likes * 2 + a.comments_count * 3) as engagement_score
    FROM articles a
    WHERE a.status = 'published'
    ORDER BY engagement_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- عرض ملخص الجداول المُنشأة
SELECT 'Tables created successfully!' as status;
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('article_likes', 'article_comments', 'comment_likes')
ORDER BY table_name;
