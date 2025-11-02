-- Fix workspace_members RLS policies to allow INSERT, UPDATE, DELETE

-- Policy 1: Allow workspace creator to add themselves as admin during creation
CREATE POLICY "Allow initial admin member insertion"
ON workspace_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  AND role = 'admin'
  AND EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = workspace_members.workspace_id 
    AND created_by = auth.uid()
  )
);

-- Policy 2: Allow admins to add new members
CREATE POLICY "Admins can add members"
ON workspace_members
FOR INSERT
WITH CHECK (
  is_workspace_admin(workspace_id, auth.uid())
);

-- Policy 3: Allow admins to update member permissions
CREATE POLICY "Admins can update members"
ON workspace_members
FOR UPDATE
USING (is_workspace_admin(workspace_id, auth.uid()));

-- Policy 4: Allow admins to remove members
CREATE POLICY "Admins can delete members"
ON workspace_members
FOR DELETE
USING (is_workspace_admin(workspace_id, auth.uid()));

-- Retroactively add workspace creators as admins to fix orphaned workspaces
INSERT INTO workspace_members (workspace_id, user_id, role, can_create_tasks, can_create_meetings)
SELECT id, created_by, 'admin', true, true
FROM workspaces
WHERE id NOT IN (SELECT DISTINCT workspace_id FROM workspace_members)
ON CONFLICT DO NOTHING;