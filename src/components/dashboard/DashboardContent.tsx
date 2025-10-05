import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { DashboardStats } from "./DashboardStats";
import { TasksPage } from "@/components/tasks/TasksPage";
import { MeetingsPage } from "@/components/meetings/MeetingsPage";
import { IdeasPage } from "@/components/ideas/IdeasPage";
import { NotificationsPage } from "@/components/notifications/NotificationsPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { toast } from "sonner";

interface DashboardContentProps {
  workspaceId: string;
  session: Session;
}

export const DashboardContent = ({ workspaceId, session }: DashboardContentProps) => {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, [session]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (error) {
      toast.error("Failed to load profile");
    } else {
      setProfile(data);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar workspaceId={workspaceId} />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <Routes>
              <Route index element={
                <>
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold">
                      Welcome back, {profile?.full_name || "there"}!
                    </h1>
                    <p className="text-muted-foreground">
                      Here's what's happening with your workspace today.
                    </p>
                  </div>
                  <DashboardStats workspaceId={workspaceId} userId={session.user.id} />
                </>
              } />
              <Route path="tasks" element={<TasksPage workspaceId={workspaceId} userId={session.user.id} />} />
              <Route path="meetings" element={<MeetingsPage workspaceId={workspaceId} userId={session.user.id} />} />
              <Route path="ideas" element={<IdeasPage workspaceId={workspaceId} userId={session.user.id} />} />
              <Route path="notifications" element={<NotificationsPage workspaceId={workspaceId} userId={session.user.id} />} />
              <Route path="settings" element={<SettingsPage workspaceId={workspaceId} userId={session.user.id} />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
