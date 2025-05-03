
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourtsScheduleView } from "@/components/courts/CourtsScheduleView";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ReservationWithDetails, CourtsWithGroup } from "@/types/supabase";
import { Loader2 } from "lucide-react";

const CourtsPage = () => {
  const [courts, setCourts] = useState<CourtsWithGroup[]>([]);
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch courts with their group names
        const { data: courtsData, error: courtsError } = await supabase
          .from('courts')
          .select(`
            *,
            court_groups!inner (
              name
            )
          `);

        if (courtsError) {
          throw courtsError;
        }

        // Format courts data with group names
        const courtsWithGroupNames = courtsData.map((court: any) => ({
          ...court,
          group_name: court.court_groups.name
        }));

        setCourts(courtsWithGroupNames);

        // Fetch reservations for the current week
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        
        const endOfWeek = new Date(today);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        const { data: reservationsData, error: reservationsError } = await supabase
          .from('reservations')
          .select(`
            *,
            clients!inner (name),
            courts!inner (name)
          `)
          .gte('date', startOfWeek.toISOString().split('T')[0])
          .lte('date', endOfWeek.toISOString().split('T')[0]);

        if (reservationsError) {
          throw reservationsError;
        }

        // Format reservations data with client and court names
        const reservationsWithDetails = reservationsData.map((res: any) => ({
          ...res,
          client_name: res.clients.name,
          court_name: res.courts.name
        }));

        setReservations(reservationsWithDetails);

      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to fetch court data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Courts</h2>
          <p className="text-muted-foreground">
            Manage your padel courts and view schedules
          </p>
        </div>

        <Tabs defaultValue="schedule">
          <TabsList>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="courts">Courts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="schedule" className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-padel-primary" />
              </div>
            ) : (
              <CourtsScheduleView 
                courts={courts} 
                reservations={reservations}
              />
            )}
          </TabsContent>
          
          <TabsContent value="courts" className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-padel-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courts.map((court) => (
                  <Card key={court.id}>
                    <CardHeader>
                      <CardTitle>{court.name}</CardTitle>
                      <CardDescription>Group: {court.group_name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Court ID: {court.id.substring(0, 8)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CourtsPage;
