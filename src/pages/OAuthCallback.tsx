import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OAuthManager, PKCEUtils } from '@/utils/oauthUtils';
import { parseOAuthError, getConfigChecklist, OAuthErrorInfo, ConfigCheckItem } from '@/utils/oauthErrorHandler';
import { integrationsService } from '@/services/integrationsService';
import { Loader2, AlertTriangle, CheckCircle2, XCircle, Copy, ExternalLink, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorInfo, setErrorInfo] = useState<OAuthErrorInfo | null>(null);
  const [provider, setProvider] = useState<'google' | 'microsoft'>('google');
  const [configChecklist, setConfigChecklist] = useState<ConfigCheckItem[]>([]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Value copied to clipboard",
    });
  };

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Check for error in URL first
        const urlError = searchParams.get('error');
        if (urlError) {
          const errorDescription = searchParams.get('error_description') || '';
          throw { error: urlError, error_description: errorDescription };
        }

        // Extract provider from state parameter using JWT-like decoding
        const state = searchParams.get('state');
        if (!state) {
          throw new Error('Missing OAuth state parameter');
        }

        const decodedState = PKCEUtils.decodeState(state);
        if (!decodedState) {
          throw new Error('Invalid OAuth state format - session may have expired');
        }

        const detectedProvider = decodedState.provider;
        setProvider(detectedProvider);
        setConfigChecklist(getConfigChecklist(detectedProvider));

        // Load settings to get client credentials
        const settings = integrationsService.loadCalendarSettings('default');
        if (!settings) {
          throw new Error(
            'Calendar settings not found. Please return to Settings > Integrations and ensure your credentials are saved before connecting.'
          );
        }

        // Validate provider-specific credentials
        if (detectedProvider === 'google' && (!settings.googleClientId || !settings.googleClientSecret)) {
          throw new Error('Google Calendar credentials are incomplete. Please check your Client ID and Client Secret.');
        }
        
        if (detectedProvider === 'microsoft' && (!settings.microsoftClientId || !settings.microsoftClientSecret)) {
          throw new Error('Microsoft Outlook credentials are incomplete. Please check your Client ID and Client Secret.');
        }

        // Get OAuth config
        const providerType = detectedProvider === 'google' ? 'google' : 'microsoft';
        const config = providerType === 'google' 
          ? OAuthManager.getGoogleConfig(
              settings.googleClientId!,
              settings.googleClientSecret!
            )
          : OAuthManager.getMicrosoftConfig(
              settings.microsoftClientId!,
              settings.microsoftTenant || 'common',
              settings.microsoftClientSecret!
            );

        // Handle the OAuth callback
        const result = await OAuthManager.handleCallback(providerType, config);

        // Check for error
        if ('error' in result) {
          throw { error: result.error, error_description: result.error_description };
        }

        // Save tokens (map microsoft to outlook for storage)
        const storageProvider = detectedProvider === 'microsoft' ? 'outlook' : 'google';
        integrationsService.saveTokens('default', storageProvider, {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          expires_at: result.expires_at,
          user_email: result.user_email,
        });

        setStatus('success');
        
        toast({
          title: "Connection Successful",
          description: `Connected to ${detectedProvider === 'google' ? 'Google Calendar' : 'Outlook Calendar'} as ${result.user_email}`,
        });

        // Redirect back to settings after 2 seconds
        setTimeout(() => {
          navigate('/settings?tab=integrations&success=true');
        }, 2000);

      } catch (error) {
        console.error('OAuth callback error:', error);
        
        // Parse error for detailed information
        const parsedError = parseOAuthError(error, provider);
        setErrorInfo(parsedError);
        setStatus('error');
        
        toast({
          title: parsedError.title,
          description: parsedError.message,
          variant: "destructive",
        });
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, provider]);

  const getSeverityColor = (severity: OAuthErrorInfo['severity']) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'default';
      default: return 'secondary';
    }
  };

  const getProviderName = () => provider === 'google' ? 'Google Calendar' : 'Microsoft Outlook';
  const getConsoleUrl = () => provider === 'google' 
    ? 'https://console.cloud.google.com/apis/credentials'
    : 'https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade';
  const getConsoleName = () => provider === 'google' ? 'Google Cloud Console' : 'Azure Portal';

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-lg space-y-4">
        {status === 'processing' && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <h2 className="text-xl font-semibold">Connecting to {getProviderName()}...</h2>
                <p className="text-muted-foreground">Please wait while we complete the setup</p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {status === 'success' && (
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="h-12 w-12 mx-auto rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-green-700 dark:text-green-300">Connected Successfully!</h2>
                <p className="text-muted-foreground">Redirecting you back to settings...</p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {status === 'error' && errorInfo && (
          <div className="space-y-4">
            {/* Error Card */}
            <Card className="border-destructive/50">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    {errorInfo.severity === 'critical' ? (
                      <XCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-destructive">{errorInfo.title}</CardTitle>
                    <Badge variant={getSeverityColor(errorInfo.severity)}>
                      {errorInfo.severity === 'critical' ? 'Action Required' : 'Warning'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{errorInfo.message}</p>
                
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>How to fix</AlertTitle>
                  <AlertDescription>{errorInfo.action}</AlertDescription>
                </Alert>

                {errorInfo.helpUrl && (
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <a href={errorInfo.helpUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open {getConsoleName()}
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Configuration Checklist */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Configuration Checklist</CardTitle>
                <CardDescription>
                  Ensure these values are configured in your {getConsoleName()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {configChecklist.map((item, index) => (
                    <div key={index} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-mono truncate">{item.value}</p>
                      </div>
                      {item.copyable && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => copyToClipboard(item.value)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => navigate('/settings?tab=integrations')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Settings
              </Button>
              <Button 
                variant="outline"
                className="flex-1"
                asChild
              >
                <a href={getConsoleUrl()} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {getConsoleName()}
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
