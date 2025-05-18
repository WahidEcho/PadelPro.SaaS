import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, addHours, isBefore, parseISO } from "date-fns";
import { CalendarIcon, Plus, Search, Loader2, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { Court, Client, Reservation, ReservationWithDetails } from "@/types/supabase";
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
import { DateRange } from "react-day-picker";
import { useTransactionsData } from "@/hooks/use-transactions-data";
import { useExpensesData } from "@/hooks/use-expenses-data";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/contexts/language-context";

const ReservationsPage = () => {
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedCourt, setSelectedCourt] = useState<string>("");
  const [timeStart, setTimeStart] = useState<string>("09:00");
  const [timeEnd, setTimeEnd] = useState<string>("10:00");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [cash, setCash] = useState<number>(0);
  const [card, setCard] = useState<number>(0);
  const [wallet, setWallet] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editReservation, setEditReservation] = useState<ReservationWithDetails | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteReservationId, setDeleteReservationId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [singleDay, setSingleDay] = useState<Date | undefined>(undefined);
  const [pickerMode, setPickerMode] = useState<'single' | 'range'>('range');
  const [creatorFilter, setCreatorFilter] = useState<string>("all");
  
  const { toast } = useToast();
  const { fetchTransactions } = useTransactionsData();
  const { fetchExpenses } = useExpensesData();
  const { isAdmin, isEmployee, user } = useAuth();
  const { t, language } = useLanguage();

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch courts
        const { data: courtsData, error: courtsError } = await supabase
          .from('courts')
          .select('*');
        
        if (courtsError) {
          throw courtsError;
        }

        setCourts(courtsData);

        // Fetch clients with better error handling
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('*')
          .eq('is_deleted', false);
        
        if (clientsError) {
          console.error('Error fetching clients:', clientsError);
          toast({
            title: "Error",
            description: "Failed to fetch client data",
            variant: "destructive",
          });
          // Continue with empty clients array rather than throwing
          setClients([]);
        } else {
          setClients(clientsData || []);
        }

        // Fetch reservations with better error handling
        const { data: reservationsData, error: reservationsError } = await supabase
          .from('reservations')
          .select(`
            *,
            clients!inner (name),
            courts!inner (name)
          `)
          .order('date', { ascending: false });
        
        if (reservationsError) {
          console.error('Error fetching reservations:', reservationsError);
          toast({
            title: "Error",
            description: "Failed to fetch reservation data",
            variant: "destructive",
          });
          // Continue with empty reservations array
          setReservations([]);
        } else {
          // Format reservations data with client and court names
          const reservationsWithDetails = reservationsData.map((res: any) => ({
            ...res,
            client_name: res.clients?.name || 'Unknown',
            court_name: res.courts?.name || 'Unknown'
          }));

          setReservations(reservationsWithDetails);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to fetch reservation data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update end time when start time changes (add 1 hour)
  const handleTimeStartChange = (value: string) => {
    setTimeStart(value);
    
    // Parse the start time
    const [hours, minutes] = value.split(':').map(Number);
    
    // Add 1 hour
    const endHours = hours + 1;
    
    // Format the end time
    const formattedEndHours = endHours.toString().padStart(2, '0');
    const formattedEndMinutes = minutes.toString().padStart(2, '0');
    const newEndTime = `${formattedEndHours}:${formattedEndMinutes}`;
    
    setTimeEnd(newEndTime);
  };

  const uniqueCreators = [
    "Admin",
    ...Array.from(
      new Set(
        reservations
          .filter(r => r.created_by_role === "employee" && r.employee_name)
          .map(r => r.employee_name)
      )
    ),
  ];

  // Filter reservations based on search term and tab
  const filteredReservations = reservations
    .filter((res) => {
      if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        return (
          res.client_name?.toLowerCase().includes(lowerSearchTerm) ||
          res.court_name?.toLowerCase().includes(lowerSearchTerm)
        );
      }
      return true;
    })
    .filter((res) => {
      // Admin filter by creator
      if (isAdmin && creatorFilter !== "all") {
        if (creatorFilter === "Admin") return res.created_by_role === "admin";
        return res.created_by_role === "employee" && res.employee_name === creatorFilter;
      }
      return true;
    })
    .filter((res) => {
      // Date filter
      if (pickerMode === 'range' && dateRange?.from && dateRange?.to) {
        const resDate = new Date(res.date);
        const from = new Date(dateRange.from);
        from.setHours(0,0,0,0);
        const to = new Date(dateRange.to);
        to.setHours(23,59,59,999);
        return resDate >= from && resDate <= to;
      } else if (pickerMode === 'single' && singleDay) {
        const resDate = new Date(res.date);
        return (
          resDate.getFullYear() === singleDay.getFullYear() &&
          resDate.getMonth() === singleDay.getMonth() &&
          resDate.getDate() === singleDay.getDate()
        );
      }
      return true;
    })
    .filter((res) => {
      const today = new Date().toISOString().split("T")[0];
      
      if (selectedTab === "today") {
        return res.date === today;
      } else if (selectedTab === "future") {
        return res.date > today;
      } else if (selectedTab === "past") {
        return res.date < today;
      }
      
      return true;
    });

  const handleAddReservation = async () => {
    if (!selectedCourt || !selectedClient || !date) {
      toast({
        title: "Error",
        description: "Please fill all the required fields",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Insert reservation into Supabase with better error handling
      const totalAmount = cash + card + wallet;
      const reservationPayload = {
        client_id: selectedClient,
        court_id: selectedCourt,
        date: format(date, 'yyyy-MM-dd'),
        time_start: timeStart,
        time_end: timeEnd,
        cash,
        card,
        wallet,
        amount: totalAmount,
        created_by_role: isAdmin ? "admin" : "employee",
        employee_name: isEmployee && !isAdmin && user ? user.user_metadata?.full_name || user.email : null,
      };
      const { data: reservationData, error: reservationError } = await supabase
        .from('reservations')
        .insert([reservationPayload], { defaultToNull: true })
        .select();
        
      if (reservationError) {
        throw reservationError;
      }
      
      // Also create a transaction for this reservation
      const txInserts = [];
      if (cash > 0) txInserts.push({ reservation_id: reservationData[0].id, amount: cash, payment_method: 'cash', date: format(date, 'yyyy-MM-dd') });
      if (card > 0) txInserts.push({ reservation_id: reservationData[0].id, amount: card, payment_method: 'card', date: format(date, 'yyyy-MM-dd') });
      if (wallet > 0) txInserts.push({ reservation_id: reservationData[0].id, amount: wallet, payment_method: 'wallet', date: format(date, 'yyyy-MM-dd') });
      if (txInserts.length > 0) {
        await supabase.from('transactions').insert(txInserts);
      }
      
      // Find client and court for display names
      const client = clients.find((c) => c.id === selectedClient);
      const court = courts.find((c) => c.id === selectedCourt);
      
      // Add new reservation to state
      if (reservationData && reservationData.length > 0) {
        const newReservation: ReservationWithDetails = {
          ...reservationData[0],
          client_name: client?.name || 'Unknown',
          court_name: court?.name || 'Unknown'
        };
        
        setReservations([newReservation, ...reservations]);
      }
      
      // Reset form
      setSelectedCourt("");
      setSelectedClient("");
      setDate(new Date());
      setTimeStart("09:00");
      setTimeEnd("10:00");
      setCash(0);
      setCard(0);
      setWallet(0);
      setOpen(false);
      
      toast({
        title: "Reservation added",
        description: `Reservation has been added successfully`,
      });

      // After updating reservation and transactions, also call fetchExpenses
      fetchTransactions();
      fetchExpenses();
    } catch (error: any) {
      console.error('Error adding reservation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add reservation",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // Get reservation status
  const getReservationStatus = (reservation: Reservation) => {
    const today = new Date().toISOString().split("T")[0];
    
    if (reservation.date < today) {
      return "past";
    } else if (reservation.date > today) {
      return "future";
    } else {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      
      if (currentTime >= reservation.time_start && currentTime <= reservation.time_end) {
        return "now";
      } else {
        return "today";
      }
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "now":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "today":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "future":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "past":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  // Helper to format time to 12-hour with AM/PM
  function formatTime12H(timeStr: string | undefined) {
    if (!timeStr) return '';
    const [hourStr, minute] = timeStr.split(":");
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour.toString().padStart(2, '0')}:${minute} ${ampm}`;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{t("reservations")}</h2>
            <p className="text-muted-foreground">
              {t("manage_padel_reservations")}
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("new_reservation")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t("add_reservation")}</DialogTitle>
                <DialogDescription>
                  {t("create_new_reservation")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="date">{t("date")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>{t("pick_a_date")}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="court">{t("court")}</Label>
                  <Select 
                    value={selectedCourt} 
                    onValueChange={(value) => setSelectedCourt(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("select_court")} />
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
                    <Label htmlFor="time-start">{t("start_time")}</Label>
                    <Select 
                      value={timeStart} 
                      onValueChange={handleTimeStartChange}
                    >
                      <SelectTrigger id="time-start">
                        <SelectValue placeholder={t("start_time")} />
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
                    <Label htmlFor="time-end">{t("end_time")}</Label>
                    <Select 
                      value={timeEnd} 
                      onValueChange={(value) => setTimeEnd(value)}
                    >
                      <SelectTrigger id="time-end">
                        <SelectValue placeholder={t("end_time")} />
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
                  <Label htmlFor="client">{t("client")}</Label>
                  <Select 
                    value={selectedClient} 
                    onValueChange={(value) => setSelectedClient(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("select_client")} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}{client.phone ? ` (${client.phone})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  {t("total")}: £{(Number(cash) || 0) + (Number(card) || 0) + (Number(wallet) || 0)}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                  {t("cancel")}
                </Button>
                <Button onClick={handleAddReservation} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {t("add_reservation")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("reservations")}</CardTitle>
            <CardDescription>{t("manage_padel_reservations")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("search_reservations_placeholder")}
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {isAdmin && (
                  <Select value={creatorFilter} onValueChange={setCreatorFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t("all")}/>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      {uniqueCreators
                        .filter(name => name !== "Admin")
                        .map(name => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="flex gap-2 items-center">
                  <Button
                    variant={pickerMode === 'single' ? 'default' : 'outline'}
                    onClick={() => { setPickerMode('single'); setDateRange(undefined); }}
                    size="sm"
                  >
                    {t("single_day")}
                  </Button>
                  <Button
                    variant={pickerMode === 'range' ? 'default' : 'outline'}
                    onClick={() => { setPickerMode('range'); setSingleDay(undefined); }}
                    size="sm"
                  >
                    {t("date_range")}
                  </Button>
                </div>
                {pickerMode === 'range' ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[220px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from
                          ? dateRange.to
                            ? `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
                            : format(dateRange.from, "MMM d, yyyy")
                          : t("pick_a_date_range")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                      />
                      {dateRange?.from || dateRange?.to ? (
                        <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setDateRange(undefined)}>
                          Clear
                        </Button>
                      ) : null}
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {singleDay ? format(singleDay, "PPP") : "Pick a day"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={singleDay}
                        onSelect={setSingleDay}
                      />
                      {singleDay ? (
                        <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setSingleDay(undefined)}>
                          Clear
                        </Button>
                      ) : null}
                    </PopoverContent>
                  </Popover>
                )}
                <Tabs 
                  value={selectedTab} 
                  onValueChange={setSelectedTab}
                  className="hidden md:flex"
                >
                  <TabsList>
                    <TabsTrigger value="all">{t("all")}</TabsTrigger>
                    <TabsTrigger value="today">{t("today")}</TabsTrigger>
                    <TabsTrigger value="future">{t("upcoming")}</TabsTrigger>
                    <TabsTrigger value="past">{t("past")}</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-padel-primary" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <div className="w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          {isAdmin && <th className={`p-4 font-medium ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t("sales_admin")}</th>}
                          <th className={`p-4 font-medium ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t("client")}</th>
                          <th className={`p-4 font-medium ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t("court")}</th>
                          <th className={`p-4 font-medium ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t("date")}</th>
                          <th className={`p-4 font-medium ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t("time")}</th>
                          <th className={`p-4 font-medium ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t("amount")} (£)</th>
                          <th className={`p-4 font-medium ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t("cash")} (£)</th>
                          <th className={`p-4 font-medium ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t("card")} (£)</th>
                          <th className={`p-4 font-medium ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t("wallet")} (£)</th>
                          <th className={`p-4 font-medium ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t("status")}</th>
                          <th className={`p-4 font-medium ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t("actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        {filteredReservations.length === 0 ? (
                          <tr>
                            <td colSpan={isAdmin ? 11 : 10} className={`p-4 text-center text-muted-foreground ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                              {t("no_reservations_found")}
                            </td>
                          </tr>
                        ) : (
                          filteredReservations.map((res) => {
                            const status = getReservationStatus(res);
                            const statusColor = getStatusColor(status);
                            
                            return (
                              <tr 
                                key={res.id} 
                                className="border-b transition-colors hover:bg-muted/50"
                              >
                                {isAdmin && (
                                  <td className={`p-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                                    {res.created_by_role === "admin"
                                      ? "Admin"
                                      : res.employee_name || "-"}
                                  </td>
                                )}
                                <td className={`p-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>{res.client_name}</td>
                                <td className={`p-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>{res.court_name}</td>
                                <td className={`p-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                                  {format(new Date(res.date), "MMM d, yyyy")}
                                </td>
                                <td className={`p-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                                  {formatTime12H(res.time_start)} - {formatTime12H(res.time_end)}
                                </td>
                                <td className={`p-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>£{(res.cash ?? 0) + (res.card ?? 0) + (res.wallet ?? 0)}</td>
                                <td className={`p-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>£{res.cash ?? 0}</td>
                                <td className={`p-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>£{res.card ?? 0}</td>
                                <td className={`p-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>£{res.wallet ?? 0}</td>
                                <td className={`p-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                                  <span className={`${statusColor} text-xs font-medium px-2 py-1 rounded-full`}>
                                    {status === "now"
                                      ? t("running_now")
                                      : status === "today"
                                      ? t("today")
                                      : status === "future"
                                      ? t("upcoming")
                                      : t("past")}
                                  </span>
                                </td>
                                <td className={`p-4 flex gap-2 ${language === 'ar' ? 'justify-end' : ''}`}>
                                  {isAdmin && (
                                    <Button size="icon" variant="ghost" onClick={() => {
                                      function padTime(t) {
                                        if (!t) return '';
                                        const [h, m] = t.split(":");
                                        return h.padStart(2, "0") + ":" + m.padStart(2, "0");
                                      }
                                      setEditReservation(res);
                                      setDate(new Date(res.date));
                                      setSelectedCourt(res.court_id);
                                      setTimeStart(padTime(res.time_start));
                                      setTimeEnd(padTime(res.time_end));
                                      setSelectedClient(res.client_id);
                                      setCash(res.cash || 0);
                                      setCard(res.card || 0);
                                      setWallet(res.wallet || 0);
                                      setEditDialogOpen(true);
                                    }}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {isAdmin && (
                                    <Button size="icon" variant="ghost" onClick={() => { setDeleteReservationId(res.id); setDeleteDialogOpen(true); }}>
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Reservation Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("edit_reservation")}</DialogTitle>
            <DialogDescription>{t("edit_reservation_details")}</DialogDescription>
          </DialogHeader>
          {editReservation && (
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="edit-date">{t("date")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="edit-court">{t("court")}</Label>
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
                  <Label htmlFor="edit-time-start">{t("start_time")}</Label>
                  <Select
                    value={timeStart}
                    onValueChange={handleTimeStartChange}
                  >
                    <SelectTrigger id="edit-time-start">
                      <SelectValue placeholder="Start time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={`edit-start-${slot.value}`} value={slot.value}>
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-time-end">{t("end_time")}</Label>
                  <Select
                    value={timeEnd}
                    onValueChange={(value) => setTimeEnd(value)}
                  >
                    <SelectTrigger id="edit-time-end">
                      <SelectValue placeholder="End time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={`edit-end-${slot.value}`} value={slot.value}>
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-client">{t("client")}</Label>
                <Select
                  value={selectedClient}
                  onValueChange={(value) => setSelectedClient(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}{client.phone ? ` (${client.phone})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-cash">{t("amount_of_cash")}</Label>
                  <Input
                    id="edit-cash"
                    type="number"
                    value={cash}
                    onChange={e => setCash(Number(e.target.value))}
                    min={0}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-card">{t("amount_of_card")}</Label>
                  <Input
                    id="edit-card"
                    type="number"
                    value={card}
                    onChange={e => setCard(Number(e.target.value))}
                    min={0}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-wallet">{t("amount_of_wallet")}</Label>
                  <Input
                    id="edit-wallet"
                    type="number"
                    value={wallet}
                    onChange={e => setWallet(Number(e.target.value))}
                    min={0}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={async () => {
              if (!editReservation) return;
              setIsSubmitting(true);
              try {
                // Update reservation in Supabase
                await supabase.from('reservations').update({
                  client_id: selectedClient,
                  court_id: selectedCourt,
                  date: format(date!, 'yyyy-MM-dd'),
                  time_start: timeStart,
                  time_end: timeEnd,
                  cash,
                  card,
                  wallet,
                  amount: cash + card + wallet
                }).eq('id', editReservation.id);

                // Delete old transactions for this reservation
                await supabase.from('transactions').delete().eq('reservation_id', editReservation.id);

                // Insert new transactions for each payment type
                const txInserts = [];
                if (cash > 0) txInserts.push({ reservation_id: editReservation.id, amount: cash, payment_method: 'cash', date: format(date!, 'yyyy-MM-dd') });
                if (card > 0) txInserts.push({ reservation_id: editReservation.id, amount: card, payment_method: 'card', date: format(date!, 'yyyy-MM-dd') });
                if (wallet > 0) txInserts.push({ reservation_id: editReservation.id, amount: wallet, payment_method: 'wallet', date: format(date!, 'yyyy-MM-dd') });
                if (txInserts.length > 0) {
                  await supabase.from('transactions').insert(txInserts);
                }

                // Refetch reservations from Supabase
                const { data: reservationsData, error: reservationsError } = await supabase
                  .from('reservations')
                  .select(`*, clients!inner (name), courts!inner (name)`)
                  .order('date', { ascending: false });
                if (reservationsError) throw reservationsError;
                const reservationsWithDetails = reservationsData.map((res: any) => ({
                  ...res,
                  client_name: res.clients?.name || 'Unknown',
                  court_name: res.courts?.name || 'Unknown'
                }));
                setReservations(reservationsWithDetails);

                // Refetch transactions for Financials page
                fetchTransactions();

                toast({
                  title: "Reservation updated",
                  description: `Reservation has been updated successfully.`,
                });
                setEditDialogOpen(false);
                setEditReservation(null);

                // After updating reservation and transactions, also call fetchExpenses
                fetchExpenses();
              } catch (error: any) {
                toast({
                  title: "Error",
                  description: error.message || "Failed to update reservation",
                  variant: "destructive",
                });
              } finally {
                setIsSubmitting(false);
              }
            }} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t("save_changes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Reservation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the reservation and cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={async () => {
              if (!deleteReservationId) return;
              const { error: txError } = await supabase
                .from('transactions')
                .delete()
                .eq('reservation_id', deleteReservationId);

              if (txError) {
                toast({
                  title: "Error",
                  description: txError.message || "Failed to delete related transactions",
                  variant: "destructive",
                });
                return;
              }

              const { error } = await supabase
                .from('reservations')
                .delete()
                .eq('id', deleteReservationId);

              if (error) {
                toast({
                  title: "Error",
                  description: error.message || "Failed to delete reservation",
                  variant: "destructive",
                });
                return;
              }

              setReservations(reservations.filter(r => r.id !== deleteReservationId));
              setDeleteDialogOpen(false);
              setDeleteReservationId(null);

              // After deleting reservation, also call fetchExpenses
              fetchExpenses();
            }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default ReservationsPage;
