/**
 * SMS Template Manager - Beacon 5.0 ESS Design
 * TRAI DLT Compliant Template Management
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FieldTooltipWrapper } from '@/components/help/FieldTooltipWrapper';
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
  Eye,
  Bell,
  Clock,
  CheckSquare,
  FileUp,
  Shield,
  Sparkles,
  type LucideIcon
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

// Category icons mapping
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  hearing_reminder: Bell,
  deadline_alert: Clock,
  case_update: FileText,
  task_assigned: CheckSquare,
  document_request: FileUp,
  otp_verification: Shield,
  welcome: Sparkles,
  general: MessageSquare
};

// Help text mapping for sample templates
const SAMPLE_HELP_TEXT: Record<string, string> = {
  'Hearing Reminder T-1': 'Auto-fills on hearing date updates',
  'Hearing Same Day': 'Triggered morning of hearing date',
  'Statutory Deadline Approaching': 'Sent 7, 3, 1 days before deadline',
  'Statutory Deadline Today': 'Urgent reminder on deadline day',
  'Case Update': 'Manual trigger for case status changes',
  'Task Assignment': 'Automatic on task creation',
  'Document Request': 'Triggered when documents are requested',
  'OTP Verification': 'Used for authentication flows',
  'Welcome Message': 'Sent on client registration'
};

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

  // Get category icon component
  const getCategoryIcon = (category: string) => {
    const IconComponent = CATEGORY_ICONS[category] || MessageSquare;
    return IconComponent;
  };

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

      {/* ============================================
          BEACON 5.0 ESS SMS TEMPLATE MODAL
          ============================================ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="beacon-modal max-w-2xl h-[80vh] flex flex-col mx-6 md:mx-auto p-0 gap-0 rounded-xl overflow-hidden"
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            boxShadow: '0 25px 50px -12px rgba(0, 71, 255, 0.15), 0 0 0 1px rgba(0, 71, 255, 0.05)'
          }}
        >
          {/* Modal Header - Beacon 5.0 Style */}
          <DialogHeader className="px-6 py-5 border-b shrink-0" style={{ borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }}>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2" style={{ color: '#1E293B' }}>
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'rgba(0, 71, 255, 0.1)' }}>
                <MessageSquare className="h-5 w-5" style={{ color: '#0047FF' }} />
              </div>
              {selectedTemplate ? 'Edit Template' : 'Create SMS Template'}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 cursor-help ml-1" style={{ color: '#64748B' }} />
                </TooltipTrigger>
                <TooltipContent 
                  className="max-w-[280px] p-3 rounded-lg shadow-lg"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}
                >
                  <p className="text-sm" style={{ color: '#334155' }}>
                    <strong>TRAI DLT Compliance:</strong> All SMS templates must be registered with the Telecom Regulatory Authority of India (TRAI) DLT platform before use.
                  </p>
                </TooltipContent>
              </Tooltip>
            </DialogTitle>
            <p className="text-sm mt-1" style={{ color: '#64748B' }}>
              Configure TRAI DLT-compliant message template
            </p>
          </DialogHeader>
          
          {/* Modal Body - Fixed Height with Internal Scroll */}
          <div className="flex-1 overflow-hidden px-6 py-4">
            <Tabs defaultValue="editor" className="h-full flex flex-col">
              {/* Tab Navigation Bar - Beacon 5.0 Style */}
              <TabsList 
                className="grid w-full grid-cols-2 h-12 p-1 rounded-lg shrink-0 mb-4"
                style={{ backgroundColor: '#F1F5F9' }}
              >
                <TabsTrigger 
                  value="editor" 
                  className="rounded-md font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 data-[state=active]:shadow-sm"
                  style={{
                    color: '#64748B'
                  }}
                >
                  <FileText className="h-4 w-4" />
                  Template Editor
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5" style={{ color: '#94A3B8' }} />
                    </TooltipTrigger>
                    <TooltipContent>Create or edit your SMS template</TooltipContent>
                  </Tooltip>
                </TabsTrigger>
                <TabsTrigger 
                  value="samples"
                  className="rounded-md font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 data-[state=active]:shadow-sm"
                  style={{
                    color: '#64748B'
                  }}
                >
                  <Eye className="h-4 w-4" />
                  Sample Templates
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5" style={{ color: '#94A3B8' }} />
                    </TooltipTrigger>
                    <TooltipContent>Browse pre-built TRAI-compliant templates</TooltipContent>
                  </Tooltip>
                </TabsTrigger>
              </TabsList>

              {/* Single-line Help Text */}
              <p className="text-sm px-1 mb-4" style={{ color: '#64748B' }}>
                Select a template to auto-fill variables based on case details.
              </p>

              {/* Tab Content Container - Fixed Height */}
              <div className="flex-1 overflow-hidden relative">
                {/* Editor Tab */}
                <TabsContent 
                  value="editor" 
                  className="absolute inset-0 m-0 data-[state=inactive]:opacity-0 data-[state=active]:opacity-100 transition-opacity duration-200 overflow-y-auto"
                >
                  <Card 
                    className="rounded-xl shadow-sm"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}
                  >
                    <CardContent className="p-6 space-y-6">
                      {/* Row 1: Name & Category */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FieldTooltipWrapper 
                          formId="sms-template" 
                          fieldId="template-name" 
                          label="Template Name"
                          required
                        >
                          <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Hearing Reminder T-1"
                            className="h-10 rounded-lg transition-all"
                            style={{ 
                              borderColor: '#E2E8F0',
                              color: '#334155'
                            }}
                          />
                        </FieldTooltipWrapper>

                        <FieldTooltipWrapper 
                          formId="sms-template" 
                          fieldId="category" 
                          label="Category"
                        >
                          <Select
                            value={formData.category}
                            onValueChange={(value) => setFormData({ ...formData, category: value })}
                          >
                            <SelectTrigger 
                              className="h-10 rounded-lg transition-all"
                              style={{ borderColor: '#E2E8F0' }}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[300] rounded-lg shadow-lg">
                              {TEMPLATE_CATEGORIES.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value} className="rounded-md">
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FieldTooltipWrapper>
                      </div>

                      {/* DLT Template ID */}
                      <FieldTooltipWrapper 
                        formId="sms-template" 
                        fieldId="dlt-template-id" 
                        label="DLT Template ID"
                      >
                        <Input
                          value={formData.dltTemplateId}
                          onChange={(e) => setFormData({ ...formData, dltTemplateId: e.target.value })}
                          placeholder="e.g., 1107171234567890123"
                          className="h-10 font-mono text-sm rounded-lg transition-all"
                          style={{ borderColor: '#E2E8F0', color: '#334155' }}
                        />
                      </FieldTooltipWrapper>

                      {/* Template Text */}
                      <FieldTooltipWrapper 
                        formId="sms-template" 
                        fieldId="template-text" 
                        label="Template Text"
                        required
                      >
                        <div className="space-y-3">
                          <Textarea
                            value={formData.templateText}
                            onChange={(e) => setFormData({ ...formData, templateText: e.target.value })}
                            placeholder="HOFFIC: Your message with {#var#} placeholders. -H-Office"
                            className="font-mono text-sm leading-relaxed min-h-[140px] rounded-lg resize-none transition-all"
                            style={{ borderColor: '#E2E8F0', color: '#334155' }}
                          />
                          <div className="flex items-center justify-between px-1">
                            <p className="text-xs flex items-center gap-1.5" style={{ color: '#64748B' }}>
                              <Info className="h-3.5 w-3.5" />
                              Use <code className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: '#F1F5F9' }}>{'{#var#}'}</code> for dynamic values
                            </p>
                            <Badge 
                              variant={charInfo.length > 160 ? "destructive" : "secondary"}
                              className="font-mono text-xs px-2.5 py-1 rounded-md"
                            >
                              {charInfo.length}/160 • {charInfo.smsCount} SMS
                            </Badge>
                          </div>
                        </div>
                      </FieldTooltipWrapper>

                      {charInfo.length > 160 && (
                        <Alert 
                          variant="default" 
                          className="rounded-lg"
                          style={{ borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
                        >
                          <AlertTriangle className="h-4 w-4" style={{ color: '#F59E0B' }} />
                          <AlertDescription className="text-sm">
                            Message exceeds 160 characters. Will be sent as {charInfo.smsCount} SMS parts.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Active Switch */}
                      <div className="flex items-center gap-3 pt-2 pb-1">
                        <Switch
                          checked={formData.isActive}
                          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                        />
                        <span className="text-sm font-medium" style={{ color: '#1E293B' }}>Active</span>
                        <span className="text-xs" style={{ color: '#64748B' }}>Enable this template for sending</span>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Samples Tab - Beacon 5.0 Card-Based Layout */}
                <TabsContent 
                  value="samples" 
                  className="absolute inset-0 m-0 data-[state=inactive]:opacity-0 data-[state=active]:opacity-100 transition-opacity duration-200 overflow-y-auto"
                >
                  <div className="space-y-3 pr-2">
                    {SAMPLE_TEMPLATES.map((sample, idx) => {
                      const CategoryIcon = getCategoryIcon(sample.category);
                      const categoryLabel = TEMPLATE_CATEGORIES.find(c => c.value === sample.category)?.label || sample.category;
                      const helpText = SAMPLE_HELP_TEXT[sample.name] || 'Click Use to apply this template';
                      
                      return (
                        <Card 
                          key={idx} 
                          className="cursor-pointer rounded-xl transition-all duration-200 group"
                          style={{ 
                            backgroundColor: '#FFFFFF', 
                            border: '1px solid #E2E8F0'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(0, 71, 255, 0.3)';
                            e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 71, 255, 0.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#E2E8F0';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2.5 mb-2">
                                  {/* Category Icon */}
                                  <div 
                                    className="p-1.5 rounded-lg"
                                    style={{ backgroundColor: 'rgba(0, 71, 255, 0.1)' }}
                                  >
                                    <CategoryIcon className="h-4 w-4" style={{ color: '#0047FF' }} />
                                  </div>
                                  <span className="font-semibold" style={{ color: '#1E293B' }}>{sample.name}</span>
                                  
                                  {/* Category Badge with Tooltip */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge 
                                        className="text-xs rounded-full px-2.5 py-0.5 cursor-help"
                                        style={{ 
                                          backgroundColor: '#F1F5F9', 
                                          color: '#334155', 
                                          border: '1px solid #E2E8F0' 
                                        }}
                                      >
                                        {categoryLabel}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Templates for {categoryLabel.toLowerCase()} notifications
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                
                                <p 
                                  className="text-sm font-mono line-clamp-2 break-all mb-2"
                                  style={{ color: '#334155' }}
                                >
                                  {sample.templateText}
                                </p>
                                
                                {/* One-line help text */}
                                <p className="text-xs italic" style={{ color: '#64748B' }}>
                                  {helpText}
                                </p>
                              </div>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    onClick={() => handleUseSample(sample)}
                                    className="shrink-0 rounded-lg shadow-sm text-white transition-all"
                                    style={{ 
                                      backgroundColor: '#0047FF'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#0036CC';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = '#0047FF';
                                    }}
                                  >
                                    Use
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Apply this template to the editor</TooltipContent>
                              </Tooltip>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Modal Footer - Beacon 5.0 Style */}
          <DialogFooter 
            className="px-6 py-4 border-t shrink-0 flex-row justify-end gap-3"
            style={{ borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="h-10 px-5 rounded-lg transition-all"
                  style={{ borderColor: '#E2E8F0', color: '#334155' }}
                >
                  Cancel
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close without saving</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleSave} 
                  disabled={isSending}
                  className="h-10 px-5 rounded-lg shadow-sm text-white transition-all"
                  style={{ backgroundColor: '#0047FF' }}
                  onMouseEnter={(e) => {
                    if (!isSending) e.currentTarget.style.backgroundColor = '#0036CC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#0047FF';
                  }}
                >
                  {isSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {selectedTemplate ? 'Update Template' : 'Create Template'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <span className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  Saves selected template for notifications
                </span>
              </TooltipContent>
            </Tooltip>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test SMS Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="max-w-md mx-4 md:mx-auto">
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
