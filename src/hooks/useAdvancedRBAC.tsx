/**
 * Advanced RBAC Hook - Enhanced replacement for useRBAC
 * Provides comprehensive role-based access control with multi-role support
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { permissionsResolver, type EffectivePermissions } from '@/services/permissionsResolver';
import { advancedRbacService } from '@/services/advancedRbacService';
import { type RoleEntity } from '@/persistence/unifiedStore';
import { toast } from 'sonner';

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
  effectivePermissions: EffectivePermissions | null;
  userRoles: RoleEntity[];
  isLoading: boolean;
  enforcementEnabled: boolean;
  
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
  const [currentUserId, setCurrentUserId] = useState(initialUserId);
  const [effectivePermissions, setEffectivePermissions] = useState<EffectivePermissions | null>(null);
  const [userRoles, setUserRoles] = useState<RoleEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enforcementEnabled, setEnforcementEnabled] = useState(enableEnforcement);
  const [currentUser, setCurrentUser] = useState<User>(defaultUser);

  // Load user permissions and roles
  useEffect(() => {
    loadUserPermissions();
  }, [currentUserId, enforcementEnabled]);

  const loadUserPermissions = async () => {
    try {
      setIsLoading(true);
      
      if (!enforcementEnabled) {
        // Use legacy static permissions when enforcement is disabled
        setEffectivePermissions(null);
        setUserRoles([]);
        setCurrentUser(defaultUser);
        return;
      }

      // Load effective permissions
      const permissions = await permissionsResolver.resolveUserPermissions(currentUserId);
      setEffectivePermissions(permissions);
      setUserRoles(permissions.roles);

      // Update current user for legacy compatibility
      const primaryRole = permissions.roles[0];
      if (primaryRole) {
        setCurrentUser({
          id: currentUserId,
          name: 'Demo User', // In real app, fetch from user service
          email: 'demo@lawfirm.com',
          role: primaryRole.name as UserRole,
          permissions: permissions.permissions.map(p => ({
            module: p.resource,
            action: p.action
          }))
        });
      }

    } catch (error) {
      console.error('Failed to load user permissions:', error);
      toast.error('Failed to load user permissions');
    } finally {
      setIsLoading(false);
    }
  };

  // Legacy permission checking for backward compatibility
  const hasPermission = (module: string, action: Permission['action']): boolean => {
    if (!enforcementEnabled) {
      // Always allow in DEMO mode when enforcement is disabled
      return true;
    }

    if (!effectivePermissions) return false;

    const permission = effectivePermissions.permissions.find(p => 
      p.resource === module && p.action === action
    );
    
    return permission?.allowed ?? false;
  };

  // Enhanced permission checking
  const can = async (resource: string, action: 'read' | 'write' | 'delete' | 'admin'): Promise<boolean> => {
    if (!enforcementEnabled) return true;
    return permissionsResolver.can(currentUserId, resource, action);
  };

  const canSync = (resource: string, action: 'read' | 'write' | 'delete' | 'admin'): boolean => {
    if (!enforcementEnabled) return true;
    
    if (!effectivePermissions) return false;

    const permission = effectivePermissions.permissions.find(p => 
      p.resource === resource && p.action === action
    );
    
    return permission?.allowed ?? false;
  };

  const canMultiple = async (checks: Array<{ resource: string; action: 'read' | 'write' | 'delete' | 'admin' }>): Promise<Record<string, boolean>> => {
    if (!enforcementEnabled) {
      const result: Record<string, boolean> = {};
      checks.forEach(check => {
        result[`${check.resource}.${check.action}`] = true;
      });
      return result;
    }

    return permissionsResolver.canMultiple(currentUserId, checks);
  };

  // Role management
  const assignRole = async (roleId: string): Promise<void> => {
    try {
      await advancedRbacService.assignRole({
        userId: currentUserId,
        roleId
      });
      
      // Clear cache and reload
      permissionsResolver.clearUserCache(currentUserId);
      await loadUserPermissions();
      
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
      permissionsResolver.clearUserCache(currentUserId);
      await loadUserPermissions();
      
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
      return newState;
    });
  };

  const refreshPermissions = async () => {
    permissionsResolver.clearUserCache(currentUserId);
    await loadUserPermissions();
    toast.success('Permissions refreshed');
  };

  const contextValue: AdvancedRBACContextType = {
    // Legacy compatibility
    currentUser,
    hasPermission,
    switchRole,
    
    // Advanced features
    currentUserId,
    effectivePermissions,
    userRoles,
    isLoading,
    enforcementEnabled,
    
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
}

export const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  module,
  action,
  children,
  fallback = <div className="text-muted-foreground">Access denied</div>
}) => {
  const { hasPermission, enforcementEnabled } = useAdvancedRBAC();
  
  if (enforcementEnabled && !hasPermission(module, action)) {
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
  const { can, enforcementEnabled } = useAdvancedRBAC();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enforcementEnabled) {
      setHasPermission(true);
      setLoading(false);
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
  }, [resource, action, can, enforcementEnabled]);

  return { hasPermission, loading };
};

// Backward compatibility exports
export { AdvancedRBACProvider as RBACProvider };