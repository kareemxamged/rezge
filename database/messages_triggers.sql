-- Trigger to automatically update updated_at when messages are modified
-- This ensures that any update to messages table updates the timestamp

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_messages_updated_at ON messages;

-- Create the trigger
CREATE TRIGGER trigger_update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_updated_at();

-- Create a function to handle real-time notifications for message updates
CREATE OR REPLACE FUNCTION notify_message_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Send a notification when a message's read_at status changes
  IF OLD.read_at IS DISTINCT FROM NEW.read_at THEN
    PERFORM pg_notify(
      'message_read_status_changed',
      json_build_object(
        'conversation_id', NEW.conversation_id,
        'message_id', NEW.id,
        'read_at', NEW.read_at,
        'sender_id', NEW.sender_id
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_notify_message_update ON messages;

-- Create the notification trigger
CREATE TRIGGER trigger_notify_message_update
  AFTER UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_update();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_messages_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_message_update() TO authenticated;
