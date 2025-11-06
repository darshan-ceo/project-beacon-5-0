/**
 * Storage Shim - Supabase-Only Data Persistence
 * 
 * Phase 1 Complete: All localStorage and IndexedDB dual-writes removed.
 * All data operations now go directly to Supabase via StorageManager.
 */

import { StorageManager } from './StorageManager';
import type { Client, Case, Task, Document, Hearing, Notice, Reply, Employee, Court, Judge } from './db';

export interface AppState {
  clients: Client[];
  cases: Case[];
  tasks: Task[];
  documents: Document[];
  hearings: Hearing[];
  notices: Notice[];
  replies: Reply[];
  employees: Employee[];
  courts: Court[];
  judges: Judge[];
  tags?: any[];
  folders?: any[];
  settings?: Record<string, any>;
}

/**
 * Get current migration mode - always 'modern' (Supabase-only)
 */
export async function getMigrationMode(): Promise<'modern'> {
  return 'modern';
}

/**
 * Save entire application state to Supabase
 */
export async function saveAppState(state: Partial<AppState>): Promise<void> {
  const storage = StorageManager.getInstance().getStorage();
  
  // Save each entity type to Supabase in parallel
  const savePromises: Promise<any>[] = [];
  
  if (state.clients?.length) {
    savePromises.push(storage.bulkCreate('clients', state.clients));
  }
  if (state.cases?.length) {
    savePromises.push(storage.bulkCreate('cases', state.cases));
  }
  if (state.tasks?.length) {
    savePromises.push(storage.bulkCreate('tasks', state.tasks));
  }
  if (state.documents?.length) {
    savePromises.push(storage.bulkCreate('documents', state.documents));
  }
  if (state.hearings?.length) {
    savePromises.push(storage.bulkCreate('hearings', state.hearings));
  }
  if (state.employees?.length) {
    savePromises.push(storage.bulkCreate('employees', state.employees));
  }
  if (state.courts?.length) {
    savePromises.push(storage.bulkCreate('courts', state.courts));
  }
  if (state.judges?.length) {
    savePromises.push(storage.bulkCreate('judges', state.judges));
  }
  
  await Promise.all(savePromises);
}

/**
 * Load entire application state from Supabase
 */
export async function loadAppState(): Promise<AppState> {
  const storage = StorageManager.getInstance().getStorage();
  
  const [
    clients,
    cases,
    tasks,
    documents,
    hearings,
    employees,
    courts,
    judges
  ] = await Promise.all([
    storage.getAll<Client>('clients'),
    storage.getAll<Case>('cases'),
    storage.getAll<Task>('tasks'),
    storage.getAll<Document>('documents'),
    storage.getAll<Hearing>('hearings'),
    storage.getAll<Employee>('employees'),
    storage.getAll<Court>('courts'),
    storage.getAll<Judge>('judges')
  ]);
  
  return {
    clients: (clients || []) as Client[],
    cases: (cases || []) as Case[],
    tasks: (tasks || []) as Task[],
    documents: (documents || []) as Document[],
    hearings: (hearings || []) as Hearing[],
    notices: [],
    replies: [],
    employees: (employees || []) as Employee[],
    courts: (courts || []) as Court[],
    judges: (judges || []) as Judge[]
  };
}

/**
 * Save individual client to Supabase
 */
export async function saveClient(client: Client): Promise<Client> {
  const storage = StorageManager.getInstance().getStorage();
  
  if (!client.id) {
    throw new Error('Client must have an id');
  }
  
  try {
    const existing = await storage.getById('clients', client.id);
    if (existing) {
      await storage.update('clients', client.id, client);
    } else {
      await storage.create('clients', client);
    }
  } catch {
    await storage.create('clients', client);
  }
  
  return client;
}

/**
 * Save individual case to Supabase
 */
export async function saveCase(caseData: Case): Promise<Case> {
  const storage = StorageManager.getInstance().getStorage();
  
  if (!caseData.id) {
    throw new Error('Case must have an id');
  }
  
  try {
    const existing = await storage.getById('cases', caseData.id);
    if (existing) {
      await storage.update('cases', caseData.id, caseData);
    } else {
      await storage.create('cases', caseData);
    }
  } catch {
    await storage.create('cases', caseData);
  }
  
  return caseData;
}

/**
 * Save individual task to Supabase
 */
export async function saveTask(task: Task): Promise<Task> {
  const storage = StorageManager.getInstance().getStorage();
  
  if (!task.id) {
    throw new Error('Task must have an id');
  }
  
  try {
    const existing = await storage.getById('tasks', task.id);
    if (existing) {
      await storage.update('tasks', task.id, task);
    } else {
      await storage.create('tasks', task);
    }
  } catch {
    await storage.create('tasks', task);
  }
  
  return task;
}

/**
 * Save individual document to Supabase
 */
export async function saveDocument(document: Document): Promise<Document> {
  const storage = StorageManager.getInstance().getStorage();
  
  if (!document.id) {
    throw new Error('Document must have an id');
  }
  
  try {
    const existing = await storage.getById('documents', document.id);
    if (existing) {
      await storage.update('documents', document.id, document);
    } else {
      await storage.create('documents', document);
    }
  } catch {
    await storage.create('documents', document);
  }
  
  return document;
}

/**
 * Get generic item from Supabase settings table
 */
export async function getItem<T>(key: string): Promise<T | null> {
  const storage = StorageManager.getInstance().getStorage();
  
  try {
    // Query settings table for this key
    const allSettings = await storage.getAll<any>('system_settings');
    const setting = allSettings.find((s: any) => s.setting_key === key);
    
    if (setting?.setting_value) {
      return setting.setting_value as T;
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting item ${key}:`, error);
    return null;
  }
}

/**
 * Set generic item in Supabase settings table
 */
export async function setItem<T>(key: string, value: T): Promise<void> {
  const storage = StorageManager.getInstance().getStorage();
  
  try {
    // Try to find existing setting
    const allSettings = await storage.getAll<any>('system_settings');
    const existing = allSettings.find((s: any) => s.setting_key === key);
    
    if (existing) {
      // Update existing - use any type to bypass strict typing
      await storage.update('system_settings', existing.id, {
        ...existing,
        setting_value: value,
        updated_at: new Date().toISOString()
      } as any);
    } else {
      // Create new - need to generate ID
      const newId = crypto.randomUUID();
      await storage.create('system_settings', {
        id: newId,
        setting_key: key,
        setting_value: value,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error(`Error setting item ${key}:`, error);
    throw error;
  }
}

/**
 * Remove item from Supabase settings table
 */
export async function removeItem(key: string): Promise<void> {
  const storage = StorageManager.getInstance().getStorage();
  
  try {
    const allSettings = await storage.getAll<any>('system_settings');
    const setting = allSettings.find((s: any) => s.setting_key === key);
    
    if (setting) {
      await storage.delete('system_settings', setting.id);
    }
  } catch (error) {
    console.error(`Error removing item ${key}:`, error);
  }
}
