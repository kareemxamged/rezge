-- نظام التنبيهات والتحذيرات الشامل لمنصة رزقي
-- تم التطوير في: 14-08-2025

-- ===================================
-- جدول التنبيهات العامة
-- ===================================

CREATE TABLE IF NOT EXISTS public.global_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- معلومات التنبيه الأساسية
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    alert_type VARCHAR(50) DEFAULT 'info' CHECK (alert_type IN ('info', 'warning', 'error', 'success', 'announcement')),
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5), -- 1 = منخفض، 5 = عاجل
    
    -- إعدادات العرض
    is_active BOOLEAN DEFAULT true,
    show_as_popup BOOLEAN DEFAULT true,
    auto_dismiss_after INTEGER, -- بالثواني، null = لا يختفي تلقائياً
    
    -- معلومات المرسل
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_by_name VARCHAR(200), -- اسم المرسل للعرض
    
    -- إعدادات الاستهداف
    target_all_users BOOLEAN DEFAULT true,
    target_user_ids JSONB DEFAULT '[]'::jsonb, -- قائمة معرفات المستخدمين المحددين
    target_user_roles JSONB DEFAULT '[]'::jsonb, -- أدوار المستخدمين المستهدفة
    
    -- إعدادات التوقيت
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ, -- null = لا ينتهي
    
    -- إحصائيات
    total_views INTEGER DEFAULT 0,
    total_dismissals INTEGER DEFAULT 0,
    
    -- معلومات إضافية
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- طوابع زمنية
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- جدول حالة قراءة التنبيهات للمستخدمين
-- ===================================

CREATE TABLE IF NOT EXISTS public.user_alert_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- المراجع
    alert_id UUID NOT NULL REFERENCES public.global_alerts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- حالة التفاعل
    is_viewed BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false, -- "عدم عرض مجدداً"
    
    -- معلومات التفاعل
    first_viewed_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    hidden_at TIMESTAMPTZ,
    
    -- معلومات إضافية
    view_count INTEGER DEFAULT 0,
    user_agent TEXT,
    ip_address INET,
    
    -- طوابع زمنية
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- قيد فريد لمنع التكرار
    UNIQUE(alert_id, user_id)
);

-- ===================================
-- جدول سجل أنشطة التنبيهات
-- ===================================

CREATE TABLE IF NOT EXISTS public.alert_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- المراجع
    alert_id UUID NOT NULL REFERENCES public.global_alerts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- نوع النشاط
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
        'created', 'updated', 'activated', 'deactivated', 'deleted',
        'viewed', 'dismissed', 'hidden', 'clicked'
    )),
    
    -- تفاصيل النشاط
    activity_description TEXT,
    old_values JSONB,
    new_values JSONB,
    
    -- معلومات السياق
    user_agent TEXT,
    ip_address INET,
    session_id VARCHAR(255),
    
    -- طابع زمني
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- الفهارس المحسنة للأداء
-- ===================================

