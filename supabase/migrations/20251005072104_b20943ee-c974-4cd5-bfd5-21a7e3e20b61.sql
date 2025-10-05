-- Drop and recreate the SELECT policy to allow creators to see their workspace
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;

CREATE POLICY "Users can view workspaces they are members of" ON public.workspaces
  FOR SELECT USING (
    -- Allow if user is a member
    public.is_workspace_member(id, auth.uid())
    -- OR if user created this workspace
    OR created_by = auth.uid()
  );