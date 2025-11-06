/**
 * Migration Smoke Tests
 * Validates basic CRUD operations after migration
 */

import { generateId } from '@/data/db';
import { StorageManager } from '@/data/StorageManager';
import { saveClient, saveCase, loadAppState } from '@/data/storageShim';
import type { Client, Case } from '@/data/db';

export interface SmokeTestResult {
  passed: boolean;
  tests: {
    name: string;
    passed: boolean;
    error?: string;
    duration: number;
  }[];
  totalDuration: number;
}

/**
 * Run all smoke tests
 */
export async function runMigrationSmokeTest(): Promise<SmokeTestResult> {
  const startTime = Date.now();
  const tests: SmokeTestResult['tests'] = [];

  // Test 1: Create and read client
  const test1Start = Date.now();
  try {
    const testClient: Client = {
      id: generateId(),
      display_name: 'Test Client ' + Date.now(),
      gstin: '',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };

    await saveClient(testClient);
    const storage = StorageManager.getInstance().getStorage();
    const retrieved = await storage.getById<Client>('clients', testClient.id);

    tests.push({
      name: 'Create and Read Client',
      passed: !!retrieved && retrieved.display_name === testClient.display_name,
      duration: Date.now() - test1Start,
    });

    // Cleanup
    await storage.delete('clients', testClient.id);
  } catch (error) {
    tests.push({
      name: 'Create and Read Client',
      passed: false,
      error: String(error),
      duration: Date.now() - test1Start,
    });
  }

  // Test 2: Create case with client relationship
  const test2Start = Date.now();
  try {
    const testClient: Client = {
      id: generateId(),
      display_name: 'Test Client for Case',
      gstin: '',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };

    await saveClient(testClient);

    const testCase: Case = {
      id: generateId(),
      client_id: testClient.id,
      case_number: 'TEST-' + Date.now(),
      title: 'Test Case',
      status: 'active',
      priority: 'medium',
      opened_on: new Date(),
      updated_at: new Date(),
    };

    await saveCase(testCase);
    const storage = StorageManager.getInstance().getStorage();
    const retrievedCase = await storage.getById<Case>('cases', testCase.id);
    const retrievedClient = await storage.getById<Client>('clients', testClient.id);

    tests.push({
      name: 'Create Case with Client Relationship',
      passed: !!retrievedCase && retrievedCase.client_id === testClient.id && !!retrievedClient,
      duration: Date.now() - test2Start,
    });

    // Cleanup
    await storage.delete('cases', testCase.id);
    await storage.delete('clients', testClient.id);
  } catch (error) {
    tests.push({
      name: 'Create Case with Client Relationship',
      passed: false,
      error: String(error),
      duration: Date.now() - test2Start,
    });
  }

  // Test 3: Bulk load state
  const test3Start = Date.now();
  try {
    const state = await loadAppState();
    tests.push({
      name: 'Load Full App State',
      passed: Array.isArray(state.clients) && Array.isArray(state.cases),
      duration: Date.now() - test3Start,
    });
  } catch (error) {
    tests.push({
      name: 'Load Full App State',
      passed: false,
      error: String(error),
      duration: Date.now() - test3Start,
    });
  }

  // Test 4: Count records
  const test4Start = Date.now();
  try {
    const storage = StorageManager.getInstance().getStorage();
    const [clients, cases, tasks, documents] = await Promise.all([
      storage.getAll('clients'),
      storage.getAll('cases'),
      storage.getAll('tasks'),
      storage.getAll('documents')
    ]);
    
    const counts = {
      clients: clients.length,
      cases: cases.length,
      tasks: tasks.length,
      documents: documents.length,
    };

    tests.push({
      name: 'Count All Records',
      passed: typeof counts.clients === 'number',
      duration: Date.now() - test4Start,
    });
  } catch (error) {
    tests.push({
      name: 'Count All Records',
      passed: false,
      error: String(error),
      duration: Date.now() - test4Start,
    });
  }

  // Test 5: Query by field
  const test5Start = Date.now();
  try {
    const storage = StorageManager.getInstance().getStorage();
    const activeCases = await storage.queryByField('cases', 'status', 'active');
    tests.push({
      name: 'Query Cases by Status',
      passed: Array.isArray(activeCases),
      duration: Date.now() - test5Start,
    });
  } catch (error) {
    tests.push({
      name: 'Query Cases by Status',
      passed: false,
      error: String(error),
      duration: Date.now() - test5Start,
    });
  }

  // Test 6: Follow-up specific tests
  const test6Start = Date.now();
  try {
    const storage = StorageManager.getInstance().getStorage();
    const followUps = await storage.getAll('task_followups');
    const tasks = await storage.getAll('tasks');
    
    // Check: Tasks with follow-ups should be locked
    const tasksWithFollowUps = tasks.filter((t: any) => 
      followUps.some((f: any) => f.taskId === t.id)
    );
    const unlockedWithFollowUps = tasksWithFollowUps.filter((t: any) => !t.isLocked);
    
    tests.push({
      name: 'Task Locking Consistency',
      passed: unlockedWithFollowUps.length === 0,
      error: unlockedWithFollowUps.length > 0 ? 
        `${unlockedWithFollowUps.length} tasks have follow-ups but are not locked` : undefined,
      duration: Date.now() - test6Start
    });
  } catch (error) {
    tests.push({
      name: 'Task Locking Consistency',
      passed: false,
      error: String(error),
      duration: Date.now() - test6Start
    });
  }

  // Test 7: Follow-up migration integrity
  const test7Start = Date.now();
  try {
    const storage = StorageManager.getInstance().getStorage();
    const followUps = await storage.getAll('task_followups');
    const tasks = await storage.getAll('tasks');
    
    // Check for orphaned follow-ups
    const orphanedFollowUps = followUps.filter((f: any) => 
      !tasks.some((t: any) => t.id === f.taskId)
    );
    
    tests.push({
      name: 'Follow-Up Migration Integrity',
      passed: orphanedFollowUps.length === 0,
      error: orphanedFollowUps.length > 0 ? 
        `${orphanedFollowUps.length} orphaned follow-ups found` : undefined,
      duration: Date.now() - test7Start
    });
  } catch (error) {
    tests.push({
      name: 'Follow-Up Migration Integrity',
      passed: false,
      error: String(error),
      duration: Date.now() - test7Start
    });
  }

  const allPassed = tests.every(t => t.passed);

  return {
    passed: allPassed,
    tests,
    totalDuration: Date.now() - startTime,
  };
}

