/**
 * Client Approval Modal
 * Allows clients to approve or reject proposed stage transitions
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Clock,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { EnhancedStageTransition } from '@/types/stageAction';

interface ClientApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  transition: EnhancedStageTransition | null;
  onApprovalComplete?: () => void;
}

export const ClientApprovalModal: React.FC<ClientApprovalModalProps> = ({
  isOpen,
  onClose,
  transition,
  onApprovalComplete
}) => {
  const [comments, setComments] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!transition) return null;

  const getTransitionIcon = (type: string) => {
    switch (type) {
      case 'Forward':
        return <ArrowRight className="h-5 w-5 text-success" />;
      case 'Send Back':
        return <ArrowLeft className="h-5 w-5 text-warning" />;
      case 'Remand':
        return <RotateCcw className="h-5 w-5 text-info" />;
      default:
        return <ArrowRight className="h-5 w-5" />;
    }
  };

  const handleDecision = async (decision: 'approve' | 'reject') => {
    if (!transition) return;
    
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user profile for actor details
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Create approval record
      const { error: approvalError } = await supabase
        .from('stage_transition_approvals')
        .insert({
          tenant_id: profile.tenant_id,
          transition_id: transition.id,
          action: decision,
          actor_id: user.id,
          actor_role: 'Client',
          comments: comments || null
        });

      if (approvalError) throw approvalError;

      // Update the transition's approval status
      const { error: updateError } = await supabase
        .from('stage_transitions')
        .update({
          approval_status: decision === 'approve' ? 'approved' : 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          approval_comments: comments || null
        })
        .eq('id', transition.id);

      if (updateError) throw updateError;

      toast({
        title: decision === 'approve' ? 'Transition Approved' : 'Transition Rejected',
        description: decision === 'approve' 
          ? 'The stage transition has been approved and will proceed.'
          : 'The stage transition has been rejected. The team will be notified.',
        variant: decision === 'approve' ? 'default' : 'destructive'
      });

      onApprovalComplete?.();
      onClose();
    } catch (error: any) {
      console.error('Approval error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process your decision',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Approve Stage Transition?
          </DialogTitle>
          <DialogDescription>
            Your decision will be permanently logged for audit purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Proposed Action */}
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                PROPOSED ACTION
              </div>
              <div className="flex items-center gap-3">
                {getTransitionIcon(transition.transitionType)}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{transition.transitionType}</Badge>
                  <span className="text-sm">{transition.fromStage || 'Initial'}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{transition.toStage}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reason */}
          {transition.comments && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                REASON / NOTES
              </div>
              <div className="p-3 bg-muted/50 rounded-md text-sm">
                {transition.comments}
              </div>
            </div>
          )}

          {/* Requested By */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {transition.actorName || 'Unknown'}
              {transition.actorRole && ` (${transition.actorRole})`}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {format(new Date(transition.createdAt), 'MMM dd, yyyy HH:mm')}
            </span>
          </div>

          <Separator />

          {/* Your Decision */}
          <div>
            <Label htmlFor="comments">Comments (optional)</Label>
            <Textarea
              id="comments"
              placeholder="Add any comments about your decision..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="mt-1.5"
              rows={3}
            />
          </div>

          {/* Warning */}
          <Alert className="bg-warning/10 border-warning/30">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-sm text-warning">
              Your action will be permanently logged in the case audit trail and cannot be undone.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleDecision('reject')}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Reject
          </Button>
          <Button
            onClick={() => handleDecision('approve')}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
