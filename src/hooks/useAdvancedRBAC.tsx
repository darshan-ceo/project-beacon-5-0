/**
 * Advanced RBAC Hook - Enhanced replacement for useRBAC
 * Provides comprehensive role-based access control with multi-role support
 * Now uses Supabase-backed permissions resolver for accurate RLS alignment
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabasePermissionsResolver, type AppRole } from '@/services/supabasePermissionsResolver';
import { advancedRbacService } from '@/services/advancedRbacService';
import { type RoleEntity } from '@/persistence/unifiedStore';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Legacy compatibility types
export type UserRole = 'Partner' | 'Admin' | 'Manager' | 'Associate' | 'Clerk' | 'Client';

export interface Permission {
  module: string;
  action: 'read' | 'write' | 'delete' | 'admin';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
}

interface AdvancedRBACContextType {
  // Legacy compatibility
  currentUser: User;
  hasPermission: (module: string, action: Permission['action']) => boolean;
  switchRole: (role: UserRole) => void;
  
  // Advanced features
  currentUserId: string;
  effectivePermissions: null; // Removed legacy permissions
  userRoles: RoleEntity[];
  isLoading: boolean;
  enforcementEnabled: boolean;
  isRbacReady: boolean; // NEW: indicates if RBAC is fully loaded
  
  // Enhanced permission checking
  can: (resource: string, action: 'read' | 'write' | 'delete' | 'admin') => Promise<boolean>;
  canSync: (resource: string, action: 'read' | 'write' | 'delete' | 'admin') => boolean;
  canMultiple: (checks: Array<{ resource: string; action: 'read' | 'write' | 'delete' | 'admin' }>) => Promise<Record<string, boolean>>;
  
  // Role management
  assignRole: (roleId: string) => Promise<void>;
  revokeRole: (roleId: string) => Promise<void>;
  
  // Settings
  toggleEnforcement: () => void;
  refreshPermissions: () => Promise<void>;
}

const AdvancedRBACContext = createContext<AdvancedRBACContextType | undefined>(undefined);

export const useAdvancedRBAC = () => {
  const context = useContext(AdvancedRBACContext);
  if (!context) {
    throw new Error('useAdvancedRBAC must be used within an AdvancedRBACProvider');
  }
  return context;
};

// Backward compatibility export
export const useRBAC = useAdvancedRBAC;

interface AdvancedRBACProviderProps {
  children: ReactNode;
  initialUserId?: string;
  enableEnforcement?: boolean;
}

// Default demo user
const defaultUser: User = {
  id: 'demo-user',
  name: 'Demo User',
  email: 'demo@lawfirm.com',
  role: 'Admin',
  permissions: [{ module: '*', action: 'admin' }]
};

export const AdvancedRBACProvider: React.FC<AdvancedRBACProviderProps> = ({
  children,
  initialUserId = 'demo-user',
  enableEnforcement = false
}) => {
  const { user, tenantId, userProfile } = useAuth();
  const [currentUserId, setCurrentUserId] = useState(initialUserId);
  const [userRoles, setUserRoles] = useState<RoleEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enforcementEnabled, setEnforcementEnabled] = useState(enableEnforcement);
  const [currentUser, setCurrentUser] = useState<User>(defaultUser);
  const [supabaseRole, setSupabaseRole] = useState<AppRole>('user');
  const [isRoleLoading, setIsRoleLoading] = useState(true);
  const [isPermissionsLoaded, setIsPermissionsLoaded] = useState(false);

  // Computed: RBAC is ready when role and permissions are loaded
  const isRbacReady = !isRoleLoading && isPermissionsLoaded;

  // Update currentUserId when authenticated user changes
  useEffect(() => {
    if (user?.id) {
      setCurrentUserId(user.id);
    }
  }, [user]);

  // Load user role AND permissions from Supabase
  useEffect(() => {
    const loadRoleAndPermissions = async () => {
      if (currentUserId && currentUserId !== 'demo-user' && enforcementEnabled) {
        setIsRoleLoading(true);
        setIsPermissionsLoaded(false);
        
        try {
          // Step 1: Get the user's role
          const role = await supabasePermissionsResolver.getUserRole(currentUserId);
          setSupabaseRole(role);
          console.log(`[RBAC] Role loaded for user ${currentUserId}: ${role}`);
          
          // Step 2: Preload permissions for the role
          await supabasePermissionsResolver.preloadPermissions(role);
          setIsPermissionsLoaded(true);
          console.log(`[RBAC] Permissions loaded for role ${role}`);
          
        } catch (error) {
          console.error('Failed to load user role/permissions from Supabase:', error);
          setIsPermissionsLoaded(false);
        } finally {
          setIsRoleLoading(false);
          setIsLoading(false);
        }
      } else {
        setIsRoleLoading(false);
        setIsPermissionsLoaded(true); // In demo mode, consider permissions loaded
        setIsLoading(false);
      }
    };
    
    if (currentUserId) {
      loadRoleAndPermissions();
    }
  }, [currentUserId, enforcementEnabled]);

  // Permission checking using Supabase-backed resolver (FAIL-CLOSED)
  const hasPermission = useCallback((module: string, action: Permission['action']): boolean => {
    // DEMO mode - allow everything
    if (!enforcementEnabled) {
      return true;
    }

    // CRITICAL: FAIL-CLOSED while loading
    // This prevents UI from showing actions user may not have permission for
    if (!isRbacReady) {
      console.log(`[RBAC] Not ready yet, denying ${module}:${action} (fail-closed)`);
      return false;
    }

    // Use Supabase permissions resolver (database-driven)
    const allowed = supabasePermissionsResolver.hasPermission(supabaseRole, module, action);
    
    if (!allowed) {
      console.log(`[RBAC] Permission denied: ${module}:${action} for role ${supabaseRole}`);
    }
    
    return allowed;
  }, [enforcementEnabled, isRbacReady, supabaseRole]);

  // Enhanced async permission checking
  const can = useCallback(async (resource: string, action: 'read' | 'write' | 'delete' | 'admin'): Promise<boolean> => {
    if (!enforcementEnabled) return true;
    return supabasePermissionsResolver.hasPermissionAsync(supabaseRole, resource, action);
  }, [enforcementEnabled, supabaseRole]);

  const canSync = useCallback((resource: string, action: 'read' | 'write' | 'delete' | 'admin'): boolean => {
    if (!enforcementEnabled) return true;
    if (!isRbacReady) return false;
    return supabasePermissionsResolver.hasPermission(supabaseRole, resource, action);
  }, [enforcementEnabled, isRbacReady, supabaseRole]);

  const canMultiple = useCallback(async (checks: Array<{ resource: string; action: 'read' | 'write' | 'delete' | 'admin' }>): Promise<Record<string, boolean>> => {
    if (!enforcementEnabled) {
      const result: Record<string, boolean> = {};
      checks.forEach(check => {
        result[`${check.resource}.${check.action}`] = true;
      });
      return result;
    }

    // Ensure permissions are loaded
    await supabasePermissionsResolver.preloadPermissions(supabaseRole);

    const result: Record<string, boolean> = {};
    for (const check of checks) {
      result[`${check.resource}.${check.action}`] = supabasePermissionsResolver.hasPermission(supabaseRole, check.resource, check.action);
    }
    return result;
  }, [enforcementEnabled, supabaseRole]);

  // Role management
  const assignRole = async (roleId: string): Promise<void> => {
    try {
      await advancedRbacService.assignRole({
        userId: currentUserId,
        roleId
      });
      
      // Clear cache and reload
      supabasePermissionsResolver.clearUserCache(currentUserId);
      supabasePermissionsResolver.clearAllCache();
      
      // Force reload of role and permissions
      setIsRoleLoading(true);
      setIsPermissionsLoaded(false);
      
      toast.success('Role assigned successfully');
    } catch (error) {
      console.error('Failed to assign role:', error);
      toast.error('Failed to assign role');
    }
  };

  const revokeRole = async (roleId: string): Promise<void> => {
    try {
      await advancedRbacService.revokeRole(currentUserId, roleId);
      
      // Clear cache and reload
      supabasePermissionsResolver.clearUserCache(currentUserId);
      supabasePermissionsResolver.clearAllCache();
      
      // Force reload
      setIsRoleLoading(true);
      setIsPermissionsLoaded(false);
      
      toast.success('Role revoked successfully');
    } catch (error) {
      console.error('Failed to revoke role:', error);
      toast.error('Failed to revoke role');
    }
  };

  // Legacy role switching for backward compatibility
  const switchRole = (role: UserRole) => {
    if (!enforcementEnabled) {
      setCurrentUser(prev => ({ ...prev, role }));
      toast.success(`Switched to ${role} role`);
    } else {
      toast.info('Use role assignment for dynamic role switching');
    }
  };

  const toggleEnforcement = () => {
    setEnforcementEnabled(prev => {
      const newState = !prev;
      toast.success(`RBAC enforcement ${newState ? 'enabled' : 'disabled'}`);
      
      // Clear caches when toggling
      supabasePermissionsResolver.clearAllCache();
      
      return newState;
    });
  };

  const refreshPermissions = async () => {
    supabasePermissionsResolver.clearUserCache(currentUserId);
    supabasePermissionsResolver.clearAllCache();
    
    // Force reload
    setIsRoleLoading(true);
    setIsPermissionsLoaded(false);
    
    toast.success('Permissions refreshed');
  };

  const contextValue: AdvancedRBACContextType = {
    // Legacy compatibility
    currentUser,
    hasPermission,
    switchRole,
    
    // Advanced features
    currentUserId,
    effectivePermissions: null,
    userRoles,
    isLoading,
    enforcementEnabled,
    isRbacReady,
    
    // Enhanced permission checking
    can,
    canSync,
    canMultiple,
    
    // Role management
    assignRole,
    revokeRole,
    
    // Settings
    toggleEnforcement,
    refreshPermissions
  };

  return (
    <AdvancedRBACContext.Provider value={contextValue}>
      {children}
    </AdvancedRBACContext.Provider>
  );
};

// Higher-order component for protecting routes/components
interface ProtectedComponentProps {
  module: string;
  action: Permission['action'];
  children: ReactNode;
  fallback?: ReactNode;
  showLoading?: boolean;
}

export const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  module,
  action,
  children,
  fallback = null, // Default to hiding instead of showing "Access denied"
  showLoading = false
}) => {
  const { hasPermission, enforcementEnabled, isRbacReady, isLoading } = useAdvancedRBAC();
  
  // Show loading if requested and still loading
  if (showLoading && isLoading) {
    return <div className="animate-pulse h-8 w-20 bg-muted rounded" />;
  }
  
  // In demo mode, always show
  if (!enforcementEnabled) {
    return <>{children}</>;
  }
  
  // While loading, hide the component (fail-closed)
  if (!isRbacReady) {
    return <>{fallback}</>;
  }
  
  // Check permission
  if (!hasPermission(module, action)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

// Hook for checking permissions in components
export const usePermission = (module: string, action: Permission['action']) => {
  const { hasPermission } = useAdvancedRBAC();
  return hasPermission(module, action);
};

// Global permission helper function
export const globalCan = async (resource: string, action: 'read' | 'write' | 'delete' | 'admin'): Promise<boolean> => {
  // This will be implemented when we have a global context
  // For now, return true in DEMO mode
  return true;
};

// Enhanced hook for async permission checking
export const useAsyncPermission = (resource: string, action: 'read' | 'write' | 'delete' | 'admin') => {
  const { can, enforcementEnabled, isRbacReady } = useAdvancedRBAC();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enforcementEnabled) {
      setHasPermission(true);
      setLoading(false);
      return;
    }

    // Wait for RBAC to be ready
    if (!isRbacReady) {
      return;
    }

    const checkPermission = async () => {
      try {
        setLoading(true);
        const result = await can(resource, action);
        setHasPermission(result);
      } catch (error) {
        console.error('Permission check failed:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [resource, action, can, enforcementEnabled, isRbacReady]);

  return { hasPermission, loading };
};

// Backward compatibility exports
export { AdvancedRBACProvider as RBACProvider };
