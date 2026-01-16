import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Tag,
  Clock,
  Zap,
  User,
  Calendar,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TaskContextData } from '@/types/taskContext';
import { cn } from '@/lib/utils';

interface TaskDetailsPanelProps {
  context: TaskContextData;
  defaultExpanded?: boolean;
  className?: string;
}

export const TaskDetailsPanel: React.FC<TaskDetailsPanelProps> = ({
  context,
  defaultExpanded = true,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { task } = context;

  const getCreationReasonLabel = (reason?: string) => {
    switch (reason) {
      case 'stage_transition':
        return 'Created when case moved to a new stage';
      case 'auto_bundle':
        return 'Auto-created from task bundle';
      case 'hearing_scheduled':
        return 'Created for scheduled hearing';
      case 'template':
        return 'Created from task template';
      case 'manual':
      default:
        return 'Manually created';
    }
  };

  const getCreationReasonIcon = (reason?: string) => {
    switch (reason) {
      case 'stage_transition':
        return <Zap className="h-4 w-4 text-amber-500" />;
      case 'auto_bundle':
        return <Target className="h-4 w-4 text-emerald-500" />;
      case 'hearing_scheduled':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'template':
        return <FileText className="h-4 w-4 text-purple-500" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className={cn('border-b', className)}>
      <Button
        variant="ghost"
        className="w-full justify-between px-4 py-3 h-auto hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span>Task Details</span>
          {!isExpanded && task.description && (
            <span className="text-muted-foreground font-normal truncate max-w-[200px]">
              — {task.description.replace(/<[^>]*>/g, '').slice(0, 50)}...
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 bg-muted/30">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Left Column - Description */}
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Description
                </h4>
                {task.description ? (
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: task.description }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">No description provided</p>
                )}
              </CardContent>
            </Card>

            {/* Right Column - Metadata */}
            <div className="space-y-3">
              {/* Creation Reason */}
              <Card className="bg-card/50">
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    {getCreationReasonIcon(task.creationReason)}
                    Creation Trigger
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {getCreationReasonLabel(task.creationReason)}
                  </p>
                  {task.creationStageCode && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      Stage: {task.creationStageCode}
                    </Badge>
                  )}
                </CardContent>
              </Card>

              {/* Category & Tags */}
              {(task.taskCategory || (task.tags && task.tags.length > 0)) && (
                <Card className="bg-card/50">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      Category & Tags
                    </h4>
                    {task.taskCategory && (
                      <Badge variant="secondary" className="mb-2">
                        {task.taskCategory}
                      </Badge>
                    )}
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {task.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* SLA & Time Estimates */}
              <Card className="bg-card/50">
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Time & SLA
                  </h4>
                  <div className="space-y-2 text-sm">
                    {task.estimatedHours && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estimated:</span>
                        <span>{task.estimatedHours}h</span>
                      </div>
                    )}
                    {task.actualHours && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Actual:</span>
                        <span>{task.actualHours}h</span>
                      </div>
                    )}
                    {task.slaHours && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SLA:</span>
                        <span>{task.slaHours}h deadline</span>
                      </div>
                    )}
                    {context.slaStatus && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SLA Status:</span>
                        <Badge 
                          variant="outline"
                          className={cn(
                            context.slaStatus === 'on_track' && 'bg-success/10 text-success',
                            context.slaStatus === 'at_risk' && 'bg-warning/10 text-warning',
                            context.slaStatus === 'breached' && 'bg-destructive/10 text-destructive'
                          )}
                        >
                          {context.slaStatus.replace('_', ' ')}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Created By */}
              {task.createdDate && (
                <Card className="bg-card/50">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Created
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span>{format(new Date(task.createdDate), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                      {task.assignedByName && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">By:</span>
                          <span>{task.assignedByName}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
