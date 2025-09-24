/**
 * Task Bundle Automation QA Service
 * Tests for task bundle triggering and automation
 */

import { taskBundleTriggerService } from './taskBundleTriggerService';
import { TaskBundleRepository } from '@/data/repositories/TaskBundleRepository';
import { StorageManager } from '@/data/StorageManager';
import { QATestResult } from './qaService';
import { GSTStage } from '../../config/appConfig';

interface BundleTestCase {
  name: string;
  description: string;
  bundleData: {
    name: string;
    trigger: string;
    stage_code?: string;
    items: Array<{
      title: string;
      priority: string;
      estimated_hours: number;
    }>;
  };
  caseData: {
    id: string;
    caseNumber: string;
    clientId: string;
    assignedToId: string;
    assignedToName: string;
    currentStage: string;
  };
  trigger: string;
  stage: GSTStage;
  expected: {
    shouldCreateTasks: boolean;
    expectedTaskCount: number;
    shouldBeIdempotent: boolean;
  };
}

interface BundleAutomationTestResult {
  testName: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  timestamp: string;
  duration: number;
  bundleId?: string;
  tasksCreated?: number;
  idempotencyVerified?: boolean;
  triggerMatched?: boolean;
}

class TaskBundleAutomationQA {
  private testCases: BundleTestCase[] = [];
  private repository: TaskBundleRepository | null = null;

  constructor() {
    this.initializeTestCases();
  }

  private async getRepository(): Promise<TaskBundleRepository> {
    if (!this.repository) {
      await StorageManager.getInstance().initialize();
      this.repository = StorageManager.getInstance().getTaskBundleRepository();
      if (!this.repository) {
        throw new Error('TaskBundleRepository not available');
      }
    }
    return this.repository;
  }

  private initializeTestCases(): void {
    this.testCases = [
      {
        name: 'OnStageEnter Bundle Creation',
        description: 'Test that bundles trigger correctly when entering a specific stage',
        bundleData: {
          name: 'Intake Stage Tasks',
          trigger: 'OnStageEnter',
          stage_code: 'Intake & KYC',
          items: [
            { title: 'Review Initial Documents', priority: 'High', estimated_hours: 4 },
            { title: 'Validate Client Information', priority: 'Medium', estimated_hours: 2 }
          ]
        },
        caseData: {
          id: 'test-case-1',
          caseNumber: 'TEST-001',
          clientId: 'client-1',
          assignedToId: 'emp-1',
          assignedToName: 'Test Employee',
          currentStage: 'Intake & KYC'
        },
        trigger: 'OnStageEnter',
        stage: 'Intake & KYC',
        expected: {
          shouldCreateTasks: true,
          expectedTaskCount: 2,
          shouldBeIdempotent: true
        }
      },
      {
        name: 'Any Stage Bundle Creation',
        description: 'Test that bundles with "Any Stage" trigger on any stage transition',
        bundleData: {
          name: 'Universal Tasks',
          trigger: 'OnStageEnter',
          stage_code: 'Any Stage',
          items: [
            { title: 'Update Case Timeline', priority: 'Low', estimated_hours: 1 }
          ]
        },
        caseData: {
          id: 'test-case-2',
          caseNumber: 'TEST-002',
          clientId: 'client-2',
          assignedToId: 'emp-2',
          assignedToName: 'Test Employee 2',
          currentStage: 'DRC-01 SCN Received'
        },
        trigger: 'OnStageEnter',
        stage: 'DRC-01 SCN Received',
        expected: {
          shouldCreateTasks: true,
          expectedTaskCount: 1,
          shouldBeIdempotent: true
        }
      },
      {
        name: 'Stage Mismatch No Creation',
        description: 'Test that bundles do not trigger when stage does not match',
        bundleData: {
          name: 'Appeal Specific Tasks',
          trigger: 'OnStageEnter',
          stage_code: 'Appeal Filed – APL-01',
          items: [
            { title: 'Prepare Appeal Filing', priority: 'Critical', estimated_hours: 8 }
          ]
        },
        caseData: {
          id: 'test-case-3',
          caseNumber: 'TEST-003',
          clientId: 'client-3',
          assignedToId: 'emp-3',
          assignedToName: 'Test Employee 3',
          currentStage: 'Intake & KYC'
        },
        trigger: 'OnStageEnter',
        stage: 'Intake & KYC',
        expected: {
          shouldCreateTasks: false,
          expectedTaskCount: 0,
          shouldBeIdempotent: true
        }
      }
    ];
  }

