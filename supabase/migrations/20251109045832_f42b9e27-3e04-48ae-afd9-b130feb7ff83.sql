-- Phase 1: Fix Notification Function
CREATE OR REPLACE FUNCTION public.notify_admins_on_task_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_record RECORD;
  task_title TEXT;
  assignee_name TEXT;
BEGIN
  -- Only trigger when status changes TO pending_approval
  IF NEW.status = 'pending_approval' AND (OLD.status IS NULL OR OLD.status != 'pending_approval') THEN
    
    SELECT title INTO task_title FROM tasks WHERE id = NEW.id;
    
    -- Get assignee name
    SELECT full_name INTO assignee_name 
    FROM profiles 
    WHERE id = NEW.assigned_to;

    -- Notify all admins (except the assignee to avoid self-notification)
    FOR admin_record IN
      SELECT wm.user_id, p.full_name
      FROM workspace_members wm
      JOIN profiles p ON p.id = wm.user_id
      WHERE wm.workspace_id = NEW.workspace_id
        AND wm.role = 'admin'
        AND wm.user_id != NEW.assigned_to
    LOOP
      INSERT INTO notifications (
        user_id,
        workspace_id,
        title,
        message,
        type,
        related_id
      ) VALUES (
        admin_record.user_id,
        NEW.workspace_id,
        'Task Requires Approval',
        'Task "' || task_title || '" submitted by ' || COALESCE(assignee_name, 'Unknown') || ' is awaiting your approval',
        'task_approval',
        NEW.id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- Phase 1: Create Trigger on Tasks Table
DROP TRIGGER IF EXISTS on_task_approval_request ON tasks;

CREATE TRIGGER on_task_approval_request
  AFTER INSERT OR UPDATE OF status
  ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_on_task_approval();

-- Phase 2: Fix Task Editing Permissions - Only admin or creator can edit
DROP POLICY IF EXISTS "Authorized users can update tasks" ON tasks;

CREATE POLICY "Only admins and creators can update tasks"
ON tasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = tasks.workspace_id
      AND user_id = auth.uid()
      AND role = 'admin'
  )
  OR tasks.created_by = auth.uid()
);