
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Expense } from "@/types/supabase";

export function useExpensesData() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all expenses
  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, expense_categories(name)')
        .order('date', { ascending: false });
        
      if (error) throw error;
      
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch expenses data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new expense
  const createExpense = async (expenseData: Partial<Expense>) => {
    try {
      // Make sure required fields are present
      if (!expenseData.title || !expenseData.amount || !expenseData.date) {
        throw new Error("Title, amount and date are required");
      }
      
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          title: expenseData.title,
          amount: expenseData.amount,
          date: expenseData.date,
          notes: expenseData.notes || null,
          category_id: expenseData.category_id || null
        })
        .select();
        
      if (error) throw error;
      
      // Refresh expenses
      fetchExpenses();
      
      return { success: true, data };
    } catch (error) {
      console.error('Error creating expense:', error);
      toast({
        title: "Error",
        description: "Failed to create expense",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  // Update an expense
  const updateExpense = async (id: string, expenseData: Partial<Expense>) => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update(expenseData)
        .eq('id', id)
        .select();
        
      if (error) throw error;
      
      // Refresh expenses
      fetchExpenses();
      
      return { success: true, data };
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: "Error",
        description: "Failed to update expense",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  // Delete an expense
  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Refresh expenses
      fetchExpenses();
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  // Load expenses on first render
  useEffect(() => {
    fetchExpenses();
  }, []);

  return {
    expenses,
    isLoading,
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense
  };
}
