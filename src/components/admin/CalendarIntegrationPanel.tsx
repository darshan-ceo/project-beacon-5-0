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

export const CalendarIntegrationPanel: React.FC = () => {
  const [settings, setSettings] = useState<CalendarIntegrationSettings>({
    orgId: 'default', // In production, this would come from user context
    provider: 'none',
    autoSync: true,
    reminderTime: 30,
  });
  const [connectionStatus, setConnectionStatus] = useState<CalendarConnectionStatus>({ connected: false });
  const [availableCalendars, setAvailableCalendars] = useState<CalendarInfo[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    const loadedSettings = integrationsService.loadCalendarSettings('default');
    if (loadedSettings) {
      setSettings(loadedSettings);
      updateConnectionStatus(loadedSettings);
      if (loadedSettings.provider !== 'none') {
        loadCalendars(loadedSettings);
      }
    }
  }, []);

  // Update connection status
  const updateConnectionStatus = (currentSettings: CalendarIntegrationSettings) => {
    if (currentSettings.provider === 'none') {
      setConnectionStatus({ connected: false });
      return;
    }

    const providerKey = currentSettings.provider === 'outlook' ? 'outlook' : 'google';
    const status = integrationsService.getConnectionStatus(currentSettings.orgId, providerKey);
    setConnectionStatus(status);
  };

  // Load available calendars
  const loadCalendars = async (currentSettings: CalendarIntegrationSettings) => {
    if (currentSettings.provider === 'none') {
      setAvailableCalendars([]);
      return;
    }

    setIsLoadingCalendars(true);
    try {
      const calendars = await calendarService.listCalendars(currentSettings);
      setAvailableCalendars(calendars);
    } catch (error) {
      console.error('Failed to load calendars:', error);
      setAvailableCalendars([]);
    } finally {
      setIsLoadingCalendars(false);
    }
  };

  // Handle settings change
  const handleSettingsChange = (updates: Partial<CalendarIntegrationSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    
    // Update connection status when provider changes
    if (updates.provider !== undefined) {
      updateConnectionStatus(newSettings);
      if (newSettings.provider !== 'none') {
        loadCalendars(newSettings);
      } else {
        setAvailableCalendars([]);
      }
    }
  };

  // Save settings
  const saveSettings = () => {
    integrationsService.saveCalendarSettings(settings);
  };

  // Start OAuth connection
  const handleConnect = async () => {
    if (settings.provider === 'none') return;

    const requiredFields = getRequiredFields();
    const missingFields = requiredFields.filter(field => !settings[field as keyof CalendarIntegrationSettings]);
    
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
      integrationsService.saveCalendarSettings(settings);
      
      toast({
        title: "Settings Saved",
        description: "Starting authentication process...",
      });

      let config;
      if (settings.provider === 'google') {
        config = OAuthManager.getGoogleConfig(
          settings.googleClientId!,
          settings.googleClientSecret
        );
      } else {
        config = OAuthManager.getMicrosoftConfig(
          settings.microsoftClientId!,
          settings.microsoftTenant || 'common',
          settings.microsoftClientSecret
        );
      }

      await OAuthManager.startOAuth(settings.provider === 'outlook' ? 'microsoft' : 'google', config);
    } catch (error) {
      console.error('OAuth start failed:', error);
      
      // Enhanced error handling for redirect_uri_mismatch
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRedirectUriError = errorMessage.toLowerCase().includes('redirect_uri') || 
                                  errorMessage.includes('400') ||
                                  errorMessage.toLowerCase().includes('redirect uri mismatch');
      
      if (isRedirectUriError) {
        toast({
          title: "OAuth Redirect URI Mismatch",
          description: `Please ensure your ${settings.provider === 'google' ? 'Google Cloud Console' : 'Azure Portal'} has the correct redirect URI configured: ${window.location.origin}/oauth/callback`,
          variant: "destructive",
          duration: 10000, // Longer duration for important error
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
  const handleDisconnect = () => {
    if (settings.provider === 'none') return;

    const providerKey = settings.provider === 'outlook' ? 'outlook' : 'google';
    integrationsService.clearTokens(settings.orgId, providerKey);
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
    
    // Validate required fields first
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
        updateConnectionStatus(settings);
        loadCalendars(settings);
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
      return !!(settings.googleClientId && settings.googleClientSecret);
    }
    
    if (settings.provider === 'outlook') {
      return !!(settings.microsoftClientId && settings.microsoftClientSecret);
    }
    
    return false;
  };

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
                  value={settings.googleClientId || ''}
                  onChange={(e) => handleSettingsChange({ googleClientId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Google Client Secret</Label>
                <Input 
                  type="password"
                  placeholder="Your Google OAuth Client Secret"
                  value={settings.googleClientSecret || ''}
                  onChange={(e) => handleSettingsChange({ googleClientSecret: e.target.value })}
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
                  value={settings.microsoftClientId || ''}
                  onChange={(e) => handleSettingsChange({ microsoftClientId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <Input 
                  type="password"
                  placeholder="Your Azure Application Client Secret"
                  value={settings.microsoftClientSecret || ''}
                  onChange={(e) => handleSettingsChange({ microsoftClientSecret: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tenant</Label>
                <Select 
                  value={settings.microsoftTenant || 'common'}
                  onValueChange={(value) => handleSettingsChange({ microsoftTenant: value })}
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
                Automatically sync legal forum hearings to calendar
              </p>
            </div>

            <div className="space-y-2">
              <Label>Auto-Sync Interval</Label>
              <Select 
                value={(settings.syncInterval || 5).toString()}
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
                How often to check for unsynced hearings
              </p>
            </div>

            <div className="space-y-2">
              <Label>Reminder Time (minutes)</Label>
              <Input 
                type="number" 
                value={settings.reminderTime}
                onChange={(e) => handleSettingsChange({ reminderTime: parseInt(e.target.value) || 30 })}
                min="5"
                max="1440"
              />
              <p className="text-xs text-muted-foreground">
                Default reminder time for calendar events
              </p>
            </div>
          </div>
        </>
      )}

      {/* Save Button */}
      <Button onClick={saveSettings} className="w-full">
        Save Settings
      </Button>
    </div>
  );
};