import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { Signatory } from '@/contexts/AppStateContext';
import { FieldTooltip } from '@/components/ui/field-tooltip';

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
    email: string;
    phone: string;
    isPrimary: boolean;
    scope: 'All' | 'GST Filings' | 'Litigation' | 'Appeals';
    status: 'Active' | 'Inactive';
  }>({
    fullName: '',
    designation: '',
    email: '',
    phone: '',
    isPrimary: false,
    scope: 'All',
    status: 'Active'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (signatory && (mode === 'edit' || mode === 'view')) {
      setFormData({
        fullName: signatory.fullName,
        designation: signatory.designation || '',
        email: signatory.email,
        phone: signatory.phone || '',
        isPrimary: signatory.isPrimary,
        scope: signatory.scope,
        status: signatory.status
      });
    } else if (mode === 'create') {
      setFormData({
        fullName: '',
        designation: '',
        email: '',
        phone: '',
        isPrimary: false,
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

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      } else {
        // Check for duplicate email
        const isDuplicate = existingSignatories.some(sig => 
          sig.email.toLowerCase() === formData.email.toLowerCase() && 
          (!signatory || sig.id !== signatory.id)
        );
        if (isDuplicate) {
          newErrors.email = 'This email is already used by another signatory';
        }
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
          <DialogTitle>
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
                disabled={mode === 'view'}
                className={errors.fullName ? 'border-destructive' : ''}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive mt-1">{errors.fullName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={formData.designation}
                onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                disabled={mode === 'view'}
                placeholder="e.g., Director, Partner, Authorized Representative"
              />
            </div>

            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="email">Email Address *</Label>
                <FieldTooltip formId="create-signatory" fieldId="email" />
              </div>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, email: e.target.value }));
                  setErrors(prev => ({ ...prev, email: '' }));
                }}
                disabled={mode === 'view'}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                disabled={mode === 'view'}
                placeholder="+91 XXXXX XXXXX"
              />
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
                <Label>Primary Signatory</Label>
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
                <Label>Status</Label>
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

        <DialogFooter>
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