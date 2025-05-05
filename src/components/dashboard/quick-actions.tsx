
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface QuickActionsProps {
  isAdmin: boolean;
}

export function QuickActions({ isAdmin }: QuickActionsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  return (
    <Card className="mt-6">
      <CardContent className="p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Button 
            onClick={() => navigate('/reservations')}
            variant="outline" 
            className="h-20 flex flex-col items-center justify-center space-y-2"
          >
            <Calendar className="h-5 w-5" />
            <span>New Reservation</span>
          </Button>
          
          <Button 
            onClick={() => navigate('/clients')}
            variant="outline" 
            className="h-20 flex flex-col items-center justify-center space-y-2"
          >
            <Users className="h-5 w-5" />
            <span>Add Client</span>
          </Button>
          
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add Court</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Court</DialogTitle>
                  <DialogDescription>
                    Create a new court in the Court Management page.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    setIsDialogOpen(false);
                    navigate('/courts');
                    toast({
                      title: "Navigation",
                      description: "Redirecting to Court Management"
                    });
                  }}>
                    Go to Courts
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
