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

      // Fetch tenant_id from profiles table directly
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id, full_name')
        .eq('id', user.id)
        .single();

      if (profileError || !userProfile?.tenant_id) {
        console.error('Failed to fetch user profile:', profileError);
        toast.error('Unable to determine your tenant. Please refresh and try again.');
        return;
      }

      const tenantId = userProfile.tenant_id;
      const userName = userProfile.full_name || user.email || 'User';

      const assignee = state.employees.find((e) => e.id === formData.assignedTo);

      // Create task in Supabase
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert([{
          title: formData.title.trim(),
          description: formData.description.trim(),
          assigned_to: formData.assignedTo || null,
          assigned_by: user.id,
          tenant_id: tenantId,
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
      <div className="border-b px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/tasks')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">Create New Task</h1>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto p-4 space-y-6 max-w-2xl mx-auto w-full">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Task Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Enter task title..."
            className="text-lg"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Add a detailed description..."
            className="min-h-[150px] resize-none"
          />
        </div>

        {/* Assignee & Priority Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Assigned To
            </Label>
            <Select
              value={formData.assignedTo}
              onValueChange={(val) => setFormData((prev) => ({ ...prev, assignedTo: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
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

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-muted-foreground" />
              Priority
            </Label>
            <Select
              value={formData.priority}
              onValueChange={(val) => setFormData((prev) => ({ ...prev, priority: val }))}
            >
              <SelectTrigger>
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
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Due Date
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !formData.dueDate && 'text-muted-foreground'
                )}
              >
                {formData.dueDate
                  ? format(formData.dueDate, 'PPP')
                  : 'Select due date'}
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

        {/* Tags */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            Tags
          </Label>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_TAGS.map((tag) => (
              <Badge
                key={tag}
                variant={formData.tags.includes(tag) ? 'default' : 'outline'}
                className="cursor-pointer transition-colors"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Attachments */}
        <div className="space-y-2">
          <Label>Attachments</Label>
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
                  className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg text-sm"
                >
                  <Paperclip className="h-3 w-3" />
                  <span className="truncate max-w-[150px]">{att.name}</span>
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="text-muted-foreground hover:text-foreground"
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
            className="w-full border-dashed"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Paperclip className="h-4 w-4 mr-2" />
            )}
            Add Attachments
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-4 flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/tasks')}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
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
