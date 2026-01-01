/**
 * My Permissions Component
 * Displays the current user's permissions in a clear, readable format
 * Shows role, module access, and action permissions
 */

import React from 'react';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { MODULE_DISPLAY_NAMES } from '@/services/permissionEngine';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X, Shield, RefreshCw, Eye, Plus, Pencil, Trash2, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

// All modules to display in the permission matrix
const ALL_MODULES = [
  'tasks',
  'cases',
  'hearings',
  'documents',
  'clients',
  'client_groups',
  'contacts',
  'courts',
  'judges',
  'employees',
  'reports',
  'compliance',
  'rbac',
];

interface PermissionCellProps {
  allowed: boolean;
  label: string;
}

const PermissionCell: React.FC<PermissionCellProps> = ({ allowed, label }) => (
  <div className="flex items-center justify-center">
    {allowed ? (
      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
        <Check className="h-4 w-4" />
        <span className="sr-only">{label} allowed</span>
      </div>
    ) : (
      <div className="flex items-center gap-1 text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">{label} denied</span>
      </div>
    )}
  </div>
);

export const MyPermissions: React.FC = () => {
  const { 
    isLoading, 
    userRole, 
    isUnrestricted, 
    getMyPermissions, 
    canSeeModule,
    canPerform,
    refreshPermissions 
  } = useUnifiedPermissions();

  const permissionMatrix = getMyPermissions();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const roleDisplayName = userRole.charAt(0).toUpperCase() + userRole.slice(1);

  return (
    <div className="space-y-6">
      {/* Role Info Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              My Permissions
            </CardTitle>
            <CardDescription>
              Your current access rights and capabilities
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshPermissions}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Role:</span>
              <Badge variant={isUnrestricted ? 'default' : 'secondary'} className="font-semibold">
                {isUnrestricted && <Crown className="h-3 w-3 mr-1" />}
                {roleDisplayName}
              </Badge>
            </div>
            {isUnrestricted && (
              <Badge variant="outline" className="text-green-600 border-green-300">
                Full Access
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Module Access Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Module Access</CardTitle>
          <CardDescription>
            Which parts of the system you can see and access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isUnrestricted ? (
            <p className="text-muted-foreground">
              As a {roleDisplayName}, you have unrestricted access to all modules.
            </p>
          ) : permissionMatrix?.moduleAccess && permissionMatrix.moduleAccess.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {permissionMatrix.moduleAccess.map((module) => (
                <Badge key={module} variant="secondary" className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-green-500" />
                  {module}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              No specific module restrictions (all modules accessible by default)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Permission Matrix Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Action Permissions</CardTitle>
          <CardDescription>
            What actions you can perform in each module
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Module</TableHead>
                  <TableHead className="text-center w-24">
                    <div className="flex items-center justify-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline">View</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center w-24">
                    <div className="flex items-center justify-center gap-1">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Create</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center w-24">
                    <div className="flex items-center justify-center gap-1">
                      <Pencil className="h-4 w-4" />
                      <span className="hidden sm:inline">Edit</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center w-24">
                    <div className="flex items-center justify-center gap-1">
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ALL_MODULES.map((moduleKey) => {
                  const moduleVisible = canSeeModule(moduleKey);
                  const moduleName = MODULE_DISPLAY_NAMES[moduleKey] || moduleKey;
                  
                  return (
                    <TableRow 
                      key={moduleKey}
                      className={cn(!moduleVisible && 'opacity-50 bg-muted/30')}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {moduleName}
                          {!moduleVisible && (
                            <Badge variant="outline" className="text-xs text-destructive">
                              Hidden
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <PermissionCell 
                          allowed={canPerform(moduleKey, 'read')} 
                          label="View" 
                        />
                      </TableCell>
                      <TableCell>
                        <PermissionCell 
                          allowed={canPerform(moduleKey, 'create')} 
                          label="Create" 
                        />
                      </TableCell>
                      <TableCell>
                        <PermissionCell 
                          allowed={canPerform(moduleKey, 'edit')} 
                          label="Edit" 
                        />
                      </TableCell>
                      <TableCell>
                        <PermissionCell 
                          allowed={canPerform(moduleKey, 'delete')} 
                          label="Delete" 
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <span>Allowed</span>
            </div>
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-muted-foreground" />
              <span>Not allowed</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs text-destructive">Hidden</Badge>
              <span>Module not visible</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Contact your administrator if you need additional permissions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyPermissions;
