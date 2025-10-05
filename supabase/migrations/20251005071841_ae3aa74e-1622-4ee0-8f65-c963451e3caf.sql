-- Drop the problematic workspace INSERT policy
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;

-- Create a simpler INSERT policy that just checks authentication
CREATE POLICY "Users can create workspaces" ON public.workspaces
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
  );

-- Also update other workspace policies to use security definer functions
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Admins can update workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Admins can delete workspace" ON public.workspaces;

CREATE POLICY "Users can view workspaces they are members of" ON public.workspaces
  FOR SELECT USING (
    public.is_workspace_member(id, auth.uid())
  );

CREATE POLICY "Admins can update workspace" ON public.workspaces
  FOR UPDATE USING (
    public.is_workspace_admin(id, auth.uid())
  );

CREATE POLICY "Admins can delete workspace" ON public.workspaces
  FOR DELETE USING (
    public.is_workspace_admin(id, auth.uid())
  );