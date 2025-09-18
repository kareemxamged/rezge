-- إنشاء جدول البلاغات (Reports)
-- تاريخ الإنشاء: 9 أغسطس 2025
-- الغرض: تخزين بلاغات المستخدمين عن السلوك غير المناسب أو المحتوى المخالف

-- بدء المعاملة
BEGIN;

-- إنشاء جدول البلاغات
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reported_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL CHECK (reason IN (
        'inappropriate_behavior',
        'fake_profile',
        'harassment',
        'spam',
        'inappropriate_content',
        'scam_attempt',
        'underage',
        'married_person',
        'other'
    )),
    description TEXT,
    severity VARCHAR(10) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
    admin_notes TEXT,
    admin_action VARCHAR(50),
    resolved_by UUID REFERENCES public.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- منع الإبلاغ المتكرر من نفس المستخدم عن نفس المستخدم في نفس اليوم
    UNIQUE(reporter_id, reported_user_id, DATE(created_at))
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON public.reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_severity ON public.reports(severity);
CREATE INDEX IF NOT EXISTS idx_reports_reason ON public.reports(reason);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_pending ON public.reports(status, created_at) WHERE status = 'pending';

-- إضافة تعليقات للتوثيق
COMMENT ON TABLE public.reports IS 'جدول البلاغات - يتتبع بلاغات المستخدمين عن السلوك غير المناسب';
COMMENT ON COLUMN public.reports.reported_user_id IS 'معرف المستخدم المبلغ عنه';
COMMENT ON COLUMN public.reports.reporter_id IS 'معرف المستخدم الذي قدم البلاغ';
COMMENT ON COLUMN public.reports.reason IS 'سبب البلاغ';
COMMENT ON COLUMN public.reports.description IS 'وصف تفصيلي للبلاغ';
COMMENT ON COLUMN public.reports.severity IS 'درجة خطورة البلاغ: low, medium, high';
COMMENT ON COLUMN public.reports.status IS 'حالة البلاغ: pending, under_review, resolved, dismissed';
COMMENT ON COLUMN public.reports.admin_notes IS 'ملاحظات المشرف';
COMMENT ON COLUMN public.reports.admin_action IS 'الإجراء المتخذ من قبل المشرف';
COMMENT ON COLUMN public.reports.resolved_by IS 'معرف المشرف الذي حل البلاغ';
COMMENT ON COLUMN public.reports.resolved_at IS 'تاريخ ووقت حل البلاغ';

-- إنشاء دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء مشغل لتحديث updated_at
DROP TRIGGER IF EXISTS trigger_update_reports_updated_at ON public.reports;
CREATE TRIGGER trigger_update_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION update_reports_updated_at();

-- تفعيل Row Level Security (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات RLS

-- سياسة القراءة: المستخدمون يمكنهم رؤية البلاغات التي قدموها فقط
CREATE POLICY "Users can view their own reports" ON public.reports
    FOR SELECT USING (auth.uid() = reporter_id);

-- سياسة الإدراج: المستخدمون يمكنهم إنشاء بلاغات جديدة
CREATE POLICY "Users can create reports" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- سياسة التحديث: المستخدمون لا يمكنهم تحديث البلاغات (للمشرفين فقط)
-- سيتم إضافة سياسة للمشرفين لاحقاً

-- سياسة الحذف: المستخدمون لا يمكنهم حذف البلاغات
-- البلاغات تبقى للمراجعة الإدارية

-- إنشاء دالة للتحقق من حدود الإبلاغ
CREATE OR REPLACE FUNCTION check_report_limits(
    reporter_user_id UUID,
    reported_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    daily_reports_count INTEGER;
    recent_report_exists BOOLEAN;
BEGIN
    -- التحقق من عدد البلاغات اليومية (حد أقصى 5 بلاغات يومياً)
    SELECT COUNT(*) INTO daily_reports_count
    FROM public.reports
    WHERE reporter_id = reporter_user_id
    AND DATE(created_at) = CURRENT_DATE;
    
    IF daily_reports_count >= 5 THEN
        RETURN FALSE;
    END IF;
    
    -- التحقق من وجود بلاغ حديث عن نفس المستخدم (خلال 24 ساعة)
    SELECT EXISTS(
        SELECT 1 FROM public.reports
        WHERE reporter_id = reporter_user_id
        AND reported_user_id = reported_user_id
        AND created_at > NOW() - INTERVAL '24 hours'
    ) INTO recent_report_exists;
    
    IF recent_report_exists THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء دالة لإحصائيات البلاغات
CREATE OR REPLACE FUNCTION get_report_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_reports', (SELECT COUNT(*) FROM public.reports),
        'pending_reports', (SELECT COUNT(*) FROM public.reports WHERE status = 'pending'),
        'resolved_reports', (SELECT COUNT(*) FROM public.reports WHERE status = 'resolved'),
        'dismissed_reports', (SELECT COUNT(*) FROM public.reports WHERE status = 'dismissed'),
        'high_severity_reports', (SELECT COUNT(*) FROM public.reports WHERE severity = 'high'),
        'reports_today', (SELECT COUNT(*) FROM public.reports WHERE DATE(created_at) = CURRENT_DATE),
        'reports_this_week', (SELECT COUNT(*) FROM public.reports WHERE created_at >= DATE_TRUNC('week', NOW())),
        'reports_this_month', (SELECT COUNT(*) FROM public.reports WHERE created_at >= DATE_TRUNC('month', NOW()))
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء دالة للحصول على أكثر المستخدمين إبلاغاً
CREATE OR REPLACE FUNCTION get_most_reported_users(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
    user_id UUID,
    user_name TEXT,
    report_count BIGINT,
    latest_report TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.reported_user_id,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        COUNT(*) as report_count,
        MAX(r.created_at) as latest_report
    FROM public.reports r
    JOIN public.users u ON r.reported_user_id = u.id
    WHERE r.status IN ('pending', 'under_review')
    GROUP BY r.reported_user_id, u.first_name, u.last_name
    ORDER BY report_count DESC, latest_report DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إدراج بيانات تجريبية (اختيارية)
-- يمكن حذف هذا القسم في الإنتاج
/*
INSERT INTO public.reports (reported_user_id, reporter_id, reason, description, severity) VALUES
-- سيتم إضافة بيانات تجريبية إذا لزم الأمر
*/

-- إنهاء المعاملة
COMMIT;

-- رسالة نجاح
SELECT 'تم إنشاء جدول البلاغات بنجاح مع جميع الفهارس والسياسات والدوال المساعدة' as message;
