-- Add CASCADE foreign key constraints for proper cleanup
ALTER TABLE workspace_members
DROP CONSTRAINT IF EXISTS workspace_members_workspace_id_fkey,
ADD CONSTRAINT workspace_members_workspace_id_fkey 
  FOREIGN KEY (workspace_id) 
  REFERENCES workspaces(id) 
  ON DELETE CASCADE;

ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS tasks_workspace_id_fkey,
ADD CONSTRAINT tasks_workspace_id_fkey 
  FOREIGN KEY (workspace_id) 
  REFERENCES workspaces(id) 
  ON DELETE CASCADE;

ALTER TABLE meetings
DROP CONSTRAINT IF EXISTS meetings_workspace_id_fkey,
ADD CONSTRAINT meetings_workspace_id_fkey 
  FOREIGN KEY (workspace_id) 
  REFERENCES workspaces(id) 
  ON DELETE CASCADE;

ALTER TABLE ideas
DROP CONSTRAINT IF EXISTS ideas_workspace_id_fkey,
ADD CONSTRAINT ideas_workspace_id_fkey 
  FOREIGN KEY (workspace_id) 
  REFERENCES workspaces(id) 
  ON DELETE CASCADE;

ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_workspace_id_fkey,
ADD CONSTRAINT notifications_workspace_id_fkey 
  FOREIGN KEY (workspace_id) 
  REFERENCES workspaces(id) 
  ON DELETE CASCADE;

ALTER TABLE meeting_participants
DROP CONSTRAINT IF EXISTS meeting_participants_meeting_id_fkey,
ADD CONSTRAINT meeting_participants_meeting_id_fkey 
  FOREIGN KEY (meeting_id) 
  REFERENCES meetings(id) 
  ON DELETE CASCADE;

-- Add RLS policies for workspace UPDATE and DELETE
CREATE POLICY "Admins and creators can update workspaces"
ON workspaces
FOR UPDATE
USING (
  is_workspace_admin(id, auth.uid()) 
  OR created_by = auth.uid()
);

CREATE POLICY "Admins and creators can delete workspaces"
ON workspaces
FOR DELETE
USING (
  is_workspace_admin(id, auth.uid()) 
  OR created_by = auth.uid()
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON workspace_members(role);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline) WHERE deadline IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meetings_workspace_id ON meetings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);

CREATE INDEX IF NOT EXISTS idx_ideas_workspace_id ON ideas(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ideas_created_by ON ideas(created_by);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id ON notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;