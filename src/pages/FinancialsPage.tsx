
import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
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

const expenseFormSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters" }),
  amount: z.coerce.number().positive({ message: "Amount must be positive" }),
  date: z.string().min(1, { message: "Date is required" }),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

const FinancialsPage = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  
  // Use our custom hooks for Supabase data
  const { expenses, isLoading: expensesLoading, createExpense } = useExpensesData();
  const { transactions, isLoading: transactionsLoading } = useTransactionsData();
  
  // Calculate financial stats
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayExpenses: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0
  });
  
  useEffect(() => {
    // Calculate stats from actual data
    if (!transactionsLoading && !expensesLoading) {
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate revenue stats
      const todayRevenue = transactions
        .filter(t => t.date === today)
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      
      const totalRevenue = transactions
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      
      // Calculate expense stats
      const todayExpenses = expenses
        .filter(e => e.date === today)
        .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
      
      const totalExpenses = expenses
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
  }, [transactions, expenses, transactionsLoading, expensesLoading]);
  
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      title: "",
      amount: 0,
      date: new Date().toISOString().split('T')[0],
    },
  });

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!isDialogOpen) {
      form.reset();
    }
  }, [isDialogOpen, form]);

  const onSubmit = async (data: ExpenseFormValues) => {
    const result = await createExpense({
      title: data.title,
      amount: data.amount,
      date: data.date,
    });
    
    if (result.success) {
      toast({
        title: "Expense added",
        description: `${data.title} has been added successfully.`,
      });
      setIsDialogOpen(false);
    }
  };

  // Filter expenses based on search term
  const filteredExpenses = expenses.filter(expense => 
    expense.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter transactions based on search term
  const filteredTransactions = transactions.filter(transaction => 
    transaction.id.includes(searchTerm) || 
    transaction.payment_method.includes(searchTerm)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Financials</h2>
            <p className="text-muted-foreground">
              Overview of your financial data
            </p>
          </div>
        </div>
        
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Today's Revenue"
                value={stats.todayRevenue.toFixed(2)}
                icon={DollarSign}
                description="Total revenue for today"
                positive={true}
              />
              <StatCard
                title="Today's Expenses"
                value={stats.todayExpenses.toFixed(2)}
                icon={TrendingDown}
                description="Total expenses for today"
                negative={true}
              />
              <StatCard
                title="Total Revenue"
                value={stats.totalRevenue.toFixed(2)}
                icon={TrendingUp}
                description="All-time revenue"
                positive={true}
              />
              <StatCard
                title="Net Profit"
                value={stats.netProfit.toFixed(2)}
                icon={CreditCard}
                description="Total revenue minus expenses"
                positive={stats.netProfit > 0}
                negative={stats.netProfit < 0}
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
                      {transactions.slice(0, 5).map(transaction => (
                        <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-md">
                          <div>
                            <div className="font-medium">
                              {transaction.reservation_id ? `Reservation #${transaction.reservation_id.substring(0, 8)}` : 'Direct Payment'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(transaction.date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-green-600">
                              ${parseFloat(transaction.amount.toString()).toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {transaction.payment_method}
                            </div>
                          </div>
                        </div>
                      ))}
                      {transactions.length === 0 && (
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
                      {expenses.slice(0, 5).map(expense => (
                        <div key={expense.id} className="flex items-center justify-between p-3 border rounded-md">
                          <div>
                            <div className="font-medium">{expense.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(expense.date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-red-500">
                              -${parseFloat(expense.amount.toString()).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                      {expenses.length === 0 && (
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
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Reservation</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading transactions...
                      </TableCell>
                    </TableRow>
                  ) : filteredTransactions.length > 0 ? (
                    filteredTransactions.map(transaction => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.id.substring(0, 8)}</TableCell>
                        <TableCell>
                          {transaction.reservation_id 
                            ? `#${transaction.reservation_id.substring(0, 8)}` 
                            : 'Direct Payment'}
                        </TableCell>
                        <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                        <TableCell className="capitalize">{transaction.payment_method}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          ${parseFloat(transaction.amount.toString()).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="expenses" className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              
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
                            <FormLabel>Amount ($)</FormLabel>
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
                      <Button type="submit" className="w-full">
                        Add Expense
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expensesLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        Loading expenses...
                      </TableCell>
                    </TableRow>
                  ) : filteredExpenses.length > 0 ? (
                    filteredExpenses.map(expense => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">{expense.title}</TableCell>
                        <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-medium text-red-500">
                          -${parseFloat(expense.amount.toString()).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        No expenses found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default FinancialsPage;
