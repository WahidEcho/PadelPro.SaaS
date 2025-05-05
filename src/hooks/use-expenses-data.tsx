
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Expense, ExpenseWithCategory } from "@/types/supabase";

export function useExpensesData() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all expenses with their categories
  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      // Fetch expense categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name');
        
      if (categoriesError) throw categoriesError;
      
      // Fetch expenses with their category information
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_categories(*)
        `)
        .order('date', { ascending: false });
        
      if (expensesError) throw expensesError;
      
      // Format expenses with category names
      const formattedExpenses = expensesData.map((expense: any) => ({
        ...expense,
        category_name: expense.expense_categories?.name || 'Uncategorized'
      }));
      
      setExpenses(formattedExpenses);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error fetching expenses data:', error);
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
      const { data, error } = await supabase
        .from('expenses')
        .insert([expenseData])
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

  // Create a new expense category
  const createCategory = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert([{ name }])
        .select();
        
      if (error) throw error;
      
      // Refresh categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name');
        
      if (categoriesError) throw categoriesError;
      
      setCategories(categoriesData || []);
      
      return { success: true, data };
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create expense category",
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
    categories,
    isLoading,
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    createCategory
  };
}
