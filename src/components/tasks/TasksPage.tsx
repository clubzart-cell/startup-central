import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Filter } from "lucide-react";
import { toast } from "sonner";
import { TaskDialog } from "./TaskDialog";

interface TasksPageProps {
  workspaceId: string;
  userId: string;
}

const priorityColors = {
  low: "bg-priority-low text-foreground border-border",
  medium: "bg-priority-medium text-primary-foreground",
  high: "bg-priority-high text-white",
  urgent: "bg-priority-urgent text-white",
};

export const TasksPage = ({ workspaceId, userId }: TasksPageProps) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    fetchTasks();
    checkPermissions();
  }, [workspaceId, userId]);

  const checkPermissions = async () => {
    const { data } = await supabase
      .from("workspace_members")
      .select("role, can_create_tasks")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .single();

    setCanCreate(data?.role === "admin" || data?.can_create_tasks === true);
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*, assigned_to(full_name), created_by(full_name)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load tasks");
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  const toggleTaskComplete = async (taskId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("tasks")
      .update({ is_completed: !currentStatus })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update task");
    } else {
      fetchTasks();
      toast.success(currentStatus ? "Task marked incomplete" : "Task completed!");
    }
  };

  const filteredTasks = filterPriority
    ? tasks.filter((t) => t.priority === filterPriority)
    : tasks;

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterPriority(null)}
            className={!filterPriority ? "bg-secondary" : ""}
          >
            <Filter className="h-4 w-4 mr-2" />
            All
          </Button>
          {["low", "medium", "high", "urgent"].map((priority) => (
            <Button
              key={priority}
              variant="outline"
              size="sm"
              onClick={() => setFilterPriority(priority)}
              className={filterPriority === priority ? "bg-secondary" : ""}
            >
              {priority}
            </Button>
          ))}
          {canCreate && (
            <Button onClick={() => setDialogOpen(true)} className="gradient-primary shadow-glow">
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredTasks.map((task) => (
          <Card
            key={task.id}
            className="gradient-card border-border/50 hover:shadow-card transition-smooth cursor-pointer"
            onClick={() => {
              setSelectedTask(task);
              setDialogOpen(true);
            }}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div className="flex items-start gap-3 flex-1">
                <Checkbox
                  checked={task.is_completed}
                  onCheckedChange={() => toggleTaskComplete(task.id, task.is_completed)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1"
                />
                <div className="flex-1">
                  <CardTitle className={task.is_completed ? "line-through text-muted-foreground" : ""}>
                    {task.title}
                  </CardTitle>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                  )}
                </div>
              </div>
              <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                {task.priority}
              </Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Assigned to: {task.assigned_to?.full_name || "Unassigned"}
                </span>
                {task.deadline && (
                  <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredTasks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No tasks found. {canCreate && "Create your first task to get started!"}
          </div>
        )}
      </div>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedTask(null);
        }}
        workspaceId={workspaceId}
        userId={userId}
        task={selectedTask}
        onSuccess={fetchTasks}
        canCreate={canCreate}
      />
    </div>
  );
};
