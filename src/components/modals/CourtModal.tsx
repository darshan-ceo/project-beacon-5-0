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
import { SimpleAddressForm, SimpleAddressData } from '@/components/ui/SimpleAddressForm';
import { AddressView } from '@/components/ui/AddressView';
import { EnhancedAddressData, addressMasterService } from '@/services/addressMasterService';
import { featureFlagService } from '@/services/featureFlagService';
import { MapPin, Phone, Mail, Building2, Scale, Globe, Loader2 } from 'lucide-react';
import { FieldTooltip } from '@/components/ui/field-tooltip';
import { AUTHORITY_LEVEL_OPTIONS, AUTHORITY_LEVEL_METADATA, AuthorityLevel } from '@/types/authority-level';
import { clientsService } from '@/services/clientsService';
import { autoCapitalizeFirst } from '@/utils/textFormatters';
import { extractCityFromAddress } from '@/utils/cityExtractor';
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
    address: EnhancedAddressData;
    digitalFiling: boolean;
    digitalFilingPortal?: string;
    digitalFilingPortalUrl?: string;
    digitalFilingInstructions?: string;
    workingDays: string[];
    phone?: string;
    email?: string;
    benchLocation?: string;
    addressId?: string;
    city?: string;
    status: 'Active' | 'Inactive';
    // NEW: CGST/SGST fields
    taxJurisdiction?: TaxJurisdiction;
    officerDesignation?: OfficerDesignation;
  }>({
    name: '',
    type: 'District Court',
    authorityLevel: undefined,
    matterTypes: [],
    jurisdiction: '',
    address: {
      line1: '',
      line2: '',
      locality: '',
      district: '',
      cityId: '',
      stateId: '',
      pincode: '',
      countryId: 'IN',
      source: 'manual'
    } as EnhancedAddressData,
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
  const [isAddressMasterEnabled, setIsAddressMasterEnabled] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // State name to code mapping for imported data
  const STATE_NAME_TO_CODE: Record<string, string> = {
    'andaman and nicobar islands': 'AN', 'andaman and nicobar': 'AN', 'andaman': 'AN',
    'andhra pradesh': 'AP', 'arunachal pradesh': 'AR', 'assam': 'AS', 'bihar': 'BR',
    'chhattisgarh': 'CG', 'chandigarh': 'CH', 'dadra and nagar haveli': 'DH',
    'daman and diu': 'DH', 'delhi': 'DL', 'goa': 'GA', 'gujarat': 'GJ',
    'haryana': 'HR', 'himachal pradesh': 'HP', 'jammu and kashmir': 'JK', 'jammu': 'JK',
    'jharkhand': 'JH', 'karnataka': 'KA', 'kerala': 'KL', 'ladakh': 'LA',
    'lakshadweep': 'LD', 'madhya pradesh': 'MP', 'maharashtra': 'MH', 'manipur': 'MN',
    'meghalaya': 'ML', 'mizoram': 'MZ', 'nagaland': 'NL', 'odisha': 'OR', 'orissa': 'OR',
    'punjab': 'PB', 'puducherry': 'PY', 'pondicherry': 'PY', 'rajasthan': 'RJ',
    'sikkim': 'SK', 'tamil nadu': 'TN', 'tripura': 'TR', 'telangana': 'TS',
    'uttarakhand': 'UK', 'uttar pradesh': 'UP', 'west bengal': 'WB'
  };

  // Convert state name or code to standard state code
  const normalizeStateId = (stateValue: string): string => {
    if (!stateValue) return '';
    const normalized = stateValue.toLowerCase().trim();
    // If it's already a 2-letter code and in our mapping values, return uppercase
    if (normalized.length === 2 && Object.values(STATE_NAME_TO_CODE).includes(normalized.toUpperCase())) {
      return normalized.toUpperCase();
    }
    // Otherwise, look up by name
    return STATE_NAME_TO_CODE[normalized] || stateValue;
  };

  // Parse address string to extract pincode, state, city for imported data
  const parseCourtAddress = (addressStr: string, court: any): EnhancedAddressData => {
    // Extract 6-digit pincode using regex
    const pincodeMatch = addressStr.match(/\b\d{6}\b/);
    const pincode = pincodeMatch ? pincodeMatch[0] : '';
    
    // Use court-level fields if available (from database columns)
    const rawState = (court as any)?.state || '';
    const stateId = normalizeStateId(rawState);
    
    return {
      line1: addressStr,
      line2: '',
      locality: '',
      district: '',
      cityId: '',
      stateId: stateId,
      pincode: pincode,
      countryId: 'IN',
      source: 'manual'
    } as EnhancedAddressData;
  };

  useEffect(() => {
    setIsAddressMasterEnabled(featureFlagService.isEnabled('address_master_v1'));
    
    if (courtData && (mode === 'edit' || mode === 'view')) {
      // Parse address - handle string (imported), JSON string, and object formats
      let parsedAddress: EnhancedAddressData;
      if (typeof courtData.address === 'string') {
        // Try to parse as JSON first (new format stored as text)
        if (courtData.address.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(courtData.address);
            if (parsed && typeof parsed === 'object' && 'line1' in parsed) {
              parsedAddress = parsed as EnhancedAddressData;
            } else {
              parsedAddress = parseCourtAddress(courtData.address, courtData);
            }
          } catch {
            parsedAddress = parseCourtAddress(courtData.address, courtData);
          }
        } else {
          parsedAddress = parseCourtAddress(courtData.address, courtData);
        }
      } else {
        parsedAddress = (courtData.address as EnhancedAddressData) || {
          line1: '', line2: '', locality: '', district: '', 
          cityId: '', stateId: '', pincode: '', countryId: 'IN', source: 'manual'
        };
      }
      
      // Extract city from address string if not in court record
      const cityValue = courtData.city || 
        (typeof courtData.address === 'string' ? extractCityFromAddress(courtData.address) : '') || '';
      
      setFormData({
        name: courtData.name,
        type: courtData.type,
        authorityLevel: courtData.authorityLevel,
        matterTypes: courtData.matterTypes || [],
        jurisdiction: courtData.jurisdiction,
        address: parsedAddress,
        digitalFiling: courtData.digitalFiling,
        digitalFilingPortal: courtData.digitalFilingPortal || '',
        digitalFilingPortalUrl: courtData.digitalFilingPortalUrl || '',
        digitalFilingInstructions: courtData.digitalFilingInstructions || '',
        workingDays: courtData.workingDays,
        phone: courtData.phone || '',
        email: courtData.email || '',
        benchLocation: courtData.benchLocation || '',
        city: cityValue,
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
        address: {
          line1: '',
          line2: '',
          locality: '',
          district: '',
          cityId: '',
          stateId: '',
          countryId: 'IN',
          source: 'manual'
        } as EnhancedAddressData,
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

    // Validate required fields
    if (!formData.name?.trim()) {
      newErrors.name = 'Authority name is required';
    }

    if (!formData.jurisdiction?.trim()) {
      newErrors.jurisdiction = 'Jurisdiction is required';
    }

    if (!formData.city?.trim()) {
      newErrors.city = 'City is required';
    }

    // Validate pincode format if address is EnhancedAddressData
    if (typeof formData.address === 'object' && formData.address.pincode) {
      const pincodeValidation = clientsService.validatePincode(formData.address.pincode);
      if (!pincodeValidation.isValid) {
        newErrors.pincode = pincodeValidation.errors[0];
      }
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
    
    // Validate form before submission
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
        let addressId: string | undefined;
        
        // Save address if address master is enabled
        if (isAddressMasterEnabled) {
          try {
            const addressResponse = await addressMasterService.createAddress(formData.address);
            
            if (addressResponse.success && addressResponse.data) {
              addressId = addressResponse.data.id;
            }
          } catch (error) {
            console.error('Failed to save address:', error);
          }
        }

        const courtToCreate = {
          name: formData.name,
          type: formData.type,
          authorityLevel: formData.authorityLevel,
          matterTypes: formData.matterTypes,
          jurisdiction: formData.jurisdiction,
          address: formData.address,
          digitalFiling: formData.digitalFiling,
          digitalFilingPortal: formData.digitalFilingPortal,
          digitalFilingPortalUrl: formData.digitalFilingPortalUrl,
          digitalFilingInstructions: formData.digitalFilingInstructions,
          workingDays: formData.workingDays,
          phone: formData.phone,
          email: formData.email,
          benchLocation: formData.benchLocation,
          addressId: addressId,
          city: formData.city,
          status: formData.status,
          taxJurisdiction: formData.taxJurisdiction,
          officerDesignation: formData.officerDesignation
        };

        const created = await courtsService.create(courtToCreate, dispatch);

        // Link address if saved
        if (addressId && created.id) {
          await addressMasterService.linkAddress('court', created.id, addressId, true);
        }
      } else if (mode === 'edit' && courtData) {
        // Handle address updates
        if (isAddressMasterEnabled && courtData.addressId) {
          try {
            await addressMasterService.updateAddress(courtData.addressId, formData.address);
          } catch (error) {
            console.error('Failed to update address:', error);
          }
        }

        const updates = {
          ...courtData,
          name: formData.name,
          type: formData.type,
          authorityLevel: formData.authorityLevel,
          matterTypes: formData.matterTypes,
          jurisdiction: formData.jurisdiction,
          address: formData.address,
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
      // RBAC permission check
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
                <Label htmlFor="name">Legal Forum Name <span className="text-destructive">*</span></Label>
                <FieldTooltip formId="create-court" fieldId="name" />
              </div>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                onBlur={(e) => setFormData(prev => ({ ...prev, name: autoCapitalizeFirst(e.target.value) }))}
                placeholder="Example: Commissioner (Appeals), CGST Zone - Ahmedabad"
                disabled={mode === 'view'}
                required
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Enter the official name of the legal authority or forum
              </p>
            </div>

            {/* Tax Jurisdiction and Officer Designation - New CGST/SGST fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1">
                  <Label htmlFor="taxJurisdiction">Tax Jurisdiction <span className="text-destructive">*</span></Label>
                  <FieldTooltip formId="create-court" fieldId="taxJurisdiction" />
                </div>
                <Select
                  value={formData.taxJurisdiction || ''}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    taxJurisdiction: value as TaxJurisdiction || undefined,
                    officerDesignation: undefined // Reset officer when jurisdiction changes
                  }))}
                  disabled={mode === 'view'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select CGST or SGST" />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_JURISDICTION_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col py-1">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Central or State GST authority
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1">
                  <Label htmlFor="officerDesignation">Officer Designation <span className="text-destructive">*</span></Label>
                  <FieldTooltip formId="create-court" fieldId="officerDesignation" />
                </div>
                <Select
                  value={formData.officerDesignation || ''}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    officerDesignation: value as OfficerDesignation || undefined
                  }))}
                  disabled={mode === 'view' || !formData.taxJurisdiction}
                >
                <SelectTrigger>
                    <SelectValue placeholder={formData.taxJurisdiction ? "Select officer designation" : "Select tax jurisdiction first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getOfficersByJurisdiction(formData.taxJurisdiction).map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="font-medium">{option.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.taxJurisdiction ? `${formData.taxJurisdiction} officer hierarchy` : 'Officer rank in GST hierarchy'}
                </p>
              </div>
            </div>

            {/* Legacy Authority Level - For case lifecycle tracking (hidden/optional) */}
            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="authorityLevel">Authority Level (Case Lifecycle)</Label>
                <FieldTooltip formId="create-court" fieldId="authorityLevel" />
              </div>
              <Select
                value={formData.authorityLevel || ''}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  authorityLevel: value as AuthorityLevel || undefined,
                  matterTypes: [] // Reset matter types when authority level changes
                }))}
                disabled={mode === 'view'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select authority level (optional)" />
                </SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {AUTHORITY_LEVEL_OPTIONS.filter(opt => opt.value !== 'all').map(option => {
                    const metadata = AUTHORITY_LEVEL_METADATA[option.value as any];
                    
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col py-1">
                          <span className="font-medium">{option.label}</span>
                          {metadata && (
                            <span className="text-xs text-muted-foreground">
                              {metadata.hint}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Used for case lifecycle tracking (Assessment → Appeal → Tribunal flow)
              </p>
            </div>

            {/* Matter Types - Conditional based on authority level */}
            {formData.authorityLevel && 
             authorityHierarchyService.allowsMatterTypes(formData.authorityLevel) && (
              <div>
                <div className="flex items-center gap-1">
                  <Label>Applicable Matter Types</Label>
                  <FieldTooltip formId="create-court" fieldId="matterTypes" />
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Select which matter types this forum handles
                </p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-3">
                  {authorityHierarchyService
                    .getMatterTypesByLevel(formData.authorityLevel)
                    .map(matterType => (
                      <div key={matterType.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`matter-${matterType.id}`}
                          checked={formData.matterTypes?.includes(matterType.id)}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({
                              ...prev,
                              matterTypes: checked
                                ? [...(prev.matterTypes || []), matterType.id]
                                : prev.matterTypes?.filter(id => id !== matterType.id) || []
                            }));
                          }}
                          disabled={mode === 'view'}
                        />
                        <Label 
                          htmlFor={`matter-${matterType.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {matterType.name}
                          {matterType.description && (
                            <span className="text-xs text-muted-foreground ml-1">
                              - {matterType.description}
                            </span>
                          )}
                        </Label>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1">
                  <Label htmlFor="jurisdiction">Jurisdiction <span className="text-destructive">*</span></Label>
                  <FieldTooltip formId="create-court" fieldId="jurisdiction" />
                </div>
                <Input
                  id="jurisdiction"
                  value={formData.jurisdiction}
                  onChange={(e) => setFormData(prev => ({ ...prev, jurisdiction: e.target.value }))}
                  onBlur={(e) => setFormData(prev => ({ ...prev, jurisdiction: autoCapitalizeFirst(e.target.value) }))}
                  placeholder="Example: Ahmedabad South Division, Gujarat State, All India"
                  disabled={mode === 'view'}
                  required
                  className={errors.jurisdiction ? 'border-destructive' : ''}
                />
                {errors.jurisdiction && (
                  <p className="text-xs text-destructive mt-1">{errors.jurisdiction}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Geographic area or taxpayer category this authority covers
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <Label htmlFor="type">Legacy Type</Label>
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
            </CardContent>
            </Card>

            {/* Section 2: Contact Information */}
            <Card className="rounded-beacon-lg border bg-card shadow-beacon-md">
              <CardHeader className="border-b border-border p-6 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contact Information
                </CardTitle>
              </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={mode === 'view'}
                    placeholder="+91-79-12345678"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Include STD code (e.g., +91-79 for Ahmedabad)
                  </p>
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={mode === 'view'}
                    placeholder="authority@gov.in"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Official email address for correspondence
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <Label htmlFor="benchLocation">Bench Location</Label>
                    <FieldTooltip formId="create-court" fieldId="benchLocation" />
                  </div>
                  <Input
                    id="benchLocation"
                    value={formData.benchLocation}
                    onChange={(e) => setFormData(prev => ({ ...prev, benchLocation: e.target.value }))}
                    onBlur={(e) => setFormData(prev => ({ ...prev, benchLocation: autoCapitalizeFirst(e.target.value) }))}
                    disabled={mode === 'view'}
                    placeholder="Example: Ahmedabad, New Delhi"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Physical location where hearings are conducted
                  </p>
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
                    placeholder="City will be auto-extracted from address"
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

            {/* Section 3: Address - Using SimpleAddressForm to eliminate race conditions */}
            <Card className="rounded-beacon-lg border bg-card shadow-beacon-md">
              <CardHeader className="border-b border-border p-6 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
              {mode === 'view' && isAddressMasterEnabled ? (
                <AddressView 
                  address={formData.address}
                  showSource={true}
                  showActions={false}
                />
              ) : (
                <SimpleAddressForm
                  value={{
                    line1: typeof formData.address === 'object' ? formData.address.line1 || '' : String(formData.address || ''),
                    line2: typeof formData.address === 'object' ? formData.address.line2 || '' : '',
                    cityName: formData.city || (typeof formData.address === 'object' ? formData.address.cityName || '' : ''),
                    stateName: typeof formData.address === 'object' ? formData.address.stateName || '' : '',
                    pincode: typeof formData.address === 'object' ? formData.address.pincode || '' : '',
                    countryName: 'India'
                  }}
                  onChange={(addr: SimpleAddressData) => {
                    // Convert SimpleAddressData to EnhancedAddressData format for storage
                    const enhancedAddress: EnhancedAddressData = {
                      ...formData.address,
                      line1: addr.line1 || '',
                      line2: addr.line2 || '',
                      cityName: addr.cityName || '',
                      stateName: addr.stateName || '',
                      pincode: addr.pincode || '',
                      countryId: 'IN',
                      source: 'manual'
                    };
                    setFormData(prev => ({
                      ...prev,
                      address: enhancedAddress,
                      city: addr.cityName || prev.city || ''
                    }));
                  }}
                  disabled={mode === 'view'}
                />
                )}
              </CardContent>
            </Card>

            {/* Section 4: Court-Specific Details */}
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="digitalFilingPortal">Portal Name</Label>
                    <Input
                      id="digitalFilingPortal"
                      value={formData.digitalFilingPortal}
                      onChange={(e) => setFormData(prev => ({ ...prev, digitalFilingPortal: e.target.value }))}
                      disabled={mode === 'view'}
                      placeholder="e.g., ACES, GST Portal, e-Filing"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Name of the digital filing system
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="digitalFilingPortalUrl">Portal URL</Label>
                    <Input
                      id="digitalFilingPortalUrl"
                      type="url"
                      value={formData.digitalFilingPortalUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, digitalFilingPortalUrl: e.target.value }))}
                      disabled={mode === 'view'}
                      placeholder="https://example.gov.in/portal"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Direct link to the filing portal
                    </p>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="digitalFilingInstructions">Filing Instructions</Label>
                  <Textarea
                    id="digitalFilingInstructions"
                    value={formData.digitalFilingInstructions}
                    onChange={(e) => setFormData(prev => ({ ...prev, digitalFilingInstructions: e.target.value }))}
                    disabled={mode === 'view'}
                    placeholder="Step-by-step instructions for digital filing, required documents, login credentials, etc."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Brief guide for filing documents electronically
                  </p>
                </div>
              </div>
            )}

            <div>
              <Label>Working Days</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {workingDayOptions.map(day => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={day}
                      checked={formData.workingDays.includes(day)}
                      onCheckedChange={(checked) => handleWorkingDayChange(day, checked as boolean)}
                      disabled={mode === 'view'}
                    />
                    <Label htmlFor={day} className="text-sm">{day}</Label>
                  </div>
                ))}
              </div>
            </div>
            </CardContent>
          </Card>
        </form>
      </AdaptiveFormShell>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the court
              and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};