import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Paperclip, 
  X, 
  Loader2,
  Calendar,
  User,
  Flag,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useAppState } from '@/contexts/AppStateContext';
import { supabase } from '@/integrations/supabase/client';
import { TaskAttachment } from '@/types/taskMessages';
import { taskMessagesService } from '@/services/taskMessagesService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];
const DEFAULT_TAGS = ['Urgent', 'Review', 'Follow-up', 'Documentation', 'Client'];

export const CreateTask: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'Medium',
    dueDate: undefined as Date | undefined,
    tags: [] as string[],
  });
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newAttachments: TaskAttachment[] = [];

    for (const file of Array.from(files)) {
      try {
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `task-attachments/${fileName}`;

        const { data, error } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        newAttachments.push({
          id: data.path,
          name: file.name,
          url: urlData.publicUrl,
          type: file.type,
          size: file.size,
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to create a task');
        return;
      }

      const profile = state.employees.find((e) => e.id === user.id);
      const tenantId = profile?.tenantId || '';
      const userName = profile?.full_name || user.email || 'User';

      const assignee = state.employees.find((e) => e.id === formData.assignedTo);

      // Create task in Supabase
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert([{
          title: formData.title.trim(),
          description: formData.description.trim(),
          assigned_to: formData.assignedTo || null,
          priority: formData.priority,
          due_date: formData.dueDate ? format(formData.dueDate, 'yyyy-MM-dd') : null,
          status: 'Not Started',
        }] as any)
        .select()
        .single();

      if (taskError) throw taskError;

      // Create initial message from description
      if (formData.description.trim() || attachments.length > 0) {
        await taskMessagesService.createInitialMessage(
          taskData.id,
          tenantId,
          user.id,
          userName,
          formData.description.trim() || 'Task created',
          attachments
        );
      }

      // Dispatch to local state
      dispatch({
        type: 'ADD_TASK',
        payload: {
          id: taskData.id,
          title: taskData.title,
          description: taskData.description || '',
          caseId: '',
          clientId: '',
          caseNumber: '',
          stage: '',
          assignedToId: taskData.assigned_to || '',
          assignedToName: assignee?.full_name || '',
          assignedById: user.id,
          assignedByName: userName,
          priority: (taskData.priority || 'Medium') as 'Critical' | 'High' | 'Medium' | 'Low',
          dueDate: taskData.due_date || '',
          status: (taskData.status || 'Not Started') as 'Not Started' | 'In Progress' | 'Completed' | 'Overdue' | 'Review',
          createdDate: taskData.created_at,
          estimatedHours: 0,
          isAutoGenerated: false,
          escalationLevel: 0,
          timezone: 'Asia/Kolkata',
          dueDateValidated: true,
          audit_trail: { created_by: user.id, created_at: taskData.created_at, updated_by: user.id, updated_at: taskData.created_at, change_log: [] },
        },
      });

      toast.success('Task created successfully');
      navigate(`/tasks/${taskData.id}`);
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/tasks')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">Create New Task</h1>
      </div>

      {/* Form - Clean Linear Layout */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {/* Title - Primary Focus */}
          <div className="space-y-2">
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="What needs to be done?"
              className="text-xl font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Add more details..."
              className="min-h-[120px] resize-none border-muted"
            />
          </div>

          {/* Quick Settings Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Assignee */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Assignee
              </Label>
              <Select
                value={formData.assignedTo}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, assignedTo: val }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {state.employees
                    .filter((e) => e.status === 'Active')
                    .map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Flag className="h-3.5 w-3.5" />
                Priority
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, priority: val }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5 col-span-2 sm:col-span-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Due Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-9',
                      !formData.dueDate && 'text-muted-foreground'
                    )}
                  >
                    {formData.dueDate
                      ? format(formData.dueDate, 'MMM d, yyyy')
                      : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={formData.dueDate}
                    onSelect={(date) => setFormData((prev) => ({ ...prev, dueDate: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Tags
            </Label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={formData.tags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer transition-all hover:scale-105"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="task-attachments"
            />
            
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg text-sm group"
                  >
                    <Paperclip className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{att.name}</span>
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full border-dashed h-12"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Paperclip className="h-4 w-4 mr-2" />
              )}
              {attachments.length > 0 ? 'Add More Files' : 'Attach Files'}
            </Button>
          </div>
        </div>
      </div>

      {/* Footer - Sticky */}
      <div className="border-t bg-card p-4 flex justify-end gap-3">
        <Button variant="ghost" onClick={() => navigate('/tasks')}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || !formData.title.trim()}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Create Task
        </Button>
      </div>
    </div>
  );
};

export default CreateTask;
