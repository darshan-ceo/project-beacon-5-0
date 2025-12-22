import { toast } from '@/hooks/use-toast';
import type { Client, Signatory, PortalAccess, AppAction } from '@/contexts/AppStateContext';
import { normalizeClientPayload } from '@/utils/formatters';

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

      // Import storage manager
      const { storageManager } = await import('@/data/StorageManager');
      const storage = storageManager.getStorage();

      // Normalize payload before persistence
      const normalizedData = normalizeClientPayload(clientData);

      // Prepare client data for Supabase - include ALL fields
      const supabaseClient = {
        display_name: normalizedData.name || normalizedData.displayName || clientData.name!.trim(),
        gstin: normalizedData.gstin,
        pan: normalizedData.pan,
        email: normalizedData.email || null,
        phone: clientData.phone || null,
        city: normalizedData.city || clientData.address?.cityName || clientData.address?.city || null,
        state: normalizedData.state || clientData.address?.stateName || clientData.address?.state || 'Gujarat',
        status: (clientData.status || 'Active').toLowerCase(),
        type: clientData.type || 'Individual',
        // ADD MISSING FIELDS for client group and assigned CA
        client_group_id: clientData.clientGroupId || null,
        owner_id: clientData.assignedCAId || null,
        signatories: clientData.signatories ? JSON.stringify(clientData.signatories) : null,
        address: clientData.address ? JSON.stringify(clientData.address) : null,
        jurisdiction: clientData.jurisdiction ? JSON.stringify(clientData.jurisdiction) : null,
        // Dual Access Model: data_scope defaults to TEAM
        data_scope: (clientData as any).dataScope || 'TEAM',
      };

      // Persist to Supabase first
      const savedClient = await storage.create<any>('clients', supabaseClient);

      // Convert Supabase format to app format
      const newClient: Client = {
        id: savedClient.id,
        name: savedClient.display_name || clientData.name!.trim(),
        type: clientData.type || 'Proprietorship',
        category: clientData.category || 'Regular Dealer',
        registrationNo: clientData.registrationNo,
        gstin: savedClient.gstin || clientData.gstin?.toUpperCase(),
        pan: savedClient.pan || clientData.pan!.toUpperCase(),
        email: savedClient.email || clientData.email,
        phone: savedClient.phone || clientData.phone,
        address: clientData.address || {
          line1: '',
          city: savedClient.city || clientData.address?.city || '',
          state: savedClient.state || clientData.address?.state || '',
          pincode: '',
          country: 'India'
        },
        jurisdiction: clientData.jurisdiction || {},
        portalAccess: clientData.portalAccess || {
          allowLogin: false
        },
        signatories: clientData.signatories || [],
        status: savedClient.status === 'active' ? 'Active' : 'Inactive',
        // Map from saved data to ensure consistency
        assignedCAId: savedClient.owner_id || clientData.assignedCAId || '',
        assignedCAName: clientData.assignedCAName || '',
        clientGroupId: savedClient.client_group_id || clientData.clientGroupId,
        createdAt: savedClient.created_at || new Date().toISOString(),
        updatedAt: savedClient.updated_at || new Date().toISOString(),
        // Dual Access Model fields
        ownerId: savedClient.owner_id,
        dataScope: savedClient.data_scope || 'TEAM'
      };

      // ✅ Dispatch immediately for instant UI update
      // The duplicate check in reducer handles if real-time sync also fires
      dispatch({ type: 'ADD_CLIENT', payload: newClient });
      console.log('✅ Client created and dispatched to UI:', newClient.id);
      
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

      // Import storage manager
      const { storageManager } = await import('@/data/StorageManager');
      const storage = storageManager.getStorage();

      // Normalize payload before persistence
      const normalizedUpdates = normalizeClientPayload(updates);

      // Prepare updates for Supabase - include ALL fields
      const supabaseUpdates: any = {};
      if (updates.name) supabaseUpdates.display_name = updates.name.trim();
      if (updates.gstin) supabaseUpdates.gstin = updates.gstin.toUpperCase();
      if (updates.pan) supabaseUpdates.pan = updates.pan.toUpperCase();
      if (updates.email !== undefined) supabaseUpdates.email = updates.email;
      if (updates.phone !== undefined) supabaseUpdates.phone = updates.phone;
      // Handle both EnhancedAddressData (cityName/stateName) and legacy (city/state) formats
      const cityValue = updates.address?.cityName || updates.address?.city;
      const stateValue = updates.address?.stateName || updates.address?.state;
      if (cityValue) supabaseUpdates.city = cityValue;
      if (stateValue) supabaseUpdates.state = stateValue;
      if (updates.status) supabaseUpdates.status = updates.status.toLowerCase();
      if (updates.type) supabaseUpdates.type = updates.type;
      // ADD MISSING FIELDS for client group and assigned CA
      if (updates.clientGroupId !== undefined) supabaseUpdates.client_group_id = updates.clientGroupId || null;
      if (updates.assignedCAId !== undefined) supabaseUpdates.owner_id = updates.assignedCAId || null;
      if (updates.signatories !== undefined) supabaseUpdates.signatories = JSON.stringify(updates.signatories);
      if (updates.address !== undefined) supabaseUpdates.address = JSON.stringify(updates.address);
      if (updates.jurisdiction !== undefined) supabaseUpdates.jurisdiction = JSON.stringify(updates.jurisdiction);
      // Dual Access Model: handle data_scope updates
      if ((updates as any).dataScope !== undefined) supabaseUpdates.data_scope = (updates as any).dataScope;

      // Persist to Supabase first
      await storage.update('clients', clientId, supabaseUpdates);

      // ✅ Dispatch immediately for instant UI update (no waiting for realtime)
      // Note: caller can pass rawDispatch to avoid double persistence.
      dispatch({
        type: 'UPDATE_CLIENT',
        payload: {
          id: clientId,
          ...updates,
          updatedAt: new Date().toISOString(),
        } as any,
      });

      toast({
        title: "Client Updated Successfully",
        description: `${updates.name || 'Client'} has been updated.`,
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
      // Import storage manager
      const { storageManager } = await import('@/data/StorageManager');
      const storage = storageManager.getStorage();

      // Delete from Supabase first
      await storage.delete('clients', clientId);

      // Update React context after successful deletion
      dispatch({ type: 'DELETE_CLIENT', payload: clientId });
      
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
          emails: [{
            id: `email_${Date.now()}`,
            email: client.email,
            label: 'Work' as const,
            isPrimary: true,
            isVerified: false,
            status: 'Active' as const
          }],
          phones: [{
            id: `phone_${Date.now()}`,
            countryCode: '+91',
            number: client.phone.replace(/[^0-9]/g, ''),
            label: 'Mobile' as const,
            isPrimary: true,
            isWhatsApp: false,
            isVerified: false,
            status: 'Active' as const
          }],
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