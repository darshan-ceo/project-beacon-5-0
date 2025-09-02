import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { featureFlagService } from '@/services/featureFlagService';
import { gstPublicService } from '@/services/gstPublicService';
import { AlertCircle, CheckCircle, XCircle, Code, Network } from 'lucide-react';

interface DebugResult {
  success: boolean;
  data: any;
  error?: string;
  timestamp: string;
}

export const GSTDebugPage: React.FC = () => {
  const [gstin, setGstin] = useState('TEST');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);

  // Get feature flag status
  const gstFeature = featureFlagService.getFlag('gst_client_autofill_v1');
  const isFeatureEnabled = featureFlagService.isEnabled('gst_client_autofill_v1');
  
  // Get environment variables
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const gstEnvVar = import.meta.env.VITE_FEATURE_GST_CLIENT_AUTOFILL;

  const handleTestCall = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await gstPublicService.fetchTaxpayer(gstin);
      setResult({
        success: response.success,
        data: response.data,
        error: response.success ? undefined : response.message,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      setResult({
        success: false,
        data: null,
        error: error.message || 'Unknown error occurred',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">GST Debug Console</h1>
        <Badge variant="outline" className="text-sm">
          Debug Mode
        </Badge>
      </div>

      {/* Environment & Feature Flag Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Environment & Feature Flags
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">API Base URL</label>
              <div className="flex items-center gap-2">
                <Badge variant={apiBaseUrl ? "default" : "destructive"}>
                  {apiBaseUrl || "Not Set"}
                </Badge>
                {apiBaseUrl ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">GST Feature Flag (ENV)</label>
              <div className="flex items-center gap-2">
                <Badge variant={gstEnvVar ? "default" : "destructive"}>
                  {gstEnvVar || "Not Set"}
                </Badge>
                {gstEnvVar ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Feature Flag Status</label>
              <div className="flex items-center gap-2">
                <Badge variant={isFeatureEnabled ? "default" : "destructive"}>
                  {isFeatureEnabled ? "Enabled" : "Disabled"}
                </Badge>
                {isFeatureEnabled ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Feature Version</label>
              <Badge variant="outline">
                {gstFeature?.version || "N/A"}
              </Badge>
            </div>
          </div>

          {!isFeatureEnabled && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                GST features are currently disabled. Set VITE_FEATURE_GST_CLIENT_AUTOFILL=v1 to enable.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* API Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            API Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter GSTIN (e.g., TEST)"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              className="flex-1"
            />
            <Button 
              onClick={handleTestCall} 
              disabled={isLoading || !gstin.trim()}
            >
              {isLoading ? "Testing..." : "Test API Call"}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Test endpoint: GET {apiBaseUrl || "[API_BASE_URL]"}/public/taxpayer?gstin={gstin}
          </div>
        </CardContent>
      </Card>

      {/* API Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              API Response
              <Badge variant={result.success ? "default" : "destructive"}>
                {result.success ? "Success" : "Error"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Timestamp: {result.timestamp}
            </div>
            
            <Separator />

            {result.success ? (
              <div className="space-y-4">
                <h4 className="font-medium">Raw Response Data:</h4>
                <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>

                {result.data && (
                  <>
                    <h4 className="font-medium">Mapped Fields:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Trade Name:</label>
                        <div className="text-sm">{result.data.tradeName || "N/A"}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Legal Name:</label>
                        <div className="text-sm">{result.data.legalName || "N/A"}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">PAN:</label>
                        <div className="text-sm">{result.data.panNo || "N/A"}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Registration Date:</label>
                        <div className="text-sm">{result.data.registrationDate || "N/A"}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Constitution:</label>
                        <div className="text-sm">{result.data.constitutionOfBusiness || "N/A"}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Status:</label>
                        <div className="text-sm">{result.data.gstnStatus || "N/A"}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Error:</strong> {result.error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>1. Ensure VITE_FEATURE_GST_CLIENT_AUTOFILL=v1 is set in environment</p>
          <p>2. Ensure VITE_API_BASE_URL is configured correctly</p>
          <p>3. Test API connectivity using the form above</p>
          <p>4. Check network tab in browser dev tools for actual API calls</p>
          <p>5. Verify GST section appears in Client Master form when feature is enabled</p>
        </CardContent>
      </Card>
    </div>
  );
};