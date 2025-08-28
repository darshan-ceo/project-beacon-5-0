import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Client, useAppState } from '@/contexts/AppStateContext';
import { CASelector, LawyerSelector } from '@/components/ui/employee-selector';
import { useDataPersistenceContext } from '@/components/providers/DataPersistenceProvider';
import { StructuredAddress } from '@/components/ui/structured-address';
import { SignatoryManager } from '@/components/ui/signatory-manager';
import { CLIENT_CATEGORIES } from '@/constants/indianStates';
import { CompanySignatory } from '@/types/signatory';
import { 
  validateClientForm, 
  checkDuplicateClient, 
  validatePAN, 
  validateGST, 
  validateCIN,
  ValidationResult 
} from '@/utils/validation';
import { User, Building2, MapPin, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null;
  mode: 'create' | 'edit' | 'view';
}

interface Address {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

interface AuthorizedSignatory {
  name: string;
  designation: string;
  email?: string;
  phone?: string;
}

interface FormData {
  // Basic Info
  type: 'Individual' | 'Company' | 'Partnership' | 'Trust' | 'Society';
  name: string;
  companyName?: string;
  
  // Contact
  email: string;
  phone: string;
  
  // Address
  address: Address;
  communicationAddress?: Address;
  useSameAddress: boolean;
  
  // Tax Info
  panNumber: string;
  gstNumber?: string;
  cin?: string;
  registrationNumber?: string;
  
  // Company specific
  authorizedSignatory?: AuthorizedSignatory;
  
  // Litigation
  clientCategory?: string;
  jurisdiction: {
    range?: string;
    division?: string;
    commissionerate?: string;
  };
  notes?: string;
  
  // Assignments
  assignedCAId: string;
  assignedCAName: string;
  defaultAssignedAdvocateId?: string;
  defaultAssignedAdvocateName?: string;
}

export const ClientModal: React.FC<ClientModalProps> = ({ 
  isOpen, 
  onClose, 
  client: clientData, 
  mode 
}) => {
  const { state, dispatch } = useAppState();
  const { dataService, saveToStorage } = useDataPersistenceContext();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSignatories, setClientSignatories] = useState<CompanySignatory[]>([]);
  
  const [formData, setFormData] = useState<FormData>({
    type: 'Individual',
    name: '',
    companyName: '',
    email: '',
    phone: '',
    address: {
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'IN'
    },
    useSameAddress: true,
    panNumber: '',
    gstNumber: '',
    cin: '',
    registrationNumber: '',
    authorizedSignatory: {
      name: '',
      designation: '',
      email: '',
      phone: ''
    },
    clientCategory: '',
    jurisdiction: {
      range: '',
      division: '',
      commissionerate: ''
    },
    notes: '',
    assignedCAId: '',
    assignedCAName: '',
    defaultAssignedAdvocateId: '',
    defaultAssignedAdvocateName: ''
  });

  // Initialize form data and signatories
  useEffect(() => {
    if (clientData && (mode === 'edit' || mode === 'view')) {
      setFormData({
        type: clientData.type,
        name: clientData.name,
        companyName: clientData.companyName || '',
        email: clientData.email,
        phone: clientData.phone,
        address: clientData.address || {
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          pincode: '',
          country: 'IN'
        },
        communicationAddress: clientData.communicationAddress,
        useSameAddress: !clientData.communicationAddress,
        panNumber: clientData.panNumber,
        gstNumber: clientData.gstNumber || '',
        cin: clientData.cin || '',
        registrationNumber: clientData.registrationNumber || '',
        authorizedSignatory: clientData.authorizedSignatory || {
          name: '',
          designation: '',
          email: '',
          phone: ''
        },
        clientCategory: clientData.clientCategory || '',
        jurisdiction: clientData.jurisdiction || {
          range: '',
          division: '',
          commissionerate: ''
        },
        notes: clientData.notes || '',
        assignedCAId: clientData.assignedCAId,
        assignedCAName: clientData.assignedCAName,
        defaultAssignedAdvocateId: clientData.defaultAssignedAdvocateId || '',
        defaultAssignedAdvocateName: clientData.defaultAssignedAdvocateName || ''
      });

      // Load signatories for this client
      const existingSignatories = state.signatories.filter(s => s.clientId === clientData.id);
      setClientSignatories(existingSignatories);
    } else if (mode === 'create') {
      // Reset form for create mode
      setFormData({
        type: 'Individual',
        name: '',
        companyName: '',
        email: '',
        phone: '',
        address: {
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          pincode: '',
          country: 'IN'
        },
        useSameAddress: true,
        panNumber: '',
        gstNumber: '',
        cin: '',
        registrationNumber: '',
        authorizedSignatory: {
          name: '',
          designation: '',
          email: '',
          phone: ''
        },
        clientCategory: '',
        jurisdiction: {
          range: '',
          division: '',
          commissionerate: ''
        },
        notes: '',
        assignedCAId: '',
        assignedCAName: '',
        defaultAssignedAdvocateId: '',
        defaultAssignedAdvocateName: ''
      });
      setClientSignatories([]);
    }
    setErrors({});
  }, [clientData, mode, isOpen, state.signatories]);

