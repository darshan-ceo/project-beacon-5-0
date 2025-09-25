/**
 * Task Automation - Bundle management with unified store integration
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Edit,
  Trash2,
  Play,
  Settings,
  CheckCircle,
  AlertCircle,
  Save,
  X,
  Workflow,
  Search,
  Filter
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useWriteThroughServices } from '@/hooks/useWriteThroughServices';
import { taskTemplatesService } from '@/services/taskTemplatesService';
import type { TaskTemplate, TaskBundle } from '@/persistence/unifiedStore';

export const TaskAutomation: React.FC = () => {
  const { services, isReady } = useWriteThroughServices();
  const [bundles, setBundles] = useState<TaskBundle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBundle, setEditingBundle] = useState<TaskBundle | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form states for creating/editing
  const [bundleName, setBundleName] = useState('');
  const [bundleTrigger, setBundleTrigger] = useState('');
  const [bundleStage, setBundleStage] = useState('');
  const [bundleTasks, setBundleTasks] = useState<TaskTemplate[]>([]);
  
  // Template selection states
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState('All');

  // Initialize bundles on load
  useEffect(() => {
    if (!isReady) return;
    
    loadBundles();
  }, [isReady]);

  const loadBundles = async () => {
    setIsLoading(true);
    try {
      const allBundles = await services.taskBundles.getAll();
      setBundles(allBundles.data || []);
    } catch (error) {
      console.error('Failed to load task bundles:', error);
      toast({
        title: "Error",
        description: "Failed to load task bundles",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load templates for selection
  const loadTemplates = async () => {
    try {
      const allTemplates = await taskTemplatesService.getAll();
      setTemplates(allTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates([]);
    }
  };

  const handleCreateNew = () => {
    resetForm();
    setIsCreating(true);
    loadTemplates();
  };

  const handleCancel = () => {
    resetForm();
  };

  const resetForm = () => {
    setBundleName('');
    setBundleTrigger('');
    setBundleStage('');
    setBundleTasks([]);
    setEditingBundle(null);
    setIsCreating(false);
  };

  const handleEditBundle = (bundle: TaskBundle) => {
    setBundleName(bundle.name);
    setBundleTrigger(bundle.triggerType);
    setBundleStage(bundle.stageKey);
    setBundleTasks(bundle.tasks || []);
    setEditingBundle(bundle);
    setIsCreating(true);
    loadTemplates();
  };

  const handleSaveBundle = async () => {
    if (!bundleName.trim() || bundleTasks.length === 0) {
      toast({ title: "Error", description: "Please fill in all required fields and add at least one task", variant: "destructive" });
      return;
    }

    try {
      const bundleData: TaskBundle = {
        id: editingBundle?.id || `bundle-${Date.now()}`,
        name: bundleName,
        description: '',
        stageKey: bundleStage,
        triggerType: bundleTrigger as TaskBundle['triggerType'],
        isActive: true,
        tasks: bundleTasks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingBundle) {
        await services.taskBundles.update(editingBundle.id, bundleData);
      } else {
        await services.taskBundles.create(bundleData);
      }

      await loadBundles();
      resetForm();
      
      toast({
        title: "Success",
        description: `Bundle ${editingBundle ? 'updated' : 'created'} successfully`,
      });
    } catch (error) {
      console.error('Failed to save bundle:', error);
      toast({
        title: "Error",
        description: "Failed to save bundle",
        variant: "destructive"
      });
    }
  };

  const addTask = (template: TaskTemplate) => {
    setBundleTasks([...bundleTasks, template]);
  };

  const removeTask = (index: number) => {
    setBundleTasks(bundleTasks.filter((_, i) => i !== index));
  };

  const handleDeleteBundle = async (bundleId: string) => {
    try {
      await services.taskBundles.delete(bundleId);
      await loadBundles();
      
      toast({
        title: "Success",
        description: "Bundle deleted successfully",
      });
    } catch (error) {
      console.error('Failed to delete bundle:', error);
      toast({
        title: "Error",
        description: "Failed to delete bundle",
        variant: "destructive"
      });
    }
  };

  const handleExecuteBundle = async (bundleId: string, tasks: TaskTemplate[]) => {
    try {
      // Mock execution - in real implementation would call services.taskBundles.execute
      toast({
        title: "Bundle Executed",
        description: `Created ${tasks.length} tasks from bundle`,
      });
    } catch (error) {
      console.error('Failed to execute bundle:', error);
      toast({
        title: "Error",
        description: "Failed to execute bundle",
        variant: "destructive"
      });
    }
  };

  // Filter templates for display
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(templateSearchTerm.toLowerCase());
    const matchesCategory = selectedTemplateCategory === 'All' || template.category === selectedTemplateCategory;
    return matchesSearch && matchesCategory;
  });

  const templateCategories = ['All', ...Array.from(new Set(templates.map(t => t.category)))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center space-y-2">
          <div className="text-sm text-muted-foreground">Loading task automation...</div>
          <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-pulse rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Task Automation</h2>
          <p className="text-muted-foreground">Manage automated task bundles for stage transitions</p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create Bundle
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bundles</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bundles.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bundles</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {bundles.filter(b => b.isActive).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manual Triggers</CardTitle>
            <Settings className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {bundles.filter(b => b.triggerType === 'manual').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto Triggers</CardTitle>
            <Play className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">
              {bundles.filter(b => b.triggerType === 'stage_entry').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="bundles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="bundles">Task Bundles</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="bundles" className="space-y-6">
          {/* Bundle List */}
          <div className="grid gap-4">
            {bundles.map((bundle) => (
              <Card key={bundle.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{bundle.name}</h3>
                      <Badge variant="secondary" className="ml-2">
                        {bundle.triggerType}
                      </Badge>
                      <Badge variant="outline" className="ml-2">
                        {bundle.stageKey || 'Any Stage'}
                      </Badge>
                      <Badge 
                        variant={bundle.stageKey ? 'default' : 'secondary'}
                        className="ml-2"
                      >
                        {bundle.stageKey ? `Stage: ${bundle.stageKey}` : 'All Stages'}
                      </Badge>
                      
                      <div className="text-xs text-muted-foreground mt-1">
                        {bundle.tasks?.length || 0} task(s)
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-3">
                      {bundle.description || 'No description provided'}
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Tasks in this bundle:</p>
                      {bundle.tasks && bundle.tasks.length > 0 ? (
                        <div className="space-y-1">
                          {bundle.tasks.map((task, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                              <span>{task.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {task.priority}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No tasks defined</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <div className="flex items-center gap-1">
                      <CheckCircle 
                        className={`h-4 w-4 ${bundle.isActive ? 'text-success' : 'text-muted-foreground'}`}
                      />
                      <span className="text-sm text-muted-foreground">
                        {bundle.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleExecuteBundle(bundle.id, bundle.tasks || [])}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Execute
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditBundle(bundle)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Bundle</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this bundle? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteBundle(bundle.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            ))}

            {bundles.length === 0 && (
              <Card className="p-12 text-center">
                <Workflow className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Task Bundles</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first task bundle for automation
                </p>
                <Button onClick={handleCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Bundle
                </Button>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Templates</CardTitle>
              <CardDescription>
                Manage task templates that can be added to bundles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Template management functionality will be available soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Bundle Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingBundle ? 'Edit Bundle' : 'Create New Bundle'}
            </DialogTitle>
            <DialogDescription>
              Configure automated task creation for specific triggers and stages
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bundle Configuration */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="bundleName">Bundle Name</Label>
                <Input
                  id="bundleName"
                  value={bundleName}
                  onChange={(e) => setBundleName(e.target.value)}
                  placeholder="Enter bundle name..."
                />
              </div>

              <div>
                <Label htmlFor="bundleTrigger">Trigger Type</Label>
                <Select value={bundleTrigger} onValueChange={setBundleTrigger}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="stage_entry">Stage Entry</SelectItem>
                    <SelectItem value="stage_exit">Stage Exit</SelectItem>
                    <SelectItem value="time_based">Time Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bundleStage">Target Stage</Label>
                <Select value={bundleStage} onValueChange={setBundleStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any Stage</SelectItem>
                    <SelectItem value="Scrutiny">Scrutiny</SelectItem>
                    <SelectItem value="Demand">Demand</SelectItem>
                    <SelectItem value="Adjudication">Adjudication</SelectItem>
                    <SelectItem value="Appeals">Appeals</SelectItem>
                    <SelectItem value="GSTAT">GSTAT</SelectItem>
                    <SelectItem value="HC">HC</SelectItem>
                    <SelectItem value="SC">SC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Bundle Tasks ({bundleTasks.length})</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {bundleTasks.map((task, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{task.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTask(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {bundleTasks.length === 0 && (
                    <p className="text-sm text-muted-foreground p-2 text-center">
                      No tasks added yet
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => setIsTemplateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task Template
                </Button>
              </div>
            </div>

            {/* Task Preview */}
            <div className="space-y-4">
              <div>
                <Label>Task Preview</Label>
                <div className="border rounded-lg p-4 bg-muted/50 max-h-80 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    {bundleTasks.map((task, index) => (
                      <Card key={index} className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              {task.priority}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {task.estimatedHours}h
                            </span>
                          </div>
                          <h4 className="font-medium text-sm">{task.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {task.description}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  {bundleTasks.length === 0 && (
                    <div className="text-center py-8">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Add task templates to see preview
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSaveBundle}>
              <Save className="h-4 w-4 mr-2" />
              {editingBundle ? 'Update Bundle' : 'Create Bundle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Selection Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Add Task Template</DialogTitle>
            <DialogDescription>
              Select templates to add to your bundle
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={templateSearchTerm}
                    onChange={(e) => setTemplateSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedTemplateCategory} onValueChange={setSelectedTemplateCategory}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
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

            {/* Templates List */}
            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{template.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {template.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{template.priority}</Badge>
                      </TableCell>
                      <TableCell>{template.estimatedHours}h</TableCell>
                      <TableCell>{template.category}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addTask(template)}
                          disabled={bundleTasks.some(t => t.id === template.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredTemplates.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No templates found matching your criteria
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsTemplateDialogOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};