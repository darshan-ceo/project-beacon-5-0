/**
 * Stage Transition History Component
 * Displays timeline of all stage changes for a case
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  Clock, 
  User,
  MessageSquare,
  Info
} from 'lucide-react';

interface StageTransition {
  id: string;
  case_id: string;
  from_stage: string | null;
  to_stage: string;
  transition_type: 'Forward' | 'Send Back' | 'Remand';
  comments: string | null;
  created_by: string;
  created_at: string;
  user_name?: string;
}

interface StageTransitionHistoryProps {
  caseId: string;
}

export const StageTransitionHistory: React.FC<StageTransitionHistoryProps> = ({ caseId }) => {
  const [transitions, setTransitions] = useState<StageTransition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTransitions();
  }, [caseId]);

  const loadTransitions = async () => {
    if (!caseId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch transitions with user profile data
      const { data, error: fetchError } = await supabase
        .from('stage_transitions')
        .select(`
          *,
          profiles:created_by (full_name)
        `)
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Map user names
      const transitionsWithNames = (data || []).map((t: any) => ({
        ...t,
        user_name: t.profiles?.full_name || 'Unknown User'
      }));

      setTransitions(transitionsWithNames);
    } catch (err: any) {
      console.error('Failed to load stage transitions:', err);
      setError(err.message || 'Failed to load transition history');
    } finally {
      setIsLoading(false);
    }
  };

  const getTransitionIcon = (type: string) => {
    switch (type) {
      case 'Forward':
        return <ArrowRight className="h-4 w-4 text-green-600" />;
      case 'Send Back':
        return <ArrowLeft className="h-4 w-4 text-orange-600" />;
      case 'Remand':
        return <RotateCcw className="h-4 w-4 text-blue-600" />;
      default:
        return <ArrowRight className="h-4 w-4" />;
    }
  };

  const getTransitionColor = (type: string) => {
    switch (type) {
      case 'Forward':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Send Back':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Remand':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Stage Transition History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading history...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (transitions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Stage Transition History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No stage transitions recorded yet. This will show the complete history once stage changes are made.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Stage Transition History ({transitions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {transitions.map((transition, index) => (
              <div key={transition.id}>
                <div className="flex gap-3">
                  {/* Timeline dot and line */}
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background">
                      {getTransitionIcon(transition.transition_type)}
                    </div>
                    {index < transitions.length - 1 && (
                      <div className="w-0.5 flex-1 bg-border min-h-[40px]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getTransitionColor(transition.transition_type)}`}
                          >
                            {transition.transition_type}
                          </Badge>
                          {transition.from_stage && (
                            <span className="text-xs text-muted-foreground">
                              {transition.from_stage}
                            </span>
                          )}
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {transition.to_stage}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <User className="h-3 w-3" />
                      <span>{transition.user_name}</span>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(new Date(transition.created_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>

                    {transition.comments && (
                      <div className="flex gap-2 mt-2 p-2 bg-muted/50 rounded-md">
                        <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          {transition.comments}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
