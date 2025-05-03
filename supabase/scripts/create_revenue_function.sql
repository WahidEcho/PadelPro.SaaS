
-- Function to calculate revenue by court group
CREATE OR REPLACE FUNCTION public.get_revenue_by_group(start_date DATE, end_date DATE)
RETURNS TABLE (
  group_name TEXT,
  total_revenue NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    cg.name AS group_name,
    COALESCE(SUM(r.amount), 0) AS total_revenue
  FROM 
    public.court_groups cg
  LEFT JOIN 
    public.courts c ON c.group_id = cg.id
  LEFT JOIN 
    public.reservations r ON r.court_id = c.id
      AND r.date >= start_date
      AND r.date <= end_date
  GROUP BY 
    cg.name
  ORDER BY 
    total_revenue DESC;
$$;
