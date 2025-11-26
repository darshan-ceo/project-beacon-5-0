// Import types locally since they're not exported
// Mock Data Provider - DEPRECATED - App uses Supabase exclusively
// This file is kept for type definitions only

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  caseId: string;
  clientId: string;
  uploadedById: string;
  uploadedByName: string;
  uploadedAt: string;
  tags: string[];
  isShared: boolean;
  path: string;
  folderId?: string;
  uploadedBy?: string;
  shared?: boolean;
}

interface Folder {
  id: string;
  name: string;
  parentId?: string;
  caseId?: string;
  documentCount: number;
  size: number;
  createdAt: string;
  lastAccessed: string;
  description?: string;
  path: string;
}

import { AppAction } from '@/contexts/AppStateContext';

export interface DataProvider {
  // DMS
  folders: {
    list(parentId?: string): Promise<Folder[]>;
    create(name: string, parentId?: string, caseId?: string): Promise<Folder>;
    delete(folderId: string): Promise<void>;
    rename(folderId: string, newName: string): Promise<Folder>;
  };
  documents: {
    upload(file: File, options: any, dispatch: React.Dispatch<AppAction>): Promise<any>;
    list(filter?: any): Promise<Document[]>;
    delete(documentId: string, dispatch: React.Dispatch<AppAction>): Promise<void>;
    updateMetadata(documentId: string, updates: any, dispatch: React.Dispatch<AppAction>): Promise<void>;
  };
  tags: {
    list(): Promise<string[]>;
    create(tag: string): Promise<void>;
  };
}

/**
 * MockDataProvider - DEPRECATED
 * App now uses Supabase exclusively via DataInitializer
 * This provider returns empty data to maintain interface compatibility
 */
class MockDataProvider implements DataProvider {
  constructor() {
    console.warn('[MockDataProvider] DEPRECATED - App uses Supabase exclusively');
  }

  private async initializeData() {
    // No-op: Supabase is the single source of truth
  }

  private async seedData() {
    // No-op: Supabase is the single source of truth
  }

  folders = {
    list: async (parentId?: string): Promise<Folder[]> => {
      console.warn('[MockDataProvider] folders.list called - use Supabase instead');
      return [];
    },

    create: async (name: string, parentId?: string, caseId?: string): Promise<Folder> => {
      console.warn('[MockDataProvider] folders.create called - use Supabase instead');
      throw new Error('MockDataProvider is deprecated - use Supabase');
    },

    delete: async (folderId: string): Promise<void> => {
      console.warn('[MockDataProvider] folders.delete called - use Supabase instead');
      throw new Error('MockDataProvider is deprecated - use Supabase');
    },

    rename: async (folderId: string, newName: string): Promise<Folder> => {
      console.warn('[MockDataProvider] folders.rename called - use Supabase instead');
      throw new Error('MockDataProvider is deprecated - use Supabase');
    }
  };

  documents = {
    upload: async (file: File, options: any, dispatch: React.Dispatch<AppAction>): Promise<any> => {
      console.warn('[MockDataProvider] documents.upload called - use supabaseDocumentService instead');
      throw new Error('MockDataProvider is deprecated - use supabaseDocumentService');
    },

    list: async (filter?: any): Promise<Document[]> => {
      console.warn('[MockDataProvider] documents.list called - use Supabase instead');
      return [];
    },

    delete: async (documentId: string, dispatch: React.Dispatch<AppAction>): Promise<void> => {
      console.warn('[MockDataProvider] documents.delete called - use Supabase instead');
      throw new Error('MockDataProvider is deprecated - use Supabase');
    },

    updateMetadata: async (documentId: string, updates: any, dispatch: React.Dispatch<AppAction>): Promise<void> => {
      console.warn('[MockDataProvider] documents.updateMetadata called - use Supabase instead');
      throw new Error('MockDataProvider is deprecated - use Supabase');
    }
  };

  tags = {
    list: async (): Promise<string[]> => {
      console.warn('[MockDataProvider] tags.list called - use Supabase instead');
      return [];
    },

    create: async (tag: string): Promise<void> => {
      console.warn('[MockDataProvider] tags.create called - use Supabase instead');
      throw new Error('MockDataProvider is deprecated - use Supabase');
    }
  };
}

export const mockDataProvider = new MockDataProvider();
