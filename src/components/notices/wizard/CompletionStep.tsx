import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  ExternalLink, 
  FolderOpen, 
  FileText, 
  CheckSquare, 
  Upload,
  Plus,
  StickyNote
} from 'lucide-react';

interface CompletionStepProps {
  mode: 'new_case' | 'existing_case';
  caseNumber: string;
  caseId: string;
  noticeNumber: string;
  noticeId: string;
  tasksCreated: number;
  documentUploaded: boolean;
  internalNotes: string;
  legalObservations: string;
  onNotesChange: (notes: string) => void;
  onObservationsChange: (observations: string) => void;
  onViewCase: () => void;
  onAddAnotherNotice: () => void;
  onClose: () => void;
}

export const CompletionStep: React.FC<CompletionStepProps> = ({
  mode,
  caseNumber,
  caseId,
  noticeNumber,
  noticeId,
  tasksCreated,
  documentUploaded,
  internalNotes,
  legalObservations,
  onNotesChange,
  onObservationsChange,
  onViewCase,
  onAddAnotherNotice,
  onClose
}) => {
  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">
          {mode === 'new_case' ? 'Case Created Successfully!' : 'Notice Linked Successfully!'}
        </h2>
        <p className="text-muted-foreground">
          {mode === 'new_case' 
            ? 'Your new case has been created with all notice details.'
            : 'The notice has been added to the existing case.'}
        </p>
      </div>

      {/* Summary Card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Case Number</p>
                <p className="font-mono font-medium">{caseNumber || 'N/A'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Notice Reference</p>
                <p className="font-mono font-medium">{noticeNumber || 'N/A'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tasks Created</p>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{tasksCreated}</span>
                  <Badge variant="secondary" className="text-xs">Auto-generated</Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background">
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Document</p>
                <div className="flex items-center gap-2">
                  {documentUploaded ? (
                    <>
                      <span className="font-medium">Uploaded</span>
                      <CheckCircle className="h-3 w-3 text-primary" />
                    </>
                  ) : (
                    <span className="text-muted-foreground">Not uploaded</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Internal Notes (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="internal_notes" className="text-xs text-muted-foreground">
              Internal Notes
            </Label>
            <Textarea
              id="internal_notes"
              placeholder="Add any internal notes about this notice..."
              value={internalNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>
          
          <div>
            <Label htmlFor="legal_observations" className="text-xs text-muted-foreground">
              Legal Observations
            </Label>
            <Textarea
              id="legal_observations"
              placeholder="Add any legal observations or strategy notes..."
              value={legalObservations}
              onChange={(e) => onObservationsChange(e.target.value)}
              className="mt-1"
              rows={2}
            />
            <p className="text-xs text-muted-foreground mt-1">
              These notes are internal only and not visible to clients.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button 
          onClick={onViewCase}
          className="flex-1"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View Case
        </Button>
        
        <Button 
          variant="outline"
          onClick={onAddAnotherNotice}
          className="flex-1"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Notice
        </Button>
        
        <Button 
          variant="ghost"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </div>
  );
};
