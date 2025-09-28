/**
 * Secure Data Service - Scope-aware data access layer
 * Wraps existing services with RBAC scope filtering
 */

import { unifiedStore } from '@/persistence/unifiedStore';
import { policyEngine, secureDataAccess } from '@/security/policyEngine';
import { type Case, type Task, type Client, type Hearing, type Document } from '@/contexts/AppStateContext';

class SecureDataService {
  private currentUserId = 'demo-user'; // In real app, get from auth context

  constructor() {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    await unifiedStore.waitUntilReady();
  }

  /**
   * Set current user context (for demo purposes)
   */
  setCurrentUser(userId: string): void {
    this.currentUserId = userId;
    // Clear cache when user changes
    policyEngine.clearCache();
  }

  /**
   * Secure Cases Operations
   */
  cases = {
    getAll: async (): Promise<Case[]> => {
      return secureDataAccess.secureList<Case>(
        this.currentUserId,
        'cases',
        () => unifiedStore.cases.getAll()
      );
    },

    getById: async (caseId: string): Promise<Case | null> => {
      return secureDataAccess.secureGet<Case>(
        this.currentUserId,
        'cases',
        caseId,
        (id) => unifiedStore.cases.getById(id)
      );
    },

    getByCaseNumber: async (caseNumber: string): Promise<Case[]> => {
      const allCases = await this.cases.getAll();
      return allCases.filter(c => c.caseNumber.includes(caseNumber));
    },

    getByClientId: async (clientId: string): Promise<Case[]> => {
      const allCases = await this.cases.getAll();
      return allCases.filter(c => c.clientId === clientId);
    },

    canWrite: async (caseId?: string): Promise<boolean> => {
      const evaluation = await policyEngine.evaluatePermission(
        this.currentUserId,
        'cases',
        'write'
      );
      
      if (!evaluation.allowed) return false;
      
      // If creating new case, check if user can write
      if (!caseId) return true;
      
      // If editing existing case, check scope
      const caseData = await unifiedStore.cases.getById(caseId);
      if (!caseData) return false;
      
      return this.checkRecordAccess(caseData, evaluation.scope);
    }
  };

  /**
   * Secure Tasks Operations
   */
  tasks = {
    getAll: async (): Promise<Task[]> => {
      return secureDataAccess.secureList<Task>(
        this.currentUserId,
        'tasks',
        () => unifiedStore.tasks.getAll()
      );
    },

    getById: async (taskId: string): Promise<Task | null> => {
      return secureDataAccess.secureGet<Task>(
        this.currentUserId,
        'tasks',
        taskId,
        (id) => unifiedStore.tasks.getById(id)
      );
    },

    getByCaseId: async (caseId: string): Promise<Task[]> => {
      const allTasks = await this.tasks.getAll();
      return allTasks.filter(t => t.caseId === caseId);
    },

    getByAssigneeId: async (assigneeId: string): Promise<Task[]> => {
      const allTasks = await this.tasks.getAll();
      return allTasks.filter(t => t.assignedToId === assigneeId);
    }
  };

  /**
   * Secure Clients Operations
   */
  clients = {
    getAll: async (): Promise<Client[]> => {
      return secureDataAccess.secureList<Client>(
        this.currentUserId,
        'clients',
        () => unifiedStore.clients.getAll()
      );
    },

    getById: async (clientId: string): Promise<Client | null> => {
      return secureDataAccess.secureGet<Client>(
        this.currentUserId,
        'clients',
        clientId,
        (id) => unifiedStore.clients.getById(id)
      );
    },

    searchByName: async (searchTerm: string): Promise<Client[]> => {
      const allClients = await this.clients.getAll();
      return allClients.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  };

  /**
   * Secure Hearings Operations
   */
  hearings = {
    getAll: async (): Promise<Hearing[]> => {
      return secureDataAccess.secureList<Hearing>(
        this.currentUserId,
        'hearings',
        () => unifiedStore.hearings.getAll()
      );
    },

    getById: async (hearingId: string): Promise<Hearing | null> => {
      return secureDataAccess.secureGet<Hearing>(
        this.currentUserId,
        'hearings',
        hearingId,
        (id) => unifiedStore.hearings.getById(id)
      );
    },

    getByCaseId: async (caseId: string): Promise<Hearing[]> => {
      const allHearings = await this.hearings.getAll();
      return allHearings.filter(h => h.caseId === caseId);
    },

    getUpcoming: async (days: number = 30): Promise<Hearing[]> => {
      const allHearings = await this.hearings.getAll();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + days);
      
      return allHearings.filter(h => {
        const hearingDate = new Date(h.date);
        return hearingDate >= new Date() && hearingDate <= cutoffDate;
      });
    }
  };

