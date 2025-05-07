import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourtsScheduleView } from "@/components/courts/CourtsScheduleView";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ReservationWithDetails, CourtsWithGroup } from "@/types/supabase";
import { Loader2, Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { DateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

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
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courtToDelete, setCourtToDelete] = useState<string | null>(null);
  const deleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const [groupToEdit, setGroupToEdit] = useState<any | null>(null);
  const [groupEditDialogOpen, setGroupEditDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<any | null>(null);
  const [groupDeleteDialogOpen, setGroupDeleteDialogOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);
  const [groupManagerEditName, setGroupManagerEditName] = useState('');
  const [groupManagerEditId, setGroupManagerEditId] = useState<string | null>(null);
  const [groupManagerCourts, setGroupManagerCourts] = useState<{ [groupId: string]: string[] }>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

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
      const groupIdToSave = courtGroupId === "no-group" ? null : courtGroupId;
      const courtData = {
        name: courtName,
        group_id: groupIdToSave
      };

      if (editingCourt) {
        // Only update name and group_id
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
      setCourtGroupId('no-group');
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
    setCourtGroupId(court.group_id ? court.group_id : "no-group");
    setCourtDialogOpen(true);
  };

  // Filter reservations by date range before rendering court cards
  const filteredReservations = reservations.filter((res) => {
    if (dateRange?.from && dateRange?.to) {
      const resDate = new Date(res.date);
      const from = new Date(dateRange.from);
      from.setHours(0,0,0,0);
      const to = new Date(dateRange.to);
      to.setHours(23,59,59,999);
      return resDate >= from && resDate <= to;
    }
    return true;
  });

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
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setGroupManagerOpen(true)}>
              Group Manager
            </Button>
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
                        <SelectItem value="no-group">No Group</SelectItem>
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
                  <Button variant="outline" onClick={() => {
                    setCourtDialogOpen(false);
                    setEditingCourt(null);
                    setCourtName("");
                    setCourtGroupId("no-group");
                  }}>
                  Cancel
                </Button>
                <Button onClick={handleAddCourt} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editingCourt ? 'Update Court' : 'Create Court'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {/* Add Group Dialog */}
            <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="ml-2">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Group</DialogTitle>
                  <DialogDescription>
                    Create a new court group.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="group-name">Group Name</Label>
                    <Input
                      id="group-name"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="e.g., Levels"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!newGroupName) {
                        toast({
                          title: "Error",
                          description: "Group name is required",
                          variant: "destructive",
                        });
                        return;
                      }
                      setIsSubmitting(true);
                      try {
                        const { error } = await supabase
                          .from('court_groups')
                          .insert([{ name: newGroupName }]);
                        if (error) throw error;
                        toast({
                          title: "Success",
                          description: "Group added successfully"
                        });
                        // Refresh groups
                        const { data: groupsData, error: groupsError } = await supabase
                          .from('court_groups')
                          .select('*');
                        if (!groupsError) setCourtGroups(groupsData || []);
                        setNewGroupName('');
                        setGroupDialogOpen(false);
                      } catch (error: any) {
                        toast({
                          title: "Error",
                          description: error.message || "Failed to add group",
                          variant: "destructive",
                        });
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Add Group
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex-1"></div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[220px] justify-start text-left font-normal">
                <Loader2 className="mr-2 h-4 w-4" />
                {dateRange?.from
                  ? dateRange.to
                    ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                    : dateRange.from.toLocaleDateString()
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
                {courtGroups
                  .filter(group => courts.some(court => court.group_id === group.id))
                  .map((group) => {
                    const courtsInGroup = courts.filter(court => court.group_id === group.id);
                    return (
                      <Card key={group.id} className="shadow-lg relative">
                        <div className="absolute top-4 right-4 flex gap-2 z-10">
                          <Button size="icon" variant="ghost" onClick={() => { setGroupToEdit(group); setEditGroupName(group.name); setGroupEditDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { setGroupToDelete(group); setGroupDeleteDialogOpen(true); }}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                  </div>
                        <CardHeader>
                          <CardTitle>{group.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {courtsInGroup.length === 0 ? (
                            <div className="text-muted-foreground">No courts in this group.</div>
                          ) : (
                            <div className="space-y-4">
                              {courtsInGroup.map((court) => {
                                const last5Reservations = filteredReservations
                                  .filter(r => r.court_id === court.id)
                                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                  .slice(0, 5);
                                return (
                                  <Card key={court.id} className="bg-muted/50">
                      <CardHeader>
                                      <CardTitle className="text-lg">{court.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                                      {last5Reservations.length === 0 ? (
                                        <div className="text-muted-foreground text-sm">No reservations found.</div>
                                      ) : (
                                        <table className="w-full text-sm">
                                          <thead>
                                            <tr>
                                              <th className="text-left p-1">Name</th>
                                              <th className="text-right p-1">Amount</th>
                                              <th className="text-right p-1">Method</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {last5Reservations.map(res => (
                                              <tr key={res.id}>
                                                <td className="p-1">{res.client_name}</td>
                                                <td className="p-1 text-right">{res.amount}</td>
                                                <td className="p-1 text-right capitalize">{res.payment_method || '-'}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      )}
                      </CardContent>
                                    <CardFooter className="flex justify-end gap-2 border-t pt-2 mt-2">
                                      <Button size="icon" variant="ghost" onClick={() => handleEditCourt(court)}>
                                        <Pencil className="h-4 w-4" />
                        </Button>
                                      <Button size="icon" variant="ghost" onClick={() => { setCourtToDelete(court.id); setDeleteDialogOpen(true); }}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                      </CardFooter>
                    </Card>
                                );
                              })}
                            </div>
                )}
                        </CardContent>
                      </Card>
                    );
                  })
                }
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
                reservations={filteredReservations}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
      {/* Group Edit Dialog */}
      <Dialog open={groupEditDialogOpen} onOpenChange={setGroupEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="edit-group-name">Group Name</Label>
            <Input id="edit-group-name" value={editGroupName} onChange={e => setEditGroupName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!editGroupName.trim() || !groupToEdit) return;
              try {
                const { error } = await supabase.from('court_groups').update({ name: editGroupName.trim() }).eq('id', groupToEdit.id);
                if (error) throw error;
                setCourtGroups(courtGroups.map(g => g.id === groupToEdit.id ? { ...g, name: editGroupName.trim() } : g));
                setGroupEditDialogOpen(false);
              } catch (error) {
                // handle error
              }
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Group Delete Dialog */}
      <AlertDialog open={groupDeleteDialogOpen} onOpenChange={setGroupDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the group and cannot be undone. All courts in this group will also be affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGroupDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={async () => {
              if (!groupToDelete) return;
              try {
                const { error } = await supabase.from('court_groups').delete().eq('id', groupToDelete.id);
                if (error) throw error;
                setCourtGroups(courtGroups.filter(g => g.id !== groupToDelete.id));
                setGroupDeleteDialogOpen(false);
              } catch (error) {
                // handle error
              }
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Group Manager Dialog */}
      <Dialog open={groupManagerOpen} onOpenChange={setGroupManagerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Group Manager</DialogTitle>
            <DialogDescription>Manage all court groups and assign courts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 max-h-[60vh] overflow-y-auto">
            {courtGroups.length === 0 ? (
              <div className="text-muted-foreground">No groups found.</div>
            ) : (
              courtGroups.map(group => {
                const assignedCourtIds = courts.filter(c => c.group_id === group.id).map(c => c.id);
                return (
                  <Card key={group.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      {groupManagerEditId === group.id ? (
                        <Input
                          value={groupManagerEditName}
                          onChange={e => setGroupManagerEditName(e.target.value)}
                          className="w-1/2"
                        />
                      ) : (
                        <span className="font-semibold text-lg">{group.name}</span>
                      )}
                      <div className="flex gap-2">
                        {groupManagerEditId === group.id ? (
                          <Button size="sm" onClick={async () => {
                            if (!groupManagerEditName.trim()) return;
                            await supabase.from('court_groups').update({ name: groupManagerEditName.trim() }).eq('id', group.id);
                            setCourtGroups(courtGroups.map(g => g.id === group.id ? { ...g, name: groupManagerEditName.trim() } : g));
                            setGroupManagerEditId(null);
                          }}>Save</Button>
                        ) : (
                          <Button size="icon" variant="ghost" onClick={() => { setGroupManagerEditId(group.id); setGroupManagerEditName(group.name); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={async () => {
                          await supabase.from('court_groups').delete().eq('id', group.id);
                          setCourtGroups(courtGroups.filter(g => g.id !== group.id));
                        }}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Assign Courts</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {courts.map(court => (
                          <div key={court.id} className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={court.group_id === group.id}
                              onChange={async (e) => {
                                if (e.target.checked) {
                                  await supabase.from('courts').update({ group_id: group.id }).eq('id', court.id);
                                  setCourts(courts.map(c => c.id === court.id ? { ...c, group_id: group.id } : c));
                                } else {
                                  await supabase.from('courts').update({ group_id: null }).eq('id', court.id);
                                  setCourts(courts.map(c => c.id === court.id ? { ...c, group_id: null } : c));
                                }
                              }}
                            />
                            <span>{court.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupManagerOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the court and cannot be undone. All reservations for this court will also be affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={async () => {
              if (!courtToDelete) return;
              await handleDeleteCourt(courtToDelete);
              setDeleteDialogOpen(false);
              setCourtToDelete(null);
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default CourtsPage;
