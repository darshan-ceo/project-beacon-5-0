import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, FileText } from 'lucide-react';
import { NoticeData, ReplyData } from '@/services/caseIntelligenceService';
import { format, parseISO, isValid } from 'date-fns';

interface NoticesRepliesSummaryProps {
  notices: NoticeData[];
  replies: ReplyData[];
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  try {
    const date = parseISO(d);
    return isValid(date) ? format(date, 'dd MMM yyyy') : d;
  } catch { return d; }
}

function formatCurrency(val: number | null): string {
  if (!val) return '—';
  return `₹${val.toLocaleString('en-IN')}`;
}

export const NoticesRepliesSummary: React.FC<NoticesRepliesSummaryProps> = ({ notices, replies }) => {
  // Group notices by stage
  const noticesByStage = useMemo(() => {
    const grouped = new Map<string, NoticeData[]>();
    notices.forEach(n => {
      const stage = n.stageKey || 'Unassigned';
      if (!grouped.has(stage)) grouped.set(stage, []);
      grouped.get(stage)!.push(n);
    });
    return grouped;
  }, [notices]);

  // Group replies by stage (via linked notice)
  const repliesByStage = useMemo(() => {
    const grouped = new Map<string, ReplyData[]>();
    replies.forEach(r => {
      const linkedNotice = notices.find(n => n.id === r.noticeId);
      const stage = linkedNotice?.stageKey || 'Unassigned';
      if (!grouped.has(stage)) grouped.set(stage, []);
      grouped.get(stage)!.push(r);
    });
    return grouped;
  }, [replies, notices]);

  const allStages = useMemo(() => {
    const stages = new Set<string>();
    noticesByStage.forEach((_, k) => stages.add(k));
    repliesByStage.forEach((_, k) => stages.add(k));
    return Array.from(stages);
  }, [noticesByStage, repliesByStage]);

  return (
    <section id="notices-replies" className="space-y-6 print:break-before-page">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Send className="h-5 w-5 text-primary" />
        Notices & Replies
      </h2>

      {allStages.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground text-center">No notices or replies recorded</p>
          </CardContent>
        </Card>
      ) : (
        allStages.map(stage => {
          const stageNotices = noticesByStage.get(stage) || [];
          const stageReplies = repliesByStage.get(stage) || [];
          return (
            <Card key={stage}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {stage}
                  <Badge variant="secondary" className="text-[10px]">
                    {stageNotices.length} notice{stageNotices.length !== 1 ? 's' : ''} · {stageReplies.length} repl{stageReplies.length !== 1 ? 'ies' : 'y'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Notices */}
                {stageNotices.length > 0 && (
                  <div className="overflow-x-auto">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Notices</p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground text-left">
                          <th className="pb-2 font-medium">Notice No.</th>
                          <th className="pb-2 font-medium">Date</th>
                          <th className="pb-2 font-medium">Status</th>
                          <th className="pb-2 font-medium text-right">Demand</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stageNotices.map(n => (
                          <tr key={n.id} className="border-b last:border-0">
                            <td className="py-2">{n.noticeNo || '—'}</td>
                            <td className="py-2">{formatDate(n.noticeDate)}</td>
                            <td className="py-2">
                              <Badge variant="outline" className="text-[10px]">{n.status}</Badge>
                            </td>
                            <td className="py-2 text-right">{formatCurrency(n.amountDemanded)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Replies */}
                {stageReplies.length > 0 && (
                  <div className="overflow-x-auto">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Replies</p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground text-left">
                          <th className="pb-2 font-medium">Notice Ref</th>
                          <th className="pb-2 font-medium">Filing Date</th>
                          <th className="pb-2 font-medium">Filing Mode</th>
                          <th className="pb-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stageReplies.map(r => {
                          const linkedNotice = notices.find(n => n.id === r.noticeId);
                          return (
                            <tr key={r.id} className="border-b last:border-0">
                              <td className="py-2">{linkedNotice?.noticeNo || r.noticeId.slice(0, 8)}</td>
                              <td className="py-2">{formatDate(r.filedDate)}</td>
                              <td className="py-2">{r.filingMode || '—'}</td>
                              <td className="py-2">
                                <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </section>
  );
};
