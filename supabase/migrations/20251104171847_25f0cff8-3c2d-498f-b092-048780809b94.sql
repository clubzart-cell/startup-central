-- Allow users to add themselves as members when joining via invite code
CREATE POLICY "Users can join workspaces as members"
ON workspace_members
FOR INSERT
WITH CHECK (
  -- Can only add yourself
  user_id = auth.uid()
  AND
  -- Can only assign 'member' role (not 'admin')
  role = 'member'::app_role
);