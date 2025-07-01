import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useTransactionsData() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          reservations (
            id,
            clients (
              name
            ),
            courts (
              name,
              court_groups (
                name
              )
            )
          )
        `)
        .order('date', { ascending: false })
        .limit(10000); // Increase limit to handle large datasets

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    transactions,
    setTransactions,
    isLoading,
    fetchTransactions
  };
} 