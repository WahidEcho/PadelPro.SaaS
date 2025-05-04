
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RevenueByGroup } from "@/types/supabase";

export function useRevenueData(startDate: Date, endDate: Date, isAdmin: boolean) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [revenueByGroup, setRevenueByGroup] = useState<RevenueByGroup[]>([]);

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
            
            // Ensure amount is treated as a number
            const amount = typeof item.amount === 'string' ? parseFloat(item.amount) : item.amount;
            acc[groupId].total_revenue += amount;
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

  return { isLoading, revenueByGroup };
}
