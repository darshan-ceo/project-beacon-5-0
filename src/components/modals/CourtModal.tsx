import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { AdaptiveFormShell } from '@/components/ui/adaptive-form-shell';
import { FormStickyFooter } from '@/components/ui/form-sticky-footer';
import { Court, useAppState } from '@/contexts/AppStateContext';
import { MapPin, Phone, Mail, Building2, Scale, Globe, Loader2 } from 'lucide-react';
import { FieldTooltip } from '@/components/ui/field-tooltip';
import { AUTHORITY_LEVEL_OPTIONS, AUTHORITY_LEVEL_METADATA, AuthorityLevel } from '@/types/authority-level';
import { clientsService } from '@/services/clientsService';
import { autoCapitalizeFirst } from '@/utils/textFormatters';
import { authorityHierarchyService } from '@/services/authorityHierarchyService';
import { 
  TaxJurisdiction, 
  OfficerDesignation, 
  TAX_JURISDICTION_OPTIONS, 
  getOfficersByJurisdiction,
  getOfficerLabel 
} from '@/types/officer-designation';
import { useAdvancedRBAC } from '@/hooks/useAdvancedRBAC';

interface CourtModalProps {
  isOpen: boolean;
  onClose: () => void;
  court?: Court | null;
  mode: 'create' | 'edit' | 'view';
}

