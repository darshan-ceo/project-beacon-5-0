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
  // Column 1: Client ID
  { key: 'id', label: 'Client ID', type: 'string' },
  
  // Column 2: Client Name
  { key: 'name', label: 'Client Name', type: 'string' },
  
  // Column 3: GSTN
  { 
    key: 'gstin', 
    label: 'GSTN', 
    type: 'string',
    get: (client) => client.gstin || client.gstNumber || 'N/A'
  },
  
  // Column 3: PAN
  { 
    key: 'pan', 
    label: 'PAN', 
    type: 'string',
    get: (client) => client.pan || client.panNumber || 'N/A'
  },
  
  // Column 3: State
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
  
  // Column 4: Client Group
  {
    key: 'clientGroup',
    label: 'Client Group',
    type: 'string',
    get: (client, context) => {
      if (client.clientGroupId && context?.clientGroups) {
        const group = context.clientGroups.find((g: any) => g.id === client.clientGroupId);
        return group?.name || '–';
      }
      return '–';
    }
  },
  
  // Column 5: Contact Name
  { 
    key: 'primaryContactName', 
    label: 'Contact Name', 
    type: 'string',
    get: (client) => {
      if (client.signatories && client.signatories.length > 0) {
        const primary = client.signatories.find(s => s.isPrimary) || client.signatories[0];
        return primary.fullName || 'N/A';
      }
      return 'N/A';
    }
  },
  
  // Column 5: Contact Email
  { 
    key: 'primaryContactEmail', 
    label: 'Contact Email', 
    type: 'email',
    get: (client) => {
      if (client.signatories && client.signatories.length > 0) {
        const primary = client.signatories.find(s => s.isPrimary) || client.signatories[0];
        return primary.email || client.email || 'N/A';
      }
      return client.email || 'N/A';
    }
  },
  
  // Column 5: Contact Mobile
  {
    key: 'primaryContactMobile',
    label: 'Contact Mobile',
    type: 'phone',
    get: (client) => {
      if (client.signatories && client.signatories.length > 0) {
        const primary = client.signatories.find(s => s.isPrimary) || client.signatories[0];
        return primary.mobile || primary.phone || client.phone || 'N/A';
      }
      return client.phone || 'N/A';
    }
  },
  
  // Column 6: Constitution
  { 
    key: 'type', 
    label: 'Constitution', 
    type: 'string',
    get: (client) => client.type || 'N/A'
  },
  
  // Column 7: Status
  { key: 'status', label: 'Status', type: 'string' },
  
  // Column 8: Cases
  { 
    key: 'activeCases', 
    label: 'Active Cases', 
    type: 'number',
    get: (client) => client.activeCases || 0
  },
  
  // Supplementary Fields
  { 
    key: 'category', 
    label: 'Category', 
    type: 'string',
    get: (client) => client.category || 'N/A'
  },
  { 
    key: 'registrationNo', 
    label: 'Registration No', 
    type: 'string',
    get: (client) => client.registrationNo || client.registrationNumber || 'N/A'
  },
  { 
    key: 'primaryContactDesignation', 
    label: 'Contact Designation', 
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
  'id',                    // Client ID
  'name',                  // Client Name
  'gstin',                 // GSTN
  'pan',                   // PAN
  'state',                 // State
  'clientGroup',           // Client Group
  'primaryContactName',    // Contact Name
  'primaryContactEmail',   // Contact Email
  'primaryContactMobile',  // Contact Mobile
  'type',                  // Constitution
  'status',                // Status
  'activeCases'            // Cases
];
