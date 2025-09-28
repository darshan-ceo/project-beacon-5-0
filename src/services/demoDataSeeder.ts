/**
 * Demo Data Seeder - Create scope-aware test data
 * Seeds organizational structure and test records for RBAC demonstration
 */

import { unifiedStore } from '@/persistence/unifiedStore';
import { advancedRbacService } from '@/services/advancedRbacService';
import { type Employee } from '@/services/employeesService';
import { type Case, type Task, type Client } from '@/contexts/AppStateContext';

class DemoDataSeeder {
  constructor() {
    this.initializeSeeder();
  }

  private async initializeSeeder(): Promise<void> {
    await unifiedStore.waitUntilReady();
  }

  /**
   * Seed complete demo environment with organizational structure
   */
  async seedDemoEnvironment(): Promise<void> {
    try {
      console.log('🌱 Starting demo environment seeding...');

      // Step 1: Clear existing demo data
      await this.clearDemoData();

      // Step 2: Seed organizational structure
      const employees = await this.seedOrganizationalStructure();

      // Step 3: Seed business entities with proper ownership
      await this.seedBusinessEntities(employees);

      // Step 4: Assign users to roles
      await this.seedUserRoleAssignments(employees);

      console.log('✅ Demo environment seeded successfully');
    } catch (error) {
      console.error('❌ Failed to seed demo environment:', error);
      throw error;
    }
  }

  /**
   * Clear existing demo data
   */
  private async clearDemoData(): Promise<void> {
    const entities = ['employees', 'cases', 'clients', 'tasks', 'userRoles'] as const;
    for (const entity of entities) {
      await unifiedStore.clear(entity);
    }
  }

  /**
   * Seed organizational hierarchy
   */
  private async seedOrganizationalStructure(): Promise<Employee[]> {
    console.log('👥 Seeding organizational structure...');

    const employees: Employee[] = [
      // Top Level - Managing Partner
      {
        id: 'emp-001',
        full_name: 'Sarah Johnson',
        role: 'Partner',
        email: 'sarah.johnson@lawfirm.com',
        mobile: '+1-555-0101',
        status: 'Active',
        date_of_joining: '2015-01-15',
        department: 'Management',
        workloadCapacity: 60,
        specialization: ['Corporate Law', 'M&A'],
        managerId: undefined, // Top of hierarchy
        tenantId: 'tenant-001'
      },

      // Second Level - Senior Associates/Managers
      {
        id: 'emp-002',
        full_name: 'Michael Chen',
        role: 'CA',
        email: 'michael.chen@lawfirm.com',
        mobile: '+1-555-0102',
        status: 'Active',
        date_of_joining: '2018-03-20',
        department: 'Tax Division',
        workloadCapacity: 50,
        specialization: ['Tax Law', 'GST'],
        managerId: 'emp-001',
        tenantId: 'tenant-001'
      },

      {
        id: 'emp-003',
        full_name: 'Priya Sharma',
        role: 'Advocate',
        email: 'priya.sharma@lawfirm.com',
        mobile: '+1-555-0103',
        status: 'Active',
        date_of_joining: '2017-08-10',
        department: 'Litigation',
        workloadCapacity: 45,
        specialization: ['Civil Litigation', 'Consumer Law'],
        managerId: 'emp-001',
        tenantId: 'tenant-001'
      },

      // Third Level - Staff under Michael Chen
      {
        id: 'emp-004',
        full_name: 'David Wilson',
        role: 'Staff',
        email: 'david.wilson@lawfirm.com',
        mobile: '+1-555-0104',
        status: 'Active',
        date_of_joining: '2020-01-15',
        department: 'Tax Division',
        workloadCapacity: 40,
        specialization: ['GST Returns', 'Compliance'],
        managerId: 'emp-002',
        tenantId: 'tenant-001'
      },

      {
        id: 'emp-005',
        full_name: 'Lisa Rodriguez',
        role: 'Staff',
        email: 'lisa.rodriguez@lawfirm.com',
        mobile: '+1-555-0105',
        status: 'Active',
        date_of_joining: '2021-06-01',
        department: 'Tax Division',
        workloadCapacity: 40,
        specialization: ['Tax Planning', 'Advisory'],
        managerId: 'emp-002',
        tenantId: 'tenant-001'
      },

      // Third Level - Staff under Priya Sharma
      {
        id: 'emp-006',
        full_name: 'Raj Patel',
        role: 'Staff',
        email: 'raj.patel@lawfirm.com',
        mobile: '+1-555-0106',
        status: 'Active',
        date_of_joining: '2019-11-20',
        department: 'Litigation',
        workloadCapacity: 42,
        specialization: ['Case Research', 'Documentation'],
        managerId: 'emp-003',
        tenantId: 'tenant-001'
      },

      // Support Staff
      {
        id: 'emp-007',
        full_name: 'Emily Davis',
        role: 'Admin',
        email: 'emily.davis@lawfirm.com',
        mobile: '+1-555-0107',
        status: 'Active',
        date_of_joining: '2019-04-12',
        department: 'Administration',
        workloadCapacity: 40,
        specialization: ['Document Management', 'Client Relations'],
        managerId: 'emp-001',
        tenantId: 'tenant-001'
      }
    ];

    // Create employees in database
    for (const employee of employees) {
      await unifiedStore.employees.create(employee);
    }

    console.log(`✅ Created ${employees.length} employees with organizational hierarchy`);
    return employees;
  }

