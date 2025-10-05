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
    let isVerifying = false; // Prevent duplicate verification calls
    
    const verifyUser = async (session: Session): Promise<boolean> => {
      if (isVerifying) return false;
      isVerifying = true;
      
      try {
        const { error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .maybeSingle();
          
        isVerifying = false;
        return !error;
      } catch (e) {
        console.error('User verification error:', e);
        isVerifying = false;
        return false;
      }
    };
    
    const handleAuthError = async () => {
      if (!mounted) return;
      localStorage.clear();
      await supabase.auth.signOut();
      window.location.href = "/auth";
    };
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        
        if (_event === 'SIGNED_OUT' || !session) {
          setSession(null);
          localStorage.clear();
          window.location.href = "/auth";
          return;
        }
        
        if (session) {
          const isValid = await verifyUser(session);
          if (!isValid || !mounted) {
            await handleAuthError();
            return;
          }
          setSession(session);
        }
      }
    );

    // Reduced timeout and better error handling
    const loadingTimeout = setTimeout(() => {
      if (loading && mounted) {
        console.error('Loading timeout - retrying...');
        handleAuthError();
      }
    }, 15000); // 15 second timeout

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;
      
      if (error || !session) {
        await handleAuthError();
        setLoading(false);
        return;
      }
      
      const isValid = await verifyUser(session);
      if (!isValid || !mounted) {
        await handleAuthError();
        setLoading(false);
        return;
      }
      
      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    }).catch(async (e) => {
      console.error('Session check error:', e);
      if (mounted) {
        await handleAuthError();
        setLoading(false);
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
    let isChecking = false; // Prevent duplicate workspace checks
    
    const checkWorkspace = async () => {
      if (isChecking || !session) return;
      isChecking = true;
      
      const storedWorkspaceId = localStorage.getItem("selectedWorkspace");
      
      if (storedWorkspaceId) {
        try {
          const { data, error } = await supabase
            .from("workspace_members")
            .select("workspace_id")
            .eq("workspace_id", storedWorkspaceId)
            .eq("user_id", session.user.id)
            .maybeSingle();

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
        isChecking = false;
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
