/**
 * Stage Replies Panel Component
 * Shows all replies for the current stage instance
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Send, FileText, User, Calendar, 
  Monitor, Mail, Package, ChevronRight 
} from 'lucide-react';
import { StageReply, StageNotice } from '@/types/stageWorkflow';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Edit, Eye } from 'lucide-react';

interface StageRepliesPanelProps {
  replies: StageReply[];
  notices: StageNotice[];
  stageInstanceId: string | null;
  caseId: string;
  onFileReply: (notice: StageNotice) => void;
  onEditReply?: (reply: StageReply) => void;
  onViewReply?: (reply: StageReply) => void;
  isReadOnly?: boolean;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'Filed':
      return 'bg-success/20 text-success';
    case 'Acknowledged':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'Draft':
      return 'bg-warning/20 text-warning-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getFilingModeIcon(mode: string | null) {
  switch (mode) {
    case 'Portal':
      return <Monitor className="h-3 w-3" />;
    case 'Email':
      return <Mail className="h-3 w-3" />;
    case 'Physical':
      return <Package className="h-3 w-3" />;
    default:
      return <FileText className="h-3 w-3" />;
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, 'dd MMM yyyy') : dateStr;
  } catch {
    return dateStr;
  }
}

export const StageRepliesPanel: React.FC<StageRepliesPanelProps> = ({
  replies,
  notices,
  stageInstanceId,
  caseId,
  onFileReply,
  onEditReply,
  onViewReply,
  isReadOnly = false
}) => {
  // Build notice lookup for reference display
  const noticeMap = new Map(notices.map(n => [n.id, n]));

  // Find first notice that can accept a new reply
  const pendingNotice = notices.find(n => n.status === 'Received' || n.status === 'Reply Pending');

  // Sort replies: most recent first
  const sortedReplies = [...replies].sort((a, b) => {
    const dateA = a.reply_date ? new Date(a.reply_date).getTime() : new Date(a.created_at).getTime();
    const dateB = b.reply_date ? new Date(b.reply_date).getTime() : new Date(b.created_at).getTime();
    return dateB - dateA;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Reply(s)
            {replies.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {replies.length}
              </Badge>
            )}
          </CardTitle>
          {!isReadOnly && pendingNotice && (
            <Button size="sm" onClick={() => onFileReply(pendingNotice)}>
              <Plus className="h-4 w-4 mr-1" />
              File Reply
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {sortedReplies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Send className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No replies filed yet</p>
            <p className="text-xs mt-1">File a reply against a notice to get started</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sortedReplies.map((reply, index) => {
              const linkedNotice = noticeMap.get(reply.notice_id);

              return (
                <motion.div
                  key={reply.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="border rounded-lg p-3 transition-all duration-200 hover:border-primary/50">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            {formatDate(reply.reply_date)}
                          </span>
                          <Badge className={cn("text-[10px]", getStatusColor(reply.filing_status))}>
                            {reply.filing_status}
                          </Badge>
                        </div>

                        {/* Details Row */}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          {reply.filing_mode && (
                            <span className="flex items-center gap-1">
                              {getFilingModeIcon(reply.filing_mode)}
                              {reply.filing_mode}
                            </span>
                          )}
                          {linkedNotice && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Notice: {linkedNotice.notice_number || 'N/A'}
                            </span>
                          )}
                          {reply.filed_by_name && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {reply.filed_by_name}
                            </span>
                          )}
                        </div>

                        {/* Reply Reference */}
                        {reply.reply_reference && (
                          <p className="text-xs text-muted-foreground mt-1.5">
                            Ref: {reply.reply_reference}
                          </p>
                        )}

                        {/* Documents indicator */}
                        {Array.isArray(reply.documents) && reply.documents.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            {reply.documents.length} document(s) attached
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!isReadOnly && onEditReply && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEditReply(reply)}
                            className="h-7 text-xs"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        )}
                        {onViewReply && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onViewReply(reply)}
                            className="h-7 w-7"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
};
