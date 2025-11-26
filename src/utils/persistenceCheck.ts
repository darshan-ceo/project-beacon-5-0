import { networkInterceptor } from './networkInterceptor';
import { featureFlagService } from '@/services/featureFlagService';

interface QCTestResult {
  testName: string;
  category: 'persistence' | 'retrieval' | 'providers' | 'network' | 'flags';
  status: 'pass' | 'fail' | 'skip';
  message: string;
  details?: any;
  duration: number;
}

interface QCReport {
  timestamp: Date;
  environment: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  results: QCTestResult[];
  networkStats: any;
  storageStats: any;
  featureFlags: any[];
}

class PersistenceChecker {
  private results: QCTestResult[] = [];

  async runAllChecks(): Promise<QCReport> {
    console.log('[QC] Starting comprehensive QC checks...');
    this.results = [];

    // Run all test suites
    await this.runPersistenceTests();
    await this.runRetrievalTests();
    await this.runProviderTests();
    await this.runNetworkTests();
    await this.runFeatureFlagTests();

    // Collect stats
    const networkStats = networkInterceptor.getCallStats();
    const storageStats = { mode: 'Supabase Only', indexeddb: null }; // Stubbed
    const featureFlags = featureFlagService.getAllFlags();

    const summary = this.calculateSummary();

    const report: QCReport = {
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'development',
      summary,
      results: this.results,
      networkStats,
      storageStats,
      featureFlags
    };

    console.log('[QC] QC Report:', report);
    return report;
  }

