import { ClientGroup, Client } from '@/contexts/AppStateContext';

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
  }
};
