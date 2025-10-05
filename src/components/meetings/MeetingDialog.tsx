import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  userId: string;
  meeting?: any;
  onSuccess: () => void;
  canCreate: boolean;
}

export const MeetingDialog = ({ open, onOpenChange, workspaceId, userId, meeting, onSuccess, canCreate }: MeetingDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    agenda: "",
    start_time: "",
    end_time: "",
    location: "",
    meeting_link: "",
  });

  useEffect(() => {
    if (open && meeting) {
      setFormData({
        title: meeting.title || "",
        description: meeting.description || "",
        agenda: meeting.agenda || "",
        start_time: meeting.start_time ? meeting.start_time.slice(0, 16) : "",
        end_time: meeting.end_time ? meeting.end_time.slice(0, 16) : "",
        location: meeting.location || "",
        meeting_link: meeting.meeting_link || "",
      });
    } else if (open) {
      setFormData({
        title: "",
        description: "",
        agenda: "",
        start_time: "",
        end_time: "",
        location: "",
        meeting_link: "",
      });
    }
  }, [open, meeting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate && !meeting) return;

    setLoading(true);
    const payload = {
      ...formData,
      workspace_id: workspaceId,
      created_by: userId,
      status: "upcoming" as const,
    };

    let error;
    if (meeting) {
      ({ error } = await supabase.from("meetings").update(payload).eq("id", meeting.id));
    } else {
      ({ error } = await supabase.from("meetings").insert([payload]));
    }

    if (error) {
      toast.error(meeting ? "Failed to update meeting" : "Failed to create meeting");
    } else {
      toast.success(meeting ? "Meeting updated!" : "Meeting scheduled!");
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!meeting || !canCreate) return;
    
    const { error } = await supabase.from("meetings").delete().eq("id", meeting.id);
    
    if (error) {
      toast.error("Failed to delete meeting");
    } else {
      toast.success("Meeting deleted");
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{meeting ? "Edit Meeting" : "Schedule New Meeting"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              disabled={!canCreate && !meeting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              disabled={!canCreate && !meeting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agenda">Agenda</Label>
            <Textarea
              id="agenda"
              value={formData.agenda}
              onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
              rows={3}
              disabled={!canCreate && !meeting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
                disabled={!canCreate && !meeting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
                disabled={!canCreate && !meeting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Conference Room A"
              disabled={!canCreate && !meeting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting_link">Meeting Link</Label>
            <Input
              id="meeting_link"
              type="url"
              value={formData.meeting_link}
              onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
              placeholder="https://meet.google.com/..."
              disabled={!canCreate && !meeting}
            />
          </div>

          {(canCreate || meeting) && (
            <div className="flex gap-2 pt-4">
              {meeting && canCreate && (
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
                {loading ? "Saving..." : meeting ? "Update" : "Schedule"}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
