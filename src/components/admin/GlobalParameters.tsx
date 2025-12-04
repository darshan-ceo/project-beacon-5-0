import React, { useState } from 'react';
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
  MapPin,
  HelpCircle,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { CalendarIntegrationPanel } from './CalendarIntegrationPanel';
import { GSTIntegrationPanel } from './GSTIntegrationPanel';
import SMSConfigPanel from './SMSConfigPanel';
import { AddressSettings } from './AddressSettings';
import { EmailConfiguration } from './EmailConfiguration';
import { OutcomeTemplateManager } from './OutcomeTemplateManager';
import { AuthorityHierarchySettings } from '@/components/settings/AuthorityHierarchySettings';
import { SampleDataManager } from './SampleDataManager';
import { SystemSettingsLayout, SettingsSection } from './SystemSettingsLayout';
import { InlineHelp } from '@/components/help/InlineHelp';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SystemParameter {
  id: string;
  name: string;
  value: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: string[];
  description: string;
  tooltip: string;
  category: string;
}

const systemParameters: SystemParameter[] = [
  {
    id: 'session_timeout',
    name: 'Session Timeout (minutes)',
    value: '30',
    type: 'number',
    description: 'Automatic logout time for inactive users',
    tooltip: 'Sets idle timeout period',
    category: 'security'
  },
  {
    id: 'max_file_size',
    name: 'Maximum File Upload Size (MB)',
    value: '50',
    type: 'number',
    description: 'Maximum allowed file size for document uploads',
    tooltip: 'Limits upload file sizes',
    category: 'system'
  },
  {
    id: 'email_notifications',
    name: 'Email Notifications',
    value: 'true',
    type: 'boolean',
    description: 'Enable email notifications for system events',
    tooltip: 'Controls email alerts',
    category: 'notifications'
  },
  {
    id: 'backup_frequency',
    name: 'Backup Frequency',
    value: 'daily',
    type: 'select',
    options: ['hourly', 'daily', 'weekly'],
    description: 'Frequency of automatic system backups',
    tooltip: 'Sets backup schedule',
    category: 'system'
  },
  {
    id: 'case_number_format',
    name: 'Case Number Format',
    value: 'CASE-{YYYY}-{####}',
    type: 'text',
    description: 'Format for generating case numbers',
    tooltip: 'Defines case ID pattern',
    category: 'legal'
  }
];

// Field with tooltip wrapper component
const FieldWithTooltip: React.FC<{
  label: string;
  tooltip: string;
  description: string;
  children: React.ReactNode;
}> = ({ label, tooltip, description, children }) => (
  <TooltipProvider>
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      {children}
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  </TooltipProvider>
);

