/**
 * Client Contacts Service for Beacon Essential 5.0
 * Manages centralized client contact information using Supabase
 */

import { supabase } from '@/integrations/supabase/client';
import { ApiResponse } from './apiService';

export interface ContactEmail {
  id: string;
  email: string;
  label: 'Work' | 'Personal' | 'Legal' | 'Other';
  isPrimary: boolean;
  isVerified: boolean;
  emailOptIn: boolean;
  status: 'Active' | 'Inactive';
}

export interface ContactPhone {
  id: string;
  countryCode: string;
  number: string;
  label: 'Mobile' | 'WhatsApp' | 'Office' | 'Home' | 'Legal' | 'Other';
  isPrimary: boolean;
  isWhatsApp: boolean;
  smsOptIn: boolean;
  isVerified: boolean;
  status: 'Active' | 'Inactive';
}

export interface ClientContact {
  id: string;
  clientId?: string; // Optional - supports standalone contacts
  name: string;
  designation?: string;
  
  // Multiple emails and phones
  emails: ContactEmail[];
  phones: ContactPhone[];
  
  // DEPRECATED: Keep for backward compatibility
  email?: string;
  phone?: string;
  altPhone?: string;
  
  roles: ContactRole[];
  isPrimary: boolean;
  source: 'manual' | 'gsp' | 'imported';
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  // Dual Access Model fields
  ownerUserId?: string; // FK to profiles.id - Owner user ID
  ownerName?: string; // Display name of owner (derived)
  dataScope?: 'OWN' | 'TEAM' | 'ALL'; // Entity-level data visibility scope
}

export type ContactRole = 'primary' | 'billing' | 'legal_notice' | 'authorized_signatory';

export interface CreateContactRequest {
  name: string;
  designation?: string;
  
  // Arrays for multiple entries
  emails?: ContactEmail[];
  phones?: ContactPhone[];
  
  // DEPRECATED: Still accepted for backward compatibility
  email?: string;
  phone?: string;
  altPhone?: string;
  
  roles: ContactRole[];
  isPrimary?: boolean;
  notes?: string;
  
  // Dual Access Model fields
  dataScope?: 'OWN' | 'TEAM' | 'ALL';
}

export interface ContactSearchResult {
  contacts: ClientContact[];
  total: number;
}

export interface ContactRoleFilter {
  roles?: ContactRole[];
  isPrimary?: boolean;
  isActive?: boolean;
}

// Helper to convert DB row to ClientContact
function toClientContact(row: any): ClientContact {
  return {
    id: row.id,
    clientId: row.client_id || undefined, // Support standalone contacts
    name: row.name,
    designation: row.designation,
    emails: (row.emails || []) as ContactEmail[],
    phones: (row.phones || []) as ContactPhone[],
    roles: (row.roles || []) as ContactRole[],
    isPrimary: row.is_primary || false,
    source: row.source || 'manual',
    isActive: row.is_active !== false,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Dual Access Model fields
    ownerUserId: row.owner_user_id || undefined,
    dataScope: row.data_scope || 'TEAM'
  };
}

class ClientContactsService {
  /**
   * Get user's tenant_id
   */
  private async getTenantId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
    
