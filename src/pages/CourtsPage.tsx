
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { mockCourts } from "@/lib/mock-data";
import { Court } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Plus, Edit, Trash } from "lucide-react";
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

const CourtsPage = () => {
  const [courts, setCourts] = useState<Court[]>(mockCourts);
  const [open, setOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [name, setName] = useState("");
  const [group, setGroup] = useState("Indoor");
  const { toast } = useToast();

  const handleAddCourt = () => {
    if (!name) {
      toast({
        title: "Error",
        description: "Court name is required",
        variant: "destructive",
      });
      return;
    }
    
    const newCourt: Court = {
      id: (courts.length + 1).toString(),
      name,
      group,
      created_at: new Date().toISOString(),
    };
    
    setCourts([...courts, newCourt]);
    setName("");
    setGroup("Indoor");
    setOpen(false);
    
    toast({
      title: "Court added",
      description: `${name} has been added successfully`,
    });
  };

  const handleEditCourt = () => {
    if (!editingCourt || !name) {
      toast({
        title: "Error",
        description: "Court name is required",
        variant: "destructive",
      });
      return;
    }
    
    const updatedCourts = courts.map((court) => 
      court.id === editingCourt.id 
        ? { ...court, name, group } 
        : court
    );
    
    setCourts(updatedCourts);
    setEditingCourt(null);
    setName("");
    setGroup("Indoor");
    setOpen(false);
    
    toast({
      title: "Court updated",
      description: `${name} has been updated successfully`,
    });
  };

  const handleDeleteCourt = (id: string) => {
    setCourts(courts.filter((court) => court.id !== id));
    
    toast({
      title: "Court deleted",
      description: "Court has been deleted successfully",
    });
  };

  const openEditDialog = (court: Court) => {
    setEditingCourt(court);
    setName(court.name);
    setGroup(court.group);
    setOpen(true);
  };

  const openAddDialog = () => {
    setEditingCourt(null);
    setName("");
    setGroup("Indoor");
    setOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Courts</h2>
            <p className="text-muted-foreground">
              Manage your padel courts here.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Court
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCourt ? "Edit Court" : "Add Court"}
                </DialogTitle>
                <DialogDescription>
                  {editingCourt
                    ? "Make changes to the court details."
                    : "Add a new court to your facility."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Court 1"
                  />
                </div>
                <div>
                  <Label htmlFor="group">Group</Label>
                  <Select value={group} onValueChange={(value) => setGroup(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Indoor">Indoor</SelectItem>
                      <SelectItem value="Outdoor">Outdoor</SelectItem>
                      <SelectItem value="Premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={editingCourt ? handleEditCourt : handleAddCourt}>
                  {editingCourt ? "Save changes" : "Add court"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courts.map((court) => (
            <Card key={court.id} className="card-hover">
              <CardHeader>
                <CardTitle>{court.name}</CardTitle>
                <CardDescription>Group: {court.group}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Created on {new Date(court.created_at).toLocaleDateString()}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" onClick={() => openEditDialog(court)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-red-500 hover:bg-red-50" 
                  onClick={() => handleDeleteCourt(court.id)}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CourtsPage;
