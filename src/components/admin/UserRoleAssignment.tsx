/**
 * User Role Assignment Component - Multi-role support
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Trash2, Eye, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { advancedRbacService } from '@/services/advancedRbacService';
import { permissionsResolver } from '@/services/permissionsResolver';
import { type RoleEntity } from '@/persistence/unifiedStore';

interface EnhancedUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  status: 'Active' | 'Inactive' | 'Pending';
  lastLogin: string;
}

interface UserRoleAssignmentProps {
  users: EnhancedUser[];
  roles: RoleEntity[];
  onUserUpdate: (users: EnhancedUser[]) => void;
}

export const UserRoleAssignment: React.FC<UserRoleAssignmentProps> = ({
  users,
  roles,
  onUserUpdate
}) => {
  const [selectedUser, setSelectedUser] = useState<EnhancedUser | null>(null);
  const [isAssignRoleOpen, setIsAssignRoleOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [userPermissions, setUserPermissions] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesRole = roleFilter === 'all' || user.roles.includes(roleFilter);
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const handleAssignRole = async (userId: string, roleId: string) => {
    try {
      await advancedRbacService.assignRole({ userId, roleId });
      
      // Update user in the list
      const updatedUsers = users.map(user => 
        user.id === userId 
          ? { ...user, roles: [...user.roles, roleId] }
          : user
      );
      onUserUpdate(updatedUsers);
      
      toast.success('Role assigned successfully');
      setIsAssignRoleOpen(false);
    } catch (error) {
      console.error('Failed to assign role:', error);
      toast.error(error.message || 'Failed to assign role');
    }
  };

  const handleRevokeRole = async (userId: string, roleId: string) => {
    try {
      await advancedRbacService.revokeRole(userId, roleId);
      
      // Update user in the list
      const updatedUsers = users.map(user => 
        user.id === userId 
          ? { ...user, roles: user.roles.filter(r => r !== roleId) }
          : user
      );
      onUserUpdate(updatedUsers);
      
      toast.success('Role revoked successfully');
    } catch (error) {
      console.error('Failed to revoke role:', error);
      toast.error(error.message || 'Failed to revoke role');
    }
  };

  const handlePreviewPermissions = async (user: EnhancedUser) => {
    try {
      setLoading(true);
      setSelectedUser(user);
      
      const permissions = await permissionsResolver.resolveUserPermissions(user.id);
      setUserPermissions(permissions);
      setIsPreviewOpen(true);
    } catch (error) {
      console.error('Failed to load user permissions:', error);
      toast.error('Failed to load user permissions');
    } finally {
      setLoading(false);
    }
  };

  const getRoleName = (roleId: string): string => {
    const role = roles.find(r => r.id === roleId);
    return role?.name || roleId;
  };

  const getAvailableRoles = (user: EnhancedUser): RoleEntity[] => {
    return roles.filter(role => !user.roles.includes(role.id) && role.isActive);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            User Role Assignment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((roleId) => (
                        <Badge key={roleId} variant="outline" className="text-xs">
                          {getRoleName(roleId)}
                          <button
                            onClick={() => handleRevokeRole(user.id, roleId)}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                      {user.roles.length === 0 && (
                        <span className="text-muted-foreground text-sm">No roles assigned</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      user.status === 'Active' ? 'default' : 
                      user.status === 'Pending' ? 'secondary' : 'destructive'
                    }>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.lastLogin}
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
                            <DialogTitle>Assign Role to {user.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm text-muted-foreground mb-4">
                                Select a role to assign to this user. Users can have multiple roles.
                              </p>
                              <div className="space-y-2">
                                {getAvailableRoles(user).map(role => (
                                  <div key={role.id} className="flex items-center justify-between p-3 border rounded">
                                    <div>
                                      <p className="font-medium">{role.name}</p>
                                      <p className="text-sm text-muted-foreground">{role.description}</p>
                                    </div>
                                    <Button 
                                      size="sm"
                                      onClick={() => handleAssignRole(user.id, role.id)}
                                    >
                                      Assign
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePreviewPermissions(user)}
                        disabled={loading}
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
              No users found matching the current filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Effective Permissions - {selectedUser?.name}
            </DialogTitle>
          </DialogHeader>
          
          {userPermissions && (
            <div className="space-y-6">
              {/* Roles Summary */}
              <div>
                <h4 className="font-medium mb-2">Assigned Roles</h4>
                <div className="flex flex-wrap gap-2">
                  {userPermissions.roles.map((role: RoleEntity) => (
                    <Badge key={role.id} variant="outline">
                      {role.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Permissions Matrix */}
              <div>
                <h4 className="font-medium mb-4">Effective Permissions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(
                    userPermissions.permissions.reduce((acc: any, perm: any) => {
                      if (!acc[perm.resource]) acc[perm.resource] = [];
                      acc[perm.resource].push(perm);
                      return acc;
                    }, {})
                  ).map(([resource, perms]: [string, any[]]) => (
                    <Card key={resource} className="p-4">
                      <h5 className="font-medium capitalize mb-2">{resource}</h5>
                      <div className="space-y-1">
                        {perms.map((perm: any) => (
                          <div key={`${perm.resource}.${perm.action}`} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{perm.action}</span>
                            <Badge variant={perm.allowed ? "default" : "destructive"}>
                              {perm.allowed ? "Allow" : "Deny"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                Resolved at: {new Date(userPermissions.resolvedAt).toLocaleString()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};