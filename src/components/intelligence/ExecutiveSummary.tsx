import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { IntelligenceData } from '@/services/caseIntelligenceService';

interface Props {
  data: IntelligenceData;
}

export const ExecutiveSummary: React.FC<Props> = ({ data }) => {
  const { analytics, risk, financial, case: c } = data;

  const formatCurrency = (n: number) =>
    n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` :
    n >= 100000 ? `₹${(n / 100000).toFixed(2)} Lakh` :
    `₹${n.toLocaleString('en-IN')}`;

  const pendingTasks = data.tasks.filter(t => t.status !== 'Completed').length;
  const upcomingHearings = data.hearings.filter(h => new Date(h.hearingDate) >= new Date()).length;

  return (
    <section id="executive-summary">
      <h2 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">Executive Summary</h2>

      {analytics.escalationFlag && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{analytics.escalationReason}</AlertDescription>
        </Alert>
      )}

      <div className="bg-muted/30 rounded-lg p-4 space-y-3 text-sm leading-relaxed">
        <p>
          Case <strong>{c.caseNumber}</strong> ({c.title}) is currently in the{' '}
          <strong>{c.currentStage}</strong> stage for <strong>{analytics.daysInCurrentStage} days</strong>.
          {analytics.totalLifecycleDuration > 0 && (
            <> Total lifecycle duration is <strong>{analytics.totalLifecycleDuration} days</strong>.</>
          )}
        </p>

        <p>
          {data.notices.length > 0 && (
            <>{data.notices.length} notice(s) received. </>
          )}
          {pendingTasks > 0 ? (
            <><strong>{pendingTasks}</strong> task(s) pending action. </>
          ) : (
            <>All tasks completed. </>
          )}
          {upcomingHearings > 0 && (
            <><strong>{upcomingHearings}</strong> upcoming hearing(s). </>
          )}
        </p>

        {financial.totalDemand > 0 && (
          <p>
            Financial exposure: <strong>{formatCurrency(financial.totalDemand)}</strong>.
          </p>
        )}

        <p>
          Risk Level: <strong className={
            risk.level === 'High' ? 'text-destructive' :
            risk.level === 'Medium' ? 'text-amber-600' : 'text-emerald-600'
          }>{risk.level}</strong> (Score: {risk.score}/100).
          {risk.factors.length > 0 && (
            <> Key factors: {risk.factors.map(f => f.name).join(', ')}.</>
          )}
        </p>

        {analytics.remandCycleCount > 0 && (
          <p>
            ⚠ Case has been remanded <strong>{analytics.remandCycleCount}</strong> time(s), 
            indicating litigation complexity (score: {analytics.litigationComplexityScore}/100).
          </p>
        )}
      </div>
    </section>
  );
};
