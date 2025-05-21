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
  isManager: boolean;
  signOut: () => Promise<void>;
  updateProfile: (data: { full_name?: string }) => Promise<{ success: boolean; error: string | null }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error: string | null }>;
};

// Create the context
const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAdmin: false,
  isEmployee: false,
  isManager: false,
  signOut: async () => {},
  updateProfile: async () => ({ success: false, error: 'Not implemented' }),
  updatePassword: async () => ({ success: false, error: 'Not implemented' }),
});

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [userIsEmployee, setUserIsEmployee] = useState(false);
  const [userIsManager, setUserIsManager] = useState(false);

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
              const managerStatus = await hasRole(newSession.user.id, 'manager');
              setUserIsAdmin(adminStatus);
              setUserIsEmployee(employeeStatus);
              setUserIsManager(managerStatus);
            } catch (error) {
              console.error('Error checking roles:', error);
            } finally {
              setLoading(false);
            }
          }, 0);
        } else {
          setUserIsAdmin(false);
          setUserIsEmployee(false);
          setUserIsManager(false);
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
          const managerStatus = await hasRole(currentSession.user.id, 'manager');
          setUserIsAdmin(adminStatus);
          setUserIsEmployee(employeeStatus);
          setUserIsManager(managerStatus);
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

  // Update user profile function
  const updateProfile = async (data: { full_name?: string }) => {
    try {
      if (!user) return { success: false, error: 'User not authenticated' };

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: data.full_name
        }
      });

      if (updateError) throw updateError;

      // Check if we need to update/create a profile record
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingProfile) {
        // Update existing profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: data.full_name })
          .eq('user_id', user.id);

        if (profileError) throw profileError;
      } else {
        // Create new profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ user_id: user.id, full_name: data.full_name }]);

        if (profileError) throw profileError;
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message || 'Failed to update profile' };
    }
  };

  // Update password function
  const updatePassword = async (password: string) => {
    try {
      if (!user) return { success: false, error: 'User not authenticated' };

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error updating password:', error);
      return { success: false, error: error.message || 'Failed to update password' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        isAdmin: userIsAdmin,
        isEmployee: userIsEmployee,
        isManager: userIsManager,
        signOut,
        updateProfile,
        updatePassword,
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
