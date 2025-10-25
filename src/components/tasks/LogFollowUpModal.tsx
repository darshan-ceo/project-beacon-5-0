import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle2, FileText, Blocks, Phone, Plus, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Task, TaskFollowUp } from '@/contexts/AppStateContext';
import { cn } from '@/lib/utils';
import { ThreeLayerHelp } from '@/components/ui/three-layer-help';
import { uiHelpService } from '@/services/uiHelpService';

interface LogFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onSubmit: (followUp: Omit<TaskFollowUp, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>) => void;
}

const outcomes = [
  { value: 'Progressing', icon: CheckCircle2, color: 'text-success' },
  { value: 'Blocked', icon: AlertTriangle, color: 'text-destructive' },
  { value: 'Completed', icon: CheckCircle2, color: 'text-success' },
  { value: 'Need Support', icon: AlertTriangle, color: 'text-warning' },
  { value: 'Pending Input', icon: Clock, color: 'text-muted-foreground' },
] as const;

export const LogFollowUpModal: React.FC<LogFollowUpModalProps> = ({
  isOpen,
  onClose,
  task,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    remarks: '',
    outcome: 'Progressing' as TaskFollowUp['outcome'],
    status: task.status,
    hoursLogged: undefined as number | undefined,
    workDate: new Date().toISOString().split('T')[0],
    nextFollowUpDate: undefined as string | undefined,
    nextActions: '',
    blockers: '',
    supportNeeded: false,
    escalationRequested: false,
    clientInteraction: false,
    internalReview: false,
  });

  const [workDateOpen, setWorkDateOpen] = useState(false);
  const [followUpDateOpen, setFollowUpDateOpen] = useState(false);

  // Load help data on mount
  useEffect(() => {
    uiHelpService.loadHelpData();
  }, []);

  const resetForm = () => {
    setFormData({
      remarks: '',
      outcome: 'Progressing',
      status: task.status,
      hoursLogged: undefined,
      workDate: new Date().toISOString().split('T')[0],
      nextFollowUpDate: undefined,
      nextActions: '',
      blockers: '',
      supportNeeded: false,
      escalationRequested: false,
      clientInteraction: false,
      internalReview: false,
    });
  };

  const handleSubmit = () => {
    // Validate
    if (formData.remarks.trim().length < 20) {
      return; // TODO: Show validation error
    }

    onSubmit({
      taskId: task.id,
      remarks: formData.remarks,
      outcome: formData.outcome,
      status: formData.status,
      hoursLogged: formData.hoursLogged,
      workDate: formData.workDate,
      nextFollowUpDate: formData.nextFollowUpDate,
      nextActions: formData.nextActions || undefined,
      blockers: formData.blockers || undefined,
      supportNeeded: formData.supportNeeded,
      escalationRequested: formData.escalationRequested,
      clientInteraction: formData.clientInteraction,
      internalReview: formData.internalReview,
    });

    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isValid = formData.remarks.trim().length >= 20;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Follow-Up
          </DialogTitle>
          <DialogDescription>
            Record progress and next steps for: {task.title}
          </DialogDescription>
          <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border flex items-start gap-2">
            <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <ThreeLayerHelp 
                helpId="followup_modal_overview" 
                showExplanation={false}
                showTooltipIcon={true}
                className="inline-flex"
              >
                <span className="font-medium text-foreground">Quick Tip:</span>
              </ThreeLayerHelp>
              <span className="ml-1">Fill in progress remarks (required) and optionally track time, set reminders, or flag issues for team coordination.</span>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="relative">
          <form className="space-y-6">
            {/* Progress & Remarks Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Progress & Remarks
                  </CardTitle>
                  <ThreeLayerHelp 
                    helpId="followup_card_progress"
                    showExplanation={false}
                    showTooltipIcon={true}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Remarks - Required */}
                <div className="space-y-2">
                  <ThreeLayerHelp 
                    helpId="followup_remarks"
                    showExplanation={true}
                    showTooltipIcon={true}
                  >
                    <Label htmlFor="remarks">
                      What progress was made? What did you do? *
                    </Label>
                  </ThreeLayerHelp>
                  <Textarea
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Example: 'Reviewed notice dated 15-Oct-2025. Identified 3 key issues requiring clarification. Drafted preliminary response addressing GST liability concerns. Next: Client meeting to discuss strategy.' (minimum 20 characters)"
                    rows={4}
                    className={cn(
                      "resize-none",
                      formData.remarks.length > 0 && formData.remarks.length < 20 && "border-destructive"
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.remarks.length} / 20 characters minimum
                  </p>
                </div>

                {/* Outcome and Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <ThreeLayerHelp 
                      helpId="followup_outcome"
                      showExplanation={true}
                      showTooltipIcon={true}
                    >
                      <Label>Outcome</Label>
                    </ThreeLayerHelp>
                    <Select
                      value={formData.outcome}
                      onValueChange={(value) => setFormData({ ...formData, outcome: value as TaskFollowUp['outcome'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {outcomes.map((outcome) => {
                          const Icon = outcome.icon;
                          return (
                            <SelectItem key={outcome.value} value={outcome.value}>
                              <div className="flex items-center gap-2">
                                <Icon className={cn("h-4 w-4", outcome.color)} />
                                {outcome.value}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <ThreeLayerHelp 
                      helpId="followup_status"
                      showExplanation={true}
                      showTooltipIcon={true}
                    >
                      <Label>Update Status *</Label>
                    </ThreeLayerHelp>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value as Task['status'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Not Started">Not Started</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Review">Review</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time & Scheduling Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Time & Scheduling
                  </CardTitle>
                  <ThreeLayerHelp 
                    helpId="followup_card_time"
                    showExplanation={false}
                    showTooltipIcon={true}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Time and Work Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <ThreeLayerHelp 
                      helpId="followup_hours"
                      showExplanation={true}
                      showTooltipIcon={true}
                    >
                      <Label htmlFor="hours">Hours Worked</Label>
                    </ThreeLayerHelp>
                    <div className="relative">
                      <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="hours"
                        type="number"
                        step="0.25"
                        min="0"
                        max="24"
                        value={formData.hoursLogged || ''}
                        onChange={(e) => setFormData({ ...formData, hoursLogged: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="0.0"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <ThreeLayerHelp 
                      helpId="followup_work_date"
                      showExplanation={true}
                      showTooltipIcon={true}
                    >
                      <Label>Work Date</Label>
                    </ThreeLayerHelp>
                    <Popover open={workDateOpen} onOpenChange={setWorkDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {formData.workDate ? format(new Date(formData.workDate), 'PPP') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={formData.workDate ? new Date(formData.workDate) : undefined}
                          onSelect={(date) => {
                            setFormData({ ...formData, workDate: date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0] });
                            setWorkDateOpen(false);
                          }}
                          disabled={(date) => date > new Date() || date < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Next Follow-Up Date */}
                <div className="space-y-2">
                  <ThreeLayerHelp 
                    helpId="followup_next_date"
                    showExplanation={true}
                    showTooltipIcon={true}
                  >
                    <Label>Set Next Follow-Up</Label>
                  </ThreeLayerHelp>
                  <Popover open={followUpDateOpen} onOpenChange={setFollowUpDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {formData.nextFollowUpDate ? format(new Date(formData.nextFollowUpDate), 'PPP') : 'Select date (optional)'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={formData.nextFollowUpDate ? new Date(formData.nextFollowUpDate) : undefined}
                        onSelect={(date) => {
                          setFormData({ ...formData, nextFollowUpDate: date?.toISOString().split('T')[0] });
                          setFollowUpDateOpen(false);
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        setFormData({ ...formData, nextFollowUpDate: tomorrow.toISOString().split('T')[0] });
                      }}
                    >
                      Tomorrow
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const threeDays = new Date();
                        threeDays.setDate(threeDays.getDate() + 3);
                        setFormData({ ...formData, nextFollowUpDate: threeDays.toISOString().split('T')[0] });
                      }}
                    >
                      3 days
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const oneWeek = new Date();
                        oneWeek.setDate(oneWeek.getDate() + 7);
                        setFormData({ ...formData, nextFollowUpDate: oneWeek.toISOString().split('T')[0] });
                      }}
                    >
                      1 week
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Actions & Blockers Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Blocks className="h-4 w-4" />
                    Next Actions & Blockers
                  </CardTitle>
                  <ThreeLayerHelp 
                    helpId="followup_card_actions"
                    showExplanation={false}
                    showTooltipIcon={true}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Next Actions */}
                <div className="space-y-2">
                  <ThreeLayerHelp 
                    helpId="followup_next_actions"
                    showExplanation={true}
                    showTooltipIcon={true}
                  >
                    <Label htmlFor="nextActions">Next Actions</Label>
                  </ThreeLayerHelp>
                  <Textarea
                    id="nextActions"
                    value={formData.nextActions}
                    onChange={(e) => setFormData({ ...formData, nextActions: e.target.value })}
                    placeholder="Example: 'Schedule client meeting by Friday', 'Draft response to points 4-7', 'Obtain partner approval for strategy'"
                    rows={2}
                    className="resize-none"
                  />
                </div>

                {/* Blockers */}
                <div className="space-y-2">
                  <ThreeLayerHelp 
                    helpId="followup_blockers"
                    showExplanation={true}
                    showTooltipIcon={true}
                  >
                    <Label htmlFor="blockers">Blockers/Issues</Label>
                  </ThreeLayerHelp>
                  <Textarea
                    id="blockers"
                    value={formData.blockers}
                    onChange={(e) => setFormData({ ...formData, blockers: e.target.value })}
                    placeholder="Example: 'Waiting for client bank statements', 'Need tax authority clarification on Section 73', 'Resource on leave until Monday'"
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Additional Options Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Additional Options
                  </CardTitle>
                  <ThreeLayerHelp 
                    helpId="followup_card_options"
                    showExplanation={false}
                    showTooltipIcon={true}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="supportNeeded"
                      checked={formData.supportNeeded}
                      onCheckedChange={(checked) => setFormData({ ...formData, supportNeeded: checked as boolean })}
                    />
                    <Label htmlFor="supportNeeded" className="cursor-pointer font-normal">
                      Support needed from team
                      <span className="ml-2 text-xs text-muted-foreground bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                        Team Dashboard
                      </span>
                    </Label>
                  </div>
                  <ThreeLayerHelp 
                    helpId="followup_support_needed"
                    showExplanation={false}
                    showTooltipIcon={true}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="escalationRequested"
                      checked={formData.escalationRequested}
                      onCheckedChange={(checked) => setFormData({ ...formData, escalationRequested: checked as boolean })}
                    />
                    <Label htmlFor="escalationRequested" className="cursor-pointer font-normal text-destructive">
                      Request escalation
                      <span className="ml-2 text-xs text-muted-foreground bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">
                        Notifies Creator
                      </span>
                    </Label>
                  </div>
                  <ThreeLayerHelp 
                    helpId="followup_escalation"
                    showExplanation={false}
                    showTooltipIcon={true}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="clientInteraction"
                      checked={formData.clientInteraction}
                      onCheckedChange={(checked) => setFormData({ ...formData, clientInteraction: checked as boolean })}
                    />
                    <Label htmlFor="clientInteraction" className="cursor-pointer font-normal">
                      <Phone className="inline h-3 w-3 mr-1" />
                      Client communication occurred
                      <span className="ml-2 text-xs text-muted-foreground bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded">
                        Timeline Badge
                      </span>
                    </Label>
                  </div>
                  <ThreeLayerHelp 
                    helpId="followup_client_interaction"
                    showExplanation={false}
                    showTooltipIcon={true}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="internalReview"
                      checked={formData.internalReview}
                      onCheckedChange={(checked) => setFormData({ ...formData, internalReview: checked as boolean })}
                    />
                    <Label htmlFor="internalReview" className="cursor-pointer font-normal">
                      Internal review completed
                      <span className="ml-2 text-xs text-muted-foreground bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded">
                        Quality Badge
                      </span>
                    </Label>
                  </div>
                  <ThreeLayerHelp 
                    helpId="followup_internal_review"
                    showExplanation={false}
                    showTooltipIcon={true}
                  />
                </div>
              </CardContent>
            </Card>
          </form>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <ThreeLayerHelp 
            helpId="followup_btn_add"
            showExplanation={false}
            showTooltipIcon={true}
          >
            <Button onClick={handleSubmit} disabled={!isValid}>
              Add Follow-Up
            </Button>
          </ThreeLayerHelp>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
