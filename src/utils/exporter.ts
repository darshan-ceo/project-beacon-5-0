/**
 * Universal Data Exporter
 * Handles export of filtered/sorted data to Excel (.xlsx) and CSV formats
 * with proper formatting, nested field resolution, and India-specific date formats
 */

import * as XLSX from 'xlsx';
import { format, isValid, parseISO } from 'date-fns';
import { ExportColumn, ExportContext } from '@/config/exports';
import { 
  CLIENT_EXPORT_COLUMNS, 
  CLIENT_VISIBLE_COLUMNS,
  CASE_EXPORT_COLUMNS,
  CASE_VISIBLE_COLUMNS,
  EMPLOYEE_EXPORT_COLUMNS,
  EMPLOYEE_VISIBLE_COLUMNS
} from '@/config/exports';

export interface ExportOptions {
  format?: 'xlsx' | 'csv';
  filename?: string;
  sheetName?: string;
  visibleOnly?: boolean;
  includeHeader?: boolean;
  dateFormat?: string;
}

interface ModuleConfig {
  columns: ExportColumn[];
  visibleColumns: string[];
  sheetName: string;
  filenamePrefix: string;
}

const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  clients: {
    columns: CLIENT_EXPORT_COLUMNS,
    visibleColumns: CLIENT_VISIBLE_COLUMNS,
    sheetName: 'Clients',
    filenamePrefix: 'Clients'
  },
  cases: {
    columns: CASE_EXPORT_COLUMNS,
    visibleColumns: CASE_VISIBLE_COLUMNS,
    sheetName: 'Cases',
    filenamePrefix: 'Cases'
  },
  employees: {
    columns: EMPLOYEE_EXPORT_COLUMNS,
    visibleColumns: EMPLOYEE_VISIBLE_COLUMNS,
    sheetName: 'Employees',
    filenamePrefix: 'Employees'
  }
};

/**
 * Safely resolve nested property path in an object
 * Examples: "client.name", "address.city", "signatories[0].email"
 */
export function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  
  try {
    // Handle array notation: signatories[0].email
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      
      // Check for array index notation
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayName, index] = arrayMatch;
        current = current[arrayName]?.[parseInt(index)];
      } else {
        current = current[part];
      }
    }
    
    return current;
  } catch (error) {
    console.warn(`Failed to resolve nested path: ${path}`, error);
    return undefined;
  }
}

/**
 * Format value based on column type
 */
export function formatValue(
  value: any, 
  type: string = 'string', 
  formatPattern?: string
): string {
  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }
  
  switch (type) {
    case 'date': {
      try {
        let date: Date;
        
        // Handle string dates
        if (typeof value === 'string') {
          date = parseISO(value);
        } 
        // Handle Date objects
        else if (value instanceof Date) {
          date = value;
        } 
        else {
          return 'N/A';
        }
        
        // Check if date is valid
        if (!isValid(date)) {
          return 'N/A';
        }
        
        // Use provided format or default to India format
        const dateFormat = formatPattern || 'dd-MM-yyyy';
        return format(date, dateFormat);
      } catch (error) {
        console.warn('Date formatting error:', error, 'Value:', value);
        return 'N/A';
      }
    }
    
    case 'currency': {
      const num = parseFloat(value);
      if (isNaN(num)) return 'N/A';
      
      // Format as Indian currency (₹)
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num);
    }
    
    case 'phone': {
      const phoneStr = String(value).replace(/\D/g, ''); // Remove non-digits
      if (!phoneStr) return 'N/A';
      
      // Format as Indian phone number if 10 digits
      if (phoneStr.length === 10) {
        return `+91 ${phoneStr.slice(0, 5)} ${phoneStr.slice(5)}`;
      }
      
      return phoneStr;
    }
    
    case 'email': {
      return String(value).trim() || 'N/A';
    }
    
    case 'number': {
      const num = parseFloat(value);
      if (isNaN(num)) return 'N/A';
      return num.toString();
    }
    
    case 'boolean': {
      return value ? 'Yes' : 'No';
    }
    
    case 'string':
    default: {
      return String(value).trim() || 'N/A';
    }
  }
}

/**
 * Extract cell value from row using column configuration
 */
