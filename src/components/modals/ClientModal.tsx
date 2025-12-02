import React, { useState, useEffect, useRef } from 'react';
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
import { Plus, Edit, Trash2, User, Eye, Building2, MapPin, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Client, useAppState, type Signatory, type Address, type Jurisdiction, type PortalAccess } from '@/contexts/AppStateContext';
import { CASelector } from '@/components/ui/employee-selector';
import { SignatoryModal } from './SignatoryModal';
import { ClientGroupModal } from './ClientGroupModal';
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
import { toTitleCase, toLowerCase } from '@/utils/formatters';
import { secureLog } from '@/utils/secureLogger';
import { format } from 'date-fns';
import { CLIENT_TYPES } from '@/../config/appConfig';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null;
  mode: 'create' | 'edit' | 'view';
}

// Helper functions to extract primary contact info from new array format
const getPrimaryEmail = (signatory: Signatory): string => {
  return signatory.emails?.find(e => e.isPrimary)?.email || 
         signatory.emails?.[0]?.email || 
         signatory.email || '';
};

const getPrimaryPhone = (signatory: Signatory): string => {
  const phone = signatory.phones?.find(p => p.isPrimary) || signatory.phones?.[0];
  if (phone) return `${phone.countryCode} ${phone.number}`;
  return signatory.mobile || signatory.phone || '';
};

