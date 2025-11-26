/**
 * Comprehensive Seed Data Service for GST Case Mix
 * Generates realistic test data across various GST case types, stages, and complexity levels
 */

import { GST_STAGES, GSTStage, GSTNoticeType, ClientTier } from '../../config/appConfig';

export interface GSTCaseProfile {
  type: GSTCaseType;
  complexity: CaseComplexity;
  industry: Industry;
  geoState: string;
  disputeAmount: number;
  currentStage: GSTStage;
  timeline: TimelineEvent[];
  documents: DocumentProfile[];
  tasks: TaskProfile[];
}

export type GSTCaseType = 
  | 'ITC_DISPUTE' 
  | 'IGST_REFUND' 
  | 'COMPLIANCE_ISSUE' 
  | 'PENALTY_CASE' 
  | 'DEMAND_NOTICE' 
  | 'APPEAL_MATTER' 
  | 'GSTAT_PROCEEDING';

export type CaseComplexity = 'SIMPLE' | 'MEDIUM' | 'COMPLEX';

export type Industry = 
  | 'MANUFACTURING' 
  | 'SERVICES' 
  | 'TRADING' 
  | 'ECOMMERCE' 
  | 'LOGISTICS' 
  | 'SEZ';

export interface TimelineEvent {
  date: string;
  stage: GSTStage;
  event: string;
  description: string;
  documentIds?: string[];
}

export interface DocumentProfile {
  type: DocumentType;
  name: string;
  stage: GSTStage;
  required: boolean;
  uploaded: boolean;
  fileSize?: number;
}

export interface TaskProfile {
  title: string;
  stage: GSTStage;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Completed' | 'Overdue';
  dueDate: string;
  estimatedHours: number;
}

export type DocumentType = 
  | 'SCN' 
  | 'REPLY_TO_SCN' 
  | 'DEMAND_ORDER' 
  | 'APPEAL_MEMO' 
  | 'SUPPORTING_DOCS' 
  | 'EVIDENCE_FILES' 
  | 'HEARING_NOTICE' 
  | 'ORDER_COPY';

class SeedDataService {
  private readonly SEED_DATA_KEY = 'comprehensive-seed-data';
  private readonly GST_CASES_KEY = 'gst-cases-seed';

  async generateComprehensiveSeedData(): Promise<void> {
    console.log('[SeedData] Generating comprehensive GST case mix with task bundles...');
    
    const clients = await this.generateClientProfiles();
    const cases = await this.generateGSTCases(clients);
    const documents = cases.map(caseProfile => this.generateDocuments(caseProfile.type));
    const tasks = cases.map(caseProfile => this.generateTasks(caseProfile.type, caseProfile.complexity));
    
    // Generate comprehensive task bundles
    await this.generateTaskBundles();
    
    await Promise.all([
      this.saveClients(clients),
      this.saveCases(cases),
      this.saveDocuments(documents),
      this.saveTasks(tasks)
    ]);

    console.log(`[SeedData] Generated ${cases.length} GST cases, ${clients.length} clients, and comprehensive task bundles`);
  }

  private async generateClientProfiles() {
    const industries: Industry[] = ['MANUFACTURING', 'SERVICES', 'TRADING', 'ECOMMERCE', 'LOGISTICS', 'SEZ'];
    const states = ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Delhi', 'West Bengal'];
    const tiers: ClientTier[] = ['Tier 1', 'Tier 2', 'Tier 3'];

    return Array.from({ length: 25 }, (_, i) => ({
      id: `client_${i + 1}`,
      name: this.generateClientName(industries[i % industries.length]),
      gstin: this.generateGSTIN(states[i % states.length]),
      industry: industries[i % industries.length],
      state: states[i % states.length],
      tier: tiers[i % tiers.length],
      businessType: this.getBusinessType(industries[i % industries.length]),
      complianceLevel: this.getComplianceLevel(),
      turnover: this.generateTurnover(tiers[i % tiers.length])
    }));
  }

