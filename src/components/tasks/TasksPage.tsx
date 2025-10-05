import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Calendar, User } from "lucide-react";
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

const statusColumns = [
  { id: "pending", title: "Pending", filter: (task: any) => !task.is_completed },
  { id: "ongoing", title: "Ongoing", filter: (task: any) => !task.is_completed && (task.priority === "high" || task.priority === "urgent") },
  { id: "completed", title: "Completed", filter: (task: any) => task.is_completed },
];

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
      .select(`
        *,
        assigned_to_profile:assigned_to(full_name),
        created_by_profile:created_by(full_name)
      `)
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

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tasks</h1>
        {canCreate && (
          <Button onClick={() => setDialogOpen(true)} className="gradient-primary shadow-glow">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statusColumns.map((column) => {
          const columnTasks = tasks.filter(column.filter);
          return (
            <div key={column.id} className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg">{column.title}</h2>
                <Badge variant="outline" className="ml-auto">
                  {columnTasks.length}
                </Badge>
              </div>

              <div className="space-y-3">
                {columnTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="gradient-card border-border/50 hover:shadow-card transition-smooth cursor-pointer"
                    onClick={() => {
                      setSelectedTask(task);
                      setDialogOpen(true);
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={task.is_completed}
                          onCheckedChange={() => toggleTaskComplete(task.id, task.is_completed)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base mb-2">
                            <span className={task.is_completed ? 'line-through text-muted-foreground' : ''}>
                              {task.title}
                            </span>
                          </CardTitle>
                          <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {task.description}
                        </p>
                      )}
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {task.deadline && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.deadline).toLocaleDateString()}
                          </div>
                        )}
                        {task.assigned_to_profile?.full_name && (
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            {task.assigned_to_profile.full_name}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
                    No {column.title.toLowerCase()} tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
