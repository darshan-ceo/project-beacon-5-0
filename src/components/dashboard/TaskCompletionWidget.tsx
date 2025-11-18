import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/contexts/AppStateContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, ArrowRight } from 'lucide-react';

export const TaskCompletionWidget: React.FC = () => {
  const { state } = useAppState();
  const navigate = useNavigate();
  
  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter(t => t.status === 'Completed').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  return (
    <Card className="hover:shadow-lg transition-shadow h-full flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-[60px]">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Task Completion Rate
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="text-2xl font-bold text-foreground">{completionRate}%</div>
          <Progress value={completionRate} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {completedTasks} of {totalTasks} tasks completed
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-4"
          onClick={() => navigate('/tasks?filter=completed')}
        >
          View Completed Tasks
          <ArrowRight className="ml-2 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
};