    return profile?.tenant_id || null;
  }

  /**
   * Get all contacts for a client
   */
  async getContacts(clientId: string, filter?: ContactRoleFilter): Promise<ApiResponse<ClientContact[]>> {
    if (!clientId) {
      return {
        success: false,
        error: 'Client ID is required',
        data: null
      };
    }

    try {
      let query = supabase
        .from('client_contacts')
        .select('*')
        .eq('client_id', clientId);

      if (filter?.isActive !== undefined) {
        query = query.eq('is_active', filter.isActive);
      }
      
      if (filter?.isPrimary !== undefined) {
        query = query.eq('is_primary', filter.isPrimary);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contacts:', error);
        return {
          success: false,
          error: error.message,
          data: null
        };
      }

      let contacts = (data || []).map(toClientContact);

      // Filter by roles if specified
      if (filter?.roles?.length) {
        contacts = contacts.filter(contact => 
          contact.roles.some(role => filter.roles!.includes(role))
        );
      }

      return {
        success: true,
        data: contacts,
        message: 'Contacts fetched successfully'
      };
    } catch (err: any) {
      console.error('Error in getContacts:', err);
      return {
        success: false,
        error: err.message || 'Failed to fetch contacts',
        data: null
      };
    }
  }

  /**
   * Create a new contact for a client
   */
  /**
   * Create a new contact - supports both client-linked and standalone contacts
   */
  async createContact(clientId: string | null, contact: CreateContactRequest): Promise<ApiResponse<ClientContact>> {
    const tenantId = await this.getTenantId();
    if (!tenantId) {
      return {
        success: false,
        error: 'User not authenticated or tenant not found',
        data: null
      };
    }

    // Get current user ID for owner_user_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
        data: null
      };
    }

    // Migrate legacy data to new structure
    const migratedContact = this.migrateContactData(contact);

    // Validate all emails
    if (migratedContact.emails) {
      for (const email of migratedContact.emails) {
        const validation = this.validateEmail(email);
        if (!validation.isValid) {
          return {
            success: false,
            error: validation.error,
            data: null
          };
        }
      }
    }

    // Validate all phones
    if (migratedContact.phones) {
      for (const phone of migratedContact.phones) {
        const validation = this.validatePhone(phone);
        if (!validation.isValid) {
          return {
            success: false,
            error: validation.error,
            data: null
          };
        }
      }
    }

    const validation = this.validateContact(migratedContact);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
        data: null
      };
    }

    try {
      const insertData = {
        tenant_id: tenantId,
        client_id: clientId || null, // Support standalone contacts
        name: migratedContact.name,
        designation: migratedContact.designation || null,
        emails: JSON.parse(JSON.stringify(migratedContact.emails || [])),
        phones: JSON.parse(JSON.stringify(migratedContact.phones || [])),
        roles: migratedContact.roles || [],
        is_primary: migratedContact.isPrimary || false,
        is_active: true,
        source: 'manual',
        notes: migratedContact.notes || null,
        // Dual Access Model fields
        owner_user_id: user.id,
        data_scope: contact.dataScope || 'TEAM'
      };

      // Debug logging for RLS troubleshooting
      console.log('[createContact] Auth state:', { userId: user.id, email: user.email });
      console.log('[createContact] Insert data:', insertData);

      const { data, error } = await supabase
        .from('client_contacts')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[createContact] Error:', error);
        console.error('[createContact] Error details:', { 
          code: error.code, 
          message: error.message,
          hint: (error as any).hint,
          details: (error as any).details 
        });
        
        // Provide more helpful error message for RLS violations
        let errorMessage = error.message;
        if (error.code === '42501') {
          errorMessage = 'Permission denied. Please ensure you have the required role to create contacts.';
        }
        
        return {
          success: false,
          error: errorMessage,
          data: null
        };
      }

      return {
        success: true,
        data: toClientContact(data),
        message: 'Contact created successfully'
      };
    } catch (err: any) {
      console.error('Error in createContact:', err);
      return {
        success: false,
        error: err.message || 'Failed to create contact',
        data: null
      };
    }
  }

  /**
   * Get a single contact by ID
   */
  async getContactById(contactId: string): Promise<ApiResponse<ClientContact & { clientName?: string }>> {
    if (!contactId) {
      return {
        success: false,
        error: 'Contact ID is required',
        data: null
      };
    }

    try {
      const { data, error } = await supabase
        .from('client_contacts')
        .select(`
          *,
          clients:client_id (
            display_name
          )
        `)
        .eq('id', contactId)
        .single();

      if (error) {
        console.error('Error fetching contact:', error);
        return {
          success: false,
          error: error.message,
          data: null
        };
      }

      const contact = toClientContact(data);
      return {
        success: true,
        data: {
          ...contact,
          clientName: data.clients?.display_name || undefined
        },
        message: 'Contact fetched successfully'
      };
    } catch (err: any) {
      console.error('Error in getContactById:', err);
      return {
        success: false,
        error: err.message || 'Failed to fetch contact',
        data: null
      };
    }
  }

  /**
   * Update an existing contact - works for both client-linked and standalone contacts
   */
  async updateContact(contactId: string, updates: Partial<CreateContactRequest> & { isActive?: boolean }): Promise<ApiResponse<ClientContact>> {
    if (!contactId) {
      return {
        success: false,
        error: 'Contact ID is required',
        data: null
      };
    }

    if (Object.keys(updates).length > 0) {
      const validation = this.validateContact(updates as CreateContactRequest, true);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          data: null
        };
      }
    }

    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.designation !== undefined) updateData.designation = updates.designation;
      if (updates.emails !== undefined) updateData.emails = JSON.parse(JSON.stringify(updates.emails));
      if (updates.phones !== undefined) updateData.phones = JSON.parse(JSON.stringify(updates.phones));
      if (updates.roles !== undefined) updateData.roles = updates.roles;
      if (updates.isPrimary !== undefined) updateData.is_primary = updates.isPrimary;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.dataScope !== undefined) updateData.data_scope = updates.dataScope;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { data, error } = await supabase
        .from('client_contacts')
        .update(updateData)
        .eq('id', contactId)
        .select()
        .single();

      if (error) {
        console.error('Error updating contact:', error);
        return {
          success: false,
          error: error.message,
          data: null
        };
      }

      return {
        success: true,
        data: toClientContact(data),
        message: 'Contact updated successfully'
      };
    } catch (err: any) {
      console.error('Error in updateContact:', err);
      return {
        success: false,
        error: err.message || 'Failed to update contact',
        data: null
      };
    }
  }

  /**
   * Delete a contact - works for both client-linked and standalone contacts
   */
  async deleteContact(contactId: string): Promise<ApiResponse<void>> {
    if (!contactId) {
      return {
        success: false,
        error: 'Contact ID is required',
        data: null
      };
    }

    try {
      const { error } = await supabase
        .from('client_contacts')
        .delete()
        .eq('id', contactId);

      if (error) {
        console.error('Error deleting contact:', error);
        return {
          success: false,
          error: error.message,
          data: null
        };
      }

      return {
        success: true,
        data: undefined,
        message: 'Contact deleted successfully'
      };
    } catch (err: any) {
      console.error('Error in deleteContact:', err);
      return {
        success: false,
        error: err.message || 'Failed to delete contact',
        data: null
      };
    }
  }

  /**
   * Search contacts across clients
   */
  async searchContacts(query: string, roles?: ContactRole[]): Promise<ApiResponse<ContactSearchResult>> {
    try {
      let dbQuery = supabase
        .from('client_contacts')
        .select('*')
        .or(`name.ilike.%${query}%,designation.ilike.%${query}%`);

      const { data, error } = await dbQuery;

      if (error) {
        console.error('Error searching contacts:', error);
        return {
          success: false,
          error: error.message,
          data: null
        };
      }

      let contacts = (data || []).map(toClientContact);

      // Filter by roles if specified
      if (roles?.length) {
        contacts = contacts.filter(contact =>
          contact.roles.some(role => roles.includes(role))
        );
      }

      return {
        success: true,
        data: {
          contacts,
          total: contacts.length
        },
        message: 'Search completed successfully'
      };
    } catch (err: any) {
      console.error('Error in searchContacts:', err);
      return {
        success: false,
        error: err.message || 'Failed to search contacts',
        data: null
      };
    }
  }

  /**
   * Get all contacts accessible to the current user (with client name)
   */
  async getAllContacts(): Promise<ApiResponse<(ClientContact & { clientName?: string })[]>> {
    try {
      // Fetch contacts with client info using a join
      const { data, error } = await supabase
        .from('client_contacts')
        .select(`
          *,
          clients:client_id (
            display_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all contacts:', error);
        return {
          success: false,
          error: error.message,
          data: null
        };
      }

      const contacts = (data || []).map(row => {
        const contact = toClientContact(row);
        return {
          ...contact,
          clientName: row.clients?.display_name || undefined
        };
      });

      return {
        success: true,
        data: contacts,
        message: 'All contacts fetched successfully'
      };
    } catch (err: any) {
      console.error('Error in getAllContacts:', err);
      return {
        success: false,
        error: err.message || 'Failed to fetch all contacts',
        data: null
      };
    }
  }

  /**
   * Get primary contact for a client
   */
  async getPrimaryContact(clientId: string): Promise<ApiResponse<ClientContact | null>> {
    const response = await this.getContacts(clientId, { 
      isPrimary: true, 
      isActive: true 
    });

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data[0] || null,
        message: response.message
      };
    }

    return {
      success: false,
      error: response.error,
      data: null
    };
  }

  /**
   * Get contacts by role
   */
  async getContactsByRole(clientId: string, roles: ContactRole[]): Promise<ApiResponse<ClientContact[]>> {
    return this.getContacts(clientId, { roles, isActive: true });
  }

  /**
   * Bulk create contacts (for GSP signatory import)
   */
  async bulkCreateContacts(clientId: string, contacts: CreateContactRequest[]): Promise<ApiResponse<ClientContact[]>> {
    if (!clientId || !contacts.length) {
      return {
        success: false,
        error: 'Client ID and contacts are required',
        data: null
      };
    }

    const tenantId = await this.getTenantId();
    if (!tenantId) {
      return {
        success: false,
        error: 'User not authenticated or tenant not found',
        data: null
      };
    }

    // Validate all contacts
    for (const contact of contacts) {
      const validation = this.validateContact(contact);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid contact "${contact.name}": ${validation.error}`,
          data: null
        };
      }
    }

    try {
      const insertData = contacts.map(contact => {
        const migrated = this.migrateContactData(contact);
        return {
          tenant_id: tenantId,
          client_id: clientId,
          name: migrated.name,
          designation: migrated.designation || null,
          emails: JSON.parse(JSON.stringify(migrated.emails || [])),
          phones: JSON.parse(JSON.stringify(migrated.phones || [])),
          roles: migrated.roles || [],
          is_primary: migrated.isPrimary || false,
          is_active: true,
          source: 'imported',
          notes: migrated.notes || null
        };
      });

      const { data, error } = await supabase
        .from('client_contacts')
        .insert(insertData)
        .select();

      if (error) {
        console.error('Error bulk creating contacts:', error);
        return {
          success: false,
          error: error.message,
          data: null
        };
      }

      return {
        success: true,
        data: (data || []).map(toClientContact),
        message: `${data?.length || 0} contacts created successfully`
      };
    } catch (err: any) {
      console.error('Error in bulkCreateContacts:', err);
      return {
        success: false,
        error: err.message || 'Failed to bulk create contacts',
        data: null
      };
    }
  }

  /**
   * Validate contact data
   */
  private validateContact(contact: Partial<CreateContactRequest>, isUpdate = false): { isValid: boolean; error?: string } {
    if (!isUpdate && !contact.name?.trim()) {
      return { isValid: false, error: 'Contact name is required' };
    }

    if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    if (contact.phone && !/^\+?[\d\s-()]+$/.test(contact.phone)) {
      return { isValid: false, error: 'Invalid phone format' };
    }

    if (!isUpdate && (!contact.roles || contact.roles.length === 0)) {
      return { isValid: false, error: 'At least one role is required' };
    }

    return { isValid: true };
  }

  /**
   * Get role display name
   */
  getRoleDisplayName(role: ContactRole): string {
    const roleNames: Record<ContactRole, string> = {
      primary: 'Primary Contact',
      billing: 'Billing Contact',
      legal_notice: 'Legal Notice',
      authorized_signatory: 'Authorized Signatory'
    };

    return roleNames[role] || role;
  }

  /**
   * Get role color for UI
   */
  getRoleColor(role: ContactRole): string {
    const roleColors: Record<ContactRole, string> = {
      primary: 'bg-primary text-primary-foreground',
      billing: 'bg-secondary text-secondary-foreground',
      legal_notice: 'bg-warning text-warning-foreground',
      authorized_signatory: 'bg-success text-success-foreground'
    };

    return roleColors[role] || 'bg-muted text-muted-foreground';
  }

  /**
   * Validate email entry
   */
  private validateEmail(email: Partial<ContactEmail>): { isValid: boolean; error?: string } {
    if (!email.email?.trim()) {
      return { isValid: false, error: 'Email address is required' };
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.email)) {
      return { isValid: false, error: 'Invalid email format' };
    }
    
    return { isValid: true };
  }

  /**
   * Validate phone entry
   */
  private validatePhone(phone: Partial<ContactPhone>): { isValid: boolean; error?: string } {
    if (!phone.number?.trim()) {
      return { isValid: false, error: 'Phone number is required' };
    }
    
    const cleanNumber = phone.number.replace(/\s/g, '');
    if (!/^\+?[1-9]\d{1,14}$/.test(cleanNumber)) {
      return { isValid: false, error: 'Invalid phone format. Use E.164 format (e.g., 9876543210)' };
    }
    
    return { isValid: true };
  }

  /**
   * Ensure only one primary email
   */
  ensureOnePrimaryEmail(emails: ContactEmail[]): ContactEmail[] {
    let foundPrimary = false;
    return emails.map((email, index) => {
      if (email.isPrimary && !foundPrimary) {
        foundPrimary = true;
        return email;
      }
      if (index === 0 && !foundPrimary && email.status === 'Active') {
        foundPrimary = true;
        return { ...email, isPrimary: true };
      }
      return { ...email, isPrimary: false };
    });
  }

  /**
   * Ensure only one primary phone
   */
  ensureOnePrimaryPhone(phones: ContactPhone[]): ContactPhone[] {
    let foundPrimary = false;
    return phones.map((phone, index) => {
      if (phone.isPrimary && !foundPrimary) {
        foundPrimary = true;
        return phone;
      }
      if (index === 0 && !foundPrimary && phone.status === 'Active') {
        foundPrimary = true;
        return { ...phone, isPrimary: true };
      }
      return { ...phone, isPrimary: false };
    });
  }

  /**
   * Migrate legacy single values to arrays
   */
  migrateContactData(contact: CreateContactRequest): CreateContactRequest {
    const emails: ContactEmail[] = contact.emails || [];
    const phones: ContactPhone[] = contact.phones || [];
    
    // Migrate single email to array
    if (contact.email && !emails.length) {
      emails.push({
        id: `email_${Date.now()}`,
        email: contact.email,
        label: 'Work',
        isPrimary: true,
        isVerified: false,
        emailOptIn: true,
        status: 'Active'
      });
    }
    
    // Migrate single phone to array
    if (contact.phone && !phones.length) {
      const [countryCode, ...numberParts] = contact.phone.startsWith('+') 
        ? contact.phone.split(' ')
        : ['+91', contact.phone];
      
      phones.push({
        id: `phone_${Date.now()}`,
        countryCode: countryCode || '+91',
        number: numberParts.join(''),
        label: 'Mobile',
        isPrimary: true,
        isWhatsApp: false,
        smsOptIn: true,
        isVerified: false,
        status: 'Active'
      });
    }
    
    // Migrate altPhone
    if (contact.altPhone && phones.length < 5) {
      const [countryCode, ...numberParts] = contact.altPhone.startsWith('+')
        ? contact.altPhone.split(' ')
        : ['+91', contact.altPhone];
      
      phones.push({
        id: `phone_${Date.now()}_alt`,
        countryCode: countryCode || '+91',
        number: numberParts.join(''),
        label: 'Office',
        isPrimary: false,
        isWhatsApp: false,
        smsOptIn: true,
        isVerified: false,
        status: 'Active'
      });
    }
    
    return {
      ...contact,
      emails: this.ensureOnePrimaryEmail(emails),
      phones: this.ensureOnePrimaryPhone(phones)
    };
  }

  /**
   * Get primary email from contact
   */
  getPrimaryEmail(contact: ClientContact): string | undefined {
    return contact.emails?.find(e => e.isPrimary && e.status === 'Active')?.email 
      || contact.emails?.find(e => e.status === 'Active')?.email
      || contact.email;
  }

  /**
   * Get primary phone from contact
   */
  getPrimaryPhone(contact: ClientContact): string | undefined {
    const primaryPhone = contact.phones?.find(p => p.isPrimary && p.status === 'Active')
      || contact.phones?.find(p => p.status === 'Active');
    
    return primaryPhone 
      ? `${primaryPhone.countryCode} ${primaryPhone.number}`
      : contact.phone;
  }
}

export const clientContactsService = new ClientContactsService();
