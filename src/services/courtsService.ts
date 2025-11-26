import { Court } from '@/contexts/AppStateContext';
import { storageManager } from '@/data/StorageManager';
import { toast } from '@/hooks/use-toast';

export interface CreateCourtData {
  name: string;
  type: 'Supreme Court' | 'High Court' | 'District Court' | 'Tribunal' | 'Commission';
  jurisdiction: string;
  address: string;
  digitalFiling: boolean;
  workingDays: string[];
  city: string;
  phone?: string;
  email?: string;
  benchLocation?: string;
  status?: 'Active' | 'Inactive';
}

export interface UpdateCourtData extends Partial<CreateCourtData> {
  id: string;
}

class CourtsService {
  /**
   * Create a new court with persistence and dispatch
   */
  async create(courtData: Partial<Court>, dispatch: any): Promise<Court> {
    try {
      const storage = storageManager.getStorage();

      // Validate city is provided
      if (!courtData.city?.trim()) {
        throw new Error('City is required');
      }

      // Build complete court object
      const newCourt: Court = {
        id: '', // Server will generate UUID
        name: courtData.name || '',
        type: courtData.type || 'District Court',
        jurisdiction: courtData.jurisdiction || '',
        address: courtData.address || '',
        activeCases: 0,
        avgHearingTime: '30 mins',
        digitalFiling: courtData.digitalFiling || false,
        workingDays: courtData.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        city: courtData.city,
        phone: courtData.phone,
        email: courtData.email,
        benchLocation: courtData.benchLocation,
        status: courtData.status || 'Active',
        ...courtData
      };

      // Persist to Supabase
      const created = await storage.create('courts', {
        name: newCourt.name,
        type: newCourt.type,
        jurisdiction: newCourt.jurisdiction,
        address: newCourt.address,
        city: newCourt.city,
        phone: newCourt.phone,
        email: newCourt.email,
      } as any);

      // Get server-generated UUID
      const persistedCourt = { ...newCourt, id: created.id };

      // Dispatch to context
      dispatch({ type: 'ADD_COURT', payload: persistedCourt });

      // Show success toast
      toast({
        title: "Legal Forum Added",
        description: `Legal Forum "${persistedCourt.name}" has been added successfully.`,
      });

      return persistedCourt;
    } catch (error) {
      console.error('Failed to create court:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add legal forum. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  }

  /**
   * Update an existing court
   */
  async update(courtId: string, updates: Partial<Court>, dispatch: any): Promise<Court> {
    try {
      const storage = storageManager.getStorage();

      // Persist to Supabase
      await storage.update('courts', courtId, {
        ...(updates.name && { name: updates.name }),
        ...(updates.type && { type: updates.type }),
        ...(updates.jurisdiction && { jurisdiction: updates.jurisdiction }),
        ...(updates.address && { address: updates.address }),
        ...(updates.city && { city: updates.city }),
        ...(updates.phone && { phone: updates.phone }),
        ...(updates.email && { email: updates.email }),
        updated_at: new Date().toISOString(),
      } as any);

      // Build updated court
      const updatedCourt = { ...updates, id: courtId } as Court;

      // Dispatch to context
      dispatch({ type: 'UPDATE_COURT', payload: updatedCourt });

      // Show success toast
      toast({
        title: "Legal Forum Updated",
        description: `Legal Forum "${updates.name || courtId}" has been updated successfully.`,
      });

      return updatedCourt;
    } catch (error) {
      console.error('Failed to update court:', error);
      toast({
        title: "Error",
        description: "Failed to update legal forum. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  }

  /**
   * Delete a court
   */
  async delete(courtId: string, dispatch: any): Promise<void> {
    try {
      const storage = storageManager.getStorage();

      // Delete from Supabase
      await storage.delete('courts', courtId);

      // Dispatch to context
      dispatch({ type: 'DELETE_COURT', payload: courtId });

      // Show success toast
      toast({
        title: "Legal Forum Deleted",
        description: "Legal Forum has been deleted successfully.",
      });
    } catch (error) {
      console.error('Failed to delete court:', error);
      toast({
        title: "Error",
        description: "Failed to delete legal forum. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  }
}

export const courtsService = new CourtsService();
