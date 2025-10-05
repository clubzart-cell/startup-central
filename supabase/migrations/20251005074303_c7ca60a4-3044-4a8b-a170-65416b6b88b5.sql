-- Create task status enum
CREATE TYPE task_status AS ENUM ('pending', 'ongoing', 'pending_approval', 'completed');

-- Add status column to tasks table
ALTER TABLE tasks ADD COLUMN status task_status NOT NULL DEFAULT 'pending';

-- Migrate existing data: set status based on is_completed
UPDATE tasks SET status = 'completed' WHERE is_completed = true;
UPDATE tasks SET status = 'pending' WHERE is_completed = false;

-- Drop the old is_completed column
ALTER TABLE tasks DROP COLUMN is_completed;

-- Create function to notify admins when task needs approval
CREATE OR REPLACE FUNCTION notify_admins_on_task_approval()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
  task_record RECORD;
BEGIN
  -- Only trigger when status changes to pending_approval
  IF NEW.status = 'pending_approval' AND (OLD.status IS NULL OR OLD.status != 'pending_approval') THEN
    -- Get task details
    SELECT title, workspace_id INTO task_record FROM tasks WHERE id = NEW.id;
    
    -- Notify all admins in the workspace
    FOR admin_record IN 
      SELECT user_id 
      FROM workspace_members 
      WHERE workspace_id = NEW.workspace_id 
      AND role = 'admin'
    LOOP
      INSERT INTO notifications (
        workspace_id,
        user_id,
        title,
        message,
        type,
        related_id
      ) VALUES (
        NEW.workspace_id,
        admin_record.user_id,
        'Task Completion Request',
        'A task "' || NEW.title || '" is awaiting your approval',
        'task_approval',
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for task approval notifications
CREATE TRIGGER task_approval_notification
AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION notify_admins_on_task_approval();