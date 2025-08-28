import { AppAction, AppState, Client, Case, Task, Court, Judge, Document, Hearing, Employee } from '@/contexts/AppStateContext';
import { CompanySignatory } from '@/types/signatory';
import { addDiagnosticLog } from '@/components/diagnostics/DiagnosticsDrawer';

// Service layer for all data operations
// This will be easily replaceable with API calls later

export class DataService {
  private dispatch: (action: AppAction) => void;
  private state: AppState | null = null;

  constructor(dispatch: (action: AppAction) => void) {
    this.dispatch = dispatch;
  }

  // Helper to get current state (will be injected by provider)
  setCurrentState(state: AppState) {
    this.state = state;
  }

  private getCurrentState(): AppState {
    if (!this.state) {
      throw new Error('State not set. DataService must be properly initialized.');
    }
    return this.state;
  }

  // Client Services
  async createClient(client: Omit<Client, 'id'>): Promise<Client> {
    try {
      const newClient: Client = {
        ...client,
        id: this.generateId(),
      };
      
      this.dispatch({ type: 'ADD_CLIENT', payload: newClient });
      
      addDiagnosticLog({
        operation: 'CREATE',
        entity: 'client',
        status: 'success',
        details: `Client "${newClient.name}" created successfully`,
        payload: { id: newClient.id, name: newClient.name }
      });
      
      return newClient;
    } catch (error) {
      addDiagnosticLog({
        operation: 'CREATE',
        entity: 'client',
        status: 'error',
        details: `Failed to create client: ${error instanceof Error ? error.message : 'Unknown error'}`,
        payload: { clientData: client }
      });
      throw error;
    }
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    try {
      // Get current client
      const currentClient = this.getCurrentState().clients.find(c => c.id === id);
      if (!currentClient) {
        throw new Error(`Client with id ${id} not found`);
      }

      const updatedClient: Client = {
        ...currentClient,
        ...updates,
      };
      
      this.dispatch({ type: 'UPDATE_CLIENT', payload: updatedClient });
      
      addDiagnosticLog({
        operation: 'UPDATE',
        entity: 'client',
        status: 'success',
        details: `Client "${updatedClient.name}" updated successfully`,
        payload: { id, updates }
      });
      
      return updatedClient;
    } catch (error) {
      addDiagnosticLog({
        operation: 'UPDATE',
        entity: 'client',
        status: 'error',
        details: `Failed to update client: ${error instanceof Error ? error.message : 'Unknown error'}`,
        payload: { id, updates }
      });
      throw error;
    }
  }

  async deleteClient(id: string): Promise<void> {
    try {
      const currentClient = this.getCurrentState().clients.find(c => c.id === id);
      const clientName = currentClient?.name || 'Unknown';
      
      this.dispatch({ type: 'DELETE_CLIENT', payload: id });
      
      addDiagnosticLog({
        operation: 'DELETE',
        entity: 'client',
        status: 'success',
        details: `Client "${clientName}" deleted successfully`,
        payload: { id }
      });
    } catch (error) {
      addDiagnosticLog({
        operation: 'DELETE',
        entity: 'client',
        status: 'error',
        details: `Failed to delete client: ${error instanceof Error ? error.message : 'Unknown error'}`,
        payload: { id }
      });
      throw error;
    }
  }

  // Case Services
  async createCase(caseData: Omit<Case, 'id'>): Promise<Case> {
    const newCase: Case = {
      ...caseData,
      id: this.generateId(),
    };
    
    this.dispatch({ type: 'ADD_CASE', payload: newCase });
    return newCase;
  }

  async updateCase(id: string, updates: Partial<Case>): Promise<Case> {
    const updatedCase = { ...updates, id } as Case;
    this.dispatch({ type: 'UPDATE_CASE', payload: updatedCase });
    return updatedCase;
  }

  async deleteCase(id: string): Promise<void> {
    this.dispatch({ type: 'DELETE_CASE', payload: id });
  }

  // Task Services
  async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    const newTask: Task = {
      ...task,
      id: this.generateId(),
    };
    
