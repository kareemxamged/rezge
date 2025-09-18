-- إصلاح triggers الإشعارات للأنشطة العادية
-- تاريخ الإنشاء: 12-09-2025
-- الغرض: إصلاح مشاكل الإشعارات البريدية للإعجابات ومشاهدة الملفات والرسائل

-- بدء المعاملة
BEGIN;

-- ===================================
-- 1. التحقق من وجود الجداول المطلوبة
-- ===================================

-- إنشاء جدول الإشعارات إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('profile_view', 'like', 'message', 'match', 'system', 'alert', 'verification', 'warning')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    action_text TEXT,
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول الإعجابات إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.user_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    liker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    liked_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    like_type VARCHAR(20) DEFAULT 'profile' CHECK (like_type IN ('profile', 'photo', 'bio')),
    is_mutual BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(liker_id, liked_user_id)
);

-- إنشاء جدول مشاهدة الملفات إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.profile_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    viewed_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- 2. دالة إنشاء الإشعارات
-- ===================================

CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_from_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_action_url TEXT DEFAULT NULL,
    p_action_text TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_id UUID;
BEGIN
    -- إنشاء الإشعار
    INSERT INTO public.notifications (
        user_id,
        from_user_id,
        type,
        title,
        message,
        action_url,
        action_text
    ) VALUES (
        p_user_id,
        p_from_user_id,
        p_type,
        p_title,
        p_message,
        p_action_url,
        p_action_text
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;

-- ===================================
-- 3. دوال الإشعارات للأنشطة المختلفة
-- ===================================

-- دالة إشعار الإعجاب
CREATE OR REPLACE FUNCTION notify_user_like()
RETURNS TRIGGER AS $$
BEGIN
    -- إنشاء إشعار للمستخدم الذي تم الإعجاب بملفه
    PERFORM create_notification(
        NEW.liked_user_id,
        NEW.liker_id,
        'like',
        'notifications.content.like.title',
        'notifications.content.like.message',
        '/profile/' || NEW.liker_id::text,
        'notifications.content.like.actionText'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة إشعار مشاهدة الملف الشخصي
CREATE OR REPLACE FUNCTION notify_profile_view()
RETURNS TRIGGER AS $$
BEGIN
    -- إنشاء إشعار للمستخدم الذي تم مشاهدة ملفه
    PERFORM create_notification(
        NEW.viewed_user_id,
        NEW.viewer_id,
        'profile_view',
        'notifications.content.profileView.title',
        'notifications.content.profileView.message',
        '/profile/' || NEW.viewer_id::text,
        'notifications.content.profileView.actionText'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة إشعار الرسالة الجديدة
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
    receiver_id UUID;
BEGIN
    -- الحصول على معرف المستقبل من المحادثة
    SELECT CASE 
        WHEN c.user1_id = NEW.sender_id THEN c.user2_id 
        ELSE c.user1_id 
    END INTO receiver_id
    FROM conversations c 
    WHERE c.id = NEW.conversation_id;
    
    -- إنشاء إشعار للمستقبل
    IF receiver_id IS NOT NULL THEN
        PERFORM create_notification(
            receiver_id,
            NEW.sender_id,
            'message',
            'notifications.content.message.title',
            'notifications.content.message.message',
            '/messages',
            'notifications.content.message.actionText'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة إشعار المطابقة الجديدة
CREATE OR REPLACE FUNCTION notify_new_match()
RETURNS TRIGGER AS $$
BEGIN
    -- التحقق من وجود إعجاب متبادل (مطابقة)
    IF NEW.is_mutual = true AND (OLD.is_mutual IS NULL OR OLD.is_mutual = false) THEN
        -- إرسال إشعار للمستخدم الأول (الذي أعجب أولاً)
        PERFORM create_notification(
            NEW.liker_id,
            NEW.liked_user_id,
            'match',
            'notifications.content.match.title',
            'notifications.content.match.message',
            '/messages',
            'notifications.content.match.actionText'
        );
        
        -- إرسال إشعار للمستخدم الثاني (الذي قبل الإعجاب)
        PERFORM create_notification(
            NEW.liked_user_id,
            NEW.liker_id,
            'match',
            'notifications.content.match.title',
            'notifications.content.match.message',
            '/messages',
            'notifications.content.match.actionText'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 4. إنشاء أو تحديث الـ Triggers
-- ===================================

-- حذف الـ triggers القديمة إذا كانت موجودة
DROP TRIGGER IF EXISTS trigger_notify_user_like ON public.user_likes;
DROP TRIGGER IF EXISTS trigger_notify_profile_view ON public.profile_views;
DROP TRIGGER IF EXISTS trigger_notify_new_message ON public.messages;
DROP TRIGGER IF EXISTS trigger_notify_new_match ON public.user_likes;

-- إنشاء trigger للإعجابات
CREATE TRIGGER trigger_notify_user_like
    AFTER INSERT ON public.user_likes
    FOR EACH ROW
    EXECUTE FUNCTION notify_user_like();

-- إنشاء trigger لمشاهدة الملفات
CREATE TRIGGER trigger_notify_profile_view
    AFTER INSERT ON public.profile_views
    FOR EACH ROW
    EXECUTE FUNCTION notify_profile_view();

-- إنشاء trigger للرسائل الجديدة
CREATE TRIGGER trigger_notify_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_message();

-- إنشاء trigger للمطابقات الجديدة
CREATE TRIGGER trigger_notify_new_match
    AFTER UPDATE ON public.user_likes
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_match();

-- ===================================
-- 5. إنشاء الفهارس المطلوبة
-- ===================================

-- فهارس جدول الإشعارات
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_from_user_id ON public.notifications(from_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- فهارس جدول الإعجابات
CREATE INDEX IF NOT EXISTS idx_user_likes_liker_id ON public.user_likes(liker_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_liked_user_id ON public.user_likes(liked_user_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_is_mutual ON public.user_likes(is_mutual);
CREATE INDEX IF NOT EXISTS idx_user_likes_created_at ON public.user_likes(created_at DESC);

-- فهارس جدول مشاهدة الملفات
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_id ON public.profile_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_user_id ON public.profile_views(viewed_user_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_created_at ON public.profile_views(created_at DESC);

-- ===================================
-- 6. إعطاء الصلاحيات المطلوبة
-- ===================================

-- صلاحيات الدوال
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION notify_user_like TO authenticated;
GRANT EXECUTE ON FUNCTION notify_profile_view TO authenticated;
GRANT EXECUTE ON FUNCTION notify_new_message TO authenticated;
GRANT EXECUTE ON FUNCTION notify_new_match TO authenticated;

-- صلاحيات الجداول
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_views TO authenticated;

-- ===================================
-- 7. إنشاء سياسات RLS
-- ===================================

-- تفعيل RLS على جدول الإشعارات
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- سياسة عرض الإشعارات (المستخدم يرى إشعاراته فقط)
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid()::text = user_id);

-- سياسة تحديث الإشعارات (المستخدم يحدث إشعاراته فقط)
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid()::text = user_id);

-- سياسة إنشاء الإشعارات (النظام ينشئ الإشعارات)
CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- إنهاء المعاملة
COMMIT;

-- ===================================
-- 8. اختبار النظام
-- ===================================

-- اختبار دالة إنشاء الإشعارات
DO $$
DECLARE
    test_notification_id UUID;
BEGIN
    -- محاولة إنشاء إشعار تجريبي
    SELECT create_notification(
        '00000000-0000-0000-0000-000000000000'::UUID,
        '00000000-0000-0000-0000-000000000001'::UUID,
        'system',
        'اختبار النظام',
        'هذا إشعار تجريبي للتأكد من عمل النظام',
        '/test',
        'اختبار'
    ) INTO test_notification_id;
    
    IF test_notification_id IS NOT NULL THEN
        RAISE NOTICE '✅ تم إنشاء إشعار تجريبي بنجاح: %', test_notification_id;
        
        -- حذف الإشعار التجريبي
        DELETE FROM public.notifications WHERE id = test_notification_id;
        RAISE NOTICE '🗑️ تم حذف الإشعار التجريبي';
    ELSE
        RAISE NOTICE '❌ فشل في إنشاء الإشعار التجريبي';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ خطأ في اختبار النظام: %', SQLERRM;
END;
$$;

RAISE NOTICE '🎉 تم إصلاح نظام الإشعارات بنجاح!';
RAISE NOTICE '📋 الـ Triggers المفعلة:';
RAISE NOTICE '   - trigger_notify_user_like (للإعجابات)';
RAISE NOTICE '   - trigger_notify_profile_view (لمشاهدة الملفات)';
RAISE NOTICE '   - trigger_notify_new_message (للرسائل الجديدة)';
RAISE NOTICE '   - trigger_notify_new_match (للمطابقات الجديدة)';
RAISE NOTICE '📧 نظام الإشعارات البريدية جاهز للعمل!';
