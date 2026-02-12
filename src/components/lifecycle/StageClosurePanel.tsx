/**
 * Stage Closure Panel Component
 * Full embedded closure form with demand breakdown, two-action footer
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle2, 
  AlertTriangle,
  ChevronDown,
  Save,
  ArrowRight,
  XCircle,
  Info
} from 'lucide-react';
import { ClosureStatus, StageClosureFormData, INITIAL_CLOSURE_FORM, EMPTY_TAX_BREAKDOWN } from '@/types/stageClosureDetails';
import { stageClosureDetailsService } from '@/services/stageClosureDetailsService';
import { cn } from '@/lib/utils';

interface StageClosurePanelProps {
  stageKey: string;
  stageInstanceId: string | null;
  caseId: string;
  closureWarnings?: string[];
  onSaveClosure: (data: StageClosureFormData) => Promise<void>;
  onCloseStage: (data: StageClosureFormData) => Promise<void>;
  isSaving?: boolean;
  isClosing?: boolean;
  isReadOnly?: boolean;
}

const CLOSURE_STATUSES: { value: ClosureStatus; label: string }[] = [
  { value: 'Order Passed', label: 'Order Passed' },
  { value: 'Fully Dropped', label: 'Fully Dropped' },
  { value: 'Withdrawn', label: 'Withdrawn' },
  { value: 'Settled', label: 'Settled' },
  { value: 'Remanded', label: 'Remanded' },
];

const STAGE_ORDER = ['Assessment', 'Adjudication', 'First Appeal', 'Tribunal', 'High Court', 'Supreme Court'];

function getNextLevelText(status: ClosureStatus | '', stageKey: string): string {
  if (!status) return '—';
  if (status === 'Order Passed') {
    const idx = STAGE_ORDER.indexOf(stageKey);
    if (idx >= 0 && idx < STAGE_ORDER.length - 1) return `Next Stage: ${STAGE_ORDER[idx + 1]}`;
    return 'Final Stage (No further stage)';
  }
  if (status === 'Fully Dropped' || status === 'Withdrawn' || status === 'Settled') {
    return 'No Movement (Case Closed at this Level)';
  }
  if (status === 'Remanded') return 'Remand to Earlier Stage';
  return '—';
}

export const StageClosurePanel: React.FC<StageClosurePanelProps> = ({
  stageKey,
  stageInstanceId,
  caseId,
  closureWarnings = [],
  onSaveClosure,
  onCloseStage,
  isSaving = false,
  isClosing = false,
  isReadOnly = false
}) => {
  const [form, setForm] = useState<StageClosureFormData>({ ...INITIAL_CLOSURE_FORM });
  const [taxExpanded, setTaxExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Reset form when stage instance changes
  useEffect(() => {
    setForm({ ...INITIAL_CLOSURE_FORM });
    setLoaded(false);
  }, [stageInstanceId]);

  // Load existing draft
  useEffect(() => {
    if (!stageInstanceId || loaded) return;
    (async () => {
      const existing = await stageClosureDetailsService.getByStageInstanceId(stageInstanceId);
      if (existing) {
        setForm({
          closure_status: existing.closure_status as ClosureStatus,
          closure_ref_no: existing.closure_ref_no || '',
          closure_date: existing.closure_date || '',
          issuing_authority: existing.issuing_authority || '',
          officer_name: existing.officer_name || '',
          officer_designation: existing.officer_designation || '',
          final_tax_amount: existing.final_tax_amount || { ...EMPTY_TAX_BREAKDOWN },
          final_interest_amount: existing.final_interest_amount || 0,
          final_penalty_amount: existing.final_penalty_amount || 0,
          interest_applicable: true,
          penalty_applicable: true,
          closure_notes: existing.closure_notes || ''
        });
      }
      setLoaded(true);
    })();
  }, [stageInstanceId, loaded]);

  const isFullyDropped = form.closure_status === 'Fully Dropped';

  // Auto-zero amounts when Fully Dropped
  useEffect(() => {
    if (isFullyDropped) {
      setForm(prev => ({
        ...prev,
        final_tax_amount: { ...EMPTY_TAX_BREAKDOWN },
        final_interest_amount: 0,
        final_penalty_amount: 0,
      }));
    }
  }, [isFullyDropped]);

  const taxTotal = useMemo(() => {
    const t = form.final_tax_amount;
    return (t.igst || 0) + (t.cgst || 0) + (t.sgst || 0) + (t.cess || 0);
  }, [form.final_tax_amount]);

  const finalTotalDemand = useMemo(() => {
    return taxTotal + (form.final_interest_amount || 0) + (form.final_penalty_amount || 0);
  }, [taxTotal, form.final_interest_amount, form.final_penalty_amount]);

  const updateField = useCallback(<K extends keyof StageClosureFormData>(key: K, value: StageClosureFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateTax = useCallback((field: keyof typeof EMPTY_TAX_BREAKDOWN, value: number) => {
    setForm(prev => ({
      ...prev,
      final_tax_amount: { ...prev.final_tax_amount, [field]: value }
    }));
  }, []);

  const isValid = useMemo(() => {
    return !!(
      form.closure_status &&
      form.closure_ref_no &&
      form.closure_date &&
      form.issuing_authority &&
      form.officer_name &&
      form.officer_designation
    );
  }, [form]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Stage Closure
        </CardTitle>
        <CardDescription>
          Close the {stageKey} stage with a closure outcome and order details
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* Warnings Banner */}
        {closureWarnings.length > 0 && (
          <div className="rounded-lg border border-warning/50 bg-warning/10 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning-foreground">
                  Some workflow steps are incomplete
                </p>
                <ul className="mt-1 text-xs text-muted-foreground list-disc list-inside">
                  {closureWarnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
                <p className="text-xs text-muted-foreground mt-1 italic">
                  You can still close this stage.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section 1: Closure Details */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Closure Details</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Closure Status */}
            <div className="space-y-1.5">
              <Label htmlFor="closure_status" className="text-xs">Closure Status <span className="text-destructive">*</span></Label>
              <Select
                value={form.closure_status}
                onValueChange={(v) => updateField('closure_status', v as ClosureStatus)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  {CLOSURE_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Move to Next Level (read-only) */}
            <div className="space-y-1.5">
              <Label className="text-xs">Move to Next Level</Label>
              <div className="h-9 px-3 rounded-md border bg-muted/50 flex items-center text-sm text-muted-foreground">
                {getNextLevelText(form.closure_status, stageKey)}
              </div>
            </div>

            {/* Reference No */}
            <div className="space-y-1.5">
              <Label htmlFor="closure_ref_no" className="text-xs">Closure/Order Ref No <span className="text-destructive">*</span></Label>
              <Input
                id="closure_ref_no"
                value={form.closure_ref_no}
                onChange={(e) => updateField('closure_ref_no', e.target.value)}
                placeholder="e.g., ORD/2026/001"
                className="h-9"
              />
            </div>

            {/* Closure Date */}
            <div className="space-y-1.5">
              <Label htmlFor="closure_date" className="text-xs">Closure/Order Date <span className="text-destructive">*</span></Label>
              <Input
                id="closure_date"
                type="date"
                value={form.closure_date}
                onChange={(e) => updateField('closure_date', e.target.value)}
                className="h-9"
              />
            </div>

            {/* Issuing Authority */}
            <div className="space-y-1.5">
              <Label htmlFor="issuing_authority" className="text-xs">Issuing Authority <span className="text-destructive">*</span></Label>
              <Input
                id="issuing_authority"
                value={form.issuing_authority}
                onChange={(e) => updateField('issuing_authority', e.target.value)}
                placeholder="Authority name"
                className="h-9"
              />
            </div>

            {/* Officer Name */}
            <div className="space-y-1.5">
              <Label htmlFor="officer_name" className="text-xs">Officer Name <span className="text-destructive">*</span></Label>
              <Input
                id="officer_name"
                value={form.officer_name}
                onChange={(e) => updateField('officer_name', e.target.value)}
                placeholder="Officer name"
                className="h-9"
              />
            </div>

            {/* Officer Designation */}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="officer_designation" className="text-xs">Officer Designation <span className="text-destructive">*</span></Label>
              <Input
                id="officer_designation"
                value={form.officer_designation}
                onChange={(e) => updateField('officer_designation', e.target.value)}
                placeholder="e.g., Joint Commissioner"
                className="h-9"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Section 2: Final Demand Amount Breakdown */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Final Demand Amount Breakdown</Label>

          {isFullyDropped && (
            <div className="rounded-lg border border-success/50 bg-success/10 p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-success mt-0.5" />
              <p className="text-xs text-success-foreground">
                This case will be marked as Closed as all demands are fully dropped. All amounts are set to ₹0.
              </p>
            </div>
          )}

          {/* Tax Amount - collapsible breakdown */}
          <Collapsible open={taxExpanded} onOpenChange={setTaxExpanded}>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Final Tax Amount</Label>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" disabled={isFullyDropped}>
                  <ChevronDown className={cn("h-3 w-3 mr-1 transition-transform", taxExpanded && "rotate-180")} />
                  {taxExpanded ? 'Collapse' : 'Expand'} Breakdown
                </Button>
              </CollapsibleTrigger>
            </div>
            <div className="h-9 px-3 rounded-md border bg-muted/30 flex items-center text-sm font-medium">
              ₹ {taxTotal.toLocaleString('en-IN')}
            </div>
            <CollapsibleContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {(['igst', 'cgst', 'sgst', 'cess'] as const).map(field => (
                  <div key={field} className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">{field}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.final_tax_amount[field] || ''}
                      onChange={(e) => updateTax(field, parseFloat(e.target.value) || 0)}
                      disabled={isFullyDropped}
                      className="h-8 text-xs"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Interest */}
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Final Interest Amount</Label>
              <Input
                type="number"
                min={0}
                value={form.interest_applicable ? (form.final_interest_amount || '') : ''}
                onChange={(e) => updateField('final_interest_amount', parseFloat(e.target.value) || 0)}
                disabled={isFullyDropped || !form.interest_applicable}
                className="h-9"
                placeholder="0"
              />
            </div>
            <div className="flex items-center gap-1.5 pt-5">
              <Checkbox
                id="interest_applicable"
                checked={form.interest_applicable}
                onCheckedChange={(v) => {
                  updateField('interest_applicable', !!v);
                  if (!v) updateField('final_interest_amount', 0);
                }}
                disabled={isFullyDropped}
              />
              <Label htmlFor="interest_applicable" className="text-[10px] text-muted-foreground">Applicable</Label>
            </div>
          </div>

          {/* Penalty */}
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Final Penalty Amount</Label>
              <Input
                type="number"
                min={0}
                value={form.penalty_applicable ? (form.final_penalty_amount || '') : ''}
                onChange={(e) => updateField('final_penalty_amount', parseFloat(e.target.value) || 0)}
                disabled={isFullyDropped || !form.penalty_applicable}
                className="h-9"
                placeholder="0"
              />
            </div>
            <div className="flex items-center gap-1.5 pt-5">
              <Checkbox
                id="penalty_applicable"
                checked={form.penalty_applicable}
                onCheckedChange={(v) => {
                  updateField('penalty_applicable', !!v);
                  if (!v) updateField('final_penalty_amount', 0);
                }}
                disabled={isFullyDropped}
              />
              <Label htmlFor="penalty_applicable" className="text-[10px] text-muted-foreground">Applicable</Label>
            </div>
          </div>

          {/* Final Total Demand */}
          <div className="rounded-lg border-2 border-destructive/30 bg-destructive/5 p-3 flex items-center justify-between">
            <Label className="text-sm font-semibold">Final Total Demand</Label>
            <span className="text-lg font-bold text-destructive">
              ₹ {finalTotalDemand.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <Separator />

        {/* Section 3: Closure Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="closureNotes" className="text-xs">Closure Notes (Optional)</Label>
          <Textarea
            id="closureNotes"
            placeholder="Add any notes about this stage closure..."
            value={form.closure_notes}
            onChange={(e) => updateField('closure_notes', e.target.value)}
            rows={2}
          />
        </div>

        {/* Footer: Two Buttons */}
        {!isReadOnly && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onSaveClosure(form)}
              disabled={!form.closure_status || isSaving}
            >
              {isSaving ? 'Saving...' : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Closure
                </>
              )}
            </Button>
            <Button
              className="flex-1"
              onClick={() => onCloseStage(form)}
              disabled={!isValid || isClosing}
            >
              {isClosing ? 'Closing Stage...' : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Close Stage
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
