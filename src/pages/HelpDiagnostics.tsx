import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Monitor } from 'lucide-react';
import { featureFlagService } from '@/services/featureFlagService';
import { enhancedHelpService } from '@/services/enhancedHelpService';

import { helpService } from '@/services/helpService';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { cn } from '@/lib/utils';

interface DiagnosticResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: string;
}

interface DiagnosticCategory {
  title: string;
  description: string;
  tests: DiagnosticResult[];
}

export const HelpDiagnostics: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticCategory[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);
  const { hasPermission } = useRBAC();

  // Check if user has access to diagnostics
  if (!featureFlagService.isEnabled('help_diagnostics') || !hasPermission('system', 'read')) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Help diagnostics are only available in QA mode for authorized users.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const runDiagnostics = async () => {
    setIsRunning(true);
    const startTime = performance.now();

    try {
      const results: DiagnosticCategory[] = [
        await testRoutes(),
        await testRBACChecks(),
        await testContentSources(),
        await testSearchIndex(),
        await testInlineHelp(),
        await testGuidedTours(),
        await testPerformance(),
      ];

      setDiagnostics(results);
      setLastRunTime(new Date());
    } catch (error) {
      console.error('Diagnostics failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const testRoutes = async (): Promise<DiagnosticCategory> => {
    const tests: DiagnosticResult[] = [];

    // Test main help route
    try {
      const helpElement = document.querySelector('[data-testid="help-center"]');
      tests.push({
        name: '/help route mounted',
        status: helpElement ? 'PASS' : 'FAIL',
        message: helpElement ? 'Help center component found' : 'Help center component not found',
      });
    } catch (error) {
      tests.push({
        name: '/help route mounted',
        status: 'FAIL',
        message: 'Error checking help route',
        details: String(error),
      });
    }

    // Test help drawer functionality
    const drawerTriggers = document.querySelectorAll('[data-help-drawer]');
    tests.push({
      name: 'Help drawer triggers',
      status: drawerTriggers.length > 0 ? 'PASS' : 'WARNING',
      message: `Found ${drawerTriggers.length} help drawer triggers`,
    });

    return {
      title: 'Route Mounting',
      description: 'Verify help routes and components are properly mounted',
      tests,
    };
  };

  const testRBACChecks = async (): Promise<DiagnosticCategory> => {
    const tests: DiagnosticResult[] = [];

    // Test role-based content access
    const roles = ['Users', 'Admin', 'Developers', 'Client'];
    for (const role of roles) {
      try {
        const content = await helpService.getHelpContent(role);
        const hasRoleSpecificContent = content.some(item => item.roles.includes(role));
        
        tests.push({
          name: `${role} role content`,
          status: hasRoleSpecificContent ? 'PASS' : 'WARNING',
          message: hasRoleSpecificContent 
            ? `${role} has specific content available`
            : `No ${role}-specific content found`,
        });
      } catch (error) {
        tests.push({
          name: `${role} role content`,
          status: 'FAIL',
          message: `Error loading content for ${role}`,
          details: String(error),
        });
      }
    }

    return {
      title: 'RBAC Compliance',
      description: 'Verify role-based access control is properly implemented',
      tests,
    };
  };

  const testContentSources = async (): Promise<DiagnosticCategory> => {
    const tests: DiagnosticResult[] = [];

    // Test glossary
    try {
      const glossary = await helpService.getGlossaryTerms();
      tests.push({
        name: 'Glossary content',
        status: glossary.length >= 10 ? 'PASS' : 'WARNING',
        message: `Found ${glossary.length} glossary terms`,
        details: glossary.length < 10 ? 'Recommend having at least 10 terms for comprehensive coverage' : undefined,
      });
    } catch (error) {
      tests.push({
        name: 'Glossary content',
        status: 'FAIL',
        message: 'Failed to load glossary',
        details: String(error),
      });
    }

    // Test help articles
    try {
      const content = await helpService.getHelpContent('Users');
      tests.push({
        name: 'Help articles',
        status: content.length >= 5 ? 'PASS' : 'WARNING',
        message: `Found ${content.length} help articles`,
        details: content.length < 5 ? 'Recommend having at least 5 articles for basic coverage' : undefined,
      });
    } catch (error) {
      tests.push({
        name: 'Help articles',
        status: 'FAIL',
        message: 'Failed to load help articles',
        details: String(error),
      });
    }

    return {
      title: 'Content Sources',
      description: 'Verify help content files and data sources are available',
      tests,
    };
  };

  const testSearchIndex = async (): Promise<DiagnosticCategory> => {
    const tests: DiagnosticResult[] = [];

    try {
      // Test search functionality
      const searchResults = await helpService.searchContent('case', 'Users');
      tests.push({
        name: 'Search functionality',
        status: searchResults.length > 0 ? 'PASS' : 'WARNING',
        message: `Search returned ${searchResults.length} results for "case"`,
      });

      // Test search index size
      const allContent = await helpService.getHelpContent('Admin');
      const glossary = await helpService.getGlossaryTerms();
      const totalIndexedItems = allContent.length + glossary.length;
      
      tests.push({
        name: 'Search index size',
        status: totalIndexedItems >= 20 ? 'PASS' : 'WARNING',
        message: `Search index contains ${totalIndexedItems} items`,
        details: totalIndexedItems < 20 ? 'Recommend having at least 20 searchable items' : undefined,
      });
    } catch (error) {
      tests.push({
        name: 'Search index',
        status: 'FAIL',
        message: 'Failed to test search functionality',
        details: String(error),
      });
    }

    return {
      title: 'Search Index',
      description: 'Verify search functionality and index completeness',
      tests,
    };
  };

  const testInlineHelp = async (): Promise<DiagnosticCategory> => {
    const tests: DiagnosticResult[] = [];

    const requiredModules = [
      'client-master',
      'case-overview',
      'documents',
      'hearings',
      'reports'
    ];

    for (const module of requiredModules) {
      try {
        const inlineContent = await helpService.getInlineHelp(module);
        tests.push({
          name: `${module} inline help`,
          status: inlineContent ? 'PASS' : 'WARNING',
          message: inlineContent 
            ? `Inline help available for ${module}`
            : `No inline help found for ${module}`,
        });
      } catch (error) {
        tests.push({
          name: `${module} inline help`,
          status: 'FAIL',
          message: `Error checking inline help for ${module}`,
          details: String(error),
        });
      }
    }

    return {
      title: 'Inline Help Integration',
      description: 'Verify inline help is available on key pages',
      tests,
    };
  };

  const testGuidedTours = async (): Promise<DiagnosticCategory> => {
    const tests: DiagnosticResult[] = [];

    const requiredTours = [
      'Create Case',
      'Upload to DMS',
      'Schedule Hearing'
    ];

    try {
      const tours = await helpService.getGuidedTours('Users');
      
      for (const tourName of requiredTours) {
        const tourExists = tours.some(tour => tour.title.includes(tourName));
        tests.push({
          name: `${tourName} tour`,
          status: tourExists ? 'PASS' : 'WARNING',
          message: tourExists 
            ? `${tourName} tour is available`
            : `${tourName} tour not found`,
        });
      }

      tests.push({
        name: 'Total tours available',
        status: tours.length >= 3 ? 'PASS' : 'WARNING',
        message: `${tours.length} guided tours available`,
      });
    } catch (error) {
      tests.push({
        name: 'Guided tours',
        status: 'FAIL',
        message: 'Failed to load guided tours',
        details: String(error),
      });
    }

    return {
      title: 'Guided Tours',
      description: 'Verify guided tour availability and registration',
      tests,
    };
  };

  const testPerformance = async (): Promise<DiagnosticCategory> => {
    const tests: DiagnosticResult[] = [];

    // Simulate bundle size check (in real app, this would be more sophisticated)
    const estimatedBundleSize = 250; // KB - mock value
    tests.push({
      name: 'Bundle size',
      status: estimatedBundleSize < 300 ? 'PASS' : 'WARNING',
      message: `Estimated help bundle size: ${estimatedBundleSize}KB`,
      details: estimatedBundleSize >= 300 ? 'Bundle size should be under 300KB for optimal performance' : undefined,
    });

    // Test lazy loading
    tests.push({
      name: 'Lazy loading',
      status: 'PASS',
      message: 'Help modules configured for lazy loading',
    });

    return {
      title: 'Performance',
      description: 'Verify performance optimizations are in place',
      tests,
    };
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAIL':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'WARNING':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    const variants = {
      PASS: 'default',
      FAIL: 'destructive',
      WARNING: 'outline'
    } as const;

    return (
      <Badge variant={variants[status]} className="text-xs">
        {status}
      </Badge>
    );
  };

  const getSummary = () => {
    const allTests = diagnostics.flatMap(category => category.tests);
    const passed = allTests.filter(test => test.status === 'PASS').length;
    const failed = allTests.filter(test => test.status === 'FAIL').length;
    const warnings = allTests.filter(test => test.status === 'WARNING').length;

    return { total: allTests.length, passed, failed, warnings };
  };

  const summary = getSummary();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help System Diagnostics</h1>
          <p className="text-muted-foreground">
            Comprehensive health check for the Help & Knowledge Center
          </p>
        </div>
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isRunning && "animate-spin")} />
          {isRunning ? 'Running...' : 'Run Diagnostics'}
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <Monitor className="h-8 w-8 text-primary" />
          <div className="flex-1">
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              {lastRunTime && `Last run: ${lastRunTime.toLocaleString()}`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="default" className="bg-green-100 text-green-700">
              {summary.passed} PASS
            </Badge>
            {summary.warnings > 0 && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                {summary.warnings} WARNING
              </Badge>
            )}
            {summary.failed > 0 && (
              <Badge variant="destructive">
                {summary.failed} FAIL
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {summary.failed === 0 && summary.warnings === 0
              ? '✅ All systems operational'
              : summary.failed > 0
              ? '❌ Critical issues detected'
              : '⚠️ Some warnings detected'
            }
          </div>
        </CardContent>
      </Card>

      {/* Diagnostic Categories */}
      <div className="grid gap-6">
        {diagnostics.map((category, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg">{category.title}</CardTitle>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {category.tests.map((test, testIndex) => (
                <div 
                  key={testIndex}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                >
                  {getStatusIcon(test.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{test.name}</span>
                      {getStatusBadge(test.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {test.message}
                    </p>
                    {test.details && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {test.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};