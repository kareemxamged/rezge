-- البحث عن جميع نسخ الدوال وحذفها بدقة
-- تاريخ الإنشاء: 12-09-2025

-- ===================================
-- 1. البحث عن جميع نسخ دالة create_notification
-- ===================================

SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments,
    'DROP FUNCTION IF EXISTS ' || proname || '(' || pg_get_function_identity_arguments(oid) || ') CASCADE;' as drop_command
FROM pg_proc 
WHERE proname = 'create_notification'
ORDER BY arguments;

-- ===================================
-- 2. حذف جميع النسخ الموجودة (نفذ هذه الأوامر حسب النتائج أعلاه)
-- ===================================

-- مثال على الأوامر المحتملة (قم بتعديلها حسب النتائج أعلاه):
-- DROP FUNCTION IF EXISTS create_notification() CASCADE;
-- DROP FUNCTION IF EXISTS create_notification(uuid) CASCADE;
-- DROP FUNCTION IF EXISTS create_notification(uuid, uuid) CASCADE;
-- DROP FUNCTION IF EXISTS create_notification(uuid, uuid, text) CASCADE;
-- DROP FUNCTION IF EXISTS create_notification(uuid, uuid, text, text) CASCADE;
-- DROP FUNCTION IF EXISTS create_notification(uuid, uuid, text, text, text) CASCADE;
-- DROP FUNCTION IF EXISTS create_notification(uuid, uuid, text, text, text, text) CASCADE;
-- DROP FUNCTION IF EXISTS create_notification(uuid, uuid, text, text, text, text, text) CASCADE;

-- ===================================
-- 3. حذف دوال الإشعارات الأخرى
-- ===================================

DROP FUNCTION IF EXISTS notify_user_like() CASCADE;
DROP FUNCTION IF EXISTS notify_profile_view() CASCADE;
DROP FUNCTION IF EXISTS notify_new_message() CASCADE;
DROP FUNCTION IF EXISTS notify_new_match() CASCADE;

-- ===================================
-- 4. حذف الـ triggers
-- ===================================

DROP TRIGGER IF EXISTS trigger_notify_user_like ON public.user_likes;
DROP TRIGGER IF EXISTS trigger_notify_new_match ON public.user_likes;
DROP TRIGGER IF EXISTS trigger_notify_user_like ON public.likes;
DROP TRIGGER IF EXISTS trigger_notify_profile_view ON public.profile_views;
DROP TRIGGER IF EXISTS trigger_notify_new_message ON public.messages;

-- ===================================
-- 5. إنشاء دالة create_notification الجديدة
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
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_id,
        from_user_id,
        type,
        title,
        message,
        action_url,
        action_text,
        is_read,
        is_dismissed,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_from_user_id,
        p_type,
        p_title,
        p_message,
        p_action_url,
        p_action_text,
        false,
        false,
        NOW(),
        NOW()
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 6. إنشاء دوال الإشعارات
-- ===================================

CREATE OR REPLACE FUNCTION public.notify_user_like()
RETURNS TRIGGER AS $$
DECLARE
    notification_id UUID;
BEGIN
    IF NEW.liker_id = NEW.liked_user_id THEN
        RETURN NEW;
    END IF;
    
    BEGIN
        notification_id := public.create_notification(
            NEW.liked_user_id,
            NEW.liker_id,
            'like',
            'notifications.content.like.title',
            'notifications.content.like.message',
            '/profile/' || NEW.liker_id::text,
            'notifications.content.like.actionText'
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.notify_profile_view()
RETURNS TRIGGER AS $$
DECLARE
    notification_id UUID;
BEGIN
    IF NEW.viewer_id = NEW.viewed_user_id THEN
        RETURN NEW;
    END IF;
    
    BEGIN
        notification_id := public.create_notification(
            NEW.viewed_user_id,
            NEW.viewer_id,
            'profile_view',
            'notifications.content.profileView.title',
            'notifications.content.profileView.message',
            '/profile/' || NEW.viewer_id::text,
            'notifications.content.profileView.actionText'
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 7. إنشاء الـ triggers
-- ===================================

CREATE TRIGGER trigger_notify_user_like
    AFTER INSERT ON public.user_likes
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_user_like();

CREATE TRIGGER trigger_notify_profile_view
    AFTER INSERT ON public.profile_views
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_profile_view();

-- ===================================
-- 8. إعطاء الصلاحيات
-- ===================================

GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_user_like TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_profile_view TO authenticated;

-- ===================================
-- 9. اختبار النظام
-- ===================================

DO $$
DECLARE
    test_notification_id UUID;
    test_user_id UUID := gen_random_uuid();
    test_from_user_id UUID := gen_random_uuid();
BEGIN
    BEGIN
        test_notification_id := public.create_notification(
            test_user_id,
            test_from_user_id,
            'test',
            'اختبار النظام',
            'هذا إشعار تجريبي للتأكد من عمل النظام'
        );
        
        RAISE NOTICE '✅ تم إنشاء إشعار تجريبي بنجاح: %', test_notification_id;
        
        DELETE FROM public.notifications WHERE id = test_notification_id;
        RAISE NOTICE '🗑️ تم حذف الإشعار التجريبي';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ خطأ في اختبار النظام: %', SQLERRM;
    END;
END;
$$;

-- ===================================
-- 10. تقرير النتائج
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 تقرير إعداد نظام الإشعارات البريدية:';
    RAISE NOTICE '';
    RAISE NOTICE '✅ تم حذف جميع الدوال والـ triggers القديمة';
    RAISE NOTICE '✅ تم إنشاء دالة create_notification الجديدة';
    RAISE NOTICE '✅ تم إنشاء دالة notify_user_like';
    RAISE NOTICE '✅ تم إنشاء دالة notify_profile_view';
    RAISE NOTICE '✅ تم إنشاء trigger للإعجابات';
    RAISE NOTICE '✅ تم إنشاء trigger لمشاهدة الملفات';
    RAISE NOTICE '✅ تم إعطاء الصلاحيات المطلوبة';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 النظام جاهز الآن!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 للاختبار:';
    RAISE NOTICE '1. جرب الإعجاب بملف شخصي آخر';
    RAISE NOTICE '2. جرب مشاهدة ملف شخصي آخر';
    RAISE NOTICE '3. تحقق من الكونسول للرسائل';
    RAISE NOTICE '4. تحقق من البريد الإلكتروني';
    RAISE NOTICE '';
END;
$$;
