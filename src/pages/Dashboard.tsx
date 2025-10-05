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
    let mounted = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        
        if (_event === 'SIGNED_OUT' || !session) {
          setSession(null);
          localStorage.clear();
          window.location.href = "/auth";
          return;
        }
        
        // Verify user still exists in database
        if (session) {
          try {
            const { error: userError } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', session.user.id)
              .single();
              
            if (userError || !mounted) {
              // User doesn't exist, clear session
              await supabase.auth.signOut();
              localStorage.clear();
              window.location.href = "/auth";
              return;
            }
            
            setSession(session);
          } catch (e) {
            console.error('Auth verification error:', e);
            await supabase.auth.signOut();
            localStorage.clear();
            window.location.href = "/auth";
          }
        }
      }
    );

    // Add timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (loading && mounted) {
        console.error('Loading timeout - clearing session');
        supabase.auth.signOut();
        localStorage.clear();
        window.location.href = "/auth";
      }
    }, 10000); // 10 second timeout

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;
      
      if (error || !session) {
        await supabase.auth.signOut();
        localStorage.clear();
        setLoading(false);
        navigate("/auth");
        return;
      }
      
      // Verify user exists
      try {
        const { error: userError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single();
          
        if (userError) {
          await supabase.auth.signOut();
          localStorage.clear();
          setLoading(false);
          navigate("/auth");
          return;
        }
        
        if (mounted) {
          setSession(session);
          setLoading(false);
        }
      } catch (e) {
        console.error('Session verification error:', e);
        await supabase.auth.signOut();
        localStorage.clear();
        setLoading(false);
        navigate("/auth");
      }
    });

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    let mounted = true;
    
    const checkWorkspace = async () => {
      const storedWorkspaceId = localStorage.getItem("selectedWorkspace");
      
      if (storedWorkspaceId && session) {
        try {
          // Verify the workspace still exists and user has access
          const { data, error } = await supabase
            .from("workspace_members")
            .select("workspace_id")
            .eq("workspace_id", storedWorkspaceId)
            .eq("user_id", session.user.id)
            .single();

          if (mounted) {
            if (!error && data) {
              setSelectedWorkspace(storedWorkspaceId);
            } else {
              localStorage.removeItem("selectedWorkspace");
              setSelectedWorkspace(null);
            }
          }
        } catch (e) {
          console.error('Workspace check error:', e);
          if (mounted) {
            localStorage.removeItem("selectedWorkspace");
            setSelectedWorkspace(null);
          }
        }
      }
      
      if (mounted) {
        setCheckingWorkspace(false);
      }
    };

    if (!loading && session) {
      checkWorkspace();
    }
    
    return () => {
      mounted = false;
    };
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
