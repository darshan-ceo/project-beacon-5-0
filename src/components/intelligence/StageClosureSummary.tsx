import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { ClosureData } from '@/services/caseIntelligenceService';
import { format, parseISO, isValid } from 'date-fns';

interface StageClosureSummaryProps {
  closures: ClosureData[];
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  try {
    const date = parseISO(d);
    return isValid(date) ? format(date, 'dd MMM yyyy') : d;
  } catch { return d; }
}

function getOutcomeColor(outcome: string): string {
  switch (outcome) {
    case 'Order Passed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'Fully Dropped': return 'bg-success/20 text-success';
    case 'Remanded': return 'bg-warning/20 text-warning-foreground';
    case 'Withdrawn': case 'Settled': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
}

export const StageClosureSummary: React.FC<StageClosureSummaryProps> = ({ closures }) => {
  return (
    <section id="stage-closures" className="space-y-4 print:break-before-page">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-primary" />
        Stage Closures
      </h2>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Closure Outcomes
            <Badge variant="secondary">{closures.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {closures.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No stage closures recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 font-medium">Stage</th>
                    <th className="pb-2 font-medium">Outcome</th>
                    <th className="pb-2 font-medium">Order No.</th>
                    <th className="pb-2 font-medium">Order Date</th>
                    <th className="pb-2 font-medium text-right">Total Demand</th>
                  </tr>
                </thead>
                <tbody>
                  {closures.map((c, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-2">{c.stageKey}</td>
                      <td className="py-2">
                        <Badge className={getOutcomeColor(c.outcome)} variant="secondary">
                          {c.outcome}
                        </Badge>
                      </td>
                      <td className="py-2">{c.orderNumber || '—'}</td>
                      <td className="py-2">{formatDate(c.orderDate)}</td>
                      <td className="py-2 text-right">
                        {c.totalDemand != null ? `₹${c.totalDemand.toLocaleString('en-IN')}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
};
