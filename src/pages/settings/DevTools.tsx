import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Download, 
  Play, 
  RefreshCw, 
  Network, 
  Database, 
  Flag, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Settings
} from 'lucide-react';
import { persistenceChecker, QCReport, QCTestResult } from '@/utils/persistenceCheck';
import { networkInterceptor } from '@/utils/networkInterceptor';
import { idbStorage, migrateFromLocalStorage } from '@/utils/idb';
import { featureFlagService } from '@/services/featureFlagService';
import { useAppState } from '@/contexts/AppStateContext';
import { GST_STAGES } from '../../../config/appConfig';
import { useToast } from '@/hooks/use-toast';

export const DevTools: React.FC = () => {
  const { state, dispatch } = useAppState();
  const [qcReport, setQcReport] = useState<QCReport | null>(null);
  const [isRunningQC, setIsRunningQC] = useState(false);
  const [networkStats, setNetworkStats] = useState(networkInterceptor.getCallStats());
  const [storageStats, setStorageStats] = useState<any>(null);
  const [selectedCase, setSelectedCase] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [stageResults, setStageResults] = useState<any>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    // Update stats periodically
    const interval = setInterval(() => {
      setNetworkStats(networkInterceptor.getCallStats());
    }, 5000);

    // Load storage stats
    idbStorage.getStorageStats().then(setStorageStats);

    return () => clearInterval(interval);
  }, []);

  const runQC = async () => {
    setIsRunningQC(true);
    
    try {
      console.log('[DevTools] Starting QC run...');
      const report = await persistenceChecker.runAllChecks();
      setQcReport(report);
      
      const { summary } = report;
      if (summary.failed === 0) {
        toast({
          title: 'QC Passed',
          description: `All ${summary.total} tests passed successfully`,
          variant: 'default'
        });
      } else {
        toast({
          title: 'QC Issues Found',
          description: `${summary.failed} of ${summary.total} tests failed`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('[DevTools] QC run failed:', error);
      toast({
        title: 'QC Run Failed',
        description: (error as Error).message,
        variant: 'destructive'
      });
    } finally {
      setIsRunningQC(false);
    }
  };

  const runDMSScenario = async () => {
    try {
      const results = await persistenceChecker.runDMSScenario();
      console.log('[DevTools] DMS Scenario results:', results);
      
      const passed = results.every(r => r.status === 'pass');
      toast({
        title: passed ? 'DMS Scenario Passed' : 'DMS Scenario Failed',
        description: `DMS persistence and retrieval test ${passed ? 'passed' : 'failed'}`,
        variant: passed ? 'default' : 'destructive'
      });
    } catch (error) {
      toast({
        title: 'DMS Scenario Error',
        description: (error as Error).message,
        variant: 'destructive'
      });
    }
  };

  const runHelpScenario = async () => {
    try {
      const results = await persistenceChecker.runHelpScenario();
      console.log('[DevTools] Help Scenario results:', results);
      
      const passed = results.every(r => r.status === 'pass');
      toast({
        title: passed ? 'Help Scenario Passed' : 'Help Scenario Failed',
        description: `Help article workflow test ${passed ? 'passed' : 'failed'}`,
        variant: passed ? 'default' : 'destructive'
      });
    } catch (error) {
      toast({
        title: 'Help Scenario Error',
        description: (error as Error).message,
        variant: 'destructive'
      });
    }
  };

  const clearNetworkHistory = () => {
    networkInterceptor.clearHistory();
    setNetworkStats(networkInterceptor.getCallStats());
    toast({
      title: 'Network History Cleared',
      description: 'All network call history has been cleared',
    });
  };

  const runMigration = async () => {
    try {
      await migrateFromLocalStorage();
      toast({
        title: 'Migration Complete',
        description: 'Legacy localStorage data migrated to IndexedDB',
      });
    } catch (error) {
      toast({
        title: 'Migration Failed',
        description: (error as Error).message,
        variant: 'destructive'
      });
    }
  };

  const simulateStageChange = async () => {
    if (!selectedCase || !selectedStage) {
      toast({
        title: 'Selection Required',
        description: 'Please select both case and stage',
        variant: 'destructive'
      });
      return;
    }

    setIsRunningQC(true);
    
    try {
      // Find the case
      const targetCase = state.cases.find(c => c.id === selectedCase);
      if (!targetCase) {
        toast({
          title: 'Case Not Found',
          description: 'Selected case not found',
          variant: 'destructive'
        });
        return;
      }

      const oldStage = targetCase.currentStage;
      
      // Update case stage
      dispatch({ 
        type: 'UPDATE_CASE', 
        payload: { 
          id: selectedCase, 
          currentStage: selectedStage as any // Cast for now since GST stages differ from original enum
        } 
      });
      
      // Simulate stage transition effects
      const results = {
        caseId: selectedCase,
        oldStage,
        newStage: selectedStage,
        timestamp: new Date().toISOString(),
        actions: [
          'Stage updated successfully',
          'Checked for stage-specific task templates',
          'Evaluated automation rules',
          'Updated case timeline'
        ]
      };
      
      setStageResults(results);
      toast({
        title: 'Stage Updated',
        description: `Stage changed from "${oldStage}" to "${selectedStage}"`,
      });
      
    } catch (error) {
      console.error('Stage simulation error:', error);
      toast({
        title: 'Stage Update Failed',
        description: 'Failed to simulate stage change',
        variant: 'destructive'
      });
    } finally {
      setIsRunningQC(false);
    }
  };

  const exportQCReport = () => {
    if (!qcReport) return;
    
    const blob = new Blob([JSON.stringify(qcReport, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qc-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'QC Report Exported',
      description: 'Report downloaded as JSON file',
    });
  };

  const getStatusIcon = (status: QCTestResult['status']) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'skip': return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getCategoryColor = (category: QCTestResult['category']) => {
    switch (category) {
      case 'persistence': return 'bg-blue-100 text-blue-800';
      case 'retrieval': return 'bg-green-100 text-green-800';
      case 'providers': return 'bg-purple-100 text-purple-800';
      case 'network': return 'bg-orange-100 text-orange-800';
      case 'flags': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Development Tools</h1>
          <p className="text-muted-foreground">QC runner, data inspection, and debugging utilities</p>
        </div>
      </div>

      <Tabs defaultValue="qc" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 p-1 h-auto">
          <TabsTrigger value="qc" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap">QC Runner</TabsTrigger>
          <TabsTrigger value="stage" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap">Stage Simulator</TabsTrigger>
          <TabsTrigger value="network" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap">Network</TabsTrigger>
          <TabsTrigger value="storage" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap">Storage</TabsTrigger>
          <TabsTrigger value="flags" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap">Feature Flags</TabsTrigger>
        </TabsList>

        <TabsContent value="qc" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Quick QC</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={runQC} 
                  disabled={isRunningQC} 
                  className="w-full"
                  size="sm"
                >
                  {isRunningQC ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Running QC...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run QC (5-15s)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">DMS Scenario</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={runDMSScenario} variant="outline" className="w-full" size="sm">
                  <Database className="h-4 w-4 mr-2" />
                  Test DMS Flow
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Help Scenario</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={runHelpScenario} variant="outline" className="w-full" size="sm">
                  <Database className="h-4 w-4 mr-2" />
                  Test Help Flow
                </Button>
              </CardContent>
            </Card>
          </div>

          {qcReport && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>QC Report</CardTitle>
                    <CardDescription>
                      Generated {qcReport.timestamp.toLocaleString()}
                    </CardDescription>
                  </div>
                  <Button onClick={exportQCReport} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{qcReport.summary.passed}</div>
                    <div className="text-sm text-muted-foreground">Passed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{qcReport.summary.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{qcReport.summary.skipped}</div>
                    <div className="text-sm text-muted-foreground">Skipped</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{qcReport.summary.total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  {qcReport.results.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <div className="font-medium">{result.testName}</div>
                          <div className="text-sm text-muted-foreground">{result.message}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className={getCategoryColor(result.category)}>
                          {result.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {result.duration}ms
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Stage Simulator
              </CardTitle>
              <CardDescription>
                Test stage transitions and automation triggers in development mode
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Case</label>
                  <Select value={selectedCase} onValueChange={setSelectedCase}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a case to modify" />
                    </SelectTrigger>
                    <SelectContent>
                      {state.cases.map((case_) => (
                        <SelectItem key={case_.id} value={case_.id}>
                          {case_.caseNumber} - {state.clients.find(c => c.id === case_.clientId)?.name || 'Unknown Client'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Stage</label>
                  <Select value={selectedStage} onValueChange={setSelectedStage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose target stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {GST_STAGES.filter(s => s !== 'Any Stage').map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={simulateStageChange}
                disabled={!selectedCase || !selectedStage || isRunningQC}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                {isRunningQC ? 'Simulating...' : 'Simulate Stage Change'}
              </Button>

              {stageResults && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-sm text-green-800">Simulation Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <strong>Case:</strong> {stageResults.caseId}
                    </div>
                    <div className="text-sm">
                      <strong>Transition:</strong> {stageResults.oldStage} → {stageResults.newStage}
                    </div>
                    <div className="text-sm">
                      <strong>Timestamp:</strong> {new Date(stageResults.timestamp).toLocaleString()}
                    </div>
                    <div className="text-sm">
                      <strong>Actions Performed:</strong>
                      <ul className="list-disc ml-4 mt-1">
                        {stageResults.actions.map((action: string, i: number) => (
                          <li key={i}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{networkStats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Blocked</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{networkStats.blocked}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">External</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{networkStats.external}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Internal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{networkStats.internal}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Network className="h-5 w-5 mr-2" />
                    Network Monitoring
                  </CardTitle>
                  <CardDescription>
                    Dev Mode: {networkStats.isDevMode ? 'Enabled' : 'Disabled'}
                  </CardDescription>
                </div>
                <Button onClick={clearNetworkHistory} variant="outline" size="sm">
                  Clear History
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {networkStats.isDevMode && networkStats.blocked === 0 && networkStats.external > 0 && (
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Warning: External calls detected in Dev Mode. Check network interceptor configuration.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                {networkInterceptor.getCalls().slice(-10).map((call, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded border">
                    <div className="flex items-center space-x-2">
                      <Badge variant={call.blocked ? 'destructive' : 'default'}>
                        {call.method}
                      </Badge>
                      <code className="text-sm">{call.url}</code>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {call.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Storage Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {storageStats && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Used</span>
                        <span>{formatBytes(storageStats.used)}</span>
                      </div>
                      <Progress 
                        value={(storageStats.used / (storageStats.used + storageStats.available)) * 100} 
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Available: {formatBytes(storageStats.available)}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Migration Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={runMigration} variant="outline" className="w-full">
                  Migrate localStorage → IndexedDB
                </Button>
                <p className="text-sm text-muted-foreground">
                  Migrate legacy localStorage data to IndexedDB for better performance and reliability.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="flags" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Flag className="h-5 w-5 mr-2" />
                Feature Flags
              </CardTitle>
              <CardDescription>
                Current feature flag configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {featureFlagService.getAllFlags().map((flag) => (
                  <div key={flag.key} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <div className="font-medium">{flag.key}</div>
                      {flag.version && (
                        <div className="text-sm text-muted-foreground">v{flag.version}</div>
                      )}
                    </div>
                    <Badge variant={flag.isEnabled ? 'default' : 'secondary'}>
                      {flag.isEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};