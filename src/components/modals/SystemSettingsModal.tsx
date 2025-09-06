import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Database, 
  Shield, 
  Mail, 
  Bell, 
  Calendar,
  FileText,
  Users,
  Globe,
  Save,
  RotateCcw
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SystemSettings {
  general: {
    organizationName: string;
    timezone: string;
    language: string;
    currency: string;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    reminderTime: number;
  };
  security: {
    sessionTimeout: number;
    passwordMinLength: number;
    requireTwoFactor: boolean;
    allowPortalAccess: boolean;
  };
  calendar: {
    defaultView: string;
    workingHours: { start: string; end: string };
    weekends: boolean;
  };
  documents: {
    maxFileSize: number;
    allowedTypes: string[];
    autoBackup: boolean;
    retentionDays: number;
  };
}

export const SystemSettingsModal: React.FC<SystemSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [settings, setSettings] = useState<SystemSettings>({
    general: {
      organizationName: 'Legal Practice Management',
      timezone: 'Asia/Kolkata',
      language: 'en',
      currency: 'INR'
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      reminderTime: 30
    },
    security: {
      sessionTimeout: 30,
      passwordMinLength: 8,
      requireTwoFactor: false,
      allowPortalAccess: true
    },
    calendar: {
      defaultView: 'week',
      workingHours: { start: '09:00', end: '18:00' },
      weekends: false
    },
    documents: {
      maxFileSize: 50,
      allowedTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png'],
      autoBackup: true,
      retentionDays: 365
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSettingChange = (
    category: keyof SystemSettings,
    field: string,
    value: any
  ) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Mock save - replace with actual service call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Settings Saved",
        description: "System settings have been updated successfully",
      });
      
      setHasChanges(false);
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    // Reset to default values
    setSettings({
      general: {
        organizationName: 'Legal Practice Management',
        timezone: 'Asia/Kolkata',
        language: 'en',
        currency: 'INR'
      },
      notifications: {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        reminderTime: 30
      },
      security: {
        sessionTimeout: 30,
        passwordMinLength: 8,
        requireTwoFactor: false,
        allowPortalAccess: true
      },
      calendar: {
        defaultView: 'week',
        workingHours: { start: '09:00', end: '18:00' },
        weekends: false
      },
      documents: {
        maxFileSize: 50,
        allowedTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png'],
        autoBackup: true,
        retentionDays: 365
      }
    });
    setHasChanges(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Settings
          </DialogTitle>
          <DialogDescription>
            Configure application settings and preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Basic application configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input
                      id="orgName"
                      value={settings.general.organizationName}
                      onChange={(e) => handleSettingChange('general', 'organizationName', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select 
                      value={settings.general.timezone} 
                      onValueChange={(value) => handleSettingChange('general', 'timezone', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select 
                      value={settings.general.language} 
                      onValueChange={(value) => handleSettingChange('general', 'language', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="mr">Marathi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select 
                      value={settings.general.currency} 
                      onValueChange={(value) => handleSettingChange('general', 'currency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure how and when you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={settings.notifications.emailEnabled}
                      onCheckedChange={(checked) => handleSettingChange('notifications', 'emailEnabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive critical alerts via SMS</p>
                    </div>
                    <Switch
                      checked={settings.notifications.smsEnabled}
                      onCheckedChange={(checked) => handleSettingChange('notifications', 'smsEnabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">Browser push notifications</p>
                    </div>
                    <Switch
                      checked={settings.notifications.pushEnabled}
                      onCheckedChange={(checked) => handleSettingChange('notifications', 'pushEnabled', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="reminderTime">Default Reminder Time (minutes before)</Label>
                    <Select 
                      value={settings.notifications.reminderTime.toString()} 
                      onValueChange={(value) => handleSettingChange('notifications', 'reminderTime', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="1440">1 day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Configure security and access controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                      <Input
                        id="sessionTimeout"
                        type="number"
                        value={settings.security.sessionTimeout}
                        onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="passwordLength">Minimum Password Length</Label>
                      <Input
                        id="passwordLength"
                        type="number"
                        value={settings.security.passwordMinLength}
                        onChange={(e) => handleSettingChange('security', 'passwordMinLength', parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Two-Factor Authentication</Label>
                        <p className="text-sm text-muted-foreground">Require 2FA for all users</p>
                      </div>
                      <Switch
                        checked={settings.security.requireTwoFactor}
                        onCheckedChange={(checked) => handleSettingChange('security', 'requireTwoFactor', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Client Portal Access</Label>
                        <p className="text-sm text-muted-foreground">Allow clients to access portal</p>
                      </div>
                      <Switch
                        checked={settings.security.allowPortalAccess}
                        onCheckedChange={(checked) => handleSettingChange('security', 'allowPortalAccess', checked)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Calendar Settings</CardTitle>
                <CardDescription>Configure calendar views and working hours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="defaultView">Default Calendar View</Label>
                      <Select 
                        value={settings.calendar.defaultView} 
                        onValueChange={(value) => handleSettingChange('calendar', 'defaultView', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">Day View</SelectItem>
                          <SelectItem value="week">Week View</SelectItem>
                          <SelectItem value="month">Month View</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Show Weekends</Label>
                        <p className="text-sm text-muted-foreground">Display weekends in calendar</p>
                      </div>
                      <Switch
                        checked={settings.calendar.weekends}
                        onCheckedChange={(checked) => handleSettingChange('calendar', 'weekends', checked)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="workStart">Working Hours Start</Label>
                      <Input
                        id="workStart"
                        type="time"
                        value={settings.calendar.workingHours.start}
                        onChange={(e) => handleSettingChange('calendar', 'workingHours', {
                          ...settings.calendar.workingHours,
                          start: e.target.value
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="workEnd">Working Hours End</Label>
                      <Input
                        id="workEnd"
                        type="time"
                        value={settings.calendar.workingHours.end}
                        onChange={(e) => handleSettingChange('calendar', 'workingHours', {
                          ...settings.calendar.workingHours,
                          end: e.target.value
                        })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Document Settings</CardTitle>
                <CardDescription>Configure document storage and management</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxSize">Maximum File Size (MB)</Label>
                      <Input
                        id="maxSize"
                        type="number"
                        value={settings.documents.maxFileSize}
                        onChange={(e) => handleSettingChange('documents', 'maxFileSize', parseInt(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="retention">Retention Period (days)</Label>
                      <Input
                        id="retention"
                        type="number"
                        value={settings.documents.retentionDays}
                        onChange={(e) => handleSettingChange('documents', 'retentionDays', parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Auto Backup</Label>
                        <p className="text-sm text-muted-foreground">Automatically backup documents</p>
                      </div>
                      <Switch
                        checked={settings.documents.autoBackup}
                        onCheckedChange={(checked) => handleSettingChange('documents', 'autoBackup', checked)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Allowed File Types</Label>
                      <div className="flex flex-wrap gap-1">
                        {settings.documents.allowedTypes.map((type) => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};