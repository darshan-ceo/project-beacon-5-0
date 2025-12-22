import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserCircle, Building2, Trash2 } from 'lucide-react';
import { 
  clientContactsService, 
  ClientContact, 
  ContactRole, 
  CreateContactRequest,
  ContactEmail,
  ContactPhone
} from '@/services/clientContactsService';
import { toast } from '@/hooks/use-toast';
import { EmailManager } from '@/components/contacts/EmailManager';
import { PhoneManager } from '@/components/contacts/PhoneManager';
import { SearchableClientSelector } from '@/components/ui/searchable-client-selector';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  contactId?: string;
  onSuccess?: () => void;
  defaultClientId?: string;
}

interface Client {
  id: string;
  name: string;
  display_name: string;
}

const availableRoles: { role: ContactRole; label: string }[] = [
  { role: 'primary', label: 'Primary Contact' },
  { role: 'billing', label: 'Billing Contact' },
  { role: 'legal_notice', label: 'Legal Notice' },
  { role: 'authorized_signatory', label: 'Authorized Signatory' },
];

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  mode,
  contactId,
  onSuccess,
  defaultClientId
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState<CreateContactRequest & { clientId?: string | null; isActive?: boolean }>({
    name: '',
    designation: '',
    emails: [],
    phones: [],
    roles: ['primary'],
    isPrimary: false,
    notes: '',
    dataScope: 'TEAM',
    clientId: defaultClientId || null,
    isActive: true
  });

  const [contactData, setContactData] = useState<(ClientContact & { clientName?: string }) | null>(null);

  // Load clients for selector
  useEffect(() => {
    const loadClients = async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, display_name')
        .eq('status', 'Active')
        .order('display_name');
      
      if (data) {
        setClients(data.map(c => ({
          id: c.id,
          name: c.display_name,
          display_name: c.display_name
        })));
      }
    };
    
    if (isOpen) {
      loadClients();
    }
  }, [isOpen]);

  // Load contact data when editing/viewing
  useEffect(() => {
    const loadContact = async () => {
      if (!contactId || mode === 'create') {
        setContactData(null);
        setFormData({
          name: '',
          designation: '',
          emails: [],
          phones: [],
          roles: ['primary'],
          isPrimary: false,
          notes: '',
          dataScope: 'TEAM',
          clientId: defaultClientId || null,
          isActive: true
        });
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await clientContactsService.getContactById(contactId);
        
        if (result.success && result.data) {
          const contact = result.data;
          setContactData(contact);
          setFormData({
            name: contact.name,
            designation: contact.designation || '',
            emails: contact.emails || [],
            phones: contact.phones || [],
            roles: contact.roles || ['primary'],
            isPrimary: contact.isPrimary,
            notes: contact.notes || '',
            dataScope: contact.dataScope || 'TEAM',
            clientId: contact.clientId || null,
            isActive: contact.isActive
          });
        } else {
          setError(result.error || 'Failed to load contact');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load contact');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && (mode === 'edit' || mode === 'view')) {
      loadContact();
    } else if (isOpen && mode === 'create') {
      setFormData({
        name: '',
        designation: '',
        emails: [],
        phones: [],
        roles: ['primary'],
        isPrimary: false,
        notes: '',
        dataScope: 'TEAM',
        clientId: defaultClientId || null,
        isActive: true
      });
    }
  }, [isOpen, contactId, mode, defaultClientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (mode === 'create') {
        const response = await clientContactsService.createContact(formData.clientId || null, formData);
        
        if (response.success) {
          toast({
            title: 'Contact Created',
            description: `${formData.name} has been added successfully`,
          });
          onSuccess?.();
          onClose();
        } else {
          setError(response.error || 'Failed to create contact');
        }
      } else if (mode === 'edit' && contactId) {
        const response = await clientContactsService.updateContact(contactId, {
          name: formData.name,
          designation: formData.designation,
          emails: formData.emails,
          phones: formData.phones,
          roles: formData.roles,
          isPrimary: formData.isPrimary,
          notes: formData.notes,
          dataScope: formData.dataScope,
          isActive: formData.isActive
        });
        
        if (response.success) {
          toast({
            title: 'Contact Updated',
            description: `${formData.name} has been updated successfully`,
          });
          onSuccess?.();
          onClose();
        } else {
          setError(response.error || 'Failed to update contact');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!contactId) return;
    
    setSaving(true);
    try {
      const response = await clientContactsService.deleteContact(contactId);
      
      if (response.success) {
        toast({
          title: 'Contact Deleted',
          description: 'Contact has been removed successfully',
        });
        onSuccess?.();
        onClose();
      } else {
        setError(response.error || 'Failed to delete contact');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete contact');
    } finally {
      setSaving(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleRoleChange = (role: ContactRole, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      roles: checked 
        ? [...prev.roles, role]
        : prev.roles.filter(r => r !== role)
    }));
  };

  const isViewMode = mode === 'view';

  const getTitle = () => {
    switch (mode) {
      case 'create': return 'Add New Contact';
      case 'edit': return 'Edit Contact';
      case 'view': return 'Contact Details';
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <UserCircle className="h-6 w-6 text-primary" />
              <div>
                <DialogTitle>{getTitle()}</DialogTitle>
                <DialogDescription>
                  {mode === 'create' 
                    ? 'Create a new contact (client-linked or standalone)'
                    : contactData?.clientName 
                      ? `Linked to ${contactData.clientName}` 
                      : 'Standalone contact'
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter contact name"
                  disabled={isViewMode}
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
                  disabled={isViewMode}
                />
              </div>

              {/* Client Selector (only for create mode) */}
              {mode === 'create' && (
                <div className="space-y-2">
                  <Label>Link to Client (Optional)</Label>
                  <SearchableClientSelector
                    clients={clients}
                    value={formData.clientId || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value || null }))}
                    disabled={isViewMode}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for a standalone contact
                  </p>
                </div>
              )}

              {/* Client Badge (for edit/view) */}
              {mode !== 'create' && contactData?.clientName && (
                <div className="flex items-center gap-2">
                  <Label>Linked Client</Label>
                  <Badge variant="outline" className="gap-1">
                    <Building2 className="h-3 w-3" />
                    {contactData.clientName}
                  </Badge>
                </div>
              )}

              {/* Email Manager */}
              <EmailManager
                emails={formData.emails || []}
                onChange={(emails) => setFormData(prev => ({ ...prev, emails }))}
                disabled={isViewMode}
              />

              {/* Phone Manager */}
              <PhoneManager
                phones={formData.phones || []}
                onChange={(phones) => setFormData(prev => ({ ...prev, phones }))}
                disabled={isViewMode}
              />

              {/* Roles */}
              <div className="space-y-3">
                <Label>Roles *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {availableRoles.map(({ role, label }) => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={role}
                        checked={formData.roles.includes(role)}
                        onCheckedChange={(checked) => handleRoleChange(role, checked as boolean)}
                        disabled={isViewMode}
                      />
                      <Label htmlFor={role} className="text-sm font-normal">
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Primary Contact */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPrimary"
                    checked={formData.isPrimary}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, isPrimary: checked as boolean }))
                    }
                    disabled={isViewMode}
                  />
                  <Label htmlFor="isPrimary" className="text-sm font-normal">
                    Primary Contact
                  </Label>
                </div>

                {/* Status */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, isActive: checked as boolean }))
                    }
                    disabled={isViewMode}
                  />
                  <Label htmlFor="isActive" className="text-sm font-normal">
                    Active
                  </Label>
                </div>
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
                  disabled={isViewMode}
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

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes"
                  disabled={isViewMode}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <DialogFooter className="flex-col sm:flex-row gap-2">
                {mode === 'edit' && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={saving}
                    className="sm:mr-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={onClose}>
                  {isViewMode ? 'Close' : 'Cancel'}
                </Button>
                {!isViewMode && (
                  <Button 
                    type="submit" 
                    disabled={saving || !formData.name.trim() || formData.roles.length === 0}
                  >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {mode === 'create' ? 'Create Contact' : 'Save Changes'}
                  </Button>
                )}
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{formData.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
