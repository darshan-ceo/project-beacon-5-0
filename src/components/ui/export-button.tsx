import React from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { reportsService } from '@/services/reportsService';

interface ExportButtonProps {
  data: any[];
  filename: string;
  type: 'cases' | 'timeline' | 'hearings' | 'dashboard' | 'case-reports' | 'client-summary' | 'communications' | 'sla-compliance' | 'tasks';
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
  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      switch (type) {
        case 'cases':
        case 'case-reports':
          await reportsService.exportCaseList(data, format);
          break;
        case 'timeline':
          const timelineData = Array.isArray(data) ? data.map(item => JSON.stringify(item)).join('\n') : JSON.stringify(data);
          await reportsService.exportTimeline(timelineData, format === 'pdf' ? 'pdf' : 'csv');
          break;
        case 'hearings':
          await reportsService.exportHearingCauseList(data, format);
          break;
        case 'dashboard':
          const dashboardData = {
            stats: Array.isArray(data) ? data : [],
            charts: [],
            period: new Date().toISOString().split('T')[0]
          };
          await reportsService.exportDashboardData(dashboardData, format);
          break;
        case 'client-summary':
        case 'communications':
        case 'sla-compliance':
        case 'tasks':
          // For new report types, use the same case export for now
          await reportsService.exportCaseList(data, format);
          break;
        default:
          throw new Error('Invalid export type');
      }

      toast({
        title: "Export Successful",
        description: `${filename} downloaded as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="flex items-center space-x-2">
          <Download className="h-4 w-4" />
          <span>Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => handleExport('excel')}>
          <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
          Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')}>
          <FileText className="mr-2 h-4 w-4 text-red-600" />
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};