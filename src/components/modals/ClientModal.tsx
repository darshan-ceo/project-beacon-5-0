import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Plus, Edit, Trash2, User, Eye, Building2, MapPin, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Client, useAppState, type Signatory, type Address, type Jurisdiction, type PortalAccess } from '@/contexts/AppStateContext';
import { CASelector } from '@/components/ui/employee-selector';
import { SignatoryModal } from './SignatoryModal';
import { clientsService, INDIAN_STATES } from '@/services/clientsService';
import { GSTSection } from '@/components/gst/GSTSection';
import { ContactsDrawer } from '@/components/contacts/ContactsDrawer';
import { ClientContactsSection } from '@/components/contacts/ClientContactsSection';
import { featureFlagService } from '@/services/featureFlagService';
import { envConfig } from '../../utils/envConfig';
import { AddressForm } from '@/components/ui/AddressForm';
import { AddressView } from '@/components/ui/AddressView';
import { EnhancedAddressData, addressMasterService } from '@/services/addressMasterService';
import { FieldTooltip } from '@/components/ui/field-tooltip';
import { TagInput } from '@/components/ui/TagInput';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null;
  mode: 'create' | 'edit' | 'view';
}

export const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, client: clientData, mode }) => {
  const { state, dispatch } = useAppState();
  
  const [formData, setFormData] = useState<{
    name: string;
    type: 'Individual' | 'Company' | 'Partnership' | 'Trust' | 'Other';
    category: 'Regular Dealer' | 'Composition' | 'Exporter' | 'Service' | 'Other';
    registrationNo: string;
    gstin: string;
    pan: string;
    address: EnhancedAddressData | Address;
    jurisdiction: Jurisdiction;
    portalAccess: PortalAccess;
    assignedCAId: string;
    assignedCAName: string;
    status: 'Active' | 'Inactive';
    gspSignatories?: any[];
    gstData?: any;
    addressId?: string;
    tags?: string[];
  }>({
    name: '',
    type: 'Individual',
    category: 'Regular Dealer',
    registrationNo: '',
    gstin: '',
    pan: '',
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
    jurisdiction: {
      commissionerate: '',
      division: '',
      range: ''
    },
    portalAccess: {
      allowLogin: false,
      email: '',
      mobile: '',
      username: '',
      passwordHash: ''
    },
        assignedCAId: '',
        assignedCAName: '',
        status: 'Active',
        tags: []
  });

  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [preloadedContacts, setPreloadedContacts] = useState<any[]>([]);
  const [gstData, setGstData] = useState<any>(null);
  const [signatoryModal, setSignatoryModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view';
    signatory?: Signatory | null;
  }>({ isOpen: false, mode: 'create', signatory: null });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isAddressMasterEnabled, setIsAddressMasterEnabled] = useState(false);

  useEffect(() => {
    setIsAddressMasterEnabled(featureFlagService.isEnabled('address_master_v1'));
    
    if (clientData && (mode === 'edit' || mode === 'view')) {
      // Handle address migration from string to Address/EnhancedAddressData object
      let addressObj: EnhancedAddressData;
      
      if (isAddressMasterEnabled) {
        // Load linked address from address master
        loadClientAddress(clientData.id);
      }
      
      if (typeof clientData.address === 'string') {
        addressObj = {
          line1: clientData.address,
          line2: '',
          locality: '',
          district: '',
          cityId: '',
          stateId: '',
          pincode: '',
          countryId: 'IN',
          source: 'manual'
        };
      } else if (clientData.address && 'city' in clientData.address) {
        // Legacy Address format
        addressObj = {
          line1: clientData.address.line1 || '',
          line2: clientData.address.line2 || '',
          locality: '',
          district: '',
          cityId: '',
          stateId: '',
          pincode: clientData.address.pincode || '',
          countryId: 'IN',
          source: 'manual'
        };
      } else {
        // Already EnhancedAddressData format
        addressObj = clientData.address as EnhancedAddressData || {
          line1: '',
          line2: '',
          locality: '',
          district: '',
          cityId: '',
          stateId: '',
          pincode: '',
          countryId: 'IN',
          source: 'manual'
        };
      }

      setFormData({
        name: clientData.name,
        type: clientData.type,
        category: clientData.category || 'Regular Dealer',
        registrationNo: clientData.registrationNo || '',
        gstin: clientData.gstin || '',
        pan: clientData.pan || clientData.panNumber || '',
        address: addressObj,
        jurisdiction: clientData.jurisdiction || { commissionerate: '', division: '', range: '' },
        portalAccess: clientData.portalAccess || { allowLogin: false },
        assignedCAId: clientData.assignedCAId,
        assignedCAName: clientData.assignedCAName,
        status: clientData.status,
        tags: (clientData as any).tags || []
      });
      setSignatories(clientData.signatories || []);
    } else if (mode === 'create') {
      // Reset to defaults
      setFormData({
        name: '',
        type: 'Individual',
        category: 'Regular Dealer',
        registrationNo: '',
        gstin: '',
        pan: '',
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
        jurisdiction: {
          commissionerate: '',
          division: '',
          range: ''
        },
        portalAccess: {
          allowLogin: false,
          email: '',
          mobile: '',
          username: '',
          passwordHash: ''
        },
        assignedCAId: '',
        assignedCAName: '',
        status: 'Active'
      });
      setSignatories([]);
      setPreloadedContacts([]);
      setGstData(null);
    }
    setErrors({});
    setValidationErrors([]);
  }, [clientData, mode, isOpen, isAddressMasterEnabled]);

  const loadClientAddress = async (clientId: string) => {
    if (!isAddressMasterEnabled) return;
    
    try {
      const result = await addressMasterService.getEntityAddress('client', clientId);
      if (result.success && result.data) {
        setFormData(prev => ({
          ...prev,
          address: result.data!,
          addressId: result.data!.id
        }));
      }
    } catch (error) {
      console.error('Failed to load client address:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newValidationErrors: string[] = [];

    // Basic validations
    if (!formData.name.trim()) {
      newErrors.name = 'Client name is required';
    }

    if (!formData.address.line1?.trim()) {
      newErrors.addressLine1 = 'Address line 1 is required';
    }

    const address = formData.address as EnhancedAddressData;
    
    // For legacy address format
    if ('city' in formData.address && formData.address.city !== undefined) {
      if (!formData.address.city?.trim()) {
        newErrors.addressCity = 'City is required';
      }
      if (!formData.address.state?.trim()) {
        newErrors.addressState = 'State is required';
      }
    } else {
      // For enhanced address format
      if (isAddressMasterEnabled) {
        if (!address.district?.trim()) {
          newErrors.addressDistrict = 'District is required';
        }
        if (!address.stateId?.trim()) {
          newErrors.addressState = 'State is required';
        }
      }
    }

    // Validate using service
    const panValidation = clientsService.validatePAN(formData.pan);
    if (!panValidation.isValid) {
      newErrors.pan = panValidation.errors[0];
    }

    if (formData.gstin) {
      const gstinValidation = clientsService.validateGSTIN(formData.gstin);
      if (!gstinValidation.isValid) {
        newErrors.gstin = gstinValidation.errors[0];
      }
    }

    if (formData.address.pincode) {
      const pincodeValidation = clientsService.validatePincode(formData.address.pincode);
      if (!pincodeValidation.isValid) {
        newErrors.pincode = pincodeValidation.errors[0];
      }
    }

    // Portal access validations
    if (formData.portalAccess.allowLogin) {
      if (!formData.portalAccess.email) {
        newErrors.portalEmail = 'Email is required for portal access';
      } else {
        const emailValidation = clientsService.validateEmail(formData.portalAccess.email);
        if (!emailValidation.isValid) {
          newErrors.portalEmail = emailValidation.errors[0];
        }
      }

      if (!formData.portalAccess.mobile) {
        newErrors.portalMobile = 'Mobile number is required for portal access';
      }
    }

    // Signatory validations for non-Individual clients
    if (formData.type !== 'Individual') {
      if (signatories.length === 0) {
        newValidationErrors.push('At least one signatory is required for Company/Partnership/Trust');
      } else {
        const primarySignatories = signatories.filter(s => s.isPrimary);
        if (primarySignatories.length === 0) {
          newValidationErrors.push('One signatory must be marked as primary');
        } else if (primarySignatories.length > 1) {
          newValidationErrors.push('Only one signatory can be marked as primary');
        }
      }
    }

    setErrors(newErrors);
    setValidationErrors(newValidationErrors);
    
    return Object.keys(newErrors).length === 0 && newValidationErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      let addressId = formData.addressId;
      
      // Handle address creation/update for address master
      if (isAddressMasterEnabled && formData.address) {
        const addressData = formData.address as EnhancedAddressData;
        
        if (addressId) {
          // Update existing address
          const updateResult = await addressMasterService.updateAddress(addressId, addressData);
          if (!updateResult.success) {
            toast({
              title: "Error",
              description: "Failed to update address",
              variant: "destructive"
            });
            return;
          }
        } else {
          // Create new address
          const createResult = await addressMasterService.createAddress({
            ...addressData,
            source: addressData.source || 'manual'
          });
          if (createResult.success && createResult.data) {
            addressId = createResult.data.id!;
          } else {
            toast({
              title: "Error", 
              description: "Failed to create address",
              variant: "destructive"
            });
            return;
          }
        }
      }

      const clientToSave: Partial<Client> = {
        ...formData,
        address: isAddressMasterEnabled ? undefined : formData.address, // Don't include address if using address master
        signatories,
        ...(isAddressMasterEnabled && addressId ? { addressId } : {})
      };

      if (mode === 'create') {
        const createdClient = await clientsService.create(clientToSave, dispatch) as Client;
        
        // Link address for new client
        if (isAddressMasterEnabled && addressId && createdClient) {
          await addressMasterService.linkAddress('client', createdClient.id, addressId, true);
        }

        toast({
          title: "Client Created Successfully",
          description: `${createdClient.name} has been added to the system`,
        });
      } else if (mode === 'edit' && clientData) {
        await clientsService.update(clientData.id, { ...clientData, ...clientToSave }, dispatch);
        
        // Link address for existing client if not already linked
        if (isAddressMasterEnabled && addressId && !formData.addressId) {
          await addressMasterService.linkAddress('client', clientData.id, addressId, true);
        }

        toast({
          title: "Client Updated Successfully",
          description: `${formData.name} has been updated`,
        });
      }

      onClose();
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        title: "Error",
        description: "Failed to save client. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (clientData) {
      try {
        await clientsService.delete(clientData.id, dispatch);
        onClose();
      } catch (error) {
        // Error handling is done in the service
      }
    }
  };

  const handleSignatorySubmit = async (signatoryData: Omit<Signatory, 'id'> | Signatory) => {
    try {
      if (signatoryModal.mode === 'create') {
        const newSignatory: Signatory = {
          ...(signatoryData as Omit<Signatory, 'id'>),
          id: Date.now().toString()
        };
        setSignatories(prev => [...prev, newSignatory]);
      } else if (signatoryModal.mode === 'edit') {
        setSignatories(prev => 
          prev.map(s => s.id === (signatoryData as Signatory).id ? (signatoryData as Signatory) : s)
        );
      }
      setSignatoryModal({ isOpen: false, mode: 'create', signatory: null });
    } catch (error) {
      // Error already handled in SignatoryModal
    }
  };

  const handleDeleteSignatory = (signatoryId: string) => {
    setSignatories(prev => prev.filter(s => s.id !== signatoryId));
  };

  const handlePortalToggle = (enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      portalAccess: {
        ...prev.portalAccess,
        allowLogin: enabled,
        ...(enabled ? clientsService.generateCredentials() : {})
      }
    }));
  };

  const handleSignatoriesImport = (importedContacts: any[]) => {
    setPreloadedContacts(importedContacts);
    setGstData({ hasSignatories: true }); // Track GST data presence
  };

  const showSignatorySection = formData.type !== 'Individual';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-beacon-modal max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {mode === 'create' && <><Plus className="h-5 w-5" /> Add New Client</>}
                {mode === 'edit' && <><Edit className="h-5 w-5" /> Edit Client</>}
                {mode === 'view' && <><Eye className="h-5 w-5" /> Client Details</>}
              </div>
              {/* Dev environment badges */}
              {import.meta.env.MODE === 'development' && (
                <div className="flex gap-2 text-xs">
                  <Badge variant={envConfig.GST_ON ? "default" : "destructive"}>
                    GST: {envConfig.GST_ON ? "ON" : "OFF"}
                    {envConfig.hasUrlOverrides && envConfig.getActiveOverrides().gst && " (URL)"}
                  </Badge>
                  <Badge variant={envConfig.API_SET ? "default" : "destructive"}>
                    API: {envConfig.API_SET ? "SET" : "MISSING"}
                    {envConfig.hasUrlOverrides && envConfig.getActiveOverrides().api && " (URL)"}
                  </Badge>
                  <Badge variant={envConfig.MOCK_ON ? "secondary" : "outline"}>
                    MOCK: {envConfig.MOCK_ON ? "ON" : "OFF"}
                    {envConfig.hasUrlOverrides && envConfig.getActiveOverrides().mock && " (URL)"}
                  </Badge>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* GST Section - Moved to Top for Enhanced Workflow */}
              <GSTSection
                clientId={clientData?.id || 'new'}
                formData={formData}
                onFormDataChange={(updates) => {
                  setFormData(prev => ({ ...prev, ...updates }));
                  if (updates.gstStatus || updates.gstin) {
                  setGstData(updates);
                }
              }}
              mode={mode}
              onSignatoriesImport={handleSignatoriesImport}
            />

            {/* General Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  General Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-1">
                      <Label htmlFor="name">Client Name *</Label>
                      <FieldTooltip formId="client-master" fieldId="name" />
                    </div>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, name: e.target.value }));
                        setErrors(prev => ({ ...prev, name: '' }));
                      }}
                      disabled={mode === 'view'}
                      className={errors.name ? 'border-destructive' : ''}
                    />
                    {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-1">
                      <Label htmlFor="type">Client Type *</Label>
                      <FieldTooltip formId="client-master" fieldId="type" />
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
                        <SelectItem value="Individual">Individual</SelectItem>
                        <SelectItem value="Company">Company</SelectItem>
                        <SelectItem value="Partnership">Partnership</SelectItem>
                        <SelectItem value="Trust">Trust</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">GST Category</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as any }))}
                      disabled={mode === 'view'}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Regular Dealer">Regular Dealer</SelectItem>
                        <SelectItem value="Composition">Composition</SelectItem>
                        <SelectItem value="Exporter">Exporter</SelectItem>
                        <SelectItem value="Service">Service Provider</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {showSignatorySection && (
                    <div>
                      <Label htmlFor="registrationNo">Registration Number</Label>
                      <Input
                        id="registrationNo"
                        value={formData.registrationNo}
                        onChange={(e) => setFormData(prev => ({ ...prev, registrationNo: e.target.value }))}
                        disabled={mode === 'view'}
                        placeholder="CIN/LLP/Registration No."
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-1">
                      <Label htmlFor="pan">PAN Number *</Label>
                      <FieldTooltip formId="client-master" fieldId="pan" />
                    </div>
                    <Input
                      id="pan"
                      value={formData.pan}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, pan: e.target.value.toUpperCase() }));
                        setErrors(prev => ({ ...prev, pan: '' }));
                      }}
                      disabled={mode === 'view'}
                      maxLength={10}
                      placeholder="ABCDE1234F"
                      className={errors.pan ? 'border-destructive' : ''}
                    />
                    {errors.pan && <p className="text-sm text-destructive mt-1">{errors.pan}</p>}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-1">
                      <Label htmlFor="gstin">GSTIN</Label>
                      <FieldTooltip formId="client-master" fieldId="gstin" />
                    </div>
                    <Input
                      id="gstin"
                      value={formData.gstin}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }));
                        setErrors(prev => ({ ...prev, gstin: '' }));
                      }}
                      disabled={mode === 'view'}
                      maxLength={15}
                      placeholder="07AABCU9603R1ZV"
                      className={errors.gstin ? 'border-destructive' : ''}
                    />
                    {errors.gstin && <p className="text-sm text-destructive mt-1">{errors.gstin}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
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
                    address={formData.address as EnhancedAddressData}
                    showSource={true}
                    showActions={false}
                  />
                ) : (
                  <AddressForm
                    value={formData.address}
                    onChange={(address) => setFormData(prev => ({ ...prev, address }))}
                    disabled={mode === 'view'}
                    required={true}
                    module="client"
                    showGSTIntegration={!!formData.gstin}
                    gstin={formData.gstin}
                    onGSTAddressSelect={(address) => {
                      setFormData(prev => ({ ...prev, address }));
                      toast({
                        title: "Success",
                        description: "GST address populated successfully"
                      });
                    }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Jurisdiction Information */}
            <Card>
              <CardHeader>
                <CardTitle>Tax Jurisdiction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="commissionerate">Commissionerate</Label>
                    <Input
                      id="commissionerate"
                      value={formData.jurisdiction.commissionerate || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        jurisdiction: { ...prev.jurisdiction, commissionerate: e.target.value }
                      }))}
                      disabled={mode === 'view'}
                    />
                  </div>

                  <div>
                    <Label htmlFor="division">Division</Label>
                    <Input
                      id="division"
                      value={formData.jurisdiction.division || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        jurisdiction: { ...prev.jurisdiction, division: e.target.value }
                      }))}
                      disabled={mode === 'view'}
                    />
                  </div>

                  <div>
                    <Label htmlFor="range">Range</Label>
                    <Input
                      id="range"
                      value={formData.jurisdiction.range || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        jurisdiction: { ...prev.jurisdiction, range: e.target.value }
                      }))}
                      disabled={mode === 'view'}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Signatories Section - Only for Company/Partnership/Trust */}
            {showSignatorySection && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Authorized Signatories
                    </div>
                    {mode !== 'view' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSignatoryModal({ isOpen: true, mode: 'create', signatory: null })}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Signatory
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {signatories.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No signatories added yet</p>
                      {mode !== 'view' && (
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-2"
                          onClick={() => setSignatoryModal({ isOpen: true, mode: 'create', signatory: null })}
                        >
                          Add First Signatory
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Designation</TableHead>
                          <TableHead>Scope</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {signatories.map((signatory) => (
                          <TableRow key={signatory.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {signatory.fullName}
                                {signatory.isPrimary && (
                                  <Badge variant="secondary" className="text-xs">Primary</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{signatory.email}</TableCell>
                            <TableCell>{signatory.designation || '-'}</TableCell>
                            <TableCell>{signatory.scope}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={signatory.status === 'Active' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {signatory.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSignatoryModal({ 
                                    isOpen: true, 
                                    mode: mode === 'view' ? 'view' : 'edit', 
                                    signatory 
                                  })}
                                >
                                  {mode === 'view' ? <Eye className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                                </Button>
                                {mode !== 'view' && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteSignatory(signatory.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Portal Access Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Client Portal Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Client Portal Login</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow this client to access the client portal
                    </p>
                  </div>
                  <Switch
                    checked={formData.portalAccess.allowLogin}
                    onCheckedChange={handlePortalToggle}
                    disabled={mode === 'view'}
                  />
                </div>

                {formData.portalAccess.allowLogin && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="portalEmail">Portal Email *</Label>
                        <Input
                          id="portalEmail"
                          type="email"
                          value={formData.portalAccess.email || ''}
                          onChange={(e) => {
                            setFormData(prev => ({ 
                              ...prev, 
                              portalAccess: { ...prev.portalAccess, email: e.target.value }
                            }));
                            setErrors(prev => ({ ...prev, portalEmail: '' }));
                          }}
                          disabled={mode === 'view'}
                          className={errors.portalEmail ? 'border-destructive' : ''}
                        />
                        {errors.portalEmail && <p className="text-sm text-destructive mt-1">{errors.portalEmail}</p>}
                      </div>

                      <div>
                        <Label htmlFor="portalMobile">Portal Mobile *</Label>
                        <Input
                          id="portalMobile"
                          value={formData.portalAccess.mobile || ''}
                          onChange={(e) => {
                            setFormData(prev => ({ 
                              ...prev, 
                              portalAccess: { ...prev.portalAccess, mobile: e.target.value }
                            }));
                            setErrors(prev => ({ ...prev, portalMobile: '' }));
                          }}
                          disabled={mode === 'view'}
                          className={errors.portalMobile ? 'border-destructive' : ''}
                        />
                        {errors.portalMobile && <p className="text-sm text-destructive mt-1">{errors.portalMobile}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={formData.portalAccess.username || ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            portalAccess: { ...prev.portalAccess, username: e.target.value }
                          }))}
                          disabled={mode === 'view'}
                          placeholder="Auto-generated"
                        />
                      </div>

                      <div>
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.portalAccess.passwordHash || ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            portalAccess: { ...prev.portalAccess, passwordHash: e.target.value }
                          }))}
                          disabled={mode === 'view'}
                          placeholder="Auto-generated"
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Assignment & Status */}
            <Card>
              <CardHeader>
                <CardTitle>Assignment & Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <CASelector
                      value={formData.assignedCAId}
                      onValueChange={(value) => {
                        const employee = state.employees.find(e => e.id === value);
                        setFormData(prev => ({ 
                          ...prev, 
                          assignedCAId: value,
                          assignedCAName: employee?.full_name || ''
                        }));
                      }}
                      disabled={mode === 'view'}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
                      disabled={mode === 'view'}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Contacts Section */}
            <ClientContactsSection
              clientId={clientData?.id || 'new'}
              mode={mode}
              preloadedContacts={preloadedContacts}
              hasGstData={!!gstData || !!formData.gspSignatories}
            />

            {/* Tags Section */}
            <Card>
              <CardHeader>
                <CardTitle>Tags & Organization</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add tags to categorize and organize clients for easier search and filtering (e.g., VIP, Manufacturing, Exporter).
                  </p>
                  <TagInput
                    value={formData.tags || []}
                    onChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                    placeholder="Add tags to organize clients..."
                    disabled={mode === 'view'}
                    maxTags={8}
                  />
                </div>
              </CardContent>
            </Card>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <Card className="border-destructive">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-destructive">Please fix the following errors:</h4>
                      <ul className="text-sm text-destructive space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}
            </form>
          </DialogBody>

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              {mode === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {mode === 'edit' && (
              <Button type="button" variant="destructive" onClick={handleDelete}>
                Delete Client
              </Button>
            )}
            {mode !== 'view' && (
              <Button type="submit" onClick={handleSubmit}>
                {mode === 'create' ? 'Create Client' : 'Update Client'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signatory Modal */}
      <SignatoryModal
        isOpen={signatoryModal.isOpen}
        onClose={() => setSignatoryModal({ isOpen: false, mode: 'create', signatory: null })}
        signatory={signatoryModal.signatory}
        mode={signatoryModal.mode}
        onSubmit={handleSignatorySubmit}
        existingSignatories={signatories}
      />
    </>
  );
};