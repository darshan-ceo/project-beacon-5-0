/**
 * Cycle Timeline Component
 * Displays stage instance history with cycles and transitions
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { lifecycleService } from '@/services/lifecycleService';
import { featureFlagService } from '@/services/featureFlagService';
import { StageInstance, StageTransition, LifecycleState } from '@/types/lifecycle';
import { 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  Calendar, 
  User, 
  FileText,
  Eye,
  Download
} from 'lucide-react';
import { format } from 'date-fns';

interface CycleTimelineProps {
  caseId: string;
  currentStage: string;
  caseData?: any;
}

export const CycleTimeline: React.FC<CycleTimelineProps> = ({ caseId, currentStage, caseData }) => {
  const [lifecycleState, setLifecycleState] = useState<LifecycleState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Feature flag check
  const lifecycleCyclesEnabled = featureFlagService.isEnabled('lifecycle_cycles_v1');

  useEffect(() => {
    if (lifecycleCyclesEnabled) {
      loadLifecycleData();
    }
  }, [caseId, lifecycleCyclesEnabled]);

  const loadLifecycleData = async () => {
    if (!caseId) return;
    
    setIsLoading(true);
    try {
      const data = await lifecycleService.getLifecycle(caseId);
      setLifecycleState(data);
    } catch (error) {
      console.error('Failed to load lifecycle timeline:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTransitionIcon = (type: string) => {
    switch (type) {
      case 'Forward': return ArrowRight;
      case 'Send Back': return ArrowLeft; 
      case 'Remand': return RotateCcw;
      default: return ArrowRight;
    }
  };

  const getTransitionColor = (type: string) => {
    switch (type) {
      case 'Forward': return 'bg-success text-success-foreground';
      case 'Send Back': return 'bg-warning text-warning-foreground';
      case 'Remand': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStageStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-primary text-primary-foreground';
      case 'Completed': return 'bg-success text-success-foreground';
      case 'Remanded': return 'bg-warning text-warning-foreground';
      case 'Superseded': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatCycleDisplay = (stageKey: string, cycleNo: number) => {
    return `${stageKey} (C${cycleNo})`;
  };

  const handleViewOrderDocument = (transition: StageTransition) => {
    if (transition.orderDocId) {
      // Open document in new window/modal
      window.open(`/api/documents/${transition.orderDocId}`, '_blank');
    }
  };

  if (!lifecycleCyclesEnabled) {
    return null; // Don't render if feature is disabled
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded"></div>
              <div className="h-3 bg-muted rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stage Instances Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Stage History & Cycles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lifecycleState?.stageInstances?.map((instance, index) => (
              <div key={instance.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Badge className={getStageStatusColor(instance.status)}>
                    {formatCycleDisplay(instance.stageKey, instance.cycleNo)}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(instance.startedAt), 'MMM d, yyyy HH:mm')}
                      {instance.endedAt && (
                        <span className="text-muted-foreground">
                          {' - ' + format(new Date(instance.endedAt), 'MMM d, yyyy HH:mm')}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created by {instance.createdBy}
                    </p>
                    {/* Show stage-specific metadata */}
                    {instance.stageKey === 'Scrutiny' && caseData?.matterType && (
                      <p className="text-xs text-primary mt-1">
                        Matter Type: {caseData.matterType}
                      </p>
                    )}
                    {instance.stageKey === 'Tribunal' && caseData?.tribunalBench && (
                      <p className="text-xs text-primary mt-1">
                        Bench: {caseData.tribunalBench}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant={instance.status === 'Active' ? 'default' : 'secondary'}>
                  {instance.status}
                </Badge>
              </div>
            )) || (
              <p className="text-sm text-muted-foreground">No stage history available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transition History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Transition History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lifecycleState?.transitions && lifecycleState.transitions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Transition</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Order Details</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lifecycleState.transitions.map((transition) => {
                  const TransitionIcon = getTransitionIcon(transition.type);
                  return (
                    <TableRow key={transition.id}>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(transition.createdAt), 'MMM d, yyyy')}
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(transition.createdAt), 'HH:mm')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TransitionIcon className="h-4 w-4" />
                          <span className="text-sm">Stage Transition</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTransitionColor(transition.type)} variant="secondary">
                          {transition.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {transition.reasonEnum && (
                            <div>{transition.reasonEnum}</div>
                          )}
                          {transition.reasonText && (
                            <div className="text-xs text-muted-foreground">
                              {transition.reasonText}
                            </div>
                          )}
                          {!transition.reasonEnum && !transition.reasonText && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {transition.orderNo ? (
                          <div className="text-sm">
                            <div className="font-medium">{transition.orderNo}</div>
                            {transition.orderDate && (
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(transition.orderDate), 'MMM d, yyyy')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span className="text-sm">{transition.createdBy}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {transition.comments && (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="View Comments"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          )}
                          {transition.orderDocId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewOrderDocument(transition)}
                              title="View Order Document"
                            >
                              <FileText className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No transitions recorded yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};