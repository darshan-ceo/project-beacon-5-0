/**
 * Live Case Activity Widget
 * Real-time activity feed for case overview
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  Activity, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw,
  FileText,
  Calendar,
  CheckCircle,
  MessageSquare,
  Users,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { CaseActivityItem } from '@/types/stageAction';
import { useAppState } from '@/contexts/AppStateContext';

interface LiveCaseActivityWidgetProps {
  caseId: string;
  limit?: number;
  onViewFullTimeline?: () => void;
}

export const LiveCaseActivityWidget: React.FC<LiveCaseActivityWidgetProps> = ({
  caseId,
  limit = 5,
  onViewFullTimeline
}) => {
  const { state } = useAppState();
  const [activities, setActivities] = useState<CaseActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActivities();
    
    // Set up real-time subscription
    const channel = supabase
      .channel(`case-activity-${caseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stage_transitions',
          filter: `case_id=eq.${caseId}`
        },
        (payload) => {
          const newTransition = payload.new as any;
          const newActivity: CaseActivityItem = {
            id: newTransition.id,
            type: 'stage_transition',
            title: `Stage: ${newTransition.from_stage || 'Initial'} → ${newTransition.to_stage}`,
            description: newTransition.comments || 'Stage transition',
            timestamp: newTransition.created_at,
            metadata: {
              transitionType: newTransition.transition_type,
              fromStage: newTransition.from_stage,
              toStage: newTransition.to_stage
            }
          };
          setActivities(prev => [newActivity, ...prev.slice(0, limit - 1)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId, limit]);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      const allActivities: CaseActivityItem[] = [];

      // Fetch stage transitions
      const { data: transitions } = await supabase
        .from('stage_transitions')
        .select(`
          id,
          from_stage,
          to_stage,
          transition_type,
          comments,
          created_at,
          created_by,
          profiles:created_by (full_name)
        `)
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (transitions) {
        transitions.forEach((t: any) => {
          allActivities.push({
            id: t.id,
            type: 'stage_transition',
            title: `${t.transition_type}: ${t.from_stage || 'Initial'} → ${t.to_stage}`,
            description: t.comments || 'Stage transition',
            timestamp: t.created_at,
            actorName: t.profiles?.full_name,
            metadata: {
              transitionType: t.transition_type,
              fromStage: t.from_stage,
              toStage: t.to_stage
            }
          });
        });
      }

      // Get hearings from local state
      const caseHearings = state.hearings
        .filter(h => h.case_id === caseId)
        .sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime())
        .slice(0, limit);

      caseHearings.forEach(h => {
        allActivities.push({
          id: h.id,
          type: 'hearing',
          title: `Hearing: ${(h as any).hearing_type || 'Scheduled'}`,
          description: `${format(new Date(h.date), 'MMM dd, yyyy')} at ${h.start_time}`,
          timestamp: (h as any).created_at || h.date,
          metadata: {
            status: h.status,
            outcome: h.outcome
          }
        });
      });

      // Get tasks from local state
      const caseTasks = state.tasks
        .filter(t => t.caseId === caseId && t.status === 'Completed')
        .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
        .slice(0, limit);

      caseTasks.forEach(t => {
        allActivities.push({
          id: t.id,
          type: 'task',
          title: `Task Completed: ${t.title}`,
          description: t.description || 'Task completed',
          timestamp: t.createdDate,
          actorName: t.assignedToName
        });
      });

      // Get documents from local state
      const caseDocuments = state.documents
        .filter(d => d.caseId === caseId)
        .sort((a, b) => new Date(b.uploadedAt || b.createdAt).getTime() - new Date(a.uploadedAt || a.createdAt).getTime())
        .slice(0, limit);

      caseDocuments.forEach(d => {
        allActivities.push({
          id: d.id,
          type: 'document',
          title: `Document: ${d.name}`,
          description: d.category || 'Document uploaded',
          timestamp: d.uploadedAt || d.createdAt
        });
      });

      // Sort all activities by timestamp
      allActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(allActivities.slice(0, limit));
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type: string, metadata?: any) => {
    if (type === 'stage_transition') {
      switch (metadata?.transitionType) {
        case 'Forward':
          return <ArrowRight className="h-4 w-4 text-success" />;
        case 'Send Back':
          return <ArrowLeft className="h-4 w-4 text-warning" />;
        case 'Remand':
          return <RotateCcw className="h-4 w-4 text-info" />;
        default:
          return <ArrowRight className="h-4 w-4" />;
      }
    }
    switch (type) {
      case 'document':
        return <FileText className="h-4 w-4 text-info" />;
      case 'hearing':
        return <Calendar className="h-4 w-4 text-primary" />;
      case 'task':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'communication':
        return <MessageSquare className="h-4 w-4 text-secondary-foreground" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'stage_transition':
        return 'border-l-primary';
      case 'document':
        return 'border-l-info';
      case 'hearing':
        return 'border-l-warning';
      case 'task':
        return 'border-l-success';
      default:
        return 'border-l-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-destructive animate-pulse" />
            Live Case Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
            </span>
            Live Case Activity
          </CardTitle>
          {activities.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activities.length} recent
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {activities.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No recent activity</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="px-4 space-y-3 pb-4">
              {activities.map((activity, index) => (
                <div
                  key={activity.id}
                  className={`pl-3 py-2 border-l-2 ${getActivityColor(activity.type)} hover:bg-muted/30 rounded-r-md transition-colors`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      {getActivityIcon(activity.type, activity.metadata)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </span>
                        {activity.actorName && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {activity.actorName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < activities.length - 1 && (
                    <Separator className="mt-3" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {onViewFullTimeline && (
          <div className="px-4 pb-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-xs"
              onClick={onViewFullTimeline}
            >
              View Full Timeline
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