const workingDayOptions = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export const CourtModal: React.FC<CourtModalProps> = ({ isOpen, onClose, court: courtData, mode }) => {
  const { state, dispatch } = useAppState();
  const [formData, setFormData] = useState<{
    name: string;
    type: 'Supreme Court' | 'High Court' | 'District Court' | 'Tribunal' | 'Commission';
    authorityLevel?: AuthorityLevel;
    matterTypes?: string[];
    jurisdiction: string;
    digitalFiling: boolean;
    digitalFilingPortal?: string;
    digitalFilingPortalUrl?: string;
    digitalFilingInstructions?: string;
    workingDays: string[];
    phone?: string;
    email?: string;
    benchLocation?: string;
    city?: string;
    status: 'Active' | 'Inactive';
    taxJurisdiction?: TaxJurisdiction;
    officerDesignation?: OfficerDesignation;
  }>({
    name: '',
    type: 'District Court',
    authorityLevel: undefined,
    matterTypes: [],
    jurisdiction: '',
    digitalFiling: false,
    digitalFilingPortal: '',
    digitalFilingPortalUrl: '',
    digitalFilingInstructions: '',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    phone: '',
    email: '',
    benchLocation: '',
    city: '',
    status: 'Active',
    taxJurisdiction: undefined,
    officerDesignation: undefined
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (courtData && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: courtData.name,
        type: courtData.type,
        authorityLevel: courtData.authorityLevel,
        matterTypes: courtData.matterTypes || [],
        jurisdiction: courtData.jurisdiction,
        digitalFiling: courtData.digitalFiling,
        digitalFilingPortal: courtData.digitalFilingPortal || '',
        digitalFilingPortalUrl: courtData.digitalFilingPortalUrl || '',
        digitalFilingInstructions: courtData.digitalFilingInstructions || '',
        workingDays: courtData.workingDays,
        phone: courtData.phone || '',
        email: courtData.email || '',
        benchLocation: courtData.benchLocation || '',
        city: courtData.city || '',
        status: courtData.status || 'Active',
        taxJurisdiction: courtData.taxJurisdiction as TaxJurisdiction | undefined,
        officerDesignation: courtData.officerDesignation as OfficerDesignation | undefined
      });
    } else if (mode === 'create') {
      setFormData({
        name: '',
        type: 'District Court',
        authorityLevel: undefined,
        jurisdiction: '',
        digitalFiling: false,
        digitalFilingPortal: '',
        digitalFilingPortalUrl: '',
        digitalFilingInstructions: '',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        phone: '',
        email: '',
        benchLocation: '',
        city: '',
        status: 'Active',
        taxJurisdiction: undefined,
        officerDesignation: undefined
      });
    }
  }, [courtData, mode]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Authority name is required';
    }

    if (!formData.jurisdiction?.trim()) {
      newErrors.jurisdiction = 'Jurisdiction is required';
    }

    if (!formData.city?.trim()) {
      newErrors.city = 'City is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleWorkingDayChange = (day: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      workingDays: checked 
        ? [...prev.workingDays, day]
        : prev.workingDays.filter(d => d !== day)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive"
      });
      return;
    }
    
    setIsSaving(true);
    try {
      const { courtsService } = await import('@/services/courtsService');

      if (mode === 'create') {
        const courtToCreate = {
          name: formData.name,
          type: formData.type,
          authorityLevel: formData.authorityLevel,
          matterTypes: formData.matterTypes,
          jurisdiction: formData.jurisdiction,
          digitalFiling: formData.digitalFiling,
          digitalFilingPortal: formData.digitalFilingPortal,
          digitalFilingPortalUrl: formData.digitalFilingPortalUrl,
          digitalFilingInstructions: formData.digitalFilingInstructions,
          workingDays: formData.workingDays,
          phone: formData.phone,
          email: formData.email,
          benchLocation: formData.benchLocation,
          city: formData.city,
          status: formData.status,
          taxJurisdiction: formData.taxJurisdiction,
          officerDesignation: formData.officerDesignation
        };

        await courtsService.create(courtToCreate, dispatch);
      } else if (mode === 'edit' && courtData) {
        const updates = {
          ...courtData,
          name: formData.name,
          type: formData.type,
          authorityLevel: formData.authorityLevel,
          matterTypes: formData.matterTypes,
          jurisdiction: formData.jurisdiction,
          digitalFiling: formData.digitalFiling,
          digitalFilingPortal: formData.digitalFilingPortal,
          digitalFilingPortalUrl: formData.digitalFilingPortalUrl,
          digitalFilingInstructions: formData.digitalFilingInstructions,
          workingDays: formData.workingDays,
          phone: formData.phone,
          email: formData.email,
          benchLocation: formData.benchLocation,
          city: formData.city,
          status: formData.status,
          taxJurisdiction: formData.taxJurisdiction,
          officerDesignation: formData.officerDesignation
        };

        await courtsService.update(courtData.id, updates, dispatch);
      }

      onClose();
    } catch (error: any) {
      console.error('Court operation failed:', error);
      toast({
        title: 'Error Saving Legal Forum',
        description: error?.message || 'Failed to save legal forum. Please try again.',
        variant: 'destructive'
      });
      setIsSaving(false);
    }
  };

  // RBAC permission checks
  const { hasPermission } = useAdvancedRBAC();
  const canDeleteCourts = hasPermission('courts', 'delete');

  const handleDelete = async () => {
    if (courtData) {
      if (!canDeleteCourts) {
        toast({
          title: 'Permission Denied',
          description: "You don't have permission to delete legal forums.",
          variant: 'destructive',
        });
        return;
      }
      
      setIsDeleting(true);
      try {
        const { courtsService } = await import('@/services/courtsService');
        await courtsService.delete(courtData.id, dispatch);
        onClose();
      } catch (error: any) {
        console.error('Court deletion failed:', error);
        toast({
          title: 'Error Deleting Legal Forum',
          description: error?.message || 'Failed to delete legal forum.',
          variant: 'destructive'
        });
        setIsDeleting(false);
      }
    }
  };


  const footer = (
    <FormStickyFooter
      mode={mode}
      onCancel={onClose}
      onPrimaryAction={mode !== 'view' ? () => {
        const form = document.getElementById('court-form') as HTMLFormElement;
        if (form) form.requestSubmit();
      } : undefined}
      primaryLabel={mode === 'create' ? 'Create Court' : 'Update Court'}
      isPrimaryLoading={isSaving}
      showDelete={mode === 'edit' && canDeleteCourts}
      onDelete={() => setDeleteDialogOpen(true)}
      isDeleteLoading={isDeleting}
    />
  );

  return (
    <>
      <AdaptiveFormShell
        isOpen={isOpen}
        onClose={onClose}
        title={mode === 'create' ? 'Add New Legal Forum' : mode === 'edit' ? 'Edit Legal Forum' : 'View Legal Forum'}
        icon={<Building2 className="h-5 w-5" />}
        complexity="complex"
        footer={footer}
        dataTour="court-modal"
      >
        <form id="court-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Basic Information */}
          <Card className="rounded-beacon-lg border bg-card shadow-beacon-md">
            <CardHeader className="border-b border-border p-6 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
              <CardContent className="space-y-4 p-6">
            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="name">Authority Name <span className="text-destructive">*</span></Label>
                <FieldTooltip formId="create-court" fieldId="name" />
              </div>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                onBlur={(e) => setFormData(prev => ({ ...prev, name: autoCapitalizeFirst(e.target.value) }))}
                disabled={mode === 'view'}
                placeholder="Enter name (auto-capitalizes)"
                required
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1">
                  <Label htmlFor="authorityLevel">Authority Level</Label>
                  <FieldTooltip formId="create-court" fieldId="authorityLevel" />
                </div>
                <Select
                  value={formData.authorityLevel || ''}
                  onValueChange={(value) => {
                    const newLevel = value as AuthorityLevel;
                    setFormData(prev => ({ 
                      ...prev, 
                      authorityLevel: newLevel,
                      matterTypes: [] // Reset matter types when authority level changes
                    }));
                  }}
                  disabled={mode === 'view'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select authority level" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTHORITY_LEVEL_OPTIONS.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        <div className="flex items-center gap-2">
                          <span>{level.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center gap-1">
                  <Label htmlFor="type">Type</Label>
                  <FieldTooltip formId="create-court" fieldId="type" />
                </div>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
                  disabled={mode === 'view'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Supreme Court">Supreme Court</SelectItem>
                    <SelectItem value="High Court">High Court</SelectItem>
                    <SelectItem value="District Court">District Court</SelectItem>
                    <SelectItem value="Tribunal">Tribunal</SelectItem>
                    <SelectItem value="Commission">Commission</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Matter Types Selection - Show only when authority level is selected */}
            {formData.authorityLevel && (
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <Label>Matter Types Handled</Label>
                  <FieldTooltip formId="create-court" fieldId="matterTypes" />
                </div>
                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  {(() => {
                    const matterTypes = authorityHierarchyService.getMatterTypesByLevel(formData.authorityLevel);
                    if (matterTypes.length === 0) {
                      return (
                        <p className="text-sm text-muted-foreground italic">
                          No matter types configured for this authority level
                        </p>
                      );
                    }
                    return matterTypes.map(mt => (
                      <div key={mt.id} className="flex items-start gap-2">
                        <Checkbox
                          id={`mt-${mt.id}`}
                          checked={formData.matterTypes?.includes(mt.id) || false}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({
                              ...prev,
                              matterTypes: checked 
                                ? [...(prev.matterTypes || []), mt.id]
                                : (prev.matterTypes || []).filter(id => id !== mt.id)
                            }));
                          }}
                          disabled={mode === 'view'}
                        />
                        <div className="flex-1">
                          <label 
                            htmlFor={`mt-${mt.id}`} 
                            className="text-sm font-medium cursor-pointer"
                          >
                            {mt.name}
                          </label>
                          {mt.description && (
                            <p className="text-xs text-muted-foreground">{mt.description}</p>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="jurisdiction">Jurisdiction <span className="text-destructive">*</span></Label>
                <FieldTooltip formId="create-court" fieldId="jurisdiction" />
              </div>
              <Input
                id="jurisdiction"
                value={formData.jurisdiction}
                onChange={(e) => setFormData(prev => ({ ...prev, jurisdiction: e.target.value }))}
                disabled={mode === 'view'}
                placeholder="Enter jurisdiction"
                required
                className={errors.jurisdiction ? 'border-destructive' : ''}
              />
              {errors.jurisdiction && (
                <p className="text-xs text-destructive mt-1">{errors.jurisdiction}</p>
              )}
            </div>
            </CardContent>
          </Card>

          {/* Section 2: Location & Contact */}
          <Card className="rounded-beacon-lg border bg-card shadow-beacon-md">
            <CardHeader className="border-b border-border p-6 pb-4">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location & Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {/* CGST/SGST Tax Jurisdiction */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-1">
                    <Label htmlFor="taxJurisdiction">Tax Jurisdiction</Label>
                    <FieldTooltip formId="create-court" fieldId="taxJurisdiction" />
                  </div>
                  <Select
                    value={formData.taxJurisdiction || ''}
                    onValueChange={(value) => {
                      const newJurisdiction = value as TaxJurisdiction;
                      setFormData(prev => ({ 
                        ...prev, 
                        taxJurisdiction: newJurisdiction,
                        // Reset officer designation when jurisdiction changes
                        officerDesignation: undefined
                      }));
                    }}
                    disabled={mode === 'view'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tax jurisdiction" />
                    </SelectTrigger>
                    <SelectContent>
                      {TAX_JURISDICTION_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Central (CGST) or State (SGST) jurisdiction
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-1">
                    <Label htmlFor="officerDesignation">Officer Designation</Label>
                    <FieldTooltip formId="create-court" fieldId="officerDesignation" />
                  </div>
                  <Select
                    value={formData.officerDesignation || ''}
                    onValueChange={(value) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        officerDesignation: value as OfficerDesignation
                      }));
                    }}
                    disabled={mode === 'view' || !formData.taxJurisdiction}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.taxJurisdiction ? "Select officer designation" : "Select tax jurisdiction first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.taxJurisdiction && getOfficersByJurisdiction(formData.taxJurisdiction).map(officer => (
                        <SelectItem key={officer.value} value={officer.value}>
                          {officer.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.officerDesignation 
                      ? getOfficerLabel(formData.officerDesignation)
                      : 'Rank of the adjudicating officer'
                    }
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1">
                  <Label htmlFor="benchLocation">Bench / Location</Label>
                  <FieldTooltip formId="create-court" fieldId="benchLocation" />
                </div>
                <Input
                  id="benchLocation"
                  value={formData.benchLocation || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, benchLocation: e.target.value }))}
                  onBlur={(e) => setFormData(prev => ({ ...prev, benchLocation: autoCapitalizeFirst(e.target.value) }))}
                  disabled={mode === 'view'}
                  placeholder="E.g., Delhi Bench, Lucknow Bench"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Regional bench or sub-location (for distributed tribunals)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-1">
                    <Label htmlFor="phone">Phone</Label>
                    <FieldTooltip formId="create-court" fieldId="phone" />
                  </div>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={mode === 'view'}
                    placeholder="e.g., 011-23456789"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1">
                    <Label htmlFor="email">Email</Label>
                    <FieldTooltip formId="create-court" fieldId="email" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={mode === 'view'}
                    placeholder="e.g., court@gov.in"
                  />
                </div>
              </div>

              {/* Working Days */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <Label>Working Days</Label>
                  <FieldTooltip formId="create-court" fieldId="workingDays" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {workingDayOptions.map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={day}
                        checked={formData.workingDays.includes(day)}
                        onCheckedChange={(checked) => handleWorkingDayChange(day, checked as boolean)}
                        disabled={mode === 'view'}
                      />
                      <label htmlFor={day} className="text-sm font-medium leading-none cursor-pointer">
                        {day.slice(0, 3)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-1">
                    <Label htmlFor="city">City / District <span className="text-destructive">*</span></Label>
                    <FieldTooltip formId="create-court" fieldId="city" />
                  </div>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    onBlur={(e) => setFormData(prev => ({ ...prev, city: autoCapitalizeFirst(e.target.value) }))}
                    disabled={mode === 'view'}
                    placeholder="Enter city name"
                    required
                    className={errors.city ? 'border-destructive' : ''}
                  />
                  {errors.city && (
                    <p className="text-xs text-destructive mt-1">{errors.city}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Primary city where this authority is located
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

            {/* Section 3: Court-Specific Details */}
            <Card className="rounded-beacon-lg border bg-card shadow-beacon-md">
              <CardHeader className="border-b border-border p-6 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Court-Specific Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">

            {/* Status Toggle */}
            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-1">
                  <Label htmlFor="status" className="text-sm font-medium">
                    Status
                  </Label>
                  <FieldTooltip formId="create-court" fieldId="status" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formData.status === 'Active' 
                    ? 'Authority is operational and accepting cases' 
                    : 'Authority is closed or merged - hidden from active listings'
                  }
                </p>
              </div>
              <Switch
                id="status"
                checked={formData.status === 'Active'}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  status: checked ? 'Active' : 'Inactive' 
                }))}
                disabled={mode === 'view'}
              />
            </div>

            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-1">
                  <Label htmlFor="digitalFiling" className="text-sm font-medium">
                    Digital Filing
                  </Label>
                  <FieldTooltip formId="create-court" fieldId="digitalFiling" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formData.digitalFiling 
                    ? 'Authority accepts electronic filing (ACES/GST Portal)' 
                    : 'Physical filing required at counter'
                  }
                </p>
              </div>
              <Switch
                id="digitalFiling"
                checked={formData.digitalFiling}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, digitalFiling: checked }))}
                disabled={mode === 'view'}
              />
            </div>

            {/* Digital Filing Portal Details - shown only when digital filing is enabled */}
            {formData.digitalFiling && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">Digital Filing Portal Details</h4>
                </div>
                
                <div>
                  <Label htmlFor="digitalFilingPortal">Portal Name</Label>
                  <Input
                    id="digitalFilingPortal"
                    value={formData.digitalFilingPortal || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, digitalFilingPortal: e.target.value }))}
                    disabled={mode === 'view'}
                    placeholder="e.g., ACES, GST Portal, ITAT Portal"
                  />
                </div>
                
                <div>
                  <Label htmlFor="digitalFilingPortalUrl">Portal URL</Label>
                  <Input
                    id="digitalFilingPortalUrl"
                    value={formData.digitalFilingPortalUrl || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, digitalFilingPortalUrl: e.target.value }))}
                    disabled={mode === 'view'}
                    placeholder="e.g., https://itat.gov.in/filing"
                  />
                </div>
                
                <div>
                  <Label htmlFor="digitalFilingInstructions">Filing Instructions</Label>
                  <Textarea
                    id="digitalFilingInstructions"
                    value={formData.digitalFilingInstructions || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, digitalFilingInstructions: e.target.value }))}
                    disabled={mode === 'view'}
                    placeholder="Special instructions for digital filing..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            )}
              </CardContent>
            </Card>
        </form>
      </AdaptiveFormShell>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Legal Forum?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the legal forum
              "{courtData?.name}" and remove it from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
