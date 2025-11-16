import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { authorityHierarchyService } from '@/services/authorityHierarchyService';
import { AuthorityLevelConfig } from '@/types/authority-matter-hierarchy';

interface AuthorityLevelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: AuthorityLevelConfig | null;
  onSave: () => void;
}

const COLOR_OPTIONS = [
  { value: 'bg-blue-500', label: 'Blue', class: 'bg-blue-500' },
  { value: 'bg-purple-500', label: 'Purple', class: 'bg-purple-500' },
  { value: 'bg-green-500', label: 'Green', class: 'bg-green-500' },
  { value: 'bg-orange-500', label: 'Orange', class: 'bg-orange-500' },
  { value: 'bg-red-500', label: 'Red', class: 'bg-red-500' },
  { value: 'bg-pink-500', label: 'Pink', class: 'bg-pink-500' },
  { value: 'bg-indigo-500', label: 'Indigo', class: 'bg-indigo-500' },
  { value: 'bg-teal-500', label: 'Teal', class: 'bg-teal-500' },
];

export const AuthorityLevelForm: React.FC<AuthorityLevelFormProps> = ({
  open,
  onOpenChange,
  level,
  onSave
}) => {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    hint: '',
    color: 'bg-blue-500',
    isActive: true,
    allowsMatterTypes: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (level) {
      setFormData({
        id: level.id,
        name: level.name,
        description: level.description || '',
        hint: level.hint || '',
        color: level.color,
        isActive: level.isActive,
        allowsMatterTypes: level.allowsMatterTypes,
      });
    } else {
      setFormData({
        id: '',
        name: '',
        description: '',
        hint: '',
        color: 'bg-blue-500',
        isActive: true,
        allowsMatterTypes: false,
      });
    }
    setErrors({});
  }, [level, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!level && !formData.id.trim()) {
      // Generate ID from name if creating new
      formData.id = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }

    if (!formData.id.trim()) {
      newErrors.id = 'ID could not be generated';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    try {
      if (level) {
        // Update existing
        authorityHierarchyService.updateAuthorityLevel(level.id, {
          name: formData.name,
          description: formData.description,
          hint: formData.hint,
          color: formData.color,
          isActive: formData.isActive,
          allowsMatterTypes: formData.allowsMatterTypes,
        });
        toast({
          title: "Authority Level Updated",
          description: "Changes have been saved successfully.",
        });
      } else {
        // Create new
        authorityHierarchyService.addAuthorityLevel({
          id: formData.id,
          name: formData.name,
          description: formData.description,
          hint: formData.hint,
          color: formData.color,
          isActive: formData.isActive,
          allowsMatterTypes: formData.allowsMatterTypes,
          matterTypes: [],
        });
        toast({
          title: "Authority Level Created",
          description: "New authority level has been added successfully.",
        });
      }
      onSave();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save authority level",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {level ? 'Edit Authority Level' : 'Add Authority Level'}
          </DialogTitle>
          <DialogDescription>
            {level
              ? 'Update the details of this authority level'
              : 'Create a new authority level in the legal hierarchy'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Level Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Assessment, Adjudication, Tribunal"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
            <p className="text-xs text-muted-foreground">
              The display name for this authority level
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this level's role in the hierarchy"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Optional detailed explanation
            </p>
          </div>

          {/* Hint */}
          <div className="space-y-2">
            <Label htmlFor="hint">Tooltip Hint</Label>
            <Input
              id="hint"
              value={formData.hint}
              onChange={(e) => setFormData(prev => ({ ...prev, hint: e.target.value }))}
              placeholder="Helpful hint shown in tooltips"
            />
            <p className="text-xs text-muted-foreground">
              Short text displayed when users hover over this level
            </p>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label>Color Badge</Label>
            <RadioGroup
              value={formData.color}
              onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
              className="grid grid-cols-4 gap-3"
            >
              {COLOR_OPTIONS.map((color) => (
                <div key={color.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={color.value} id={color.value} className="peer sr-only" />
                  <Label
                    htmlFor={color.value}
                    className={`flex items-center justify-center gap-2 rounded-lg border-2 border-muted p-3 cursor-pointer hover:border-primary peer-data-[state=checked]:border-primary`}
                  >
                    <div className={`w-6 h-6 rounded ${color.class}`} />
                    <span className="text-sm">{color.label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Allows Matter Types */}
          <div className="flex items-start space-x-3 rounded-lg border p-4">
            <Switch
              id="allowsMatterTypes"
              checked={formData.allowsMatterTypes}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowsMatterTypes: checked }))}
            />
            <div className="space-y-1 flex-1">
              <Label htmlFor="allowsMatterTypes" className="cursor-pointer">
                Allows Sub-Levels (Matter Types)
              </Label>
              <p className="text-xs text-muted-foreground">
                Enable this if this authority level has sub-categories (e.g., Assessment → Scrutiny, Audit, Investigation).
                You can add matter types after creating the level.
              </p>
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-start space-x-3 rounded-lg border p-4">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            />
            <div className="space-y-1 flex-1">
              <Label htmlFor="isActive" className="cursor-pointer">
                Active
              </Label>
              <p className="text-xs text-muted-foreground">
                Inactive levels are hidden from dropdown selections but existing data is preserved.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {level ? 'Save Changes' : 'Create Authority Level'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
