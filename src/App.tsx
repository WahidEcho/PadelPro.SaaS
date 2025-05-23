import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { LanguageProvider, useLanguage } from "@/contexts/language-context";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "@/contexts/theme-context";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const CourtsPage = lazy(() => import("./pages/CourtsPage"));
const ReservationsPage = lazy(() => import("./pages/ReservationsPage"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const FinancialsPage = lazy(() => import("./pages/FinancialsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const AdminSetup = lazy(() => import("./pages/AdminSetup"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading component
const LoadingScreen = () => (
  <div className="flex items-center justify-center h-screen">
    <Loader2 className="h-10 w-10 animate-spin text-padel-primary" />
  </div>
);

// Protected route component that checks for admin or employee role based on allowedRoles
const ProtectedRoute = ({ 
  children, 
  allowedRoles = ['admin', 'employee', 'manager'] 
}: { 
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'employee' | 'manager'>;
}) => {
  const { user, loading, isAdmin, isEmployee, isManager } = useAuth();
  const location = useLocation();
  
  // Show loading state while checking auth
  if (loading) {
    return <LoadingScreen />;
  }
  
  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  // Check if user has allowed role
  const hasAllowedRole = (
    (allowedRoles.includes('admin') && isAdmin) || 
    (allowedRoles.includes('employee') && isEmployee) ||
    (allowedRoles.includes('manager') && isManager)
  );
  
  // If the user doesn't have an allowed role, redirect to a restricted page
  if (!hasAllowedRole) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="mb-4">You don't have permission to access this page.</p>
        <Navigate to="/" replace />
      </div>
    );
  }
  
  // If user is authenticated and has allowed role, render the children
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>;
};

// Add a wrapper for employee route restriction
function EmployeeRouteGuard({ children }) {
  const { isEmployee, isAdmin } = useAuth();
  const location = useLocation();
  if (isEmployee && !isAdmin && location.pathname !== "/reservations") {
    return <Navigate to="/reservations" replace />;
  }
  return children;
}

// RTL Wrapper for the app
function RTLWrapper({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  return <div dir={language === "ar" ? "rtl" : "ltr"}>{children}</div>;
}

const App = () => {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageProvider>
            <RTLWrapper>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <EmployeeRouteGuard>
                    <Routes>
                      {/* Public routes */}
                      <Route 
                        path="/login" 
                        element={
                          <Suspense fallback={<LoadingScreen />}>
                            <LoginPage />
                          </Suspense>
                        } 
                      />
                      <Route 
                        path="/admin-setup" 
                        element={
                          <Suspense fallback={<LoadingScreen />}>
                            <AdminSetup />
                          </Suspense>
                        } 
                      />
                      
                      {/* Protected routes - accessible by admin, employee, and manager */}
                      <Route path="/" element={
                        <ProtectedRoute allowedRoles={['admin', 'manager']}>
                          <Index />
                        </ProtectedRoute>
                      } />
                      <Route path="/courts" element={
                        <ProtectedRoute allowedRoles={['admin', 'manager']}>
                          <CourtsPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/reservations" element={
                        <ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}>
                          <ReservationsPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/clients" element={
                        <ProtectedRoute allowedRoles={['admin', 'manager']}>
                          <ClientsPage />
                        </ProtectedRoute>
                      } />
                      
                      {/* Admin-only routes */}
                      <Route path="/financials" element={
                        <ProtectedRoute allowedRoles={['admin', 'manager']}>
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
                  </EmployeeRouteGuard>
                </BrowserRouter>
              </TooltipProvider>
            </RTLWrapper>
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
