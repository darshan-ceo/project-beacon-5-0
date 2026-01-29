import React from 'react';
import { format } from 'date-fns';
import { 
  FileText, 
  User, 
  Calendar, 
  CalendarPlus,
  Link2,
  Building2,
  Briefcase,
  ChevronRight,
  Clock,
  Flag
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Task } from '@/contexts/AppStateContext';
import { TASK_STATUS_OPTIONS } from '@/types/taskMessages';
import { cn } from '@/lib/utils';

interface TaskViewContentProps {
  task: Task;
  clientName?: string;
  caseNumber?: string;
  onNavigateToClient?: () => void;
  onNavigateToCase?: () => void;
}

export const TaskViewContent: React.FC<TaskViewContentProps> = ({
  task,
  clientName,
  caseNumber,
  onNavigateToClient,
  onNavigateToCase,
}) => {
  const getPriorityConfig = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: '🔴' };
      case 'high':
        return { color: 'bg-warning/10 text-warning border-warning/20', icon: '🟠' };
      case 'medium':
        return { color: 'bg-primary/10 text-primary border-primary/20', icon: '🟡' };
      case 'low':
        return { color: 'bg-success/10 text-success border-success/20', icon: '🟢' };
      default:
        return { color: 'bg-muted text-muted-foreground', icon: '⚪' };
    }
  };

  const getStatusConfig = (status: string) => {
    const option = TASK_STATUS_OPTIONS.find(
      (opt) => opt.value.toLowerCase() === status?.toLowerCase()
    );
    return {
      color: option?.color || 'bg-muted text-muted-foreground',
      label: option?.label || status || 'Not Started'
    };
  };

  const getDueStatus = () => {
    if (!task.dueDate) return null;
    const due = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, urgent: true };
    if (diffDays === 0) return { text: 'Due today', urgent: true };
    if (diffDays === 1) return { text: 'Due tomorrow', urgent: false };
    return { text: `${diffDays}d left`, urgent: false };
  };

  const priorityConfig = getPriorityConfig(task.priority);
  const statusConfig = getStatusConfig(task.status || '');
  const dueStatus = getDueStatus();

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Card 1: Task Overview */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-3 md:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Task Overview</CardTitle>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className={cn('text-xs font-medium', statusConfig.color)}>
                {statusConfig.label}
              </Badge>
              {task.priority && (
                <Badge variant="outline" className={cn('text-xs font-medium', priorityConfig.color)}>
                  <Flag className="h-3 w-3 mr-1" />
                  {task.priority}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Left: Key metadata */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Assigned to:</span>
                <span className="font-medium truncate">{task.assignedToName || 'Unassigned'}</span>
              </div>
              
              {task.dueDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Due:</span>
                  <span className={cn('font-medium', dueStatus?.urgent && 'text-destructive')}>
                    {format(new Date(task.dueDate), 'MMM d, yyyy')}
                    {dueStatus && (
                      <span className={cn(
                        'ml-2 text-xs px-1.5 py-0.5 rounded-full',
                        dueStatus.urgent ? 'bg-destructive/10' : 'bg-muted'
                      )}>
                        {dueStatus.text}
                      </span>
                    )}
                  </span>
                </div>
              )}
              
              {task.createdDate && (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Created:</span>
                  <span>{format(new Date(task.createdDate), 'MMM d, yyyy')}</span>
                </div>
              )}
              
              {task.estimatedHours && task.estimatedHours > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Estimated:</span>
                  <span>{task.estimatedHours}h</span>
                </div>
              )}
            </div>
            
            {/* Right: Description */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Description</span>
              {task.description ? (
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none text-sm bg-muted/30 rounded-lg p-3"
                  dangerouslySetInnerHTML={{ __html: task.description }}
                />
              ) : (
                <p className="text-sm text-muted-foreground italic bg-muted/30 rounded-lg p-3">
                  No description provided
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Linked Context */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-3 md:pb-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Linked Context</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {/* Client link */}
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Client:</span>
              {clientName ? (
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-sm font-medium"
                  onClick={onNavigateToClient}
                >
                  {clientName}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              ) : (
                <span className="text-muted-foreground italic">Not linked</span>
              )}
            </div>
            
            {/* Case link */}
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Case:</span>
              {caseNumber ? (
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-sm font-medium"
                  onClick={onNavigateToCase}
                >
                  {caseNumber}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              ) : (
                <span className="text-muted-foreground italic">Not linked</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
