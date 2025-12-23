import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Plus, 
  Edit, 
  Eye,
  RefreshCw,
  Loader2,
  Key,
  BarChart3,
  History,
  GitBranch,
  Info,
  RefreshCcw
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabaseRbacService, type RoleDefinition, type UserWithRoles, type Permission, type AppRole } from '@/services/supabaseRbacService';
import { RolePermissionEditor } from './RolePermissionEditor';
import { CreateRoleModal } from './CreateRoleModal';
import { TeamHierarchyView } from './TeamHierarchyView';
import { PortalUserManagement } from '../portal/PortalUserManagement';
import { supabase } from '@/integrations/supabase/client';

export const RBACManagement: React.FC = () => {
  // State
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  
  // User assignment state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [isAssignRoleOpen, setIsAssignRoleOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPermissions, setPreviewPermissions] = useState<string[]>([]);
  
  // Role editor state
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);

  // Bulk sync state
  const [isSyncing, setIsSyncing] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading RBAC data from Supabase...');
      
      const [rolesData, usersData, permissionsData, analyticsData, auditData] = await Promise.all([
        supabaseRbacService.getAllRoles(),
        supabaseRbacService.getAllUsersWithRoles(),
        supabaseRbacService.getAllPermissions(),
        supabaseRbacService.getAnalytics(),
        supabaseRbacService.getAuditLog(50),
      ]);
      
      console.log('📊 RBAC Data loaded:', {
        roles: rolesData.length,
        users: usersData.length,
        permissions: permissionsData.length,
      });
      
      setRoles(rolesData);
      setUsers(usersData);
      setPermissions(permissionsData);
      setAnalytics(analyticsData);
      setAuditLog(auditData);
      
    } catch (error: any) {
      console.error('Failed to load RBAC data:', error);
      toast.error(`Failed to load data: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (userId: string, roleName: string) => {
    try {
      await supabaseRbacService.assignRole(userId, roleName as AppRole);
      toast.success('Role assigned successfully');
      setIsAssignRoleOpen(false);
      await loadData(); // Refresh data
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign role');
    }
  };

  const handleRevokeRole = async (userId: string, roleName: string) => {
    try {
      await supabaseRbacService.revokeRole(userId, roleName as AppRole);
      toast.success('Role revoked successfully');
      await loadData(); // Refresh data
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke role');
    }
  };

  const handlePreviewPermissions = (user: UserWithRoles) => {
    setSelectedUser(user);
    // Get all permissions for user's roles
    const userRoleDefs = roles.filter(r => user.roles.includes(String(r.name)));
    const allPermissions = new Set<string>();
    userRoleDefs.forEach(role => {
      role.permissions.forEach(p => allPermissions.add(p));
    });
    setPreviewPermissions(Array.from(allPermissions));
    setIsPreviewOpen(true);
  };

  // Bulk sync all employee roles
  const handleBulkSyncRoles = async () => {
    setIsSyncing(true);
    let successCount = 0;
    let failureCount = 0;

    try {
      // Get all active employees from the users list
      const activeUsers = users.filter(u => u.status === 'Active');
      
      toast.info(`Starting role sync for ${activeUsers.length} active employees...`);

      for (const user of activeUsers) {
        try {
          // Get the employee's role from their designation or find from employees table
          const { data: employee } = await supabase
            .from('employees')
            .select('role')
            .eq('id', user.id)
            .single();

          if (employee?.role) {
            // Call the edge function to sync roles
            const { data, error } = await supabase.functions.invoke('sync-employee-roles', {
              body: {
                employeeId: user.id,
                newRole: employee.role
              }
            });

            if (error) {
              console.error(`Failed to sync roles for ${user.full_name}:`, error);
              failureCount++;
            } else {
              console.log(`Synced roles for ${user.full_name}:`, data);
              successCount++;
            }
          } else {
            console.log(`No employee role found for ${user.full_name}`);
            failureCount++;
          }
        } catch (err) {
          console.error(`Error syncing roles for ${user.full_name}:`, err);
          failureCount++;
        }
      }

      // Refresh data after sync
      await loadData();

      if (failureCount === 0) {
        toast.success(`Successfully synced roles for all ${successCount} employees`);
      } else {
        toast.warning(`Synced ${successCount} employees, ${failureCount} failed`);
      }
    } catch (error: any) {
      console.error('Bulk sync failed:', error);
      toast.error(`Bulk sync failed: ${error.message || error}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesRole = roleFilter === 'all' || user.roles.includes(roleFilter);
    return matchesSearch && matchesStatus && matchesRole;
  });

  const getAvailableRoles = (user: UserWithRoles): RoleDefinition[] => {
    return roles.filter(role => !user.roles.includes(String(role.name)));
  };

  // Group permissions by module for display
  const permissionsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading access management data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Access & Roles</h1>
          <p className="text-muted-foreground mt-2">Manage user roles and system permissions</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleBulkSyncRoles}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4 mr-2" />
            )}
            Sync All Roles
          </Button>
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{analytics.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Users with Roles</p>
                  <p className="text-2xl font-bold">{analytics.usersWithRoles}</p>
                </div>
                <Shield className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Roles</p>
                  <p className="text-2xl font-bold">{analytics.totalRoles}</p>
                </div>
                <Key className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Permissions</p>
                  <p className="text-2xl font-bold">{analytics.totalPermissions}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">User Assignments</TabsTrigger>
          <TabsTrigger value="roles">Role Definitions</TabsTrigger>
          <TabsTrigger value="hierarchy" className="flex items-center gap-1">
            <GitBranch className="h-4 w-4" />
            Team Hierarchy
          </TabsTrigger>
          <TabsTrigger value="portal-users" className="flex items-center gap-1">
            <Key className="h-4 w-4" />
            Portal Users
          </TabsTrigger>
          <TabsTrigger value="permissions">Permissions Matrix</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* User Assignments Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                User Role Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Users Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Assigned Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.full_name}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.designation || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length > 0 ? (
                            user.roles.map((role) => {
                              const roleDef = roles.find(r => r.name === role);
                              return (
                                <Badge key={role} variant="outline" className="text-xs">
                                  {roleDef?.displayName || role}
                                  <button
                                    onClick={() => handleRevokeRole(user.id, role)}
                                    className="ml-1 hover:text-destructive"
                                  >
                                    ×
                                  </button>
                                </Badge>
                              );
                            })
                          ) : (
                            <span className="text-muted-foreground text-sm">No roles</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'Active' ? 'default' : 'secondary'}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Dialog open={isAssignRoleOpen && selectedUser?.id === user.id} onOpenChange={setIsAssignRoleOpen}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                                disabled={getAvailableRoles(user).length === 0}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Assign Role to {user.full_name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                  Select a role to assign. Users can have multiple roles.
                                </p>
                                <div className="space-y-2">
                                  {getAvailableRoles(user).map(role => (
                                    <div key={role.id} className="flex items-center justify-between p-3 border rounded">
                                      <div>
                                        <p className="font-medium">{role.displayName}</p>
                                        <p className="text-sm text-muted-foreground">{role.description}</p>
                                      </div>
                                      <Button 
                                        size="sm"
                                        onClick={() => handleAssignRole(user.id, String(role.name))}
                                      >
                                        Assign
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handlePreviewPermissions(user)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No users found matching the filters.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Role Definitions Tab */}
        <TabsContent value="roles">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold">Role Definitions</h3>
              <p className="text-sm text-muted-foreground">System and custom roles with their permissions</p>
            </div>
            <Button onClick={() => setIsCreateRoleOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => {
              const userCount = analytics?.roleDistribution?.[role.name] || 0;
              return (
                <Card key={role.id} className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center">
                        <Shield className="h-5 w-5 mr-2 text-primary" />
                        {role.displayName}
                      </CardTitle>
                      <Badge variant={role.isActive ? "default" : "secondary"}>
                        {role.isSystemRole ? "System" : "Custom"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Permissions:</span>
                      <span className="font-medium">{role.permissions.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Users:</span>
                      <span className="font-medium">{userCount}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setEditingRole(role);
                        setIsEditorOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Permissions
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {/* Create Role Modal */}
          <CreateRoleModal
            open={isCreateRoleOpen}
            onOpenChange={setIsCreateRoleOpen}
            onSuccess={loadData}
          />
          
          {/* Role Permission Editor Modal */}
          {editingRole && (
            <RolePermissionEditor
              role={editingRole}
              allPermissions={permissions}
              isOpen={isEditorOpen}
              onClose={() => {
                setIsEditorOpen(false);
                setEditingRole(null);
              }}
              onSaved={loadData}
            />
          )}
        </TabsContent>

        {/* Team Hierarchy Tab */}
        <TabsContent value="hierarchy">
          <TeamHierarchyView />
        </TabsContent>

        {/* Portal Users Tab */}
        <TabsContent value="portal-users">
          <PortalUserManagement />
        </TabsContent>

        {/* Permissions Matrix Tab */}
        <TabsContent value="permissions">
          {/* Case-Inherited Access Info */}
          <Alert className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-800 dark:text-blue-200">Data Visibility Rule</AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              <strong>Document</strong>, <strong>Task</strong>, and <strong>Hearing</strong> visibility is automatically inherited from <strong>Case visibility scope</strong>.
              Role permissions here only control what <em>actions</em> (view/create/edit/delete) users can perform, not which data they can see.
              <br />
              <span className="text-sm mt-1 block">
                Users can only access documents, tasks, and hearings linked to cases they are authorized to view based on their Data Visibility Scope setting (Own Cases / Team Cases / All Cases).
              </span>
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="h-5 w-5 mr-2" />
                Permissions by Module
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(permissionsByModule).map(([module, perms]) => (
                  <div key={module} className="border rounded-lg p-4">
                    <h3 className="font-semibold capitalize mb-3">{module}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {perms.map((perm) => (
                        <div key={perm.key} className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {perm.action}
                          </Badge>
                          <span className="text-sm text-muted-foreground truncate">
                            {perm.description || perm.key}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="h-5 w-5 mr-2" />
                Audit Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLog.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLog.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.action_type}</TableCell>
                        <TableCell>{entry.entity_type}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {entry.user_id?.slice(0, 8) || 'System'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No RBAC-related audit entries found.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Permissions Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Effective Permissions - {selectedUser?.full_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Roles Summary */}
            <div>
              <h4 className="font-medium mb-2">Assigned Roles</h4>
              <div className="flex flex-wrap gap-2">
                {selectedUser?.roles.map((role) => {
                  const roleDef = roles.find(r => r.name === role);
                  return (
                    <Badge key={role} variant="outline">
                      {roleDef?.displayName || role}
                    </Badge>
                  );
                })}
                {(!selectedUser?.roles || selectedUser.roles.length === 0) && (
                  <span className="text-muted-foreground">No roles assigned</span>
                )}
              </div>
            </div>

            {/* Permissions by Module */}
            <div>
              <h4 className="font-medium mb-4">Effective Permissions ({previewPermissions.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {Object.entries(
                  previewPermissions.reduce((acc, key) => {
                    const [module] = key.split('.');
                    if (!acc[module]) acc[module] = [];
                    acc[module].push(key);
                    return acc;
                  }, {} as Record<string, string[]>)
                ).map(([module, perms]) => (
                  <Card key={module} className="p-4">
                    <h5 className="font-medium capitalize mb-2">{module}</h5>
                    <div className="space-y-1">
                      {perms.map((perm) => (
                        <div key={perm} className="flex items-center">
                          <Badge variant="default" className="text-xs">
                            {perm.split('.')[1]}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
