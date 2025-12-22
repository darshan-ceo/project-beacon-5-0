import { ClientGroup, Client, AppAction } from '@/contexts/AppStateContext';
import { storageManager } from '@/data/StorageManager';
import { toast } from '@/hooks/use-toast';

export const clientGroupsService = {
  // Generate slug from name
  generateCode: (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  },

  // Validate unique name
  validateUniqueName: (name: string, groups: ClientGroup[], excludeId?: string): boolean => {
    return !groups.some(g => 
      g.name.toLowerCase() === name.toLowerCase() && g.id !== excludeId
    );
  },

  // Check if group can be deleted
  canDelete: (groupId: string, clients: Client[]): { allowed: boolean; reason?: string } => {
    const linkedClients = clients.filter(c => c.clientGroupId === groupId);
    if (linkedClients.length > 0) {
      return {
        allowed: false,
        reason: `Cannot delete group with ${linkedClients.length} linked client(s). Reassign them first.`
      };
    }
    return { allowed: true };
  },

  // Sync totalClients count
  syncCounts: (groups: ClientGroup[], clients: Client[]): ClientGroup[] => {
    const counts: Record<string, number> = {};
    clients.forEach(client => {
      if (client.clientGroupId) {
        counts[client.clientGroupId] = (counts[client.clientGroupId] || 0) + 1;
      }
    });

    return groups.map(group => ({
      ...group,
      totalClients: counts[group.id] || 0
    }));
  },

  /**
   * Create a new client group with persistence and dispatch
   */
  create: async (groupData: Partial<ClientGroup>, dispatch: React.Dispatch<AppAction>): Promise<ClientGroup> => {
    try {
      const storage = storageManager.getStorage();
      
      // Build complete group object
      const newGroup: Omit<ClientGroup, 'id'> = {
        name: groupData.name?.trim() || '',
        code: groupData.code || clientGroupsService.generateCode(groupData.name || ''),
        description: groupData.description?.trim() || '',
        totalClients: 0,
        status: groupData.status || 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Persist to Supabase
      const saved = await storage.create<any>('client_groups', {
        name: newGroup.name,
        code: newGroup.code,
        description: newGroup.description,
        head_client_id: groupData.headClientId || null,
        total_clients: 0,
      });

      // Build full group with server-generated ID
      const persistedGroup: ClientGroup = {
        id: saved.id,
        name: saved.name || newGroup.name,
        code: saved.code || newGroup.code,
        description: saved.description || newGroup.description,
        headClientId: saved.head_client_id || undefined,
        totalClients: saved.total_clients || 0,
        status: 'Active',
        createdAt: saved.created_at || newGroup.createdAt,
        updatedAt: saved.updated_at || newGroup.updatedAt,
      };

      // Dispatch to context for immediate UI update
      dispatch({ type: 'ADD_CLIENT_GROUP', payload: persistedGroup });

      toast({
        title: "Client Group Created",
        description: `"${persistedGroup.name}" has been created successfully.`,
      });

      return persistedGroup;
    } catch (error) {
      console.error('Failed to create client group:', error);
      toast({
        title: "Error",
        description: "Failed to create client group. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  },

  /**
   * Update an existing client group
   */
  update: async (groupId: string, updates: Partial<ClientGroup>, dispatch: React.Dispatch<AppAction>): Promise<ClientGroup> => {
    try {
      const storage = storageManager.getStorage();

      // Fetch existing group to merge with updates
      const existing = await storage.getById<any>('client_groups', groupId);
      if (!existing) {
        throw new Error('Client group not found');
      }

      // Prepare updates for Supabase
      const supabaseUpdates: any = {
        updated_at: new Date().toISOString(),
      };
      if (updates.name !== undefined) supabaseUpdates.name = updates.name.trim();
      if (updates.code !== undefined) supabaseUpdates.code = updates.code;
      if (updates.headClientId !== undefined) supabaseUpdates.head_client_id = updates.headClientId || null;
      if (updates.description !== undefined) supabaseUpdates.description = updates.description?.trim() || '';

      // Persist to Supabase
      await storage.update('client_groups', groupId, supabaseUpdates);

      // Build full updated group (merge existing with updates)
      const updatedGroup: ClientGroup = {
        id: groupId,
        name: updates.name?.trim() || existing.name,
        code: updates.code || existing.code,
        description: updates.description?.trim() ?? existing.description ?? '',
        headClientId: updates.headClientId !== undefined ? (updates.headClientId || undefined) : (existing.head_client_id || undefined),
        totalClients: existing.total_clients || 0,
        status: updates.status || existing.status || 'Active',
        createdAt: existing.created_at,
        updatedAt: new Date().toISOString(),
      };

      // Dispatch full merged data to context
      dispatch({ type: 'UPDATE_CLIENT_GROUP', payload: updatedGroup });

      toast({
        title: "Client Group Updated",
        description: `"${updatedGroup.name}" has been updated successfully.`,
      });

      return updatedGroup;
    } catch (error) {
      console.error('Failed to update client group:', error);
      toast({
        title: "Error",
        description: "Failed to update client group. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  },

  /**
   * Delete a client group
   */
  delete: async (groupId: string, clients: Client[], dispatch: React.Dispatch<AppAction>): Promise<void> => {
    try {
      // Check if deletion is allowed
      const canDeleteResult = clientGroupsService.canDelete(groupId, clients);
      if (!canDeleteResult.allowed) {
        throw new Error(canDeleteResult.reason);
      }

      const storage = storageManager.getStorage();

      // Delete from Supabase
      await storage.delete('client_groups', groupId);

      // Dispatch to context
      dispatch({ type: 'DELETE_CLIENT_GROUP', payload: groupId });

      toast({
        title: "Client Group Deleted",
        description: "Client group has been deleted successfully.",
      });
    } catch (error) {
      console.error('Failed to delete client group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete client group';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    }
  },

  /**
   * Get a single client group by ID
   */
  getById: async (groupId: string): Promise<ClientGroup | null> => {
    try {
      const storage = storageManager.getStorage();
      const group = await storage.getById<any>('client_groups', groupId);
      
      if (!group) return null;

      return {
        id: group.id,
        name: group.name,
        code: group.code,
        description: group.description || '',
        headClientId: group.head_client_id || undefined,
        totalClients: group.total_clients || 0,
        status: 'Active' as const,
        createdAt: group.created_at,
        updatedAt: group.updated_at,
      };
    } catch (error) {
      console.error('Failed to get client group:', error);
      throw error;
    }
  },

  /**
   * List all client groups
   */
  list: async (): Promise<ClientGroup[]> => {
    try {
      const storage = storageManager.getStorage();
      const groups = await storage.getAll<any>('client_groups');
      
      return groups.map((g: any): ClientGroup => ({
        id: g.id,
        name: g.name,
        code: g.code,
        description: g.description || '',
        headClientId: g.head_client_id || undefined,
        totalClients: g.total_clients || 0,
        status: 'Active' as const,
        createdAt: g.created_at,
        updatedAt: g.updated_at,
      }));
    } catch (error) {
      console.error('Failed to list client groups:', error);
      throw error;
    }
  },
};
