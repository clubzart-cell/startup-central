import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, AlertCircle, Calendar, Loader2 } from "lucide-react";

interface DashboardStatsProps {
  workspaceId: string;
  userId: string;
}

export const DashboardStats = ({ workspaceId, userId }: DashboardStatsProps) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    urgentTasks: 0,
    todayMeetings: 0,
  });

  useEffect(() => {
    fetchStats();
  }, [workspaceId, userId]);

  const fetchStats = async () => {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("assigned_to", userId);

    const { data: meetings } = await supabase
      .from("meetings")
      .select("*, meeting_participants!inner(user_id)")
      .eq("workspace_id", workspaceId)
      .eq("meeting_participants.user_id", userId)
      .gte("start_time", new Date().toISOString().split("T")[0])
      .lt("start_time", new Date(Date.now() + 86400000).toISOString().split("T")[0]);

    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter((t) => t.is_completed).length || 0;
    const pendingTasks = totalTasks - completedTasks;
    const urgentTasks = tasks?.filter((t) => t.priority === "urgent" && !t.is_completed).length || 0;
    const todayMeetings = meetings?.length || 0;

    setStats({
      totalTasks,
      completedTasks,
      pendingTasks,
      urgentTasks,
      todayMeetings,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const completionRate = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card className="gradient-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          <Circle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalTasks}</div>
          <p className="text-xs text-muted-foreground">Assigned to you</p>
        </CardContent>
      </Card>

      <Card className="gradient-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.completedTasks}</div>
          <p className="text-xs text-muted-foreground">
            {completionRate}% completion rate
          </p>
        </CardContent>
      </Card>

      <Card className="gradient-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending</CardTitle>
          <Circle className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pendingTasks}</div>
          <p className="text-xs text-muted-foreground">Tasks remaining</p>
        </CardContent>
      </Card>

      <Card className="gradient-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Urgent</CardTitle>
          <AlertCircle className="h-4 w-4 text-priority-urgent" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-priority-urgent">{stats.urgentTasks}</div>
          <p className="text-xs text-muted-foreground">Need attention</p>
        </CardContent>
      </Card>

      <Card className="gradient-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Meetings</CardTitle>
          <Calendar className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.todayMeetings}</div>
          <p className="text-xs text-muted-foreground">Scheduled</p>
        </CardContent>
      </Card>
    </div>
  );
};
