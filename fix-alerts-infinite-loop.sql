-- ===================================
-- إصلاح مشكلة الحلقة اللا نهائية في نظام التنبيهات
-- ===================================

-- المشكلة: دالة get_active_alerts_for_user لا تفلتر التنبيهات المُغلقة (is_dismissed = true)
-- مما يؤدي إلى ظهور التنبيهات مرة أخرى حتى بعد إغلاقها

-- الحل: تحديث الدالة لتفلتر التنبيهات المُغلقة والمخفية

CREATE OR REPLACE FUNCTION get_active_alerts_for_user(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    title VARCHAR(200),
    content TEXT,
    alert_type VARCHAR(50),
    priority INTEGER,
    show_as_popup BOOLEAN,
    auto_dismiss_after INTEGER,
    created_by_name VARCHAR(200),
    created_at TIMESTAMPTZ,
    is_viewed BOOLEAN,
    is_dismissed BOOLEAN,
    is_hidden BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ga.id,
        ga.title,
        ga.content,
        ga.alert_type,
        ga.priority,
        ga.show_as_popup,
        ga.auto_dismiss_after,
        ga.created_by_name,
        ga.created_at,
        COALESCE(uas.is_viewed, false),
        COALESCE(uas.is_dismissed, false),
        COALESCE(uas.is_hidden, false)
    FROM public.global_alerts ga
    LEFT JOIN public.user_alert_status uas ON ga.id = uas.alert_id AND uas.user_id = p_user_id
    WHERE ga.is_active = true
        AND (ga.start_date IS NULL OR ga.start_date <= NOW())
        AND (ga.end_date IS NULL OR ga.end_date > NOW())
        AND (
            ga.target_all_users = true 
            OR p_user_id = ANY(SELECT jsonb_array_elements_text(ga.target_user_ids)::UUID)
        )
        -- إصلاح المشكلة: فلترة التنبيهات المُغلقة والمخفية
        AND (uas.is_dismissed IS NULL OR uas.is_dismissed = false)
        AND (uas.is_hidden IS NULL OR uas.is_hidden = false)
    ORDER BY ga.priority DESC, ga.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- تحسين فهرس للأداء
-- ===================================

-- إنشاء فهرس مركب لتحسين أداء الاستعلامات
CREATE INDEX IF NOT EXISTS idx_user_alert_status_dismissed_hidden 
ON public.user_alert_status(user_id, is_dismissed, is_hidden) 
WHERE is_dismissed = false AND is_hidden = false;

-- ===================================
-- دالة مساعدة لتنظيف التنبيهات المنتهية الصلاحية
-- ===================================

CREATE OR REPLACE FUNCTION cleanup_expired_alerts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- حذف التنبيهات المنتهية الصلاحية
    DELETE FROM public.global_alerts 
    WHERE end_date IS NOT NULL 
    AND end_date < NOW() 
    AND is_active = false;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- تسجيل العملية
    INSERT INTO public.alert_activity_log (
        alert_id, 
        activity_type, 
        activity_description,
        created_at
    ) 
    SELECT 
        NULL,
        'cleanup',
        'تم حذف ' || deleted_count || ' تنبيه منتهي الصلاحية',
        NOW()
    WHERE deleted_count > 0;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- اختبار الدالة المحدثة
-- ===================================

-- يمكن تشغيل هذا الاستعلام لاختبار الدالة:
-- SELECT * FROM get_active_alerts_for_user('USER_ID_HERE');

-- ===================================
-- ملاحظات للمطورين
-- ===================================

/*
الإصلاحات المطبقة:

1. إضافة شرط فلترة التنبيهات المُغلقة:
   AND (uas.is_dismissed IS NULL OR uas.is_dismissed = false)

2. الاحتفاظ بشرط فلترة التنبيهات المخفية:
   AND (uas.is_hidden IS NULL OR uas.is_hidden = false)

3. إنشاء فهرس مركب لتحسين الأداء

4. إضافة دالة تنظيف التنبيهات المنتهية الصلاحية

هذا سيحل مشكلة ظهور التنبيهات مرة أخرى بعد إغلاقها.
*/