  /**
   * Secure Documents Operations
   */
  documents = {
    getAll: async (): Promise<Document[]> => {
      return secureDataAccess.secureList<Document>(
        this.currentUserId,
        'documents',
        () => unifiedStore.documents.getAll()
      );
    },

    getById: async (docId: string): Promise<Document | null> => {
      return secureDataAccess.secureGet<Document>(
        this.currentUserId,
        'documents',
        docId,
        (id) => unifiedStore.documents.getById(id)
      );
    },

    getByCaseId: async (caseId: string): Promise<Document[]> => {
      const allDocs = await this.documents.getAll();
      return allDocs.filter(d => d.caseId === caseId);
    },

    getByType: async (type: string): Promise<Document[]> => {
      const allDocs = await this.documents.getAll();
      return allDocs.filter(d => d.type === type);
    }
  };

  /**
   * Check if user can access a specific record based on scope
   */
  private async checkRecordAccess(
    record: any, 
    scope: 'own' | 'team' | 'org'
  ): Promise<boolean> {
    if (scope === 'org') return true;

    const context = await policyEngine.getUserContext(this.currentUserId);
    
    switch (scope) {
      case 'own':
        return record.ownerId === context.userId || 
               record.assignedToId === context.employeeId ||
               record.assigned_to === context.employeeId;
      
      case 'team':
        const allowedIds = [context.employeeId, ...context.reporteeIds];
        return allowedIds.includes(record.ownerId) ||
               allowedIds.includes(record.assignedToId) ||
               allowedIds.includes(record.assigned_to);
      
      default:
        return false;
    }
  }

  /**
   * Get accessible record count by resource and scope
   */
  async getAccessibleCounts(): Promise<Record<string, { own: number; team: number; org: number }>> {
    const resources = ['cases', 'clients', 'tasks', 'hearings', 'documents'];
    const counts: Record<string, { own: number; team: number; org: number }> = {};

    for (const resource of resources) {
      counts[resource] = { own: 0, team: 0, org: 0 };

      // Get all data for this resource
      let allData: any[] = [];
      switch (resource) {
        case 'cases':
          allData = await unifiedStore.cases.getAll();
          break;
        case 'clients':
          allData = await unifiedStore.clients.getAll();
          break;
        case 'tasks':
          allData = await unifiedStore.tasks.getAll();
          break;
        case 'hearings':
          allData = await unifiedStore.hearings.getAll();
          break;
        case 'documents':
          allData = await unifiedStore.documents.getAll();
          break;
      }

      // Count accessible records for each scope
      const context = await policyEngine.getUserContext(this.currentUserId);
      
      for (const item of allData) {
        // Own scope
        if (this.checkRecordAccess(item, 'own')) {
          counts[resource].own++;
        }
        
        // Team scope (includes own)
        if (await this.checkRecordAccess(item, 'team')) {
          counts[resource].team++;
        }
        
        // Org scope (all records)
        counts[resource].org++;
      }
    }

    return counts;
  }

  /**
   * Get current user context for debugging
   */
  async getCurrentUserContext() {
    return policyEngine.getUserContext(this.currentUserId);
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    policyEngine.clearCache();
  }
}

// Singleton export
export const secureDataService = new SecureDataService();