import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Zap, 
  Settings, 
  Database, 
  TestTube,
  Bug,
  Play,
  RefreshCw,
  ExternalLink,
  Copy,
  Info,
  Terminal,
  Activity,
  Wrench,
  BookOpen,
  Target
} from 'lucide-react';
import { envConfig } from '@/utils/envConfig';
import { toast } from '@/hooks/use-toast';
import { EnvironmentStatus } from '@/components/qa/EnvironmentStatus';
import { DevTools } from '@/pages/settings/DevTools';

interface PresetConfig {
  name: string;
  description: string;
  icon: React.ElementType;
  params: Record<string, string>;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
}

const PRESET_CONFIGS: PresetConfig[] = [
  {
    name: 'Full Dev Mode',
    description: 'All features enabled with mock data',
    icon: Zap,
    params: { qa: 'on', mock: 'on', gst: 'on' },
    variant: 'default'
  },
  {
    name: 'GST Testing',
    description: 'GST features with mock data for testing',
    icon: Database,
    params: { gst: 'on', mock: 'on', qa: 'off' },
    variant: 'secondary'
  },
  {
    name: 'QA Only',
    description: 'Quality assurance mode without GST',
    icon: Bug,
    params: { qa: 'on', mock: 'on', gst: 'off' },
    variant: 'outline'
  },
  {
    name: 'Production Mode',
    description: 'Live API with all dev features disabled',
    icon: Activity,
    params: { qa: 'off', mock: 'off', gst: 'off' },
    variant: 'destructive'
  }
];

const QUICK_WORKFLOWS = [
  {
    title: 'Case Stage Testing',
    description: 'Test stage transitions and automation',
    steps: [
      'Select a case from the dropdown',
      'Choose target stage',
      'Simulate transition',
      'Review automation results'
    ],
    tabTarget: 'devtools',
    subtab: 'stage'
  },
  {
    title: 'Quality Checks',
    description: 'Run comprehensive system validation',
    steps: [
      'Click "Run QC" for full system check',
      'Review failed tests',
      'Export report if needed',
      'Run specific scenarios for detailed testing'
    ],
    tabTarget: 'devtools',
    subtab: 'qc'
  },
  {
    title: 'Network Debugging',
    description: 'Monitor and debug API calls',
    steps: [
      'Check network statistics',
      'Review intercepted calls',
      'Clear history when needed',
      'Monitor for external call leaks'
    ],
    tabTarget: 'devtools',
    subtab: 'network'
  }
];

export const DevModeDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const statusBadges = envConfig.getStatusBadges();
  const overrides = envConfig.getActiveOverrides();

  const applyPreset = (preset: PresetConfig) => {
    const params = new URLSearchParams();
    Object.entries(preset.params).forEach(([key, value]) => {
      params.set(key, value);
    });
    
    const newUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    
    toast({
      title: `Applying ${preset.name}`,
      description: 'Redirecting with new configuration...',
    });
    
    setTimeout(() => {
      window.location.href = newUrl;
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ON':
      case 'SET':
        return 'text-green-600 dark:text-green-400';
      case 'OFF':
      case 'MISSING':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  const copyDiagnostics = () => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      environment: import.meta.env.MODE,
      statusBadges,
      overrides,
      userAgent: navigator.userAgent,
      localStorage: Object.keys(localStorage).length,
      sessionStorage: Object.keys(sessionStorage).length
    };
    
    navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
    toast({
      title: 'Diagnostics Copied',
      description: 'Full system diagnostics copied to clipboard'
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Terminal className="h-8 w-8 text-primary" />
            Dev Mode Dashboard
          </h1>
          <p className="text-muted-foreground">
            Centralized development and testing environment controls
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Activity className="h-3 w-3 mr-1 animate-pulse" />
            DEV MODE ACTIVE
          </Badge>
          <Button variant="outline" size="sm" onClick={copyDiagnostics}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Diagnostics
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="presets" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Quick Setup
          </TabsTrigger>
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="devtools" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Advanced Tools
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current Status */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Current Environment Status
                </CardTitle>
                <CardDescription>
                  Real-time configuration and feature flags
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(statusBadges).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-3 rounded-lg border">
                      <span className="font-medium">{key}</span>
                      <Badge 
                        variant={value === 'ON' || value === 'SET' ? 'default' : 'secondary'}
                        className={getStatusColor(value)}
                      >
                        {value}
                      </Badge>
                    </div>
                  ))}
                </div>

                {Object.keys(overrides).length > 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>URL Overrides Active:</strong><br />
                      {Object.entries(overrides).map(([key, value]) => (
                        <code key={key} className="bg-muted px-1 py-0.5 rounded mr-2">
                          {key}={value}
                        </code>
                      ))}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  System Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Environment:</span>
                  <Badge variant="outline">{import.meta.env.MODE}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Local Storage:</span>
                  <span className="text-sm font-medium">{Object.keys(localStorage).length} items</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Session Storage:</span>
                  <span className="text-sm font-medium">{Object.keys(sessionStorage).length} items</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Build Date:</span>
                  <span className="text-sm font-medium">{new Date().toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Environment Controls */}
          <EnvironmentStatus />
        </TabsContent>

        {/* Presets Tab */}
        <TabsContent value="presets" className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Quick Configuration Presets</h2>
            <p className="text-muted-foreground">
              Apply common development configurations with one click
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PRESET_CONFIGS.map((preset) => (
              <Card key={preset.name} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <preset.icon className="h-6 w-6" />
                    {preset.name}
                  </CardTitle>
                  <CardDescription>{preset.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Configuration:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(preset.params).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}={value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button 
                    variant={preset.variant}
                    className="w-full"
                    onClick={() => applyPreset(preset)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Apply Configuration
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Guided Development Workflows</h2>
            <p className="text-muted-foreground">
              Step-by-step guides for common development and testing tasks
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {QUICK_WORKFLOWS.map((workflow, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    {workflow.title}
                  </CardTitle>
                  <CardDescription>{workflow.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Steps:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      {workflow.steps.map((step, stepIndex) => (
                        <li key={stepIndex}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setActiveTab(workflow.tabTarget)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Workflow
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Testing Best Practices</CardTitle>
              <CardDescription>Guidelines for effective development testing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Before Testing:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Clear browser cache and storage</li>
                    <li>• Apply appropriate configuration preset</li>
                    <li>• Check environment status indicators</li>
                    <li>• Verify mock data is loaded</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">During Testing:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Monitor network calls for leaks</li>
                    <li>• Run QC checks regularly</li>
                    <li>• Use stage simulator for transitions</li>
                    <li>• Export reports for issue tracking</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tools Tab */}
        <TabsContent value="devtools" className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Advanced Development Tools</h2>
            <p className="text-muted-foreground">
              Comprehensive debugging and testing utilities
            </p>
          </div>

          <DevTools />
        </TabsContent>
      </Tabs>
    </div>
  );
};