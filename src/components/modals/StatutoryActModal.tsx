import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Scale, Info } from 'lucide-react';
import { StatutoryAct, StatutoryActFormData } from '@/types/statutory';
import { statutoryActsService } from '@/services/statutoryActsService';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StatutoryActModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (act: StatutoryAct) => void;
  mode: 'add' | 'edit' | 'view';
  act: StatutoryAct | null;
}

export const StatutoryActModal: React.FC<StatutoryActModalProps> = ({
  isOpen,
  onClose,
  onSave,
  mode,
  act,
}) => {
  const [formData, setFormData] = useState<StatutoryActFormData>({
    code: '',
    name: '',
    description: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data
  useEffect(() => {
    if (isOpen) {
      if (act && (mode === 'edit' || mode === 'view')) {
        setFormData({
          code: act.code,
          name: act.name,
          description: act.description || '',
          isActive: act.isActive,
        });
      } else {
        setFormData({
          code: '',
          name: '',
          description: '',
          isActive: true,
        });
      }
      setErrors({});
    }
  }, [isOpen, act, mode]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Code is required';
    } else if (formData.code.length > 20) {
      newErrors.code = 'Code must be 20 characters or less';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (mode === 'view') return;
    if (!validateForm()) return;

    setSaving(true);
    try {
      let savedAct: StatutoryAct | null = null;

      if (mode === 'add') {
        savedAct = await statutoryActsService.create(formData);
      } else if (mode === 'edit' && act) {
        savedAct = await statutoryActsService.update(act.id, formData);
      }

      if (savedAct) {
        onSave(savedAct);
      }
    } finally {
      setSaving(false);
    }
  };

  const isReadOnly = mode === 'view';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <DialogTitle>
              {mode === 'add' && 'Add Statutory Act'}
              {mode === 'edit' && 'Edit Statutory Act'}
              {mode === 'view' && 'View Statutory Act'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {mode === 'add' && 'Create a new statutory act for deadline calculations.'}
            {mode === 'edit' && 'Update the statutory act details.'}
            {mode === 'view' && 'View statutory act details.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Code */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="code">Code <span className="text-destructive">*</span></Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Short unique identifier (e.g., GST, IT, ST)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="e.g., GST"
              disabled={isReadOnly}
              maxLength={20}
              className="uppercase"
            />
            {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Full name of the statutory act</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Goods & Services Tax Act"
              disabled={isReadOnly}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="description">Description</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Optional description for reference</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this act..."
              disabled={isReadOnly}
              rows={3}
            />
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Active Status</Label>
              <p className="text-xs text-muted-foreground">
                Inactive acts won't appear in deadline calculations
              </p>
            </div>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              disabled={isReadOnly}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {isReadOnly ? 'Close' : 'Cancel'}
          </Button>
          {!isReadOnly && (
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === 'add' ? 'Create' : 'Save Changes'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
