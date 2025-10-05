-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Create app_priority enum for task priorities
CREATE TYPE public.app_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create meeting_status enum
CREATE TYPE public.meeting_status AS ENUM ('upcoming', 'ongoing', 'ended');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create workspace_members table
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'member',
  can_create_tasks BOOLEAN NOT NULL DEFAULT FALSE,
  can_create_meetings BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  priority public.app_priority NOT NULL DEFAULT 'medium',
  deadline TIMESTAMPTZ,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create meetings table
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  agenda TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  meeting_link TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.meeting_status NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create meeting_participants table
CREATE TABLE public.meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  UNIQUE(meeting_id, user_id)
);

-- Create ideas table
CREATE TABLE public.ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'proposed',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  related_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for workspaces
CREATE POLICY "Users can view workspaces they are members of" ON public.workspaces 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = workspaces.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workspaces" ON public.workspaces 
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update workspace" ON public.workspaces 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = workspaces.id AND user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete workspace" ON public.workspaces 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = workspaces.id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for workspace_members
CREATE POLICY "Members can view workspace members" ON public.workspace_members 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm 
      WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert members" ON public.workspace_members 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = workspace_members.workspace_id AND user_id = auth.uid() AND role = 'admin'
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can update members" ON public.workspace_members 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = workspace_members.workspace_id AND user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete members" ON public.workspace_members 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = workspace_members.workspace_id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for tasks
CREATE POLICY "Members can view workspace tasks" ON public.tasks 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authorized users can create tasks" ON public.tasks 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = tasks.workspace_id 
      AND user_id = auth.uid() 
      AND (role = 'admin' OR can_create_tasks = true)
    )
  );

CREATE POLICY "Authorized users can update tasks" ON public.tasks 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = tasks.workspace_id 
      AND user_id = auth.uid() 
      AND (role = 'admin' OR can_create_tasks = true OR assigned_to = auth.uid())
    )
  );

CREATE POLICY "Authorized users can delete tasks" ON public.tasks 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = tasks.workspace_id 
      AND user_id = auth.uid() 
      AND (role = 'admin' OR can_create_tasks = true)
    )
  );

-- RLS Policies for meetings
CREATE POLICY "Members can view workspace meetings" ON public.meetings 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = meetings.workspace_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authorized users can create meetings" ON public.meetings 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = meetings.workspace_id 
      AND user_id = auth.uid() 
      AND (role = 'admin' OR can_create_meetings = true)
    )
  );

CREATE POLICY "Authorized users can update meetings" ON public.meetings 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = meetings.workspace_id 
      AND user_id = auth.uid() 
      AND (role = 'admin' OR can_create_meetings = true)
    )
  );

CREATE POLICY "Authorized users can delete meetings" ON public.meetings 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = meetings.workspace_id 
      AND user_id = auth.uid() 
      AND (role = 'admin' OR can_create_meetings = true)
    )
  );

-- RLS Policies for meeting_participants
CREATE POLICY "Members can view meeting participants" ON public.meeting_participants 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      JOIN public.workspace_members wm ON m.workspace_id = wm.workspace_id
      WHERE m.id = meeting_participants.meeting_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Authorized users can manage participants" ON public.meeting_participants 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      JOIN public.workspace_members wm ON m.workspace_id = wm.workspace_id
      WHERE m.id = meeting_participants.meeting_id 
      AND wm.user_id = auth.uid() 
      AND (wm.role = 'admin' OR wm.can_create_meetings = true)
    )
  );

-- RLS Policies for ideas
CREATE POLICY "Members can view workspace ideas" ON public.ideas 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = ideas.workspace_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create ideas" ON public.ideas 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = ideas.workspace_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own ideas" ON public.ideas 
  FOR UPDATE USING (created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = ideas.workspace_id AND user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can delete own ideas" ON public.ideas 
  FOR DELETE USING (created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = ideas.workspace_id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON public.notifications 
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications" ON public.notifications 
  FOR DELETE USING (user_id = auth.uid());

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ideas_updated_at BEFORE UPDATE ON public.ideas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();