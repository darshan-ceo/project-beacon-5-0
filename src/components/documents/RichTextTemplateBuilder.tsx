import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, Heading3,
  Table as TableIcon, Columns, AlignLeft, AlignCenter, AlignRight, Undo, Redo,
  Code, Quote, Minus, Eye, FileText, Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextTemplateBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: {
    code: string;
    title: string;
    stage: string;
    richContent: string;
    variableMappings: Record<string, string>;
  }) => void;
  initialTemplate?: {
    code: string;
    title: string;
    stage: string;
    richContent?: string;
    variableMappings?: Record<string, string>;
  };
}

interface VariableOption {
  category: string;
  label: string;
  value: string;
  description?: string;
}

const VARIABLE_OPTIONS: VariableOption[] = [
  // Client variables
  { category: 'Client', label: 'Client Name', value: '{{client.name}}', description: 'Full name of the client' },
  { category: 'Client', label: 'Client GSTIN', value: '{{client.gstin}}', description: 'GST identification number' },
  { category: 'Client', label: 'Client Address', value: '{{client.address}}', description: 'Complete address' },
  { category: 'Client', label: 'Client Email', value: '{{client.email}}', description: 'Email address' },
  { category: 'Client', label: 'Client Phone', value: '{{client.phone}}', description: 'Contact number' },
  
  // Case variables
  { category: 'Case', label: 'Case Number', value: '{{case.caseNumber}}', description: 'Unique case identifier' },
  { category: 'Case', label: 'Case Title', value: '{{case.title}}', description: 'Case title/description' },
  { category: 'Case', label: 'Case Stage', value: '{{case.currentStage}}', description: 'Current litigation stage' },
  { category: 'Case', label: 'Notice Type', value: '{{case.noticeType}}', description: 'Type of GST notice' },
  { category: 'Case', label: 'Notice Number', value: '{{case.noticeNumber}}', description: 'Official notice reference' },
  { category: 'Case', label: 'Notice Date', value: '{{case.noticeDate}}', description: 'Date of notice issuance' },
  { category: 'Case', label: 'Demand Amount', value: '{{case.demandAmount}}', description: 'Amount in dispute' },
  { category: 'Case', label: 'Tax Period', value: '{{case.taxPeriod}}', description: 'Relevant tax period' },
  
  // Court/Forum variables
  { category: 'Forum', label: 'Court Name', value: '{{court.name}}', description: 'Name of the court/tribunal' },
  { category: 'Forum', label: 'Court Location', value: '{{court.location}}', description: 'Court city/state' },
  { category: 'Forum', label: 'Bench', value: '{{court.bench}}', description: 'Court bench/division' },
  
  // Employee variables
  { category: 'Employee', label: 'Attorney Name', value: '{{employee.name}}', description: 'Assigned attorney name' },
  { category: 'Employee', label: 'Attorney Email', value: '{{employee.email}}', description: 'Attorney contact email' },
  { category: 'Employee', label: 'Attorney Phone', value: '{{employee.phone}}', description: 'Attorney phone number' },
  { category: 'Employee', label: 'Employee ID', value: '{{employee.employeeId}}', description: 'Employee identification' },
  
  // System variables
  { category: 'System', label: 'Current Date', value: '{{system.currentDate}}', description: 'Today\'s date' },
  { category: 'System', label: 'Financial Year', value: '{{system.financialYear}}', description: 'Current FY' },
];

const STAGES = [
  'Scrutiny', 'Adjudication', 'Demand', 'Appeals', 'GSTAT', 'HC', 'SC'
];

