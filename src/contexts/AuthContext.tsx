import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { auditService } from '@/services/auditService';

interface SignUpMetadata {
  fullName: string;
  phone: string;
  tenantId: string;
}

interface UserProfile {
  full_name: string;
  phone: string;
  avatar_url: string | null;
  role: string | null;
  designation: string | null;
  department: string | null;
  location: string | null;
  bio: string | null;
  joinedDate: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  tenantId: string | null;
  userProfile: UserProfile | null;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, metadata: SignUpMetadata) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper to get the primary/highest role from user_roles
const getPrimaryRole = (roles: string[]): string => {
  const roleHierarchy = ['admin', 'partner', 'manager', 'ca', 'advocate', 'staff', 'user', 'clerk'];
  for (const role of roleHierarchy) {
    if (roles.includes(role)) {
      // Capitalize first letter
      return role.charAt(0).toUpperCase() + role.slice(1);
    }
  }
  return 'User';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  // Fetch user profile and tenant info, including role from user_roles table
  const fetchUserProfile = async (userId: string) => {
    try {
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id, full_name, phone, avatar_url, created_at')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        return;
      }

      if (profileData) {
        setTenantId(profileData.tenant_id);
        
        // Fetch role from user_roles table (the source of truth for RBAC)
        const { data: userRolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        const roles = userRolesData?.map(r => r.role) || [];
        const primaryRole = getPrimaryRole(roles);

        // Fetch additional employee data if exists
        const { data: employeeData } = await supabase
          .from('employees')
          .select('designation, department, city, state')
          .eq('id', userId)
          .single();

        setUserProfile({
          full_name: profileData.full_name,
          phone: profileData.phone,
          avatar_url: profileData.avatar_url || null,
          role: primaryRole,
          designation: employeeData?.designation || null,
          department: employeeData?.department || null,
          location: employeeData?.city && employeeData?.state 
            ? `${employeeData.city}, ${employeeData.state}` 
            : null,
          bio: null,
          joinedDate: profileData.created_at ? new Date(profileData.created_at).toLocaleDateString() : null,
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch profile data when user logs in
        if (session?.user) {
          fetchUserProfile(session.user.id);
        } else {
          setTenantId(null);
          setUserProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (data.user) {
        // Fetch tenant_id directly for audit logging (don't rely on state)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', data.user.id)
          .single();
        
        if (profileData?.tenant_id) {
          await auditService.log('login', profileData.tenant_id, {
            userId: data.user.id,
            details: { email }
          });
        }
      }
      
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signUp = async (email: string, password: string, metadata: SignUpMetadata) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata.fullName,
            phone: metadata.phone,
            tenant_id: metadata.tenantId,
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        toast({
          title: "Signup Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account Created",
          description: "You can now log in with your credentials.",
        });
      }

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    try {
      // Capture tenant_id before signing out (fetch if not in state)
      let logTenantId = tenantId;
      
      if (!logTenantId && user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();
        logTenantId = profileData?.tenant_id || null;
      }
      
      // Log logout before signing out
      if (user && logTenantId) {
        await auditService.log('logout', logTenantId, {
          userId: user.id
        });
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Logout Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });
    
    if (error) {
      console.error('Error resetting password:', error);
    }
    
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      console.error('Error updating password:', error);
    } else if (user && tenantId) {
      // Log password change
      await auditService.log('update_employee', tenantId, {
        userId: user.id,
        entityType: 'password',
        entityId: user.id,
        details: { action: 'password_changed' }
      });
    }
    
    return { error };
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: new Error('Not authenticated') };
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: updates.full_name,
          phone: updates.phone,
          avatar_url: updates.avatar_url,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
      
      // Log profile update
      if (tenantId) {
        await auditService.log('update_employee', tenantId, {
          userId: user.id,
          entityType: 'profile',
          entityId: user.id,
          details: { updated_fields: Object.keys(updates) }
        });
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { error: error as Error };
    }
  };

  const value = {
    user,
    session,
    loading,
    tenantId,
    userProfile,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    isAuthenticated: !!session,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
