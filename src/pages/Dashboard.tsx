import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { WorkspaceSelector } from "@/components/workspace/WorkspaceSelector";
import { DashboardContent } from "@/components/dashboard/DashboardContent";

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingWorkspace, setCheckingWorkspace] = useState(true);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (_event === 'SIGNED_OUT' || !session) {
          setSession(null);
          navigate("/auth");
          return;
        }
        
        // Verify user still exists in database
        if (session) {
          const { error: userError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .single();
            
          if (userError) {
            // User doesn't exist, clear session
            await supabase.auth.signOut();
            localStorage.clear();
            navigate("/auth");
            return;
          }
        }
        
        setSession(session);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error || !session) {
        await supabase.auth.signOut();
        localStorage.clear();
        navigate("/auth");
        setLoading(false);
        return;
      }
      
      // Verify user exists
      const { error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();
        
      if (userError) {
        await supabase.auth.signOut();
        localStorage.clear();
        navigate("/auth");
        setLoading(false);
        return;
      }
      
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const checkWorkspace = async () => {
      const storedWorkspaceId = localStorage.getItem("selectedWorkspace");
      
      if (storedWorkspaceId && session) {
        // Verify the workspace still exists and user has access
        const { data, error } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("workspace_id", storedWorkspaceId)
          .eq("user_id", session.user.id)
          .single();

        if (!error && data) {
          setSelectedWorkspace(storedWorkspaceId);
        } else {
          localStorage.removeItem("selectedWorkspace");
          setSelectedWorkspace(null);
        }
      }
      
      setCheckingWorkspace(false);
    };

    if (!loading && session) {
      checkWorkspace();
    }
  }, [loading, session]);

  if (loading || checkingWorkspace) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleWorkspaceSelect = (workspaceId: string) => {
    localStorage.setItem("selectedWorkspace", workspaceId);
    setSelectedWorkspace(workspaceId);
  };

  if (!selectedWorkspace) {
    return <WorkspaceSelector onSelectWorkspace={handleWorkspaceSelect} />;
  }

  return <DashboardContent workspaceId={selectedWorkspace} session={session!} />;
};

export default Dashboard;
