-- إصلاح نظام الإشعارات البريدية - نسخة مبسطة
-- تاريخ الإنشاء: 12-09-2025
-- الغرض: إنشاء الدوال والـ triggers المطلوبة لنظام الإشعارات البريدية

-- ===================================
-- 1. إنشاء دالة إنشاء الإشعارات
-- ===================================

CREATE OR REPLACE FUNCTION create_notification(
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
-- 2. دالة إشعار الإعجابات
-- ===================================

CREATE OR REPLACE FUNCTION notify_user_like()
RETURNS TRIGGER AS $$
BEGIN
    -- إنشاء إشعار للمستخدم الذي تم الإعجاب به
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

-- ===================================
-- 3. دالة إشعار مشاهدة الملف الشخصي
-- ===================================

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

-- ===================================
-- 4. إنشاء الـ Triggers
-- ===================================

-- حذف الـ triggers القديمة إذا كانت موجودة
DROP TRIGGER IF EXISTS trigger_notify_user_like ON public.user_likes;
DROP TRIGGER IF EXISTS trigger_notify_profile_view ON public.profile_views;

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

-- ===================================
-- 5. إعطاء الصلاحيات
-- ===================================

-- صلاحيات للدوال
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION notify_user_like TO authenticated;
GRANT EXECUTE ON FUNCTION notify_profile_view TO authenticated;

-- ===================================
-- 6. اختبار النظام
-- ===================================

-- اختبار إنشاء إشعار تجريبي
DO $$
DECLARE
    test_notification_id UUID;
    test_user_id UUID := '00000000-0000-0000-0000-000000000001';
    test_from_user_id UUID := '00000000-0000-0000-0000-000000000002';
BEGIN
    -- محاولة إنشاء إشعار تجريبي
    BEGIN
        test_notification_id := create_notification(
            test_user_id,
            test_from_user_id,
            'test',
            'اختبار النظام',
            'هذا إشعار تجريبي للتأكد من عمل النظام'
        );
        
        RAISE NOTICE '✅ تم إنشاء إشعار تجريبي بنجاح: %', test_notification_id;
        
        -- حذف الإشعار التجريبي
        DELETE FROM public.notifications WHERE id = test_notification_id;
        RAISE NOTICE '🗑️ تم حذف الإشعار التجريبي';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ خطأ في اختبار النظام: %', SQLERRM;
    END;
END;
$$;

-- ===================================
-- 7. تقرير النتائج
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 تقرير إعداد نظام الإشعارات البريدية:';
    RAISE NOTICE '';
    RAISE NOTICE '✅ تم إنشاء دالة create_notification';
    RAISE NOTICE '✅ تم إنشاء دالة notify_user_like';
    RAISE NOTICE '✅ تم إنشاء دالة notify_profile_view';
    RAISE NOTICE '✅ تم إنشاء trigger للإعجابات';
    RAISE NOTICE '✅ تم إنشاء trigger لمشاهدة الملفات';
    RAISE NOTICE '✅ تم إعطاء الصلاحيات المطلوبة';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 النظام جاهز الآن!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 للاختبار:';
    RAISE NOTICE '1. جرب الإعجاب بملف شخصي';
    RAISE NOTICE '2. جرب مشاهدة ملف شخصي';
    RAISE NOTICE '3. تحقق من الكونسول للرسائل';
    RAISE NOTICE '4. تحقق من البريد الإلكتروني';
    RAISE NOTICE '';
END;
$$;
