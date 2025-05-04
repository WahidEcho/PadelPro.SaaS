
import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { DateRange } from "react-day-picker";
import { addDays, subDays } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

// Import our components with updated naming
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RevenueByCourtGroup } from "@/components/dashboard/revenue-by-court-group";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { useRevenueData } from "@/hooks/use-revenue-data";

const Index = () => {
  const { isAdmin, isEmployee } = useAuth();
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  
  const startDate = date?.from || new Date();
  const endDate = date?.to || new Date();

  const { isLoading, revenueByGroup } = useRevenueData(startDate, endDate, isAdmin);

  return (
    <DashboardLayout>
      <div className="flex flex-col">
        {/* Dashboard Header with Date Range Picker - updated name */}
        <DashboardPageHeader date={date} setDate={setDate} />
        
        {/* Quick Actions */}
        <QuickActions isAdmin={isAdmin} />
        
        {/* Revenue By Court Group */}
        {isAdmin && (
          <RevenueByCourtGroup 
            isLoading={isLoading}
            revenueByGroup={revenueByGroup}
          />
        )}
        
        {/* Stats Cards */}
        <DashboardStats />
        
        {/* Revenue Chart */}
        <div className="mt-6">
          <RevenueChart />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
