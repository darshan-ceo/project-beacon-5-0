import React, { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { useAppState } from '@/contexts/AppStateContext';
import { useRBAC } from '@/hooks/useRBAC';
import { ProtectedComponent } from '@/hooks/useRBAC';
import { HearingCalendar } from '@/components/cases/HearingCalendar';
import { DemoDataControls } from '@/components/admin/DemoDataControls';
import { 
  Users, 
  FileText, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Scale
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface StatCard {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  trend?: {
    value: string;
    positive: boolean;
  };
  color: 'primary' | 'secondary' | 'warning' | 'success';
}

const stats: StatCard[] = [
  {
    title: 'Active Clients',
    value: 847,
    description: 'Total registered clients',
    icon: Users,
    trend: { value: '+12%', positive: true },
    color: 'primary'
  },
  {
    title: 'Open Cases',
    value: 156,
    description: 'Cases in progress',
    icon: Scale,
    trend: { value: '+8%', positive: true },
    color: 'secondary'
  },
  {
    title: 'Pending Documents',
    value: 23,
    description: 'Awaiting review',
    icon: FileText,
    trend: { value: '-15%', positive: true },
    color: 'warning'
  },
  {
    title: 'Completed Tasks',
    value: 342,
    description: 'This month',
    icon: CheckCircle,
    trend: { value: '+25%', positive: true },
    color: 'success'
  }
];

const recentActivity = [
  {
    id: 1,
    type: 'case_update',
    title: 'Case #2024-001 - Status Updated',
    description: 'Supreme Court hearing scheduled for next week',
    time: '2 hours ago',
    urgent: true
  },
  {
    id: 2,
    type: 'document_upload',
    title: 'New Document Upload',
    description: 'Client agreement signed by Acme Corp',
    time: '4 hours ago',
    urgent: false
  },
  {
    id: 3,
    type: 'client_added',
    title: 'New Client Registration',
    description: 'Global Tech Solutions Ltd registered',
    time: '6 hours ago',
    urgent: false
  }
];

export const DashboardOverview: React.FC = () => {
  const { state } = useAppState();
  const { currentUser } = useRBAC();
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Calculate real stats from state
  const realStats = [
    {
      title: 'Active Clients',
      value: state.clients.filter(c => c.status === 'Active').length,
      description: 'Total registered clients',
      icon: Users,
      trend: { value: '+12%', positive: true },
      color: 'primary' as const
    },
    {
      title: 'Open Cases',
      value: state.cases.length,
      description: 'Cases in progress',
      icon: Scale,
      trend: { value: '+8%', positive: true },
      color: 'secondary' as const
    },
    {
      title: 'Pending Documents',
      value: state.documents.length,
      description: 'Awaiting review',
      icon: FileText,
      trend: { value: '-15%', positive: true },
      color: 'warning' as const
    },
    {
      title: 'Completed Tasks',
      value: state.tasks.filter(t => t.status === 'Completed').length,
      description: 'This month',
      icon: CheckCircle,
      trend: { value: '+25%', positive: true },
      color: 'success' as const
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Legal Practice Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {currentUser.name}! Here's your practice overview for today.
          </p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary-hover"
          onClick={() => setCalendarOpen(true)}
        >
          <Calendar className="mr-2 h-4 w-4" />
          Schedule Hearing
        </Button>
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {realStats.map((stat, index) => (
          <motion.div key={index} variants={itemVariants}>
            <Card className="hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${
                  stat.color === 'primary' ? 'text-primary' :
                  stat.color === 'secondary' ? 'text-secondary' :
                  stat.color === 'warning' ? 'text-warning' :
                  'text-success'
                }`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                  {stat.trend && (
                    <Badge variant={stat.trend.positive ? "default" : "destructive"} className="text-xs">
                      <TrendingUp className="mr-1 h-3 w-3" />
                      {stat.trend.value}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest updates from your practice
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.map((activity) => (
                <div 
                  key={activity.id}
                  className="flex items-start space-x-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.urgent ? 'bg-destructive' : 'bg-primary'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate">
                        {activity.title}
                      </p>
                      {activity.urgent && (
                        <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 ml-2" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ProtectedComponent module="clients" action="write">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    toast({
                      title: "Add New Client",
                      description: "Opening client registration form",
                    });
                  }}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Add New Client
                </Button>
              </ProtectedComponent>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  toast({
                    title: "Upload Document",
                    description: "Opening document upload interface",
                  });
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  toast({
                    title: "Create New Case",
                    description: "Opening case creation form",
                  });
                }}
              >
                <Scale className="mr-2 h-4 w-4" />
                Create New Case
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  toast({
                    title: "Schedule Meeting",
                    description: "Opening meeting scheduler",
                  });
                }}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Meeting
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Demo Data Controls Section */}
      <ProtectedComponent module="admin" action="admin">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Demo Data Management
              </CardTitle>
              <CardDescription>
                Manage demo data for testing workflows and features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DemoDataControls />
            </CardContent>
          </Card>
        </motion.div>
      </ProtectedComponent>

      {/* Hearing Calendar Modal */}
      <HearingCalendar 
        isOpen={calendarOpen} 
        onClose={() => setCalendarOpen(false)} 
      />
    </div>
  );
};