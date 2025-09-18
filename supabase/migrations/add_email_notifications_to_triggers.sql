-- إضافة الإشعارات البريدية التلقائية للإشعارات الجديدة
-- هذا الملف يحدث الـ triggers الموجودة لتشمل إرسال إشعارات بريدية

BEGIN;

-- تحديث دالة إشعار مشاهدة الملف الشخصي لتشمل الإشعار البريدي
CREATE OR REPLACE FUNCTION notify_profile_view()
RETURNS TRIGGER AS $$
DECLARE
    viewer_data RECORD;
    viewed_user_data RECORD;
BEGIN
    -- جلب بيانات الزائر
    SELECT first_name, last_name, city, age INTO viewer_data
    FROM users WHERE id = NEW.viewer_id;
    
    -- جلب بيانات المستخدم المشاهد
    SELECT email, first_name, last_name INTO viewed_user_data
    FROM users WHERE id = NEW.viewed_user_id;
    
    -- إنشاء إشعار للمستخدم الذي تم مشاهدة ملفه
    PERFORM create_notification(
        NEW.viewed_user_id,
        NEW.viewer_id,
        'profile_view',
        'notifications.content.profileView.title',
        'notifications.content.profileView.message',
        '/dashboard',
        'notifications.content.profileView.actionText'
    );
    
    -- إرسال إشعار بريدي (سيتم تنفيذه من خلال webhook أو trigger إضافي)
    -- يمكن إضافة استدعاء HTTP هنا لإرسال الإشعار البريدي
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث دالة إشعار الإعجاب لتشمل الإشعار البريدي
CREATE OR REPLACE FUNCTION notify_user_like()
RETURNS TRIGGER AS $$
DECLARE
    liker_data RECORD;
    liked_user_data RECORD;
BEGIN
    -- جلب بيانات المعجب
    SELECT first_name, last_name, city, age INTO liker_data
    FROM users WHERE id = NEW.liker_id;
    
    -- جلب بيانات المستخدم المعجب به
    SELECT email, first_name, last_name INTO liked_user_data
    FROM users WHERE id = NEW.liked_user_id;
    
    -- إنشاء إشعار للمستخدم الذي تم الإعجاب بملفه
    PERFORM create_notification(
        NEW.liked_user_id,
        NEW.liker_id,
        'like',
        'notifications.content.like.title',
        'notifications.content.like.message',
        '/likes',
        'notifications.content.like.actionText'
    );
    
    -- إرسال إشعار بريدي (سيتم تنفيذه من خلال webhook أو trigger إضافي)
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث دالة إشعار الرسالة الجديدة لتشمل الإشعار البريدي
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
    receiver_id UUID;
    sender_data RECORD;
    receiver_data RECORD;
BEGIN
    -- الحصول على معرف المستقبل من المحادثة
    SELECT CASE 
        WHEN c.user1_id = NEW.sender_id THEN c.user2_id 
        ELSE c.user1_id 
    END INTO receiver_id
    FROM conversations c 
    WHERE c.id = NEW.conversation_id;
    
    -- جلب بيانات المرسل
    SELECT first_name, last_name, city, age INTO sender_data
    FROM users WHERE id = NEW.sender_id;
    
    -- جلب بيانات المستقبل
    SELECT email, first_name, last_name INTO receiver_data
    FROM users WHERE id = receiver_id;
    
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
        
        -- إرسال إشعار بريدي (سيتم تنفيذه من خلال webhook أو trigger إضافي)
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء دالة لإشعار المطابقة الجديدة
CREATE OR REPLACE FUNCTION notify_new_match()
RETURNS TRIGGER AS $$
DECLARE
    user1_data RECORD;
    user2_data RECORD;
