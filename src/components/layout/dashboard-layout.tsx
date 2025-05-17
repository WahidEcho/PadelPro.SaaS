import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardHeader } from "./dashboard-header";
import { useLanguage } from "@/contexts/language-context";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { language } = useLanguage();
  // If Arabic, reverse the flex direction so sidebar is on the right
  const isRTL = language === 'ar';
  return (
    <SidebarProvider>
      <div className="min-h-screen w-full">
        {/* Remove sidebar, only use header nav bar */}
        <div className="pt-24">
          <DashboardHeader />
          <main className="flex-1 p-6 overflow-auto bg-muted/30">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
