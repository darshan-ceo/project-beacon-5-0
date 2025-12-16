import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppState } from '@/contexts/AppStateContext';
import { clientGroupsService } from '@/services/clientGroupsService';
import { autoCapitalizeFirst } from '@/utils/textFormatters';
import { Building2, Code, FileText, User } from 'lucide-react';

interface ClientGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit' | 'view';
  group?: any;
  onSuccess?: (newGroup: any) => void;
}

export const ClientGroupModal: React.FC<ClientGroupModalProps> = ({
  isOpen,
  onClose,
  mode,
  group,
  onSuccess
}) => {
  const { state, dispatch } = useAppState();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    headClientId: '',
    status: 'Active' as 'Active' | 'Inactive',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (group && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: group.name || '',
        code: group.code || '',
        description: group.description || '',
        headClientId: group.headClientId || '',
        status: group.status || 'Active',
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        headClientId: '',
        status: 'Active',
      });
    }
    setErrors({});
  }, [group, mode, isOpen]);

  // Auto-generate code from name
  useEffect(() => {
    if (mode === 'add' && formData.name) {
      const generatedCode = clientGroupsService.generateCode(formData.name);
      setFormData(prev => ({ ...prev, code: generatedCode }));
    }
  }, [formData.name, mode]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required';
    } else if (formData.name.length < 3 || formData.name.length > 100) {
      newErrors.name = 'Name must be between 3 and 100 characters';
    } else if (!clientGroupsService.validateUniqueName(
      formData.name,
      state.clientGroups,
      mode === 'edit' ? group?.id : undefined
    )) {
      newErrors.name = 'Group name already exists';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      if (mode === 'add') {
        const newGroup = await clientGroupsService.create(formData, dispatch);
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess(newGroup);
        }
      } else if (mode === 'edit' && group?.id) {
        const updatedGroup = await clientGroupsService.update(group.id, formData, dispatch);
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess(updatedGroup);
        }
      }

      onClose();
    } catch (error) {
      // Error toast is handled by the service
      console.error('Failed to save client group:', error);
    }
  };

  const isViewMode = mode === 'view';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' && 'Add New Client Group'}
            {mode === 'edit' && 'Edit Client Group'}
            {mode === 'view' && 'View Client Group'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Group Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onBlur={(e) => setFormData({ ...formData, name: autoCapitalizeFirst(e.target.value) })}
              placeholder="e.g., Tata Group, Landmark Group"
              disabled={isViewMode}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          {/* Code */}
          <div className="space-y-2">
            <Label htmlFor="code" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Code *
            </Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="Auto-generated from name"
              disabled={isViewMode || mode === 'add'}
            />
            {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
            <p className="text-xs text-muted-foreground">
              {mode === 'add' ? 'Automatically generated from group name' : 'Can be edited if needed'}
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              onBlur={(e) => setFormData({ ...formData, description: autoCapitalizeFirst(e.target.value) })}
              placeholder="Optional description for internal use"
              rows={3}
              disabled={isViewMode}
            />
          </div>

          {/* Head Client */}
          <div className="space-y-2">
            <Label htmlFor="headClientId" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Head Client (Optional)
            </Label>
            <Select
              value={formData.headClientId || 'none'}
              onValueChange={(value) => setFormData({ ...formData, headClientId: value === 'none' ? '' : value })}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select main client of this group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {state.clients
                  .filter(c => c.status === 'Active')
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select the primary/main client representing this group
            </p>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="status">Status</Label>
              <p className="text-sm text-muted-foreground">
                {formData.status === 'Active' ? 'Group is active and visible' : 'Group is inactive'}
              </p>
            </div>
            <Switch
              id="status"
              checked={formData.status === 'Active'}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, status: checked ? 'Active' : 'Inactive' })
              }
              disabled={isViewMode}
            />
          </div>

          {/* View Mode: Show Client Count */}
          {isViewMode && group && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Clients in Group:</span>
                <span className="text-lg font-bold">{group.totalClients}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {isViewMode ? 'Close' : 'Cancel'}
          </Button>
          {!isViewMode && (
            <Button onClick={handleSubmit}>
              {mode === 'add' ? 'Create Group' : 'Save Changes'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
