-- تشخيص نظام الإشعارات البريدية
-- تاريخ الإنشاء: 12-09-2025
-- الغرض: فحص جميع مكونات النظام للعثور على المشكلة

-- ===================================
-- 1. فحص الـ triggers الموجودة
-- ===================================

SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%notify%'
ORDER BY trigger_name;

-- ===================================
-- 2. فحص الدوال الموجودة
-- ===================================

SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN ('create_notification', 'notify_user_like', 'notify_profile_view')
ORDER BY proname;

-- ===================================
-- 3. فحص الإشعارات الحديثة
-- ===================================

SELECT 
    id,
    user_id,
    from_user_id,
    type,
    title,
    message,
    created_at,
    is_read
FROM public.notifications 
ORDER BY created_at DESC 
LIMIT 10;

-- ===================================
-- 4. فحص الإعجابات الحديثة
-- ===================================

SELECT 
    id,
    liker_id,
    liked_user_id,
    created_at
FROM public.user_likes 
ORDER BY created_at DESC 
LIMIT 5;

-- ===================================
-- 5. فحص مشاهدات الملفات الحديثة
-- ===================================

SELECT 
    id,
    viewer_id,
    viewed_user_id,
    created_at
FROM public.profile_views 
ORDER BY created_at DESC 
LIMIT 5;

-- ===================================
-- 6. اختبار إنشاء إشعار يدوي
-- ===================================

DO $$
DECLARE
    test_notification_id UUID;
    current_user_id UUID;
    test_from_user_id UUID := gen_random_uuid();
BEGIN
    -- الحصول على معرف المستخدم الحالي
    SELECT auth.uid() INTO current_user_id;
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE '⚠️ لا يوجد مستخدم مسجل دخول';
        RETURN;
    END IF;
    
    -- محاولة إنشاء إشعار تجريبي
    BEGIN
        test_notification_id := public.create_notification(
            current_user_id,
            test_from_user_id,
            'test_manual',
            'اختبار يدوي',
            'هذا إشعار تجريبي يدوي للتشخيص'
        );
        
        RAISE NOTICE '✅ تم إنشاء إشعار تجريبي يدوي: %', test_notification_id;
        
        -- عرض الإشعار المنشأ
        PERFORM id, type, title, message, created_at
        FROM public.notifications 
        WHERE id = test_notification_id;
        
        -- حذف الإشعار التجريبي
        DELETE FROM public.notifications WHERE id = test_notification_id;
        RAISE NOTICE '🗑️ تم حذف الإشعار التجريبي';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ خطأ في إنشاء الإشعار التجريبي: %', SQLERRM;
    END;
END;
$$;

-- ===================================
-- 7. فحص جدول المستخدمين
-- ===================================

SELECT 
    id,
    email,
    first_name,
    last_name,
    created_at
FROM public.users 
ORDER BY created_at DESC 
LIMIT 3;

-- ===================================
-- 8. اختبار trigger الإعجابات
-- ===================================

DO $$
DECLARE
    current_user_id UUID;
    target_user_id UUID;
    test_like_id UUID;
    notifications_before INTEGER;
    notifications_after INTEGER;
BEGIN
    -- الحصول على معرف المستخدم الحالي
    SELECT auth.uid() INTO current_user_id;
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE '⚠️ لا يوجد مستخدم مسجل دخول للاختبار';
        RETURN;
    END IF;
    
    -- البحث عن مستخدم آخر للاختبار
    SELECT id INTO target_user_id
    FROM public.users 
    WHERE id != current_user_id 
    LIMIT 1;
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE '⚠️ لا يوجد مستخدمين آخرين للاختبار';
        RETURN;
    END IF;
    
    -- عد الإشعارات قبل الاختبار
    SELECT COUNT(*) INTO notifications_before
    FROM public.notifications 
    WHERE user_id = target_user_id;
    
    -- محاولة إنشاء إعجاب تجريبي
    BEGIN
        INSERT INTO public.user_likes (liker_id, liked_user_id, created_at)
        VALUES (current_user_id, target_user_id, NOW())
        RETURNING id INTO test_like_id;
        
        RAISE NOTICE '✅ تم إنشاء إعجاب تجريبي: %', test_like_id;
        
        -- عد الإشعارات بعد الاختبار
        SELECT COUNT(*) INTO notifications_after
        FROM public.notifications 
        WHERE user_id = target_user_id;
        
        RAISE NOTICE 'عدد الإشعارات قبل: % - بعد: %', notifications_before, notifications_after;
        
        IF notifications_after > notifications_before THEN
            RAISE NOTICE '✅ تم إنشاء إشعار بنجاح عبر trigger';
        ELSE
            RAISE NOTICE '❌ لم يتم إنشاء إشعار - مشكلة في trigger';
        END IF;
        
        -- حذف الإعجاب التجريبي
        DELETE FROM public.user_likes WHERE id = test_like_id;
        DELETE FROM public.notifications 
        WHERE user_id = target_user_id 
        AND from_user_id = current_user_id 
        AND type = 'like'
        AND created_at > NOW() - INTERVAL '1 minute';
        
        RAISE NOTICE '🗑️ تم حذف البيانات التجريبية';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ خطأ في اختبار trigger الإعجابات: %', SQLERRM;
    END;
END;
$$;

-- ===================================
-- 9. تقرير التشخيص
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 تقرير تشخيص نظام الإشعارات البريدية:';
    RAISE NOTICE '';
    RAISE NOTICE '1. ✅ تم فحص الـ triggers الموجودة';
    RAISE NOTICE '2. ✅ تم فحص الدوال الموجودة';
    RAISE NOTICE '3. ✅ تم فحص الإشعارات الحديثة';
    RAISE NOTICE '4. ✅ تم فحص الإعجابات الحديثة';
    RAISE NOTICE '5. ✅ تم فحص مشاهدات الملفات الحديثة';
    RAISE NOTICE '6. ✅ تم اختبار إنشاء إشعار يدوي';
    RAISE NOTICE '7. ✅ تم فحص جدول المستخدمين';
    RAISE NOTICE '8. ✅ تم اختبار trigger الإعجابات';
    RAISE NOTICE '';
    RAISE NOTICE '📋 راجع النتائج أعلاه لتحديد المشكلة:';
    RAISE NOTICE '- هل الـ triggers موجودة؟';
    RAISE NOTICE '- هل الدوال موجودة؟';
    RAISE NOTICE '- هل يتم إنشاء إشعارات في قاعدة البيانات؟';
    RAISE NOTICE '- هل trigger الإعجابات يعمل؟';
    RAISE NOTICE '';
END;
$$;
