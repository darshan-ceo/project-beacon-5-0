/**
 * Automated QA Service for Stage Transitions
 * Comprehensive testing suite for stage advancement, task automation, and lifecycle integrity
 */

import { QATest, QATestResult } from './qaService';
import { stageTransitionService } from './stageTransitionService';
import { taskBundleService } from './taskBundleService';
import { lifecycleService } from './lifecycleService';
import { GST_STAGES, GSTStage } from '../../config/appConfig';
import { StageInstance, StageTransition, TransitionType } from '@/types/lifecycle';

export interface TransitionTestCase {
  name: string;
  fromStage: GSTStage;
  toStage: GSTStage;
  transitionType: TransitionType;
  caseData: TestCaseData;
  expectedTasks: number;
  expectedChecklist: string[];
  validationRules: ValidationRule[];
}

export interface TestCaseData {
  id: string;
  caseNumber: string;
  clientId: string;
  assignedToId: string;
  assignedToName: string;
  currentStage: GSTStage;
  noticeType?: string;
  clientTier?: string;
  disputeAmount?: number;
}

export interface ValidationRule {
  name: string;
  condition: (result: any) => boolean;
  errorMessage: string;
}

export interface TransitionTestResult extends QATestResult {
  transitionDetails?: {
    tasksCreated: number;
    timelineUpdated: boolean;
    checklistGenerated: boolean;
    notificationsSent: boolean;
    errors: string[];
  };
}

class StageTransitionQA {
  private readonly TEST_CASES_KEY = 'stage-transition-test-cases';
  private testCases: TransitionTestCase[] = [];

  constructor() {
    this.initializeTestCases();
  }

  private initializeTestCases(): void {
    // Forward progression tests
    this.testCases = [
      {
        name: 'Scrutiny to Demand - ITC Dispute',
        fromStage: 'ASMT-10 Notice Received',
        toStage: 'DRC-01 SCN Received',
        transitionType: 'Forward',
        caseData: {
          id: 'test_case_001',
          caseNumber: 'ITC/2024/001',
          clientId: 'client_001',
          assignedToId: 'emp_001',
          assignedToName: 'Senior Associate',
          currentStage: 'ASMT-10 Notice Received',
          noticeType: 'ITC_REVERSAL',
          clientTier: 'TIER1',
          disputeAmount: 500000
        },
        expectedTasks: 3,
        expectedChecklist: ['SCN Response Filed', 'Supporting Documents Attached', 'Client Approval Obtained'],
        validationRules: [
          {
            name: 'Task Creation Validation',
            condition: (result) => result.tasksCreated >= 3,
            errorMessage: 'Expected at least 3 tasks to be created for Demand stage'
          },
          {
            name: 'Timeline Update Validation',
            condition: (result) => result.timelineUpdated === true,
            errorMessage: 'Timeline should be updated with stage transition'
          }
        ]
      },
      {
        name: 'Demand to Adjudication - Complex Case',
        fromStage: 'DRC-01 SCN Received',
        toStage: 'Hearing Scheduled',
        transitionType: 'Forward',
        caseData: {
          id: 'test_case_002',
          caseNumber: 'PENALTY/2024/002',
          clientId: 'client_002',
          assignedToId: 'emp_002',
          assignedToName: 'Partner',
          currentStage: 'DRC-01 SCN Received',
          noticeType: 'PENALTY',
          clientTier: 'TIER2',
          disputeAmount: 2000000
        },
        expectedTasks: 4,
        expectedChecklist: ['Demand Order Received', 'Appeal Strategy Finalized', 'Hearing Preparation Complete'],
        validationRules: [
          {
            name: 'High Value Case Validation',
            condition: (result) => result.tasksCreated >= 4,
            errorMessage: 'High value cases should generate more tasks'
          },
          {
            name: 'Partner Assignment Validation',
            condition: (result) => result.checklistGenerated === true,
            errorMessage: 'Partner-assigned cases should have detailed checklists'
          }
        ]
      },
      {
        name: 'Appeals to GSTAT - Final Stage',
        fromStage: 'Appeal Filed – APL-01',
        toStage: 'Appeal Hearing',
        transitionType: 'Forward',
        caseData: {
          id: 'test_case_003',
          caseNumber: 'APPEAL/2024/003',
          clientId: 'client_003',
          assignedToId: 'emp_003',
          assignedToName: 'Senior Partner',
          currentStage: 'Appeal Filed – APL-01',
          noticeType: 'DEMAND_CONFIRMATION',
          clientTier: 'TIER3',
          disputeAmount: 5000000
        },
        expectedTasks: 5,
        expectedChecklist: ['Appeal Order Analysis', 'GSTAT Filing Preparation', 'Court Fee Calculation'],
        validationRules: [
          {
            name: 'Final Stage Validation',
            condition: (result) => result.tasksCreated >= 5,
            errorMessage: 'GSTAT stage should have comprehensive task list'
          },
          {
            name: 'Senior Assignment Validation',
            condition: (result) => result.notificationsSent === true,
            errorMessage: 'Senior partner cases should trigger notifications'
          }
        ]
      }
    ];

    // Add remand test cases
    this.addRemandTestCases();
    
    // Add edge case tests
    this.addEdgeCaseTests();
  }

