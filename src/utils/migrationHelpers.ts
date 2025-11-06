/**
 * Migration Helpers - UUID Conversion & Foreign Key Mapping
 * Handles conversion of IndexedDB numeric IDs to Supabase UUIDs
 */

import { v4 as uuid } from 'uuid';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Convert all non-UUID IDs to UUIDs and build mapping
 * Returns converted data and ID mapping for foreign key updates
 */
export function convertIdsToUUIDs(data: Record<string, any[]>): {
  convertedData: Record<string, any[]>;
  idMapping: Record<string, string>;
} {
  const idMapping: Record<string, string> = {};
  const convertedData: Record<string, any[]> = {};

  console.log('🔄 Starting UUID conversion...');

  // Tables whose primary key is NOT UUID - skip ID conversion
  const nonUUIDTables = new Set(['document_folders']);

  // First pass: collect all IDs and create mapping
  for (const [table, records] of Object.entries(data)) {
    if (!records || records.length === 0) continue;
    if (nonUUIDTables.has(table)) continue; // Skip non-UUID tables

    for (const record of records) {
      if (record.id && !isValidUUID(String(record.id))) {
        const oldId = String(record.id);
        if (!idMapping[oldId]) {
          idMapping[oldId] = uuid();
          console.log(`  🔑 ${table}: ${oldId} → ${idMapping[oldId]}`);
        }
      }
    }
  }

  // Second pass: replace IDs in all records
  for (const [table, records] of Object.entries(data)) {
    if (!records || records.length === 0) {
      convertedData[table] = [];
      continue;
    }

    convertedData[table] = records.map(record => {
      const converted = { ...record };
      
      // Replace primary ID if it needs conversion (skip for non-UUID tables)
      if (!nonUUIDTables.has(table) && converted.id && idMapping[String(converted.id)]) {
        converted.id = idMapping[String(converted.id)];
      }

      return converted;
    });
  }

  console.log(`✅ Created ${Object.keys(idMapping).length} UUID mappings`);
  return { convertedData, idMapping };
}

/**
 * Apply foreign key mapping to records
 * Replaces old IDs with new UUIDs in FK columns
 */
export function applyForeignKeyMapping(
  table: string,
  records: any[],
  idMapping: Record<string, string>
): any[] {
  // Define FK columns for each table
  const foreignKeys: Record<string, string[]> = {
    'cases': ['client_id', 'assigned_to', 'owner_id', 'forum_id', 'authority_id'],
    'tasks': ['case_id', 'assigned_to', 'created_by', 'completed_by'],
    'hearings': ['case_id', 'court_id', 'forum_id', 'authority_id'],
    'documents': ['case_id', 'client_id', 'task_id', 'hearing_id', 'uploaded_by', 
                  'reviewer_id', 'parent_document_id', 'folder_id'],
    'employees': ['manager_id', 'reporting_to', 'created_by', 'updated_by'],
    'judges': ['court_id', 'created_by'],
    'document_folders': ['case_id', 'parent_id', 'created_by'],
    'task_followups': ['task_id', 'created_by'],
    'task_notes': ['task_id', 'created_by'],
    'clients': ['client_group_id', 'owner_id'],
    'client_groups': ['created_by'],
    'courts': ['created_by'],
    'automation_rules': ['created_by'],
    'task_bundles': ['created_by'],
    'task_bundle_items': ['bundle_id'],
  };

  const fkColumns = foreignKeys[table] || [];
  if (fkColumns.length === 0) return records;

  return records.map(record => {
    const updated = { ...record };

    for (const fkColumn of fkColumns) {
      const oldId = updated[fkColumn];
      if (oldId && idMapping[String(oldId)]) {
        updated[fkColumn] = idMapping[String(oldId)];
      }
    }

    return updated;
  });
}

/**
 * Get table processing order (dependencies first)
 */
export function getTableProcessingOrder(): string[] {
  return [
    // Base tables first (no dependencies)
    'client_groups',
    'employees',
    'courts',
    'judges',
    
    // Then clients (depends on client_groups, employees)
    'clients',
    
    // Cases (depends on clients, employees, courts)
    'cases',
    'document_folders',
    
    // Case-dependent tables
    'tasks',
    'hearings',
    'documents',
    
    // Task-dependent tables
    'task_followups',
    'task_notes',
    
    // Automation tables
    'automation_rules',
    'automation_logs',
    'task_bundles',
    'task_bundle_items',
  ];
}
