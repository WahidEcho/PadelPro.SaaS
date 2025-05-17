import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, addDays, eachDayOfInterval } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/language-context";

export function RevenueChart() {
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchRevenueData = async () => {
      setIsLoading(true);
      
      try {
        // Get data for the last 7 days
        const endDate = new Date();
        const startDate = subDays(endDate, 6); // 7 days total including today
        
        // Create an array of all days in the range
        const daysRange = eachDayOfInterval({ 
          start: startDate, 
          end: endDate 
        });
        
        // Initialize the data array with all days and zero values
        const initialData = daysRange.map(day => ({
          date: format(day, 'yyyy-MM-dd'),
          displayDate: format(day, 'MMM dd'),
          revenue: 0,
          expenses: 0
        }));
        
        // Fetch revenue data (from reservations)
        const { data: revenueData, error: revenueError } = await supabase
          .from('reservations')
          .select('date, amount')
          .gte('date', format(startDate, 'yyyy-MM-dd'))
          .lte('date', format(endDate, 'yyyy-MM-dd'));
          
        if (revenueError) throw revenueError;
        
        // Fetch expense data
        const { data: expenseData, error: expenseError } = await supabase
          .from('expenses')
          .select('date, amount')
          .gte('date', format(startDate, 'yyyy-MM-dd'))
          .lte('date', format(endDate, 'yyyy-MM-dd'));
          
        if (expenseError) throw expenseError;
        
        // Aggregate the data by date
        const aggregatedData = [...initialData];
        
        // Add revenue data
        if (revenueData) {
          revenueData.forEach(item => {
            const index = aggregatedData.findIndex(d => d.date === item.date);
            if (index !== -1) {
              const amount = typeof item.amount === 'string' ? parseFloat(item.amount) : item.amount;
              aggregatedData[index].revenue += amount;
            }
          });
        }
        
        // Add expense data
        if (expenseData) {
          expenseData.forEach(item => {
            const index = aggregatedData.findIndex(d => d.date === item.date);
            if (index !== -1) {
              const amount = typeof item.amount === 'string' ? parseFloat(item.amount) : item.amount;
              aggregatedData[index].expenses += amount;
            }
          });
        }
        
        // Update chart data
        setChartData(aggregatedData);
      } catch (error) {
        console.error('Error fetching revenue chart data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRevenueData();
  }, []);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("revenue_expenses")}</CardTitle>
        <CardDescription>{t("daily_revenue_expenses")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="w-full h-[300px] flex items-center justify-center">
            <div className="space-y-4 w-full">
              <Skeleton className="h-[300px] w-full" />
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="displayDate" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => `£${Math.round(value)}`}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Bar dataKey="revenue" fill="#22c55e" name={t("revenue")}/>
              <Bar dataKey="expenses" fill="#ef4444" name={t("expenses")}/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