  // Real-time validation
  const validateField = (fieldName: string, value: any) => {
    const newErrors = { ...errors };
    
    switch (fieldName) {
      case 'panNumber':
        const panValidation = validatePAN(value);
        if (panValidation.isValid) {
          delete newErrors.panNumber;
        } else {
          newErrors.panNumber = panValidation.error!;
        }
        break;
      case 'gstNumber':
        if (value) {
          const gstValidation = validateGST(value);
          if (gstValidation.isValid) {
            delete newErrors.gstNumber;
          } else {
            newErrors.gstNumber = gstValidation.error!;
          }
        } else {
          delete newErrors.gstNumber;
        }
        break;
      case 'cin':
        if (value) {
          const cinValidation = validateCIN(value);
          if (cinValidation.isValid) {
            delete newErrors.cin;
          } else {
            newErrors.cin = cinValidation.error!;
          }
        } else {
          delete newErrors.cin;
        }
        break;
    }
    
    setErrors(newErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Comprehensive validation
      const validationErrors = validateClientForm(formData, formData.type);
      
      if (validationErrors.length > 0) {
        const errorMap: Record<string, string> = {};
        validationErrors.forEach(error => {
          if (error.error) {
            // Extract field name from error message for better UX
            const field = error.error.toLowerCase().includes('pan') ? 'panNumber' :
                         error.error.toLowerCase().includes('gst') ? 'gstNumber' :
                         error.error.toLowerCase().includes('email') ? 'email' :
                         error.error.toLowerCase().includes('phone') ? 'phone' :
                         error.error.toLowerCase().includes('address line 1') ? 'addressLine1' :
                         error.error.toLowerCase().includes('city') ? 'city' :
                         error.error.toLowerCase().includes('state') ? 'state' :
                         error.error.toLowerCase().includes('pincode') ? 'pincode' :
                         'general';
            errorMap[field] = error.error;
          }
        });
        setErrors(errorMap);
        toast({
          title: "Validation Error",
          description: "Please fix the errors and try again.",
          variant: "destructive"
        });
        return;
      }

      // Check for duplicates
      const duplicateCheck = checkDuplicateClient(
        formData, 
        state.clients, 
        clientData?.id
      );
      
      if (!duplicateCheck.isValid) {
        setErrors({ duplicate: duplicateCheck.error! });
        toast({
          title: "Duplicate Client",
          description: duplicateCheck.error,
          variant: "destructive"
        });
        return;
      }

      // For Company clients, ensure at least one active signatory exists
      if (formData.type === 'Company') {
        const activeSignatories = clientSignatories.filter(s => s.status === 'Active');
        if (activeSignatories.length === 0) {
          toast({
            title: "Validation Error",
            description: "Company clients must have at least one active signatory.",
            variant: "destructive"
          });
          return;
        }

        // Ensure there's a primary signatory among active ones
        const hasPrimary = activeSignatories.some(s => s.isPrimary);
        if (!hasPrimary) {
          toast({
            title: "Validation Error", 
            description: "Company clients must have one signatory marked as primary.",
            variant: "destructive"
          });
          return;
        }
      }

      // Prepare client data
      const clientName = formData.type === 'Company' ? formData.companyName : formData.name;
      
      if (mode === 'create') {
        const clientData = {
          name: clientName || formData.name,
          type: formData.type,
          companyName: formData.type === 'Company' ? formData.companyName : undefined,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          communicationAddress: formData.useSameAddress ? undefined : formData.communicationAddress,
          registrationNumber: formData.registrationNumber,
          cin: formData.cin,
          panNumber: formData.panNumber,
          gstNumber: formData.gstNumber,
          authorizedSignatory: formData.type === 'Company' ? formData.authorizedSignatory : undefined,
          clientCategory: formData.clientCategory,
          jurisdiction: formData.jurisdiction,
          notes: formData.notes,
          status: 'Active' as const,
          assignedCAId: formData.assignedCAId,
          assignedCAName: formData.assignedCAName,
          defaultAssignedAdvocateId: formData.defaultAssignedAdvocateId,
          defaultAssignedAdvocateName: formData.defaultAssignedAdvocateName,
          registrationDate: new Date().toISOString().split('T')[0],
          totalCases: 0,
          activeCases: 0,
          totalInvoiced: 0
        };

        const newClient = await dataService.createClient(clientData);
        console.log('✅ Client created:', newClient.name, 'ID:', newClient.id);
        
        // Immediate save to localStorage
        saveToStorage();
        
        toast({
          title: "Client Created",
          description: `${formData.type} client "${clientName || formData.name}" has been created successfully.`,
        });
      } else if (mode === 'edit' && clientData) {
        const updates = {
          name: clientName || formData.name,
          type: formData.type,
          companyName: formData.type === 'Company' ? formData.companyName : undefined,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          communicationAddress: formData.useSameAddress ? undefined : formData.communicationAddress,
          registrationNumber: formData.registrationNumber,
          cin: formData.cin,
          panNumber: formData.panNumber,
          gstNumber: formData.gstNumber,
          authorizedSignatory: formData.type === 'Company' ? formData.authorizedSignatory : undefined,
          clientCategory: formData.clientCategory,
          jurisdiction: formData.jurisdiction,
          notes: formData.notes,
          assignedCAId: formData.assignedCAId,
          assignedCAName: formData.assignedCAName,
          defaultAssignedAdvocateId: formData.defaultAssignedAdvocateId,
          defaultAssignedAdvocateName: formData.defaultAssignedAdvocateName
        };

        const updatedClient = await dataService.updateClient(clientData.id, updates);
        console.log('✅ Client updated:', updatedClient.name, 'ID:', updatedClient.id);
        
        // Immediate save to localStorage
        saveToStorage();
        
        toast({
          title: "Client Updated",
          description: `Client "${clientName || formData.name}" has been updated successfully.`,
        });
      }

      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (clientData) {
      await dataService.deleteClient(clientData.id);
      console.log('✅ Client deleted:', clientData.name, 'ID:', clientData.id);
      
      // Immediate save to localStorage
      saveToStorage();
      
      toast({
        title: "Client Deleted",
        description: `Client "${clientData.name}" has been deleted.`,
      });
      onClose();
    }
  };

  // Signatory management handlers
  const handleAddSignatory = (signatoryData: Omit<CompanySignatory, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => {
    const newSignatory: CompanySignatory = {
      ...signatoryData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'current-user', // TODO: Get from auth context
      updatedBy: 'current-user'
    };

    // If this is primary signatory, unset any existing primary
    if (newSignatory.isPrimary) {
      setClientSignatories(prev => prev.map(s => ({ ...s, isPrimary: false })));
    }

    setClientSignatories(prev => [...prev, newSignatory]);
    dispatch({ type: 'ADD_SIGNATORY', payload: newSignatory });
  };

  const handleUpdateSignatory = (signatory: CompanySignatory) => {
    // If setting as primary, unset any existing primary
    if (signatory.isPrimary) {
      setClientSignatories(prev => prev.map(s => ({ 
        ...s, 
        isPrimary: s.id === signatory.id ? true : false 
      })));
    }

    setClientSignatories(prev => prev.map(s => s.id === signatory.id ? signatory : s));
    dispatch({ type: 'UPDATE_SIGNATORY', payload: signatory });
  };

  const handleDeleteSignatory = (signatoryId: string) => {
    setClientSignatories(prev => prev.filter(s => s.id !== signatoryId));
    dispatch({ type: 'DELETE_SIGNATORY', payload: signatoryId });
  };

  const handleSetPrimarySignatory = (signatoryId: string) => {
    if (clientData) {
      dispatch({ type: 'SET_PRIMARY_SIGNATORY', payload: { clientId: clientData.id, signatoryId } });
      setClientSignatories(prev => prev.map(s => ({ 
        ...s, 
        isPrimary: s.id === signatoryId 
      })));
    }
  };

  const isCompany = formData.type === 'Company';
  const isDisabled = mode === 'view';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {isCompany ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
            <span>
              {mode === 'create' && 'Add New Client'}
              {mode === 'edit' && 'Edit Client'}
              {mode === 'view' && 'Client Details'}
            </span>
            {mode === 'view' && (
              <Badge variant={clientData?.status === 'Active' ? 'default' : 'secondary'}>
                {clientData?.status}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Type Selection */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Client Type</Label>
            </div>
            <Select 
              value={formData.type} 
              onValueChange={(value: any) => setFormData(prev => ({ 
                ...prev, 
                type: value,
                // Reset company-specific fields when switching to Individual
                companyName: value === 'Company' ? prev.companyName : '',
                cin: value === 'Company' ? prev.cin : '',
                authorizedSignatory: value === 'Company' ? prev.authorizedSignatory : undefined
              }))}
              disabled={isDisabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Individual">Individual</SelectItem>
                <SelectItem value="Company">Company</SelectItem>
                <SelectItem value="Partnership">Partnership</SelectItem>
                <SelectItem value="Trust">Trust</SelectItem>
                <SelectItem value="Society">Society</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Client Details Section */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Client Details</Label>
            </div>
            
            <div className="grid gap-4">
              {isCompany ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="companyName">
                        Company Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="companyName"
                        value={formData.companyName || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                        disabled={isDisabled}
                        className={errors.companyName ? 'border-destructive' : ''}
                      />
                      {errors.companyName && (
                        <p className="text-xs text-destructive mt-1">{errors.companyName}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="cin">CIN/Registration Number</Label>
                      <Input
                        id="cin"
                        value={formData.cin || ''}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          setFormData(prev => ({ ...prev, cin: value }));
                          validateField('cin', value);
                        }}
                        disabled={isDisabled}
                        placeholder="L17110DL1993PLC123456"
                        className={errors.cin ? 'border-destructive' : ''}
                      />
                      {errors.cin && (
                        <p className="text-xs text-destructive mt-1">{errors.cin}</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <Label htmlFor="name">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={isDisabled}
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive mt-1">{errors.name}</p>
                  )}
                </div>
              )}

              {/* Contact Information */}
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
                    disabled={isDisabled}
                    className={errors.email ? 'border-destructive' : ''}
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
                    disabled={isDisabled}
                    className={errors.phone ? 'border-destructive' : ''}
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive mt-1">{errors.phone}</p>
                  )}
                </div>
              </div>

              {/* Tax Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="panNumber">
                    PAN Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="panNumber"
                    value={formData.panNumber}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      setFormData(prev => ({ ...prev, panNumber: value }));
                      validateField('panNumber', value);
                    }}
                    disabled={isDisabled}
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    className={errors.panNumber ? 'border-destructive' : ''}
                  />
                  {errors.panNumber ? (
                    <p className="text-xs text-destructive mt-1 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.panNumber}
                    </p>
                  ) : formData.panNumber && validatePAN(formData.panNumber).isValid ? (
                    <p className="text-xs text-success mt-1 flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Valid PAN format
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={formData.gstNumber || ''}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      setFormData(prev => ({ ...prev, gstNumber: value }));
                      validateField('gstNumber', value);
                    }}
                    disabled={isDisabled}
                    maxLength={15}
                    placeholder="22AAAAA0000A1Z5"
                    className={errors.gstNumber ? 'border-destructive' : ''}
                  />
                  {errors.gstNumber ? (
                    <p className="text-xs text-destructive mt-1 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.gstNumber}
                    </p>
                  ) : formData.gstNumber && validateGST(formData.gstNumber).isValid ? (
                    <p className="text-xs text-success mt-1 flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Valid GST format
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Signatory Management (Company only) */}
          {isCompany && (
            <SignatoryManager
              clientId={clientData?.id || 'temp-' + Date.now()}
              signatories={clientSignatories}
              onAdd={handleAddSignatory}
              onUpdate={handleUpdateSignatory}
              onDelete={handleDeleteSignatory}
              onSetPrimary={handleSetPrimarySignatory}
              disabled={isDisabled}
            />
          )}

          {/* Address Information */}
          <StructuredAddress
            address={formData.address}
            onChange={(address) => setFormData(prev => ({ ...prev, address }))}
            disabled={isDisabled}
            label={isCompany ? "Registered Office Address" : "Address"}
            errors={errors}
          />

          {/* Communication Address (Company only) */}
          {isCompany && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useSameAddress"
                  checked={formData.useSameAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, useSameAddress: e.target.checked }))}
                  disabled={isDisabled}
                  className="rounded border-border"
                />
                <Label htmlFor="useSameAddress" className="text-sm">
                  Communication address is same as registered office address
                </Label>
              </div>
              
              {!formData.useSameAddress && (
                <StructuredAddress
                  address={formData.communicationAddress || {
                    addressLine1: '',
                    addressLine2: '',
                    city: '',
                    state: '',
                    pincode: '',
                    country: 'IN'
                  }}
                  onChange={(address) => setFormData(prev => ({ ...prev, communicationAddress: address }))}
                  disabled={isDisabled}
                  label="Communication Address"
                  required={false}
                />
              )}
            </div>
          )}

