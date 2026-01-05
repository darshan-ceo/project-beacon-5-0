import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  Settings, 
  Check, 
  X,
  Users,
  Database,
  RefreshCw,
  AlertCircle,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdvancedRBAC } from '@/hooks/useAdvancedRBAC';
import { useAppState } from '@/contexts/AppStateContext';

interface ModulePermission {
  module: string;
  displayName: string;
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  manage: boolean;
}

// Module display names and order
const MODULE_CONFIG: Record<string, { displayName: string; icon: React.ComponentType<{ className?: string }> }> = {
  'dashboard': { displayName: 'Dashboard', icon: Eye },
  'cases': { displayName: 'Cases', icon: Database },
  'documents': { displayName: 'Documents', icon: Database },
  'hearings': { displayName: 'Hearings', icon: Database },
  'tasks': { displayName: 'Tasks', icon: Database },
  'courts': { displayName: 'Courts/Judges', icon: Database },
  'judges': { displayName: 'Judges', icon: Database },
  'clients': { displayName: 'Clients', icon: Users },
  'employees': { displayName: 'Employees', icon: Users },
  'reports': { displayName: 'Reports', icon: Database },
  'settings': { displayName: 'Settings', icon: Settings },
  'rbac': { displayName: 'RBAC Management', icon: Shield },
  'automation': { displayName: 'Automation', icon: Settings },
  'billing': { displayName: 'Billing', icon: Database },
  'compliance': { displayName: 'Compliance', icon: Shield },
};

const ACTION_ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  'read': { icon: Eye, label: 'View' },
  'create': { icon: Plus, label: 'Create' },
  'update': { icon: Edit, label: 'Edit' },
  'delete': { icon: Trash2, label: 'Delete' },
  'manage': { icon: Settings, label: 'Manage' },
};

