import React, { useState } from 'react';
import { 
  CheckCircle, 
  Flag, 
  UserCog, 
  Calendar, 
  MessageSquare, 
  Download, 
  Trash2,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Task, useAppState } from '@/contexts/AppStateContext';
import { tasksService } from '@/services/tasksService';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { exportToExcel } from '@/utils/exporter';
import { formatDateForDisplay } from '@/utils/dateFormatters';

interface TasksBulkActionsProps {
  selectedTaskIds: string[];
  tasks: Task[];
  onComplete: () => void;
  userRole?: string;
}

type ActionType = 'status' | 'priority' | 'reassign' | 'dueDate' | 'comment' | 'delete' | null;

const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Review', 'Completed'];
const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];

export const TasksBulkActions: React.FC<TasksBulkActionsProps> = ({
  selectedTaskIds,
  tasks,
  onComplete,
  userRole
}) => {
  const { state, dispatch } = useAppState();
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Form states
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [comment, setComment] = useState<string>('');

  const isAdmin = userRole?.toLowerCase() === 'admin';
  const count = selectedTaskIds.length;

  const resetForm = () => {
    setSelectedStatus('');
    setSelectedPriority('');
    setSelectedAssignee('');
    setSelectedDate(undefined);
    setComment('');
  };

  const handleCloseDialog = () => {
    setActiveAction(null);
    resetForm();
  };

  // Bulk Status Change
  const handleBulkStatusChange = async () => {
    if (!selectedStatus) return;
    setIsProcessing(true);
    
    try {
      const result = await tasksService.bulkUpdateStatus(selectedTaskIds, selectedStatus, dispatch);
      toast({
        title: "Status Updated",
        description: `${result.success} task(s) updated to "${selectedStatus}"${result.failed > 0 ? `, ${result.failed} failed` : ''}.`
      });
      handleCloseDialog();
      onComplete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task status.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk Priority Change
  const handleBulkPriorityChange = async () => {
    if (!selectedPriority) return;
    setIsProcessing(true);
    
    try {
      const result = await tasksService.bulkUpdatePriority(selectedTaskIds, selectedPriority, dispatch);
      toast({
        title: "Priority Updated",
        description: `${result.success} task(s) updated to "${selectedPriority}" priority${result.failed > 0 ? `, ${result.failed} failed` : ''}.`
      });
      handleCloseDialog();
      onComplete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task priority.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk Reassign
  const handleBulkReassign = async () => {
    if (!selectedAssignee) return;
    setIsProcessing(true);
    
    const employee = state.employees.find(e => e.id === selectedAssignee);
    const assigneeName = employee?.full_name || (employee as any)?.name || 'Unknown';
    
    try {
      const result = await tasksService.bulkReassign(selectedTaskIds, selectedAssignee, assigneeName, dispatch);
      toast({
        title: "Tasks Reassigned",
        description: `${result.success} task(s) reassigned to ${assigneeName}${result.failed > 0 ? `, ${result.failed} failed` : ''}.`
      });
      handleCloseDialog();
      onComplete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reassign tasks.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk Due Date Update
  const handleBulkDueDateChange = async () => {
    if (!selectedDate) return;
    setIsProcessing(true);
    
    const dueDate = format(selectedDate, 'yyyy-MM-dd');
    
    try {
      const result = await tasksService.bulkUpdateDueDate(selectedTaskIds, dueDate, dispatch);
      toast({
        title: "Due Date Updated",
        description: `${result.success} task(s) due date set to ${formatDateForDisplay(dueDate)}${result.failed > 0 ? `, ${result.failed} failed` : ''}.`
      });
      handleCloseDialog();
      onComplete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update due dates.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk Comment (adds to task notes)
  const handleBulkComment = async () => {
    if (!comment.trim()) return;
    setIsProcessing(true);
    
    try {
      const result = await tasksService.bulkAddComment(selectedTaskIds, comment, state.userProfile?.name || 'System', dispatch);
      toast({
        title: "Comment Added",
        description: `Comment added to ${result.success} task(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}.`
      });
      handleCloseDialog();
      onComplete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add comments.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Export Selected
  const handleExportSelected = () => {
    const headers = ['Task Title', 'Description', 'Case Number', 'Client', 'Status', 'Priority', 'Assignee', 'Due Date', 'Created Date', 'Estimated Hours', 'Actual Hours'];
    const rows = tasks.map(task => [
      task.title || '',
      task.description || '',
      task.caseNumber || '',
      (task as any).clientName || '',
      task.status || '',
      task.priority || '',
      task.assignedToName || (task as any).assignedTo || '',
      task.dueDate ? formatDateForDisplay(task.dueDate) : '',
      task.createdDate ? formatDateForDisplay(task.createdDate) : '',
      String(task.estimatedHours || ''),
      String(task.actualHours || '')
    ]);
    
    exportToExcel([headers, ...rows], `tasks-export-${Date.now()}.xlsx`, 'Tasks');
    toast({
      title: "Export Complete",
      description: `${count} task(s) exported to Excel.`
    });
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    setIsProcessing(true);
    
    try {
      const result = await tasksService.bulkDelete(selectedTaskIds, dispatch);
      toast({
        title: "Tasks Deleted",
        description: `${result.success} task(s) deleted${result.failed > 0 ? `, ${result.failed} failed` : ''}.`
      });
      handleCloseDialog();
      onComplete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete tasks.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Actions ({count})
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-background border z-50">
          <DropdownMenuItem onClick={() => setActiveAction('status')}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Change Status
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveAction('priority')}>
            <Flag className="mr-2 h-4 w-4" />
            Change Priority
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveAction('reassign')}>
            <UserCog className="mr-2 h-4 w-4" />
            Reassign to Employee
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveAction('dueDate')}>
            <Calendar className="mr-2 h-4 w-4" />
            Update Due Date
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveAction('comment')}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Add Bulk Comment
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExportSelected}>
            <Download className="mr-2 h-4 w-4" />
            Export Selected
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setActiveAction('delete')}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Status Change Dialog */}
      <Dialog open={activeAction === 'status'} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              Update status for {count} selected task(s).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>New Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleBulkStatusChange} disabled={!selectedStatus || isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Priority Change Dialog */}
      <Dialog open={activeAction === 'priority'} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Priority</DialogTitle>
            <DialogDescription>
              Update priority for {count} selected task(s).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>New Priority</Label>
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map(priority => (
                  <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleBulkPriorityChange} disabled={!selectedPriority || isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Priority
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={activeAction === 'reassign'} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Tasks</DialogTitle>
            <DialogDescription>
              Reassign {count} selected task(s) to another employee.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Assign To</Label>
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {state.employees
                  .filter(e => e.status === 'Active')
                  .map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name || (employee as any).name} - {employee.designation}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleBulkReassign} disabled={!selectedAssignee || isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reassign Tasks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Due Date Dialog */}
      <Dialog open={activeAction === 'dueDate'} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Due Date</DialogTitle>
            <DialogDescription>
              Set new due date for {count} selected task(s).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>New Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-2",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleBulkDueDateChange} disabled={!selectedDate || isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Due Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Comment Dialog */}
      <Dialog open={activeAction === 'comment'} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bulk Comment</DialogTitle>
            <DialogDescription>
              Add a comment to {count} selected task(s).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Comment</Label>
            <Textarea
              className="mt-2"
              placeholder="Enter your comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleBulkComment} disabled={!comment.trim() || isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={activeAction === 'delete'} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tasks</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {count} selected task(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete {count} Task(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
