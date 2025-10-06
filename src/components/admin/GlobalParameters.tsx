import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Clock, 
  Mail, 
  MessageSquare, 
  Calendar, 
  Database, 
  Shield, 
  Bell,
  Globe,
  Save,
  RefreshCw,
  AlertTriangle,
  MapPin
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { CalendarIntegrationPanel } from './CalendarIntegrationPanel';
import { AddressSettings } from './AddressSettings';
import { featureFlagService } from '@/services/featureFlagService';

interface SystemParameter {
  id: string;
  name: string;
  value: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: string[];
  description: string;
  category: string;
}

const systemParameters: SystemParameter[] = [
  {
    id: 'session_timeout',
    name: 'Session Timeout (minutes)',
    value: '30',
    type: 'number',
    description: 'Automatic logout time for inactive users',
    category: 'security'
  },
  {
    id: 'max_file_size',
    name: 'Maximum File Upload Size (MB)',
    value: '50',
    type: 'number',
    description: 'Maximum allowed file size for document uploads',
    category: 'system'
  },
  {
    id: 'email_notifications',
    name: 'Email Notifications',
    value: 'true',
    type: 'boolean',
    description: 'Enable email notifications for system events',
    category: 'notifications'
  },
  {
    id: 'backup_frequency',
    name: 'Backup Frequency',
    value: 'daily',
    type: 'select',
    options: ['hourly', 'daily', 'weekly'],
    description: 'Frequency of automatic system backups',
    category: 'system'
  },
  {
    id: 'case_number_format',
    name: 'Case Number Format',
    value: 'CASE-{YYYY}-{####}',
    type: 'text',
    description: 'Format for generating case numbers',
    category: 'legal'
  }
];

