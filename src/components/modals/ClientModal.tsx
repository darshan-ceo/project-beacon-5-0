import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AdaptiveFormShell } from '@/components/ui/adaptive-form-shell';
import { FormStickyFooter } from '@/components/ui/form-sticky-footer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Plus, Edit, Trash2, User, Eye, Building2, MapPin, Shield, AlertCircle, Loader2, RefreshCw, EyeOff, ExternalLink, Copy, ChevronDown, ChevronUp, CheckCircle, KeyRound, Lock } from 'lucide-react';
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
import { UnifiedAddressForm } from '@/components/ui/UnifiedAddressForm';
import { UnifiedAddress } from '@/types/address';
import { AddressView } from '@/components/ui/AddressView';
import { EnhancedAddressData, addressMasterService } from '@/services/addressMasterService';
import { FieldTooltip } from '@/components/ui/field-tooltip';
import { TagInput } from '@/components/ui/TagInput';
import { toTitleCase, toLowerCase } from '@/utils/formatters';
import { secureLog } from '@/utils/secureLogger';
import { extractPANFromGSTIN, validateGSTINPANConsistency, isValidGSTIN } from '@/utils/gstUtils';
import { format } from 'date-fns';
import { CLIENT_TYPES } from '@/../config/appConfig';
import { supabase } from '@/integrations/supabase/client';
import { useAdvancedRBAC } from '@/hooks/useAdvancedRBAC';

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
  const { state, dispatch, rawDispatch } = useAppState();
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
    dataScope?: 'OWN' | 'TEAM' | 'ALL'; // Dual Access Model: Entity-level data scope
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
      passwordHash: '',
      role: 'editor' as 'viewer' | 'editor' | 'admin'
    },
        assignedCAId: '',
        assignedCAName: '',
        clientGroupId: '',
        status: 'Active',
        tags: [],
        dataScope: 'TEAM'
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
  const [showPortalPassword, setShowPortalPassword] = useState(false);
  const [showPortalInstructions, setShowPortalInstructions] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newGeneratedPassword, setNewGeneratedPassword] = useState<string | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [isPANDerivedFromGSTIN, setIsPANDerivedFromGSTIN] = useState(false);
  const [showPANMismatchWarning, setShowPANMismatchWarning] = useState(false);
  // Track if user explicitly wants to change portal password (prevents accidental rotations on save)
  const [portalPasswordChangeRequested, setPortalPasswordChangeRequested] = useState(false);
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
          portalAccess: clientData.portalAccess ? { 
            ...clientData.portalAccess, 
            role: clientData.portalAccess.role || 'editor' 
          } : { allowLogin: false, role: 'editor' as const },
          assignedCAId: clientData.assignedCAId,
          assignedCAName: clientData.assignedCAName,
          clientGroupId: clientData.clientGroupId || '',
          status: clientData.status,
          addressId: addressObj.id,
          tags: (clientData as any).tags || [],
          dataScope: clientData.dataScope || 'TEAM'
        });
        setSignatories(clientData.signatories || []);
        
        // Check if PAN was derived from GSTIN on edit mode load
        const existingGSTIN = clientData.gstin || '';
        const existingPAN = clientData.pan || clientData.panNumber || '';
        if (existingGSTIN && existingPAN && isValidGSTIN(existingGSTIN)) {
          const derivedPAN = extractPANFromGSTIN(existingGSTIN);
          if (derivedPAN === existingPAN) {
            setIsPANDerivedFromGSTIN(true);
          }
        }
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
          tags: [],
          dataScope: 'TEAM'
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
    console.log('📍 [parseClientAddress] Raw input:', JSON.stringify(address));
    
    let result: EnhancedAddressData;
    
    if (typeof address === 'string') {
      result = {
        line1: address,
        line2: '',
        locality: '',
        district: '',
        cityId: '',
        cityName: '',
        stateId: '',
        stateName: '',
        pincode: '',
        countryId: 'IN',
        source: 'manual'
      };
    } else if (address && ('city' in address || 'cityName' in address)) {
      // Legacy Address format or mixed format - preserve all city/state fields
      result = {
        line1: address.line1 || '',
        line2: address.line2 || '',
        locality: address.locality || '',
        district: address.district || '',
        // Preserve city info - map legacy 'city' to 'cityName'
        cityId: address.cityId || '',
        cityName: address.cityName || address.city || '',
        // Preserve state info - map legacy 'state' to 'stateName'
        stateId: address.stateId || '',
        stateName: address.stateName || address.state || '',
        pincode: address.pincode || '',
        countryId: address.countryId || 'IN',
        source: address.source || 'manual',
        // Preserve any lat/lng if present
        ...(address.lat && { lat: address.lat }),
        ...(address.lng && { lng: address.lng })
      };
    } else {
      // Already EnhancedAddressData format or null
      result = address ? {
        ...address,
        // Ensure all fields have defaults
        line1: address.line1 || '',
        line2: address.line2 || '',
        locality: address.locality || '',
        district: address.district || '',
        cityId: address.cityId || '',
        cityName: address.cityName || '',
        stateId: address.stateId || '',
        stateName: address.stateName || '',
        pincode: address.pincode || '',
        countryId: address.countryId || 'IN',
        source: address.source || 'manual'
      } : {
        line1: '',
        line2: '',
        locality: '',
        district: '',
        cityId: '',
        cityName: '',
        stateId: '',
        stateName: '',
        pincode: '',
        countryId: 'IN',
        source: 'manual'
      };
    }
    
    console.log('📍 [parseClientAddress] Parsed result:', JSON.stringify(result));
    return result;
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
    } else if (isAddressMasterEnabled) {
      // For enhanced address format with Address Master
      if (!address.district?.trim()) {
        newErrors.addressDistrict = 'District is required';
      }
      if (!address.stateId?.trim()) {
        newErrors.addressState = 'State is required';
      }
    } else {
      // For SimpleAddressForm format (Address Master disabled)
      if (!address.cityName?.trim()) {
        newErrors.addressCity = 'City is required';
      }
      if (!address.stateName?.trim()) {
        newErrors.addressState = 'State is required';
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
      
      // PAN-GSTIN consistency check
      if (formData.pan && !validateGSTINPANConsistency(formData.gstin, formData.pan)) {
        const derivedPAN = extractPANFromGSTIN(formData.gstin);
        newErrors.pan = `PAN mismatch: GSTIN suggests PAN should be ${derivedPAN}`;
      }
    }

    if (formData.address.pincode) {
      const pincodeValidation = clientsService.validatePincode(formData.address.pincode);
      if (!pincodeValidation.isValid) {
        newErrors.pincode = pincodeValidation.errors[0];
      }
    }

    // Portal access validations - simplified to username and password
    // Password is only required for NEW portal access, not when editing existing
    // Check if portal is already provisioned by looking at existing portalAccess data
    const isPortalAlreadyProvisioned = mode === 'edit' && clientData?.portalAccess?.allowLogin && clientData?.portalAccess?.username;
    
    if (formData.portalAccess.allowLogin) {
      if (!formData.portalAccess.username?.trim()) {
        newErrors.portalUsername = 'Username is required for portal access';
      } else if (formData.portalAccess.username.trim().length < 3) {
        newErrors.portalUsername = 'Username must be at least 3 characters';
      }

      // Password is only required for new portal setup or if user entered one
      const passwordEntered = formData.portalAccess.passwordHash?.trim();
      if (!isPortalAlreadyProvisioned && !passwordEntered) {
        newErrors.portalPassword = 'Password is required for new portal access';
      } else if (passwordEntered && passwordEntered.length < 8) {
        newErrors.portalPassword = 'Password must be at least 8 characters';
      } else if (passwordEntered) {
        const pwd = passwordEntered;
        const isWeakPattern = /^(\d)\1+$/.test(pwd) || // All same digit
                              /^12345678/.test(pwd) ||
                              /^password/i.test(pwd) ||
                              /^qwerty/i.test(pwd) ||
                              /^abcd/i.test(pwd);
        const hasLetter = /[a-zA-Z]/.test(pwd);
        const hasNumber = /\d/.test(pwd);
        
        if (isWeakPattern || !hasLetter || !hasNumber) {
          newErrors.portalPassword = 'Password must contain letters and numbers, and avoid common patterns';
        }
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

  const handleSubmit = async (e?: React.FormEvent | { preventDefault?: () => void }) => {
    e?.preventDefault?.();
    
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

      let savedClientId: string | undefined;

      if (mode === 'create') {
        const createdClient = await clientsService.create(clientToSave, dispatch) as Client;
        savedClientId = createdClient?.id;
        
        // Link address for new client
        if (isAddressMasterEnabled && addressId && createdClient) {
          await addressMasterService.linkAddress('client', createdClient.id, addressId, true);
        }
        // Toast already shown by service
      } else if (mode === 'edit' && clientData) {
        savedClientId = clientData.id;
        // Use rawDispatch so UI updates instantly without triggering persistence twice
        await clientsService.update(clientData.id, { ...clientData, ...clientToSave }, rawDispatch);
        
        // Link address for existing client if not already linked
        if (isAddressMasterEnabled && addressId && !formData.addressId) {
          await addressMasterService.linkAddress('client', clientData.id, addressId, true);
        }
        // Toast already shown by service
      }

      // Provision portal user if portal access is enabled
      // In EDIT mode: only provision if user explicitly requested password change OR if this is NEW portal setup
      const isNewPortalSetup = mode === 'create' || !clientData?.portalAccess?.allowLogin || !clientData?.portalAccess?.username;
      const shouldProvision = savedClientId && 
                              formData.portalAccess.allowLogin && 
                              formData.portalAccess.username && 
                              formData.portalAccess.passwordHash &&
                              (isNewPortalSetup || portalPasswordChangeRequested);
      
      if (shouldProvision) {
        try {
          console.log('[ClientModal] Provisioning portal user - isNew:', isNewPortalSetup, 'passwordChangeRequested:', portalPasswordChangeRequested);
          const { data, error } = await supabase.functions.invoke('provision-portal-user', {
            body: {
              clientId: savedClientId,
              username: formData.portalAccess.username,
              password: formData.portalAccess.passwordHash,
              portalRole: formData.portalAccess.role || 'editor'
            }
          });

          if (error) {
            console.error('Portal provisioning error:', error);
            toast({
              title: "Portal Setup Warning",
              description: "Client saved but portal access setup failed. You may need to re-save.",
              variant: "destructive"
            });
          } else if (data?.success) {
            console.log('Portal user provisioned:', data);
            toast({
              title: "Portal Access Configured",
              description: `Portal login created for ${formData.portalAccess.username}`,
            });
            // Clear the password field and reset flag after successful provision
            setFormData(prev => ({
              ...prev,
              portalAccess: { ...prev.portalAccess, passwordHash: '' }
            }));
            setPortalPasswordChangeRequested(false);
          }
        } catch (provisionError) {
          console.error('Portal provisioning exception:', provisionError);
          // Non-fatal - client was still saved
        }
      }

      onClose();
    } catch (error: any) {
      console.error('Error saving client:', error);
      const errorMessage = error?.message || 'Failed to save client. Please try again.';
      toast({
        title: "Error Saving Client",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // RBAC permission checks
  const { hasPermission } = useAdvancedRBAC();
  const canDeleteClients = hasPermission('clients', 'delete');

  const handleDelete = async () => {
    if (clientData) {
      // RBAC permission check
      if (!canDeleteClients) {
        toast({
          title: 'Permission Denied',
          description: "You don't have permission to delete clients.",
          variant: 'destructive',
        });
        return;
      }
      
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
      setFormData(prev => ({
        ...prev,
        portalAccess: {
          ...prev.portalAccess,
          allowLogin: true,
          username: prev.portalAccess.username || '',
          passwordHash: prev.portalAccess.passwordHash || ''
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

  const generateRandomPassword = () => {
    // Generate a strong password with letters, numbers, and special characters
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const numbers = '23456789';
    const special = '@#$!';
    
    // Ensure at least one of each type
    let password = '';
    password += upper.charAt(Math.floor(Math.random() * upper.length));
    password += lower.charAt(Math.floor(Math.random() * lower.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += special.charAt(Math.floor(Math.random() * special.length));
    
    // Fill remaining with mixed characters
    const allChars = upper + lower + numbers + special;
    for (let i = 0; i < 6; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    // Shuffle the password
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    setFormData(prev => ({
      ...prev,
      portalAccess: {
        ...prev.portalAccess,
        passwordHash: password
      }
    }));
    // Mark that user explicitly wants to change password
    setPortalPasswordChangeRequested(true);
    setErrors(prev => ({ ...prev, portalPassword: '' }));
  };

  // Generate a random password (returns the password string)
  const generatePassword = (): string => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const numbers = '23456789';
    const special = '@#$!';
    
    let password = '';
    password += upper.charAt(Math.floor(Math.random() * upper.length));
    password += lower.charAt(Math.floor(Math.random() * lower.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += special.charAt(Math.floor(Math.random() * special.length));
    
    const allChars = upper + lower + numbers + special;
    for (let i = 0; i < 6; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  // Reset portal password for existing users
  const handleResetPortalPassword = async () => {
    if (!clientData?.id || !clientData?.portalAccess?.username) return;
    
    setIsResettingPassword(true);
    setNewGeneratedPassword(null);
    setPasswordCopied(false);
    
    try {
      const newPassword = generatePassword();
      
      const { data, error } = await supabase.functions.invoke('provision-portal-user', {
        body: {
          clientId: clientData.id,
          username: clientData.portalAccess.username,
          password: newPassword,
          portalRole: clientData.portalAccess.role || 'editor'
        }
      });

      if (error) {
        console.error('Reset password error:', error);
        toast({
          title: "Password Reset Failed",
          description: error.message || 'Failed to reset password',
          variant: "destructive"
        });
        return;
      }

      if (data?.error) {
        toast({
          title: "Password Reset Failed",
          description: data.error,
          variant: "destructive"
        });
        return;
      }

      // Success - show the new password
      setNewGeneratedPassword(newPassword);
      toast({
        title: "Password Reset Successful",
        description: "New password generated. Please copy it now - it won't be shown again!",
      });
      
    } catch (err) {
      console.error('Reset password error:', err);
      toast({
        title: "Password Reset Failed",
        description: 'An unexpected error occurred',
        variant: "destructive"
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const copyPasswordToClipboard = () => {
    if (newGeneratedPassword) {
      navigator.clipboard.writeText(newGeneratedPassword);
      setPasswordCopied(true);
      toast({
        title: "Password Copied",
        description: "New password copied to clipboard",
      });
    }
  };

  const handleSignatoriesImport = (importedContacts: any[]) => {
    setPreloadedContacts(importedContacts);
    setGstData({ hasSignatories: true }); // Track GST data presence
  };

  const showSignatorySection = formData.type !== 'Individual';

  const handlePrimaryAction = () => {
    // Use requestSubmit to trigger the actual form submission
    const form = document.getElementById('client-form') as HTMLFormElement | null;
    if (form) {
      form.requestSubmit();
    } else {
      // Fallback: call handleSubmit directly
      handleSubmit();
    }
  };

  const footer = (
    <FormStickyFooter
      mode={mode}
      onCancel={onClose}
      onPrimaryAction={mode !== 'view' ? handlePrimaryAction : undefined}
      primaryLabel={mode === 'create' ? 'Create Client' : 'Update Client'}
      isPrimaryLoading={isSaving}
      showDelete={mode === 'edit' && canDeleteClients}
      onDelete={handleDelete}
      isDeleteLoading={isDeleting}
    />
  );

  const getTitle = () => {
    switch (mode) {
      case 'create': return 'Add New Client';
      case 'edit': return 'Edit Client';
      case 'view': return 'Client Details';
    }
  };

  return (
    <>
      <AdaptiveFormShell
        isOpen={isOpen}
        onClose={onClose}
        title={getTitle()}
        icon={<Building2 className="h-5 w-5" />}
        complexity="complex"
        footer={footer}
        dataTour="client-modal"
      >
        <form id="client-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Environment status badges */}
          <div className="flex gap-2 text-xs mb-4">
            {(() => {
              const badges = envConfig.getStatusBadges();
              return (
                <>
                  <Badge variant={badges.GST === "ON" ? "default" : "destructive"}>
                    GST: {badges.GST}
                  </Badge>
                  <Badge variant={badges.API === "LIVE" || badges.API === "SET" ? "default" : "destructive"}>
                    API: {badges.API}
                  </Badge>
                  <Badge variant={badges.MOCK === "ON" ? "secondary" : "outline"}>
                    MOCK: {badges.MOCK}
                  </Badge>
                </>
              );
            })()}
          </div>

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
                  {/* GSTIN First (left column) */}
                  <div>
                    <div className="flex items-center gap-1">
                      <Label htmlFor="gstin">GSTIN</Label>
                      <FieldTooltip formId="client-master" fieldId="gstin" />
                    </div>
                    <Input
                      id="gstin"
                      value={formData.gstin}
                      onChange={(e) => {
                        const newGSTIN = e.target.value.toUpperCase();
                        setFormData(prev => ({ ...prev, gstin: newGSTIN }));
                        setErrors(prev => ({ ...prev, gstin: '' }));
                        
                        // Auto-extract PAN when GSTIN is valid
                        if (newGSTIN.length === 15 && isValidGSTIN(newGSTIN)) {
                          const derivedPAN = extractPANFromGSTIN(newGSTIN);
                          if (derivedPAN) {
                            setFormData(prev => ({ ...prev, gstin: newGSTIN, pan: derivedPAN }));
                            setIsPANDerivedFromGSTIN(true);
                            setShowPANMismatchWarning(false);
                            setErrors(prev => ({ ...prev, pan: '' }));
                          }
                        } else if (!newGSTIN) {
                          // Clear derived flag when GSTIN is cleared
                          setIsPANDerivedFromGSTIN(false);
                          setShowPANMismatchWarning(false);
                        }
                      }}
                      onBlur={(e) => {
                        // Also check on blur for paste scenarios
                        const gstin = e.target.value.toUpperCase();
                        if (gstin.length === 15 && isValidGSTIN(gstin)) {
                          const derivedPAN = extractPANFromGSTIN(gstin);
                          if (derivedPAN && (!formData.pan || formData.pan !== derivedPAN)) {
                            setFormData(prev => ({ ...prev, pan: derivedPAN }));
                            setIsPANDerivedFromGSTIN(true);
                            setShowPANMismatchWarning(false);
                            setErrors(prev => ({ ...prev, pan: '' }));
                          }
                        } else if (gstin && !isValidGSTIN(gstin)) {
                          setErrors(prev => ({ ...prev, gstin: 'Invalid GSTIN format. PAN cannot be derived.' }));
                        }
                      }}
                      disabled={mode === 'view'}
                      maxLength={15}
                      placeholder="07AABCU9603R1ZV"
                      className={errors.gstin ? 'border-destructive' : ''}
                    />
                    {errors.gstin && <p className="text-sm text-destructive mt-1">{errors.gstin}</p>}
                    <p className="text-xs text-muted-foreground mt-1">PAN will be auto-extracted from valid GSTIN</p>
                  </div>
                  
                  {/* PAN Second (right column) */}
                  <div>
                    <div className="flex items-center gap-1">
                      <Label htmlFor="pan">PAN Number *</Label>
                      <FieldTooltip formId="client-master" fieldId="pan" />
                      {isPANDerivedFromGSTIN && formData.gstin && (
                        <span className="text-xs text-muted-foreground ml-1">(auto-derived from GSTIN)</span>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="pan"
                        value={formData.pan}
                        onChange={(e) => {
                          const newPAN = e.target.value.toUpperCase();
                          setFormData(prev => ({ ...prev, pan: newPAN }));
                          setErrors(prev => ({ ...prev, pan: '' }));
                          
                          // Show warning if user manually edits PAN when GSTIN is present
                          if (formData.gstin && isPANDerivedFromGSTIN) {
                            const derivedPAN = extractPANFromGSTIN(formData.gstin);
                            if (derivedPAN && newPAN !== derivedPAN) {
                              setShowPANMismatchWarning(true);
                            } else {
                              setShowPANMismatchWarning(false);
                            }
                          }
                        }}
                        disabled={mode === 'view' || (isPANDerivedFromGSTIN && isValidGSTIN(formData.gstin))}
                        maxLength={10}
                        placeholder="ABCDE1234F"
                        className={`${errors.pan ? 'border-destructive' : ''} ${isPANDerivedFromGSTIN && formData.gstin ? 'bg-muted/50' : ''}`}
                      />
                      {isPANDerivedFromGSTIN && formData.gstin && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    {errors.pan && <p className="text-sm text-destructive mt-1">{errors.pan}</p>}
                    {showPANMismatchWarning && (
                      <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        PAN is derived from GSTIN. Manual changes may cause mismatch.
                      </p>
                    )}
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
                  <UnifiedAddressForm
                    value={formData.address || {}}
                    onChange={(address: UnifiedAddress) => setFormData(prev => ({
                      ...prev,
                      address: address as unknown as EnhancedAddressData
                    }))}
                    module="client"
                    mode={mode}
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
                    
                    {/* Portal Already Active Indicator - for existing clients with portal access */}
                    {mode === 'edit' && clientData?.portalAccess?.allowLogin && clientData?.portalAccess?.username ? (
                      <div className="space-y-3">
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              Portal is active for user: <strong className="font-mono">{clientData.portalAccess.username}</strong>
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleResetPortalPassword}
                              disabled={isResettingPassword}
                              className="shrink-0"
                            >
                              {isResettingPassword ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  Resetting...
                                </>
                              ) : (
                                <>
                                  <KeyRound className="h-4 w-4 mr-1" />
                                  Reset Password
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Show newly generated password */}
                        {newGeneratedPassword && (
                          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg p-4 space-y-2">
                            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              New Password Generated - Copy Now!
                            </h4>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              This password will not be shown again. Make sure to copy and share it with your client.
                            </p>
                            <div className="flex items-center gap-2">
                              <Input 
                                value={newGeneratedPassword} 
                                readOnly 
                                className="font-mono text-lg bg-white dark:bg-background font-bold tracking-wider"
                              />
                              <Button
                                type="button"
                                variant={passwordCopied ? "default" : "outline"}
                                size="sm"
                                onClick={copyPasswordToClipboard}
                                className="shrink-0"
                              >
                                {passwordCopied ? (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-4 w-4 mr-1" />
                                    Copy
                                  </>
                                )}
                              </Button>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                              <span className="text-xs text-amber-700 dark:text-amber-300">Username:</span>
                              <span className="font-mono text-sm font-medium">{clientData.portalAccess.username}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(clientData.portalAccess.username || '');
                                  toast({ title: "Username copied" });
                                }}
                                className="h-6 px-2"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          These credentials are shared for all portal users linked to this client.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {/* Username Field */}
                      <div>
                        <Label htmlFor="portalUsername">Portal Username *</Label>
                        <Input
                          id="portalUsername"
                          value={formData.portalAccess.username || ''}
                          onChange={(e) => {
                            setFormData(prev => ({ 
                              ...prev, 
                              portalAccess: { 
                                ...prev.portalAccess, 
                                username: e.target.value
                              }
                            }));
                            setErrors(prev => ({ ...prev, portalUsername: '' }));
                          }}
                          disabled={mode === 'view'}
                          placeholder="Enter username"
                          className={errors.portalUsername ? 'border-destructive' : ''}
                        />
                        {errors.portalUsername && <p className="text-sm text-destructive mt-1">{errors.portalUsername}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          Minimum 3 characters
                        </p>
                      </div>

                      {/* Password Field - label changes based on whether portal is already provisioned */}
                      <div>
                        {(() => {
                          const isPortalAlreadyProvisioned = mode === 'edit' && clientData?.portalAccess?.allowLogin && clientData?.portalAccess?.username;
                          return (
                            <>
                              <Label htmlFor="portalPassword">
                                {isPortalAlreadyProvisioned ? 'New Password (optional)' : 'Portal Password *'}
                              </Label>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Input
                                    id="portalPassword"
                                    type={showPortalPassword ? 'text' : 'password'}
                                    value={formData.portalAccess.passwordHash || ''}
                                    onChange={(e) => {
                                      setFormData(prev => ({ 
                                        ...prev, 
                                        portalAccess: { 
                                          ...prev.portalAccess, 
                                          passwordHash: e.target.value
                                        }
                                      }));
                                      setErrors(prev => ({ ...prev, portalPassword: '' }));
                                    }}
                                    disabled={mode === 'view'}
                                    placeholder={isPortalAlreadyProvisioned ? 'Leave empty to keep current' : 'Enter password'}
                                    className={errors.portalPassword ? 'border-destructive pr-10' : 'pr-10'}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={() => setShowPortalPassword(!showPortalPassword)}
                                    disabled={mode === 'view'}
                                  >
                                    {showPortalPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                                  </Button>
                                </div>
                                {mode !== 'view' && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={generateRandomPassword}
                                    className="shrink-0"
                                  >
                                    <RefreshCw className="h-4 w-4 mr-1" />
                                    Generate
                                  </Button>
                                )}
                              </div>
                              {errors.portalPassword && <p className="text-sm text-destructive mt-1">{errors.portalPassword}</p>}
                              <p className="text-xs text-muted-foreground mt-1">
                                {isPortalAlreadyProvisioned 
                                  ? 'Leave empty to keep current password' 
                                  : 'Min 8 characters with letters & numbers (e.g., Client@2024)'}
                              </p>
                            </>
                          );
                        })()}
                      </div>
                      
                      {/* Portal Role Selector */}
                      <div>
                        <Label htmlFor="portalRole">Portal Role *</Label>
                        <Select
                          value={formData.portalAccess.role || 'editor'}
                          onValueChange={(value: 'viewer' | 'editor' | 'admin') => {
                            setFormData(prev => ({ 
                              ...prev, 
                              portalAccess: { 
                                ...prev.portalAccess, 
                                role: value
                              }
                            }));
                          }}
                          disabled={mode === 'view'}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">
                              <div className="flex flex-col">
                                <span>Viewer</span>
                                <span className="text-xs text-muted-foreground">Can view &amp; download only</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="editor">
                              <div className="flex flex-col">
                                <span>Editor</span>
                                <span className="text-xs text-muted-foreground">Can upload, download &amp; add notes</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex flex-col">
                                <span>Admin</span>
                                <span className="text-xs text-muted-foreground">Full access including user management</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Controls what actions the portal user can perform
                        </p>
                      </div>
                    </div>

                    {/* Credentials Summary */}
                    {formData.portalAccess.username && formData.portalAccess.passwordHash && (
                      <>
                        <Separator />
                        <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Portal Credentials Summary
                          </h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Username:</span>
                              <p className="font-mono font-medium mt-1">
                                {formData.portalAccess.username}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Password:</span>
                              <p className="font-mono font-medium mt-1">
                                {'•'.repeat(formData.portalAccess.passwordHash.length)}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-amber-600 flex items-center gap-1 mt-2">
                            <AlertCircle className="h-3 w-3" />
                            Client should change password on first login
                          </p>
                        </div>
                      </>
                    )}

                    {/* Portal Access Link */}
                    <Separator />
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                        <ExternalLink className="h-4 w-4" />
                        Portal Access Link
                      </h4>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={`${window.location.origin}/portal/login?username=${formData.portalAccess.username || ''}`} 
                          readOnly 
                          className="font-mono text-sm bg-white dark:bg-background"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`${window.location.origin}/portal/login?username=${formData.portalAccess.username || ''}`, '_blank')}
                          className="shrink-0"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Open
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/portal/login?username=${formData.portalAccess.username || ''}`);
                            toast({
                              title: "Link copied",
                              description: "Portal access link copied to clipboard",
                            });
                          }}
                          className="shrink-0"
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        Share this link with your client along with their credentials
                      </p>
                    </div>

                    {/* Quick Steps Instructions */}
                    <div className="border rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowPortalInstructions(!showPortalInstructions)}
                        className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                      >
                        <span className="text-sm font-medium flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-primary" />
                          Quick Steps & Instructions
                        </span>
                        {showPortalInstructions ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      
                      {showPortalInstructions && (
                        <div className="p-4 space-y-4 text-sm">
                          <div>
                            <h5 className="font-semibold text-foreground mb-2">For Clients:</h5>
                            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                              <li>Visit the portal link shared by your administrator</li>
                              <li>Enter the Username and Password provided</li>
                              <li>After first login, go to <strong>Profile → Change Password</strong></li>
                              <li>Set a new secure password of your choice</li>
                            </ol>
                          </div>
                          
                          <Separator />
                          
                          <div>
                            <h5 className="font-semibold text-foreground mb-2">For Administrators:</h5>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                              <li><strong>Reset credentials:</strong> Edit client → Update password → Click "Generate" or enter new password → Save</li>
                              <li><strong>Disable access:</strong> Toggle off "Enable Client Portal Login" and save</li>
                              <li>Credentials are shared across all linked portal users for this client</li>
                            </ul>
                          </div>
                        </div>
                      )}
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

                {/* Data Scope - Controls who can see this client */}
                <div>
                  <Label htmlFor="dataScope">Data Visibility Scope</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Controls who can see this client record in addition to you (the owner)
                  </p>
                  <Select 
                    value={formData.dataScope || 'TEAM'} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, dataScope: value as any }))}
                    disabled={mode === 'view'}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWN">Own Only - Only you can see this</SelectItem>
                      <SelectItem value="TEAM">Team - You and your team members</SelectItem>
                      <SelectItem value="ALL">All - Everyone in the organization</SelectItem>
                    </SelectContent>
                  </Select>
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
      </AdaptiveFormShell>

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