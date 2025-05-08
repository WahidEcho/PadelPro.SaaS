import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { StatCard } from "@/components/dashboard/stat-card";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DollarSign, TrendingUp, TrendingDown, CreditCard } from "lucide-react";
import { useExpensesData } from "@/hooks/use-expenses-data";
import { useTransactionsData } from "@/hooks/use-transactions-data";
import { CalendarDateRangePicker } from "@/components/dashboard/date-range-picker";
import { DateRange } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const expenseFormSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters" }),
  amount: z.coerce.number().positive({ message: "Amount must be positive" }),
  date: z.string().min(1, { message: "Date is required" }),
  category_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

const FinancialsPage = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [incomeCourtFilter, setIncomeCourtFilter] = useState("");
  const [incomeClientFilter, setIncomeClientFilter] = useState("");
  const [incomeGroupFilter, setIncomeGroupFilter] = useState("");
  const { toast } = useToast();
  
  // Use our custom hooks for Supabase data
  const { expenses, isLoading: expensesLoading, createExpense, updateExpense, deleteExpense, categories, createCategory, fetchCategories } = useExpensesData();
  const { transactions, isLoading: transactionsLoading } = useTransactionsData();
  
  // Calculate financial stats
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayExpenses: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0
  });
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [singleDay, setSingleDay] = useState<Date | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [groupedCourtSales, setGroupedCourtSales] = useState<any[]>([]);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [editExpense, setEditExpense] = useState<any | null>(null);
  const [editExpenseDialogOpen, setEditExpenseDialogOpen] = useState(false);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [deleteExpenseDialogOpen, setDeleteExpenseDialogOpen] = useState(false);
  const [expenseNameFilter, setExpenseNameFilter] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("");

  // For single day: group court sales
  const [singleDayCourtSales, setSingleDayCourtSales] = useState<any[]>([]);

  // Filter transactions and expenses by date range
  const isInRange = (dateStr: string) => {
    if (!dateRange || !dateRange.from || !dateRange.to) return true;
    const date = new Date(dateStr);
    return date >= dateRange.from && date <= dateRange.to;
  };
  const filteredTransactions = transactions.filter(
    (transaction) => isInRange(transaction.date)
  );
  const filteredExpenses = expenses.filter(
    (expense) => {
      const nameMatch = expense.title.toLowerCase().includes(expenseNameFilter.toLowerCase());
      const categoryMatch = (expense.category_name || "-").toLowerCase().includes(expenseCategoryFilter.toLowerCase());
      const searchMatch =
        searchTerm === "" ||
        expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (expense.category_name || "-").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (expense.notes || "").toLowerCase().includes(searchTerm.toLowerCase());
      return nameMatch && categoryMatch && searchMatch;
    }
  ).filter((expense) => isInRange(expense.date));
  
  useEffect(() => {
    // Calculate stats from filtered data
    if (!transactionsLoading && !expensesLoading) {
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate revenue stats
      const todayRevenue = filteredTransactions
        .filter(t => t.date === today)
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      
      const totalRevenue = filteredTransactions
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      
      // Calculate expense stats
      const todayExpenses = filteredExpenses
        .filter(e => e.date === today)
        .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
      
      const totalExpenses = filteredExpenses
        .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
      
      // Set stats
      setStats({
        todayRevenue,
        todayExpenses,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses
      });
    }
  }, [filteredTransactions, filteredExpenses, transactionsLoading, expensesLoading]);
  
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      title: "",
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      category_id: "",
      notes: "",
    },
  });

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!isDialogOpen) {
      form.reset();
    }
  }, [isDialogOpen, form]);

  const onSubmit = async (data: ExpenseFormValues) => {
    // Ensure category and notes are included and handled
    const categoryToSave = data.category_id && data.category_id !== '' ? data.category_id : null;
    const notesToSave = data.notes !== undefined ? data.notes : '';
    const result = await createExpense({
      title: data.title,
      amount: data.amount,
      date: data.date,
      category_id: categoryToSave,
      notes: notesToSave,
    });
    if (result.success) {
      toast({
        title: "Expense added",
        description: `${data.title} has been added successfully.`,
      });
      setIsDialogOpen(false);
    }
  };

  // Calculate summary values for the new tab
  const totalSales = filteredTransactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
  const totalCash = filteredTransactions.filter(t => t.payment_method === 'cash').reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
  const totalCard = filteredTransactions.filter(t => t.payment_method === 'card').reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
  const totalWallet = filteredTransactions.filter(t => t.payment_method === 'wallet').reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
  const cashMinusExpenses = totalCash - totalExpenses;

  // Helper to get local date string in YYYY-MM-DD
  function toLocalDateString(date: Date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  // Fetch and group sales per court and group for the summary tab
  useEffect(() => {
    async function fetchCourtSales() {
      let query = supabase
        .from('reservations')
        .select(`amount, courts!inner(name, court_groups!inner(id, name))`);
      if (dateRange && dateRange.from && dateRange.to) {
        query = query
          .gte('date', toLocalDateString(dateRange.from))
          .lte('date', toLocalDateString(dateRange.to));
      }
      const { data, error } = await query;
      if (error) {
        setGroupedCourtSales([]);
        return;
      }
      // Group by court group, then by court
      const groupMap: Record<string, { groupName: string, courts: Record<string, { courtName: string, sales: number }> }> = {};
      for (const res of data) {
        const groupId = res.courts.court_groups.id;
        const groupName = res.courts.court_groups.name;
        const courtId = res.courts.name;
        if (!groupMap[groupId]) {
          groupMap[groupId] = { groupName, courts: {} };
        }
        if (!groupMap[groupId].courts[courtId]) {
          groupMap[groupId].courts[courtId] = { courtName: courtId, sales: 0 };
        }
        groupMap[groupId].courts[courtId].sales += typeof res.amount === 'string' ? parseFloat(res.amount) : res.amount;
      }
      // Convert to array for rendering
      const grouped = Object.values(groupMap).map(g => ({
        groupName: g.groupName,
        courts: Object.values(g.courts)
      }));
      setGroupedCourtSales(grouped);
    }
    fetchCourtSales();
  }, [dateRange]);

  // Filter transactions for the income table:
  const filteredIncomeTransactions = filteredTransactions.filter(transaction => {
    const clientName = transaction.reservations?.clients?.name?.toLowerCase() || "";
    const courtName = transaction.reservations?.courts?.name?.toLowerCase() || "";
    const groupName = transaction.reservations?.courts && 'court_groups' in transaction.reservations.courts && transaction.reservations.courts.court_groups?.name ? transaction.reservations.courts.court_groups.name.toLowerCase() : "";
    const courtFilter = incomeCourtFilter.toLowerCase();
    const clientFilter = incomeClientFilter.toLowerCase();
    const groupFilter = incomeGroupFilter.toLowerCase();
    return (
      (!courtFilter || courtName.includes(courtFilter)) &&
      (!clientFilter || clientName.includes(clientFilter)) &&
      (!groupFilter || groupName.includes(groupFilter))
    );
  });

  // Filter for single day
  function isSameDay(dateStr: string, day: Date | null) {
    if (!day) return false;
    const d = new Date(dateStr);
    return (
      d.getFullYear() === day.getFullYear() &&
      d.getMonth() === day.getMonth() &&
      d.getDate() === day.getDate()
    );
  }
  const singleDayTransactions = singleDay
    ? transactions.filter((t) => isSameDay(t.date, singleDay))
    : [];
  const singleDayExpenses = singleDay
    ? expenses.filter((e) => isSameDay(e.date, singleDay))
    : [];
  const singleDaySales = singleDayTransactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
  const singleDayCash = singleDayTransactions.filter(t => t.payment_method === 'cash').reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
  const singleDayCard = singleDayTransactions.filter(t => t.payment_method === 'card').reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
  const singleDayWallet = singleDayTransactions.filter(t => t.payment_method === 'wallet').reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
  const singleDayTotalExpenses = singleDayExpenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
  const singleDayNet = singleDayCash - singleDayTotalExpenses;

  // For single day: group court sales
  useEffect(() => {
    async function fetchSingleDayCourtSales() {
      if (!singleDay) {
        setSingleDayCourtSales([]);
        return;
      }
      let query = supabase
        .from('reservations')
        .select(`amount, courts!inner(name, court_groups!inner(id, name))`)
        .eq('date', toLocalDateString(singleDay));
      const { data, error } = await query;
      if (error) {
        setSingleDayCourtSales([]);
        return;
      }
      // Group by court group, then by court
      const groupMap: Record<string, { groupName: string, courts: Record<string, { courtName: string, sales: number }> }> = {};
      for (const res of data) {
        const groupId = res.courts.court_groups.id;
        const groupName = res.courts.court_groups.name;
        const courtId = res.courts.name;
        if (!groupMap[groupId]) {
          groupMap[groupId] = { groupName, courts: {} };
        }
        if (!groupMap[groupId].courts[courtId]) {
          groupMap[groupId].courts[courtId] = { courtName: courtId, sales: 0 };
        }
        groupMap[groupId].courts[courtId].sales += typeof res.amount === 'string' ? parseFloat(res.amount) : res.amount;
      }
      // Convert to array for rendering
      const grouped = Object.values(groupMap).map(g => ({
        groupName: g.groupName,
        courts: Object.values(g.courts)
      }));
      setSingleDayCourtSales(grouped);
    }
    fetchSingleDayCourtSales();
  }, [singleDay]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Financials</h2>
            <p className="text-muted-foreground">
              Overview of your financial data
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 items-center">
            <CalendarDateRangePicker 
              date={dateRange} 
              setDate={(range) => {
                setDateRange(range);
                if (range) setSingleDay(null); // Clear single day if range is picked
              }} 
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[220px] justify-start text-left font-normal">
                  <span className="mr-2">📅</span>
                  {singleDay ? format(singleDay, "LLL dd, y") : "Pick a day"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={singleDay ?? undefined}
                  onSelect={(date) => {
                    setSingleDay(date);
                    if (date) setDateRange(undefined); // Clear range if single day is picked
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
                {singleDay && (
                  <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setSingleDay(null)}>
                    Clear
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title={singleDay ? `${format(singleDay, "PPP")} Revenue` : "Today's Revenue"}
                value={singleDay ? Math.round(singleDaySales).toString() : Math.round(stats.todayRevenue).toString()}
                icon={DollarSign}
                description={singleDay ? `Total revenue for ${format(singleDay, "PPP")}` : "Total revenue for today"}
                positive={true}
              />
              <StatCard
                title={singleDay ? `${format(singleDay, "PPP")} Expenses` : "Today's Expenses"}
                value={singleDay ? Math.round(singleDayTotalExpenses).toString() : Math.round(stats.todayExpenses).toString()}
                icon={TrendingDown}
                description={singleDay ? `Total expenses for ${format(singleDay, "PPP")}` : "Total expenses for today"}
                negative={true}
              />
              <StatCard
                title={singleDay ? `Total Revenue` : "Total Revenue"}
                value={singleDay ? Math.round(singleDaySales).toString() : Math.round(stats.totalRevenue).toString()}
                icon={TrendingUp}
                description={singleDay ? `Total sales for ${format(singleDay, "PPP")}` : "All-time revenue"}
                positive={true}
              />
              <StatCard
                title={singleDay ? `Net Profit` : "Net Profit"}
                value={singleDay ? Math.round(singleDaySales - singleDayTotalExpenses).toString() : Math.round(stats.netProfit).toString()}
                icon={CreditCard}
                description={singleDay ? `Net profit for ${format(singleDay, "PPP")}` : "Total revenue minus expenses"}
                positive={singleDay ? (singleDaySales - singleDayTotalExpenses) > 0 : stats.netProfit > 0}
                negative={singleDay ? (singleDaySales - singleDayTotalExpenses) < 0 : stats.netProfit < 0}
              />
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  {transactionsLoading ? (
                    <div className="text-center py-4">Loading transactions...</div>
                  ) : (
                    <div className="space-y-4">
                      {(singleDay ? singleDayTransactions : filteredTransactions).slice(0, 5).map(transaction => (
                        <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-md">
                          <div>
                            <div className="font-medium">
                              {transaction.reservations?.clients?.name || "N/A"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(transaction.date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-green-600">
                              &#163;{Math.round(parseFloat(transaction.amount.toString()))}
                            </div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {transaction.payment_method}
                            </div>
                          </div>
                        </div>
                      ))}
                      {(singleDay ? singleDayTransactions : filteredTransactions).length === 0 && (
                        <div className="text-center py-4">No transactions found</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  {expensesLoading ? (
                    <div className="text-center py-4">Loading expenses...</div>
                  ) : (
                    <div className="space-y-4">
                      {(singleDay ? singleDayExpenses : filteredExpenses).slice(0, 5).map(expense => (
                        <div key={expense.id} className="flex items-center justify-between p-3 border rounded-md">
                          <div>
                            <div className="font-medium">{expense.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(expense.date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-red-500">
                              -&#163;{Math.round(parseFloat(expense.amount.toString()))}
                            </div>
                          </div>
                        </div>
                      ))}
                      {(singleDay ? singleDayExpenses : filteredExpenses).length === 0 && (
                        <div className="text-center py-4">No expenses found</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="income" className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Filter by court name..."
                value={incomeCourtFilter}
                onChange={(e) => setIncomeCourtFilter(e.target.value)}
                className="max-w-xs"
              />
              <Input
                placeholder="Filter by client name..."
                value={incomeClientFilter}
                onChange={(e) => setIncomeClientFilter(e.target.value)}
                className="max-w-xs"
              />
              <Input
                placeholder="Filter by group name..."
                value={incomeGroupFilter}
                onChange={(e) => setIncomeGroupFilter(e.target.value)}
                className="max-w-xs"
              />
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Court</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead className="text-right">Amount (&#163;)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading transactions...
                      </TableCell>
                    </TableRow>
                  ) : filteredIncomeTransactions.length > 0 ? (
                    filteredIncomeTransactions.map(transaction => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.reservations?.clients?.name || "N/A"}</TableCell>
                        <TableCell>{transaction.reservations?.courts?.name || "N/A"}</TableCell>
                        <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                        <TableCell className="capitalize">{transaction.payment_method}</TableCell>
                        <TableCell>{transaction.reservations?.courts && 'court_groups' in transaction.reservations.courts && transaction.reservations.courts.court_groups?.name ? transaction.reservations.courts.court_groups.name : '-'}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          &#163;{Math.round(parseFloat(transaction.amount.toString()))}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="expenses" className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
                <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Filter by expense name..."
                value={expenseNameFilter}
                onChange={(e) => setExpenseNameFilter(e.target.value)}
                className="max-w-xs"
              />
              <Input
                placeholder="Filter by category..."
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="max-w-xs"
              />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsCategoryManagerOpen(true)}>
                  Manage Categories
                </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Expense
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Expense</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Electricity Bill" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                              <FormLabel>Amount (&#163;)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                          <FormField
                            control={form.control}
                            name="category_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <select
                                      className="border rounded px-2 py-1"
                                      value={field.value || ""}
                                      onChange={field.onChange}
                                    >
                                      <option value="">No Category</option>
                                      {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                      ))}
                                    </select>
                                  </FormControl>
                                  <Button type="button" variant="outline" size="sm" onClick={() => setIsCategoryDialogOpen(true)}>
                                    + Add Category
                                  </Button>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes</FormLabel>
                                <FormControl>
                                  <Input placeholder="Optional notes..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full">
                        Add Expense
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              </div>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Amount (&#163;)</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expensesLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading expenses...
                      </TableCell>
                    </TableRow>
                  ) : filteredExpenses.length > 0 ? (
                    filteredExpenses.map(expense => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">{expense.title}</TableCell>
                        <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                        <TableCell>{expense.category_name || "-"}</TableCell>
                        <TableCell>{expense.notes || "-"}</TableCell>
                        <TableCell className="text-right font-medium text-red-500">
                          -&#163;{Math.round(parseFloat(expense.amount.toString()))}
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => {
                            setEditExpense(expense);
                            form.setValue('title', expense.title);
                            form.setValue('amount', expense.amount);
                            form.setValue('date', expense.date);
                            form.setValue('category_id', expense.category_id || "");
                            form.setValue('notes', expense.notes || "");
                            setEditExpenseDialogOpen(true);
                          }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { setDeleteExpenseId(expense.id); setDeleteExpenseDialogOpen(true); }}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No expenses found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="summary" className="space-y-6">
            {/* Only show summary if a date range or single day is selected */}
            {(!dateRange || !dateRange.from || !dateRange.to) && !singleDay ? (
              <div className="text-center text-muted-foreground py-12 text-lg">
                Please select a date range or a single day to view summary data.
              </div>
            ) : (
              <>
                {/* Single Day Financials Section */}
                {singleDay && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold">Financials for {format(singleDay, "PPP")}</h3>
                    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                      <StatCard title="Sales" value={Math.round(singleDaySales).toString()} icon={DollarSign} description="Total sales for the day" positive={true} />
                      <StatCard title="Cash" value={Math.round(singleDayCash).toString()} icon={DollarSign} description="Cash payments" positive={true} />
                      <StatCard title="Card" value={Math.round(singleDayCard).toString()} icon={CreditCard} description="Card payments" positive={true} />
                      <StatCard title="Wallet" value={Math.round(singleDayWallet).toString()} icon={DollarSign} description="Wallet payments" positive={true} />
                      <StatCard title="Expenses" value={Math.round(singleDayTotalExpenses).toString()} icon={TrendingDown} description="Expenses for the day" negative={true} />
                      <StatCard title="Cash - Expenses" value={Math.round(singleDayNet).toString()} icon={DollarSign} description="Cash minus expenses" positive={singleDayNet >= 0} negative={singleDayNet < 0} />
                    </div>
                    {/* Court group sales for single day */}
                    <h3 className="text-2xl font-bold mt-8 mb-2">Courts Sale Summary</h3>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {singleDayCourtSales.map(group => (
                        <Card key={group.groupName} className="shadow-lg">
                          <CardHeader>
                            <CardTitle>{group.groupName}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <table className="w-full text-sm">
                              <thead>
                                <tr>
                                  <th className="text-left p-2">Court Name</th>
                                  <th className="text-right p-2">Sales</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.courts.map(court => (
                                  <tr key={court.courtName} className="border-t">
                                    <td className="p-2">{court.courtName}</td>
                                    <td className="p-2 text-right font-semibold text-green-600">{Math.round(court.sales)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <Card>
                      <CardHeader>
                        <CardTitle>Expenses for the Day</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <table className="w-full text-sm">
                          <thead>
                            <tr>
                              <th className="text-left p-2">Title</th>
                              <th className="text-left p-2">Category</th>
                              <th className="text-left p-2">Notes</th>
                              <th className="text-right p-2">Amount (&#163;)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {singleDayExpenses.length > 0 ? singleDayExpenses.map(e => (
                              <tr key={e.id} className="border-t">
                                <td className="p-2">{e.title}</td>
                                <td className="p-2">{e.category_name || '-'}</td>
                                <td className="p-2">{e.notes || '-'}</td>
                                <td className="p-2 text-right font-semibold text-red-500">-&#163;{Math.round(e.amount)}</td>
                              </tr>
                            )) : (
                              <tr><td colSpan={4} className="text-center p-2 text-muted-foreground">No expenses found</td></tr>
                            )}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  </div>
                )}
                {/* Interval (dateRange) summary section, only if not singleDay */}
                {!singleDay && dateRange && dateRange.from && dateRange.to && (
                  <>
                    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                      <StatCard
                        title="Total Sales"
                        value={Math.round(totalSales).toString()}
                        icon={DollarSign}
                        description="Sum of all sales"
                        positive={true}
                      />
                      <StatCard
                        title="Total Cash"
                        value={Math.round(totalCash).toString()}
                        icon={DollarSign}
                        description="Sum of all cash payments"
                        positive={true}
                      />
                      <StatCard
                        title="Total Card"
                        value={Math.round(totalCard).toString()}
                        icon={CreditCard}
                        description="Sum of all card payments"
                        positive={true}
                      />
                      <StatCard
                        title="Total Wallet"
                        value={Math.round(totalWallet).toString()}
                        icon={DollarSign}
                        description="Sum of all wallet payments"
                        positive={true}
                      />
                      <StatCard
                        title="Total Expenses"
                        value={Math.round(totalExpenses).toString()}
                        icon={TrendingDown}
                        description="Sum of all expenses"
                        negative={true}
                      />
                      <StatCard
                        title="Cash - Expenses"
                        value={Math.round(cashMinusExpenses).toString()}
                        icon={DollarSign}
                        description="Total cash minus expenses"
                        positive={cashMinusExpenses >= 0}
                        negative={cashMinusExpenses < 0}
                      />
                    </div>
                    {/* Court group sales */}
                    <h3 className="text-2xl font-bold mt-8 mb-2">Courts Sale Summary</h3>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {groupedCourtSales.map(group => (
                        <Card key={group.groupName} className="shadow-lg">
                          <CardHeader>
                            <CardTitle>{group.groupName}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <table className="w-full text-sm">
                              <thead>
                                <tr>
                                  <th className="text-left p-2">Court Name</th>
                                  <th className="text-right p-2">Sales</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.courts.map(court => (
                                  <tr key={court.courtName} className="border-t">
                                    <td className="p-2">{court.courtName}</td>
                                    <td className="p-2 text-right font-semibold text-green-600">{Math.round(court.sales)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    {/* New Expenses Card at the end */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Expenses</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <table className="w-full text-sm">
                          <thead>
                            <tr>
                              <th className="text-left p-2">Name</th>
                              <th className="text-left p-2">Category</th>
                              <th className="text-left p-2">Notes</th>
                              <th className="text-right p-2">Amount (&#163;)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredExpenses.slice(0, 7).map(expense => (
                              <tr key={expense.id} className="border-t">
                                <td className="p-2">{expense.title}</td>
                                <td className="p-2">{expense.category_name || '-'}</td>
                                <td className="p-2">{expense.notes || '-'}</td>
                                <td className="p-2 text-right font-semibold text-red-500">
                                  -&#163;{Math.round(expense.amount)}
                                </td>
                              </tr>
                            ))}
                            {filteredExpenses.length === 0 && (
                              <tr>
                                <td colSpan={4} className="text-center p-2 text-muted-foreground">No expenses found</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  </>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Category name"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
            />
            <Button
              onClick={async () => {
                if (!newCategoryName.trim()) return;
                await createCategory(newCategoryName.trim());
                setNewCategoryName("");
                setIsCategoryDialogOpen(false);
              }}
              className="w-full"
            >
              Add Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {categories.length === 0 ? (
              <div className="text-muted-foreground">No categories found.</div>
            ) : (
              categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-2">
                  {editCategoryId === cat.id ? (
                    <>
                      <Input
                        value={editCategoryName}
                        onChange={e => setEditCategoryName(e.target.value)}
                        className="w-1/2"
                      />
                      <Button size="sm" onClick={async () => {
                        if (!editCategoryName.trim()) return;
                        await supabase.from('expense_categories').update({ name: editCategoryName.trim() }).eq('id', cat.id);
                        await fetchCategories();
                        setEditCategoryId(null);
                      }}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditCategoryId(null)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1">{cat.name}</span>
                      <Button size="icon" variant="ghost" onClick={() => { setEditCategoryId(cat.id); setEditCategoryName(cat.name); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={async () => {
                        if (window.confirm('Delete this category?')) {
                          await supabase.from('expense_categories').delete().eq('id', cat.id);
                          await fetchCategories();
                        }
                      }}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
            <div className="flex gap-2 mt-4">
              <Input
                placeholder="New category name"
                value={newCategoryInput}
                onChange={e => setNewCategoryInput(e.target.value)}
              />
              <Button onClick={async () => {
                if (!newCategoryInput.trim()) return;
                await createCategory(newCategoryInput.trim());
                setNewCategoryInput("");
              }}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={editExpenseDialogOpen} onOpenChange={setEditExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {editExpense && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(async (data) => {
                  await updateExpense(editExpense.id, {
                    title: data.title,
                    amount: data.amount,
                    date: data.date,
                    category_id: data.category_id || null,
                    notes: data.notes,
                  });
                  setEditExpenseDialogOpen(false);
                })}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Electricity Bill" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (&#163;)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <select
                            className="border rounded px-2 py-1"
                            value={field.value || ""}
                            onChange={field.onChange}
                          >
                            <option value="">No Category</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </FormControl>
                        <Button type="button" variant="outline" size="sm" onClick={() => setIsCategoryDialogOpen(true)}>
                          + Add Category
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Save Changes
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteExpenseDialogOpen} onOpenChange={setDeleteExpenseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the expense and cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteExpenseDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={async () => {
              if (!deleteExpenseId) return;
              await deleteExpense(deleteExpenseId);
              setDeleteExpenseDialogOpen(false);
              setDeleteExpenseId(null);
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default FinancialsPage;
