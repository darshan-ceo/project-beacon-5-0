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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { 
  clientContactsService, 
  ClientContact, 
  ContactRole, 
  CreateContactRequest,
  ContactEmail,
  ContactPhone
} from '@/services/clientContactsService';
import { toast } from '@/hooks/use-toast';
import { EmailManager } from './EmailManager';
import { PhoneManager } from './PhoneManager';

interface CreateContactDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string; // Optional - supports standalone contacts
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
    emails: [],
    phones: [],
    roles: defaultRoles.length > 0 ? defaultRoles : ['primary'],
    isPrimary: false,
    notes: '',
    dataScope: 'TEAM' // Default data scope for contacts
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await clientContactsService.createContact(clientId || null, formData);
      
      if (response.success && response.data) {
        onSuccess(response.data);
        handleClose();
        toast({
          title: 'Contact Created',
          description: `${formData.name} has been added successfully`,
        });
      } else {
        const errorMsg = response.error || 'Failed to create contact';
        setError(errorMsg);
        toast({
          title: 'Failed to Create Contact',
          description: errorMsg,
          variant: 'destructive'
        });
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Network error. Please try again.';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      designation: '',
      emails: [],
      phones: [],
      roles: defaultRoles.length > 0 ? defaultRoles : ['primary'],
      isPrimary: false,
      notes: '',
      dataScope: 'TEAM'
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
      <SheetContent side="right" className="w-[400px] sm:w-[500px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Add New Contact</SheetTitle>
          <SheetDescription>
            {clientId ? 'Create a new contact for this client' : 'Create a standalone contact'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable body section */}
          <div className="flex-1 overflow-y-auto space-y-4 mt-6 pr-2">
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

          {/* Email Manager */}
          <EmailManager
            emails={formData.emails || []}
            onChange={(emails) => setFormData(prev => ({ ...prev, emails }))}
            disabled={loading}
          />

          {/* Phone Manager */}
          <PhoneManager
            phones={formData.phones || []}
            onChange={(phones) => setFormData(prev => ({ ...prev, phones }))}
            disabled={loading}
          />

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

          {/* Data Visibility Scope */}
          <div className="space-y-2">
            <Label htmlFor="dataScope">Data Visibility</Label>
            <p className="text-xs text-muted-foreground">
              Who can see this contact record
            </p>
            <Select 
              value={formData.dataScope || 'TEAM'} 
              onValueChange={(value: 'OWN' | 'TEAM' | 'ALL') => 
                setFormData(prev => ({ ...prev, dataScope: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OWN">Own Only</SelectItem>
                <SelectItem value="TEAM">Team Members</SelectItem>
                <SelectItem value="ALL">Everyone</SelectItem>
              </SelectContent>
            </Select>
          </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Fixed footer section */}
          <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t mt-4 bg-background">
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