import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Bell, Mail, MessageSquare, Calendar, Loader2 } from 'lucide-react';

interface NotificationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationSettingsDialog: React.FC<NotificationSettingsDialogProps> = ({
  open,
  onOpenChange
}) => {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: true,
    hearingReminders: '1_day',
    caseUpdates: true,
    documentNotifications: true,
    paymentReminders: true
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate saving - in production this would save to the database
    await new Promise(resolve => setTimeout(resolve, 500));
    setSaving(false);
    toast.success('Notification preferences saved');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </DialogTitle>
          <DialogDescription>
            Customize how you receive notifications about your cases.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Notification Channels */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Notification Channels</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="email-notifications">Email Notifications</Label>
              </div>
              <Switch
                id="email-notifications"
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, emailNotifications: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="sms-notifications">SMS Notifications</Label>
              </div>
              <Switch
                id="sms-notifications"
                checked={settings.smsNotifications}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, smsNotifications: checked }))
                }
              />
            </div>
          </div>

          {/* Hearing Reminders */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Hearing Reminders</h4>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select
                value={settings.hearingReminders}
                onValueChange={(value) => 
                  setSettings(prev => ({ ...prev, hearingReminders: value }))
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select reminder timing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1_day">1 day before</SelectItem>
                  <SelectItem value="3_days">3 days before</SelectItem>
                  <SelectItem value="1_week">1 week before</SelectItem>
                  <SelectItem value="2_weeks">2 weeks before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notification Types */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Notification Types</h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="case-updates">Case Status Updates</Label>
              <Switch
                id="case-updates"
                checked={settings.caseUpdates}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, caseUpdates: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="document-notifications">Document Uploads</Label>
              <Switch
                id="document-notifications"
                checked={settings.documentNotifications}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, documentNotifications: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="payment-reminders">Payment Reminders</Label>
              <Switch
                id="payment-reminders"
                checked={settings.paymentReminders}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, paymentReminders: checked }))
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
