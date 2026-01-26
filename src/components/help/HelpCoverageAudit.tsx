/**
 * Help Coverage Audit Dashboard
 * Admin component for tracking help documentation coverage
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  RefreshCw, 
  Download,
  ChevronDown,
  ChevronRight,
  FileText,
  BookOpen,
  HelpCircle,
  MessageSquare,
  Layout
} from 'lucide-react';
import { helpValidationService, CoverageReport, ValidationResult } from '@/services/helpValidationService';
import { moduleRegistry } from '@/registry/moduleRegistry';

export const HelpCoverageAudit: React.FC = () => {
  const [report, setReport] = useState<CoverageReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    runAudit();
  }, []);

  const runAudit = async () => {
    setIsLoading(true);
    try {
      const coverageReport = await helpValidationService.generateCoverageReport();
      setReport(coverageReport);
    } catch (error) {
      console.error('Failed to run help audit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = () => {
    if (!report) return;
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `help-coverage-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const getStatusIcon = (coverage: number) => {
    if (coverage === 100) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (coverage >= 50) return <AlertCircle className="h-5 w-5 text-amber-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusBadge = (coverage: number) => {
    if (coverage === 100) return <Badge className="bg-green-100 text-green-800">Complete</Badge>;
    if (coverage >= 50) return <Badge className="bg-amber-100 text-amber-800">Partial</Badge>;
    return <Badge className="bg-red-100 text-red-800">Missing</Badge>;
  };

  const getCoverageColor = (coverage: number): string => {
    if (coverage === 100) return 'bg-green-500';
    if (coverage >= 70) return 'bg-amber-500';
    return 'bg-red-500';
  };

  if (!report) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading help coverage audit...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Help Coverage Audit
              </CardTitle>
              <CardDescription>
                Validates help documentation for all registered modules
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={runAudit}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Running...' : 'Run Audit'}
              </Button>
              <Button variant="outline" size="sm" onClick={exportReport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold">{report.overallCoverage}%</div>
              <div className="text-sm text-muted-foreground">Overall Coverage</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold">{report.summary.totalModules}</div>
              <div className="text-sm text-muted-foreground">Total Modules</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-700">{report.summary.completeModules}</div>
              <div className="text-sm text-green-600">Complete</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <div className="text-3xl font-bold text-amber-700">{report.summary.partialModules}</div>
              <div className="text-sm text-amber-600">Partial</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-3xl font-bold text-red-700">{report.summary.incompleteModules}</div>
              <div className="text-sm text-red-600">Incomplete</div>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Documentation Coverage</span>
              <span className="font-medium">{report.overallCoverage}%</span>
            </div>
            <Progress 
              value={report.overallCoverage} 
              className="h-3"
            />
          </div>

          {/* Thresholds */}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Thresholds:</span>
            <Badge variant="outline">Tooltips: {report.thresholds.tooltips * 100}%</Badge>
            <Badge variant="outline">Tours: {report.thresholds.tours * 100}%</Badge>
            <Badge variant="outline">Operations: {report.thresholds.operations * 100}%</Badge>
            <Badge variant="outline">FAQ: {report.thresholds.faq * 100}%</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Module Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Module Coverage Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.moduleResults.map((result) => (
            <Collapsible 
              key={result.moduleId}
              open={expandedModules.has(result.moduleId)}
              onOpenChange={() => toggleModule(result.moduleId)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer border">
                  <div className="flex items-center gap-3">
                    {expandedModules.has(result.moduleId) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    {getStatusIcon(result.coverage)}
                    <div>
                      <div className="font-medium">{result.moduleName}</div>
                      <div className="text-xs text-muted-foreground">{result.moduleId}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32">
                      <Progress value={result.coverage} className="h-2" />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{result.coverage}%</span>
                    {getStatusBadge(result.coverage)}
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="ml-8 p-4 border-l-2 border-muted space-y-4">
                  {/* Found Items */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      <span>Tooltips:</span>
                      <Badge variant={result.found.tooltipCount > 0 ? "default" : "secondary"}>
                        {result.found.tooltipCount}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Layout className="h-4 w-4 text-muted-foreground" />
                      <span>Tours:</span>
                      <Badge variant={result.found.tourCount > 0 ? "default" : "secondary"}>
                        {result.found.tourCount}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>Operations:</span>
                      {result.found.hasOperations ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span>Pages:</span>
                      {result.found.hasPagesHelp ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span>FAQ:</span>
                      <Badge variant={result.found.faqCount > 0 ? "default" : "secondary"}>
                        {result.found.faqCount}
                      </Badge>
                    </div>
                  </div>

                  {/* Missing Items */}
                  {!result.isComplete && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-red-600">Missing Documentation:</div>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        {result.missing.tooltips.length > 0 && (
                          <li className="flex items-center gap-2">
                            <XCircle className="h-3 w-3 text-red-500" />
                            {result.missing.tooltips.join(', ')}
                          </li>
                        )}
                        {result.missing.tours.length > 0 && (
                          <li className="flex items-center gap-2">
                            <XCircle className="h-3 w-3 text-red-500" />
                            {result.missing.tours.join(', ')}
                          </li>
                        )}
                        {result.missing.operations && (
                          <li className="flex items-center gap-2">
                            <XCircle className="h-3 w-3 text-red-500" />
                            Operations help file missing
                          </li>
                        )}
                        {result.missing.pagesHelp && (
                          <li className="flex items-center gap-2">
                            <XCircle className="h-3 w-3 text-red-500" />
                            Page-level help file missing
                          </li>
                        )}
                        {result.missing.faq.length > 0 && (
                          <li className="flex items-center gap-2">
                            <XCircle className="h-3 w-3 text-red-500" />
                            {result.missing.faq.join(', ')}
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {result.warnings.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-amber-600">Warnings:</div>
                      <ul className="text-sm space-y-1">
                        {result.warnings.map((warning, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-amber-700">
                            <AlertCircle className="h-3 w-3" />
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* Audit Info */}
      <div className="text-xs text-muted-foreground text-center">
        Last audit: {new Date(report.generatedAt).toLocaleString()} • 
        Registered modules: {moduleRegistry.getCount()}
      </div>
    </div>
  );
};

export default HelpCoverageAudit;
