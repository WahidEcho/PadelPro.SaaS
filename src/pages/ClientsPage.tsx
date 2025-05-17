import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useClientsData } from "@/hooks/use-clients-data";
import { Client } from "@/types/supabase";
import { useLanguage } from "@/contexts/language-context";

const clientFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  phone: z.string().min(6, { message: "Phone must be at least 6 characters" }),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

const ClientsPage = () => {
  const { clients, isLoading, createClient, updateClient, deleteClient } = useClientsData();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      phone: "",
    },
  });

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!isDialogOpen) {
      form.reset();
      setEditingClient(null);
    }
  }, [isDialogOpen, form]);

  // Set form values when editing a client
  React.useEffect(() => {
    if (editingClient) {
      form.reset({
        name: editingClient.name,
        phone: editingClient.phone || "",
      });
    }
  }, [editingClient, form]);

  const onSubmit = async (data: ClientFormValues) => {
    if (editingClient) {
      // Update client
      const result = await updateClient(editingClient.id, {
        name: data.name,
        phone: data.phone,
      });
      
      if (result.success) {
        toast({
          title: "Client updated",
          description: `${data.name} has been updated successfully.`,
        });
      }
    } else {
      // Add new client
      const result = await createClient({
        name: data.name,
        phone: data.phone,
      });
      
      if (result.success) {
        toast({
          title: "Client added",
          description: `${data.name} has been added successfully.`,
        });
      }
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this client?")) {
      const result = await deleteClient(id);
      
      if (result.success) {
        toast({
          title: "Client deleted",
          description: "Client has been deleted successfully.",
        });
      }
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsDialogOpen(true);
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.phone && client.phone.includes(searchTerm)) ||
    client.client_id.toLowerCase().includes(searchTerm.toLowerCase())
  )
  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{t("clients")}</h2>
            <p className="text-muted-foreground">
              {t("manage_clients")}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("add_client")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingClient ? t("edit_client") : t("add_new_client")}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("name")}</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("phone")}</FormLabel>
                        <FormControl>
                          <Input placeholder="123456789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    {editingClient ? t("update_client") : t("add_client")}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center space-x-2 mb-4">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("search_clients_placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={`font-medium ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t("client_id")}</TableHead>
                <TableHead className={`font-medium ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t("name")}</TableHead>
                <TableHead className={`font-medium ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t("phone")}</TableHead>
                <TableHead className={`font-medium ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t("registered")}</TableHead>
                <TableHead className={`font-medium ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className={`text-center py-8 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                    <div className="flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className={`font-medium ${language === 'ar' ? 'text-right' : 'text-left'}`}>{client.client_id}</TableCell>
                    <TableCell className={`${language === 'ar' ? 'text-right' : 'text-left'}`}>{client.name}</TableCell>
                    <TableCell className={`${language === 'ar' ? 'text-right' : 'text-left'}`}>{client.phone || '-'}</TableCell>
                    <TableCell className={`${language === 'ar' ? 'text-right' : 'text-left'}`}>{new Date(client.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className={`font-medium ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                      <div className={`flex gap-2 ${language === 'ar' ? 'justify-end' : 'justify-start'}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(client)}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">{t("edit")}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(client.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">{t("delete")}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) :
                <TableRow>
                  <TableCell colSpan={5} className={`text-center py-8 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                    {t("no_clients_found")}
                  </TableCell>
                </TableRow>
              }
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClientsPage;
