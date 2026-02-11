import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';
import type { IntelligenceData } from '@/services/caseIntelligenceService';

interface Props {
  data: IntelligenceData;
}

const STAGE_ORDER = ['Assessment', 'Show Cause Notice', 'Reply', 'Personal Hearing', 'Order', 'Appeal', 'Tribunal', 'High Court', 'Supreme Court'];

export const LifecycleIntelligence: React.FC<Props> = ({ data }) => {
  const { stageInstances, stageTransitions, analytics } = data;
  const currentStage = data.case.currentStage;

  // Determine stage states
  const visitedStages = new Set(stageInstances.map(i => i.stageKey));
  const getStageStatus = (stage: string) => {
    if (stage === currentStage) return 'active';
    const instance = stageInstances.find(i => i.stageKey === stage && i.status === 'Completed');
    if (instance) return 'completed';
    if (visitedStages.has(stage)) return 'visited';
    return 'pending';
  };

  const statusColors: Record<string, string> = {
    active: 'bg-primary text-primary-foreground',
    completed: 'bg-emerald-500 text-white',
    visited: 'bg-amber-400 text-white',
    pending: 'bg-muted text-muted-foreground',
  };

  return (
    <section id="lifecycle">
      <h2 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">Lifecycle Intelligence</h2>

      {/* A. Stage Workflow Visual */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Stage Workflow</h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STAGE_ORDER.map((stage, idx) => {
            const status = getStageStatus(stage);
            const count = stageInstances.filter(i => i.stageKey === stage).length;
            return (
              <React.Fragment key={stage}>
                {idx > 0 && <div className="w-4 h-0.5 bg-border flex-shrink-0" />}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`px-3 py-1.5 rounded-md text-xs font-medium ${statusColors[status]}`}>
                    {stage}
                  </div>
                  {count > 0 && (
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {count} cycle{count > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* B. Stage Dashboard KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KPICard label="Total Notices" value={data.notices.length} />
        <KPICard label="Total Hearings" value={data.hearings.length} />
        <KPICard label="Pending Tasks" value={data.tasks.filter(t => t.status !== 'Completed').length} />
        <KPICard label="Documents" value={data.documents.length} />
        <KPICard label="Stage Transitions" value={analytics.totalStageTransitions} />
        <KPICard label="Avg Stage Duration" value={`${analytics.averageStageDuration}d`} />
        <KPICard label="Remand Cycles" value={analytics.remandCycleCount} />
        <KPICard label="Efficiency" value={`${analytics.stageEfficiency}%`} />
      </div>

      {/* C. Stage History & Cycles */}
      {stageInstances.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Stage History & Cycles</h3>
          <Accordion type="multiple" className="space-y-1">
            {stageInstances.map((instance) => (
              <AccordionItem key={instance.id} value={instance.id} className="border rounded-lg px-3">
                <AccordionTrigger className="text-sm py-2 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{instance.stageKey}</span>
                    <Badge variant="outline" className="text-[10px]">Cycle {instance.cycleNo}</Badge>
                    <Badge variant={instance.status === 'Active' ? 'default' : 'secondary'} className="text-[10px]">
                      {instance.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{instance.durationDays} days</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-xs space-y-1 pb-2">
                  <p>Started: {format(new Date(instance.startedAt), 'dd MMM yyyy')}</p>
                  {instance.endedAt && <p>Ended: {format(new Date(instance.endedAt), 'dd MMM yyyy')}</p>}
                  <p>Duration: {instance.durationDays} days</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {/* D. Stage Transition History */}
      {stageTransitions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Transition History</h3>
          <div className="space-y-2 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {stageTransitions.map((t) => (
              <div key={t.id} className="pl-8 relative">
                <div className="absolute left-1.5 top-2 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                <div className="bg-muted/50 rounded-lg p-3 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">
                      {t.fromStage || 'Initial'} → {t.toStage}
                    </span>
                    <span className="text-muted-foreground">
                      {format(new Date(t.createdAt), 'dd MMM yyyy')}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    By {t.actorName} {t.actorRole && `(${t.actorRole})`}
                    {t.durationInPreviousStage != null && ` • ${t.durationInPreviousStage}d in previous stage`}
                  </div>
                  {t.comments && <p className="mt-1 text-foreground/80">{t.comments}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

const KPICard = ({ label, value }: { label: string; value: string | number }) => (
  <div className="bg-muted/50 rounded-lg p-3 text-center">
    <p className="text-lg font-bold text-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
  </div>
);
