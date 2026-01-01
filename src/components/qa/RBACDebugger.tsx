import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle, XCircle, RefreshCw, User } from 'lucide-react';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { advancedRbacService } from '@/services/advancedRbacService';


interface PermissionCheck {
  resource: string;
  action: 'read' | 'write' | 'delete' | 'admin';
  label: string;
}

const commonChecks: PermissionCheck[] = [
  { resource: 'documents', action: 'read', label: 'Documents: Read' },
  { resource: 'documents', action: 'write', label: 'Documents: Upload/Edit' },
  { resource: 'cases', action: 'read', label: 'Cases: View' },
  { resource: 'cases', action: 'write', label: 'Cases: Create/Edit' },
  { resource: 'clients', action: 'write', label: 'Clients: Manage' },
  { resource: 'tasks', action: 'write', label: 'Tasks: Manage' },
  { resource: 'system.rbac', action: 'admin', label: 'RBAC: Admin' },
];

export const RBACDebugger: React.FC = () => {
  const { currentUserId, effectivePermissions, refreshPermissions, canMultiple, enforcementEnabled } = useRBAC();
  const [roles, setRoles] = useState<any[]>([]);
  const [permissionResults, setPermissionResults] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      if (currentUserId) {
        const userRoles = await advancedRbacService.getUserRoles(currentUserId);
        setRoles(userRoles);

        // Test common permissions
        const checks = commonChecks.map(c => ({ resource: c.resource, action: c.action }));
        const results = await canMultiple(checks);
        setPermissionResults(results);
      }
    } catch (error) {
      console.error('Failed to load RBAC data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUserId, effectivePermissions, enforcementEnabled]);

  const handleRefresh = async () => {
    await refreshPermissions();
    await loadData();
  };

  const handleRepair = async () => {
    try {
      setLoading(true);
      if (currentUserId) {
        // Attempt baseline repair (idempotent)
        // @ts-ignore - ensureBaseline will be added to service
        await advancedRbacService.ensureBaseline?.();
        await refreshPermissions();
        await loadData();
      }
    } catch (e) {
      console.error('RBAC repair failed:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">RBAC Permission Debugger</h2>
          <p className="text-muted-foreground">Current user permissions and role assignments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRepair} disabled={loading}>
            Repair RBAC
          </Button>
          <Button onClick={handleRefresh} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {!enforcementEnabled && (
        <Alert>
          <AlertDescription>DEMO mode: RBAC enforcement is OFF. Permission checks default to allow.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Current User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium">User ID:</span>
                <p className="text-sm text-muted-foreground">{currentUserId || 'Not logged in'}</p>
              </div>
              <div>
                <span className="text-sm font-medium">Active Roles:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {roles.length > 0 ? (
                    roles.map((role) => (
                      <Badge key={role.id} variant="default">
                        {role.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No roles assigned</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium">Total Permissions:</span>
                <p className="text-sm text-muted-foreground">{(effectivePermissions as any)?.permissions?.length ?? 0} effective permissions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {roles.length > 0 ? (
              <div className="space-y-3">
                {roles.map((role) => (
                  <div key={role.id} className="border-b pb-2 last:border-b-0">
                    <div className="font-medium text-sm">{role.name}</div>
                    {role.description && (
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                    )}
                    {role.isSystemRole && (
                      <Badge variant="secondary" className="mt-1">System Role</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No roles assigned. Run the console snippet to assign SuperAdmin role.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Permission Checks */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Evaluation Results</CardTitle>
          <CardDescription>
            Testing common operations against current user's permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {commonChecks.map((check) => {
              const dotKey = `${check.resource}.${check.action}`;
              const colonKey = `${check.resource}:${check.action}`;
              const allowed = permissionResults[dotKey] ?? permissionResults[colonKey] ?? false;
              
              return (
                <div key={`${check.resource}.${check.action}`} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">{check.label}</span>
                  <div className="flex items-center gap-2">
                    {allowed ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Badge variant="default" className="bg-green-500">Allowed</Badge>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <Badge variant="destructive">Denied</Badge>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Console Snippet */}
      <Card>
        <CardHeader>
          <CardTitle>Testing as SuperAdmin</CardTitle>
          <CardDescription>
            Run this snippet in the browser console to assign SuperAdmin role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
            <code>{`// Assign SuperAdmin role to demo-user
(async () => {
  const { unifiedStore } = await import('./src/persistence/unifiedStore');
  await unifiedStore.initialize();
  const roles = await unifiedStore.roles.getAll();
  const superAdminRole = roles.find(r => r.name === 'SuperAdmin');
  if (superAdminRole) {
    await unifiedStore.user_roles.create({
      userId: 'demo-user',
      roleId: superAdminRole.id,
      assignedBy: 'system',
      assignedAt: new Date()
    });
    console.log('SuperAdmin role assigned! Reload the page.');
    location.reload();
  }
})();`}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};
