import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, FileText, Clock, Download } from 'lucide-react';
import { GeneratedForm, Case } from '@/contexts/AppStateContext';
import { formTemplatesService } from '@/services/formTemplatesService';

interface FormChipProps {
  formCode: string;
  case: Case;
  onFormClick: (formCode: string) => void;
  onDownload?: (form: GeneratedForm) => void;
}

export const FormChip: React.FC<FormChipProps> = ({ 
  formCode, 
  case: caseData, 
  onFormClick, 
  onDownload 
}) => {
  const generatedForm = caseData.generatedForms?.find(f => f.formCode === formCode);
  const isCompleted = !!generatedForm;
  const hasMultipleVersions = caseData.generatedForms?.filter(f => f.formCode === formCode).length > 1;

  const getFormDisplayName = (code: string) => {
    const nameMap: Record<string, string> = {
      'ASMT10_REPLY': 'ASMT-10 Reply',
      'ASMT11_REPRESENTATION': 'ASMT-11 Representation',
      'ASMT12_REPLY': 'ASMT-12 Reply',
      'DRC01_REPLY': 'DRC-01 Reply',
      'DRC07_OBJECTION': 'DRC-07 Objection',
      'APPEAL_FIRST': 'Appeal Form',
      'GSTAT': 'GSTAT Form',
      'HC_PETITION': 'HC Petition',
      'SC_SLP': 'SLP/Appeal'
    };
    return nameMap[code] || code;
  };

  const handleClick = () => {
    if (!isCompleted) {
      onFormClick(formCode);
    }
  };

  const handleDownloadLatest = () => {
    if (generatedForm && onDownload) {
      onDownload(generatedForm);
    }
  };

  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 p-2 bg-success/10 border border-success/20 rounded-lg">
        <div className="flex items-center gap-2 flex-1">
          <CheckCircle className="h-4 w-4 text-success" />
          <span className="text-sm font-medium">{getFormDisplayName(formCode)}</span>
          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
            Completed
          </Badge>
          {hasMultipleVersions && (
            <Badge variant="outline" className="text-xs">
              v{generatedForm?.version}
            </Badge>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadLatest}
            className="h-6 px-2 text-success hover:bg-success/20"
          >
            <Download className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFormClick(formCode)}
            className="h-6 px-2 text-success hover:bg-success/20"
          >
            <FileText className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className="flex items-center justify-between p-2 h-auto bg-warning/5 border-warning/30 hover:bg-warning/10 transition-colors"
    >
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-warning" />
        <span className="text-sm font-medium">{getFormDisplayName(formCode)}</span>
      </div>
      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
        Required
      </Badge>
    </Button>
  );
};