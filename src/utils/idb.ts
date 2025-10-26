// IndexedDB wrapper for persistence and blob storage
interface IDBStorage {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getBlob(key: string): Promise<Blob | null>;
  setBlob(key: string, blob: Blob): Promise<string>;
  deleteBlob(key: string): Promise<void>;
  getStorageStats(): Promise<{ used: number; available: number }>;
}

class IndexedDBStorage implements IDBStorage {
  private dbName = 'beacon_case_management_db';
  private version = 2; // Incremented for schema update
  private db: IDBDatabase | null = null;

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        
        console.log(`[IDB] Upgrading database from version ${oldVersion} to ${this.version}`);
        
        // Create object stores for different entity types
        const storeConfig = { keyPath: 'key' };
        
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data', storeConfig);
        }
        
        if (!db.objectStoreNames.contains('blobs')) {
          db.createObjectStore('blobs', storeConfig);
        }
        
        // Entity-specific stores for better organization and performance
        const entityStores = ['cases', 'clients', 'clientGroups', 'courts', 'judges', 'employees', 'hearings', 'tasks', 'documents', 'folders'];
        
        entityStores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            // Add indexes for common queries
            store.createIndex('timestamp', 'timestamp', { unique: false });
            if (storeName !== 'clients' && storeName !== 'courts' && storeName !== 'judges' && storeName !== 'employees') {
              store.createIndex('clientId', 'clientId', { unique: false });
            }
            if (storeName === 'tasks' || storeName === 'documents' || storeName === 'hearings') {
              store.createIndex('caseId', 'caseId', { unique: false });
            }
          }
        });
        
        // Operations log store
        if (!db.objectStoreNames.contains('operations')) {
          const opsStore = db.createObjectStore('operations', { keyPath: 'id' });
          opsStore.createIndex('timestamp', 'timestamp', { unique: false });
          opsStore.createIndex('entity', 'entity', { unique: false });
        }
      };
    });
  }

  async get(key: string): Promise<any> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['data'], 'readonly');
      const store = transaction.objectStore('data');
      
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.value : null);
        };
      });
    } catch (error) {
      console.error('[IDB] Get error:', error);
      return null;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      
      return new Promise((resolve, reject) => {
        const request = store.put({ key, value, timestamp: Date.now() });
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('[IDB] Set error:', error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      
      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('[IDB] Delete error:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['data', 'blobs'], 'readwrite');
      
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore('data').clear();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        }),
        new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore('blobs').clear();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        })
      ]);
    } catch (error) {
      console.error('[IDB] Clear error:', error);
      throw error;
    }
  }

  async getBlob(key: string): Promise<Blob | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['blobs'], 'readonly');
      const store = transaction.objectStore('blobs');
      
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.blob : null);
        };
      });
    } catch (error) {
      console.error('[IDB] Get blob error:', error);
      return null;
    }
  }

  async setBlob(key: string, blob: Blob): Promise<string> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['blobs'], 'readwrite');
      const store = transaction.objectStore('blobs');
      
      const blobKey = key.startsWith('blob-') ? key : `blob-${key}`;
      
      return new Promise((resolve, reject) => {
        const request = store.put({ 
          key: blobKey, 
          blob, 
          size: blob.size, 
          type: blob.type,
          timestamp: Date.now() 
        });
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(blobKey);
      });
    } catch (error) {
      console.error('[IDB] Set blob error:', error);
      throw error;
    }
  }

  async deleteBlob(key: string): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['blobs'], 'readwrite');
      const store = transaction.objectStore('blobs');
      
      const blobKey = key.startsWith('blob-') ? key : `blob-${key}`;
      
      return new Promise((resolve, reject) => {
        const request = store.delete(blobKey);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('[IDB] Delete blob error:', error);
      throw error;
    }
  }

  async getStorageStats(): Promise<{ used: number; available: number }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          available: (estimate.quota || 0) - (estimate.usage || 0)
        };
      }
      
      // Fallback: estimate based on localStorage
      let used = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length;
        }
      }
      
      return {
        used: used * 2, // rough estimate (UTF-16)
        available: 5 * 1024 * 1024 - used * 2 // assume 5MB limit
      };
    } catch (error) {
      console.error('[IDB] Storage stats error:', error);
      return { used: 0, available: 5 * 1024 * 1024 };
    }
  }
}

// Fallback to localStorage if IndexedDB is not available
class LocalStorageFallback implements IDBStorage {
  async get(key: string): Promise<any> {
    try {
      const item = localStorage.getItem(`idb_${key}`);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('[LocalStorage] Get error:', error);
      return null;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      localStorage.setItem(`idb_${key}`, JSON.stringify(value));
    } catch (error) {
      console.error('[LocalStorage] Set error:', error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(`idb_${key}`);
  }

  async clear(): Promise<void> {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('idb_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  async getBlob(key: string): Promise<Blob | null> {
    console.warn('[LocalStorage] Blob storage not supported, using base64 fallback');
    try {
      const item = localStorage.getItem(`blob_${key}`);
      if (!item) return null;
      
      const data = JSON.parse(item);
      const binaryString = atob(data.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new Blob([bytes], { type: data.type });
    } catch (error) {
      console.error('[LocalStorage] Get blob error:', error);
      return null;
    }
  }

  async setBlob(key: string, blob: Blob): Promise<string> {
    console.warn('[LocalStorage] Blob storage not recommended for large files');
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binaryString = '';
      for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
      }
      
      const data = {
        data: btoa(binaryString),
        type: blob.type,
        size: blob.size
      };
      
      const blobKey = key.startsWith('blob-') ? key : `blob-${key}`;
      localStorage.setItem(`blob_${blobKey}`, JSON.stringify(data));
      return blobKey;
    } catch (error) {
      console.error('[LocalStorage] Set blob error:', error);
      throw error;
    }
  }

  async deleteBlob(key: string): Promise<void> {
    const blobKey = key.startsWith('blob-') ? key : `blob-${key}`;
    localStorage.removeItem(`blob_${blobKey}`);
  }

  async getStorageStats(): Promise<{ used: number; available: number }> {
    let used = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length;
      }
    }
    
    return {
      used: used * 2, // UTF-16 encoding
      available: 5 * 1024 * 1024 - used * 2 // assume 5MB limit
    };
  }
}

// Auto-detect and export appropriate storage
const createStorage = (): IDBStorage => {
  if (typeof indexedDB !== 'undefined') {
    return new IndexedDBStorage();
  } else {
    console.warn('[Storage] IndexedDB not available, falling back to localStorage');
    return new LocalStorageFallback();
  }
};

export const idbStorage = createStorage();

// Migration utility
export const migrateFromLocalStorage = async (): Promise<void> => {
  console.log('[Migration] Starting localStorage → IndexedDB migration');
  
  const keysToMigrate = [
    'folders', 'documents', 'help-articles', 'clients', 'clientGroups',
    'courts', 'judges', 'employees', 'cases', 'tasks', 'hearings'
  ];
  
  for (const key of keysToMigrate) {
    try {
      const legacyData = localStorage.getItem(key);
      if (legacyData) {
        const parsedData = JSON.parse(legacyData);
        await idbStorage.set(key, parsedData);
        localStorage.removeItem(key); // Clean up after successful migration
        console.log(`[Migration] Migrated ${key}:`, parsedData.length || 'object');
      }
    } catch (error) {
      console.error(`[Migration] Failed to migrate ${key}:`, error);
    }
  }
  
  console.log('[Migration] Completed');
};