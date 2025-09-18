-- تحديث الإشعارات الموجودة لاستخدام مفاتيح الترجمة الجديدة
-- تاريخ الإنشاء: 12-09-2025
-- الغرض: إصلاح الإشعارات الموجودة التي تحتوي على نصوص ثابتة بدلاً من مفاتيح الترجمة

-- بدء المعاملة
BEGIN;

-- ===================================
-- 1. تحديث إشعارات الإعجابات
-- ===================================

-- تحديث عناوين إشعارات الإعجابات
UPDATE public.notifications 
SET title = 'notifications.content.like.title'
WHERE type = 'like' 
AND title NOT LIKE 'notifications.%';

-- تحديث رسائل إشعارات الإعجابات
UPDATE public.notifications 
SET message = 'notifications.content.like.message'
WHERE type = 'like' 
AND message NOT LIKE 'notifications.%';

-- تحديث نص الإجراء لإشعارات الإعجابات
UPDATE public.notifications 
SET action_text = 'notifications.content.like.actionText'
WHERE type = 'like' 
AND (action_text IS NULL OR action_text NOT LIKE 'notifications.%');

-- ===================================
-- 2. تحديث إشعارات مشاهدة الملفات
-- ===================================

-- تحديث عناوين إشعارات مشاهدة الملفات
UPDATE public.notifications 
SET title = 'notifications.content.profileView.title'
WHERE type = 'profile_view' 
AND title NOT LIKE 'notifications.%';

-- تحديث رسائل إشعارات مشاهدة الملفات
UPDATE public.notifications 
SET message = 'notifications.content.profileView.message'
WHERE type = 'profile_view' 
AND message NOT LIKE 'notifications.%';

-- تحديث نص الإجراء لإشعارات مشاهدة الملفات
UPDATE public.notifications 
SET action_text = 'notifications.content.profileView.actionText'
WHERE type = 'profile_view' 
AND (action_text IS NULL OR action_text NOT LIKE 'notifications.%');

-- ===================================
-- 3. تحديث إشعارات الرسائل
-- ===================================

-- تحديث عناوين إشعارات الرسائل
UPDATE public.notifications 
SET title = 'notifications.content.message.title'
WHERE type = 'message' 
AND title NOT LIKE 'notifications.%';

-- تحديث رسائل إشعارات الرسائل
UPDATE public.notifications 
SET message = 'notifications.content.message.message'
WHERE type = 'message' 
AND message NOT LIKE 'notifications.%';

-- تحديث نص الإجراء لإشعارات الرسائل
UPDATE public.notifications 
SET action_text = 'notifications.content.message.actionText'
WHERE type = 'message' 
AND (action_text IS NULL OR action_text NOT LIKE 'notifications.%');

-- ===================================
-- 4. تحديث إشعارات المطابقات
-- ===================================

-- تحديث عناوين إشعارات المطابقات
UPDATE public.notifications 
SET title = 'notifications.content.match.title'
WHERE type = 'match' 
AND title NOT LIKE 'notifications.%';

-- تحديث رسائل إشعارات المطابقات
UPDATE public.notifications 
SET message = 'notifications.content.match.message'
WHERE type = 'match' 
AND message NOT LIKE 'notifications.%';

-- تحديث نص الإجراء لإشعارات المطابقات
UPDATE public.notifications 
SET action_text = 'notifications.content.match.actionText'
WHERE type = 'match' 
AND (action_text IS NULL OR action_text NOT LIKE 'notifications.%');

-- ===================================
-- 5. تحديث timestamp للإشعارات المحدثة
-- ===================================

-- تحديث updated_at للإشعارات التي تم تعديلها
UPDATE public.notifications 
SET updated_at = NOW()
WHERE (title LIKE 'notifications.%' OR message LIKE 'notifications.%')
AND updated_at < NOW() - INTERVAL '1 minute';

-- ===================================
-- 6. إنشاء دالة لتنظيف الإشعارات القديمة (اختياري)
-- ===================================

CREATE OR REPLACE FUNCTION clean_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- حذف الإشعارات الأقدم من 30 يوم والمقروءة
    DELETE FROM public.notifications 
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND is_read = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- إعطاء صلاحيات للدالة
GRANT EXECUTE ON FUNCTION clean_old_notifications() TO authenticated;

-- ===================================
-- 7. تقرير النتائج
-- ===================================

-- عرض إحصائيات الإشعارات بعد التحديث
DO $$
DECLARE
    like_count INTEGER;
    profile_view_count INTEGER;
    message_count INTEGER;
    match_count INTEGER;
    total_count INTEGER;
BEGIN
    -- عد إشعارات الإعجابات
    SELECT COUNT(*) INTO like_count 
    FROM public.notifications 
    WHERE type = 'like' AND message = 'notifications.content.like.message';
    
    -- عد إشعارات مشاهدة الملفات
    SELECT COUNT(*) INTO profile_view_count 
    FROM public.notifications 
    WHERE type = 'profile_view' AND message = 'notifications.content.profileView.message';
    
    -- عد إشعارات الرسائل
    SELECT COUNT(*) INTO message_count 
    FROM public.notifications 
    WHERE type = 'message' AND message = 'notifications.content.message.message';
    
    -- عد إشعارات المطابقات
    SELECT COUNT(*) INTO match_count 
    FROM public.notifications 
    WHERE type = 'match' AND message = 'notifications.content.match.message';
    
    -- العدد الإجمالي
    total_count := like_count + profile_view_count + message_count + match_count;
    
    -- عرض النتائج
    RAISE NOTICE '📊 تقرير تحديث الإشعارات:';
    RAISE NOTICE '   💖 إشعارات الإعجابات المحدثة: %', like_count;
    RAISE NOTICE '   👁️ إشعارات مشاهدة الملفات المحدثة: %', profile_view_count;
    RAISE NOTICE '   💬 إشعارات الرسائل المحدثة: %', message_count;
    RAISE NOTICE '   💕 إشعارات المطابقات المحدثة: %', match_count;
    RAISE NOTICE '   📈 إجمالي الإشعارات المحدثة: %', total_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ تم تحديث جميع الإشعارات الموجودة لاستخدام مفاتيح الترجمة الجديدة!';
    RAISE NOTICE '🔄 الآن ستظهر أسماء المستخدمين الحقيقية بدلاً من {{name}}';
END;
$$;

-- إنهاء المعاملة
COMMIT;

-- ===================================
-- 8. تعليمات ما بعد التحديث
-- ===================================

RAISE NOTICE '';
RAISE NOTICE '📋 تعليمات ما بعد التحديث:';
RAISE NOTICE '1. 🔄 أعد تحميل صفحة التطبيق';
RAISE NOTICE '2. 🔔 انقر على أيقونة الإشعارات في الهيدر';
RAISE NOTICE '3. ✅ تحقق من ظهور أسماء المستخدمين الحقيقية';
RAISE NOTICE '4. 🧪 جرب إنشاء إشعار جديد (إعجاب بملف شخصي)';
RAISE NOTICE '5. 📧 تحقق من الإشعارات البريدية الجديدة';
RAISE NOTICE '';
RAISE NOTICE '🎉 تم إصلاح مشكلة {{name}} بالكامل!';
