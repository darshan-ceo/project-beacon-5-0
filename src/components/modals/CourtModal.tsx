import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Court, useAppState } from '@/contexts/AppStateContext';
import { AddressForm } from '@/components/ui/AddressForm';
import { AddressView } from '@/components/ui/AddressView';
import { EnhancedAddressData, addressMasterService } from '@/services/addressMasterService';
import { featureFlagService } from '@/services/featureFlagService';
import { MapPin, Phone, Mail, Building2, Scale, Globe } from 'lucide-react';
import { FieldTooltip } from '@/components/ui/field-tooltip';
import { AUTHORITY_LEVEL_OPTIONS, AUTHORITY_LEVEL_METADATA, AuthorityLevel } from '@/types/authority-level';
import { clientsService } from '@/services/clientsService';
import { autoCapitalizeFirst } from '@/utils/textFormatters';

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
  }>({
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
    status: 'Active'
  });
  const [isAddressMasterEnabled, setIsAddressMasterEnabled] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setIsAddressMasterEnabled(featureFlagService.isEnabled('address_master_v1'));
    
    if (courtData && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: courtData.name,
        type: courtData.type,
        authorityLevel: courtData.authorityLevel,
        jurisdiction: courtData.jurisdiction,
        address: typeof courtData.address === 'string' 
          ? { line1: courtData.address, line2: '', locality: '', district: '', cityId: '', stateId: '', pincode: '', countryId: 'IN', source: 'manual' } as EnhancedAddressData
          : courtData.address as EnhancedAddressData,
        digitalFiling: courtData.digitalFiling,
        digitalFilingPortal: courtData.digitalFilingPortal || '',
        digitalFilingPortalUrl: courtData.digitalFilingPortalUrl || '',
        digitalFilingInstructions: courtData.digitalFilingInstructions || '',
        workingDays: courtData.workingDays,
        phone: courtData.phone || '',
        email: courtData.email || '',
        benchLocation: courtData.benchLocation || '',
        city: courtData.city || '',
        status: courtData.status || 'Active'
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
        status: 'Active'
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

      const newCourt: Court = {
        id: '', // Will be replaced by server-generated UUID
        name: formData.name,
        type: formData.type,
        authorityLevel: formData.authorityLevel,
        jurisdiction: formData.jurisdiction,
        address: formData.address,
        activeCases: 0,
        avgHearingTime: '30 mins',
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
        status: formData.status
      };

      // Link address if saved
      if (addressId) {
        await addressMasterService.linkAddress('court', newCourt.id, addressId, true);
      }

      dispatch({ type: 'ADD_COURT', payload: newCourt });
      toast({
        title: "Legal Forum Added",
        description: `Legal Forum "${formData.name}" has been added successfully.`,
      });
    } else if (mode === 'edit' && courtData) {
      // Handle address updates
      if (isAddressMasterEnabled && courtData.addressId) {
        try {
          await addressMasterService.updateAddress(courtData.addressId, formData.address);
        } catch (error) {
          console.error('Failed to update address:', error);
        }
      }

      const updatedCourt: Court = {
        ...courtData,
        name: formData.name,
        type: formData.type,
        authorityLevel: formData.authorityLevel,
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
        status: formData.status
      };

      dispatch({ type: 'UPDATE_COURT', payload: updatedCourt });
      toast({
        title: "Legal Forum Updated",
        description: `Legal Forum "${formData.name}" has been updated successfully.`,
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (courtData) {
      dispatch({ type: 'DELETE_COURT', payload: courtData.id });
      toast({
        title: "Legal Forum Deleted",
        description: `Legal Forum "${courtData.name}" has been deleted.`,
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-beacon-modal max-h-[90vh] overflow-hidden border bg-background shadow-beacon-lg rounded-beacon-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {mode === 'create' ? 'Add New Legal Forum' : mode === 'edit' ? 'Edit Legal Forum' : 'View Legal Forum'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="px-6 py-4 overflow-y-auto flex-1">
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

            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="authorityLevel">GST Authority Level <span className="text-destructive">*</span></Label>
                <FieldTooltip formId="create-court" fieldId="authorityLevel" />
              </div>
              <Select
                value={formData.authorityLevel || ''}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  authorityLevel: value as AuthorityLevel || undefined
                }))}
                disabled={mode === 'view'}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select GST authority level" />
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
            </div>

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
                    disabled={mode === 'view'}
                    placeholder="Example: Ahmedabad, Vadodara, Surat"
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

            {/* Section 3: Address */}
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
                <AddressForm
                  value={formData.address}
                  onChange={(address) => setFormData(prev => ({ ...prev, address }))}
                  disabled={mode === 'view'}
                  required={true}
                  module="court"
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
        </DialogBody>

        <DialogFooter className="gap-3">
          {mode === 'view' ? (
            <Button type="button" onClick={onClose}>
              Close
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {mode === 'edit' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive">
                      Delete
                    </Button>
                  </AlertDialogTrigger>
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
              )}
              <Button type="submit" form="court-form">
                {mode === 'create' ? 'Create Court' : 'Update Court'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};