export const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, client: clientData, mode }) => {
  const { state, dispatch } = useAppState();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState<{
    name: string;
    type: string; // Uses CLIENT_TYPES from appConfig
    category: 'Regular Dealer' | 'Composition' | 'Exporter' | 'Service' | 'Other';
    registrationNo: string;
    gstin: string;
    pan: string;
    address: EnhancedAddressData | Address;
    jurisdiction: Jurisdiction;
    portalAccess: PortalAccess;
    assignedCAId: string;
    assignedCAName: string;
    clientGroupId?: string;
    status: 'Active' | 'Inactive';
    gspSignatories?: any[];
    gstData?: any;
    addressId?: string;
    tags?: string[];
  }>({
    name: '',
    type: 'Proprietorship',
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
      jurisdictionType: 'both',
      stateJurisdiction: {
        state: '',
        division: '',
        range: '',
        unit: ''
      },
      centerJurisdiction: {
        zone: '',
        commissionerate: '',
        division: '',
        range: ''
      },
      // Backward compatibility
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
        clientGroupId: '',
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
  const [clientGroupModal, setClientGroupModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isAddressMasterEnabled, setIsAddressMasterEnabled] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const validationErrorsRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadClientData = async () => {
      setIsAddressMasterEnabled(featureFlagService.isEnabled('address_master_v1'));
      const addressMasterEnabled = featureFlagService.isEnabled('address_master_v1');
      
      if (clientData && (mode === 'edit' || mode === 'view')) {
        let addressObj: EnhancedAddressData;
        
        // Load linked address FIRST if Address Master is enabled
        if (addressMasterEnabled) {
          setIsLoadingAddress(true);
          const linkedAddress = await loadClientAddress(clientData.id);
          setIsLoadingAddress(false);
          
          if (linkedAddress) {
            addressObj = linkedAddress;
          } else {
            // Fallback to inline address
            addressObj = parseClientAddress(clientData.address);
          }
        } else {
          addressObj = parseClientAddress(clientData.address);
        }

        setFormData({
          name: clientData.name,
          type: clientData.type,
          category: clientData.category || 'Regular Dealer',
          registrationNo: clientData.registrationNo || '',
          gstin: clientData.gstin || '',
          pan: clientData.pan || clientData.panNumber || '',
          address: addressObj,
          jurisdiction: {
            jurisdictionType: clientData.jurisdiction?.jurisdictionType || 'both',
            stateJurisdiction: {
              state: clientData.jurisdiction?.stateJurisdiction?.state || '',
              division: clientData.jurisdiction?.stateJurisdiction?.division || '',
              range: clientData.jurisdiction?.stateJurisdiction?.range || '',
              unit: clientData.jurisdiction?.stateJurisdiction?.unit || ''
            },
            centerJurisdiction: {
              zone: clientData.jurisdiction?.centerJurisdiction?.zone || '',
              commissionerate: clientData.jurisdiction?.centerJurisdiction?.commissionerate || '',
              division: clientData.jurisdiction?.centerJurisdiction?.division || '',
              range: clientData.jurisdiction?.centerJurisdiction?.range || ''
            },
            // Backward compatibility
            commissionerate: clientData.jurisdiction?.commissionerate || '',
            division: clientData.jurisdiction?.division || '',
            range: clientData.jurisdiction?.range || ''
          },
          portalAccess: clientData.portalAccess || { allowLogin: false },
          assignedCAId: clientData.assignedCAId,
          assignedCAName: clientData.assignedCAName,
          clientGroupId: clientData.clientGroupId || '',
          status: clientData.status,
          addressId: addressObj.id,
          tags: (clientData as any).tags || []
        });
        setSignatories(clientData.signatories || []);
      } else if (mode === 'create') {
        // Reset to defaults
        setFormData({
          name: '',
          type: 'Proprietorship',
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
            jurisdictionType: 'both',
            stateJurisdiction: {
              state: '',
              division: '',
              range: '',
              unit: ''
            },
            centerJurisdiction: {
              zone: '',
              commissionerate: '',
              division: '',
              range: ''
            },
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
          clientGroupId: '',
          status: 'Active',
          tags: []
        });
        setSignatories([]);
        setPreloadedContacts([]);
        setGstData(null);
      }
      setErrors({});
      setValidationErrors([]);
    };

    if (!isOpen) {
      // Reset initialization flag when modal is closed
      setIsInitialized(false);
      return;
    }

    if (!isInitialized) {
      loadClientData();
      setIsInitialized(true);
    }
  }, [clientData, mode, isOpen, isInitialized]);

  const loadClientAddress = async (clientId: string): Promise<EnhancedAddressData | null> => {
    try {
      const result = await addressMasterService.getEntityAddress('client', clientId);
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to load client address:', error);
      return null;
    }
  };

  const parseClientAddress = (address: any): EnhancedAddressData => {
    if (typeof address === 'string') {
      return {
        line1: address,
        line2: '',
        locality: '',
        district: '',
        cityId: '',
        stateId: '',
        pincode: '',
        countryId: 'IN',
        source: 'manual'
      };
    } else if (address && 'city' in address) {
      // Legacy Address format
      return {
        line1: address.line1 || '',
        line2: address.line2 || '',
        locality: '',
        district: '',
        cityId: '',
        stateId: '',
        pincode: address.pincode || '',
        countryId: 'IN',
        source: 'manual'
      };
    } else {
      // Already EnhancedAddressData format
      return address as EnhancedAddressData || {
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
      } else if (!/^[+]?[0-9]{10,15}$/.test(formData.portalAccess.mobile.replace(/\s/g, ''))) {
        newErrors.portalMobile = 'Mobile must be 10-15 digits (with optional country code)';
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
    
    secureLog.debug('handleSubmit called', { mode, hasSignatories: signatories.length > 0 });
    
    if (!validateForm()) {
      secureLog.warn('Validation failed', { errorCount: Object.keys(errors).length });
      toast({
        title: "Validation Failed",
        description: "Please fix the highlighted errors before saving.",
        variant: "destructive"
      });
      // Scroll to validation errors
      setTimeout(() => {
        validationErrorsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
      return;
    }
    
    secureLog.debug('Validation passed, proceeding with save');

    try {
      let addressId = formData.addressId;
      
      // Handle address creation/update for address master (with graceful fallback)
      if (isAddressMasterEnabled && formData.address) {
        const addressData = formData.address as EnhancedAddressData;
        
        if (addressId) {
          // Try to update existing address
          const updateResult = await addressMasterService.updateAddress(addressId, addressData);
          if (!updateResult.success) {
            // If update fails (address not found), try to create new address instead
            console.warn('Address update failed, attempting to create new address');
            const createResult = await addressMasterService.createAddress({
              ...addressData,
              source: addressData.source || 'manual'
            });
            if (createResult.success && createResult.data) {
              addressId = createResult.data.id!;
            } else {
              // If creation also fails, continue without address master (use inline address)
              console.warn('Address creation failed, using inline address');
              addressId = undefined;
            }
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
            // If creation fails, continue without address master
            console.warn('Address creation failed, using inline address');
            addressId = undefined;
          }
        }
      }

      setIsSaving(true);
      const clientToSave: Partial<Client> = {
        ...formData,
        address: formData.address, // Keep inline address as fallback for immediate display
        signatories,
        ...(isAddressMasterEnabled && addressId ? { addressId } : {})
      };

      if (mode === 'create') {
        const createdClient = await clientsService.create(clientToSave, dispatch) as Client;
        
        // Link address for new client
        if (isAddressMasterEnabled && addressId && createdClient) {
          await addressMasterService.linkAddress('client', createdClient.id, addressId, true);
        }
        // Toast already shown by service
      } else if (mode === 'edit' && clientData) {
        await clientsService.update(clientData.id, { ...clientData, ...clientToSave }, dispatch);
        
        // Link address for existing client if not already linked
        if (isAddressMasterEnabled && addressId && !formData.addressId) {
          await addressMasterService.linkAddress('client', clientData.id, addressId, true);
        }
        // Toast already shown by service
      }

      onClose();
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        title: "Error",
        description: "Failed to save client. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (clientData) {
      setIsDeleting(true);
      try {
        await clientsService.delete(clientData.id, dispatch);
        onClose();
      } catch (error) {
        // Error handling is done in the service
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleSignatorySubmit = async (signatoryData: Omit<Signatory, 'id'> | Signatory) => {
    try {
      // Extract primary email/phone for backward compatibility
      const primaryEmail = signatoryData.emails?.find(e => e.isPrimary)?.email || 
                          signatoryData.emails?.[0]?.email;
      const primaryPhone = signatoryData.phones?.find(p => p.isPrimary) || 
                          signatoryData.phones?.[0];
      
      const enrichedData = {
        ...signatoryData,
        // Set legacy fields for backward compatibility
        email: primaryEmail || signatoryData.email,
        mobile: primaryPhone ? `${primaryPhone.countryCode} ${primaryPhone.number}` : signatoryData.mobile,
      };

      if (signatoryModal.mode === 'create') {
        const newSignatory: Signatory = {
          ...enrichedData as Omit<Signatory, 'id'>,
          id: Date.now().toString()
        };
        setSignatories(prev => [...prev, newSignatory]);
      } else if (signatoryModal.mode === 'edit') {
        setSignatories(prev => 
          prev.map(s => s.id === (enrichedData as Signatory).id ? (enrichedData as Signatory) : s)
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
    if (enabled) {
      // Auto-populate username from portal email (if available)
      const autoUsername = formData.portalAccess.email || '';
      
      setFormData(prev => ({
        ...prev,
        portalAccess: {
          ...prev.portalAccess,
          allowLogin: true,
          username: autoUsername,
          passwordHash: prev.portalAccess.mobile || ''
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        portalAccess: {
          ...prev.portalAccess,
          allowLogin: false
        }
      }));
    }
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
                      onBlur={(e) => {
                        setFormData(prev => ({ ...prev, name: toTitleCase(e.target.value) }));
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
                      onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                      disabled={mode === 'view'}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLIENT_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Client Group Field */}
                <div>
                  <Label htmlFor="clientGroupId">Client Group</Label>
                  <Select
                    value={formData.clientGroupId || 'none'}
                    onValueChange={(value) => {
                      if (value === '__create_new__') {
                        setClientGroupModal(true);
                        return;
                      }
                      setFormData(prev => ({ ...prev, clientGroupId: value === 'none' ? undefined : value }));
                    }}
                    disabled={mode === 'view'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client group (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Unclassified)</SelectItem>
                      {state.clientGroups
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(group => (
                          <SelectItem key={group.id} value={group.id}>
                            🏢 {group.name} ({group.totalClients} clients)
                          </SelectItem>
                        ))}
                      <SelectItem value="__create_new__" className="text-primary font-semibold border-t mt-1 pt-2">
                        ➕ Create New Group...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Organize clients by business group or category
                  </p>
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
                  isLoadingAddress ? (
                    <div className="text-sm text-muted-foreground">Loading address...</div>
                  ) : (
                    <AddressView 
                      address={formData.address as EnhancedAddressData}
                      showSource={true}
                      showActions={false}
                    />
                  )
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

            {/* Jurisdiction Information - GST Portal Format */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Jurisdiction Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  {/* STATE JURISDICTION (Administrative Office) */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <h4 className="text-sm font-semibold text-foreground">JURISDICTION - STATE</h4>
                      <Badge variant="outline" className="text-xs">Administrative Office</Badge>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-1">
                        <Label htmlFor="state-jurisdiction-state">State</Label>
                        <FieldTooltip 
                          formId="client-master" 
                          fieldId="state-jurisdiction"
                          content="State jurisdiction under GST Administrative Office"
                        />
                      </div>
                      <Input
                        id="state-jurisdiction-state"
                        value={formData.jurisdiction.stateJurisdiction?.state || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          jurisdiction: { 
                            ...prev.jurisdiction, 
                            stateJurisdiction: {
                              ...prev.jurisdiction.stateJurisdiction,
                              state: e.target.value
                            }
                          }
                        }))}
                        onBlur={(e) => {
                          const capitalized = toTitleCase(e.target.value);
                          setFormData(prev => ({ 
                            ...prev, 
                            jurisdiction: { 
                              ...prev.jurisdiction, 
                              stateJurisdiction: {
                                ...prev.jurisdiction.stateJurisdiction,
                                state: capitalized
                              }
                            }
                          }));
                        }}
                        disabled={mode === 'view'}
                        placeholder="e.g., Gujarat"
                      />
                    </div>

                    <div>
                      <Label htmlFor="state-jurisdiction-division">Division</Label>
                      <Input
                        id="state-jurisdiction-division"
                        value={formData.jurisdiction.stateJurisdiction?.division || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          jurisdiction: { 
                            ...prev.jurisdiction, 
                            stateJurisdiction: {
                              ...prev.jurisdiction.stateJurisdiction,
                              division: e.target.value
                            }
                          }
                        }))}
                        onBlur={(e) => {
                          const capitalized = toTitleCase(e.target.value);
                          setFormData(prev => ({ 
                            ...prev, 
                            jurisdiction: { 
                              ...prev.jurisdiction, 
                              stateJurisdiction: {
                                ...prev.jurisdiction.stateJurisdiction,
                                division: capitalized
                              }
                            }
                          }));
                        }}
                        disabled={mode === 'view'}
                        placeholder="e.g., Division - 1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="state-jurisdiction-range">Range</Label>
                      <Input
                        id="state-jurisdiction-range"
                        value={formData.jurisdiction.stateJurisdiction?.range || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          jurisdiction: { 
                            ...prev.jurisdiction, 
                            stateJurisdiction: {
                              ...prev.jurisdiction.stateJurisdiction,
                              range: e.target.value
                            }
                          }
                        }))}
                        onBlur={(e) => {
                          const capitalized = toTitleCase(e.target.value);
                          setFormData(prev => ({ 
                            ...prev, 
                            jurisdiction: { 
                              ...prev.jurisdiction, 
                              stateJurisdiction: {
                                ...prev.jurisdiction.stateJurisdiction,
                                range: capitalized
                              }
                            }
                          }));
                        }}
                        disabled={mode === 'view'}
                        placeholder="e.g., Range - 3"
                      />
                    </div>

                    <div>
                      <Label htmlFor="state-jurisdiction-unit">Unit / Ghatak</Label>
                      <Input
                        id="state-jurisdiction-unit"
                        value={formData.jurisdiction.stateJurisdiction?.unit || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          jurisdiction: { 
                            ...prev.jurisdiction, 
                            stateJurisdiction: {
                              ...prev.jurisdiction.stateJurisdiction,
                              unit: e.target.value
                            }
                          }
                        }))}
                        onBlur={(e) => {
                          const capitalized = toTitleCase(e.target.value);
                          setFormData(prev => ({ 
                            ...prev, 
                            jurisdiction: { 
                              ...prev.jurisdiction, 
                              stateJurisdiction: {
                                ...prev.jurisdiction.stateJurisdiction,
                                unit: capitalized
                              }
                            }
                          }));
                        }}
                        disabled={mode === 'view'}
                        placeholder="e.g., Ghatak 9 (Ahmedabad)"
                      />
                    </div>
                  </div>

                  {/* CENTER JURISDICTION (Other Office - CBIC) */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <h4 className="text-sm font-semibold text-foreground">JURISDICTION - CENTER (CBIC)</h4>
                      <Badge variant="outline" className="text-xs">Other Office</Badge>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-1">
                        <Label htmlFor="center-jurisdiction-zone">Zone</Label>
                        <FieldTooltip 
                          formId="client-master" 
                          fieldId="center-jurisdiction"
                          content="Center jurisdiction under CBIC Other Office"
                        />
                      </div>
                      <Input
                        id="center-jurisdiction-zone"
                        value={formData.jurisdiction.centerJurisdiction?.zone || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          jurisdiction: { 
                            ...prev.jurisdiction, 
                            centerJurisdiction: {
                              ...prev.jurisdiction.centerJurisdiction,
                              zone: e.target.value
                            }
                          }
                        }))}
                        onBlur={(e) => {
                          const capitalized = e.target.value.toUpperCase();
                          setFormData(prev => ({ 
                            ...prev, 
                            jurisdiction: { 
                              ...prev.jurisdiction, 
                              centerJurisdiction: {
                                ...prev.jurisdiction.centerJurisdiction,
                                zone: capitalized
                              }
                            }
                          }));
                        }}
                        disabled={mode === 'view'}
                        placeholder="e.g., AHMEDABAD"
                      />
                    </div>

                    <div>
                      <Label htmlFor="center-jurisdiction-commissionerate">Commissionerate</Label>
                      <Input
                        id="center-jurisdiction-commissionerate"
                        value={formData.jurisdiction.centerJurisdiction?.commissionerate || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          jurisdiction: { 
                            ...prev.jurisdiction, 
                            centerJurisdiction: {
                              ...prev.jurisdiction.centerJurisdiction,
                              commissionerate: e.target.value
                            }
                          }
                        }))}
                        onBlur={(e) => {
                          const capitalized = e.target.value.toUpperCase();
                          setFormData(prev => ({ 
                            ...prev, 
                            jurisdiction: { 
                              ...prev.jurisdiction, 
                              centerJurisdiction: {
                                ...prev.jurisdiction.centerJurisdiction,
                                commissionerate: capitalized
                              }
                            }
                          }));
                        }}
                        disabled={mode === 'view'}
                        placeholder="e.g., AHMEDABAD SOUTH"
                      />
                    </div>

                    <div>
                      <Label htmlFor="center-jurisdiction-division">Division</Label>
                      <Input
                        id="center-jurisdiction-division"
                        value={formData.jurisdiction.centerJurisdiction?.division || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          jurisdiction: { 
                            ...prev.jurisdiction, 
                            centerJurisdiction: {
                              ...prev.jurisdiction.centerJurisdiction,
                              division: e.target.value
                            }
                          }
                        }))}
                        onBlur={(e) => {
                          const capitalized = e.target.value.toUpperCase();
                          setFormData(prev => ({ 
                            ...prev, 
                            jurisdiction: { 
                              ...prev.jurisdiction, 
                              centerJurisdiction: {
                                ...prev.jurisdiction.centerJurisdiction,
                                division: capitalized
                              }
                            }
                          }));
                        }}
                        disabled={mode === 'view'}
                        placeholder="e.g., DIVISION-VII - SATELLITE"
                      />
                    </div>

                    <div>
                      <Label htmlFor="center-jurisdiction-range">Range</Label>
                      <Input
                        id="center-jurisdiction-range"
                        value={formData.jurisdiction.centerJurisdiction?.range || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          jurisdiction: { 
                            ...prev.jurisdiction, 
                            centerJurisdiction: {
                              ...prev.jurisdiction.centerJurisdiction,
                              range: e.target.value
                            }
                          }
                        }))}
                        onBlur={(e) => {
                          const capitalized = e.target.value.toUpperCase();
                          setFormData(prev => ({ 
                            ...prev, 
                            jurisdiction: { 
                              ...prev.jurisdiction, 
                              centerJurisdiction: {
                                ...prev.jurisdiction.centerJurisdiction,
                                range: capitalized
                              }
                            }
                          }));
                        }}
                        disabled={mode === 'view'}
                        placeholder="e.g., RANGE I"
                      />
                    </div>
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
                      <TableHead>Mobile</TableHead>
                      <TableHead>DOB</TableHead>
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
                            <TableCell className="font-mono text-xs">
                              {getPrimaryEmail(signatory) || '-'}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {getPrimaryPhone(signatory) || '-'}
                            </TableCell>
                            <TableCell>
                              {signatory.dob ? (
                                <div className="flex items-center gap-1">
                                  <span>{format(new Date(signatory.dob), 'dd-MMM-yyyy')}</span>
                                  <FieldTooltip 
                                    formId="signatory-display" 
                                    fieldId="dob-info"
                                    content="Used for identification and digital signature records"
                                  />
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>{signatory.designation || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {signatory.scope}
                              </Badge>
                            </TableCell>
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
                            const newEmail = e.target.value;
                            setFormData(prev => ({ 
                              ...prev, 
                              portalAccess: { 
                                ...prev.portalAccess, 
                                email: newEmail,
                                username: newEmail // Auto-sync username
                              }
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
                            const newMobile = e.target.value;
                            setFormData(prev => ({ 
                              ...prev, 
                              portalAccess: { 
                                ...prev.portalAccess, 
                                mobile: newMobile,
                                passwordHash: newMobile // Auto-sync password
                              }
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
                        <Label htmlFor="username" className="flex items-center gap-2">
                          Username
                          <Badge variant="secondary" className="text-xs font-normal">
                            Auto from Email
                          </Badge>
                        </Label>
                        <Input
                          id="username"
                          value={formData.portalAccess.username || formData.portalAccess.email || ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            portalAccess: { ...prev.portalAccess, username: e.target.value }
                          }))}
                          disabled={mode === 'view'}
                          placeholder="Will auto-populate from Portal Email"
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Username defaults to Portal Email (can be manually changed)
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="password" className="flex items-center gap-2">
                          Temporary Password
                          <Badge variant="outline" className="text-xs font-normal">
                            From Mobile
                          </Badge>
                        </Label>
                        <Input
                          id="password"
                          type="text"
                          value={formData.portalAccess.mobile || ''}
                          disabled={true}
                          placeholder="Portal Mobile will be temporary password"
                          className="font-mono text-sm bg-muted"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Client will use their Portal Mobile as temporary password (must change on first login)
                        </p>
                      </div>
                    </div>

                    {formData.portalAccess.email && formData.portalAccess.mobile && (
                      <>
                        <Separator />
                        <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Client Login Credentials Summary
                          </h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Username:</span>
                              <p className="font-mono font-medium mt-1">
                                {formData.portalAccess.username || formData.portalAccess.email}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Temporary Password:</span>
                              <p className="font-mono font-medium mt-1">
                                {formData.portalAccess.mobile}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-amber-600 flex items-center gap-1 mt-2">
                            <AlertCircle className="h-3 w-3" />
                            Client must change password on first login
                          </p>
                        </div>
                      </>
                    )}
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
                <Card className="border-destructive" ref={validationErrorsRef}>
                  <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Validation Errors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index} className="text-sm text-destructive">{error}</li>
                      ))}
                    </ul>
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
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Client'
                )}
              </Button>
            )}
            {mode !== 'view' && (
              <Button 
                type="button" 
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit(e);
                }}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === 'create' ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  mode === 'create' ? 'Create Client' : 'Update Client'
                )}
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

      {/* Client Group Modal */}
      <ClientGroupModal
        isOpen={clientGroupModal}
        onClose={() => setClientGroupModal(false)}
        mode="add"
        onSuccess={(newGroup) => {
          setFormData(prev => ({ ...prev, clientGroupId: newGroup.id }));
          setClientGroupModal(false);
        }}
      />
    </>
  );
};