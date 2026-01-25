import { Court } from '@/contexts/AppStateContext';
import { storageManager } from '@/data/StorageManager';
import { toast } from '@/hooks/use-toast';
import { normalizeCourtPayload } from '@/utils/formatters';

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

      // Normalize payload before persistence
      const normalizedData = normalizeCourtPayload(courtData);

      // Build complete court object
      const newCourt: Court = {
        id: '', // Server will generate UUID
        name: normalizedData.name || '',
        type: normalizedData.type || 'District Court',
        jurisdiction: normalizedData.jurisdiction || '',
        address: normalizedData.address || '',
        activeCases: 0,
        avgHearingTime: '30 mins',
        digitalFiling: normalizedData.digitalFiling || false,
        workingDays: normalizedData.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        city: normalizedData.city,
        phone: normalizedData.phone,
        email: normalizedData.email,
        benchLocation: normalizedData.benchLocation,
        status: normalizedData.status || 'Active',
        ...normalizedData
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
        status: newCourt.status,
        bench_location: newCourt.benchLocation,
        tax_jurisdiction: normalizedData.taxJurisdiction,
        officer_designation: normalizedData.officerDesignation,
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

      // Normalize payload before persistence
      const normalizedUpdates = normalizeCourtPayload(updates);

      // Persist to Supabase
      await storage.update('courts', courtId, {
        ...(updates.name && { name: updates.name }),
        ...(updates.type && { type: updates.type }),
        ...(updates.jurisdiction && { jurisdiction: updates.jurisdiction }),
        ...(updates.address && { address: updates.address }),
        ...(updates.city && { city: updates.city }),
        ...(updates.phone && { phone: updates.phone }),
        ...(updates.email && { email: updates.email }),
        ...(updates.status && { status: updates.status }),
        ...(updates.benchLocation && { bench_location: updates.benchLocation }),
        ...(updates.taxJurisdiction !== undefined && { tax_jurisdiction: updates.taxJurisdiction }),
        ...(updates.officerDesignation !== undefined && { officer_designation: updates.officerDesignation }),
        updated_at: new Date().toISOString(),
      } as any);

      // Fetch the full updated court from database
      const existingCourt = await storage.getById<any>('courts', courtId);
      const fullCourt: Court = {
        id: courtId,
        name: existingCourt?.name || updates.name || '',
        type: existingCourt?.type || updates.type || 'District Court',
        jurisdiction: existingCourt?.jurisdiction || updates.jurisdiction || '',
        address: existingCourt?.address || updates.address || '',
        city: existingCourt?.city || updates.city || '',
        phone: existingCourt?.phone || updates.phone,
        email: existingCourt?.email || updates.email,
        status: existingCourt?.status || updates.status || 'Active',
        benchLocation: existingCourt?.bench_location || updates.benchLocation,
        taxJurisdiction: existingCourt?.tax_jurisdiction || updates.taxJurisdiction,
        officerDesignation: existingCourt?.officer_designation || updates.officerDesignation,
        activeCases: 0,
        avgHearingTime: '30 mins',
        digitalFiling: false,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        ...updates // Apply updates on top
      };

      // Dispatch full court object to context
      dispatch({ type: 'UPDATE_COURT', payload: fullCourt });

      // Show success toast
      toast({
        title: "Legal Forum Updated",
        description: `Legal Forum "${updates.name || courtId}" has been updated successfully.`,
      });

      return fullCourt;
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

  /**
   * List all courts from Supabase
   */
  async list(): Promise<Court[]> {
    try {
      const storage = storageManager.getStorage();
      const courts = await storage.getAll('courts');
      
      return courts.map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        jurisdiction: c.jurisdiction,
        address: c.address,
        city: c.city,
        phone: c.phone,
        email: c.email,
        status: c.status,
        benchLocation: c.bench_location,
        taxJurisdiction: c.tax_jurisdiction,
        officerDesignation: c.officer_designation,
        activeCases: 0,
        avgHearingTime: '30 mins',
        digitalFiling: false,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      } as Court));
    } catch (error) {
      console.error('Failed to list courts:', error);
      throw error;
    }
  }

  /**
   * Get single court by ID
   */
  async getById(courtId: string): Promise<Court | null> {
    try {
      const storage = storageManager.getStorage();
      const court = await storage.getById('courts', courtId) as any;
      
      if (!court) return null;
      
      return {
        id: court.id,
        name: court.name,
        type: court.type,
        jurisdiction: court.jurisdiction,
        address: court.address,
        city: court.city,
        phone: court.phone,
        email: court.email,
        status: court.status,
        benchLocation: court.bench_location,
        taxJurisdiction: court.tax_jurisdiction,
        officerDesignation: court.officer_designation,
        activeCases: 0,
        avgHearingTime: '30 mins',
        digitalFiling: false,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      } as Court;
    } catch (error) {
      console.error('Failed to get court:', error);
      throw error;
    }
  }
}

export const courtsService = new CourtsService();
