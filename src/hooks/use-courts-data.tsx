
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Court, CourtsWithGroup } from "@/types/supabase";

export function useCourtsData() {
  const { toast } = useToast();
  const [courts, setCourts] = useState<CourtsWithGroup[]>([]);
  const [courtGroups, setCourtGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch courts with their groups
  const fetchCourts = async () => {
    setIsLoading(true);
    try {
      // Fetch all court groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('court_groups')
        .select('*')
        .order('name');
        
      if (groupsError) throw groupsError;
      
      // Fetch all courts with their group information
      const { data: courtsData, error: courtsError } = await supabase
        .from('courts')
        .select(`
          *,
          court_groups(*)
        `)
        .order('name');
        
      if (courtsError) throw courtsError;

      // Format courts data with group names for easier access
      const formattedCourts = courtsData.map((court: any) => ({
        ...court,
        group_name: court.court_groups?.name || 'Unassigned'
      }));
      
      setCourts(formattedCourts);
      setCourtGroups(groupsData || []);
    } catch (error) {
      console.error('Error fetching courts data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch courts data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new court
  const createCourt = async (name: string, groupId: string | null) => {
    try {
      const { data, error } = await supabase
        .from('courts')
        .insert([{ name, group_id: groupId }])
        .select();
        
      if (error) throw error;
      
      // Refresh courts data
      fetchCourts();
      
      return { success: true, data };
    } catch (error) {
      console.error('Error creating court:', error);
      toast({
        title: "Error",
        description: "Failed to create court",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  // Update a court
  const updateCourt = async (id: string, name: string, groupId: string | null) => {
    try {
      const { data, error } = await supabase
        .from('courts')
        .update({ name, group_id: groupId })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      
      // Refresh courts data
      fetchCourts();
      
      return { success: true, data };
    } catch (error) {
      console.error('Error updating court:', error);
      toast({
        title: "Error",
        description: "Failed to update court",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  // Delete a court
  const deleteCourt = async (id: string) => {
    try {
      const { error } = await supabase
        .from('courts')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Refresh courts data
      fetchCourts();
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting court:', error);
      toast({
        title: "Error",
        description: "Failed to delete court",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  // Create a new court group
  const createCourtGroup = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from('court_groups')
        .insert([{ name }])
        .select();
        
      if (error) throw error;
      
      // Refresh court groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('court_groups')
        .select('*')
        .order('name');
        
      if (groupsError) throw groupsError;
      
      setCourtGroups(groupsData || []);
      
      return { success: true, data };
    } catch (error) {
      console.error('Error creating court group:', error);
      toast({
        title: "Error",
        description: "Failed to create court group",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  // Load courts on first render
  useEffect(() => {
    fetchCourts();
  }, []);

  return {
    courts,
    courtGroups,
    isLoading,
    fetchCourts,
    createCourt,
    updateCourt,
    deleteCourt,
    createCourtGroup
  };
}