BEGIN
    -- التحقق من أن هذه مطابقة جديدة (كلا الطرفين أعجب بالآخر)
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        -- جلب بيانات المستخدمين
        SELECT email, first_name, last_name, city, age INTO user1_data
        FROM users WHERE id = NEW.liker_id;
        
        SELECT email, first_name, last_name, city, age INTO user2_data
        FROM users WHERE id = NEW.liked_user_id;
        
        -- إرسال إشعار للمستخدم الأول (الذي أرسل الإعجاب)
        PERFORM create_notification(
            NEW.liker_id,
            NEW.liked_user_id,
            'match',
            'notifications.content.match.title',
            'notifications.content.match.message',
            '/messages',
            'notifications.content.match.actionText'
        );
        
        -- إرسال إشعار للمستخدم الثاني (الذي قبل الإعجاب)
        PERFORM create_notification(
            NEW.liked_user_id,
            NEW.liker_id,
            'match',
            'notifications.content.match.title',
            'notifications.content.match.message',
            '/messages',
            'notifications.content.match.actionText'
        );
        
        -- إرسال إشعارات بريدية (سيتم تنفيذها من خلال webhook أو trigger إضافي)
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger للمطابقات الجديدة
DROP TRIGGER IF EXISTS trigger_notify_new_match ON public.likes;
CREATE TRIGGER trigger_notify_new_match
    AFTER UPDATE ON public.likes
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_match();

-- إنشاء دالة لإرسال إشعار نظامي مع إشعار بريدي
CREATE OR REPLACE FUNCTION create_system_notification(
    p_user_id UUID,
    p_type VARCHAR(20),
    p_title TEXT,
    p_message TEXT,
    p_action_url TEXT DEFAULT NULL,
    p_action_text TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
    user_data RECORD;
BEGIN
    -- إنشاء الإشعار
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        action_url,
        action_text,
        is_read,
        is_dismissed
    ) VALUES (
        p_user_id,
        p_type,
        p_title,
        p_message,
        p_action_url,
        p_action_text,
        FALSE,
        FALSE
    ) RETURNING id INTO notification_id;
    
    -- جلب بيانات المستخدم لإرسال الإشعار البريدي
    SELECT email, first_name, last_name INTO user_data
    FROM users WHERE id = p_user_id;
    
    -- إرسال إشعار بريدي (سيتم تنفيذه من خلال webhook أو trigger إضافي)
    -- يمكن إضافة استدعاء HTTP هنا
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء دالة مساعدة لإرسال الإشعارات البريدية (placeholder)
-- هذه الدالة ستستدعى من التطبيق لإرسال الإشعارات البريدية
CREATE OR REPLACE FUNCTION send_email_notification(
    p_notification_type TEXT,
    p_user_email TEXT,
    p_user_name TEXT,
    p_notification_data JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
BEGIN
    -- هذه دالة placeholder - الإرسال الفعلي سيتم من التطبيق
    -- يمكن استخدام pg_notify لإرسال إشعار للتطبيق
    PERFORM pg_notify('email_notification', json_build_object(
        'type', p_notification_type,
        'email', p_user_email,
        'name', p_user_name,
        'data', p_notification_data
    )::text);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة تعليقات للدوال الجديدة
COMMENT ON FUNCTION notify_profile_view() IS 'إرسال إشعار عند مشاهدة الملف الشخصي مع إشعار بريدي';
COMMENT ON FUNCTION notify_user_like() IS 'إرسال إشعار عند الإعجاب مع إشعار بريدي';
COMMENT ON FUNCTION notify_new_message() IS 'إرسال إشعار عند الرسالة الجديدة مع إشعار بريدي';
COMMENT ON FUNCTION notify_new_match() IS 'إرسال إشعار عند المطابقة الجديدة مع إشعار بريدي';
COMMENT ON FUNCTION create_system_notification(UUID, VARCHAR, TEXT, TEXT, TEXT, TEXT) IS 'إنشاء إشعار نظامي مع إشعار بريدي';
COMMENT ON FUNCTION send_email_notification(TEXT, TEXT, TEXT, JSONB) IS 'دالة مساعدة لإرسال الإشعارات البريدية';

COMMIT;
