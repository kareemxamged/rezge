-- إنشاء نظام توثيق الهوية الشخصية
-- تاريخ الإنشاء: 20-08-2025
-- الغرض: إنشاء جداول نظام التوثيق الشامل للمستخدمين

-- جدول طلبات التوثيق الرئيسي
CREATE TABLE IF NOT EXISTS public.verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- بيانات المرحلة الأولى - المعلومات الشخصية
    full_name_arabic VARCHAR(255) NOT NULL,
    full_name_english VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    nationality VARCHAR(100) NOT NULL,
    
    -- بيانات المرحلة الثانية - نوع المستند
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('passport', 'national_id')),
    
    -- بيانات المرحلة الثالثة - تفاصيل المستند
    document_number VARCHAR(100) NOT NULL,
    document_issue_date DATE NOT NULL,
    document_expiry_date DATE NOT NULL,
    issuing_authority VARCHAR(255),
    
    -- بيانات المرحلة الرابعة - صور المستند
    document_front_image_url TEXT,
    document_back_image_url TEXT,
    
    -- بيانات المرحلة الخامسة - صورة السيلفي
    selfie_image_url TEXT,
    
    -- حالة الطلب ومعلومات المراجعة
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'expired')),
    priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
    
    -- معلومات المراجعة الإدارية
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    rejection_reason TEXT,
    
    -- معلومات إضافية
    ip_address INET,
    user_agent TEXT,
    submission_step INTEGER DEFAULT 5 CHECK (submission_step >= 1 AND submission_step <= 5),
    
    -- التواريخ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- فهرس فريد لمنع تكرار الطلبات النشطة
    UNIQUE(user_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- جدول سجل التوثيق (للاحتفاظ بتاريخ جميع الطلبات)
CREATE TABLE IF NOT EXISTS public.verification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    verification_request_id UUID REFERENCES public.verification_requests(id) ON DELETE SET NULL,
    
    action VARCHAR(50) NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'expired', 'cancelled')),
    status_from VARCHAR(50),
    status_to VARCHAR(50),
    
    performed_by UUID REFERENCES public.users(id),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول إعدادات نظام التوثيق
CREATE TABLE IF NOT EXISTS public.verification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إدراج الإعدادات الافتراضية
INSERT INTO public.verification_settings (setting_key, setting_value, description) VALUES
('max_file_size_mb', '10', 'الحد الأقصى لحجم الملف بالميجابايت'),
('allowed_image_formats', 'jpg,jpeg,png,webp', 'صيغ الصور المسموحة'),
('request_expiry_days', '30', 'مدة انتهاء صلاحية الطلب بالأيام'),
('auto_approve_enabled', 'false', 'تفعيل الموافقة التلقائية'),
('require_selfie', 'true', 'إلزامية صورة السيلفي'),
('min_document_resolution', '1024x768', 'الحد الأدنى لدقة صور المستندات')
ON CONFLICT (setting_key) DO NOTHING;

-- إنشاء الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON public.verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON public.verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_created_at ON public.verification_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_verification_requests_reviewed_by ON public.verification_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_verification_history_user_id ON public.verification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_request_id ON public.verification_history(verification_request_id);

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_verification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء triggers لتحديث updated_at
CREATE TRIGGER trigger_verification_requests_updated_at
    BEFORE UPDATE ON public.verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_verification_updated_at();

CREATE TRIGGER trigger_verification_settings_updated_at
    BEFORE UPDATE ON public.verification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_verification_updated_at();

