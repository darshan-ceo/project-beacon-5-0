import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { MapPin, Phone, Mail, Building2, Scale } from 'lucide-react';
import { FieldTooltip } from '@/components/ui/field-tooltip';
import { AUTHORITY_LEVEL_OPTIONS, AUTHORITY_LEVEL_METADATA, AuthorityLevel } from '@/types/authority-level';

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
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    phone: '',
    email: '',
    benchLocation: '',
    city: '',
    status: 'Active'
  });
  const [isAddressMasterEnabled, setIsAddressMasterEnabled] = useState(false);

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
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        phone: '',
        email: '',
        benchLocation: '',
        city: '',
        status: 'Active'
      });
    }
  }, [courtData, mode]);

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
        id: Date.now().toString(),
        name: formData.name,
        type: formData.type,
        authorityLevel: formData.authorityLevel,
        jurisdiction: formData.jurisdiction,
        address: formData.address,
        activeCases: 0,
        avgHearingTime: '30 mins',
        digitalFiling: formData.digitalFiling,
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
      <DialogContent className="max-w-beacon-modal max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {mode === 'create' ? 'Add New Legal Forum' : mode === 'edit' ? 'Edit Legal Forum' : 'View Legal Forum'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Create a new legal forum record with jurisdiction and contact details.' :
             mode === 'edit' ? 'Update legal forum information and address details.' :
             'View legal forum information and contact details.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="overflow-y-auto max-h-[60vh]">
          <form id="court-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Scale className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Basic Information</h3>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="name">Legal Forum Name <span className="text-destructive">*</span></Label>
                <FieldTooltip formId="create-court" fieldId="name" />
              </div>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={mode === 'view'}
                required
              />
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
                  disabled={mode === 'view'}
                  required
                />
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
          </div>

          {/* Contact Information */}
          <Card>
            <CardHeader>
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
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={mode === 'view'}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="benchLocation">Bench Location</Label>
                  <Input
                    id="benchLocation"
                    value={formData.benchLocation}
                    onChange={(e) => setFormData(prev => ({ ...prev, benchLocation: e.target.value }))}
                    disabled={mode === 'view'}
                    placeholder="Enter bench location"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    disabled={mode === 'view'}
                    placeholder="Enter city or district"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    City or district where authority is located
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent>
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

          {/* Section 3: Court Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Legal Forum Details</h3>
            </div>

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
          </div>
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