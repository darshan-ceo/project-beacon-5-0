/**
 * Import Integration Service
 * Handles database insertion for imported records across all entity types
 */

import { EntityType } from '@/types/importExport';

class ImportIntegrationService {
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
        case 'judge':
          // TODO: Implement court and judge insertion
          console.warn(`Import for ${entityType} not yet implemented`);
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
   * Insert a client record (using IndexedDB via Dexie or localStorage)
   */
  private async insertClient(record: any): Promise<void> {
    // TODO: Integrate with actual client storage service
    // For now, store in localStorage as demo
    const clients = JSON.parse(localStorage.getItem('clients') || '[]');
    
    const client = {
      id: crypto.randomUUID(),
      legal_name: record.legal_name || record.name,
      trade_name: record.trade_name,
      gstin: record.gstin,
      pan: record.pan,
      taxpayer_type: record.taxpayer_type,
      constitution: record.constitution,
      registered_address: {
        city: record.city,
        district: record.district,
        state: record.state,
        pincode: record.pincode
      },
      primary_contact: {
        email: record.primary_contact_email || record.email,
        mobile: record.primary_contact_mobile || record.phone || record.mobile
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    clients.push(client);
    localStorage.setItem('clients', JSON.stringify(clients));
  }

  /**
   * Insert an employee record
   */
  private async insertEmployee(record: any): Promise<void> {
    // TODO: Integrate with actual employee storage service
    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
    
    const employee = {
      id: crypto.randomUUID(),
      name: record.name,
      email: record.email,
      phone: record.phone || record.mobile,
      designation: record.designation,
      department: record.department,
      joining_date: record.joining_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    employees.push(employee);
    localStorage.setItem('employees', JSON.stringify(employees));
  }
}

export const importIntegrationService = new ImportIntegrationService();
