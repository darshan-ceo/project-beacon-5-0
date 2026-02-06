import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IndianRupee, Scale, CheckCircle, AlertTriangle } from 'lucide-react';
import type { ExtractedNoticeDataV2 } from './types';

interface FinancialValidationStepProps {
  extractedData: Partial<ExtractedNoticeDataV2>;
  onUpdateField: (field: keyof ExtractedNoticeDataV2, value: any) => void;
  confirmed: boolean;
  onConfirmChange: (confirmed: boolean) => void;
}

export const FinancialValidationStep: React.FC<FinancialValidationStepProps> = ({
  extractedData,
  onUpdateField,
  confirmed,
  onConfirmChange
}) => {
  const formatCurrency = (amount: number | null | undefined): string => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const parseCurrency = (value: string): number | null => {
    const cleaned = value.replace(/[₹,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  // Calculate total demand
  const calculateTotal = (): number => {
    let total = 0;
    if (extractedData.tax_applicable && extractedData.tax_amount) {
      total += extractedData.tax_amount;
    }
    if (extractedData.interest_applicable && extractedData.interest_amount) {
      total += extractedData.interest_amount;
    }
    if (extractedData.penalty_applicable && extractedData.penalty_amount) {
      total += extractedData.penalty_amount;
    }
    return total;
  };

  const totalDemand = calculateTotal();

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <IndianRupee className="h-10 w-10 mx-auto mb-3 text-primary" />
        <h2 className="text-xl font-semibold mb-1">Financial & Legal Validation</h2>
        <p className="text-sm text-muted-foreground">
          Verify the demand breakdown and legal details before proceeding
        </p>
      </div>

      {/* Demand Breakdown Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <IndianRupee className="h-4 w-4" />
            Demand Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Table Header */}
          <div className="grid grid-cols-3 gap-4 pb-2 border-b text-xs font-medium text-muted-foreground">
            <span>Component</span>
            <span>Amount (₹)</span>
            <span>Applicable</span>
          </div>

          {/* Tax Row */}
          <div className="grid grid-cols-3 gap-4 items-center">
            <Label className="text-sm">Tax</Label>
            <Input
              type="text"
              placeholder="0"
              value={extractedData.tax_amount?.toString() || ''}
              onChange={(e) => onUpdateField('tax_amount', parseCurrency(e.target.value))}
              className="font-mono"
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="tax_applicable"
                checked={extractedData.tax_applicable !== false}
                onCheckedChange={(checked) => onUpdateField('tax_applicable', !!checked)}
              />
              <Label htmlFor="tax_applicable" className="text-xs cursor-pointer">
                Applicable
              </Label>
            </div>
          </div>

          {/* Interest Row */}
          <div className="grid grid-cols-3 gap-4 items-center">
            <Label className="text-sm">Interest</Label>
            <Input
              type="text"
              placeholder="0"
              value={extractedData.interest_amount?.toString() || ''}
              onChange={(e) => onUpdateField('interest_amount', parseCurrency(e.target.value))}
              className="font-mono"
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="interest_applicable"
                checked={extractedData.interest_applicable !== false}
                onCheckedChange={(checked) => onUpdateField('interest_applicable', !!checked)}
              />
              <Label htmlFor="interest_applicable" className="text-xs cursor-pointer">
                Applicable
              </Label>
            </div>
          </div>

          {/* Penalty Row */}
          <div className="grid grid-cols-3 gap-4 items-center">
            <Label className="text-sm">Penalty</Label>
            <Input
              type="text"
              placeholder="0"
              value={extractedData.penalty_amount?.toString() || ''}
              onChange={(e) => onUpdateField('penalty_amount', parseCurrency(e.target.value))}
              className="font-mono"
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="penalty_applicable"
                checked={extractedData.penalty_applicable !== false}
                onCheckedChange={(checked) => onUpdateField('penalty_applicable', !!checked)}
              />
              <Label htmlFor="penalty_applicable" className="text-xs cursor-pointer">
                Applicable
              </Label>
            </div>
          </div>

          {/* Total Row */}
          <div className="grid grid-cols-3 gap-4 items-center pt-3 border-t">
            <Label className="text-sm font-semibold">Total Demand</Label>
            <div className="font-mono font-semibold text-lg">
              {formatCurrency(totalDemand)}
            </div>
            <Badge variant="outline" className="w-fit text-xs">
              Computed
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Legal Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Legal Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Section(s) Invoked</Label>
              <p className="text-sm font-medium mt-1">
                {extractedData.section_invoked || 'Not specified'}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notice Type</Label>
              <p className="text-sm font-medium mt-1">
                {extractedData.notice_type || 'Not specified'}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Issuing Authority</Label>
              <p className="text-sm font-medium mt-1">
                {extractedData.issuing_authority || 'Not specified'}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Financial Year</Label>
              <p className="text-sm font-medium mt-1">
                {extractedData.financial_year || 'Not specified'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation */}
      <Alert className={confirmed ? 'border-green-500/50 bg-green-50 dark:bg-green-950/20' : ''}>
        <div className="flex items-start gap-3">
          {confirmed ? (
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Checkbox
                id="confirm_data"
                checked={confirmed}
                onCheckedChange={(checked) => onConfirmChange(!!checked)}
              />
              <Label htmlFor="confirm_data" className="text-sm cursor-pointer">
                I confirm the extracted and entered notice details are correct
              </Label>
            </div>
            <AlertDescription className="text-xs mt-2 ml-7">
              {confirmed 
                ? 'You can now proceed to create the case and notice.'
                : 'Please review all details and check this box to continue.'}
            </AlertDescription>
          </div>
        </div>
      </Alert>
    </div>
  );
};
