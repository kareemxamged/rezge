-- إنشاء جداول التفاعل مع المقالات
-- Create article interaction tables

-- جدول إعجابات المقالات
CREATE TABLE IF NOT EXISTS article_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- فهرس فريد لمنع الإعجاب المتكرر
  UNIQUE(article_id, user_id)
);

-- جدول تعليقات المقالات
CREATE TABLE IF NOT EXISTS article_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES article_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- التحقق من صحة المحتوى
  CONSTRAINT content_not_empty CHECK (length(trim(content)) > 0)
);

-- جدول إعجابات التعليقات
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES article_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- فهرس فريد لمنع الإعجاب المتكرر
  UNIQUE(comment_id, user_id)
);

-- إنشاء الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_article_likes_article_id ON article_likes(article_id);
CREATE INDEX IF NOT EXISTS idx_article_likes_user_id ON article_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_article_id ON article_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_user_id ON article_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_parent_id ON article_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- إنشاء دوال التحديث التلقائي للوقت
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- إضافة triggers للتحديث التلقائي
CREATE TRIGGER update_article_likes_updated_at 
    BEFORE UPDATE ON article_likes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_article_comments_updated_at 
    BEFORE UPDATE ON article_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- دالة لتحديث عدد الإعجابات في جدول المقالات
CREATE OR REPLACE FUNCTION update_article_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE articles 
        SET likes = (
            SELECT COUNT(*) 
            FROM article_likes 
            WHERE article_id = NEW.article_id
        )
        WHERE id = NEW.article_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE articles 
        SET likes = (
            SELECT COUNT(*) 
            FROM article_likes 
            WHERE article_id = OLD.article_id
        )
        WHERE id = OLD.article_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- إضافة trigger لتحديث عدد الإعجابات
CREATE TRIGGER trigger_update_article_likes_count
    AFTER INSERT OR DELETE ON article_likes
    FOR EACH ROW EXECUTE FUNCTION update_article_likes_count();

-- دالة لتحديث عدد الإعجابات في جدول التعليقات
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE article_comments 
        SET likes = (
            SELECT COUNT(*) 
            FROM comment_likes 
            WHERE comment_id = NEW.comment_id
        )
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE article_comments 
        SET likes = (
            SELECT COUNT(*) 
            FROM comment_likes 
            WHERE comment_id = OLD.comment_id
        )
        WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- إضافة trigger لتحديث عدد الإعجابات في التعليقات
CREATE TRIGGER trigger_update_comment_likes_count
    AFTER INSERT OR DELETE ON comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

-- إضافة سياسات الأمان (RLS)
ALTER TABLE article_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- سياسات إعجابات المقالات
CREATE POLICY "Users can view all article likes" ON article_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own article likes" ON article_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own article likes" ON article_likes
    FOR DELETE USING (auth.uid() = user_id);

-- سياسات تعليقات المقالات
CREATE POLICY "Users can view approved comments" ON article_comments
    FOR SELECT USING (is_approved = true AND is_deleted = false);

CREATE POLICY "Users can insert their own comments" ON article_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON article_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON article_comments
    FOR DELETE USING (auth.uid() = user_id);

-- سياسات إعجابات التعليقات
CREATE POLICY "Users can view all comment likes" ON comment_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own comment likes" ON comment_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comment likes" ON comment_likes
    FOR DELETE USING (auth.uid() = user_id);
