-- إصلاح نظام الإشعارات البريدية - تنظيف وإعادة إنشاء
-- تاريخ الإنشاء: 12-09-2025
-- الغرض: حذف الدوال القديمة وإنشاء دوال جديدة للإشعارات البريدية

-- ===================================
-- 1. حذف الدوال والـ triggers القديمة
-- ===================================

-- حذف الـ triggers أولاً
DROP TRIGGER IF EXISTS trigger_notify_user_like ON public.user_likes;
DROP TRIGGER IF EXISTS trigger_notify_profile_view ON public.profile_views;
DROP TRIGGER IF EXISTS trigger_notify_new_message ON public.messages;
DROP TRIGGER IF EXISTS trigger_notify_new_match ON public.user_likes;

-- حذف جميع نسخ دالة create_notification
DROP FUNCTION IF EXISTS create_notification(UUID, UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_notification(UUID, UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_notification(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_notification(UUID, UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_notification(UUID, UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_notification(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT);

-- حذف دوال الإشعارات القديمة
DROP FUNCTION IF EXISTS notify_user_like();
DROP FUNCTION IF EXISTS notify_profile_view();
DROP FUNCTION IF EXISTS notify_new_message();
DROP FUNCTION IF EXISTS notify_new_match();
DROP FUNCTION IF EXISTS public.notify_user_like();
DROP FUNCTION IF EXISTS public.notify_profile_view();
DROP FUNCTION IF EXISTS public.notify_new_message();
DROP FUNCTION IF EXISTS public.notify_new_match();

-- ===================================
-- 2. إنشاء دالة إنشاء الإشعارات الجديدة
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
    -- التحقق من وجود المستخدمين
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'المستخدم المستقبل غير موجود: %', p_user_id;
    END IF;
    
    IF p_from_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_from_user_id) THEN
        RAISE EXCEPTION 'المستخدم المرسل غير موجود: %', p_from_user_id;
    END IF;
    
    -- إنشاء الإشعار
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
    
    RAISE LOG 'تم إنشاء إشعار جديد: % للمستخدم: % من: %', notification_id, p_user_id, p_from_user_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 3. دالة إشعار الإعجابات
-- ===================================

CREATE OR REPLACE FUNCTION public.notify_user_like()
RETURNS TRIGGER AS $$
DECLARE
    notification_id UUID;
BEGIN
    -- التأكد من أن المستخدم لا يعجب بنفسه
    IF NEW.liker_id = NEW.liked_user_id THEN
        RETURN NEW;
    END IF;
    
    -- إنشاء إشعار للمستخدم الذي تم الإعجاب به
    notification_id := public.create_notification(
        NEW.liked_user_id,
        NEW.liker_id,
        'like',
        'notifications.content.like.title',
        'notifications.content.like.message',
        '/profile/' || NEW.liker_id::text,
        'notifications.content.like.actionText'
    );
    
    RAISE LOG 'تم إنشاء إشعار إعجاب: % للمستخدم: % من: %', notification_id, NEW.liked_user_id, NEW.liker_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 4. دالة إشعار مشاهدة الملف الشخصي
-- ===================================

CREATE OR REPLACE FUNCTION public.notify_profile_view()
RETURNS TRIGGER AS $$
DECLARE
    notification_id UUID;
BEGIN
    -- التأكد من أن المستخدم لا يشاهد ملفه الشخصي
    IF NEW.viewer_id = NEW.viewed_user_id THEN
        RETURN NEW;
    END IF;
    
    -- إنشاء إشعار للمستخدم الذي تم مشاهدة ملفه
    notification_id := public.create_notification(
        NEW.viewed_user_id,
        NEW.viewer_id,
        'profile_view',
        'notifications.content.profileView.title',
        'notifications.content.profileView.message',
        '/profile/' || NEW.viewer_id::text,
        'notifications.content.profileView.actionText'
    );
    
    RAISE LOG 'تم إنشاء إشعار مشاهدة ملف: % للمستخدم: % من: %', notification_id, NEW.viewed_user_id, NEW.viewer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 5. إنشاء الـ Triggers الجديدة
-- ===================================

-- إنشاء trigger للإعجابات
CREATE TRIGGER trigger_notify_user_like
    AFTER INSERT ON public.user_likes
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_user_like();

-- إنشاء trigger لمشاهدة الملفات
CREATE TRIGGER trigger_notify_profile_view
    AFTER INSERT ON public.profile_views
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_profile_view();

-- ===================================
-- 6. إعطاء الصلاحيات
-- ===================================

-- صلاحيات للدوال
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_user_like TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_profile_view TO authenticated;

-- صلاحيات للجداول
GRANT INSERT ON public.notifications TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;

-- ===================================
-- 7. اختبار النظام
-- ===================================

DO $$
DECLARE
    test_notification_id UUID;
    current_user_id UUID;
    test_from_user_id UUID;
BEGIN
    -- الحصول على معرف المستخدم الحالي
    SELECT auth.uid() INTO current_user_id;
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE '⚠️ لا يوجد مستخدم مسجل دخول للاختبار';
        RETURN;
    END IF;
    
    -- استخدام معرف المستخدم الحالي كمرسل أيضاً للاختبار
    test_from_user_id := current_user_id;
    
    -- محاولة إنشاء إشعار تجريبي
    BEGIN
        test_notification_id := public.create_notification(
            current_user_id,
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
-- 8. تقرير النتائج
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 تقرير إعداد نظام الإشعارات البريدية:';
    RAISE NOTICE '';
    RAISE NOTICE '🗑️ تم حذف الدوال والـ triggers القديمة';
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
    RAISE NOTICE '🔍 للتحقق من الـ triggers:';
    RAISE NOTICE 'SELECT * FROM information_schema.triggers WHERE trigger_name LIKE ''%notify%'';';
    RAISE NOTICE '';
END;
$$;
