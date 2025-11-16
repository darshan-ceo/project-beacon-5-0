/**
 * Master Data Utility Functions
 * Extract unique values dynamically from master data entities
 */

import { Employee, ClientGroup, Court } from '@/contexts/AppStateContext';
import { AuthorityLevel } from '@/types/authority-level';

/**
 * Extract unique employee roles from the Employee Master
 * @param employees Array of employees
 * @returns Sorted array of unique role names
 */
export const getAvailableEmployeeRoles = (employees: Employee[]): string[] => {
  const uniqueRoles = [...new Set(employees
    .map(e => e.role)
    .filter(Boolean)
  )];
  
  return uniqueRoles.sort();
};

/**
 * Extract unique authority levels from Legal Authorities (Courts)
 * @param courts Array of legal authorities/courts
 * @returns Sorted array of unique authority levels
 */
export const getAvailableAuthorityLevels = (courts: Court[]): AuthorityLevel[] => {
  const uniqueLevels = [...new Set(courts
    .map(c => (c as any).authorityLevel || (c as any).level)
    .filter(Boolean)
  )] as AuthorityLevel[];
  
  return uniqueLevels;
};

/**
 * Extract active client groups
 * @param clientGroups Array of client groups
 * @returns Array of active client groups
 */
export const getActiveClientGroups = (clientGroups: ClientGroup[]): ClientGroup[] => {
  return clientGroups.filter(g => g.status === 'Active');
};

/**
 * Extract unique cities from legal authorities
 * @param courts Array of legal authorities/courts
 * @returns Sorted array of unique city names
 */
export const getAvailableCities = (courts: Court[]): string[] => {
  const uniqueCities = [...new Set(courts
    .map(c => c.city)
    .filter(Boolean)
  )];
  
  return uniqueCities.sort();
};

/**
 * Get courts/authorities by authority level
 * @param courts Array of legal authorities
 * @param level Authority level to filter by
 * @returns Filtered courts
 */
export const getCourtsByLevel = (courts: Court[], level: AuthorityLevel): Court[] => {
  return courts.filter(c => (c as any).authorityLevel === level || (c as any).level === level);
};
