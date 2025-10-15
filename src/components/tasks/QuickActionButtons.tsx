import React, { useState } from 'react';
import { Zap, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface QuickActionButtonsProps {
  currentStatus: string;
  currentDueDate?: string;
  currentFollowUpDate?: string;
  onBatchUpdate: (updates: {
    status?: string;
    hours?: number;
    dueDate?: string;
    followUpDate?: string;
    comment: string;
  }) => void;
}

export const QuickActionButtons: React.FC<QuickActionButtonsProps> = ({
  currentStatus,
  currentDueDate,
  currentFollowUpDate,
  onBatchUpdate
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [enabledActions, setEnabledActions] = useState({
    status: false,
    time: false,
    reschedule: false,
    followUp: false,
  });

  const [formData, setFormData] = useState({
    status: currentStatus,
    hours: '',
    dueDate: currentDueDate ? new Date(currentDueDate) : undefined as Date | undefined,
    followUpDate: currentFollowUpDate ? new Date(currentFollowUpDate) : undefined as Date | undefined,
    comment: '',
  });

  const resetForm = () => {
    setEnabledActions({
      status: false,
      time: false,
      reschedule: false,
      followUp: false,
    });
    setFormData({
      status: currentStatus,
      hours: '',
      dueDate: currentDueDate ? new Date(currentDueDate) : undefined,
      followUpDate: currentFollowUpDate ? new Date(currentFollowUpDate) : undefined,
      comment: '',
    });
  };

  const isValid = () => {
    const hasEnabledAction = Object.values(enabledActions).some(v => v);
    const hasComment = formData.comment.trim().length > 0;
    
    if (!hasEnabledAction || !hasComment) return false;
    
    if (enabledActions.time && (!formData.hours || parseFloat(formData.hours) <= 0)) return false;
    if (enabledActions.reschedule && !formData.dueDate) return false;
    if (enabledActions.followUp && !formData.followUpDate) return false;
    
    return true;
  };

  const handleSubmit = () => {
    if (!isValid()) return;

    const updates: {
      status?: string;
      hours?: number;
      dueDate?: string;
      followUpDate?: string;
      comment: string;
    } = {
      comment: formData.comment,
    };

    if (enabledActions.status && formData.status !== currentStatus) {
      updates.status = formData.status;
    }
    if (enabledActions.time && formData.hours) {
      updates.hours = parseFloat(formData.hours);
    }
    if (enabledActions.reschedule && formData.dueDate) {
      updates.dueDate = formData.dueDate.toISOString();
    }
    if (enabledActions.followUp && formData.followUpDate) {
      updates.followUpDate = formData.followUpDate.toISOString();
    }

    onBatchUpdate(updates);
    resetForm();
    setDialogOpen(false);
  };

  const enabledCount = Object.values(enabledActions).filter(v => v).length;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        className="w-full"
      >
        <Zap className="h-4 w-4 mr-2" />
        Quick Update
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Quick Update Task</DialogTitle>
            <DialogDescription>Select the changes you want to make and add a comment</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Status Change */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="enable-status"
                checked={enabledActions.status}
                onCheckedChange={(checked) => 
                  setEnabledActions(prev => ({ ...prev, status: checked as boolean }))
                }
              />
              <div className="flex-1 space-y-2">
                <Label htmlFor="enable-status" className="font-semibold cursor-pointer">
                  Change Status
                </Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  disabled={!enabledActions.status}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Review">Review</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Log Time */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="enable-time"
                checked={enabledActions.time}
                onCheckedChange={(checked) => 
                  setEnabledActions(prev => ({ ...prev, time: checked as boolean }))
                }
              />
              <div className="flex-1 space-y-2">
                <Label htmlFor="enable-time" className="font-semibold cursor-pointer">
                  Log Time
                </Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="Hours (e.g., 2.5)"
                  value={formData.hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, hours: e.target.value }))}
                  disabled={!enabledActions.time}
                />
              </div>
            </div>

            {/* Reschedule Due Date */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="enable-reschedule"
                checked={enabledActions.reschedule}
                onCheckedChange={(checked) => 
                  setEnabledActions(prev => ({ ...prev, reschedule: checked as boolean }))
                }
              />
              <div className="flex-1 space-y-2">
                <Label htmlFor="enable-reschedule" className="font-semibold cursor-pointer">
                  Reschedule Due Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={!enabledActions.reschedule}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dueDate ? format(formData.dueDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.dueDate}
                      onSelect={(date) => setFormData(prev => ({ ...prev, dueDate: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Set Follow-up */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="enable-followup"
                checked={enabledActions.followUp}
                onCheckedChange={(checked) => 
                  setEnabledActions(prev => ({ ...prev, followUp: checked as boolean }))
                }
              />
              <div className="flex-1 space-y-2">
                <Label htmlFor="enable-followup" className="font-semibold cursor-pointer">
                  Set Follow-up
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={!enabledActions.followUp}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.followUpDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.followUpDate ? format(formData.followUpDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.followUpDate}
                      onSelect={(date) => setFormData(prev => ({ ...prev, followUpDate: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Common Comment */}
            <div className="border-t pt-4 space-y-2">
              <Label htmlFor="comment" className="font-semibold">
                Comment <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Applied to all changes made
              </p>
              <Textarea
                id="comment"
                placeholder="Describe your changes..."
                value={formData.comment}
                onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!isValid()}>
              {enabledCount > 0 ? `Save ${enabledCount} Update${enabledCount > 1 ? 's' : ''}` : 'Save Updates'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
