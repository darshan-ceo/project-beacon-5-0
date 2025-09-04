import React, { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Play, 
  Pause,
  Edit,
  Copy,
  Trash2,
  Plus,
  ArrowRight,
  CheckCircle,
  Clock,
  FileText,
  Users,
  Zap,
  Target
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TaskBundle {
  id: string;
  name: string;
  stage: string;
  tasks: string[];
  autoTrigger: boolean;
  sequenceRequired: boolean;
}

interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  role: string;
  dependencies?: string[];
}

interface TaskAutomationProps {
  bundles: TaskBundle[];
}

const taskTemplates: TaskTemplate[] = [
  {
    id: 'draft-response',
    title: 'Draft Response to Notice',
    description: 'Prepare comprehensive response addressing all points raised in the notice',
    estimatedHours: 16,
    priority: 'Critical',
    role: 'Senior Associate'
  },
  {
    id: 'prepare-annexures',
    title: 'Prepare Supporting Annexures',
    description: 'Compile all required supporting documents and evidence',
    estimatedHours: 8,
    priority: 'High',
    role: 'Junior Associate',
    dependencies: ['draft-response']
  },
  {
    id: 'legal-review',
    title: 'Legal Review',
    description: 'Review legal arguments and ensure compliance with regulations',
    estimatedHours: 6,
    priority: 'High',
    role: 'Partner',
    dependencies: ['draft-response', 'prepare-annexures']
  },
  {
    id: 'client-approval',
    title: 'Client Approval',
    description: 'Obtain client approval for the prepared response',
    estimatedHours: 2,
    priority: 'Medium',
    role: 'Senior Associate',
    dependencies: ['legal-review']
  }
];

const automationRules = [
  {
    id: '1',
    name: 'Stage Change Trigger',
    description: 'Automatically create task bundles when case stage changes',
    isActive: true,
    triggerType: 'Stage Change',
    conditions: 'Any stage transition',
    lastTriggered: '2 hours ago',
    tasksCreated: 145
  },
  {
    id: '2',
    name: 'SLA Alert Automation',
    description: 'Create escalation tasks when SLA deadlines approach',
    isActive: true,
    triggerType: 'SLA Warning',
    conditions: '24 hours before deadline',
    lastTriggered: '1 day ago',
    tasksCreated: 23
  },
  {
    id: '3',
    name: 'Document Upload Trigger',
    description: 'Auto-assign review tasks when documents are uploaded',
    isActive: false,
    triggerType: 'Document Event',
    conditions: 'Legal document upload',
    lastTriggered: '3 days ago',
    tasksCreated: 67
  }
];

