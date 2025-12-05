import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabaseRbacService, type RoleDefinition, type Permission, type AppRole } from '@/services/supabaseRbacService';

interface RolePermissionEditorProps {
  role: RoleDefinition;
  allPermissions: Permission[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// Group permissions by module
const groupPermissionsByModule = (permissions: Permission[]): Record<string, Permission[]> => {
  return permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);
};

// Module display names
const MODULE_LABELS: Record<string, string> = {
  cases: 'Cases',
  clients: 'Clients',
  'client-groups': 'Client Groups',
  tasks: 'Tasks',
  documents: 'Documents',
  hearings: 'Hearings',
  employees: 'Employees',
  courts: 'Courts',
  judges: 'Judges',
  gst: 'GST Compliance',
  compliance: 'Compliance',
  dashboard: 'Dashboard',
  reports: 'Reports',
  settings: 'Settings',
  statutory: 'Statutory Deadlines',
  rbac: 'Access & Roles',
  notifications: 'Notifications',
};

// Action display names
const ACTION_LABELS: Record<string, string> = {
  read: 'View',
  create: 'Create',
  update: 'Edit',
  delete: 'Delete',
  manage: 'Manage',
  export: 'Export',
  customize: 'Customize',
};

export const RolePermissionEditor: React.FC<RolePermissionEditorProps> = ({
  role,
  allPermissions,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize selected permissions from role
  useEffect(() => {
    if (isOpen && role) {
      setSelectedPermissions(new Set(role.permissions));
      setHasChanges(false);
    }
  }, [isOpen, role]);

  const permissionsByModule = groupPermissionsByModule(allPermissions);

  const togglePermission = (permKey: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permKey)) {
      newSelected.delete(permKey);
    } else {
      newSelected.add(permKey);
    }
    setSelectedPermissions(newSelected);
    setHasChanges(true);
  };

  const toggleModule = (module: string, perms: Permission[]) => {
    const moduleKeys = perms.map(p => p.key);
    const allSelected = moduleKeys.every(k => selectedPermissions.has(k));
    
    const newSelected = new Set(selectedPermissions);
    if (allSelected) {
      moduleKeys.forEach(k => newSelected.delete(k));
    } else {
      moduleKeys.forEach(k => newSelected.add(k));
    }
    setSelectedPermissions(newSelected);
    setHasChanges(true);
  };

  const isModuleFullySelected = (perms: Permission[]): boolean => {
    return perms.every(p => selectedPermissions.has(p.key));
  };

  const isModulePartiallySelected = (perms: Permission[]): boolean => {
    const selectedCount = perms.filter(p => selectedPermissions.has(p.key)).length;
    return selectedCount > 0 && selectedCount < perms.length;
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      // Pass role.name as string - service handles both system and custom roles
      await supabaseRbacService.updateRolePermissions(String(role.name), Array.from(selectedPermissions));
      toast.success(`Permissions updated for ${role.displayName}`);
      onSaved();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAll = () => {
    setSelectedPermissions(new Set(allPermissions.map(p => p.key)));
    setHasChanges(true);
  };

  const handleClearAll = () => {
    setSelectedPermissions(new Set());
    setHasChanges(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Edit Permissions: {role.displayName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b">
          <div className="text-sm text-muted-foreground">
            {role.description}
          </div>
          <Badge variant="outline">
            {selectedPermissions.size} / {allPermissions.length} selected
          </Badge>
        </div>

        <div className="flex gap-2 py-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearAll}>
            Clear All
          </Button>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4 pb-4">
            {Object.entries(permissionsByModule).map(([module, perms]) => (
              <div key={module} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isModuleFullySelected(perms)}
                      ref={(el) => {
                        if (el) {
                          (el as any).indeterminate = isModulePartiallySelected(perms);
                        }
                      }}
                      onCheckedChange={() => toggleModule(module, perms)}
                    />
                    <h4 className="font-semibold">
                      {MODULE_LABELS[module] || module.charAt(0).toUpperCase() + module.slice(1)}
                    </h4>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {perms.filter(p => selectedPermissions.has(p.key)).length}/{perms.length}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {perms.map((perm) => (
                    <label
                      key={perm.key}
                      className="flex items-center gap-2 cursor-pointer text-sm hover:bg-muted/50 p-2 rounded"
                    >
                      <Checkbox
                        checked={selectedPermissions.has(perm.key)}
                        onCheckedChange={() => togglePermission(perm.key)}
                      />
                      <span className={selectedPermissions.has(perm.key) ? 'text-foreground' : 'text-muted-foreground'}>
                        {ACTION_LABELS[perm.action] || perm.action}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
