import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Zap, 
  Bell, 
  FileText, 
  Clock, 
  Users, 
  Edit, 
  Copy, 
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BundleEditor } from './BundleEditor';
import { taskBundleService, TaskBundle as ServiceTaskBundle } from '@/services/taskBundleService';
import { toast } from '@/hooks/use-toast';

interface AutomationRule {
  id: string;
  name: string;
  type: 'sla_alert' | 'document_upload' | 'stage_transition';
  enabled: boolean;
  config: any;
  triggerCount: number;
  lastTriggered?: string;
}

interface TaskBundle {
  id: string;
  name: string;
  stage: string;
  description: string;
  executionMode: 'Sequential' | 'Parallel';
  autoTrigger: boolean;
  tasks: any[];
  conditions: any;
  isActive: boolean;
  createdAt: string;
  lastModified: string;
}

interface TaskAutomationProps {
  bundles: TaskBundle[];
  onBundleUpdate?: (bundles: TaskBundle[]) => void;
}

export const TaskAutomation: React.FC<TaskAutomationProps> = ({ bundles, onBundleUpdate }) => {
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([
    {
      id: 'sla-1',
      name: 'SLA Alert Automation',
      type: 'sla_alert',
      enabled: true,
      config: { reminderBeforeHours: 24 },
      triggerCount: 12,
      lastTriggered: '2024-01-15T10:30:00Z'
    }
  ]);

  const [bundleEditorOpen, setBundleEditorOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<TaskBundle | null>(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | 'clone'>('create');
  const [taskBundles, setTaskBundles] = useState<ServiceTaskBundle[]>([]);
  const [loading, setLoading] = useState(true);

  // Convert service bundle to editor bundle format
  const convertToEditorBundle = (serviceBundle: ServiceTaskBundle): TaskBundle => ({
    id: serviceBundle.id,
    name: serviceBundle.name,
    stage: serviceBundle.stageKey,
    description: `${serviceBundle.trigger} bundle for ${serviceBundle.stageKey}`,
    executionMode: 'Sequential',
    autoTrigger: serviceBundle.isActive,
    tasks: serviceBundle.tasks.map((task, index) => ({
      id: `task-${index}`,
      title: task.title,
      description: task.description,
      assignedRole: 'Associate',
      dueOffset: '+1d',
      priority: task.priority as any,
      estimatedHours: task.estimatedHours,
      order: index
    })),
    conditions: {
      triggers: [serviceBundle.trigger as any],
      specificStages: [serviceBundle.stageKey]
    },
    isActive: serviceBundle.isActive,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  });

  // Convert editor bundle to service bundle format
  const convertToServiceBundle = (editorBundle: TaskBundle): Omit<ServiceTaskBundle, 'id'> => ({
    name: editorBundle.name,
    trigger: editorBundle.conditions.triggers[0] as any || 'OnStageEnter',
    stageKey: editorBundle.stage,
    tasks: editorBundle.tasks.map(task => ({
      title: task.title,
      description: task.description,
      priority: task.priority as any,
      estimatedHours: task.estimatedHours,
      isMandatory: task.priority === 'Critical' || task.priority === 'High'
    })),
    isActive: editorBundle.isActive
  });

  const updateAutomationRule = async (ruleId: string, updates: Partial<AutomationRule>) => {
    setAutomationRules(prev => 
      prev.map(rule => rule.id === ruleId ? { ...rule, ...updates } : rule)
    );
    toast({
      title: 'Automation Updated',
      description: `${updates.enabled ? 'Enabled' : 'Disabled'} automation rule`,
    });
  };

  const openBundleEditor = (mode: 'create' | 'edit' | 'clone', bundle?: ServiceTaskBundle) => {
    setEditorMode(mode);
    setSelectedBundle(bundle ? convertToEditorBundle(bundle) : null);
    setBundleEditorOpen(true);
  };

  // Load bundles on component mount
  useEffect(() => {
    loadTaskBundles();
  }, []);

  const loadTaskBundles = async () => {
    try {
      setLoading(true);
      const allBundles = taskBundleService.getAllBundles();
      setTaskBundles(allBundles);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load task bundles',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBundleSave = async (bundle: TaskBundle) => {
    toast({
      title: 'Saving',
      description: 'Saving task bundle...'
    });

    try {
      const serviceBundle = convertToServiceBundle(bundle);
      if (editorMode === 'create' || editorMode === 'clone') {
        await taskBundleService.createBundle(serviceBundle);
      } else if (editorMode === 'edit' && bundle.id) {
        await taskBundleService.updateBundle(bundle.id, serviceBundle);
      }
      
      await loadTaskBundles(); // Reload bundles
      setBundleEditorOpen(false);
      
      toast({
        title: 'Success',
        description: 'Task bundle saved successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save task bundle',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Task Automation</h2>
          <p className="text-muted-foreground mt-1">
            Manage automated task creation and workflow triggers
          </p>
        </div>
        <Button onClick={() => openBundleEditor('create')} data-tour="new-rule-button">
          <Plus className="mr-2 h-4 w-4" />
          New Rule
        </Button>
      </div>

      <Tabs defaultValue="rules" data-tour="automation-subtabs">
        <TabsList>
          <TabsTrigger value="rules" data-tour="rules-tab">Automation Rules</TabsTrigger>
          <TabsTrigger value="bundles" data-tour="bundles-tab">Task Bundles</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <div className="space-y-4">
            {automationRules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{rule.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {rule.type === 'sla_alert' && 'Reminds before SLA breach'}
                      </p>
                    </div>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked) => updateAutomationRule(rule.id, { enabled: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bundles">
          <div className="grid gap-4">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading task bundles...</p>
              </div>
            ) : taskBundles.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No task bundles found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create your first bundle to get started
                </p>
              </div>
            ) : (
              taskBundles.map((bundle) => (
                <Card key={bundle.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">{bundle.name}</h3>
                        <p className="text-sm text-muted-foreground">{bundle.stageKey}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{bundle.trigger}</Badge>
                          <Badge variant={bundle.isActive ? 'default' : 'secondary'}>
                            {bundle.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">{bundle.tasks.length} tasks</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openBundleEditor('edit', bundle)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openBundleEditor('clone', bundle)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Clone
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <BundleEditor
        isOpen={bundleEditorOpen}
        onClose={() => setBundleEditorOpen(false)}
        bundle={selectedBundle}
        mode={editorMode}
        onSave={handleBundleSave}
      />
    </div>
  );
};