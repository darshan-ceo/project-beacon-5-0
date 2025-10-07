import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Play, 
  Settings, 
  Clock,
  User,
  FileText,
  CheckCircle,
  AlertCircle,
  Save,
  X,
  Workflow,
  Search,
  Filter,
  ChevronDown,
  HelpCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { storageManager } from '@/data/StorageManager';
import { useUnifiedPersistence } from '@/hooks/useUnifiedPersistence';
import { taskTemplatesService } from '@/services/taskTemplatesService';
import { enhancedTaskCreationService } from '@/services/enhancedTaskCreationService';
import type { TaskTemplate } from '@/types/taskTemplate';
import type { TaskBundle, TaskBundleItem } from '@/data/db';
import type { EnhancedTaskBundleWithItems } from '@/types/enhancedTaskBundle';
import { Checkbox } from '@/components/ui/checkbox';

const GST_STAGES = ['Any Stage', 'Notice Received', 'Reply Filed', 'Hearing', 'Order'];
const EMPLOYEE_ROLES = ['Partner', 'Senior Associate', 'Associate', 'Junior Associate', 'Paralegal'];

export const TaskAutomation: React.FC = () => {
  const { initialized } = useUnifiedPersistence();
  const [bundles, setBundles] = useState<EnhancedTaskBundleWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBundle, setEditingBundle] = useState<EnhancedTaskBundleWithItems | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form states for creating/editing
  const [bundleName, setBundleName] = useState('');
  const [bundleTrigger, setBundleTrigger] = useState('');
  const [bundleStages, setBundleStages] = useState<string[]>(['Any Stage']);
  const [bundleItems, setBundleItems] = useState<any[]>([]);
  const [stageScopeOpen, setStageScopeOpen] = useState(false);
  
  // New metadata fields
  const [bundleCode, setBundleCode] = useState('');
  const [linkedModule, setLinkedModule] = useState('');
  const [bundleDescription, setBundleDescription] = useState('');
  const [bundleStatus, setBundleStatus] = useState<'Draft' | 'Active' | 'Archived'>('Draft');
  const [defaultPriority, setDefaultPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  
  // Template selection states
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState('All');

  const loadBundles = useCallback(async () => {
    if (!initialized) {
      console.log('Storage not initialized yet, skipping bundle load');
      return;
    }

    try {
      setIsLoading(true);
      const repository = storageManager.getEnhancedTaskBundleRepository();
      const bundleList = await repository.getAllEnhanced();
      setBundles(bundleList);
    } catch (error) {
      console.error('Failed to load task bundles:', error);
      toast({
        title: "Error",
        description: "Failed to load task bundles. Storage may not be ready.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [initialized]);

  useEffect(() => {
    loadBundles();
  }, [loadBundles]);

  const handleCreateBundle = async () => {
    if (!initialized) {
      toast({
        title: "Not Ready",
        description: "Storage is still initializing. Please wait a moment.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!bundleName || !bundleTrigger) {
        toast({
          title: "Validation Error",
          description: "Bundle name and trigger are required",
          variant: "destructive",
        });
        return;
      }

      const stageCode = bundleStages.includes('Any Stage') ? undefined : bundleStages.join(',');
      
      console.log('Creating bundle with data:', {
        name: bundleName,
        trigger: bundleTrigger,
        stage_code: stageCode,
        items: bundleItems.filter(item => item.title)
      });

      const repository = storageManager.getEnhancedTaskBundleRepository();
      const createdBundle = await repository.createEnhanced({
        name: bundleName,
        trigger: bundleTrigger,
        stage_code: stageCode,
        stages: bundleStages.includes('Any Stage') ? ['Any Stage'] : bundleStages,
        items: bundleItems.filter(item => item.title).map(item => ({
          title: item.title!,
          description: item.description,
          priority: item.priority as 'Critical' | 'High' | 'Medium' | 'Low',
          estimated_hours: item.estimated_hours,
          assigned_role: item.assigned_role || 'Associate',
          category: item.category || 'General',
          due_offset: item.due_offset,
          automation_flags: item.automation_flags,
          order_index: item.order_index || 0
        }))
      });

      console.log('Bundle created successfully:', createdBundle);

      toast({
        title: "Success",
        description: "Task bundle created successfully",
      });

      resetForm();
      loadBundles();
    } catch (error) {
      console.error('Failed to create bundle:', error);
      toast({
        title: "Error",
        description: `Failed to create task bundle: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleUpdateBundle = async () => {
    if (!initialized) {
      toast({
        title: "Not Ready",
        description: "Storage is still initializing. Please wait a moment.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!editingBundle || !bundleName || !bundleTrigger) {
        toast({
          title: "Validation Error",
          description: "Bundle name and trigger are required",
          variant: "destructive",
        });
        return;
      }

      const stageCode = bundleStages.includes('Any Stage') ? undefined : bundleStages.join(',');
      
      const repository = storageManager.getTaskBundleRepository();
      await repository.updateWithItems(editingBundle.id, {
        name: bundleName,
        trigger: bundleTrigger,
        stage_code: stageCode,
        items: bundleItems.filter(item => item.title) as any[]
      });

      toast({
        title: "Success",
        description: "Task bundle updated successfully",
      });

      resetForm();
      loadBundles();
    } catch (error) {
      console.error('Failed to update bundle:', error);
      toast({
        title: "Error",
        description: `Failed to update task bundle: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteBundle = async (bundleId: string) => {
    if (!initialized) {
      toast({
        title: "Not Ready",
        description: "Storage is still initializing. Please wait a moment.",
        variant: "destructive",
      });
      return;
    }

    try {
      const repository = storageManager.getTaskBundleRepository();
      await repository.delete(bundleId);

      toast({
        title: "Success",
        description: "Task bundle deleted successfully",
      });

      loadBundles();
    } catch (error) {
      console.error('Failed to delete bundle:', error);
      toast({
        title: "Error",
        description: `Failed to delete task bundle: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setBundleName('');
    setBundleTrigger('');
    setBundleStages(['Any Stage']);
    setBundleItems([]);
    setEditingBundle(null);
    setIsCreating(false);
    setStageScopeOpen(false);
    setBundleCode('');
    setLinkedModule('');
    setBundleDescription('');
    setBundleStatus('Draft');
    setDefaultPriority('Medium');
    setExpandedTasks(new Set());
  };

  const startEditing = (bundle: EnhancedTaskBundleWithItems) => {
    setEditingBundle(bundle);
    setBundleName(bundle.name);
    setBundleTrigger(bundle.trigger);
    
    // Handle stage conversion: comma-separated string to array
    const stages = bundle.stage_code 
      ? bundle.stage_code.split(',').map(s => s.trim())
      : ['Any Stage'];
    setBundleStages(stages);
    
    setBundleItems(bundle.items || []);
    setBundleCode(bundle.bundle_code || '');
    setLinkedModule(bundle.linked_module || '');
    setBundleDescription(bundle.description || '');
    setBundleStatus(bundle.status || 'Draft');
    setDefaultPriority(bundle.default_priority || 'Medium');
    setIsCreating(true);
  };

  const addTaskItem = () => {
    setBundleItems([...bundleItems, {
      title: '',
      description: '',
      priority: defaultPriority.toLowerCase() as any,
      estimated_hours: 1,
      dependencies: [],
      assigned_role: 'Associate',
      category: 'General',
      trigger_type: 'Manual',
      checklist: [],
      stage: '',
      assigned_user: '',
      trigger_event: ''
    }]);
  };

  const updateTaskItem = (index: number, field: string, value: any) => {
    const updated = [...bundleItems];
    updated[index] = { ...updated[index], [field]: value };
    setBundleItems(updated);
  };

  const removeTaskItem = (index: number) => {
    setBundleItems(bundleItems.filter((_, i) => i !== index));
  };

  const addTaskFromTemplate = async () => {
    if (!initialized) {
      toast({
        title: "Not Ready",
        description: "Storage is still initializing. Please wait a moment.",
        variant: "destructive",
      });
      return;
    }

    try {
      const templateList = await taskTemplatesService.getAll();
      setTemplates(templateList);
      setIsTemplateDialogOpen(true);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast({
        title: "Error",
        description: "Failed to load task templates",
        variant: "destructive",
      });
    }
  };

  const addTasksFromTemplate = async (template: TaskTemplate) => {
    try {
      // Create task item from template
      const newTaskItem: Partial<TaskBundleItem> = {
        title: template.title,
        description: template.description,
        priority: template.priority.toLowerCase() as any,
        estimated_hours: template.estimatedHours,
        template_id: template.id,
        dependencies: []
      };

      setBundleItems(prev => [...prev, newTaskItem]);
      
      // Increment template usage
      await taskTemplatesService.incrementUsage(template.id);
      
      setIsTemplateDialogOpen(false);
      setTemplateSearchTerm('');
      setSelectedTemplateCategory('All');
      
      toast({
        title: "Template Added",
        description: `Task "${template.title}" has been added to the bundle`,
      });
    } catch (error) {
      console.error('Failed to add template:', error);
      toast({
        title: "Error",
        description: "Failed to add template to bundle",
        variant: "destructive",
      });
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(templateSearchTerm.toLowerCase());
    const matchesCategory = selectedTemplateCategory === 'All' || template.category === selectedTemplateCategory;
    return matchesSearch && matchesCategory && template.isActive;
  });

  const templateCategories = ['All', ...Array.from(new Set(templates.map(t => t.category)))];

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-primary text-primary-foreground';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const triggerOptions = [
    { value: 'stage_advance', label: 'Stage Advance' },
    { value: 'hearing_scheduled', label: 'Hearing Scheduled' },
    { value: 'document_received', label: 'Document Received' },
    { value: 'deadline_approaching', label: 'Deadline Approaching' },
    { value: 'manual', label: 'Manual Trigger' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  if (!initialized || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Task Automation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                {!initialized ? "Initializing storage..." : "Loading task bundles..."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Task Automation
            </div>
            <Button 
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2"
              disabled={!initialized}
            >
              <Plus className="h-4 w-4" />
              Create Bundle
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="bundles" className="w-full">
            <TabsList>
              <TabsTrigger value="bundles">Task Bundles</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="bundles" className="space-y-4">
              {bundles.length === 0 ? (
                <div className="text-center py-8">
                  <Workflow className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Task Bundles</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first task bundle to automate task creation
                  </p>
                  <Button 
                    onClick={() => setIsCreating(true)}
                    disabled={!initialized}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Bundle
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {bundles.map((bundle) => (
                    <Card key={bundle.id} className="border-l-4 border-l-primary/30">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{bundle.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {bundle.trigger}
                              </Badge>
                              {bundle.stage_code && (
                                <Badge variant="secondary" className="text-xs">
                                  {bundle.stage_code === 'Any Stage' || !bundle.stage_code 
                                    ? 'Any Stage' 
                                    : bundle.stage_code.split(',').length > 1 
                                      ? `${bundle.stage_code.split(',').length} stages`
                                      : bundle.stage_code
                                  }
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {bundle.items?.length || 0} tasks
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditing(bundle)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBundle(bundle.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {bundle.items && bundle.items.length > 0 && (
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            {bundle.items.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-3 w-3 text-muted-foreground" />
                                <span>{item.title}</span>
                                <Badge variant="outline" className="text-xs">
                                  {item.priority}
                                </Badge>
                              </div>
                            ))}
                            {bundle.items.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{bundle.items.length - 3} more tasks
                              </p>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Bundle Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{bundles.length}</div>
                      <div className="text-sm text-muted-foreground">Total Bundles</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {bundles.reduce((sum, b) => sum + (b.items?.length || 0), 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Tasks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {bundles.filter(b => b.active).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Active Bundles</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Template Selection Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Task Template</DialogTitle>
            <DialogDescription>
              Choose a task template to add to your bundle
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={templateSearchTerm}
                    onChange={(e) => setTemplateSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="w-48">
                <Select value={selectedTemplateCategory} onValueChange={setSelectedTemplateCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {templateCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Templates List */}
            <div className="max-h-96 overflow-y-auto space-y-3">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No templates found</p>
                </div>
              ) : (
                filteredTemplates.map(template => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{template.title}</h4>
                            <Badge variant="outline" className={getPriorityColor(template.priority)}>
                              {template.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {template.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {template.estimatedHours}h
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {template.assignedRole}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {template.category}
                            </Badge>
                          </div>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => addTasksFromTemplate(template)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Bundle Modal */}
      <Dialog open={isCreating} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingBundle ? 'Edit' : 'Create'} Task Bundle</DialogTitle>
            <DialogDescription>
              {editingBundle ? 'Update your task bundle configuration' : 'Create a new task bundle to automate task creation'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 overflow-y-auto max-h-[70vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bundleName">Bundle Name</Label>
                <Input
                  id="bundleName"
                  value={bundleName}
                  onChange={(e) => setBundleName(e.target.value)}
                  placeholder="Enter bundle name"
                />
              </div>
              <div>
                <Label htmlFor="bundleTrigger">Trigger</Label>
                <Select value={bundleTrigger} onValueChange={setBundleTrigger}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Stage Scope</Label>
                <Popover open={stageScopeOpen} onOpenChange={setStageScopeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={stageScopeOpen}
                      className="w-full justify-between"
                    >
                      {bundleStages.includes('Any Stage')
                        ? 'Any Stage'
                        : bundleStages.length > 0 
                          ? `${bundleStages.length} stage(s) selected`
                          : "Select stages..."
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search stages..." />
                      <CommandEmpty>No stages found.</CommandEmpty>
                      <CommandGroup>
                        <CommandList>
                          {taskTemplatesService.getAvailableStages().map((stage) => (
                            <CommandItem
                              key={stage}
                              onSelect={() => {
                                if (stage === 'Any Stage') {
                                  // If selecting "Any Stage", clear all other selections
                                  setBundleStages(['Any Stage']);
                                } else {
                                  // If selecting a specific stage, remove "Any Stage" and toggle the stage
                                  const newStages = bundleStages.filter(s => s !== 'Any Stage');
                                  const stageExists = newStages.includes(stage);
                                  
                                  if (stageExists) {
                                    const filtered = newStages.filter(s => s !== stage);
                                    setBundleStages(filtered.length > 0 ? filtered : ['Any Stage']);
                                  } else {
                                    setBundleStages([...newStages, stage]);
                                  }
                                }
                              }}
                            >
                              <Checkbox 
                                checked={bundleStages.includes(stage)}
                                className="mr-2"
                              />
                              {stage}
                            </CommandItem>
                          ))}
                        </CommandList>
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-4">
                <Label>Tasks in Bundle</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addTaskItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                  <Button variant="outline" size="sm" onClick={addTaskFromTemplate}>
                    <FileText className="h-4 w-4 mr-2" />
                    From Template
                  </Button>
                </div>
              </div>
              
              {/* 📦 Bundle Metadata Section */}
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border-l-4 border-l-primary mb-6">
                <h3 className="font-semibold flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  📦 Bundle Metadata
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bundleCode">
                      Bundle Code <span className="text-muted-foreground text-xs">(Optional)</span>
                    </Label>
                    <Input
                      id="bundleCode"
                      value={bundleCode}
                      onChange={(e) => setBundleCode(e.target.value)}
                      placeholder="e.g., NIW001"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="linkedModule">
                      Linked Module
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 ml-1 inline" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Connects this task bundle to its functional area in the system
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Select value={linkedModule} onValueChange={setLinkedModule}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select module (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        <SelectItem value="notice_inward_wizard">Notice Inward Wizard</SelectItem>
                        <SelectItem value="case_management">Case Management</SelectItem>
                        <SelectItem value="hearings">Hearings</SelectItem>
                        <SelectItem value="documents">Document Management</SelectItem>
                        <SelectItem value="reports">Reports</SelectItem>
                        <SelectItem value="client_portal">Client Portal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="bundleStatus">Status</Label>
                    <Select value={bundleStatus} onValueChange={(v: any) => setBundleStatus(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="defaultPriority">Default Priority</Label>
                    <Select value={defaultPriority} onValueChange={(v: any) => setDefaultPriority(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="bundleDescription">Bundle Description</Label>
                  <Textarea
                    id="bundleDescription"
                    value={bundleDescription}
                    onChange={(e) => setBundleDescription(e.target.value)}
                    placeholder="Explain the purpose of this task bundle..."
                    rows={3}
                  />
                </div>
              </div>

              {/* 🧱 Sub-Tasks Section */}
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border-l-4 border-l-blue-500">
                <h3 className="font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  🧱 Sub-Tasks in Bundle
                </h3>
                
                {bundleItems.map((item, index) => (
                  <Collapsible 
                    key={index}
                    open={expandedTasks.has(index)}
                    onOpenChange={(isOpen) => {
                      const newExpanded = new Set(expandedTasks);
                      if (isOpen) newExpanded.add(index);
                      else newExpanded.delete(index);
                      setExpandedTasks(newExpanded);
                    }}
                  >
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Task {index + 1}</span>
                            {item.template_id && (
                              <Badge variant="outline">
                                <FileText className="h-3 w-3 mr-1" />
                                From Template
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <ChevronDown className={`h-4 w-4 transition-transform ${expandedTasks.has(index) ? 'rotate-180' : ''}`} />
                              </Button>
                            </CollapsibleTrigger>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTaskItem(index)}
                              className="text-destructive hover:text-destructive/90"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Task Title *</Label>
                            <Input
                              value={item.title || ''}
                              onChange={(e) => updateTaskItem(index, 'title', e.target.value)}
                              placeholder="Enter task title"
                            />
                          </div>
                          <div>
                            <Label>Priority</Label>
                            <Select 
                              value={item.priority || defaultPriority.toLowerCase()} 
                              onValueChange={(value) => updateTaskItem(index, 'priority', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {priorityOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <CollapsibleContent className="space-y-4 mt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Stage</Label>
                              <Select 
                                value={item.stage || ''} 
                                onValueChange={(value) => updateTaskItem(index, 'stage', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select stage (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">None</SelectItem>
                                  {GST_STAGES.map(stage => (
                                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label>Assigned Role</Label>
                              <Select 
                                value={item.assigned_role || 'Associate'} 
                                onValueChange={(value) => updateTaskItem(index, 'assigned_role', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {EMPLOYEE_ROLES.map(role => (
                                    <SelectItem key={role} value={role}>{role}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label>Assigned User <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                              <Input
                                value={item.assigned_user || ''}
                                onChange={(e) => updateTaskItem(index, 'assigned_user', e.target.value)}
                                placeholder="Specific user email/ID"
                              />
                            </div>
                            
                            <div>
                              <Label>
                                Trigger Type
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <HelpCircle className="h-3 w-3 ml-1 inline" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Defines how the task starts (manual, auto, or event)
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </Label>
                              <Select 
                                value={item.trigger_type || 'Manual'} 
                                onValueChange={(value) => updateTaskItem(index, 'trigger_type', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Manual">Manual</SelectItem>
                                  <SelectItem value="Automatic">Automatic</SelectItem>
                                  <SelectItem value="Event">Event</SelectItem>
                                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label>
                                Trigger Event
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <HelpCircle className="h-3 w-3 ml-1 inline" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Specify the system event that triggers this task
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </Label>
                              <Input
                                value={item.trigger_event || ''}
                                onChange={(e) => updateTaskItem(index, 'trigger_event', e.target.value)}
                                placeholder="e.g., onNoticeUpload"
                              />
                            </div>
                            
                            <div>
                              <Label>Estimated Hours</Label>
                              <Input
                                type="number"
                                value={item.estimated_hours || 1}
                                onChange={(e) => updateTaskItem(index, 'estimated_hours', parseInt(e.target.value) || 1)}
                                min="1"
                              />
                            </div>
                            
                            <div>
                              <Label>
                                Dependency
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <HelpCircle className="h-3 w-3 ml-1 inline" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Select a previous task that must be completed first
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </Label>
                              <Select 
                                value={item.dependencies?.[0] || ''} 
                                onValueChange={(value) => updateTaskItem(index, 'dependencies', value ? [value] : [])}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select dependency (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">None</SelectItem>
                                  {bundleItems
                                    .filter((_, idx) => idx < index && bundleItems[idx].title)
                                    .map((depItem, idx) => (
                                      <SelectItem key={idx} value={depItem.title || `task-${idx}`}>
                                        Task {idx + 1}: {depItem.title}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label>Category</Label>
                              <Input
                                value={item.category || 'General'}
                                onChange={(e) => updateTaskItem(index, 'category', e.target.value)}
                                placeholder="Task category"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label>Description</Label>
                            <Textarea
                              value={item.description || ''}
                              onChange={(e) => updateTaskItem(index, 'description', e.target.value)}
                              placeholder="Enter task description"
                              rows={2}
                            />
                          </div>
                          
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label>Checklist (Optional Sub-Steps)</Label>
                              <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={() => {
                                  const checklist = item.checklist || [];
                                  updateTaskItem(index, 'checklist', [...checklist, '']);
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Step
                              </Button>
                            </div>
                            {(item.checklist || []).length > 0 && (
                              <div className="space-y-2">
                                {(item.checklist || []).map((checkItem, checkIdx) => (
                                  <div key={checkIdx} className="flex gap-2">
                                    <Input
                                      value={checkItem}
                                      onChange={(e) => {
                                        const newChecklist = [...(item.checklist || [])];
                                        newChecklist[checkIdx] = e.target.value;
                                        updateTaskItem(index, 'checklist', newChecklist);
                                      }}
                                      placeholder={`Step ${checkIdx + 1}`}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      type="button"
                                      onClick={() => {
                                        const newChecklist = (item.checklist || []).filter((_, i) => i !== checkIdx);
                                        updateTaskItem(index, 'checklist', newChecklist);
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </CardContent>
                    </Card>
                  </Collapsible>
                ))}
                
                {bundleItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No tasks added yet. Click "Add Task" or "From Template" to begin.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button 
                onClick={editingBundle ? handleUpdateBundle : handleCreateBundle}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {editingBundle ? 'Update' : 'Create'} Bundle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};