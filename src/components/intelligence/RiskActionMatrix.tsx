import React from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { IntelligenceData, RiskFactor } from '@/services/caseIntelligenceService';

interface Props {
  data: IntelligenceData;
}

interface ActionItem {
  riskItem: string;
  severity: 'Low' | 'Medium' | 'High';
  impact: string;
  actionRequired: string;
  owner: string;
  dueDate: string | null;
}

export const RiskActionMatrix: React.FC<Props> = ({ data }) => {
  // Build action items dynamically
  const actions: ActionItem[] = [];

  // From risk factors
  data.risk.factors.forEach(f => {
    actions.push({
      riskItem: f.name,
      severity: f.severity,
      impact: f.impact,
      actionRequired: getActionForFactor(f),
      owner: '—',
      dueDate: null,
    });
  });

  // From overdue tasks
  data.tasks
    .filter(t => t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < new Date())
    .forEach(t => {
      actions.push({
        riskItem: `Overdue Task: ${t.title}`,
        severity: 'Medium',
        impact: 'Task past due date',
        actionRequired: 'Complete or reassign immediately',
        owner: t.assigneeName,
        dueDate: t.dueDate,
      });
    });

  const severityColors: Record<string, string> = {
    Low: 'bg-emerald-100 text-emerald-800',
    Medium: 'bg-amber-100 text-amber-800',
    High: 'bg-red-100 text-red-800',
  };

  return (
    <section id="risk-matrix">
      <h2 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">Risk & Action Matrix</h2>

      {actions.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No risk items identified. Case is on track.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Risk Item</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Severity</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Impact</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Action Required</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Owner</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((a, idx) => (
                <tr key={idx} className="border-b border-border/50">
                  <td className="py-2 px-2 text-xs font-medium max-w-[200px] truncate">{a.riskItem}</td>
                  <td className="py-2 px-2">
                    <Badge variant="outline" className={`text-[10px] ${severityColors[a.severity]}`}>
                      {a.severity}
                    </Badge>
                  </td>
                  <td className="py-2 px-2 text-xs max-w-[200px]">{a.impact}</td>
                  <td className="py-2 px-2 text-xs max-w-[200px]">{a.actionRequired}</td>
                  <td className="py-2 px-2 text-xs">{a.owner}</td>
                  <td className="py-2 px-2 text-xs">
                    {a.dueDate ? format(new Date(a.dueDate), 'dd MMM yyyy') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

function getActionForFactor(f: RiskFactor): string {
  switch (f.name) {
    case 'Stage Overdue': return 'Escalate and expedite stage closure';
    case 'High Financial Exposure': return 'Review demand and file contest';
    case 'Moderate Financial Exposure': return 'Assess demand validity';
    case 'Overdue Tasks': return 'Clear overdue tasks immediately';
    case 'Pending Replies': return 'File pending replies';
    case 'Remand Cycles': return 'Address remand root causes';
    default: return 'Review and take corrective action';
  }
}
