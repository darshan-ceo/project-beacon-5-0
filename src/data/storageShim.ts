/**
 * Storage Shim - Unified API for persistence
 * Routes calls to HofficeDB while maintaining backward compatibility
 */

import { db, generateId } from '@/data/db';
import type { Client, Case, Task, Document, Hearing, Notice, Reply, Employee, Court, Judge } from '@/data/db';
import { storageMigrator } from '@/utils/storageConsolidation';

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
 * Get current migration mode
 */
export async function getMigrationMode() {
  return storageMigrator.getMigrationMode();
}

/**
 * Save entire app state (legacy compatibility)
 */
export async function saveAppState(state: Partial<AppState>): Promise<void> {
  const mode = await getMigrationMode();

  // Always write to HofficeDB in modern/transitioning mode
  if (mode === 'modern' || mode === 'transitioning') {
    if (state.clients) await db.clients.bulkPut(state.clients);
    if (state.cases) await db.cases.bulkPut(state.cases);
    if (state.tasks) await db.tasks.bulkPut(state.tasks);
    if (state.documents) await db.documents.bulkPut(state.documents);
    if (state.hearings) await db.hearings.bulkPut(state.hearings);
    if (state.notices) await db.notices.bulkPut(state.notices);
    if (state.replies) await db.replies.bulkPut(state.replies);
    if (state.employees) await db.employees.bulkPut(state.employees);
    if (state.courts) await db.courts.bulkPut(state.courts);
    if (state.judges) await db.judges.bulkPut(state.judges);
  }

  // During transition, also write to localStorage for safety
  if (mode === 'transitioning' || mode === 'legacy') {
    const existing = loadAppStateFromLocalStorage();
    const merged = { ...existing, ...state };
    localStorage.setItem('lawfirm_app_data', JSON.stringify(merged));
  }
}

/**
 * Load entire app state
 */
export async function loadAppState(): Promise<AppState> {
  const mode = await getMigrationMode();

  // Read from HofficeDB in modern/transitioning mode
  if (mode === 'modern' || mode === 'transitioning') {
    const [clients, cases, tasks, documents, hearings, notices, replies, employees, courts, judges] = await Promise.all([
      db.clients.toArray(),
      db.cases.toArray(),
      db.tasks.toArray(),
      db.documents.toArray(),
      db.hearings.toArray(),
      db.notices.toArray(),
      db.replies.toArray(),
      db.employees.toArray(),
      db.courts.toArray(),
      db.judges.toArray(),
    ]);

    return {
      clients,
      cases,
      tasks,
      documents,
      hearings,
      notices,
      replies,
      employees,
      courts,
      judges,
    };
  }

  // Fallback to localStorage in legacy mode
  return loadAppStateFromLocalStorage();
}

/**
 * Legacy localStorage loader
 */
function loadAppStateFromLocalStorage(): AppState {
  const data = localStorage.getItem('lawfirm_app_data');
  if (!data) {
    return {
      clients: [],
      cases: [],
      tasks: [],
      documents: [],
      hearings: [],
      notices: [],
      replies: [],
      employees: [],
      courts: [],
      judges: [],
    };
  }

  try {
    return JSON.parse(data);
  } catch {
    return {
      clients: [],
      cases: [],
      tasks: [],
      documents: [],
      hearings: [],
      notices: [],
      replies: [],
      employees: [],
      courts: [],
      judges: [],
    };
  }
}

/**
 * Entity-specific save helpers
 */
export async function saveClient(client: Client): Promise<Client> {
  const mode = await getMigrationMode();
  const clientWithId = { ...client, id: client.id || generateId() };

  if (mode === 'modern' || mode === 'transitioning') {
    await db.clients.put(clientWithId);
  }

  if (mode === 'transitioning' || mode === 'legacy') {
    const state = loadAppStateFromLocalStorage();
    const index = state.clients.findIndex(c => c.id === clientWithId.id);
    if (index >= 0) {
      state.clients[index] = clientWithId;
    } else {
      state.clients.push(clientWithId);
    }
    localStorage.setItem('lawfirm_app_data', JSON.stringify(state));
  }

  return clientWithId;
}

export async function saveCase(case_: Case): Promise<Case> {
  const mode = await getMigrationMode();
  const caseWithId = { ...case_, id: case_.id || generateId() };

  if (mode === 'modern' || mode === 'transitioning') {
    await db.cases.put(caseWithId);
  }

  if (mode === 'transitioning' || mode === 'legacy') {
    const state = loadAppStateFromLocalStorage();
    const index = state.cases.findIndex(c => c.id === caseWithId.id);
    if (index >= 0) {
      state.cases[index] = caseWithId;
    } else {
      state.cases.push(caseWithId);
    }
    localStorage.setItem('lawfirm_app_data', JSON.stringify(state));
  }

  return caseWithId;
}

export async function saveTask(task: Task): Promise<Task> {
  const mode = await getMigrationMode();
  const taskWithId = { ...task, id: task.id || generateId() };

  if (mode === 'modern' || mode === 'transitioning') {
    await db.tasks.put(taskWithId);
  }

  if (mode === 'transitioning' || mode === 'legacy') {
    const state = loadAppStateFromLocalStorage();
    const index = state.tasks.findIndex(t => t.id === taskWithId.id);
    if (index >= 0) {
      state.tasks[index] = taskWithId;
    } else {
      state.tasks.push(taskWithId);
    }
    localStorage.setItem('lawfirm_app_data', JSON.stringify(state));
  }

  return taskWithId;
}

export async function saveDocument(document: Document): Promise<Document> {
  const mode = await getMigrationMode();
  const docWithId = { ...document, id: document.id || generateId() };

  if (mode === 'modern' || mode === 'transitioning') {
    await db.documents.put(docWithId);
  }

  if (mode === 'transitioning' || mode === 'legacy') {
    const state = loadAppStateFromLocalStorage();
    const index = state.documents.findIndex(d => d.id === docWithId.id);
    if (index >= 0) {
      state.documents[index] = docWithId;
    } else {
      state.documents.push(docWithId);
    }
    localStorage.setItem('lawfirm_app_data', JSON.stringify(state));
  }

  return docWithId;
}

/**
 * Generic item getters
 */
export async function getItem<T>(key: string): Promise<T | null> {
  const mode = await getMigrationMode();

  // Try HofficeDB first
  if (mode === 'modern' || mode === 'transitioning') {
    try {
      const result = await db.settings.get(key);
      return result ? (result as any).value : null;
    } catch {
      // Fall through to localStorage
    }
  }

  // Fallback to localStorage
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : null;
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  const mode = await getMigrationMode();

  if (mode === 'modern' || mode === 'transitioning') {
    // Find existing record by key to implement UPSERT
    const existing = await db.settings.where('key').equals(key).first();
    
    if (existing) {
      // Update existing record, preserving ID and creation time
      await db.settings.put({ 
        id: existing.id,
        key, 
        value: value as any,
        created_at: existing.created_at,
        updated_at: new Date()
      });
    } else {
      // Create new record
      await db.settings.put({ 
        id: generateId(),
        key, 
        value: value as any,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  if (mode === 'transitioning' || mode === 'legacy') {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

export async function removeItem(key: string): Promise<void> {
  const mode = await getMigrationMode();

  if (mode === 'modern' || mode === 'transitioning') {
    await db.settings.delete(key);
  }

  if (mode === 'transitioning' || mode === 'legacy') {
    localStorage.removeItem(key);
  }
}
