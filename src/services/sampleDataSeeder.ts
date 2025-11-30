import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface SeedResult {
  success: boolean;
  casesCreated: number;
  hearingsCreated: number;
  tasksCreated: number;
  transitionsCreated: number;
  timelineEntriesCreated: number;
  errors: string[];
}

export interface CleanupResult {
  success: boolean;
  casesDeleted: number;
  hearingsDeleted: number;
  tasksDeleted: number;
  transitionsDeleted: number;
  timelineEntriesDeleted: number;
  documentsDeleted: number;
  errors: string[];
}

class SampleDataSeeder {
  private readonly SAMPLE_PREFIX = 'SAMPLE/';
  private tenantId: string | null = null;
  private userId: string | null = null;

  async initialize(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    this.userId = user.id;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
    
    if (!profile) throw new Error('Profile not found');
    this.tenantId = profile.tenant_id;
  }

  /**
   * Check if sample data exists
   */
  async hasSampleData(): Promise<boolean> {
    if (!this.tenantId) await this.initialize();
    
    const { count } = await supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', this.tenantId!)
      .like('case_number', `${this.SAMPLE_PREFIX}%`);
    
    return (count || 0) > 0;
  }

  /**
   * Cleanup ALL cases and related data (complete reset)
   * WARNING: This deletes ALL cases in tenant, not just sample data!
   */
  async cleanupAllCases(): Promise<CleanupResult> {
    if (!this.tenantId) await this.initialize();
    
    const result: CleanupResult = {
      success: true,
      casesDeleted: 0,
      hearingsDeleted: 0,
      tasksDeleted: 0,
      transitionsDeleted: 0,
      timelineEntriesDeleted: 0,
      documentsDeleted: 0,
      errors: []
    };

    try {
      // Delete in FK dependency order
      // 1. Timeline entries
      const { count: timelineCount } = await supabase
        .from('timeline_entries')
        .delete({ count: 'exact' })
        .eq('tenant_id', this.tenantId!);
      result.timelineEntriesDeleted = timelineCount || 0;

      // 2. Stage transitions
      const { count: transitionsCount } = await supabase
        .from('stage_transitions')
        .delete({ count: 'exact' })
        .eq('tenant_id', this.tenantId!);
      result.transitionsDeleted = transitionsCount || 0;

      // 3. Documents
      const { count: documentsCount } = await supabase
        .from('documents')
        .delete({ count: 'exact' })
        .eq('tenant_id', this.tenantId!);
      result.documentsDeleted = documentsCount || 0;

      // 4. Tasks
      const { count: tasksCount } = await supabase
        .from('tasks')
        .delete({ count: 'exact' })
        .eq('tenant_id', this.tenantId!);
      result.tasksDeleted = tasksCount || 0;

      // 5. Hearings
      const { count: hearingsCount } = await supabase
        .from('hearings')
        .delete({ count: 'exact' })
        .eq('tenant_id', this.tenantId!);
      result.hearingsDeleted = hearingsCount || 0;

      // 6. ALL Cases
      const { count: casesCount } = await supabase
        .from('cases')
        .delete({ count: 'exact' })
        .eq('tenant_id', this.tenantId!);
      result.casesDeleted = casesCount || 0;

    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Cleanup all sample data in correct FK dependency order
   */
  async cleanupSampleData(): Promise<CleanupResult> {
    if (!this.tenantId) await this.initialize();
    
    const result: CleanupResult = {
      success: true,
      casesDeleted: 0,
      hearingsDeleted: 0,
      tasksDeleted: 0,
      transitionsDeleted: 0,
      timelineEntriesDeleted: 0,
      documentsDeleted: 0,
      errors: []
    };

    try {
      // Get all sample case IDs first
      const { data: sampleCases } = await supabase
        .from('cases')
        .select('id')
        .eq('tenant_id', this.tenantId!)
        .like('case_number', `${this.SAMPLE_PREFIX}%`);
      
      if (!sampleCases || sampleCases.length === 0) {
        return result;
      }

      const caseIds = sampleCases.map(c => c.id);

      // Delete in FK dependency order
      // 1. Timeline entries
      const { count: timelineCount } = await supabase
        .from('timeline_entries')
        .delete({ count: 'exact' })
        .in('case_id', caseIds);
      result.timelineEntriesDeleted = timelineCount || 0;

      // 2. Stage transitions
      const { count: transitionsCount } = await supabase
        .from('stage_transitions')
        .delete({ count: 'exact' })
        .in('case_id', caseIds);
      result.transitionsDeleted = transitionsCount || 0;

      // 3. Documents
      const { count: documentsCount } = await supabase
        .from('documents')
        .delete({ count: 'exact' })
        .in('case_id', caseIds);
      result.documentsDeleted = documentsCount || 0;

      // 4. Tasks
      const { count: tasksCount } = await supabase
        .from('tasks')
        .delete({ count: 'exact' })
        .in('case_id', caseIds);
      result.tasksDeleted = tasksCount || 0;

      // 5. Hearings
      const { count: hearingsCount } = await supabase
        .from('hearings')
        .delete({ count: 'exact' })
        .in('case_id', caseIds);
      result.hearingsDeleted = hearingsCount || 0;

      // 6. Cases
      const { count: casesCount } = await supabase
        .from('cases')
        .delete({ count: 'exact' })
        .eq('tenant_id', this.tenantId!)
        .like('case_number', `${this.SAMPLE_PREFIX}%`);
      result.casesDeleted = casesCount || 0;

    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Seed 10 comprehensive sample cases with full lifecycle data
   */
  async seedSampleCases(): Promise<SeedResult> {
    if (!this.tenantId || !this.userId) await this.initialize();
    
    const result: SeedResult = {
      success: true,
      casesCreated: 0,
      hearingsCreated: 0,
      tasksCreated: 0,
      transitionsCreated: 0,
      timelineEntriesCreated: 0,
      errors: []
    };

    try {
      // Fetch master data
      const [clientsRes, employeesRes, courtsRes, issueTypesRes] = await Promise.all([
        supabase.from('clients').select('id, display_name').eq('tenant_id', this.tenantId!).limit(10),
        supabase.from('employees').select('id, full_name').eq('tenant_id', this.tenantId!).limit(5),
        supabase.from('courts').select('id, name, type').eq('tenant_id', this.tenantId!).limit(5),
        supabase.from('issue_types').select('id, name').limit(10)
      ]);

      const clients = clientsRes.data || [];
      const employees = employeesRes.data || [];
      const courts = courtsRes.data || [];
      const issueTypes = issueTypesRes.data || [];

      if (clients.length === 0 || employees.length === 0) {
        result.success = false;
        result.errors.push('Insufficient master data: Need at least 1 client and 1 employee');
        return result;
      }

      // Define 10 comprehensive sample cases
      const sampleCases = this.generateSampleCases(clients, employees, courts, issueTypes);

      // Create cases
      for (const caseData of sampleCases) {
        try {
          const caseId = uuidv4();
          
          // Insert case
          const { error: caseError } = await supabase
            .from('cases')
            .insert({
              id: caseId,
              tenant_id: this.tenantId,
              ...caseData.case
            });

          if (caseError) throw caseError;
          result.casesCreated++;

          // Insert hearings
          for (const hearing of caseData.hearings) {
            const { error: hearingError } = await supabase
              .from('hearings')
              .insert({
                id: uuidv4(),
                tenant_id: this.tenantId,
                case_id: caseId,
                ...hearing
              });
            
            if (!hearingError) result.hearingsCreated++;
          }

          // Insert tasks
          for (const task of caseData.tasks) {
            const { error: taskError } = await supabase
              .from('tasks')
              .insert({
                id: uuidv4(),
                tenant_id: this.tenantId,
                case_id: caseId,
                assigned_by: this.userId,
                ...task
              });
            
            if (!taskError) result.tasksCreated++;
          }

          // Insert stage transitions
          for (const transition of caseData.stageTransitions) {
            const { error: transitionError } = await supabase
              .from('stage_transitions')
              .insert({
                id: uuidv4(),
                tenant_id: this.tenantId,
                case_id: caseId,
                created_by: this.userId,
                ...transition
              });
            
            if (!transitionError) result.transitionsCreated++;
          }

          // Insert timeline entries
          for (const entry of caseData.timelineEntries) {
            const { error: timelineError } = await supabase
              .from('timeline_entries')
              .insert({
                id: uuidv4(),
                tenant_id: this.tenantId,
                case_id: caseId,
                created_by: this.userId,
                created_by_name: 'System',
                ...entry
              });
            
            if (!timelineError) result.timelineEntriesCreated++;
          }

        } catch (error: any) {
          result.errors.push(`Case ${caseData.case.case_number}: ${error.message}`);
        }
      }

    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Full reset: cleanup existing sample data + seed fresh
   */
  async resetSampleData(): Promise<{ cleanup: CleanupResult; seed: SeedResult }> {
    const cleanup = await this.cleanupSampleData();
    const seed = await this.seedSampleCases();
    return { cleanup, seed };
  }

  /**
   * Generate 10 comprehensive sample cases with all lifecycle data
   */
  private generateSampleCases(clients: any[], employees: any[], courts: any[], issueTypes: any[]) {
    const stages = ['Assessment', 'Adjudication', 'First Appeal', 'Tribunal', 'High Court', 'Supreme Court'];
    const priorities = ['High', 'Medium', 'Low'];
    const statuses = ['open', 'in_progress', 'closed'];
    const noticeTypes = ['SCN', 'Demand', 'Assessment', 'Penalty'];

    return Array.from({ length: 10 }, (_, idx) => {
      const caseNum = String(idx + 1).padStart(3, '0');
      const client = clients[idx % clients.length];
      const assignedTo = employees[idx % employees.length];
      const court = courts.length > 0 ? courts[idx % courts.length] : null;
      const issueType = issueTypes.length > 0 ? issueTypes[idx % issueTypes.length]?.name : 'Input Tax Credit Disallowance';
      const stage = stages[idx % stages.length];
      const priority = priorities[idx % priorities.length];
      const status = statuses[idx % statuses.length];
      
      const taxDemand = (idx + 1) * 125000 + Math.floor(Math.random() * 500000);
      const interest = Math.floor(taxDemand * 0.15);
      const penalty = Math.floor(taxDemand * 0.10);

      const noticeDate = new Date(2024, 6 + idx, 15);
      const replyDueDate = new Date(noticeDate);
      replyDueDate.setDate(replyDueDate.getDate() + 15);

      return {
        case: {
          case_number: `${this.SAMPLE_PREFIX}GST/2025/${caseNum}`,
          title: `${client.display_name} - ${issueType}`,
          description: `[SAMPLE DATA] ${issueType} case for ${client.display_name} at ${stage} stage.`,
          client_id: client.id,
          assigned_to: assignedTo.id,
          owner_id: assignedTo.id,
          stage_code: stage,
          priority,
          status,
          notice_type: noticeTypes[idx % noticeTypes.length],
          notice_no: `NOTICE/${2025}/${caseNum}`,
          notice_date: noticeDate.toISOString().split('T')[0],
          reply_due_date: replyDueDate.toISOString().split('T')[0],
          tax_demand: taxDemand,
          interest_amount: interest,
          penalty_amount: penalty,
          total_demand: taxDemand + interest + penalty,
          forum_id: court?.id || null,
          authority_id: court?.id || null,
          city: 'Mumbai',
          case_type: 'GST',
          case_year: '2025',
          case_sequence: caseNum,
          office_file_no: `OFF-${caseNum}/2025`,
          issue_type: issueType,
          form_type: 'ASMT-10',
          section_invoked: 'Section 73',
          financial_year: '2024-25',
          next_hearing_date: new Date(2025, 2 + idx, 10).toISOString()
        },
        hearings: [
          {
            hearing_date: new Date(2024, 8 + idx, 15).toISOString(),
            court_id: court?.id || null,
            status: 'concluded',
            notes: 'First hearing - preliminary discussions',
            outcome: 'Adjournment'
          },
          {
            hearing_date: new Date(2024, 10 + idx, 20).toISOString(),
            court_id: court?.id || null,
            status: 'concluded',
            notes: 'Second hearing - submission of documents',
            outcome: 'Submission Done'
          },
          {
            hearing_date: new Date(2025, 2 + idx, 10).toISOString(),
            court_id: court?.id || null,
            status: 'scheduled',
            notes: 'Final hearing scheduled',
            outcome: null
          }
        ],
        tasks: [
          {
            title: 'Review Notice and Documents',
            description: 'Review SCN and gather supporting documents',
            assigned_to: assignedTo.id,
            status: 'Completed',
            priority: 'High',
            due_date: new Date(2024, 7 + idx, 1).toISOString(),
            completed_date: new Date(2024, 7 + idx, 5).toISOString()
          },
          {
            title: 'Draft Reply to SCN',
            description: 'Prepare detailed reply with legal arguments',
            assigned_to: assignedTo.id,
            status: 'Completed',
            priority: 'High',
            due_date: new Date(2024, 7 + idx, 25).toISOString(),
            completed_date: new Date(2024, 7 + idx, 28).toISOString()
          },
          {
            title: 'File Reply',
            description: 'Submit reply before due date',
            assigned_to: assignedTo.id,
            status: 'Completed',
            priority: 'High',
            due_date: replyDueDate.toISOString(),
            completed_date: replyDueDate.toISOString()
          },
          {
            title: 'Prepare for Hearing',
            description: 'Organize documents and prepare arguments',
            assigned_to: assignedTo.id,
            status: 'In Progress',
            priority: 'Medium',
            due_date: new Date(2025, 2 + idx, 5).toISOString()
          },
          {
            title: 'Follow up with Client',
            description: 'Update client on case progress',
            assigned_to: assignedTo.id,
            status: 'Open',
            priority: 'Low',
            due_date: new Date(2025, 2 + idx, 15).toISOString()
          }
        ],
        stageTransitions: idx > 0 ? [
          {
            from_stage: stages[Math.max(0, (idx % stages.length) - 1)],
            to_stage: stage,
            transition_type: 'Forward',
            comments: `Case progressed to ${stage} after completion of previous stage`,
            created_at: new Date(2024, 9 + idx, 1).toISOString()
          }
        ] : [],
        timelineEntries: [
          {
            type: 'case_created',
            title: 'Case Created',
            description: `Case ${this.SAMPLE_PREFIX}GST/2025/${caseNum} created for ${client.display_name}`,
            created_at: new Date(2024, 6 + idx, 15).toISOString()
          },
          {
            type: 'doc_saved',
            title: 'Notice Uploaded',
            description: 'Show Cause Notice uploaded to case documents',
            created_at: new Date(2024, 6 + idx, 16).toISOString()
          },
          {
            type: 'task_created',
            title: 'Task Assigned',
            description: 'Review Notice and Documents task assigned',
            created_at: new Date(2024, 6 + idx, 17).toISOString()
          },
          {
            type: 'hearing_scheduled',
            title: 'Hearing Scheduled',
            description: 'First hearing scheduled',
            created_at: new Date(2024, 7 + idx, 1).toISOString()
          },
          {
            type: 'task_completed',
            title: 'Task Completed',
            description: 'Reply filing completed successfully',
            created_at: replyDueDate.toISOString()
          }
        ]
      };
    });
  }
}

export const sampleDataSeeder = new SampleDataSeeder();
