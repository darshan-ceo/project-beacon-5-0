import React, { useState } from 'react';
import { MessageSquare, Clock, Calendar, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface QuickActionButtonsProps {
  currentStatus: string;
  onAddNote: (note: string) => void;
  onLogTime: (hours: number, note: string) => void;
  onReschedule: (newDate: string) => void;
  onSetFollowUp: (followUpDate: string, note: string) => void;
  onChangeStatus: (newStatus: string, note: string) => void;
}

export const QuickActionButtons: React.FC<QuickActionButtonsProps> = ({
  currentStatus,
  onAddNote,
  onLogTime,
  onReschedule,
  onSetFollowUp,
  onChangeStatus
}) => {
  const [activeDialog, setActiveDialog] = useState<'note' | 'time' | 'reschedule' | 'followup' | 'status' | null>(null);
  const [note, setNote] = useState('');
  const [hours, setHours] = useState<number>(0);
  const [date, setDate] = useState('');
  const [status, setStatus] = useState(currentStatus);

  const handleSubmit = () => {
    switch (activeDialog) {
      case 'note':
        if (note.trim()) {
          onAddNote(note);
          setNote('');
          setActiveDialog(null);
        }
        break;
      case 'time':
        if (hours > 0) {
          onLogTime(hours, note);
          setHours(0);
          setNote('');
          setActiveDialog(null);
        }
        break;
      case 'reschedule':
        if (date) {
          onReschedule(date);
          setDate('');
          setActiveDialog(null);
        }
        break;
      case 'followup':
        if (date) {
          onSetFollowUp(date, note);
          setDate('');
          setNote('');
          setActiveDialog(null);
        }
        break;
      case 'status':
        if (status !== currentStatus && note.trim()) {
          onChangeStatus(status, note);
          setNote('');
          setActiveDialog(null);
        }
        break;
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveDialog('note')}
          className="justify-start"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Add Note
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveDialog('time')}
          className="justify-start"
        >
          <Clock className="h-4 w-4 mr-2" />
          Log Time
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveDialog('reschedule')}
          className="justify-start"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Reschedule
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveDialog('status')}
          className="justify-start"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Update Status
        </Button>
      </div>

      {/* Add Note Dialog */}
      <Dialog open={activeDialog === 'note'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>Add a comment or update to this task</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Note</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's the update?"
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!note.trim()}>Add Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Time Dialog */}
      <Dialog open={activeDialog === 'time'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Time</DialogTitle>
            <DialogDescription>Record time spent on this task</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Hours</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={hours || ''}
                onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                placeholder="1.5"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Note (Optional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What did you work on?"
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={hours <= 0}>Log Time</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={activeDialog === 'reschedule'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Task</DialogTitle>
            <DialogDescription>Set a new due date for this task</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Due Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!date}>Reschedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Follow-up Dialog */}
      <Dialog open={activeDialog === 'followup'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Follow-up</DialogTitle>
            <DialogDescription>Schedule a reminder to follow up on this task</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Follow-up Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Note (Optional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What to follow up on?"
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!date}>Set Follow-up</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={activeDialog === 'status'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>Change the task status and add a note</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1">
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
            <div>
              <Label>Note (Required)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why are you changing the status?"
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={status === currentStatus || !note.trim()}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
