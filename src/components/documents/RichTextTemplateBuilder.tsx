import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import DOMPurify from 'dompurify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading1, Heading2, Heading3,
  Table as TableIcon, Columns, AlignLeft, AlignCenter, AlignRight, Undo, Redo,
  Code, Quote, Minus, Eye, FileText, Plus, HelpCircle, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CASE_STAGES } from '@/utils/stageUtils';

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
  { category: 'Forum', label: 'Legal Forum Name', value: '{{court.name}}', description: 'Name of the legal forum/tribunal' },
  { category: 'Forum', label: 'Legal Forum Location', value: '{{court.location}}', description: 'Legal forum city/state' },
  { category: 'Forum', label: 'Bench', value: '{{court.bench}}', description: 'Legal forum bench/division' },
  
  // Employee variables
  { category: 'Employee', label: 'Attorney Name', value: '{{employee.name}}', description: 'Assigned attorney name' },
  { category: 'Employee', label: 'Attorney Email', value: '{{employee.email}}', description: 'Attorney contact email' },
  { category: 'Employee', label: 'Attorney Phone', value: '{{employee.phone}}', description: 'Attorney phone number' },
  { category: 'Employee', label: 'Employee ID', value: '{{employee.employeeId}}', description: 'Employee identification' },
  
  // System variables
  { category: 'System', label: 'Current Date', value: '{{system.currentDate}}', description: 'Today\'s date' },
  { category: 'System', label: 'Financial Year', value: '{{system.financialYear}}', description: 'Current FY' },
];

// Using canonical CASE_STAGES from stageUtils

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
  const [showHelp, setShowHelp] = useState(false);
  const [variableMappings] = useState<Record<string, string>>(initialTemplate?.variableMappings || {});

  const editor = useEditor({
    extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
          },
          bulletList: {
            keepMarks: true,
            keepAttributes: false,
          },
          orderedList: {
            keepMarks: true,
            keepAttributes: false,
          },
          listItem: {
            HTMLAttributes: {
              class: 'ml-4',
            },
          },
          blockquote: {
            HTMLAttributes: {
              class: 'border-l-4 border-border pl-4 italic',
            },
          },
          horizontalRule: {
            HTMLAttributes: {
              class: 'my-4 border-t border-border',
            },
          },
        }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
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
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {initialTemplate ? 'Edit Rich Text Template' : 'Create Rich Text Template'}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHelp(!showHelp)}
                    className={cn(showHelp && 'bg-primary/10')}
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Quick Help & Shortcuts</TooltipContent>
              </Tooltip>
            </DialogTitle>
          </DialogHeader>

          {/* Help Panel */}
          <Collapsible open={showHelp} onOpenChange={setShowHelp}>
            <CollapsibleContent className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Keyboard Shortcuts</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span>Bold</span><kbd className="px-2 py-0.5 bg-background rounded border">Ctrl+B</kbd></div>
                    <div className="flex justify-between"><span>Italic</span><kbd className="px-2 py-0.5 bg-background rounded border">Ctrl+I</kbd></div>
                    <div className="flex justify-between"><span>Underline</span><kbd className="px-2 py-0.5 bg-background rounded border">Ctrl+U</kbd></div>
                    <div className="flex justify-between"><span>Undo</span><kbd className="px-2 py-0.5 bg-background rounded border">Ctrl+Z</kbd></div>
                    <div className="flex justify-between"><span>Redo</span><kbd className="px-2 py-0.5 bg-background rounded border">Ctrl+Shift+Z</kbd></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2">Quick Tips</h4>
                  <ul className="space-y-1 text-xs list-disc list-inside">
                    <li>Click variables on the left to insert them</li>
                    <li>Variables appear as {`{{client.name}}`} in your template</li>
                    <li>Use Preview tab to see how variables render</li>
                    <li>Tables can be resized and styled in the editor</li>
                    <li>All formatting is preserved in generated documents</li>
                  </ul>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

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
                    {CASE_STAGES.map(stage => (
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
                            <Tooltip key={variable.value}>
                              <TooltipTrigger asChild>
                                <Button
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
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <div className="space-y-1">
                                  <div className="font-medium">{variable.label}</div>
                                  <div className="text-xs text-muted-foreground">{variable.description}</div>
                                  <div className="text-xs font-mono bg-muted px-1 rounded">{variable.value}</div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={cn(editor.isActive('bold') && 'bg-primary/10')}
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Bold (Ctrl+B)</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={cn(editor.isActive('italic') && 'bg-primary/10')}
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Italic (Ctrl+I)</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={cn(editor.isActive('underline') && 'bg-primary/10')}
                      >
                        <UnderlineIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Underline (Ctrl+U)</TooltipContent>
                  </Tooltip>

                  <Separator orientation="vertical" className="h-8" />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={cn(editor.isActive('heading', { level: 1 }) && 'bg-primary/10')}
                      >
                        <Heading1 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Heading 1</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={cn(editor.isActive('heading', { level: 2 }) && 'bg-primary/10')}
                      >
                        <Heading2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Heading 2</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        className={cn(editor.isActive('heading', { level: 3 }) && 'bg-primary/10')}
                      >
                        <Heading3 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Heading 3</TooltipContent>
                  </Tooltip>

                  <Separator orientation="vertical" className="h-8" />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={cn(editor.isActive('bulletList') && 'bg-primary/10')}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Bullet List</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={cn(editor.isActive('orderedList') && 'bg-primary/10')}
                      >
                        <ListOrdered className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Numbered List</TooltipContent>
                  </Tooltip>

                  <Separator orientation="vertical" className="h-8" />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        className={cn(editor.isActive({ textAlign: 'left' }) && 'bg-primary/10')}
                      >
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Align Left</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        className={cn(editor.isActive({ textAlign: 'center' }) && 'bg-primary/10')}
                      >
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Align Center</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        className={cn(editor.isActive({ textAlign: 'right' }) && 'bg-primary/10')}
                      >
                        <AlignRight className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Align Right</TooltipContent>
                  </Tooltip>

                  <Separator orientation="vertical" className="h-8" />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertTable(3, 3)}
                      >
                        <TableIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Insert Table (3x3)</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className={cn(editor.isActive('blockquote') && 'bg-primary/10')}
                      >
                        <Quote className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Block Quote</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().setHorizontalRule().run()}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Horizontal Line</TooltipContent>
                  </Tooltip>

                  <Separator orientation="vertical" className="h-8" />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                      >
                        <Undo className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                      >
                        <Redo className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
                  </Tooltip>
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
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(renderPreview(), {
                        ALLOWED_TAGS: ['p', 'div', 'span', 'b', 'i', 'u', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
                        ALLOWED_ATTR: ['style', 'class', 'colspan', 'rowspan']
                      })
                    }}
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
    </TooltipProvider>
  );
};
