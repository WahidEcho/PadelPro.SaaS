import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, RefreshCw, Trash } from "lucide-react";
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
import { AppRole } from "@/types/supabase";
import { useLanguage } from "@/contexts/language-context";

// Type definition for users with roles
type UserWithRole = {
  id: string;
  email: string;
  role: AppRole;
  created_at: string;
};

// Schema for creating a new employee
const createEmployeeSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Schema for profile update
const profileUpdateSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
});

// Schema for password update
const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(6, { message: "Current password is required" }),
  newPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type CreateEmployeeFormValues = z.infer<typeof createEmployeeSchema>;
type ProfileUpdateFormValues = z.infer<typeof profileUpdateSchema>;
type PasswordUpdateFormValues = z.infer<typeof passwordUpdateSchema>;

const SettingsPage = () => {
  const { toast } = useToast();
  const { user, isAdmin, updateProfile, updatePassword } = useAuth();
  const [employees, setEmployees] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { t, language } = useLanguage();

  const createEmployeeForm = useForm<CreateEmployeeFormValues>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const profileForm = useForm<ProfileUpdateFormValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      name: user?.user_metadata?.full_name || "",
      email: user?.email || "",
    },
  });

  const passwordForm = useForm<PasswordUpdateFormValues>({
    resolver: zodResolver(passwordUpdateSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      profileForm.setValue("name", user.user_metadata?.full_name || "");
      profileForm.setValue("email", user.email || "");
    }
  }, [user, profileForm]);

  // Fetch employees with their roles
  const fetchEmployees = async () => {
    if (!isAdmin) return;
    
    setIsLoading(true);
    try {
      const { data: users, error: usersError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role
        `)
        .eq('role', 'employee');
      
      if (usersError) {
        throw usersError;
      }
      
      // Get user details for each employee
      if (users && users.length > 0) {
        const employeeList: UserWithRole[] = [];
        
        for (const userRole of users) {
          // Get user details from auth.users
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
            userRole.user_id
          );
          
          if (userError) {
            console.error('Error fetching user details:', userError);
            continue;
          }
          
          if (userData && userData.user) {
            employeeList.push({
              id: userData.user.id,
              email: userData.user.email || 'Unknown',
              role: userRole.role,
              created_at: userData.user.created_at || '',
            });
          }
        }
        
        setEmployees(employeeList);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchEmployees();
  }, [isAdmin]);
  
  const handleSaveProfile = async (data: ProfileUpdateFormValues) => {
    setIsSaving(true);
    try {
      // Update profile in Supabase
      const { success, error } = await updateProfile({ full_name: data.name });
      
      if (!success) {
        throw new Error(error || "Failed to update profile");
      }
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleChangePassword = async (data: PasswordUpdateFormValues) => {
    setIsChangingPassword(true);
    try {
      // First verify current password
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: data.currentPassword,
      });
      
      if (signInError || !signInData.user) {
        throw new Error("Current password is incorrect");
      }
      
      // Update password
      const { success, error } = await updatePassword(data.newPassword);
      
      if (!success) {
        throw new Error(error || "Failed to update password");
      }
      
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });
      
      // Reset form
      passwordForm.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };
  
  const onCreateEmployeeSubmit = async (data: CreateEmployeeFormValues) => {
    if (!isAdmin) return;
    try {
      // Create user in Supabase Auth
      const { data: authData, error: signupError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.name },
      });
      if (signupError) {
        throw signupError;
      }
      if (authData && authData.user) {
        // Assign employee role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([{
            user_id: authData.user.id,
            role: 'employee'
          }]);
        if (roleError) {
          throw roleError;
        }
        toast({
          title: "Employee created",
          description: `Employee ${data.email} has been created successfully.`,
        });
        // Reset form
        createEmployeeForm.reset();
        // Refresh employees list
        fetchEmployees();
      }
    } catch (error: any) {
      console.error('Error creating employee:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create employee",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteEmployee = async (userId: string) => {
    if (!isAdmin) return;
    
    setDeletingUserId(userId);
    try {
      // Delete user role first
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (roleError) {
        throw roleError;
      }
      
      // Delete user from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authError) {
        throw authError;
      }
      
      toast({
        title: "Employee deleted",
        description: "Employee has been deleted successfully.",
      });
      
      // Refresh employees list
      fetchEmployees();
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete employee",
        variant: "destructive",
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Access Restricted</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                You don't have permission to access this page.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className={`space-y-6 ${language === 'ar' ? 'text-right' : ''}`}>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("settings")}</h2>
          <p className="text-muted-foreground">
            {t("manage_account_settings")}
          </p>
        </div>
        
        <Tabs defaultValue="profile">
          <TabsList className={language === 'ar' ? 'flex-row-reverse' : ''}>
            <TabsTrigger value="profile">{t("profile")}</TabsTrigger>
            <TabsTrigger value="employees">{t("employees")}</TabsTrigger>
            <TabsTrigger value="security">{t("security")}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>{t("profile")}</CardTitle>
                <CardDescription>
                  {t("update_personal_info")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(handleSaveProfile)} className="space-y-4">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("name")}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("email")}</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} disabled />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("saving")}
                        </>
                      ) : (
                        t("save_changes")
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="employees">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("create_employee_account")}</CardTitle>
                  <CardDescription>
                    {t("add_new_employee")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...createEmployeeForm}>
                    <form onSubmit={createEmployeeForm.handleSubmit(onCreateEmployeeSubmit)} className="space-y-4">
                      <FormField
                        control={createEmployeeForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("employee_name")}</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder={t("full_name")} 
                                type="text" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createEmployeeForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("email")}</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="employee@example.com" 
                                type="email" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createEmployeeForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("password")}</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="••••••••" 
                                type="password" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createEmployeeForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("confirm_password")}</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="••••••••" 
                                type="password" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full">
                        {t("create_employee")}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{t("employee_accounts")}</CardTitle>
                      <CardDescription>
                        {t("manage_employee_access")}
                      </CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={fetchEmployees}
                      disabled={isLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-padel-primary" />
                    </div>
                  ) : employees.length > 0 ? (
                    <div className="space-y-4">
                      {employees.map((employee) => (
                        <div key={employee.id} className="flex items-center justify-between p-4 border rounded-md">
                          <div>
                            <div className="font-medium">{employee.email}</div>
                            <div className="text-sm text-muted-foreground">
                              {t("role")}: {employee.role}
                            </div>
                          </div>
                          <div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700">
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("are_you_sure")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("delete_employee_warning") + " " + employee.email}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-500 hover:bg-red-600"
                                    onClick={() => handleDeleteEmployee(employee.id)}
                                  >
                                    {deletingUserId === employee.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : null}
                                    {t("delete")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      {t("no_employees_found")}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="security">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>{t("security")}</CardTitle>
                <CardDescription>
                  {t("update_password")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("current_password")}</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("new_password")}</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("confirm_new_password")}</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isChangingPassword}>
                      {isChangingPassword ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("updating")}
                        </>
                      ) : (
                        t("update_password")
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