  /**
   * Seed business entities with proper ownership and assignments
   */
  private async seedBusinessEntities(employees: Employee[]): Promise<void> {
    console.log('💼 Seeding business entities...');

    // Seed Clients
    const clients: Client[] = [
      {
        id: 'client-001',
        name: 'TechCorp Solutions Ltd',
        email: 'contact@techcorp.com',
        phone: '+1-555-2001',
        address: '123 Technology Blvd, Tech City, TC 10001',
        gstin: '29ABCDE1234F1Z5',
        panNumber: 'ABCDE1234F',
        registrationDate: '2020-05-15',
        status: 'Active',
        assignedCAId: 'emp-002', // Michael Chen manages this client
        assignedCAName: 'Michael Chen',
        notes: 'Large technology company with complex tax requirements',
        contactPerson1: 'John Smith',
        contactPerson2: 'Jane Doe',
        category: 'Regular Dealer',
        segment: 'Large Enterprise'
      },
      {
        id: 'client-002',
        name: 'Green Energy Solutions',
        email: 'info@greenenergy.com',
        phone: '+1-555-2002',
        address: '456 Renewable Ave, Eco City, EC 20002',
        gstin: '27FGHIJ5678K2L6',
        panNumber: 'FGHIJ5678K',
        registrationDate: '2021-03-20',
        status: 'Active',
        assignedCAId: 'emp-003', // Priya Sharma handles litigation
        assignedCAName: 'Priya Sharma',
        notes: 'Renewable energy company with regulatory compliance needs',
        contactPerson1: 'Robert Green',
        contactPerson2: 'Alice Brown',
        category: 'Regular Dealer',
        segment: 'Mid Market'
      },
      {
        id: 'client-003',
        name: 'Local Retail Chain',
        email: 'manager@retailchain.com',
        phone: '+1-555-2003',
        address: '789 Commerce St, Retail City, RC 30003',
        gstin: '33MNOPQ9012R3S7',
        panNumber: 'MNOPQ9012R',
        registrationDate: '2022-01-10',
        status: 'Active',
        assignedCAId: 'emp-004', // David Wilson (staff level)
        assignedCAName: 'David Wilson',
        notes: 'Small retail chain with basic compliance needs',
        contactPerson1: 'Mark Johnson',
        contactPerson2: 'Susan Lee',
        category: 'Composition',
        segment: 'Small Business'
      }
    ];

    for (const client of clients) {
      await unifiedStore.clients.create(client);
    }

    // Seed Cases with proper ownership chain
    const cases: Case[] = [
      {
        id: 'case-001',
        caseNumber: 'CAS001',
        title: 'TechCorp GST Audit Defense',
        clientId: 'client-001',
        currentStage: 'Scrutiny',
        priority: 'High',
        slaStatus: 'Green',
        assignedToId: 'emp-002', // Michael Chen owns
        assignedToName: 'Michael Chen',
        createdDate: '2024-01-15T10:00:00Z',
        lastUpdated: '2024-01-20T15:30:00Z',
        documents: 15,
        progress: 35,
        generatedForms: [],
        description: 'GST audit defense for large technology corporation'
      },
      {
        id: 'case-002',
        caseNumber: 'CAS002',
        title: 'Green Energy Regulatory Compliance',
        clientId: 'client-002',
        currentStage: 'Demand',
        priority: 'Medium',
        slaStatus: 'Amber',
        assignedToId: 'emp-003', // Priya Sharma owns
        assignedToName: 'Priya Sharma',
        createdDate: '2024-01-10T09:00:00Z',
        lastUpdated: '2024-01-25T11:15:00Z',
        documents: 8,
        progress: 20,
        generatedForms: [],
        description: 'Regulatory compliance matter for renewable energy sector'
      },
      {
        id: 'case-003',
        caseNumber: 'CAS003',
        title: 'Retail Chain Tax Assessment',
        clientId: 'client-003',
        currentStage: 'Adjudication',
        priority: 'Low',
        slaStatus: 'Green',
        assignedToId: 'emp-004', // David Wilson owns (staff)
        assignedToName: 'David Wilson',
        createdDate: '2024-02-01T14:00:00Z',
        lastUpdated: '2024-02-05T16:45:00Z',
        documents: 5,
        progress: 60,
        generatedForms: [],
        description: 'Basic tax assessment for small retail business'
      }
    ];

    for (const caseItem of cases) {
      await unifiedStore.cases.create(caseItem);
    }

    // Seed Tasks with cross-team assignments
    const tasks: Task[] = [
      {
        id: 'task-001',
        title: 'Review TechCorp Financial Documents',
        description: 'Comprehensive review of financial documents for GST audit',
        caseId: 'case-001',
        clientId: 'client-001',
        caseNumber: 'CAS001',
        stage: 'Scrutiny',
        priority: 'High',
        status: 'In Progress',
        assignedToId: 'emp-004', // Assigned to David Wilson (staff under Michael)
        assignedToName: 'David Wilson',
        assignedById: 'emp-002', // Assigned by Michael Chen
        assignedByName: 'Michael Chen',
        createdDate: '2024-01-15T10:30:00Z',
        dueDate: '2024-01-25T17:00:00Z',
        estimatedHours: 16,
        isAutoGenerated: false,
        escalationLevel: 0
      },
      {
        id: 'task-002',
        title: 'Prepare Green Energy Legal Brief',
        description: 'Draft legal brief for regulatory compliance hearing',
        caseId: 'case-002',
        clientId: 'client-002',
        caseNumber: 'CAS002',
        stage: 'Demand',
        priority: 'Medium',
        status: 'Not Started',
        assignedToId: 'emp-006', // Assigned to Raj Patel (staff under Priya)
        assignedToName: 'Raj Patel',
        assignedById: 'emp-003', // Assigned by Priya Sharma
        assignedByName: 'Priya Sharma',
        createdDate: '2024-01-20T11:00:00Z',
        dueDate: '2024-02-05T17:00:00Z',
        estimatedHours: 12,
        isAutoGenerated: false,
        escalationLevel: 0
      },
      {
        id: 'task-003',
        title: 'Complete Retail Chain Assessment Forms',
        description: 'Fill out standard assessment forms for retail client',
        caseId: 'case-003',
        clientId: 'client-003',
        caseNumber: 'CAS003',
        stage: 'Adjudication',
        priority: 'Low',
        status: 'Completed',
        assignedToId: 'emp-004', // David Wilson owns this task
        assignedToName: 'David Wilson',
        assignedById: 'emp-004', // Self-assigned
        assignedByName: 'David Wilson',
        createdDate: '2024-02-01T14:30:00Z',
        dueDate: '2024-02-03T17:00:00Z',
        completedDate: '2024-02-03T15:30:00Z',
        estimatedHours: 4,
        isAutoGenerated: true,
        escalationLevel: 0
      }
    ];

    for (const task of tasks) {
      await unifiedStore.tasks.create(task);
    }

    console.log(`✅ Created ${clients.length} clients, ${cases.length} cases, ${tasks.length} tasks`);
  }

