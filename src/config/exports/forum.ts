import { Court } from '@/contexts/AppStateContext';
import { AUTHORITY_LEVEL_METADATA } from '@/types/authority-level';

export interface ExportColumn<T = any> {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'email' | 'phone';
  get?: (item: T, context?: any) => any;
}

export const COURT_EXPORT_COLUMNS: ExportColumn<Court>[] = [
  { key: 'id', label: 'Forum ID', type: 'string' },
  { key: 'name', label: 'Forum Name', type: 'string' },
  { 
    key: 'authorityLevel', 
    label: 'Authority Level', 
    type: 'string',
    get: (court) => court.authorityLevel 
      ? AUTHORITY_LEVEL_METADATA[court.authorityLevel].label 
      : 'N/A'
  },
  { key: 'city', label: 'City', type: 'string' },
  { key: 'jurisdiction', label: 'Jurisdiction', type: 'string' },
  { key: 'benchLocation', label: 'Bench', type: 'string' },
  { 
    key: 'address', 
    label: 'Address', 
    type: 'string',
    get: (court) => typeof court.address === 'string' 
      ? court.address 
      : `${court.address.line1}${court.address.line2 ? ', ' + court.address.line2 : ''}`
  },
  { 
    key: 'pincode', 
    label: 'Pincode', 
    type: 'string',
    get: (court) => typeof court.address === 'string' 
      ? 'N/A' 
      : court.address.pincode || 'N/A'
  },
  { key: 'phone', label: 'Phone', type: 'phone' },
  { key: 'email', label: 'Email', type: 'email' },
  { 
    key: 'workingDays', 
    label: 'Working Days', 
    type: 'string',
    get: (court) => court.workingDays.join(', ')
  },
  { key: 'activeCases', label: 'Active Cases', type: 'number' }
];

export const COURT_VISIBLE_COLUMNS = [
  'name',
  'authorityLevel',
  'city',
  'jurisdiction',
  'benchLocation',
  'address',
  'pincode',
  'phone',
  'email'
];
