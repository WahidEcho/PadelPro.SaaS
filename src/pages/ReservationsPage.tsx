
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { mockReservations, mockClients, mockCourts } from "@/lib/mock-data";
import { Reservation, Client, Court } from "@/types";
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
import { format } from "date-fns";
import { CalendarIcon, Plus, Search } from "lucide-react";
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

const ReservationsPage = () => {
  const [reservations, setReservations] = useState<Reservation[]>(mockReservations);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedCourt, setSelectedCourt] = useState<string>("");
  const [timeStart, setTimeStart] = useState<string>("09:00");
  const [timeEnd, setTimeEnd] = useState<string>("10:00");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [amount, setAmount] = useState<number>(40);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState<string>("all");
  
  const { toast } = useToast();

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

  const handleAddReservation = () => {
    if (!selectedCourt || !selectedClient || !date) {
      toast({
        title: "Error",
        description: "Please fill all the required fields",
        variant: "destructive",
      });
      return;
    }

    // Find client and court for display names
    const client = mockClients.find((c) => c.id === selectedClient);
    const court = mockCourts.find((c) => c.id === selectedCourt);
    
    const newReservation: Reservation = {
      id: (reservations.length + 1).toString(),
      client_id: selectedClient,
      court_id: selectedCourt,
      date: format(date, "yyyy-MM-dd"),
      time_start: timeStart,
      time_end: timeEnd,
      amount: amount,
      payment_method: paymentMethod,
      created_at: new Date().toISOString(),
      client_name: client?.name,
      court_name: court?.name,
    };
    
    setReservations([...reservations, newReservation]);
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
  };

  // Generate time slots for selection (e.g., 9:00 AM to 9:00 PM in 30-minute intervals)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 21; hour++) {
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
                      {mockCourts.map((court) => (
                        <SelectItem key={court.id} value={court.id}>
                          {court.name} ({court.group})
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
                      onValueChange={(value) => setTimeStart(value)}
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
                      {mockClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} ({client.client_id})
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
                      onValueChange={(value) => setPaymentMethod(value as "cash" | "card")}
                    >
                      <SelectTrigger id="payment-method">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddReservation}>
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
              <div className="flex items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search reservations..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
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
                        <th className="p-4 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {filteredReservations.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-muted-foreground">
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
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ReservationsPage;
