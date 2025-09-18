-- إنشاء جداول لوحة التحكم المفقودة
-- تاريخ الإنشاء: 7 أغسطس 2025
-- الغرض: إنشاء الجداول المطلوبة لعمل لوحة التحكم بشكل صحيح

-- بدء المعاملة
BEGIN;

-- إنشاء جدول المحادثات (conversations)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'archived')),
    family_involved BOOLEAN DEFAULT false,
    family_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- التأكد من عدم تكرار المحادثة بين نفس المستخدمين
    UNIQUE(user1_id, user2_id)
);

-- إنشاء جدول الرسائل (messages)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
    moderation_status VARCHAR(20) DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    moderation_reason TEXT,
    flagged_words TEXT[],
    severity VARCHAR(10) CHECK (severity IN ('low', 'medium', 'high')),
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول مشاهدات الملفات الشخصية (profile_views)
CREATE TABLE IF NOT EXISTS public.profile_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    viewed_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    view_type VARCHAR(20) DEFAULT 'profile' CHECK (view_type IN ('profile', 'search', 'suggestion')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- فهرس مركب لتحسين الأداء
    INDEX idx_profile_views_viewer_viewed (viewer_id, viewed_user_id, created_at)
);

-- إنشاء جدول الإعجابات بين المستخدمين (user_likes)
CREATE TABLE IF NOT EXISTS public.user_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    liker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    liked_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    like_type VARCHAR(20) DEFAULT 'profile' CHECK (like_type IN ('profile', 'photo', 'bio')),
    is_mutual BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- التأكد من عدم تكرار الإعجاب
    UNIQUE(liker_id, liked_user_id)
);

