// Import types locally since they're not exported
// Import configuration
import { EMPLOYEE_ROLES } from '../../../config/appConfig';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  caseId: string; // Required to match AppStateContext
  clientId: string; // Required to match AppStateContext
  uploadedById: string; // Required to match AppStateContext
  uploadedByName: string; // Required to match AppStateContext
  uploadedAt: string;
  tags: string[];
  isShared: boolean;
  path: string;
  folderId?: string;
  // Legacy support
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
import { idbStorage } from '@/utils/idb';

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
  
  // Help
  help: {
    getArticles(): Promise<any[]>;
    createArticle(article: any): Promise<any>;
    updateArticle(id: string, updates: any): Promise<any>;
    deleteArticle(id: string): Promise<void>;
    search(query: string): Promise<any[]>;
  };
  
  // Masters
  masters: {
    clients: {
      list(): Promise<any[]>;
      create(client: any): Promise<any>;
      update(id: string, updates: any): Promise<any>;
      delete(id: string): Promise<void>;
      import(data: any[]): Promise<{ success: any[], errors: any[] }>;
      export(): Promise<Blob>;
    };
    courts: {
      list(): Promise<any[]>;
      create(court: any): Promise<any>;
      update(id: string, updates: any): Promise<any>;
      delete(id: string): Promise<void>;
    };
    judges: {
      list(): Promise<any[]>;
      create(judge: any): Promise<any>;
      update(id: string, updates: any): Promise<any>;
      delete(id: string): Promise<void>;
    };
    employees: {
      list(): Promise<any[]>;
      create(employee: any): Promise<any>;
      update(id: string, updates: any): Promise<any>;
      delete(id: string): Promise<void>;
    };
  };
}

class MockDataProvider implements DataProvider {
  private _folders: any[] = [];
  private _documents: any[] = [];
  private helpArticles: any[] = [];
  private clients: any[] = [];
  private courts: any[] = [];
  private judges: any[] = [];
  private employees: any[] = [];

  constructor() {
    this.initializeData();
  }

  private async initializeData() {
    console.log('[MockDataProvider] Initializing mock data');
    
    // Seed minimal data if none exists
    const existingFolders = await idbStorage.get('folders');
    if (!existingFolders || existingFolders.length === 0) {
      await this.seedData();
    }
  }

  private async seedData() {
    console.log('[MockDataProvider] Seeding initial data');
    
    // Seed 1 folder
    const seedFolder: Folder = {
      id: 'folder-1',
      name: 'General Documents',
      parentId: undefined,
      caseId: undefined,
      documentCount: 0,
      size: 0,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      description: 'Default document folder',
      path: '/General Documents'
    };
    
    await idbStorage.set('folders', [seedFolder]);
    
    // Seed help articles
    const seedArticles = [
      {
        id: 'article-1',
        title: 'Getting Started Guide',
        content: 'Welcome to the law firm management system...',
        category: 'User Guide',
        tags: ['getting-started', 'basics'],
        status: 'published',
        createdAt: new Date().toISOString()
      },
      {
        id: 'article-2',
        title: 'Document Management Best Practices',
        content: 'Follow these practices for optimal document organization...',
        category: 'Best Practices',
        tags: ['documents', 'organization'],
        status: 'published',
        createdAt: new Date().toISOString()
      }
    ];
    
    await idbStorage.set('help-articles', seedArticles);
  }

  // DMS Implementation
  folders = {
    list: async (parentId?: string): Promise<Folder[]> => {
      const folders = await idbStorage.get('folders') || [];
      return folders.filter((f: Folder) => f.parentId === parentId);
    },

    create: async (name: string, parentId?: string, caseId?: string): Promise<Folder> => {
      const folders = await idbStorage.get('folders') || [];
      const newFolder: Folder = {
        id: `folder-${Date.now()}`,
        name,
        parentId,
        caseId,
        documentCount: 0,
        size: 0,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        description: '',
        path: parentId ? `${parentId}/${name}` : `/${name}`
      };
      
      folders.push(newFolder);
      await idbStorage.set('folders', folders);
      console.log('[MockDataProvider] Created folder:', newFolder.name);
      return newFolder;
    },

    delete: async (folderId: string): Promise<void> => {
      const folders = await idbStorage.get('folders') || [];
      const filtered = folders.filter((f: Folder) => f.id !== folderId);
      await idbStorage.set('folders', filtered);
      console.log('[MockDataProvider] Deleted folder:', folderId);
    },

    rename: async (folderId: string, newName: string): Promise<Folder> => {
      const folders = await idbStorage.get('folders') || [];
      const folderIndex = folders.findIndex((f: Folder) => f.id === folderId);
      if (folderIndex === -1) throw new Error('Folder not found');
      
      folders[folderIndex].name = newName;
      await idbStorage.set('folders', folders);
      console.log('[MockDataProvider] Renamed folder:', folderId, 'to', newName);
      return folders[folderIndex];
    }
  };

