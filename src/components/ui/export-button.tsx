import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import {
  exportCaseReport,
  exportHearingReport,
  exportTaskReport,
  exportTimelineBreachReport,
  exportClientSummaryReport,
  exportCommunicationReport,
  exportFormTimelineReport,
  exportStatutoryDeadlineReport,
} from '@/utils/reportExporter';

interface ExportButtonProps {
  data: any[];
  filename: string;
  type: 'cases' | 'timeline' | 'hearings' | 'dashboard' | 'case-reports' | 'client-summary' | 'communications' | 'sla-compliance' | 'tasks' | 'form-timeline' | 'statutory-deadlines';
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  filename,
  type,
  variant = 'outline',
  size = 'sm'
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'excel' | 'pdf') => {
    // Validate data
    if (!data || data.length === 0) {
      toast({
        title: "No Data to Export",
        description: "Please ensure there is data available to export.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const exportFormat = format === 'excel' ? 'xlsx' : 'pdf';

      // Show loading toast for PDF (takes longer)
      if (format === 'pdf') {
        toast({
          title: "Generating PDF...",
          description: "Please wait while we prepare your PDF document.",
        });
      }

      switch (type) {
        case 'cases':
        case 'case-reports':
          await exportCaseReport(data, exportFormat);
          break;
        case 'hearings':
          await exportHearingReport(data, exportFormat);
          break;
        case 'tasks':
          await exportTaskReport(data, exportFormat);
          break;
        case 'timeline':
        case 'sla-compliance':
          await exportTimelineBreachReport(data, exportFormat);
          break;
        case 'client-summary':
          await exportClientSummaryReport(data, exportFormat);
          break;
        case 'communications':
          await exportCommunicationReport(data, exportFormat);
          break;
        case 'form-timeline':
          await exportFormTimelineReport(data, exportFormat);
          break;
        case 'statutory-deadlines':
          await exportStatutoryDeadlineReport(data, exportFormat);
          break;
        case 'dashboard':
          // For dashboard, use case export as fallback
          await exportCaseReport(data, exportFormat);
          break;
        default:
          throw new Error('Invalid export type');
      }

      toast({
        title: "Export Successful",
        description: `Report downloaded as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unable to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className="flex items-center space-x-2"
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span>{isExporting ? 'Exporting...' : 'Export'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem 
          onClick={() => handleExport('excel')}
          disabled={isExporting}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
          Excel
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleExport('pdf')}
          disabled={isExporting}
        >
          <FileText className="mr-2 h-4 w-4 text-red-600" />
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};