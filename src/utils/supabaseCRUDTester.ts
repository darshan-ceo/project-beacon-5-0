/**
 * Supabase CRUD Operation Tester
 * Tests Create, Read, Update, Delete operations for all major entities
 * Helps verify the SupabaseAdapter is working correctly
 */

import { storageManager } from '@/data/StorageManager';
import { v4 as uuidv4 } from 'uuid';

interface TestResult {
  entity: string;
  operation: string;
  success: boolean;
  duration: number;
  error?: string;
  recordId?: string;
}

export class SupabaseCRUDTester {
  private results: TestResult[] = [];

  /**
   * Test a single entity's CRUD operations
   */
  private async testEntity(
    entityName: string,
    tableName: string,
    createData: any
  ): Promise<void> {
    console.log(`\n🧪 Testing ${entityName}...`);
    let testRecordId: string | null = null;

    try {
      const storage = storageManager.getStorage();

      // TEST 1: CREATE
      const createStart = Date.now();
      try {
        const created = await storage.create(tableName, createData);
        testRecordId = created.id;
        this.results.push({
          entity: entityName,
          operation: 'CREATE',
          success: true,
          duration: Date.now() - createStart,
          recordId: testRecordId
        });
        console.log(`  ✅ CREATE successful (${Date.now() - createStart}ms) - ID: ${testRecordId}`);
      } catch (error: any) {
        this.results.push({
          entity: entityName,
          operation: 'CREATE',
          success: false,
          duration: Date.now() - createStart,
          error: error.message
        });
        console.error(`  ❌ CREATE failed:`, error.message);
        return; // Skip other tests if create fails
      }

      // TEST 2: READ
      const readStart = Date.now();
      try {
        const record = await storage.getById(tableName, testRecordId!);
        if (record) {
          this.results.push({
            entity: entityName,
            operation: 'READ',
            success: true,
            duration: Date.now() - readStart
          });
          console.log(`  ✅ READ successful (${Date.now() - readStart}ms)`);
        } else {
          throw new Error('Record not found after creation');
        }
      } catch (error: any) {
        this.results.push({
          entity: entityName,
          operation: 'READ',
          success: false,
          duration: Date.now() - readStart,
          error: error.message
        });
        console.error(`  ❌ READ failed:`, error.message);
      }

      // TEST 3: UPDATE
      const updateStart = Date.now();
      try {
        const updateData: any = entityName === 'Client' 
          ? { status: 'inactive' }
          : { status: 'completed' };
        
        await storage.update(tableName, testRecordId!, updateData);
        this.results.push({
          entity: entityName,
          operation: 'UPDATE',
          success: true,
          duration: Date.now() - updateStart
        });
        console.log(`  ✅ UPDATE successful (${Date.now() - updateStart}ms)`);
      } catch (error: any) {
        this.results.push({
          entity: entityName,
          operation: 'UPDATE',
          success: false,
          duration: Date.now() - updateStart,
          error: error.message
        });
        console.error(`  ❌ UPDATE failed:`, error.message);
      }

      // TEST 4: DELETE
      const deleteStart = Date.now();
      try {
        await storage.delete(tableName, testRecordId!);
        this.results.push({
          entity: entityName,
          operation: 'DELETE',
          success: true,
          duration: Date.now() - deleteStart
        });
        console.log(`  ✅ DELETE successful (${Date.now() - deleteStart}ms)`);
      } catch (error: any) {
        this.results.push({
          entity: entityName,
          operation: 'DELETE',
          success: false,
          duration: Date.now() - deleteStart,
          error: error.message
        });
        console.error(`  ❌ DELETE failed:`, error.message);
      }

    } catch (error: any) {
      console.error(`  ❌ Entity test setup failed:`, error);
    }
  }

