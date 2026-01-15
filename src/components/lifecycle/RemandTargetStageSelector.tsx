/**
 * Remand Target Stage Selector Component
 * Visual card-based stage selector with context for Remand/Reopen
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { StageHistoryContext, RemandType } from '@/types/remand';
import { normalizeStage } from '@/utils/stageUtils';
import { format } from 'date-fns';
import {
  RotateCcw,
  ArrowDownLeft,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Building2,
  History
} from 'lucide-react';

interface RemandTargetStageSelectorProps {
  availableStages: StageHistoryContext[];
  selectedStage: string;
  onSelect: (stage: string, remandType: RemandType) => void;
  currentStage: string;
  isLoading?: boolean;
}

export const RemandTargetStageSelector: React.FC<RemandTargetStageSelectorProps> = ({
  availableStages,
  selectedStage,
  onSelect,
  currentStage,
  isLoading = false
}) => {
  const canonicalCurrent = normalizeStage(currentStage);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Reverse to show current stage first, then previous stages
  const orderedStages = [...availableStages].reverse();

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {orderedStages.map((stage, index) => {
          const isCurrentStage = stage.stageKey === canonicalCurrent;
          const isSelected = stage.stageKey === selectedStage;
          const remandType: RemandType = isCurrentStage ? 'Reopen' : 'Remand';
          
          return (
            <motion.div
              key={stage.stageKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected 
                        ? 'ring-2 ring-primary border-primary bg-primary/5' 
                        : 'hover:border-primary/50'
                    } ${isCurrentStage ? 'border-info/50' : ''}`}
                    onClick={() => onSelect(stage.stageKey, remandType)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${
                          isCurrentStage 
                            ? 'bg-info/10 text-info' 
                            : 'bg-warning/10 text-warning'
                        }`}>
                          {isCurrentStage ? (
                            <RotateCcw className="h-5 w-5" />
                          ) : (
                            <ArrowDownLeft className="h-5 w-5" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{stage.stageName}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                isCurrentStage 
                                  ? 'bg-info/10 text-info border-info/30' 
                                  : 'bg-warning/10 text-warning border-warning/30'
                              }`}
                            >
                              {isCurrentStage ? 'Reopen' : 'Remand'}
                            </Badge>
                            {isSelected && (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Building2 className="h-3 w-3" />
                            <span>{stage.authority}</span>
                          </div>

                          {/* Stage History Info */}
                          <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
                            {stage.hasBeenVisited ? (
                              <>
                                {stage.lastActiveDate && (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    Last: {format(new Date(stage.lastActiveDate), 'dd MMM yyyy')}
                                  </span>
                                )}
                                {stage.cycleCount > 0 && (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <History className="h-3 w-3" />
                                    {stage.cycleCount} cycle{stage.cycleCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                                {stage.completedTasksCount > 0 && (
                                  <span className="flex items-center gap-1 text-success">
                                    <CheckCircle className="h-3 w-3" />
                                    {stage.completedTasksCount} done
                                  </span>
                                )}
                                {stage.pendingTasksCount > 0 && (
                                  <span className="flex items-center gap-1 text-warning">
                                    <Clock className="h-3 w-3" />
                                    {stage.pendingTasksCount} pending
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <AlertCircle className="h-3 w-3" />
                                Not yet visited
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[300px] p-3">
                  <div className="space-y-2">
                    <p className="font-medium">
                      {isCurrentStage ? 'Reopen at this level' : `Remand to ${stage.stageName}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isCurrentStage 
                        ? 'Case will be reopened for additional processing at the current authority level. A new cycle will begin with all previous work preserved.'
                        : `Case will be sent back to ${stage.authority} for re-examination. Work done at subsequent stages will be marked as superseded but preserved for audit.`
                      }
                    </p>
                    {!isCurrentStage && (
                      <p className="text-xs text-warning">
                        ⚠️ This will create a new cycle at {stage.stageName}
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          );
        })}
      </div>
    </TooltipProvider>
  );
};
