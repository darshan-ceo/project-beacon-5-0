/**
 * Client Contacts Service for Beacon Essential 5.0
 * Manages centralized client contact information
 */

import { apiService, ApiResponse } from './apiService';

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
  clientId: string;
  name: string;
  designation?: string;
  
  // NEW: Multiple emails and phones
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
}

export type ContactRole = 'primary' | 'billing' | 'legal_notice' | 'authorized_signatory';

export interface CreateContactRequest {
  name: string;
  designation?: string;
  
  // NEW: Arrays for multiple entries
  emails?: ContactEmail[];
  phones?: ContactPhone[];
  
  // DEPRECATED: Still accepted for backward compatibility
  email?: string;
  phone?: string;
  altPhone?: string;
  
  roles: ContactRole[];
  isPrimary?: boolean;
  notes?: string;
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

class ClientContactsService {
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

    const params: any = {};
    if (filter?.roles?.length) {
      params.roles = filter.roles.join(',');
    }
    if (filter?.isPrimary !== undefined) {
      params.isPrimary = filter.isPrimary;
    }
    if (filter?.isActive !== undefined) {
      params.isActive = filter.isActive;
    }

    return apiService.get<ClientContact[]>(`/api/clients/${clientId}/contacts`, params);
  }

  /**
   * Create a new contact for a client
   */
  async createContact(clientId: string, contact: CreateContactRequest): Promise<ApiResponse<ClientContact>> {
    if (!clientId) {
      return {
        success: false,
        error: 'Client ID is required',
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

    return apiService.post<ClientContact>(`/api/clients/${clientId}/contacts`, migratedContact);
  }

  /**
   * Update an existing contact
   */
  async updateContact(clientId: string, contactId: string, updates: Partial<CreateContactRequest>): Promise<ApiResponse<ClientContact>> {
    if (!clientId || !contactId) {
      return {
        success: false,
        error: 'Client ID and Contact ID are required',
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

    return apiService.put<ClientContact>(`/api/clients/${clientId}/contacts/${contactId}`, updates);
  }

  /**
   * Delete a contact
   */
  async deleteContact(clientId: string, contactId: string): Promise<ApiResponse<void>> {
    if (!clientId || !contactId) {
      return {
        success: false,
        error: 'Client ID and Contact ID are required',
        data: null
      };
    }

    return apiService.delete<void>(`/api/clients/${clientId}/contacts/${contactId}`);
  }

  /**
   * Search contacts across clients
   */
  async searchContacts(query: string, roles?: ContactRole[]): Promise<ApiResponse<ContactSearchResult>> {
    const params: any = { query };
    if (roles?.length) {
      params.roles = roles.join(',');
    }

    return apiService.get<ContactSearchResult>('/api/contacts/search', params);
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

    return apiService.post<ClientContact[]>(`/api/clients/${clientId}/contacts/bulk`, {
      contacts
    });
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