import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { DocumentData } from '@/services/caseIntelligenceService';

interface Props {
  documents: DocumentData[];
}

export const DocumentIndex: React.FC<Props> = ({ documents }) => {
  if (documents.length === 0) {
    return (
      <section id="documents">
        <h2 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">Document Index</h2>
        <p className="text-sm text-muted-foreground italic">No documents uploaded.</p>
      </section>
    );
  }

  // Group by category
  const grouped = documents.reduce<Record<string, DocumentData[]>>((acc, d) => {
    const cat = d.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(d);
    return acc;
  }, {});

  const filed = documents.filter(d => d.documentStatus === 'Filed' || d.documentStatus === 'Approved').length;
  const pending = documents.length - filed;

  return (
    <section id="documents">
      <h2 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">
        Document Index ({documents.length})
      </h2>

      <div className="flex gap-4 mb-4">
        <div className="bg-muted/50 rounded-lg px-4 py-2 text-center">
          <p className="text-lg font-bold text-foreground">{documents.length}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg px-4 py-2 text-center">
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{filed}</p>
          <p className="text-[10px] text-muted-foreground">Filed</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg px-4 py-2 text-center">
          <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{pending}</p>
          <p className="text-[10px] text-muted-foreground">Pending</p>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([category, docs]) => (
          <div key={category}>
            <h3 className="text-xs font-medium text-muted-foreground mb-1">{category} ({docs.length})</h3>
            <div className="space-y-1">
              {docs.map(d => (
                <div key={d.id} className="flex items-center justify-between py-1.5 px-2 bg-muted/30 rounded text-xs">
                  <span className="truncate max-w-[60%]">{d.fileName}</span>
                  {d.documentStatus && (
                    <Badge variant="outline" className="text-[10px]">{d.documentStatus}</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
