
// Find the RPC function call and fix it
// Inside the useEffect for fetching revenue data
useEffect(() => {
  const fetchRevenueData = async () => {
    setIsLoading(true);
    try {
      // Fix 1: Change the RPC function name from "get_revenue_by_court_group" to match what's on the server
      const { data, error } = await supabase.rpc('get_revenue_by_group', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      });
      
      if (error) throw error;
      
      // Fix 2: Handle the data correctly, assuming it returns an array of RevenueByGroup objects
      if (data && Array.isArray(data)) {
        setRevenueByGroup(data as RevenueByGroup[]);
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
}, [startDate, endDate, isAdmin]);
