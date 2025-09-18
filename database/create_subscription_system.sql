-- ===================================
-- نظام الاشتراكات والباقات - موقع رزقي
-- تاريخ الإنشاء: 27-08-2025
-- ===================================

-- إنشاء جدول خطط الاشتراك (subscription_plans)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- معلومات الخطة الأساسية
    name VARCHAR(100) NOT NULL, -- اسم الخطة
    name_en VARCHAR(100) NOT NULL, -- اسم الخطة بالإنجليزية
    description TEXT, -- وصف الخطة
    description_en TEXT, -- وصف الخطة بالإنجليزية

    -- التسعير
    price DECIMAL(10,2) NOT NULL DEFAULT 0, -- السعر بالريال السعودي
    currency VARCHAR(3) DEFAULT 'SAR', -- العملة
    billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly', -- فترة الفوترة

    -- المميزات والحدود
    features JSONB DEFAULT '{}', -- مميزات الخطة
    limits JSONB DEFAULT '{}', -- حدود الخطة

    -- إعدادات الخطة
    is_active BOOLEAN DEFAULT true, -- هل الخطة نشطة
    is_default BOOLEAN DEFAULT false, -- هل هي الخطة الافتراضية
    is_trial BOOLEAN DEFAULT false, -- هل هي خطة تجريبية
    trial_days INTEGER DEFAULT 0, -- عدد أيام التجربة

    -- ترتيب العرض
    sort_order INTEGER DEFAULT 0,

    -- طوابع زمنية
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول اشتراكات المستخدمين (user_subscriptions)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- المراجع
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,

    -- معلومات الاشتراك
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'suspended')),

    -- التواريخ
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    cancelled_at TIMESTAMPTZ,

    -- معلومات الدفع
    payment_method VARCHAR(50), -- طريقة الدفع
    payment_reference VARCHAR(255), -- مرجع الدفعة
    amount_paid DECIMAL(10,2), -- المبلغ المدفوع

    -- الفترة التجريبية
    is_trial BOOLEAN DEFAULT false,
    trial_started_at TIMESTAMPTZ,
    trial_expires_at TIMESTAMPTZ,
    trial_used BOOLEAN DEFAULT false, -- هل استخدم المستخدم الفترة التجريبية من قبل

    -- التجديد التلقائي
    auto_renew BOOLEAN DEFAULT true,
    next_billing_date TIMESTAMPTZ,

    -- معلومات إضافية
    metadata JSONB DEFAULT '{}',
    notes TEXT,

    -- طوابع زمنية
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- فهارس وقيود
    UNIQUE(user_id, plan_id, started_at) -- منع الاشتراكات المكررة في نفس الوقت
);

-- إنشاء جدول تاريخ الاشتراكات (subscription_history)
CREATE TABLE IF NOT EXISTS public.subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- المراجع
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,

    -- معلومات الحدث
    action VARCHAR(50) NOT NULL, -- created, renewed, cancelled, expired, upgraded, downgraded
    status_from VARCHAR(20),
    status_to VARCHAR(20),

    -- تفاصيل إضافية
    amount DECIMAL(10,2),
    payment_reference VARCHAR(255),
    notes TEXT,
    metadata JSONB DEFAULT '{}',

    -- معلومات النظام
    performed_by UUID REFERENCES public.users(id), -- من قام بالإجراء (للإجراءات الإدارية)
    ip_address INET,
    user_agent TEXT,

    -- طابع زمني
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول الفترات التجريبية (trial_periods)
CREATE TABLE IF NOT EXISTS public.trial_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- المراجع
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,

    -- معلومات الفترة التجريبية
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'converted', 'cancelled')),

    -- التحويل للاشتراك المدفوع
    converted_to_subscription_id UUID REFERENCES public.user_subscriptions(id),
    converted_at TIMESTAMPTZ,

    -- معلومات إضافية
    features_used JSONB DEFAULT '{}', -- المميزات التي استخدمها المستخدم
    usage_stats JSONB DEFAULT '{}', -- إحصائيات الاستخدام

    -- طوابع زمنية
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- قيد فريد - مستخدم واحد لكل خطة
    UNIQUE(user_id, plan_id)
);

-- ===================================
-- الفهارس لتحسين الأداء
-- ===================================

-- فهارس جدول user_subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON public.user_subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_trial ON public.user_subscriptions(is_trial, trial_expires_at);

-- فهارس جدول subscription_history
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON public.subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_action ON public.subscription_history(action);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON public.subscription_history(created_at);

