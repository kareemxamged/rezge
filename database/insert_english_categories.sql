-- إدراج تصنيفات المقالات باللغة الإنجليزية
-- Insert Article Categories in English

BEGIN;

-- إدراج التصنيفات باللغة الإنجليزية
INSERT INTO article_categories (name, description, color, icon, language) VALUES
(
    'Islamic Guidance',
    'Articles about Islamic principles for marriage, family life, and relationships according to Quran and Sunnah',
    'from-emerald-500 to-emerald-600',
    'Mosque',
    'en'
),
(
    'Marriage Tips',
    'Practical advice and tips for building a successful and happy marriage',
    'from-rose-500 to-rose-600',
    'Heart',
    'en'
),
(
    'Family Guidance',
    'Guidance on raising children, family relationships, and building a strong family foundation',
    'from-blue-500 to-blue-600',
    'Users',
    'en'
),
(
    'Digital Safety',
    'Tips and guidelines for safe online dating and protecting personal information',
    'from-purple-500 to-purple-600',
    'Shield',
    'en'
),
(
    'Relationship Psychology',
    'Understanding relationship dynamics, communication, and emotional intelligence',
    'from-indigo-500 to-indigo-600',
    'Brain',
    'en'
),
(
    'Health & Wellness',
    'Physical and mental health tips for individuals and couples',
    'from-green-500 to-green-600',
    'Heart',
    'en'
),
(
    'Success Stories',
    'Real stories of successful marriages and relationships from our community',
    'from-yellow-500 to-yellow-600',
    'Star',
    'en'
),
(
    'Cultural Traditions',
    'Understanding different cultural approaches to marriage and family life',
    'from-orange-500 to-orange-600',
    'Globe',
    'en'
);

COMMIT;
