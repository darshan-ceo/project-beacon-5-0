/**
 * Stage Workflow Timeline Component
 * Visual stepper showing the 4 workflow steps within a stage
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  FileText, 
  Send, 
  Calendar, 
  CheckCircle2, 
  ChevronDown,
  Circle,
  CheckCircle,
  SkipForward,
  Clock
} from 'lucide-react';
import { WorkflowTimelineStep, WorkflowStepKey, WorkflowStepStatus } from '@/types/stageWorkflow';
import { cn } from '@/lib/utils';

interface StageWorkflowTimelineProps {
  stageKey: string;
  steps: WorkflowTimelineStep[];
  currentStep: WorkflowStepKey;
  overallProgress: number;
  activeStep: WorkflowStepKey | null;
  onStepClick: (stepKey: WorkflowStepKey) => void;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

const STEP_ICONS: Record<WorkflowStepKey, React.ComponentType<{ className?: string }>> = {
  notices: FileText,
  reply: Send,
  hearings: Calendar,
  closure: CheckCircle2
};

function getStatusColor(status: WorkflowStepStatus): string {
  switch (status) {
    case 'Completed':
      return 'text-success border-success bg-success/10';
    case 'In Progress':
      return 'text-primary border-primary bg-primary/10';
    case 'Skipped':
      return 'text-muted-foreground border-muted bg-muted/50';
    case 'Pending':
    default:
      return 'text-muted-foreground border-border bg-background';
  }
}

function getStatusIcon(status: WorkflowStepStatus) {
  switch (status) {
    case 'Completed':
      return CheckCircle;
    case 'Skipped':
      return SkipForward;
    case 'In Progress':
      return Clock;
    case 'Pending':
    default:
      return Circle;
  }
}

export const StageWorkflowTimeline: React.FC<StageWorkflowTimelineProps> = ({
  stageKey,
  steps,
  currentStep,
  overallProgress,
  activeStep,
  onStepClick,
  isLoading = false,
  isReadOnly = false
}) => {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Stage Workflow: {stageKey}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {overallProgress === 100 
                  ? 'All steps completed' 
                  : `${Math.round(overallProgress)}% complete`}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {steps.filter(s => s.status === 'Completed').length} of {steps.length}
          </Badge>
        </div>
        <Progress value={overallProgress} className="h-1.5 mt-3" />
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Timeline Steps */}
        <div className="flex items-center justify-between relative">
          {/* Connector Line */}
          <div className="absolute top-5 left-8 right-8 h-0.5 bg-border z-0" />
          <div 
            className="absolute top-5 left-8 h-0.5 bg-primary z-0 transition-all duration-500"
            style={{ width: `${Math.max(0, (overallProgress / 100) * (100 - 16))}%` }}
          />
          
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[step.key];
            const StatusIcon = getStatusIcon(step.status);
            const isActive = activeStep === step.key;
            const isCurrent = currentStep === step.key;
            
            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative z-10 flex flex-col items-center"
              >
                <button
                  onClick={() => onStepClick(step.key)}
                  disabled={(!step.isClickable && !isReadOnly) || isLoading}
                  className={cn(
                    "relative w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                    getStatusColor(step.status),
                    step.isClickable && "hover:scale-110 cursor-pointer",
                    isActive && "ring-2 ring-primary ring-offset-2",
                    isCurrent && step.status !== 'Completed' && "animate-pulse"
                  )}
                >
                  {step.status === 'Completed' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : step.status === 'Skipped' ? (
                    <SkipForward className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  
                  {/* Count Badge */}
                  {step.count !== undefined && step.count > 0 && step.status !== 'Completed' && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-medium">
                      {step.count}
                    </span>
                  )}
                </button>
                
                <div className="mt-2 text-center">
                  <p className={cn(
                    "text-xs font-medium",
                    step.status === 'Completed' ? "text-success" :
                    step.status === 'In Progress' ? "text-primary" :
                    "text-muted-foreground"
                  )}>
                    {step.label}
                  </p>
                  {step.subtitle && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {step.subtitle}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
