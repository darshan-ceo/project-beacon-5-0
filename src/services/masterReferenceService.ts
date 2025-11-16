/**
 * Master Reference Service
 * Centralized service to ensure all modules reference master data correctly
 * Provides validation and referential integrity checks
 */

import { Court, Employee, ClientGroup, Client } from '@/contexts/AppStateContext';
import { AuthorityLevel, AUTHORITY_LEVEL_METADATA } from '@/types/authority-level';

export class MasterReferenceService {
  /**
   * Get authority levels available in Legal Authorities master
   * @param courts Array of legal authorities
   * @returns Array of unique authority levels
   */
  static getAuthorityLevels(courts: Court[]): AuthorityLevel[] {
    const levels = [...new Set(courts
      .map(c => (c as any).authorityLevel || (c as any).level)
      .filter(Boolean)
    )] as AuthorityLevel[];
    
    return levels;
  }
  
  /**
   * Get available employee roles from Employee master
   * @param employees Array of employees
   * @returns Array of unique role names
   */
  static getEmployeeRoles(employees: Employee[]): string[] {
    const roles = [...new Set(employees
      .map(e => e.role)
      .filter(Boolean)
    )];
    
    return roles.sort();
  }
  
  /**
   * Get active client groups from ClientGroup master
   * @param clientGroups Array of client groups
   * @returns Array of active client groups
   */
  static getClientGroups(clientGroups: ClientGroup[]): ClientGroup[] {
    return clientGroups.filter(g => g.status === 'Active');
  }
  
  /**
   * Validate if authority level exists in Legal Authorities master
   * @param level Authority level to validate
   * @param courts Array of legal authorities
   * @returns true if level exists in master data
   */
  static validateAuthorityLevel(level: string, courts: Court[]): boolean {
    return courts.some(c => (c as any).authorityLevel === level || (c as any).level === level);
  }
  
  /**
   * Validate if employee role exists in Employee master
   * @param role Role to validate
   * @param employees Array of employees
   * @returns true if role exists in master data
   */
  static validateEmployeeRole(role: string, employees: Employee[]): boolean {
    return employees.some(e => e.role === role);
  }
  
  /**
   * Validate if client group exists
   * @param groupId Client group ID to validate
   * @param clientGroups Array of client groups
   * @returns true if group exists
   */
  static validateClientGroup(groupId: string, clientGroups: ClientGroup[]): boolean {
    return clientGroups.some(g => g.id === groupId);
  }
  
  /**
   * Get legal authority/court by ID
   * @param courtId Court ID
   * @param courts Array of courts
   * @returns Court if found, undefined otherwise
   */
  static getCourtById(courtId: string, courts: Court[]): Court | undefined {
    return courts.find(c => c.id === courtId);
  }
  
  /**
   * Get employee by ID
   * @param employeeId Employee ID
   * @param employees Array of employees
   * @returns Employee if found, undefined otherwise
   */
  static getEmployeeById(employeeId: string, employees: Employee[]): Employee | undefined {
    return employees.find(e => e.id === employeeId);
  }
  
  /**
   * Get client by ID
   * @param clientId Client ID
   * @param clients Array of clients
   * @returns Client if found, undefined otherwise
   */
  static getClientById(clientId: string, clients: Client[]): Client | undefined {
    return clients.find(c => c.id === clientId);
  }
  
  /**
   * Get authority level metadata
   * @param level Authority level
   * @returns Metadata for the authority level
   */
  static getAuthorityLevelMetadata(level: AuthorityLevel) {
    return AUTHORITY_LEVEL_METADATA[level];
  }
  
  /**
   * Sync case authority level with selected forum
   * @param forumId Forum/Court ID
   * @param courts Array of courts
   * @returns Authority level of the forum, or undefined
   */
  static syncAuthorityLevelFromForum(forumId: string, courts: Court[]): AuthorityLevel | undefined {
    const forum = this.getCourtById(forumId, courts);
    return ((forum as any)?.authorityLevel || (forum as any)?.level) as AuthorityLevel;
  }
}
