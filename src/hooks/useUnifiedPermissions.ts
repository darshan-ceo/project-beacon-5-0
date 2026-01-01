/**
 * Unified Permissions Hook
 * Provides consistent permission checking across all components
 * Combines Module Access (visibility) + RBSA (actions)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppState } from '@/contexts/AppStateContext';
import { permissionEngine, type UserPermissionMatrix, type PermissionStatus, MODULE_DISPLAY_NAMES } from '@/services/permissionEngine';
import { databaseRbacService } from '@/services/databaseRbacService';
import { toast } from 'sonner';

export type ActionType = 'read' | 'create' | 'edit' | 'delete';

export interface UnifiedPermissionsResult {
  // Loading state
  isLoading: boolean;
  
  // User info
  userId: string | null;
  userRole: string;
  isUnrestricted: boolean;
  
  // Module visibility checks
  canSeeModule: (moduleKey: string) => boolean;
  
  // Action permission checks (synchronous - uses cached data)
  canPerform: (moduleKey: string, action: ActionType) => boolean;
  
  // Get permission status with tooltip
  getActionStatus: (moduleKey: string, action: ActionType) => PermissionStatus;
  
  // Get all permissions (for My Permissions page)
  getMyPermissions: () => UserPermissionMatrix | null;
  
  // Show denial toast and log
  showPermissionDenied: (moduleKey: string, action: ActionType) => void;
  
  // Refresh permissions from database
  refreshPermissions: () => Promise<void>;
}

// Default permission status for when data is loading
const DEFAULT_DENIED_STATUS: PermissionStatus = {
  allowed: false,
  reason: 'Loading',
  tooltip: 'Permissions are loading...',
};

const DEFAULT_ALLOWED_STATUS: PermissionStatus = {
  allowed: true,
  reason: 'Allowed',
  tooltip: 'You have permission for this action.',
};

export const useUnifiedPermissions = (): UnifiedPermissionsResult => {
  const { user } = useAuth();
  const { state } = useAppState();
  const [isLoading, setIsLoading] = useState(true);
  const [permissionMatrix, setPermissionMatrix] = useState<UserPermissionMatrix | null>(null);

  const userId = user?.id || null;

  // Get current employee from state
  const currentEmployee = useMemo(() => {
    if (!userId) return null;
    return state.employees.find(e => e.id === userId);
  }, [userId, state.employees]);

  const userRole = useMemo(() => {
    return currentEmployee?.role?.toLowerCase() || 'unknown';
  }, [currentEmployee]);

  // Load permissions on mount and when user changes
  useEffect(() => {
    const loadPermissions = async () => {
      if (!userId) {
        setIsLoading(false);
        setPermissionMatrix(null);
        return;
      }

      try {
        setIsLoading(true);
        const matrix = await permissionEngine.getUserPermissionMatrix(userId);
        setPermissionMatrix(matrix);
      } catch (error) {
        console.error('Failed to load permissions:', error);
        setPermissionMatrix(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadPermissions();
  }, [userId, userRole]);

  // Check if user can see a module (visibility)
  const canSeeModule = useCallback((moduleKey: string): boolean => {
    if (!permissionMatrix) return true; // Allow while loading
    if (permissionMatrix.isUnrestricted) return true;
    
    // If no module access restrictions, allow all
    if (permissionMatrix.moduleAccess.length === 0) return true;
    
    // Check module key or display name
    const displayName = MODULE_DISPLAY_NAMES[moduleKey] || moduleKey;
    return (
      permissionMatrix.moduleAccess.includes(moduleKey) ||
      permissionMatrix.moduleAccess.includes(displayName)
    );
  }, [permissionMatrix]);

  // Check if user can perform an action (synchronous)
  const canPerform = useCallback((moduleKey: string, action: ActionType): boolean => {
    // If loading or no matrix, deny by default for safety
    if (!permissionMatrix) return false;
    
    // Unrestricted roles can do everything
    if (permissionMatrix.isUnrestricted) return true;
    
    // First check module visibility
    if (!canSeeModule(moduleKey)) return false;
    
    // Then check RBSA permission
    const modulePerms = permissionMatrix.modules[moduleKey];
    if (!modulePerms) return false;

    switch (action) {
      case 'read': return modulePerms.canView;
      case 'create': return modulePerms.canCreate;
      case 'edit': return modulePerms.canEdit;
      case 'delete': return modulePerms.canDelete;
      default: return false;
    }
  }, [permissionMatrix, canSeeModule]);

  // Get permission status with reason for UI
  const getActionStatus = useCallback((moduleKey: string, action: ActionType): PermissionStatus => {
    if (!permissionMatrix) return DEFAULT_DENIED_STATUS;
    if (permissionMatrix.isUnrestricted) return DEFAULT_ALLOWED_STATUS;
    
    // Check module access first
    if (!canSeeModule(moduleKey)) {
      return {
        allowed: false,
        reason: 'Module access denied',
        tooltip: 'You do not have access to this module. Contact Admin to enable.',
      };
    }

    const allowed = canPerform(moduleKey, action);
    const actionLabel = action === 'create' ? 'create' : action === 'edit' ? 'edit' : action === 'delete' ? 'delete' : 'view';
    
    if (allowed) {
      return {
        allowed: true,
        reason: 'Allowed',
        tooltip: `You can ${actionLabel} items.`,
      };
    }

    return {
      allowed: false,
      reason: `No ${action} permission`,
      tooltip: `You don't have permission to ${actionLabel}. Contact Admin to enable.`,
    };
  }, [permissionMatrix, canSeeModule, canPerform]);

  // Get complete permission matrix for My Permissions page
  const getMyPermissions = useCallback(() => {
    return permissionMatrix;
  }, [permissionMatrix]);

  // Show permission denied toast and log
  const showPermissionDenied = useCallback((moduleKey: string, action: ActionType) => {
    const moduleName = MODULE_DISPLAY_NAMES[moduleKey] || moduleKey;
    const actionLabel = action === 'create' ? 'create' : action === 'edit' ? 'edit' : action === 'delete' ? 'delete' : 'view';
    
    toast.error('Permission Denied', {
      description: `You don't have permission to ${actionLabel} ${moduleName}. Contact Admin to enable.`,
    });

    // Log denial
    if (userId) {
      permissionEngine.logPermissionDenial(userId, moduleKey, action, 'RBSA denied');
    }
  }, [userId]);

  // Refresh permissions from database
  const refreshPermissions = useCallback(async () => {
    if (!userId) return;
    
    permissionEngine.clearUserCache(userId);
    databaseRbacService.clearRoleCache(userRole);
    
    try {
      setIsLoading(true);
      const matrix = await permissionEngine.getUserPermissionMatrix(userId);
      setPermissionMatrix(matrix);
      toast.success('Permissions refreshed');
    } catch (error) {
      console.error('Failed to refresh permissions:', error);
      toast.error('Failed to refresh permissions');
    } finally {
      setIsLoading(false);
    }
  }, [userId, userRole]);

  return {
    isLoading,
    userId,
    userRole,
    isUnrestricted: permissionMatrix?.isUnrestricted ?? false,
    canSeeModule,
    canPerform,
    getActionStatus,
    getMyPermissions,
    showPermissionDenied,
    refreshPermissions,
  };
};

export default useUnifiedPermissions;
