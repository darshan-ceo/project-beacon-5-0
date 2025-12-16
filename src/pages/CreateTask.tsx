import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Paperclip, 
  X, 
  Loader2,
  Calendar,
  User,
  Flag,
  Tag,
  FileText,
  Clock,
  Sparkles,
  Briefcase,
  Link2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { EmployeeCombobox } from '@/components/ui/employee-combobox';
import { TemplatePickerDialog } from '@/components/tasks/TemplatePickerDialog';
import { TaskTemplate } from '@/types/taskTemplate';
import { SearchableClientSelector } from '@/components/ui/searchable-client-selector';
import { CaseSelector } from '@/components/ui/relationship-selector';

const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];
const DEFAULT_TAGS = ['Urgent', 'Review', 'Follow-up', 'Documentation', 'Client'];

export const CreateTask: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, dispatch } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read case context from URL params
  const caseId = searchParams.get('caseId') || '';
  const clientId = searchParams.get('clientId') || '';
  const caseNumber = searchParams.get('caseNumber') || '';

  // Find case and client details for display
  const linkedCase = caseId ? state.cases.find(c => c.id === caseId) : null;
  const linkedClient = clientId ? state.clients.find(c => c.id === clientId) : null;

  // Optional client/case selection state (when not creating from case context)
  const [selectedClientId, setSelectedClientId] = useState(clientId || '');
  const [selectedCaseId, setSelectedCaseId] = useState(caseId || '');

  // Filter cases by selected client
  const availableCases = selectedClientId 
    ? state.cases.filter(c => c.clientId === selectedClientId)
    : state.cases;

  // Find selected case and client for display
  const selectedCase = selectedCaseId ? state.cases.find(c => c.id === selectedCaseId) : null;
  const selectedClient = selectedClientId ? state.clients.find(c => c.id === selectedClientId) : null;

  // Handle client change - reset case when client changes
  const handleClientChange = (newClientId: string) => {
    setSelectedClientId(newClientId);
    setSelectedCaseId(''); // Reset case when client changes
  };

  // Default due date to tomorrow (current date + 1)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'Medium',
    dueDate: tomorrow as Date | undefined,
    tags: [] as string[],
    estimatedHours: '',
  });
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newAttachments: TaskAttachment[] = [];

    // Get tenant ID for file path prefix
    const { data: { user } } = await supabase.auth.getUser();
    const profile = state.employees.find((emp) => emp.id === user?.id);
    const tenantId = user?.user_metadata?.tenant_id || profile?.tenantId;

    if (!tenantId) {
      toast.error('Unable to determine tenant. Please refresh and try again.');
      setIsUploading(false);
      return;
    }

    for (const file of Array.from(files)) {
      try {
        const fileName = `${Date.now()}-${file.name}`;
        // Include tenant_id prefix for RLS compliance
        const filePath = `${tenantId}/task-attachments/${fileName}`;

        const { data, error } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (error) throw error;

        // Use signed URL for private bucket
        const { data: urlData } = await supabase.storage
          .from('documents')
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        newAttachments.push({
          id: data.path,
          name: file.name,
          url: urlData?.signedUrl || '',
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

  const handleTemplateSelect = (template: TaskTemplate) => {
    setFormData((prev) => ({
      ...prev,
      title: template.title,
      description: template.description,
      priority: template.priority,
      estimatedHours: template.estimatedHours.toString(),
    }));
    toast.success('Template applied');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-destructive text-destructive-foreground';
      case 'High': return 'bg-warning text-warning-foreground';
      case 'Medium': return 'bg-primary text-primary-foreground';
      case 'Low': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
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

      // Get tenantId from user metadata (primary) or profile (fallback)
      const profile = state.employees.find((e) => e.id === user.id);
      const tenantId = user.user_metadata?.tenant_id || profile?.tenantId;
      const userName = profile?.full_name || user.email || 'User';

      if (!tenantId) {
        toast.error('Unable to determine tenant. Please refresh and try again.');
        return;
      }

      const assignee = state.employees.find((e) => e.id === formData.assignedTo);

      // Use selected values or URL params
      const effectiveCaseId = selectedCaseId || caseId || null;
      const effectiveClientId = selectedClientId || clientId || null;
      const effectiveCaseNumber = selectedCase?.caseNumber || caseNumber || null;

      // Create task in Supabase with required tenant_id and assigned_by
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert([{
          tenant_id: tenantId,
          title: formData.title.trim(),
          description: formData.description.trim(),
          assigned_to: formData.assignedTo || null,
          assigned_by: user.id,
          priority: formData.priority,
          due_date: formData.dueDate ? format(formData.dueDate, 'yyyy-MM-dd') : null,
          status: 'Not Started',
          case_id: effectiveCaseId,
          client_id: effectiveClientId,
          case_number: effectiveCaseNumber,
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
          caseId: effectiveCaseId || '',
          clientId: effectiveClientId || '',
          caseNumber: effectiveCaseNumber || '',
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
      <div className="border-b bg-card px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => caseId ? navigate(`/cases?caseId=${caseId}`) : navigate('/tasks')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Create New Task</h1>
            {linkedCase && (
              <p className="text-xs text-muted-foreground">
                For case: {linkedCase.caseNumber || linkedCase.title}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTemplatePicker(true)}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Use Template
        </Button>
      </div>

      {/* Template Picker Dialog */}
      <TemplatePickerDialog
        open={showTemplatePicker}
        onOpenChange={setShowTemplatePicker}
        onSelectTemplate={handleTemplateSelect}
      />

      {/* Form - Clean Linear Layout */}
      <div className="flex-1 overflow-auto bg-muted/20">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {/* Case Context Card - Show when creating from case */}
          {linkedCase && (
            <div className="bg-primary/5 rounded-xl border border-primary/20 p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Linked to Case
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {linkedCase.caseNumber} • {linkedClient?.name || 'Unknown Client'}
                </p>
              </div>
            </div>
          )}

          {/* Task Linkage Card - Optional Client/Case Selection (show when NOT from case context) */}
          {!linkedCase && (
            <div className="bg-muted/20 rounded-xl border border-border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Link2 className="h-4 w-4" />
                  Link to Case (Optional)
                </div>
                {(selectedClientId || selectedCaseId) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setSelectedClientId(''); setSelectedCaseId(''); }}
                    className="h-7 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" /> Clear
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Client
                  </Label>
                  <SearchableClientSelector
                    clients={state.clients.map(c => ({
                      id: c.id,
                      name: c.name || (c as any).display_name || '',
                      display_name: c.name || (c as any).display_name,
                      email: c.email,
                      phone: c.phone,
                      gstin: c.gstin,
                    }))}
                    value={selectedClientId}
                    onValueChange={handleClientChange}
                  />
                </div>
                
                {/* Case Selector - Filters based on selected client */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" />
                    Case {selectedClientId && availableCases.length === 0 && (
                      <span className="text-xs text-muted-foreground/70">(No cases for this client)</span>
                    )}
                  </Label>
                  <CaseSelector
                    cases={availableCases}
                    value={selectedCaseId}
                    onValueChange={setSelectedCaseId}
                    disabled={availableCases.length === 0}
                  />
                </div>
              </div>
              
              {/* Selected Case Context Badge */}
              {selectedCase && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 rounded-lg p-2.5">
                  <Briefcase className="h-3.5 w-3.5 text-primary" />
                  <span>Linked to:</span>
                  <Badge variant="outline" className="text-xs font-medium">
                    {selectedCase.caseNumber}
                  </Badge>
                  {selectedCase.currentStage && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span>{selectedCase.currentStage}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Main Form Card */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-6">
            {/* Title - Primary Focus */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Task Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="What needs to be done?"
                className="text-lg font-medium h-12 bg-muted/30 border-border focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Add more details about this task..."
                className="min-h-[120px] resize-none bg-muted/20 border-border focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          </div>

          {/* Quick Settings Card */}
          <div className="bg-muted/30 rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Flag className="h-4 w-4" />
              Task Settings
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Assignee with Combobox */}
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Assignee
              </Label>
              <EmployeeCombobox
                employees={state.employees}
                value={formData.assignedTo}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, assignedTo: val }))}
                placeholder="Select assignee..."
                className="h-9"
              />
            </div>

            {/* Priority with visual badges */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Flag className="h-3.5 w-3.5" />
                Priority
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITY_OPTIONS.map((p) => (
                  <Badge
                    key={p}
                    variant={formData.priority === p ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer transition-all text-xs px-2 py-1',
                      formData.priority === p ? getPriorityColor(p) : 'hover:bg-muted'
                    )}
                    onClick={() => setFormData((prev) => ({ ...prev, priority: p }))}
                  >
                    {p}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Estimated Hours */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Est. Hours
              </Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={formData.estimatedHours}
                onChange={(e) => setFormData((prev) => ({ ...prev, estimatedHours: e.target.value }))}
                placeholder="0"
                className="h-9"
              />
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
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
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            </div>
          </div>

          {/* Tags Card */}
          <div className="bg-muted/20 rounded-xl border border-border p-5 space-y-3">
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Tags
            </Label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={formData.tags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer transition-all hover:scale-105 px-3 py-1"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Attachments Card */}
          <div className="bg-muted/10 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors p-5 space-y-3">
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
                    className="flex items-center gap-2 bg-card border border-border px-3 py-2 rounded-lg text-sm group shadow-sm"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate max-w-[150px]">{att.name}</span>
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full h-14 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Paperclip className="h-5 w-5 mr-2" />
              )}
              {attachments.length > 0 ? 'Add More Files' : 'Click to attach files'}
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
