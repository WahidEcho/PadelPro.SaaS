import {
  Calendar,
  Home,
  Users,
  DollarSign,
  ClipboardList,
  Settings,
  PanelLeft,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

export function DashboardSidebar() {
  const { isAdmin, isEmployee } = useAuth();
  const { state, toggleSidebar } = useSidebar ? useSidebar() : { state: "expanded", toggleSidebar: () => {} };
  
  // Define menu items based on user roles
  const menuItems = [
    {
      title: "Dashboard",
      icon: Home,
      path: "/",
      visible: true, // Visible to all authenticated users
    },
    {
      title: "Courts",
      icon: ClipboardList,
      path: "/courts",
      visible: true, // Visible to all authenticated users
    },
    {
      title: "Reservations",
      icon: Calendar,
      path: "/reservations",
      visible: true, // Visible to all authenticated users
    },
    {
      title: "Clients",
      icon: Users,
      path: "/clients",
      visible: true, // Visible to all authenticated users
    },
    {
      title: "Financials",
      icon: DollarSign,
      path: "/financials",
      visible: isAdmin, // Only visible to admin users
    },
    {
      title: "Settings",
      icon: Settings,
      path: "/settings",
      visible: isAdmin, // Only visible to admin users
    },
  ];

  // Filter menu items based on visibility
  const visibleMenuItems = menuItems.filter(item => item.visible);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2">
          {state === "collapsed" && (
            <button
              type="button"
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition mr-1"
              onClick={toggleSidebar}
              aria-label="Expand Sidebar"
            >
              <PanelLeft className="h-5 w-5 rotate-180" />
            </button>
          )}
          <div className="rounded-md bg-padel-primary p-1">
            <div className="h-5 w-5 text-white font-semibold flex items-center justify-center">P</div>
          </div>
          <span className="font-bold text-lg">PadelPro Manager</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {visibleMenuItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <Link to={item.path} className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-4 flex gap-2">
          <SidebarTrigger />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
