import React, { useState, useEffect } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Users, Calendar, PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/language-context";

export function DashboardStats() {
  const [todayReservations, setTodayReservations] = useState<number>(0);
  const [activeClients, setActiveClients] = useState<number>(0);
  const [courtUsage, setCourtUsage] = useState<string>("0%");
  const [newClients, setNewClients] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();
  
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
        title={t("todays_reservations")}
        value={isLoading ? "..." : todayReservations.toString()} 
        description={t("live_data")}
        icon={Calendar}
      />
      <StatCard 
        title={t("active_clients")}
        value={isLoading ? "..." : activeClients} 
        description={t("with_recent_reservations")}
        icon={Users}
      />
      <StatCard 
        title={t("court_usage")}
        value={isLoading ? "..." : courtUsage} 
        description={t("todays_booking_rate")}
        trend="up"
      />
      <StatCard 
        title={t("new_clients")}
        value={isLoading ? "..." : newClients} 
        description={t("this_week")}
        icon={PlusCircle}
      />
    </div>
  );
}
