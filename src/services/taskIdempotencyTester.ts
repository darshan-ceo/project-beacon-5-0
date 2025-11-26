/**
 * Idempotent Task Creation Testing Service
 * Focused testing for task creation reliability, duplicate prevention, and edge cases
 */

import { QATest, QATestResult } from './qaService';
import { stageTransitionService } from './stageTransitionService';
import { taskBundleService } from './taskBundleService';
import { TaskCreationFootprint } from '@/types/taskTemplate';
import { GSTStage } from '../../config/appConfig';

export interface IdempotencyTestCase {
  name: string;
  description: string;
  scenario: TestScenario;
  caseData: TestCaseData;
  iterations: number;
  expectedBehavior: ExpectedBehavior;
}

export interface TestScenario {
  type: 'SAME_STAGE_REENTRY' | 'RAPID_SUCCESSION' | 'ERROR_RECOVERY' | 'CONCURRENT_ACCESS' | 'TEMPLATE_CHANGE' | 'DATA_CORRUPTION';
  parameters: any;
}

export interface TestCaseData {
  id: string;
  caseNumber: string;
  clientId: string;
  assignedToId: string;
  assignedToName: string;
  currentStage: GSTStage;
  targetStage: GSTStage;
  templateId?: string;
}

export interface ExpectedBehavior {
  tasksShouldDuplicate: boolean;
  footprintsShouldIncrease: boolean;
  maxAllowedTasks: number;
  shouldHandleErrors: boolean;
}

export interface IdempotencyTestResult extends QATestResult {
  testDetails?: {
    iterationsRun: number;
    tasksCreated: number[];
    footprintsGenerated: number;
    duplicatesDetected: number;
    errorsEncountered: string[];
    performanceMetrics: {
      avgDuration: number;
      memoryUsage?: number;
      concurrencyIssues: number;
    };
  };
}

class TaskIdempotencyTester {
  private readonly FOOTPRINTS_KEY = 'task-creation-footprints';
  private readonly TEST_RESULTS_KEY = 'idempotency-test-results';
  private testCases: IdempotencyTestCase[] = [];

  constructor() {
    this.initializeTestCases();
  }

