import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import type { DataGap, ResolverOutput } from '@/lib/notice/dataGapsResolver';

interface DataGapsResolverProps {
  resolverOutput: ResolverOutput;
  onUpdateField: (path: string, value: any) => void;
  onResolve: () => void;
}

export const DataGapsResolver: React.FC<DataGapsResolverProps> = ({
  resolverOutput,
  onUpdateField,
  onResolve
}) => {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  
  const { gaps, errors, status } = resolverOutput;
  const criticalGaps = gaps.filter(g => g.critical);
  const nonCriticalGaps = gaps.filter(g => !g.critical);
  
  const handleFieldChange = (path: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [path]: value }));
    onUpdateField(path, value);
  };
  
  const renderField = (gap: DataGap) => {
    const currentValue = fieldValues[gap.path] ?? gap.currentValue ?? '';
    
    return (
      <div key={gap.path} className="space-y-2">
        <div className="flex items-center space-x-2">
          <Label htmlFor={gap.path} className="font-medium">
            {gap.label}
          </Label>
          {gap.critical && (
            <Badge variant="destructive" className="text-xs">Critical</Badge>
          )}
          {gap.confidence > 0 && (
            <Badge variant="secondary" className="text-xs">
              {Math.round(gap.confidence * 100)}% confident
            </Badge>
          )}
        </div>
        
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
      {errors.filter(e => e.critical).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Critical validation errors found:
            <ul className="list-disc list-inside mt-2">
              {errors.filter(e => e.critical).map((error, idx) => (
                <li key={idx} className="text-sm">{error.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {criticalGaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <span>Critical Information Required</span>
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
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
              <span>Additional Information (Optional)</span>
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