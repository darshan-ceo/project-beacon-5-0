import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckSquare, FileText, Bell, Gavel, FileCheck, Info } from 'lucide-react';
import type { NoticeStageTag } from './types';

interface StageAwarenessStepProps {
  stageTag: NoticeStageTag;
  onStageTagChange: (tag: NoticeStageTag) => void;
  wizardMode: 'new_case' | 'existing_case';
  tasksToGenerate: Array<{ title: string; priority: string }>;
}

const STAGE_OPTIONS: Array<{
  value: NoticeStageTag;
  label: string;
  description: string;
  icon: React.ElementType;
  tasks: string[];
}> = [
  {
    value: 'SCN',
    label: 'Show Cause Notice',
    description: 'Initial notice requiring response within statutory period',
    icon: FileText,
    tasks: ['Draft Reply', 'Collect Supporting Documents', 'Review & Approval', 'File Response']
  },
  {
    value: 'Reminder',
    label: 'Reminder / Follow-up',
    description: 'Follow-up notice for pending compliance or documentation',
    icon: Bell,
    tasks: ['Review Requirements', 'Prepare Response', 'Submit Compliance']
  },
  {
    value: 'Hearing',
    label: 'Hearing Notice',
    description: 'Notice scheduling personal hearing or adjudication',
    icon: Gavel,
    tasks: ['Prepare Hearing Brief', 'Organize Documents', 'Hearing Attendance', 'Record Proceedings']
  },
  {
    value: 'Order',
    label: 'Order',
    description: 'Final order or assessment order requiring appeal consideration',
    icon: FileCheck,
    tasks: ['Analyze Order', 'Calculate Appeal Timeline', 'Draft Appeal (if applicable)', 'Compliance Action']
  }
];

export const StageAwarenessStep: React.FC<StageAwarenessStepProps> = ({
  stageTag,
  onStageTagChange,
  wizardMode,
  tasksToGenerate
}) => {
  const selectedOption = STAGE_OPTIONS.find(opt => opt.value === stageTag);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <CheckSquare className="h-10 w-10 mx-auto mb-3 text-primary" />
        <h2 className="text-xl font-semibold mb-1">Stage & Task Generation</h2>
        <p className="text-sm text-muted-foreground">
          Classify the notice type to auto-generate appropriate workflow tasks
        </p>
      </div>

      {/* Stage Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Notice Classification</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={stageTag}
            onValueChange={(value) => onStageTagChange(value as NoticeStageTag)}
            className="grid gap-3"
          >
            {STAGE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = stageTag === option.value;
              
              return (
                <div
                  key={option.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => onStageTagChange(option.value)}
                >
                  <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor={option.value} className="font-medium cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Tasks Preview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Tasks to be Generated
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {selectedOption?.tasks.length || 0} tasks
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {selectedOption ? (
            <div className="space-y-2">
              {selectedOption.tasks.map((task, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-2 rounded bg-muted border border-border"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {index + 1}
                  </div>
                  <span className="text-sm text-foreground">{task}</span>
                  <Badge variant="outline" className="ml-auto text-xs bg-background">
                    Auto
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Select a notice type to preview tasks
            </p>
          )}
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Tasks will be automatically linked to the {wizardMode === 'new_case' ? 'new case' : 'selected case'} 
          and assigned to the designated owner with due dates calculated from the notice response deadline.
        </AlertDescription>
      </Alert>
    </div>
  );
};
