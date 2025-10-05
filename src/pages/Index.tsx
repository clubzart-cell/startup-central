import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Rocket, ArrowRight, CheckCircle } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
      
      <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
        <div className="flex items-center justify-center mb-8">
          <div className="p-4 rounded-full bg-primary/10 shadow-glow">
            <Rocket className="h-16 w-16 text-primary" />
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent leading-tight">
          Startup Personal Manager
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
          Your team's command center for tasks, meetings, ideas, and collaboration
        </p>

        <div className="grid md:grid-cols-3 gap-6 pt-8 max-w-3xl mx-auto">
          <div className="p-6 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50">
            <CheckCircle className="h-8 w-8 text-primary mb-3 mx-auto" />
            <h3 className="font-semibold mb-2">Task Management</h3>
            <p className="text-sm text-muted-foreground">
              Organize and track tasks with priority levels and deadlines
            </p>
          </div>
          
          <div className="p-6 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50">
            <CheckCircle className="h-8 w-8 text-primary mb-3 mx-auto" />
            <h3 className="font-semibold mb-2">Team Collaboration</h3>
            <p className="text-sm text-muted-foreground">
              Share ideas and coordinate meetings in one workspace
            </p>
          </div>
          
          <div className="p-6 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50">
            <CheckCircle className="h-8 w-8 text-primary mb-3 mx-auto" />
            <h3 className="font-semibold mb-2">Smart Permissions</h3>
            <p className="text-sm text-muted-foreground">
              Admin-controlled access for creating tasks and meetings
            </p>
          </div>
        </div>

        <div className="pt-8">
          <Button 
            size="lg"
            className="gradient-primary hover:opacity-90 transition-smooth shadow-glow text-lg px-8"
            onClick={() => navigate("/auth")}
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
