import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      .slice(0, 5);

    return tasksWithFollowups.map(task => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      status: task.status
    }));
  }, [state.tasks]);

  return (
    <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-violet-50 to-purple-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-violet-600" />
          Recent Follow-ups
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {recentFollowups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent follow-ups</p>
          ) : (
            recentFollowups.map(followup => (
              <div 
                key={followup.id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-violet-100 transition-colors cursor-pointer text-xs"
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
                <span className={`text-xs px-2 py-1 rounded ${
                  followup.status === 'Not Started' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {followup.status}
                </span>
              </div>
            ))
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-2 text-xs"
            onClick={() => navigate('/tasks')}
          >
            View All <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
