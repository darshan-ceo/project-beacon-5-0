import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Check, Loader2, ExternalLink, X, Info } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  CalendarIntegrationSettings, 
  CalendarConnectionStatus,
  CalendarInfo,
  integrationsService 
} from '@/services/integrationsService';
import { calendarService } from '@/services/calendar/calendarService';
import { OAuthManager } from '@/utils/oauthUtils';
import { supabase } from '@/integrations/supabase/client';

export const CalendarIntegrationPanel: React.FC = () => {
  const [settings, setSettings] = useState<CalendarIntegrationSettings>({
    orgId: 'default',
    provider: 'none',
    autoSync: true,
    reminderTime: 30,
  });
  const [connectionStatus, setConnectionStatus] = useState<CalendarConnectionStatus>({ connected: false });
  const [availableCalendars, setAvailableCalendars] = useState<CalendarInfo[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // OAuth credentials (stored separately via edge function)
  const [oauthCredentials, setOauthCredentials] = useState({
    googleClientId: '',
    googleClientSecret: '',
    microsoftClientId: '',
    microsoftClientSecret: '',
    microsoftTenant: 'common'
  });

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const loadedSettings = await integrationsService.loadCalendarSettings();
        if (loadedSettings) {
          setSettings(loadedSettings);
          
          // Only try to load calendars if actually connected (has tokens)
          if (loadedSettings.provider !== 'none' && loadedSettings.connectionStatus === 'connected') {
            const status = await integrationsService.getConnectionStatus(
              loadedSettings.provider === 'outlook' ? 'outlook' : 'google'
            );
            setConnectionStatus(status);
            
            // Only fetch calendars if we have a valid connection
            if (status.connected) {
              await loadCalendars(loadedSettings);
            }
          } else {
            // Just update connection status without trying to load calendars
            await updateConnectionStatus(loadedSettings.provider);
          }
        }
      } catch (error) {
        console.error('Failed to load calendar settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Update connection status
  const updateConnectionStatus = async (provider: 'none' | 'google' | 'outlook') => {
    if (provider === 'none') {
      setConnectionStatus({ connected: false });
      return;
    }

    const providerKey = provider === 'outlook' ? 'outlook' : 'google';
    const status = await integrationsService.getConnectionStatus(providerKey);
    setConnectionStatus(status);
  };

  // Load available calendars - only called when connection is verified
  const loadCalendars = async (currentSettings: CalendarIntegrationSettings) => {
    if (currentSettings.provider === 'none') {
      setAvailableCalendars([]);
      return;
    }

    // Don't attempt to load calendars if not connected
    if (!connectionStatus.connected && currentSettings.connectionStatus !== 'connected') {
      console.log('[Calendar] Skipping calendar list - not connected');
      setAvailableCalendars([]);
      return;
    }

    setIsLoadingCalendars(true);
    try {
      const calendars = await calendarService.listCalendars(currentSettings);
      setAvailableCalendars(calendars);
    } catch (error) {
      // Only log if it's not the expected "no tokens" error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('No') || !errorMessage.includes('token')) {
        console.error('Failed to load calendars:', error);
      }
      setAvailableCalendars([]);
    } finally {
      setIsLoadingCalendars(false);
    }
  };

  // Handle settings change
  const handleSettingsChange = async (updates: Partial<CalendarIntegrationSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    
    // Update connection status when provider changes
    if (updates.provider !== undefined) {
      await updateConnectionStatus(newSettings.provider);
      if (newSettings.provider !== 'none') {
        await loadCalendars(newSettings);
      } else {
        setAvailableCalendars([]);
      }
    }
  };

  // Helper to clean up common copy-paste issues with OAuth credentials
  const sanitizeCredential = (value: string): string => {
    return value
      .trim()
      .replace(/^https?:\/\//, '')  // Remove http:// or https:// prefix
      .replace(/\/+$/, '');          // Remove trailing slashes
  };

  // Handle OAuth credential changes
  const handleCredentialChange = (key: keyof typeof oauthCredentials, value: string) => {
    const cleanValue = key.includes('ClientId') ? sanitizeCredential(value) : value.trim();
    setOauthCredentials(prev => ({ ...prev, [key]: cleanValue }));
  };

  // Save settings
  const saveSettings = async () => {
    try {
      await integrationsService.saveCalendarSettings(settings);
      
      // Store OAuth credentials securely via edge function
      if (settings.provider === 'google' && oauthCredentials.googleClientId) {
        await supabase.functions.invoke('manage-secrets/store', {
          body: { key: 'google_client_id', value: oauthCredentials.googleClientId }
        });
        if (oauthCredentials.googleClientSecret) {
          await supabase.functions.invoke('manage-secrets/store', {
            body: { key: 'google_client_secret', value: oauthCredentials.googleClientSecret }
          });
        }
      }
      
      if (settings.provider === 'outlook' && oauthCredentials.microsoftClientId) {
        await supabase.functions.invoke('manage-secrets/store', {
          body: { key: 'microsoft_client_id', value: oauthCredentials.microsoftClientId }
        });
        if (oauthCredentials.microsoftClientSecret) {
          await supabase.functions.invoke('manage-secrets/store', {
            body: { key: 'microsoft_client_secret', value: oauthCredentials.microsoftClientSecret }
          });
        }
        await supabase.functions.invoke('manage-secrets/store', {
          body: { key: 'microsoft_tenant', value: oauthCredentials.microsoftTenant }
        });
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  // Start OAuth connection
  const handleConnect = async () => {
    if (settings.provider === 'none') return;

    const requiredFields = getRequiredFields();
    const missingFields = requiredFields.filter(field => !oauthCredentials[field as keyof typeof oauthCredentials]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing Configuration",
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      // Save settings BEFORE starting OAuth flow
      await saveSettings();
      
      toast({
        title: "Settings Saved",
        description: "Starting authentication process...",
      });

      let config;
      if (settings.provider === 'google') {
        config = OAuthManager.getGoogleConfig(
          oauthCredentials.googleClientId,
          oauthCredentials.googleClientSecret
        );
      } else {
        config = OAuthManager.getMicrosoftConfig(
          oauthCredentials.microsoftClientId,
          oauthCredentials.microsoftTenant || 'common',
          oauthCredentials.microsoftClientSecret
        );
      }

      // Store OAuth credentials in sessionStorage so OAuthCallback can retrieve them after redirect
      if (settings.provider === 'google') {
        sessionStorage.setItem('oauth_google_client_id', oauthCredentials.googleClientId);
        sessionStorage.setItem('oauth_google_client_secret', oauthCredentials.googleClientSecret);
      } else {
        sessionStorage.setItem('oauth_microsoft_client_id', oauthCredentials.microsoftClientId);
        sessionStorage.setItem('oauth_microsoft_client_secret', oauthCredentials.microsoftClientSecret);
        sessionStorage.setItem('oauth_microsoft_tenant', oauthCredentials.microsoftTenant || 'common');
      }

      await OAuthManager.startOAuth(settings.provider === 'outlook' ? 'microsoft' : 'google', config);
    } catch (error) {
      console.error('OAuth start failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRedirectUriError = errorMessage.toLowerCase().includes('redirect_uri') || 
                                  errorMessage.includes('400') ||
                                  errorMessage.toLowerCase().includes('redirect uri mismatch');
      
      if (isRedirectUriError) {
        toast({
          title: "OAuth Redirect URI Mismatch",
          description: `Please ensure your ${settings.provider === 'google' ? 'Google Cloud Console' : 'Azure Portal'} has the correct redirect URI configured: ${window.location.origin}/oauth/callback`,
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: "Failed to start authentication. Please check your configuration.",
          variant: "destructive",
        });
      }
      
      setIsConnecting(false);
    }
  };

  // Disconnect account
  const handleDisconnect = async () => {
    if (settings.provider === 'none') return;

    const providerKey = settings.provider === 'outlook' ? 'outlook' : 'google';
    await integrationsService.clearTokens(providerKey);
    setConnectionStatus({ connected: false });
    setAvailableCalendars([]);
    
    toast({
      title: "Disconnected",
      description: `${settings.provider === 'google' ? 'Google' : 'Microsoft'} account disconnected successfully.`,
    });
  };

  // Test connection
  const handleTestConnection = async () => {
    if (settings.provider === 'none') return;
    
    if (!hasRequiredCredentials()) {
      toast({
        title: "Missing Credentials",
        description: "Please enter all required credentials before testing.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingConnection(true);
    try {
      const result = await calendarService.testConnection(settings);
      
      toast({
        title: result.success ? "Connection Successful" : "Connection Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });

      if (result.success) {
        await updateConnectionStatus(settings.provider);
        await loadCalendars(settings);
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Failed to test connection. Please verify your credentials.",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Get required fields for current provider
  const getRequiredFields = (): string[] => {
    switch (settings.provider) {
      case 'google':
        return ['googleClientId', 'googleClientSecret'];
      case 'outlook':
        return ['microsoftClientId', 'microsoftClientSecret'];
      default:
        return [];
    }
  };

  // Check if all required credentials are filled
  const hasRequiredCredentials = (): boolean => {
    if (settings.provider === 'none') return false;
    
    if (settings.provider === 'google') {
      return !!(oauthCredentials.googleClientId && oauthCredentials.googleClientSecret);
    }
    
    if (settings.provider === 'outlook') {
      return !!(oauthCredentials.microsoftClientId && oauthCredentials.microsoftClientSecret);
    }
    
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Provider Selection */}
      <div className="space-y-2">
        <Label>Calendar Provider</Label>
        <Select 
          value={settings.provider} 
          onValueChange={(value: 'none' | 'google' | 'outlook') => handleSettingsChange({ provider: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="google">Google Calendar</SelectItem>
            <SelectItem value="outlook">Microsoft Outlook</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Choose your calendar provider</p>
      </div>

      {/* Google Configuration */}
      {settings.provider === 'google' && (
        <>
          <Separator />
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Google Calendar Configuration</h4>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Google Client ID</Label>
                <Input 
                  placeholder="Your Google OAuth Client ID"
                  value={oauthCredentials.googleClientId}
                  onChange={(e) => handleCredentialChange('googleClientId', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Google Client Secret</Label>
                <Input 
                  type="password"
                  placeholder="Your Google OAuth Client Secret"
                  value={oauthCredentials.googleClientSecret}
                  onChange={(e) => handleCredentialChange('googleClientSecret', e.target.value)}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Microsoft Configuration */}
      {settings.provider === 'outlook' && (
        <>
          <Separator />
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Microsoft Outlook Configuration</h4>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Azure App (Client) ID</Label>
                <Input 
                  placeholder="Your Azure Application Client ID"
                  value={oauthCredentials.microsoftClientId}
                  onChange={(e) => handleCredentialChange('microsoftClientId', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <Input 
                  type="password"
                  placeholder="Your Azure Application Client Secret"
                  value={oauthCredentials.microsoftClientSecret}
                  onChange={(e) => handleCredentialChange('microsoftClientSecret', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tenant</Label>
                <Select 
                  value={oauthCredentials.microsoftTenant}
                  onValueChange={(value) => handleCredentialChange('microsoftTenant', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="common">Common (Personal & Work accounts)</SelectItem>
                    <SelectItem value="organizations">Organizations (Work accounts only)</SelectItem>
                    <SelectItem value="consumers">Consumers (Personal accounts only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Connection Status & Controls */}
      {settings.provider !== 'none' && (
        <>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Connection Status</h4>
              <Badge variant={connectionStatus.connected ? "default" : "secondary"}>
                {connectionStatus.connected ? (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    Connected
                  </>
                ) : (
                  <>
                    <X className="w-3 h-3 mr-1" />
                    Disconnected
                  </>
                )}
              </Badge>
            </div>

            {connectionStatus.connected && connectionStatus.userEmail && (
              <p className="text-sm text-muted-foreground">
                Connected as: {connectionStatus.userEmail}
              </p>
            )}

            {connectionStatus.error && (
              <div className="flex items-center p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 mr-2" />
                {connectionStatus.error}
              </div>
            )}

            <div className="flex gap-2">
              {!connectionStatus.connected ? (
                <div className="flex items-center gap-2 flex-1">
                  <Button 
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="flex-1"
                  >
                    {isConnecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Connect {settings.provider === 'google' ? 'Google' : 'Microsoft'} Account
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-md" side="left">
                        <div className="space-y-2 text-sm">
                          <p className="font-semibold">OAuth Configuration Required</p>
                          <p>Before connecting, ensure your {settings.provider === 'google' ? 'Google Cloud Console' : 'Azure Portal'} has:</p>
                          <ul className="list-disc list-inside space-y-1 text-xs">
                            <li><strong>Redirect URI:</strong> {window.location.origin}/oauth/callback</li>
                            <li><strong>JavaScript origin:</strong> {window.location.origin}</li>
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={handleDisconnect}
                  className="flex-1"
                >
                  Disconnect
                </Button>
              )}

              <Button 
                variant="outline" 
                onClick={handleTestConnection}
                disabled={isTestingConnection || !hasRequiredCredentials()}
              >
                {isTestingConnection && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Test Connection
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Calendar Selection */}
      {connectionStatus.connected && availableCalendars.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label>Default Calendar</Label>
            <Select 
              value={settings.defaultCalendarId || ''}
              onValueChange={(value) => handleSettingsChange({ defaultCalendarId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select default calendar" />
              </SelectTrigger>
              <SelectContent>
                {availableCalendars.map((calendar) => (
                  <SelectItem key={calendar.id} value={calendar.id}>
                    {calendar.name} {calendar.primary && '(Primary)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isLoadingCalendars && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Loading calendars...
              </div>
            )}
          </div>
        </>
      )}

      {/* Auto-sync Settings */}
      {settings.provider !== 'none' && (
        <>
          <Separator />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Auto-sync Hearings</Label>
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={settings.autoSync}
                  onCheckedChange={(checked) => handleSettingsChange({ autoSync: checked })}
                />
                <span className="text-sm">
                  {settings.autoSync ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Automatically sync hearings to your calendar
              </p>
            </div>

            <div className="space-y-2">
              <Label>Reminder Time</Label>
              <Select 
                value={settings.reminderTime?.toString() || '30'}
                onValueChange={(value) => handleSettingsChange({ reminderTime: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes before</SelectItem>
                  <SelectItem value="30">30 minutes before</SelectItem>
                  <SelectItem value="60">1 hour before</SelectItem>
                  <SelectItem value="120">2 hours before</SelectItem>
                  <SelectItem value="1440">1 day before</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sync Interval</Label>
              <Select 
                value={settings.syncInterval?.toString() || '60'}
                onValueChange={(value) => handleSettingsChange({ syncInterval: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Every 5 minutes</SelectItem>
                  <SelectItem value="15">Every 15 minutes</SelectItem>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                  <SelectItem value="60">Every hour</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How often to sync hearings in the background
              </p>
            </div>
          </div>
        </>
      )}

      {/* Setup Help */}
      {settings.provider !== 'none' && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Setup Guide</h4>
            <div className="text-xs text-muted-foreground space-y-2">
              {settings.provider === 'google' && (
                <>
                  <p>1. Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center">Google Cloud Console <ExternalLink className="w-3 h-3 ml-1" /></a></p>
                  <p>2. Create OAuth 2.0 credentials with redirect URI: <code className="bg-muted px-1 rounded">{window.location.origin}/oauth/callback</code></p>
                  <p>3. Enable the Google Calendar API</p>
                  <p>4. Copy the Client ID and Client Secret above</p>
                </>
              )}
              {settings.provider === 'outlook' && (
                <>
                  <p>1. Go to <a href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center">Azure Portal <ExternalLink className="w-3 h-3 ml-1" /></a></p>
                  <p>2. Register a new application</p>
                  <p>3. Add redirect URI: <code className="bg-muted px-1 rounded">{window.location.origin}/oauth/callback</code></p>
                  <p>4. Create a client secret and copy both IDs above</p>
                  <p>5. Add API permissions: Calendars.ReadWrite</p>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Save Button */}
      {settings.provider !== 'none' && (
        <div className="pt-4">
          <Button onClick={saveSettings} className="w-full">
            Save Settings
          </Button>
        </div>
      )}
    </div>
  );
};