export const GlobalParameters: React.FC = () => {
  const [parameters, setParameters] = useState(systemParameters);
  const [hasChanges, setHasChanges] = useState(false);

  const updateParameter = (id: string, value: string) => {
    setParameters(prev => prev.map(param => 
      param.id === id ? { ...param, value } : param
    ));
    setHasChanges(true);
  };

  const saveChanges = () => {
    toast({
      title: "Settings Saved",
      description: "Global parameters have been updated successfully.",
    });
    setHasChanges(false);
  };

  const resetToDefaults = () => {
    setParameters(systemParameters);
    setHasChanges(true);
    toast({
      title: "Settings Reset",
      description: "All parameters have been reset to default values.",
      variant: "destructive"
    });
  };

  const renderParameterInput = (param: SystemParameter) => {
    switch (param.type) {
      case 'boolean':
        return (
          <Switch
            checked={param.value === 'true'}
            onCheckedChange={(checked) => updateParameter(param.id, checked.toString())}
          />
        );
      case 'select':
        return (
          <Select value={param.value} onValueChange={(value) => updateParameter(param.id, value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {param.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'number':
        return (
          <Input
            type="number"
            value={param.value}
            onChange={(e) => updateParameter(param.id, e.target.value)}
          />
        );
      default:
        return (
          <Input
            value={param.value}
            onChange={(e) => updateParameter(param.id, e.target.value)}
          />
        );
    }
  };

  const getParametersByCategory = (category: string) => 
    parameters.filter(param => param.category === category);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between">
        <div className="w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl font-bold">Global Parameters</h1>
          <p className="text-sm text-muted-foreground mt-2">Configure system-wide settings and parameters</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={resetToDefaults}
            className="text-destructive hover:text-destructive flex-1 sm:flex-none"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Reset to Defaults</span>
            <span className="sm:hidden">Reset</span>
          </Button>
          <Button onClick={saveChanges} disabled={!hasChanges} className="flex-1 sm:flex-none">
            <Save className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Save Changes</span>
            <span className="sm:hidden">Save</span>
          </Button>
        </div>
      </div>

      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-orange-50 border border-orange-200 rounded-lg p-4"
        >
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
            <p className="text-orange-800">You have unsaved changes. Click "Save Changes" to apply them.</p>
          </div>
        </motion.div>
      )}

      <Tabs defaultValue="system" className="space-y-6">
        {featureFlagService.isEnabled('tabs_overflow_fix_v1') ? (
          <div className="border-b border-border bg-background">
            <div className="overflow-x-auto scrollbar-thin">
              <TabsList className="inline-flex w-max min-w-full h-auto p-1">
                <TabsTrigger value="system" className="min-w-[100px] whitespace-nowrap">System</TabsTrigger>
                <TabsTrigger value="security" className="min-w-[100px] whitespace-nowrap">Security</TabsTrigger>
                <TabsTrigger value="notifications" className="min-w-[120px] whitespace-nowrap">Notifications</TabsTrigger>
                <TabsTrigger value="legal" className="min-w-[100px] whitespace-nowrap">Legal</TabsTrigger>
                <TabsTrigger value="integrations" className="min-w-[120px] whitespace-nowrap">Integrations</TabsTrigger>
                <TabsTrigger value="ai-communications" className="min-w-[140px] whitespace-nowrap">AI & Communications</TabsTrigger>
                <TabsTrigger value="address-config" className="min-w-[120px] whitespace-nowrap">Address Config</TabsTrigger>
              </TabsList>
            </div>
          </div>
        ) : (
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 p-1 h-auto">
            <TabsTrigger value="system" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap">System</TabsTrigger>
            <TabsTrigger value="security" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap">Security</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap">Notifications</TabsTrigger>
            <TabsTrigger value="legal" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap">Legal</TabsTrigger>
            <TabsTrigger value="integrations" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap">Integrations</TabsTrigger>
            <TabsTrigger value="ai-communications" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap">AI & Communications</TabsTrigger>
            <TabsTrigger value="address-config" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap">Address Configuration</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="system" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  System Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {getParametersByCategory('system').map((param) => (
                  <div key={param.id} className="space-y-2">
                    <Label>{param.name}</Label>
                    {renderParameterInput(param)}
                    <p className="text-xs text-muted-foreground">{param.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Performance Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Cache Duration (hours)</Label>
                  <Input type="number" defaultValue="24" />
                  <p className="text-xs text-muted-foreground">How long to cache static resources</p>
                </div>
                <div className="space-y-2">
                  <Label>Query Timeout (seconds)</Label>
                  <Input type="number" defaultValue="30" />
                  <p className="text-xs text-muted-foreground">Maximum time for database queries</p>
                </div>
                <div className="space-y-2">
                  <Label>Enable Compression</Label>
                  <Switch defaultChecked />
                  <p className="text-xs text-muted-foreground">Compress responses to reduce bandwidth</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Authentication Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {getParametersByCategory('security').map((param) => (
                  <div key={param.id} className="space-y-2">
                    <Label>{param.name}</Label>
                    {renderParameterInput(param)}
                    <p className="text-xs text-muted-foreground">{param.description}</p>
                  </div>
                ))}
                <Separator />
                <div className="space-y-2">
                  <Label>Password Policy</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (8 characters)</SelectItem>
                      <SelectItem value="medium">Medium (8 chars + special)</SelectItem>
                      <SelectItem value="high">High (12 chars + mixed case)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Password complexity requirements</p>
                </div>
                <div className="space-y-2">
                  <Label>Two-Factor Authentication</Label>
                  <Switch defaultChecked />
                  <p className="text-xs text-muted-foreground">Require 2FA for all admin users</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Access Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>IP Whitelist</Label>
                  <Textarea 
                    placeholder="Enter IP addresses (one per line)"
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground">Restrict access to specific IP addresses</p>
                </div>
                <div className="space-y-2">
                  <Label>Login Attempt Limit</Label>
                  <Input type="number" defaultValue="5" />
                  <p className="text-xs text-muted-foreground">Maximum failed login attempts before lockout</p>
                </div>
                <div className="space-y-2">
                  <Label>Lockout Duration (minutes)</Label>
                  <Input type="number" defaultValue="15" />
                  <p className="text-xs text-muted-foreground">How long to lock accounts after failed attempts</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="h-5 w-5 mr-2" />
                  Email Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {getParametersByCategory('notifications').map((param) => (
                  <div key={param.id} className="space-y-2">
                    <Label>{param.name}</Label>
                    {renderParameterInput(param)}
                    <p className="text-xs text-muted-foreground">{param.description}</p>
                  </div>
                ))}
                <Separator />
                <div className="space-y-2">
                  <Label>SMTP Server</Label>
                  <Input placeholder="smtp.example.com" />
                  <p className="text-xs text-muted-foreground">Email server configuration</p>
                </div>
                <div className="space-y-2">
                  <Label>From Address</Label>
                  <Input placeholder="noreply@lawfirm.com" />
                  <p className="text-xs text-muted-foreground">Default sender email address</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  SMS & Push Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>SMS Provider</Label>
                  <Select defaultValue="twilio">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="aws">AWS SNS</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">SMS service provider</p>
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input type="password" placeholder="Enter API key" />
                  <p className="text-xs text-muted-foreground">SMS provider API key</p>
                </div>
                <div className="space-y-2">
                  <Label>Push Notifications</Label>
                  <Switch defaultChecked />
                  <p className="text-xs text-muted-foreground">Enable browser push notifications</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="legal" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Case Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {getParametersByCategory('legal').map((param) => (
                  <div key={param.id} className="space-y-2">
                    <Label>{param.name}</Label>
                    {renderParameterInput(param)}
                    <p className="text-xs text-muted-foreground">{param.description}</p>
                  </div>
                ))}
                <Separator />
                <div className="space-y-2">
                  <Label>Default Case Status</Label>
                  <Select defaultValue="open">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Default status for new cases</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  SLA/TAT Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Default Response Time (hours)</Label>
                  <Input type="number" defaultValue="24" />
                  <p className="text-xs text-muted-foreground">Standard response time for client queries</p>
                </div>
                <div className="space-y-2">
                  <Label>Urgent Case TAT (hours)</Label>
                  <Input type="number" defaultValue="4" />
                  <p className="text-xs text-muted-foreground">Turnaround time for urgent cases</p>
                </div>
                <div className="space-y-2">
                  <Label>Document Review Time (days)</Label>
                  <Input type="number" defaultValue="3" />
                  <p className="text-xs text-muted-foreground">Standard time for document review</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Calendar Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CalendarIntegrationPanel />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  External APIs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Court Records API</Label>
                  <Input placeholder="API endpoint URL" />
                  <p className="text-xs text-muted-foreground">Integration with court record systems</p>
                </div>
                <div className="space-y-2">
                  <Label>Document Storage</Label>
                  <Select defaultValue="local">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local Storage</SelectItem>
                      <SelectItem value="aws">AWS S3</SelectItem>
                      <SelectItem value="azure">Azure Blob</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Document storage provider</p>
                </div>
                <div className="space-y-2">
                  <Label>Enable API Logging</Label>
                  <Switch defaultChecked />
                  <p className="text-xs text-muted-foreground">Log all external API calls for debugging</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai-communications" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  AI Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Enable AI Assistant</Label>
                  <Switch defaultChecked />
                  <p className="text-xs text-muted-foreground">Enable AI-powered draft generation and document summarization</p>
                </div>
                <div className="space-y-2">
                  <Label>AI Provider</Label>
                  <Select defaultValue="openai">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI GPT</SelectItem>
                      <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                      <SelectItem value="mock">Mock Service</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">AI service provider for content generation</p>
                </div>
                <div className="space-y-2">
                  <Label>Response Time Limit (seconds)</Label>
                  <Input type="number" defaultValue="30" />
                  <p className="text-xs text-muted-foreground">Maximum time to wait for AI responses</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Communication Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Enable Email</Label>
                  <Switch defaultChecked />
                  <p className="text-xs text-muted-foreground">Allow sending emails to clients</p>
                </div>
                <div className="space-y-2">
                  <Label>Enable SMS</Label>
                  <Switch defaultChecked />
                  <p className="text-xs text-muted-foreground">Allow sending SMS messages</p>
                </div>
                <div className="space-y-2">
                  <Label>Enable WhatsApp</Label>
                  <Switch />
                  <p className="text-xs text-muted-foreground">Allow sending WhatsApp messages</p>
                </div>
                <div className="space-y-2">
                  <Label>Auto Hearing Reminders</Label>
                  <Switch defaultChecked />
                  <p className="text-xs text-muted-foreground">Automatically send hearing reminders</p>
                </div>
                <div className="space-y-2">
                  <Label>Reminder Days</Label>
                  <Input defaultValue="1,3,7" />
                  <p className="text-xs text-muted-foreground">Days before hearing to send reminders (comma-separated)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="address-config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Address Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AddressSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};