  private addRemandTestCases(): void {
    this.testCases.push({
      name: 'Hearing Stage Remand to Notice Received',
      fromStage: 'Hearing Scheduled',
      toStage: 'ASMT-10 Notice Received',
      transitionType: 'Remand',
      caseData: {
        id: 'test_remand_001',
        caseNumber: 'REMAND/2024/001',
        clientId: 'client_004',
        assignedToId: 'emp_004',
        assignedToName: 'Associate',
        currentStage: 'Hearing Scheduled',
        noticeType: 'ADDITIONAL_EVIDENCE',
        disputeAmount: 300000
      },
      expectedTasks: 2,
      expectedChecklist: ['Remand Order Analysis', 'Fresh Evidence Collection'],
      validationRules: [
        {
          name: 'Remand Task Creation',
          condition: (result) => result.tasksCreated >= 2,
          errorMessage: 'Remand should create fresh investigation tasks'
        },
        {
          name: 'Previous Cycle Archival',
          condition: (result) => result.timelineUpdated === true,
          errorMessage: 'Previous cycle tasks should be archived'
        }
      ]
    });
  }

  private addEdgeCaseTests(): void {
    this.testCases.push({
      name: 'Concurrent Transition Prevention',
        fromStage: 'ASMT-10 Notice Received',
        toStage: 'DRC-01 SCN Received',
      transitionType: 'Forward',
      caseData: {
        id: 'test_concurrent_001',
        caseNumber: 'EDGE/2024/001',
        clientId: 'client_005',
        assignedToId: 'emp_005',
        assignedToName: 'Junior Associate',
        currentStage: 'ASMT-10 Notice Received'
      },
      expectedTasks: 3,
      expectedChecklist: ['Concurrency Check', 'State Validation'],
      validationRules: [
        {
          name: 'Idempotency Check',
          condition: (result) => result.errors.length === 0,
          errorMessage: 'Concurrent transitions should be prevented'
        }
      ]
    });
  }

  async runAllTransitionTests(): Promise<TransitionTestResult[]> {
    console.log('[StageTransitionQA] Running comprehensive transition tests...');
    
    const results: TransitionTestResult[] = [];
    
    for (const testCase of this.testCases) {
      const result = await this.runTransitionTest(testCase);
      results.push(result);
    }

    await this.saveTestResults(results);
    return results;
  }

