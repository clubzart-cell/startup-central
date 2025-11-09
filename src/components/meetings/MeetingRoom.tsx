import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Video, MapPin, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { TaskDialog } from "../tasks/TaskDialog";
import { IdeaDialog } from "../ideas/IdeaDialog";

interface MeetingRoomProps {
  workspaceId: string;
  userId: string;
}

export const MeetingRoom = ({ workspaceId, userId }: MeetingRoomProps) => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [ideaDialogOpen, setIdeaDialogOpen] = useState(false);
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    fetchMeeting();
    checkPermissions();
  }, [meetingId]);

  const checkPermissions = async () => {
    const { data } = await supabase
      .from("workspace_members")
      .select("role, can_create_tasks, can_create_meetings")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      setCanCreate(data.role === "admin" || data.can_create_tasks === true);
    }
  };

  const fetchMeeting = async () => {
    const { data, error } = await supabase
      .from("meetings")
      .select("*, created_by(full_name)")
      .eq("id", meetingId)
      .maybeSingle();

    if (error || !data) {
      toast.error("Meeting not found");
      navigate("/dashboard/meetings");
      return;
    }

    setMeeting(data);
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading meeting...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard/meetings")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Meetings
        </Button>
      </div>

      <Card className="gradient-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{meeting.title}</CardTitle>
              <Badge className="mb-4">{meeting.status}</Badge>
            </div>
          </div>
          
          <div className="space-y-3 mt-4">
            <div className="flex items-center gap-3 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              {new Date(meeting.start_time).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            
            <div className="flex items-center gap-3 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              {new Date(meeting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
              {new Date(meeting.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>

            {meeting.location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                {meeting.location}
              </div>
            )}

            {meeting.meeting_link && (
              <div className="flex items-center gap-3">
                <Video className="h-5 w-5 text-primary" />
                <a
                  href={meeting.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Join Video Meeting
                </a>
              </div>
            )}
          </div>
        </CardHeader>

        {meeting.description && (
          <CardContent>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground">{meeting.description}</p>
          </CardContent>
        )}

        {meeting.agenda && (
          <CardContent>
            <h3 className="font-semibold mb-2">Agenda</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{meeting.agenda}</p>
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tasks">Create Task</TabsTrigger>
          <TabsTrigger value="ideas">Add Idea</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Task During Meeting</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Quickly create tasks while the meeting is ongoing to capture action items.
              </p>
              <Button onClick={() => setTaskDialogOpen(true)} disabled={!canCreate}>
                Create New Task
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ideas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Ideas from Meeting</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Capture innovative ideas and suggestions discussed during the meeting.
              </p>
              <Button onClick={() => setIdeaDialogOpen(true)}>
                Add New Idea
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        workspaceId={workspaceId}
        userId={userId}
        onSuccess={() => {
          toast.success("Task created from meeting!");
          setTaskDialogOpen(false);
        }}
        canCreate={canCreate}
      />

      <IdeaDialog
        open={ideaDialogOpen}
        onOpenChange={setIdeaDialogOpen}
        workspaceId={workspaceId}
        userId={userId}
        onSuccess={() => {
          toast.success("Idea added from meeting!");
          setIdeaDialogOpen(false);
        }}
        onStatusChange={() => {}}
      />
    </div>
  );
};
