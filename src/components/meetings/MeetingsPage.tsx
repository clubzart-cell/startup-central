import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Clock, MapPin, Video } from "lucide-react";
import { toast } from "sonner";
import { MeetingDialog } from "./MeetingDialog";

interface MeetingsPageProps {
  workspaceId: string;
  userId: string;
}

const statusColors = {
  upcoming: "bg-primary text-primary-foreground",
  ongoing: "bg-green-500 text-white",
  ended: "bg-muted text-muted-foreground",
};

export const MeetingsPage = ({ workspaceId, userId }: MeetingsPageProps) => {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    fetchMeetings();
    checkPermissions();
  }, [workspaceId, userId]);

  const checkPermissions = async () => {
    const { data } = await supabase
      .from("workspace_members")
      .select("role, can_create_meetings")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .single();

    setCanCreate(data?.role === "admin" || data?.can_create_meetings === true);
  };

  const fetchMeetings = async () => {
    const { data, error } = await supabase
      .from("meetings")
      .select("*, created_by(full_name)")
      .eq("workspace_id", workspaceId)
      .order("start_time", { ascending: true });

    if (error) {
      toast.error("Failed to load meetings");
    } else {
      setMeetings(data || []);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading meetings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Meetings</h1>
        {canCreate && (
          <Button onClick={() => setDialogOpen(true)} className="gradient-primary shadow-glow">
            <Plus className="h-4 w-4 mr-2" />
            Schedule Meeting
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {meetings.map((meeting) => (
          <Card
            key={meeting.id}
            className="gradient-card border-border/50 hover:shadow-card transition-smooth cursor-pointer"
            onClick={() => {
              setSelectedMeeting(meeting);
              setDialogOpen(true);
            }}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="flex-1">
                <CardTitle className="text-xl">{meeting.title}</CardTitle>
                {meeting.description && (
                  <p className="text-sm text-muted-foreground mt-2">{meeting.description}</p>
                )}
              </div>
              <Badge className={statusColors[meeting.status as keyof typeof statusColors]}>
                {meeting.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(meeting.start_time).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {new Date(meeting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                  {new Date(meeting.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {meeting.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {meeting.location}
                </div>
              )}
              {meeting.meeting_link && (
                <div className="flex items-center gap-2 text-sm">
                  <Video className="h-4 w-4 text-primary" />
                  <a
                    href={meeting.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Join Meeting
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {meetings.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No meetings scheduled. {canCreate && "Schedule your first meeting!"}
          </div>
        )}
      </div>

      <MeetingDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedMeeting(null);
        }}
        workspaceId={workspaceId}
        userId={userId}
        meeting={selectedMeeting}
        onSuccess={fetchMeetings}
        canCreate={canCreate}
      />
    </div>
  );
};