  /**
   * Assign users to appropriate roles based on their position
   */
  private async seedUserRoleAssignments(employees: Employee[]): Promise<void> {
    console.log('🔐 Assigning user roles...');

    const roleAssignments = [
      // Partner gets SuperAdmin role
      { userId: 'emp-001', roleName: 'SuperAdmin' },
      
      // Senior staff get Manager role
      { userId: 'emp-002', roleName: 'Manager' },
      { userId: 'emp-003', roleName: 'Manager' },
      
      // Staff get Staff role
      { userId: 'emp-004', roleName: 'Staff' },
      { userId: 'emp-005', roleName: 'Staff' },
      { userId: 'emp-006', roleName: 'Staff' },
      
      // Admin gets Admin role
      { userId: 'emp-007', roleName: 'Admin' }
    ];

    const allRoles = await advancedRbacService.getAllRoles();

    for (const assignment of roleAssignments) {
      const role = allRoles.find(r => r.name === assignment.roleName);
      if (role) {
        try {
          await advancedRbacService.assignRole({
            userId: assignment.userId,
            roleId: role.id
          });
        } catch (error) {
          // Ignore if already assigned
          if (!error.message.includes('already has this role')) {
            console.warn(`Failed to assign role ${assignment.roleName} to ${assignment.userId}:`, error);
          }
        }
      }
    }

    console.log(`✅ Assigned roles to ${roleAssignments.length} users`);
  }