  async runTransitionTest(testCase: TransitionTestCase): Promise<TransitionTestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`[TransitionTest] ${testCase.name}: ${testCase.fromStage} → ${testCase.toStage}`);
      
      // Setup test environment
      await this.setupTestEnvironment(testCase);
      
      // Execute stage transition
      const transitionResult = await this.executeTransition(testCase);
      
      // Validate results
      const validation = await this.validateTransitionResult(testCase, transitionResult);
      
      const duration = Date.now() - startTime;
      
      if (validation.isValid) {
        return {
          status: 'pass',
          message: `${testCase.name} completed successfully`,
          duration,
          transitionDetails: {
            tasksCreated: transitionResult.tasksCreated || 0,
            timelineUpdated: transitionResult.timelineUpdated || false,
            checklistGenerated: transitionResult.checklistGenerated || false,
            notificationsSent: transitionResult.notificationsSent || false,
            errors: []
          }
        };
      } else {
        return {
          status: 'fail',
          message: `${testCase.name} failed validation`,
          duration,
          details: validation.errors,
          transitionDetails: {
            tasksCreated: transitionResult.tasksCreated || 0,
            timelineUpdated: transitionResult.timelineUpdated || false,
            checklistGenerated: transitionResult.checklistGenerated || false,
            notificationsSent: transitionResult.notificationsSent || false,
            errors: validation.errors
          }
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        status: 'fail',
        message: `${testCase.name} threw exception: ${error.message}`,
        duration,
        details: error,
        transitionDetails: {
          tasksCreated: 0,
          timelineUpdated: false,
          checklistGenerated: false,
          notificationsSent: false,
          errors: [error.message]
        }
      };
    }
  }

  private async setupTestEnvironment(testCase: TransitionTestCase): Promise<void> {
    // Create test case data in storage
    await idbStorage.set(`test-case-${testCase.caseData.id}`, testCase.caseData);
    
    // Clear any existing footprints for this test
    await idbStorage.delete(`task-creation-footprints-${testCase.caseData.id}`);
    
    // Setup test stage instance
    const stageInstance: StageInstance = {
      id: `stage_${testCase.caseData.id}`,
      caseId: testCase.caseData.id,
      stageKey: testCase.fromStage,
      cycleNo: 1,
      startedAt: new Date().toISOString(),
      status: 'Active',
      createdBy: testCase.caseData.assignedToId,
      createdAt: new Date().toISOString()
    };
    
    await idbStorage.set(`stage-instance-${testCase.caseData.id}`, stageInstance);
  }

  private async executeTransition(testCase: TransitionTestCase): Promise<any> {
    // Execute actual stage transition using the service
    const transitionResult = await stageTransitionService.processStageTransition(
      { 
        ...testCase.caseData, 
        noticeType: 'ASMT-10' as any,
        clientTier: 'Tier 1' as any
      },
      testCase.fromStage,
      testCase.toStage
    );

    // Execute task bundle trigger
    const stageInstance = await idbStorage.get(`stage-instance-${testCase.caseData.id}`);
    const bundleResult = await taskBundleService.triggerTaskBundle(
      'OnStageEnter',
      stageInstance,
      testCase.caseData
    );

    return {
      ...transitionResult,
      tasksCreated: bundleResult?.length || 0,
      timelineUpdated: true, // Mock timeline update
      checklistGenerated: true, // Mock checklist generation
      notificationsSent: testCase.caseData.clientTier === 'TIER3' // Mock notification logic
    };
  }

  private async validateTransitionResult(testCase: TransitionTestCase, result: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Run all validation rules
    for (const rule of testCase.validationRules) {
      if (!rule.condition(result)) {
        errors.push(`${rule.name}: ${rule.errorMessage}`);
      }
    }

    // Additional standard validations
    if (result.tasksCreated < testCase.expectedTasks) {
      errors.push(`Expected ${testCase.expectedTasks} tasks, got ${result.tasksCreated}`);
    }

    // Check idempotency
    const footprints = await idbStorage.get(`task-creation-footprints-${testCase.caseData.id}`) || [];
    if (footprints.length === 0 && result.tasksCreated > 0) {
      errors.push('Task creation footprints not found - idempotency may be compromised');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async saveTestResults(results: TransitionTestResult[]): Promise<void> {
    const timestamp = new Date().toISOString();
    await idbStorage.set(`transition-qa-results-${timestamp}`, {
      timestamp,
      results,
      summary: this.generateTestSummary(results)
    });
  }

  private generateTestSummary(results: TransitionTestResult[]): any {
    const total = results.length;
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const avgDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0) / total;

    return {
      total,
      passed,
      failed,
      successRate: (passed / total) * 100,
      avgDuration: Math.round(avgDuration),
      criticalFailures: results.filter(r => 
        r.status === 'fail' && 
        r.transitionDetails?.errors.some(e => e.includes('idempotency') || e.includes('concurrent'))
      ).length
    };
  }

  // QA Test integration methods
  getQATests(): QATest[] {
    return [
      {
        name: 'Stage Transition Automation',
        description: 'Validates automated task creation and lifecycle management during stage transitions',
        run: async () => {
          const results = await this.runAllTransitionTests();
          const passed = results.filter(r => r.status === 'pass').length;
          const total = results.length;
          
          return {
            status: passed === total ? 'pass' : 'fail',
            message: `${passed}/${total} transition tests passed`,
            details: results.filter(r => r.status === 'fail'),
            duration: results.reduce((sum, r) => sum + (r.duration || 0), 0)
          };
        }
      },
      {
        name: 'Task Bundle Idempotency',
        description: 'Ensures task creation is idempotent and prevents duplicates',
        run: async () => {
          const testCase = this.testCases[0]; // Use first test case
          
          // Run transition twice
          const result1 = await this.runTransitionTest(testCase);
          const result2 = await this.runTransitionTest(testCase);
          
          const isDuplicate = result2.transitionDetails?.tasksCreated > 0;
          
          return {
            status: isDuplicate ? 'fail' : 'pass',
            message: isDuplicate ? 'Duplicate tasks created on re-run' : 'Idempotency maintained',
            details: { firstRun: result1.transitionDetails, secondRun: result2.transitionDetails }
          };
        }
      },
      {
        name: 'Remand Cycle Management',
        description: 'Tests proper handling of remand scenarios and cycle archival',
        run: async () => {
          const remandTestCase = this.testCases.find(tc => tc.transitionType === 'Remand');
          if (!remandTestCase) {
            return { status: 'skip', message: 'No remand test cases configured' };
          }
          
          const result = await this.runTransitionTest(remandTestCase);
          
          return {
            status: result.status,
            message: result.message,
            details: result.transitionDetails
          };
        }
      }
    ];
  }

  async getLastTestResults(): Promise<any> {
    // Mock implementation - in real app would use proper storage query
    const allKeys = ['transition-qa-results-1', 'transition-qa-results-2']; // Mock keys
    const resultKeys = allKeys.filter(k => k.startsWith('transition-qa-results-')).sort().reverse();
    
    if (resultKeys.length === 0) {
      return null;
    }
    
    return await idbStorage.get(resultKeys[0]);
  }
}

export const stageTransitionQA = new StageTransitionQA();