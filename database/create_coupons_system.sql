-- ===================================
-- نظام الكوبونات والخصومات - موقع رزقي
-- تاريخ الإنشاء: 06-09-2025
-- ===================================

-- إنشاء جدول الكوبونات (coupons)
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- معلومات الكوبون الأساسية
    code VARCHAR(50) NOT NULL UNIQUE, -- كود الكوبون
    name VARCHAR(100) NOT NULL, -- اسم الكوبون
    description TEXT, -- وصف الكوبون

    -- نوع وقيمة الخصم
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')), -- نوع الخصم
    discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0), -- قيمة الخصم

    -- شروط الاستخدام
    min_order_amount DECIMAL(10,2) DEFAULT 0, -- الحد الأدنى للطلب
    max_discount_amount DECIMAL(10,2), -- الحد الأقصى للخصم (للنسبة المئوية)
    max_uses INTEGER DEFAULT 1, -- عدد الاستخدامات المسموح
    used_count INTEGER DEFAULT 0, -- عدد مرات الاستخدام

    -- التواريخ
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- تاريخ البداية
    expires_at TIMESTAMPTZ NOT NULL, -- تاريخ الانتهاء

    -- الحالة والإعدادات
    is_active BOOLEAN DEFAULT true, -- هل الكوبون نشط
    applicable_plans TEXT[] DEFAULT '{}', -- الباقات المطبقة عليها (فارغ = جميع الباقات)

    -- معلومات الإنشاء
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL, -- من أنشأ الكوبون
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- قيود إضافية
    CHECK (expires_at > starts_at), -- تاريخ الانتهاء بعد البداية
    CHECK (used_count <= max_uses) -- عدد الاستخدامات لا يتجاوز المسموح
);