export const TaskAutomation: React.FC<TaskAutomationProps> = ({ bundles }) => {
  const [isCreateBundleOpen, setIsCreateBundleOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<TaskBundle | null>(null);

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Demand': return 'bg-warning text-warning-foreground';
      case 'Adjudication': return 'bg-primary text-primary-foreground';
      case 'Appeals': return 'bg-secondary text-secondary-foreground';
      case 'GSTAT': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const BundleCard: React.FC<{ bundle: TaskBundle }> = ({ bundle }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      className="cursor-pointer"
      onClick={() => setSelectedBundle(bundle)}
    >
      <Card className="hover:shadow-lg transition-all duration-200">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{bundle.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {bundle.tasks.length} tasks • {bundle.sequenceRequired ? 'Sequential' : 'Parallel'}
                </p>
              </div>
              <Badge variant="secondary" className={getStageColor(bundle.stage)}>
                {bundle.stage}
              </Badge>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch checked={bundle.autoTrigger} />
                <span className="text-sm">Auto-trigger</span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Zap className="h-3 w-3" />
                <span>Last used: 2 days ago</span>
              </div>
            </div>

            {/* Task Preview */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Included Tasks
              </p>
              <div className="space-y-1">
                {bundle.tasks.slice(0, 3).map((taskId, index) => {
                  const template = taskTemplates.find(t => t.id === taskId);
                  return template ? (
                    <div key={taskId} className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="truncate">{template.title}</span>
                    </div>
                  ) : null;
                })}
                {bundle.tasks.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{bundle.tasks.length - 3} more tasks
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Edit className="mr-2 h-3 w-3" />
                Edit
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
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
          <h2 className="text-2xl font-bold text-foreground">Task Automation</h2>
          <p className="text-muted-foreground mt-1">
            Configure stage-based auto-task bundles and automation rules
          </p>
        </div>
        <Dialog open={isCreateBundleOpen} onOpenChange={setIsCreateBundleOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary-hover">
              <Plus className="mr-2 h-4 w-4" />
              Create Bundle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Task Bundle</DialogTitle>
              <DialogDescription>
                Create a new automated task bundle for a specific case stage
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="bundle-name">Bundle Name</Label>
                <Input id="bundle-name" placeholder="e.g., Demand Notice Response" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage">Case Stage</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scrutiny">Scrutiny</SelectItem>
                    <SelectItem value="demand">Demand</SelectItem>
                    <SelectItem value="adjudication">Adjudication</SelectItem>
                    <SelectItem value="appeals">Appeals</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Describe when this bundle should be used" />
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="auto-trigger" />
                <Label htmlFor="auto-trigger">Auto-trigger on stage change</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="sequence" />
                <Label htmlFor="sequence">Tasks must be completed in sequence</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateBundleOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  toast({
                    title: "Bundle Created",
                    description: "Task bundle has been created successfully",
                  });
                  setIsCreateBundleOpen(false);
                }}
              >
                Create Bundle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Automation Stats */}
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
                <p className="text-sm font-medium text-muted-foreground">Active Bundles</p>
                <p className="text-2xl font-bold text-foreground">{bundles.length}</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Auto-Generated Tasks</p>
                <p className="text-2xl font-bold text-secondary">235</p>
                <p className="text-xs text-secondary mt-1">This month</p>
              </div>
              <Zap className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Time Saved</p>
                <p className="text-2xl font-bold text-success">47h</p>
                <p className="text-xs text-success mt-1">This month</p>
              </div>
              <Clock className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-foreground">94%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Bundles */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5 text-primary" />
                Task Bundles
              </CardTitle>
              <CardDescription>
                Pre-configured task groups for different case stages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {bundles.map((bundle, index) => (
                <motion.div
                  key={bundle.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <BundleCard bundle={bundle} />
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Automation Rules */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Settings className="mr-2 h-5 w-5 text-secondary" />
                  Automation Rules
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const container = document.getElementById('automation-rules-container');
                      if (container) {
                        container.scrollBy({ left: -200, behavior: 'smooth' });
                      }
                    }}
                  >
                    ←
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const container = document.getElementById('automation-rules-container');
                      if (container) {
                        container.scrollBy({ left: 200, behavior: 'smooth' });
                      }
                    }}
                  >
                    →
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Configure when and how tasks are automatically created
              </CardDescription>
            </CardHeader>
            <CardContent 
              id="automation-rules-container"
              className="space-y-4 overflow-x-auto max-h-96 overflow-y-auto"
            >
              {automationRules.map((rule, index) => (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{rule.name}</h4>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                      </div>
                      <Switch checked={rule.isActive} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Trigger</p>
                        <p className="font-medium">{rule.triggerType}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Conditions</p>
                        <p className="font-medium">{rule.conditions}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Last triggered: {rule.lastTriggered}</span>
                      <span>{rule.tasksCreated} tasks created</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bundle Detail Modal */}
      {selectedBundle && (
        <Dialog open={!!selectedBundle} onOpenChange={() => setSelectedBundle(null)}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>{selectedBundle.name}</DialogTitle>
              <DialogDescription>
                Task bundle configuration for {selectedBundle.stage} stage
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Stage</Label>
                  <p className="font-medium">{selectedBundle.stage}</p>
                </div>
                <div>
                  <Label>Execution Mode</Label>
                  <p className="font-medium">
                    {selectedBundle.sequenceRequired ? 'Sequential' : 'Parallel'}
                  </p>
                </div>
              </div>
              
              <div>
                <Label>Included Tasks</Label>
                <div className="mt-2 space-y-2">
                  {selectedBundle.tasks.map((taskId, index) => {
                    const template = taskTemplates.find(t => t.id === taskId);
                    return template ? (
                      <div key={taskId} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                        <div>
                          <p className="font-medium">{template.title}</p>
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{template.priority}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {template.estimatedHours}h • {template.role}
                          </p>
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedBundle(null)}>
                Close
              </Button>
              <Button>
                <Edit className="mr-2 h-4 w-4" />
                Edit Bundle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};