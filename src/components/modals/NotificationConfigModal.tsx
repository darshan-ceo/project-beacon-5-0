import React, { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { notificationsService, NotificationPreferences } from '@/services/notificationsService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Calendar, Mail, MessageCircle, Loader2 } from 'lucide-react';

interface NotificationConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId?: string;
}

export const NotificationConfigModal: React.FC<NotificationConfigModalProps> = ({
  open,
  onOpenChange,
  caseId = 'default'
}) => {
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    caseId,
    googleCalendar: false,
    outlook: false,
    reminderDays: [1],
    emailNotifications: true,
    smsNotifications: false
  });

  useEffect(() => {
    if (open && caseId) {
      loadPreferences();
    }
  }, [open, caseId]);

  const loadPreferences = async () => {
    try {
      const existing = await notificationsService.getCasePreferences(caseId);
      if (existing) {
        setPreferences(existing);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await notificationsService.saveCasePreferences(preferences);
      
      // Create calendar integrations if enabled
      if (preferences.googleCalendar) {
        await notificationsService.createCalendarIntegration(caseId, 'google');
      }
      if (preferences.outlook) {
        await notificationsService.createCalendarIntegration(caseId, 'outlook');
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateReminderDays = (day: number, checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      reminderDays: checked 
        ? [...prev.reminderDays, day].sort((a, b) => a - b)
        : prev.reminderDays.filter(d => d !== day)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5 text-primary" />
            Configure Notifications
          </DialogTitle>
          <DialogDescription>
            Set up calendar integration and notification preferences for your hearings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Calendar Integration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                Calendar Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="google-calendar" className="text-sm font-medium">
                    Google Calendar
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Sync hearings with your Google Calendar
                  </p>
                </div>
                <Switch
                  id="google-calendar"
                  checked={preferences.googleCalendar}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, googleCalendar: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="outlook" className="text-sm font-medium">
                    Microsoft Outlook
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Sync hearings with your Outlook calendar
                  </p>
                </div>
                <Switch
                  id="outlook"
                  checked={preferences.outlook}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, outlook: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Reminder Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Bell className="mr-2 h-4 w-4" />
                Reminder Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground mb-3">
                  Select when you want to receive reminders before hearings
                </p>
                
                {[1, 3, 7].map((days) => (
                  <div key={days} className="flex items-center space-x-2">
                    <Checkbox
                      id={`reminder-${days}`}
                      checked={preferences.reminderDays.includes(days)}
                      onCheckedChange={(checked) => 
                        updateReminderDays(days, checked as boolean)
                      }
                    />
                    <Label htmlFor={`reminder-${days}`} className="text-sm">
                      {days} {days === 1 ? 'day' : 'days'} before
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notification Channels */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <MessageCircle className="mr-2 h-4 w-4" />
                Notification Channels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications" className="text-sm font-medium flex items-center">
                    <Mail className="mr-1 h-3 w-3" />
                    Email Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receive reminders via email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, emailNotifications: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-notifications" className="text-sm font-medium flex items-center">
                    <MessageCircle className="mr-1 h-3 w-3" />
                    SMS Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receive reminders via text message
                  </p>
                </div>
                <Switch
                  id="sms-notifications"
                  checked={preferences.smsNotifications}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, smsNotifications: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};