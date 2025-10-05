-- Drop existing problematic policies
DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can insert members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can update members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can delete members" ON public.workspace_members;

-- Create security definer function to check if user is workspace member
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = _workspace_id
      AND user_id = _user_id
  )
$$;

-- Create security definer function to check if user is workspace admin
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = _workspace_id
      AND user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Recreate policies using security definer functions
CREATE POLICY "Members can view workspace members" ON public.workspace_members
  FOR SELECT USING (
    public.is_workspace_member(workspace_id, auth.uid())
  );

CREATE POLICY "Admins can insert members" ON public.workspace_members
  FOR INSERT WITH CHECK (
    public.is_workspace_admin(workspace_id, auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can update members" ON public.workspace_members
  FOR UPDATE USING (
    public.is_workspace_admin(workspace_id, auth.uid())
  );

CREATE POLICY "Admins can delete members" ON public.workspace_members
  FOR DELETE USING (
    public.is_workspace_admin(workspace_id, auth.uid())
  );