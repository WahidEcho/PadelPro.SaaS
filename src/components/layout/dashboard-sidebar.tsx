import React from "react";
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
import { useLanguage } from "@/contexts/language-context";

export function DashboardSidebar({ order = 1 }: { order?: number }) {
  const { isAdmin, isEmployee } = useAuth();
  const { state, toggleSidebar } = useSidebar ? useSidebar() : { state: "expanded", toggleSidebar: () => {} };
  const { t, language } = useLanguage();
  
  // Define menu items based on user roles
  const menuItems = [
    {
      title: t("dashboard"),
      icon: Home,
      path: "/",
      visible: isAdmin, // Only visible to admin users
    },
    {
      title: t("courts"),
      icon: ClipboardList,
      path: "/courts",
      visible: isAdmin, // Only visible to admin users
    },
    {
      title: t("reservations"),
      icon: Calendar,
      path: "/reservations",
      visible: true, // Visible to all authenticated users
    },
    {
      title: t("clients"),
      icon: Users,
      path: "/clients",
      visible: isAdmin, // Only visible to admin users
    },
    {
      title: t("financials"),
      icon: DollarSign,
      path: "/financials",
      visible: isAdmin, // Only visible to admin users
    },
    {
      title: t("settings"),
      icon: Settings,
      path: "/settings",
      visible: isAdmin, // Only visible to admin users
    },
  ];

  // For employees, only show Reservations
  const visibleMenuItems = isEmployee && !isAdmin
    ? menuItems.filter(item => item.title === "Reservations")
    : menuItems.filter(item => item.visible);

  return (
    <Sidebar
      style={{ order }}
      className={language === 'ar' ? 'fixed right-0 left-auto' : ''}
    >
      <SidebarHeader>
        <div className={`flex items-center gap-2 px-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
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
          <span className="font-bold text-lg">{t("padelpro_manager")}</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {visibleMenuItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 ${document.documentElement.dir === 'rtl' ? 'flex-row-reverse text-right' : ''}`}
                  >
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
