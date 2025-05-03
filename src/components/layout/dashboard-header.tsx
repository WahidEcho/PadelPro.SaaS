
import { Button } from "@/components/ui/button";
import { UserCircle } from "lucide-react";

export function DashboardHeader() {
  return (
    <header className="border-b px-6 py-3 h-16 flex items-center justify-between">
      <div>
        <h1 className="font-semibold text-lg">
          PadelPro Manager
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <UserCircle className="h-5 w-5" />
          <span className="sr-only">User menu</span>
        </Button>
      </div>
    </header>
  );
}
