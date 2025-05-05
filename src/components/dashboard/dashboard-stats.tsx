
import React, { useState, useEffect } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Users, Calendar, PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export function DashboardStats() {
  const [todayReservations, setTodayReservations] = useState<number>(0);
  const [activeClients, setActiveClients] = useState<number>(0);
  const [courtUsage, setCourtUsage] = useState<string>("0%");
  const [newClients, setNewClients] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchDashboardStats = async () => {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekFormatted = lastWeek.toISOString().split('T')[0];
      
      try {
        // Get today's reservations count
        const { count: todayCount, error: todayError } = await supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .eq('date', today);
          
        if (todayError) throw todayError;
        
        // Get active clients (clients with reservations in the last 30 days)
        const { data: activeClientsData, error: activeClientsError } = await supabase
          .from('clients')
          .select('id, reservations!inner(*)')
          .gt('reservations.date', lastWeekFormatted);
          
        if (activeClientsError) throw activeClientsError;
        
        // Get new clients count (registered in the last 7 days)
        const { count: newClientsCount, error: newClientsError } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .gt('created_at', lastWeekFormatted);
          
        if (newClientsError) throw newClientsError;
        
        // Calculate court usage (percentage of slots booked today)
        const { data: courtsCount, error: courtsCountError } = await supabase
          .from('courts')
          .select('*', { count: 'exact' });
          
        if (courtsCountError) throw courtsCountError;
        
        // Calculate a realistic court usage percentage
        // Assuming each court has 12 possible 1-hour slots per day (e.g., 8 AM to 8 PM)
        const totalPossibleSlots = courtsCount?.length ? courtsCount.length * 12 : 0;
        const { count: bookedSlotsCount, error: bookedSlotsError } = await supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .eq('date', today);
          
        if (bookedSlotsError) throw bookedSlotsError;
        
        const usagePercentage = totalPossibleSlots > 0 && bookedSlotsCount !== null ? 
          Math.round((bookedSlotsCount / totalPossibleSlots) * 100) : 0;
        
        setTodayReservations(todayCount || 0);
        setActiveClients(activeClientsData?.length || 0);
        setNewClients(newClientsCount || 0);
        setCourtUsage(`${usagePercentage}%`);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardStats();
  }, []);
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
      <StatCard 
        title="Today's Reservations" 
        value={isLoading ? "..." : todayReservations.toString()} 
        description="Live data from Supabase"
        icon={Calendar}
      />
      <StatCard 
        title="Active Clients" 
        value={isLoading ? "..." : activeClients} 
        description="With recent reservations"
        icon={Users}
      />
      <StatCard 
        title="Court Usage" 
        value={isLoading ? "..." : courtUsage} 
        description="Today's booking rate"
        trend="up"
      />
      <StatCard 
        title="New Clients" 
        value={isLoading ? "..." : newClients} 
        description="This week"
        icon={PlusCircle}
      />
    </div>
  );
}
