
import {
  Calendar,
  Home,
  Users,
  DollarSign,
  ClipboardList,
  Settings,
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
} from "@/components/ui/sidebar";
import { Link } from "react-router-dom";

const menuItems = [
  {
    title: "Dashboard",
    icon: Home,
    path: "/",
  },
  {
    title: "Courts",
    icon: ClipboardList,
    path: "/courts",
  },
  {
    title: "Reservations",
    icon: Calendar,
    path: "/reservations",
  },
  {
    title: "Clients",
    icon: Users,
    path: "/clients",
  },
  {
    title: "Financials",
    icon: DollarSign,
    path: "/financials",
  },
  {
    title: "Settings",
    icon: Settings,
    path: "/settings",
  },
];

export function DashboardSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2">
          <div className="rounded-md bg-padel-primary p-1">
            <div className="h-5 w-5 text-white font-semibold flex items-center justify-center">P</div>
          </div>
          <span className="font-bold text-lg">PadelPro Manager</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {menuItems.map((item) => (
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
        <div className="p-4">
          <SidebarTrigger />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