  private initializeTestCases(): void {
    this.testCases = [
      // Same Stage Re-entry Test
      {
        name: 'Same Stage Multiple Entries',
        description: 'Tests task creation when same stage is entered multiple times',
        scenario: {
          type: 'SAME_STAGE_REENTRY',
          parameters: { stage: 'SCRUTINY', entryCount: 5 }
        },
        caseData: {
          id: 'idem_test_001',
          caseNumber: 'IDEM/2024/001',
          clientId: 'client_idem_001',
          assignedToId: 'emp_idem_001',
          assignedToName: 'Test Associate',
          currentStage: 'ASMT-10 Notice Received',
          targetStage: 'ASMT-10 Notice Received'
        },
        iterations: 5,
        expectedBehavior: {
          tasksShouldDuplicate: false,
          footprintsShouldIncrease: false,
          maxAllowedTasks: 3,
          shouldHandleErrors: true
        }
      },

      // Rapid Succession Test
      {
        name: 'Rapid Succession Creation',
        description: 'Tests concurrent task creation attempts within short timeframe',
        scenario: {
          type: 'RAPID_SUCCESSION',
          parameters: { intervalMs: 100, simultaneousRequests: 10 }
        },
        caseData: {
          id: 'idem_test_002',
          caseNumber: 'IDEM/2024/002',
          clientId: 'client_idem_002',
          assignedToId: 'emp_idem_002',
          assignedToName: 'Test Senior',
          currentStage: 'DRC-01 SCN Received',
          targetStage: 'Hearing Scheduled'
        },
        iterations: 10,
        expectedBehavior: {
          tasksShouldDuplicate: false,
          footprintsShouldIncrease: true,
          maxAllowedTasks: 4,
          shouldHandleErrors: true
        }
      },

      // Error Recovery Test
      {
        name: 'Error Recovery Scenarios',
        description: 'Tests task creation recovery after various failure scenarios',
        scenario: {
          type: 'ERROR_RECOVERY',
          parameters: { 
            errorTypes: ['NETWORK_FAILURE', 'STORAGE_ERROR', 'VALIDATION_ERROR'],
            retryAttempts: 3
          }
        },
        caseData: {
          id: 'idem_test_003',
          caseNumber: 'IDEM/2024/003',
          clientId: 'client_idem_003',
          assignedToId: 'emp_idem_003',
          assignedToName: 'Test Partner',
          currentStage: 'Appeal Filed – APL-01',
          targetStage: 'Appeal Hearing'
        },
        iterations: 3,
        expectedBehavior: {
          tasksShouldDuplicate: false,
          footprintsShouldIncrease: true,
          maxAllowedTasks: 5,
          shouldHandleErrors: true
        }
      },

      // Template Change Test
      {
        name: 'Template Change Handling',
        description: 'Tests behavior when task templates are modified mid-process',
        scenario: {
          type: 'TEMPLATE_CHANGE',
          parameters: { 
            originalTemplateId: 'template_v1',
            updatedTemplateId: 'template_v2',
            changeAfterIteration: 2
          }
        },
        caseData: {
          id: 'idem_test_004',
          caseNumber: 'IDEM/2024/004',
          clientId: 'client_idem_004',
          assignedToId: 'emp_idem_004',
          assignedToName: 'Test Manager',
          currentStage: 'ASMT-10 Notice Received',
          targetStage: 'DRC-01 SCN Received',
          templateId: 'template_v1'
        },
        iterations: 4,
        expectedBehavior: {
          tasksShouldDuplicate: true, // Should create new tasks with updated template
          footprintsShouldIncrease: true,
          maxAllowedTasks: 6,
          shouldHandleErrors: true
        }
      },

      // Data Corruption Test
      {
        name: 'Footprint Corruption Recovery',
        description: 'Tests recovery from corrupted or malformed footprint data',
        scenario: {
          type: 'DATA_CORRUPTION',
          parameters: { 
            corruptionTypes: ['MALFORMED_JSON', 'MISSING_FIELDS', 'INVALID_DATES'],
            corruptAfterIteration: 1
          }
        },
        caseData: {
          id: 'idem_test_005',
          caseNumber: 'IDEM/2024/005',
          clientId: 'client_idem_005',
          assignedToId: 'emp_idem_005',
          assignedToName: 'Test Director',
          currentStage: 'Hearing Scheduled',
          targetStage: 'Appeal Filed – APL-01'
        },
        iterations: 3,
        expectedBehavior: {
          tasksShouldDuplicate: false,
          footprintsShouldIncrease: true,
          maxAllowedTasks: 4,
          shouldHandleErrors: true
        }
      }
    ];
  }

  async runAllIdempotencyTests(): Promise<IdempotencyTestResult[]> {
    console.log('[IdempotencyTester] Running comprehensive idempotency tests...');
    
    const results: IdempotencyTestResult[] = [];
    
    for (const testCase of this.testCases) {
      const result = await this.runIdempotencyTest(testCase);
      results.push(result);
      
      // Clean up between tests
      await this.cleanupTestEnvironment(testCase.caseData.id);
    }

    await this.saveTestResults(results);
    return results;
  }