export function extractCellValue(
  row: any,
  column: ExportColumn,
  context?: ExportContext
): any {
  let rawValue: any;
  
  // Use custom getter if provided
  if (column.get) {
    rawValue = column.get(row, context);
  } else {
    // Resolve nested path
    rawValue = getNestedValue(row, column.key);
  }
  
  // Format the value based on type
  return formatValue(rawValue, column.type, column.format);
}

/**
 * Generate timestamped filename
 */
export function generateFilename(
  prefix: string,
  extension: 'xlsx' | 'csv'
): string {
  const now = new Date();
  const dateStr = format(now, 'yyyy-MM-dd');
  const timeStr = format(now, 'HHmm');
  return `${prefix}-${dateStr}-${timeStr}.${extension}`;
}

/**
 * Convert rows to worksheet data
 */
export function rowsToSheetData(
  rows: any[],
  columns: ExportColumn[],
  context?: ExportContext,
  includeHeader: boolean = true
): any[][] {
  const data: any[][] = [];
  
  // Add header row
  if (includeHeader) {
    data.push(columns.map(col => col.label));
  }
  
  // Add data rows
  for (const row of rows) {
    const rowData = columns.map(col => extractCellValue(row, col, context));
    data.push(rowData);
  }
  
  return data;
}

/**
 * Export rows to Excel (.xlsx) format
 */
export function exportToExcel(
  data: any[][],
  filename: string,
  sheetName: string
): void {
  try {
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, filename, { 
      bookType: 'xlsx',
      type: 'binary',
      compression: true
    });
  } catch (error) {
    console.error('Excel export error:', error);
    throw new Error('Failed to export to Excel format');
  }
}

/**
 * Export rows to CSV format
 */
export function exportToCSV(
  data: any[][],
  filename: string
): void {
  try {
    // Convert data to CSV format
    const csvContent = data.map(row => 
      row.map(cell => {
        // Escape double quotes and wrap in quotes if contains comma/newline
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');
    
    // Create blob with UTF-8 BOM for proper Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    // Trigger download
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('CSV export error:', error);
    throw new Error('Failed to export to CSV format');
  }
}

/**
 * Main export function - Universal exporter for all modules
 */
export async function exportRows({
  moduleKey,
  rows,
  columns,
  options = {},
  context
}: {
  moduleKey: 'clients' | 'cases' | 'employees';
  rows: any[];
  columns?: ExportColumn[];
  options?: ExportOptions;
  context?: ExportContext;
}): Promise<void> {
  try {
    // Get module configuration
    const moduleConfig = MODULE_CONFIGS[moduleKey];
    if (!moduleConfig) {
      throw new Error(`Unknown module: ${moduleKey}`);
    }
    
    // Determine which columns to use
    let exportColumns = columns || moduleConfig.columns;
    
    // Filter to visible columns only if requested
    if (options.visibleOnly) {
      const visibleKeys = moduleConfig.visibleColumns;
      exportColumns = exportColumns.filter(col => 
        visibleKeys.includes(col.key) || 
        // Also include columns with custom keys (like "primaryContactEmail")
        visibleKeys.some(vk => col.key.includes(vk))
      );
    }
    
    // Check if we have data
    if (rows.length === 0) {
      console.warn('No data to export');
      // Still export headers
    }
    
    // Convert rows to sheet data
    const includeHeader = options.includeHeader !== false;
    const sheetData = rowsToSheetData(rows, exportColumns, context, includeHeader);
    
    // Generate filename
    const format = options.format || 'xlsx';
    const filename = options.filename || generateFilename(
      moduleConfig.filenamePrefix,
      format
    );
    
    // Get sheet name
    const sheetName = options.sheetName || moduleConfig.sheetName;
    
    // Export based on format
    if (format === 'csv') {
      exportToCSV(sheetData, filename);
    } else {
      exportToExcel(sheetData, filename, sheetName);
    }
    
    console.log(`Successfully exported ${rows.length} rows to ${filename}`);
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
}

/**
 * Helper function to prepare export context from app state
 */
export function prepareExportContext(state: {
  clients?: any[];
  employees?: any[];
  cases?: any[];
}): ExportContext {
  return {
    clients: state.clients,
    employees: state.employees,
    cases: state.cases
  };
}
