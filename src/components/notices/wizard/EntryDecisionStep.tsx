import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FolderPlus, FolderOpen, ArrowRight } from 'lucide-react';
import type { WizardMode } from './types';

interface EntryDecisionStepProps {
  selectedMode: WizardMode | null;
  onModeSelect: (mode: WizardMode) => void;
}

export const EntryDecisionStep: React.FC<EntryDecisionStepProps> = ({
  selectedMode,
  onModeSelect
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold mb-2">What would you like to do?</h2>
        <p className="text-muted-foreground">
          Choose how to process this notice
        </p>
      </div>

      <RadioGroup 
        value={selectedMode || ''} 
        onValueChange={(value) => onModeSelect(value as WizardMode)}
        className="grid gap-4"
      >
        {/* New Case Option */}
        <Card 
          className={`cursor-pointer transition-all hover:border-primary ${
            selectedMode === 'new_case' ? 'border-primary ring-2 ring-primary/20' : ''
          }`}
          onClick={() => onModeSelect('new_case')}
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <RadioGroupItem value="new_case" id="new_case" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FolderPlus className="h-5 w-5 text-primary" />
                  </div>
                  <Label htmlFor="new_case" className="text-base font-semibold cursor-pointer">
                    Create a New Case from Notice
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground ml-11">
                  Start a new legal case by uploading a notice. The wizard will guide you through 
                  extracting data, creating the case, and setting up compliance tracking.
                </p>
                <div className="flex items-center gap-2 mt-3 ml-11 text-xs text-muted-foreground">
                  <span className="px-2 py-1 rounded bg-secondary">Upload</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="px-2 py-1 rounded bg-secondary">Extract</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="px-2 py-1 rounded bg-secondary">Create Case</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="px-2 py-1 rounded bg-secondary">Tasks</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Existing Case Option */}
        <Card 
          className={`cursor-pointer transition-all hover:border-primary ${
            selectedMode === 'existing_case' ? 'border-primary ring-2 ring-primary/20' : ''
          }`}
          onClick={() => onModeSelect('existing_case')}
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <RadioGroupItem value="existing_case" id="existing_case" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-secondary">
                    <FolderOpen className="h-5 w-5 text-foreground" />
                  </div>
                  <Label htmlFor="existing_case" className="text-base font-semibold cursor-pointer">
                    Add this Notice to an Existing Case
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground ml-11">
                  Link a new notice (reminder, additional SCN, hearing notice) to a case that 
                  already exists in the system.
                </p>
                <div className="flex items-center gap-2 mt-3 ml-11 text-xs text-muted-foreground">
                  <span className="px-2 py-1 rounded bg-secondary">Upload</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="px-2 py-1 rounded bg-secondary">Extract</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="px-2 py-1 rounded bg-secondary">Select Case</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="px-2 py-1 rounded bg-secondary">Link Notice</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </RadioGroup>
    </div>
  );
};
