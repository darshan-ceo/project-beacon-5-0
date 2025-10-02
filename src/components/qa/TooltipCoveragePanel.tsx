import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Download,
  RefreshCw,
  Target
} from 'lucide-react';
import { uiHelpService } from '@/services/uiHelpService';

interface ModuleCoverage {
  module: string;
  total: number;
  covered: number;
  missing: string[];
  types: Record<string, number>;
}

export const TooltipCoveragePanel: React.FC = () => {
  const [coverage, setCoverage] = useState<ModuleCoverage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadCoverage();
  }, []);

  const loadCoverage = async () => {
    setIsLoading(true);
    
    // Wait for help service to be ready
    if (!uiHelpService.isReady()) {
      await uiHelpService.loadHelpData();
    }
    
    setIsReady(true);

    // Define expected help IDs per module
    const expectedHelp: Record<string, string[]> = {
      'cases': [
        'button-create-case', 'button-advance-stage', 'button-bulk-import',
        'card-case-overview', 'field-case-title', 'field-case-number'
      ],
      'clients': [
        'button-create-client', 'button-import-clients', 'button-gst-autofill',
        'field-client-name', 'field-gstin', 'field-pan'
      ],
      'tasks': [
        'button-create-task', 'button-ai-assistant', 'button-bulk-assign',
        'field-task-title', 'field-due-date', 'field-priority'
      ],
      'documents': [
        'button-upload-document', 'button-ai-draft', 'button-create-folder',
        'field-document-title', 'field-tags', 'field-category'
      ],
      'hearings': [
        'button-schedule-hearing', 'button-calendar-sync', 'button-outcome',
        'field-hearing-date', 'field-court', 'field-judge'
      ],
      'reports': [
        'button-export-csv', 'button-save-view', 'button-filter',
        'card-case-reports', 'card-hearings-report'
      ],
      'admin': [
        'menu-rbac', 'menu-storage', 'menu-session-timeout',
        'button-export-data', 'button-import-data'
      ]
    };

    const coverageData: ModuleCoverage[] = [];

    for (const [module, expectedIds] of Object.entries(expectedHelp)) {
      const covered: string[] = [];
      const missing: string[] = [];
      const types: Record<string, number> = {};

      expectedIds.forEach(id => {
        const helpData = uiHelpService.getHelp(id);
        if (helpData) {
          covered.push(id);
          types[helpData.type] = (types[helpData.type] || 0) + 1;
        } else {
          missing.push(id);
        }
      });

      coverageData.push({
        module,
        total: expectedIds.length,
        covered: covered.length,
        missing,
        types
      });
    }

    setCoverage(coverageData);
    setIsLoading(false);
  };

  const getTotalCoverage = () => {
    const total = coverage.reduce((sum, m) => sum + m.total, 0);
    const covered = coverage.reduce((sum, m) => sum + m.covered, 0);
    return { total, covered, percentage: total > 0 ? (covered / total) * 100 : 0 };
  };

  const exportReport = () => {
    const { total, covered } = getTotalCoverage();
    const csv = [
      ['Module', 'Total', 'Covered', 'Coverage %', 'Missing IDs'].join(','),
      ...coverage.map(m => [
        m.module,
        m.total,
        m.covered,
        ((m.covered / m.total) * 100).toFixed(1) + '%',
        m.missing.join('; ')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tooltip-coverage-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalStats = getTotalCoverage();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Coverage Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Tooltip Coverage Overview
          </CardTitle>
          <CardDescription>
            {isReady ? `Tracking ${uiHelpService.getCount()} help entries across ${coverage.length} modules` : 'Help service not ready'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{totalStats.covered}/{totalStats.total}</div>
                <div className="text-sm text-muted-foreground">Help entries implemented</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">{totalStats.percentage.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Coverage</div>
              </div>
            </div>

            <Progress value={totalStats.percentage} className="h-2" />

            <div className="flex gap-2 pt-2">
              <Button onClick={loadCoverage} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={exportReport} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module-by-Module Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {coverage.map(module => {
          const percentage = (module.covered / module.total) * 100;
          const status = percentage === 100 ? 'complete' : percentage >= 70 ? 'good' : 'needs-work';
          
          return (
            <Card key={module.module}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg capitalize">{module.module}</CardTitle>
                  {status === 'complete' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {status === 'good' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                  {status === 'needs-work' && <XCircle className="h-5 w-5 text-red-500" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Coverage</span>
                  <span className="font-medium">{module.covered}/{module.total} ({percentage.toFixed(0)}%)</span>
                </div>
                
                <Progress value={percentage} className="h-2" />

                {Object.keys(module.types).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(module.types).map(([type, count]) => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type}: {count}
                      </Badge>
                    ))}
                  </div>
                )}

                {module.missing.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="text-xs font-medium mb-1">Missing Help IDs:</div>
                      <div className="text-xs space-y-0.5">
                        {module.missing.map(id => (
                          <div key={id} className="font-mono text-red-600">• {id}</div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