  async runIdempotencyTest(testCase: IdempotencyTestCase): Promise<IdempotencyTestResult> {
    const startTime = Date.now();
    const tasksCreated: number[] = [];
    const errorsEncountered: string[] = [];
    let duplicatesDetected = 0;
    let concurrencyIssues = 0;

    try {
      console.log(`[IdempotencyTest] ${testCase.name} - ${testCase.scenario.type}`);
      
      // Setup test environment
      await this.setupTestEnvironment(testCase);
      
      // Execute test iterations based on scenario type
      switch (testCase.scenario.type) {
        case 'SAME_STAGE_REENTRY':
          await this.executeSameStageReentryTest(testCase, tasksCreated, errorsEncountered);
          break;
          
        case 'RAPID_SUCCESSION':
          concurrencyIssues = await this.executeRapidSuccessionTest(testCase, tasksCreated, errorsEncountered);
          break;
          
        case 'ERROR_RECOVERY':
          await this.executeErrorRecoveryTest(testCase, tasksCreated, errorsEncountered);
          break;
          
        case 'TEMPLATE_CHANGE':
          await this.executeTemplateChangeTest(testCase, tasksCreated, errorsEncountered);
          break;
          
        case 'DATA_CORRUPTION':
          await this.executeDataCorruptionTest(testCase, tasksCreated, errorsEncountered);
          break;
      }

      // Analyze results
      const footprints = await this.getFootprints(testCase.caseData.id);
      duplicatesDetected = this.detectDuplicates(tasksCreated, testCase.expectedBehavior);
      
      const duration = Date.now() - startTime;
      const isValid = this.validateTestResults(testCase, tasksCreated, footprints.length, duplicatesDetected);

      return {
        status: isValid ? 'pass' : 'fail',
        message: `${testCase.name} ${isValid ? 'passed' : 'failed'} idempotency validation`,
        duration,
        testDetails: {
          iterationsRun: testCase.iterations,
          tasksCreated,
          footprintsGenerated: footprints.length,
          duplicatesDetected,
          errorsEncountered,
          performanceMetrics: {
            avgDuration: duration / testCase.iterations,
            concurrencyIssues
          }
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        status: 'fail',
        message: `${testCase.name} threw exception: ${error.message}`,
        duration,
        details: error,
        testDetails: {
          iterationsRun: testCase.iterations,
          tasksCreated,
          footprintsGenerated: 0,
          duplicatesDetected: 0,
          errorsEncountered: [error.message],
          performanceMetrics: {
            avgDuration: duration,
            concurrencyIssues: 0
          }
        }
      };
    }
  }

  private async executeSameStageReentryTest(
    testCase: IdempotencyTestCase, 
    tasksCreated: number[], 
    errorsEncountered: string[]
  ): Promise<void> {
    for (let i = 0; i < testCase.iterations; i++) {
      try {
        const result = await stageTransitionService.processStageTransition(
          testCase.caseData,
          testCase.caseData.currentStage,
          testCase.caseData.targetStage
        );
        
        tasksCreated.push(result.createdTasks?.length || 0);
        
        // Simulate stage re-entry by not advancing stage
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
        
      } catch (error) {
        errorsEncountered.push(`Iteration ${i + 1}: ${error.message}`);
        tasksCreated.push(0);
      }
    }
  }

  private async executeRapidSuccessionTest(
    testCase: IdempotencyTestCase, 
    tasksCreated: number[], 
    errorsEncountered: string[]
  ): Promise<number> {
    const { intervalMs, simultaneousRequests } = testCase.scenario.parameters;
    let concurrencyIssues = 0;

    // Create multiple simultaneous requests
    const promises = Array.from({ length: simultaneousRequests }, async (_, i) => {
      try {
        // Add small random delay to simulate real-world timing
        await new Promise(resolve => setTimeout(resolve, Math.random() * intervalMs));
        
        const result = await stageTransitionService.processStageTransition(
          testCase.caseData,
          testCase.caseData.currentStage,
          testCase.caseData.targetStage
        );
        
        return result.createdTasks?.length || 0;
      } catch (error) {
        errorsEncountered.push(`Concurrent request ${i + 1}: ${error.message}`);
        if (error.message.includes('concurrent') || error.message.includes('lock')) {
          concurrencyIssues++;
        }
        return 0;
      }
    });

    const results = await Promise.allSettled(promises);
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        tasksCreated.push(result.value);
      } else {
        tasksCreated.push(0);
        errorsEncountered.push(`Promise ${i + 1}: ${result.reason}`);
      }
    });

    return concurrencyIssues;
  }

  private async executeErrorRecoveryTest(
    testCase: IdempotencyTestCase, 
    tasksCreated: number[], 
    errorsEncountered: string[]
  ): Promise<void> {
    const { errorTypes, retryAttempts } = testCase.scenario.parameters;

    for (let i = 0; i < testCase.iterations; i++) {
      const errorType = errorTypes[i % errorTypes.length];
      
      // Simulate different error conditions
      if (i < errorTypes.length) {
        await this.simulateError(testCase.caseData.id, errorType);
      }
      
      for (let retry = 0; retry < retryAttempts; retry++) {
        try {
          const result = await stageTransitionService.processStageTransition(
            testCase.caseData,
            testCase.caseData.currentStage,
            testCase.caseData.targetStage
          );
          
          tasksCreated.push(result.createdTasks?.length || 0);
          break; // Success, exit retry loop
          
        } catch (error) {
          errorsEncountered.push(`Iteration ${i + 1}, Retry ${retry + 1}: ${error.message}`);
          
          if (retry === retryAttempts - 1) {
            tasksCreated.push(0); // Final failure
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
  }

  private async executeTemplateChangeTest(
    testCase: IdempotencyTestCase, 
    tasksCreated: number[], 
    errorsEncountered: string[]
  ): Promise<void> {
    const { originalTemplateId, updatedTemplateId, changeAfterIteration } = testCase.scenario.parameters;

    for (let i = 0; i < testCase.iterations; i++) {
      try {
        // Change template after specified iteration
        if (i === changeAfterIteration) {
          testCase.caseData.templateId = updatedTemplateId;
          await this.simulateTemplateChange(originalTemplateId, updatedTemplateId);
        }
        
        const result = await stageTransitionService.processStageTransition(
          testCase.caseData,
          testCase.caseData.currentStage,
          testCase.caseData.targetStage
        );
        
        tasksCreated.push(result.createdTasks?.length || 0);
        
      } catch (error) {
        errorsEncountered.push(`Template change iteration ${i + 1}: ${error.message}`);
        tasksCreated.push(0);
      }
    }
  }

  private async executeDataCorruptionTest(
    testCase: IdempotencyTestCase, 
    tasksCreated: number[], 
    errorsEncountered: string[]
  ): Promise<void> {
    const { corruptionTypes, corruptAfterIteration } = testCase.scenario.parameters;

    for (let i = 0; i < testCase.iterations; i++) {
      try {
        // Corrupt footprint data after specified iteration
        if (i === corruptAfterIteration) {
          const corruptionType = corruptionTypes[Math.floor(Math.random() * corruptionTypes.length)];
          await this.simulateDataCorruption(testCase.caseData.id, corruptionType);
        }
        
        const result = await stageTransitionService.processStageTransition(
          testCase.caseData,
          testCase.caseData.currentStage,
          testCase.caseData.targetStage
        );
        
        tasksCreated.push(result.createdTasks?.length || 0);
        
      } catch (error) {
        errorsEncountered.push(`Corruption iteration ${i + 1}: ${error.message}`);
        tasksCreated.push(0);
      }
    }
  }

  private async setupTestEnvironment(testCase: IdempotencyTestCase): Promise<void> {
    // Clear any existing test data
    await this.cleanupTestEnvironment(testCase.caseData.id);
    
    // Setup fresh test case
    await idbStorage.set(`test-case-${testCase.caseData.id}`, testCase.caseData);
  }

  private async cleanupTestEnvironment(caseId: string): Promise<void> {
    await Promise.all([
      idbStorage.delete(`test-case-${caseId}`),
      idbStorage.delete(`${this.FOOTPRINTS_KEY}-${caseId}`),
      idbStorage.delete(`stage-instance-${caseId}`)
    ]);
  }

  private async getFootprints(caseId: string): Promise<TaskCreationFootprint[]> {
    return await idbStorage.get(`${this.FOOTPRINTS_KEY}-${caseId}`) || [];
  }

  private detectDuplicates(tasksCreated: number[], expectedBehavior: ExpectedBehavior): number {
    if (!expectedBehavior.tasksShouldDuplicate) {
      // Count iterations where tasks were created after the first successful creation
      let firstSuccessIndex = tasksCreated.findIndex(count => count > 0);
      if (firstSuccessIndex === -1) return 0;
      
      return tasksCreated.slice(firstSuccessIndex + 1).filter(count => count > 0).length;
    }
    return 0;
  }

  private validateTestResults(
    testCase: IdempotencyTestCase, 
    tasksCreated: number[], 
    footprintsCount: number, 
    duplicatesDetected: number
  ): boolean {
    const { expectedBehavior } = testCase;
    
    // Check if duplicates match expectation
    if (!expectedBehavior.tasksShouldDuplicate && duplicatesDetected > 0) {
      console.log(`[Validation] Unexpected duplicates detected: ${duplicatesDetected}`);
      return false;
    }
    
    // Check if total tasks exceed maximum allowed
    const totalTasks = tasksCreated.reduce((sum, count) => sum + count, 0);
    if (totalTasks > expectedBehavior.maxAllowedTasks * testCase.iterations) {
      console.log(`[Validation] Too many tasks created: ${totalTasks}`);
      return false;
    }
    
    // Check footprint behavior
    if (!expectedBehavior.footprintsShouldIncrease && footprintsCount > 1) {
      console.log(`[Validation] Unexpected footprint increase: ${footprintsCount}`);
      return false;
    }
    
    return true;
  }

  private async simulateError(caseId: string, errorType: string): Promise<void> {
    switch (errorType) {
      case 'NETWORK_FAILURE':
        // Simulate network failure by temporarily corrupting storage
        await idbStorage.set(`network-error-${caseId}`, true);
        break;
      case 'STORAGE_ERROR':
        // Simulate storage error
        await idbStorage.set(`storage-error-${caseId}`, true);
        break;
      case 'VALIDATION_ERROR':
        // Corrupt case data temporarily
        const caseData = await idbStorage.get(`test-case-${caseId}`);
        await idbStorage.set(`test-case-${caseId}`, { ...caseData, assignedToId: null });
        break;
    }
  }

  private async simulateTemplateChange(oldTemplateId: string, newTemplateId: string): Promise<void> {
    // Mock template update - in real implementation, this would update the template service
    console.log(`[TemplateChange] Simulating template change: ${oldTemplateId} → ${newTemplateId}`);
  }

  private async simulateDataCorruption(caseId: string, corruptionType: string): Promise<void> {
    const footprints = await this.getFootprints(caseId);
    
      switch (corruptionType) {
        case 'MALFORMED_JSON':
          await idbStorage.set(`${this.FOOTPRINTS_KEY}-${caseId}`, '{"malformed": json}');
          break;
        case 'MISSING_FIELDS':
          if (footprints.length > 0) {
            const corrupted = footprints.map(fp => ({ caseId: fp.caseId })); // Remove other fields
            await idbStorage.set(`${this.FOOTPRINTS_KEY}-${caseId}`, corrupted);
          }
          break;
      case 'INVALID_DATES':
        if (footprints.length > 0) {
          const corrupted = footprints.map(fp => ({ ...fp, createdAt: 'invalid-date' }));
          await idbStorage.set(`${this.FOOTPRINTS_KEY}-${caseId}`, corrupted);
        }
        break;
    }
  }

  private async saveTestResults(results: IdempotencyTestResult[]): Promise<void> {
    const timestamp = new Date().toISOString();
    await idbStorage.set(`${this.TEST_RESULTS_KEY}-${timestamp}`, {
      timestamp,
      results,
      summary: this.generateTestSummary(results)
    });
  }

  private generateTestSummary(results: IdempotencyTestResult[]): any {
    const total = results.length;
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    
    const totalDuplicates = results.reduce((sum, r) => 
      sum + (r.testDetails?.duplicatesDetected || 0), 0
    );
    
    const totalConcurrencyIssues = results.reduce((sum, r) => 
      sum + (r.testDetails?.performanceMetrics.concurrencyIssues || 0), 0
    );

    return {
      total,
      passed,
      failed,
      successRate: (passed / total) * 100,
      duplicatesDetected: totalDuplicates,
      concurrencyIssues: totalConcurrencyIssues,
      avgTestDuration: results.reduce((sum, r) => sum + (r.duration || 0), 0) / total
    };
  }

  // QA Test integration methods
  getQATests(): QATest[] {
    return [
      {
        name: 'Task Creation Idempotency',
        description: 'Comprehensive testing of idempotent task creation across various scenarios',
        run: async () => {
          const results = await this.runAllIdempotencyTests();
          const passed = results.filter(r => r.status === 'pass').length;
          const total = results.length;
          
          const totalDuplicates = results.reduce((sum, r) => 
            sum + (r.testDetails?.duplicatesDetected || 0), 0
          );
          
          return {
            status: passed === total && totalDuplicates === 0 ? 'pass' : 'fail',
            message: `${passed}/${total} idempotency tests passed, ${totalDuplicates} duplicates detected`,
            details: {
              results: results.filter(r => r.status === 'fail'),
              duplicatesFound: totalDuplicates > 0
            },
            duration: results.reduce((sum, r) => sum + (r.duration || 0), 0)
          };
        }
      }
    ];
  }
}

export const taskIdempotencyTester = new TaskIdempotencyTester();