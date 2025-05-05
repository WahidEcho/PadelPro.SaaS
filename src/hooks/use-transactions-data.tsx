
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Transaction } from "@/types/supabase";

export function useTransactionsData() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all transactions
  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, reservations!inner(id)')
        .order('date', { ascending: false });
        
      if (error) throw error;
      
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch transactions data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new transaction
  const createTransaction = async (transactionData: Partial<Transaction>) => {
    try {
      // Make sure required fields are present
      if (!transactionData.amount || !transactionData.date || !transactionData.payment_method) {
        throw new Error("Amount, date and payment method are required");
      }
      
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          amount: transactionData.amount,
          date: transactionData.date,
          payment_method: transactionData.payment_method,
          reservation_id: transactionData.reservation_id || null
        })
        .select();
        
      if (error) throw error;
      
      // Refresh transactions
      fetchTransactions();
      
      return { success: true, data };
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to create transaction",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  // Update a transaction
  const updateTransaction = async (id: string, transactionData: Partial<Transaction>) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(transactionData)
        .eq('id', id)
        .select();
        
      if (error) throw error;
      
      // Refresh transactions
      fetchTransactions();
      
      return { success: true, data };
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  // Delete a transaction
  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Refresh transactions
      fetchTransactions();
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  // Load transactions on first render
  useEffect(() => {
    fetchTransactions();
  }, []);

  return {
    transactions,
    isLoading,
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction
  };
}