  /**
   * Test document upload
   */
  private async testDocumentUpload(): Promise<void> {
    console.log(`\n🧪 Testing Document Upload...`);
    const testStart = Date.now();

    try {
      const storage = storageManager.getStorage();
      
      // Create a test blob
      const testContent = `Test Document Content - ${Date.now()}`;
      const blob = new Blob([testContent], { type: 'text/plain' });
      const testFile = new File([blob], `test_doc_${Date.now()}.txt`, { type: 'text/plain' });

      // Get current user's tenant_id
      const allClients = await storage.getAll('clients');
      const tenantId = allClients.length > 0 ? (allClients[0] as any).tenant_id : null;

      if (!tenantId) {
        throw new Error('No tenant_id found - create a client first');
      }

      // Upload using supabaseDocumentService
      const { supabaseDocumentService } = await import('@/services/supabaseDocumentService');
      const result = await supabaseDocumentService.uploadDocument(testFile, {
        tenant_id: tenantId,
        category: 'Test',
        role: 'Testing'
      });

      this.results.push({
        entity: 'Document',
        operation: 'UPLOAD',
        success: true,
        duration: Date.now() - testStart,
        recordId: result.id
      });
      console.log(`  ✅ UPLOAD successful (${Date.now() - testStart}ms) - ID: ${result.id}`);

      // Test download URL
      const downloadStart = Date.now();
      const downloadUrl = await supabaseDocumentService.getDownloadUrl(result.file_path);
      this.results.push({
        entity: 'Document',
        operation: 'GET_URL',
        success: true,
        duration: Date.now() - downloadStart
      });
      console.log(`  ✅ GET_URL successful (${Date.now() - downloadStart}ms)`);

      // Clean up: delete the test document
      const deleteStart = Date.now();
      await supabaseDocumentService.deleteDocument(result.id);
      this.results.push({
        entity: 'Document',
        operation: 'DELETE',
        success: true,
        duration: Date.now() - deleteStart
      });
      console.log(`  ✅ DELETE successful (${Date.now() - deleteStart}ms)`);

    } catch (error: any) {
      this.results.push({
        entity: 'Document',
        operation: 'UPLOAD',
        success: false,
        duration: Date.now() - testStart,
        error: error.message
      });
      console.error(`  ❌ Document upload failed:`, error.message);
    }
  }

  /**
   * Run all CRUD tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Supabase CRUD Tests...\n');
    this.results = [];

    const testDate = new Date().toISOString();

    // Test Client
    await this.testEntity('Client', 'clients', {
      id: uuidv4(),
      display_name: `TEST_CLIENT_${Date.now()}`,
      status: 'active',
      email: 'test@example.com'
    });

    // Test Case  
    await this.testEntity('Case', 'cases', {
      id: uuidv4(),
      case_number: `TEST-${Date.now()}`,
      title: 'Test Case',
      client_id: uuidv4(), // Will be null due to FK validation
      status: 'open'
    });

    // Test Task
    await this.testEntity('Task', 'tasks', {
      id: uuidv4(),
      title: 'Test Task',
      description: 'Test task description',
      status: 'Pending',
      priority: 'Medium'
    });

    // Test Hearing
    await this.testEntity('Hearing', 'hearings', {
      id: uuidv4(),
      case_id: uuidv4(), // Will be null due to FK validation
      hearing_date: testDate,
      status: 'Scheduled'
    });

    // Test Document Upload
    await this.testDocumentUpload();

    this.printSummary();
  }

  /**
   * Print test summary
   */
  printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CRUD TEST SUMMARY');
    console.log('='.repeat(60) + '\n');

    const byEntity = this.results.reduce((acc, result) => {
      if (!acc[result.entity]) {
        acc[result.entity] = [];
      }
      acc[result.entity].push(result);
      return acc;
    }, {} as Record<string, TestResult[]>);

    Object.entries(byEntity).forEach(([entity, results]) => {
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      const successRate = ((successCount / totalCount) * 100).toFixed(0);
      const avgDuration = Math.round(
        results.reduce((sum, r) => sum + r.duration, 0) / results.length
      );

      console.log(`${entity}:`);
      console.log(`  Success Rate: ${successCount}/${totalCount} (${successRate}%)`);
      console.log(`  Avg Duration: ${avgDuration}ms`);
      
      results.forEach(r => {
        const icon = r.success ? '✅' : '❌';
        const details = r.error ? ` - ${r.error}` : '';
        console.log(`    ${icon} ${r.operation} (${r.duration}ms)${details}`);
      });
      console.log('');
    });

    const totalSuccess = this.results.filter(r => r.success).length;
    const totalTests = this.results.length;
    const overallRate = ((totalSuccess / totalTests) * 100).toFixed(0);
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log('OVERALL:');
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  Passed: ${totalSuccess}`);
    console.log(`  Failed: ${totalTests - totalSuccess}`);
    console.log(`  Success Rate: ${overallRate}%`);
    console.log(`  Total Duration: ${totalDuration}ms`);
    console.log('\n' + '='.repeat(60) + '\n');
  }

  getResults(): TestResult[] {
    return this.results;
  }
}

// Export singleton
export const supabaseCRUDTester = new SupabaseCRUDTester();

// Convenience function
export const testSupabaseCRUD = async (): Promise<void> => {
  await supabaseCRUDTester.runAllTests();
};

// Make it available in console for manual testing
if (typeof window !== 'undefined') {
  (window as any).testSupabaseCRUD = testSupabaseCRUD;
  console.log('💡 Run testSupabaseCRUD() in console to test Supabase CRUD operations');
}
