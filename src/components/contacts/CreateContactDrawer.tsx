/**
 * Create Contact Drawer Component for Beacon Essential 5.0
 * Quick contact creation from within other workflows
 */

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { 
  clientContactsService, 
  ClientContact, 
  ContactRole, 
  CreateContactRequest 
} from '@/services/clientContactsService';
import { toast } from '@/hooks/use-toast';

interface CreateContactDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  onSuccess: (contact: ClientContact) => void;
  defaultRoles?: ContactRole[];
}

export const CreateContactDrawer: React.FC<CreateContactDrawerProps> = ({
  isOpen,
  onClose,
  clientId,
  onSuccess,
  defaultRoles = []
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateContactRequest>({
    name: '',
    designation: '',
    email: '',
    phone: '',
    altPhone: '',
    roles: defaultRoles.length > 0 ? defaultRoles : ['primary'],
    isPrimary: false,
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await clientContactsService.createContact(clientId, formData);
      
      if (response.success && response.data) {
        onSuccess(response.data);
        handleClose();
        toast({
          title: 'Contact Created',
          description: `${formData.name} has been added successfully`,
        });
      } else {
        setError(response.error || 'Failed to create contact');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      designation: '',
      email: '',
      phone: '',
      altPhone: '',
      roles: defaultRoles.length > 0 ? defaultRoles : ['primary'],
      isPrimary: false,
      notes: ''
    });
    setError(null);
    onClose();
  };

  const handleRoleChange = (role: ContactRole, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      roles: checked 
        ? [...prev.roles, role]
        : prev.roles.filter(r => r !== role)
    }));
  };

  const availableRoles: { role: ContactRole; label: string }[] = [
    { role: 'primary', label: 'Primary Contact' },
    { role: 'billing', label: 'Billing Contact' },
    { role: 'legal_notice', label: 'Legal Notice' },
    { role: 'authorized_signatory', label: 'Authorized Signatory' },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-[400px] sm:w-[500px]">
        <SheetHeader>
          <SheetTitle>Add New Contact</SheetTitle>
          <SheetDescription>
            Create a new contact for this client
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter contact name"
              required
            />
          </div>

          {/* Designation */}
          <div className="space-y-2">
            <Label htmlFor="designation">Designation</Label>
            <Input
              id="designation"
              value={formData.designation}
              onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
              placeholder="e.g., Director, Manager"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="contact@example.com"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+91 9876543210"
            />
          </div>

          {/* Alt Phone */}
          <div className="space-y-2">
            <Label htmlFor="altPhone">Alternate Phone</Label>
            <Input
              id="altPhone"
              value={formData.altPhone}
              onChange={(e) => setFormData(prev => ({ ...prev, altPhone: e.target.value }))}
              placeholder="+91 9876543210"
            />
          </div>

          {/* Roles */}
          <div className="space-y-3">
            <Label>Roles *</Label>
            <div className="space-y-2">
              {availableRoles.map(({ role, label }) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={role}
                    checked={formData.roles.includes(role)}
                    onCheckedChange={(checked) => handleRoleChange(role, checked as boolean)}
                  />
                  <Label htmlFor={role} className="text-sm font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Primary Contact */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPrimary"
              checked={formData.isPrimary}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, isPrimary: checked as boolean }))
              }
            />
            <Label htmlFor="isPrimary" className="text-sm font-normal">
              Set as primary contact
            </Label>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.name.trim() || formData.roles.length === 0}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Contact
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};