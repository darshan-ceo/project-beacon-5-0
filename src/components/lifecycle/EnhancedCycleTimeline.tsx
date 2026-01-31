/**
 * Enhanced Cycle Timeline Component
 * Visual timeline cards showing stage history with duration, authority, and metrics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Clock, 
  User, 
  Building2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Gavel,
  RotateCcw,
  TrendingUp
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { stageInstanceService, StageInstanceWithDetails } from '@/services/stageInstanceService';

interface EnhancedCycleTimelineProps {
  caseId: string;
  currentStage?: string;
}

export const EnhancedCycleTimeline: React.FC<EnhancedCycleTimelineProps> = ({ 
  caseId, 
  currentStage 
}) => {
  const [instances, setInstances] = useState<StageInstanceWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStageInstances();
  }, [caseId]);

  const loadStageInstances = async () => {
    if (!caseId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await stageInstanceService.getStageInstances(caseId);
      setInstances(data);
    } catch (err: any) {
      console.error('Failed to load stage instances:', err);
      setError(err.message || 'Failed to load stage history');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Active':
        return {
          badge: 'bg-primary text-primary-foreground',
          border: 'border-l-primary',
          icon: <TrendingUp className="h-4 w-4 text-primary" />
        };
      case 'Completed':
        return {
          badge: 'bg-success text-success-foreground',
          border: 'border-l-success',
          icon: <CheckCircle2 className="h-4 w-4 text-success" />
        };
      case 'Remanded':
        return {
          badge: 'bg-warning text-warning-foreground',
          border: 'border-l-warning',
          icon: <RotateCcw className="h-4 w-4 text-warning" />
        };
      case 'Superseded':
        return {
          badge: 'bg-muted text-muted-foreground',
          border: 'border-l-muted-foreground',
          icon: <AlertCircle className="h-4 w-4 text-muted-foreground" />
        };
      default:
        return {
          badge: 'bg-muted text-muted-foreground',
          border: 'border-l-muted',
          icon: null
        };
    }
  };

  const formatDuration = (days: number): string => {
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    if (days < 365) {
      const months = Math.floor(days / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    }
    const years = Math.floor(days / 365);
    const remainingMonths = Math.floor((days % 365) / 30);
    if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`;
    return `${years}y ${remainingMonths}m`;
  };

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Stage History & Cycles
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Stage History & Cycles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (instances.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Stage History & Cycles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No stage history recorded yet. Stage instances will appear here as the case progresses.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Stage History & Cycles
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {instances.length} instance{instances.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        {/* Spacer to match filter row height in StageTransitionHistory */}
        <div className="h-9 mt-3" />
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden min-h-0">
        <ScrollArea className="h-full">
          <div className="space-y-3 pr-3">
            {instances.map((instance, index) => {
              const styles = getStatusStyles(instance.status);
              const isLatest = index === 0;
              
              return (
                <div
                  key={instance.id}
                  className={`
                    relative p-4 rounded-lg border border-l-4 
                    ${styles.border}
                    ${isLatest ? 'bg-accent/30' : 'bg-card'}
                    transition-all hover:shadow-md
                  `}
                >
                  {/* Header: Stage name + Cycle + Status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {styles.icon}
                      <div>
                        <h4 className="font-semibold text-sm">
                          {instance.stageKey}
                          {instance.cycleNo > 1 && (
                            <span className="ml-1 text-muted-foreground">
                              (Cycle {instance.cycleNo})
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {instance.authority}
                        </p>
                      </div>
                    </div>
                    <Badge className={`text-xs ${styles.badge}`}>
                      {instance.status}
                    </Badge>
                  </div>

                  {/* Duration and Timeline */}
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">
                        {formatDuration(instance.durationDays)}
                      </span>
                      <span className="text-muted-foreground">
                        {instance.status === 'Active' ? 'active' : 'duration'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(instance.startedAt), 'MMM d, yyyy')}
                      {instance.endedAt && (
                        <> → {format(new Date(instance.endedAt), 'MMM d, yyyy')}</>
                      )}
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="flex items-center gap-4 text-xs border-t pt-2">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                      <span>{instance.taskCount.completed}</span>
                      <span className="text-muted-foreground">done</span>
                    </div>
                    {instance.taskCount.pending > 0 && (
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-warning" />
                        <span>{instance.taskCount.pending}</span>
                        <span className="text-muted-foreground">pending</span>
                      </div>
                    )}
                    {instance.hearingCount > 0 && (
                      <div className="flex items-center gap-1">
                        <Gavel className="h-3 w-3 text-muted-foreground" />
                        <span>{instance.hearingCount}</span>
                        <span className="text-muted-foreground">hearings</span>
                      </div>
                    )}
                    {instance.documentCount > 0 && (
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        <span>{instance.documentCount}</span>
                        <span className="text-muted-foreground">docs</span>
                      </div>
                    )}
                  </div>

                  {/* Created By */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <User className="h-3 w-3" />
                    <span>Created by {instance.createdByName || 'System'}</span>
                    <span className="mx-1">•</span>
                    <span>{formatDistanceToNow(new Date(instance.startedAt), { addSuffix: true })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
