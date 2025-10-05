-- Drop and recreate functions with CASCADE to handle dependencies

-- Drop existing functions with CASCADE
DROP FUNCTION IF EXISTS public.is_workspace_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_workspace_admin(uuid, uuid) CASCADE;

-- Recreate is_workspace_member function
CREATE FUNCTION public.is_workspace_member(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = _workspace_id
      AND user_id = _user_id
  );
END;
$$;

-- Recreate is_workspace_admin function
CREATE FUNCTION public.is_workspace_admin(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = _workspace_id
      AND user_id = _user_id
      AND role = 'admin'
  );
END;
$$;

-- Recreate the RLS policies that depend on these functions

-- Workspace members policies
DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members;
CREATE POLICY "Members can view workspace members"
  ON workspace_members FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members can view their own membership" ON workspace_members;
CREATE POLICY "Members can view their own membership"
  ON workspace_members FOR SELECT
  USING (user_id = auth.uid());

-- Workspaces policies
DROP POLICY IF EXISTS "Users can view workspaces they are members of or by invite code" ON workspaces;
CREATE POLICY "Users can view workspaces they are members of or by invite code"
  ON workspaces FOR SELECT
  USING (
    is_workspace_member(id, auth.uid()) OR
    invite_code IS NOT NULL
  );

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix notify_admins_on_task_approval function
DROP FUNCTION IF EXISTS public.notify_admins_on_task_approval() CASCADE;
CREATE FUNCTION public.notify_admins_on_task_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  task_title TEXT;
BEGIN
  SELECT title INTO task_title FROM tasks WHERE id = NEW.id;

  FOR admin_record IN
    SELECT wm.user_id, p.full_name
    FROM workspace_members wm
    JOIN profiles p ON p.id = wm.user_id
    WHERE wm.workspace_id = NEW.workspace_id
      AND wm.role = 'admin'
      AND wm.user_id != NEW.assignee_id
  LOOP
    INSERT INTO notifications (
      user_id,
      workspace_id,
      title,
      message,
      type
    ) VALUES (
      admin_record.user_id,
      NEW.workspace_id,
      'Task Requires Approval',
      'Task "' || task_title || '" is awaiting your approval',
      'task_approval'
    );
  END LOOP;

  RETURN NEW;
END;
$$;