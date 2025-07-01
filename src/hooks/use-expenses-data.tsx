import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExpenseWithCategory, ExpenseCategory } from "@/types/supabase";

export function useExpensesData() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  // Fetch all expenses
  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, expense_categories(name)')
        .order('date', { ascending: false })
        .limit(10000); // Increase limit to handle large datasets
        
      if (error) throw error;
      
      // Map joined category name to category_name for each expense
      const mappedExpenses = (data || []).map((exp: any) => ({
        ...exp,
        category_name: exp.expense_categories?.name || null
      }));
      setExpenses(mappedExpenses);
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

  // Fetch all categories
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    }
  };

  // Create a new expense
  const createExpense = async (expenseData: Partial<ExpenseWithCategory>) => {
    try {
      // Make sure required fields are present
      if (!expenseData.title || !expenseData.amount || !expenseData.date) {
        throw new Error("Title, amount and date are required");
      }
      
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          title: expenseData.title,
          amount: parseFloat(String(expenseData.amount)),
          date: expenseData.date,
          notes: expenseData.notes || null,
          category_id: expenseData.category_id || null
        })
        .select();
        
      if (error) throw error;
      
      // Refresh expenses
      fetchExpenses();
      
      return { success: true, data };
    } catch (error: any) {
      console.error('Error creating expense:', error?.message || error);
      toast({
        title: "Error",
        description: error?.message || error?.details || "Failed to create expense",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  // Create a new category
  const createCategory = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert([{ name }])
        .select();
      if (error) throw error;
      fetchCategories();
      return { success: true, data };
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  // Update an expense
  const updateExpense = async (id: string, expenseData: Partial<ExpenseWithCategory>) => {
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

  // Load expenses and categories on first render and subscribe to real-time updates
  useEffect(() => {
    fetchExpenses();
    fetchCategories();

    // Subscribe to real-time changes in the expenses table
    const channel = supabase.channel('expenses-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'expenses',
      }, () => {
        fetchExpenses();
      })
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    expenses,
    isLoading,
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    categories,
    createCategory,
    fetchCategories,
  };
}
