
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
  Users 
} from "lucide-react";
import { 
  getTodayRevenue, 
  getTodayExpenses, 
  getTotalRevenue, 
  getTotalExpenses, 
  getNetProfit,
  mockReservations
} from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

const Index = () => {
  // Get statistics
  const todayRevenue = getTodayRevenue();
  const todayExpenses = getTodayExpenses();
  const totalRevenue = getTotalRevenue();
  const totalExpenses = getTotalExpenses();
  const netProfit = getNetProfit();

  // Get today's reservations
  const today = new Date().toISOString().split('T')[0];
  const todayReservations = mockReservations.filter(res => res.date === today);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome to the PadelPro Manager dashboard.
          </p>
        </div>
        
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
            description="Since Jan 1, 2025"
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
          <RevenueChart />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
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
          
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Link to="/courts" className="p-4 border rounded-lg hover:bg-accent hover:border-padel-primary transition-colors group">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <ClipboardList className="h-6 w-6 text-muted-foreground group-hover:text-padel-primary transition-colors" />
                    <div className="font-medium">Manage Courts</div>
                  </div>
                </Link>
                <Link to="/reservations" className="p-4 border rounded-lg hover:bg-accent hover:border-padel-primary transition-colors group">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Calendar className="h-6 w-6 text-muted-foreground group-hover:text-padel-primary transition-colors" />
                    <div className="font-medium">New Reservation</div>
                  </div>
                </Link>
                <Link to="/clients" className="p-4 border rounded-lg hover:bg-accent hover:border-padel-primary transition-colors group">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Users className="h-6 w-6 text-muted-foreground group-hover:text-padel-primary transition-colors" />
                    <div className="font-medium">Clients</div>
                  </div>
                </Link>
                <Link to="/financials" className="p-4 border rounded-lg hover:bg-accent hover:border-padel-primary transition-colors group">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <DollarSign className="h-6 w-6 text-muted-foreground group-hover:text-padel-primary transition-colors" />
                    <div className="font-medium">Financials</div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
