
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { 
  DollarSign, 
  CreditCard, 
  TrendingDown, 
  TrendingUp, 
  Calendar,
  ClipboardList,
  Users,
  Plus 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

const Index = () => {
  const [todayRevenue, setTodayRevenue] = useState<number>(0);
  const [todayExpenses, setTodayExpenses] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [netProfit, setNetProfit] = useState<number>(0);
  const [todayReservations, setTodayReservations] = useState<any[]>([]);
  const [revenueByCategory, setRevenueByCategory] = useState<{[key: string]: number}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
        
        // Fetch today's revenue
        const { data: todayRevenueData, error: todayRevenueError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('date', today);
          
        if (todayRevenueError) {
          throw todayRevenueError;
        }
        
        const todayRevenueSum = todayRevenueData.reduce((sum, item) => sum + Number(item.amount), 0);
        setTodayRevenue(todayRevenueSum);
        
        // Fetch today's expenses
        const { data: todayExpensesData, error: todayExpensesError } = await supabase
          .from('expenses')
          .select('amount')
          .eq('date', today);
          
        if (todayExpensesError) {
          throw todayExpensesError;
        }
        
        const todayExpensesSum = todayExpensesData.reduce((sum, item) => sum + Number(item.amount), 0);
        setTodayExpenses(todayExpensesSum);
        
        // Fetch total revenue
        const { data: totalRevenueData, error: totalRevenueError } = await supabase
          .from('transactions')
          .select('amount');
          
        if (totalRevenueError) {
          throw totalRevenueError;
        }
        
        const totalRevenueSum = totalRevenueData.reduce((sum, item) => sum + Number(item.amount), 0);
        setTotalRevenue(totalRevenueSum);
        
        // Fetch total expenses
        const { data: totalExpensesData, error: totalExpensesError } = await supabase
          .from('expenses')
          .select('amount');
          
        if (totalExpensesError) {
          throw totalExpensesError;
        }
        
        const totalExpensesSum = totalExpensesData.reduce((sum, item) => sum + Number(item.amount), 0);
        setTotalExpenses(totalExpensesSum);
        
        // Calculate net profit
        setNetProfit(totalRevenueSum - totalExpensesSum);
        
        // Fetch today's reservations
        const { data: reservationsData, error: reservationsError } = await supabase
          .from('reservations')
          .select(`
            *,
            clients (name),
            courts (name)
          `)
          .eq('date', today);
          
        if (reservationsError) {
          throw reservationsError;
        }
        
        const reservationsWithDetails = reservationsData.map((res: any) => ({
          ...res,
          client_name: res.clients.name,
          court_name: res.courts.name
        }));
        
        setTodayReservations(reservationsWithDetails);

        // Fetch revenue by court category for the selected date
        const { data: categoryRevenueData, error: categoryRevenueError } = await supabase
          .rpc('get_revenue_by_court_group', {
            target_date: selectedDateStr
          });

        if (categoryRevenueError) {
          throw categoryRevenueError;
        }

        if (categoryRevenueData) {
          const revenueMap: {[key: string]: number} = {};
          categoryRevenueData.forEach((item: any) => {
            revenueMap[item.group_name || 'Uncategorized'] = Number(item.total_revenue) || 0;
          });
          setRevenueByCategory(revenueMap);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: "Error",
          description: "Failed to fetch dashboard data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [selectedDate]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome to the PadelPro Manager dashboard.
          </p>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-padel-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Today's Revenue"
                value={todayRevenue}
                icon={DollarSign}
                description="Total revenue for today"
                positive={true}
              />
              <StatCard
                title="Today's Expenses"
                value={todayExpenses}
                icon={TrendingDown}
                description="Total expenses for today"
                negative={true}
              />
              <StatCard
                title="Total Revenue"
                value={totalRevenue}
                icon={TrendingUp}
                description="All time"
                positive={true}
              />
              <StatCard
                title="Net Profit"
                value={netProfit}
                icon={CreditCard}
                description="Total revenue minus expenses"
                positive={netProfit > 0}
                negative={netProfit < 0}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <RevenueChart className="md:col-span-4" />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    <Link to="/reservations" className="p-4 border rounded-lg hover:bg-accent hover:border-padel-primary transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="rounded-full p-2 bg-padel-primary/10 text-padel-primary">
                          <Calendar className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="font-medium">Create New Reservation</div>
                          <div className="text-sm text-muted-foreground">Book a court for a client</div>
                        </div>
                      </div>
                    </Link>

                    <Link to="/clients" className="p-4 border rounded-lg hover:bg-accent hover:border-padel-primary transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="rounded-full p-2 bg-padel-primary/10 text-padel-primary">
                          <Users className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="font-medium">Add New Client</div>
                          <div className="text-sm text-muted-foreground">Register a new client</div>
                        </div>
                      </div>
                    </Link>

                    <Link to="/financials" className="p-4 border rounded-lg hover:bg-accent hover:border-padel-primary transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="rounded-full p-2 bg-padel-primary/10 text-padel-primary">
                          <TrendingDown className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="font-medium">Add New Expense</div>
                          <div className="text-sm text-muted-foreground">Record a new expense</div>
                        </div>
                      </div>
                    </Link>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>Today's Reservations</CardTitle>
                </CardHeader>
                <CardContent>
                  {todayReservations.length > 0 ? (
                    <div className="space-y-4">
                      {todayReservations.map((res) => (
                        <div key={res.id} className="flex items-center gap-4 p-3 border rounded-md">
                          <Calendar className="h-5 w-5 text-padel-primary" />
                          <div className="flex-1">
                            <div className="font-medium">{res.court_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {res.client_name} - {res.time_start} to {res.time_end}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${res.amount}</div>
                            <div className="text-xs text-muted-foreground capitalize">{res.payment_method}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No reservations for today.</p>
                  )}
                </CardContent>
              </Card>
              
              <Card className="md:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Revenue by Court Category</CardTitle>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto h-8"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(selectedDate, 'MMM d, yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => setSelectedDate(date || new Date())}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </CardHeader>
                <CardContent>
                  {Object.keys(revenueByCategory).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(revenueByCategory).map(([category, revenue]) => (
                        <div key={category} className="flex items-center justify-between p-3 border rounded-md">
                          <div>
                            <div className="font-medium">{category}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(selectedDate, 'MMM d, yyyy')}
                            </div>
                          </div>
                          <div className="font-semibold text-green-600">${revenue.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No revenue data for the selected date.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Index;
