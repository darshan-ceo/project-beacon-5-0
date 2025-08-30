import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Upload, 
  Calendar, 
  FileText, 
  Users,
  Scale,
  MessageCircle,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  variant?: 'default' | 'outline' | 'secondary';
}

export const QuickActionsPanel: React.FC = () => {
  const navigate = useNavigate();

  const quickActions: QuickAction[] = [
    {
      id: 'add-client',
      title: 'Add New Client',
      description: 'Create a new client profile',
      icon: <Users className="h-5 w-5" />,
      action: () => {
        navigate('/clients');
        // TODO: Open client modal after navigation
        toast({
          title: "Add New Client",
          description: "Navigate to clients page to add new client",
        });
      }
    },
    {
      id: 'upload-document',
      title: 'Upload Document',
      description: 'Upload case documents',
      icon: <Upload className="h-5 w-5" />,
      action: () => {
        navigate('/documents');
        // TODO: Open document upload modal after navigation
        toast({
          title: "Upload Document",
          description: "Navigate to documents page to upload files",
        });
      }
    },
    {
      id: 'create-case',
      title: 'Create New Case',
      description: 'Start a new legal case',
      icon: <Scale className="h-5 w-5" />,
      action: () => {
        navigate('/cases');
        // TODO: Open case modal after navigation
        toast({
          title: "Create New Case",
          description: "Navigate to cases page to create new case",
        });
      }
    },
    {
      id: 'schedule-hearing',
      title: 'Schedule Hearing',
      description: 'Schedule a court hearing',
      icon: <Calendar className="h-5 w-5" />,
      action: () => {
        navigate('/cases');
        // TODO: Open hearing scheduler after navigation
        toast({
          title: "Schedule Hearing",
          description: "Navigate to cases page to schedule hearing",
        });
      }
    },
    {
      id: 'create-task',
      title: 'Create Task',
      description: 'Add a new task or reminder',
      icon: <Plus className="h-5 w-5" />,
      action: () => {
        navigate('/tasks');
        // TODO: Open task modal after navigation
        toast({
          title: "Create Task",
          description: "Navigate to tasks page to create new task",
        });
      }
    },
    {
      id: 'generate-report',
      title: 'Generate Report',
      description: 'Create case or performance reports',
      icon: <FileText className="h-5 w-5" />,
      variant: 'outline' as const,
      action: () => {
        // TODO: Open report generator modal
        toast({
          title: "Generate Report",
          description: "Report generator coming soon",
        });
      }
    },
    {
      id: 'send-communication',
      title: 'Send Communication',
      description: 'Send email, SMS, or WhatsApp',
      icon: <MessageCircle className="h-5 w-5" />,
      variant: 'outline' as const,
      action: () => {
        navigate('/cases');
        // TODO: Open communication hub after navigation
        toast({
          title: "Send Communication",
          description: "Navigate to cases page and open communication hub",
        });
      }
    },
    {
      id: 'system-settings',
      title: 'System Settings',
      description: 'Configure application settings',
      icon: <Settings className="h-5 w-5" />,
      variant: 'secondary' as const,
      action: () => {
        // TODO: Open settings modal
        toast({
          title: "System Settings",
          description: "Settings panel coming soon",
        });
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-2xl font-bold text-foreground">Quick Actions</h2>
        <p className="text-muted-foreground mt-2">
          Frequently used actions for faster workflow
        </p>
      </motion.div>

      {/* Quick Actions Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {quickActions.map((action, index) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ y: -2 }}
          >
            <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={action.action}>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {action.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm mb-1">{action.title}</h3>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Usage Summary</CardTitle>
            <CardDescription>Today's activity overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">12</p>
                <p className="text-xs text-muted-foreground">Actions Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">3</p>
                <p className="text-xs text-muted-foreground">Cases Updated</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">8</p>
                <p className="text-xs text-muted-foreground">Documents Uploaded</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">5</p>
                <p className="text-xs text-muted-foreground">Tasks Created</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};