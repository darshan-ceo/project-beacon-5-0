import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Send, 
  FileDown, 
  Bell, 
  Plus, 
  Calendar,
  FileText,
  Settings
} from 'lucide-react';

interface ComplianceQuickActionsProps {
  onSendReminders: () => void;
  onExportReport: () => void;
  onOpenSettings: () => void;
  isSendingReminders?: boolean;
}

export const ComplianceQuickActions: React.FC<ComplianceQuickActionsProps> = ({
  onSendReminders,
  onExportReport,
  onOpenSettings,
  isSendingReminders = false,
}) => {
  const navigate = useNavigate();

  const actions = [
    {
      icon: Send,
      label: 'Send Reminders',
      description: 'Notify assignees',
      onClick: onSendReminders,
      loading: isSendingReminders,
      variant: 'default' as const,
    },
    {
      icon: FileDown,
      label: 'Export Report',
      description: 'Download PDF/Excel',
      onClick: onExportReport,
      variant: 'outline' as const,
    },
    {
      icon: Bell,
      label: 'Notification Settings',
      description: 'Configure alerts',
      onClick: onOpenSettings,
      variant: 'outline' as const,
    },
    {
      icon: Calendar,
      label: 'Full Calendar',
      description: 'View all deadlines',
      onClick: () => navigate('/hearings/calendar'),
      variant: 'outline' as const,
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={action.onClick}
            disabled={action.loading}
          >
            <action.icon className="h-4 w-4 shrink-0" />
            <div className="text-left">
              <div className="font-medium text-sm">{action.label}</div>
              <div className="text-xs text-muted-foreground">{action.description}</div>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};