-- فهارس جدول trial_periods
CREATE INDEX IF NOT EXISTS idx_trial_periods_user_id ON public.trial_periods(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_periods_status ON public.trial_periods(status);
CREATE INDEX IF NOT EXISTS idx_trial_periods_expires_at ON public.trial_periods(expires_at);

-- فهارس جدول subscription_plans
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_sort ON public.subscription_plans(sort_order);
-- فهرس فريد للباقة الافتراضية (باقة افتراضية واحدة فقط)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_plans_default ON public.subscription_plans(is_default) WHERE is_default = true;

-- ===================================
-- إدراج الخطط الافتراضية
-- ===================================

-- إدراج الخطط الجديدة
INSERT INTO public.subscription_plans (
    name, name_en, description, description_en,
    price, billing_period, features, limits,
    is_active, is_default, sort_order
) VALUES
-- الباقة الأساسية (بدلاً من المجانية)
(
    'الباقة الأساسية', 'Basic Plan',
    'باقة أساسية بمميزات محدودة للبدء', 'Basic plan with limited features to get started',
    19.00, 'monthly',
    '{"messaging": true, "basic_search": true, "profile_views": true, "limited_messages": true}',
    '{"messages_per_month": 20, "profile_views_per_day": 10, "advanced_search": false}',
    true, true, 1
),
-- الباقة المميزة
(
    'الباقة المميزة', 'Premium Plan',
    'باقة متقدمة بمميزات إضافية', 'Advanced plan with additional features',
    49.00, 'monthly',
    '{"unlimited_messaging": true, "advanced_search": true, "profile_views": true, "who_viewed_me": true, "ad_free": true}',
    '{"messages_per_month": -1, "profile_views_per_day": -1, "advanced_search": true}',
    true, false, 2
),
-- باقة VIP
(
    'باقة VIP', 'VIP Plan',
    'باقة VIP بجميع المميزات المتقدمة', 'VIP plan with all premium features',
    99.00, 'monthly',
    '{"unlimited_messaging": true, "advanced_search": true, "priority_listing": true, "consultation": true, "dedicated_support": true, "premium_verification": true}',
    '{"messages_per_month": -1, "profile_views_per_day": -1, "priority_support": true}',
    true, false, 3
),
-- الفترة التجريبية
(
    'فترة تجريبية', 'Trial Period',
    'فترة تجريبية مجانية لمدة 3 أيام', 'Free 3-day trial period',
    0.00, 'trial',
    '{"messaging": true, "basic_search": true, "profile_views": true, "limited_messages": true}',
    '{"messages_per_month": 20, "profile_views_per_day": 10, "trial_days": 3}',
    true, false, 0
)
ON CONFLICT DO NOTHING;

-- ===================================
-- إدراج الخطط الافتراضية
-- ===================================

-- حذف الخطط الموجودة (للتطوير فقط)
DELETE FROM public.subscription_plans;

-- إدراج الخطط الجديدة (3 باقات فقط)
INSERT INTO public.subscription_plans (
    name, name_en, description, description_en,
    price, billing_period, features, limits,
    is_active, is_default, sort_order
) VALUES
-- الباقة الأساسية (مع فترة تجريبية 3 أيام)
(
    'الباقة الأساسية', 'Basic Plan',
    'باقة أساسية بمميزات محدودة - تشمل فترة تجريبية 3 أيام', 'Basic plan with limited features - includes 3-day free trial',
    19.00, 'monthly',
    '{"messaging": true, "basic_search": true, "profile_views": true, "limited_messages": true, "trial_available": true}',
    '{"messages_per_month": 50, "profile_views_per_day": 20, "advanced_search": false, "trial_days": 3}',
    true, true, 1
),
-- الباقة المميزة
(
    'الباقة المميزة', 'Premium Plan',
    'باقة متقدمة بمميزات إضافية ومتقدمة', 'Advanced plan with additional and premium features',
    49.00, 'monthly',
    '{"unlimited_messaging": true, "advanced_search": true, "profile_views": true, "who_viewed_me": true, "ad_free": true, "priority_support": true}',
    '{"messages_per_month": -1, "profile_views_per_day": -1, "advanced_search": true, "priority_support": true}',
    true, false, 2
),
-- باقة VIP
(
    'باقة VIP', 'VIP Plan',
    'باقة VIP بجميع المميزات المتقدمة والدعم المخصص', 'VIP plan with all premium features and dedicated support',
    99.00, 'monthly',
    '{"unlimited_messaging": true, "advanced_search": true, "priority_listing": true, "consultation": true, "dedicated_support": true, "premium_verification": true, "exclusive_features": true}',
    '{"messages_per_month": -1, "profile_views_per_day": -1, "priority_support": true, "dedicated_support": true, "consultation_hours": 2}',
    true, false, 3
);

-- ===================================
-- الدوال المساعدة
-- ===================================

-- دالة للحصول على الاشتراك النشط للمستخدم
CREATE OR REPLACE FUNCTION get_user_active_subscription(p_user_id UUID)
RETURNS TABLE (
    subscription_id UUID,
    plan_id UUID,
    plan_name VARCHAR,
    status VARCHAR,
    expires_at TIMESTAMPTZ,
    is_trial BOOLEAN,
    features JSONB,
    limits JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        us.id as subscription_id,
        us.plan_id,
        sp.name as plan_name,
        us.status,
        us.expires_at,
        us.is_trial,
        sp.features,
        sp.limits
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = p_user_id
    AND us.status = 'active'
    AND us.expires_at > NOW()
    ORDER BY us.created_at DESC
    LIMIT 1;
END;
$$;

-- دالة للتحقق من الفترة التجريبية النشطة
CREATE OR REPLACE FUNCTION get_user_active_trial(p_user_id UUID)
RETURNS TABLE (
    trial_id UUID,
    plan_id UUID,
    plan_name VARCHAR,
    expires_at TIMESTAMPTZ,
    days_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tp.id as trial_id,
        tp.plan_id,
        sp.name as plan_name,
        tp.expires_at,
        EXTRACT(DAY FROM tp.expires_at - NOW())::INTEGER as days_remaining
    FROM public.trial_periods tp
    JOIN public.subscription_plans sp ON tp.plan_id = sp.id
    WHERE tp.user_id = p_user_id
    AND tp.status = 'active'
    AND tp.expires_at > NOW()
    ORDER BY tp.created_at DESC
    LIMIT 1;
END;
$$;

-- دالة لبدء الفترة التجريبية للمستخدم الجديد
CREATE OR REPLACE FUNCTION start_user_trial(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_trial_plan_id UUID;
    v_trial_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- البحث عن خطة الفترة التجريبية
    SELECT id INTO v_trial_plan_id
    FROM public.subscription_plans
    WHERE is_trial = true AND is_active = true
    LIMIT 1;

    IF v_trial_plan_id IS NULL THEN
        RETURN '{"success": false, "error": "No trial plan found"}'::JSONB;
    END IF;

    -- التحقق من عدم استخدام الفترة التجريبية من قبل
    IF EXISTS (
        SELECT 1 FROM public.trial_periods
        WHERE user_id = p_user_id
    ) THEN
        RETURN '{"success": false, "error": "Trial already used"}'::JSONB;
    END IF;

    -- حساب تاريخ انتهاء الفترة التجريبية (3 أيام)
    v_expires_at := NOW() + INTERVAL '3 days';

    -- إنشاء الفترة التجريبية
    INSERT INTO public.trial_periods (
        user_id, plan_id, expires_at
    ) VALUES (
        p_user_id, v_trial_plan_id, v_expires_at
    ) RETURNING id INTO v_trial_id;

    RETURN jsonb_build_object(
        'success', true,
        'trial_id', v_trial_id,
        'expires_at', v_expires_at,
        'days_remaining', 3
    );
END;
$$;

-- إنشاء جدول المدفوعات (payments)
CREATE TABLE IF NOT EXISTS public.payments (
    id VARCHAR(255) PRIMARY KEY, -- معرف الدفعة من نظام الدفع

    -- المراجع
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,

    -- معلومات الدفع
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SAR',
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),

    -- مراجع خارجية
    reference VARCHAR(255), -- مرجع داخلي
    gateway_reference VARCHAR(255), -- مرجع من بوابة الدفع
    gateway_response JSONB DEFAULT '{}', -- استجابة بوابة الدفع

    -- معلومات إضافية
    metadata JSONB DEFAULT '{}',
    notes TEXT,

    -- طوابع زمنية
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ
);

-- إنشاء فهارس للمدفوعات
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(reference);

-- منح الصلاحيات
GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT SELECT ON public.user_subscriptions TO authenticated;
GRANT SELECT ON public.trial_periods TO authenticated;
GRANT SELECT ON public.payments TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_trial(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION start_user_trial(UUID) TO authenticated;
