
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { AppRole } from '@/types/supabase';

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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user || null);

        if (newSession?.user) {
          // Use setTimeout to avoid potential Supabase auth state deadlock
          setTimeout(async () => {
            try {
              const adminStatus = await hasRole(newSession.user.id, 'admin');
              const employeeStatus = await hasRole(newSession.user.id, 'employee');
              setUserIsAdmin(adminStatus);
              setUserIsEmployee(employeeStatus);
            } catch (error) {
              console.error('Error checking roles:', error);
            } finally {
              setLoading(false);
            }
          }, 0);
        } else {
          setUserIsAdmin(false);
          setUserIsEmployee(false);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user || null);

        if (currentSession?.user) {
          const adminStatus = await hasRole(currentSession.user.id, 'admin');
          const employeeStatus = await hasRole(currentSession.user.id, 'employee');
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

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Helper function to check user role
  const hasRole = async (userId: string, role: AppRole): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: role
      });
      
      if (error) {
        console.error('Error checking role:', error);
        return false;
      }
      
      return !!data;
    } catch (error) {
      console.error('Error in hasRole function:', error);
      return false;
    }
  };

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
