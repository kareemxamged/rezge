-- Function to mark messages as read
-- This function bypasses RLS policies to ensure messages are marked as read properly

CREATE OR REPLACE FUNCTION mark_messages_as_read(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to run with elevated privileges
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update messages that:
  -- 1. Belong to the specified conversation
  -- 2. Were NOT sent by the current user (p_user_id)
  -- 3. Are currently unread (read_at IS NULL)
  -- 4. Are approved (moderation_status = 'approved')
  
  UPDATE messages 
  SET 
    read_at = NOW(),
    updated_at = NOW()
  WHERE 
    conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND read_at IS NULL
    AND moderation_status = 'approved';
  
  -- Get the number of rows that were updated
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log the operation for debugging
  INSERT INTO system_logs (
    action,
    details,
    user_id,
    created_at
  ) VALUES (
    'mark_messages_as_read',
    jsonb_build_object(
      'conversation_id', p_conversation_id,
      'user_id', p_user_id,
      'updated_count', updated_count
    ),
    p_user_id,
    NOW()
  );
  
  RETURN updated_count;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log any errors
    INSERT INTO system_logs (
      action,
      details,
      user_id,
      created_at
    ) VALUES (
      'mark_messages_as_read_error',
      jsonb_build_object(
        'conversation_id', p_conversation_id,
        'user_id', p_user_id,
        'error_message', SQLERRM,
        'error_state', SQLSTATE
      ),
      p_user_id,
      NOW()
    );
    
    -- Re-raise the exception
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION mark_messages_as_read(UUID, UUID) TO authenticated;

-- Create system_logs table if it doesn't exist (for debugging)
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  details JSONB,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant permissions on system_logs
GRANT INSERT ON system_logs TO authenticated;
GRANT SELECT ON system_logs TO authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_system_logs_action_created_at ON system_logs(action, created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
