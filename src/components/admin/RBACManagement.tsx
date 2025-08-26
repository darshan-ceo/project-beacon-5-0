import React, { useState } from 'react';
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
  Key
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
import { toast } from '@/hooks/use-toast';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  createdAt: string;
  isActive: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive' | 'Pending';
  lastLogin: string;
}

interface Permission {
  id: string;
  name: string;
  category: string;
  description: string;
}

const mockRoles: Role[] = [
  {
    id: '1',
    name: 'Admin',
    description: 'Full system access with all administrative privileges',
    permissions: ['user_management', 'role_management', 'system_settings', 'audit_logs'],
    userCount: 2,
    createdAt: '2024-01-15',
    isActive: true
  },
  {
    id: '2',
    name: 'Partner/CA',
    description: 'Senior legal professional with client and case management access',
    permissions: ['case_management', 'client_management', 'document_access', 'task_assignment'],
    userCount: 8,
    createdAt: '2024-01-15',
    isActive: true
  },
  {
    id: '3',
    name: 'Staff',
    description: 'Legal staff with limited access to assigned cases and tasks',
    permissions: ['case_view', 'document_view', 'task_management'],
    userCount: 15,
    createdAt: '2024-01-15',
    isActive: true
  },
  {
    id: '4',
    name: 'Client',
    description: 'Client access to their own cases and documents',
    permissions: ['own_case_view', 'own_document_view'],
    userCount: 45,
    createdAt: '2024-01-15',
    isActive: true
  }
];

const mockUsers: User[] = [
  { id: '1', name: 'John Doe', email: 'john@lawfirm.com', role: 'Admin', status: 'Active', lastLogin: '2024-01-20 10:30' },
  { id: '2', name: 'Sarah Smith', email: 'sarah@lawfirm.com', role: 'Partner/CA', status: 'Active', lastLogin: '2024-01-20 09:15' },
  { id: '3', name: 'Mike Johnson', email: 'mike@lawfirm.com', role: 'Staff', status: 'Active', lastLogin: '2024-01-19 16:45' },
  { id: '4', name: 'Lisa Wilson', email: 'lisa@client.com', role: 'Client', status: 'Pending', lastLogin: 'Never' }
];

const mockPermissions: Permission[] = [
  { id: '1', name: 'user_management', category: 'Administration', description: 'Create, edit, and delete user accounts' },
  { id: '2', name: 'role_management', category: 'Administration', description: 'Manage roles and permissions' },
  { id: '3', name: 'system_settings', category: 'Administration', description: 'Configure system parameters' },
  { id: '4', name: 'audit_logs', category: 'Administration', description: 'View system audit logs' },
  { id: '5', name: 'case_management', category: 'Legal', description: 'Full case management access' },
  { id: '6', name: 'client_management', category: 'Legal', description: 'Manage client information' },
  { id: '7', name: 'document_access', category: 'Documents', description: 'Access all documents' },
  { id: '8', name: 'task_assignment', category: 'Tasks', description: 'Assign and manage tasks' }
];

export const RBACManagement: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({ name: '', description: '', permissions: [] as string[] });

  const handleCreateRole = () => {
    toast({
      title: "Role Created",
      description: `Role "${roleForm.name}" has been created successfully.`,
    });
    setIsCreateRoleOpen(false);
    setRoleForm({ name: '', description: '', permissions: [] });
  };

  const handleEditRole = () => {
    toast({
      title: "Role Updated",
      description: `Role "${roleForm.name}" has been updated successfully.`,
    });
    setIsEditRoleOpen(false);
    setSelectedRole(null);
  };

  const handleTogglePermission = (permissionId: string) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RBAC Management</h1>
          <p className="text-muted-foreground mt-2">Manage roles, permissions, and user access control</p>
        </div>
        <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="roleName">Role Name</Label>
                <Input
                  id="roleName"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter role name"
                />
              </div>
              <div>
                <Label htmlFor="roleDescription">Description</Label>
                <Textarea
                  id="roleDescription"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter role description"
                />
              </div>
              <div>
                <Label>Permissions</Label>
                <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                  {mockPermissions.map((permission) => (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <Switch
                        checked={roleForm.permissions.includes(permission.id)}
                        onCheckedChange={() => handleTogglePermission(permission.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{permission.name}</p>
                        <p className="text-xs text-muted-foreground">{permission.description}</p>
                      </div>
                      <Badge variant="outline">{permission.category}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateRoleOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateRole}>Create Role</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="roles">Roles Management</TabsTrigger>
          <TabsTrigger value="users">User Assignment</TabsTrigger>
          <TabsTrigger value="permissions">Permissions Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mockRoles.map((role) => (
              <motion.div
                key={role.id}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full">
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
                      <span className="text-muted-foreground">Users:</span>
                      <span className="font-medium">{role.userCount}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Permissions:</span>
                      <span className="font-medium">{role.permissions.length}</span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          setSelectedRole(role);
                          setRoleForm({
                            name: role.name,
                            description: role.description,
                            permissions: role.permissions
                          });
                          setIsEditRoleOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                User Role Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'Active' ? 'default' : user.status === 'Pending' ? 'secondary' : 'destructive'}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.lastLogin}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button variant="outline" size="sm">
                            <UserCheck className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="h-5 w-5 mr-2" />
                Permissions Matrix
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Permission</th>
                      {mockRoles.map((role) => (
                        <th key={role.id} className="text-center p-2 min-w-[100px]">
                          {role.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mockPermissions.map((permission) => (
                      <tr key={permission.id} className="border-b">
                        <td className="p-2">
                          <div>
                            <p className="font-medium">{permission.name}</p>
                            <p className="text-xs text-muted-foreground">{permission.description}</p>
                          </div>
                        </td>
                        {mockRoles.map((role) => (
                          <td key={role.id} className="text-center p-2">
                            {role.permissions.includes(permission.id) ? (
                              <Check className="h-4 w-4 text-green-600 mx-auto" />
                            ) : (
                              <X className="h-4 w-4 text-gray-400 mx-auto" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Role Dialog */}
      <Dialog open={isEditRoleOpen} onOpenChange={setIsEditRoleOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Role: {selectedRole?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editRoleName">Role Name</Label>
              <Input
                id="editRoleName"
                value={roleForm.name}
                onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter role name"
              />
            </div>
            <div>
              <Label htmlFor="editRoleDescription">Description</Label>
              <Textarea
                id="editRoleDescription"
                value={roleForm.description}
                onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter role description"
              />
            </div>
            <div>
              <Label>Permissions</Label>
              <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                {mockPermissions.map((permission) => (
                  <div key={permission.id} className="flex items-center space-x-2">
                    <Switch
                      checked={roleForm.permissions.includes(permission.id)}
                      onCheckedChange={() => handleTogglePermission(permission.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{permission.name}</p>
                      <p className="text-xs text-muted-foreground">{permission.description}</p>
                    </div>
                    <Badge variant="outline">{permission.category}</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditRoleOpen(false)}>Cancel</Button>
              <Button onClick={handleEditRole}>Update Role</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};