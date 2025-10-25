/**
 * Migration Smoke Tests
 * Validates basic CRUD operations after migration
 */

import { db, generateId } from '@/data/db';
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
    const retrieved = await db.clients.get(testClient.id);

    tests.push({
      name: 'Create and Read Client',
      passed: !!retrieved && retrieved.display_name === testClient.display_name,
      duration: Date.now() - test1Start,
    });

    // Cleanup
    await db.clients.delete(testClient.id);
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
    const retrievedCase = await db.cases.get(testCase.id);
    const retrievedClient = await db.clients.get(testClient.id);

    tests.push({
      name: 'Create Case with Client Relationship',
      passed: !!retrievedCase && retrievedCase.client_id === testClient.id && !!retrievedClient,
      duration: Date.now() - test2Start,
    });

    // Cleanup
    await db.cases.delete(testCase.id);
    await db.clients.delete(testClient.id);
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
    const counts = {
      clients: await db.clients.count(),
      cases: await db.cases.count(),
      tasks: await db.tasks.count(),
      documents: await db.documents.count(),
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
    const activeCases = await db.cases.where('status').equals('active').toArray();
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
    const followUps = await db.task_followups.toArray();
    const tasks = await db.tasks.toArray();
    
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
    const followUps = await db.task_followups.toArray();
    const tasks = await db.tasks.toArray();
    
    // Check for orphaned follow-ups
    const orphanedFollowUps = followUps.filter(f => 
      !tasks.some(t => t.id === f.taskId)
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

    await db.clients.put(testClient);

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

    await db.cases.put(testCase);

    // Verify reads
    const client = await db.clients.get(clientId);
    const case_ = await db.cases.get(caseId);

    // Cleanup
    await db.clients.delete(clientId);
    await db.cases.delete(caseId);

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
