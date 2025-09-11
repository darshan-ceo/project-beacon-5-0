import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { MapPin, Phone, Mail } from 'lucide-react';
import { FieldTooltip } from '@/components/ui/field-tooltip';

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
    jurisdiction: string;
    address: EnhancedAddressData;
    establishedYear: number;
    totalJudges: number;
    digitalFiling: boolean;
    workingDays: string[];
    phone?: string;
    email?: string;
    benchLocation?: string;
    addressId?: string;
  }>({
    name: '',
    type: 'District Court',
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
    establishedYear: new Date().getFullYear(),
    totalJudges: 1,
    digitalFiling: false,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    phone: '',
    email: '',
    benchLocation: ''
  });
  const [isAddressMasterEnabled, setIsAddressMasterEnabled] = useState(false);

  useEffect(() => {
    setIsAddressMasterEnabled(featureFlagService.isEnabled('address_master_v1'));
    
    if (courtData && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: courtData.name,
        type: courtData.type,
        jurisdiction: courtData.jurisdiction,
        address: typeof courtData.address === 'string' 
          ? { line1: courtData.address, line2: '', locality: '', district: '', cityId: '', stateId: '', pincode: '', countryId: 'IN', source: 'manual' } as EnhancedAddressData
          : courtData.address as EnhancedAddressData,
        establishedYear: courtData.establishedYear,
        totalJudges: courtData.totalJudges,
        digitalFiling: courtData.digitalFiling,
        workingDays: courtData.workingDays,
        phone: courtData.phone || '',
        email: courtData.email || '',
        benchLocation: courtData.benchLocation || ''
      });
    } else if (mode === 'create') {
      setFormData({
        name: '',
        type: 'District Court',
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
        establishedYear: new Date().getFullYear(),
        totalJudges: 1,
        digitalFiling: false,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        phone: '',
        email: '',
        benchLocation: ''
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
        jurisdiction: formData.jurisdiction,
        address: formData.address,
        establishedYear: formData.establishedYear,
        totalJudges: formData.totalJudges,
        activeCases: 0,
        avgHearingTime: '30 mins',
        digitalFiling: formData.digitalFiling,
        workingDays: formData.workingDays,
        phone: formData.phone,
        email: formData.email,
        benchLocation: formData.benchLocation,
        addressId: addressId
      };

      // Link address if saved
      if (addressId) {
        await addressMasterService.linkAddress('court', newCourt.id, addressId, true);
      }

      dispatch({ type: 'ADD_COURT', payload: newCourt });
      toast({
        title: "Court Added",
        description: `Court "${formData.name}" has been added successfully.`,
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
        jurisdiction: formData.jurisdiction,
        address: formData.address,
        establishedYear: formData.establishedYear,
        totalJudges: formData.totalJudges,
        digitalFiling: formData.digitalFiling,
        workingDays: formData.workingDays,
        phone: formData.phone,
        email: formData.email,
        benchLocation: formData.benchLocation
      };

      dispatch({ type: 'UPDATE_COURT', payload: updatedCourt });
      toast({
        title: "Court Updated",
        description: `Court "${formData.name}" has been updated successfully.`,
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (courtData) {
      dispatch({ type: 'DELETE_COURT', payload: courtData.id });
      toast({
        title: "Court Deleted",
        description: `Court "${courtData.name}" has been deleted.`,
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add New Court' : mode === 'edit' ? 'Edit Court' : 'View Court'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Create a new court record with jurisdiction and contact details.' :
             mode === 'edit' ? 'Update court information and address details.' :
             'View court information and contact details.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <div className="flex items-center gap-1">
              <Label htmlFor="name">Court Name</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="type">Court Type</Label>
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
            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="jurisdiction">Jurisdiction</Label>
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
          </div>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="establishedYear">Established Year</Label>
              <Input
                id="establishedYear"
                type="number"
                value={formData.establishedYear}
                onChange={(e) => setFormData(prev => ({ ...prev, establishedYear: parseInt(e.target.value) || new Date().getFullYear() }))}
                disabled={mode === 'view'}
                min="1800"
                max={new Date().getFullYear()}
                required
              />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="totalJudges">Total Judges</Label>
                <FieldTooltip formId="create-court" fieldId="total-judges" />
              </div>
              <Input
                id="totalJudges"
                type="number"
                value={formData.totalJudges}
                onChange={(e) => setFormData(prev => ({ ...prev, totalJudges: parseInt(e.target.value) || 1 }))}
                disabled={mode === 'view'}
                min="1"
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="digitalFiling"
              checked={formData.digitalFiling}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, digitalFiling: checked }))}
              disabled={mode === 'view'}
            />
            <Label htmlFor="digitalFiling">Digital Filing Enabled</Label>
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

          <div className="flex justify-between">
            {mode === 'view' ? (
              <Button type="button" onClick={onClose}>
                Close
              </Button>
            ) : (
              <>
                <div className="flex gap-2">
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
                </div>
                <Button type="submit">
                  {mode === 'create' ? 'Create Court' : 'Update Court'}
                </Button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};