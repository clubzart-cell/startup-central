-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;

-- Create new policy that allows viewing workspaces by invite code
CREATE POLICY "Users can view workspaces they are members of or by invite code"
ON public.workspaces
FOR SELECT
TO authenticated
USING (
  is_workspace_member(id, auth.uid()) 
  OR (created_by = auth.uid())
  OR (invite_code IS NOT NULL)
);