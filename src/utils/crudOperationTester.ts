/**
 * CRUD Operation Tester
 * Utility for testing all CRUD operations across modules
 * Use in development to verify Supabase integration
 */

import { storageManager } from '@/data/StorageManager';
import { v4 as uuidv4 } from 'uuid';

interface TestResult {
  entity: string;
  operation: 'create' | 'read' | 'update' | 'delete';
  success: boolean;
  error?: string;
  duration: number;
}

export class CRUDTester {
  private results: TestResult[] = [];
  
  async testEntity(
    entityName: string,
    tableName: string,
    sampleData: any
  ): Promise<void> {
    const storage = storageManager.getStorage();
    let testId: string | null = null;
    
    // Test CREATE
    try {
      const startCreate = performance.now();
      const created = await storage.create(tableName, {
        id: uuidv4(),
        ...sampleData
      });
      testId = created.id;
      const durationCreate = performance.now() - startCreate;
      
      this.results.push({
        entity: entityName,
        operation: 'create',
        success: true,
        duration: durationCreate
      });
      
      console.log(`✅ ${entityName} CREATE: ${durationCreate.toFixed(2)}ms`);
    } catch (error) {
      this.results.push({
        entity: entityName,
        operation: 'create',
        success: false,
        error: error.message,
        duration: 0
      });
      
      console.error(`❌ ${entityName} CREATE failed:`, error);
      return; // Skip other tests if create fails
    }
    
    // Test READ
    try {
      const startRead = performance.now();
      const read = await storage.getById(tableName, testId!);
      const durationRead = performance.now() - startRead;
      
      if (!read) throw new Error('Record not found after create');
      
      this.results.push({
        entity: entityName,
        operation: 'read',
        success: true,
        duration: durationRead
      });
      
      console.log(`✅ ${entityName} READ: ${durationRead.toFixed(2)}ms`);
    } catch (error) {
      this.results.push({
        entity: entityName,
        operation: 'read',
        success: false,
        error: error.message,
        duration: 0
      });
      
      console.error(`❌ ${entityName} READ failed:`, error);
    }
    
    // Test UPDATE
    try {
      const startUpdate = performance.now();
      await storage.update(tableName, testId!, {
        ...sampleData,
        id: testId,
        updated_at: new Date().toISOString()
      } as any);
      const durationUpdate = performance.now() - startUpdate;
      
      this.results.push({
        entity: entityName,
        operation: 'update',
        success: true,
        duration: durationUpdate
      });
      
      console.log(`✅ ${entityName} UPDATE: ${durationUpdate.toFixed(2)}ms`);
    } catch (error) {
      this.results.push({
        entity: entityName,
        operation: 'update',
        success: false,
        error: error.message,
        duration: 0
      });
      
      console.error(`❌ ${entityName} UPDATE failed:`, error);
    }
    
    // Test DELETE
    try {
      const startDelete = performance.now();
      await storage.delete(tableName, testId!);
      const durationDelete = performance.now() - startDelete;
      
      this.results.push({
        entity: entityName,
        operation: 'delete',
        success: true,
        duration: durationDelete
      });
      
      console.log(`✅ ${entityName} DELETE: ${durationDelete.toFixed(2)}ms`);
    } catch (error) {
      this.results.push({
        entity: entityName,
        operation: 'delete',
        success: false,
        error: error.message,
        duration: 0
      });
      
      console.error(`❌ ${entityName} DELETE failed:`, error);
    }
  }
  
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting CRUD Operation Tests...\n');
    
    // Note: You'll need to provide actual tenant_id from auth
    const commonFields = {
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Test Cases
    await this.testEntity('Case', 'cases', {
      ...commonFields,
      case_number: `TEST-${Date.now()}`,
      title: 'Test Case',
      client_id: uuidv4(), // Will fail FK if client doesn't exist - that's ok for testing
      status: 'open'
    });
    
    // Test Clients
    await this.testEntity('Client', 'clients', {
      ...commonFields,
      display_name: 'Test Client',
      status: 'active'
    });
    
    // Test Tasks
    await this.testEntity('Task', 'tasks', {
      ...commonFields,
      title: 'Test Task',
      status: 'pending'
    });
    
    // Test Hearings
    await this.testEntity('Hearing', 'hearings', {
      ...commonFields,
      case_id: uuidv4(), // Will fail FK if case doesn't exist
      hearing_date: new Date().toISOString(),
      status: 'Scheduled'
    });
    
    // Test Documents
    await this.testEntity('Document', 'documents', {
      ...commonFields,
      file_name: 'test-document.pdf',
      file_path: '/test/path',
      file_type: 'pdf',
      file_size: 1024,
      uploaded_by: uuidv4()
    });
    
    // Test Courts
    await this.testEntity('Court', 'courts', {
      ...commonFields,
      name: 'Test Court',
      type: 'High Court'
    });
    
    // Test Judges
    await this.testEntity('Judge', 'judges', {
      ...commonFields,
      name: 'Test Judge'
    });
    
    // Test Client Groups
    await this.testEntity('Client Group', 'client_groups', {
      ...commonFields,
      name: 'Test Group',
      code: `TG-${Date.now()}`,
      total_clients: 0
    });
    
    this.printSummary();
  }
  
  printSummary(): void {
    console.log('\n📊 CRUD Test Summary\n');
    console.log('═'.repeat(80));
    
    const entities = [...new Set(this.results.map(r => r.entity))];
    
    entities.forEach(entity => {
      const entityResults = this.results.filter(r => r.entity === entity);
      const passed = entityResults.filter(r => r.success).length;
      const total = entityResults.length;
      const avgDuration = entityResults
        .filter(r => r.success)
        .reduce((acc, r) => acc + r.duration, 0) / passed || 0;
      
      console.log(`\n${entity}:`);
      console.log(`  Status: ${passed}/${total} passed`);
      if (avgDuration > 0) {
        console.log(`  Avg Duration: ${avgDuration.toFixed(2)}ms`);
      }
      
      entityResults.forEach(result => {
        const icon = result.success ? '✅' : '❌';
        const msg = result.success
          ? `${result.operation.toUpperCase()} (${result.duration.toFixed(2)}ms)`
          : `${result.operation.toUpperCase()} - ${result.error}`;
        console.log(`    ${icon} ${msg}`);
      });
    });
    
    console.log('\n═'.repeat(80));
    
    const totalPassed = this.results.filter(r => r.success).length;
    const totalTests = this.results.length;
    const successRate = ((totalPassed / totalTests) * 100).toFixed(1);
    
    console.log(`\nOverall: ${totalPassed}/${totalTests} tests passed (${successRate}%)`);
    
    if (totalPassed < totalTests) {
      console.log('\n⚠️  Some tests failed. Check errors above for details.');
    } else {
      console.log('\n🎉 All tests passed!');
    }
  }
  
  getResults(): TestResult[] {
    return this.results;
  }
}

// Export singleton instance
export const crudTester = new CRUDTester();

// Convenience function to run all tests
export async function testAllCRUDOperations(): Promise<void> {
  await crudTester.runAllTests();
}
