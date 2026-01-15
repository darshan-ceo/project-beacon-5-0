/**
 * Stage Action Card Component
 * Expandable card showing complete stage transition details
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  ChevronDown,
  ChevronUp,
  User,
  Clock,
  MessageSquare,
  FileText,
  CheckCircle,
  AlertTriangle,
  Shield,
  Paperclip,
  ExternalLink,
  Info,
  Calendar,
  BookOpen
} from 'lucide-react';
import { EnhancedStageTransition, StageTransitionApproval } from '@/types/stageAction';
import { supabase } from '@/integrations/supabase/client';

interface StageActionCardProps {
  transition: EnhancedStageTransition;
  isLatest?: boolean;
}

export const StageActionCard: React.FC<StageActionCardProps> = ({ 
  transition, 
  isLatest = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const getTransitionIcon = (type: string) => {
    switch (type) {
      case 'Forward':
        return <ArrowRight className="h-4 w-4 text-success" />;
      case 'Send Back':
        return <ArrowLeft className="h-4 w-4 text-warning" />;
      case 'Remand':
        return <RotateCcw className="h-4 w-4 text-info" />;
      default:
        return <ArrowRight className="h-4 w-4" />;
    }
  };

  const getTransitionColor = (type: string) => {
    switch (type) {
      case 'Forward':
        return 'bg-success/10 text-success border-success/20';
      case 'Send Back':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'Remand':
        return 'bg-info/10 text-info border-info/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getValidationIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-3 w-3 text-success" />;
      case 'overridden':
        return <Shield className="h-3 w-3 text-warning" />;
      case 'pending_approval':
        return <Clock className="h-3 w-3 text-info" />;
      default:
        return <CheckCircle className="h-3 w-3" />;
    }
  };

  const getApprovalStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="outline" className="bg-success/10 text-success text-xs">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive text-xs">Rejected</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning text-xs">Pending</Badge>;
      default:
        return null;
    }
  };

  const handleAttachmentClick = async (attachment: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('transition-attachments')
        .createSignedUrl(attachment.path, 3600);
      
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Failed to open attachment:', error);
      toast({ title: "Error", description: "Could not open attachment", variant: "destructive" });
    }
  };

  const handleOrderDocumentClick = async () => {
    if (!transition.orderDocumentPath) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('transition-attachments')
        .createSignedUrl(transition.orderDocumentPath, 3600);
      
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Failed to open order document:', error);
      toast({ title: "Error", description: "Could not open order document", variant: "destructive" });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isRemandTransition = transition.transitionType === 'Remand';

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isLatest ? 'ring-2 ring-primary/20' : ''
      } ${isExpanded ? 'ring-1 ring-primary/30' : ''}`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <CardContent className="p-4">
        {/* Collapsed View */}
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/20 bg-background flex-shrink-0">
            {getTransitionIcon(transition.transitionType)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-xs ${getTransitionColor(transition.transitionType)}`}>
                {transition.transitionType}
              </Badge>
              {/* Remand Type Badge */}
              {isRemandTransition && transition.remandType && (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    transition.remandType === 'Reopen' 
                      ? 'bg-info/10 text-info border-info/30' 
                      : 'bg-warning/10 text-warning border-warning/30'
                  }`}
                >
                  {transition.remandType}
                </Badge>
              )}
              {transition.fromStage && (
                <span className="text-xs text-muted-foreground truncate">
                  {transition.fromStage}
                </span>
              )}
              <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium truncate">
                {transition.toStage}
              </span>
              {isLatest && (
                <Badge variant="secondary" className="text-xs">Latest</Badge>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {transition.actorName || 'Unknown'}
              </span>
              {transition.actorRole && (
                <span className="text-xs">• {transition.actorRole}</span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(transition.createdAt), 'MMM dd, yyyy HH:mm')}
              </span>
            </div>

            {/* Quick status indicators */}
            <div className="flex items-center gap-2 mt-2">
              <span className="flex items-center gap-1 text-xs">
                {getValidationIcon(transition.validationStatus)}
                {transition.validationStatus === 'passed' && 'Validated'}
                {transition.validationStatus === 'overridden' && 'Override'}
                {transition.validationStatus === 'pending_approval' && 'Pending'}
              </span>
              {transition.approvalStatus && getApprovalStatusBadge(transition.approvalStatus)}
              {/* Show reason category for remand in collapsed view */}
              {isRemandTransition && transition.reasonCategory && (
                <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                  • {transition.reasonCategory}
                </span>
              )}
              {transition.attachments?.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Paperclip className="h-3 w-3" />
                  {transition.attachments.length}
                </span>
              )}
              {/* Order document indicator */}
              {isRemandTransition && transition.orderDocumentId && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  Order
                </span>
              )}
            </div>
          </div>

          {/* Expand Indicator */}
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Expanded View */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <Separator className="my-4" />

              <div className="space-y-4">
                {/* Remand/Reopen Details Section */}
                {isRemandTransition && (
                  <div className="space-y-3">
                    {/* Remand Type Header */}
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${
                      transition.remandType === 'Reopen' 
                        ? 'bg-info/10 border border-info/20' 
                        : 'bg-warning/10 border border-warning/20'
                    }`}>
                      <RotateCcw className={`h-4 w-4 ${
                        transition.remandType === 'Reopen' ? 'text-info' : 'text-warning'
                      }`} />
                      <span className="font-medium text-sm">
                        {transition.remandType === 'Reopen' ? 'Case Reopened' : 'Case Remanded'}
                      </span>
                      {transition.reasonCategory && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {transition.reasonCategory}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Reason Details */}
                    {transition.reasonDetails && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          DETAILED REASON
                        </Label>
                        <div className="p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {transition.reasonDetails}
                        </div>
                      </div>
                    )}
                    
                    {/* Order Details */}
                    {(transition.orderNumber || transition.orderDate) && (
                      <div className="p-3 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">Order Details</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {transition.orderNumber && (
                            <div>
                              <span className="text-xs text-muted-foreground">Order No:</span>
                              <p className="font-medium">{transition.orderNumber}</p>
                            </div>
                          )}
                          {transition.orderDate && (
                            <div>
                              <span className="text-xs text-muted-foreground">Order Date:</span>
                              <p className="font-medium flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(transition.orderDate), 'dd MMM yyyy')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Order Document Button */}
                    {transition.orderDocumentId && transition.orderDocumentPath && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={handleOrderDocumentClick}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        <span className="flex-1 text-left">View Order Document</span>
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </Button>
                    )}
                    
                    {/* Client Visible Summary */}
                    {transition.clientVisibleSummary && (
                      <div className="p-3 border-l-2 border-info bg-info/5 rounded-r-lg">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          CLIENT VISIBLE SUMMARY
                        </Label>
                        <p className="text-sm">{transition.clientVisibleSummary}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Comments / Notes - Show for non-remand or if no reason details */}
                {transition.comments && !isRemandTransition && (
                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                      <MessageSquare className="h-3 w-3" />
                      REASON / NOTES
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap break-words leading-relaxed max-w-full overflow-hidden">
                      {transition.comments}
                    </div>
                  </div>
                )}

                {/* Validation Status */}
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1.5">
                    <Shield className="h-3 w-3" />
                    VALIDATION STATUS
                  </div>
                  <div className="flex items-start gap-2">
                    {getValidationIcon(transition.validationStatus)}
                    <div className="flex-1">
                      <span className="text-sm font-medium capitalize">
                        {transition.validationStatus.replace('_', ' ')}
                      </span>
                      {transition.validationStatus === 'overridden' && transition.overrideReason && (
                        <p className="text-xs text-warning mt-1">
                          Override Reason: {transition.overrideReason}
                        </p>
                      )}
                      {transition.validationWarnings && transition.validationWarnings.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {transition.validationWarnings.map((warning, idx) => (
                            <li key={idx} className="text-xs text-warning flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {warning}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                {/* Approvals */}
                {(transition.requiresApproval || transition.approvalStatus) && (
                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1.5">
                      <CheckCircle className="h-3 w-3" />
                      APPROVALS
                    </div>
                    <div className="space-y-2">
                      {transition.approvedBy && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-success" />
                          <span>
                            {transition.approvalStatus === 'approved' ? 'Approved' : 'Reviewed'} by{' '}
                            <span className="font-medium">{transition.approvedBy}</span>
                            {transition.approvedAt && (
                              <span className="text-muted-foreground ml-1">
                                @ {format(new Date(transition.approvedAt), 'MMM dd, HH:mm')}
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      {transition.approvalComments && (
                        <p className="text-xs text-muted-foreground pl-6">
                          "{transition.approvalComments}"
                        </p>
                      )}
                      {transition.approvalStatus === 'pending' && (
                        <div className="flex items-center gap-2 text-sm text-warning">
                          <Clock className="h-4 w-4" />
                          <span>Client Approval: Pending</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {transition.attachments && transition.attachments.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1.5">
                      <FileText className="h-3 w-3" />
                      ATTACHMENTS
                    </div>
                    <div className="space-y-1.5">
                      {transition.attachments.map((attachment, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-xs h-8"
                          onClick={() => handleAttachmentClick(attachment)}
                        >
                          <Paperclip className="h-3 w-3 mr-2" />
                          <span className="truncate flex-1 text-left">{attachment.name}</span>
                          <span className="text-muted-foreground ml-2">
                            ({formatFileSize(attachment.size)})
                          </span>
                          <ExternalLink className="h-3 w-3 ml-2" />
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preserved History Notice for Remand */}
                {isRemandTransition && transition.preservesFutureHistory && (
                  <Alert className="bg-muted/30 border-muted">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Future stage history was preserved as read-only for audit compliance.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Actor Details */}
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="font-medium">{transition.actorName || 'Unknown User'}</span>
                    {transition.actorRole && <span>• {transition.actorRole}</span>}
                    <span>•</span>
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(transition.createdAt), 'dd MMM yyyy HH:mm:ss')}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
