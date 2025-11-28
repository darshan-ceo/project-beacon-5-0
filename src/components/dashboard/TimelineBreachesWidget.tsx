import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/contexts/AppStateContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export const TimelineBreachesWidget: React.FC = () => {
  const { state } = useAppState();
  const navigate = useNavigate();
  
  const breachedCases = state.cases.filter(c => 
    c.status === 'Active' && c.timelineBreachStatus === 'Red'
  );
  
  return (
    <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-red-50 to-rose-50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          Timeline Breaches
        </CardTitle>
        {breachedCases.length > 0 && (
          <Badge variant="destructive">
            {breachedCases.length}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-2xl font-bold text-foreground">{breachedCases.length}</div>
          <p className="text-xs text-muted-foreground">
            Cases with timeline breaches (Red status)
          </p>
          {breachedCases.length > 0 && (
            <div className="space-y-2 mt-4">
              {breachedCases.slice(0, 3).map(c => (
                <div key={c.id} className="text-xs p-2 bg-red-100 rounded border border-red-200">
                  <span className="font-medium">{c.caseNumber}</span>
                  <span className="text-muted-foreground ml-2">{c.title}</span>
                </div>
              ))}
            </div>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-2 hover:bg-red-100"
            onClick={() => navigate('/cases?ragStatus=Red')}
          >
            View Breached Cases
            <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