export const MyPermissionsPanel: React.FC = () => {
  const { user } = useAuth();
  const { state } = useAppState();
  const { 
    currentUser, 
    userRoles, 
    enforcementEnabled, 
    isRbacReady, 
    isLoading: rbacLoading,
    refreshPermissions 
  } = useAdvancedRBAC();

  const [dbRoles, setDbRoles] = useState<string[]>([]);
  const [dbPermissions, setDbPermissions] = useState<string[]>([]);
  const [dataScope, setDataScope] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch roles and permissions from database
  useEffect(() => {
    const fetchPermissionsData = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        setError(null);

        // Fetch user's roles from user_roles table
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (rolesError) throw rolesError;

        const roles = rolesData?.map(r => r.role) || [];
        setDbRoles(roles);

        // Fetch permissions for those roles from role_permissions table
        if (roles.length > 0) {
          const { data: permissionsData, error: permissionsError } = await supabase
            .from('role_permissions')
            .select('permission_key')
            .in('role', roles);

          if (permissionsError) throw permissionsError;

          const permissions = [...new Set(permissionsData?.map(p => p.permission_key) || [])];
          setDbPermissions(permissions);
        } else {
          setDbPermissions([]);
        }

        // Get data scope from employees table
        const currentEmployee = state.employees.find(e => 
          e.email?.toLowerCase() === user.email?.toLowerCase() ||
          e.id === user.id
        );
        
        if (currentEmployee) {
          const scope = (currentEmployee as any).data_scope || 
                        (currentEmployee as any).dataScope || 
                        'Own Cases';
          setDataScope(scope);
        }

      } catch (err: any) {
        console.error('Error fetching permissions data:', err);
        setError(err.message || 'Failed to load permissions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissionsData();
  }, [user, state.employees]);

  // Group permissions by module
  const modulePermissions = useMemo((): ModulePermission[] => {
    const modules = Object.keys(MODULE_CONFIG);
    const actions = ['read', 'create', 'update', 'delete', 'manage'];

    return modules.map(module => {
      const config = MODULE_CONFIG[module];
      const permissions: ModulePermission = {
        module,
        displayName: config.displayName,
        read: false,
        create: false,
        update: false,
        delete: false,
        manage: false,
      };

      // Check each action for this module
      actions.forEach(action => {
        const permissionKey = `${module}.${action}`;
        permissions[action as keyof Omit<ModulePermission, 'module' | 'displayName'>] = 
          dbPermissions.includes(permissionKey);
      });

      return permissions;
    }).filter(mp => {
      // Only show modules that have at least one permission
      return mp.read || mp.create || mp.update || mp.delete || mp.manage;
    });
  }, [dbPermissions]);

  // Check if user is admin (super-role)
  const isAdmin = useMemo(() => {
    const normalizedRoles = dbRoles.map(r => r.toLowerCase());
    return normalizedRoles.includes('admin') || 
           normalizedRoles.includes('super_admin') ||
           normalizedRoles.includes('superadmin');
  }, [dbRoles]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshPermissions();
      // Re-fetch from database
      if (user?.id) {
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true);

        const roles = rolesData?.map(r => r.role) || [];
        setDbRoles(roles);

        if (roles.length > 0) {
          const { data: permissionsData } = await supabase
            .from('role_permissions')
            .select('permission_key')
            .in('role', roles);

          const permissions = [...new Set(permissionsData?.map(p => p.permission_key) || [])];
          setDbPermissions(permissions);
        }
      }
    } catch (err) {
      console.error('Error refreshing permissions:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const PermissionBadge = ({ allowed }: { allowed: boolean }) => (
    <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
      allowed ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
    }`}>
      {allowed ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
    </div>
  );

  if (isLoading || rbacLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">My Permissions</h3>
            <p className="text-sm text-muted-foreground">
              Your current access rights and capabilities
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Roles Section */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Active Roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {dbRoles.length > 0 ? (
              dbRoles.map((role, index) => (
                <Badge 
                  key={index} 
                  variant={isAdmin ? 'default' : 'secondary'}
                  className="text-sm py-1 px-3"
                >
                  {role}
                  {role.toLowerCase() === 'admin' && (
                    <span className="ml-1 text-xs opacity-75">(Super Role)</span>
                  )}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No roles assigned</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Scope & RBAC Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Scope
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-3 cursor-help">
                    <Badge variant="outline" className="text-sm py-1.5 px-3">
                      {dataScope || 'Not configured'}
                    </Badge>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium">Data Visibility Level</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dataScope === 'All Cases' && 'You can see all cases in the organization.'}
                    {dataScope === 'Team Cases' && 'You can see cases from your team and reporting hierarchy.'}
                    {dataScope === 'Own Cases' && 'You can only see cases directly assigned to you.'}
                    {!dataScope && 'Your data scope has not been configured.'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              RBAC Enforcement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge 
                variant={enforcementEnabled ? 'default' : 'secondary'}
                className="text-sm py-1.5 px-3"
              >
                {enforcementEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
              {isAdmin && (
                <span className="text-xs text-muted-foreground">
                  Admin bypass active
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Permissions Grid */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Module Permissions
            </CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-success/20"></div>
                <span>Allowed</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-muted"></div>
                <span>Denied</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isAdmin ? (
            <Alert className="mb-4">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                As an <strong>Admin</strong>, you have full access to all modules and actions.
              </AlertDescription>
            </Alert>
          ) : modulePermissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No module permissions found for your role(s).</p>
            </div>
          ) : null}

          {/* Permissions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Module</th>
                  <TooltipProvider>
                    {Object.entries(ACTION_ICONS).map(([action, config]) => (
                      <th key={action} className="text-center py-3 px-2 font-medium text-muted-foreground">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col items-center gap-1 cursor-help">
                              <config.icon className="h-4 w-4" />
                              <span className="text-xs">{config.label}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{config.label} Permission</p>
                            <p className="text-xs text-muted-foreground">
                              {action === 'read' && 'View data in this module'}
                              {action === 'create' && 'Create new records'}
                              {action === 'update' && 'Edit existing records'}
                              {action === 'delete' && 'Delete records'}
                              {action === 'manage' && 'Full administrative control'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </th>
                    ))}
                  </TooltipProvider>
                </tr>
              </thead>
              <tbody>
                {(isAdmin ? Object.keys(MODULE_CONFIG) : modulePermissions.map(m => m.module)).map((module, index) => {
                  const config = MODULE_CONFIG[module];
                  const perm = modulePermissions.find(m => m.module === module);
                  
                  return (
                    <motion.tr 
                      key={module}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <config.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{config.displayName}</span>
                        </div>
                      </td>
                      {Object.keys(ACTION_ICONS).map(action => (
                        <td key={action} className="text-center py-3 px-2">
                          <div className="flex justify-center">
                            <PermissionBadge 
                              allowed={isAdmin || (perm?.[action as keyof ModulePermission] as boolean) || false} 
                            />
                          </div>
                        </td>
                      ))}
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Debug Info (collapsed by default) */}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground transition-colors">
          Debug Information
        </summary>
        <div className="mt-2 p-3 rounded-lg bg-muted/30 space-y-1 font-mono">
          <p>User ID: {user?.id || 'N/A'}</p>
          <p>Email: {user?.email || 'N/A'}</p>
          <p>DB Roles: {dbRoles.join(', ') || 'None'}</p>
          <p>Total Permissions: {dbPermissions.length}</p>
          <p>RBAC Ready: {isRbacReady ? 'Yes' : 'No'}</p>
          <p>Enforcement: {enforcementEnabled ? 'Enabled' : 'Disabled'}</p>
          <p>Context User Role: {currentUser?.role || 'N/A'}</p>
        </div>
      </details>
    </div>
  );
};