-- دالة لإنشاء سجل في جدول التاريخ عند تغيير الحالة
CREATE OR REPLACE FUNCTION log_verification_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- إدراج سجل في جدول التاريخ عند تغيير الحالة
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.verification_history (
            user_id,
            verification_request_id,
            action,
            status_from,
            status_to,
            performed_by,
            notes
        ) VALUES (
            NEW.user_id,
            NEW.id,
            NEW.status,
            OLD.status,
            NEW.status,
            NEW.reviewed_by,
            NEW.admin_notes
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتسجيل تغييرات الحالة
CREATE TRIGGER trigger_log_verification_status_change
    AFTER UPDATE ON public.verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_verification_status_change();

-- دالة لتحديث حالة المستخدم عند الموافقة على التوثيق
CREATE OR REPLACE FUNCTION update_user_verification_status()
RETURNS TRIGGER AS $$
BEGIN
    -- عند الموافقة على التوثيق، تحديث حالة المستخدم
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        UPDATE public.users 
        SET 
            verified = true,
            updated_at = NOW()
        WHERE id = NEW.user_id;
        
        -- إدراج إشعار للمستخدم
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            data,
            created_at
        ) VALUES (
            NEW.user_id,
            'verification_approved',
            'تم توثيق حسابك بنجاح',
            'تهانينا! تم توثيق هويتك الشخصية بنجاح. يمكنك الآن الاستفادة من جميع مميزات الموقع.',
            jsonb_build_object('verification_request_id', NEW.id),
            NOW()
        );
    END IF;
    
    -- عند رفض التوثيق، إرسال إشعار
    IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            data,
            created_at
        ) VALUES (
            NEW.user_id,
            'verification_rejected',
            'تم رفض طلب التوثيق',
            COALESCE('تم رفض طلب توثيق هويتك. السبب: ' || NEW.rejection_reason, 'تم رفض طلب توثيق هويتك. يرجى المحاولة مرة أخرى.'),
            jsonb_build_object('verification_request_id', NEW.id, 'rejection_reason', NEW.rejection_reason),
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث حالة المستخدم
CREATE TRIGGER trigger_update_user_verification_status
    AFTER UPDATE ON public.verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_user_verification_status();

-- تفعيل Row Level Security
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_settings ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للمستخدمين
CREATE POLICY "Users can view their own verification requests" ON public.verification_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verification requests" ON public.verification_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending verification requests" ON public.verification_requests
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- سياسات الأمان للإداريين (سيتم تحديثها لاحقاً)
CREATE POLICY "Admins can view all verification requests" ON public.verification_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users au 
            JOIN public.users u ON au.user_id = u.id 
            WHERE u.id = auth.uid() AND au.is_active = true
        )
    );

CREATE POLICY "Admins can update verification requests" ON public.verification_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.admin_users au 
            JOIN public.users u ON au.user_id = u.id 
            WHERE u.id = auth.uid() AND au.is_active = true
        )
    );

-- سياسات للتاريخ
CREATE POLICY "Users can view their own verification history" ON public.verification_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all verification history" ON public.verification_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users au 
            JOIN public.users u ON au.user_id = u.id 
            WHERE u.id = auth.uid() AND au.is_active = true
        )
    );

-- سياسات للإعدادات (للإداريين فقط)
CREATE POLICY "Admins can manage verification settings" ON public.verification_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_users au 
            JOIN public.users u ON au.user_id = u.id 
            WHERE u.id = auth.uid() AND au.is_active = true
        )
    );

-- إضافة تعليقات للجداول
COMMENT ON TABLE public.verification_requests IS 'جدول طلبات توثيق الهوية الشخصية';
COMMENT ON TABLE public.verification_history IS 'سجل تاريخ جميع عمليات التوثيق';
COMMENT ON TABLE public.verification_settings IS 'إعدادات نظام التوثيق';

-- إضافة تعليقات للأعمدة المهمة
COMMENT ON COLUMN public.verification_requests.status IS 'حالة الطلب: pending, under_review, approved, rejected, expired';
COMMENT ON COLUMN public.verification_requests.document_type IS 'نوع المستند: passport, national_id';
COMMENT ON COLUMN public.verification_requests.submission_step IS 'المرحلة المكتملة من عملية التوثيق (1-5)';
COMMENT ON COLUMN public.verification_requests.priority IS 'أولوية المراجعة (1-5، 5 الأعلى)';
