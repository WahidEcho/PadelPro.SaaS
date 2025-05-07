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
  const [amount, setAmount] = useState<number>(40);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "wallet">("cash");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editReservation, setEditReservation] = useState<ReservationWithDetails | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteReservationId, setDeleteReservationId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  const { toast } = useToast();

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
          .select('*');
        
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
      // Date range filter
      if (dateRange?.from && dateRange?.to) {
        const resDate = new Date(res.date);
        // Set time to 0:0:0 for comparison
        const from = new Date(dateRange.from);
        from.setHours(0,0,0,0);
        const to = new Date(dateRange.to);
        to.setHours(23,59,59,999);
        return resDate >= from && resDate <= to;
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

    // Check if reservation date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date && isBefore(date, today)) {
      toast({
        title: "Error",
        description: "Cannot make reservations for past dates",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Insert reservation into Supabase with better error handling
      const { data: reservationData, error: reservationError } = await supabase
        .from('reservations')
        .insert([
          {
            client_id: selectedClient,
            court_id: selectedCourt,
            date: format(date, 'yyyy-MM-dd'),
            time_start: timeStart,
            time_end: timeEnd,
            amount: amount,
            payment_method: paymentMethod
          }
        ])
        .select();
        
      if (reservationError) {
        throw reservationError;
      }
      
      // Also create a transaction for this reservation
      if (reservationData && reservationData.length > 0) {
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert([
            {
              reservation_id: reservationData[0].id,
              amount: amount,
              payment_method: paymentMethod,
              date: format(date, 'yyyy-MM-dd')
            }
          ]);
          
        if (transactionError) {
          console.error('Error creating transaction:', transactionError);
          // Just log the error but don't throw - reservation was already created
        }
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
      setAmount(40);
      setPaymentMethod("cash");
      setOpen(false);
      
      toast({
        title: "Reservation added",
        description: `Reservation has been added successfully`,
      });
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
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
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
        return "bg-green-100 text-green-800";
      case "today":
        return "bg-blue-100 text-blue-800";
      case "future":
        return "bg-purple-100 text-purple-800";
      case "past":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Reservations</h2>
            <p className="text-muted-foreground">
              Manage your padel court reservations here.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Reservation
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
                        disabled={(date) => {
                          // Disable dates in the past
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return isBefore(date, today);
                        }}
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
                        {timeSlots.map((time) => (
                          <SelectItem key={`start-${time}`} value={time}>
                            {time}
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
                        {timeSlots.map((time) => (
                          <SelectItem key={`end-${time}`} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="client">Client</Label>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payment-method">Payment Method</Label>
                    <Select 
                      value={paymentMethod} 
                      onValueChange={(value) => setPaymentMethod(value as "cash" | "card" | "wallet")}
                    >
                      <SelectTrigger id="payment-method">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="wallet">Wallet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={handleAddReservation} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Add Reservation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Reservations</CardTitle>
            <CardDescription>View and manage all your court reservations.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search reservations..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[220px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from
                        ? dateRange.to
                          ? `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
                          : format(dateRange.from, "MMM d, yyyy")
                        : "Pick a date"}
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
                <Tabs 
                  value={selectedTab} 
                  onValueChange={setSelectedTab}
                  className="hidden md:flex"
                >
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="today">Today</TabsTrigger>
                    <TabsTrigger value="future">Upcoming</TabsTrigger>
                    <TabsTrigger value="past">Past</TabsTrigger>
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
                          <th className="p-4 text-left font-medium">Client</th>
                          <th className="p-4 text-left font-medium">Court</th>
                          <th className="p-4 text-left font-medium">Date</th>
                          <th className="p-4 text-left font-medium">Time</th>
                          <th className="p-4 text-left font-medium">Amount</th>
                          <th className="p-4 text-left font-medium">Payment</th>
                          <th className="p-4 text-left font-medium">Status</th>
                          <th className="p-4 text-left font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        {filteredReservations.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-4 text-center text-muted-foreground">
                              No reservations found.
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
                                <td className="p-4">{res.client_name}</td>
                                <td className="p-4">{res.court_name}</td>
                                <td className="p-4">
                                  {format(new Date(res.date), "MMM d, yyyy")}
                                </td>
                                <td className="p-4">
                                  {res.time_start} - {res.time_end}
                                </td>
                                <td className="p-4">${res.amount}</td>
                                <td className="p-4 capitalize">{res.payment_method}</td>
                                <td className="p-4">
                                  <span className={`${statusColor} text-xs font-medium px-2 py-1 rounded-full`}>
                                    {status === "now" 
                                      ? "Running Now" 
                                      : status === "today"
                                      ? "Today"
                                      : status === "future"
                                      ? "Upcoming"
                                      : "Past"}
                                  </span>
                                </td>
                                <td className="p-4 flex gap-2">
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
                                    setAmount(res.amount);
                                    setPaymentMethod(res.payment_method as "cash" | "card" | "wallet");
                                    setEditDialogOpen(true);
                                  }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => { setDeleteReservationId(res.id); setDeleteDialogOpen(true); }}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
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
            <DialogTitle>Edit Reservation</DialogTitle>
            <DialogDescription>Edit the details of this reservation.</DialogDescription>
          </DialogHeader>
          {editReservation && (
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="edit-date">Date</Label>
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
                <Label htmlFor="edit-court">Court</Label>
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
                  <Label htmlFor="edit-time-start">Start Time</Label>
                  <Select
                    value={timeStart}
                    onValueChange={handleTimeStartChange}
                  >
                    <SelectTrigger id="edit-time-start">
                      <SelectValue placeholder="Start time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={`edit-start-${time}`} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-time-end">End Time</Label>
                  <Select
                    value={timeEnd}
                    onValueChange={(value) => setTimeEnd(value)}
                  >
                    <SelectTrigger id="edit-time-end">
                      <SelectValue placeholder="End time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={`edit-end-${time}`} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-client">Client</Label>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-amount">Amount ($)</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-payment-method">Payment Method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(value) => setPaymentMethod(value as "cash" | "card" | "wallet")}
                  >
                    <SelectTrigger id="edit-payment-method">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="wallet">Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (!editReservation) return;
              setIsSubmitting(true);
              try {
                // Update reservation in Supabase
                const { error: reservationError } = await supabase.from('reservations').update({
                  client_id: selectedClient,
                  court_id: selectedCourt,
                  date: format(date!, 'yyyy-MM-dd'),
                  time_start: timeStart,
                  time_end: timeEnd,
                  amount: amount,
                  payment_method: paymentMethod
                }).eq('id', editReservation.id);

                if (reservationError) throw reservationError;

                // Update related transaction in Supabase
                const { error: transactionError } = await supabase.from('transactions').update({
                  amount: amount,
                  payment_method: paymentMethod,
                  date: format(date!, 'yyyy-MM-dd')
                }).eq('reservation_id', editReservation.id);

                if (transactionError) throw transactionError;

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

                toast({
                  title: "Reservation updated",
                  description: `Reservation has been updated successfully.`,
                });
                setEditDialogOpen(false);
                setEditReservation(null);
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
              Save Changes
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