-- فهارس جدول التنبيهات العامة
CREATE INDEX IF NOT EXISTS idx_global_alerts_active ON public.global_alerts(is_active, start_date, end_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_global_alerts_priority ON public.global_alerts(priority DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_global_alerts_created_by ON public.global_alerts(created_by);
CREATE INDEX IF NOT EXISTS idx_global_alerts_dates ON public.global_alerts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_global_alerts_type ON public.global_alerts(alert_type);

-- فهارس جدول حالة المستخدمين
CREATE INDEX IF NOT EXISTS idx_user_alert_status_user ON public.user_alert_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alert_status_alert ON public.user_alert_status(alert_id);
CREATE INDEX IF NOT EXISTS idx_user_alert_status_unread ON public.user_alert_status(user_id, is_viewed) WHERE is_viewed = false;
CREATE INDEX IF NOT EXISTS idx_user_alert_status_active ON public.user_alert_status(user_id, is_dismissed, is_hidden) WHERE is_dismissed = false AND is_hidden = false;

-- فهارس جدول سجل الأنشطة
CREATE INDEX IF NOT EXISTS idx_alert_activity_log_alert ON public.alert_activity_log(alert_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_activity_log_user ON public.alert_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_activity_log_admin ON public.alert_activity_log(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_activity_log_type ON public.alert_activity_log(activity_type, created_at DESC);

-- ===================================
-- الدوال المساعدة
-- ===================================

-- دالة تحديث الطابع الزمني
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- تطبيق الدالة على الجداول
DROP TRIGGER IF EXISTS update_global_alerts_updated_at ON public.global_alerts;
CREATE TRIGGER update_global_alerts_updated_at
    BEFORE UPDATE ON public.global_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_alert_status_updated_at ON public.user_alert_status;
CREATE TRIGGER update_user_alert_status_updated_at
    BEFORE UPDATE ON public.user_alert_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- دالة الحصول على التنبيهات النشطة للمستخدم
-- ===================================

CREATE OR REPLACE FUNCTION get_active_alerts_for_user(p_user_id UUID)
RETURNS TABLE (
    alert_id UUID,
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
        AND (uas.is_hidden IS NULL OR uas.is_hidden = false)
    ORDER BY ga.priority DESC, ga.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- دالة تسجيل نشاط التنبيه
-- ===================================

CREATE OR REPLACE FUNCTION log_alert_activity(
    p_alert_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_admin_user_id UUID DEFAULT NULL,
    p_activity_type VARCHAR(50),
    p_description TEXT DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO public.alert_activity_log (
        alert_id, user_id, admin_user_id, activity_type,
        activity_description, old_values, new_values,
        user_agent, ip_address
    ) VALUES (
        p_alert_id, p_user_id, p_admin_user_id, p_activity_type,
        p_description, p_old_values, p_new_values,
        p_user_agent, p_ip_address
    ) RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- سياسات الأمان (RLS)
-- ===================================

-- تفعيل RLS على الجداول
ALTER TABLE public.global_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_alert_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_activity_log ENABLE ROW LEVEL SECURITY;

-- سياسات جدول التنبيهات العامة
CREATE POLICY "المشرفون يمكنهم عرض جميع التنبيهات" ON public.global_alerts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "المشرفون يمكنهم إنشاء التنبيهات" ON public.global_alerts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "المشرفون يمكنهم تحديث التنبيهات" ON public.global_alerts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- سياسات جدول حالة المستخدمين
CREATE POLICY "المستخدمون يمكنهم عرض حالتهم فقط" ON public.user_alert_status
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "المستخدمون يمكنهم تحديث حالتهم فقط" ON public.user_alert_status
    FOR ALL USING (user_id = auth.uid());

-- سياسات سجل الأنشطة
CREATE POLICY "المشرفون يمكنهم عرض سجل الأنشطة" ON public.alert_activity_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- ===================================
-- بيانات تجريبية للاختبار
-- ===================================

-- إدراج تنبيه تجريبي
INSERT INTO public.global_alerts (
    title,
    content,
    alert_type,
    priority,
    created_by,
    created_by_name,
    show_as_popup,
    auto_dismiss_after
) VALUES (
    'مرحباً بكم في منصة رزقي المحدثة! 🎉',
    'نحن سعداء لإعلامكم بأن منصة رزقي قد تم تحديثها بميزات جديدة ومحسنة لتوفير تجربة أفضل في البحث عن شريك الحياة وفقاً للضوابط الشرعية. استكشفوا الميزات الجديدة واستمتعوا بتجربة محسنة!',
    'announcement',
    3,
    (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1),
    'إدارة منصة رزقي',
    true,
    30
) ON CONFLICT DO NOTHING;

-- رسالة إتمام
SELECT 'تم إنشاء نظام التنبيهات بنجاح! 🎉' as status;
