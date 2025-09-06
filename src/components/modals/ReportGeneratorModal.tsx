import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  FileText, 
  Download, 
  Filter,
  BarChart3,
  Users,
  Scale,
  Clock
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
// import { DateRangePicker } from '@/components/ui/date-range-picker';
import { toast } from '@/hooks/use-toast';
import { reportsService } from '@/services/reportsService';

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'cases' | 'clients' | 'hearings' | 'tasks' | 'performance';
  icon: React.ReactNode;
  fields: string[];
  filters: string[];
}

export const ReportGeneratorModal: React.FC<ReportGeneratorModalProps> = ({
  isOpen,
  onClose
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [reportName, setReportName] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [format, setFormat] = useState<'pdf' | 'excel' | 'csv'>('excel');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const reportTemplates: ReportTemplate[] = [
    {
      id: 'case-summary',
      name: 'Case Summary Report',
      description: 'Comprehensive overview of all cases with status and progress',
      category: 'cases',
      icon: <Scale className="h-5 w-5" />,
      fields: ['Case Number', 'Title', 'Client', 'Stage', 'Priority', 'SLA Status'],
      filters: ['Date Range', 'Stage', 'Priority', 'Assigned Employee']
    },
    {
      id: 'client-activity',
      name: 'Client Activity Report',
      description: 'Client engagement and case distribution analysis',
      category: 'clients',
      icon: <Users className="h-5 w-5" />,
      fields: ['Client Name', 'Total Cases', 'Active Cases', 'Portal Activity'],
      filters: ['Date Range', 'Client Type', 'Status']
    },
    {
      id: 'hearing-schedule',
      name: 'Hearing Schedule Report',
      description: 'Upcoming hearings and court calendar overview',
      category: 'hearings',
      icon: <Calendar className="h-5 w-5" />,
      fields: ['Date', 'Time', 'Case', 'Court', 'Judge', 'Type'],
      filters: ['Date Range', 'Court', 'Judge', 'Hearing Type']
    },
    {
      id: 'task-performance',
      name: 'Task Performance Report',
      description: 'Task completion rates and employee productivity',
      category: 'tasks',
      icon: <BarChart3 className="h-5 w-5" />,
      fields: ['Task Title', 'Assigned To', 'Status', 'Due Date', 'Completion Time'],
      filters: ['Date Range', 'Assigned Employee', 'Status', 'Priority']
    },
    {
      id: 'sla-analysis',
      name: 'SLA Analysis Report',
      description: 'Service level agreement compliance and breach analysis',
      category: 'performance',
      icon: <Clock className="h-5 w-5" />,
      fields: ['Case', 'SLA Status', 'Days Remaining', 'Breach Risk'],
      filters: ['SLA Status', 'Risk Level', 'Date Range']
    }
  ];

  const selectedTemplateData = reportTemplates.find(t => t.id === selectedTemplate);

  const handleGenerate = async () => {
    if (!selectedTemplate || !reportName) {
      toast({
        title: "Missing Information",
        description: "Please select a template and enter a report name",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Mock report generation - replace with actual service call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Report Generated",
        description: `${reportName} has been generated and downloaded`,
      });

      onClose();
      resetForm();
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setSelectedTemplate('');
    setReportName('');
    setDateRange(undefined);
    setFormat('excel');
    setIncludeCharts(true);
  };

  const handleClose = () => {
    if (!isGenerating) {
      onClose();
      resetForm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Report
          </DialogTitle>
          <DialogDescription>
            Create custom reports with your preferred data and formatting
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Select Report Template</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportTemplates.map((template) => (
                <motion.div
                  key={template.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    className={`cursor-pointer transition-all ${
                      selectedTemplate === template.id 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            {template.icon}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm mb-1">{template.name}</h3>
                          <p className="text-xs text-muted-foreground mb-2">
                            {template.description}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {template.category}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Configuration */}
          {selectedTemplateData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Report Details */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Report Configuration</Label>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reportName">Report Name</Label>
                    <Input
                      id="reportName"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      placeholder="Enter report name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="startDate" className="text-xs">From</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={dateRange?.from ? dateRange.from.toISOString().split('T')[0] : ''}
                          onChange={(e) => {
                            const newDate = new Date(e.target.value);
                            setDateRange(prev => ({ ...prev, from: newDate, to: prev?.to || newDate }));
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate" className="text-xs">To</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={dateRange?.to ? dateRange.to.toISOString().split('T')[0] : ''}
                          onChange={(e) => {
                            const newDate = new Date(e.target.value);
                            setDateRange(prev => ({ from: prev?.from || newDate, to: newDate }));
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="format">Output Format</Label>
                    <Select value={format} onValueChange={(value: 'pdf' | 'excel' | 'csv') => setFormat(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                        <SelectItem value="pdf">PDF Document</SelectItem>
                        <SelectItem value="csv">CSV File</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeCharts"
                      checked={includeCharts}
                      onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
                    />
                    <Label htmlFor="includeCharts">Include charts and visualizations</Label>
                  </div>
                </div>

                {/* Template Preview */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Template Preview</Label>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">{selectedTemplateData.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {selectedTemplateData.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-2">Included Fields:</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedTemplateData.fields.map((field) => (
                            <Badge key={field} variant="outline" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-2">Available Filters:</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedTemplateData.filters.map((filter) => (
                            <Badge key={filter} variant="secondary" className="text-xs">
                              <Filter className="w-3 h-3 mr-1" />
                              {filter}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={!selectedTemplate || !reportName || isGenerating}
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};