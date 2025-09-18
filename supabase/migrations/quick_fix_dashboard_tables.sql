-- إصلاح سريع لجداول لوحة التحكم
-- تاريخ الإنشاء: 7 أغسطس 2025
-- الغرض: إنشاء الجداول المطلوبة بشكل مبسط لحل مشاكل لوحة التحكم

-- بدء المعاملة
BEGIN;

-- إنشاء جدول المحادثات (مبسط)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL,
    user2_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول الرسائل (مبسط)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    moderation_status VARCHAR(20) DEFAULT 'approved',
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول مشاهدات الملفات الشخصية (مبسط)
CREATE TABLE IF NOT EXISTS public.profile_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_id UUID NOT NULL,
    viewed_user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول الإعجابات (مبسط)
CREATE TABLE IF NOT EXISTS public.user_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    liker_id UUID NOT NULL,
    liked_user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(liker_id, liked_user_id)
);

-- إنشاء جدول النشاطات الأخيرة (مبسط)
CREATE TABLE IF NOT EXISTS public.recent_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    activity_type VARCHAR(30) NOT NULL,
    description TEXT NOT NULL,
    target_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهارس أساسية
CREATE INDEX IF NOT EXISTS idx_conversations_users ON public.conversations(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed ON public.profile_views(viewed_user_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_liked ON public.user_likes(liked_user_id);
CREATE INDEX IF NOT EXISTS idx_recent_activities_user ON public.recent_activities(user_id);

-- إدراج بيانات تجريبية بسيطة
-- (سيتم إدراجها فقط إذا لم توجد بيانات)

-- إدراج محادثات تجريبية
INSERT INTO public.conversations (user1_id, user2_id, created_at)
SELECT 
    u1.id,
    u2.id,
    NOW() - (random() * INTERVAL '30 days')
FROM 
    (SELECT id FROM public.users WHERE gender = 'male' LIMIT 5) u1
CROSS JOIN 
    (SELECT id FROM public.users WHERE gender = 'female' LIMIT 3) u2
WHERE u1.id != u2.id
AND NOT EXISTS (SELECT 1 FROM public.conversations WHERE user1_id = u1.id AND user2_id = u2.id)
LIMIT 10;

-- إدراج رسائل تجريبية
INSERT INTO public.messages (conversation_id, sender_id, content, created_at)
SELECT 
    c.id,
    CASE WHEN random() < 0.5 THEN c.user1_id ELSE c.user2_id END,
    CASE 
        WHEN random() < 0.2 THEN 'السلام عليكم ورحمة الله وبركاته'
        WHEN random() < 0.4 THEN 'أهلاً وسهلاً، كيف حالك؟'
        WHEN random() < 0.6 THEN 'شكراً لك على قبول طلب التعارف'
        WHEN random() < 0.8 THEN 'أتمنى أن نتعرف على بعضنا البعض أكثر'
        ELSE 'بارك الله فيك على هذا الحديث الطيب'
    END,
    c.created_at + (random() * INTERVAL '5 days')
FROM public.conversations c
WHERE NOT EXISTS (SELECT 1 FROM public.messages WHERE conversation_id = c.id)
LIMIT 30;

-- إدراج مشاهدات تجريبية
INSERT INTO public.profile_views (viewer_id, viewed_user_id, created_at)
SELECT 
    u1.id,
    u2.id,
    NOW() - (random() * INTERVAL '30 days')
FROM 
    (SELECT id FROM public.users ORDER BY random() LIMIT 10) u1
CROSS JOIN 
    (SELECT id FROM public.users ORDER BY random() LIMIT 8) u2
WHERE u1.id != u2.id
AND NOT EXISTS (SELECT 1 FROM public.profile_views WHERE viewer_id = u1.id AND viewed_user_id = u2.id)
LIMIT 50;

-- إدراج إعجابات تجريبية
INSERT INTO public.user_likes (liker_id, liked_user_id, created_at)
SELECT 
    u1.id,
    u2.id,
    NOW() - (random() * INTERVAL '45 days')
FROM 
    (SELECT id FROM public.users ORDER BY random() LIMIT 8) u1
CROSS JOIN 
    (SELECT id FROM public.users ORDER BY random() LIMIT 6) u2
WHERE u1.id != u2.id
AND NOT EXISTS (SELECT 1 FROM public.user_likes WHERE liker_id = u1.id AND liked_user_id = u2.id)
LIMIT 25;

-- إدراج نشاطات تجريبية
INSERT INTO public.recent_activities (user_id, activity_type, description, created_at)
SELECT 
    u.id,
    CASE 
        WHEN random() < 0.25 THEN 'view'
        WHEN random() < 0.5 THEN 'like'
        WHEN random() < 0.75 THEN 'message'
        ELSE 'profile_update'
    END,
    CASE 
        WHEN random() < 0.25 THEN 'شاهد ملفك الشخصي'
        WHEN random() < 0.5 THEN 'أعجب بملفك الشخصي'
        WHEN random() < 0.75 THEN 'أرسل لك رسالة جديدة'
        ELSE 'قام بتحديث ملفه الشخصي'
    END,
    NOW() - (random() * INTERVAL '7 days')
FROM 
    (SELECT id FROM public.users ORDER BY random() LIMIT 15) u
WHERE NOT EXISTS (SELECT 1 FROM public.recent_activities WHERE user_id = u.id)
LIMIT 40;

-- إنهاء المعاملة
COMMIT;

-- رسالة النجاح
SELECT 'تم إنشاء الجداول والبيانات التجريبية بنجاح! ✅' as message;
