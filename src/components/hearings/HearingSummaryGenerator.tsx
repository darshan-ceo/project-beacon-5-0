import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { Hearing } from '@/contexts/AppStateContext';
import { useAppState } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface HearingSummaryGeneratorProps {
  hearing: Hearing;
}

export const HearingSummaryGenerator: React.FC<HearingSummaryGeneratorProps> = ({ hearing }) => {
  const { state } = useAppState();
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    
    try {
      // Get related data
      const caseData = state.cases.find(c => c.id === hearing.case_id);
      const forum = state.courts.find(c => c.id === hearing.forum_id || hearing.court_id);
      const authority = hearing.authority_id ? state.courts.find(c => c.id === hearing.authority_id) : null;
      const judges = state.judges.filter(j => hearing.judge_ids?.includes(j.id));

      // Simulate AI generation (replace with actual Lovable AI API call when backend is ready)
      const mockSummary = `
## Hearing Summary

**Case:** ${caseData?.caseNumber} - ${caseData?.title}

**Hearing Date:** ${hearing.date} at ${hearing.start_time}

**Forum:** ${forum?.name || 'N/A'}

**Authority:** ${authority?.name || 'N/A'}

**Presiding Judge(s):** ${judges.map(j => j.name).join(', ') || 'Not specified'}

### What Happened

${hearing.outcome_text || 'No outcome notes recorded for this hearing.'}

### Current Status

${hearing.outcome ? `Hearing outcome: **${hearing.outcome}**` : 'Hearing status: Scheduled'}

${hearing.next_hearing_date ? `Next hearing scheduled for: **${hearing.next_hearing_date}**` : ''}

### Recommended Next Steps

${hearing.outcome === 'Adjournment' 
  ? '1. Monitor adjournment notice for new date\n2. Prepare additional documentation as directed\n3. Update client on new hearing schedule'
  : hearing.outcome === 'Submission Done'
    ? '1. Await written order from the court\n2. Review order upon receipt\n3. Determine if appeal/revision is necessary'
    : hearing.outcome === 'Order Passed'
      ? '1. Obtain certified copy of the order\n2. Analyze implications for the case\n3. Discuss next legal steps with client'
      : '1. Finalize hearing preparation documents\n2. Brief client on expected proceedings\n3. Confirm all evidence and witnesses are ready'
}

---
*This summary was AI-generated. Please review for accuracy.*
      `;

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSummary(mockSummary);
      
      toast({
        title: 'Summary Generated',
        description: 'AI-powered hearing summary created successfully.',
      });
      
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: 'Generation Failed',
        description: 'Could not generate AI summary. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: 'Copied to Clipboard',
      description: 'Summary copied successfully.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Generated Summary
          </span>
          <div className="flex gap-2">
            {summary && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={handleGenerateSummary}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {summary ? 'Regenerate' : 'Generate Summary'}
                </>
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {summary ? (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{summary}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-8">
            Click "Generate Summary" to create an AI-powered summary of this hearing's outcome and recommended next steps.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
