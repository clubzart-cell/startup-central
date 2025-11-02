import { LayoutDashboard, CheckSquare, Calendar, Lightbulb, Bell, Settings, LogOut } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AppSidebarProps {
  workspaceId: string;
}

const navItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { title: "Tasks", icon: CheckSquare, path: "/dashboard/tasks" },
  { title: "Meetings", icon: Calendar, path: "/dashboard/meetings" },
  { title: "Ideas", icon: Lightbulb, path: "/dashboard/ideas" },
  { title: "Notifications", icon: Bell, path: "/dashboard/notifications" },
];

export function AppSidebar({ workspaceId }: AppSidebarProps) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      // 1. Sign out globally on server
      await supabase.auth.signOut({ scope: 'global' });
      
      // 2. Clear all local state
      localStorage.clear();
      sessionStorage.clear();
      
      // 3. Clear IndexedDB for Android WebView
      if (window.indexedDB) {
        const dbs = await window.indexedDB.databases();
        dbs.forEach(db => {
          if (db.name?.includes('supabase')) {
            window.indexedDB.deleteDatabase(db.name);
          }
        });
      }
      
      toast.success("Signed out successfully");
      
      // 4. Force full page reload with cache clear
      window.location.replace("/auth");
    } catch (error) {
      console.error('Sign out error:', error);
      // Force logout anyway
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace("/auth");
    }
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.path}
                      end={item.path === "/dashboard"}
                      className={({ isActive }) => 
                        isActive ? "bg-accent text-accent-foreground" : ""
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
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
                  <NavLink 
                    to="/dashboard/settings"
                    className={({ isActive }) => 
                      isActive ? "bg-accent text-accent-foreground" : ""
                    }
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </NavLink>
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
