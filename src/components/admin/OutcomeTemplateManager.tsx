import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Copy, 
  Save, 
  X, 
  GripVertical,
  AlertCircle,
  Download,
  Upload,
  RotateCcw,
  ListTodo,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { outcomeTemplateManager } from '@/services/outcomeTemplateManager';
import { HearingOutcomeTemplate, OutcomeTaskTemplate } from '@/services/hearingOutcomeTemplates';
import { cn } from '@/lib/utils';

export const OutcomeTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<HearingOutcomeTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<HearingOutcomeTemplate | null>(null);
  const [editMode, setEditMode] = useState<'view' | 'edit' | 'create'>('view');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState<HearingOutcomeTemplate>({
    outcomeType: '',
    description: '',
    tasks: []
  });

  useEffect(() => {
    refreshTemplates();
  }, []);

  const refreshTemplates = () => {
    const allTemplates = outcomeTemplateManager.getAllTemplates();
    setTemplates(allTemplates);
  };

  const handleCreateNew = () => {
    setFormData({
      outcomeType: '',
      description: '',
      tasks: []
    });
    setSelectedTemplate(null);
    setEditMode('create');
  };

  const handleEdit = (template: HearingOutcomeTemplate) => {
    const isCustom = outcomeTemplateManager.isCustomTemplate(template.outcomeType);
    
    if (!isCustom) {
      toast({
        title: "Cannot Edit Default Template",
        description: "Please clone this template first to create a custom version",
        variant: "destructive"
      });
      return;
    }

    setFormData({ ...template, tasks: [...template.tasks] });
    setSelectedTemplate(template);
    setEditMode('edit');
  };

  const handleClone = (template: HearingOutcomeTemplate) => {
    const newOutcomeType = `${template.outcomeType} (Copy)`;
    
    try {
      outcomeTemplateManager.cloneTemplate(template.outcomeType, newOutcomeType);
      refreshTemplates();
    } catch (error) {
      toast({
        title: "Clone Failed",
        description: error instanceof Error ? error.message : 'Failed to clone template',
        variant: "destructive"
      });
    }
  };

  const handleDelete = () => {
    if (!selectedTemplate) return;

    try {
      outcomeTemplateManager.deleteTemplate(selectedTemplate.outcomeType);
      refreshTemplates();
      setSelectedTemplate(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : 'Failed to delete template',
        variant: "destructive"
      });
    }
  };

  const handleSave = () => {
    if (!formData.outcomeType.trim()) {
      toast({
        title: "Validation Error",
        description: "Outcome type is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Description is required",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editMode === 'create') {
        outcomeTemplateManager.createTemplate(formData);
      } else if (editMode === 'edit' && selectedTemplate) {
        outcomeTemplateManager.updateTemplate(selectedTemplate.outcomeType, formData);
      }
      
      refreshTemplates();
      setEditMode('view');
      setSelectedTemplate(null);
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : 'Failed to save template',
        variant: "destructive"
      });
    }
  };

  const handleAddTask = () => {
    const newTask: OutcomeTaskTemplate = {
      title: 'New Task',
      description: 'Task description',
      priority: 'Medium',
      dueInDays: 7,
      stage: 'General',
      estimatedHours: 2
    };

    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, newTask]
    }));
  };

  const handleUpdateTask = (index: number, updates: Partial<OutcomeTaskTemplate>) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map((task, i) => i === index ? { ...task, ...updates } : task)
    }));
  };

  const handleRemoveTask = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index)
    }));
  };

  const handleMoveTask = (fromIndex: number, toIndex: number) => {
    const tasks = [...formData.tasks];
    const [movedTask] = tasks.splice(fromIndex, 1);
    tasks.splice(toIndex, 0, movedTask);
    
    setFormData(prev => ({ ...prev, tasks }));
  };

  const handleExport = () => {
    const exported = outcomeTemplateManager.exportTemplates();
    const blob = new Blob([exported], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'outcome-templates.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        outcomeTemplateManager.importTemplates(content);
        refreshTemplates();
      } catch (error) {
        // Error toast handled in manager
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to delete all custom templates? This cannot be undone.')) {
      outcomeTemplateManager.resetToDefaults();
      refreshTemplates();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Outcome Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage hearing outcome templates and auto-generated action items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => document.getElementById('template-import')?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <input
            id="template-import"
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Default templates cannot be modified directly. Clone them to create custom versions that can be edited.
        </AlertDescription>
      </Alert>

      {/* Template List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {templates.map((template) => {
          const isCustom = outcomeTemplateManager.isCustomTemplate(template.outcomeType);
          
          return (
            <Card key={template.outcomeType} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{template.outcomeType}</CardTitle>
                      <Badge variant={isCustom ? "default" : "secondary"} className="text-xs">
                        {isCustom ? "Custom" : "Default"}
                      </Badge>
                    </div>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ListTodo className="h-4 w-4" />
                  <span>{template.tasks.length} task{template.tasks.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="flex items-center gap-2">
                  {isCustom && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(template)}>
                        <Edit2 className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    </>
                  )}
                  {!isCustom && (
                    <Button size="sm" variant="outline" onClick={() => handleClone(template)}>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Clone
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={editMode !== 'view'} onOpenChange={() => setEditMode('view')}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editMode === 'create' ? 'Create Outcome Template' : 'Edit Outcome Template'}
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-6 overflow-y-auto">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Outcome Type <span className="text-destructive">*</span></Label>
                <Input
                  value={formData.outcomeType}
                  onChange={(e) => setFormData(prev => ({ ...prev, outcomeType: e.target.value }))}
                  placeholder="e.g., 'Final Order', 'Case Dismissed'"
                  disabled={editMode === 'edit'}
                />
              </div>

              <div className="space-y-2">
                <Label>Description <span className="text-destructive">*</span></Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe when this outcome applies"
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Tasks Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Action Items</Label>
                <Button size="sm" onClick={handleAddTask}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Task
                </Button>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {formData.tasks.map((task, index) => (
                    <Card key={index} className="border-2">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                            <span className="text-sm font-medium text-muted-foreground">
                              Task {index + 1}
                            </span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleRemoveTask(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2 space-y-2">
                            <Label>Title</Label>
                            <Input
                              value={task.title}
                              onChange={(e) => handleUpdateTask(index, { title: e.target.value })}
                              placeholder="Task title"
                            />
                          </div>

                          <div className="col-span-2 space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              value={task.description}
                              onChange={(e) => handleUpdateTask(index, { description: e.target.value })}
                              placeholder="Task description"
                              rows={2}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select
                              value={task.priority}
                              onValueChange={(value: any) => handleUpdateTask(index, { priority: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Critical">Critical</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Low">Low</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Due in Days</Label>
                            <Input
                              type="number"
                              value={task.dueInDays}
                              onChange={(e) => handleUpdateTask(index, { dueInDays: parseInt(e.target.value) })}
                              min={1}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Stage</Label>
                            <Input
                              value={task.stage}
                              onChange={(e) => handleUpdateTask(index, { stage: e.target.value })}
                              placeholder="e.g., 'Documentation', 'Follow-up'"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Estimated Hours</Label>
                            <Input
                              type="number"
                              value={task.estimatedHours}
                              onChange={(e) => handleUpdateTask(index, { estimatedHours: parseFloat(e.target.value) })}
                              min={0.5}
                              step={0.5}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {formData.tasks.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>No tasks yet. Click "Add Task" to create action items.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMode('view')}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Are you sure you want to delete the template "{selectedTemplate?.outcomeType}"? 
                This action cannot be undone.
              </AlertDescription>
            </Alert>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
