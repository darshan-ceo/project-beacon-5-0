import { Card, CardContent } from '@/components/ui/card';
import { useAppState } from '@/contexts/AppStateContext';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export const RecentFollowupsWidget = () => {
  const { state } = useAppState();
  const navigate = useNavigate();

  const recentFollowups = useMemo(() => {
    const tasksWithFollowups = state.tasks
      .filter(task => task.status === 'In Progress' || task.status === 'Not Started')
      .slice(0, 4);

    return tasksWithFollowups.map(task => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      status: task.status
    }));
  }, [state.tasks]);

  return (
    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500 h-full flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-4 w-4 text-blue-600" />
          <p className="text-sm font-medium text-muted-foreground">Recent Follow-ups</p>
        </div>
        
        <div className="space-y-2 flex-1">
          {recentFollowups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent follow-ups</p>
          ) : (
            recentFollowups.map(followup => (
              <div 
                key={followup.id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer text-xs"
                onClick={() => navigate(`/tasks?highlight=${followup.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{followup.title}</p>
                  {followup.dueDate && (
                    <p className="text-muted-foreground text-xs">
                      Due: {format(new Date(followup.dueDate), 'MMM dd')}
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  followup.status === 'Not Started' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {followup.status}
                </span>
              </div>
            ))
          )}
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full mt-auto text-xs"
          onClick={() => navigate('/tasks')}
        >
          View All <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
};
