/**
 * Import Integration Service
 * Handles database insertion for imported records across all entity types
 * MIGRATED TO SUPABASE - All persistence uses Supabase PostgreSQL
 */

import { EntityType } from '@/types/importExport';
import { supabase } from '@/integrations/supabase/client';
import { StorageManager } from '@/data/StorageManager';

class ImportIntegrationService {
  private async getTenantId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
    
    if (!profile?.tenant_id) throw new Error('Tenant ID not found');
    return profile.tenant_id;
  }

  private async getUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    return user.id;
  }
  /**
   * Insert imported records into the database
   */
  async insertRecords(entityType: EntityType, records: any[]): Promise<{
    success: boolean;
    insertedCount: number;
    errors: Array<{ record: any; error: string }>;
  }> {
    const errors: Array<{ record: any; error: string }> = [];
    let insertedCount = 0;

    try {
      switch (entityType) {
        case 'client':
          for (const record of records) {
            try {
              await this.insertClient(record);
              insertedCount++;
            } catch (error) {
              errors.push({
                record,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
          break;

        case 'employee':
          for (const record of records) {
            try {
              await this.insertEmployee(record);
              insertedCount++;
            } catch (error) {
              errors.push({
                record,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
          break;

        case 'court':
          for (const record of records) {
            try {
              await this.insertCourt(record);
              insertedCount++;
            } catch (error) {
              errors.push({
                record,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
          break;

        case 'judge':
          for (const record of records) {
            try {
              await this.insertJudge(record);
              insertedCount++;
            } catch (error) {
              errors.push({
                record,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
          break;

        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }

      return {
        success: errors.length === 0,
        insertedCount,
        errors
      };
    } catch (error) {
      console.error('Error inserting records:', error);
      return {
        success: false,
        insertedCount,
        errors: [{ record: {}, error: error instanceof Error ? error.message : 'Unknown error' }]
      };
    }
  }

  /**
   * Insert a client record into Supabase
   */
  private async insertClient(record: any): Promise<void> {
    try {
      const tenantId = await this.getTenantId();
      const userId = await this.getUserId();
      
      const clientPayload = {
        tenant_id: tenantId,
        display_name: record.legal_name || record.name || record.display_name,
        gstin: record.gstin || null,
        pan: record.pan || null,
        email: record.primary_contact_email || record.email || null,
        phone: record.primary_contact_mobile || record.phone || record.mobile || null,
        city: record.city || null,
        state: record.state_code || record.state || 'Gujarat',
        status: record.status || 'active',
        owner_id: userId,
        // Don't include id - let Supabase generate UUID
      };

      const storage = StorageManager.getInstance().getStorage();
      await storage.create('clients', clientPayload as any);
    } catch (error: any) {
      // Map database errors to user-friendly messages
      if (error.code === '23505') {
        if (error.message?.includes('gstin')) {
          throw new Error(`Client with GSTIN ${record.gstin} already exists`);
        }
        if (error.message?.includes('pan')) {
          throw new Error(`Client with PAN ${record.pan} already exists`);
        }
        throw new Error('Duplicate client record');
      }
      throw new Error(error.message || 'Failed to insert client');
    }
  }

  /**
   * Insert an employee record into Supabase
   */
  private async insertEmployee(record: any): Promise<void> {
    try {
      const tenantId = await this.getTenantId();
      const userId = await this.getUserId();
      
      const employeePayload = {
        tenant_id: tenantId,
        full_name: record.full_name || record.name,
        employee_code: record.employee_code || `EMP-${Date.now()}`,
        email: record.email,
        mobile: record.phone || record.mobile || null,
        designation: record.designation || 'Staff',
        department: record.department || 'General',
        role: record.role || 'user',
        status: record.status || 'Active',
        date_of_joining: record.joining_date || record.date_of_joining || null,
        created_by: userId,
        // Don't include id - let Supabase generate UUID
      };

      const storage = StorageManager.getInstance().getStorage();
      await storage.create('employees', employeePayload as any);
    } catch (error: any) {
      if (error.code === '23505') {
        if (error.message?.includes('employee_code')) {
          throw new Error(`Employee with code ${record.employee_code} already exists`);
        }
        if (error.message?.includes('email')) {
          throw new Error(`Employee with email ${record.email} already exists`);
        }
        throw new Error('Duplicate employee record');
      }
      throw new Error(error.message || 'Failed to insert employee');
    }
  }

  /**
   * Insert a court record into Supabase
   */
  private async insertCourt(record: any): Promise<void> {
    try {
      const tenantId = await this.getTenantId();
      const userId = await this.getUserId();
      
      const courtPayload = {
        tenant_id: tenantId,
        name: record.court_name || record.name,
        type: record.court_type || record.type || null,
        level: record.court_level || record.level || null,
        code: record.court_code || record.code || null,
        city: record.city || null,
        state: record.state_code || record.state || null,
        address: [record.address_line1, record.address_line2].filter(Boolean).join(', ') || record.address || null,
        jurisdiction: record.jurisdiction || null,
        established_year: record.established_year ? parseInt(record.established_year) : null,
        created_by: userId,
        // Don't include id - let Supabase generate UUID
      };

      const storage = StorageManager.getInstance().getStorage();
      await storage.create('courts', courtPayload as any);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new Error(`Court "${record.court_name || record.name}" in ${record.city} already exists`);
      }
      throw new Error(error.message || 'Failed to insert court');
    }
  }

  /**
   * Insert a judge record into Supabase
   */
  private async insertJudge(record: any): Promise<void> {
    try {
      const tenantId = await this.getTenantId();
      const userId = await this.getUserId();
      
      // Lookup court_id if court_name is provided
      let courtId = record.court_id || null;
      if (record.court_name && !courtId) {
        const { data: courts } = await supabase
          .from('courts')
          .select('id')
          .eq('tenant_id', tenantId)
          .ilike('name', record.court_name)
          .limit(1);
        
        if (courts && courts.length > 0) {
          courtId = courts[0].id;
        }
      }
      
      const judgePayload = {
        tenant_id: tenantId,
        name: record.judge_name || record.name,
        designation: record.designation || null,
        court_id: courtId,
        email: record.email || null,
        phone: record.phone || null,
        created_by: userId,
        // Don't include id - let Supabase generate UUID
      };

      const storage = StorageManager.getInstance().getStorage();
      await storage.create('judges', judgePayload as any);
    } catch (error: any) {
      if (error.code === '23503') {
        throw new Error(`Court "${record.court_name}" not found. Please import courts first.`);
      }
      if (error.code === '23505') {
        throw new Error(`Judge "${record.judge_name || record.name}" already exists`);
      }
      throw new Error(error.message || 'Failed to insert judge');
    }
  }
}

export const importIntegrationService = new ImportIntegrationService();
