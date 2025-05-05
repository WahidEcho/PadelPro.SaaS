
import { useState, useMemo, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { ReservationWithDetails, Court } from '@/types/supabase';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TimeSlot {
  hour: number;
  minutes: number;
  label: string;
}

interface CourtsScheduleViewProps {
  courts: Court[];
  reservations?: ReservationWithDetails[];
}

export function CourtsScheduleView({ courts }: CourtsScheduleViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Generate time slots for 24 hours
  const timeSlots: TimeSlot[] = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push({
        hour,
        minutes: 0,
        label: `${hour.toString().padStart(2, '0')}:00`
      });
      slots.push({
        hour,
        minutes: 30,
        label: `${hour.toString().padStart(2, '0')}:30`
      });
    }
    return slots;
  }, []);

  // Fetch reservations for the selected date
  useEffect(() => {
    const fetchReservationsForDate = async () => {
      setIsLoading(true);
      try {
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        
        const { data, error } = await supabase
          .from('reservations')
          .select(`
            *,
            clients(name),
            courts(name)
          `)
          .eq('date', dateString);
          
        if (error) throw error;
        
        // Format reservations with client and court names
        const formattedReservations = data.map((res: any) => ({
          ...res,
          client_name: res.clients?.name || 'Unknown',
          court_name: res.courts?.name || 'Unknown'
        }));
        
        setReservations(formattedReservations);
      } catch (error) {
        console.error('Error fetching reservations:', error);
        toast({
          title: "Error",
          description: "Failed to fetch reservation data for schedule",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (courts.length > 0) {
      fetchReservationsForDate();
    }
  }, [selectedDate, courts, toast]);

  // Navigate to previous day
  const goToPreviousDay = () => {
    setSelectedDate(prevDate => addDays(prevDate, -1));
  };

  // Navigate to next day
  const goToNextDay = () => {
    setSelectedDate(prevDate => addDays(prevDate, 1));
  };

  // Check if time slot is reserved for a court
  const isReserved = (courtId: string, timeSlot: TimeSlot) => {
    return reservations.find(res => {
      const timeStart = res.time_start.split(':');
      const timeEnd = res.time_end.split(':');
      
      const startHour = parseInt(timeStart[0], 10);
      const startMinutes = parseInt(timeStart[1], 10);
      const endHour = parseInt(timeEnd[0], 10);
      const endMinutes = parseInt(timeEnd[1], 10);
      
      // Convert time to minutes for easier comparison
      const slotTime = timeSlot.hour * 60 + timeSlot.minutes;
      const resStartTime = startHour * 60 + startMinutes;
      const resEndTime = endHour * 60 + endMinutes;
      
      return res.court_id === courtId && slotTime >= resStartTime && slotTime < resEndTime;
    });
  };

  // Get reservation details for a specific court and time slot
  const getReservationDetails = (courtId: string, timeSlot: TimeSlot) => {
    const reservation = reservations.find(res => {
      const timeStart = res.time_start.split(':');
      const timeEnd = res.time_end.split(':');
      
      const startHour = parseInt(timeStart[0], 10);
      const startMinutes = parseInt(timeStart[1], 10);
      const endHour = parseInt(timeEnd[0], 10);
      const endMinutes = parseInt(timeEnd[1], 10);
      
      // Convert time to minutes for easier comparison
      const slotTime = timeSlot.hour * 60 + timeSlot.minutes;
      const resStartTime = startHour * 60 + startMinutes;
      const resEndTime = endHour * 60 + endMinutes;
      
      return res.court_id === courtId && slotTime >= resStartTime && slotTime < resEndTime;
    });
    
    return reservation;
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Court Schedule</CardTitle>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="min-w-[140px]"
                onClick={() => setIsCalendarOpen(true)}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, 'MMM dd, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date || new Date());
                  setIsCalendarOpen(false);
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          
          <Button variant="outline" size="icon" onClick={goToNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[100px,1fr] gap-1">
                {/* Time column */}
                <div className="col-span-1">
                  <div className="h-10 border-b flex items-center font-semibold">Time</div>
                  {timeSlots.map((slot, i) => (
                    <div 
                      key={`time-${i}`} 
                      className={`h-8 flex items-center text-xs ${i % 2 === 0 ? 'font-medium' : 'text-muted-foreground'}`}
                    >
                      {slot.label}
                    </div>
                  ))}
                </div>
                
                {/* Courts columns */}
                <div className="col-span-1 grid" style={{ gridTemplateColumns: `repeat(${courts.length || 1}, 1fr)` }}>
                  {/* Court headers */}
                  {courts.length === 0 ? (
                    <div className="h-10 border-b flex items-center justify-center font-semibold text-sm">
                      No courts available
                    </div>
                  ) : (
                    courts.map(court => (
                      <div 
                        key={`court-${court.id}`} 
                        className="h-10 border-b flex items-center justify-center font-semibold text-sm"
                      >
                        {court.name}
                      </div>
                    ))
                  )}
                  
                  {/* Time slots grid */}
                  {courts.length > 0 && timeSlots.map((slot, slotIndex) => (
                    <>
                      {courts.map(court => {
                        const reservation = getReservationDetails(court.id, slot);
                        const reserved = !!reservation;
                        
                        return (
                          <div 
                            key={`slot-${court.id}-${slotIndex}`}
                            className={cn(
                              "h-8 border-b border-dashed flex items-center justify-center text-xs",
                              {
                                "bg-padel-primary/10 text-padel-primary font-medium": reserved,
                                "hover:bg-muted/50": !reserved,
                                "border-b-muted": slotIndex % 2 === 0
                              }
                            )}
                            title={reservation ? `${reservation.client_name || ''} (${reservation.time_start} - ${reservation.time_end})` : undefined}
                          >
                            {reserved && (
                              <span className="truncate max-w-full px-1">
                                {reservation?.client_name || "Reserved"}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
