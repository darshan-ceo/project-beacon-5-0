import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/contexts/AppStateContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckSquare, AlertTriangle, ArrowRight } from 'lucide-react';
import { isPast, parseISO } from 'date-fns';

export const PendingTasksWidget: React.FC = () => {
  const { state } = useAppState();
  const navigate = useNavigate();
  
  const pendingTasks = state.tasks.filter(t => 
    t.status === 'Not Started' || t.status === 'In Progress'
  );
  
  const overdueTasks = pendingTasks.filter(t => {
    if (!t.dueDate) return false;
    try {
      return isPast(parseISO(t.dueDate));
    } catch {
      return false;
    }
  });
  
  return (
    <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-orange-50 to-yellow-50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          Pending Tasks
        </CardTitle>
        {overdueTasks.length > 0 && (
          <Badge 
            variant="destructive" 
            className="animate-pulse cursor-pointer hover:bg-destructive/90"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/tasks?filter=overdue');
            }}
          >
            {overdueTasks.length} overdue
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {overdueTasks.length > 0 && (
            <div 
              className="flex items-center gap-2 text-destructive p-2 bg-destructive/10 rounded cursor-pointer hover:bg-destructive/20 transition-colors"
              onClick={() => navigate('/tasks?filter=overdue')}
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-semibold">{overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="text-2xl font-bold text-foreground">{pendingTasks.length}</div>
          <p className="text-xs text-muted-foreground">
            Tasks awaiting completion
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-2"
            onClick={() => navigate('/tasks?filter=pending')}
          >
            View All Tasks
            <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
