import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  FileJson
} from 'lucide-react';

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: string;
}

export const TooltipJSONValidator: React.FC = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [jsonData, setJsonData] = useState<any>(null);
  const [lastValidated, setLastValidated] = useState<Date | null>(null);

  useEffect(() => {
    validateJSON();
  }, []);

  const validateJSON = async () => {
    setIsValidating(true);
    const foundIssues: ValidationIssue[] = [];

    try {
      // Fetch the JSON file
      const response = await fetch('/help/ui-tooltips.json');
      
      if (!response.ok) {
        foundIssues.push({
          severity: 'error',
          message: `Failed to load ui-tooltips.json: ${response.status} ${response.statusText}`,
        });
        setIssues(foundIssues);
        setIsValidating(false);
        return;
      }

      const data = await response.json();
      setJsonData(data);

      // Validate structure
      if (!data.version) {
        foundIssues.push({
          severity: 'warning',
          message: 'Missing "version" field in root object',
        });
      }

      if (!data.modules) {
        foundIssues.push({
          severity: 'error',
          message: 'Missing "modules" object in root',
        });
        setIssues(foundIssues);
        setIsValidating(false);
        return;
      }

      // Track IDs to detect duplicates
      const seenIds = new Set<string>();
      const duplicates = new Set<string>();

      // Validate each module
      Object.entries(data.modules).forEach(([moduleName, moduleData]: [string, any]) => {
        if (typeof moduleData !== 'object') {
          foundIssues.push({
            severity: 'error',
            message: `Module "${moduleName}" is not an object`,
            location: moduleName,
          });
          return;
        }

        // Validate each type (buttons, fields, menu-items, etc.)
        ['buttons', 'fields', 'menu-items', 'cards', 'features'].forEach(type => {
          if (!moduleData[type]) return;

          if (!Array.isArray(moduleData[type])) {
            foundIssues.push({
              severity: 'error',
              message: `"${type}" in module "${moduleName}" is not an array`,
              location: `${moduleName}.${type}`,
            });
            return;
          }

          moduleData[type].forEach((entry: any, index: number) => {
            const location = `${moduleName}.${type}[${index}]`;

            // Check required fields
            if (!entry.id) {
              foundIssues.push({
                severity: 'error',
                message: 'Missing required field "id"',
                location,
              });
            } else {
              // Check for duplicates
              if (seenIds.has(entry.id)) {
                duplicates.add(entry.id);
                foundIssues.push({
                  severity: 'error',
                  message: `Duplicate ID "${entry.id}" found`,
                  location,
                });
              }
              seenIds.add(entry.id);
            }

            if (!entry.label) {
              foundIssues.push({
                severity: 'error',
                message: 'Missing required field "label"',
                location,
              });
            }

            // Check tooltip structure
            if (!entry.tooltip) {
              foundIssues.push({
                severity: 'error',
                message: 'Missing required field "tooltip"',
                location,
              });
            } else {
              if (!entry.tooltip.title) {
                foundIssues.push({
                  severity: 'error',
                  message: 'Missing "tooltip.title"',
                  location,
                });
              }
              if (!entry.tooltip.content) {
                foundIssues.push({
                  severity: 'error',
                  message: 'Missing "tooltip.content"',
                  location,
                });
              }
            }

            // Check accessibility
            if (!entry.accessibility) {
              foundIssues.push({
                severity: 'warning',
                message: 'Missing "accessibility" object',
                location,
              });
            } else if (!entry.accessibility.ariaLabel) {
              foundIssues.push({
                severity: 'warning',
                message: 'Missing "accessibility.ariaLabel"',
                location,
              });
            }

            // Optional but recommended
            if (!entry.explanation) {
              foundIssues.push({
                severity: 'info',
                message: 'Missing optional "explanation" field (Layer 2)',
                location,
              });
            }
          });
        });
      });

      setIssues(foundIssues);
      setLastValidated(new Date());
    } catch (error) {
      foundIssues.push({
        severity: 'error',
        message: `JSON parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      setIssues(foundIssues);
    } finally {
      setIsValidating(false);
    }
  };

  const getIssueCounts = () => {
    return {
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length,
    };
  };

  const counts = getIssueCounts();
  const isValid = counts.errors === 0;

  return (
    <div className="space-y-6">
      {/* Validation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            JSON Structure Validator
          </CardTitle>
          <CardDescription>
            Validates ui-tooltips.json schema, checks for duplicates, and verifies required fields
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <div>
                {isValid ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">JSON is valid</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">Validation failed</span>
                  </div>
                )}
                {lastValidated && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Last checked: {lastValidated.toLocaleTimeString()}
                  </div>
                )}
              </div>
              <Button 
                onClick={validateJSON} 
                disabled={isValidating}
                variant="outline"
              >
                {isValidating ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Re-validate
              </Button>
            </div>

            {/* Issue Counts */}
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">
                  <span className="font-bold">{counts.errors}</span> Errors
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">
                  <span className="font-bold">{counts.warnings}</span> Warnings
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FileJson className="h-4 w-4 text-blue-500" />
                <span className="text-sm">
                  <span className="font-bold">{counts.info}</span> Info
                </span>
              </div>
            </div>

            {/* JSON Stats */}
            {jsonData && (
              <div className="p-3 bg-muted rounded-md space-y-1">
                <div className="text-sm">
                  <span className="font-medium">Version:</span> {jsonData.version || 'Not specified'}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Modules:</span> {Object.keys(jsonData.modules || {}).length}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      {issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Validation Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {issues.map((issue, index) => (
                <Alert
                  key={index}
                  variant={issue.severity === 'error' ? 'destructive' : 'default'}
                >
                  {issue.severity === 'error' && <XCircle className="h-4 w-4" />}
                  {issue.severity === 'warning' && <AlertTriangle className="h-4 w-4" />}
                  {issue.severity === 'info' && <FileJson className="h-4 w-4" />}
                  <AlertDescription>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{issue.message}</div>
                        {issue.location && (
                          <div className="text-xs text-muted-foreground font-mono mt-1">
                            {issue.location}
                          </div>
                        )}
                      </div>
                      <Badge 
                        variant={
                          issue.severity === 'error' ? 'destructive' : 
                          issue.severity === 'warning' ? 'secondary' : 'default'
                        }
                      >
                        {issue.severity}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
