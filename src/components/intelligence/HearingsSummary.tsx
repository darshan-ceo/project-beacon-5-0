import React from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { HearingData } from '@/services/caseIntelligenceService';

interface Props {
  hearings: HearingData[];
}

export const HearingsSummary: React.FC<Props> = ({ hearings }) => {
  const now = new Date();
  const upcoming = hearings.filter(h => new Date(h.hearingDate) >= now);
  const past = hearings.filter(h => new Date(h.hearingDate) < now);

  if (hearings.length === 0) {
    return (
      <section id="hearings">
        <h2 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">Hearings Summary</h2>
        <p className="text-sm text-muted-foreground italic">No hearings recorded.</p>
      </section>
    );
  }

  return (
    <section id="hearings">
      <h2 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">
        Hearings Summary ({hearings.length})
      </h2>

      {upcoming.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Upcoming ({upcoming.length})</h3>
          <HearingsTable hearings={upcoming} />
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Past ({past.length})</h3>
          <HearingsTable hearings={past} />
        </div>
      )}
    </section>
  );
};

const HearingsTable = ({ hearings }: { hearings: HearingData[] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b">
          <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Date</th>
          <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Type</th>
          <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Court</th>
          <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Status</th>
          <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Outcome</th>
        </tr>
      </thead>
      <tbody>
        {hearings.map(h => (
          <tr key={h.id} className="border-b border-border/50">
            <td className="py-2 px-2 text-xs">{format(new Date(h.hearingDate), 'dd MMM yyyy')}</td>
            <td className="py-2 px-2 text-xs">{h.hearingType || '—'}</td>
            <td className="py-2 px-2 text-xs">{h.courtName || '—'}</td>
            <td className="py-2 px-2">
              <Badge variant="outline" className="text-[10px]">{h.status}</Badge>
            </td>
            <td className="py-2 px-2 text-xs">{h.outcome || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
