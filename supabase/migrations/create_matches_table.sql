-- إنشاء جدول المطابقات
-- هذا الجدول يحفظ المطابقات بين المستخدمين

CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  match_type VARCHAR(30) DEFAULT 'suggested' CHECK (match_type IN ('suggested', 'mutual_like', 'conversation_started')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- التأكد من عدم تكرار المطابقة بين نفس المستخدمين
  UNIQUE(user1_id, user2_id)
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_matches_user1_id ON public.matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2_id ON public.matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_match_score ON public.matches(match_score);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON public.matches(created_at);

-- إنشاء trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_matches_updated_at
    BEFORE UPDATE ON public.matches
    FOR EACH ROW
    EXECUTE FUNCTION update_matches_updated_at();

-- تفعيل Row Level Security
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- سياسة للقراءة: المستخدم يمكنه رؤية المطابقات التي يشارك فيها
CREATE POLICY "Users can view their own matches" ON public.matches
    FOR SELECT USING (
        auth.uid()::text = user1_id OR 
        auth.uid()::text = user2_id
    );

-- سياسة للإدراج: المستخدم يمكنه إنشاء مطابقات يكون فيها user1
CREATE POLICY "Users can create matches as user1" ON public.matches
    FOR INSERT WITH CHECK (
        auth.uid()::text = user1_id
    );

-- سياسة للتحديث: المستخدم يمكنه تحديث المطابقات التي يشارك فيها
CREATE POLICY "Users can update their own matches" ON public.matches
    FOR UPDATE USING (
        auth.uid()::text = user1_id OR 
        auth.uid()::text = user2_id
    );

-- إضافة تعليقات للجدول والأعمدة
COMMENT ON TABLE public.matches IS 'جدول المطابقات بين المستخدمين';
COMMENT ON COLUMN public.matches.id IS 'معرف فريد للمطابقة';
COMMENT ON COLUMN public.matches.user1_id IS 'معرف المستخدم الأول';
COMMENT ON COLUMN public.matches.user2_id IS 'معرف المستخدم الثاني';
COMMENT ON COLUMN public.matches.match_score IS 'نقاط التوافق (0-100)';
COMMENT ON COLUMN public.matches.status IS 'حالة المطابقة: active, inactive, blocked';
COMMENT ON COLUMN public.matches.match_type IS 'نوع المطابقة: suggested, mutual_like, conversation_started';
COMMENT ON COLUMN public.matches.created_at IS 'تاريخ إنشاء المطابقة';
COMMENT ON COLUMN public.matches.updated_at IS 'تاريخ آخر تحديث';
