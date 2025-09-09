import { DataProvider } from './MockDataProvider';
// Import types locally since they're not exported
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
import { envConfig } from '@/utils/envConfig';

class ApiDataProvider implements DataProvider {
  private baseUrl: string;

  constructor() {
    this.baseUrl = envConfig.API || 'http://localhost:3001/api';
  }

  private async apiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      if (response.status === 422) {
        const errorData = await response.json();
        throw new Error(`Validation Error: ${JSON.stringify(errorData.errors)}`);
      }
      if (response.status === 409) {
        throw new Error('Duplicate record found');
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async uploadFile(endpoint: string, file: File, metadata: any = {}): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    Object.keys(metadata).forEach(key => {
      formData.append(key, metadata[key]);
    });

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // DMS Implementation
  folders = {
    list: async (parentId?: string): Promise<Folder[]> => {
      const params = parentId ? `?parentId=${parentId}` : '';
      return this.apiCall(`/folders${params}`);
    },

    create: async (name: string, parentId?: string, caseId?: string): Promise<Folder> => {
      return this.apiCall('/folders', {
        method: 'POST',
        body: JSON.stringify({ name, parentId, caseId }),
      });
    },

    delete: async (folderId: string): Promise<void> => {
      await this.apiCall(`/folders/${folderId}`, { method: 'DELETE' });
    },

    rename: async (folderId: string, newName: string): Promise<Folder> => {
      return this.apiCall(`/folders/${folderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: newName }),
      });
    }
  };

  documents = {
    upload: async (file: File, options: any, dispatch: React.Dispatch<AppAction>): Promise<any> => {
      const result = await this.uploadFile('/documents/upload', file, {
        caseId: options.caseId,
        folderId: options.folderId,
        tags: JSON.stringify(options.tags || []),
        shared: options.shared || false,
      });
      
      dispatch({ type: 'ADD_DOCUMENT', payload: result.document });
      return result;
    },

    list: async (filter?: any): Promise<Document[]> => {
      const params = new URLSearchParams();
      if (filter) {
        Object.keys(filter).forEach(key => {
          if (filter[key] !== undefined) {
            params.append(key, filter[key]);
          }
        });
      }
      const queryString = params.toString();
      return this.apiCall(`/documents${queryString ? `?${queryString}` : ''}`);
    },

    delete: async (documentId: string, dispatch: React.Dispatch<AppAction>): Promise<void> => {
      await this.apiCall(`/documents/${documentId}`, { method: 'DELETE' });
      dispatch({ type: 'DELETE_DOCUMENT', payload: documentId });
    },

    updateMetadata: async (documentId: string, updates: any, dispatch: React.Dispatch<AppAction>): Promise<void> => {
      const updatedDoc = await this.apiCall(`/documents/${documentId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      dispatch({ type: 'UPDATE_DOCUMENT', payload: updatedDoc });
    }
  };

  // Help Implementation
  help = {
    getArticles: async (): Promise<any[]> => {
      return this.apiCall('/help/articles');
    },

    createArticle: async (article: any): Promise<any> => {
      return this.apiCall('/help/articles', {
        method: 'POST',
        body: JSON.stringify(article),
      });
    },

    updateArticle: async (id: string, updates: any): Promise<any> => {
      return this.apiCall(`/help/articles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },

    deleteArticle: async (id: string): Promise<void> => {
      await this.apiCall(`/help/articles/${id}`, { method: 'DELETE' });
    },

    search: async (query: string): Promise<any[]> => {
      return this.apiCall(`/help/search?q=${encodeURIComponent(query)}`);
    }
  };

  // Masters Implementation
  masters = {
    clients: {
      list: async () => this.apiCall('/masters/clients'),
      create: async (client: any) => this.apiCall('/masters/clients', {
        method: 'POST',
        body: JSON.stringify(client),
      }),
      update: async (id: string, updates: any) => this.apiCall(`/masters/clients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
      delete: async (id: string) => this.apiCall(`/masters/clients/${id}`, { method: 'DELETE' }),
      import: async (data: any[]) => this.apiCall('/masters/clients/import', {
        method: 'POST',
        body: JSON.stringify({ data }),
      }),
      export: async (): Promise<Blob> => {
        const response = await fetch(`${this.baseUrl}/masters/clients/export`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        });
        return response.blob();
      }
    },

    courts: {
      list: async () => this.apiCall('/masters/courts'),
      create: async (court: any) => this.apiCall('/masters/courts', {
        method: 'POST',
        body: JSON.stringify(court),
      }),
      update: async (id: string, updates: any) => this.apiCall(`/masters/courts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
      delete: async (id: string) => this.apiCall(`/masters/courts/${id}`, { method: 'DELETE' })
    },

    judges: {
      list: async () => this.apiCall('/masters/judges'),
      create: async (judge: any) => this.apiCall('/masters/judges', {
        method: 'POST',
        body: JSON.stringify(judge),
      }),
      update: async (id: string, updates: any) => this.apiCall(`/masters/judges/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
      delete: async (id: string) => this.apiCall(`/masters/judges/${id}`, { method: 'DELETE' })
    },

    employees: {
      list: async () => this.apiCall('/masters/employees'),
      create: async (employee: any) => this.apiCall('/masters/employees', {
        method: 'POST',
        body: JSON.stringify(employee),
      }),
      update: async (id: string, updates: any) => this.apiCall(`/masters/employees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
      delete: async (id: string) => this.apiCall(`/masters/employees/${id}`, { method: 'DELETE' })
    }
  };
}

export const apiDataProvider = new ApiDataProvider();