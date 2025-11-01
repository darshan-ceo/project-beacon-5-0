import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { CalendarIcon, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { FieldTooltip } from '@/components/ui/field-tooltip';

interface HearingOutcomeSectionProps {
  outcome?: string;
  outcomeText?: string;
  nextHearingDate?: Date;
  autoCreateNextHearing?: boolean;
  onOutcomeChange: (outcome: string) => void;
  onOutcomeTextChange: (text: string) => void;
  onNextHearingDateChange: (date: Date | undefined) => void;
  onAutoCreateChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const HearingOutcomeSection: React.FC<HearingOutcomeSectionProps> = ({
  outcome,
  outcomeText,
  nextHearingDate,
  autoCreateNextHearing,
  onOutcomeChange,
  onOutcomeTextChange,
  onNextHearingDateChange,
  onAutoCreateChange,
  disabled = false
}) => {
  const showNextHearingFields = outcome === 'Adjournment';

  return (
    <Card className="rounded-beacon-lg border bg-card shadow-beacon-md">
      <CardHeader className="border-b border-border p-6 pb-4">
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Hearing Outcome
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {/* Outcome Selector */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Label>Outcome</Label>
            <FieldTooltip formId="create-hearing" fieldId="outcome" />
          </div>
          <Select
            value={outcome}
            onValueChange={onOutcomeChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select outcome" />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              <SelectItem value="Adjournment">Adjournment</SelectItem>
              <SelectItem value="Submission Done">Submission Done</SelectItem>
              <SelectItem value="Order Passed">Order Passed</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Outcome Notes */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="outcome-text">Outcome Notes</Label>
            <FieldTooltip formId="create-hearing" fieldId="outcomeText" />
          </div>
          <Textarea
            id="outcome-text"
            value={outcomeText}
            onChange={(e) => onOutcomeTextChange(e.target.value)}
            disabled={disabled}
            rows={3}
            placeholder="Summary of what transpired in the hearing..."
          />
        </div>

        {/* Next Hearing Fields (conditional - only for Adjournment) */}
        {showNextHearingFields && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label>Next Hearing Date</Label>
                <FieldTooltip formId="create-hearing" fieldId="nextHearingDate" />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !nextHearingDate && "text-muted-foreground"
                    )}
                    disabled={disabled}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {nextHearingDate ? format(nextHearingDate, "PPP") : <span>Pick next hearing date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[200]" align="start">
                  <Calendar
                    mode="single"
                    selected={nextHearingDate}
                    onSelect={onNextHearingDateChange}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Auto-create next hearing checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-create"
                checked={autoCreateNextHearing}
                onCheckedChange={onAutoCreateChange}
                disabled={disabled || !nextHearingDate}
              />
              <Label
                htmlFor="auto-create"
                className="text-sm font-normal cursor-pointer"
              >
                Automatically create next hearing with same details
              </Label>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
