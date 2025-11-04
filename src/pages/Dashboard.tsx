import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { WorkspaceSelector } from "@/components/workspace/WorkspaceSelector";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { retryWithBackoff } from "@/lib/connection-monitor";
import { measurePerformance } from "@/lib/performance";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { queryCache } from "@/lib/query-cache";
import { tabSync } from "@/lib/tab-sync";

const Dashboard = () => {
  const navigate = useNavigate();
  const { isSlowConnection } = useNetworkStatus();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  
  // Generate unique session fingerprint for this device
  const sessionId = useRef(
    `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  ).current;

  useEffect(() => {
    let mounted = true;
    let isInitialLoad = true;
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

        // 2. Fetch profile with cache and deduplication
        const profileData = await queryCache.getCached(
          `profile-${session.user.id}`,
          async () => {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();
            return data;
          },
          10 * 60 * 1000 // 10 min cache for profile
        );
        
        if (!profileData) {
          await handleAuthError();
          return;
        }

        // 3. Check workspace membership with cache
        const storedWorkspaceId = localStorage.getItem("selectedWorkspace");
        if (storedWorkspaceId) {
          const membership = await queryCache.getCached(
            `membership-${session.user.id}-${storedWorkspaceId}`,
            async () => {
              const { data } = await supabase
                .from("workspace_members")
                .select("workspace_id")
                .eq("workspace_id", storedWorkspaceId)
                .eq("user_id", session.user.id)
                .maybeSingle();
              return data;
            },
            5 * 60 * 1000 // 5 min cache
          );
          
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

    // CRITICAL FIX: Only respond to auth changes on initial load or explicit sign-out
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log(`[${sessionId}] Auth event:`, event);
        
        // Only handle SIGNED_OUT - ignore other events to prevent loops
        if (event === 'SIGNED_OUT' || !session) {
          handleAuthError();
          return;
        }
        
        // On SIGNED_IN, only update if this is initial load
        if (event === 'SIGNED_IN' && isInitialLoad) {
          setSession(session);
        }
        
        // Mark initial load complete after first event
        isInitialLoad = false;
      }
    );

    initialize();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, isSlowConnection]);

  // Tab synchronization for workspace selection
  useEffect(() => {
    // Notify other tabs when workspace changes
    if (selectedWorkspace) {
      tabSync.broadcast('workspace-selected', selectedWorkspace);
    }

    // Listen for workspace changes from other tabs
    const handleWorkspaceChange = (data: any) => {
      const workspaceId = data?.data;
      if (workspaceId && workspaceId !== selectedWorkspace) {
        setSelectedWorkspace(workspaceId);
        localStorage.setItem("selectedWorkspace", workspaceId);
      }
    };

    tabSync.on('workspace-selected', handleWorkspaceChange);

    return () => {
      tabSync.off('workspace-selected', handleWorkspaceChange);
    };
  }, [selectedWorkspace]);

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
