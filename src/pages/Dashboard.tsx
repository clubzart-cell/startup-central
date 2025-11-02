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
  const [profile, setProfile] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const handleAuthError = async () => {
      if (!mounted) return;
      localStorage.clear();
      sessionStorage.clear();
      await supabase.auth.signOut();
      window.location.href = "/auth";
    };
    
    const initialize = async () => {
      try {
        // 1. Get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          await handleAuthError();
          return;
        }

        // 2. Fetch profile (consolidate into single call)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (!profileData) {
          await handleAuthError();
          return;
        }

        // 3. Check workspace membership
        const storedWorkspaceId = localStorage.getItem("selectedWorkspace");
        if (storedWorkspaceId) {
          const { data: membership } = await supabase
            .from("workspace_members")
            .select("workspace_id")
            .eq("workspace_id", storedWorkspaceId)
            .eq("user_id", session.user.id)
            .maybeSingle();
          
          if (membership && mounted) {
            setSelectedWorkspace(storedWorkspaceId);
          } else if (mounted) {
            localStorage.removeItem("selectedWorkspace");
          }
        }

        if (mounted) {
          setSession(session);
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Initialization error:', error);
        await handleAuthError();
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        if (event === 'SIGNED_OUT' || !session) {
          handleAuthError();
          return;
        }
        
        if (event === 'SIGNED_IN' && session) {
          setSession(session);
        }
      }
    );

    // Timeout for slow connections
    const timeout = setTimeout(() => {
      if (mounted && isInitializing) {
        console.error('Initialization timeout');
        handleAuthError();
      }
    }, 30000); // 30 second timeout

    initialize();

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (isInitializing) {
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

  return <DashboardContent workspaceId={selectedWorkspace} session={session!} profile={profile} />;
};

export default Dashboard;
