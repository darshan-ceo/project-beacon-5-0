import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/contexts/AppStateContext';
import { Card, CardContent } from '@/components/ui/card';
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
    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-orange-500 h-full flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-muted-foreground">Pending Tasks</p>
              {overdueTasks.length > 0 && (
                <Badge 
                  variant="destructive" 
                  className="text-xs animate-pulse cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/tasks?filter=overdue');
                  }}
                >
                  {overdueTasks.length} overdue
                </Badge>
              )}
            </div>
            <p className="text-3xl font-bold text-foreground">{pendingTasks.length}</p>
          </div>
          <div className="p-3 rounded-full bg-orange-100 flex-shrink-0">
            <CheckSquare className="h-6 w-6 text-orange-600" />
          </div>
        </div>
        
        {overdueTasks.length > 0 && (
          <div 
            className="flex items-center gap-2 text-destructive p-2 bg-destructive/10 rounded cursor-pointer hover:bg-destructive/20 transition-colors mb-3"
            onClick={() => navigate('/tasks?filter=overdue')}
          >
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-semibold">{overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''}</span>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground mb-3">
          Tasks awaiting completion
        </p>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-auto"
          onClick={() => navigate('/tasks?filter=pending')}
        >
          View All Tasks
          <ArrowRight className="ml-2 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
};
