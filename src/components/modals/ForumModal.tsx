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
import { useAppState, Forum } from '@/contexts/AppStateContext';
import { AddressForm } from '@/components/ui/AddressForm';
import { AddressView } from '@/components/ui/AddressView';
import { EnhancedAddressData, addressMasterService } from '@/services/addressMasterService';
import { featureFlagService } from '@/services/featureFlagService';
import { MapPin, Phone, Mail, Building2, Scale } from 'lucide-react';
import { FieldTooltip } from '@/components/ui/field-tooltip';
import { AUTHORITY_LEVEL_OPTIONS, AuthorityLevel } from '@/types/authority-level';

interface ForumModalProps {
  isOpen: boolean;
  onClose: () => void;
  court?: Forum | null;
  mode: 'create' | 'edit' | 'view';
}

const workingDayOptions = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

function ForumModal({ isOpen, onClose, court: courtData, mode }: ForumModalProps) {
  const { state, dispatch } = useAppState();
  const [formData, setFormData] = useState<any>({
    name: '',
    type: 'Supreme Court',
    authorityLevel: undefined,
    jurisdiction: '',
    address: {},
    digitalFiling: true,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    phone: '',
    email: '',
    benchLocation: '',
    city: ''
  });

  const [isAddressMasterEnabled, setIsAddressMasterEnabled] = useState(false);

  useEffect(() => {
    const checkFeatureFlag = async () => {
      const enabled = await featureFlagService.isEnabled('address_master_v1');
      setIsAddressMasterEnabled(enabled);
    };
    checkFeatureFlag();
  }, []);

  useEffect(() => {
    if (courtData && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: courtData.name || '',
        type: courtData.type || 'Supreme Court',
        authorityLevel: courtData.authorityLevel,
        jurisdiction: courtData.jurisdiction || '',
        address: courtData.address || {},
        digitalFiling: courtData.digitalFiling ?? true,
        workingDays: courtData.workingDays || [],
        phone: courtData.phone || '',
        email: courtData.email || '',
        benchLocation: courtData.benchLocation || '',
        city: courtData.city || ''
      });
    }
  }, [courtData, mode]);

  const handleWorkingDayChange = (day: string) => {
    setFormData((prev: any) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((d: string) => d !== day)
        : [...prev.workingDays, day]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let addressId: string | undefined;

    if (isAddressMasterEnabled && formData.address) {
      try {
        const savedAddress = await addressMasterService.createAddress(formData.address);
        addressId = savedAddress.data?.id;
      } catch (error) {
        console.error('Failed to save address:', error);
      }
    }

    if (mode === 'create') {
      const newCourt: Forum = {
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
        city: formData.city
      };

      if (addressId) {
        await addressMasterService.linkAddress('court', newCourt.id, addressId, true);
      }

      // BACKWARD COMPATIBILITY: Support both action types
      dispatch({ type: 'ADD_COURT', payload: newCourt });
      toast({
        title: "Legal Forum Added",
        description: `Legal Forum "${formData.name}" has been added successfully.`,
      });
    } else if (mode === 'edit' && courtData) {
      if (isAddressMasterEnabled && courtData.addressId) {
        try {
          await addressMasterService.updateAddress(courtData.addressId, formData.address);
        } catch (error) {
          console.error('Failed to update address:', error);
        }
      }

      const updatedCourt: Forum = {
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
        city: formData.city
      };

      // BACKWARD COMPATIBILITY: Support both action types
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
      // BACKWARD COMPATIBILITY: Support both action types
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add New Legal Forum' : mode === 'edit' ? 'Edit Legal Forum' : 'Legal Forum Details'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Enter the details for the new legal forum' : mode === 'edit' ? 'Update the legal forum information' : 'View legal forum details'}
          </DialogDescription>
        </DialogHeader>

        <form id="court-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Legal Forum Name
                <FieldTooltip formId="forum-form" fieldId="name" content="Enter the official name of the legal forum." />
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={mode === 'view'}
                required
              />
            </div>

            <div>
              <Label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Legal Forum Type
                <FieldTooltip formId="forum-form" fieldId="type" content="Select the type of legal forum." />
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
                disabled={mode === 'view'}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a type" />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="authorityLevel" className="block text-sm font-medium text-gray-700">
                Authority Level
                <FieldTooltip formId="forum-form" fieldId="authorityLevel" content="Select the authority level of the legal forum." />
              </Label>
              <Select
                value={formData.authorityLevel || ''}
                onValueChange={(value) => setFormData({ ...formData, authorityLevel: value })}
                disabled={mode === 'view'}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Authority Level" />
                </SelectTrigger>
                <SelectContent>
                  {AUTHORITY_LEVEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="city" className="block text-sm font-medium text-gray-700">
                City
                <FieldTooltip formId="forum-form" fieldId="city" content="Enter the city where the legal forum is located." />
              </Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                disabled={mode === 'view'}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="jurisdiction" className="block text-sm font-medium text-gray-700">
              Jurisdiction
              <FieldTooltip formId="forum-form" fieldId="jurisdiction" content="Specify the jurisdiction covered by this legal forum." />
            </Label>
            <Input
              id="jurisdiction"
              value={formData.jurisdiction}
              onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
              disabled={mode === 'view'}
              required
            />
          </div>

          <div>
            <Label className="block text-sm font-medium text-gray-700">
              Address
              <FieldTooltip formId="forum-form" fieldId="address" content="Enter the complete address of the legal forum." />
            </Label>
            {isAddressMasterEnabled ? (
              mode === 'view' ? (
                <AddressView address={formData.address} />
              ) : (
                <AddressForm
                  value={formData.address}
                  onChange={(newAddress: EnhancedAddressData) => setFormData({ ...formData, address: newAddress })}
                  disabled={false}
                />
              )
            ) : (
              <Input
                id="address"
                value={typeof formData.address === 'string' ? formData.address : ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={mode === 'view'}
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone
                <FieldTooltip formId="forum-form" fieldId="phone" content="Enter the contact phone number of the legal forum." />
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={mode === 'view'}
              />
            </div>

            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
                <FieldTooltip formId="forum-form" fieldId="email" content="Enter the contact email address of the legal forum." />
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={mode === 'view'}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="benchLocation" className="block text-sm font-medium text-gray-700">
              Bench Location
              <FieldTooltip formId="forum-form" fieldId="benchLocation" content="Specify the bench location within the legal forum, if applicable." />
            </Label>
            <Input
              id="benchLocation"
              value={formData.benchLocation}
              onChange={(e) => setFormData({ ...formData, benchLocation: e.target.value })}
              disabled={mode === 'view'}
            />
          </div>

          <div>
            <Label className="block text-sm font-medium text-gray-700">
              Working Days
              <FieldTooltip formId="forum-form" fieldId="workingDays" content="Select the working days for this legal forum." />
            </Label>
            <div className="flex flex-wrap gap-2">
              {workingDayOptions.map((day) => (
                <div key={day} className="space-x-2 flex items-center">
                  <Checkbox
                    id={`working-day-${day}`}
                    checked={formData.workingDays.includes(day)}
                    onCheckedChange={() => handleWorkingDayChange(day)}
                    disabled={mode === 'view'}
                  />
                  <Label htmlFor={`working-day-${day}`} className="text-gray-700">
                    {day}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Label htmlFor="digitalFiling" className="text-sm font-medium text-gray-700">
              Digital Filing Available
              <FieldTooltip formId="forum-form" fieldId="digitalFiling" content="Indicate whether digital filing is available at this legal forum." />
            </Label>
            <Switch
              id="digitalFiling"
              checked={formData.digitalFiling}
              onCheckedChange={(checked) => setFormData({ ...formData, digitalFiling: checked })}
              disabled={mode === 'view'}
            />
          </div>
        </form>

        <DialogFooter>
          {mode !== 'view' && (
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
                        This action cannot be undone. This will permanently delete the legal forum.
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
}

// Default export
export { ForumModal };

// BACKWARD COMPATIBILITY: Named export
export { ForumModal as CourtModal };
