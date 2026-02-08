import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  ChevronDown, 
  ChevronUp, 
  Wand2, 
  RefreshCw, 
  Copy,
  Eye,
  Check,
  X,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AIDraftControls, AIDraftResult, DraftSection } from '@/services/aiDraftService';
import { Case, Client } from '@/contexts/AppStateContext';
import { FormTemplate } from '@/services/formTemplatesService';

interface PrefillData {
  client: string;
  gstin?: string;
  caseId: string;
  stage: string;
  noticeNo?: string;
  noticeDate?: string;
  period?: string;
  demandSection?: string;
  demandAmount?: string;
}

interface AIAssistantPanelProps {
  template: FormTemplate;
  caseData?: Case;
  clientData?: Client;
  formData: Record<string, any>;
  onDraftGenerated: (result: AIDraftResult) => void;
  onFieldImproved: (fieldKey: string, content: string) => void;
  disabled?: boolean;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  template,
  caseData,
  clientData,
  formData,
  onDraftGenerated,
  onFieldImproved,
  disabled = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrefillModal, setShowPrefillModal] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<AIDraftResult | null>(null);
  const [fieldComparisons, setFieldComparisons] = useState<Record<string, { original: string; ai: string; accepted: boolean }>>({});
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [aiCheckError, setAiCheckError] = useState<string | null>(null);

  const [controls, setControls] = useState<AIDraftControls>({
    tone: 'formal',
    audience: 'officer',
    focusAreas: ['Facts', 'Legal Grounds'],
    personalization: '',
    language: 'english',
    insertCitations: false
  });

  // Check AI service availability on mount
  useEffect(() => {
    const checkAIAvailability = async () => {
      try {
        // Try a lightweight health check by importing the service
        const { aiDraftService } = await import('@/services/aiDraftService');
        // If service loads successfully, AI is potentially available
        setAiAvailable(true);
        setAiCheckError(null);
      } catch (error: any) {
        console.warn('[AIAssistantPanel] AI service check failed:', error);
        setAiAvailable(false);
        setAiCheckError(error.message || 'AI service unavailable');
      }
    };
    
    checkAIAvailability();
  }, []);

  const focusAreaOptions = [
    'Facts',
    'Legal Grounds', 
    'Computations',
    'Reconciliations',
    'Prayer'
  ];

  const prefillData: PrefillData | null = caseData && clientData ? {
    client: clientData.name,
    gstin: clientData.gstin,
    caseId: caseData.id,
    stage: caseData.currentStage,
    noticeNo: 'N/A', // Notice info not in Case interface
    noticeDate: 'N/A',
    period: 'N/A', // Period info not in Case interface  
    demandSection: 'N/A', // Demand info not in Case interface
    demandAmount: 'N/A'
  } : null;

  const handleGenerateDraft = async () => {
    if (!caseData || !clientData) return;

    setIsGenerating(true);
    try {
      // Import the service dynamically to avoid circular dependencies
      const { aiDraftService } = await import('@/services/aiDraftService');
      
      const result = await aiDraftService.generateDraft(
        template.code,
        caseData.id,
        formData,
        controls,
        template,
        caseData,
        clientData,
        'current-user' // TODO: Get from auth context
      );

      setCurrentDraft(result);
      
      // Prepare field comparisons
      const comparisons: Record<string, { original: string; ai: string; accepted: boolean }> = {};
      result.sections.forEach(section => {
        comparisons[section.fieldKey] = {
          original: formData[section.fieldKey] || '',
          ai: section.content,
          accepted: false
        };
      });
      setFieldComparisons(comparisons);
      
      // Show diff modal
      setShowDiffModal(true);
      
    } catch (error) {
      console.error('Failed to generate draft:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptField = (fieldKey: string) => {
    if (fieldComparisons[fieldKey]) {
      setFieldComparisons(prev => ({
        ...prev,
        [fieldKey]: { ...prev[fieldKey], accepted: true }
      }));
      onFieldImproved(fieldKey, fieldComparisons[fieldKey].ai);
    }
  };

  const handleRejectField = (fieldKey: string) => {
    if (fieldComparisons[fieldKey]) {
      setFieldComparisons(prev => ({
        ...prev,
        [fieldKey]: { ...prev[fieldKey], accepted: false }
      }));
    }
  };

  const handleAcceptAllFields = () => {
    Object.keys(fieldComparisons).forEach(fieldKey => {
      if (!fieldComparisons[fieldKey].accepted) {
        handleAcceptField(fieldKey);
      }
    });
    setShowDiffModal(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (disabled) {
    return (
      <Alert className="border-muted">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          AI Draft Assistant is not available for your role. Contact your administrator for access.
        </AlertDescription>
      </Alert>
    );
  }

  // Show unavailable state if AI check failed or is still loading
  if (aiAvailable === false) {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <span className="font-medium">AI Draft Assistant is currently unavailable.</span>
          <br />
          <span className="text-sm">
            {aiCheckError || 'The AI service is temporarily unavailable. Please try again later or contact support.'}
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-primary/5 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Bot className="h-5 w-5" />
                  AI Draft Assistant
                  <Badge variant="secondary" className="ml-2">Beta</Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  {prefillData && (
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">
                        {prefillData.client}
                      </Badge>
                      {prefillData.gstin && (
                        <Badge variant="outline" className="text-xs">
                          {prefillData.gstin}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {prefillData.stage}
                      </Badge>
                    </div>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Prefill Information */}
              {prefillData && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Prefill Data</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPrefillModal(true)}
                      className="text-xs h-7"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Review
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">Case: {prefillData.caseId}</Badge>
                    <Badge variant="outline" className="text-xs">Stage: {prefillData.stage}</Badge>
                    {prefillData.noticeNo && (
                      <Badge variant="outline" className="text-xs">Notice: {prefillData.noticeNo}</Badge>
                    )}
                    {prefillData.demandAmount && (
                      <Badge variant="outline" className="text-xs">Amount: ₹{prefillData.demandAmount}</Badge>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* AI Controls */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select
                    value={controls.tone}
                    onValueChange={(value: any) => setControls(prev => ({ ...prev, tone: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="persuasive">Persuasive</SelectItem>
                      <SelectItem value="concise">Concise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Audience</Label>
                  <Select
                    value={controls.audience}
                    onValueChange={(value: any) => setControls(prev => ({ ...prev, audience: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="officer">Officer</SelectItem>
                      <SelectItem value="appellate_authority">Appellate Authority</SelectItem>
                      <SelectItem value="tribunal">Tribunal</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={controls.language}
                    onValueChange={(value: any) => setControls(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="hindi">Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Insert Citations
                    <Switch
                      checked={controls.insertCitations}
                      onCheckedChange={(checked) => setControls(prev => ({ ...prev, insertCitations: checked }))}
                    />
                  </Label>
                </div>
              </div>

              {/* Focus Areas */}
              <div className="space-y-2">
                <Label>Focus Areas</Label>
                <div className="grid grid-cols-2 gap-2">
                  {focusAreaOptions.map(area => (
                    <div key={area} className="flex items-center space-x-2">
                      <Checkbox
                        id={area}
                        checked={controls.focusAreas.includes(area)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setControls(prev => ({
                              ...prev,
                              focusAreas: [...prev.focusAreas, area]
                            }));
                          } else {
                            setControls(prev => ({
                              ...prev,
                              focusAreas: prev.focusAreas.filter(f => f !== area)
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={area} className="text-sm">
                        {area}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Personalization */}
              <div className="space-y-2">
                <Label>Nuances to Emphasize</Label>
                <Textarea
                  placeholder="e.g., industry practice per CBIC circular, specific precedent cases..."
                  value={controls.personalization}
                  onChange={(e) => setControls(prev => ({ ...prev, personalization: e.target.value }))}
                  rows={2}
                />
              </div>

              {/* Generate Button */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleGenerateDraft}
                  disabled={isGenerating || !caseData || !clientData}
                  className="w-full max-w-md"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating Draft...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Draft with AI
                    </>
                  )}
                </Button>
              </div>

              {/* Safety Notice */}
              <Alert className="border-amber-200 bg-amber-50">
                <Sparkles className="h-4 w-4" />
                <AlertDescription className="text-amber-800">
                  AI-assisted draft. Please review all content before submission.
                </AlertDescription>
              </Alert>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Prefill Review Modal */}
      <Dialog open={showPrefillModal} onOpenChange={setShowPrefillModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Prefill Data Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {prefillData && Object.entries(prefillData).map(([key, value]) => (
              value && (
                <div key={key} className="flex justify-between items-center">
                  <Label className="text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                  </Label>
                  <span className="text-sm text-muted-foreground">{value}</span>
                </div>
              )
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Diff Comparison Modal */}
      <Dialog open={showDiffModal} onOpenChange={setShowDiffModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI Draft Comparison
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6">
            {Object.entries(fieldComparisons).map(([fieldKey, comparison]) => {
              const field = template.fields.find(f => f.key === fieldKey);
              if (!field) return null;

              return (
                <Card key={fieldKey} className={`${comparison.accepted ? 'border-green-200 bg-green-50' : 'border-border'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{field.label}</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant={comparison.accepted ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleAcceptField(fieldKey)}
                          disabled={comparison.accepted}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRejectField(fieldKey)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(comparison.ai)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Original</Label>
                        <div className="mt-1 p-3 bg-muted rounded-md text-sm max-h-32 overflow-y-auto">
                          {comparison.original || <span className="text-muted-foreground italic">Empty</span>}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-primary">AI Generated</Label>
                        <div className="mt-1 p-3 bg-primary/5 border border-primary/20 rounded-md text-sm max-h-32 overflow-y-auto">
                          {comparison.ai}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={() => setShowDiffModal(false)}>
              Close
            </Button>
            <Button onClick={handleAcceptAllFields}>
              Accept All & Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};