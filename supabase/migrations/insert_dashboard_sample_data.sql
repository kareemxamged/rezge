-- إدراج بيانات تجريبية لجداول لوحة التحكم
-- تاريخ الإنشاء: 7 أغسطس 2025
-- الغرض: إضافة بيانات تجريبية واقعية لاختبار لوحة التحكم

-- بدء المعاملة
BEGIN;

-- إدراج محادثات تجريبية
INSERT INTO public.conversations (id, user1_id, user2_id, status, family_involved, created_at, updated_at) 
SELECT 
    gen_random_uuid(),
    u1.id,
    u2.id,
    CASE 
        WHEN random() < 0.1 THEN 'blocked'
        WHEN random() < 0.05 THEN 'archived'
        ELSE 'active'
    END,
    random() < 0.3, -- 30% احتمال إشراك الأهل
    NOW() - (random() * INTERVAL '60 days'),
    NOW() - (random() * INTERVAL '7 days')
FROM 
    (SELECT id FROM public.users WHERE gender = 'male' ORDER BY random() LIMIT 20) u1
CROSS JOIN 
    (SELECT id FROM public.users WHERE gender = 'female' ORDER BY random() LIMIT 15) u2
WHERE u1.id != u2.id
ORDER BY random()
LIMIT 50
ON CONFLICT (user1_id, user2_id) DO NOTHING;

-- إدراج رسائل تجريبية
WITH conversation_sample AS (
    SELECT id, user1_id, user2_id 
    FROM public.conversations 
    ORDER BY random() 
    LIMIT 30
),
message_templates AS (
    SELECT unnest(ARRAY[
        'السلام عليكم ورحمة الله وبركاته',
        'أهلاً وسهلاً، كيف حالك؟',
        'شكراً لك على قبول طلب التعارف',
        'أتمنى أن نتعرف على بعضنا البعض أكثر',
        'ما هي هواياتك المفضلة؟',
        'أحب القراءة والرياضة، وأنت؟',
        'هل يمكننا التحدث عن أهدافنا المستقبلية؟',
        'أقدر اهتمامك بالدين والأخلاق',
        'متى يمكننا ترتيب لقاء مع الأهل؟',
        'بارك الله فيك على هذا الحديث الطيب'
    ]) as content
)
INSERT INTO public.messages (conversation_id, sender_id, content, moderation_status, created_at)
SELECT 
    cs.id,
    CASE WHEN random() < 0.5 THEN cs.user1_id ELSE cs.user2_id END,
    mt.content,
    CASE 
        WHEN random() < 0.05 THEN 'rejected'
        WHEN random() < 0.1 THEN 'pending'
        ELSE 'approved'
    END,
    NOW() - (random() * INTERVAL '30 days')
FROM conversation_sample cs
CROSS JOIN message_templates mt
ORDER BY random()
LIMIT 200;

-- إدراج مشاهدات الملفات الشخصية
INSERT INTO public.profile_views (viewer_id, viewed_user_id, view_type, created_at)
SELECT 
    u1.id,
    u2.id,
    CASE 
        WHEN random() < 0.4 THEN 'search'
        WHEN random() < 0.3 THEN 'suggestion'
        ELSE 'profile'
    END,
    NOW() - (random() * INTERVAL '30 days')
FROM 
    (SELECT id FROM public.users ORDER BY random() LIMIT 50) u1
CROSS JOIN 
    (SELECT id FROM public.users ORDER BY random() LIMIT 30) u2
WHERE u1.id != u2.id
ORDER BY random()
LIMIT 500;

-- إدراج إعجابات بين المستخدمين
INSERT INTO public.user_likes (liker_id, liked_user_id, like_type, created_at)
SELECT 
    u1.id,
    u2.id,
    CASE 
        WHEN random() < 0.6 THEN 'profile'
        WHEN random() < 0.3 THEN 'photo'
        ELSE 'bio'
    END,
    NOW() - (random() * INTERVAL '45 days')
FROM 
    (SELECT id FROM public.users ORDER BY random() LIMIT 40) u1
CROSS JOIN 
    (SELECT id FROM public.users ORDER BY random() LIMIT 25) u2
WHERE u1.id != u2.id
ORDER BY random()
LIMIT 150
ON CONFLICT (liker_id, liked_user_id) DO NOTHING;

-- إدراج نشاطات أخيرة
WITH activity_templates AS (
    SELECT 
        unnest(ARRAY['view', 'like', 'message', 'match', 'profile_update', 'login', 'photo_upload']) as activity_type,
        unnest(ARRAY[
            'شاهد ملفك الشخصي',
            'أعجب بملفك الشخصي',
            'أرسل لك رسالة جديدة',
            'تم إنشاء مطابقة جديدة',
            'قام بتحديث ملفه الشخصي',
            'سجل دخول إلى الموقع',
            'أضاف صورة جديدة'
        ]) as description
)
INSERT INTO public.recent_activities (user_id, activity_type, target_user_id, description, created_at)
SELECT 
    u1.id,
    at.activity_type,
    CASE WHEN random() < 0.7 THEN u2.id ELSE NULL END,
    at.description,
    NOW() - (random() * INTERVAL '7 days')
FROM 
    (SELECT id FROM public.users ORDER BY random() LIMIT 30) u1
CROSS JOIN 
    activity_templates at
CROSS JOIN 
    (SELECT id FROM public.users ORDER BY random() LIMIT 20) u2
WHERE u1.id != u2.id
ORDER BY random()
LIMIT 300;

-- تحديث الإعجابات المتبادلة
UPDATE public.user_likes 
SET is_mutual = true 
WHERE id IN (
    SELECT ul1.id
    FROM public.user_likes ul1
    JOIN public.user_likes ul2 ON ul1.liker_id = ul2.liked_user_id 
                               AND ul1.liked_user_id = ul2.liker_id
    WHERE ul1.id <= ul2.id
);

-- إدراج مطابقات إضافية بناءً على الإعجابات المتبادلة
INSERT INTO public.matches (user1_id, user2_id, match_score, status, match_type, created_at)
SELECT 
    LEAST(ul.liker_id, ul.liked_user_id),
    GREATEST(ul.liker_id, ul.liked_user_id),
    FLOOR(random() * 40 + 60)::INTEGER, -- نقاط توافق بين 60-100
    'active',
    'mutual_like',
    ul.created_at + INTERVAL '1 day'
FROM public.user_likes ul
WHERE ul.is_mutual = true
ORDER BY random()
LIMIT 25
ON CONFLICT (user1_id, user2_id) DO NOTHING;

-- إنهاء المعاملة
COMMIT;

-- رسالة النجاح
SELECT 'تم إدراج البيانات التجريبية للوحة التحكم بنجاح! 🎉' as message,
       (SELECT COUNT(*) FROM public.conversations) as conversations_count,
       (SELECT COUNT(*) FROM public.messages) as messages_count,
       (SELECT COUNT(*) FROM public.profile_views) as profile_views_count,
       (SELECT COUNT(*) FROM public.user_likes) as user_likes_count,
       (SELECT COUNT(*) FROM public.recent_activities) as activities_count;