  documents = {
    upload: async (file: File, options: any, dispatch: React.Dispatch<AppAction>): Promise<any> => {
      const documents = await idbStorage.get('documents') || [];
      
      // Store file as blob in IDB
      const fileBlob = await idbStorage.setBlob(`doc-${Date.now()}`, file);
      
      const newDoc: Document = {
        id: `doc-${Date.now()}`,
        name: file.name,
        type: file.type,
        size: file.size,
        caseId: options.caseId || 'default-case',
        clientId: options.clientId || 'default-client',
        uploadedById: 'current-user-id',
        uploadedByName: 'Current User',
        uploadedAt: new Date().toISOString(),
        tags: options.tags || [],
        isShared: false,
        path: options.folderId ? `folder-${options.folderId}/${file.name}` : `/${file.name}`,
        folderId: options.folderId,
        // Legacy support
        uploadedBy: 'current-user',
        shared: false
      };
      
      documents.push(newDoc);
      await idbStorage.set('documents', documents);
      
      dispatch({ type: 'ADD_DOCUMENT', payload: newDoc });
      console.log('[MockDataProvider] Uploaded document:', newDoc.name);
      
      return { success: true, document: newDoc };
    },

    list: async (filter?: any): Promise<Document[]> => {
      const documents = await idbStorage.get('documents') || [];
      if (!filter) return documents;
      
      return documents.filter((doc: Document) => {
        if (filter.caseId && doc.caseId !== filter.caseId) return false;
        if (filter.folderId && doc.folderId !== filter.folderId) return false;
        if (filter.tags && !filter.tags.some((tag: string) => doc.tags.includes(tag))) return false;
        return true;
      });
    },

    delete: async (documentId: string, dispatch: React.Dispatch<AppAction>): Promise<void> => {
      const documents = await idbStorage.get('documents') || [];
      const filtered = documents.filter((doc: Document) => doc.id !== documentId);
      await idbStorage.set('documents', filtered);
      
      // Remove blob
      await idbStorage.deleteBlob(documentId);
      
      dispatch({ type: 'DELETE_DOCUMENT', payload: documentId });
      console.log('[MockDataProvider] Deleted document:', documentId);
    },

    updateMetadata: async (documentId: string, updates: any, dispatch: React.Dispatch<AppAction>): Promise<void> => {
      const documents = await idbStorage.get('documents') || [];
      const docIndex = documents.findIndex((doc: Document) => doc.id === documentId);
      if (docIndex === -1) throw new Error('Document not found');
      
      documents[docIndex] = { ...documents[docIndex], ...updates };
      await idbStorage.set('documents', documents);
      
      dispatch({ type: 'UPDATE_DOCUMENT', payload: documents[docIndex] });
      console.log('[MockDataProvider] Updated document metadata:', documentId);
    }
  };

