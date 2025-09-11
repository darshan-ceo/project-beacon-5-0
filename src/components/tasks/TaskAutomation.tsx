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
  const [mockBundles, setMockBundles] = useState<TaskBundle[]>([]);

  const updateAutomationRule = async (ruleId: string, updates: Partial<AutomationRule>) => {
    setAutomationRules(prev => 
      prev.map(rule => rule.id === ruleId ? { ...rule, ...updates } : rule)
    );
    toast({
      title: 'Automation Updated',
      description: `${updates.enabled ? 'Enabled' : 'Disabled'} automation rule`,
    });
  };

  const openBundleEditor = (mode: 'create' | 'edit' | 'clone', bundle?: TaskBundle) => {
    setEditorMode(mode);
    setSelectedBundle(bundle || null);
    setBundleEditorOpen(true);
  };

  const handleBundleSave = async (bundle: TaskBundle) => {
    setBundleEditorOpen(false);
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
            {mockBundles.map((bundle) => (
              <Card key={bundle.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{bundle.name}</h3>
                      <p className="text-sm text-muted-foreground">{bundle.stage}</p>
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
            ))}
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