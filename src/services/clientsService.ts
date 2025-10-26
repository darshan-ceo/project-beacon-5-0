import { toast } from '@/hooks/use-toast';
import type { Client, Signatory, PortalAccess, AppAction } from '@/contexts/AppStateContext';

// GSTIN validation regex
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
// PAN validation regex
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
// Pincode validation regex
const PINCODE_REGEX = /^[0-9]{6}$/;

// Indian States and UTs
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Lakshadweep', 'Delhi', 'Puducherry', 'Ladakh', 'Jammu and Kashmir'
];

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const clientsService = {
  // Validation utilities
  validateGSTIN: (gstin: string): ValidationResult => {
    if (!gstin) return { isValid: true, errors: [] }; // Optional field
    
    const trimmed = gstin.trim().toUpperCase();
    if (!GSTIN_REGEX.test(trimmed)) {
      return {
        isValid: false,
        errors: ['GSTIN format is invalid. Should be 15 characters (e.g., 07AABCU9603R1ZV)']
      };
    }
    
    return { isValid: true, errors: [] };
  },

  validatePAN: (pan: string): ValidationResult => {
    if (!pan) {
      return { isValid: false, errors: ['PAN is required'] };
    }
    
    const trimmed = pan.trim().toUpperCase();
    if (!PAN_REGEX.test(trimmed)) {
      return {
        isValid: false,
        errors: ['PAN format is invalid. Should be 10 characters (e.g., ABCDE1234F)']
      };
    }
    
    return { isValid: true, errors: [] };
  },

  validatePincode: (pincode: string): ValidationResult => {
    if (!pincode) {
      return { isValid: false, errors: ['Pincode is required'] };
    }
    
    if (!PINCODE_REGEX.test(pincode.trim())) {
      return {
        isValid: false,
        errors: ['Pincode must be exactly 6 digits']
      };
    }
    
    return { isValid: true, errors: [] };
  },

  validateEmail: (email: string): ValidationResult => {
    if (!email) {
      return { isValid: false, errors: ['Email is required'] };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        errors: ['Please enter a valid email address']
      };
    }
    
    return { isValid: true, errors: [] };
  },

  validateMobile: (mobile: string): ValidationResult => {
    if (!mobile) return { isValid: true, errors: [] };
    
    const cleaned = mobile.replace(/\s/g, '');
    const mobileRegex = /^[+]?[0-9]{10,15}$/;
    
    if (!mobileRegex.test(cleaned)) {
      return {
        isValid: false,
        errors: ['Mobile number must be 10-15 digits with optional country code (e.g., +91 9876543210)']
      };
    }
    
    return { isValid: true, errors: [] };
  },

  validateDOB: (dob: string): ValidationResult => {
    if (!dob) return { isValid: true, errors: [] };
    
    const selectedDate = new Date(dob);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate > today) {
      return {
        isValid: false,
        errors: ['Date of birth cannot be in the future']
      };
    }
    
    const age = today.getFullYear() - selectedDate.getFullYear();
    if (age < 18) {
      return {
        isValid: false,
        errors: ['Signatory must be at least 18 years old']
      };
    }
    
    if (age > 100) {
      return {
        isValid: false,
        errors: ['Please enter a valid date of birth']
      };
    }
    
    return { isValid: true, errors: [] };
  },

  // Client operations
  create: async (clientData: Partial<Client>, dispatch: React.Dispatch<AppAction>): Promise<Client> => {
    try {
      // Validate required fields
      const validationErrors: string[] = [];
      
      if (!clientData.name?.trim()) {
        validationErrors.push('Client name is required');
      }
      
      if (clientData.pan) {
        const panValidation = clientsService.validatePAN(clientData.pan);
        if (!panValidation.isValid) {
          validationErrors.push(...panValidation.errors);
        }
      }
      
      if (clientData.gstin) {
        const gstinValidation = clientsService.validateGSTIN(clientData.gstin);
        if (!gstinValidation.isValid) {
          validationErrors.push(...gstinValidation.errors);
        }
      }

      if (clientData.address && typeof clientData.address === 'object' && clientData.address.pincode) {
        const pincodeValidation = clientsService.validatePincode(clientData.address.pincode);
        if (!pincodeValidation.isValid) {
          validationErrors.push(...pincodeValidation.errors);
        }
      }
      
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      const newClient: Client = {
        id: Date.now().toString(),
        name: clientData.name!.trim(),
        type: clientData.type || 'Individual',
        category: clientData.category || 'Regular Dealer',
        registrationNo: clientData.registrationNo,
        gstin: clientData.gstin?.toUpperCase(),
        pan: clientData.pan!.toUpperCase(),
        address: clientData.address || {
          line1: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India'
        },
        jurisdiction: clientData.jurisdiction || {},
        portalAccess: clientData.portalAccess || {
          allowLogin: false
        },
        signatories: clientData.signatories || [],
        status: clientData.status || 'Active',
        assignedCAId: clientData.assignedCAId || '',
        assignedCAName: clientData.assignedCAName || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      dispatch({ type: 'ADD_CLIENT', payload: newClient });
      dispatch({ type: 'SYNC_CLIENT_GROUP_COUNTS' });
      
      toast({
        title: "Client Created Successfully",
        description: `${newClient.name} has been added to the system.`,
      });

      return newClient;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create client';
      toast({
        title: "Failed to Create Client",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  },

  update: async (clientId: string, updates: Partial<Client>, dispatch: React.Dispatch<AppAction>): Promise<void> => {
    try {
      // Validation similar to create
      if (updates.pan) {
        const panValidation = clientsService.validatePAN(updates.pan);
        if (!panValidation.isValid) {
          throw new Error(panValidation.errors.join(', '));
        }
      }
      
      if (updates.gstin) {
        const gstinValidation = clientsService.validateGSTIN(updates.gstin);
        if (!gstinValidation.isValid) {
          throw new Error(gstinValidation.errors.join(', '));
        }
      }

      const updatedClient: Client = {
        ...updates as Client,
        id: clientId,
        updatedAt: new Date().toISOString()
      };

      dispatch({ type: 'UPDATE_CLIENT', payload: updatedClient });
      dispatch({ type: 'SYNC_CLIENT_GROUP_COUNTS' });
      
      toast({
        title: "Client Updated Successfully",
        description: `${updatedClient.name} has been updated.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update client';
      toast({
        title: "Failed to Update Client",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  },

  delete: async (clientId: string, dispatch: React.Dispatch<AppAction>): Promise<void> => {
    try {
      dispatch({ type: 'DELETE_CLIENT', payload: clientId });
      dispatch({ type: 'SYNC_CLIENT_GROUP_COUNTS' });
      
      toast({
        title: "Client Deleted",
        description: "Client has been removed from the system.",
      });
    } catch (error) {
      toast({
        title: "Failed to Delete Client",
        description: "Could not delete client. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  },

  // Signatory management
  addSignatory: async (clientId: string, signatory: Omit<Signatory, 'id'>, dispatch: React.Dispatch<AppAction>): Promise<void> => {
    try {
      const emailValidation = clientsService.validateEmail(signatory.email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.errors.join(', '));
      }

      if (signatory.mobile) {
        const mobileValidation = clientsService.validateMobile(signatory.mobile);
        if (!mobileValidation.isValid) {
          throw new Error(mobileValidation.errors.join(', '));
        }
      }

      if (signatory.dob) {
        const dobValidation = clientsService.validateDOB(signatory.dob);
        if (!dobValidation.isValid) {
          throw new Error(dobValidation.errors.join(', '));
        }
      }

      const newSignatory: Signatory = {
        ...signatory,
        id: Date.now().toString(),
        fullName: signatory.fullName.trim(),
        email: signatory.email.toLowerCase().trim(),
        mobile: signatory.mobile?.trim(),
        dob: signatory.dob
      };

      dispatch({ 
        type: 'ADD_SIGNATORY', 
        payload: { clientId, signatory: newSignatory } 
      });
      
      toast({
        title: "Signatory Added",
        description: `${newSignatory.fullName} has been added as a signatory.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add signatory';
      toast({
        title: "Failed to Add Signatory",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  },

  updateSignatory: async (clientId: string, signatory: Signatory, dispatch: React.Dispatch<AppAction>): Promise<void> => {
    try {
      const emailValidation = clientsService.validateEmail(signatory.email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.errors.join(', '));
      }

      if (signatory.mobile) {
        const mobileValidation = clientsService.validateMobile(signatory.mobile);
        if (!mobileValidation.isValid) {
          throw new Error(mobileValidation.errors.join(', '));
        }
      }

      if (signatory.dob) {
        const dobValidation = clientsService.validateDOB(signatory.dob);
        if (!dobValidation.isValid) {
          throw new Error(dobValidation.errors.join(', '));
        }
      }

      dispatch({ 
        type: 'UPDATE_SIGNATORY', 
        payload: { clientId, signatory } 
      });
      
      toast({
        title: "Signatory Updated",
        description: `${signatory.fullName} has been updated.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update signatory';
      toast({
        title: "Failed to Update Signatory",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  },

  deleteSignatory: async (clientId: string, signatoryId: string, dispatch: React.Dispatch<AppAction>): Promise<void> => {
    try {
      dispatch({ 
        type: 'DELETE_SIGNATORY', 
        payload: { clientId, signatoryId } 
      });
      
      toast({
        title: "Signatory Removed",
        description: "Signatory has been removed from the client.",
      });
    } catch (error) {
      toast({
        title: "Failed to Remove Signatory",
        description: "Could not remove signatory. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  },

  // Portal access management
  enablePortalAccess: async (clientId: string, portalData: PortalAccess, dispatch: React.Dispatch<AppAction>): Promise<void> => {
    try {
      if (portalData.email) {
        const emailValidation = clientsService.validateEmail(portalData.email);
        if (!emailValidation.isValid) {
          throw new Error(emailValidation.errors.join(', '));
        }
      }

      // Auto-generate username if not provided
      if (portalData.allowLogin && !portalData.username) {
        portalData.username = `client_${clientId}_${Date.now()}`;
      }

      // Auto-generate password if not provided
      if (portalData.allowLogin && !portalData.passwordHash) {
        portalData.passwordHash = Math.random().toString(36).slice(-8);
      }

      dispatch({ 
        type: 'UPDATE_PORTAL_ACCESS', 
        payload: { clientId, portalAccess: portalData } 
      });
      
      toast({
        title: "Portal Access Updated",
        description: portalData.allowLogin ? "Client portal access has been enabled." : "Client portal access has been disabled.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update portal access';
      toast({
        title: "Failed to Update Portal Access",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  },

  // Generate username and password
  generateCredentials: (): { username: string; password: string } => {
    const username = `client_${Date.now()}`;
    const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    return { username, password };
  },

  // Migration utilities
  migrateOldClients: async (clients: Client[], dispatch: React.Dispatch<AppAction>): Promise<{ migrated: number; flagged: number }> => {
    let migrated = 0;
    let flagged = 0;

    for (const client of clients) {
      let needsUpdate = false;
      const updates: Partial<Client> = { ...client };

      // Migrate address if it's a string
      if (typeof client.address === 'string') {
        updates.address = {
          line1: client.address,
          city: '',
          state: '',
          pincode: '',
          country: 'India'
        };
        updates.needsAddressReview = true;
        needsUpdate = true;
        flagged++;
      }

      // Create primary signatory from legacy email/phone
      if (client.email && client.phone && (!client.signatories || client.signatories.length === 0)) {
        updates.signatories = [{
          id: Date.now().toString(),
          fullName: client.name,
          email: client.email,
          phone: client.phone,
          isPrimary: true,
          scope: 'All' as const,
          status: 'Active' as const
        }];
        updates.needsSignatoryReview = true;
        needsUpdate = true;
        flagged++;
      }

      if (needsUpdate) {
        await clientsService.update(client.id, updates, dispatch);
        migrated++;
      }
    }

    return { migrated, flagged };
  }
};