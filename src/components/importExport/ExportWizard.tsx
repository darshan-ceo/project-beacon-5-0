import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  FileSpreadsheet, 
  CheckCircle, 
  RefreshCw,
  Filter,
  Calendar,
  Shield
} from 'lucide-react';
import { EntityType, ExportRequest, ExportJob, ExportFilter } from '@/types/importExport';
import { importExportService } from '@/services/importExportService';
import { entityTemplatesService } from '@/services/entityTemplatesService';
import { toast } from '@/hooks/use-toast';

interface ExportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: EntityType;
  currentFilters?: Partial<ExportFilter>;
  currentData?: any[]; // Current filtered data from the parent component
}

export const ExportWizard: React.FC<ExportWizardProps> = ({
  isOpen,
  onClose,
  entityType,
  currentFilters = {},
  currentData
}) => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [filters, setFilters] = useState<ExportFilter>({
    search: currentFilters.search || '',
    city: currentFilters.city || '',
    state: currentFilters.state || '',
    court: currentFilters.court || '',
    role: currentFilters.role || '',
    active: currentFilters.active,
    dateRange: currentFilters.dateRange
  });
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);

  React.useEffect(() => {
    const loadTemplate = async () => {
      try {
        const template = await entityTemplatesService.getTemplate(entityType);
        const columns = template.columns.map(col => col.key);
        setAvailableColumns(columns);
        // Select commonly used columns by default
        const defaultColumns = columns.filter(col => 
          !col.includes('internal_') && !col.includes('_id') && !col.includes('metadata')
        );
        setSelectedColumns(defaultColumns);
      } catch (error) {
        console.error('Failed to load template:', error);
      }
    };

    if (isOpen) {
      loadTemplate();
    }
  }, [isOpen, entityType]);

  const handleColumnToggle = (column: string, checked: boolean) => {
    if (checked) {
      setSelectedColumns([...selectedColumns, column]);
    } else {
      setSelectedColumns(selectedColumns.filter(col => col !== column));
    }
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns([...availableColumns]);
  };

  const handleSelectNone = () => {
    setSelectedColumns([]);
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      toast({
        title: "No Columns Selected",
        description: "Please select at least one column to export",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsExporting(true);
      setExportProgress(0);

      const exportRequest: ExportRequest = {
        entityType,
        format: exportFormat,
        filters,
        columns: selectedColumns,
        userId: 'current-user', // This would come from auth context
        passwordProtected
      };

      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await importExportService.exportData(exportRequest);
      
      clearInterval(progressInterval);
      setExportProgress(100);

      if (response.success && response.data) {
        // Poll for completion
        await pollExportCompletion(response.data.id);
        
        toast({
          title: "Export Completed",
          description: `${entityType} data exported successfully`
        });
        
        onClose();
      } else {
        throw new Error(response.error || 'Export failed');
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 1000);
    }
  };

  const pollExportCompletion = async (jobId: string): Promise<void> => {
    const maxAttempts = 30;
    let attempts = 0;

    const poll = async (): Promise<void> => {
      attempts++;
      
      try {
        const response = await importExportService.getExportJob(jobId);
        
        if (response.success && response.data) {
          const job = response.data;
          
          if (job.status === 'completed' && job.fileUrl) {
            // Download the file
            const downloadResponse = await importExportService.downloadExport(jobId);
            if (downloadResponse.success && downloadResponse.data) {
              const url = URL.createObjectURL(downloadResponse.data);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${entityType}_export_${new Date().getTime()}.${exportFormat}`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
            return;
          } else if (job.status === 'failed') {
            throw new Error('Export job failed');
          } else if (attempts < maxAttempts) {
            // Still processing, wait and try again
            setTimeout(poll, 1000);
          } else {
            throw new Error('Export timeout');
          }
        } else {
          throw new Error('Failed to check export status');
        }
      } catch (error) {
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          throw error;
        }
      }
    };

    await poll();
  };

  const getColumnLabel = (column: string) => {
    return column
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  };

  const groupedColumns = React.useMemo(() => {
    const groups: Record<string, string[]> = {
      'Basic Info': [],
      'Contact': [],
      'Address': [],
      'Tax Info': [],
      'Other': []
    };

    availableColumns.forEach(column => {
      if (column.includes('name') || column.includes('code') || column.includes('type') || column.includes('designation')) {
        groups['Basic Info'].push(column);
      } else if (column.includes('email') || column.includes('phone') || column.includes('mobile')) {
        groups['Contact'].push(column);
      } else if (column.includes('address') || column.includes('city') || column.includes('state') || column.includes('pincode')) {
        groups['Address'].push(column);
      } else if (column.includes('gstin') || column.includes('pan') || column.includes('tax')) {
        groups['Tax Info'].push(column);
      } else {
        groups['Other'].push(column);
      }
    });

    return groups;
  }, [availableColumns]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export {entityType.charAt(0).toUpperCase() + entityType.slice(1)} Data
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Filters */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search Filter</Label>
                  <Input
                    id="search"
                    placeholder="Search term..."
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                  />
                </div>

                {entityType === 'client' && (
                  <div className="space-y-2">
                    <Label>Active Status</Label>
                    <Select value={filters.active?.toString() || 'all'} onValueChange={(value) => {
                      setFilters({...filters, active: value === 'all' ? undefined : value === 'true'});
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="true">Active Only</SelectItem>
                        <SelectItem value="false">Inactive Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="City filter..."
                      value={filters.city}
                      onChange={(e) => setFilters({...filters, city: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      placeholder="State filter..."
                      value={filters.state}
                      onChange={(e) => setFilters({...filters, state: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={filters.dateRange?.start || ''}
                      onChange={(e) => setFilters({
                        ...filters,
                        dateRange: {
                          start: e.target.value,
                          end: filters.dateRange?.end || ''
                        }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={filters.dateRange?.end || ''}
                      onChange={(e) => setFilters({
                        ...filters,
                        dateRange: {
                          start: filters.dateRange?.start || '',
                          end: e.target.value
                        }
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <RadioGroup value={exportFormat} onValueChange={(value) => setExportFormat(value as 'xlsx' | 'csv')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="xlsx" id="xlsx" />
                      <Label htmlFor="xlsx">Excel (.xlsx)</Label>
                      <Badge variant="secondary">Recommended</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="csv" id="csv" />
                      <Label htmlFor="csv">CSV (.csv)</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="password"
                    checked={passwordProtected}
                    onCheckedChange={(checked) => setPasswordProtected(checked as boolean)}
                  />
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Password protect file
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Column Selection */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Columns</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAllColumns}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSelectNone}>
                    Select None
                  </Button>
                  <Badge variant="secondary">{selectedColumns.length} selected</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(groupedColumns).map(([group, columns]) => (
                  columns.length > 0 && (
                    <div key={group} className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground">{group}</h4>
                      <div className="space-y-2 pl-4">
                        {columns.map(column => (
                          <div key={column} className="flex items-center space-x-2">
                            <Checkbox
                              id={column}
                              checked={selectedColumns.includes(column)}
                              onCheckedChange={(checked) => handleColumnToggle(column, checked as boolean)}
                            />
                            <Label htmlFor={column} className="text-sm">
                              {getColumnLabel(column)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Export Progress */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Preparing export...</span>
              <span>{exportProgress}%</span>
            </div>
            <Progress value={exportProgress} />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || selectedColumns.length === 0} className="flex-1">
            {isExporting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export {selectedColumns.length} Columns
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};