  /**
   * Get seeded demo users for testing
   */
  getDemoUsers(): Array<{ id: string; name: string; role: string; managerId?: string }> {
    return [
      { id: 'emp-001', name: 'Sarah Johnson', role: 'Partner (SuperAdmin)' },
      { id: 'emp-002', name: 'Michael Chen', role: 'CA (Manager)', managerId: 'emp-001' },
      { id: 'emp-003', name: 'Priya Sharma', role: 'Advocate (Manager)', managerId: 'emp-001' },
      { id: 'emp-004', name: 'David Wilson', role: 'Staff', managerId: 'emp-002' },
      { id: 'emp-005', name: 'Lisa Rodriguez', role: 'Staff', managerId: 'emp-002' },
      { id: 'emp-006', name: 'Raj Patel', role: 'Staff', managerId: 'emp-003' },
      { id: 'emp-007', name: 'Emily Davis', role: 'Admin', managerId: 'emp-001' }
    ];
  }

  /**
   * Test scope filtering by switching between users
   */
  async testScopeFiltering(): Promise<{
    testResults: Record<string, any>;
    summary: string;
  }> {
    const { secureDataService } = await import('@/services/secureDataService');
    const testResults: Record<string, any> = {};

    // Test with different user contexts
    const testUsers = [
      { id: 'emp-001', name: 'Sarah Johnson', expectedRole: 'SuperAdmin' },
      { id: 'emp-002', name: 'Michael Chen', expectedRole: 'Manager' },
      { id: 'emp-004', name: 'David Wilson', expectedRole: 'Staff' }
    ];

    for (const user of testUsers) {
      secureDataService.setCurrentUser(user.id);
      
      const context = await secureDataService.getCurrentUserContext();
      const cases = await secureDataService.cases.getAll();
      const tasks = await secureDataService.tasks.getAll();
      const clients = await secureDataService.clients.getAll();

      testResults[user.id] = {
        userName: user.name,
        expectedRole: user.expectedRole,
        context,
        accessibleRecords: {
          cases: cases.length,
          tasks: tasks.length,
          clients: clients.length
        },
        caseIds: cases.map(c => c.id),
        taskIds: tasks.map(t => t.id),
        clientIds: clients.map(c => c.id)
      };
    }

    const summary = `Scope filtering test completed for ${testUsers.length} users. ` +
      `Results show different access levels based on organizational hierarchy and RBAC scopes.`;

    return { testResults, summary };
  }
}

// Singleton export
export const demoDataSeeder = new DemoDataSeeder();