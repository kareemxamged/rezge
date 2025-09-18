-- Run All Enhanced Articles Migration
-- This file executes all the enhanced article migrations in the correct order
-- Created as part of the articles system enhancement project

-- First, ensure the articles system is properly set up
\i create_articles_system.sql

-- Insert enhanced Islamic guidance articles
\i insert_enhanced_islamic_guidance_articles.sql

-- Insert enhanced marriage tips articles  
\i insert_enhanced_marriage_tips_articles.sql

-- Insert enhanced family guidance articles
\i insert_enhanced_family_guidance_articles.sql

-- Insert enhanced digital safety articles
\i insert_enhanced_digital_safety_articles.sql

-- Update article counts for categories
UPDATE article_categories 
SET article_count = (
    SELECT COUNT(*) 
    FROM articles 
    WHERE category_id = article_categories.id 
    AND status = 'published'
);

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_articles_title_search ON articles USING GIN(to_tsvector('arabic', title));
CREATE INDEX IF NOT EXISTS idx_articles_content_search ON articles USING GIN(to_tsvector('arabic', content));
CREATE INDEX IF NOT EXISTS idx_articles_excerpt_search ON articles USING GIN(to_tsvector('arabic', excerpt));

-- Update statistics
ANALYZE articles;
ANALYZE article_categories;
ANALYZE article_likes;
ANALYZE article_comments;

-- Display summary of inserted articles
SELECT 
    ac.name as category_name,
    COUNT(a.id) as article_count,
    SUM(a.views) as total_views,
    SUM(a.likes) as total_likes,
    SUM(a.comments_count) as total_comments
FROM article_categories ac
LEFT JOIN articles a ON ac.id = a.category_id AND a.status = 'published'
GROUP BY ac.id, ac.name
ORDER BY ac.name;

-- Display total statistics
SELECT 
    COUNT(*) as total_articles,
    SUM(views) as total_views,
    SUM(likes) as total_likes,
    SUM(comments_count) as total_comments,
    AVG(read_time) as avg_read_time
FROM articles 
WHERE status = 'published';
