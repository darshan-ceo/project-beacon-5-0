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
  Filter
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { storageManager } from '@/data/StorageManager';
import { useWriteThroughServices } from '@/hooks/useWriteThroughServices';
import { taskTemplatesService } from '@/services/taskTemplatesService';
import type { TaskTemplate } from '@/types/taskTemplate';
import type { TaskBundle, TaskBundleItem } from '@/data/db';

interface TaskBundleWithItems extends TaskBundle {
  items: TaskBundleItem[];
}

export const TaskAutomation: React.FC = () => {
  const { services, isReady } = useWriteThroughServices();
  const [bundles, setBundles] = useState<TaskBundleWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBundle, setEditingBundle] = useState<TaskBundleWithItems | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form states for creating/editing
  const [bundleName, setBundleName] = useState('');
  const [bundleTrigger, setBundleTrigger] = useState('');
  const [bundleStage, setBundleStage] = useState('');
  const [bundleItems, setBundleItems] = useState<Partial<TaskBundleItem>[]>([]);
  
  // Template selection states
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState('All');

  const loadBundles = useCallback(async () => {
    if (!isReady()) {
      console.log('Storage not initialized yet, skipping bundle load');
      return;
    }

    try {
      setIsLoading(true);
      const repo = services.taskBundles;
      const response = await repo.getAll();
      setBundles(response.data as unknown as TaskBundleWithItems[]);
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
  }, [isReady]);

  useEffect(() => {
    loadBundles();
  }, [loadBundles]);

  const handleCreateBundle = async () => {
    if (!isReady()) {
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

      console.log('Creating bundle with data:', {
        name: bundleName,
        trigger: bundleTrigger,
        stage_code: bundleStage || undefined,
        items: bundleItems.filter(item => item.title)
      });

      const response = await services.taskBundles.create({
        name: bundleName,
        description: `Task bundle for ${bundleTrigger}`,
        triggerType: bundleTrigger as 'manual' | 'stage_entry' | 'stage_exit' | 'time_based',
        stageKey: bundleStage || undefined,
        isActive: true,
        tasks: bundleItems.filter(item => item.title) as any[]
      });

      console.log('Bundle created successfully:', response.data);

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
    if (!isReady()) {
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

      await services.taskBundles.update(editingBundle.id, {
        name: bundleName,
        description: `Task bundle for ${bundleTrigger}`,
        triggerType: bundleTrigger as 'manual' | 'stage_entry' | 'stage_exit' | 'time_based',
        stageKey: bundleStage || undefined,
        isActive: true,
        tasks: bundleItems.filter(item => item.title) as any[]
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
    if (!isReady()) {
      toast({
        title: "Not Ready",
        description: "Storage is still initializing. Please wait a moment.",
        variant: "destructive",
      });
      return;
    }

    try {
      await services.taskBundles.delete(bundleId);

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
    setBundleStage('');
    setBundleItems([]);
    setEditingBundle(null);
    setIsCreating(false);
  };

  const startEditing = (bundle: TaskBundleWithItems) => {
    setEditingBundle(bundle);
    setBundleName(bundle.name);
    setBundleTrigger(bundle.trigger);
    setBundleStage(bundle.stage_code || '');
    setBundleItems(bundle.items || []);
    setIsCreating(true);
  };

  const addTaskItem = () => {
    setBundleItems([...bundleItems, {
      title: '',
      description: '',
      priority: 'medium',
      estimated_hours: 1,
      dependencies: []
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
    if (!isReady()) {
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

  if (!isReady() || isLoading) {
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
                {!isReady() ? "Initializing storage..." : "Loading task bundles..."}
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
              disabled={!isReady()}
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
                    disabled={!isReady()}
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
                                  {bundle.stage_code}
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
                <Label htmlFor="bundleStage">Stage (Optional)</Label>
                <Input
                  id="bundleStage"
                  value={bundleStage}
                  onChange={(e) => setBundleStage(e.target.value)}
                  placeholder="Specific stage (optional)"
                />
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
              
              <div className="space-y-4">
                {bundleItems.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Task Title</Label>
                          <div className="flex gap-2">
                            <Input
                              value={item.title || ''}
                              onChange={(e) => updateTaskItem(index, 'title', e.target.value)}
                              placeholder="Enter task title"
                              className="flex-1"
                            />
                            {item.template_id && (
                              <Badge variant="outline" className="shrink-0">
                                <FileText className="h-3 w-3 mr-1" />
                                Template
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label>Priority</Label>
                          <Select 
                            value={item.priority || 'medium'} 
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
                        <div className="md:col-span-2">
                          <Label>Description</Label>
                          <Textarea
                            value={item.description || ''}
                            onChange={(e) => updateTaskItem(index, 'description', e.target.value)}
                            placeholder="Enter task description"
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label>Estimated Hours</Label>
                          <Input
                            type="number"
                            value={item.estimated_hours || 1}
                            onChange={(e) => updateTaskItem(index, 'estimated_hours', parseInt(e.target.value))}
                            min="1"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTaskItem(index)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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