  private async generateGSTCases(clients: any[]): Promise<GSTCaseProfile[]> {
    const caseTypes: GSTCaseType[] = ['ITC_DISPUTE', 'IGST_REFUND', 'COMPLIANCE_ISSUE', 'PENALTY_CASE', 'DEMAND_NOTICE', 'APPEAL_MATTER', 'GSTAT_PROCEEDING'];
    const complexities: CaseComplexity[] = ['SIMPLE', 'MEDIUM', 'COMPLEX'];
    
    const cases: GSTCaseProfile[] = [];

    // Generate 60 cases with realistic distribution
    for (let i = 0; i < 60; i++) {
      const client = clients[i % clients.length];
      const caseType = caseTypes[i % caseTypes.length];
      const complexity = complexities[i % complexities.length];
      
      const caseProfile: GSTCaseProfile = {
        type: caseType,
        complexity,
        industry: client.industry,
        geoState: client.state,
        disputeAmount: this.generateDisputeAmount(complexity),
        currentStage: this.assignCurrentStage(caseType, complexity),
        timeline: await this.generateTimeline(caseType, complexity),
        documents: this.generateDocuments(caseType),
        tasks: this.generateTasks(caseType, complexity)
      };

      cases.push(caseProfile);
    }

    return cases;
  }

  private generateDisputeAmount(complexity: CaseComplexity): number {
    switch (complexity) {
      case 'SIMPLE': return Math.floor(Math.random() * 50000) + 10000; // ₹10K-₹50K
      case 'MEDIUM': return Math.floor(Math.random() * 1500000) + 500000; // ₹5L-₹20L
      case 'COMPLEX': return Math.floor(Math.random() * 4500000) + 5000000; // ₹50L+
    }
  }

  private assignCurrentStage(caseType: GSTCaseType, complexity: CaseComplexity): GSTStage {
    // Realistic stage distribution based on case type and complexity using actual GST stages
    const stageWeights = {
      'ITC_DISPUTE': { 'ASMT-10 Notice Received': 0.3, 'DRC-01 SCN Received': 0.4, 'Hearing Scheduled': 0.2, 'Appeal Filed – APL-01': 0.1 },
      'IGST_REFUND': { 'ASMT-10 Notice Received': 0.4, 'DRC-01 SCN Received': 0.3, 'Hearing Scheduled': 0.2, 'Appeal Filed – APL-01': 0.1 },
      'PENALTY_CASE': { 'DRC-01 SCN Received': 0.3, 'Hearing Scheduled': 0.4, 'Appeal Filed – APL-01': 0.2, 'Appeal Hearing': 0.1 },
      'APPEAL_MATTER': { 'Appeal Filed – APL-01': 0.6, 'Appeal Hearing': 0.4 },
      'GSTAT_PROCEEDING': { 'Appeal Hearing': 1.0 }
    };

    const weights = stageWeights[caseType] || stageWeights['ITC_DISPUTE'];
    const stages = Object.keys(weights) as GSTStage[];
    const randomValue = Math.random();
    
    let cumulativeWeight = 0;
    for (const stage of stages) {
      cumulativeWeight += weights[stage];
      if (randomValue <= cumulativeWeight) {
        return stage;
      }
    }
    
    return stages[0];
  }

