-- Create article categories table
CREATE TABLE IF NOT EXISTS article_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(50) NOT NULL DEFAULT 'from-slate-500 to-slate-600',
    icon VARCHAR(50) NOT NULL DEFAULT 'BookOpen',
    article_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES article_categories(id) ON DELETE CASCADE,
    tags TEXT[] DEFAULT '{}',
    published_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    read_time INTEGER DEFAULT 5, -- in minutes
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create article likes table
CREATE TABLE IF NOT EXISTS article_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(article_id, user_id)
);

-- Create article comments table
CREATE TABLE IF NOT EXISTS article_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    parent_id UUID REFERENCES article_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create article comment likes table
CREATE TABLE IF NOT EXISTS article_comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES article_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(featured);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_article_likes_article ON article_likes(article_id);
CREATE INDEX IF NOT EXISTS idx_article_likes_user ON article_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_article ON article_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_parent ON article_comments(parent_id);

-- Create functions for incrementing/decrementing counters
CREATE OR REPLACE FUNCTION increment_article_views(article_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE articles 
    SET views = views + 1, updated_at = NOW()
    WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_article_likes(article_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE articles 
    SET likes = likes + 1, updated_at = NOW()
    WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_article_likes(article_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE articles 
    SET likes = GREATEST(0, likes - 1), updated_at = NOW()
    WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_article_comments(article_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE articles 
    SET comments_count = comments_count + 1, updated_at = NOW()
    WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_article_comments(article_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE articles 
    SET comments_count = GREATEST(0, comments_count - 1), updated_at = NOW()
    WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update category article count
CREATE OR REPLACE FUNCTION update_category_article_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the old category count (for UPDATE/DELETE)
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        UPDATE article_categories 
        SET article_count = (
            SELECT COUNT(*) 
            FROM articles 
            WHERE category_id = OLD.category_id AND status = 'published'
        )
        WHERE id = OLD.category_id;
    END IF;
    
    -- Update the new category count (for INSERT/UPDATE)
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE article_categories 
        SET article_count = (
            SELECT COUNT(*) 
            FROM articles 
            WHERE category_id = NEW.category_id AND status = 'published'
        )
        WHERE id = NEW.category_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_category_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_category_article_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_article_categories_updated_at
    BEFORE UPDATE ON article_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_article_comments_updated_at
    BEFORE UPDATE ON article_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO article_categories (name, description, color, icon) VALUES
('الإرشاد الإسلامي', 'مقالات حول الآداب الإسلامية في الزواج والتعارف', 'from-emerald-500 to-emerald-600', 'BookOpen'),
('نصائح الزواج', 'نصائح عملية للحياة الزوجية السعيدة', 'from-rose-500 to-rose-600', 'Heart'),
('التوجيه الأسري', 'دور الأهل في اختيار شريك الحياة', 'from-blue-500 to-blue-600', 'Users'),
('الأمان الرقمي', 'كيفية الحماية من المحتالين والمخاطر الرقمية', 'from-amber-500 to-amber-600', 'Shield')
ON CONFLICT DO NOTHING;

-- Enable Row Level Security
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_comment_likes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Articles policies
CREATE POLICY "Articles are viewable by everyone" ON articles
    FOR SELECT USING (status = 'published');

CREATE POLICY "Authors can view their own articles" ON articles
    FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY "Authors can insert their own articles" ON articles
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own articles" ON articles
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own articles" ON articles
    FOR DELETE USING (auth.uid() = author_id);

-- Categories policies
CREATE POLICY "Categories are viewable by everyone" ON article_categories
    FOR SELECT USING (true);

-- Likes policies
CREATE POLICY "Users can view all likes" ON article_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own likes" ON article_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" ON article_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Comments are viewable by everyone" ON article_comments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert comments" ON article_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON article_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON article_comments
    FOR DELETE USING (auth.uid() = user_id);

-- Comment likes policies
CREATE POLICY "Users can view all comment likes" ON article_comment_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own comment likes" ON article_comment_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comment likes" ON article_comment_likes
    FOR DELETE USING (auth.uid() = user_id);
