/**
 * Role Builder Component - Advanced role creation and editing
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Save, X, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { advancedRbacService, type CreateRoleData } from '@/services/advancedRbacService';
import { type RoleEntity, type PermissionEntity } from '@/persistence/unifiedStore';

interface RoleBuilderProps {
  role?: RoleEntity | null;
  permissions: PermissionEntity[];
  onSave: (role: RoleEntity) => void;
  onCancel: () => void;
}

interface PermissionMatrix {
  [category: string]: {
    [resource: string]: {
      [action: string]: PermissionEntity;
    };
  };
}

export const RoleBuilder: React.FC<RoleBuilderProps> = ({
  role,
  permissions,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<CreateRoleData>({
    name: '',
    description: '',
    permissions: [],
    isActive: true
  });
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix>({});
  const [saving, setSaving] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isActive: role.isActive
      });
      setSelectedPermissions(new Set(role.permissions));
    } else {
      setFormData({
        name: '',
        description: '',
        permissions: [],
        isActive: true
      });
      setSelectedPermissions(new Set());
    }
  }, [role]);

  // Build permission matrix
  useEffect(() => {
    const matrix: PermissionMatrix = {};
    
    permissions.forEach(perm => {
      if (!matrix[perm.category]) {
        matrix[perm.category] = {};
      }
      if (!matrix[perm.category][perm.resource]) {
        matrix[perm.category][perm.resource] = {};
      }
      matrix[perm.category][perm.resource][perm.action] = perm;
    });

    setPermissionMatrix(matrix);
  }, [permissions]);

  const handlePermissionToggle = (permissionId: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
    setFormData(prev => ({
      ...prev,
      permissions: Array.from(newSelected)
    }));
  };

  const handleResourceToggle = (resource: string, category: string) => {
    const resourcePerms = Object.values(permissionMatrix[category]?.[resource] || {});
    const allSelected = resourcePerms.every(perm => selectedPermissions.has(perm.id));
    
    const newSelected = new Set(selectedPermissions);
    resourcePerms.forEach(perm => {
      if (allSelected) {
        newSelected.delete(perm.id);
      } else {
        newSelected.add(perm.id);
      }
    });
    
    setSelectedPermissions(newSelected);
    setFormData(prev => ({
      ...prev,
      permissions: Array.from(newSelected)
    }));
  };

  const handleCategoryToggle = (category: string) => {
    const categoryPerms = Object.values(permissionMatrix[category] || {})
      .flatMap(resource => Object.values(resource));
    const allSelected = categoryPerms.every(perm => selectedPermissions.has(perm.id));
    
    const newSelected = new Set(selectedPermissions);
    categoryPerms.forEach(perm => {
      if (allSelected) {
        newSelected.delete(perm.id);
      } else {
        newSelected.add(perm.id);
      }
    });
    
    setSelectedPermissions(newSelected);
    setFormData(prev => ({
      ...prev,
      permissions: Array.from(newSelected)
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    try {
      setSaving(true);
      
      let savedRole: RoleEntity;
      if (role) {
        savedRole = await advancedRbacService.updateRole(role.id, formData);
        toast.success('Role updated successfully');
      } else {
        savedRole = await advancedRbacService.createRole(formData);
        toast.success('Role created successfully');
      }
      
      onSave(savedRole);
    } catch (error) {
      console.error('Failed to save role:', error);
      if (error.message && error.message.includes('already exists')) {
        toast.error(`Role "${formData.name}" already exists. Please choose a different name.`);
      } else {
        toast.error(error.message || 'Failed to save role');
      }
    } finally {
      setSaving(false);
    }
  };

  const actionHierarchy = ['read', 'write', 'delete', 'admin'];
  const actionColors = {
    read: 'bg-blue-500/10 text-blue-700 border-blue-200',
    write: 'bg-green-500/10 text-green-700 border-green-200',
    delete: 'bg-orange-500/10 text-orange-700 border-orange-200',
    admin: 'bg-red-500/10 text-red-700 border-red-200'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">
              {role ? 'Edit Role' : 'Create Role'}
            </h2>
            <p className="text-muted-foreground">
              {role ? 'Modify role permissions and settings' : 'Build a new role with specific permissions'}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Role'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role Information */}
        <Card>
          <CardHeader>
            <CardTitle>Role Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="roleName">Role Name *</Label>
              <Input
                id="roleName"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter role name"
                disabled={role?.isSystemRole}
              />
              {role?.isSystemRole && (
                <p className="text-xs text-muted-foreground mt-1">
                  System role names cannot be changed
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="roleDescription">Description</Label>
              <Textarea
                id="roleDescription"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter role description"
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label>Active Role</Label>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Selected Permissions</span>
                <Badge variant="secondary">{selectedPermissions.size}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Use the permission matrix to select specific permissions for this role.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Permission Matrix */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Permission Matrix</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select permissions by category, resource, or individual actions
              </p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="matrix" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="matrix">Matrix View</TabsTrigger>
                  <TabsTrigger value="list">List View</TabsTrigger>
                </TabsList>

                <TabsContent value="matrix" className="space-y-6">
                  {Object.entries(permissionMatrix).map(([category, resources]) => {
                    const categoryPerms = Object.values(resources).flatMap(r => Object.values(r));
                    const allSelected = categoryPerms.every(p => selectedPermissions.has(p.id));
                    const someSelected = categoryPerms.some(p => selectedPermissions.has(p.id));

                    return (
                      <motion.div
                        key={category}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-lg p-4 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Switch
                              checked={allSelected}
                              onCheckedChange={() => handleCategoryToggle(category)}
                              className={someSelected && !allSelected ? 'opacity-50' : ''}
                            />
                            <h3 className="font-semibold text-lg">{category}</h3>
                            <Badge variant={allSelected ? "default" : someSelected ? "secondary" : "outline"}>
                              {categoryPerms.filter(p => selectedPermissions.has(p.id)).length} / {categoryPerms.length}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {Object.entries(resources).map(([resource, actions]) => {
                            const resourcePerms = Object.values(actions);
                            const resourceAllSelected = resourcePerms.every(p => selectedPermissions.has(p.id));
                            const resourceSomeSelected = resourcePerms.some(p => selectedPermissions.has(p.id));

                            return (
                              <div key={resource} className="pl-6 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      checked={resourceAllSelected}
                                      onCheckedChange={() => handleResourceToggle(resource, category)}
                                      className={resourceSomeSelected && !resourceAllSelected ? 'opacity-50' : ''}
                                    />
                                    <span className="font-medium capitalize">{resource}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {resourcePerms.filter(p => selectedPermissions.has(p.id)).length} / {resourcePerms.length}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2 pl-6">
                                  {actionHierarchy.map(action => {
                                    const permission = actions[action];
                                    if (!permission) return null;

                                    const isSelected = selectedPermissions.has(permission.id);
                                    
                                    return (
                                      <button
                                        key={action}
                                        onClick={() => handlePermissionToggle(permission.id)}
                                        className={`px-3 py-1 rounded-full text-xs border-2 transition-all ${
                                          isSelected 
                                            ? actionColors[action as keyof typeof actionColors]
                                            : 'bg-muted text-muted-foreground border-muted hover:border-primary/20'
                                        }`}
                                      >
                                        {action}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })}
                </TabsContent>

                <TabsContent value="list" className="space-y-2">
                  <div className="max-h-96 overflow-y-auto space-y-1">
                    {permissions.map(permission => (
                      <div
                        key={permission.id}
                        className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50"
                      >
                        <Switch
                          checked={selectedPermissions.has(permission.id)}
                          onCheckedChange={() => handlePermissionToggle(permission.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm">{permission.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {permission.category}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${actionColors[permission.action as keyof typeof actionColors]}`}
                            >
                              {permission.action}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {permission.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};