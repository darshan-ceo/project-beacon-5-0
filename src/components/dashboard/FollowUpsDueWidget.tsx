import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/contexts/AppStateContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, ArrowRight } from 'lucide-react';
import { isToday, isPast, parseISO } from 'date-fns';

export const FollowUpsDueWidget: React.FC = () => {
  const { state } = useAppState();
  const navigate = useNavigate();
  
  // Get unique task IDs that have follow-ups due today or overdue
  const tasksDueSet = new Set<string>();
  const overdueTasksSet = new Set<string>();
  
  (state.taskFollowUps || []).forEach(followUp => {
    const dateToCheck = followUp.nextFollowUpDate || followUp.workDate;
    if (!dateToCheck) return;
    
    try {
      const dueDate = parseISO(dateToCheck);
      if (isToday(dueDate)) {
        tasksDueSet.add(followUp.taskId);
      } else if (isPast(dueDate)) {
        tasksDueSet.add(followUp.taskId);
        overdueTasksSet.add(followUp.taskId);
      }
    } catch {
      // Invalid date, skip
    }
  });
  
  const tasksDueCount = tasksDueSet.size;
  const overdueCount = overdueTasksSet.size;

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
        {overdueCount > 0 && (
          <Badge variant="destructive" className="animate-pulse">
            {overdueCount} overdue
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 text-destructive p-2 bg-destructive/10 rounded">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-semibold">{overdueCount} overdue follow-up{overdueCount !== 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="text-2xl font-bold text-foreground">{tasksDueCount}</div>
          <p className="text-xs text-muted-foreground">
            Task{tasksDueCount !== 1 ? 's' : ''} requiring follow-up today
          </p>
          {tasksDueCount > 0 && (
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