          {/* Litigation & Jurisdiction Details */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Litigation & Jurisdiction Details</Label>
            </div>
            
            <div className="grid gap-4">
              <div>
                <Label htmlFor="clientCategory">Client Category</Label>
                <Select 
                  value={formData.clientCategory || ''} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, clientCategory: value }))}
                  disabled={isDisabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="range">Range</Label>
                  <Input
                    id="range"
                    value={formData.jurisdiction.range || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      jurisdiction: { ...prev.jurisdiction, range: e.target.value }
                    }))}
                    disabled={isDisabled}
                    placeholder="Range name"
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
                    disabled={isDisabled}
                    placeholder="Division name"
                  />
                </div>
                <div>
                  <Label htmlFor="commissionerate">Commissionerate</Label>
                  <Input
                    id="commissionerate"
                    value={formData.jurisdiction.commissionerate || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      jurisdiction: { ...prev.jurisdiction, commissionerate: e.target.value }
                    }))}
                    disabled={isDisabled}
                    placeholder="Commissionerate name"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes">Notes/Remarks</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  disabled={isDisabled}
                  rows={3}
                  placeholder="Any additional notes or special instructions..."
                />
              </div>
            </div>
          </div>

          {/* Assignment Details */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
            <Label className="text-sm font-medium">Assignment Details</Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="space-y-2">
                  <Label>Assigned CA/Partner <span className="text-destructive">*</span></Label>
                  <CASelector
                    value={formData.assignedCAId}
                    onValueChange={(value) => {
                      const employee = state.employees.find(e => e.id === value);
                      setFormData(prev => ({ 
                        ...prev, 
                        assignedCAId: value,
                        assignedCAName: employee?.name || ''
                      }));
                    }}
                    disabled={isDisabled}
                    required
                  />
                </div>
              </div>
              <div>
                <div className="space-y-2">
                  <Label>Default Assigned Advocate</Label>
                  <LawyerSelector
                    value={formData.defaultAssignedAdvocateId || ''}
                    onValueChange={(value) => {
                      const employee = state.employees.find(e => e.id === value);
                      setFormData(prev => ({ 
                        ...prev, 
                        defaultAssignedAdvocateId: value,
                        defaultAssignedAdvocateName: employee?.name || ''
                      }));
                    }}
                    disabled={isDisabled}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {errors.duplicate && (
            <div className="p-3 border border-destructive rounded-lg bg-destructive/10">
              <p className="text-sm text-destructive flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {errors.duplicate}
              </p>
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {mode === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {mode === 'edit' && (
              <Button type="button" variant="destructive" onClick={handleDelete}>
                Delete Client
              </Button>
            )}
            {mode !== 'view' && (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : mode === 'create' ? 'Add Client' : 'Update Client'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};