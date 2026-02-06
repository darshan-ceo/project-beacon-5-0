/**
 * AddActivityModal
 * Dialog for logging new lead activities
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Phone, Mail, Users, StickyNote, CheckSquare, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { leadService } from '@/services/leadService';
import { ActivityType } from '@/types/lead';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AddActivityModalProps {
  contactId: string;
  isOpen: boolean;
  onClose: () => void;
}

const ACTIVITY_TYPES: { type: ActivityType; label: string; icon: React.ElementType }[] = [
  { type: 'call', label: 'Call', icon: Phone },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'meeting', label: 'Meeting', icon: Users },
  { type: 'note', label: 'Note', icon: StickyNote },
  { type: 'task', label: 'Task', icon: CheckSquare },
];

export const AddActivityModal: React.FC<AddActivityModalProps> = ({
  contactId,
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [activityType, setActivityType] = useState<ActivityType>('call');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [outcome, setOutcome] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');

  const addActivityMutation = useMutation({
    mutationFn: () =>
      leadService.addActivity(contactId, {
        activity_type: activityType,
        subject: subject || undefined,
        description: description || undefined,
        outcome: outcome || undefined,
        next_action: nextAction || undefined,
        next_action_date: nextActionDate || undefined,
      }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Activity logged');
        queryClient.invalidateQueries({ queryKey: ['lead-activities', contactId] });
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        handleClose();
      } else {
        toast.error(result.error || 'Failed to log activity');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to log activity');
    },
  });

  const handleClose = () => {
    setActivityType('call');
    setSubject('');
    setDescription('');
    setOutcome('');
    setNextAction('');
    setNextActionDate('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addActivityMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Activity Type Selector */}
          <div className="space-y-2">
            <Label>Activity Type</Label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_TYPES.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActivityType(type)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors',
                    activityType === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-border'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Discussed pricing options"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about the interaction..."
              rows={3}
            />
          </div>

          {/* Outcome */}
          <div className="space-y-2">
            <Label htmlFor="outcome">Outcome (optional)</Label>
            <Input
              id="outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="e.g., Client interested, needs proposal"
            />
          </div>

          {/* Next Action */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="nextAction">Next Action</Label>
              <Input
                id="nextAction"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="e.g., Send proposal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextActionDate">Due Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="nextActionDate"
                  type="date"
                  value={nextActionDate}
                  onChange={(e) => setNextActionDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={addActivityMutation.isPending}>
              {addActivityMutation.isPending ? 'Saving...' : 'Log Activity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddActivityModal;
