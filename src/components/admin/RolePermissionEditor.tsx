import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Loader2, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

// Module metadata with descriptions and examples for better clarity
const MODULE_METADATA: Record<string, { label: string; description: string; example: string }> = {
  cases: {
    label: 'Case Management',
    description: 'Legal matters from intake to resolution',
    example: 'Managing a GST appeal through all stages'
  },
  clients: {
    label: 'Clients',
    description: 'Client and contact information management',
    example: 'Adding new corporate clients with GSTIN'
  },
  'client-groups': {
    label: 'Client Groups',
    description: 'Organize clients into hierarchical groups',
    example: 'Grouping subsidiaries under a parent company'
  },
  tasks: {
    label: 'Task Management',
    description: 'Work assignments and team coordination',
    example: 'Creating drafting tasks with SLA tracking'
  },
  'tasks.templates': {
    label: 'Task Templates',
    description: 'Reusable task bundle definitions',
    example: 'Templates for standard case onboarding steps'
  },
  'tasks.automation': {
    label: 'Task Automation',
    description: 'Rules that create tasks automatically',
    example: 'Auto-generate tasks when case stage changes'
  },
  'tasks.escalation': {
    label: 'Task Escalation',
    description: 'SLA breach handling and notification chains',
    example: 'Auto-notify Partner when task is 2 days overdue'
  },
  'tasks.ai': {
    label: 'Task AI Assistant',
    description: 'AI-powered task suggestions and analysis',
    example: 'Get recommendations for next actions on a case'
  },
  documents: {
    label: 'Document Management',
    description: 'Store, organize, and share legal documents',
    example: 'Uploading and categorizing case evidence'
  },
  hearings: {
    label: 'Hearings',
    description: 'Schedule and track court/tribunal hearings',
    example: 'Managing hearing calendar with reminders'
  },
  employees: {
    label: 'Employee Masters',
    description: 'Manage staff, roles, and team structure',
    example: 'Onboarding new team members'
  },
  courts: {
    label: 'Legal Authorities',
    description: 'Master data for tribunals, courts, and forums',
    example: 'Configuring GSTAT benches and HC jurisdictions'
  },
  judges: {
    label: 'Judge Masters',
    description: 'Maintain judge directory and preferences',
    example: 'Tracking judge writing styles and tendencies'
  },
  gst: {
    label: 'GST Features',
    description: 'GST-specific case stages and workflows',
    example: 'Tracking GST cases from SCN to tribunal'
  },
  compliance: {
    label: 'Compliance Dashboard',
    description: 'Track statutory deadline adherence across cases',
    example: 'Monitoring firm-wide SLA compliance rates'
  },
  dashboard: {
    label: 'Dashboard',
    description: 'Overview widgets and quick metrics',
    example: "Viewing today's tasks and upcoming hearings"
  },
  reports: {
    label: 'Reports & Analytics',
    description: 'Generate performance and status reports',
    example: 'Monthly case aging report by attorney'
  },
  settings: {
    label: 'System Settings',
    description: 'Application-wide configuration options',
    example: 'Setting firm branding and default values'
  },
  statutory: {
    label: 'Statutory Deadlines',
    description: 'Configure legal timeframe rules',
    example: 'Setting 90-day appeal window from order date'
  },
  rbac: {
    label: 'Access & Roles',
    description: 'Permission management and role configuration',
    example: 'Creating custom roles for specialized staff'
  },
  notifications: {
    label: 'Notifications',
    description: 'System alerts and reminders',
    example: 'Receiving deadline breach warnings'
  }
};

// Helper to get module label
const getModuleLabel = (module: string): string => {
  return MODULE_METADATA[module]?.label || module.charAt(0).toUpperCase() + module.slice(1);
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
                <div className="flex items-center justify-between mb-2">
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
                      {getModuleLabel(module)}
                    </h4>
                    {MODULE_METADATA[module] && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p className="font-medium">{MODULE_METADATA[module].description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">Example:</span> {MODULE_METADATA[module].example}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {perms.filter(p => selectedPermissions.has(p.key)).length}/{perms.length}
                  </span>
                </div>
                {MODULE_METADATA[module] && (
                  <p className="text-xs text-muted-foreground mb-3 ml-6">
                    {MODULE_METADATA[module].description}
                  </p>
                )}
                
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