  private async generateTimeline(caseType: GSTCaseType, complexity: CaseComplexity): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 12)); // Cases from last year

    // Generate realistic timeline based on case progression
    const timelineTemplates = {
      'ITC_DISPUTE': [
        { stage: 'ASMT-10 Notice Received' as GSTStage, event: 'Case Initiated', description: 'ITC dispute case filed' },
        { stage: 'ASMT-10 Notice Received' as GSTStage, event: 'SCN Issued', description: 'Show Cause Notice issued for ITC reversal' },
        { stage: 'DRC-01 SCN Received' as GSTStage, event: 'Reply Filed', description: 'Comprehensive reply submitted with supporting documents' }
      ],
      'PENALTY_CASE': [
        { stage: 'DRC-01 SCN Received' as GSTStage, event: 'Penalty Notice', description: 'Penalty proceedings initiated' },
        { stage: 'Hearing Scheduled' as GSTStage, event: 'Hearing Scheduled', description: 'Personal hearing scheduled' },
        { stage: 'Hearing Scheduled' as GSTStage, event: 'Arguments Presented', description: 'Detailed arguments presented before adjudicating authority' }
      ]
    };

    const template = timelineTemplates[caseType] || timelineTemplates['ITC_DISPUTE'];
    
    template.forEach((event, index) => {
      const eventDate = new Date(startDate);
      eventDate.setDate(eventDate.getDate() + (index * 30)); // 30 days between events
      
      events.push({
        date: eventDate.toISOString(),
        stage: event.stage,
        event: event.event,
        description: event.description,
        documentIds: [`doc_${Math.random().toString(36).substr(2, 9)}`]
      });
    });

    return events;
  }

  private generateDocuments(caseType: GSTCaseType): DocumentProfile[] {
    const documentTemplates = {
      'ITC_DISPUTE': [
        { type: 'SCN' as DocumentType, name: 'Show Cause Notice - ITC Reversal', required: true, uploaded: true },
        { type: 'REPLY_TO_SCN' as DocumentType, name: 'Reply to SCN with Legal Grounds', required: true, uploaded: false },
        { type: 'SUPPORTING_DOCS' as DocumentType, name: 'Invoice Copies and ITC Details', required: true, uploaded: true }
      ],
      'PENALTY_CASE': [
        { type: 'DEMAND_ORDER' as DocumentType, name: 'Penalty Demand Order', required: true, uploaded: true },
        { type: 'APPEAL_MEMO' as DocumentType, name: 'Appeal Memorandum', required: true, uploaded: false },
        { type: 'EVIDENCE_FILES' as DocumentType, name: 'Supporting Evidence Documents', required: true, uploaded: true }
      ]
    };

    const template = documentTemplates[caseType] || documentTemplates['ITC_DISPUTE'];
    
    return template.map(doc => ({
      ...doc,
      stage: 'ASMT-10 Notice Received' as GSTStage,
      fileSize: doc.uploaded ? Math.floor(Math.random() * 5000000) + 100000 : undefined // 100KB - 5MB
    }));
  }

  private generateTasks(caseType: GSTCaseType, complexity: CaseComplexity): TaskProfile[] {
    const baseDate = new Date();
    
    const taskTemplates = {
      'ITC_DISPUTE': [
        { title: 'Review SCN and identify key issues', priority: 'High' as const, estimatedHours: 4 },
        { title: 'Gather supporting invoice documentation', priority: 'Medium' as const, estimatedHours: 6 },
        { title: 'Draft comprehensive reply with legal citations', priority: 'High' as const, estimatedHours: 8 },
        { title: 'File reply within statutory timeline', priority: 'High' as const, estimatedHours: 2 }
      ],
      'PENALTY_CASE': [
        { title: 'Analyze penalty calculation methodology', priority: 'High' as const, estimatedHours: 3 },
        { title: 'Prepare grounds for penalty waiver', priority: 'Medium' as const, estimatedHours: 5 },
        { title: 'Schedule personal hearing', priority: 'Medium' as const, estimatedHours: 1 },
        { title: 'Present arguments at hearing', priority: 'High' as const, estimatedHours: 4 }
      ]
    };

    const template = taskTemplates[caseType] || taskTemplates['ITC_DISPUTE'];
    
    return template.map((task, index) => {
      const dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() + (index * 7) + Math.floor(Math.random() * 14)); // 1-3 weeks
      
      const statuses = ['Open', 'In Progress', 'Completed', 'Overdue'] as const;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      return {
        ...task,
        stage: 'ASMT-10 Notice Received' as GSTStage,
        status,
        dueDate: dueDate.toISOString()
      };
    });
  }

  private generateClientName(industry: Industry): string {
    const prefixes = {
      'MANUFACTURING': ['Tech Industries', 'Manufacturing Co', 'Industries Ltd', 'Auto Parts'],
      'SERVICES': ['Consulting Services', 'Tech Solutions', 'Business Services', 'Professional Services'],
      'TRADING': ['Trading Company', 'Distributors', 'Merchants', 'Suppliers'],
      'ECOMMERCE': ['E-Commerce Pvt Ltd', 'Online Retail', 'Digital Commerce', 'Marketplace'],
      'LOGISTICS': ['Logistics Pvt Ltd', 'Transport Services', 'Supply Chain', 'Freight Services'],
      'SEZ': ['SEZ Enterprises', 'Export Industries', 'Special Economic Zone', 'Export Manufacturing']
    };
    
    const names = prefixes[industry];
    const cityNames = ['Mumbai', 'Bangalore', 'Chennai', 'Delhi', 'Pune', 'Hyderabad'];
    
    return `${cityNames[Math.floor(Math.random() * cityNames.length)]} ${names[Math.floor(Math.random() * names.length)]}`;
  }

  private generateGSTIN(state: string): string {
    const stateCodes = {
      'Maharashtra': '27',
      'Karnataka': '29',
      'Tamil Nadu': '33',
      'Gujarat': '24',
      'Delhi': '07',
      'West Bengal': '19'
    };
    
    const stateCode = stateCodes[state] || '27';
    const panLike = Math.random().toString(36).substr(2, 10).toUpperCase();
    const entityCode = '1';
    const checkDigit = 'Z';
    const defaultCode = '5';
    
    return `${stateCode}${panLike}${entityCode}${checkDigit}${defaultCode}`;
  }

  private getBusinessType(industry: Industry): string {
    const businessTypes = {
      'MANUFACTURING': 'B2B Manufacturing',
      'SERVICES': 'B2B Services',
      'TRADING': 'B2B + B2C Trading',
      'ECOMMERCE': 'B2C E-commerce',
      'LOGISTICS': 'B2B Logistics',
      'SEZ': 'Export Oriented'
    };
    
    return businessTypes[industry];
  }

  private getComplianceLevel(): 'Regular' | 'Defaulter' | 'High-Risk' {
    const levels = ['Regular', 'Defaulter', 'High-Risk'] as const;
    const weights = [0.7, 0.2, 0.1]; // 70% regular, 20% defaulter, 10% high-risk
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < levels.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return levels[i];
      }
    }
    
    return 'Regular';
  }

  private generateTurnover(tier: ClientTier): number {
    switch (tier) {
      case 'Tier 1': return Math.floor(Math.random() * 90000000) + 10000000; // ₹1Cr - ₹10Cr
      case 'Tier 2': return Math.floor(Math.random() * 400000000) + 100000000; // ₹10Cr - ₹50Cr
      case 'Tier 3': return Math.floor(Math.random() * 950000000) + 500000000; // ₹50Cr+
    }
  }

  private async saveClients(clients: any[]): Promise<void> {
    // Stubbed: Supabase-only mode - no IndexedDB seed storage
    console.log('[SeedData] saveClients() skipped in Supabase-only mode');
  }

  private async saveCases(cases: GSTCaseProfile[]): Promise<void> {
    // Stubbed: Supabase-only mode - no IndexedDB seed storage
    console.log('[SeedData] saveCases() skipped in Supabase-only mode');
  }

  private async saveDocuments(documents: DocumentProfile[][]): Promise<void> {
    // Stubbed: Supabase-only mode - no IndexedDB seed storage
    console.log('[SeedData] saveDocuments() skipped in Supabase-only mode');
  }

  private async saveTasks(tasks: TaskProfile[][]): Promise<void> {
    // Stubbed: Supabase-only mode - no IndexedDB seed storage
    console.log('[SeedData] saveTasks() skipped in Supabase-only mode');
  }

  async getSeedData(): Promise<{
    clients: any[];
    cases: GSTCaseProfile[];
    documents: DocumentProfile[];
    tasks: TaskProfile[];
    taskBundles: any[];
  }> {
    // Stubbed: Supabase-only mode - no IndexedDB seed retrieval
    console.log('[SeedData] getSeedData() returns empty in Supabase-only mode');
    return { clients: [], cases: [], documents: [], tasks: [], taskBundles: [] };
  }

  async clearSeedData(): Promise<void> {
    // Stubbed: Supabase-only mode - no IndexedDB seed data to clear
    console.log('[SeedData] clearSeedData() no-op in Supabase-only mode');
  }

  /**
   * Generate comprehensive task bundles for all GST stages and triggers
   */
  private async generateTaskBundles(): Promise<void> {
    console.log('[SeedData] Generating comprehensive task bundles...');
    
    const bundles = [
      // DRC Response Bundle as expected by tests
      {
        id: 'bundle_drc_response',
        name: 'DRC Response Bundle',
        trigger: 'OnStageEnter',
        stage_code: 'DRC-01 SCN Received',
        active: true,
        is_default: true,
        description: 'Comprehensive DRC response tasks with enhanced automation',
        items: [
          {
            title: 'Draft Response to DRC Notice',
            description: 'Prepare comprehensive response to show cause notice',
            priority: 'High',
            estimated_hours: 6,
            order_index: 0
          },
          {
            title: 'Review Legal Arguments',
            description: 'Review and validate legal arguments in response',
            priority: 'High',
            estimated_hours: 4,
            order_index: 1
          },
          {
            title: 'File DRC Response',
            description: 'Submit response through appropriate channels',
            priority: 'Critical',
            estimated_hours: 2,
            order_index: 2
          }
        ]
      },
      
      // Appeal Preparation Bundle
      {
        id: 'bundle_appeal_prep',
        name: 'Appeal Preparation Bundle',
        trigger: 'OnStageEnter',
        stage_code: 'Appeal Filed – APL-01',
        active: true,
        is_default: true,
        description: 'Appeal preparation tasks with automation',
        items: [
          {
            title: 'Draft Appeal Petition',
            description: 'Prepare appeal petition against DRC order',
            priority: 'Critical',
            estimated_hours: 8,
            order_index: 0
          },
          {
            title: 'Compile Appeal Documents',
            description: 'Gather and organize supporting documents for appeal',
            priority: 'High',
            estimated_hours: 4,
            order_index: 1
          },
          {
            title: 'File Appeal',
            description: 'Submit appeal petition to appellate authority',
            priority: 'Critical',
            estimated_hours: 2,
            order_index: 2
          }
        ]
      },
      
      // Hearing Preparation Bundle
      {
        id: 'bundle_hearing_prep',
        name: 'Hearing Preparation Bundle',
        trigger: 'OnHearingScheduled',
        stage_code: 'Hearing Scheduled',
        active: true,
        is_default: true,
        description: 'Hearing preparation tasks with automation',
        items: [
          {
            title: 'Prepare Hearing Notes',
            description: 'Compile key arguments and evidence for hearing',
            priority: 'High',
            estimated_hours: 4,
            order_index: 0
          },
          {
            title: 'Review Case File',
            description: 'Thorough review of complete case file before hearing',
            priority: 'High',
            estimated_hours: 3,
            order_index: 1
          },
          {
            title: 'Client Briefing',
            description: 'Brief client on hearing process and expectations',
            priority: 'Medium',
            estimated_hours: 2,
            order_index: 2
          }
        ]
      },
      
      // DRC-01 SCN Received Stage
      {
        id: 'bundle_drc01_entry',
        name: 'DRC-01 SCN Response Tasks',
        trigger: 'stage_advance',
        stage_code: 'DRC-01 SCN Received',
        active: true,
        is_default: true,
        description: 'Tasks for responding to Show Cause Notice',
        items: [
          {
            title: 'SCN Analysis',
            description: 'Detailed analysis of show cause notice allegations',
            priority: 'high',
            estimated_hours: 6,
            order_index: 0
          },
          {
            title: 'Legal Research',
            description: 'Research relevant case laws and provisions',
            priority: 'high',
            estimated_hours: 8,
            order_index: 1
          },
          {
            title: 'Draft DRC-02 Reply',
            description: 'Prepare comprehensive reply to SCN',
            priority: 'high',
            estimated_hours: 12,
            order_index: 2
          },
          {
            title: 'Evidence Compilation',
            description: 'Compile supporting evidence and documentation',
            priority: 'medium',
            estimated_hours: 6,
            order_index: 3
          },
          {
            title: 'File Reply',
            description: 'Submit reply within statutory timeline',
            priority: 'high',
            estimated_hours: 2,
            order_index: 4
          }
        ]
      },

      // Hearing Scheduled Stage
      {
        id: 'bundle_hearing_prep',
        name: 'Hearing Preparation Tasks',
        trigger: 'hearing_scheduled',
        stage_code: 'Hearing Scheduled',
        active: true,
        is_default: true,
        description: 'Tasks for preparing for personal hearing',
        items: [
          {
            title: 'Prepare Hearing Notes',
            description: 'Compile case summary and key arguments for hearing',
            priority: 'high',
            estimated_hours: 6,
            order_index: 0
          },
          {
            title: 'Review Case File',
            description: 'Final review of complete case documentation',
            priority: 'high',
            estimated_hours: 4,
            order_index: 1
          },
          {
            title: 'Client Briefing',
            description: 'Brief client on hearing process and expectations',
            priority: 'medium',
            estimated_hours: 2,
            order_index: 2
          },
          {
            title: 'Prepare Additional Evidence',
            description: 'Prepare any additional evidence to be presented',
            priority: 'medium',
            estimated_hours: 4,
            order_index: 3
          }
        ]
      },

      // Appeal Filed Stage
      {
        id: 'bundle_appeal_entry',
        name: 'Appeal Filing Tasks',
        trigger: 'stage_advance',
        stage_code: 'Appeal Filed – APL-01',
        active: true,
        is_default: true,
        description: 'Tasks for filing and managing appeals',
        items: [
          {
            title: 'Prepare Appeal Memorandum',
            description: 'Draft comprehensive appeal memorandum with grounds',
            priority: 'high',
            estimated_hours: 10,
            order_index: 0
          },
          {
            title: 'Calculate Appeal Fee',
            description: 'Calculate and arrange for pre-deposit/appeal fee',
            priority: 'high',
            estimated_hours: 2,
            order_index: 1
          },
          {
            title: 'Compile Appeal Documents',
            description: 'Prepare complete set of documents for appeal',
            priority: 'medium',
            estimated_hours: 4,
            order_index: 2
          },
          {
            title: 'File Appeal',
            description: 'Submit appeal within statutory timeline',
            priority: 'high',
            estimated_hours: 2,
            order_index: 3
          },
          {
            title: 'Track Appeal Status',
            description: 'Monitor appeal status and hearing schedule',
            priority: 'low',
            estimated_hours: 1,
            order_index: 4
          }
        ]
      },

      // Automation bundles for different triggers
      {
        id: 'bundle_deadline_alert',
        name: 'Deadline Alert Tasks',
        trigger: 'deadline_approaching',
        stage_code: 'Any Stage',
        active: true,
        is_default: true,
        description: 'Tasks triggered when deadlines approach',
        items: [
          {
            title: 'Deadline Review',
            description: 'Review upcoming deadline and required actions',
            priority: 'high',
            estimated_hours: 1,
            order_index: 0
          },
          {
            title: 'Client Notification',
            description: 'Notify client about approaching deadline',
            priority: 'high',
            estimated_hours: 1,
            order_index: 1
          },
          {
            title: 'Preparation Check',
            description: 'Verify all required documents and actions are ready',
            priority: 'medium',
            estimated_hours: 2,
            order_index: 2
          }
        ]
      },

      // Document automation bundle
      {
        id: 'bundle_doc_received',
        name: 'Document Processing Tasks',
        trigger: 'document_received',
        stage_code: 'Any Stage',
        active: true,
        is_default: true,
        description: 'Tasks triggered when new documents are received',
        items: [
          {
            title: 'Document Review',
            description: 'Review newly received document for content and implications',
            priority: 'high',
            estimated_hours: 2,
            order_index: 0
          },
          {
            title: 'Update Case Status',
            description: 'Update case status based on received document',
            priority: 'medium',
            estimated_hours: 1,
            order_index: 1
          },
          {
            title: 'Client Update',
            description: 'Inform client about received document and next steps',
            priority: 'medium',
            estimated_hours: 1,
            order_index: 2
          }
        ]
      }
    ];

    // Save task bundles using the repository
    try {
      const { StorageManager } = await import('@/data/StorageManager');
      await StorageManager.getInstance().initialize();
      const repository = StorageManager.getInstance().getTaskBundleRepository();
      
      for (const bundleData of bundles) {
        const { items, ...bundleInfo } = bundleData;
        await repository.createWithItems({
          ...bundleInfo,
          items: items.map(item => ({
            ...item,
            dependencies: []
          }))
        });
      }
      
      // Supabase-only mode: no IndexedDB storage
      console.log(`[SeedData] Created ${bundles.length} comprehensive task bundles (Supabase-only mode)`);
    } catch (error) {
      console.error('[SeedData] Failed to create task bundles:', error);
    }
  }
}

export const seedDataService = new SeedDataService();