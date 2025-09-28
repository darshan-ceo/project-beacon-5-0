import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Check, 
  X,
  UserCheck,
  Settings,
  Key,
  History,
  BarChart3,
  ToggleLeft,
  ToggleRight,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { advancedRbacService, type CreateRoleData } from '@/services/advancedRbacService';
import { permissionsResolver } from '@/services/permissionsResolver';
import { useAdvancedRBAC } from '@/hooks/useAdvancedRBAC';
import { type RoleEntity, type PermissionEntity, type PolicyAuditEntry } from '@/persistence/unifiedStore';
import { RoleBuilder } from './RoleBuilder';
import { UserRoleAssignment } from './UserRoleAssignment';
import { PermissionsMatrix } from './PermissionsMatrix';

interface EnhancedUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  status: 'Active' | 'Inactive' | 'Pending';
  lastLogin: string;
}

interface RoleFormData {
  name: string;
  description: string;
  permissions: string[];
}

const mockUsers: EnhancedUser[] = [
  { id: '1', name: 'John Doe', email: 'john@lawfirm.com', roles: ['Admin'], status: 'Active', lastLogin: '2024-01-20 10:30' },
  { id: '2', name: 'Sarah Smith', email: 'sarah@lawfirm.com', roles: ['Manager'], status: 'Active', lastLogin: '2024-01-20 09:15' },
  { id: '3', name: 'Mike Johnson', email: 'mike@lawfirm.com', roles: ['Staff'], status: 'Active', lastLogin: '2024-01-19 16:45' },
  { id: '4', name: 'Lisa Wilson', email: 'lisa@client.com', roles: ['ReadOnly'], status: 'Pending', lastLogin: 'Never' }
];

export const RBACManagement: React.FC = () => {
  const { enforcementEnabled, toggleEnforcement, refreshPermissions } = useAdvancedRBAC();
  
  // State
  const [selectedRole, setSelectedRole] = useState<RoleEntity | null>(null);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [roles, setRoles] = useState<RoleEntity[]>([]);
  const [permissions, setPermissions] = useState<PermissionEntity[]>([]);
  const [users, setUsers] = useState(mockUsers);
  const [auditLog, setAuditLog] = useState<PolicyAuditEntry[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [roleForm, setRoleForm] = useState<RoleFormData>({ name: '', description: '', permissions: [] });

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading RBAC data...');
      
      const [rolesData, permissionsData, auditData, analyticsData] = await Promise.all([
        advancedRbacService.getAllRoles(),
        advancedRbacService.getAllPermissions(),
        advancedRbacService.getAuditLog(50),
        advancedRbacService.getRoleAnalytics()
      ]);
      
      console.log('📊 RBAC Data loaded:', {
        roles: rolesData.length,
        permissions: permissionsData.length,
        auditEntries: auditData.length
      });
      
      setRoles(rolesData);
      setPermissions(permissionsData);
      setAuditLog(auditData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load RBAC data:', error);
      toast.error(`Failed to load RBAC data: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (permissionId: string) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const handleCreateRole = async () => {
    try {
      const newRole = await advancedRbacService.createRole(roleForm);
      setRoles([...roles, newRole]);
      toast.success(`Role "${roleForm.name}" created successfully`);
      setIsCreateRoleOpen(false);
      setRoleForm({ name: '', description: '', permissions: [] });
    } catch (error) {
      toast.error(error.message || "Failed to create role");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading RBAC data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced RBAC Management</h1>
          <p className="text-muted-foreground mt-2">Manage roles, permissions, and user access control</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={toggleEnforcement}>
            {enforcementEnabled ? <ToggleRight className="h-4 w-4 mr-2" /> : <ToggleLeft className="h-4 w-4 mr-2" />}
            {enforcementEnabled ? 'Enforcement ON' : 'DEMO Mode'}
          </Button>
          <Button variant="outline" onClick={refreshPermissions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="roles">Roles Management</TabsTrigger>
          <TabsTrigger value="users">User Assignment</TabsTrigger>
          <TabsTrigger value="permissions">Permissions Matrix</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          {isCreateRoleOpen || isEditRoleOpen ? (
            <RoleBuilder
              role={selectedRole}
              permissions={permissions}
              onSave={(role) => {
                setRoles(prev => 
                  selectedRole 
                    ? prev.map(r => r.id === role.id ? role : r)
                    : [...prev, role]
                );
                setIsCreateRoleOpen(false);
                setIsEditRoleOpen(false);
                setSelectedRole(null);
              }}
              onCancel={() => {
                setIsCreateRoleOpen(false);
                setIsEditRoleOpen(false);
                setSelectedRole(null);
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setIsCreateRoleOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Role
                </Button>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {roles.map((role) => (
                  <Card key={role.id} className="h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center">
                          <Shield className="h-5 w-5 mr-2 text-primary" />
                          {role.name}
                        </CardTitle>
                        <Badge variant={role.isActive ? "default" : "secondary"}>
                          {role.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Permissions:</span>
                        <span className="font-medium">{role.permissions.length}</span>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            setSelectedRole(role);
                            setIsEditRoleOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="users">
          <UserRoleAssignment
            users={users}
            roles={roles}
            onUserUpdate={setUsers}
          />
        </TabsContent>

        <TabsContent value="permissions">
          <PermissionsMatrix
            roles={roles}
            permissions={permissions}
            onRoleUpdate={(updatedRole) => {
              setRoles(prev => prev.map(r => r.id === updatedRole.id ? updatedRole : r));
            }}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Role Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{analytics.totalRoles}</div>
                    <div className="text-sm text-muted-foreground">Total Roles</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{analytics.activeRoles}</div>
                    <div className="text-sm text-muted-foreground">Active Roles</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{analytics.systemRoles}</div>
                    <div className="text-sm text-muted-foreground">System Roles</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{analytics.totalAssignments}</div>
                    <div className="text-sm text-muted-foreground">Assignments</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">Loading analytics...</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.action}</TableCell>
                      <TableCell>{entry.actorId}</TableCell>
                      <TableCell>{entry.entityType}</TableCell>
                      <TableCell>{new Date(entry.timestamp).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};