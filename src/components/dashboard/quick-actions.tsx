import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";

interface QuickActionsProps {
  isAdmin: boolean;
}

export function QuickActions({ isAdmin }: QuickActionsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
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
            <span>{t("new_reservation")}</span>
          </Button>
          
          <Button 
            onClick={() => navigate('/clients')}
            variant="outline" 
            className="h-20 flex flex-col items-center justify-center space-y-2"
          >
            <Users className="h-5 w-5" />
            <span>{t("add_client")}</span>
          </Button>
          
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>{t("add_court")}</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("add_new_court")}</DialogTitle>
                  <DialogDescription>
                    {t("create_new_court_desc")}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t("cancel")}
                  </Button>
                  <Button onClick={() => {
                    setIsDialogOpen(false);
                    navigate('/courts');
                    toast({
                      title: t("navigation"),
                      description: t("redirecting_to_court_management")
                    });
                  }}>
                    {t("go_to_courts")}
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
