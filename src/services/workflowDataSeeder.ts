import { supabase } from '@/integrations/supabase/client';
import workflowMockData from '@/data/seedData/gstLitigationWorkflowMockData.json';

interface SeedResult {
  success: boolean;
  message: string;
  breakdown: {
    cases: number;
    hearings: number;
    tasks: number;
    documents: number;
  };
  errors: string[];
  duplicatesFound?: boolean;
  existingData?: {
    cases: number;
    hearings: number;
    tasks: number;
  };
}

export class WorkflowDataSeeder {
  private tenantId: string | null = null;
  private clientMap = new Map<string, string>();
  private employeeMap = new Map<string, string>();
  private courtMap = new Map<string, string>();
  private caseMap = new Map<string, string>();

  async initialize(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    this.tenantId = profile.tenant_id;
    console.log('[WorkflowSeeder] Initialized with tenant:', this.tenantId);

    // Build lookup maps for existing master data
    await this.buildLookupMaps();
  }

  private async buildLookupMaps(): Promise<void> {
    // Map clients by display_name
    const { data: clients } = await supabase
      .from('clients')
      .select('id, display_name')
      .eq('tenant_id', this.tenantId!);

    if (clients) {
      clients.forEach(c => this.clientMap.set(c.display_name, c.id));
      console.log('[WorkflowSeeder] Mapped clients:', this.clientMap.size);
    }

    // Map employees by employee_code (or email as fallback)
    const { data: employees } = await supabase
      .from('employees')
      .select('id, employee_code, email')
      .eq('tenant_id', this.tenantId!);

    if (employees) {
      employees.forEach(e => {
        // Try to match by role name pattern
        if (e.email.includes('ritesh')) this.employeeMap.set('CA Ritesh Shah', e.id);
        if (e.email.includes('yash')) this.employeeMap.set('Adv. Yash Doshi', e.id);
        if (e.email.includes('neha')) this.employeeMap.set('Staff Neha Patel', e.id);
        this.employeeMap.set(e.employee_code, e.id);
      });
      console.log('[WorkflowSeeder] Mapped employees:', this.employeeMap.size);
    }

    // Map courts by name
    const { data: courts } = await supabase
      .from('courts')
      .select('id, name')
      .eq('tenant_id', this.tenantId!);

    if (courts) {
      courts.forEach(c => this.courtMap.set(c.name, c.id));
      console.log('[WorkflowSeeder] Mapped courts:', this.courtMap.size);
    }
  }

  async checkExistingData(): Promise<{ cases: number; hearings: number; tasks: number }> {
    const { data: cases } = await supabase
      .from('cases')
      .select('id', { count: 'exact' })
      .eq('tenant_id', this.tenantId!)
      .limit(1);

    const { data: hearings } = await supabase
      .from('hearings')
      .select('id', { count: 'exact' })
      .eq('tenant_id', this.tenantId!)
      .limit(1);

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id', { count: 'exact' })
      .eq('tenant_id', this.tenantId!)
      .limit(1);

    return {
      cases: cases?.length || 0,
      hearings: hearings?.length || 0,
      tasks: tasks?.length || 0,
    };
  }

  async seedCases(): Promise<number> {
    const mockCases = workflowMockData.workflow_data.cases;
    let seededCount = 0;

    console.log(`[WorkflowSeeder] Seeding ${mockCases.length} cases...`);

    for (const mockCase of mockCases) {
      const clientId = this.clientMap.get(mockCase.client_ref);
      const assignedToId = this.employeeMap.get(mockCase.assigned_to_ref);
      const forumId = this.courtMap.get(mockCase.forum_ref);

      if (!clientId) {
        console.warn(`[WorkflowSeeder] Client not found: ${mockCase.client_ref}`);
        continue;
      }

      const caseData = {
        tenant_id: this.tenantId!,
        case_number: mockCase.case_number,
        title: mockCase.title,
        client_id: clientId,
        stage_code: mockCase.stage_code,
        notice_type: mockCase.notice_type,
        notice_no: mockCase.notice_no,
        notice_date: mockCase.notice_date,
        tax_demand: mockCase.tax_demand,
        priority: mockCase.priority,
        status: mockCase.status,
        description: mockCase.description,
        forum_id: forumId,
        authority_id: forumId, // Using same as forum for simplicity
        assigned_to: assignedToId,
        owner_id: assignedToId,
        next_hearing_date: mockCase.next_hearing_date,
      };

      const { data, error } = await supabase
        .from('cases')
        .insert(caseData)
        .select('id')
        .single();

      if (error) {
        console.error(`[WorkflowSeeder] Failed to seed case ${mockCase.case_number}:`, error);
      } else if (data) {
        this.caseMap.set(mockCase.id, data.id);
        seededCount++;
      }
    }

    console.log(`[WorkflowSeeder] Seeded ${seededCount} cases`);
    return seededCount;
  }

