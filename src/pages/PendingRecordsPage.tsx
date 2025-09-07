import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  AlertCircle, 
  RefreshCw, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Download,
  FileSpreadsheet,
  Upload,
  Filter
} from 'lucide-react';
import { PendingRecord, ImportJob, EntityType } from '@/types/importExport';
import { importExportService } from '@/services/importExportService';
import { toast } from '@/hooks/use-toast';

export const PendingRecordsPage: React.FC = () => {
  const [pendingRecords, setPendingRecords] = useState<PendingRecord[]>([]);
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<PendingRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    loadPendingRecords();
  }, [selectedJob]);

  const loadPendingRecords = async () => {
    try {
      setIsLoading(true);
      
      // In a real implementation, this would be a single API call
      // For now, we'll simulate the data structure
      const mockPendingRecords: PendingRecord[] = [
        {
          id: 'pr1',
          jobId: 'job1',
          row: 2,
          originalData: {
            name: 'ABC Corp Ltd',
            email: 'invalid-email',
            phone: '98765',
            gstin: 'INVALID123',
            city: 'Delhi'
          },
          errors: [
            {
              id: 'err1',
              jobId: 'job1',
              row: 2,
              column: 'email',
              value: 'invalid-email',
              error: 'Invalid email format',
              severity: 'error',
              canAutoFix: false
            },
            {
              id: 'err2',
              jobId: 'job1',
              row: 2,
              column: 'phone',
              value: '98765',
              error: 'Phone number must be 10 digits',
              severity: 'error',
              canAutoFix: false
            }
          ],
          status: 'pending'
        },
        {
          id: 'pr2',
          jobId: 'job1',
          row: 5,
          originalData: {
            name: 'XYZ Industries',
            email: 'contact@xyz.com',
            phone: '9876543210',
            gstin: '',
            city: 'Mumbai'
          },
          errors: [
            {
              id: 'err3',
              jobId: 'job1',
              row: 5,
              column: 'gstin',
              value: '',
              error: 'GSTIN is required for this client type',
              severity: 'warning',
              canAutoFix: false
            }
          ],
          status: 'pending'
        }
      ];

      const mockJobs: ImportJob[] = [
        {
          id: 'job1',
          entityType: 'client',
          fileName: 'clients_import_2024.xlsx',
          fileSize: 45600,
          status: 'completed',
          userId: 'user1',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:35:00Z',
          counts: {
            total: 100,
            valid: 95,
            invalid: 5,
            processed: 95
          }
        }
      ];

      setImportJobs(mockJobs);
      setPendingRecords(mockPendingRecords);
    } catch (error) {
      toast({
        title: "Load Failed",
        description: "Failed to load pending records",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRecord = (record: PendingRecord) => {
    setSelectedRecord(record);
    setIsEditModalOpen(true);
  };

  const handleSaveRecord = async (recordId: string, fixedData: Record<string, any>) => {
    try {
      // Update the record with fixed data
      const updatedRecords = pendingRecords.map(record => 
        record.id === recordId 
          ? { ...record, fixedData, status: 'fixed' as const }
          : record
      );
      setPendingRecords(updatedRecords);
      setIsEditModalOpen(false);
      
      toast({
        title: "Record Updated",
        description: "Record has been corrected and is ready for retry"
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save record corrections",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      const updatedRecords = pendingRecords.filter(record => record.id !== recordId);
      setPendingRecords(updatedRecords);
      
      toast({
        title: "Record Deleted",
        description: "Pending record has been removed"
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete record",
        variant: "destructive"
      });
    }
  };

  const handleRetryFixed = async () => {
    try {
      setIsRetrying(true);
      const fixedRecords = pendingRecords.filter(record => record.status === 'fixed');
      
      if (fixedRecords.length === 0) {
        toast({
          title: "No Records to Retry",
          description: "Please fix some records first",
          variant: "destructive"
        });
        return;
      }

      // In real implementation, this would call the retry API
      // await importExportService.retryImport(selectedJob, fixedRecords);
      
      // Remove successfully retried records
      const remainingRecords = pendingRecords.filter(record => record.status !== 'fixed');
      setPendingRecords(remainingRecords);
      
      toast({
        title: "Retry Successful",
        description: `${fixedRecords.length} records processed successfully`
      });
    } catch (error) {
      toast({
        title: "Retry Failed",
        description: "Failed to retry corrected records",
        variant: "destructive"
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDownloadErrors = async () => {
    try {
      // Create a CSV of errors for download
      const csvContent = [
        ['Row', 'Column', 'Value', 'Error', 'Severity'].join(','),
        ...pendingRecords.flatMap(record => 
          record.errors.map(error => 
            [error.row, error.column, `"${error.value}"`, `"${error.error}"`, error.severity].join(',')
          )
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pending_records_errors_${new Date().getTime()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Complete",
        description: "Error report downloaded successfully"
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download error report",
        variant: "destructive"
      });
    }
  };

  const getSeverityColor = (severity: 'error' | 'warning') => {
    return severity === 'error' 
      ? 'bg-red-100 text-red-800' 
      : 'bg-yellow-100 text-yellow-800';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'fixed': return 'bg-blue-100 text-blue-800';
      case 'skipped': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRecords = selectedJob === 'all' 
    ? pendingRecords 
    : pendingRecords.filter(record => record.jobId === selectedJob);

  const fixedCount = filteredRecords.filter(record => record.status === 'fixed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pending Records</h1>
          <p className="text-muted-foreground">Review and correct import validation errors</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleDownloadErrors}>
            <Download className="mr-2 h-4 w-4" />
            Download Errors
          </Button>
          {fixedCount > 0 && (
            <Button onClick={handleRetryFixed} disabled={isRetrying}>
              {isRetrying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Retry {fixedCount} Fixed Records
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{filteredRecords.length}</div>
            <div className="text-sm text-muted-foreground">Total Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{fixedCount}</div>
            <div className="text-sm text-muted-foreground">Fixed & Ready</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {filteredRecords.filter(r => r.errors.some(e => e.severity === 'error')).length}
            </div>
            <div className="text-sm text-muted-foreground">Critical Errors</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredRecords.filter(r => r.errors.every(e => e.severity === 'warning')).length}
            </div>
            <div className="text-sm text-muted-foreground">Warnings Only</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Records
            </CardTitle>
            <Button variant="outline" onClick={loadPendingRecords} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="job-filter">Import Job</Label>
              <Select value={selectedJob} onValueChange={setSelectedJob}>
                <SelectTrigger id="job-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
                  {importJobs.map(job => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.fileName} ({job.entityType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Records</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Pending Records</h3>
              <p className="text-muted-foreground">All records have been successfully processed</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row #</TableHead>
                  <TableHead>Record Data</TableHead>
                  <TableHead>Errors</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map(record => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Badge variant="outline">Row {record.row}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 max-w-sm">
                        {Object.entries(record.originalData).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                        {Object.keys(record.originalData).length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{Object.keys(record.originalData).length - 3} more fields
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {record.errors.map(error => (
                          <div key={error.id} className="flex items-center gap-2">
                            <Badge variant="secondary" className={getSeverityColor(error.severity)}>
                              {error.severity}
                            </Badge>
                            <span className="text-sm">{error.column}: {error.error}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(record.status)}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRecord(record)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRecord(record.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Record Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Record - Row {selectedRecord?.row}</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Fix the validation errors below. Required fields are marked with *.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(selectedRecord.originalData).map(([key, value]) => {
                  const hasError = selectedRecord.errors.some(error => error.column === key);
                  const error = selectedRecord.errors.find(error => error.column === key);
                  
                  return (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key} className={hasError ? 'text-red-600' : ''}>
                        {key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                        {hasError && ' *'}
                      </Label>
                      <Input
                        id={key}
                        defaultValue={String(value)}
                        className={hasError ? 'border-red-300' : ''}
                      />
                      {error && (
                        <div className="text-sm text-red-600">{error.error}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    // Collect form data and save
                    const formData: Record<string, any> = {};
                    Object.keys(selectedRecord.originalData).forEach(key => {
                      const input = document.getElementById(key) as HTMLInputElement;
                      if (input) {
                        formData[key] = input.value;
                      }
                    });
                    handleSaveRecord(selectedRecord.id, formData);
                  }}
                  className="flex-1"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Save Corrections
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};