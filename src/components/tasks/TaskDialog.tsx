import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  userId: string;
  task?: any;
  onSuccess: () => void;
  canCreate: boolean;
}

export const TaskDialog = ({ open, onOpenChange, workspaceId, userId, task, onSuccess, canCreate }: TaskDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    assigned_to: "",
    deadline: "",
  });

  useEffect(() => {
    if (open) {
      fetchMembers();
      if (task) {
        setFormData({
          title: task.title || "",
          description: task.description || "",
          priority: task.priority || "medium",
          assigned_to: task.assigned_to?.id || "",
          deadline: task.deadline ? task.deadline.split("T")[0] : "",
        });
      } else {
        setFormData({
          title: "",
          description: "",
          priority: "medium",
          assigned_to: "",
          deadline: "",
        });
      }
    }
  }, [open, task]);

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("workspace_members")
      .select("user_id, profiles(id, full_name)")
      .eq("workspace_id", workspaceId);

    setMembers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate && !task) return;

    setLoading(true);
    const payload = {
      title: formData.title,
      description: formData.description,
      priority: formData.priority as "low" | "medium" | "high" | "urgent",
      workspace_id: workspaceId,
      created_by: userId,
      assigned_to: formData.assigned_to || null,
      deadline: formData.deadline || null,
    };

    let error;
    if (task) {
      ({ error } = await supabase.from("tasks").update(payload).eq("id", task.id));
    } else {
      ({ error } = await supabase.from("tasks").insert([payload]));
    }

    if (error) {
      toast.error(task ? "Failed to update task" : "Failed to create task");
    } else {
      toast.success(task ? "Task updated!" : "Task created!");
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!task || !canCreate) return;
    
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    
    if (error) {
      toast.error("Failed to delete task");
    } else {
      toast.success("Task deleted");
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              disabled={!canCreate && !task}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              disabled={!canCreate && !task}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
                disabled={!canCreate && !task}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                disabled={!canCreate && !task}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assign To</Label>
            <Select
              value={formData.assigned_to}
              onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
              disabled={!canCreate && !task}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.profiles?.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(canCreate || task) && (
            <div className="flex gap-2 pt-4">
              {task && canCreate && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  className="mr-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="gradient-primary">
                {loading ? "Saving..." : task ? "Update" : "Create"}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