  async runAllBundleTests(): Promise<BundleAutomationTestResult[]> {
    console.log('[BundleAutomationQA] Starting task bundle automation tests...');
    const results: BundleAutomationTestResult[] = [];

    for (const testCase of this.testCases) {
      try {
        const result = await this.runBundleTest(testCase);
        results.push(result);
      } catch (error) {
        results.push({
          testName: testCase.name,
          status: 'fail',
          message: `Test failed with error: ${error}`,
          timestamp: new Date().toISOString(),
          duration: 0
        });
      }
    }

    // Save results
    await this.saveBundleTestResults(results);
    
    const passedCount = results.filter(r => r.status === 'pass').length;
    console.log(`[BundleAutomationQA] Completed ${results.length} tests. ${passedCount} passed, ${results.length - passedCount} failed.`);
    
    return results;
  }

  async runBundleTest(testCase: BundleTestCase): Promise<BundleAutomationTestResult> {
    const startTime = Date.now();
    console.log(`[BundleAutomationQA] Running test: ${testCase.name}`);

    try {
      // Setup: Create test bundle
      const repository = await this.getRepository();
      const bundle = await repository.createWithItems(testCase.bundleData);

      // Execute: Trigger bundle automation
      const result = await taskBundleTriggerService.triggerTaskBundles(
        testCase.caseData,
        testCase.trigger,
        testCase.stage
      );

      // Validate results
      const tasksCreated = result.totalTasksCreated;
      const shouldCreateTasks = testCase.expected.shouldCreateTasks;
      const expectedTaskCount = testCase.expected.expectedTaskCount;

      let passed = true;
      let message = '';

      // Check task creation expectation
      if (shouldCreateTasks && tasksCreated !== expectedTaskCount) {
        passed = false;
        message = `Expected ${expectedTaskCount} tasks, but ${tasksCreated} were created`;
      } else if (!shouldCreateTasks && tasksCreated > 0) {
        passed = false;
        message = `Expected no tasks to be created, but ${tasksCreated} were created`;
      }

      // Test idempotency if required
      let idempotencyVerified = false;
      if (testCase.expected.shouldBeIdempotent && shouldCreateTasks) {
        const secondResult = await taskBundleTriggerService.triggerTaskBundles(
          testCase.caseData,
          testCase.trigger,
          testCase.stage
        );
        
        if (secondResult.totalTasksCreated === 0) {
          idempotencyVerified = true;
        } else {
          passed = false;
          message += ` | Idempotency failed: ${secondResult.totalTasksCreated} duplicate tasks created`;
        }
      }

      // Cleanup: Delete test bundle
      await repository.delete(bundle.id);

      if (passed && !message) {
        message = `Successfully ${shouldCreateTasks ? 'created' : 'skipped'} ${tasksCreated} tasks as expected`;
      }

      return {
        testName: testCase.name,
        status: passed ? 'pass' : 'fail',
        message,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        bundleId: bundle.id,
        tasksCreated,
        idempotencyVerified,
        triggerMatched: shouldCreateTasks === (tasksCreated > 0)
      };

    } catch (error) {
      return {
        testName: testCase.name,
        status: 'fail',
        message: `Test execution failed: ${error}`,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };
    }
  }

  getQATests() {
    return [
      {
        category: 'Task Bundle Automation',
        name: 'Bundle Trigger Tests',
        description: 'Tests task bundle triggering on stage transitions',
        run: () => this.runAllBundleTests()
      },
      {
        category: 'Task Bundle Automation',
        name: 'Bundle Idempotency Test',
        description: 'Tests that bundles do not create duplicate tasks',
        run: () => this.testBundleIdempotency()
      },
      {
        category: 'Task Bundle Automation',
        name: 'Bundle Stage Matching Test',
        description: 'Tests that bundles respect stage conditions',
        run: () => this.testStageMatching()
      }
    ];
  }

