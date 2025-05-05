
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Client } from "@/types/supabase";

export function useClientsData() {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all clients
  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "Failed to fetch clients data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new client
  const createClient = async (clientData: Partial<Client>) => {
    try {
      // Generate a client ID if not provided
      if (!clientData.client_id) {
        // Format: CLI + random 3-digit number
        clientData.client_id = `CLI${Math.floor(Math.random() * 900) + 100}`;
      }
      
      const { data, error } = await supabase
        .from('clients')
        .insert([clientData])
        .select();
        
      if (error) throw error;
      
      // Refresh clients
      fetchClients();
      
      return { success: true, data };
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  // Update a client
  const updateClient = async (id: string, clientData: Partial<Client>) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', id)
        .select();
        
      if (error) throw error;
      
      // Refresh clients
      fetchClients();
      
      return { success: true, data };
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        title: "Error",
        description: "Failed to update client",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  // Delete a client
  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Refresh clients
      fetchClients();
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  // Load clients on first render
  useEffect(() => {
    fetchClients();
  }, []);

  return {
    clients,
    isLoading,
    fetchClients,
    createClient,
    updateClient,
    deleteClient
  };
}
