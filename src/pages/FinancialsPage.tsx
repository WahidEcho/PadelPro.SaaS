import React, { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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
  DialogDescription,
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Court, Client } from "@/types/supabase";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/hooks/use-auth";

const expenseFormSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters" }),
  amount: z.coerce.number().positive({ message: "Amount must be positive" }),
  date: z.string().min(1, { message: "Date is required" }),
  category_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

function isSameDay(dateStr: string, day: Date | null) {
  if (!day) return false;
  const d = new Date(dateStr);
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate()
  );
}

// Add type definition before the groupedIncomeTransactions
type GroupedIncomeTransaction = {
  reservationId: string;
  client: string;
  court: string;
  date: string;
  group: string;
  cash: number;
  card: number;
  wallet: number;
};

const FinancialsPage = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [incomeCourtFilter, setIncomeCourtFilter] = useState("");
  const [incomeClientFilter, setIncomeClientFilter] = useState("");
  const [incomeGroupFilter, setIncomeGroupFilter] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();
  
  // Use our custom hooks for Supabase data
  const { expenses, isLoading: expensesLoading, createExpense, updateExpense, deleteExpense, categories, createCategory, fetchCategories, fetchExpenses } = useExpensesData();
  const { transactions, isLoading: transactionsLoading, fetchTransactions } = useTransactionsData();
  
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

  // Pagination state for income table
  const [incomeCurrentPage, setIncomeCurrentPage] = useState(1);
  const incomeItemsPerPage = 100;

  // For single day: group court sales
  const [singleDayCourtSales, setSingleDayCourtSales] = useState<any[]>([]);

  // Update the isInRange function to handle single day
  const isInRange = (dateStr: string) => {
    if (singleDay) {
      return isSameDay(dateStr, singleDay);
    }
    if (!dateRange || !dateRange.from || !dateRange.to) return true;
    const date = new Date(dateStr);
    
    // Create start of day for 'from' date and end of day for 'to' date
    const startDate = new Date(dateRange.from);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(dateRange.to);
    endDate.setHours(23, 59, 59, 999);
    
    return date >= startDate && date <= endDate;
  };

  // Memoize filtered transactions and expenses
  const filteredTransactions = React.useMemo(() => 
    transactions.filter((transaction) => isInRange(transaction.date)),
    [transactions, singleDay, dateRange]
  );

  const filteredExpenses = React.useMemo(() => 
    expenses
      .filter((expense) => {
        const nameMatch = expense.title.toLowerCase().includes(expenseNameFilter.toLowerCase());
        const categoryMatch = (expense.category_name || "-").toLowerCase().includes(expenseCategoryFilter.toLowerCase());
        const searchMatch =
          searchTerm === "" ||
          expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (expense.category_name || "-").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (expense.notes || "").toLowerCase().includes(searchTerm.toLowerCase());
        return nameMatch && categoryMatch && searchMatch && isInRange(expense.date);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [expenses, expenseNameFilter, expenseCategoryFilter, searchTerm, singleDay, dateRange]
  );
  
  // Update the useEffect for stats calculation
  useEffect(() => {
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

  // State for summary cards data - use same logic as court sales
  const [summaryCardsData, setSummaryCardsData] = useState({
    totalSales: 0,
    totalCash: 0,
    totalCard: 0,
    totalWallet: 0,
    isLoading: true
  });

  // Fetch summary cards data using the same logic as court sales
  const fetchSummaryCardsData = async () => {
    setSummaryCardsData(prev => ({ ...prev, isLoading: true }));
    
    try {
      let query = supabase
        .from('transactions')
        .select('amount, payment_method, reservations!inner(id)');

      if (singleDay) {
        query = query.eq('date', toLocalDateString(singleDay));
      } else if (dateRange && dateRange.from && dateRange.to) {
        query = query
          .gte('date', toLocalDateString(dateRange.from))
          .lte('date', toLocalDateString(dateRange.to));
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching summary data:', error);
        setSummaryCardsData({ totalSales: 0, totalCash: 0, totalCard: 0, totalWallet: 0, isLoading: false });
        return;
      }

      // Calculate totals from fresh database query
      const totalSales = data.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      const totalCash = data.filter(t => t.payment_method === 'cash').reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      const totalCard = data.filter(t => t.payment_method === 'card').reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      const totalWallet = data.filter(t => t.payment_method === 'wallet').reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

      setSummaryCardsData({
        totalSales,
        totalCash,
        totalCard,
        totalWallet,
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching summary data:', error);
      setSummaryCardsData({ totalSales: 0, totalCash: 0, totalCard: 0, totalWallet: 0, isLoading: false });
    }
  };

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
  const cashMinusExpenses = summaryCardsData.totalCash - totalExpenses;

  // Helper to get local date string in YYYY-MM-DD
  function toLocalDateString(date: Date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  // Move fetchCourtSales outside the useEffect to make it callable from the realtime handler
  const fetchCourtSales = async () => {
    if (!dateRange || !dateRange.from || !dateRange.to) return;
    
      let query = supabase
        .from('transactions')
        .select(`amount, reservations(courts(name, court_groups(id, name)))`);
    
        query = query
          .gte('date', toLocalDateString(dateRange.from))
          .lte('date', toLocalDateString(dateRange.to));
    
      const { data, error } = await query;
      if (error) {
        setGroupedCourtSales([]);
        return;
      }
    
      // Group by court group, then by court
      const groupMap: Record<string, { groupName: string, courts: Record<string, { courtName: string, sales: number }> }> = {};
      for (const tx of data) {
        // Skip transactions without reservations or court info
        if (!tx.reservations?.courts?.court_groups?.id || !tx.reservations?.courts?.court_groups?.name || !tx.reservations?.courts?.name) {
          continue;
        }
        
        const groupId = tx.reservations.courts.court_groups.id;
        const groupName = tx.reservations.courts.court_groups.name;
        const courtId = tx.reservations.courts.name;
        if (!groupMap[groupId]) {
          groupMap[groupId] = { groupName, courts: {} };
        }
        if (!groupMap[groupId].courts[courtId]) {
          groupMap[groupId].courts[courtId] = { courtName: courtId, sales: 0 };
        }
        groupMap[groupId].courts[courtId].sales += typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
      }
    
      // Convert to array for rendering
      const grouped = Object.values(groupMap).map(g => ({
        groupName: g.groupName,
        courts: Object.values(g.courts)
      }));
      setGroupedCourtSales(grouped);
  };

  // Move fetchSingleDayCourtSales outside the useEffect to make it callable from the realtime handler
  const fetchSingleDayCourtSales = async () => {
      if (!singleDay) {
        setSingleDayCourtSales([]);
        return;
      }
    
      let query = supabase
        .from('transactions')
        .select(`amount, reservations(courts(name, court_groups(id, name)))`)
        .eq('date', toLocalDateString(singleDay));
    
      const { data, error } = await query;
      if (error) {
        setSingleDayCourtSales([]);
        return;
      }
    
      // Group by court group, then by court
      const groupMap: Record<string, { groupName: string, courts: Record<string, { courtName: string, sales: number }> }> = {};
      for (const tx of data) {
        // Skip transactions without reservations or court info
        if (!tx.reservations?.courts?.court_groups?.id || !tx.reservations?.courts?.court_groups?.name || !tx.reservations?.courts?.name) {
          continue;
        }
        
        const groupId = tx.reservations.courts.court_groups.id;
        const groupName = tx.reservations.courts.court_groups.name;
        const courtId = tx.reservations.courts.name;
        if (!groupMap[groupId]) {
          groupMap[groupId] = { groupName, courts: {} };
        }
        if (!groupMap[groupId].courts[courtId]) {
          groupMap[groupId].courts[courtId] = { courtName: courtId, sales: 0 };
        }
        groupMap[groupId].courts[courtId].sales += typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
      }
    
      // Convert to array for rendering
      const grouped = Object.values(groupMap).map(g => ({
        groupName: g.groupName,
        courts: Object.values(g.courts)
      }));
      setSingleDayCourtSales(grouped);
  };

  // Fetch reservations for the income table
  const [incomeReservations, setIncomeReservations] = useState<any[]>([]);
  const fetchIncomeReservations = async () => {
    let query = supabase
      .from('reservations')
      .select(`
        id,
        date,
        cash,
        card,
        wallet,
        created_at,
        clients(name, id),
        courts(name, id, court_groups(name))
      `)
      .order('created_at', { ascending: false })
      .limit(10000); // Increase limit to handle large datasets
    if (singleDay) {
      query = query.eq('date', toLocalDateString(singleDay));
    } else if (dateRange && dateRange.from && dateRange.to) {
      query = query.gte('date', toLocalDateString(dateRange.from)).lte('date', toLocalDateString(dateRange.to));
    }
    const { data, error } = await query;
    if (!error) {
      setIncomeReservations(data || []);
    } else {
      setIncomeReservations([]);
    }
  };

  // Fetch and group sales per court and group for the summary tab
  useEffect(() => {
    fetchCourtSales();
  }, [dateRange]);

  // For single day: group court sales
  useEffect(() => {
    fetchSingleDayCourtSales();
  }, [singleDay]);

  // Fetch summary cards data when filters change
  useEffect(() => {
    fetchSummaryCardsData();
  }, [singleDay, dateRange]);

  // Initial fetch of summary cards data
  useEffect(() => {
    fetchSummaryCardsData();
  }, []);

  useEffect(() => {
    // Define the handleRealtimeChange function outside of the useEffect 
    // to ensure it doesn't depend on any changing state
    const handleRealtimeChange = () => {
      console.log("Realtime change detected - fetching income reservations");
      fetchIncomeReservations();
      fetchSummaryCardsData(); // Fetch summary cards data
      
      // Also update summary data when transactions or reservations change
      if (singleDay) {
        fetchSingleDayCourtSales();
      } else if (dateRange && dateRange.from && dateRange.to) {
        fetchCourtSales();
      }
      
      // Re-fetch transactions and expenses for the summary calculations
      fetchTransactions();
      fetchExpenses();
    };

    // Create a more specific channel name for each table
    const transactionsChannel = supabase
      .channel('realtime:income-transactions')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'transactions' 
      }, handleRealtimeChange)
      .subscribe();

    const reservationsChannel = supabase
      .channel('realtime:income-reservations')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reservations' 
      }, handleRealtimeChange)
      .subscribe();

    // Also listen for expense changes
    const expensesChannel = supabase
      .channel('realtime:expenses')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'expenses' 
      }, handleRealtimeChange)
      .subscribe();

    // Clean up the channels on component unmount
    return () => {
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(reservationsChannel);
      supabase.removeChannel(expensesChannel);
    };
    // Intentionally keeping the dependency array empty to create these event handlers only once.
    // Adding dependencies like fetchIncomeReservations, dateRange, etc. would cause multiple 
    // subscriptions to be created and torn down, which would be inefficient and potentially 
    // cause websocket connection issues.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Filter for single day - only include transactions with reservations
  const singleDayTransactions = singleDay
    ? transactions.filter((t) => isSameDay(t.date, singleDay) && t.reservations?.id)
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

  // Add local state for single day summary
  const [optimisticSingleDayStats, setOptimisticSingleDayStats] = useState<null | {
    sales: number;
    cash: number;
    card: number;
    wallet: number;
    expenses: number;
    net: number;
  }>(null);

  // Compute single day stats from local state if available, otherwise from calculated values
  const displaySingleDaySales = optimisticSingleDayStats ? optimisticSingleDayStats.sales : singleDaySales;
  const displaySingleDayCash = optimisticSingleDayStats ? optimisticSingleDayStats.cash : singleDayCash;
  const displaySingleDayCard = optimisticSingleDayStats ? optimisticSingleDayStats.card : singleDayCard;
  const displaySingleDayWallet = optimisticSingleDayStats ? optimisticSingleDayStats.wallet : singleDayWallet;
  const displaySingleDayExpenses = optimisticSingleDayStats ? optimisticSingleDayStats.expenses : singleDayTotalExpenses;
  const displaySingleDayNet = optimisticSingleDayStats ? optimisticSingleDayStats.net : singleDayNet;

  // Add state for pending delete reservation
  const [pendingDeleteReservation, setPendingDeleteReservation] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { isAdmin, isManager, isEmployee, user } = useAuth();

  // Add missing state variables for edit/delete functionality
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [editReservationDialogOpen, setEditReservationDialogOpen] = useState(false);
  const [deleteReservationDialogOpen, setDeleteReservationDialogOpen] = useState(false);
  const [isDeletingReservation, setIsDeletingReservation] = useState(false);

  // Add the handleDeleteReservation function
  const handleDeleteReservation = async () => {
    if (!selectedReservation) return;
    setIsDeletingReservation(true);
    try {
      // First, delete all related transactions
      await supabase
        .from('transactions')
        .delete()
        .eq('reservation_id', selectedReservation.id);

      // Then, delete the reservation
      const { error: reservationError } = await supabase
        .from('reservations')
        .delete()
        .eq('id', selectedReservation.id);
      
      if (reservationError) throw reservationError;
      
      // Refresh data
      await fetchIncomeReservations();
      
      toast({
        title: "Reservation deleted",
        description: "The reservation has been deleted successfully.",
      });
      setDeleteReservationDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete reservation",
        variant: "destructive",
      });
    } finally {
      setIsDeletingReservation(false);
    }
  };

  // Reservation dialog state for Income tab
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [courts, setCourts] = useState<Court[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [reservationDate, setReservationDate] = useState<Date | undefined>(new Date());
  const [selectedCourt, setSelectedCourt] = useState<string>("");
  const [timeStart, setTimeStart] = useState<string>("09:00");
  const [timeEnd, setTimeEnd] = useState<string>("10:00");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [cash, setCash] = useState<number>(0);
  const [card, setCard] = useState<number>(0);
  const [wallet, setWallet] = useState<number>(0);
  const [isSubmittingReservation, setIsSubmittingReservation] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState<Client[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientDropdownIndex, setClientDropdownIndex] = useState(-1);
  const clientInputRef = useRef<HTMLInputElement>(null);

  // Add new state variables for Add Client dialog
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [isAddingClient, setIsAddingClient] = useState(false);

  // Debounced search for clients
  useEffect(() => {
    if (!clientSearch) {
      setClientSearchResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .or(`name.ilike.%${clientSearch}%,phone.ilike.%${clientSearch}%`)
        .eq('is_deleted', false);
      setClientSearchResults(data || []);
      setShowClientDropdown(true);
      setClientDropdownIndex(-1);
    }, 1);
    return () => clearTimeout(handler);
  }, [clientSearch]);

  // Keyboard navigation for dropdown
  const handleClientInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showClientDropdown || clientSearchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      setClientDropdownIndex(idx => Math.min(idx + 1, clientSearchResults.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setClientDropdownIndex(idx => Math.max(idx - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter' && clientDropdownIndex >= 0) {
      const client = clientSearchResults[clientDropdownIndex];
      setSelectedClient(client.id);
      setClientSearch(client.name);
      setShowClientDropdown(false);
    }
  };

  // Fetch courts and clients for reservation dialog
  useEffect(() => {
    async function fetchCourtsAndClients() {
      const { data: courtsData } = await supabase.from('courts').select('*');
      setCourts(courtsData || []);
      const { data: clientsData } = await supabase.from('clients').select('*').eq('is_deleted', false);
      setClients(clientsData || []);
    }
    if (reservationDialogOpen) fetchCourtsAndClients();
  }, [reservationDialogOpen]);

  // Generate time slots for selection (all 24 hours in 30-minute intervals)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let min of [0, 30]) {
        let displayHour = hour % 12 === 0 ? 12 : hour % 12;
        let ampm = hour < 12 ? 'AM' : 'PM';
        let label = `${displayHour.toString().padStart(2, '0')}:${min === 0 ? '00' : '30'} ${ampm}`;
        let value = `${hour.toString().padStart(2, '0')}:${min === 0 ? '00' : '30'}`;
        slots.push({ value, label });
      }
    }
    return slots;
  };
  const timeSlots = generateTimeSlots();
  const handleTimeStartChange = (value: string) => {
    setTimeStart(value);
    const [hours, minutes] = value.split(':').map(Number);
    const endHours = hours + 1;
    const formattedEndHours = endHours.toString().padStart(2, '0');
    const formattedEndMinutes = minutes.toString().padStart(2, '0');
    const newEndTime = `${formattedEndHours}:${formattedEndMinutes}`;
    setTimeEnd(newEndTime);
  };
  // Add Reservation handler
  const handleAddReservation = async () => {
    if (!selectedCourt || !selectedClient || !reservationDate) {
      toast({ title: "Error", description: "Please fill all the required fields", variant: "destructive" });
      return;
    }
    setIsSubmittingReservation(true);
    try {
      const totalAmount = cash + card + wallet;
      const reservationPayload = {
            client_id: selectedClient,
            court_id: selectedCourt,
            date: format(reservationDate, 'yyyy-MM-dd'),
            time_start: timeStart,
            time_end: timeEnd,
            cash,
            card,
            wallet,
            amount: totalAmount,
        created_by_role: isAdmin ? "admin" : isManager ? "manager" : "employee",
        employee_name: (isEmployee || isManager) && !isAdmin && user ? user.user_metadata?.full_name || user.email : null,
        payment_method: 'cash', // Dummy value to satisfy type requirement
      };
      const { data: reservationData, error: reservationError } = await supabase
        .from('reservations')
        .insert([reservationPayload])
        .select();
      if (reservationError) throw reservationError;
      // Also create a transaction for this reservation
      const txInserts = [];
      if (cash > 0) txInserts.push({ reservation_id: reservationData[0].id, amount: cash, payment_method: 'cash', date: format(reservationDate, 'yyyy-MM-dd') });
      if (card > 0) txInserts.push({ reservation_id: reservationData[0].id, amount: card, payment_method: 'card', date: format(reservationDate, 'yyyy-MM-dd') });
      if (wallet > 0) txInserts.push({ reservation_id: reservationData[0].id, amount: wallet, payment_method: 'wallet', date: format(reservationDate, 'yyyy-MM-dd') });
      if (txInserts.length > 0) {
        await supabase.from('transactions').insert(txInserts);
      }
      // Reset form
      setSelectedCourt("");
      setSelectedClient("");
      setReservationDate(new Date());
      setTimeStart("09:00");
      setTimeEnd("10:00");
      setCash(0);
      setCard(0);
      setWallet(0);
      setReservationDialogOpen(false);
      
      // Manually fetch the updated income reservations
      fetchIncomeReservations();
      
      toast({ title: "Reservation added", description: `Reservation has been added successfully` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add reservation", variant: "destructive" });
    } finally {
      setIsSubmittingReservation(false);
    }
  };

  // Load income reservations when filters change
  useEffect(() => {
    fetchIncomeReservations();
  }, [singleDay, dateRange, incomeCourtFilter, incomeClientFilter, incomeGroupFilter]);

  // Filter and map reservations for the table
  const filteredIncomeReservations = incomeReservations
    .filter(res => {
      const clientName = res.clients?.name?.toLowerCase() || "";
      const courtName = res.courts?.name?.toLowerCase() || "";
      const groupName = res.courts?.court_groups?.name?.toLowerCase() || "";
      const courtFilter = incomeCourtFilter.toLowerCase();
      const clientFilter = incomeClientFilter.toLowerCase();
      const groupFilter = incomeGroupFilter.toLowerCase();
      return (
        (!courtFilter || courtName.includes(courtFilter)) &&
        (!clientFilter || clientName.includes(clientFilter)) &&
        (!groupFilter || groupName.includes(groupFilter))
      );
    })
    .sort((a, b) => {
      // Primary sort: by created_at timestamp (descending) - most recent reservations first
      if (a.created_at && b.created_at) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      
      // Fallback sort: by date and time_start (descending)
      const dateA = new Date(`${a.date}T${a.time_start || '00:00'}`);
      const dateB = new Date(`${b.date}T${b.time_start || '00:00'}`);
      return dateB.getTime() - dateA.getTime();
    });

  // Calculate pagination for income table
  const incomeTotalPages = Math.ceil(filteredIncomeReservations.length / incomeItemsPerPage);
  const incomeStartIndex = (incomeCurrentPage - 1) * incomeItemsPerPage;
  const incomeEndIndex = incomeStartIndex + incomeItemsPerPage;
  const paginatedIncomeReservations = filteredIncomeReservations.slice(incomeStartIndex, incomeEndIndex);

  // Reset to first page when filters change
  React.useEffect(() => {
    setIncomeCurrentPage(1);
  }, [incomeCourtFilter, incomeClientFilter, incomeGroupFilter, singleDay, dateRange]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{t("financials")}</h2>
            <p className="text-muted-foreground">
              {t("overview_of_financial_data")}
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
                  {singleDay ? format(singleDay, "LLL dd, y") : t("pick_a_date")}
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
                    {t("clear")}
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
            <TabsTrigger value="income">{t("income")}</TabsTrigger>
            <TabsTrigger value="expenses">{t("expenses")}</TabsTrigger>
            <TabsTrigger value="summary">{t("summary")}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title={singleDay ? `${format(singleDay, "PPP")} ${t("revenue")}` : t("todays_revenue")}
                value={singleDay ? Math.round(singleDaySales).toString() : Math.round(stats.todayRevenue).toString()}
                icon={DollarSign}
                description={singleDay ? `${t("total_revenue_for")} ${format(singleDay, "PPP")}` : t("total_revenue_for_today")}
                positive={true}
              />
              <StatCard
                title={singleDay ? `${format(singleDay, "PPP")} ${t("expenses")}` : t("todays_expenses")}
                value={singleDay ? Math.round(singleDayTotalExpenses).toString() : Math.round(stats.todayExpenses).toString()}
                icon={TrendingDown}
                description={singleDay ? `${t("total_expenses_for")} ${format(singleDay, "PPP")}` : t("total_expenses_for_today")}
                negative={true}
              />
              <StatCard
                title={singleDay ? t("total_revenue") : t("total_revenue")}
                value={singleDay ? Math.round(singleDaySales).toString() : Math.round(stats.totalRevenue).toString()}
                icon={TrendingUp}
                description={singleDay ? `${t("total_sales_for")} ${format(singleDay, "PPP")}` : t("all_time_revenue")}
                positive={true}
              />
              <StatCard
                title={singleDay ? t("net_profit") : t("net_profit")}
                value={singleDay ? Math.round(singleDaySales - singleDayTotalExpenses).toString() : Math.round(stats.netProfit).toString()}
                icon={CreditCard}
                description={singleDay ? `${t("net_profit_for")} ${format(singleDay, "PPP")}` : t("total_revenue_minus_expenses")}
                positive={singleDay ? (singleDaySales - singleDayTotalExpenses) > 0 : stats.netProfit > 0}
                negative={singleDay ? (singleDaySales - singleDayTotalExpenses) < 0 : stats.netProfit < 0}
              />
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t("recent_transactions")}</CardTitle>
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
                              {Math.round(parseFloat(transaction.amount.toString()))}
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
                  <CardTitle>{t("recent_expenses")}</CardTitle>
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
                              -{Math.round(parseFloat(expense.amount.toString()))}
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
                placeholder={t("filter_by_court")}
                value={incomeCourtFilter}
                onChange={(e) => setIncomeCourtFilter(e.target.value)}
                className="max-w-xs"
              />
              <Input
                placeholder={t("filter_by_client")}
                value={incomeClientFilter}
                onChange={(e) => setIncomeClientFilter(e.target.value)}
                className="max-w-xs"
              />
              <Input
                placeholder={t("filter_by_group")}
                value={incomeGroupFilter}
                onChange={(e) => setIncomeGroupFilter(e.target.value)}
                className="max-w-xs"
              />
              <Dialog open={reservationDialogOpen} onOpenChange={setReservationDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                <Plus className="mr-2 h-4 w-4" />
                    {t("new_sales")}
              </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add Reservation</DialogTitle>
                  <DialogDescription>
                    Create a new reservation for a padel court.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !reservationDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {reservationDate ? format(reservationDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={reservationDate}
                          onSelect={setReservationDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="court">Court</Label>
                    <Select
                      value={selectedCourt}
                      onValueChange={(value) => setSelectedCourt(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select court" />
                      </SelectTrigger>
                      <SelectContent>
                        {courts.map((court) => (
                          <SelectItem key={court.id} value={court.id}>
                            {court.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="time-start">Start Time</Label>
                      <Select
                        value={timeStart}
                        onValueChange={handleTimeStartChange}
                      >
                        <SelectTrigger id="time-start">
                          <SelectValue placeholder="Start time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((slot) => (
                            <SelectItem key={`start-${slot.value}`} value={slot.value}>
                              {slot.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="time-end">End Time</Label>
                      <Select
                        value={timeEnd}
                        onValueChange={(value) => setTimeEnd(value)}
                      >
                        <SelectTrigger id="time-end">
                          <SelectValue placeholder="End time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((slot) => (
                            <SelectItem key={`end-${slot.value}`} value={slot.value}>
                              {slot.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="client">Client</Label>
                    <div className="relative">
                      <Input
                        id="client"
                        ref={clientInputRef}
                        type="text"
                        autoComplete="off"
                        placeholder="Type client name or phone..."
                        value={clientSearch}
                        onChange={e => {
                          setClientSearch(e.target.value);
                          setShowClientDropdown(true);
                          setSelectedClient("");
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                        onBlur={() => setTimeout(() => setShowClientDropdown(false), 150)}
                        onKeyDown={handleClientInputKeyDown}
                      />
                      {showClientDropdown && (
                        <div className="absolute z-10 bg-white dark:bg-gray-800 border w-full mt-1 rounded shadow max-h-48 overflow-auto">
                          {clientSearchResults.length > 0 ? (
                            clientSearchResults.map((client, idx) => (
                              <div
                                key={client.id}
                                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${idx === clientDropdownIndex ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                                onMouseDown={() => {
                                  setSelectedClient(client.id);
                                  setClientSearch(client.name);
                                  setShowClientDropdown(false);
                                }}
                              >
                                {client.name} — {client.phone}
                              </div>
                            ))
                          ) : (
                            <div
                              className="px-3 py-2 text-muted-foreground cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                              onMouseDown={() => setIsAddClientDialogOpen(true)}
                            >
                              No client found. <span className="text-blue-600 underline">Add new?</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="cash">{t("amount_of_cash")}</Label>
                      <Input
                        id="cash"
                        type="number"
                        value={cash}
                        onChange={e => setCash(Number(e.target.value))}
                        min={0}
                      />
                    </div>
                    <div>
                      <Label htmlFor="card">{t("amount_of_card")}</Label>
                      <Input
                        id="card"
                        type="number"
                        value={card}
                        onChange={e => setCard(Number(e.target.value))}
                        min={0}
                      />
                    </div>
                    <div>
                      <Label htmlFor="wallet">{t("amount_of_wallet")}</Label>
                      <Input
                        id="wallet"
                        type="number"
                        value={wallet}
                        onChange={e => setWallet(Number(e.target.value))}
                        min={0}
                      />
                    </div>
                  </div>
                    <div className="text-right font-semibold text-lg mt-2">
                      Total: £{(Number(cash) || 0) + (Number(card) || 0) + (Number(wallet) || 0)}
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setReservationDialogOpen(false)} disabled={isSubmittingReservation}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddReservation} disabled={isSubmittingReservation}>
                    {isSubmittingReservation ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Add Reservation
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
            
            {/* Pagination Controls for Income Table - Top */}
            {!transactionsLoading && filteredIncomeReservations.length > 0 && (
              <div className="flex items-center justify-between px-2 py-4 bg-muted/50 rounded-md">
                <div className="text-sm text-muted-foreground">
                  Showing {incomeStartIndex + 1} to {Math.min(incomeEndIndex, filteredIncomeReservations.length)} of {filteredIncomeReservations.length} transactions
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIncomeCurrentPage(Math.max(1, incomeCurrentPage - 1))}
                    disabled={incomeCurrentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Page {incomeCurrentPage} of {incomeTotalPages}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIncomeCurrentPage(Math.min(incomeTotalPages, incomeCurrentPage + 1))}
                    disabled={incomeCurrentPage === incomeTotalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("client")}</TableHead>
                    <TableHead>{t("court")}</TableHead>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("group")}</TableHead>
                    <TableHead className="text-right">{t("amount")}</TableHead>
                    <TableHead className="text-right">{t("cash")}</TableHead>
                    <TableHead className="text-right">{t("card")}</TableHead>
                    <TableHead className="text-right">{t("wallet")}</TableHead>
                    <TableHead>{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        Loading transactions...
                      </TableCell>
                    </TableRow>
                  ) : paginatedIncomeReservations.length > 0 ? (
                    paginatedIncomeReservations.map(row => {
                      const total = (row.cash ?? 0) + (row.card ?? 0) + (row.wallet ?? 0);
                      return (
                        <TableRow key={row.id}>
                          <TableCell>{row.clients?.name || "N/A"}</TableCell>
                          <TableCell>{row.courts?.name || "N/A"}</TableCell>
                          <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                          <TableCell>{row.courts?.court_groups?.name || '-'}</TableCell>
                          <TableCell className="text-right font-medium">{total}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">{row.cash ?? 0}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">{row.card ?? 0}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">{row.wallet ?? 0}</TableCell>
                          <TableCell className="p-4 flex gap-2">
                            {isAdmin && (
                              <Button size="icon" variant="ghost" onClick={() => {
                                // Set all edit states from the reservation row
                                setSelectedReservation(row);
                                setReservationDate(new Date(row.date));
                                setSelectedCourt(row.courts?.id || "");
                                setTimeStart(row.time_start || "09:00");
                                setTimeEnd(row.time_end || "10:00");
                                setSelectedClient(row.clients?.id || "");
                                setClientSearch(row.clients?.name || "");
                                setCash(row.cash ?? 0);
                                setCard(row.card ?? 0);
                                setWallet(row.wallet ?? 0);
                                setEditReservationDialogOpen(true);
                              }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            )}
                            {isAdmin && (
                              <Button size="icon" variant="ghost" onClick={() => {
                                if (!row.id) return;
                                setPendingDeleteReservation(row);
                                setShowDeleteDialog(true);
                              }}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        {filteredIncomeReservations.length === 0 ? "No transactions found" : "No transactions on this page"}
                      </TableCell>
                    </TableRow>
                  )}
                  {(incomeCourtFilter || incomeClientFilter || incomeGroupFilter) && (
                    <TableRow>
                      <TableCell colSpan={4} className="font-bold text-right">{t("total")}</TableCell>
                      <TableCell className="font-bold text-right">
                        {filteredIncomeReservations.reduce((sum, row) => sum + ((row.cash ?? 0) + (row.card ?? 0) + (row.wallet ?? 0)), 0)}
                      </TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination Controls for Income Table */}
              {!transactionsLoading && filteredIncomeReservations.length > 0 && (
                <div className="flex items-center justify-between px-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {incomeStartIndex + 1} to {Math.min(incomeEndIndex, filteredIncomeReservations.length)} of {filteredIncomeReservations.length} transactions
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIncomeCurrentPage(Math.max(1, incomeCurrentPage - 1))}
                      disabled={incomeCurrentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Page {incomeCurrentPage} of {incomeTotalPages}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIncomeCurrentPage(Math.min(incomeTotalPages, incomeCurrentPage + 1))}
                      disabled={incomeCurrentPage === incomeTotalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="expenses" className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
                <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("filter_by_expense_name")}
                value={expenseNameFilter}
                onChange={(e) => setExpenseNameFilter(e.target.value)}
                className="max-w-xs"
              />
              <Input
                placeholder={t("filter_by_category")}
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="max-w-xs"
              />
                <Input
                  placeholder={t("search_expenses")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              <div className="flex gap-2">
                <Button variant="outline" className="mr-2" onClick={() => setIsCategoryManagerOpen(true)}>
                  {t("manage_categories")}
                </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                      {t("add_expense")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                      <DialogTitle>{t("add_new_expense")}</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                              <FormLabel>{t("title")}</FormLabel>
                            <FormControl>
                                <Input placeholder={t("expense_title_placeholder")} {...field} />
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
                                <FormLabel>{t("amount")}</FormLabel>
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
                              <FormLabel>{t("date")}</FormLabel>
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
                                  <FormLabel>{t("category")}</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <select
                                        className="border rounded px-2 py-1 bg-white dark:bg-gray-800 text-black dark:text-white"
                                      value={field.value || ""}
                                      onChange={field.onChange}
                                    >
                                        <option value="">{t("no_category")}</option>
                                      {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                      ))}
                                    </select>
                                  </FormControl>
                                  <Button type="button" variant="outline" size="sm" onClick={() => setIsCategoryDialogOpen(true)}>
                                      + {t("add_category")}
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
                                  <FormLabel>{t("notes")}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t("optional_notes")} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full">
                          {t("add_expense")}
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
                    <TableHead>{t("title")}</TableHead>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead>{t("notes")}</TableHead>
                    <TableHead className="text-right">{t("amount")}</TableHead>
                    <TableHead>{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expensesLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        {t("loading_expenses")}
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
                          -{Math.round(parseFloat(expense.amount.toString()))}
                        </TableCell>
                        <TableCell>
                          {isAdmin && (
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
                          )}
                          {isAdmin && (
                          <Button size="icon" variant="ghost" onClick={() => { setDeleteExpenseId(expense.id); setDeleteExpenseDialogOpen(true); }}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        {t("no_expenses_found")}
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
                    <h3 className="text-xl font-bold">{`${t("financials_for")}: ${format(singleDay, "PPP")}`}</h3>
                    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                      <StatCard title={t("sales")} value={summaryCardsData.isLoading ? "..." : Math.round(summaryCardsData.totalSales).toString()} icon={DollarSign} description={t("total_sales_for_day")} positive={true} />
                      <StatCard title={t("cash")} value={summaryCardsData.isLoading ? "..." : Math.round(summaryCardsData.totalCash).toString()} icon={DollarSign} description={t("cash_payments")} positive={true} />
                      <StatCard title={t("card")} value={summaryCardsData.isLoading ? "..." : Math.round(summaryCardsData.totalCard).toString()} icon={CreditCard} description={t("card_payments")} positive={true} />
                      <StatCard title={t("wallet")} value={summaryCardsData.isLoading ? "..." : Math.round(summaryCardsData.totalWallet).toString()} icon={DollarSign} description={t("wallet_payments")} positive={true} />
                      <StatCard title={t("expenses")} value={expensesLoading ? "..." : Math.round(totalExpenses).toString()} icon={TrendingDown} description={t("expenses_for_day")} negative={true} />
                      <StatCard title={t("cash_minus_expenses")} value={summaryCardsData.isLoading || expensesLoading ? "..." : Math.round(cashMinusExpenses).toString()} icon={DollarSign} description={t("cash_minus_expenses")} positive={cashMinusExpenses >= 0} negative={cashMinusExpenses < 0} />
                    </div>
                    {/* Court group sales for single day */}
                    <h3 className="text-2xl font-bold mt-8 mb-2">{t("court_sale_summary")}</h3>
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
                                {/* Total row */}
                                <tr className="border-t font-bold">
                                  <td className="p-2">Total</td>
                                  <td className="p-2 text-right text-green-700">{Math.round(group.courts.reduce((sum, court) => sum + court.sales, 0))}</td>
                                </tr>
                              </tbody>
                            </table>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <Card>
                      <CardHeader>
                        <CardTitle>{t("expenses_for_the_day")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <table className="w-full text-sm">
                          <thead>
                            <tr>
                              <th className="text-left p-2">{t("title")}</th>
                              <th className="text-left p-2">{t("category")}</th>
                              <th className="text-left p-2">{t("notes")}</th>
                              <th className="text-right p-2">{t("amount")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {singleDayExpenses.length > 0 ? singleDayExpenses.map(e => (
                              <tr key={e.id} className="border-t">
                                <td className="p-2">{e.title}</td>
                                <td className="p-2">{e.category_name || '-'}</td>
                                <td className="p-2">{e.notes || '-'}</td>
                                <td className="p-2 text-right font-semibold text-red-500">-{Math.round(e.amount)}</td>
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
                        value={summaryCardsData.isLoading || expensesLoading ? "..." : Math.round(summaryCardsData.totalSales).toString()}
                        icon={DollarSign}
                        description="Sum of all sales"
                        positive={true}
                      />
                      <StatCard
                        title="Total Cash"
                        value={summaryCardsData.isLoading || expensesLoading ? "..." : Math.round(summaryCardsData.totalCash).toString()}
                        icon={DollarSign}
                        description="Sum of all cash payments"
                        positive={true}
                      />
                      <StatCard
                        title="Total Card"
                        value={summaryCardsData.isLoading || expensesLoading ? "..." : Math.round(summaryCardsData.totalCard).toString()}
                        icon={CreditCard}
                        description="Sum of all card payments"
                        positive={true}
                      />
                      <StatCard
                        title="Total Wallet"
                        value={summaryCardsData.isLoading || expensesLoading ? "..." : Math.round(summaryCardsData.totalWallet).toString()}
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
                    <h3 className="text-2xl font-bold mt-8 mb-2">{t("court_sale_summary")}</h3>
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
                                {/* Total row */}
                                <tr className="border-t font-bold">
                                  <td className="p-2">Total</td>
                                  <td className="p-2 text-right text-green-700">{Math.round(group.courts.reduce((sum, court) => sum + court.sales, 0))}</td>
                                </tr>
                              </tbody>
                            </table>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    {/* New Expenses Card at the end */}
                    <Card>
                      <CardHeader>
                        <CardTitle>{t("recent_expenses")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <table className="w-full text-sm">
                          <thead>
                            <tr>
                              <th className="text-left p-2">{t("name")}</th>
                              <th className="text-left p-2">{t("category")}</th>
                              <th className="text-left p-2">{t("notes")}</th>
                              <th className="text-right p-2">{t("amount")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredExpenses.slice(0, 7).map(expense => (
                              <tr key={expense.id} className="border-t">
                                <td className="p-2">{expense.title}</td>
                                <td className="p-2">{expense.category_name || '-'}</td>
                                <td className="p-2">{expense.notes || '-'}</td>
                                <td className="p-2 text-right font-semibold text-red-500">
                                  -{Math.round(expense.amount)}
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
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {categories.map((cat, idx) => (
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
                ))}
              </div>
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
                            className="border rounded px-2 py-1 bg-white dark:bg-gray-800 text-black dark:text-white"
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
            <AlertDialogDescription>
              This will permanently delete the expense and cannot be undone.
            </AlertDialogDescription>
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
      <Dialog open={isAddClientDialogOpen} onOpenChange={setIsAddClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Full Name"
              value={newClientName}
              onChange={e => setNewClientName(e.target.value)}
            />
            <Input
              placeholder="Mobile Number"
              value={newClientPhone}
              onChange={e => setNewClientPhone(e.target.value)}
            />
            <Button
              onClick={async () => {
                if (!newClientName.trim() || !newClientPhone.trim()) {
                  toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
                  return;
                }
                setIsAddingClient(true);
                const { data, error } = await supabase
                  .from('clients')
                  .insert({ client_id: crypto.randomUUID(), name: newClientName.trim(), phone: newClientPhone.trim() })
                  .select();
                setIsAddingClient(false);
                if (error) {
                  toast({ title: "Error", description: error.message, variant: "destructive" });
                  return;
                }
                if (data && data[0]) {
                  setSelectedClient(data[0].id);
                  setClientSearch(data[0].name);
                  setShowClientDropdown(false);
                  setIsAddClientDialogOpen(false);
                  setNewClientName("");
                  setNewClientPhone("");
                  toast({ title: "Client added", description: "New client has been added." });
                }
              }}
              className="w-full"
              disabled={isAddingClient}
            >
              {isAddingClient ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add Client
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={editReservationDialogOpen} onOpenChange={setEditReservationDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Reservation</DialogTitle>
            <DialogDescription>
              Edit the reservation details.
            </DialogDescription>
          </DialogHeader>
          {selectedReservation && (
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !reservationDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {reservationDate ? format(reservationDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={reservationDate}
                      onSelect={setReservationDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="court">Court</Label>
                <Select
                  value={selectedCourt}
                  onValueChange={(value) => setSelectedCourt(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select court" />
                  </SelectTrigger>
                  <SelectContent>
                    {courts.map((court) => (
                      <SelectItem key={court.id} value={court.id}>
                        {court.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="time-start">Start Time</Label>
                  <Select
                    value={timeStart}
                    onValueChange={handleTimeStartChange}
                  >
                    <SelectTrigger id="time-start">
                      <SelectValue placeholder="Start time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={`start-${slot.value}`} value={slot.value}>
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="time-end">End Time</Label>
                  <Select
                    value={timeEnd}
                    onValueChange={(value) => setTimeEnd(value)}
                  >
                    <SelectTrigger id="time-end">
                      <SelectValue placeholder="End time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={`end-${slot.value}`} value={slot.value}>
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="client">Client</Label>
                <div className="relative">
                  <Input
                    id="client"
                    ref={clientInputRef}
                    type="text"
                    autoComplete="off"
                    placeholder="Type client name or phone..."
                    value={clientSearch}
                    onChange={e => {
                      setClientSearch(e.target.value);
                      setShowClientDropdown(true);
                      setSelectedClient("");
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    onBlur={() => setTimeout(() => setShowClientDropdown(false), 150)}
                    onKeyDown={handleClientInputKeyDown}
                  />
                  {showClientDropdown && (
                    <div className="absolute z-10 bg-white dark:bg-gray-800 border w-full mt-1 rounded shadow max-h-48 overflow-auto">
                      {clientSearchResults.length > 0 ? (
                        clientSearchResults.map((client, idx) => (
                          <div
                            key={client.id}
                            className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${idx === clientDropdownIndex ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                            onMouseDown={() => {
                              setSelectedClient(client.id);
                              setClientSearch(client.name);
                              setShowClientDropdown(false);
                            }}
                          >
                            {client.name} — {client.phone}
                          </div>
                        ))
                      ) : (
                        <div
                          className="px-3 py-2 text-muted-foreground cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                          onMouseDown={() => setIsAddClientDialogOpen(true)}
                        >
                          No client found. <span className="text-blue-600 underline">Add new?</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="cash">{t("amount_of_cash")}</Label>
                  <Input
                    id="cash"
                    type="number"
                    value={cash}
                    onChange={e => setCash(Number(e.target.value))}
                    min={0}
                  />
                </div>
                <div>
                  <Label htmlFor="card">{t("amount_of_card")}</Label>
                  <Input
                    id="card"
                    type="number"
                    value={card}
                    onChange={e => setCard(Number(e.target.value))}
                    min={0}
                  />
                </div>
                <div>
                  <Label htmlFor="wallet">{t("amount_of_wallet")}</Label>
                  <Input
                    id="wallet"
                    type="number"
                    value={wallet}
                    onChange={e => setWallet(Number(e.target.value))}
                    min={0}
                  />
                </div>
              </div>
              <div className="text-right font-semibold text-lg mt-2">
                Total: £{(Number(cash) || 0) + (Number(card) || 0) + (Number(wallet) || 0)}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditReservationDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (!selectedReservation) return;
              const prevReservations = [...incomeReservations];
              const prevStats = optimisticSingleDayStats;
              // Optimistically update local state
              setIncomeReservations(incomeReservations.map(res =>
                res.id === selectedReservation.id
                  ? {
                      ...res,
                      clients: { ...res.clients, id: selectedClient },
                      courts: { ...res.courts, id: selectedCourt },
                      date: format(reservationDate!, 'yyyy-MM-dd'),
                      time_start: timeStart,
                      time_end: timeEnd,
                      cash,
                      card,
                      wallet,
                    }
                  : res
              ));
              // Optimistically update summary stats if single day is selected
              if (singleDay) {
                const newSales = incomeReservations.reduce((sum, res) => isSameDay(res.date, singleDay) ? sum + (res.cash ?? 0) + (res.card ?? 0) + (res.wallet ?? 0) : sum, 0) - ((selectedReservation.cash ?? 0) + (selectedReservation.card ?? 0) + (selectedReservation.wallet ?? 0)) + (cash + card + wallet);
                const newCash = incomeReservations.reduce((sum, res) => isSameDay(res.date, singleDay) ? sum + (res.cash ?? 0) : sum, 0) - (selectedReservation.cash ?? 0) + cash;
                const newCard = incomeReservations.reduce((sum, res) => isSameDay(res.date, singleDay) ? sum + (res.card ?? 0) : sum, 0) - (selectedReservation.card ?? 0) + card;
                const newWallet = incomeReservations.reduce((sum, res) => isSameDay(res.date, singleDay) ? sum + (res.wallet ?? 0) : sum, 0) - (selectedReservation.wallet ?? 0) + wallet;
                setOptimisticSingleDayStats({
                  sales: newSales,
                  cash: newCash,
                  card: newCard,
                  wallet: newWallet,
                  expenses: displaySingleDayExpenses,
                  net: newCash - displaySingleDayExpenses,
                });
              }
              setEditReservationDialogOpen(false);
              try {
                // Update reservation
                await supabase.from('reservations').update({
              client_id: selectedClient,
              court_id: selectedCourt,
              date: format(reservationDate!, 'yyyy-MM-dd'),
              time_start: timeStart,
              time_end: timeEnd,
              cash,
              card,
              wallet,
                  amount: cash + card + wallet
                }).eq('id', selectedReservation.id);
                // Delete old transactions for this reservation
                await supabase.from('transactions').delete().eq('reservation_id', selectedReservation.id);
                // Insert new transactions for each payment type
                const txInserts = [];
                if (cash > 0) txInserts.push({ reservation_id: selectedReservation.id, amount: cash, payment_method: 'cash', date: format(reservationDate!, 'yyyy-MM-dd') });
                if (card > 0) txInserts.push({ reservation_id: selectedReservation.id, amount: card, payment_method: 'card', date: format(reservationDate!, 'yyyy-MM-dd') });
                if (wallet > 0) txInserts.push({ reservation_id: selectedReservation.id, amount: wallet, payment_method: 'wallet', date: format(reservationDate!, 'yyyy-MM-dd') });
                if (txInserts.length > 0) {
                  await supabase.from('transactions').insert(txInserts);
                }
              } catch (error) {
                // Rollback on error
                setIncomeReservations(prevReservations);
                setOptimisticSingleDayStats(prevStats);
              }
            }}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteReservationDialogOpen} onOpenChange={setDeleteReservationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the reservation and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteReservationDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDeleteReservation}
              disabled={isDeletingReservation}
            >
              {isDeletingReservation ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Confirmation dialog for delete */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the reservation and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={async () => {
              if (!pendingDeleteReservation?.id) return;
              const row = pendingDeleteReservation;
              const prevReservations = [...incomeReservations];
              const prevStats = optimisticSingleDayStats;
              setIncomeReservations(incomeReservations.filter(res => res.id !== row.id));
              if (singleDay && isSameDay(row.date, singleDay)) {
                const newSales = displaySingleDaySales - ((row.cash ?? 0) + (row.card ?? 0) + (row.wallet ?? 0));
                const newCash = displaySingleDayCash - (row.cash ?? 0);
                const newCard = displaySingleDayCard - (row.card ?? 0);
                const newWallet = displaySingleDayWallet - (row.wallet ?? 0);
                setOptimisticSingleDayStats({
                  sales: newSales,
                  cash: newCash,
                  card: newCard,
                  wallet: newWallet,
                  expenses: displaySingleDayExpenses,
                  net: newCash - displaySingleDayExpenses,
                });
              }
              setPendingDeleteReservation(null);
              setShowDeleteDialog(false);
              try {
                await supabase.from('transactions').delete().eq('reservation_id', row.id);
                await supabase.from('reservations').delete().eq('id', row.id);
              } catch (error) {
                setIncomeReservations(prevReservations);
                setOptimisticSingleDayStats(prevStats);
              }
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default FinancialsPage;
