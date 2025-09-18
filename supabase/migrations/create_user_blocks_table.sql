-- إنشاء جدول user_blocks لتتبع حظر المستخدمين بشكل كلي
-- Create user_blocks table for tracking global user blocks

CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    block_type VARCHAR(20) DEFAULT 'global' CHECK (block_type IN ('global', 'conversation')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a user can only block another user once
    UNIQUE(blocker_id, blocked_user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_user ON user_blocks(blocked_user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_status ON user_blocks(status);
CREATE INDEX IF NOT EXISTS idx_user_blocks_conversation ON user_blocks(conversation_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_type ON user_blocks(block_type);

-- Add comments for documentation
COMMENT ON TABLE user_blocks IS 'جدول حظر المستخدمين - يتتبع المستخدمين المحظورين بشكل كلي';
COMMENT ON COLUMN user_blocks.blocker_id IS 'معرف المستخدم الذي قام بالحظر';
COMMENT ON COLUMN user_blocks.blocked_user_id IS 'معرف المستخدم المحظور';
COMMENT ON COLUMN user_blocks.conversation_id IS 'معرف المحادثة المرتبطة بالحظر (اختياري)';
COMMENT ON COLUMN user_blocks.block_type IS 'نوع الحظر: global (كلي) أو conversation (محادثة فقط)';
COMMENT ON COLUMN user_blocks.status IS 'حالة الحظر: active (نشط) أو inactive (غير نشط)';
COMMENT ON COLUMN user_blocks.blocked_at IS 'تاريخ ووقت الحظر';
COMMENT ON COLUMN user_blocks.updated_at IS 'تاريخ ووقت آخر تحديث';

-- Create a function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_user_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_user_blocks_updated_at
    BEFORE UPDATE ON user_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_user_blocks_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can see blocks they created
CREATE POLICY "Users can view their own blocks" ON user_blocks
    FOR SELECT USING (auth.uid() = blocker_id);

-- Users can create blocks
CREATE POLICY "Users can create blocks" ON user_blocks
    FOR INSERT WITH CHECK (auth.uid() = blocker_id);

-- Users can update their own blocks
CREATE POLICY "Users can update their own blocks" ON user_blocks
    FOR UPDATE USING (auth.uid() = blocker_id);

-- Users can delete their own blocks
CREATE POLICY "Users can delete their own blocks" ON user_blocks
    FOR DELETE USING (auth.uid() = blocker_id);

-- Admin users can see all blocks (if needed)
-- CREATE POLICY "Admins can view all blocks" ON user_blocks
--     FOR ALL USING (
--         EXISTS (
--             SELECT 1 FROM users 
--             WHERE id = auth.uid() 
--             AND role = 'admin'
--         )
--     );

-- Insert some example data for testing (optional)
-- INSERT INTO user_blocks (blocker_id, blocked_user_id, block_type, status) VALUES
-- ('example-blocker-uuid', 'example-blocked-uuid', 'global', 'active');

-- Grant necessary permissions
GRANT ALL ON user_blocks TO authenticated;
GRANT ALL ON user_blocks TO anon;

-- Create a view for easier querying of active blocks
CREATE OR REPLACE VIEW active_user_blocks AS
SELECT 
    ub.*,
    blocker.first_name as blocker_first_name,
    blocker.last_name as blocker_last_name,
    blocker.email as blocker_email,
    blocked.first_name as blocked_first_name,
    blocked.last_name as blocked_last_name,
    blocked.email as blocked_email
FROM user_blocks ub
JOIN users blocker ON ub.blocker_id = blocker.id
JOIN users blocked ON ub.blocked_user_id = blocked.id
WHERE ub.status = 'active';

-- Grant permissions on the view
GRANT SELECT ON active_user_blocks TO authenticated;
GRANT SELECT ON active_user_blocks TO anon;

-- Create a function to check if a user is blocked by another user
CREATE OR REPLACE FUNCTION is_user_blocked(blocker_user_id UUID, blocked_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_blocks 
        WHERE blocker_id = blocker_user_id 
        AND blocked_user_id = blocked_user_id 
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION is_user_blocked(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_blocked(UUID, UUID) TO anon;

-- Create a function to get all users blocked by a specific user
CREATE OR REPLACE FUNCTION get_blocked_users(blocker_user_id UUID)
RETURNS TABLE (
    block_id UUID,
    blocked_user_id UUID,
    blocked_user_name TEXT,
    blocked_user_email TEXT,
    blocked_at TIMESTAMP WITH TIME ZONE,
    block_type VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ub.id as block_id,
        ub.blocked_user_id,
        CONCAT(u.first_name, ' ', u.last_name) as blocked_user_name,
        u.email as blocked_user_email,
        ub.blocked_at,
        ub.block_type
    FROM user_blocks ub
    JOIN users u ON ub.blocked_user_id = u.id
    WHERE ub.blocker_id = blocker_user_id 
    AND ub.status = 'active'
    ORDER BY ub.blocked_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_blocked_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_blocked_users(UUID) TO anon;
