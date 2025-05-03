
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminSetup = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const createAdminUser = async () => {
    setIsCreating(true);
    try {
      // Create the admin user
      const { data: userData, error: signupError } = await supabase.auth.signUp({
        email: 'admin@padelpro.com',
        password: 'admin@123',
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (signupError) {
        throw signupError;
      }

      if (!userData.user) {
        throw new Error("User creation failed");
      }

      // Assign admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{
          user_id: userData.user.id,
          role: 'admin'
        }]);

      if (roleError) {
        throw roleError;
      }

      toast({
        title: "Admin user created successfully",
        description: "Email: admin@padelpro.com, Password: admin@123",
      });
      
      setIsComplete(true);
    } catch (error: any) {
      console.error('Error creating admin user:', error);
      
      // Special handling for user already exists
      if (error.message?.includes("User already registered")) {
        toast({
          title: "Admin user already exists",
          description: "A user with this email already exists. Try logging in with the provided credentials.",
        });
        setIsComplete(true);
        return;
      }
      
      toast({
        title: "Error creating admin user",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleNavigate = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Admin Account</CardTitle>
          <CardDescription>
            Set up the initial admin account for PadelPro Manager
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This will create an admin account with the following credentials:
            </p>
            <div className="p-2 bg-muted rounded-md">
              <p><strong>Email:</strong> admin@padelpro.com</p>
              <p><strong>Password:</strong> admin@123</p>
            </div>
          </div>
          
          {!isComplete ? (
            <Button 
              className="w-full" 
              onClick={createAdminUser}
              disabled={isCreating}
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Admin Account
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="p-2 bg-green-50 text-green-700 rounded-md">
                Admin account has been created successfully. You can now log in with the provided credentials.
              </div>
              <Button className="w-full" onClick={handleNavigate}>
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSetup;
