import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, LogIn, Rocket } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WorkspaceSelectorProps {
  onSelectWorkspace: (workspaceId: string) => void;
}

export const WorkspaceSelector = ({ onSelectWorkspace }: WorkspaceSelectorProps) => {
  const [loading, setLoading] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [userWorkspaces, setUserWorkspaces] = useState<any[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);

  useEffect(() => {
    fetchUserWorkspaces();
  }, []);

  const fetchUserWorkspaces = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("workspace_members")
      .select("workspace_id, workspaces(id, name)")
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to load workspaces");
    } else {
      setUserWorkspaces(data || []);
    }
    setLoadingWorkspaces(false);
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) {
      toast.error("Please enter a workspace name");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .insert({ name: workspaceName, created_by: user.id })
      .select()
      .single();

    if (workspaceError) {
      toast.error("Failed to create workspace");
      setLoading(false);
      return;
    }

    const { error: memberError } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: "admin",
        can_create_tasks: true,
        can_create_meetings: true,
      });

    if (memberError) {
      toast.error("Failed to join workspace");
      setLoading(false);
      return;
    }

    toast.success("Workspace created!");
    onSelectWorkspace(workspace.id);
  };

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      toast.error("Please enter an invite code");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("id")
      .eq("invite_code", inviteCode)
      .single();

    if (workspaceError || !workspace) {
      toast.error("Invalid invite code");
      setLoading(false);
      return;
    }

    const { error: memberError } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: "member",
      });

    if (memberError) {
      if (memberError.code === "23505") {
        toast.error("You're already a member of this workspace");
      } else {
        toast.error("Failed to join workspace");
      }
      setLoading(false);
      return;
    }

    toast.success("Joined workspace!");
    onSelectWorkspace(workspace.id);
  };

  if (loadingWorkspaces) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userWorkspaces.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-card">
          <CardHeader>
            <CardTitle className="text-2xl">Select a Workspace</CardTitle>
            <CardDescription>Choose a workspace to continue or create a new one</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {userWorkspaces.map((item: any) => (
                <Button
                  key={item.workspace_id}
                  variant="outline"
                  className="h-auto p-4 justify-start hover:bg-secondary/50 transition-smooth"
                  onClick={() => onSelectWorkspace(item.workspace_id)}
                >
                  <Rocket className="mr-3 h-5 w-5 text-primary" />
                  <span className="text-lg">{item.workspaces.name}</span>
                </Button>
              ))}
            </div>
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={() => setUserWorkspaces([])}
                variant="outline"
                className="flex-1"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create New
              </Button>
              <Button
                onClick={() => setUserWorkspaces([])}
                variant="outline"
                className="flex-1"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Join with Code
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />

      <Card className="w-full max-w-md shadow-card relative backdrop-blur-sm bg-card/90 border-border/50">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10 shadow-glow">
              <Rocket className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Get Started</CardTitle>
          <CardDescription>Create a new workspace or join an existing one</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="create">Create</TabsTrigger>
              <TabsTrigger value="join">Join</TabsTrigger>
            </TabsList>

            <TabsContent value="create">
              <form onSubmit={handleCreateWorkspace} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Workspace Name</Label>
                  <Input
                    id="workspace-name"
                    placeholder="My Awesome Startup"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full gradient-primary hover:opacity-90 transition-smooth shadow-glow"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Workspace
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="join">
              <form onSubmit={handleJoinWorkspace} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-code">Invite Code</Label>
                  <Input
                    id="invite-code"
                    placeholder="abc123def456"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full gradient-primary hover:opacity-90 transition-smooth shadow-glow"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Join Workspace
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
