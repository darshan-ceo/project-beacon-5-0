/**
 * Advanced Export Button Component
 * Dropdown button with format selection and visible columns toggle
 */

import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { exportRows, prepareExportContext } from '@/utils/exporter';
import { ExportColumn, ExportContext } from '@/config/exports';

export interface AdvancedExportButtonProps {
  moduleKey: 'clients' | 'cases' | 'employees';
  rows: any[];
  context?: ExportContext;
  disabled?: boolean;
  className?: string;
}

export const AdvancedExportButton: React.FC<AdvancedExportButtonProps> = ({
  moduleKey,
  rows,
  context,
  disabled = false,
  className = ''
}) => {
  const [visibleOnly, setVisibleOnly] = useState(false);

  const handleExport = async (format: 'xlsx' | 'csv') => {
    if (rows.length === 0) {
      toast({
        title: "No data to export",
        description: `There are no ${moduleKey} matching your current filters.`,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Exporting data...",
      description: `Preparing your ${moduleKey} data export`
    });

    try {
      await exportRows({
        moduleKey,
        rows,
        context,
        options: {
          format,
          visibleOnly,
          dateFormat: 'dd-MM-yyyy'
        }
      });

      const formatLabel = format === 'xlsx' ? 'Excel' : 'CSV';
      toast({
        title: "Export complete!",
        description: `Exported ${rows.length} ${moduleKey} to ${formatLabel} successfully`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: `Failed to export ${moduleKey} data`,
        variant: "destructive"
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled || rows.length === 0}
          className={className}
        >
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuCheckboxItem
          checked={visibleOnly}
          onCheckedChange={setVisibleOnly}
        >
          Export visible columns only
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Format</DropdownMenuLabel>
        
        <DropdownMenuItem onClick={() => handleExport('xlsx')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel (.xlsx)
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileText className="mr-2 h-4 w-4" />
          CSV (.csv)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
