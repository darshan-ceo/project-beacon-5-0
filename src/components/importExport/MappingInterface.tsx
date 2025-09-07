import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, CheckCircle, AlertCircle, Wand2, Save } from 'lucide-react';
import { EntityType, ImportJob, ColumnMapping, TemplateColumn } from '@/types/importExport';
import { mappingService } from '@/services/mappingService';
import { entityTemplatesService } from '@/services/entityTemplatesService';
import { toast } from '@/hooks/use-toast';

interface MappingInterfaceProps {
  importJob: ImportJob;
  entityType: EntityType;
  onMappingComplete: (mapping: ColumnMapping) => void;
}

export const MappingInterface: React.FC<MappingInterfaceProps> = ({
  importJob,
  entityType,
  onMappingComplete
}) => {
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [templateColumns, setTemplateColumns] = useState<TemplateColumn[]>([]);
  const [sourceHeaders, setSourceHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>({ isValid: true, errors: [], warnings: [] });

  useEffect(() => {
    const loadTemplateAndHeaders = async () => {
      try {
        setIsProcessing(true);
        
        // Load template columns
        const template = await entityTemplatesService.getTemplate(entityType);
        setTemplateColumns(template.columns);
        
        // Extract source headers from import job (simulated)
        const headers = [
          'Name', 'Email', 'Phone', 'Address', 'City', 'State', 'PIN Code',
          'GST Number', 'PAN Number', 'Contact Person', 'Type'
        ];
        setSourceHeaders(headers);
        
        // Generate auto-mapping
        const autoMapping = await mappingService.autoMapColumns(headers, entityType, true);
        setMapping(autoMapping.mapping);
        
        // Validate initial mapping
        const validation = mappingService.validateMapping(autoMapping.mapping, headers);
        setValidationResults(validation);
        
        toast({
          title: "Auto-mapping Complete",
          description: `${Object.keys(autoMapping.mapping).length} columns mapped automatically`
        });
      } catch (error) {
        toast({
          title: "Mapping Error",
          description: "Failed to generate column mapping",
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
      }
    };

    loadTemplateAndHeaders();
  }, [importJob, entityType]);

  const handleMappingChange = (templateColumn: string, sourceColumn: string) => {
    const templateCol = templateColumns.find(col => col.key === templateColumn);
    if (!templateCol) return;

    const newMapping = {
      ...mapping,
      [templateColumn]: {
        sourceColumn: sourceColumn === 'none' ? '' : sourceColumn,
        confidence: sourceColumn === 'none' ? 0 : 0.8,
        isRequired: templateCol.isRequired,
        dataType: templateCol.dataType,
        validationRules: templateCol.validationRules
      }
    };

    setMapping(newMapping);

    // Validate updated mapping
    const validation = mappingService.validateMapping(newMapping, sourceHeaders);
    setValidationResults(validation);
  };

  const handleAutoMap = async () => {
    try {
      setIsProcessing(true);
      const autoMapping = await mappingService.autoMapColumns(sourceHeaders, entityType, true);
      setMapping(autoMapping.mapping);
      
      const validation = mappingService.validateMapping(autoMapping.mapping, sourceHeaders);
      setValidationResults(validation);
      
      toast({
        title: "Auto-mapping Applied",
        description: "Column mapping has been regenerated"
      });
    } catch (error) {
      toast({
        title: "Auto-mapping Failed",
        description: "Failed to generate automatic mapping",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const profileName = mappingService.generateProfileName(sourceHeaders, entityType);
      
      // In real implementation, this would save to the backend
      toast({
        title: "Profile Saved",
        description: `Mapping profile "${profileName}" saved for future use`
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save mapping profile",
        variant: "destructive"
      });
    }
  };

  const handleContinue = () => {
    if (!validationResults.isValid) {
      toast({
        title: "Validation Errors",
        description: "Please fix mapping errors before continuing",
        variant: "destructive"
      });
      return;
    }

    onMappingComplete(mapping);
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge className="bg-green-100 text-green-800">High</Badge>;
    } else if (confidence >= 0.5) {
      return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Low</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Validation Status */}
      {validationResults.errors.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-medium">Mapping Errors:</div>
              {validationResults.errors.map((error, index) => (
                <div key={index} className="text-sm">• {error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {validationResults.warnings.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-medium">Warnings:</div>
              {validationResults.warnings.map((warning, index) => (
                <div key={index} className="text-sm">• {warning}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Mapping Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleAutoMap} disabled={isProcessing}>
            <Wand2 className="mr-2 h-4 w-4" />
            Auto-map Columns
          </Button>
          <Button variant="outline" onClick={handleSaveProfile}>
            <Save className="mr-2 h-4 w-4" />
            Save Profile
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {Object.keys(mapping).filter(key => mapping[key].sourceColumn).length} of {templateColumns.length} mapped
          </Badge>
        </div>
      </div>

      {/* Mapping Table */}
      <Card>
        <CardHeader>
          <CardTitle>Column Mapping</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Column</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Data Type</TableHead>
                <TableHead>Source Column</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Help</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templateColumns.map(templateCol => {
                const mappingConfig = mapping[templateCol.key];
                return (
                  <TableRow key={templateCol.key}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{templateCol.label}</div>
                        <div className="text-sm text-muted-foreground">{templateCol.key}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {templateCol.isRequired ? (
                        <Badge variant="destructive">Required</Badge>
                      ) : (
                        <Badge variant="secondary">Optional</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{templateCol.dataType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mappingConfig?.sourceColumn || 'none'}
                        onValueChange={(value) => handleMappingChange(templateCol.key, value)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Not Mapped --</SelectItem>
                          {sourceHeaders.map(header => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {mappingConfig?.sourceColumn && getConfidenceBadge(mappingConfig.confidence)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground max-w-48">
                        {templateCol.helpText}
                      </div>
                      {templateCol.examples.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Examples: {templateCol.examples.slice(0, 2).join(', ')}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Mapping Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Source Data (Sample)</h4>
              <div className="bg-muted/30 p-3 rounded text-sm space-y-1">
                {sourceHeaders.slice(0, 5).map(header => (
                  <div key={header}>
                    <span className="font-medium">{header}:</span> Sample Value
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Mapped Result</h4>
              <div className="bg-muted/30 p-3 rounded text-sm space-y-1">
                {Object.entries(mapping).slice(0, 5).map(([templateCol, config]) => (
                  config.sourceColumn && (
                    <div key={templateCol}>
                      <span className="font-medium">{templateCol}:</span> 
                      <ArrowRight className="inline h-3 w-3 mx-1" />
                      {config.sourceColumn}
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleContinue}
          disabled={!validationResults.isValid || isProcessing}
          className="min-w-32"
        >
          {validationResults.isValid ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Continue
            </>
          ) : (
            <>
              <AlertCircle className="mr-2 h-4 w-4" />
              Fix Errors
            </>
          )}
        </Button>
      </div>
    </div>
  );
};