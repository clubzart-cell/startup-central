import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { WorkspaceSelector } from "@/components/workspace/WorkspaceSelector";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { retryWithBackoff } from "@/lib/connection-monitor";
import { measurePerformance } from "@/lib/performance";
import { useNetworkStatus } from "@/hooks/use-network-status";

const Dashboard = () => {
  const navigate = useNavigate();
  const { isSlowConnection } = useNetworkStatus();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const perf = measurePerformance('Dashboard initialization');
    
    const handleAuthError = async () => {
      if (!mounted) return;
      localStorage.clear();
      sessionStorage.clear();
      await supabase.auth.signOut();
      window.location.href = "/auth";
    };
    
    const initialize = async () => {
      try {
        // 1. Get session with retry logic
        const { data: { session }, error: sessionError } = await retryWithBackoff(
          () => supabase.auth.getSession(),
          isSlowConnection ? 5 : 3
        );
        
        if (sessionError || !session) {
          await handleAuthError();
          return;
        }

        // 2. Fetch profile (consolidate into single call)
        const { data: profileData } = await retryWithBackoff(async () => {
          return await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
        });
        
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
          perf.end();
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

    initialize();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, isSlowConnection]);

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
