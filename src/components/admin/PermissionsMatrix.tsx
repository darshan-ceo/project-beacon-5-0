/**
 * Permissions Matrix Component
 * Displays comprehensive permissions overview for all roles
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, Check, X, AlertTriangle, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { type RoleEntity, type PermissionEntity } from '@/persistence/unifiedStore';
import { advancedRbacService } from '@/services/advancedRbacService';

interface PermissionsMatrixProps {
  roles: RoleEntity[];
  permissions: PermissionEntity[];
  onRoleUpdate: (role: RoleEntity) => void;
  onRefresh: () => void;
}

interface MatrixData {
  permission: PermissionEntity;
  rolePermissions: Record<string, boolean>;
}

export const PermissionsMatrix: React.FC<PermissionsMatrixProps> = ({
  roles,
  permissions,
  onRoleUpdate,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'matrix' | 'grouped'>('matrix');
  const [showSystemRoles, setShowSystemRoles] = useState(true);
  const [loading, setLoading] = useState(false);

  // Get unique categories and resources
  const categories = useMemo(() => {
    const cats = Array.from(new Set(permissions.map(p => p.category))).sort();
    return cats;
  }, [permissions]);

  const resources = useMemo(() => {
    const res = Array.from(new Set(permissions.map(p => p.resource))).sort();
    return res;
  }, [permissions]);

  // Filter data
  const filteredRoles = useMemo(() => {
    return roles.filter(role => {
      if (!showSystemRoles && role.isSystemRole) return false;
      return role.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [roles, searchTerm, showSystemRoles]);

  const filteredPermissions = useMemo(() => {
    return permissions.filter(permission => {
      const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           permission.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || permission.category === categoryFilter;
      const matchesResource = resourceFilter === 'all' || permission.resource === resourceFilter;
      
      return matchesSearch && matchesCategory && matchesResource;
    });
  }, [permissions, searchTerm, categoryFilter, resourceFilter]);

  // Build matrix data
  const matrixData = useMemo((): MatrixData[] => {
    return filteredPermissions.map(permission => {
      const rolePermissions: Record<string, boolean> = {};
      
      filteredRoles.forEach(role => {
        rolePermissions[role.id] = role.permissions.includes(permission.id);
      });

      return {
        permission,
        rolePermissions
      };
    });
  }, [filteredPermissions, filteredRoles]);

  // Group permissions by category for grouped view
  const groupedData = useMemo(() => {
    const groups: Record<string, MatrixData[]> = {};
    
    matrixData.forEach(data => {
      const category = data.permission.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(data);
    });

    return groups;
  }, [matrixData]);

  const handlePermissionToggle = async (roleId: string, permissionId: string, currentValue: boolean) => {
    try {
      setLoading(true);
      const role = roles.find(r => r.id === roleId);
      if (!role) throw new Error('Role not found');

      let updatedPermissions: string[];
      if (currentValue) {
        // Remove permission
        updatedPermissions = role.permissions.filter(p => p !== permissionId);
      } else {
        // Add permission
        updatedPermissions = [...role.permissions, permissionId];
      }

      const updatedRole = await advancedRbacService.updateRole(roleId, {
        permissions: updatedPermissions
      });

      onRoleUpdate(updatedRole);
      toast.success(`Permission ${currentValue ? 'removed from' : 'added to'} ${role.name}`);
    } catch (error) {
      console.error('Failed to toggle permission:', error);
      toast.error('Failed to update permission');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPermissionUpdate = async (roleId: string, permissionIds: string[], grant: boolean) => {
    try {
      setLoading(true);
      const role = roles.find(r => r.id === roleId);
      if (!role) throw new Error('Role not found');

      let updatedPermissions = [...role.permissions];
      
      if (grant) {
        // Add permissions that aren't already present
        permissionIds.forEach(permId => {
          if (!updatedPermissions.includes(permId)) {
            updatedPermissions.push(permId);
          }
        });
      } else {
        // Remove permissions
        updatedPermissions = updatedPermissions.filter(p => !permissionIds.includes(p));
      }

      const updatedRole = await advancedRbacService.updateRole(roleId, {
        permissions: updatedPermissions
      });

      onRoleUpdate(updatedRole);
      toast.success(`Bulk permissions ${grant ? 'granted to' : 'revoked from'} ${role.name}`);
    } catch (error) {
      console.error('Failed to update bulk permissions:', error);
      toast.error('Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  const exportMatrix = () => {
    const csvData = [
      ['Permission', 'Category', 'Resource', 'Action', ...filteredRoles.map(r => r.name)],
      ...matrixData.map(data => [
        data.permission.name,
        data.permission.category,
        data.permission.resource,
        data.permission.action,
        ...filteredRoles.map(role => data.rolePermissions[role.id] ? 'Yes' : 'No')
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `permissions-matrix-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderMatrixView = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-80 sticky left-0 bg-background z-10">Permission</TableHead>
            <TableHead className="w-32">Category</TableHead>
            <TableHead className="w-32">Resource</TableHead>
            <TableHead className="w-24">Action</TableHead>
            {filteredRoles.map(role => (
              <TableHead key={role.id} className="text-center min-w-32">
                <div className="space-y-1">
                  <div className="font-medium">{role.name}</div>
                  <Badge variant={role.isSystemRole ? 'default' : 'outline'} className="text-xs">
                    {role.isSystemRole ? 'System' : 'Custom'}
                  </Badge>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {matrixData.map((data) => (
            <TableRow key={data.permission.id}>
              <TableCell className="sticky left-0 bg-background z-10">
                <div className="space-y-1">
                  <div className="font-medium">{data.permission.name}</div>
                  <div className="text-sm text-muted-foreground">{data.permission.description}</div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{data.permission.category}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{data.permission.resource}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={
                  data.permission.action === 'admin' ? 'destructive' :
                  data.permission.action === 'delete' ? 'destructive' :
                  data.permission.action === 'write' ? 'default' : 'secondary'
                }>
                  {data.permission.action}
                </Badge>
              </TableCell>
              {filteredRoles.map(role => (
                <TableCell key={role.id} className="text-center">
                  <Checkbox
                    checked={data.rolePermissions[role.id]}
                    onCheckedChange={() => 
                      handlePermissionToggle(role.id, data.permission.id, data.rolePermissions[role.id])
                    }
                    disabled={loading || role.isSystemRole}
                    className="mx-auto"
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderGroupedView = () => (
    <div className="space-y-6">
      {Object.entries(groupedData).map(([category, categoryPermissions]) => (
        <Card key={category}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-primary" />
                {category}
              </CardTitle>
              <Badge variant="outline">{categoryPermissions.length} permissions</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Action</TableHead>
                    {filteredRoles.map(role => (
                      <TableHead key={role.id} className="text-center">
                        {role.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryPermissions.map((data) => (
                    <TableRow key={data.permission.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{data.permission.name}</div>
                          <div className="text-sm text-muted-foreground">{data.permission.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{data.permission.resource}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          data.permission.action === 'admin' ? 'destructive' :
                          data.permission.action === 'delete' ? 'destructive' :
                          data.permission.action === 'write' ? 'default' : 'secondary'
                        }>
                          {data.permission.action}
                        </Badge>
                      </TableCell>
                      {filteredRoles.map(role => (
                        <TableCell key={role.id} className="text-center">
                          <Checkbox
                            checked={data.rolePermissions[role.id]}
                            onCheckedChange={() => 
                              handlePermissionToggle(role.id, data.permission.id, data.rolePermissions[role.id])
                            }
                            disabled={loading || role.isSystemRole}
                            className="mx-auto"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center">
              <Shield className="h-5 w-5 mr-2 text-primary" />
              Permissions Matrix
            </h3>
            <p className="text-sm text-muted-foreground">
              Comprehensive view of role permissions and bulk management
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={exportMatrix}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Input
            placeholder="Search permissions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="col-span-2"
          />
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={resourceFilter} onValueChange={setResourceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Resource" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              {resources.map(res => (
                <SelectItem key={res} value={res}>{res}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-2">
            <Switch
              checked={viewMode === 'grouped'}
              onCheckedChange={(checked) => setViewMode(checked ? 'grouped' : 'matrix')}
            />
            <span className="text-sm">Grouped</span>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={showSystemRoles}
              onCheckedChange={setShowSystemRoles}
            />
            <span className="text-sm">System Roles</span>
          </div>
        </div>
      </div>

      {/* Matrix Content */}
      <Card>
        <CardContent className="p-0">
          {matrixData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-4" />
              <p>No permissions found matching the current filters.</p>
            </div>
          ) : (
            viewMode === 'matrix' ? renderMatrixView() : renderGroupedView()
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{filteredRoles.length}</div>
            <div className="text-sm text-muted-foreground">Active Roles</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{filteredPermissions.length}</div>
            <div className="text-sm text-muted-foreground">Permissions</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{categories.length}</div>
            <div className="text-sm text-muted-foreground">Categories</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{resources.length}</div>
            <div className="text-sm text-muted-foreground">Resources</div>
          </div>
        </Card>
      </div>
    </div>
  );
};