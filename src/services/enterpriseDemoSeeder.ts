 /**
  * Enterprise Demo Data Seeder
  * Creates 3 comprehensive case studies with full demo data
  * All data tagged with is_demo=true and demo_batch_id='BEACON_DEMO_V1'
  */
 
 import { supabase } from '@/integrations/supabase/client';
 
 export interface DemoSeedResult {
   success: boolean;
   caseStudy: string;
   recordsCreated: {
     cases: number;
     hearings: number;
     tasks: number;
     documents: number;
     timeline: number;
     communications: number;
     followups: number;
     stageTransitions: number;
   };
   errors: string[];
 }
 
 export interface DemoDataStatus {
   exists: boolean;
   counts: {
     cases: number;
     hearings: number;
     tasks: number;
     documents: number;
     timeline: number;
     communications: number;
     followups: number;
     stageTransitions: number;
   };
   totalRecords: number;
   lastSeeded?: string;
 }
 
 export interface PurgeResult {
   success: boolean;
   deletedCounts: {
     cases: number;
     hearings: number;
     tasks: number;
     documents: number;
     timeline: number;
     communications: number;
     followups: number;
     stageTransitions: number;
   };
   totalDeleted: number;
   errors: string[];
 }
 
 class EnterpriseDemoSeeder {
   private readonly DEMO_BATCH_ID = 'BEACON_DEMO_V1';
   private tenantId: string | null = null;
   private userId: string | null = null;
 
   /**
    * Initialize seeder with tenant and user context
    */
   async initialize(): Promise<boolean> {
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) {
         console.error('No authenticated user found');
         return false;
       }
       this.userId = user.id;
 
       // Get tenant_id from profiles
       const { data: profile, error } = await supabase
         .from('profiles')
         .select('tenant_id')
         .eq('id', user.id)
         .single();
 
       if (error || !profile?.tenant_id) {
         console.error('Failed to get tenant_id:', error);
         return false;
       }
 
       this.tenantId = profile.tenant_id;
       console.log('🏢 Demo seeder initialized:', { tenantId: this.tenantId, userId: this.userId });
       return true;
     } catch (error) {
       console.error('Failed to initialize demo seeder:', error);
       return false;
     }
   }
 
   /**
    * Check for existing demo data
    */
   async checkForExistingDemoData(): Promise<DemoDataStatus> {
     const counts = {
       cases: 0,
       hearings: 0,
       tasks: 0,
       documents: 0,
       timeline: 0,
       communications: 0,
       followups: 0,
       stageTransitions: 0,
     };
 
     try {
       // Count demo records in each table
       const [cases, hearings, tasks, documents, timeline, communications, followups, transitions] = await Promise.all([
         supabase.from('cases').select('id', { count: 'exact', head: true }).eq('demo_batch_id', this.DEMO_BATCH_ID),
         supabase.from('hearings').select('id', { count: 'exact', head: true }).eq('demo_batch_id', this.DEMO_BATCH_ID),
         supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('demo_batch_id', this.DEMO_BATCH_ID),
         supabase.from('documents').select('id', { count: 'exact', head: true }).eq('demo_batch_id', this.DEMO_BATCH_ID),
         supabase.from('timeline_entries').select('id', { count: 'exact', head: true }).eq('demo_batch_id', this.DEMO_BATCH_ID),
         supabase.from('communication_logs').select('id', { count: 'exact', head: true }).eq('demo_batch_id', this.DEMO_BATCH_ID),
         supabase.from('task_followups').select('id', { count: 'exact', head: true }).eq('demo_batch_id', this.DEMO_BATCH_ID),
         supabase.from('stage_transitions').select('id', { count: 'exact', head: true }).eq('demo_batch_id', this.DEMO_BATCH_ID),
       ]);
 
       counts.cases = cases.count || 0;
       counts.hearings = hearings.count || 0;
       counts.tasks = tasks.count || 0;
       counts.documents = documents.count || 0;
       counts.timeline = timeline.count || 0;
       counts.communications = communications.count || 0;
       counts.followups = followups.count || 0;
       counts.stageTransitions = transitions.count || 0;
 
       const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);
 
       return {
         exists: totalRecords > 0,
         counts,
         totalRecords,
       };
     } catch (error) {
       console.error('Error checking demo data:', error);
       return { exists: false, counts, totalRecords: 0 };
     }
   }
 
   /**
    * Get or create a demo client
    */
   private async getOrCreateClient(displayName: string, gstin: string): Promise<string | null> {
     if (!this.tenantId) return null;
 
     // Check if client exists
     const { data: existing } = await supabase
       .from('clients')
       .select('id')
       .eq('tenant_id', this.tenantId)
       .eq('display_name', displayName)
       .single();
 
     if (existing) return existing.id;
 
     // Create new client
     const { data: newClient, error } = await supabase
       .from('clients')
       .insert({
         tenant_id: this.tenantId,
         display_name: displayName,
         gstin: gstin,
         pan: gstin.substring(2, 12),
         status: 'active',
         type: 'company',
         state: 'Maharashtra',
         city: 'Mumbai',
       })
       .select('id')
       .single();
 
     if (error) {
       console.error('Failed to create client:', error);
       return null;
     }
 
     return newClient.id;
   }
 
   /**
    * Generate a unique case number
    */
   private generateCaseNumber(prefix: string): string {
     const year = new Date().getFullYear();
     const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
     return `${prefix}/${year}/${random}`;
   }
 
   /**
    * Seed Case Study 1: Happy Path
    */
   async seedCaseStudy1(): Promise<DemoSeedResult> {
     const result: DemoSeedResult = {
       success: false,
       caseStudy: 'CS1_HAPPY_PATH',
       recordsCreated: {
         cases: 0, hearings: 0, tasks: 0, documents: 0,
         timeline: 0, communications: 0, followups: 0, stageTransitions: 0,
       },
       errors: [],
     };
 
     try {
       if (!await this.initialize()) {
         result.errors.push('Failed to initialize seeder');
         return result;
       }
 
       // Get or create client
       const clientId = await this.getOrCreateClient('Shree Ganesh Textiles Pvt Ltd', '27AABCS1234F1ZS');
       if (!clientId) {
         result.errors.push('Failed to create/get client');
         return result;
       }
 
       // Create case
       const caseData = {
         tenant_id: this.tenantId!,
         client_id: clientId,
         case_number: this.generateCaseNumber('GST-ITC'),
         title: '[DEMO] GST ITC Dispute - Shree Ganesh Textiles',
         description: 'Input Tax Credit dispute for FY 2023-24. Department has raised demand for ITC reversal on grounds of supplier non-compliance.',
         case_type: 'Assessment',
         status: 'Completed',
         priority: 'Medium',
         stage_code: 'ORDER_RECEIVED',
         notice_date: '2025-10-15',
         notice_no: 'DRC-01/2025/1234',
         notice_type: 'DRC-01',
         reply_due_date: '2025-11-15',
         tax_demand: 1250000,
         interest_amount: 125000,
         penalty_amount: 125000,
         total_demand: 1500000,
         financial_year: '2023-24',
         section_invoked: 'Section 16(4)',
         is_demo: true,
         demo_batch_id: this.DEMO_BATCH_ID,
       };
 
       const { data: caseRecord, error: caseError } = await supabase
         .from('cases')
         .insert(caseData)
         .select('id')
         .single();
 
       if (caseError || !caseRecord) {
         result.errors.push(`Case creation failed: ${caseError?.message}`);
         return result;
       }
       result.recordsCreated.cases = 1;
 
       const caseId = caseRecord.id;
 
       // Create hearings
       const hearings = [
         { hearing_type: 'Initial', date: '2025-11-20', outcome: 'Adjourned', remarks: 'Initial hearing, documents reviewed' },
         { hearing_type: 'Argument', date: '2025-12-05', outcome: 'Arguments Completed', remarks: 'Written submissions filed' },
         { hearing_type: 'Final', date: '2025-12-20', outcome: 'Order Reserved', remarks: 'Favorable order expected' },
       ];
 
       for (const h of hearings) {
         const { error } = await supabase.from('hearings').insert({
           tenant_id: this.tenantId!,
           case_id: caseId,
           hearing_date: h.date,
           hearing_type: h.hearing_type,
           outcome: h.outcome,
           remarks: h.remarks,
           status: 'Completed',
           is_demo: true,
           demo_batch_id: this.DEMO_BATCH_ID,
         });
         if (!error) result.recordsCreated.hearings++;
       }
 
       // Create tasks
       const tasks = [
         { title: 'Review SCN and gather documents', status: 'Completed', priority: 'High' },
         { title: 'Draft reply to SCN', status: 'Completed', priority: 'High' },
         { title: 'File reply with department', status: 'Completed', priority: 'High' },
         { title: 'Prepare hearing brief', status: 'Completed', priority: 'Medium' },
         { title: 'Follow-up on order status', status: 'Completed', priority: 'Low' },
         { title: 'Close case and document outcome', status: 'Completed', priority: 'Low' },
       ];
 
       for (const t of tasks) {
         const { error } = await supabase.from('tasks').insert({
           tenant_id: this.tenantId!,
           case_id: caseId,
           title: `[DEMO] ${t.title}`,
           status: t.status,
           priority: t.priority,
           is_demo: true,
           demo_batch_id: this.DEMO_BATCH_ID,
         });
         if (!error) result.recordsCreated.tasks++;
       }
 
       // Create timeline entries
       const timeline = [
        { type: 'notice_received', title: 'Notice Received', description: 'SCN received from department' },
        { type: 'reply_filed', title: 'Reply Filed', description: 'Reply submitted within due date' },
        { type: 'hearing_completed', title: 'Hearings Completed', description: 'All hearings completed successfully' },
        { type: 'order_received', title: 'Order Received', description: 'Favorable order received' },
        { type: 'case_closed', title: 'Case Closed', description: 'Case closed with positive outcome' },
       ];
 
       for (const t of timeline) {
         const { error } = await supabase.from('timeline_entries').insert({
          id: crypto.randomUUID(),
           tenant_id: this.tenantId!,
           case_id: caseId,
          type: t.type,
          title: `[DEMO] ${t.title}`,
           description: `[DEMO] ${t.description}`,
          created_by: this.userId!,
           is_demo: true,
           demo_batch_id: this.DEMO_BATCH_ID,
         });
         if (!error) result.recordsCreated.timeline++;
       }
 
       // Create communication logs
       const communications = [
         { channel: 'email', subject: 'SCN Reply Submission', message: 'Reply submitted to department' },
         { channel: 'call', subject: 'Client Update Call', message: 'Discussed hearing preparation with client' },
         { channel: 'email', subject: 'Order Copy Shared', message: 'Final order shared with client' },
       ];
 
       for (const c of communications) {
         const { error } = await supabase.from('communication_logs').insert({
           tenant_id: this.tenantId!,
           case_id: caseId,
           channel: c.channel,
           subject: `[DEMO] ${c.subject}`,
           message: c.message,
           sent_to: 'client@example.com',
           direction: 'outbound',
           status: 'sent',
           is_demo: true,
           demo_batch_id: this.DEMO_BATCH_ID,
         });
         if (!error) result.recordsCreated.communications++;
       }
 
       // Create stage transitions
       const transitions = [
         { from_stage: 'ASSESSMENT', to_stage: 'REPLY_PENDING', reason: 'SCN received' },
         { from_stage: 'REPLY_PENDING', to_stage: 'ORDER_RECEIVED', reason: 'Favorable order received' },
       ];
 
       for (const t of transitions) {
         const { error } = await supabase.from('stage_transitions').insert({
           tenant_id: this.tenantId!,
           case_id: caseId,
           from_stage: t.from_stage,
           to_stage: t.to_stage,
          transition_type: 'manual',
          comments: `[DEMO] ${t.reason}`,
          created_by: this.userId!,
           is_demo: true,
           demo_batch_id: this.DEMO_BATCH_ID,
         });
         if (!error) result.recordsCreated.stageTransitions++;
       }
 
       result.success = true;
       console.log('✅ Case Study 1 seeded successfully:', result.recordsCreated);
       return result;
 
     } catch (error: any) {
       result.errors.push(error.message);
       return result;
     }
   }
 
   /**
    * Seed Case Study 2: Complex Workflow
    */
   async seedCaseStudy2(): Promise<DemoSeedResult> {
     const result: DemoSeedResult = {
       success: false,
       caseStudy: 'CS2_COMPLEX',
       recordsCreated: {
         cases: 0, hearings: 0, tasks: 0, documents: 0,
         timeline: 0, communications: 0, followups: 0, stageTransitions: 0,
       },
       errors: [],
     };
 
     try {
       if (!await this.initialize()) {
         result.errors.push('Failed to initialize seeder');
         return result;
       }
 
       const clientId = await this.getOrCreateClient('Mehta Industries Group', '27AABCM5678G1ZT');
       if (!clientId) {
         result.errors.push('Failed to create/get client');
         return result;
       }
 
       // Create complex case
       const caseData = {
         tenant_id: this.tenantId!,
         client_id: clientId,
         case_number: this.generateCaseNumber('GST-AUDIT'),
         title: '[DEMO] GST Multi-Year Audit - Mehta Industries',
         description: 'Comprehensive GST audit covering FY 2021-24. Multiple issues identified including ITC mismatch, classification disputes, and valuation questions.',
         case_type: 'Audit',
         status: 'In Progress',
         priority: 'High',
         stage_code: 'FIRST_APPEAL',
         notice_date: '2025-06-01',
         notice_no: 'ASMT-10/2025/5678',
         notice_type: 'ASMT-10',
         reply_due_date: '2025-07-01',
         tax_demand: 8500000,
         interest_amount: 2125000,
         penalty_amount: 850000,
         total_demand: 11475000,
         financial_year: '2021-24',
         section_invoked: 'Section 73/74',
         is_demo: true,
         demo_batch_id: this.DEMO_BATCH_ID,
       };
 
       const { data: caseRecord, error: caseError } = await supabase
         .from('cases')
         .insert(caseData)
         .select('id')
         .single();
 
       if (caseError || !caseRecord) {
         result.errors.push(`Case creation failed: ${caseError?.message}`);
         return result;
       }
       result.recordsCreated.cases = 1;
 
       const caseId = caseRecord.id;
 
       // Create 5 hearings with adjournments
       const hearings = [
         { hearing_type: 'Initial', date: '2025-07-15', outcome: 'Adjourned', remarks: 'Documents pending' },
         { hearing_type: 'Follow-up', date: '2025-08-01', outcome: 'Adjourned', remarks: 'Client requested time' },
         { hearing_type: 'Argument', date: '2025-09-15', outcome: 'Partial Order', remarks: 'Some issues resolved' },
         { hearing_type: 'Adjudication', date: '2025-10-20', outcome: 'Order Passed', remarks: 'Adverse order, appeal planned' },
         { hearing_type: 'Appeal', date: '2025-11-25', outcome: 'Pending', remarks: 'First appeal filed' },
       ];
 
       for (const h of hearings) {
         const { error } = await supabase.from('hearings').insert({
           tenant_id: this.tenantId!,
           case_id: caseId,
           hearing_date: h.date,
           hearing_type: h.hearing_type,
           outcome: h.outcome,
           remarks: h.remarks,
           status: h.outcome === 'Pending' ? 'Scheduled' : 'Completed',
           is_demo: true,
           demo_batch_id: this.DEMO_BATCH_ID,
         });
         if (!error) result.recordsCreated.hearings++;
       }
 
       // Create 10 tasks with various statuses
       const tasks = [
         { title: 'Compile 3-year transaction data', status: 'Completed', priority: 'Critical' },
         { title: 'Reconcile ITC claims with GSTR-2B', status: 'Completed', priority: 'High' },
         { title: 'Draft initial reply to audit query', status: 'Completed', priority: 'High' },
         { title: 'Prepare classification matrix', status: 'Completed', priority: 'Medium' },
         { title: 'Review valuation methodology', status: 'Completed', priority: 'Medium' },
         { title: 'Compile supporting invoices', status: 'Completed', priority: 'High' },
         { title: 'Draft appeal petition', status: 'Completed', priority: 'Critical' },
         { title: 'File first appeal', status: 'Completed', priority: 'Critical' },
         { title: 'Prepare appeal hearing brief', status: 'In Progress', priority: 'High' },
         { title: 'Follow up on appeal status', status: 'Pending', priority: 'Medium' },
       ];
 
       for (const t of tasks) {
         const { error } = await supabase.from('tasks').insert({
           tenant_id: this.tenantId!,
           case_id: caseId,
           title: `[DEMO] ${t.title}`,
           status: t.status,
           priority: t.priority,
           is_demo: true,
           demo_batch_id: this.DEMO_BATCH_ID,
         });
         if (!error) result.recordsCreated.tasks++;
       }
 
       // Create 8 timeline entries
       const timeline = [
        { type: 'audit_initiated', title: 'Audit Initiated', description: 'GST audit initiated by department' },
        { type: 'query_received', title: 'Query Received', description: 'Detailed audit queries received' },
        { type: 'reply_filed', title: 'Reply Filed', description: 'Initial response submitted' },
        { type: 'additional_query', title: 'Additional Query', description: 'Department raised follow-up queries' },
        { type: 'hearing_completed', title: 'Hearing Completed', description: 'Adjudication hearing completed' },
        { type: 'order_received', title: 'Order Received', description: 'Adverse order received' },
        { type: 'appeal_filed', title: 'Appeal Filed', description: 'First appeal filed with Commissioner' },
        { type: 'stay_granted', title: 'Stay Granted', description: 'Partial stay on demand granted' },
       ];
 
       for (const t of timeline) {
         const { error } = await supabase.from('timeline_entries').insert({
          id: crypto.randomUUID(),
           tenant_id: this.tenantId!,
           case_id: caseId,
          type: t.type,
          title: `[DEMO] ${t.title}`,
           description: `[DEMO] ${t.description}`,
          created_by: this.userId!,
           is_demo: true,
           demo_batch_id: this.DEMO_BATCH_ID,
         });
         if (!error) result.recordsCreated.timeline++;
       }
 
       // Create 5 communication logs
       const communications = [
         { channel: 'email', subject: 'Audit Query Response', message: 'Initial response to audit queries' },
         { channel: 'call', subject: 'Strategy Discussion', message: 'Multi-stakeholder call on audit strategy' },
         { channel: 'meeting', subject: 'Client Review Meeting', message: 'Reviewed audit findings with client CFO' },
         { channel: 'email', subject: 'Appeal Filing Confirmation', message: 'Confirmed appeal filing with acknowledgement' },
         { channel: 'call', subject: 'Stay Application Update', message: 'Updated client on stay order status' },
       ];
 
       for (const c of communications) {
         const { error } = await supabase.from('communication_logs').insert({
           tenant_id: this.tenantId!,
           case_id: caseId,
           channel: c.channel,
           subject: `[DEMO] ${c.subject}`,
           message: c.message,
           sent_to: 'cfo@mehtaindustries.com',
           direction: 'outbound',
           status: 'sent',
           is_demo: true,
           demo_batch_id: this.DEMO_BATCH_ID,
         });
         if (!error) result.recordsCreated.communications++;
       }
 
       // Create 4 stage transitions
       const transitions = [
         { from_stage: 'AUDIT_INITIATED', to_stage: 'QUERY_PENDING', reason: 'Audit queries received' },
         { from_stage: 'QUERY_PENDING', to_stage: 'ADJUDICATION', reason: 'Matter escalated to adjudication' },
         { from_stage: 'ADJUDICATION', to_stage: 'ORDER_RECEIVED', reason: 'Adverse order passed' },
         { from_stage: 'ORDER_RECEIVED', to_stage: 'FIRST_APPEAL', reason: 'Appeal filed against order' },
       ];
 
       for (const t of transitions) {
         const { error } = await supabase.from('stage_transitions').insert({
           tenant_id: this.tenantId!,
           case_id: caseId,
           from_stage: t.from_stage,
           to_stage: t.to_stage,
          transition_type: 'manual',
          comments: `[DEMO] ${t.reason}`,
          created_by: this.userId!,
           is_demo: true,
           demo_batch_id: this.DEMO_BATCH_ID,
         });
         if (!error) result.recordsCreated.stageTransitions++;
       }
 
       result.success = true;
       console.log('✅ Case Study 2 seeded successfully:', result.recordsCreated);
       return result;
 
     } catch (error: any) {
       result.errors.push(error.message);
       return result;
     }
   }
 
   /**
    * Seed Case Study 3: Risk & Exception Handling
    */
   async seedCaseStudy3(): Promise<DemoSeedResult> {
     const result: DemoSeedResult = {
       success: false,
       caseStudy: 'CS3_EXCEPTION',
       recordsCreated: {
         cases: 0, hearings: 0, tasks: 0, documents: 0,
         timeline: 0, communications: 0, followups: 0, stageTransitions: 0,
       },
       errors: [],
     };
 
     try {
       if (!await this.initialize()) {
         result.errors.push('Failed to initialize seeder');
         return result;
       }
 
       const clientId = await this.getOrCreateClient('Sunrise Exports Ltd', '27AABCS9012H1ZU');
       if (!clientId) {
         result.errors.push('Failed to create/get client');
         return result;
       }
 
       // Create high-risk case
       const caseData = {
         tenant_id: this.tenantId!,
         client_id: clientId,
         case_number: this.generateCaseNumber('GST-FRAUD'),
         title: '[DEMO] Fake Invoice Investigation - Sunrise Exports',
         description: 'Investigation regarding alleged fake invoice transactions. Department claims ITC availed on invoices from non-existent suppliers.',
         case_type: 'Investigation',
         status: 'Completed',
         priority: 'Critical',
         stage_code: 'RESOLVED',
         notice_date: '2025-03-01',
         notice_no: 'DGGI/INV/2025/9012',
         notice_type: 'Summons',
         reply_due_date: '2025-03-15',
         tax_demand: 25000000,
         interest_amount: 7500000,
         penalty_amount: 25000000,
         total_demand: 57500000,
         financial_year: '2022-23',
         section_invoked: 'Section 74/122',
         is_demo: true,
         demo_batch_id: this.DEMO_BATCH_ID,
       };
 
       const { data: caseRecord, error: caseError } = await supabase
         .from('cases')
         .insert(caseData)
         .select('id')
         .single();
 
       if (caseError || !caseRecord) {
         result.errors.push(`Case creation failed: ${caseError?.message}`);
         return result;
       }
       result.recordsCreated.cases = 1;
 
       const caseId = caseRecord.id;
 
       // Create 4 hearings with missed flags
       const hearings = [
         { hearing_type: 'Investigation', date: '2025-03-20', outcome: 'Statement Recorded', remarks: 'Director statement recorded' },
         { hearing_type: 'SCN Response', date: '2025-05-01', outcome: 'Extension Granted', remarks: 'COVID-related delay' },
         { hearing_type: 'Personal Hearing', date: '2025-06-15', outcome: 'On Hold', remarks: 'Case put on hold pending investigation' },
         { hearing_type: 'Resolution', date: '2025-09-01', outcome: 'Settled', remarks: 'Partial settlement reached' },
       ];
 
       for (const h of hearings) {
         const { error } = await supabase.from('hearings').insert({
           tenant_id: this.tenantId!,
           case_id: caseId,
           hearing_date: h.date,
           hearing_type: h.hearing_type,
           outcome: h.outcome,
           remarks: h.remarks,
           status: 'Completed',
           is_demo: true,
           demo_batch_id: this.DEMO_BATCH_ID,
         });
         if (!error) result.recordsCreated.hearings++;
       }
 
       // Create 8 tasks including overdue and escalated
       const tasks = [
         { title: 'Respond to summons urgently', status: 'Completed', priority: 'Critical' },
         { title: 'Prepare statement for director', status: 'Completed', priority: 'Critical' },
         { title: 'Compile supplier verification docs', status: 'Completed', priority: 'High' },
         { title: 'Engage forensic accountant', status: 'Completed', priority: 'High' },
         { title: 'Draft reply to SCN', status: 'Completed', priority: 'Critical' },
         { title: 'Escalate to senior partner', status: 'Completed', priority: 'Critical' },
         { title: 'Negotiate settlement terms', status: 'Completed', priority: 'High' },
         { title: 'Document resolution and learnings', status: 'Completed', priority: 'Medium' },
       ];
 
       for (const t of tasks) {
         const { error } = await supabase.from('tasks').insert({
           tenant_id: this.tenantId!,
           case_id: caseId,
           title: `[DEMO] ${t.title}`,
           status: t.status,
           priority: t.priority,
           is_demo: true,
           demo_batch_id: this.DEMO_BATCH_ID,
         });
         if (!error) result.recordsCreated.tasks++;
       }
 
       // Create 6 timeline entries
       const timeline = [
        { type: 'investigation_started', title: 'Investigation Started', description: 'DGGI investigation initiated' },
        { type: 'summons_received', title: 'Summons Received', description: 'Summons issued to director' },
        { type: 'escalation', title: 'Escalation', description: 'Matter escalated to senior partner' },
        { type: 'on_hold', title: 'On Hold', description: 'Case put on hold pending supplier verification' },
        { type: 'settlement_initiated', title: 'Settlement Initiated', description: 'Settlement discussions began' },
        { type: 'resolved', title: 'Resolved', description: 'Case resolved with partial settlement' },
       ];
 
       for (const t of timeline) {
         const { error } = await supabase.from('timeline_entries').insert({
          id: crypto.randomUUID(),
           tenant_id: this.tenantId!,
           case_id: caseId,
          type: t.type,
          title: `[DEMO] ${t.title}`,
           description: `[DEMO] ${t.description}`,
          created_by: this.userId!,
           is_demo: true,
           demo_batch_id: this.DEMO_BATCH_ID,
         });
         if (!error) result.recordsCreated.timeline++;
       }
 
       // Create 4 communication logs
       const communications = [
         { channel: 'call', subject: 'Urgent Client Alert', message: 'Notified client of investigation' },
         { channel: 'meeting', subject: 'Crisis Strategy Meeting', message: 'Emergency meeting with client leadership' },
         { channel: 'email', subject: 'Settlement Proposal', message: 'Formal settlement proposal submitted' },
         { channel: 'email', subject: 'Resolution Confirmation', message: 'Confirmed settlement and closure terms' },
       ];
 
       for (const c of communications) {
         const { error } = await supabase.from('communication_logs').insert({
           tenant_id: this.tenantId!,
           case_id: caseId,
           channel: c.channel,
           subject: `[DEMO] ${c.subject}`,
           message: c.message,
           sent_to: 'md@sunriseexports.com',
           direction: 'outbound',
           status: 'sent',
           is_demo: true,
           demo_batch_id: this.DEMO_BATCH_ID,
         });
         if (!error) result.recordsCreated.communications++;
       }
 
       // Create 3 stage transitions
       const transitions = [
         { from_stage: 'INVESTIGATION', to_stage: 'SCN_ISSUED', reason: 'SCN issued post investigation' },
         { from_stage: 'SCN_ISSUED', to_stage: 'ON_HOLD', reason: 'Case put on hold for supplier verification' },
         { from_stage: 'ON_HOLD', to_stage: 'RESOLVED', reason: 'Settlement reached and case closed' },
       ];
 
       for (const t of transitions) {
         const { error } = await supabase.from('stage_transitions').insert({
           tenant_id: this.tenantId!,
           case_id: caseId,
           from_stage: t.from_stage,
           to_stage: t.to_stage,
          transition_type: 'manual',
          comments: `[DEMO] ${t.reason}`,
          created_by: this.userId!,
           is_demo: true,
           demo_batch_id: this.DEMO_BATCH_ID,
         });
         if (!error) result.recordsCreated.stageTransitions++;
       }
 
       result.success = true;
       console.log('✅ Case Study 3 seeded successfully:', result.recordsCreated);
       return result;
 
     } catch (error: any) {
       result.errors.push(error.message);
       return result;
     }
   }
 
   /**
    * Seed all 3 case studies
    */
   async seedAll(): Promise<{ success: boolean; results: DemoSeedResult[]; errors: string[] }> {
     console.log('🚀 Starting Enterprise Demo Data Seeding...');
     const results: DemoSeedResult[] = [];
     const errors: string[] = [];
 
     try {
       const cs1 = await this.seedCaseStudy1();
       results.push(cs1);
       if (!cs1.success) errors.push(...cs1.errors);
 
       const cs2 = await this.seedCaseStudy2();
       results.push(cs2);
       if (!cs2.success) errors.push(...cs2.errors);
 
       const cs3 = await this.seedCaseStudy3();
       results.push(cs3);
       if (!cs3.success) errors.push(...cs3.errors);
 
       const allSuccess = results.every(r => r.success);
       console.log(`📊 Seeding complete. Success: ${allSuccess}, Errors: ${errors.length}`);
 
       return { success: allSuccess, results, errors };
     } catch (error: any) {
       errors.push(error.message);
       return { success: false, results, errors };
     }
   }
 
   /**
    * Purge all demo data with FK-aware deletion order
    */
   async purgeAllDemoData(): Promise<PurgeResult> {
     console.log('🧹 Starting demo data purge...');
     const result: PurgeResult = {
       success: false,
       deletedCounts: {
         cases: 0, hearings: 0, tasks: 0, documents: 0,
         timeline: 0, communications: 0, followups: 0, stageTransitions: 0,
       },
       totalDeleted: 0,
       errors: [],
     };
 
     try {
       // Delete in FK dependency order (children first)
       const tables = [
         { name: 'task_followups', key: 'followups' as const },
         { name: 'communication_logs', key: 'communications' as const },
         { name: 'timeline_entries', key: 'timeline' as const },
         { name: 'stage_transitions', key: 'stageTransitions' as const },
         { name: 'documents', key: 'documents' as const },
         { name: 'tasks', key: 'tasks' as const },
         { name: 'hearings', key: 'hearings' as const },
         { name: 'cases', key: 'cases' as const },
       ];
 
       for (const table of tables) {
         const { data, error } = await supabase
           .from(table.name as any)
           .delete()
           .eq('demo_batch_id', this.DEMO_BATCH_ID)
           .select('id');
 
         if (error) {
           result.errors.push(`Failed to delete from ${table.name}: ${error.message}`);
         } else {
           result.deletedCounts[table.key] = data?.length || 0;
         }
       }
 
       result.totalDeleted = Object.values(result.deletedCounts).reduce((a, b) => a + b, 0);
       result.success = result.errors.length === 0;
 
       console.log('✅ Purge complete:', result.deletedCounts);
       return result;
 
     } catch (error: any) {
       result.errors.push(error.message);
       return result;
     }
   }
 }
 
 export const enterpriseDemoSeeder = new EnterpriseDemoSeeder();