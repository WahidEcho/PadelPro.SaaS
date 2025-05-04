
import React from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Users, Calendar, PlusCircle } from "lucide-react";

export function DashboardStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
      <StatCard 
        title="Today's Reservations" 
        value="12" 
        description="+2% from yesterday"
        icon={Calendar}
      />
      <StatCard 
        title="Active Clients" 
        value={245} 
        description="+5% from last week"
        icon={Users}
      />
      <StatCard 
        title="Court Usage" 
        value="89%" 
        description="+3% from last week"
        trend="up"
      />
      <StatCard 
        title="New Clients" 
        value="5" 
        description="This week"
        icon={PlusCircle}
      />
    </div>
  );
}
