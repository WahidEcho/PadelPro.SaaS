
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase, getCurrentUser, isAdmin, isEmployee } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

// Define the context type
type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  signOut: () => Promise<void>;
};

// Create the context
const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAdmin: false,
  isEmployee: false,
  signOut: async () => {},
});

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [userIsEmployee, setUserIsEmployee] = useState(false);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user || null);

        if (currentSession?.user) {
          const adminStatus = await isAdmin();
          const employeeStatus = await isEmployee();
          setUserIsAdmin(adminStatus);
          setUserIsEmployee(employeeStatus);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user || null);

        if (newSession?.user) {
          const adminStatus = await isAdmin();
          const employeeStatus = await isEmployee();
          setUserIsAdmin(adminStatus);
          setUserIsEmployee(employeeStatus);
        } else {
          setUserIsAdmin(false);
          setUserIsEmployee(false);
        }

        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign out function
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        isAdmin: userIsAdmin,
        isEmployee: userIsEmployee,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
