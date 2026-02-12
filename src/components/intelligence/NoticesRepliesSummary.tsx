import React from 'react';
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
  return (
    <section id="notices-replies" className="space-y-6 print:break-before-page">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Send className="h-5 w-5 text-primary" />
        Notices & Replies
      </h2>

      {/* Notices Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Notices
            <Badge variant="secondary">{notices.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No notices recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 font-medium">Notice No.</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Stage</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Demand</th>
                  </tr>
                </thead>
                <tbody>
                  {notices.map(n => (
                    <tr key={n.id} className="border-b last:border-0">
                      <td className="py-2">{n.noticeNo || '—'}</td>
                      <td className="py-2">{formatDate(n.noticeDate)}</td>
                      <td className="py-2">{n.stageKey || '—'}</td>
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
        </CardContent>
      </Card>

      {/* Replies Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4" />
            Replies
            <Badge variant="secondary">{replies.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {replies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No replies filed</p>
          ) : (
            <div className="overflow-x-auto">
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
                  {replies.map(r => {
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
    </section>
  );
};
