import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell, Mail, Clock, Save } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [settings, setSettings] = useState({
    emailEnabled: true,
    inAppEnabled: true,
    reminderDays: {
      day7: true,
      day3: true,
      day1: true,
      day0: true,
    },
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });

  const handleSave = () => {
    // In a real app, this would save to the backend
    toast.success('Notification settings saved', {
      description: 'Your preferences have been updated',
    });
    onOpenChange(false);
  };

  const toggleReminderDay = (day: keyof typeof settings.reminderDays) => {
    setSettings((prev) => ({
      ...prev,
      reminderDays: {
        ...prev.reminderDays,
        [day]: !prev.reminderDays[day],
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </DialogTitle>
          <DialogDescription>
            Configure how you receive deadline reminders
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Notification Channels */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Notification Channels</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="email">Email Notifications</Label>
              </div>
              <Switch
                id="email"
                checked={settings.emailEnabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, emailEnabled: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="inApp">In-App Notifications</Label>
              </div>
              <Switch
                id="inApp"
                checked={settings.inAppEnabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, inAppEnabled: checked }))
                }
              />
            </div>
          </div>

          {/* Reminder Timing */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Reminder Timing</h4>
            <p className="text-xs text-muted-foreground">
              Send reminders before deadlines
            </p>

            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'day7', label: '7 days before' },
                { key: 'day3', label: '3 days before' },
                { key: 'day1', label: '1 day before' },
                { key: 'day0', label: 'On due date' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={key}
                    checked={settings.reminderDays[key as keyof typeof settings.reminderDays]}
                    onCheckedChange={() =>
                      toggleReminderDay(key as keyof typeof settings.reminderDays)
                    }
                  />
                  <Label htmlFor={key} className="text-sm">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Quiet Hours
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Pause notifications during specific times
                </p>
              </div>
              <Switch
                checked={settings.quietHoursEnabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, quietHoursEnabled: checked }))
                }
              />
            </div>

            {settings.quietHoursEnabled && (
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="time"
                  value={settings.quietHoursStart}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      quietHoursStart: e.target.value,
                    }))
                  }
                  className="px-2 py-1 border rounded-md text-sm"
                />
                <span className="text-muted-foreground">to</span>
                <input
                  type="time"
                  value={settings.quietHoursEnd}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      quietHoursEnd: e.target.value,
                    }))
                  }
                  className="px-2 py-1 border rounded-md text-sm"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
