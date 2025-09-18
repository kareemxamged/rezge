-- إنشاء جدول الإشعارات
-- تاريخ الإنشاء: 8 أغسطس 2025
-- الغرض: إنشاء جدول الإشعارات المطلوب لعمل نظام الإشعارات بشكل صحيح

-- بدء المعاملة
BEGIN;

-- إنشاء جدول الإشعارات (notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('profile_view', 'like', 'message', 'match', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    action_text TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_not_dismissed ON public.notifications(user_id, is_dismissed) WHERE is_dismissed = FALSE;

-- تفعيل Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان
-- سياسة القراءة: المستخدم يمكنه قراءة إشعاراته فقط
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- سياسة التحديث: المستخدم يمكنه تحديث إشعاراته فقط (تم القراءة، حذف)
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- سياسة الإدراج: النظام يمكنه إنشاء إشعارات للمستخدمين
CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- سياسة الحذف: المستخدم يمكنه حذف إشعاراته فقط
CREATE POLICY "Users can delete their own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

-- إنشاء دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at_trigger ON public.notifications;
CREATE TRIGGER update_notifications_updated_at_trigger
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- إدراج بعض الإشعارات التجريبية
INSERT INTO public.notifications (user_id, from_user_id, type, title, message, action_url, action_text, created_at) VALUES
-- إشعارات مشاهدة الملف الشخصي
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'profile_view', 'notifications.content.profileView.title', 'notifications.content.profileView.message', '/profile/22222222-2222-2222-2222-222222222222', 'notifications.content.profileView.actionText', NOW() - INTERVAL '2 hours'),
('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'profile_view', 'notifications.content.profileView.title', 'notifications.content.profileView.message', '/profile/33333333-3333-3333-3333-333333333333', 'notifications.content.profileView.actionText', NOW() - INTERVAL '5 hours'),

-- إشعارات الإعجابات
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'like', 'notifications.content.like.title', 'notifications.content.like.message', '/profile/22222222-2222-2222-2222-222222222222', 'notifications.content.like.actionText', NOW() - INTERVAL '1 hour'),
('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'like', 'notifications.content.like.title', 'notifications.content.like.message', '/profile/44444444-4444-4444-4444-444444444444', 'notifications.content.like.actionText', NOW() - INTERVAL '3 hours'),

-- إشعارات الرسائل
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'message', 'notifications.content.message.title', 'notifications.content.message.message', '/messages', 'notifications.content.message.actionText', NOW() - INTERVAL '30 minutes'),

-- إشعارات النظام
('11111111-1111-1111-1111-111111111111', NULL, 'system', 'notifications.content.system.title', 'مرحباً بك في موقع رزقي! نتمنى لك تجربة ممتعة في البحث عن شريك الحياة.', '/dashboard', 'notifications.content.system.actionText', NOW() - INTERVAL '1 day');

-- إنشاء دالة لإنشاء إشعار جديد
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_from_user_id UUID DEFAULT NULL,
    p_type VARCHAR(20),
    p_title TEXT,
    p_message TEXT,
    p_action_url TEXT DEFAULT NULL,
    p_action_text TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_id, from_user_id, type, title, message, 
        action_url, action_text, metadata
    ) VALUES (
        p_user_id, p_from_user_id, p_type, p_title, p_message,
        p_action_url, p_action_text, p_metadata
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء دالة لتنظيف الإشعارات القديمة (أكثر من 30 يوم)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.notifications 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء triggers لإنشاء إشعارات تلقائية

-- Trigger لإنشاء إشعار عند مشاهدة الملف الشخصي
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

-- Trigger لإنشاء إشعار عند الإعجاب
CREATE OR REPLACE FUNCTION notify_user_like()
RETURNS TRIGGER AS $$
BEGIN
    -- إنشاء إشعار للمستخدم الذي تم الإعجاب بملفه
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

-- Trigger لإنشاء إشعار عند إرسال رسالة
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
    receiver_id UUID;
BEGIN
    -- الحصول على معرف المستقبل من المحادثة
    SELECT CASE 
        WHEN c.user1_id = NEW.sender_id THEN c.user2_id 
        ELSE c.user1_id 
    END INTO receiver_id
    FROM conversations c 
    WHERE c.id = NEW.conversation_id;
    
    -- إنشاء إشعار للمستقبل
    IF receiver_id IS NOT NULL THEN
        PERFORM create_notification(
            receiver_id,
            NEW.sender_id,
            'message',
            'notifications.content.message.title',
            'notifications.content.message.message',
            '/messages',
            'notifications.content.message.actionText'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء الـ triggers
DROP TRIGGER IF EXISTS trigger_notify_profile_view ON public.profile_views;
CREATE TRIGGER trigger_notify_profile_view
    AFTER INSERT ON public.profile_views
    FOR EACH ROW
    EXECUTE FUNCTION notify_profile_view();

DROP TRIGGER IF EXISTS trigger_notify_user_like ON public.user_likes;
CREATE TRIGGER trigger_notify_user_like
    AFTER INSERT ON public.user_likes
    FOR EACH ROW
    EXECUTE FUNCTION notify_user_like();

DROP TRIGGER IF EXISTS trigger_notify_new_message ON public.messages;
CREATE TRIGGER trigger_notify_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_message();

-- إنهاء المعاملة
COMMIT;

-- إضافة تعليقات للجدول والأعمدة
COMMENT ON TABLE public.notifications IS 'جدول الإشعارات للمستخدمين';
COMMENT ON COLUMN public.notifications.id IS 'معرف فريد للإشعار';
COMMENT ON COLUMN public.notifications.user_id IS 'معرف المستخدم المستقبل للإشعار';
COMMENT ON COLUMN public.notifications.from_user_id IS 'معرف المستخدم المرسل للإشعار (اختياري)';
COMMENT ON COLUMN public.notifications.type IS 'نوع الإشعار: profile_view, like, message, match, system';
COMMENT ON COLUMN public.notifications.title IS 'عنوان الإشعار (مفتاح ترجمة أو نص مباشر)';
COMMENT ON COLUMN public.notifications.message IS 'محتوى الإشعار (مفتاح ترجمة أو نص مباشر)';
COMMENT ON COLUMN public.notifications.action_url IS 'رابط الإجراء المطلوب (اختياري)';
COMMENT ON COLUMN public.notifications.action_text IS 'نص زر الإجراء (اختياري)';
COMMENT ON COLUMN public.notifications.is_read IS 'هل تم قراءة الإشعار';
COMMENT ON COLUMN public.notifications.is_dismissed IS 'هل تم إخفاء الإشعار';
COMMENT ON COLUMN public.notifications.metadata IS 'بيانات إضافية للإشعار (JSON)';
COMMENT ON COLUMN public.notifications.created_at IS 'تاريخ إنشاء الإشعار';
COMMENT ON COLUMN public.notifications.updated_at IS 'تاريخ آخر تحديث للإشعار';
