import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AutomationRule } from '@/types/automation';
import { automationRuleEngine } from '@/services/automationRuleEngine';
import { seedDefaultAutomationRules } from '@/data/seeders/defaultAutomationRules';
import { Plus, Play, Trash2, Edit, Power, Zap, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { GST_STAGES } from '../../../config/appConfig';

export const AutomationRules: React.FC = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      await automationRuleEngine.initialize();
      const loadedRules = await automationRuleEngine.getAllRules();
      
      // Filter out malformed rules
      const validRules = loadedRules.filter(rule => {
        const hasValidTrigger = rule.trigger?.event || (rule as any).trigger_type;
        if (!hasValidTrigger) {
          console.warn('⚠️ Skipping malformed rule:', rule.id, rule.name);
        }
        return hasValidTrigger;
      });
      
      setRules(validRules);
      
      // Seed default rules if none exist
      if (validRules.length === 0) {
        await seedDefaultAutomationRules((rule) => automationRuleEngine.createRule(rule));
        const reloadedRules = await automationRuleEngine.getAllRules();
        setRules(reloadedRules.filter(rule => rule.trigger?.event || (rule as any).trigger_type));
        toast({
          title: "Default Rules Created",
          description: "7 default GST automation rules have been created"
        });
      }
    } catch (error) {
      console.error('Failed to load automation rules:', error);
      toast({
        title: "Error",
        description: "Failed to load automation rules",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      await automationRuleEngine.updateRule(ruleId, { isActive });
      setRules(rules.map(r => r.id === ruleId ? { ...r, isActive } : r));
      toast({
        title: isActive ? "Rule Enabled" : "Rule Disabled",
        description: `Automation rule has been ${isActive ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update rule",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      await automationRuleEngine.deleteRule(ruleId);
      setRules(rules.filter(r => r.id !== ruleId));
      toast({
        title: "Rule Deleted",
        description: "Automation rule has been deleted"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete rule",
        variant: "destructive"
      });
    }
  };

  const getSuccessRate = (rule: AutomationRule) => {
    if (rule.executionCount === 0) return 0;
    return Math.round((rule.successCount / rule.executionCount) * 100);
  };

  const activeRulesCount = rules.filter(r => r.isActive).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automation Rules</h2>
          <p className="text-muted-foreground">
            Create trigger-based rules to automate task creation, notifications, and escalations
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Create Automation Rule</DialogTitle>
              <DialogDescription>
                Define triggers and actions to automate your GST litigation workflow
              </DialogDescription>
            </DialogHeader>
            <CreateRuleForm
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                loadRules();
              }}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Rules</p>
                <p className="text-2xl font-bold">{rules.length}</p>
              </div>
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold text-green-600">{activeRulesCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Executions</p>
                <p className="text-2xl font-bold">
                  {rules.reduce((sum, r) => sum + r.executionCount, 0)}
                </p>
              </div>
              <Play className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {rules.length > 0
                    ? Math.round((rules.reduce((sum, r) => sum + r.successCount, 0) / 
                        Math.max(rules.reduce((sum, r) => sum + r.executionCount, 0), 1)) * 100)
                    : 0}%
                </p>
              </div>
              <Zap className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Active Rules ({activeRulesCount})
        </h3>
        
        {rules.filter(r => r.isActive).map(rule => (
          <Card key={rule.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-lg">{rule.name}</CardTitle>
                    <Badge variant="default" className="text-xs">
                      {(rule.trigger?.event || (rule as any).trigger_type || 'manual').replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <CardDescription>{rule.description}</CardDescription>
                </div>
                <Switch
                  checked={rule.isActive}
                  onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Rule Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Trigger: </span>
                    <span className="font-medium">{rule.trigger?.event || (rule as any).trigger_type || 'manual'}</span>
                  </div>
                  {(rule.trigger?.conditions?.stageTo || (rule as any).trigger_config?.stageTo) && (
                    <div>
                      <span className="text-muted-foreground">Stage: </span>
                      <span className="font-medium">{rule.trigger?.conditions?.stageTo || (rule as any).trigger_config?.stageTo}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {rule.actions.createTaskBundle && (
                    <Badge variant="secondary" className="text-xs">
                      📋 Create Tasks
                    </Badge>
                  )}
                  {rule.actions.sendNotification && (
                    <Badge variant="secondary" className="text-xs">
                      🔔 Send Notification
                    </Badge>
                  )}
                  {rule.actions.escalate && (
                    <Badge variant="secondary" className="text-xs">
                      ⚠️ Escalate
                    </Badge>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Executions:</span>
                      <span className="font-medium">{rule.executionCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      <span className="font-medium text-green-600">{rule.successCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-red-600" />
                      <span className="font-medium text-red-600">{rule.failureCount}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getSuccessRate(rule)}% success
                    </Badge>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {rules.filter(r => !r.isActive).length > 0 && (
          <>
            <Separator className="my-6" />
            <h3 className="text-lg font-semibold text-muted-foreground">
              Inactive Rules ({rules.filter(r => !r.isActive).length})
            </h3>
            
            {rules.filter(r => !r.isActive).map(rule => (
              <Card key={rule.id} className="opacity-60">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">{rule.name}</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {(rule.trigger?.event || (rule as any).trigger_type || 'manual').replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <CardDescription>{rule.description}</CardDescription>
                    </div>
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                    />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </>
        )}

        {rules.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Automation Rules</h3>
              <p className="text-muted-foreground mb-4">
                Create your first automation rule to streamline your GST workflow
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Rule
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Create Rule Form Component
const CreateRuleForm: React.FC<{
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerEvent: 'case_stage_changed' as any,
    stageTo: '',
    priority: [] as string[],
    createTaskBundle: false,
    bundleId: '',
    sendNotification: false,
    notificationChannels: ['in_app'] as any[],
    notificationRecipients: ['assignee'] as any[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const rule = {
        name: formData.name,
        description: formData.description,
        isActive: true,
        trigger: {
          event: formData.triggerEvent,
          conditions: formData.stageTo ? { stageTo: formData.stageTo as any } : undefined
        },
        actions: {
          createTaskBundle: formData.createTaskBundle ? {
            bundleId: formData.bundleId
          } : undefined,
          sendNotification: formData.sendNotification ? {
            channels: formData.notificationChannels,
            recipients: formData.notificationRecipients,
            template: 'task_assigned'
          } : undefined
        },
        createdBy: 'user'
      };

      await automationRuleEngine.createRule(rule);
      
      toast({
        title: "Rule Created",
        description: "Automation rule has been created successfully"
      });
      
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create automation rule",
        variant: "destructive"
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ScrollArea className="max-h-[60vh] pr-4">
        <div className="space-y-4">
          {/* Basic Info */}
          <div className="space-y-2">
            <Label htmlFor="name">Rule Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Appeal Filing Automation"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this rule does..."
              rows={2}
            />
          </div>

          <Separator />

          {/* Trigger Configuration */}
          <div className="space-y-4">
            <h4 className="font-semibold">Trigger</h4>
            
            <div className="space-y-2">
              <Label htmlFor="triggerEvent">Event *</Label>
              <Select
                value={formData.triggerEvent}
                onValueChange={(value) => setFormData({ ...formData, triggerEvent: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="case_stage_changed">Case Stage Changed</SelectItem>
                  <SelectItem value="hearing_scheduled">Hearing Scheduled</SelectItem>
                  <SelectItem value="document_uploaded">Document Uploaded</SelectItem>
                  <SelectItem value="task_overdue">Task Overdue</SelectItem>
                  <SelectItem value="case_created">Case Created</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.triggerEvent === 'case_stage_changed' && (
              <div className="space-y-2">
                <Label htmlFor="stageTo">Target Stage</Label>
                <Select
                  value={formData.stageTo}
                  onValueChange={(value) => setFormData({ ...formData, stageTo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage..." />
                  </SelectTrigger>
                  <SelectContent>
                    {GST_STAGES.map(stage => (
                      <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-4">
            <h4 className="font-semibold">Actions</h4>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="createTaskBundle"
                checked={formData.createTaskBundle}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, createTaskBundle: checked as boolean })
                }
              />
              <Label htmlFor="createTaskBundle" className="font-normal">
                Create Task Bundle
              </Label>
            </div>

            {formData.createTaskBundle && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="bundleId">Bundle ID</Label>
                <Input
                  id="bundleId"
                  value={formData.bundleId}
                  onChange={(e) => setFormData({ ...formData, bundleId: e.target.value })}
                  placeholder="e.g., appeal-filing-bundle"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendNotification"
                checked={formData.sendNotification}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, sendNotification: checked as boolean })
                }
              />
              <Label htmlFor="sendNotification" className="font-normal">
                Send Notification
              </Label>
            </div>

            {formData.sendNotification && (
              <div className="ml-6 space-y-3">
                <div>
                  <Label className="text-sm">Channels</Label>
                  <div className="flex gap-2 mt-2">
                    <Badge
                      variant={formData.notificationChannels.includes('in_app') ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const channels = formData.notificationChannels.includes('in_app')
                          ? formData.notificationChannels.filter(c => c !== 'in_app')
                          : [...formData.notificationChannels, 'in_app'];
                        setFormData({ ...formData, notificationChannels: channels });
                      }}
                    >
                      In-App
                    </Badge>
                    <Badge
                      variant={formData.notificationChannels.includes('email') ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const channels = formData.notificationChannels.includes('email')
                          ? formData.notificationChannels.filter(c => c !== 'email')
                          : [...formData.notificationChannels, 'email'];
                        setFormData({ ...formData, notificationChannels: channels });
                      }}
                    >
                      Email
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Recipients</Label>
                  <div className="flex gap-2 mt-2">
                    <Badge
                      variant={formData.notificationRecipients.includes('assignee') ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const recipients = formData.notificationRecipients.includes('assignee')
                          ? formData.notificationRecipients.filter(r => r !== 'assignee')
                          : [...formData.notificationRecipients, 'assignee'];
                        setFormData({ ...formData, notificationRecipients: recipients });
                      }}
                    >
                      Assignee
                    </Badge>
                    <Badge
                      variant={formData.notificationRecipients.includes('manager') ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const recipients = formData.notificationRecipients.includes('manager')
                          ? formData.notificationRecipients.filter(r => r !== 'manager')
                          : [...formData.notificationRecipients, 'manager'];
                        setFormData({ ...formData, notificationRecipients: recipients });
                      }}
                    >
                      Manager
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="flex gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          Create Rule
        </Button>
      </div>
    </form>
  );
};
