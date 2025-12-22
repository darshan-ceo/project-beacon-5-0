import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/contexts/AppStateContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, ArrowRight } from 'lucide-react';
import { format, isToday, isPast, parseISO } from 'date-fns';

export const FollowUpsDueWidget: React.FC = () => {
  const { state } = useAppState();
  const navigate = useNavigate();
  
  const tasksDue = state.tasks.filter(task => {
    if (!task.followUpDate) return false;
    try {
      const dueDate = parseISO(task.followUpDate);
      return isToday(dueDate) || isPast(dueDate);
    } catch {
      return false;
    }
  });
  
  const overdue = tasksDue.filter(t => {
    try {
      return isPast(parseISO(t.followUpDate!)) && !isToday(parseISO(t.followUpDate!));
    } catch {
      return false;
    }
  });

  const handleViewTasks = () => {
    navigate('/tasks?filter=followups_due');
  };
  
  return (
    <Card className="hover:shadow-md transition-shadow bg-card border-l-4 border-l-rose-500">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Follow-Ups Due
        </CardTitle>
        {overdue.length > 0 && (
          <Badge variant="destructive" className="animate-pulse">
            {overdue.length} overdue
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {overdue.length > 0 && (
            <div className="flex items-center gap-2 text-destructive p-2 bg-destructive/10 rounded">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-semibold">{overdue.length} overdue follow-up{overdue.length !== 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="text-2xl font-bold text-foreground">{tasksDue.length}</div>
          <p className="text-xs text-muted-foreground">
            Task{tasksDue.length !== 1 ? 's' : ''} requiring follow-up today
          </p>
          {tasksDue.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2"
              onClick={handleViewTasks}
            >
              View Tasks
              <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
