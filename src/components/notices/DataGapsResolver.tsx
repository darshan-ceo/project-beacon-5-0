import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, HelpCircle, AlertTriangle, Info } from 'lucide-react';
import type { DataGap, ResolverOutput } from '@/lib/notice/dataGapsResolver';
import type { ValidationResult } from '@/validation/asmt10Resolver';

interface DataGapsResolverProps {
  resolverOutput: ResolverOutput;
  validationResult?: ValidationResult;
  onUpdateField: (path: string, value: any) => void;
  onResolve: () => void;
}

export const DataGapsResolver: React.FC<DataGapsResolverProps> = ({
  resolverOutput,
  validationResult,
  onUpdateField,
  onResolve
}) => {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  
  const { gaps, errors, status } = resolverOutput;
  
  // Only GSTIN is critical now
  const criticalGaps = gaps.filter(g => g.path === '/taxpayer/gstin');
  const nonCriticalGaps = gaps.filter(g => g.path !== '/taxpayer/gstin');
  
  // Get field status from validation result
  const getFieldStatus = (path: string) => {
    if (!validationResult) return null;
    
    const error = validationResult.errors.find(e => e.path === path);
    const warning = validationResult.warnings.find(w => w.path === path);
    
    if (error?.blocking) {
      return { icon: AlertCircle, color: 'destructive' as const, label: 'Critical', textColor: 'text-destructive' };
    }
    if (warning) {
      return { 
        icon: warning.severity === 'warning' ? AlertTriangle : Info, 
        color: 'secondary' as const, 
        label: 'Intimation', 
        textColor: 'text-yellow-600 dark:text-yellow-500',
        message: warning.message
      };
    }
    return { icon: CheckCircle, color: 'default' as const, label: 'Valid', textColor: 'text-green-600' };
  };
  
  const handleFieldChange = (path: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [path]: value }));
    onUpdateField(path, value);
  };
  
  const renderField = (gap: DataGap) => {
    const currentValue = fieldValues[gap.path] ?? gap.currentValue ?? '';
    const fieldStatus = getFieldStatus(gap.path);
    
    return (
      <div key={gap.path} className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Label htmlFor={gap.path} className="font-medium">
              {gap.label}
            </Label>
            {fieldStatus && (
              <Badge variant={fieldStatus.color} className="text-xs flex items-center gap-1">
                <fieldStatus.icon className="w-3 h-3" />
                {fieldStatus.label}
              </Badge>
            )}
          </div>
          {gap.confidence > 0 && (
            <Badge variant="outline" className="text-xs">
              {Math.round(gap.confidence * 100)}% conf
            </Badge>
          )}
        </div>
        
        {fieldStatus?.message && (
          <Alert className="py-2 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
            <AlertTriangle className="h-3 w-3 text-yellow-600" />
            <AlertDescription className="text-xs text-yellow-800 dark:text-yellow-400">
              {fieldStatus.message}
            </AlertDescription>
          </Alert>
        )}
        
        {gap.evidence && (
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            <HelpCircle className="w-3 h-3 inline mr-1" />
            {gap.evidence}
          </div>
        )}
        
        {gap.type === 'enum' && gap.enumOptions ? (
          <Select value={currentValue} onValueChange={(value) => handleFieldChange(gap.path, value)}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${gap.label}`} />
            </SelectTrigger>
            <SelectContent>
              {gap.enumOptions.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={gap.path}
            type={gap.type === 'date' ? 'date' : gap.type === 'number' ? 'number' : 'text'}
            value={currentValue}
            onChange={(e) => handleFieldChange(gap.path, e.target.value)}
            placeholder={gap.suggested ? `Suggested: ${gap.suggested}` : `Enter ${gap.label}`}
            className={gap.critical ? 'border-destructive' : ''}
          />
        )}
        
        {gap.suggested && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => handleFieldChange(gap.path, gap.suggested)}
          >
            Use suggestion: {gap.suggested}
          </Button>
        )}
      </div>
    );
  };
  
  if (status === 'complete') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">All required data is complete</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            All critical fields have been filled and validated. You can proceed to generate the final reply.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {validationResult?.errors.filter(e => e.blocking).length ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>GSTIN validation failed:</strong>
            <ul className="list-disc list-inside mt-2">
              {validationResult.errors.filter(e => e.blocking).map((error, idx) => (
                <li key={idx} className="text-sm">{error.message}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs">You must provide a valid GSTIN to continue.</p>
          </AlertDescription>
        </Alert>
      ) : null}
      
      {validationResult?.warnings.length ? (
        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <strong className="text-yellow-800 dark:text-yellow-400">
              {validationResult.warnings.length} Intimation{validationResult.warnings.length > 1 ? 's' : ''}
            </strong>
            <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-1">
              These fields have warnings but won't block progress. You can continue or fix them now.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}
      
      {criticalGaps.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <span>GSTIN Required (Blocking)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {criticalGaps.map(renderField)}
          </CardContent>
        </Card>
      )}
      
      {nonCriticalGaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="w-5 h-5 text-muted-foreground" />
              <span>Additional Information (Can Proceed With Warnings)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {nonCriticalGaps.map(renderField)}
          </CardContent>
        </Card>
      )}
      
      <div className="flex justify-end">
        <Button onClick={onResolve} variant="outline">
          Re-validate Data
        </Button>
      </div>
    </div>
  );
};