  private async testBundleIdempotency(): Promise<BundleAutomationTestResult[]> {
    // Run the same bundle trigger multiple times and ensure no duplicates
    const testCase = this.testCases[0]; // Use first test case
    const results: BundleAutomationTestResult[] = [];

    const repository = await this.getRepository();
    const bundle = await repository.createWithItems(testCase.bundleData);

    try {
      // First trigger
      const result1 = await taskBundleTriggerService.triggerTaskBundles(
        testCase.caseData,
        testCase.trigger,
        testCase.stage
      );

      // Second trigger (should create no new tasks)
      const result2 = await taskBundleTriggerService.triggerTaskBundles(
        testCase.caseData,
        testCase.trigger,
        testCase.stage
      );

      const passed = result1.totalTasksCreated > 0 && result2.totalTasksCreated === 0;
      
      results.push({
        testName: 'Bundle Idempotency Test',
        status: passed ? 'pass' : 'fail',
        message: passed 
          ? `Idempotency verified: First run created ${result1.totalTasksCreated} tasks, second run created ${result2.totalTasksCreated} tasks`
          : `Idempotency failed: First run created ${result1.totalTasksCreated} tasks, second run created ${result2.totalTasksCreated} tasks`,
        timestamp: new Date().toISOString(),
        duration: 0,
        idempotencyVerified: passed
      });

    } finally {
      await repository.delete(bundle.id);
    }

    return results;
  }

  private async testStageMatching(): Promise<BundleAutomationTestResult[]> {
    // Test that bundles only trigger for matching stages
    const results: BundleAutomationTestResult[] = [];
    
    const repository = await this.getRepository();
    const bundle = await repository.createWithItems({
      name: 'Stage Specific Test',
      trigger: 'OnStageEnter',
      stage_code: 'Appeal Filed – APL-01',
      items: [{ title: 'Test Task', priority: 'Medium', estimated_hours: 4 }]
    });

    try {
      // Test with matching stage
      const matchingResult = await taskBundleTriggerService.triggerTaskBundles(
        { ...this.testCases[0].caseData, currentStage: 'Appeal Filed – APL-01' },
        'OnStageEnter',
        'Appeal Filed – APL-01'
      );

      // Test with non-matching stage
      const nonMatchingResult = await taskBundleTriggerService.triggerTaskBundles(
        { ...this.testCases[0].caseData, currentStage: 'Intake & KYC' },
        'OnStageEnter',
        'Intake & KYC'
      );

      const passed = matchingResult.totalTasksCreated > 0 && nonMatchingResult.totalTasksCreated === 0;
      
      results.push({
        testName: 'Bundle Stage Matching Test',
        status: passed ? 'pass' : 'fail',
        message: passed 
          ? `Stage matching verified: Appeal stage created ${matchingResult.totalTasksCreated} tasks, Intake created ${nonMatchingResult.totalTasksCreated} tasks`
          : `Stage matching failed: Appeal stage created ${matchingResult.totalTasksCreated} tasks, Intake created ${nonMatchingResult.totalTasksCreated} tasks`,
        timestamp: new Date().toISOString(),
        duration: 0,
        triggerMatched: passed
      });

    } finally {
      await repository.delete(bundle.id);
    }

    return results;
  }

  private async saveBundleTestResults(results: BundleAutomationTestResult[]): Promise<void> {
    try {
      const storage = StorageManager.getInstance().getStorage();
      if (storage) {
        await storage.create('qa_test_results', {
          id: `bundle-automation-${Date.now()}`,
          category: 'bundle_automation',
          results,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('[BundleAutomationQA] Failed to save test results:', error);
    }
  }
}

export const taskBundleAutomationQA = new TaskBundleAutomationQA();