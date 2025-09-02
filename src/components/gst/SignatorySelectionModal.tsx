/**
 * Signatory Selection Modal for GSP Consent Flow
 * Allows users to select which GSP signatories to import as contacts
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, Phone, UserCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface GSPSignatory {
  name: string;
  email: string;
  mobile: string;
  designation?: string;
  signatoryType: string;
}

interface SignatorySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  signatories: GSPSignatory[];
  onImportSelected: (selectedSignatories: Array<GSPSignatory & { role: string; isPrimary: boolean }>) => void;
}

export const SignatorySelectionModal: React.FC<SignatorySelectionModalProps> = ({
  isOpen,
  onClose,
  signatories,
  onImportSelected
}) => {
  const [selectedSignatories, setSelectedSignatories] = useState<Set<string>>(new Set());
  const [signatoryRoles, setSignatoryRoles] = useState<Record<string, string>>({});
  const [primarySignatory, setPrimarySignatory] = useState<string>('');

  const handleSignatoryToggle = (signatoryName: string, checked: boolean) => {
    const newSelection = new Set(selectedSignatories);
    if (checked) {
      newSelection.add(signatoryName);
    } else {
      newSelection.delete(signatoryName);
      // If this was the primary signatory, clear it
      if (primarySignatory === signatoryName) {
        setPrimarySignatory('');
      }
    }
    setSelectedSignatories(newSelection);
  };

  const handleRoleChange = (signatoryName: string, role: string) => {
    setSignatoryRoles(prev => ({ ...prev, [signatoryName]: role }));
  };

  const handleImport = () => {
    if (selectedSignatories.size === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select at least one signatory to import.',
        variant: 'destructive'
      });
      return;
    }

    const importData = signatories
      .filter(sig => selectedSignatories.has(sig.name))
      .map(sig => ({
        ...sig,
        role: signatoryRoles[sig.name] || sig.designation || 'Authorized Signatory',
        isPrimary: primarySignatory === sig.name
      }));

    onImportSelected(importData);
    onClose();
  };

  const handleClose = () => {
    setSelectedSignatories(new Set());
    setSignatoryRoles({});
    setPrimarySignatory('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Import GSP Signatories to Contacts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select which authorized signatories you want to import as client contacts.
            You can customize their roles and designate one as the primary contact.
          </p>

          <div className="space-y-3">
            {signatories.map((signatory, index) => (
              <Card key={`${signatory.name}-${index}`} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id={`signatory-${index}`}
                      checked={selectedSignatories.has(signatory.name)}
                      onCheckedChange={(checked) => 
                        handleSignatoryToggle(signatory.name, checked as boolean)
                      }
                      className="mt-1"
                    />
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Label className="text-base font-medium">{signatory.name}</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {signatory.signatoryType}
                            </Badge>
                            {signatory.designation && (
                              <Badge variant="secondary" className="text-xs">
                                {signatory.designation}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {selectedSignatories.has(signatory.name) && (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`primary-${index}`}
                              checked={primarySignatory === signatory.name}
                              onCheckedChange={(checked) => 
                                setPrimarySignatory(checked ? signatory.name : '')
                              }
                            />
                            <Label htmlFor={`primary-${index}`} className="text-xs">
                              Primary Contact
                            </Label>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{signatory.email || 'No email'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{signatory.mobile || 'No mobile'}</span>
                        </div>
                      </div>

                      {selectedSignatories.has(signatory.name) && (
                        <div className="pt-2 border-t">
                          <Label htmlFor={`role-${index}`} className="text-sm">
                            Contact Role
                          </Label>
                          <Select
                            value={signatoryRoles[signatory.name] || signatory.designation || 'Authorized Signatory'}
                            onValueChange={(value) => handleRoleChange(signatory.name, value)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Authorized Signatory">Authorized Signatory</SelectItem>
                              <SelectItem value="Director">Director</SelectItem>
                              <SelectItem value="Partner">Partner</SelectItem>
                              <SelectItem value="Manager">Manager</SelectItem>
                              <SelectItem value="Accountant">Accountant</SelectItem>
                              <SelectItem value="Billing Contact">Billing Contact</SelectItem>
                              <SelectItem value="Compliance Officer">Compliance Officer</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedSignatories.size > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm">
                <span className="font-medium">{selectedSignatories.size}</span> signator{selectedSignatories.size === 1 ? 'y' : 'ies'} selected
                {primarySignatory && (
                  <span className="ml-2 text-muted-foreground">
                    • Primary: {primarySignatory}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleImport}
              disabled={selectedSignatories.size === 0}
            >
              Import Selected ({selectedSignatories.size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};