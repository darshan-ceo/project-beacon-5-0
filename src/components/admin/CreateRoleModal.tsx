import React, { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BeaconModalContent } from '@/components/ui/beacon-modal';
import { toast } from 'sonner';
import { supabaseRbacService } from '@/services/supabaseRbacService';

interface CreateRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateRoleModal: React.FC<CreateRoleModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.displayName.trim()) {
      toast.error('Role name and display name are required');
      return;
    }

    try {
      setIsSaving(true);
      await supabaseRbacService.createCustomRole({
        name: formData.name.trim(),
        displayName: formData.displayName.trim(),
        description: formData.description.trim() || undefined,
      });
      
      toast.success('Custom role created successfully');
      setFormData({ name: '', displayName: '', description: '' });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create role');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setFormData({ name: '', displayName: '', description: '' });
      onOpenChange(false);
    }
  };

  return (
    <BeaconModalContent
      open={open}
      onOpenChange={handleClose}
      title="Create Custom Role"
      subtitle="Define a new role for your organization"
      icon={Shield}
      infoTooltip="Custom roles allow you to define organization-specific access levels beyond the system roles."
      maxWidth="max-w-lg"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isSaving}
            className="text-[hsl(215,16%,47%)] hover:bg-[hsl(214,32%,96%)]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || !formData.name.trim() || !formData.displayName.trim()}
            className="bg-[hsl(0,0%,0%)] text-white hover:bg-[hsl(0,0%,20%)]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Role'
            )}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Role Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-[hsl(215,25%,17%)]">
            Role Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., senior_analyst"
            className="border-[hsl(214,32%,91%)] focus:border-[hsl(0,0%,0%)] focus:ring-[hsl(0,0%,0%)]"
            disabled={isSaving}
          />
          <p className="text-xs text-[hsl(215,16%,47%)]">
            Use lowercase letters and underscores only. This is the internal identifier.
          </p>
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="displayName" className="text-sm font-medium text-[hsl(215,25%,17%)]">
            Display Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="displayName"
            value={formData.displayName}
            onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
            placeholder="e.g., Senior Analyst"
            className="border-[hsl(214,32%,91%)] focus:border-[hsl(0,0%,0%)] focus:ring-[hsl(0,0%,0%)]"
            disabled={isSaving}
          />
          <p className="text-xs text-[hsl(215,16%,47%)]">
            The human-readable name shown in the UI.
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium text-[hsl(215,25%,17%)]">
            Description
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the purpose and access level of this role..."
            rows={3}
            className="border-[hsl(214,32%,91%)] focus:border-[hsl(0,0%,0%)] focus:ring-[hsl(0,0%,0%)] resize-none"
            disabled={isSaving}
          />
        </div>

        {/* Info Box */}
        <div className="p-4 bg-[hsl(214,32%,96%)] rounded-lg border border-[hsl(214,32%,91%)]">
          <p className="text-sm text-[hsl(215,16%,47%)]">
            <strong className="text-[hsl(215,25%,17%)]">Note:</strong> After creating the role, 
            you can assign permissions using the Edit Permissions button on the role card.
          </p>
        </div>
      </form>
    </BeaconModalContent>
  );
};

export default CreateRoleModal;
