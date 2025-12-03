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
  Users,
  Key,
  Globe,
  Smartphone
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
  const [isTestingConsent, setIsTestingConsent] = useState(false);
  const [testGstin, setTestGstin] = useState('');
  const [testUsername, setTestUsername] = useState('');
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [consentTestResult, setConsentTestResult] = useState<TestConnectionResult | null>(null);
  const [isTroubleshootingOpen, setIsTroubleshootingOpen] = useState(false);

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

  const handleTestPublicApi = async () => {
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
        toast.success('Public API connection test successful!');
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

  const handleTestConsentApi = async () => {
    if (!testGstin || testGstin.length !== 15) {
      toast.error('Please enter a valid 15-character GSTIN');
      return;
    }
    if (!testUsername.trim()) {
      toast.error('Please enter GST Portal Username');
      return;
    }

    setIsTestingConsent(true);
    setConsentTestResult(null);
    
    try {
      const result = await gstIntegrationService.testConsentApi(testGstin, testUsername.trim());
      setConsentTestResult(result);
      
      if (result.success) {
        toast.success('GSP Consent API is available!');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Consent API test failed:', error);
      toast.error('Failed to test Consent API');
    } finally {
      setIsTestingConsent(false);
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
      case 'not_subscribed':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><AlertCircle className="w-3 h-3 mr-1" />Not Subscribed</Badge>;
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
          </div>

          {/* Split API Health Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Public Search API</span>
              </div>
              <div className="flex items-center gap-2">
                {getHealthBadge(typeof status?.apiHealth === 'object' ? status.apiHealth.publicApi : status?.apiHealth || 'unknown')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">GSTIN lookup, taxpayer info</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">GSP Consent API (OTP)</span>
              </div>
              <div className="flex items-center gap-2">
                {getHealthBadge(typeof status?.apiHealth === 'object' ? status.apiHealth.consentApi : 'unknown')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">OTP-based signatory import</p>
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
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Credential Configuration
          </CardTitle>
          <CardDescription>Required secrets for MasterGST API</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {['MASTERGST_CLIENT_ID', 'MASTERGST_CLIENT_SECRET', 'MASTERGST_EMAIL'].map((secret, idx) => {
              const key = ['clientId', 'clientSecret', 'email'][idx] as keyof typeof status.credentialStatus;
              const isConfigured = status?.credentialStatus?.[key];
              return (
                <div key={secret} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{secret}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{secret.includes('CLIENT_ID') ? 'Client ID' : secret.includes('SECRET') ? 'Client Secret' : 'Registered email'} provided by MasterGST</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {isConfigured ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      <Check className="w-3 h-3 mr-1" />Configured
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <X className="w-3 h-3 mr-1" />Missing
                    </Badge>
                  )}
                </div>
              );
            })}
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
          <CardTitle className="text-lg">Test API Connections</CardTitle>
          <CardDescription>Verify both Public and Consent API connectivity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Common GSTIN Input */}
          <div className="space-y-2">
            <Label htmlFor="test-gstin">Test GSTIN</Label>
            <Input
              id="test-gstin"
              placeholder="Enter a valid GSTIN (15 characters)"
              value={testGstin}
              onChange={(e) => setTestGstin(e.target.value.toUpperCase())}
              maxLength={15}
              className="font-mono"
            />
          </div>

          {/* Public API Test */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <span className="font-medium">Public Search API</span>
              </div>
              <Button 
                onClick={handleTestPublicApi} 
                disabled={isTesting || !status?.isConfigured}
                size="sm"
              >
                {isTesting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Test Public API
              </Button>
            </div>
            
            {testResult && (
              <div className={`p-3 rounded-lg border ${
                testResult.success 
                  ? 'bg-green-500/10 border-green-500/20' 
                  : 'bg-destructive/10 border-destructive/20'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {testResult.success ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className={`text-sm font-medium ${testResult.success ? 'text-green-600' : 'text-destructive'}`}>
                    {testResult.success ? 'Success' : 'Failed'}
                  </span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {testResult.latencyMs}ms
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{testResult.message}</p>
                
                {testResult.taxpayerPreview && (
                  <div className="mt-2 pt-2 border-t text-xs space-y-1">
                    <p><span className="text-muted-foreground">Trade:</span> {testResult.taxpayerPreview.tradeName}</p>
                    <p><span className="text-muted-foreground">Legal:</span> {testResult.taxpayerPreview.legalName}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Consent API Test */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              <span className="font-medium">GSP Consent API (OTP)</span>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="test-username">GST Portal Username</Label>
              <Input
                id="test-username"
                placeholder="Enter GST portal login username"
                value={testUsername}
                onChange={(e) => setTestUsername(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Required to test consent/OTP API</p>
            </div>

            <Button 
              onClick={handleTestConsentApi} 
              disabled={isTestingConsent || !status?.isConfigured}
              size="sm"
              variant="outline"
            >
              {isTestingConsent && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Test Consent API
            </Button>
            
            {consentTestResult && (
              <div className={`p-3 rounded-lg border ${
                consentTestResult.success 
                  ? 'bg-green-500/10 border-green-500/20' 
                  : 'bg-amber-500/10 border-amber-500/20'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {consentTestResult.success ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  )}
                  <span className={`text-sm font-medium ${consentTestResult.success ? 'text-green-600' : 'text-amber-600'}`}>
                    {consentTestResult.success ? 'Available' : 'Not Available'}
                  </span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {consentTestResult.latencyMs}ms
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{consentTestResult.message}</p>
                
                {consentTestResult.recommendation && (
                  <Alert className="mt-2 p-2 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                    <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                      <strong>Recommendation:</strong> {consentTestResult.recommendation}
                    </AlertDescription>
                  </Alert>
                )}

                {consentTestResult.errorCode && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Error: {consentTestResult.errorCode}
                  </p>
                )}
              </div>
            )}
          </div>
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
                <h4 className="font-medium mb-2">Public API vs Consent API</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><strong>Public Search API:</strong> Fetches basic taxpayer information (name, address, status) - usually available with standard MasterGST credentials.</p>
                  <p><strong>GSP Consent API:</strong> OTP-based authorization to access authorized signatories and detailed profile - requires separate subscription/activation from MasterGST.</p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Common Issues</h4>
                <div className="space-y-3 text-sm">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-amber-600">GSP_CONSENT_NOT_CONFIGURED</p>
                    <p className="text-muted-foreground">GSP Consent/OTP API is not enabled for your MasterGST account. Contact MasterGST support to activate this feature.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-amber-600">Invalid request!</p>
                    <p className="text-muted-foreground">The consent API endpoint returned an error. This typically means the GSP consent module is not subscribed in your MasterGST plan.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-destructive">SANDBOX_MODE</p>
                    <p className="text-muted-foreground">Your MasterGST account is in sandbox/testing mode. Contact MasterGST to activate production access.</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Enable GSP Consent API</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Log in to your MasterGST dashboard</li>
                  <li>Navigate to API Subscriptions or GSP Services</li>
                  <li>Subscribe to "GSP Consent API" or "Taxpayer Authentication" module</li>
                  <li>Request production activation from MasterGST support</li>
                  <li>Wait for activation confirmation (usually 24-48 hours)</li>
                  <li>Test the consent API using the test tool above</li>
                </ol>
              </div>

              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800 dark:text-blue-200">Fallback Available</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-300">
                  If GSP Consent API is not available, you can still add signatories manually in the Client form.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
