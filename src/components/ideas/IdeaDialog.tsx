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

interface IdeaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  userId: string;
  idea?: any;
  onSuccess: () => void;
  onStatusChange: (ideaId: string, status: string) => void;
}

export const IdeaDialog = ({ open, onOpenChange, workspaceId, userId, idea, onSuccess, onStatusChange }: IdeaDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "proposed",
  });

  useEffect(() => {
    if (open && idea) {
      setFormData({
        title: idea.title || "",
        description: idea.description || "",
        status: idea.status || "proposed",
      });
    } else if (open) {
      setFormData({
        title: "",
        description: "",
        status: "proposed",
      });
    }
  }, [open, idea]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    const payload = {
      ...formData,
      workspace_id: workspaceId,
      created_by: userId,
    };

    let error;
    if (idea) {
      ({ error } = await supabase.from("ideas").update(payload).eq("id", idea.id));
    } else {
      ({ error } = await supabase.from("ideas").insert([payload]));
    }

    if (error) {
      toast.error(idea ? "Failed to update idea" : "Failed to create idea");
    } else {
      toast.success(idea ? "Idea updated!" : "Idea created!");
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!idea) return;
    
    const { error } = await supabase.from("ideas").delete().eq("id", idea.id);
    
    if (error) {
      toast.error("Failed to delete idea");
    } else {
      toast.success("Idea deleted");
      onSuccess();
      onOpenChange(false);
    }
  };

  const canEdit = !idea || idea.created_by?.id === userId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{idea ? "Edit Idea" : "Share New Idea"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              disabled={!canEdit}
            />
          </div>

          {idea && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => {
                  setFormData({ ...formData, status: value });
                  if (idea) {
                    onStatusChange(idea.id, value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposed">Proposed</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            {idea && canEdit && (
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
            {canEdit && (
              <Button type="submit" disabled={loading} className="gradient-primary">
                {loading ? "Saving..." : idea ? "Update" : "Create"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
