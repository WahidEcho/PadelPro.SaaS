
import { Button } from "@/components/ui/button";
import { UserCircle, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function DashboardHeader() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
      navigate("/login");
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "An error occurred during logout",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="border-b px-6 py-3 h-16 flex items-center justify-between">
      <div>
        <h1 className="font-semibold text-lg">
          PadelPro Manager
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          {user?.email}
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <UserCircle className="h-5 w-5" />
          <span className="sr-only">User menu</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center gap-1">
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Button>
      </div>
    </header>
  );
}
