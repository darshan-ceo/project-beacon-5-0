/**
 * GST Litigation Mock Data Seeder
 * Populates Supabase with sample GST litigation data for QA and demo
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Insert'];
type Client = Database['public']['Tables']['clients']['Insert'];
type Court = Database['public']['Tables']['courts']['Insert'];
type Case = Database['public']['Tables']['cases']['Insert'];
type Hearing = Database['public']['Tables']['hearings']['Insert'];
type Task = Database['public']['Tables']['tasks']['Insert'];
type Document = Database['public']['Tables']['documents']['Insert'];

interface SeedResult {
  success: boolean;
  totalRecords: number;
  details: {
    users: number;
    clients: number;
    forums: number;
    cases: number;
    hearings: number;
    tasks: number;
    documents: number;
  };
  errors: string[];
}

export class GSTLitigationDataSeeder {
  private tenantId: string = '';
  private userId: string = '';
  private userIdMap = new Map<number, string>();
  private clientIdMap = new Map<number, string>();
  private forumIdMap = new Map<number, string>();
  private caseIdMap = new Map<number, string>();
  private hearingIdMap = new Map<number, string>();
  private errors: string[] = [];

  private roleMapping: Record<string, string> = {
    'Admin': 'admin',
    'Partner': 'partner',
    'Litigation Head': 'advocate',
    'Paralegal': 'staff',
    'Client': 'client'
  };

  async initialize(): Promise<void> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Failed to fetch user profile');
    }

    this.userId = user.id;
    this.tenantId = profile.tenant_id;
    console.log('🔧 Seeder initialized:', { tenantId: this.tenantId, userId: this.userId });
  }

  async seedUsers(mockUsers: any[]): Promise<number> {
    console.log('👥 Seeding users...');
    let count = 0;

    for (const mockUser of mockUsers) {
      try {
        // Check if profile already exists
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('tenant_id', this.tenantId)
          .ilike('full_name', mockUser.name)
          .maybeSingle();

        let profileId: string;

        if (existing) {
          profileId = existing.id;
          console.log(`  ✓ User exists: ${mockUser.name}`);
        } else {
          // Create placeholder profile (in production, would use auth.admin.createUser)
          const newId = crypto.randomUUID();
          const { error } = await supabase
            .from('profiles')
            .insert({
              id: newId,
              tenant_id: this.tenantId,
              full_name: mockUser.name,
              phone: mockUser.mobile
            });

          if (error) {
            this.errors.push(`Failed to create user ${mockUser.name}: ${error.message}`);
            continue;
          }

          profileId = newId;
          count++;
          console.log(`  ✓ Created user: ${mockUser.name}`);
        }

        this.userIdMap.set(mockUser.id, profileId);

        // Assign role
        const appRole = this.roleMapping[mockUser.role] || 'user';
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert([{
            user_id: profileId,
            role: appRole as any
          }], { onConflict: 'user_id,role' });

        if (roleError) {
          this.errors.push(`Failed to assign role for ${mockUser.name}: ${roleError.message}`);
        }

      } catch (err) {
        this.errors.push(`Error seeding user ${mockUser.name}: ${err}`);
      }
    }

    return count;
  }

  async seedClients(mockClients: any[]): Promise<number> {
    console.log('🏢 Seeding clients...');
    let count = 0;

    for (const mockClient of mockClients) {
      try {
        const clientId = crypto.randomUUID();
        const { error } = await supabase
          .from('clients')
          .insert({
            id: clientId,
            tenant_id: this.tenantId,
            display_name: mockClient.name,
            gstin: mockClient.gstin,
            city: mockClient.city,
            email: mockClient.email,
            phone: mockClient.mobile,
            status: mockClient.status.toLowerCase(),
            owner_id: this.userId
          });

        if (error) {
          this.errors.push(`Failed to create client ${mockClient.name}: ${error.message}`);
          continue;
        }

        this.clientIdMap.set(mockClient.id, clientId);
        count++;
        console.log(`  ✓ Created client: ${mockClient.name}`);
      } catch (err) {
        this.errors.push(`Error seeding client ${mockClient.name}: ${err}`);
      }
    }

    return count;
  }

  async seedForums(mockForums: any[]): Promise<number> {
    console.log('⚖️ Seeding forums (courts)...');
    let count = 0;

    for (const mockForum of mockForums) {
      try {
        const forumId = crypto.randomUUID();
        const { error } = await supabase
          .from('courts')
          .insert({
            id: forumId,
            tenant_id: this.tenantId,
            name: mockForum.name,
            city: mockForum.city,
            level: mockForum.level,
            jurisdiction: mockForum.jurisdiction,
            address: `PIN: ${mockForum.pin}`,
            created_by: this.userId
          });

        if (error) {
          this.errors.push(`Failed to create forum ${mockForum.name}: ${error.message}`);
          continue;
        }

        this.forumIdMap.set(mockForum.id, forumId);
        count++;
        console.log(`  ✓ Created forum: ${mockForum.name}`);
      } catch (err) {
        this.errors.push(`Error seeding forum ${mockForum.name}: ${err}`);
      }
    }

    return count;
  }

  async seedCases(mockCases: any[]): Promise<number> {
    console.log('📁 Seeding cases...');
    let count = 0;

    // Find an advocate/CA user for assignment
    const advocateId = Array.from(this.userIdMap.values())[2] || this.userId;

    for (const mockCase of mockCases) {
      try {
        const caseId = crypto.randomUUID();
        const clientId = this.clientIdMap.get(mockCase.client_id);
        const forumId = this.forumIdMap.get(mockCase.forum_id);

        if (!clientId || !forumId) {
          this.errors.push(`Missing foreign keys for case ${mockCase.case_title}`);
          continue;
        }

        const statusMap: Record<string, string> = {
          'Active': 'open',
          'Pending Appeal': 'open',
          'Closed': 'closed'
        };

        const { error } = await supabase
          .from('cases')
          .insert({
            id: caseId,
            tenant_id: this.tenantId,
            client_id: clientId,
            forum_id: forumId,
            title: mockCase.case_title,
            case_number: mockCase.case_ref_no,
            description: mockCase.issue_type,
            status: statusMap[mockCase.status] || 'open',
            priority: 'Medium',
            assigned_to: advocateId,
            owner_id: this.userId,
            created_at: mockCase.date_filed
          });

        if (error) {
          this.errors.push(`Failed to create case ${mockCase.case_title}: ${error.message}`);
          continue;
        }

        this.caseIdMap.set(mockCase.id, caseId);
        count++;
        console.log(`  ✓ Created case: ${mockCase.case_title}`);
      } catch (err) {
        this.errors.push(`Error seeding case ${mockCase.case_title}: ${err}`);
      }
    }

    return count;
  }

  async seedHearings(mockHearings: any[]): Promise<number> {
    console.log('📅 Seeding hearings...');
    let count = 0;

    for (const mockHearing of mockHearings) {
      try {
        const hearingId = crypto.randomUUID();
        const caseId = this.caseIdMap.get(mockHearing.case_id);

        if (!caseId) {
          this.errors.push(`Missing case for hearing ${mockHearing.id}`);
          continue;
        }

        const { error } = await supabase
          .from('hearings')
          .insert({
            id: hearingId,
            tenant_id: this.tenantId,
            case_id: caseId,
            hearing_date: mockHearing.hearing_date,
            status: mockHearing.status,
            notes: mockHearing.remarks,
            next_hearing_date: mockHearing.next_date
          });

        if (error) {
          this.errors.push(`Failed to create hearing: ${error.message}`);
          continue;
        }

        this.hearingIdMap.set(mockHearing.id, hearingId);
        count++;
        console.log(`  ✓ Created hearing for case ${mockHearing.case_id}`);

        // Update case next_hearing_date if applicable
        if (mockHearing.next_date) {
          await supabase
            .from('cases')
            .update({ next_hearing_date: mockHearing.next_date })
            .eq('id', caseId);
        }
      } catch (err) {
        this.errors.push(`Error seeding hearing: ${err}`);
      }
    }

    return count;
  }

  async seedTasks(mockTasks: any[]): Promise<number> {
    console.log('✅ Seeding tasks...');
    let count = 0;

    for (const mockTask of mockTasks) {
      try {
        const taskId = crypto.randomUUID();
        const caseId = this.caseIdMap.get(mockTask.case_id);
        const assignedTo = this.userIdMap.get(mockTask.assigned_to);

        if (!caseId || !assignedTo) {
          this.errors.push(`Missing foreign keys for task ${mockTask.task_title}`);
          continue;
        }

        const statusMap: Record<string, string> = {
          'Pending': 'Open',
          'In-Progress': 'In Progress',
          'Completed': 'Completed'
        };

        const { error } = await supabase
          .from('tasks')
          .insert({
            id: taskId,
            tenant_id: this.tenantId,
            case_id: caseId,
            assigned_to: assignedTo,
            title: mockTask.task_title,
            due_date: mockTask.due_date,
            status: statusMap[mockTask.status] || 'Open',
            priority: 'Medium'
          });

        if (error) {
          this.errors.push(`Failed to create task ${mockTask.task_title}: ${error.message}`);
          continue;
        }

        count++;
        console.log(`  ✓ Created task: ${mockTask.task_title}`);
      } catch (err) {
        this.errors.push(`Error seeding task: ${err}`);
      }
    }

    return count;
  }

  async seedDocuments(mockDocuments: any[]): Promise<number> {
    console.log('📄 Seeding documents...');
    let count = 0;

    for (const mockDoc of mockDocuments) {
      try {
        const docId = crypto.randomUUID();
        let caseId: string | undefined;
        let hearingId: string | undefined;

        if (mockDoc.linked_table === 'cases') {
          caseId = this.caseIdMap.get(mockDoc.linked_id);
        } else if (mockDoc.linked_table === 'hearings') {
          hearingId = this.hearingIdMap.get(mockDoc.linked_id);
        }

        if (!caseId && !hearingId) {
          this.errors.push(`Missing link for document ${mockDoc.doc_name}`);
          continue;
        }

        const uploadedBy = this.userIdMap.get(mockDoc.uploaded_by) || this.userId;

        const { error } = await supabase
          .from('documents')
          .insert({
            id: docId,
            tenant_id: this.tenantId,
            case_id: caseId,
            hearing_id: hearingId,
            file_name: mockDoc.doc_name,
            file_type: 'application/pdf',
            file_path: mockDoc.file_url,
            storage_url: mockDoc.file_url,
            mime_type: 'application/pdf',
            file_size: 0,
            category: mockDoc.doc_type,
            uploaded_by: uploadedBy,
            upload_timestamp: mockDoc.uploaded_on,
            document_status: 'Approved',
            version: 1
          });

        if (error) {
          this.errors.push(`Failed to create document ${mockDoc.doc_name}: ${error.message}`);
          continue;
        }

        count++;
        console.log(`  ✓ Created document: ${mockDoc.doc_name}`);
      } catch (err) {
        this.errors.push(`Error seeding document: ${err}`);
      }
    }

    return count;
  }

  async seedAll(mockDataset: any): Promise<SeedResult> {
    console.log('🌱 Starting GST Litigation Data Seeding...');
    
    try {
      await this.initialize();

      const details = {
        users: await this.seedUsers(mockDataset.modules.users_roles),
        clients: await this.seedClients(mockDataset.modules.clients),
        forums: await this.seedForums(mockDataset.modules.forums),
        cases: await this.seedCases(mockDataset.modules.cases),
        hearings: await this.seedHearings(mockDataset.modules.hearings),
        tasks: await this.seedTasks(mockDataset.modules.tasks),
        documents: await this.seedDocuments(mockDataset.modules.documents)
      };

      const totalRecords = Object.values(details).reduce((sum, count) => sum + count, 0);

      console.log('✨ Seeding completed!', details);

      return {
        success: this.errors.length === 0,
        totalRecords,
        details,
        errors: this.errors
      };

    } catch (error) {
      console.error('❌ Seeding failed:', error);
      return {
        success: false,
        totalRecords: 0,
        details: {
          users: 0,
          clients: 0,
          forums: 0,
          cases: 0,
          hearings: 0,
          tasks: 0,
          documents: 0
        },
        errors: [String(error)]
      };
    }
  }
}

export const gstLitigationDataSeeder = new GSTLitigationDataSeeder();