    this.dispatch({ type: 'ADD_TASK', payload: newTask });
    return newTask;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const updatedTask = { ...updates, id } as Task;
    this.dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
    return updatedTask;
  }

  async deleteTask(id: string): Promise<void> {
    this.dispatch({ type: 'DELETE_TASK', payload: id });
  }

  // Court Services
  async createCourt(court: Omit<Court, 'id'>): Promise<Court> {
    const newCourt: Court = {
      ...court,
      id: this.generateId(),
    };
    
    this.dispatch({ type: 'ADD_COURT', payload: newCourt });
    return newCourt;
  }

  async updateCourt(id: string, updates: Partial<Court>): Promise<Court> {
    const updatedCourt = { ...updates, id } as Court;
    this.dispatch({ type: 'UPDATE_COURT', payload: updatedCourt });
    return updatedCourt;
  }

  async deleteCourt(id: string): Promise<void> {
    this.dispatch({ type: 'DELETE_COURT', payload: id });
  }

  // Judge Services
  async createJudge(judge: Omit<Judge, 'id'>): Promise<Judge> {
    const newJudge: Judge = {
      ...judge,
      id: this.generateId(),
    };
    
    this.dispatch({ type: 'ADD_JUDGE', payload: newJudge });
    return newJudge;
  }

  async updateJudge(id: string, updates: Partial<Judge>): Promise<Judge> {
    const updatedJudge = { ...updates, id } as Judge;
    this.dispatch({ type: 'UPDATE_JUDGE', payload: updatedJudge });
    return updatedJudge;
  }

  async deleteJudge(id: string): Promise<void> {
    this.dispatch({ type: 'DELETE_JUDGE', payload: id });
  }

  // Document Services
  async createDocument(document: Omit<Document, 'id'>): Promise<Document> {
    const newDocument: Document = {
      ...document,
      id: this.generateId(),
    };
    
    this.dispatch({ type: 'ADD_DOCUMENT', payload: newDocument });
    return newDocument;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
    const updatedDocument = { ...updates, id } as Document;
    this.dispatch({ type: 'UPDATE_DOCUMENT', payload: updatedDocument });
    return updatedDocument;
  }

  async deleteDocument(id: string): Promise<void> {
    this.dispatch({ type: 'DELETE_DOCUMENT', payload: id });
  }

  // Hearing Services
  async createHearing(hearing: Omit<Hearing, 'id'>): Promise<Hearing> {
    const newHearing: Hearing = {
      ...hearing,
      id: this.generateId(),
    };
    
    this.dispatch({ type: 'ADD_HEARING', payload: newHearing });
    return newHearing;
  }

  async updateHearing(id: string, updates: Partial<Hearing>): Promise<Hearing> {
    const updatedHearing = { ...updates, id } as Hearing;
    this.dispatch({ type: 'UPDATE_HEARING', payload: updatedHearing });
    return updatedHearing;
  }

  async deleteHearing(id: string): Promise<void> {
    this.dispatch({ type: 'DELETE_HEARING', payload: id });
  }

  // Employee Services
  async createEmployee(employee: Omit<Employee, 'id'>): Promise<Employee> {
    const newEmployee: Employee = {
      ...employee,
      id: this.generateId(),
    };
    
    this.dispatch({ type: 'ADD_EMPLOYEE', payload: newEmployee });
    return newEmployee;
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
    const updatedEmployee = { ...updates, id } as Employee;
    this.dispatch({ type: 'UPDATE_EMPLOYEE', payload: updatedEmployee });
    return updatedEmployee;
  }

  async deleteEmployee(id: string): Promise<void> {
    this.dispatch({ type: 'DELETE_EMPLOYEE', payload: id });
  }

  // Signatory Services
  async createSignatory(signatory: Omit<CompanySignatory, 'id'>): Promise<CompanySignatory> {
    const newSignatory: CompanySignatory = {
      ...signatory,
      id: this.generateId(),
    };
    
    this.dispatch({ type: 'ADD_SIGNATORY', payload: newSignatory });
    return newSignatory;
  }

  async updateSignatory(id: string, updates: Partial<CompanySignatory>): Promise<CompanySignatory> {
    const updatedSignatory = { ...updates, id } as CompanySignatory;
    this.dispatch({ type: 'UPDATE_SIGNATORY', payload: updatedSignatory });
    return updatedSignatory;
  }

  async deleteSignatory(id: string): Promise<void> {
    this.dispatch({ type: 'DELETE_SIGNATORY', payload: id });
  }

  async setPrimarySignatory(clientId: string, signatoryId: string): Promise<void> {
    this.dispatch({ type: 'SET_PRIMARY_SIGNATORY', payload: { clientId, signatoryId } });
  }

  // Utility Methods
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Data Management
  async resetDemoData(): Promise<void> {
    this.dispatch({ type: 'CLEAR_ALL_DATA' });
  }

  async generateSampleData(): Promise<void> {
    // Generate comprehensive sample data for testing
    const sampleClients = this.generateSampleClients();
    const sampleCourts = this.generateSampleCourts();
    const sampleJudges = this.generateSampleJudges();
    
    // Add clients first
    for (const client of sampleClients) {
      await this.createClient(client);
    }
    
    // Add courts
    for (const court of sampleCourts) {
      await this.createCourt(court);
    }
    
    // Add judges
    for (const judge of sampleJudges) {
      await this.createJudge(judge);
    }
    
    // Add sample cases, tasks, etc.
    // This will be expanded based on the existing data
  }

  private generateSampleClients(): Omit<Client, 'id'>[] {
    return [
      {
        type: 'Company',
        name: 'Tech Solutions Pvt Ltd',
        email: 'contact@techsolutions.com',
        phone: '+91-9876543210',
        status: 'Active',
        clientCategory: 'Corporate',
        registrationNumber: 'U72900MH2020PTC123456',
        gstNumber: '27AABCT1234Q1Z5',
        panNumber: 'AABCT1234Q',
        cin: 'U72900MH2020PTC123456',
        address: {
          addressLine1: '123 Tech Park',
          addressLine2: 'Sector 15',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          country: 'India'
        },
        communicationAddress: {
          addressLine1: '123 Tech Park',
          addressLine2: 'Sector 15',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          country: 'India'
        },
        jurisdiction: {
          range: 'Mumbai High Court',
          division: 'Mumbai Division',
          commissionerate: 'Mumbai Commissionerate'
        },
        assignedCAId: 'emp_001',
        assignedCAName: 'John Smith',
        registrationDate: '2024-01-01',
        totalCases: 5,
        activeCases: 3,
        totalInvoiced: 150000,
        notes: 'Major corporate client with ongoing compliance matters'
      },
      {
        type: 'Individual',
        name: 'Rajesh Kumar',
        email: 'rajesh.kumar@email.com',
        phone: '+91-9876543211',
        status: 'Active',
        clientCategory: 'Individual',
        panNumber: 'ABCPK1234D',
        address: {
          addressLine1: '45 Residential Complex',
          addressLine2: 'JP Nagar',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560078',
          country: 'India'
        },
        communicationAddress: {
          addressLine1: '45 Residential Complex',
          addressLine2: 'JP Nagar',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560078',
          country: 'India'
        },
        jurisdiction: {
          range: 'Karnataka High Court',
          division: 'Bangalore Division',
          commissionerate: 'Bangalore Commissionerate'
        },
        assignedCAId: 'emp_002',
        assignedCAName: 'Sarah Davis',
        registrationDate: '2024-02-15',
        totalCases: 2,
        activeCases: 1,
        totalInvoiced: 75000,
        notes: 'Property dispute case ongoing'
      }
    ];
  }

  private generateSampleCourts(): Omit<Court, 'id'>[] {
    return [
      {
        name: 'Delhi High Court',
        type: 'High Court',
        jurisdiction: 'Delhi',
        address: 'Sher Shah Road, New Delhi',
        establishedYear: 1966,
        totalJudges: 45,
        activeCases: 15000,
        avgHearingTime: '2 hours',
        digitalFiling: true,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      },
      {
        name: 'Mumbai High Court',
        type: 'High Court',
        jurisdiction: 'Maharashtra',
        address: 'Fort, Mumbai',
        establishedYear: 1862,
        totalJudges: 70,
        activeCases: 25000,
        avgHearingTime: '1.5 hours',
        digitalFiling: true,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      }
    ];
  }

  private generateSampleJudges(): Omit<Judge, 'id'>[] {
    return [
      {
        name: 'Justice Rajesh Bindal',
        designation: 'Chief Justice',
        courtId: 'court_delhi_high', // Will be replaced with actual ID when courts are created
        appointmentDate: '2020-03-15',
        specialization: ['Constitutional Law', 'Civil Law'],
        totalCases: 500,
        avgDisposalTime: '6 months',
        retirementDate: '2030-12-31',
        status: 'Active',
        contactInfo: {
          chambers: 'Chamber No. 1, Delhi High Court',
          phone: '+91-11-23384271',
          email: 'cj@delhihighcourt.nic.in'
        }
      },
      {
        name: 'Justice Prathiba Singh',
        designation: 'Judge',
        courtId: 'court_delhi_high',
        appointmentDate: '2018-07-20',
        specialization: ['Intellectual Property', 'Commercial Law'],
        totalCases: 300,
        avgDisposalTime: '4 months',
        retirementDate: '2035-06-30',
        status: 'Active',
        contactInfo: {
          chambers: 'Chamber No. 5, Delhi High Court',
          phone: '+91-11-23384272',
          email: 'j.prathibasingh@delhihighcourt.nic.in'
        }
      }
    ];
  }
}

// Singleton service instance
let dataServiceInstance: DataService | null = null;

export const initializeDataService = (dispatch: (action: AppAction) => void): DataService => {
  dataServiceInstance = new DataService(dispatch);
  return dataServiceInstance;
};

export const getDataService = (): DataService => {
  if (!dataServiceInstance) {
    throw new Error('DataService not initialized. Call initializeDataService first.');
  }
  return dataServiceInstance;
};