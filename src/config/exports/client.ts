/**
 * Client Export Configuration
 * Defines column schemas for client data exports
 */

import { Client, Address, Signatory } from '@/contexts/AppStateContext';

export interface ExportColumn<T = any> {
  key: string;
  label: string;
  type?: 'string' | 'number' | 'date' | 'currency' | 'phone' | 'email' | 'boolean';
  format?: string;
  get?: (item: T, context?: any) => any;
}

export const CLIENT_EXPORT_COLUMNS: ExportColumn<Client>[] = [
  { key: 'id', label: 'Client ID', type: 'string' },
  { key: 'name', label: 'Client Name', type: 'string' },
  { 
    key: 'type', 
    label: 'Client Type', 
    type: 'string',
    get: (client) => client.type || 'N/A'
  },
  { 
    key: 'category', 
    label: 'Category', 
    type: 'string',
    get: (client) => client.category || 'N/A'
  },
  { 
    key: 'gstin', 
    label: 'GSTIN', 
    type: 'string',
    get: (client) => client.gstin || client.gstNumber || 'N/A'
  },
  { 
    key: 'pan', 
    label: 'PAN', 
    type: 'string',
    get: (client) => client.pan || client.panNumber || 'N/A'
  },
  { 
    key: 'registrationNo', 
    label: 'Registration No', 
    type: 'string',
    get: (client) => client.registrationNo || client.registrationNumber || 'N/A'
  },
  { key: 'status', label: 'Status', type: 'string' },
  
  // Primary Contact Information (from signatories)
  { 
    key: 'primaryContactName', 
    label: 'Primary Contact Name', 
    type: 'string',
    get: (client) => {
      if (client.signatories && client.signatories.length > 0) {
        const primary = client.signatories.find(s => s.isPrimary) || client.signatories[0];
        return primary.fullName || 'N/A';
      }
      return 'N/A';
    }
  },
  { 
    key: 'primaryContactEmail', 
    label: 'Primary Email', 
    type: 'email',
    get: (client) => {
      if (client.signatories && client.signatories.length > 0) {
        const primary = client.signatories.find(s => s.isPrimary) || client.signatories[0];
        return primary.email || client.email || 'N/A';
      }
      return client.email || 'N/A';
    }
  },
  {
    key: 'primaryContactPhone',
    label: 'Primary Phone',
    type: 'phone',
    get: (client) => {
      if (client.signatories && client.signatories.length > 0) {
        const primary = client.signatories.find(s => s.isPrimary) || client.signatories[0];
        return primary.phone || client.phone || 'N/A';
      }
      return client.phone || 'N/A';
    }
  },
  { 
    key: 'primaryContactDesignation', 
    label: 'Primary Contact Designation', 
    type: 'string',
    get: (client) => {
      if (client.signatories && client.signatories.length > 0) {
        const primary = client.signatories.find(s => s.isPrimary) || client.signatories[0];
        return primary.designation || 'N/A';
      }
      return 'N/A';
    }
  },
  
  // Registered Address
  { 
    key: 'addressLine1', 
    label: 'Address Line 1', 
    type: 'string',
    get: (client) => {
      if (typeof client.address === 'object' && client.address !== null) {
        return (client.address as Address).line1 || 'N/A';
      }
      if (typeof client.address === 'string') {
        return client.address;
      }
      return 'N/A';
    }
  },
  { 
    key: 'addressLine2', 
    label: 'Address Line 2', 
    type: 'string',
    get: (client) => {
      if (typeof client.address === 'object' && client.address !== null) {
        return (client.address as Address).line2 || '';
      }
      return '';
    }
  },
  { 
    key: 'city', 
    label: 'City', 
    type: 'string',
    get: (client) => {
      if (typeof client.address === 'object' && client.address !== null) {
        return (client.address as Address).city || 'N/A';
      }
      return 'N/A';
    }
  },
  { 
    key: 'state', 
    label: 'State', 
    type: 'string',
    get: (client) => {
      if (typeof client.address === 'object' && client.address !== null) {
        return (client.address as Address).state || 'N/A';
      }
      return 'N/A';
    }
  },
  { 
    key: 'pincode', 
    label: 'Pincode', 
    type: 'string',
    get: (client) => {
      if (typeof client.address === 'object' && client.address !== null) {
        return (client.address as Address).pincode || 'N/A';
      }
      return 'N/A';
    }
  },
  { 
    key: 'country', 
    label: 'Country', 
    type: 'string',
    get: (client) => {
      if (typeof client.address === 'object' && client.address !== null) {
        return (client.address as Address).country || 'India';
      }
      return 'India';
    }
  },
  
  // Jurisdiction
  { 
    key: 'commissionerate', 
    label: 'Commissionerate', 
    type: 'string',
    get: (client) => client.jurisdiction?.commissionerate || 'N/A'
  },
  { 
    key: 'division', 
    label: 'Division / Circle', 
    type: 'string',
    get: (client) => client.jurisdiction?.division || 'N/A'
  },
  { 
    key: 'range', 
    label: 'Range / Ward', 
    type: 'string',
    get: (client) => client.jurisdiction?.range || 'N/A'
  },
  
  // Assignment & Metadata
  { 
    key: 'assignedCAName', 
    label: 'Assigned CA', 
    type: 'string',
    get: (client) => client.assignedCAName || 'Unassigned'
  },
  { 
    key: 'createdAt', 
    label: 'Created Date', 
    type: 'date', 
    format: 'dd-MM-yyyy',
    get: (client) => client.createdAt || ''
  },
  { 
    key: 'updatedAt', 
    label: 'Last Updated', 
    type: 'date', 
    format: 'dd-MM-yyyy',
    get: (client) => client.updatedAt || ''
  },
  
  // Statistics (optional, might not be available in all contexts)
  { 
    key: 'totalCases', 
    label: 'Total Cases', 
    type: 'number',
    get: (client) => client.totalCases || 0
  },
  { 
    key: 'activeCases', 
    label: 'Active Cases', 
    type: 'number',
    get: (client) => client.activeCases || 0
  },
];

// Define default visible columns (for "Export visible only" feature)
export const CLIENT_VISIBLE_COLUMNS = [
  'name', 
  'gstin', 
  'pan', 
  'status', 
  'primaryContactEmail', 
  'primaryContactPhone', 
  'city', 
  'state',
  'assignedCAName'
];
