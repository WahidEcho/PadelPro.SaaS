
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourtsScheduleView } from "@/components/courts/CourtsScheduleView";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ReservationWithDetails, CourtsWithGroup } from "@/types/supabase";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const CourtsPage = () => {
  const [courts, setCourts] = useState<CourtsWithGroup[]>([]);
  const [courtGroups, setCourtGroups] = useState<any[]>([]);
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courtDialogOpen, setCourtDialogOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<CourtsWithGroup | null>(null);
  const [courtName, setCourtName] = useState('');
  const [courtGroupId, setCourtGroupId] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch court groups first
        const { data: groupsData, error: groupsError } = await supabase
          .from('court_groups')
          .select('*');

        if (groupsError) {
          throw groupsError;
        }

        setCourtGroups(groupsData || []);
        
        // Fetch courts with their group names
        const { data: courtsData, error: courtsError } = await supabase
          .from('courts')
          .select(`
            *,
            court_groups(
              name
            )
          `);

        if (courtsError) {
          throw courtsError;
        }

        // Format courts data with group names
        const courtsWithGroupNames = courtsData.map((court: any) => ({
          ...court,
          group_name: court.court_groups?.name || 'No Group'
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
            clients(name),
            courts(name)
          `)
          .gte('date', startOfWeek.toISOString().split('T')[0])
          .lte('date', endOfWeek.toISOString().split('T')[0]);

        if (reservationsError) {
          throw reservationsError;
        }

        // Format reservations data with client and court names
        const reservationsWithDetails = reservationsData.map((res: any) => ({
          ...res,
          client_name: res.clients?.name || 'Unknown Client',
          court_name: res.courts?.name || 'Unknown Court'
        }));

        setReservations(reservationsWithDetails);

      } catch (error) {
        console.error('Error fetching court data:', error);
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

  const handleAddCourt = async () => {
    if (!courtName) {
      toast({
        title: "Error",
        description: "Court name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const courtData = {
        name: courtName,
        group_id: courtGroupId || null
      };

      if (editingCourt) {
        // Update existing court
        const { error } = await supabase
          .from('courts')
          .update(courtData)
          .eq('id', editingCourt.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Court updated successfully"
        });
      } else {
        // Create new court
        const { error } = await supabase
          .from('courts')
          .insert([courtData]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Court added successfully"
        });
      }

      // Refresh court data
      const { data, error } = await supabase
        .from('courts')
        .select(`
          *,
          court_groups(
            name
          )
        `);

      if (error) throw error;

      const courtsWithGroupNames = data.map((court: any) => ({
        ...court,
        group_name: court.court_groups?.name || 'No Group'
      }));

      setCourts(courtsWithGroupNames);

      // Reset form
      setCourtName('');
      setCourtGroupId('');
      setEditingCourt(null);
      setCourtDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving court:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save court",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourt = async (courtId: string) => {
    try {
      const { error } = await supabase
        .from('courts')
        .delete()
        .eq('id', courtId);

      if (error) throw error;

      setCourts(courts.filter(court => court.id !== courtId));
      
      toast({
        title: "Success",
        description: "Court deleted successfully"
      });
    } catch (error: any) {
      console.error('Error deleting court:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete court",
        variant: "destructive",
      });
    }
  };

  const handleEditCourt = (court: CourtsWithGroup) => {
    setEditingCourt(court);
    setCourtName(court.name);
    setCourtGroupId(court.group_id || '');
    setCourtDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Courts</h2>
            <p className="text-muted-foreground">
              Manage your padel courts and view schedules
            </p>
          </div>
          
          <Dialog open={courtDialogOpen} onOpenChange={setCourtDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Court
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCourt ? 'Edit Court' : 'Add New Court'}</DialogTitle>
                <DialogDescription>
                  {editingCourt ? 'Update the court details.' : 'Create a new court for your facility.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="court-name">Court Name</Label>
                  <Input 
                    id="court-name" 
                    value={courtName}
                    onChange={(e) => setCourtName(e.target.value)} 
                    placeholder="e.g., Court 1"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="court-group">Court Group</Label>
                  <Select value={courtGroupId} onValueChange={setCourtGroupId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Group</SelectItem>
                      {courtGroups.map(group => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCourtDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddCourt} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingCourt ? 'Update' : 'Add'} Court
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="courts">
          <TabsList>
            <TabsTrigger value="courts">Courts</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>
          
          <TabsContent value="courts" className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-padel-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courts.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <p className="text-muted-foreground">No courts found. Add your first court above.</p>
                  </div>
                ) : (
                  courts.map((court) => (
                    <Card key={court.id}>
                      <CardHeader>
                        <CardTitle>{court.name}</CardTitle>
                        <CardDescription>Group: {court.group_name}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">
                          {reservations.filter(r => r.court_id === court.id).length} reservations this week
                        </p>
                      </CardContent>
                      <CardFooter className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEditCourt(court)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-100">
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the court and cannot be undone.
                                All reservations for this court will also be affected.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-red-500 hover:bg-red-600"
                                onClick={() => handleDeleteCourt(court.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>
          
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
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CourtsPage;
