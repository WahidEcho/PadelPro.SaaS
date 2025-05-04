
import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Users, CreditCard } from "lucide-react";

interface QuickActionsProps {
  isAdmin: boolean;
}

export function QuickActions({ isAdmin }: QuickActionsProps) {
  const navigate = useNavigate();

  const handleQuickAction = (route: string) => {
    navigate(route);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      <Button
        variant="outline"
        className="flex items-center justify-center h-24 text-lg font-medium gap-2"
        onClick={() => handleQuickAction("/reservations?action=create")}
      >
        <CalendarClock className="h-6 w-6" />
        <span>New Reservation</span>
      </Button>
      
      <Button
        variant="outline"
        className="flex items-center justify-center h-24 text-lg font-medium gap-2"
        onClick={() => handleQuickAction("/clients?action=create")}
      >
        <Users className="h-6 w-6" />
        <span>New Client</span>
      </Button>
      
      {isAdmin && (
        <Button
          variant="outline"
          className="flex items-center justify-center h-24 text-lg font-medium gap-2"
          onClick={() => handleQuickAction("/financials?action=createExpense")}
        >
          <CreditCard className="h-6 w-6" />
          <span>New Expense</span>
        </Button>
      )}
    </div>
  );
}
