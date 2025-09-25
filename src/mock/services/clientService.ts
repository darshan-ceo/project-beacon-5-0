/**
 * Client Service - DEMO mode implementation with write-through pattern
 */

import { unifiedStore } from '@/persistence/unifiedStore';
import type { Client } from '@/contexts/AppStateContext';
import type { Contact } from '@/persistence/unifiedStore';
import type { 
  ClientService, 
  CreateClientData, 
  UpdateClientData, 
  ApiResponse 
} from '@/mock/apiContracts';
import { demoConfig } from '@/config/demoConfig';

class ClientServiceImpl implements ClientService {
  async create(data: CreateClientData): Promise<ApiResponse<Client>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();
      
      const newClient: Client = {
        id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalCases: 0,
        activeCases: 0,
        totalInvoiced: 0
      };

      // Write-through pattern: UnifiedStore -> AppState (via dispatch)
      await unifiedStore.clients.create(newClient);

      return {
        success: true,
        data: newClient,
        message: 'Client created successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Create Client');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async update(id: string, data: UpdateClientData): Promise<ApiResponse<Client>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const updates = {
        ...data,
        updatedAt: new Date().toISOString()
      };

      const updatedClient = await unifiedStore.clients.update(id, updates);

      return {
        success: true,
        data: updatedClient,
        message: 'Client updated successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Update Client');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      await unifiedStore.clients.delete(id);

      return {
        success: true,
        message: 'Client deleted successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Delete Client');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getById(id: string): Promise<ApiResponse<Client>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const client = await unifiedStore.clients.getById(id);
      if (!client) {
        return {
          success: false,
          error: 'Client not found'
        };
      }

      return {
        success: true,
        data: client
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get Client');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getAll(): Promise<ApiResponse<Client[]>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const clients = await unifiedStore.clients.getAll();

      return {
        success: true,
        data: clients
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get All Clients');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getContacts(clientId: string): Promise<ApiResponse<Contact[]>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const contacts = await unifiedStore.contacts.getByClientId(clientId);

      return {
        success: true,
        data: contacts
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get Client Contacts');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async addContact(clientId: string, contactData: Omit<Contact, 'id' | 'clientId' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Contact>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const newContact: Contact = {
        id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        clientId,
        ...contactData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await unifiedStore.contacts.create(newContact);

      return {
        success: true,
        data: newContact,
        message: 'Contact added successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Add Client Contact');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async updateContact(clientId: string, contactId: string, updates: Partial<Contact>): Promise<ApiResponse<Contact>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const contactUpdates = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const updatedContact = await unifiedStore.contacts.update(contactId, contactUpdates);

      return {
        success: true,
        data: updatedContact,
        message: 'Contact updated successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Update Client Contact');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async deleteContact(clientId: string, contactId: string): Promise<ApiResponse<void>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      await unifiedStore.contacts.delete(contactId);

      return {
        success: true,
        message: 'Contact deleted successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Delete Client Contact');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
}

export const clientService = new ClientServiceImpl();