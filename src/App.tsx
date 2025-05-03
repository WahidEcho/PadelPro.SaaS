
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Index from "./pages/Index";
import CourtsPage from "./pages/CourtsPage";
import ReservationsPage from "./pages/ReservationsPage";
import ClientsPage from "./pages/ClientsPage";
import FinancialsPage from "./pages/FinancialsPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected route component that checks for admin or employee role based on allowedRoles
const ProtectedRoute = ({ 
  children, 
  allowedRoles = ['admin', 'employee'] 
}: { 
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'employee'>;
}) => {
  const { user, loading, isAdmin, isEmployee } = useAuth();
  
  // Show loading state while checking auth
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user has allowed role
  const hasAllowedRole = (
    (allowedRoles.includes('admin') && isAdmin) || 
    (allowedRoles.includes('employee') && isEmployee)
  );
  
  // If the user doesn't have an allowed role, redirect to a restricted page
  if (!hasAllowedRole) {
    return <Navigate to="/restricted" replace />;
  }
  
  // If user is authenticated and has allowed role, render the children
  return <>{children}</>;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<LoginPage />} />
              
              {/* Restricted access page */}
              <Route path="/restricted" element={
                <div className="flex flex-col items-center justify-center h-screen">
                  <h1 className="text-2xl font-bold mb-4">Access Restricted</h1>
                  <p className="mb-4">You don't have permission to access this page.</p>
                  <Navigate to="/" replace />
                </div>
              } />
              
              {/* Protected routes - accessible by both admin and employee */}
              <Route path="/" element={
                <ProtectedRoute allowedRoles={['admin', 'employee']}>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/courts" element={
                <ProtectedRoute allowedRoles={['admin', 'employee']}>
                  <CourtsPage />
                </ProtectedRoute>
              } />
              <Route path="/reservations" element={
                <ProtectedRoute allowedRoles={['admin', 'employee']}>
                  <ReservationsPage />
                </ProtectedRoute>
              } />
              <Route path="/clients" element={
                <ProtectedRoute allowedRoles={['admin', 'employee']}>
                  <ClientsPage />
                </ProtectedRoute>
              } />
              
              {/* Admin-only routes */}
              <Route path="/financials" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <FinancialsPage />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <SettingsPage />
                </ProtectedRoute>
              } />
              
              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
