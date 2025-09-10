import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Bot, 
  FileText, 
  Upload, 
  Download, 
  Loader2, 
  Wand2, 
  Eye, 
  Save,
  Edit,
  MessageSquare,
  Lightbulb
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { aiService, AIDraft, DocumentSummary } from '@/services/aiService';
import { dmsService } from '@/services/dmsService';
import { draftService } from '@/services/draftService';
import { timelineService } from '@/services/timelineService';
import { useAppState, Case, Document } from '@/contexts/AppStateContext';

interface AIAssistantProps {
  selectedCase: Case | null;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ selectedCase }) => {
  const { state, dispatch } = useAppState();
  
  // Draft Bot State
  const [draftForm, setDraftForm] = useState({
    noticeType: '',
    facts: '',
    annexures: [] as string[]
  });
  const [generatedDraft, setGeneratedDraft] = useState<AIDraft | null>(null);
  const [isDraftGenerating, setIsDraftGenerating] = useState(false);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editedDraftContent, setEditedDraftContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [outputFormat, setOutputFormat] = useState<'pdf' | 'docx'>('pdf');

  // Summarizer State
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [documentSummary, setDocumentSummary] = useState<DocumentSummary | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Available case documents
  const caseDocuments = state.documents.filter(doc => 
    selectedCase && doc.caseId === selectedCase.id
  );

  // Notice types
  const noticeTypes = [
    { value: 'ASMT-10', label: 'ASMT-10 - Assessment Notice' },
    { value: 'ASMT-11', label: 'ASMT-11 - Scrutiny Assessment' },
    { value: 'ASMT-12', label: 'ASMT-12 - Best Judgment Assessment' },
    { value: 'DRC-01', label: 'DRC-01 - DRC Objection' },
    { value: 'DRC-07', label: 'DRC-07 - Additional Submissions' }
  ];

  // Generate AI Draft
  const handleGenerateDraft = async () => {
    if (!selectedCase) {
      toast({
        title: "No Case Selected",
        description: "Please select a case first.",
        variant: "destructive"
      });
      return;
    }

    if (!draftForm.noticeType || !draftForm.facts.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select notice type and provide case facts.",
        variant: "destructive"
      });
      return;
    }

    setIsDraftGenerating(true);
    try {
      const draft = await aiService.generateDraft(
        selectedCase.id,
        draftForm.noticeType,
        draftForm.facts,
        draftForm.annexures
      );
      
      setGeneratedDraft(draft);
      setEditedDraftContent(draft.generatedContent);
      
      // Save draft to DMS
      const draftBlob = new Blob([draft.generatedContent], { type: 'text/plain' });
      const draftFile = new File([draftBlob], `AI_Draft_${draftForm.noticeType}_${Date.now()}.txt`, {
        type: 'text/plain'
      });
      
      await dmsService.uploadForCaseStage(draftFile, selectedCase.id, 'ai-drafts', dispatch);
      
    } catch (error) {
      console.error('Draft generation failed:', error);
    } finally {
      setIsDraftGenerating(false);
    }
  };

  // Save edited draft with enhanced pipeline
  const handleSaveDraft = async () => {
    if (!generatedDraft || !selectedCase) return;
    
    setIsSaving(true);
    
    try {
      // Import draft service
      const { draftService } = await import('@/services/draftService');
      
      // Convert content to HTML format
      const htmlContent = `
        <h1>AI Generated Draft - ${generatedDraft.noticeType}</h1>
        <p><strong>Case:</strong> ${selectedCase.title}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        <hr>
        <div style="white-space: pre-wrap; font-family: monospace;">
          ${editedDraftContent.replace(/\n/g, '<br>')}
        </div>
      `;
      
      // Get next version number
      const version = await draftService.getNextVersion(selectedCase.id, generatedDraft.noticeType);
      
      // Save using standardized pipeline
      const saveResult = await draftService.save({
        caseId: selectedCase.id,
        stageId: selectedCase.currentStage,
        templateCode: generatedDraft.noticeType,
        html: htmlContent,
        output: outputFormat,
        version
      }, dispatch);
      
      // Update local state
      setGeneratedDraft(prev => prev ? { 
        ...prev, 
        generatedContent: editedDraftContent, 
        lastModified: new Date().toISOString() 
      } : null);
      setIsEditingDraft(false);
      
      console.log(`[AIAssistant] Draft saved successfully:`, saveResult);
      
    } catch (error) {
      console.error('[AIAssistant] Failed to save draft:', error);
      // Error toast is already handled by draftService
    } finally {
      setIsSaving(false);
    }
  };

  // Summarize document
  const handleSummarizeDocument = async () => {
    if (!selectedCase) {
      toast({
        title: "No Case Selected",
        description: "Please select a case first.",
        variant: "destructive"
      });
      return;
    }

    let documentToSummarize: Document | null = null;
    let documentContent = '';

    if (selectedDocument) {
      documentToSummarize = selectedDocument;
      documentContent = `Document: ${selectedDocument.name}\nType: ${selectedDocument.type}\nUploaded: ${selectedDocument.uploadedAt}`;
    } else if (uploadedFile) {
      documentContent = await uploadedFile.text();
      // Create a temporary document entry
      documentToSummarize = {
        id: `temp-${Date.now()}`,
        name: uploadedFile.name,
        type: uploadedFile.type,
        size: uploadedFile.size,
        caseId: selectedCase.id,
        clientId: selectedCase.clientId,
        uploadedById: 'current-user',
        uploadedByName: 'Current User',
        uploadedAt: new Date().toISOString(),
        tags: ['ai-summarized'],
        isShared: false,
        path: URL.createObjectURL(uploadedFile)
      };
    } else {
      toast({
        title: "No Document Selected",
        description: "Please select a document or upload a file.",
        variant: "destructive"
      });
      return;
    }

    setIsSummarizing(true);
    try {
      const summary = await aiService.summariseDocument(
        documentToSummarize.id,
        documentContent,
        selectedCase.id
      );
      
      setDocumentSummary(summary);
      
      // Save summary to DMS
      const summaryContent = `DOCUMENT SUMMARY
Generated on: ${new Date().toLocaleString()}
Document: ${documentToSummarize.name}

SUMMARY:
${summary.summary}

KEY POINTS:
${summary.keyPoints.map((point, index) => `${index + 1}. ${point}`).join('\n')}

DEADLINES:
${summary.deadlines.map(deadline => 
  `- ${new Date(deadline.date).toLocaleDateString()}: ${deadline.description} (${deadline.priority} priority)`
).join('\n')}

EXTRACTED ENTITIES:
${summary.extractedEntities.map(entity => 
  `- ${entity.type}: ${entity.value} (${Math.round(entity.confidence * 100)}% confidence)`
).join('\n')}`;

      const summaryBlob = new Blob([summaryContent], { type: 'text/plain' });
      const summaryFile = new File([summaryBlob], `AI_Summary_${documentToSummarize.name}_${Date.now()}.txt`, {
        type: 'text/plain'
      });
      
      await dmsService.uploadForCaseStage(summaryFile, selectedCase.id, 'ai-summaries', dispatch);
      
    } catch (error) {
      console.error('Summarization failed:', error);
    } finally {
      setIsSummarizing(false);
    }
  };

  if (!selectedCase) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Case Selected</h3>
            <p className="text-muted-foreground">Please select a case to use AI features.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center">
              <Bot className="mr-3 h-6 w-6 text-primary" />
              AI Assistant
            </h2>
            <p className="text-muted-foreground">
              Generate drafts and summarize documents for case {selectedCase.caseNumber}
            </p>
          </div>
          <Badge variant="secondary" className="bg-primary-light text-primary">
            <Lightbulb className="mr-1 h-3 w-3" />
            AI Powered
          </Badge>
        </div>

        <Tabs defaultValue="draft-bot" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="draft-bot">Draft Bot</TabsTrigger>
            <TabsTrigger value="summarizer">Document Summarizer</TabsTrigger>
          </TabsList>

          {/* Draft Bot Tab */}
          <TabsContent value="draft-bot" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wand2 className="mr-2 h-5 w-5" />
                  AI Draft Generator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="notice-type">Notice Type</Label>
                    <Select 
                      value={draftForm.noticeType} 
                      onValueChange={(value) => setDraftForm(prev => ({ ...prev, noticeType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select notice type" />
                      </SelectTrigger>
                      <SelectContent>
                        {noticeTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Case Information</Label>
                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      <p><strong>Case:</strong> {selectedCase.title}</p>
                      <p><strong>Client:</strong> {state.clients.find(c => c.id === selectedCase.clientId)?.name}</p>
                      <p><strong>Stage:</strong> {selectedCase.currentStage}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facts">Case Facts</Label>
                  <Textarea
                    id="facts"
                    placeholder="Provide detailed facts of the case that should be included in the draft..."
                    value={draftForm.facts}
                    onChange={(e) => setDraftForm(prev => ({ ...prev, facts: e.target.value }))}
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Annexures (Optional)</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {draftForm.annexures.map((annexure, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer">
                        {annexure}
                        <button
                          onClick={() => setDraftForm(prev => ({
                            ...prev,
                            annexures: prev.annexures.filter((_, i) => i !== index)
                          }))}
                          className="ml-1 text-muted-foreground hover:text-foreground"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add annexure (e.g., Bank statements, PAN copy)"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          setDraftForm(prev => ({
                            ...prev,
                            annexures: [...prev.annexures, e.currentTarget.value.trim()]
                          }));
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleGenerateDraft}
                  disabled={isDraftGenerating || !draftForm.noticeType || !draftForm.facts.trim()}
                  className="w-full"
                >
                  {isDraftGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Draft...
                    </>
                  ) : (
                    <>
                      <Bot className="mr-2 h-4 w-4" />
                      Generate AI Draft
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Generated Draft Display */}
            {generatedDraft && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <FileText className="mr-2 h-5 w-5" />
                      Generated Draft - {generatedDraft.noticeType}
                      <Badge variant="secondary" className="ml-2">v1</Badge>
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingDraft(!isEditingDraft)}
                      >
                        <Edit className="mr-1 h-4 w-4" />
                        {isEditingDraft ? 'Preview' : 'Edit'}
                      </Button>
                      {isEditingDraft && (
                        <div className="flex gap-2">
                          <Select 
                            value={outputFormat} 
                            onValueChange={(value: 'pdf' | 'docx') => setOutputFormat(value)}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pdf">PDF</SelectItem>
                              <SelectItem value="docx">DOCX</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            size="sm" 
                            onClick={handleSaveDraft}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-1 h-4 w-4" />
                                Save as {outputFormat.toUpperCase()}
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditingDraft ? (
                    <Textarea
                      value={editedDraftContent}
                      onChange={(e) => setEditedDraftContent(e.target.value)}
                      rows={20}
                      className="font-mono text-sm"
                    />
                  ) : (
                    <div className="bg-muted p-4 rounded-md">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {editedDraftContent || generatedDraft.generatedContent}
                      </pre>
                    </div>
                  )}
                  
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Generated on: {new Date(generatedDraft.createdAt).toLocaleString()}</span>
                    <span>Last modified: {new Date(generatedDraft.lastModified).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Document Summarizer Tab */}
          <TabsContent value="summarizer" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Document Summarizer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Select Existing Document</Label>
                    <Select 
                      value={selectedDocument?.id || ''} 
                      onValueChange={(value) => {
                        const doc = caseDocuments.find(d => d.id === value);
                        setSelectedDocument(doc || null);
                        setUploadedFile(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose from case documents" />
                      </SelectTrigger>
                      <SelectContent>
                        {caseDocuments.map(doc => (
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.name} ({new Date(doc.uploadedAt).toLocaleDateString()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Or Upload New Document</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadedFile(file);
                            setSelectedDocument(null);
                          }
                        }}
                      />
                      <Upload className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {(selectedDocument || uploadedFile) && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm">
                      <strong>Selected:</strong> {selectedDocument?.name || uploadedFile?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Size: {selectedDocument ? 
                        (selectedDocument.size / 1024).toFixed(1) + ' KB' : 
                        uploadedFile ? (uploadedFile.size / 1024).toFixed(1) + ' KB' : 'Unknown'
                      }
                    </p>
                  </div>
                )}

                <Button 
                  onClick={handleSummarizeDocument}
                  disabled={isSummarizing || (!selectedDocument && !uploadedFile)}
                  className="w-full"
                >
                  {isSummarizing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Summarizing Document...
                    </>
                  ) : (
                    <>
                      <Bot className="mr-2 h-4 w-4" />
                      Generate AI Summary
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Document Summary Display */}
            {documentSummary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="mr-2 h-5 w-5" />
                    Document Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Summary</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      {documentSummary.summary}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Key Points</h4>
                    <ul className="space-y-1">
                      {documentSummary.keyPoints.map((point, index) => (
                        <li key={index} className="text-sm flex items-start">
                          <span className="mr-2 text-primary">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {documentSummary.deadlines.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Important Deadlines</h4>
                      <div className="space-y-2">
                        {documentSummary.deadlines.map((deadline, index) => (
                          <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                            <span className="text-sm">{deadline.description}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant={deadline.priority === 'high' ? 'destructive' : deadline.priority === 'medium' ? 'default' : 'secondary'}>
                                {deadline.priority}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(deadline.date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium mb-2">Extracted Information</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {documentSummary.extractedEntities.map((entity, index) => (
                        <div key={index} className="bg-muted p-2 rounded text-xs">
                          <span className="font-medium capitalize">{entity.type}:</span> {entity.value}
                          <div className="text-muted-foreground">
                            Confidence: {Math.round(entity.confidence * 100)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Generated on: {new Date(documentSummary.createdAt).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};