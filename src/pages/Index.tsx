
import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { CalendarDateRangePicker } from "@/components/dashboard/date-range-picker";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { DateRange } from "react-day-picker";
import { addDays, format, subDays } from "date-fns";
import { RevenueByGroup } from "@/types/supabase";
import { 
  Users, 
  Calendar, 
  PlusCircle, 
  CalendarClock,
  CreditCard
} from "lucide-react";

const Index = () => {
  const { toast } = useToast();
  const { isAdmin, isEmployee } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [revenueByGroup, setRevenueByGroup] = useState<RevenueByGroup[]>([]);
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  
  const startDate = date?.from || new Date();
  const endDate = date?.to || new Date();

  // Inside the useEffect for fetching revenue data
  useEffect(() => {
    const fetchRevenueData = async () => {
      setIsLoading(true);
      try {
        // Fix: Using a direct query approach instead of RPC to avoid type errors
        const { data, error } = await supabase
          .from('reservations')
          .select(`
            amount,
            courts!inner (
              name,
              court_groups!inner (
                id,
                name
              )
            )
          `)
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0]);
        
        if (error) throw error;
        
        if (data && Array.isArray(data)) {
          // Process the data to group by court group
          const groupedData = data.reduce((acc: Record<string, any>, item) => {
            const groupId = item.courts.court_groups.id;
            const groupName = item.courts.court_groups.name;
            
            if (!acc[groupId]) {
              acc[groupId] = {
                group_name: groupName,
                total_revenue: 0
              };
            }
            
            acc[groupId].total_revenue += parseFloat(item.amount);
            return acc;
          }, {});
          
          const formattedData = Object.values(groupedData) as RevenueByGroup[];
          setRevenueByGroup(formattedData);
        } else {
          setRevenueByGroup([]);
        }
      } catch (error) {
        console.error('Error fetching revenue data:', error);
        toast({
          title: "Error",
          description: "Failed to fetch revenue data",
          variant: "destructive",
        });
        setRevenueByGroup([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAdmin) {
      fetchRevenueData();
    }
  }, [startDate, endDate, isAdmin, toast]);

  const handleQuickAction = (route: string) => {
    navigate(route);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <div className="flex items-center space-x-2">
            <CalendarDateRangePicker date={date} setDate={setDate} />
          </div>
        </div>
        
        {/* Quick Actions */}
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
        
        {/* Revenue By Court Group */}
        {isAdmin && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Court Group</CardTitle>
                <CardDescription>
                  Revenue breakdown by court categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <p>Loading revenue data...</p>
                  </div>
                ) : revenueByGroup.length > 0 ? (
                  <div className="space-y-4">
                    {revenueByGroup.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                        <span className="font-medium">{item.group_name}</span>
                        <span className="text-xl font-bold">${parseFloat(item.total_revenue.toString()).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <p>No revenue data available for the selected period.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
          <StatCard 
            title="Today's Reservations" 
            value="12" 
            description="+2% from yesterday"
            icon={Calendar}
          />
          <StatCard 
            title="Active Clients" 
            value="245" 
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
        
        {/* Revenue Chart */}
        <div className="mt-6">
          <RevenueChart />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
