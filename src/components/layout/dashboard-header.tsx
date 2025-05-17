import { Button } from "@/components/ui/button";
import { UserCircle, LogOut, Home, ClipboardList, Calendar, Users, DollarSign, Settings } from "lucide-react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useLanguage } from "@/contexts/language-context";
import LevelsLogo from '../../pics/levelslogo.png';
import { useTheme } from "@/contexts/theme-context";
import { Moon, Sun } from "lucide-react";

export function DashboardHeader() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut, isAdmin, isEmployee } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user?.user_metadata?.full_name || "");
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: t("success"),
        description: t("logout_success"),
      });
      navigate("/login");
    } catch (error) {
      toast({
        title: t("error"),
        description: error.message || t("logout_error"),
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    setLoading(false);
    if (error) {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("success"), description: t("name_updated") });
      setOpen(false);
      // Optionally, refresh user data here if your useAuth supports it
    }
  };

  // Navigation menu items
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
  const visibleMenuItems = isEmployee && !isAdmin
    ? menuItems.filter(item => item.title === t("reservations"))
    : menuItems.filter(item => item.visible);

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white dark:bg-gray-800 shadow rounded-b-2xl flex flex-col items-center transition-colors duration-300">
      <div className="flex w-full items-center justify-between px-6 py-3 h-20">
        <div className="flex items-center gap-4">
          <img src={LevelsLogo} alt="Levels Logo" className="h-8 w-auto rounded-md shadow mr-2" />
          <span className="font-bold text-xl text-padel-primary dark:text-white transition-colors duration-300">{t("padelpro_manager")}</span>
          <nav className="flex gap-2 ml-4">
            {visibleMenuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.title}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-base transition-colors duration-300
                    ${isActive ? 'bg-padel-primary text-white' : 'bg-muted dark:bg-gray-700 dark:text-white hover:bg-padel-primary hover:text-white dark:hover:bg-padel-primary dark:hover:text-white'}`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            {name || t("no_name_set")}
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              {t("set_name")}
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <UserCircle className="h-5 w-5" />
            <span className="sr-only">{t("user_menu")}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-1"
          >
            <LogOut className="h-4 w-4" />
            <span>{t("logout")}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="text-sm font-medium"
          >
            {language === 'en' ? 'عربي' : 'English'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="h-9 w-9 dark:text-white"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("set_display_name")}</DialogTitle>
              </DialogHeader>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t("enter_your_name")}
                disabled={loading}
              />
              <DialogFooter>
                <Button onClick={handleSave} disabled={loading || !name}>
                  {t("save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
