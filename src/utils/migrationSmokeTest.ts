/**
 * Migration Smoke Tests
 * Validates basic CRUD operations after migration
 */

import { v4 as uuid } from 'uuid';
import { StorageManager } from '@/data/StorageManager';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ClientRow = Database['public']['Tables']['clients']['Row'];
type CaseRow = Database['public']['Tables']['cases']['Row'];

/**
 * Get current user's tenant_id from profiles table
 */
async function getTenantId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new Error('No authenticated user found');
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', session.user.id)
    .single();
    
  if (!profile?.tenant_id) {
    throw new Error('No tenant_id found for user');
  }
  
  return profile.tenant_id;
}

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
    const storage = StorageManager.getInstance().getStorage();
    const tenantId = await getTenantId();
    
    const clientId = uuid();
    const testClient = {
      id: clientId,
      display_name: 'Test Client ' + Date.now(),
      tenant_id: tenantId,
      status: 'active',
    };

    await storage.create('clients', testClient);
    const retrieved = await storage.getById<ClientRow>('clients', clientId);

    tests.push({
      name: 'Create and Read Client',
      passed: !!retrieved && retrieved.display_name === testClient.display_name,
      duration: Date.now() - test1Start,
    });

    // Cleanup
    await storage.delete('clients', clientId);
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
    const storage = StorageManager.getInstance().getStorage();
    const tenantId = await getTenantId();
    
    const clientId = uuid();
    const testClient = {
      id: clientId,
      display_name: 'Test Client for Case',
      tenant_id: tenantId,
      status: 'active',
    };

    await storage.create('clients', testClient);

    const caseId = uuid();
    const testCase = {
      id: caseId,
      tenant_id: tenantId,
      client_id: clientId,
      case_number: 'TEST-' + Date.now(),
      title: 'Test Case',
      status: 'open',
      priority: 'Medium',
    };

    await storage.create('cases', testCase);
    const retrievedCase = await storage.getById<CaseRow>('cases', caseId);
    const retrievedClient = await storage.getById<ClientRow>('clients', clientId);

    tests.push({
      name: 'Create Case with Client Relationship',
      passed: !!retrievedCase && retrievedCase.client_id === clientId && !!retrievedClient,
      duration: Date.now() - test2Start,
    });

    // Cleanup
    await storage.delete('cases', caseId);
    await storage.delete('clients', clientId);
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
    const storage = StorageManager.getInstance().getStorage();
    
    const [clients, cases, tasks, documents] = await Promise.all([
      storage.getAll('clients'),
      storage.getAll('cases'),
      storage.getAll('tasks'),
      storage.getAll('documents')
    ]);
    
    tests.push({
      name: 'Load Full App State',
      passed: Array.isArray(clients) && Array.isArray(cases) && 
              Array.isArray(tasks) && Array.isArray(documents),
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
    const tenantId = await getTenantId();
    
    // Create test client
    const clientId = uuid();
    const testClient = {
      id: clientId,
      display_name: 'Canary Client',
      tenant_id: tenantId,
      status: 'active',
    };

    await storage.create('clients', testClient);

    // Create test case
    const caseId = uuid();
    const testCase = {
      id: caseId,
      tenant_id: tenantId,
      client_id: clientId,
      case_number: 'CANARY-001',
      title: 'Canary Case',
      status: 'open',
      priority: 'Medium',
    };

    await storage.create('cases', testCase);

    // Verify reads
    const client = await storage.getById<ClientRow>('clients', clientId);
    const case_ = await storage.getById<CaseRow>('cases', caseId);

    // Cleanup
    await storage.delete('cases', caseId);
    await storage.delete('clients', clientId);

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
