import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { StandardDateInput } from '@/components/ui/standard-date-input';
import type { Signatory, SignatoryEmail, SignatoryPhone } from '@/contexts/AppStateContext';
import { FieldTooltip } from '@/components/ui/field-tooltip';
import { SignatoryEmailManager } from '@/components/contacts/SignatoryEmailManager';
import { SignatoryPhoneManager } from '@/components/contacts/SignatoryPhoneManager';
import { autoCapitalizeFirst } from '@/utils/textFormatters';
import { UserPen } from 'lucide-react';

interface SignatoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  signatory?: Signatory | null;
  mode: 'create' | 'edit' | 'view';
  onSubmit: (signatory: Omit<Signatory, 'id'> | Signatory) => void;
  existingSignatories: Signatory[];
}

export const SignatoryModal: React.FC<SignatoryModalProps> = ({ 
  isOpen, 
  onClose, 
  signatory, 
  mode, 
  onSubmit,
  existingSignatories 
}) => {
  const [formData, setFormData] = useState<{
    fullName: string;
    designation: string;
    emails: SignatoryEmail[];
    phones: SignatoryPhone[];
    dob: string;
    isPrimary: boolean;
    scope: 'All' | 'GST Filings' | 'Litigation' | 'Appeals';
    status: 'Active' | 'Inactive';
  }>({
    fullName: '',
    designation: '',
    emails: [],
    phones: [],
    dob: '',
    isPrimary: false,
    scope: 'All',
    status: 'Active'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (signatory && (mode === 'edit' || mode === 'view')) {
      // Migrate legacy data to new format
      const emails: SignatoryEmail[] = signatory.emails && signatory.emails.length > 0 
        ? signatory.emails 
        : signatory.email 
          ? [{
              id: `email_${Date.now()}`,
              email: signatory.email,
              label: 'Work' as const,
              isPrimary: true,
              isVerified: false,
              status: 'Active' as const
            }]
          : [];

      const phones: SignatoryPhone[] = signatory.phones && signatory.phones.length > 0
        ? signatory.phones
        : signatory.mobile
          ? [{
              id: `phone_${Date.now()}`,
              countryCode: '+91',
              number: signatory.mobile.replace(/[^0-9]/g, ''),
              label: 'Mobile' as const,
              isPrimary: true,
              isWhatsApp: false,
              isVerified: false,
              status: 'Active' as const
            }]
          : [];

      setFormData({
        fullName: signatory.fullName,
        designation: signatory.designation || '',
        emails,
        phones,
        dob: signatory.dob || '',
        isPrimary: signatory.isPrimary,
        scope: signatory.scope,
        status: signatory.status
      });
    } else if (mode === 'create') {
      // For new signatories, auto-enable primary if this is the first signatory
      const shouldBePrimary = existingSignatories.length === 0;
      setFormData({
        fullName: '',
        designation: '',
        emails: [],
        phones: [],
        dob: '',
        isPrimary: shouldBePrimary,
        scope: 'All',
        status: 'Active'
      });
    }
    setErrors({});
  }, [signatory, mode, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    // At least one email OR one phone required
    if (formData.emails.length === 0 && formData.phones.length === 0) {
      newErrors.emails = 'At least one email or phone is required';
      newErrors.phones = 'At least one email or phone is required';
    }

    // Validate primary email exists if emails provided
    if (formData.emails.length > 0) {
      const hasPrimaryEmail = formData.emails.some(e => e.isPrimary);
      if (!hasPrimaryEmail) {
        newErrors.emails = 'One email must be marked as primary';
      }

      // Check for duplicate emails across other signatories
      const emailSet = new Set(formData.emails.map(e => e.email.toLowerCase()));
      for (const sig of existingSignatories) {
        if (signatory && sig.id === signatory.id) continue;
        
        const sigEmails = sig.emails?.map(e => e.email.toLowerCase()) || 
                         (sig.email ? [sig.email.toLowerCase()] : []);
        
        for (const sigEmail of sigEmails) {
          if (emailSet.has(sigEmail)) {
            newErrors.emails = `Email ${sigEmail} already exists for ${sig.fullName}`;
            break;
          }
        }
        if (newErrors.emails) break;
      }
    }

    // Validate primary phone exists if phones provided
    if (formData.phones.length > 0) {
      const hasPrimaryPhone = formData.phones.some(p => p.isPrimary);
      if (!hasPrimaryPhone) {
        newErrors.phones = 'One phone must be marked as primary';
      }
    }

    // DOB validation
    if (formData.dob) {
      const selectedDate = new Date(formData.dob);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate > today) {
        newErrors.dob = 'Date of birth cannot be in the future';
      }
      
      const age = today.getFullYear() - selectedDate.getFullYear();
      if (age < 18) {
        newErrors.dob = 'Signatory must be at least 18 years old';
      } else if (age > 100) {
        newErrors.dob = 'Please enter a valid date of birth';
      }
    }

    // Check if trying to set as primary when another primary exists
    if (formData.isPrimary) {
      const existingPrimary = existingSignatories.find(sig => 
        sig.isPrimary && (!signatory || sig.id !== signatory.id)
      );
      if (existingPrimary) {
        newErrors.isPrimary = `${existingPrimary.fullName} is already the primary signatory`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const signatoryData = mode === 'edit' && signatory ? 
      { ...signatory, ...formData } : 
      formData;

    onSubmit(signatoryData);
    onClose();
  };

  const handlePrimaryChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isPrimary: checked }));
    if (checked) {
      setErrors(prev => ({ ...prev, isPrimary: '' }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-beacon-modal max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-bold flex items-center gap-2">
            <UserPen className="h-5 w-5" />
            {mode === 'create' && 'Add New Signatory'}
            {mode === 'edit' && 'Edit Signatory'}
            {mode === 'view' && 'Signatory Details'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <form id="signatory-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="fullName">Full Name *</Label>
                <FieldTooltip formId="create-signatory" fieldId="name" />
              </div>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, fullName: e.target.value }));
                  setErrors(prev => ({ ...prev, fullName: '' }));
                }}
                onBlur={(e) => {
                  const capitalized = autoCapitalizeFirst(e.target.value);
                  setFormData(prev => ({ ...prev, fullName: capitalized }));
                }}
                disabled={mode === 'view'}
                className={errors.fullName ? 'border-destructive' : ''}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive mt-1">{errors.fullName}</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="designation">Designation</Label>
                <FieldTooltip formId="create-signatory" fieldId="designation" />
              </div>
              <Input
                id="designation"
                value={formData.designation}
                onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                onBlur={(e) => {
                  const capitalized = autoCapitalizeFirst(e.target.value);
                  setFormData(prev => ({ ...prev, designation: capitalized }));
                }}
                disabled={mode === 'view'}
                placeholder="e.g., Director, Partner, Authorized Representative"
              />
            </div>

            <div>
              <SignatoryEmailManager
                emails={formData.emails}
                onChange={(emails) => {
                  setFormData(prev => ({ ...prev, emails }));
                  setErrors(prev => ({ ...prev, emails: '' }));
                }}
                disabled={mode === 'view'}
              />
              {errors.emails && (
                <p className="text-sm text-destructive mt-1">{errors.emails}</p>
              )}
            </div>

            <div>
              <SignatoryPhoneManager
                phones={formData.phones}
                onChange={(phones) => {
                  setFormData(prev => ({ ...prev, phones }));
                  setErrors(prev => ({ ...prev, phones: '' }));
                }}
                disabled={mode === 'view'}
              />
              {errors.phones && (
                <p className="text-sm text-destructive mt-1">{errors.phones}</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="dob">Date of Birth</Label>
                <FieldTooltip formId="create-signatory" fieldId="dob" />
              </div>
              <StandardDateInput
                id="dob"
                value={formData.dob || ''}
                onChange={(value) => {
                  setFormData(prev => ({ ...prev, dob: value }));
                  setErrors(prev => ({ ...prev, dob: '' }));
                }}
                disabled={mode === 'view'}
                max={new Date().toISOString().split('T')[0]}
                error={!!errors.dob}
                showYearDropdown
                fromYear={1924}
                toYear={new Date().getFullYear()}
              />
              {errors.dob && (
                <p className="text-sm text-destructive mt-1">{errors.dob}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Used for KYC, digital signing, and document management
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="scope">Scope of Authority</Label>
                <FieldTooltip formId="create-signatory" fieldId="scope" />
              </div>
              <Select 
                value={formData.scope} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, scope: value as any }))}
                disabled={mode === 'view'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Matters</SelectItem>
                  <SelectItem value="GST Filings">GST Filings Only</SelectItem>
                  <SelectItem value="Litigation">Litigation Only</SelectItem>
                  <SelectItem value="Appeals">Appeals Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label>Primary Signatory</Label>
                  <FieldTooltip formId="create-signatory" fieldId="isPrimary" />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.isPrimary}
                    onCheckedChange={handlePrimaryChange}
                    disabled={mode === 'view'}
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.isPrimary ? 'Primary signatory' : 'Additional signatory'}
                  </span>
                </div>
                {errors.isPrimary && (
                  <p className="text-sm text-destructive">{errors.isPrimary}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label>Status</Label>
                  <FieldTooltip formId="create-signatory" fieldId="status" />
                </div>
                <div>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
                    disabled={mode === 'view'}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {formData.isPrimary && (
              <div className="bg-accent/50 p-3 rounded-md">
                <p className="text-sm text-accent-foreground">
                  <strong>Primary Signatory:</strong> This person will be the main contact for all communications 
                  and will have full authority to represent the client in all matters.
                </p>
              </div>
            )}
          </form>
        </DialogBody>

        <DialogFooter className="gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {mode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {mode !== 'view' && (
            <Button type="submit" form="signatory-form">
              {mode === 'create' ? 'Add Signatory' : 'Update Signatory'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