  // Help Implementation
  help = {
    getArticles: async (): Promise<any[]> => {
      return await idbStorage.get('help-articles') || [];
    },

    createArticle: async (article: any): Promise<any> => {
      const articles = await idbStorage.get('help-articles') || [];
      const newArticle = {
        ...article,
        id: `article-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      articles.push(newArticle);
      await idbStorage.set('help-articles', articles);
      console.log('[MockDataProvider] Created help article:', newArticle.title);
      return newArticle;
    },

    updateArticle: async (id: string, updates: any): Promise<any> => {
      const articles = await idbStorage.get('help-articles') || [];
      const articleIndex = articles.findIndex((a: any) => a.id === id);
      if (articleIndex === -1) throw new Error('Article not found');
      
      articles[articleIndex] = { ...articles[articleIndex], ...updates, updatedAt: new Date().toISOString() };
      await idbStorage.set('help-articles', articles);
      console.log('[MockDataProvider] Updated help article:', id);
      return articles[articleIndex];
    },

    deleteArticle: async (id: string): Promise<void> => {
      const articles = await idbStorage.get('help-articles') || [];
      const filtered = articles.filter((a: any) => a.id !== id);
      await idbStorage.set('help-articles', filtered);
      console.log('[MockDataProvider] Deleted help article:', id);
    },

    search: async (query: string): Promise<any[]> => {
      const articles = await idbStorage.get('help-articles') || [];
      const lowerQuery = query.toLowerCase();
      return articles.filter((a: any) => 
        a.title.toLowerCase().includes(lowerQuery) ||
        a.content.toLowerCase().includes(lowerQuery) ||
        a.tags.some((tag: string) => tag.toLowerCase().includes(lowerQuery))
      );
    }
  };

  // Masters Implementation
  masters = {
    clients: {
      list: async () => await idbStorage.get('clients') || [],
      create: async (client: any) => {
        const clients = await idbStorage.get('clients') || [];
        const newClient = { ...client, id: `client-${Date.now()}` };
        clients.push(newClient);
        await idbStorage.set('clients', clients);
        return newClient;
      },
      update: async (id: string, updates: any) => {
        const clients = await idbStorage.get('clients') || [];
        const index = clients.findIndex((c: any) => c.id === id);
        if (index === -1) throw new Error('Client not found');
        clients[index] = { ...clients[index], ...updates };
        await idbStorage.set('clients', clients);
        return clients[index];
      },
      delete: async (id: string) => {
        const clients = await idbStorage.get('clients') || [];
        const filtered = clients.filter((c: any) => c.id !== id);
        await idbStorage.set('clients', filtered);
      },
      import: async (data: any[]) => {
        const success: any[] = [];
        const errors: any[] = [];
        
        for (const row of data) {
          try {
            if (!row.name || !row.email) {
              errors.push({ row, error: 'Missing required fields: name, email' });
              continue;
            }
            
            const client = await this.masters.clients.create(row);
            success.push(client);
          } catch (error) {
            errors.push({ row, error: (error as Error).message });
          }
        }
        
        return { success, errors };
      },
      export: async () => {
        const clients = await this.masters.clients.list();
        const csv = this.generateCSV(clients, ['id', 'name', 'email', 'phone', 'address']);
        return new Blob([csv], { type: 'text/csv' });
      }
    },

    courts: {
      list: async () => await idbStorage.get('courts') || [],
      create: async (court: any) => {
        const courts = await idbStorage.get('courts') || [];
        const newCourt = { ...court, id: `court-${Date.now()}` };
        courts.push(newCourt);
        await idbStorage.set('courts', courts);
        return newCourt;
      },
      update: async (id: string, updates: any) => {
        const courts = await idbStorage.get('courts') || [];
        const index = courts.findIndex((c: any) => c.id === id);
        if (index === -1) throw new Error('Court not found');
        courts[index] = { ...courts[index], ...updates };
        await idbStorage.set('courts', courts);
        return courts[index];
      },
      delete: async (id: string) => {
        const courts = await idbStorage.get('courts') || [];
        const filtered = courts.filter((c: any) => c.id !== id);
        await idbStorage.set('courts', filtered);
      }
    },

    judges: {
      list: async () => await idbStorage.get('judges') || [],
      create: async (judge: any) => {
        const judges = await idbStorage.get('judges') || [];
        const newJudge = { ...judge, id: `judge-${Date.now()}` };
        judges.push(newJudge);
        await idbStorage.set('judges', judges);
        return newJudge;
      },
      update: async (id: string, updates: any) => {
        const judges = await idbStorage.get('judges') || [];
        const index = judges.findIndex((j: any) => j.id === id);
        if (index === -1) throw new Error('Judge not found');
        judges[index] = { ...judges[index], ...updates };
        await idbStorage.set('judges', judges);
        return judges[index];
      },
      delete: async (id: string) => {
        const judges = await idbStorage.get('judges') || [];
        const filtered = judges.filter((j: any) => j.id !== id);
        await idbStorage.set('judges', filtered);
      }
    },

    employees: {
      list: async () => {
        const employees = await idbStorage.get('employees') || [];
        
        // Ensure all roles from config are represented
        const enhancedEmployees = [...employees];
        
        // Check if we have employees for all required roles
        EMPLOYEE_ROLES.forEach((role, index) => {
          const hasRole = enhancedEmployees.some(emp => emp.role === role);
          if (!hasRole) {
            // Add a placeholder employee for missing roles
            enhancedEmployees.push({
              id: `emp-${Date.now()}-${index}`,
              name: `${role} Representative`,
              email: `${role.toLowerCase().replace(/\s+/g, '.')}.rep@firm.com`,
              role: role,
              phone: `+91 98765 ${String(43210 + index).padStart(5, '0')}`,
              address: 'Mumbai Office',
              specializations: ['GST Litigation'],
              active: true
            });
          }
        });
        
        return enhancedEmployees;
      },
      create: async (employee: any) => {
        const employees = await idbStorage.get('employees') || [];
        const newEmployee = { ...employee, id: `employee-${Date.now()}` };
        employees.push(newEmployee);
        await idbStorage.set('employees', employees);
        return newEmployee;
      },
      update: async (id: string, updates: any) => {
        const employees = await idbStorage.get('employees') || [];
        const index = employees.findIndex((e: any) => e.id === id);
        if (index === -1) throw new Error('Employee not found');
        employees[index] = { ...employees[index], ...updates };
        await idbStorage.set('employees', employees);
        return employees[index];
      },
      delete: async (id: string) => {
        const employees = await idbStorage.get('employees') || [];
        const filtered = employees.filter((e: any) => e.id !== id);
        await idbStorage.set('employees', filtered);
      }
    }
  };

  private generateCSV(data: any[], headers: string[]): string {
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(',')
    );
    return [csvHeaders, ...csvRows].join('\n');
  }
}

export const mockDataProvider = new MockDataProvider();