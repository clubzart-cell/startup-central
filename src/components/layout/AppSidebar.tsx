import { LayoutDashboard, CheckSquare, Calendar, Lightbulb, Bell, Settings, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AppSidebarProps {
  workspaceId: string;
  onNavigate: (page: string) => void;
  currentPage: string;
}

const navItems = [
  { title: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { title: "Tasks", icon: CheckSquare, id: "tasks" },
  { title: "Meetings", icon: Calendar, id: "meetings" },
  { title: "Ideas", icon: Lightbulb, id: "ideas" },
  { title: "Notifications", icon: Bell, id: "notifications" },
];

export function AppSidebar({ workspaceId, onNavigate, currentPage }: AppSidebarProps) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth");
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={currentPage === item.id}
                  >
                    <button 
                      className="flex items-center gap-2 w-full"
                      onClick={() => onNavigate(item.id)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button 
                    className="flex items-center gap-2 w-full"
                    onClick={() => onNavigate("settings")}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button 
                    className="flex items-center gap-2 w-full text-destructive hover:text-destructive"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