-- إنشاء جدول النشاطات الأخيرة (recent_activities)
CREATE TABLE IF NOT EXISTS public.recent_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(30) NOT NULL CHECK (activity_type IN ('view', 'like', 'message', 'match', 'profile_update', 'login', 'photo_upload')),
    target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء الفهارس للأداء
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON public.conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON public.conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_moderation_status ON public.messages(moderation_status);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewer ON public.profile_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_user ON public.profile_views(viewed_user_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_created_at ON public.profile_views(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_likes_liker ON public.user_likes(liker_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_liked_user ON public.user_likes(liked_user_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_mutual ON public.user_likes(is_mutual) WHERE is_mutual = true;
CREATE INDEX IF NOT EXISTS idx_user_likes_created_at ON public.user_likes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recent_activities_user ON public.recent_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_activities_type ON public.recent_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_recent_activities_created_at ON public.recent_activities(created_at DESC);

-- إنشاء دوال التحديث التلقائي للوقت
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- إنشاء المشغلات للتحديث التلقائي
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON public.conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at 
    BEFORE UPDATE ON public.messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- تفعيل Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_activities ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للمحادثات
CREATE POLICY "Users can view their own conversations" ON public.conversations
    FOR SELECT USING (
        auth.uid()::text = user1_id OR 
        auth.uid()::text = user2_id
    );

CREATE POLICY "Users can create conversations" ON public.conversations
    FOR INSERT WITH CHECK (
        auth.uid()::text = user1_id
    );

CREATE POLICY "Users can update their own conversations" ON public.conversations
    FOR UPDATE USING (
        auth.uid()::text = user1_id OR 
        auth.uid()::text = user2_id
    );

-- سياسات RLS للرسائل
CREATE POLICY "Users can view messages in their conversations" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations 
            WHERE id = conversation_id 
            AND (user1_id = auth.uid()::text OR user2_id = auth.uid()::text)
        )
    );

CREATE POLICY "Users can send messages in their conversations" ON public.messages
    FOR INSERT WITH CHECK (
        auth.uid()::text = sender_id AND
        EXISTS (
            SELECT 1 FROM public.conversations 
            WHERE id = conversation_id 
            AND (user1_id = auth.uid()::text OR user2_id = auth.uid()::text)
        )
    );

-- سياسات RLS لمشاهدات الملفات الشخصية
CREATE POLICY "Users can view their own profile views" ON public.profile_views
    FOR SELECT USING (
        auth.uid()::text = viewer_id OR 
        auth.uid()::text = viewed_user_id
    );

CREATE POLICY "Users can record profile views" ON public.profile_views
    FOR INSERT WITH CHECK (
        auth.uid()::text = viewer_id
    );

-- سياسات RLS للإعجابات
CREATE POLICY "Users can view their own likes" ON public.user_likes
    FOR SELECT USING (
        auth.uid()::text = liker_id OR 
        auth.uid()::text = liked_user_id
    );

CREATE POLICY "Users can create likes" ON public.user_likes
    FOR INSERT WITH CHECK (
        auth.uid()::text = liker_id
    );

CREATE POLICY "Users can remove their own likes" ON public.user_likes
    FOR DELETE USING (
        auth.uid()::text = liker_id
    );

-- سياسات RLS للنشاطات الأخيرة
CREATE POLICY "Users can view their own activities" ON public.recent_activities
    FOR SELECT USING (
        auth.uid()::text = user_id
    );

CREATE POLICY "Users can create their own activities" ON public.recent_activities
    FOR INSERT WITH CHECK (
        auth.uid()::text = user_id
    );

-- إضافة تعليقات للجداول والأعمدة
COMMENT ON TABLE public.conversations IS 'جدول المحادثات بين المستخدمين';
COMMENT ON TABLE public.messages IS 'جدول الرسائل في المحادثات';
COMMENT ON TABLE public.profile_views IS 'جدول مشاهدات الملفات الشخصية';
COMMENT ON TABLE public.user_likes IS 'جدول الإعجابات بين المستخدمين';
COMMENT ON TABLE public.recent_activities IS 'جدول النشاطات الأخيرة للمستخدمين';

-- إنشاء دوال مساعدة لإحصائيات لوحة التحكم

-- دالة لحساب عدد المشاهدات للمستخدم
CREATE OR REPLACE FUNCTION get_user_profile_views(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.profile_views
        WHERE viewed_user_id = user_id
        AND created_at >= NOW() - INTERVAL '30 days'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لحساب عدد الإعجابات للمستخدم
CREATE OR REPLACE FUNCTION get_user_likes_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.user_likes
        WHERE liked_user_id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لحساب عدد الرسائل للمستخدم
CREATE OR REPLACE FUNCTION get_user_messages_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.messages m
        JOIN public.conversations c ON m.conversation_id = c.id
        WHERE (c.user1_id = user_id OR c.user2_id = user_id)
        AND m.moderation_status = 'approved'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لحساب عدد المطابقات للمستخدم
CREATE OR REPLACE FUNCTION get_user_matches_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.matches
        WHERE (user1_id = user_id OR user2_id = user_id)
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإضافة نشاط جديد
CREATE OR REPLACE FUNCTION add_user_activity(
    p_user_id UUID,
    p_activity_type VARCHAR,
    p_description TEXT,
    p_target_user_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO public.recent_activities (
        user_id, activity_type, description, target_user_id, metadata
    ) VALUES (
        p_user_id, p_activity_type, p_description, p_target_user_id, p_metadata
    ) RETURNING id INTO activity_id;

    RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتحديث الإعجابات المتبادلة
CREATE OR REPLACE FUNCTION update_mutual_likes()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث الإعجاب الجديد
    UPDATE public.user_likes
    SET is_mutual = true
    WHERE id = NEW.id
    AND EXISTS (
        SELECT 1 FROM public.user_likes
        WHERE liker_id = NEW.liked_user_id
        AND liked_user_id = NEW.liker_id
    );

    -- تحديث الإعجاب المقابل إذا وجد
    UPDATE public.user_likes
    SET is_mutual = true
    WHERE liker_id = NEW.liked_user_id
    AND liked_user_id = NEW.liker_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء مشغل للإعجابات المتبادلة
DROP TRIGGER IF EXISTS trigger_update_mutual_likes ON public.user_likes;
CREATE TRIGGER trigger_update_mutual_likes
    AFTER INSERT ON public.user_likes
    FOR EACH ROW EXECUTE FUNCTION update_mutual_likes();

-- دالة لتنظيف النشاطات القديمة (أكثر من 90 يوم)
CREATE OR REPLACE FUNCTION cleanup_old_activities()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.recent_activities
    WHERE created_at < NOW() - INTERVAL '90 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنهاء المعاملة
COMMIT;

-- رسالة النجاح
SELECT 'تم إنشاء جداول ودوال لوحة التحكم بنجاح! 🎉' as message;
