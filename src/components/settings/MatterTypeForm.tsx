import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { authorityHierarchyService } from '@/services/authorityHierarchyService';
import { MatterTypeConfig } from '@/types/authority-matter-hierarchy';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface MatterTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  levelId: string;
  matterType: MatterTypeConfig | null;
  onSave: () => void;
}

export const MatterTypeForm: React.FC<MatterTypeFormProps> = ({
  open,
  onOpenChange,
  levelId,
  matterType,
  onSave
}) => {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const parentLevel = authorityHierarchyService.getAuthorityLevelById(levelId);

  useEffect(() => {
    if (matterType) {
      setFormData({
        id: matterType.id,
        name: matterType.name,
        description: matterType.description || '',
        isActive: matterType.isActive,
      });
    } else {
      setFormData({
        id: '',
        name: '',
        description: '',
        isActive: true,
      });
    }
    setErrors({});
  }, [matterType, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!matterType && !formData.id.trim()) {
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
      if (matterType) {
        // Update existing
        authorityHierarchyService.updateMatterType(levelId, matterType.id, {
          name: formData.name,
          description: formData.description,
          isActive: formData.isActive,
        });
        toast({
          title: "Matter Type Updated",
          description: "Changes have been saved successfully.",
        });
      } else {
        // Create new
        authorityHierarchyService.addMatterType(levelId, {
          id: formData.id,
          name: formData.name,
          description: formData.description,
          isActive: formData.isActive,
        });
        toast({
          title: "Matter Type Created",
          description: "New matter type has been added successfully.",
        });
      }
      onSave();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save matter type",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {matterType ? 'Edit Matter Type' : 'Add Matter Type'}
          </DialogTitle>
          <DialogDescription>
            {matterType
              ? 'Update the details of this matter type'
              : 'Create a new matter type (sub-level) for this authority level'}
          </DialogDescription>
        </DialogHeader>

        {/* Parent Level Info */}
        <div className="rounded-lg bg-muted p-3 space-y-1">
          <p className="text-xs text-muted-foreground">Parent Authority Level</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={parentLevel?.color}>
              {parentLevel?.name}
            </Badge>
            <span className="text-sm">{parentLevel?.description}</span>
          </div>
        </div>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="matterName">
              Matter Type Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="matterName"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Scrutiny, Audit, Investigation"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
            <p className="text-xs text-muted-foreground">
              The display name for this sub-level
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="matterDescription">Description</Label>
            <Textarea
              id="matterDescription"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this matter type"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Optional detailed explanation
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-start space-x-3 rounded-lg border p-4">
            <Switch
              id="matterActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            />
            <div className="space-y-1 flex-1">
              <Label htmlFor="matterActive" className="cursor-pointer">
                Active
              </Label>
              <p className="text-xs text-muted-foreground">
                Inactive matter types are hidden from dropdown selections but existing data is preserved.
              </p>
            </div>
          </div>

          {/* Location Requirements (Read-only display) */}
          {matterType?.requiresLocation && matterType?.locations && matterType.locations.length > 0 && (
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-sm">Location Requirements</CardTitle>
                  <Badge variant="secondary" className="ml-auto text-xs">Pre-configured</Badge>
                </div>
                <CardDescription className="text-xs">
                  This matter type requires state and city selection when creating cases
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Collapsible open={isLocationOpen} onOpenChange={setIsLocationOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors w-full">
                    {isLocationOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    View Configured Locations ({matterType.locations.length} states)
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3 max-h-[300px] overflow-y-auto">
                    {matterType.locations.map((location, idx) => (
                      <div key={idx} className="rounded-lg border bg-background p-3 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-semibold">{location.state}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {location.cities.length} {location.cities.length === 1 ? 'city' : 'cities'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {location.cities.map((city, cityIdx) => (
                            <Badge key={cityIdx} variant="secondary" className="text-xs">
                              {city}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {matterType ? 'Save Changes' : 'Create Matter Type'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
