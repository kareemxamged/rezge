-- إنشاء جداول نظام المقالات
-- Create Articles System Tables

-- بدء المعاملة
BEGIN;

-- إنشاء جدول تصنيفات المقالات
CREATE TABLE IF NOT EXISTS article_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(100) DEFAULT 'from-primary-500 to-primary-600',
    icon VARCHAR(100) DEFAULT 'BookOpen',
    article_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول المقالات
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    excerpt TEXT,
    content TEXT,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES article_categories(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_time INTEGER DEFAULT 5,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول تعليقات المقالات
CREATE TABLE IF NOT EXISTS article_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    parent_id UUID REFERENCES article_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول إعجابات المقالات
CREATE TABLE IF NOT EXISTS article_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(article_id, user_id)
);

-- إنشاء جدول إعجابات التعليقات
CREATE TABLE IF NOT EXISTS article_comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID REFERENCES article_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- إنشاء الفهارس للأداء
CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_article_comments_article ON article_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_user ON article_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_article_likes_article ON article_likes(article_id);
CREATE INDEX IF NOT EXISTS idx_article_likes_user ON article_likes(user_id);

-- إنشاء فهرس البحث النصي
CREATE INDEX IF NOT EXISTS idx_articles_search 
ON articles USING gin(to_tsvector('arabic', title || ' ' || COALESCE(excerpt, '') || ' ' || COALESCE(content, '')));

-- إنشاء دوال التحديث التلقائي للوقت
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- إنشاء المشغلات للتحديث التلقائي
DROP TRIGGER IF EXISTS update_article_categories_updated_at ON article_categories;
CREATE TRIGGER update_article_categories_updated_at 
    BEFORE UPDATE ON article_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_articles_updated_at ON articles;
CREATE TRIGGER update_articles_updated_at 
    BEFORE UPDATE ON articles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_article_comments_updated_at ON article_comments;
CREATE TRIGGER update_article_comments_updated_at 
    BEFORE UPDATE ON article_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- إدراج التصنيفات الأساسية
INSERT INTO article_categories (id, name, description, color, icon, article_count) VALUES 
(
    'islamic-guidance-cat',
    'الإرشاد الإسلامي',
    'مقالات شاملة حول الآداب الإسلامية في الزواج والتعارف مع أدلة شرعية وتطبيقات عملية معاصرة',
    'from-emerald-500 to-emerald-600',
    'BookOpen',
    0
),
(
    'marriage-tips-cat',
    'نصائح الزواج',
    'نصائح عملية ومجربة للحياة الزوجية السعيدة وحل المشاكل الزوجية بحكمة وذكاء',
    'from-rose-500 to-rose-600',
    'Heart',
    0
),
(
    'family-guidance-cat',
    'التوجيه الأسري',
    'دور الأهل في اختيار شريك الحياة والتوازن بين التوجيه الحكيم واحترام اختيار الأبناء',
    'from-blue-500 to-blue-600',
    'Users',
    0
),
(
    'digital-safety-cat',
    'الأمان الرقمي',
    'دليل شامل للحماية من المحتالين والمخاطر الرقمية في مواقع الزواج الإلكترونية',
    'from-amber-500 to-amber-600',
    'Shield',
    0
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon;

-- إنشاء مستخدمين وهميين للمؤلفين (إذا لم يكونوا موجودين)
INSERT INTO users (id, email, name, title, bio, avatar, created_at) VALUES 
(
    'ahmed-sharif-author',
    'ahmed.sharif@example.com',
    'د. أحمد الشريف',
    'دكتور في الشريعة الإسلامية',
    'خبير في الفقه الإسلامي والأحوال الشخصية، له العديد من المؤلفات في مجال الزواج والأسرة في الإسلام.',
    '/images/authors/ahmed-sharif.jpg',
    NOW()
),
(
    'fatima-zahra-author',
    'fatima.zahra@example.com',
    'د. فاطمة الزهراء',
    'دكتورة في الدراسات الإسلامية',
    'متخصصة في الدراسات الإسلامية والتوجيه الأسري، لها خبرة واسعة في مجال الإرشاد الزوجي.',
    '/images/authors/fatima-zahra.jpg',
    NOW()
),
(
    'layla-ansari-author',
    'layla.ansari@example.com',
    'د. ليلى الأنصاري',
    'مستشارة زواج وعلاقات أسرية',
    'مستشارة معتمدة في العلاقات الأسرية والزوجية، تساعد الأزواج في بناء علاقات صحية ومستقرة.',
    '/images/authors/layla-ansari.jpg',
    NOW()
),
(
    'khalid-rashid-author',
    'khalid.rashid@example.com',
    'د. خالد الراشد',
    'معالج أسري ومستشار زواج',
    'معالج أسري معتمد ومستشار زواج، متخصص في حل المشاكل الزوجية والعلاج النفسي الأسري.',
    '/images/authors/khalid-rashid.jpg',
    NOW()
),
(
    'ibrahim-mansouri-author',
    'ibrahim.mansouri@example.com',
    'د. إبراهيم المنصوري',
    'مستشار أسري ومختص في التوجيه الأسري',
    'مختص في التوجيه الأسري والعلاقات الاجتماعية، له خبرة طويلة في مجال الإرشاد والتوجيه.',
    '/images/authors/ibrahim-mansouri.jpg',
    NOW()
),
(
    'omar-tech-author',
    'omar.tech@example.com',
    'د. عمر التقني',
    'خبير أمن المعلومات والأمان الرقمي',
    'خبير في أمن المعلومات والحماية الرقمية، متخصص في أمان المواقع والتطبيقات الإلكترونية.',
    '/images/authors/omar-tech.jpg',
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    title = EXCLUDED.title,
    bio = EXCLUDED.bio,
    avatar = EXCLUDED.avatar;

-- إنشاء دوال مساعدة
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

-- تحديث عدد المقالات في التصنيفات
CREATE OR REPLACE FUNCTION update_category_article_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE article_categories 
        SET article_count = article_count + 1 
        WHERE id = NEW.category_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE article_categories 
        SET article_count = article_count - 1 
        WHERE id = OLD.category_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.category_id != NEW.category_id THEN
            UPDATE article_categories 
            SET article_count = article_count - 1 
            WHERE id = OLD.category_id;
            UPDATE article_categories 
            SET article_count = article_count + 1 
            WHERE id = NEW.category_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- إنشاء مشغل لتحديث عدد المقالات
DROP TRIGGER IF EXISTS update_category_count ON articles;
CREATE TRIGGER update_category_count
    AFTER INSERT OR UPDATE OR DELETE ON articles
    FOR EACH ROW EXECUTE FUNCTION update_category_article_count();

-- تمكين RLS (Row Level Security)
ALTER TABLE article_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_comment_likes ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات RLS للقراءة العامة
CREATE POLICY "Allow public read access to published articles" ON articles
    FOR SELECT USING (status = 'published');

CREATE POLICY "Allow public read access to article categories" ON article_categories
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to article comments" ON article_comments
    FOR SELECT USING (true);

-- سياسات للكتابة (للمستخدمين المسجلين فقط)
CREATE POLICY "Allow authenticated users to insert comments" ON article_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own comments" ON article_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own comments" ON article_comments
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to like articles" ON article_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to remove their own likes" ON article_likes
    FOR DELETE USING (auth.uid() = user_id);

-- إنهاء المعاملة
COMMIT;

-- رسالة النجاح
SELECT 'تم إنشاء جداول نظام المقالات بنجاح! 🎉' as message;