export const RichTextTemplateBuilder: React.FC<RichTextTemplateBuilderProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTemplate
}) => {
  const [templateCode, setTemplateCode] = useState(initialTemplate?.code || '');
  const [templateTitle, setTemplateTitle] = useState(initialTemplate?.title || '');
  const [templateStage, setTemplateStage] = useState(initialTemplate?.stage || '');
  const [previewMode, setPreviewMode] = useState(false);
  const [variableMappings] = useState<Record<string, string>>(initialTemplate?.variableMappings || {});

  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialTemplate?.richContent || '<p>Start typing your template content here...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  const insertVariable = (variable: string) => {
    if (editor) {
      editor.chain().focus().insertContent(variable + ' ').run();
    }
  };

  const insertTable = (rows: number, cols: number) => {
    if (editor) {
      editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    }
  };

  const handleSave = () => {
    if (!templateCode || !templateTitle || !templateStage) {
      return;
    }

    const content = editor?.getHTML() || '';
    
    onSave({
      code: templateCode,
      title: templateTitle,
      stage: templateStage,
      richContent: content,
      variableMappings
    });
  };

  const renderPreview = () => {
    const content = editor?.getHTML() || '';
    // Replace variables with sample data for preview
    let previewContent = content;
    VARIABLE_OPTIONS.forEach(v => {
      previewContent = previewContent.replace(
        new RegExp(v.value.replace(/[{}]/g, '\\$&'), 'g'),
        `<mark class="bg-primary/20 px-1 rounded">[${v.label}]</mark>`
      );
    });
    return previewContent;
  };

  if (!editor) {
    return null;
  }

  const categories = Array.from(new Set(VARIABLE_OPTIONS.map(v => v.category)));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {initialTemplate ? 'Edit Rich Text Template' : 'Create Rich Text Template'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Left Panel - Template Info & Variables */}
          <div className="w-80 flex flex-col gap-4 overflow-hidden">
            {/* Template Info */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div>
                <Label htmlFor="template-code">Template Code*</Label>
                <Input
                  id="template-code"
                  value={templateCode}
                  onChange={(e) => setTemplateCode(e.target.value)}
                  placeholder="e.g., CUSTOM_LETTER_01"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="template-title">Template Title*</Label>
                <Input
                  id="template-title"
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  placeholder="e.g., GST Appeal Letter"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="template-stage">Lifecycle Stage*</Label>
                <Select value={templateStage} onValueChange={setTemplateStage}>
                  <SelectTrigger id="template-stage" className="mt-1">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map(stage => (
                      <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Variables Panel */}
            <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
              <div className="p-3 bg-muted/50 border-b">
                <h3 className="font-medium text-sm">Insert Variables</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Click to insert data fields
                </p>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                  {categories.map(category => (
                    <div key={category}>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                        {category}
                      </h4>
                      <div className="space-y-1">
                        {VARIABLE_OPTIONS
                          .filter(v => v.category === category)
                          .map(variable => (
                            <Button
                              key={variable.value}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs h-auto py-2 px-2"
                              onClick={() => insertVariable(variable.value)}
                            >
                              <div className="text-left">
                                <div className="font-medium">{variable.label}</div>
                                {variable.description && (
                                  <div className="text-[10px] text-muted-foreground">
                                    {variable.description}
                                  </div>
                                )}
                              </div>
                            </Button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Right Panel - Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs value={previewMode ? 'preview' : 'edit'} onValueChange={(v) => setPreviewMode(v === 'preview')} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="edit" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="edit" className="flex-1 flex flex-col overflow-hidden mt-2">
                {/* Toolbar */}
                <div className="border rounded-t-lg bg-muted/50 p-2 flex flex-wrap gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={cn(editor.isActive('bold') && 'bg-primary/10')}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={cn(editor.isActive('italic') && 'bg-primary/10')}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={cn(editor.isActive('strike') && 'bg-primary/10')}
                  >
                    <Underline className="h-4 w-4" />
                  </Button>

                  <Separator orientation="vertical" className="h-8" />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={cn(editor.isActive('heading', { level: 1 }) && 'bg-primary/10')}
                  >
                    <Heading1 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={cn(editor.isActive('heading', { level: 2 }) && 'bg-primary/10')}
                  >
                    <Heading2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={cn(editor.isActive('heading', { level: 3 }) && 'bg-primary/10')}
                  >
                    <Heading3 className="h-4 w-4" />
                  </Button>

                  <Separator orientation="vertical" className="h-8" />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={cn(editor.isActive('bulletList') && 'bg-primary/10')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={cn(editor.isActive('orderedList') && 'bg-primary/10')}
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>

                  <Separator orientation="vertical" className="h-8" />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => insertTable(3, 3)}
                  >
                    <TableIcon className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={cn(editor.isActive('blockquote') && 'bg-primary/10')}
                  >
                    <Quote className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>

                  <Separator orientation="vertical" className="h-8" />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                  >
                    <Undo className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                  >
                    <Redo className="h-4 w-4" />
                  </Button>
                </div>

                {/* Editor */}
                <ScrollArea className="flex-1 border border-t-0 rounded-b-lg">
                  <EditorContent editor={editor} className="min-h-[400px]" />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="preview" className="flex-1 overflow-hidden mt-2">
                <ScrollArea className="h-full border rounded-lg">
                  <div 
                    className="prose prose-sm max-w-none p-4"
                    dangerouslySetInnerHTML={{ __html: renderPreview() }}
                  />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!templateCode || !templateTitle || !templateStage}
          >
            <Plus className="h-4 w-4 mr-2" />
            {initialTemplate ? 'Update Template' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
