/**
 * SMS Template Manager - TRAI DLT Compliant Template Management
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  MessageSquare, 
  Send, 
  Info,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Copy,
  Eye
} from 'lucide-react';
import { smsService, SMSTemplate } from '@/services/smsService';
import { toast } from '@/hooks/use-toast';

const TEMPLATE_CATEGORIES = [
  { value: 'hearing_reminder', label: 'Hearing Reminder' },
  { value: 'deadline_alert', label: 'Statutory Deadline' },
  { value: 'case_update', label: 'Case Update' },
  { value: 'task_assigned', label: 'Task Assignment' },
  { value: 'document_request', label: 'Document Request' },
  { value: 'otp_verification', label: 'OTP Verification' },
  { value: 'welcome', label: 'Welcome Message' },
  { value: 'general', label: 'General' }
];

// Pre-defined TRAI-compliant template examples
const SAMPLE_TEMPLATES = [
  {
    name: 'Hearing Reminder T-1',
    category: 'hearing_reminder',
    templateText: 'HOFFIC: Dear {#var#}, Reminder: Your hearing for Case {#var#} is scheduled for {#var#} at {#var#}. Please arrive 30 min early. -H-Office'
  },
  {
    name: 'Hearing Same Day',
    category: 'hearing_reminder',
    templateText: 'HOFFIC: URGENT: Your hearing for Case {#var#} is TODAY at {#var#} in {#var#}. Please arrive immediately. -H-Office'
  },
  {
    name: 'Statutory Deadline Approaching',
    category: 'deadline_alert',
    templateText: 'HOFFIC: Alert: Reply deadline for Case {#var#} is {#var#}. {#var#} days remaining. Please take action. -H-Office'
  },
  {
    name: 'Statutory Deadline Today',
    category: 'deadline_alert',
    templateText: 'HOFFIC: URGENT: Reply deadline for Case {#var#} is TODAY ({#var#}). Submit immediately to avoid breach. -H-Office'
  },
  {
    name: 'Case Update',
    category: 'case_update',
    templateText: 'HOFFIC: Case Update - {#var#}: {#var#}. Next action: {#var#}. Contact us for queries. -H-Office'
  },
  {
    name: 'Task Assignment',
    category: 'task_assigned',
    templateText: 'HOFFIC: New task assigned: {#var#} for Case {#var#}. Due: {#var#}. Login to view details. -H-Office'
  },
  {
    name: 'Document Request',
    category: 'document_request',
    templateText: 'HOFFIC: Document required for Case {#var#}: {#var#}. Please submit by {#var#}. -H-Office'
  },
  {
    name: 'OTP Verification',
    category: 'otp_verification',
    templateText: 'HOFFIC: Your verification code is {#var#}. Valid for 10 minutes. Do not share. -H-Office'
  },
  {
    name: 'Welcome Message',
    category: 'welcome',
    templateText: 'HOFFIC: Welcome to H-Office Legal. Your account is active. Case updates will be sent to this number. -H-Office'
  }
];

interface TemplateFormData {
  name: string;
  templateText: string;
  dltTemplateId: string;
  category: string;
  isActive: boolean;
}

const SMSTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SMSTemplate | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    templateText: '',
    dltTemplateId: '',
    category: 'general',
    isActive: true
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    const data = await smsService.getTemplates();
    setTemplates(data);
    setIsLoading(false);
  };

  const handleOpenDialog = (template?: SMSTemplate) => {
    if (template) {
      setSelectedTemplate(template);
      setFormData({
        name: template.name,
        templateText: template.templateText,
        dltTemplateId: template.dltTemplateId || '',
        category: template.category,
        isActive: template.isActive
      });
    } else {
      setSelectedTemplate(null);
      setFormData({
        name: '',
        templateText: '',
        dltTemplateId: '',
        category: 'general',
        isActive: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.templateText) {
      toast({
        title: "Validation Error",
        description: "Template name and text are required.",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    
    if (selectedTemplate) {
      const success = await smsService.updateTemplate(selectedTemplate.id, {
        name: formData.name,
        templateText: formData.templateText,
        dltTemplateId: formData.dltTemplateId || null,
        category: formData.category,
        isActive: formData.isActive
      });
      if (success) {
        setIsDialogOpen(false);
        loadTemplates();
      }
    } else {
      const result = await smsService.createTemplate({
        name: formData.name,
        templateText: formData.templateText,
        dltTemplateId: formData.dltTemplateId || null,
        category: formData.category,
        isActive: formData.isActive
      });
      if (result) {
        setIsDialogOpen(false);
        loadTemplates();
      }
    }
    
    setIsSending(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    const success = await smsService.deleteTemplate(id);
    if (success) {
      loadTemplates();
    }
  };

  const handleToggleActive = async (template: SMSTemplate) => {
    await smsService.updateTemplate(template.id, { isActive: !template.isActive });
    loadTemplates();
  };

  const handleUseSample = (sample: typeof SAMPLE_TEMPLATES[0]) => {
    setFormData({
      name: sample.name,
      templateText: sample.templateText,
      dltTemplateId: '',
      category: sample.category,
      isActive: true
    });
  };

  const handleTestSMS = async () => {
    if (!testPhone || !selectedTemplate) return;

    setIsSending(true);
    const result = await smsService.sendSMS({
      phone: testPhone,
      message: selectedTemplate.templateText,
      dltTemplateId: selectedTemplate.dltTemplateId || undefined,
      templateId: selectedTemplate.id
    });

    if (result.success) {
      toast({
        title: "Test SMS Sent",
        description: `SMS sent successfully. Message ID: ${result.messageId}`
      });
      setIsTestDialogOpen(false);
    } else {
      toast({
        title: "SMS Failed",
        description: result.error || "Failed to send test SMS",
        variant: "destructive"
      });
    }
    setIsSending(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Template copied to clipboard" });
  };

  const getCharacterInfo = (text: string) => {
    const length = text.length;
    const smsCount = Math.ceil(length / 160) || 1;
    const remaining = 160 - (length % 160);
    return { length, smsCount, remaining: remaining === 160 ? 0 : remaining };
  };

  const charInfo = getCharacterInfo(formData.templateText);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">SMS Templates</h2>
          <p className="text-muted-foreground">Manage TRAI DLT-compliant SMS templates</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          SMS templates must be registered with TRAI DLT platform before use. Use <code className="bg-muted px-1 rounded">{'{#var#}'}</code> placeholders for dynamic content.
        </AlertDescription>
      </Alert>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Template Library
          </CardTitle>
          <CardDescription>
            {templates.length} templates configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">No templates created yet</p>
              <Button variant="outline" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Template
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>DLT Template ID</TableHead>
                  <TableHead className="text-center">Characters</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TEMPLATE_CATEGORIES.find(c => c.value === template.category)?.label || template.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {template.dltTemplateId ? (
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {template.dltTemplateId}
                        </code>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not set</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={template.characterCount > 160 ? 'text-amber-500' : ''}>
                        {template.characterCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={template.isActive}
                        onCheckedChange={() => handleToggleActive(template)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setTestPhone('');
                            setIsTestDialogOpen(true);
                          }}
                          title="Test SMS"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(template.templateText)}
                          title="Copy"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(template)}
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(template.id)}
                          title="Delete"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Edit Template' : 'Create SMS Template'}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="editor" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="editor">Template Editor</TabsTrigger>
              <TabsTrigger value="samples">Sample Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Template Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Hearing Reminder T-1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>DLT Template ID</Label>
                  <Input
                    value={formData.dltTemplateId}
                    onChange={(e) => setFormData({ ...formData, dltTemplateId: e.target.value })}
                    placeholder="e.g., 1107171234567890"
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for TRAI compliance. Get this from your DLT portal.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Template Text *</Label>
                    <span className={`text-xs ${charInfo.length > 160 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      {charInfo.length}/160 ({charInfo.smsCount} SMS)
                    </span>
                  </div>
                  <Textarea
                    value={formData.templateText}
                    onChange={(e) => setFormData({ ...formData, templateText: e.target.value })}
                    placeholder="HOFFIC: Your message with {#var#} placeholders. -H-Office"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use <code className="bg-muted px-1 rounded">{'{#var#}'}</code> for dynamic values. Must match TRAI-registered template exactly.
                  </p>
                </div>

                {charInfo.length > 160 && (
                  <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <AlertDescription>
                      Message exceeds 160 characters. Will be sent as {charInfo.smsCount} SMS parts.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label>Active</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="samples" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {SAMPLE_TEMPLATES.map((sample, idx) => (
                    <Card key={idx} className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => handleUseSample(sample)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{sample.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {TEMPLATE_CATEGORIES.find(c => c.value === sample.category)?.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground font-mono">
                              {sample.templateText}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm">
                            Use
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSending}>
              {isSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedTemplate ? 'Update' : 'Create'} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test SMS Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test SMS</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="e.g., 9876543210"
              />
            </div>

            {selectedTemplate && (
              <div className="space-y-2">
                <Label>Message Preview</Label>
                <div className="p-3 bg-muted rounded-md text-sm font-mono">
                  {selectedTemplate.templateText}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedTemplate.characterCount} characters • {Math.ceil(selectedTemplate.characterCount / 160)} SMS
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTestSMS} disabled={isSending || !testPhone}>
              {isSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-4 w-4 mr-2" />
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SMSTemplateManager;
