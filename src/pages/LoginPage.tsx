
import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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

// Mock auth for now - would be replaced with Supabase auth
const mockCredentials = {
  email: "admin@padelpro.com",
  password: "admin123",
};

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem("padelProAuth") === "true");
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    // Mock login - would be replaced with actual auth
    if (data.email === mockCredentials.email && data.password === mockCredentials.password) {
      localStorage.setItem("padelProAuth", "true");
      setIsLoggedIn(true);
      toast({
        title: "Login successful",
        description: "Welcome to PadelPro Manager",
      });
      navigate("/");
    } else {
      toast({
        title: "Login failed",
        description: "Invalid email or password",
        variant: "destructive",
      });
    }
  };

  // If already logged in, redirect to dashboard
  if (isLoggedIn) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="rounded-md bg-padel-primary p-2">
              <div className="h-6 w-6 text-white font-semibold flex items-center justify-center">P</div>
            </div>
            <span className="font-bold text-2xl">PadelPro Manager</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Login</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in to access your dashboard</p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="admin@padelpro.com" 
                      type="email" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
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
            
            <div>
              <Button type="submit" className="w-full bg-padel-primary hover:bg-padel-primary/90">
                Sign in
              </Button>
            </div>
          </form>
        </Form>
        
        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Demo credentials: admin@padelpro.com / admin123</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
