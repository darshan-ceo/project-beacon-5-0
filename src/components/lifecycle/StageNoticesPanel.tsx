/**
 * Stage Notices Panel Component
 * Displays and manages notices for a stage instance with inline replies display
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  FileText, 
  Calendar, 
  IndianRupee, 
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Send,
  Eye,
  Pencil,
  Trash2,
  ExternalLink,
  MessageSquare,
  Paperclip,
  XCircle,
  CalendarCheck
} from 'lucide-react';
import { StageNotice, NoticeStatus, StageReply, NoticeWorkflowStep } from '@/types/stageWorkflow';
import { stageNoticesService } from '@/services/stageNoticesService';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

interface StageNoticesPanelProps {
  notices: StageNotice[];
  stageInstanceId: string | null;
  caseId: string;
  onAddNotice: () => void;
  onEditNotice: (notice: StageNotice) => void;
  onDeleteNotice: (noticeId: string) => void;
  onViewNotice: (notice: StageNotice) => void;
  onFileReply: (notice: StageNotice) => void;
  onCloseNotice?: (notice: StageNotice) => void;
  onScheduleHearing?: (notice: StageNotice) => void;
  isLoading?: boolean;
  isReadOnly?: boolean;
  // Replies support
  noticeReplies?: Map<string, StageReply[]>;
  onLoadReplies?: (noticeId: string) => void;
}

function getStatusColor(status: NoticeStatus): string {
  switch (status) {
    case 'Received':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'Reply Pending':
      return 'bg-warning/20 text-warning-foreground';
    case 'Replied':
      return 'bg-success/20 text-success';
    case 'Closed':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, 'dd MMM yyyy') : dateStr;
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function getFilingStatusBadge(status: string) {
  switch (status) {
    case 'Draft':
      return 'bg-muted text-muted-foreground';
    case 'Filed':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'Acknowledged':
      return 'bg-success/20 text-success';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

// Mini workflow step indicator
function NoticeWorkflowStepper({ step }: { step: NoticeWorkflowStep }) {
  const steps: { key: NoticeWorkflowStep; label: string }[] = [
    { key: 'notice', label: 'Notice' },
    { key: 'reply', label: 'Reply' },
    { key: 'hearing', label: 'Hearing' },
    { key: 'closed', label: 'Closed' }
  ];

  const currentIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="flex items-center gap-1 text-[10px]">
      {steps.map((s, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isPending = idx > currentIndex;
        
        return (
          <React.Fragment key={s.key}>
            <span className={cn(
              "px-1.5 py-0.5 rounded",
              isCompleted && "bg-success/20 text-success",
              isCurrent && "bg-primary/20 text-primary font-medium",
              isPending && "text-muted-foreground"
            )}>
              {s.label}
            </span>
            {idx < steps.length - 1 && (
              <span className={cn(
                "text-muted-foreground/50",
                isCompleted && "text-success"
              )}>→</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export const StageNoticesPanel: React.FC<StageNoticesPanelProps> = ({
  notices,
  stageInstanceId,
  caseId,
  onAddNotice,
  onEditNotice,
  onDeleteNotice,
  onViewNotice,
  onFileReply,
  onCloseNotice,
  onScheduleHearing,
  isLoading = false,
  isReadOnly = false,
  noticeReplies,
  onLoadReplies
}) => {
  const [expandedNoticeId, setExpandedNoticeId] = useState<string | null>(null);

  // Load replies when notice is expanded
  useEffect(() => {
    if (expandedNoticeId && onLoadReplies) {
      onLoadReplies(expandedNoticeId);
    }
  }, [expandedNoticeId, onLoadReplies]);

  const getRepliesForNotice = (noticeId: string): StageReply[] => {
    return noticeReplies?.get(noticeId) || [];
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Notice(s)
            {notices.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {notices.length}
              </Badge>
            )}
          </CardTitle>
          {!isReadOnly && (
            <Button size="sm" onClick={onAddNotice} disabled={isLoading}>
              <Plus className="h-4 w-4 mr-1" />
              Add Notice
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {notices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No notices recorded for this stage</p>
            <p className="text-xs mt-1">Click "Add Notice" to record the first notice</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {notices.map((notice, index) => {
              const dueDateStatus = stageNoticesService.getDueDateStatus(notice.due_date);
              const isExpanded = expandedNoticeId === notice.id;
              const replies = getRepliesForNotice(notice.id);
              
              return (
                <motion.div
                  key={notice.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div 
                    className={cn(
                      "border rounded-lg p-3 transition-all duration-200 hover:border-primary/50",
                      isExpanded && "ring-1 ring-primary/20",
                      notice.is_original && "bg-muted/30"
                    )}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">
                            {notice.notice_type || 'Notice'}
                            {notice.notice_number && ` / ${notice.notice_number}`}
                          </span>
                          <Badge className={cn("text-[10px]", getStatusColor(notice.status))}>
                            {notice.status}
                          </Badge>
                          {notice.is_original && (
                            <Badge variant="outline" className="text-[10px]">
                              Original
                            </Badge>
                          )}
                        </div>
                        
                        {/* Mini Workflow Stepper */}
                        <div className="mt-2">
                          <NoticeWorkflowStepper step={notice.workflow_step || 'notice'} />
                        </div>
                        
                        {/* Key Info Row */}
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          {notice.notice_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(notice.notice_date)}
                            </span>
                          )}
                          {notice.due_date && (
                            <span className={cn(
                              "flex items-center gap-1",
                              dueDateStatus.isOverdue && "text-destructive font-medium"
                            )}>
                              <Clock className="h-3 w-3" />
                              {dueDateStatus.label}
                            </span>
                          )}
                          {notice.amount_demanded && (
                            <span className="flex items-center gap-1">
                              <IndianRupee className="h-3 w-3" />
                              {formatCurrency(notice.amount_demanded)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        {!isReadOnly && notice.status !== 'Replied' && notice.status !== 'Closed' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => onFileReply(notice)}
                            className="h-7 text-xs"
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Reply
                          </Button>
                        )}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => setExpandedNoticeId(isExpanded ? null : notice.id)}
                          className="h-7 w-7"
                        >
                          <ChevronRight className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-90"
                          )} />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Separator className="my-3" />
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {notice.section_invoked && (
                              <div>
                                <p className="text-xs text-muted-foreground">Section Invoked</p>
                                <p className="font-medium">{notice.section_invoked}</p>
                              </div>
                            )}
                            {notice.amount_demanded && (
                              <div>
                                <p className="text-xs text-muted-foreground">Demand Amount</p>
                                <p className="font-medium">{formatCurrency(notice.amount_demanded)}</p>
                              </div>
                            )}
                            {notice.documents && notice.documents.length > 0 && (
                              <div className="col-span-2">
                                <p className="text-xs text-muted-foreground mb-1">Attached Documents</p>
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-xs">{notice.documents.length} document(s)</span>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Filed Replies Section */}
                          {replies.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                <p className="text-xs font-medium text-muted-foreground">
                                  Filed Replies ({replies.length})
                                </p>
                              </div>
                              <div className="space-y-1.5">
                                {replies.map(reply => (
                                  <div 
                                    key={reply.id} 
                                    className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <Send className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                      <div className="min-w-0">
                                        <span className="text-xs font-medium truncate block">
                                          {reply.reply_reference || 'Reply'}
                                        </span>
                                        {reply.reply_date && (
                                          <span className="text-[10px] text-muted-foreground">
                                            {formatDate(reply.reply_date)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      <Badge className={cn("text-[10px]", getFilingStatusBadge(reply.filing_status))}>
                                        {reply.filing_status}
                                      </Badge>
                                      {reply.documents && reply.documents.length > 0 && (
                                        <Badge variant="secondary" className="text-[10px]">
                                          <Paperclip className="h-2.5 w-2.5 mr-0.5" />
                                          {reply.documents.length}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Action Bar */}
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t flex-wrap">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => onViewNotice(notice)}
                              className="h-7 text-xs"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            {!isReadOnly && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => onEditNotice(notice)}
                                  className="h-7 text-xs"
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                {notice.status !== 'Closed' && (
                                  <>
                                    {onScheduleHearing && (
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => onScheduleHearing(notice)}
                                        className="h-7 text-xs"
                                      >
                                        <CalendarCheck className="h-3 w-3 mr-1" />
                                        Hearing
                                      </Button>
                                    )}
                                    {onCloseNotice && (
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => onCloseNotice(notice)}
                                        className="h-7 text-xs"
                                      >
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Close
                                      </Button>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                            {!isReadOnly && !notice.is_original && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => onDeleteNotice(notice.id)}
                                className="h-7 text-xs text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