  private async runTest(
    testName: string, 
    category: QCTestResult['category'], 
    testFn: () => Promise<void>
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      await testFn();
      this.results.push({
        testName,
        category,
        status: 'pass',
        message: 'Test passed successfully',
        duration: Date.now() - startTime
      });
    } catch (error) {
      this.results.push({
        testName,
        category,
        status: 'fail',
        message: (error as Error).message,
        details: error,
        duration: Date.now() - startTime
      });
    }
  }

  private async runPersistenceTests() {
    console.log('[QC] Running persistence tests...');

    await this.runTest('Folder Creation & Persistence', 'persistence', async () => {
      const testFolder = {
        id: `test-folder-${Date.now()}`,
        name: 'QC Test Folder',
        parentId: undefined,
        caseId: 'test-case',
        documentCount: 0,
        size: 0,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        description: 'Test folder for QC',
        path: '/QC Test Folder'
      };

      // Stubbed: Supabase-only mode - no IndexedDB testing
      throw new Error('Test not supported in Supabase-only mode');
    });

    await this.runTest('Document Blob Storage', 'persistence', async () => {
      const testBlob = new Blob(['QC test content'], { type: 'text/plain' });
      const blobKey = `qc-test-${Date.now()}`;

      // Stubbed: Supabase-only mode - no IndexedDB blob testing
      throw new Error('Test not supported in Supabase-only mode');
    });

    await this.runTest('Help Article Persistence', 'persistence', async () => {
      const testArticle = {
        id: `qc-article-${Date.now()}`,
        title: 'QC Test Article',
        content: 'This is a test article for QC verification',
        category: 'QC',
        tags: ['test', 'qc'],
        status: 'draft',
        createdAt: new Date().toISOString()
      };

      // Stubbed: Supabase-only mode - no IndexedDB testing
      throw new Error('Test not supported in Supabase-only mode');
    });
  }

  private async runRetrievalTests() {
    console.log('[QC] Running retrieval tests...');

    await this.runTest('Filter Visibility Check', 'retrieval', async () => {
      // Stubbed: Supabase-only mode - no IndexedDB testing
      throw new Error('Test not supported in Supabase-only mode');
    });

    await this.runTest('Search Index Integrity', 'retrieval', async () => {
      // Stubbed: Supabase-only mode
      throw new Error('Test not supported in Supabase-only mode');
    });
  }

  private async runProviderTests() {
    console.log('[QC] Running provider tests...');

    await this.runTest('Provider Conflict Detection', 'providers', async () => {
      // Check for multiple data storage patterns
      const localStorageKeys = Object.keys(localStorage).filter(key => 
        ['folders', 'documents', 'help-articles', 'clients'].includes(key)
      );

      if (localStorageKeys.length > 0) {
        console.warn('[QC] Found legacy localStorage data:', localStorageKeys);
        // This is not necessarily a failure, but worth noting
      }
    });

    await this.runTest('Direct Fetch Usage Detection', 'providers', async () => {
      // This would require static analysis or runtime monitoring
      // For now, we'll check if fetch calls are going through our interceptor
      const networkCalls = networkInterceptor.getCalls();
      const recentCalls = networkCalls.filter(call => 
        Date.now() - call.timestamp.getTime() < 60000 // Last minute
      );

      console.log(`[QC] Recent network calls: ${recentCalls.length}`);
    });
  }

  private async runNetworkTests() {
    console.log('[QC] Running network tests...');

    await this.runTest('Dev Mode Network Isolation', 'network', async () => {
      const stats = networkInterceptor.getCallStats();
      
      if (stats.isDevMode && stats.blocked === 0 && stats.external > 0) {
        throw new Error(`Dev Mode should block external calls, but found ${stats.external} external calls`);
      }
    });

    await this.runTest('Network Call Monitoring', 'network', async () => {
      const calls = networkInterceptor.getCalls();
      const blockedCalls = networkInterceptor.getBlockedCalls();
      
      console.log(`[QC] Total calls: ${calls.length}, Blocked: ${blockedCalls.length}`);
      
      // This test verifies the interceptor is working
      if (calls.length === 0) {
        // No calls is fine, but the interceptor should be active
        console.log('[QC] No network calls detected - this may be normal');
      }
    });
  }

  private async runFeatureFlagTests() {
    console.log('[QC] Running feature flag tests...');

    await this.runTest('Feature Flag Consistency', 'flags', async () => {
      const flags = featureFlagService.getAllFlags();
      
      const requiredFlags = [
        'masters_import_export_v1',
        'ui_brand_refresh_v1', 
        'audit_logs_v1',
        'tasks_board_v2',
        'tasks_list_view_v1',
        'task_notify_on_assign_v1',
        'help_center_v1',
        'help_routes_fix_v1'
      ];

      const missingFlags = requiredFlags.filter(flag => 
        !flags.some(f => f.key === flag)
      );

      if (missingFlags.length > 0) {
        throw new Error(`Missing feature flags: ${missingFlags.join(', ')}`);
      }
    });

    await this.runTest('Feature Flag State Validation', 'flags', async () => {
      const flags = featureFlagService.getAllFlags();
      
      // Check for conflicting flags
      const conflictingPairs = [
        ['tasks_board_v2', 'tasks_list_view_v1']
      ];

      conflictingPairs.forEach(([flag1, flag2]) => {
        const flag1Enabled = featureFlagService.isEnabled(flag1);
        const flag2Enabled = featureFlagService.isEnabled(flag2);
        
        if (flag1Enabled && flag2Enabled) {
          console.warn(`[QC] Potential conflict: Both ${flag1} and ${flag2} are enabled`);
        }
      });
    });
  }

  private calculateSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;

    return { total, passed, failed, skipped };
  }

  // Specific QC scenarios from the requirements
  async runDMSScenario(): Promise<QCTestResult[]> {
    const scenarioResults: QCTestResult[] = [];
    const startTime = Date.now();

    try {
      // Create folder with client scope
      const testFolder = {
        id: `dms-test-${Date.now()}`,
        name: 'DMS QC Test',
        parentId: undefined,
        caseId: 'test-case-1',
        documentCount: 0,
        size: 0,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        description: 'DMS scenario test folder',
        path: '/DMS QC Test'
      };

      // Stubbed: Supabase-only mode - no IndexedDB testing
      throw new Error('Test not supported in Supabase-only mode');

    } catch (error) {
      scenarioResults.push({
        testName: 'DMS Folder & Document Persistence',
        category: 'persistence',
        status: 'fail',
        message: (error as Error).message,
        duration: Date.now() - startTime
      });
    }

    return scenarioResults;
  }

  async runHelpScenario(): Promise<QCTestResult[]> {
    const scenarioResults: QCTestResult[] = [];
    const startTime = Date.now();

    try {
      // Create draft article
      const draftArticle = {
        id: `help-test-${Date.now()}`,
        title: 'ASMT-10 Reply Steps',
        content: 'Detailed steps for ASMT-10 reply process...',
        category: 'Procedures',
        tags: ['ASMT-10', 'reply', 'assessment'],
        status: 'draft',
        createdAt: new Date().toISOString()
      };

      // Stubbed: Supabase-only mode - no IndexedDB testing
      throw new Error('Test not supported in Supabase-only mode');

    } catch (error) {
      scenarioResults.push({
        testName: 'Help Article Draft→Publish→Search',
        category: 'persistence',
        status: 'fail',
        message: (error as Error).message,
        duration: Date.now() - startTime
      });
    }

    return scenarioResults;
  }
}

export const persistenceChecker = new PersistenceChecker();
export type { QCTestResult, QCReport };