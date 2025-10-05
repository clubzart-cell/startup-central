import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, UserPlus, Shield, Trash2 } from "lucide-react";

interface SettingsPageProps {
  workspaceId: string;
  userId: string;
}

export const SettingsPage = ({ workspaceId, userId }: SettingsPageProps) => {
  const [workspace, setWorkspace] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkspaceData();
    fetchMembers();
    checkAdminStatus();
  }, [workspaceId, userId]);

  const checkAdminStatus = async () => {
    const { data } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .single();

    setIsAdmin(data?.role === "admin");
  };

  const fetchWorkspaceData = async () => {
    const { data } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single();

    setWorkspace(data);
    setLoading(false);
  };

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("workspace_members")
      .select("*, profiles(id, full_name)")
      .eq("workspace_id", workspaceId)
      .order("joined_at", { ascending: true });

    setMembers(data || []);
  };

  const copyInviteCode = () => {
    if (workspace?.invite_code) {
      navigator.clipboard.writeText(workspace.invite_code);
      toast.success("Invite code copied to clipboard!");
    }
  };

  const updateMemberPermission = async (memberId: string, field: string, value: boolean) => {
    if (!isAdmin) return;

    const { error } = await supabase
      .from("workspace_members")
      .update({ [field]: value })
      .eq("id", memberId);

    if (error) {
      toast.error("Failed to update permission");
    } else {
      fetchMembers();
      toast.success("Permission updated");
    }
  };

  const removeMember = async (memberId: string) => {
    if (!isAdmin) return;

    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      toast.error("Failed to remove member");
    } else {
      fetchMembers();
      toast.success("Member removed");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card className="gradient-card border-border/50">
        <CardHeader>
          <CardTitle>Workspace Information</CardTitle>
          <CardDescription>Basic details about your workspace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Workspace Name</Label>
            <p className="text-lg font-semibold mt-1">{workspace?.name}</p>
          </div>

          <div>
            <Label>Invite Code</Label>
            <div className="flex gap-2 mt-1">
              <Input value={workspace?.invite_code || ""} readOnly className="font-mono" />
              <Button onClick={copyInviteCode} variant="outline">
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Share this code with others to invite them to your workspace
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="gradient-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage workspace members and their permissions</CardDescription>
            </div>
            <Badge variant="outline">{members.length} members</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{member.profiles?.full_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={member.role === "admin" ? "default" : "outline"} className="h-5">
                        {member.role}
                      </Badge>
                      {member.user_id === userId && (
                        <span className="text-xs text-muted-foreground">(You)</span>
                      )}
                    </div>
                  </div>
                </div>

                {isAdmin && member.role !== "admin" && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`tasks-${member.id}`} className="text-sm">Can Create Tasks</Label>
                      <Switch
                        id={`tasks-${member.id}`}
                        checked={member.can_create_tasks}
                        onCheckedChange={(checked) =>
                          updateMemberPermission(member.id, "can_create_tasks", checked)
                        }
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Label htmlFor={`meetings-${member.id}`} className="text-sm">Can Create Meetings</Label>
                      <Switch
                        id={`meetings-${member.id}`}
                        checked={member.can_create_meetings}
                        onCheckedChange={(checked) =>
                          updateMemberPermission(member.id, "can_create_meetings", checked)
                        }
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMember(member.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {!isAdmin && (
        <Card className="gradient-card border-border/50 border-yellow-500/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-yellow-500" />
              <CardTitle>Limited Access</CardTitle>
            </div>
            <CardDescription>
              You are a member of this workspace. Contact an admin to change permissions or workspace settings.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};