-- إنشاء جدول تاريخ استخدام الكوبونات (coupon_usage_history)
CREATE TABLE IF NOT EXISTS public.coupon_usage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- المراجع
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    payment_id VARCHAR(255) REFERENCES public.payments(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,

    -- معلومات الاستخدام
    original_amount DECIMAL(10,2) NOT NULL, -- المبلغ الأصلي
    discount_amount DECIMAL(10,2) NOT NULL, -- مبلغ الخصم
    final_amount DECIMAL(10,2) NOT NULL, -- المبلغ النهائي

    -- معلومات إضافية
    ip_address INET, -- عنوان IP
    user_agent TEXT, -- معلومات المتصفح
    metadata JSONB DEFAULT '{}', -- بيانات إضافية

    -- طابع زمني
    used_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- الفهارس لتحسين الأداء
-- ===================================

-- فهارس جدول الكوبونات
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_expires_at ON public.coupons(expires_at);
CREATE INDEX IF NOT EXISTS idx_coupons_starts_at ON public.coupons(starts_at);
CREATE INDEX IF NOT EXISTS idx_coupons_created_by ON public.coupons(created_by);

-- فهارس جدول تاريخ الاستخدام
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON public.coupon_usage_history(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON public.coupon_usage_history(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_used_at ON public.coupon_usage_history(used_at);

-- ===================================
-- الدوال المساعدة
-- ===================================

-- دالة للتحقق من صحة الكوبون
CREATE OR REPLACE FUNCTION validate_coupon(p_code VARCHAR, p_user_id UUID, p_amount DECIMAL)
RETURNS TABLE (
    is_valid BOOLEAN,
    coupon_id UUID,
    discount_amount DECIMAL,
    final_amount DECIMAL,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_coupon RECORD;
    v_discount_amount DECIMAL;
    v_final_amount DECIMAL;
    v_user_usage_count INTEGER;
BEGIN
    -- البحث عن الكوبون
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE code = p_code AND is_active = true;

    -- التحقق من وجود الكوبون
    IF v_coupon IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL, p_amount, 'كود الكوبون غير صحيح أو غير نشط';
        RETURN;
    END IF;

    -- التحقق من تاريخ الصلاحية
    IF NOW() < v_coupon.starts_at THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL, p_amount, 'كود الكوبون لم يصبح نشطاً بعد';
        RETURN;
    END IF;

    IF NOW() > v_coupon.expires_at THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL, p_amount, 'كود الكوبون منتهي الصلاحية';
        RETURN;
    END IF;

    -- التحقق من عدد الاستخدامات الإجمالي
    IF v_coupon.used_count >= v_coupon.max_uses THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL, p_amount, 'تم استنفاد عدد استخدامات هذا الكوبون';
        RETURN;
    END IF;

    -- التحقق من استخدام المستخدم للكوبون من قبل
    SELECT COUNT(*) INTO v_user_usage_count
    FROM public.coupon_usage_history
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id;

    IF v_user_usage_count > 0 THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL, p_amount, 'لقد استخدمت هذا الكوبون من قبل';
        RETURN;
    END IF;

    -- التحقق من الحد الأدنى للطلب
    IF p_amount < v_coupon.min_order_amount THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL, p_amount, 
            'المبلغ أقل من الحد الأدنى المطلوب (' || v_coupon.min_order_amount || ' ريال)';
        RETURN;
    END IF;

    -- حساب مبلغ الخصم
    IF v_coupon.discount_type = 'percentage' THEN
        v_discount_amount := (p_amount * v_coupon.discount_value) / 100;
        -- تطبيق الحد الأقصى للخصم إن وجد
        IF v_coupon.max_discount_amount IS NOT NULL AND v_discount_amount > v_coupon.max_discount_amount THEN
            v_discount_amount := v_coupon.max_discount_amount;
        END IF;
    ELSE
        v_discount_amount := v_coupon.discount_value;
        -- التأكد من أن الخصم لا يتجاوز المبلغ الأصلي
        IF v_discount_amount > p_amount THEN
            v_discount_amount := p_amount;
        END IF;
    END IF;

    v_final_amount := p_amount - v_discount_amount;

    RETURN QUERY SELECT true, v_coupon.id, v_discount_amount, v_final_amount, NULL::TEXT;
END;
$$;

-- دالة لتطبيق الكوبون وتسجيل الاستخدام
CREATE OR REPLACE FUNCTION apply_coupon(
    p_code VARCHAR,
    p_user_id UUID,
    p_payment_id VARCHAR,
    p_subscription_id UUID,
    p_original_amount DECIMAL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    discount_amount DECIMAL,
    final_amount DECIMAL,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_validation RECORD;
    v_coupon_id UUID;
BEGIN
    -- التحقق من صحة الكوبون
    SELECT * INTO v_validation
    FROM validate_coupon(p_code, p_user_id, p_original_amount);

    IF NOT v_validation.is_valid THEN
        RETURN QUERY SELECT false, 0::DECIMAL, p_original_amount, v_validation.error_message;
        RETURN;
    END IF;

    v_coupon_id := v_validation.coupon_id;

    -- تسجيل استخدام الكوبون
    INSERT INTO public.coupon_usage_history (
        coupon_id, user_id, payment_id, subscription_id,
        original_amount, discount_amount, final_amount,
        ip_address, user_agent
    ) VALUES (
        v_coupon_id, p_user_id, p_payment_id, p_subscription_id,
        p_original_amount, v_validation.discount_amount, v_validation.final_amount,
        p_ip_address, p_user_agent
    );

    -- تحديث عداد الاستخدام
    UPDATE public.coupons
    SET used_count = used_count + 1,
        updated_at = NOW()
    WHERE id = v_coupon_id;

    RETURN QUERY SELECT true, v_validation.discount_amount, v_validation.final_amount, 'تم تطبيق الكوبون بنجاح';
END;
$$;

-- دالة للحصول على إحصائيات الكوبون
CREATE OR REPLACE FUNCTION get_coupon_stats(p_coupon_id UUID)
RETURNS TABLE (
    total_usage INTEGER,
    total_discount_amount DECIMAL,
    unique_users INTEGER,
    avg_discount_amount DECIMAL,
    last_used_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_usage,
        COALESCE(SUM(discount_amount), 0) as total_discount_amount,
        COUNT(DISTINCT user_id)::INTEGER as unique_users,
        COALESCE(AVG(discount_amount), 0) as avg_discount_amount,
        MAX(used_at) as last_used_at
    FROM public.coupon_usage_history
    WHERE coupon_id = p_coupon_id;
END;
$$;

-- ===================================
-- Triggers للتحديث التلقائي
-- ===================================

-- دالة تحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق التحديث التلقائي على جدول الكوبونات
DROP TRIGGER IF EXISTS update_coupons_updated_at ON public.coupons;
CREATE TRIGGER update_coupons_updated_at
    BEFORE UPDATE ON public.coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- سياسات الأمان (RLS)
-- ===================================

-- تفعيل RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage_history ENABLE ROW LEVEL SECURITY;

-- سياسات الكوبونات
CREATE POLICY "Users can view active coupons" ON public.coupons
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage all coupons" ON public.coupons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- سياسات تاريخ الاستخدام
CREATE POLICY "Users can view their own usage history" ON public.coupon_usage_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage history" ON public.coupon_usage_history
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all usage history" ON public.coupon_usage_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- ===================================
-- منح الصلاحيات
-- ===================================

GRANT SELECT ON public.coupons TO authenticated;
GRANT SELECT ON public.coupon_usage_history TO authenticated;
GRANT EXECUTE ON FUNCTION validate_coupon(VARCHAR, UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_coupon(VARCHAR, UUID, VARCHAR, UUID, DECIMAL, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_coupon_stats(UUID) TO authenticated;

-- ===================================
-- إدراج بيانات تجريبية
-- ===================================

-- إدراج كوبونات تجريبية
INSERT INTO public.coupons (
    code, name, description, discount_type, discount_value,
    min_order_amount, max_discount_amount, max_uses,
    starts_at, expires_at, is_active
) VALUES
-- كوبون ترحيبي
(
    'WELCOME20', 'كوبون ترحيبي', 'خصم 20% للمستخدمين الجدد',
    'percentage', 20.00, 50.00, 50.00, 100,
    NOW(), NOW() + INTERVAL '30 days', true
),
-- كوبون مبلغ ثابت
(
    'SAVE10', 'وفر 10 ريال', 'خصم 10 ريال على أي باقة',
    'fixed', 10.00, 30.00, NULL, 50,
    NOW(), NOW() + INTERVAL '15 days', true
),
-- كوبون VIP
(
    'VIP50', 'خصم VIP', 'خصم 50% على باقة VIP فقط',
    'percentage', 50.00, 99.00, 50.00, 20,
    NOW(), NOW() + INTERVAL '7 days', true
)
ON CONFLICT (code) DO NOTHING;
