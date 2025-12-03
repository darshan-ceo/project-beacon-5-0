import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  AlertCircle, 
  Check, 
  Loader2, 
  RefreshCw, 
  X, 
  Info,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Zap,
  Shield,
  Clock,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  gstIntegrationService, 
  GSTIntegrationStatus, 
  TestConnectionResult 
} from '@/services/gstIntegrationService';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

export const GSTIntegrationPanel: React.FC = () => {
  const [status, setStatus] = useState<GSTIntegrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testGstin, setTestGstin] = useState('');
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [isTroubleshootingOpen, setIsTroubleshootingOpen] = useState(false);

  // Load status on mount
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const integrationStatus = await gstIntegrationService.checkIntegrationStatus();
      setStatus(integrationStatus);
    } catch (error) {
      console.error('Failed to load GST integration status:', error);
      toast.error('Failed to load GST integration status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!testGstin || testGstin.length !== 15) {
      toast.error('Please enter a valid 15-character GSTIN');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    
    try {
      const result = await gstIntegrationService.testConnection(testGstin);
      setTestResult(result);
      
      if (result.success) {
        toast.success('Connection test successful!');
        // Refresh status after successful test
        loadStatus();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Test connection failed:', error);
      toast.error('Failed to test connection');
    } finally {
      setIsTesting(false);
    }
  };

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'healthy':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><Check className="w-3 h-3 mr-1" />Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><AlertCircle className="w-3 h-3 mr-1" />Degraded</Badge>;
      case 'unavailable':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Unavailable</Badge>;
      default:
        return <Badge variant="secondary"><Info className="w-3 h-3 mr-1" />Unknown</Badge>;
    }
  };

  const getModeBadge = (mode: string) => {
    switch (mode) {
      case 'production':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><Zap className="w-3 h-3 mr-1" />Production</Badge>;
      case 'sandbox':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><AlertCircle className="w-3 h-3 mr-1" />Sandbox</Badge>;
      default:
        return <Badge variant="secondary"><X className="w-3 h-3 mr-1" />Not Configured</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading GST integration status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                MasterGST Connection Status
              </CardTitle>
              <CardDescription>GST Service Provider (GSP) integration status</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={loadStatus}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              {status?.isConfigured ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  <Check className="w-3 h-3 mr-1" />Configured
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <X className="w-3 h-3 mr-1" />Not Configured
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Mode:</span>
              {getModeBadge(status?.mode || 'not_configured')}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">API Health:</span>
              {getHealthBadge(status?.apiHealth || 'unknown')}
            </div>
          </div>

          {status?.lastSyncTime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Last sync: {new Date(status.lastSyncTime).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credential Configuration Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Credential Configuration</CardTitle>
          <CardDescription>Required secrets for MasterGST API</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">MASTERGST_CLIENT_ID</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Client ID provided by MasterGST</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {status?.credentialStatus.clientId ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  <Check className="w-3 h-3 mr-1" />Configured
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <X className="w-3 h-3 mr-1" />Missing
                </Badge>
              )}
            </div>
            
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">MASTERGST_CLIENT_SECRET</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Client Secret provided by MasterGST</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {status?.credentialStatus.clientSecret ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  <Check className="w-3 h-3 mr-1" />Configured
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <X className="w-3 h-3 mr-1" />Missing
                </Badge>
              )}
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">MASTERGST_EMAIL</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Registered email with MasterGST</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {status?.credentialStatus.email ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  <Check className="w-3 h-3 mr-1" />Configured
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <X className="w-3 h-3 mr-1" />Missing
                </Badge>
              )}
            </div>
          </div>

          {!status?.isConfigured && (
            <Alert className="mt-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 dark:text-amber-200">Configuration Required</AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                MasterGST credentials need to be configured. Please contact your administrator to add the required secrets.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Active Consents Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Active GSP Consents
          </CardTitle>
          <CardDescription>Client GST portal consent status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="text-2xl font-bold text-green-600">{status?.activeConsents || 0}</div>
              <div className="text-sm text-muted-foreground">Active Consents</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50 border">
              <div className="text-2xl font-bold text-muted-foreground">{status?.expiredConsents || 0}</div>
              <div className="text-sm text-muted-foreground">Expired/Revoked</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Connection Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Test Connection</CardTitle>
          <CardDescription>Verify API connectivity with a sample GSTIN lookup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="test-gstin" className="sr-only">Test GSTIN</Label>
              <Input
                id="test-gstin"
                placeholder="Enter a valid GSTIN (15 characters)"
                value={testGstin}
                onChange={(e) => setTestGstin(e.target.value.toUpperCase())}
                maxLength={15}
                className="font-mono"
              />
            </div>
            <Button 
              onClick={handleTestConnection} 
              disabled={isTesting || !status?.isConfigured}
            >
              {isTesting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Test Connection
            </Button>
          </div>

          {testResult && (
            <div className={`p-4 rounded-lg border ${
              testResult.success 
                ? 'bg-green-500/10 border-green-500/20' 
                : 'bg-destructive/10 border-destructive/20'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {testResult.success ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
                <span className={`font-medium ${testResult.success ? 'text-green-600' : 'text-destructive'}`}>
                  {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                </span>
                <Badge variant="outline" className="ml-auto">
                  {testResult.latencyMs}ms
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground mb-2">{testResult.message}</p>
              
              {testResult.taxpayerPreview && (
                <div className="mt-3 pt-3 border-t space-y-1">
                  <p className="text-sm font-medium">Taxpayer Preview:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Trade Name:</span> {testResult.taxpayerPreview.tradeName}</div>
                    <div><span className="text-muted-foreground">Legal Name:</span> {testResult.taxpayerPreview.legalName}</div>
                    <div><span className="text-muted-foreground">Status:</span> {testResult.taxpayerPreview.status}</div>
                    <div><span className="text-muted-foreground">State:</span> {testResult.taxpayerPreview.state}</div>
                  </div>
                </div>
              )}

              {testResult.errorCode && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Error Code: {testResult.errorCode}
                  {testResult.errorDetails && <span className="ml-2">({testResult.errorDetails})</span>}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Collapsible open={isTroubleshootingOpen} onOpenChange={setIsTroubleshootingOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Troubleshooting Guide
            </span>
            {isTroubleshootingOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div>
                <h4 className="font-medium mb-2">Common Issues</h4>
                <div className="space-y-3 text-sm">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-amber-600">SANDBOX_MODE Error</p>
                    <p className="text-muted-foreground">Your MasterGST account is in sandbox/testing mode. Contact MasterGST support to activate production access.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-destructive">INVALID_CREDENTIALS Error</p>
                    <p className="text-muted-foreground">The Client ID or Client Secret is incorrect. Verify your credentials in the MasterGST dashboard.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium">NETWORK_ERROR</p>
                    <p className="text-muted-foreground">Unable to reach MasterGST servers. Check your network connectivity or try again later.</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Getting Started with MasterGST</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Register at <a href="https://mastergst.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">mastergst.com <ExternalLink className="h-3 w-3" /></a></li>
                  <li>Complete GSP onboarding and get API credentials</li>
                  <li>Configure the three required secrets (Client ID, Client Secret, Email)</li>
                  <li>Request production access from MasterGST</li>
                  <li>Test connection with a sample GSTIN</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