export const GlobalParameters: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [parameters, setParameters] = useState(systemParameters);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updateParameter = (id: string, value: string) => {
    setParameters(prev => prev.map(param => 
      param.id === id ? { ...param, value } : param
    ));
    setHasChanges(true);
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      toast({
        title: "Settings Saved",
        description: "System settings have been updated successfully.",
      });
      setHasChanges(false);
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save system settings.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
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

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  System Configuration
                </CardTitle>
                <CardDescription>Core system parameters and limits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {getParametersByCategory('system').map((param) => (
                  <FieldWithTooltip
                    key={param.id}
                    label={param.name}
                    tooltip={param.tooltip}
                    description={param.description}
                  >
                    {renderParameterInput(param)}
                  </FieldWithTooltip>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Performance Settings
                </CardTitle>
                <CardDescription>Caching and optimization options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldWithTooltip
                  label="Cache Duration (hours)"
                  tooltip="Controls static resource caching"
                  description="How long to cache static resources"
                >
                  <Input type="number" defaultValue="24" onChange={() => setHasChanges(true)} />
                </FieldWithTooltip>
                <FieldWithTooltip
                  label="Query Timeout (seconds)"
                  tooltip="Database query time limit"
                  description="Maximum time for database queries"
                >
                  <Input type="number" defaultValue="30" onChange={() => setHasChanges(true)} />
                </FieldWithTooltip>
                <FieldWithTooltip
                  label="Enable Compression"
                  tooltip="Reduces data transfer size"
                  description="Compress responses to reduce bandwidth"
                >
                  <Switch defaultChecked onCheckedChange={() => setHasChanges(true)} />
                </FieldWithTooltip>
              </CardContent>
            </Card>
          </div>
        );

      case 'security':
        return (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Authentication Settings
                </CardTitle>
                <CardDescription>Login and session security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {getParametersByCategory('security').map((param) => (
                  <FieldWithTooltip
                    key={param.id}
                    label={param.name}
                    tooltip={param.tooltip}
                    description={param.description}
                  >
                    {renderParameterInput(param)}
                  </FieldWithTooltip>
                ))}
                <Separator />
                <FieldWithTooltip
                  label="Password Policy"
                  tooltip="Sets password requirements"
                  description="Password complexity requirements"
                >
                  <Select defaultValue="medium" onValueChange={() => setHasChanges(true)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (8 characters)</SelectItem>
                      <SelectItem value="medium">Medium (8 chars + special)</SelectItem>
                      <SelectItem value="high">High (12 chars + mixed case)</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldWithTooltip>
                <FieldWithTooltip
                  label="Two-Factor Authentication"
                  tooltip="Adds extra security layer"
                  description="Require 2FA for all admin users"
                >
                  <Switch defaultChecked onCheckedChange={() => setHasChanges(true)} />
                </FieldWithTooltip>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Access Control
                </CardTitle>
                <CardDescription>IP restrictions and lockout settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldWithTooltip
                  label="IP Whitelist"
                  tooltip="Restricts access by IP"
                  description="Restrict access to specific IP addresses"
                >
                  <Textarea 
                    placeholder="Enter IP addresses (one per line)"
                    className="min-h-[100px]"
                    onChange={() => setHasChanges(true)}
                  />
                </FieldWithTooltip>
                <FieldWithTooltip
                  label="Login Attempt Limit"
                  tooltip="Failed login threshold"
                  description="Maximum failed login attempts before lockout"
                >
                  <Input type="number" defaultValue="5" onChange={() => setHasChanges(true)} />
                </FieldWithTooltip>
                <FieldWithTooltip
                  label="Lockout Duration (minutes)"
                  tooltip="Account lockout period"
                  description="How long to lock accounts after failed attempts"
                >
                  <Input type="number" defaultValue="15" onChange={() => setHasChanges(true)} />
                </FieldWithTooltip>
              </CardContent>
            </Card>
          </div>
        );

      case 'notifications':
        return (
          <div className="grid gap-6">
            <EmailConfiguration />
            <SMSConfigPanel />
          </div>
        );

      case 'legal':
        return (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Case Management
                </CardTitle>
                <CardDescription>Case numbering and workflow settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {getParametersByCategory('legal').map((param) => (
                  <FieldWithTooltip
                    key={param.id}
                    label={param.name}
                    tooltip={param.tooltip}
                    description={param.description}
                  >
                    {renderParameterInput(param)}
                  </FieldWithTooltip>
                ))}
                <Separator />
                <FieldWithTooltip
                  label="Default Case Status"
                  tooltip="Initial case status"
                  description="Default status for new cases"
                >
                  <Select defaultValue="open" onValueChange={() => setHasChanges(true)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldWithTooltip>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  SLA/TAT Configuration
                </CardTitle>
                <CardDescription>Service level agreement settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldWithTooltip
                  label="Default Response Time (hours)"
                  tooltip="Standard reply deadline"
                  description="Standard response time for client queries"
                >
                  <Input type="number" defaultValue="24" onChange={() => setHasChanges(true)} />
                </FieldWithTooltip>
                <FieldWithTooltip
                  label="Urgent Case TAT (hours)"
                  tooltip="Priority case deadline"
                  description="Turnaround time for urgent cases"
                >
                  <Input type="number" defaultValue="4" onChange={() => setHasChanges(true)} />
                </FieldWithTooltip>
                <FieldWithTooltip
                  label="Document Review Time (days)"
                  tooltip="Review period limit"
                  description="Standard time for document review"
                >
                  <Input type="number" defaultValue="3" onChange={() => setHasChanges(true)} />
                </FieldWithTooltip>
              </CardContent>
            </Card>
          </div>
        );

      case 'ai-communications':
        return (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  AI Features
                </CardTitle>
                <CardDescription>AI assistant configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldWithTooltip
                  label="Enable AI Assistant"
                  tooltip="Activates AI features"
                  description="Enable AI-powered draft generation and document summarization"
                >
                  <Switch defaultChecked onCheckedChange={() => setHasChanges(true)} />
                </FieldWithTooltip>
                <FieldWithTooltip
                  label="AI Provider"
                  tooltip="AI service selection"
                  description="AI service provider for content generation"
                >
                  <Select defaultValue="openai" onValueChange={() => setHasChanges(true)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI GPT</SelectItem>
                      <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                      <SelectItem value="mock">Mock Service</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldWithTooltip>
                <FieldWithTooltip
                  label="Response Time Limit (seconds)"
                  tooltip="AI timeout setting"
                  description="Maximum time to wait for AI responses"
                >
                  <Input type="number" defaultValue="30" onChange={() => setHasChanges(true)} />
                </FieldWithTooltip>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Communication Settings
                </CardTitle>
                <CardDescription>Messaging channel configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldWithTooltip
                  label="Enable Email"
                  tooltip="Email communication toggle"
                  description="Allow sending emails to clients"
                >
                  <Switch defaultChecked onCheckedChange={() => setHasChanges(true)} />
                </FieldWithTooltip>
                <FieldWithTooltip
                  label="Enable SMS"
                  tooltip="SMS communication toggle"
                  description="Allow sending SMS messages"
                >
                  <Switch defaultChecked onCheckedChange={() => setHasChanges(true)} />
                </FieldWithTooltip>
                <FieldWithTooltip
                  label="Enable WhatsApp"
                  tooltip="WhatsApp integration"
                  description="Allow sending WhatsApp messages"
                >
                  <Switch onCheckedChange={() => setHasChanges(true)} />
                </FieldWithTooltip>
                <FieldWithTooltip
                  label="Auto Hearing Reminders"
                  tooltip="Automated reminder system"
                  description="Automatically send hearing reminders"
                >
                  <Switch defaultChecked onCheckedChange={() => setHasChanges(true)} />
                </FieldWithTooltip>
                <FieldWithTooltip
                  label="Reminder Days"
                  tooltip="Reminder schedule"
                  description="Days before hearing to send reminders (comma-separated)"
                >
                  <Input defaultValue="1,3,7" onChange={() => setHasChanges(true)} />
                </FieldWithTooltip>
              </CardContent>
            </Card>
          </div>
        );

      case 'integrations':
        return (
          <div className="grid gap-6">
            {/* GST Integration - Full Width */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  GST Portal Integration (MasterGST)
                </CardTitle>
                <CardDescription>GST Service Provider connection for taxpayer data and compliance</CardDescription>
              </CardHeader>
              <CardContent>
                <GSTIntegrationPanel />
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Calendar Integration
                  </CardTitle>
                  <CardDescription>Sync with external calendars</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CalendarIntegrationPanel />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    External APIs
                  </CardTitle>
                  <CardDescription>Third-party service connections</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FieldWithTooltip
                    label="Legal Forum Records API"
                    tooltip="Court records integration"
                    description="Integration with legal forum record systems"
                  >
                    <Input placeholder="API endpoint URL" onChange={() => setHasChanges(true)} />
                  </FieldWithTooltip>
                  <FieldWithTooltip
                    label="Document Storage"
                    tooltip="File storage provider"
                    description="Document storage provider"
                  >
                    <Select defaultValue="local" onValueChange={() => setHasChanges(true)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local Storage</SelectItem>
                        <SelectItem value="aws">AWS S3</SelectItem>
                        <SelectItem value="azure">Azure Blob</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldWithTooltip>
                  <FieldWithTooltip
                    label="Enable API Logging"
                    tooltip="Debug external calls"
                    description="Log all external API calls for debugging"
                  >
                    <Switch defaultChecked onCheckedChange={() => setHasChanges(true)} />
                  </FieldWithTooltip>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'address':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Address Configuration
              </CardTitle>
              <CardDescription>State, city, and address format settings</CardDescription>
            </CardHeader>
            <CardContent>
              <AddressSettings />
            </CardContent>
          </Card>
        );

      case 'templates':
        return <OutcomeTemplateManager />;

      case 'legal-hierarchy':
        return <AuthorityHierarchySettings />;

      case 'sample-data':
        return <SampleDataManager />;

      default:
        return null;
    }
  };

  return (
    <SystemSettingsLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      hasChanges={hasChanges}
      isSaving={isSaving}
      onSave={saveChanges}
      onReset={resetToDefaults}
    >
      {renderSection()}
    </SystemSettingsLayout>
  );
};
