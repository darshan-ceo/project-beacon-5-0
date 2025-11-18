import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/contexts/AppStateContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, ArrowRight } from 'lucide-react';

export const TeamPerformanceWidget: React.FC = () => {
  const { state } = useAppState();
  const navigate = useNavigate();
  
  // Calculate completion rate per employee
  const employeeStats = state.employees.map(emp => {
    const assignedTasks = state.tasks.filter(t => t.assignedToId === emp.id);
    const completedTasks = assignedTasks.filter(t => t.status === 'Completed');
    const completionRate = assignedTasks.length > 0 
      ? Math.round((completedTasks.length / assignedTasks.length) * 100)
      : 0;
    
    return {
      id: emp.id,
      name: emp.full_name,
      completionRate,
      totalTasks: assignedTasks.length
    };
  }).filter(s => s.totalTasks > 0)
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 5);
  
  return (
    <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-violet-50 h-full flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-[60px]">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Trophy className="h-4 w-4 text-purple-600" />
          Team Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="space-y-3 flex-1 overflow-auto">
          {employeeStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No task data available</p>
          ) : (
            <div className="space-y-2">
              {employeeStats.map((stat, idx) => (
                <div key={stat.id} className="flex items-center justify-between p-2 bg-purple-50 rounded border border-purple-100">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white">
                      #{idx + 1}
                    </Badge>
                    <span className="text-sm font-medium">{stat.name}</span>
                  </div>
                  <Badge 
                    variant={stat.completionRate >= 80 ? "default" : "secondary"}
                    className={stat.completionRate >= 80 ? "bg-green-600" : ""}
                  >
                    {stat.completionRate}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full mt-4 hover:bg-purple-100"
          onClick={() => navigate('/tasks')}
        >
          View All Tasks
          <ArrowRight className="ml-2 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
};
