import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { CompanySignatory, SigningScope, SIGNING_SCOPE_OPTIONS } from '@/types/signatory';
import { validateEmail, validatePhone } from '@/utils/validation';
import { Calendar, Upload, User, Mail, Phone, FileText, Star } from 'lucide-react';

interface SignatoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatory: Omit<CompanySignatory, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => void;
  signatory?: CompanySignatory;
  clientId: string;
  existingSignatories: CompanySignatory[];
  mode: 'create' | 'edit';
}

interface FormData {
  fullName: string;
  designation: string;
  email: string;
  phone: string;
  signingScope: SigningScope[];
  isPrimary: boolean;
  validFrom: string;
  validTo: string;
  status: 'Active' | 'Inactive';
  notes: string;
}

export const SignatoryModal: React.FC<SignatoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  signatory,
  clientId,
  existingSignatories,
  mode
}) => {
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    designation: '',
    email: '',
    phone: '',
    signingScope: ['All'],
    isPrimary: false,
    validFrom: new Date().toISOString().split('T')[0],
    validTo: '',
    status: 'Active',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (signatory && mode === 'edit') {
      setFormData({
        fullName: signatory.fullName,
        designation: signatory.designation,
        email: signatory.email,
        phone: signatory.phone,
        signingScope: signatory.signingScope,
        isPrimary: signatory.isPrimary,
        validFrom: signatory.validFrom || new Date().toISOString().split('T')[0],
        validTo: signatory.validTo || '',
        status: signatory.status,
        notes: signatory.notes || ''
      });
    } else {
      // Reset for create mode
      const hasPrimary = existingSignatories.some(s => s.isPrimary && s.status === 'Active');
      setFormData({
        fullName: '',
        designation: '',
        email: '',
        phone: '',
        signingScope: ['All'],
        isPrimary: !hasPrimary, // Auto-set as primary if no primary exists
        validFrom: new Date().toISOString().split('T')[0],
        validTo: '',
        status: 'Active',
        notes: ''
      });
    }
    setErrors({});
  }, [signatory, mode, existingSignatories, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        newErrors.email = emailValidation.error!;
      }
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else {
      const phoneValidation = validatePhone(formData.phone);
      if (!phoneValidation.isValid) {
        newErrors.phone = phoneValidation.error!;
      }
    }

    if (formData.signingScope.length === 0) {
      newErrors.signingScope = 'At least one signing scope is required';
    }

    // Check for duplicate active email/phone (case-insensitive)
    const duplicateEmailSignatory = existingSignatories.find(s => 
      s.status === 'Active' && 
      s.email.toLowerCase() === formData.email.toLowerCase() &&
      s.id !== signatory?.id
    );
    if (duplicateEmailSignatory) {
      newErrors.email = 'This email is already used by another active signatory';
    }

    const duplicatePhoneSignatory = existingSignatories.find(s => 
      s.status === 'Active' && 
      s.phone === formData.phone &&
      s.id !== signatory?.id
    );
    if (duplicatePhoneSignatory) {
      newErrors.phone = 'This phone number is already used by another active signatory';
    }

    // Date validation
    if (formData.validTo && formData.validFrom >= formData.validTo) {
      newErrors.validTo = 'Valid to date must be after valid from date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors and try again.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const signatoryData: Omit<CompanySignatory, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> = {
        clientId,
        fullName: formData.fullName.trim(),
        designation: formData.designation.trim(),
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.trim(),
        signingScope: formData.signingScope,
        isPrimary: formData.isPrimary,
        validFrom: formData.validFrom || undefined,
        validTo: formData.validTo || undefined,
        status: formData.status,
        notes: formData.notes.trim() || undefined,
        proofFileId: undefined // TODO: Implement file upload
      };

      onSave(signatoryData);
      onClose();
      
      toast({
        title: mode === 'create' ? "Signatory Added" : "Signatory Updated",
        description: `${formData.fullName} has been ${mode === 'create' ? 'added' : 'updated'} successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while saving the signatory.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScopeToggle = (scope: SigningScope, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        signingScope: [...prev.signingScope, scope]
      }));
    } else {
      // Don't allow removing all scopes
      if (formData.signingScope.length > 1) {
        setFormData(prev => ({
          ...prev,
          signingScope: prev.signingScope.filter(s => s !== scope)
        }));
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>{mode === 'create' ? 'Add New Signatory' : 'Edit Signatory'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Basic Information</Label>
            </div>
            
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    className={errors.fullName ? 'border-destructive' : ''}
                    placeholder="Enter full name"
                  />
                  {errors.fullName && (
                    <p className="text-xs text-destructive mt-1">{errors.fullName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    value={formData.designation}
                    onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                    placeholder="Director, Manager, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className={errors.email ? 'border-destructive' : ''}
                    placeholder="email@example.com"
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive mt-1">{errors.email}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="phone">
                    Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className={errors.phone ? 'border-destructive' : ''}
                    placeholder="+91 9876543210"
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive mt-1">{errors.phone}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Signing Scope */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Signing Scope</Label>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {SIGNING_SCOPE_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`scope-${option.value}`}
                    checked={formData.signingScope.includes(option.value)}
                    onCheckedChange={(checked) => handleScopeToggle(option.value, !!checked)}
                  />
                  <Label htmlFor={`scope-${option.value}`} className="text-sm">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
            
            {errors.signingScope && (
              <p className="text-xs text-destructive">{errors.signingScope}</p>
            )}
          </div>

          {/* Status and Validity */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Status & Validity</Label>
            </div>
            
            <div className="grid gap-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPrimary"
                    checked={formData.isPrimary}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPrimary: !!checked }))}
                  />
                  <Label htmlFor="isPrimary" className="text-sm flex items-center space-x-1">
                    <Star className="h-3 w-3" />
                    <span>Set as Primary Signatory</span>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={formData.status === 'Active'}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      status: checked ? 'Active' : 'Inactive' 
                    }))}
                  />
                  <Label htmlFor="isActive" className="text-sm">Active</Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="validFrom">Valid From</Label>
                  <Input
                    id="validFrom"
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="validTo">Valid To (Optional)</Label>
                  <Input
                    id="validTo"
                    type="date"
                    value={formData.validTo}
                    onChange={(e) => setFormData(prev => ({ ...prev, validTo: e.target.value }))}
                    className={errors.validTo ? 'border-destructive' : ''}
                  />
                  {errors.validTo && (
                    <p className="text-xs text-destructive mt-1">{errors.validTo}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about this signatory..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : (mode === 'create' ? 'Add Signatory' : 'Update Signatory')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};