  async seedHearings(): Promise<number> {
    const mockHearings = workflowMockData.workflow_data.hearings;
    let seededCount = 0;

    console.log(`[WorkflowSeeder] Seeding ${mockHearings.length} hearings...`);

    for (const mockHearing of mockHearings) {
      const caseId = this.caseMap.get(mockHearing.case_ref);
      const courtId = this.courtMap.get(mockHearing.court_ref);

      if (!caseId) {
        console.warn(`[WorkflowSeeder] Case not found: ${mockHearing.case_ref}`);
        continue;
      }

      const hearingData = {
        tenant_id: this.tenantId!,
        case_id: caseId,
        hearing_date: mockHearing.hearing_date,
        next_hearing_date: mockHearing.next_hearing_date,
        court_id: courtId,
        court_name: mockHearing.court_ref,
        judge_name: mockHearing.judge_name,
        status: mockHearing.status,
        outcome: mockHearing.outcome,
        notes: mockHearing.notes,
      };

      const { error } = await supabase
        .from('hearings')
        .insert(hearingData);

      if (error) {
        console.error('[WorkflowSeeder] Failed to seed hearing:', error);
      } else {
        seededCount++;
      }
    }

    console.log(`[WorkflowSeeder] Seeded ${seededCount} hearings`);
    return seededCount;
  }

  async seedTasks(): Promise<number> {
    const mockTasks = workflowMockData.workflow_data.tasks;
    let seededCount = 0;

    console.log(`[WorkflowSeeder] Seeding ${mockTasks.length} tasks...`);

    for (const mockTask of mockTasks) {
      const caseId = this.caseMap.get(mockTask.case_ref);
      const assignedToId = this.employeeMap.get(mockTask.assigned_to_ref);

      if (!caseId) {
        console.warn(`[WorkflowSeeder] Case not found for task: ${mockTask.case_ref}`);
        continue;
      }

      const taskData = {
        tenant_id: this.tenantId!,
        case_id: caseId,
        title: mockTask.title,
        description: mockTask.description,
        status: mockTask.status,
        priority: mockTask.priority,
        assigned_to: assignedToId,
        due_date: mockTask.due_date,
      };

      const { error } = await supabase
        .from('tasks')
        .insert(taskData);

      if (error) {
        console.error('[WorkflowSeeder] Failed to seed task:', error);
      } else {
        seededCount++;
      }
    }

    console.log(`[WorkflowSeeder] Seeded ${seededCount} tasks`);
    return seededCount;
  }

  async seedAll(skipDuplicateCheck = false): Promise<SeedResult> {
    const result: SeedResult = {
      success: false,
      message: '',
      breakdown: {
        cases: 0,
        hearings: 0,
        tasks: 0,
        documents: 0,
      },
      errors: [],
    };

    try {
      await this.initialize();

      // Check for existing data
      if (!skipDuplicateCheck) {
        const existing = await this.checkExistingData();
        const hasExistingData = existing.cases > 0 || existing.hearings > 0 || existing.tasks > 0;

        if (hasExistingData) {
          result.duplicatesFound = true;
          result.existingData = existing;
          result.message = 'Existing workflow data found. Please confirm to proceed with seeding.';
          return result;
        }
      }

      // Seed in order: cases → hearings → tasks
      result.breakdown.cases = await this.seedCases();
      result.breakdown.hearings = await this.seedHearings();
      result.breakdown.tasks = await this.seedTasks();

      const totalSeeded = result.breakdown.cases + result.breakdown.hearings + 
                          result.breakdown.tasks + result.breakdown.documents;

      result.success = totalSeeded > 0;
      result.message = result.success
        ? `Successfully seeded ${totalSeeded} workflow records: ${result.breakdown.cases} cases, ${result.breakdown.hearings} hearings, ${result.breakdown.tasks} tasks`
        : 'No workflow data was seeded. Please check master data exists.';

    } catch (error) {
      console.error('[WorkflowSeeder] Seeding failed:', error);
      result.success = false;
      result.message = 'Failed to seed workflow data';
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }
}

export const workflowDataSeeder = new WorkflowDataSeeder();