/**
 * Quick canary test for basic DB connectivity
 */
export async function quickCanary(): Promise<{
  success: boolean;
  clientId?: string;
  caseId?: string;
  stores: string[];
  error?: string;
}> {
  try {
    const storage = StorageManager.getInstance().getStorage();
    
    // Create test client
    const clientId = generateId();
    const testClient: Client = {
      id: clientId,
      display_name: 'Canary Client',
      gstin: '',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };

    await storage.create('clients', testClient);

    // Create test case
    const caseId = generateId();
    const testCase: Case = {
      id: caseId,
      client_id: clientId,
      case_number: 'CANARY-001',
      title: 'Canary Case',
      status: 'active',
      priority: 'medium',
      opened_on: new Date(),
      updated_at: new Date(),
    };

    await storage.create('cases', testCase);

    // Verify reads
    const client = await storage.getById<Client>('clients', clientId);
    const case_ = await storage.getById<Case>('cases', caseId);

    // Cleanup
    await storage.delete('clients', clientId);
    await storage.delete('cases', caseId);

    return {
      success: !!client && !!case_,
      clientId,
      caseId,
      stores: ['clients', 'cases', 'tasks', 'documents', 'hearings'],
    };
  } catch (error) {
    return {
      success: false,
      stores: [],
      error: String(error),
    };
  }
}
