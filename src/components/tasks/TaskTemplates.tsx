import React, { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Plus, 
  Edit, 
  Copy,
  Trash2,
  Clock,
  User,
  Target,
  Settings,
  CheckCircle,
  AlertTriangle,
  Layers,
  Zap,
  Bell
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { TaskTemplate } from '@/types/taskTemplate';
import { taskTemplatesService } from '@/services/taskTemplatesService';
import { GST_STAGES, EMPLOYEE_ROLES } from '../../../config/appConfig';

interface TaskBundle {
  id: string;
  name: string;
  stage: string;
  tasks: string[];
  autoTrigger: boolean;
  sequenceRequired: boolean;
}

interface TaskTemplatesProps {
  bundles: TaskBundle[];
}

const categories = ['All', 'Legal Drafting', 'Documentation', 'Review', 'Client Management', 'Filing', 'Hearing Prep', 'Research', 'General'];

export const TaskTemplates: React.FC<TaskTemplatesProps> = ({ bundles }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedRole, setSelectedRole] = useState('All');
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    estimatedHours: 8,
    priority: 'Medium' as 'Critical' | 'High' | 'Medium' | 'Low',
    assignedRole: 'Associate',
    category: 'General',
    stageScope: [] as string[],
    suggestOnStageChange: false,
    autoCreateOnStageChange: false,
    noticeTypes: [] as string[],
    clientTiers: [] as string[]
  });

  const [stageScopeOpen, setStageScopeOpen] = useState(false);

  const roles = ['All', ...EMPLOYEE_ROLES];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const [templatesData, statsData] = await Promise.all([
        taskTemplatesService.getAll(),
        taskTemplatesService.getTemplateStats()
      ]);
      setTemplates(templatesData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load task templates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    const matchesRole = selectedRole === 'All' || template.assignedRole === selectedRole;
    return matchesCategory && matchesRole && template.isActive;
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      estimatedHours: 8,
      priority: 'Medium',
      assignedRole: 'Associate',
      category: 'General',
      stageScope: ['Any Stage'],
      suggestOnStageChange: false,
      autoCreateOnStageChange: false,
      noticeTypes: [],
      clientTiers: []
    });
  };

  const handleCreateTemplate = async () => {
    try {
      const templateData = {
        ...formData,
        stageScope: formData.stageScope.length > 0 ? formData.stageScope as any[] : ['Any Stage'],
        conditions: {
          ...(formData.noticeTypes.length > 0 && { noticeType: formData.noticeTypes as any[] }),
          ...(formData.clientTiers.length > 0 && { clientTier: formData.clientTiers as any[] })
        }
      };

      await taskTemplatesService.create(templateData);
      await loadTemplates();
      setIsCreateTemplateOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create template',
        variant: 'destructive'
      });
    }
  };

  const handleEditTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      const updates = {
        ...formData,
        stageScope: formData.stageScope.length > 0 ? formData.stageScope as any[] : ['Any Stage'],
        conditions: {
          ...(formData.noticeTypes.length > 0 && { noticeType: formData.noticeTypes as any[] }),
          ...(formData.clientTiers.length > 0 && { clientTier: formData.clientTiers as any[] })
        }
      };

      await taskTemplatesService.update(selectedTemplate.id, updates);
      await loadTemplates();
      setIsEditTemplateOpen(false);
      setSelectedTemplate(null);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update template',
        variant: 'destructive'
      });
    }
  };

  const handleCloneTemplate = async (template: TaskTemplate) => {
    try {
      await taskTemplatesService.clone(template.id);
      await loadTemplates();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to clone template',
        variant: 'destructive'
      });
    }
  };

  const openEditDialog = (template: TaskTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      title: template.title,
      description: template.description,
      estimatedHours: template.estimatedHours,
      priority: template.priority,
      assignedRole: template.assignedRole,
      category: template.category,
      stageScope: template.stageScope,
      suggestOnStageChange: template.suggestOnStageChange,
      autoCreateOnStageChange: template.autoCreateOnStageChange,
      noticeTypes: template.conditions?.noticeType || [],
      clientTiers: template.conditions?.clientTier || []
    });
    setIsEditTemplateOpen(true);
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

  const getCategoryColor = (category: string) => {
    const colors = {
      'Legal Drafting': 'bg-blue-100 text-blue-800',
      'Documentation': 'bg-green-100 text-green-800',
      'Review': 'bg-yellow-100 text-yellow-800',
      'Client Management': 'bg-purple-100 text-purple-800',
      'Filing': 'bg-red-100 text-red-800',
      'Hearing Prep': 'bg-indigo-100 text-indigo-800',
      'Research': 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const TemplateCard: React.FC<{ template: TaskTemplate }> = ({ template }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      className="cursor-pointer"
      onClick={() => setSelectedTemplate(template)}
    >
      <Card className="hover:shadow-lg transition-all duration-200">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-lg leading-tight">
                  {template.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {template.description}
                </p>
              </div>
              <Badge variant="secondary" className={getPriorityColor(template.priority)}>
                {template.priority}
              </Badge>
            </div>

            {/* Stage Scope */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Stage Scope:</p>
              <div className="flex flex-wrap gap-1">
                {template.stageScope.slice(0, 2).map((stage) => (
                  <Badge key={stage} variant="outline" className="text-xs bg-blue-50 text-blue-700">
                    <Layers className="h-3 w-3 mr-1" />
                    {stage === 'Any Stage' ? 'Any' : stage.substring(0, 10)}...
                  </Badge>
                ))}
                {template.stageScope.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{template.stageScope.length - 2} more
                  </Badge>
                )}
              </div>
            </div>

            {/* Automation Badges */}
            <div className="flex gap-2">
              {template.suggestOnStageChange && (
                <Badge variant="secondary" className="text-xs bg-yellow-50 text-yellow-700">
                  <Bell className="h-3 w-3 mr-1" />
                  Suggest
                </Badge>
              )}
              {template.autoCreateOnStageChange && (
                <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">
                  <Zap className="h-3 w-3 mr-1" />
                  Auto-create
                </Badge>
              )}
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Role</p>
                <p className="font-medium">{template.assignedRole}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Estimated Hours</p>
                <p className="font-medium">{template.estimatedHours}h</p>
              </div>
            </div>

            {/* Category and Usage */}
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={getCategoryColor(template.category)}>
                {template.category}
              </Badge>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Target className="h-3 w-3" />
                <span>Used {template.usageCount} times</span>
              </div>
            </div>

            {/* Dependencies */}
            {template.dependencies && template.dependencies.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Dependencies:</p>
                <div className="flex flex-wrap gap-1">
                  {template.dependencies.slice(0, 2).map((depId) => {
                    const dep = templates.find(t => t.id === depId);
                    return dep ? (
                      <Badge key={depId} variant="outline" className="text-xs">
                        {dep.title.substring(0, 20)}...
                      </Badge>
                    ) : null;
                  })}
                  {template.dependencies.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{template.dependencies.length - 2} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditDialog(template);
                }}
              >
                <Edit className="mr-2 h-3 w-3" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloneTemplate(template);
                }}
              >
                <Copy className="mr-2 h-3 w-3" />
                Clone
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-center"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground">Task Templates</h2>
          <p className="text-muted-foreground mt-1">
            Manage reusable task templates for consistent workflow automation
          </p>
        </div>
        <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary-hover">
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Task Template</DialogTitle>
              <DialogDescription>
                Create a reusable task template that can be used in automation bundles
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Template Title</Label>
                <Input id="title" placeholder="e.g., Draft Response to Notice" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Detailed description of the task" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hours">Estimated Hours</Label>
                  <Input id="hours" type="number" placeholder="16" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Assigned Role</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="senior-associate">Senior Associate</SelectItem>
                      <SelectItem value="junior-associate">Junior Associate</SelectItem>
                      <SelectItem value="paralegal">Paralegal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="legal-drafting">Legal Drafting</SelectItem>
                      <SelectItem value="documentation">Documentation</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="client-management">Client Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateTemplateOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  toast({
                    title: "Template Created",
                    description: "Task template has been created successfully",
                  });
                  setIsCreateTemplateOpen(false);
                }}
              >
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Templates</p>
                <p className="text-2xl font-bold text-foreground">{templates.length}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Most Used</p>
                <p className="text-lg font-bold text-foreground">Legal Review</p>
                <p className="text-xs text-muted-foreground">52 times</p>
              </div>
              <Target className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Hours</p>
                <p className="text-2xl font-bold text-foreground">10.1</p>
                <p className="text-xs text-success">Per template</p>
              </div>
              <Clock className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold text-foreground">7</p>
              </div>
              <Settings className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="flex flex-wrap gap-4 items-center"
      >
        <div className="flex items-center space-x-2">
          <Label htmlFor="category-filter">Category:</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Label htmlFor="role-filter">Role:</Label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="ml-auto text-sm text-muted-foreground">
          Showing {filteredTemplates.length} of {templates.length} templates
        </div>
      </motion.div>

      {/* Templates Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredTemplates.map((template, index) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <TemplateCard template={template} />
          </motion.div>
        ))}
      </motion.div>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>{selectedTemplate.title}</DialogTitle>
              <DialogDescription>
                Task template details and configuration
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Description</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedTemplate.description}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Badge variant="secondary" className={`${getPriorityColor(selectedTemplate.priority)} mt-1`}>
                    {selectedTemplate.priority}
                  </Badge>
                </div>
                <div>
                  <Label>Estimated Hours</Label>
                  <p className="font-medium mt-1">{selectedTemplate.estimatedHours} hours</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <p className="font-medium mt-1">{selectedTemplate.assignedRole}</p>
                </div>
                <div>
                  <Label>Category</Label>
                  <Badge variant="outline" className={`${getCategoryColor(selectedTemplate.category)} mt-1`}>
                    {selectedTemplate.category}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label>Usage Statistics</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Used {selectedTemplate.usageCount} times across {bundles.length} bundles
                </p>
              </div>
              
              {selectedTemplate.dependencies && selectedTemplate.dependencies.length > 0 && (
                <div>
                  <Label>Dependencies</Label>
                  <div className="mt-2 space-y-2">
                    {selectedTemplate.dependencies.map((depId) => {
                      const dep = templates.find(t => t.id === depId);
                      return dep ? (
                        <div key={depId} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <span className="text-sm">{dep.title}</span>
                          <Badge variant="outline">{dep.priority}</Badge>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                Close
              </Button>
              <Button>
                <Edit className="mr-2 h-4 w-4" />
                Edit Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};