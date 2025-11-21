import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { EmailTestDialog } from './EmailTestDialog';
import { EmailHealthStatus } from './EmailHealthStatus';
import {
  getEmailSettings, 
  saveEmailSettings, 
  validateProviderConfig,
  validateClientSmtpConfig,
  getProviderDefaults,
  isEmailConfigured
} from '@/services/emailSettingsService';
import { sendTestEmail } from '@/services/emailService';
import type { EmailSettings, EmailMode, EmailProvider, EmailTestResult } from '@/types/email';
import { COMMON_PORTS } from '@/utils/emailValidation';
import { Mail, Server, AlertCircle, CheckCircle2, Eye, EyeOff, Send, Save, RotateCcw, ExternalLink } from 'lucide-react';

export function EmailConfiguration() {
  const [settings, setSettings] = useState<EmailSettings>({
    enabled: false,
    mode: 'provider'
  });
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [showProviderPassword, setShowProviderPassword] = useState(false);
  const [showClientPassword, setShowClientPassword] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<EmailTestResult | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const loaded = await getEmailSettings();
      setSettings(loaded);
      const configured = await isEmailConfigured();
      setIsConfigured(configured);
    } catch (error) {
      console.error('Failed to load email settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email settings',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Validate based on mode
      if (settings.enabled) {
        if (settings.mode === 'provider') {
          if (!settings.providerConfig) {
            throw new Error('Provider configuration is required');
          }
          const validation = validateProviderConfig(settings.providerConfig);
          if (!validation.valid) {
            throw new Error(validation.errors.join(', '));
          }
        } else if (settings.mode === 'client') {
          if (!settings.clientConfig) {
            throw new Error('Client SMTP configuration is required');
          }
          const validation = validateClientSmtpConfig(settings.clientConfig);
          if (!validation.valid) {
            throw new Error(validation.errors.join(', '));
          }
        }
      }

      await saveEmailSettings(settings);
      setHasUnsavedChanges(false);
      const configured = await isEmailConfigured();
      setIsConfigured(configured);

      toast({
        title: 'Success',
        description: 'Email configuration saved successfully',
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save email settings',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async (recipientEmail: string) => {
    const result = await sendTestEmail(recipientEmail, settings);
    setLastTestResult(result);
    return result;
  };

  const handleResetDefaults = () => {
    setSettings({
      enabled: false,
      mode: 'provider'
    });
    setHasUnsavedChanges(true);
    toast({
      title: 'Reset to defaults',
      description: 'Configuration reset. Remember to save changes.',
    });
  };

  const updateSettings = (partial: Partial<EmailSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
    setHasUnsavedChanges(true);
  };

  const handleProviderChange = (provider: EmailProvider) => {
    const defaults = provider !== 'custom' ? getProviderDefaults(provider) : null;
    updateSettings({
      providerConfig: {
        provider,
        email: settings.providerConfig?.email || '',
        appPassword: settings.providerConfig?.appPassword || ''
      }
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>
                Configure email delivery for notifications, communications, and alerts
              </CardDescription>
            </div>
            {isConfigured && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Configured</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Health Status */}
          <EmailHealthStatus lastTestResult={lastTestResult} />

          {/* Demo Mode Warning */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Demo Mode:</strong> This is a mock email service for prototyping. No actual emails will be sent. 
              Credentials are stored locally with basic encryption. For production, use Lovable Cloud with proper backend integration.
            </AlertDescription>
          </Alert>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="email-enabled" className="text-base font-medium">
                Enable Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Turn on email delivery for the application
              </p>
            </div>
            <Switch
              id="email-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => updateSettings({ enabled: checked })}
            />
          </div>

          {settings.enabled && (
            <>
              {/* Mode Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Email Mode</Label>
                <RadioGroup
                  value={settings.mode}
                  onValueChange={(value) => updateSettings({ mode: value as EmailMode })}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <RadioGroupItem value="provider" id="mode-provider" className="peer sr-only" />
                    <Label
                      htmlFor="mode-provider"
                      className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Mail className="mb-3 h-6 w-6" />
                      <div className="space-y-1 text-center">
                        <p className="text-sm font-medium leading-none">Provider SMTP</p>
                        <p className="text-xs text-muted-foreground">Gmail, Yahoo, Outlook</p>
                      </div>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="client" id="mode-client" className="peer sr-only" />
                    <Label
                      htmlFor="mode-client"
                      className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Server className="mb-3 h-6 w-6" />
                      <div className="space-y-1 text-center">
                        <p className="text-sm font-medium leading-none">Client SMTP</p>
                        <p className="text-xs text-muted-foreground">Custom server</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Provider Mode Configuration */}
              {settings.mode === 'provider' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">Email Provider</Label>
                    <Select
                      value={settings.providerConfig?.provider || ''}
                      onValueChange={(value) => handleProviderChange(value as EmailProvider)}
                    >
                      <SelectTrigger id="provider">
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gmail">Gmail</SelectItem>
                        <SelectItem value="yahoo">Yahoo Mail</SelectItem>
                        <SelectItem value="outlook">Outlook / Office 365</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {settings.providerConfig?.provider && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="provider-email">Email Address</Label>
                        <Input
                          id="provider-email"
                          type="email"
                          placeholder="your.email@example.com"
                          value={settings.providerConfig.email}
                          onChange={(e) => updateSettings({
                            providerConfig: { ...settings.providerConfig!, email: e.target.value }
                          })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="provider-password">App Password</Label>
                        <div className="relative">
                          <Input
                            id="provider-password"
                            type={showProviderPassword ? 'text' : 'password'}
                            placeholder="Enter app password"
                            value={settings.providerConfig.appPassword}
                            onChange={(e) => updateSettings({
                              providerConfig: { ...settings.providerConfig!, appPassword: e.target.value }
                            })}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowProviderPassword(!showProviderPassword)}
                          >
                            {showProviderPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Use an app-specific password, not your regular password
                        </p>
                      </div>

                      {/* Provider Setup Guide */}
                      <Alert>
                        <AlertDescription className="space-y-2 text-sm">
                          <strong>Setup Guide for {settings.providerConfig.provider}:</strong>
                          {settings.providerConfig.provider === 'gmail' && (
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                              <li>Go to Google Account → Security → 2-Step Verification</li>
                              <li>Scroll to "App Passwords" and generate a new one</li>
                              <li>Use the generated password above (not your Google password)</li>
                              <li>Configuration: smtp.gmail.com:587 (TLS) or :465 (SSL)</li>
                            </ul>
                          )}
                          {settings.providerConfig.provider === 'yahoo' && (
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                              <li>Go to Yahoo Account Security settings</li>
                              <li>Generate an app password for "Mail"</li>
                              <li>Use the app password for authentication</li>
                              <li>Configuration: smtp.mail.yahoo.com:587</li>
                            </ul>
                          )}
                          {settings.providerConfig.provider === 'outlook' && (
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                              <li>Go to Microsoft Account → Security</li>
                              <li>Navigate to "App Passwords" and create one</li>
                              <li>Use the app password for SMTP authentication</li>
                              <li>Configuration: smtp-mail.outlook.com:587 (TLS)</li>
                            </ul>
                          )}
                          <Button
                            variant="link"
                            className="h-auto p-0 text-xs"
                            asChild
                          >
                            <a
                              href={getProviderDefaults(settings.providerConfig.provider as any).setupGuideUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1"
                            >
                              View official setup guide
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </AlertDescription>
                      </Alert>
                    </>
                  )}
                </div>
              )}

              {/* Client SMTP Configuration */}
              {settings.mode === 'client' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp-host">SMTP Host</Label>
                      <Input
                        id="smtp-host"
                        placeholder="smtp.example.com"
                        value={settings.clientConfig?.host || ''}
                        onChange={(e) => updateSettings({
                          clientConfig: { 
                            ...settings.clientConfig!,
                            host: e.target.value,
                            port: settings.clientConfig?.port || 587,
                            secure: settings.clientConfig?.secure || true,
                            username: settings.clientConfig?.username || '',
                            password: settings.clientConfig?.password || '',
                            fromAddress: settings.clientConfig?.fromAddress || ''
                          }
                        })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Example: smtp.gmail.com, smtp.sendgrid.net
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtp-port">Port</Label>
                      <Select
                        value={settings.clientConfig?.port?.toString() || '587'}
                        onValueChange={(value) => updateSettings({
                          clientConfig: { ...settings.clientConfig!, port: parseInt(value) }
                        })}
                      >
                        <SelectTrigger id="smtp-port">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMMON_PORTS.map((port) => (
                            <SelectItem key={port.value} value={port.value.toString()}>
                              {port.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="smtp-secure" className="text-sm font-medium">
                        Secure Connection (TLS/SSL)
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Recommended for ports 587 and 465
                      </p>
                    </div>
                    <Switch
                      id="smtp-secure"
                      checked={settings.clientConfig?.secure || false}
                      onCheckedChange={(checked) => updateSettings({
                        clientConfig: { ...settings.clientConfig!, secure: checked }
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp-username">Username</Label>
                    <Input
                      id="smtp-username"
                      placeholder="username or email"
                      value={settings.clientConfig?.username || ''}
                      onChange={(e) => updateSettings({
                        clientConfig: { ...settings.clientConfig!, username: e.target.value }
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="smtp-password"
                        type={showClientPassword ? 'text' : 'password'}
                        placeholder="Enter SMTP password"
                        value={settings.clientConfig?.password || ''}
                        onChange={(e) => updateSettings({
                          clientConfig: { ...settings.clientConfig!, password: e.target.value }
                        })}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowClientPassword(!showClientPassword)}
                      >
                        {showClientPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="from-address">From Email Address</Label>
                    <Input
                      id="from-address"
                      type="email"
                      placeholder="noreply@example.com"
                      value={settings.clientConfig?.fromAddress || ''}
                      onChange={(e) => updateSettings({
                        clientConfig: { ...settings.clientConfig!, fromAddress: e.target.value }
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="from-name">From Name (Optional)</Label>
                    <Input
                      id="from-name"
                      placeholder="Law Firm CMS"
                      value={settings.clientConfig?.fromName || ''}
                      onChange={(e) => updateSettings({
                        clientConfig: { ...settings.clientConfig!, fromName: e.target.value }
                      })}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleResetDefaults}
              disabled={isSaving}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowTestDialog(true)}
                disabled={!settings.enabled || isSaving}
              >
                <Send className="mr-2 h-4 w-4" />
                Send Test Email
              </Button>
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving || !hasUnsavedChanges}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </div>

          {hasUnsavedChanges && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have unsaved changes. Remember to save your configuration.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <EmailTestDialog
        open={showTestDialog}
        onOpenChange={setShowTestDialog}
        onSendTest={handleTestEmail}
      />
    </>
  );
}
