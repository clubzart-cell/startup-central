import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, AlertCircle, Calendar, Loader2, Clock, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, [workspaceId, userId]);

  const fetchStats = async () => {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("assigned_to", userId)
      .order("deadline", { ascending: true, nullsFirst: false });

    const { data: meetings } = await supabase
      .from("meetings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true })
      .limit(5);

    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter((t) => t.status === "completed").length || 0;
    const pendingTasks = totalTasks - completedTasks;
    const urgentTasks = tasks?.filter((t) => t.priority === "urgent" && t.status !== "completed").length || 0;
    const todayMeetings = meetings?.length || 0;

    setStats({
      totalTasks,
      completedTasks,
      pendingTasks,
      urgentTasks,
      todayMeetings,
    });
    setAssignedTasks(tasks?.slice(0, 5) || []);
    setUpcomingMeetings(meetings || []);
    setLoading(false);
  };

  const updateTaskStatus = async (taskId: string, newStatus: "pending" | "ongoing" | "pending_approval" | "completed") => {
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);
    
    if (error) {
      toast.error("Failed to update task status");
    } else {
      fetchStats();
      if (newStatus === "pending_approval") {
        toast.success("Completion request sent to admin");
      } else if (newStatus === "ongoing") {
        toast.success("Task marked as ongoing");
      }
    }
  };

  const priorityColors = {
    low: "bg-priority-low text-primary-foreground",
    medium: "bg-priority-medium text-primary-foreground",
    high: "bg-priority-high text-primary-foreground",
    urgent: "bg-priority-urgent text-primary-foreground",
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
    <div className="space-y-6">
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Assigned Tasks Detail */}
        <Card className="gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              My Assigned Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No tasks assigned</p>
            ) : (
              assignedTasks.map((task) => (
                <div key={task.id} className="flex flex-col gap-2 p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-smooth">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                        <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                          {task.priority}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {task.deadline && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(task.deadline).toLocaleDateString()}
                          </div>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {task.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTaskStatus(task.id, "ongoing")}
                      className="w-full"
                    >
                      Start Task
                    </Button>
                  )}
                  {task.status === "ongoing" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTaskStatus(task.id, "pending_approval")}
                      className="w-full"
                    >
                      Request Completion
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming Meetings Detail */}
        <Card className="gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Meetings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No upcoming meetings</p>
            ) : (
              upcomingMeetings.map((meeting) => (
                <div key={meeting.id} className="p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-smooth">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-base">{meeting.title}</h4>
                    <Badge className="bg-primary text-primary-foreground">
                      {meeting.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <Calendar className="h-4 w-4" />
                      {new Date(meeting.start_time).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <Clock className="h-4 w-4" />
                      {new Date(meeting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' - '}
                      {new Date(meeting.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {meeting.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{meeting.description}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
